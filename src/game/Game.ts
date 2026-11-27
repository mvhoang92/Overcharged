import * as THREE from 'three';
import { LEVEL_1 } from '../data/levels';
import { VEHICLES } from '../data/vehicles';
import { CONFIG } from '../config';
import { Station } from '../entities/Station';
import { Vehicle } from '../entities/Vehicle';
import { CustomerGoods } from '../entities/CustomerGoods';
import { Player } from '../entities/Player';
import { InputSystem } from '../systems/InputSystem';
import { ConveyorSystem } from '../core/ConveyorSystem';
import { ScoreSystem } from '../core/ScoreSystem';
import { ComboSystem } from '../core/ComboSystem';
import { nearestWithin } from '../core/interaction';
import { bus } from '../systems/EventBus';
import { Hud } from '../ui/Hud';
import type { StationType, VehicleType } from '../core/types';

const STATION_STYLE: Record<StationType, { color: number; label: string }> = {
  intake: { color: 0x2ecc71, label: 'NHẬP XE' },
  wash: { color: 0x00bcd4, label: 'RỬA XE' },
  charger: { color: 0xf1c40f, label: 'SẠC V-GREEN' },
  conveyor: { color: 0x9b59b6, label: 'BĂNG CHUYỀN' },
  export: { color: 0xe74c3c, label: 'XUẤT BẾN' },
};

export class Game {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly stations: Station[] = [];
  readonly player: Player;
  readonly input: InputSystem;
  readonly vehicles: Vehicle[] = [];
  readonly conveyor = new ConveyorSystem({
    slots: CONFIG.conveyorSlots,
    shiftIntervalSec: CONFIG.conveyorShiftSec,
  });
  readonly conveyorItems: CustomerGoods[] = [];
  readonly score = new ScoreSystem();
  readonly combo = new ComboSystem();
  private npcs: THREE.Mesh[] = [];
  private flying: Array<{ entity: CustomerGoods; vx: number; vz: number; traveled: number }> = [];
  private trafficTimer = 0;
  private intakeCooldownUntil = 0;
  private timeLeft = CONFIG.levelDurationSec;
  private gameOver = false;
  private lastTime = 0;

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color(0x1a1a2e);

    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 14, 11);
    this.camera.lookAt(0, 0, 0);

    this.scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const sun = new THREE.DirectionalLight(0xffffff, 1.5);
    sun.position.set(5, 10, 5);
    this.scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 13.5),
      new THREE.MeshStandardMaterial({ color: 0x3a3a5a }),
    );
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);

    for (const def of LEVEL_1.stations) {
      const style = STATION_STYLE[def.type];
      this.stations.push(new Station(this.scene, def.type, def.x, def.z, style.color, style.label));
    }

    this.buildConveyorSlots();
    this.player = new Player(this.scene);
    this.input = new InputSystem(document.getElementById('ui')!);
    new Hud(document.getElementById('ui')!);
    this.buildIntakeButtons();

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  start(): void {
    this.renderer.setAnimationLoop((time) => {
      const dt = Math.min((time - this.lastTime) / 1000, 0.1);
      this.lastTime = time;
      this.update(dt, time);
      this.renderer.render(this.scene, this.camera);
    });
  }

  update(dtSec: number, nowMs: number): void {
    if (this.gameOver) return;
    this.input.update();
    this.player.update(this.input.state, dtSec, nowMs);
    this.handlePickPlace();
    this.handleSecondary();
    this.updateCarried();
    this.updateChargers(dtSec);
    this.updateConveyor(dtSec);
    this.updateFlying(dtSec);
    this.updateTraffic(dtSec);
    this.updateVehicleLabels();
    this.updateTimer(dtSec);
  }

  private handlePickPlace(): void {
    const s = this.input.state;
    if (!s.pickJustPressed) return;
    const player = this.player;

    if (player.carrying instanceof Vehicle) {
      const station = nearestWithin(
        player.position,
        this.stations.filter((st) => st.type !== 'intake' && st.type !== 'conveyor'),
        CONFIG.interactionRange,
      );
      if (station) {
        this.placeVehicle(station, player.carrying);
      } else {
        this.dropVehicle();
      }
    } else if (player.carrying instanceof CustomerGoods) {
      this.tryLoadVehicle(player.carrying);
    } else {
      const entity = nearestWithin(player.position, this.conveyorItems, CONFIG.interactionRange);
      if (entity) {
        this.pickUpEntity(entity);
        return;
      }
      const vehicle = nearestWithin(
        player.position,
        this.vehicles.filter((v) => v.model.location !== 'exported'),
        CONFIG.interactionRange,
      );
      if (vehicle) this.pickUpVehicle(vehicle);
    }
  }

  private handleSecondary(): void {
    const s = this.input.state;
    if (!s.actionJustPressed) return;
    if (this.player.carrying instanceof CustomerGoods) {
      this.throwEntity();
      return;
    }
    if (this.player.carrying) return;
    const wash = this.stations.find((st) => st.type === 'wash');
    if (!wash || !wash.occupant) return;
    if (nearestWithin(this.player.position, [wash], CONFIG.interactionRange) !== wash) return;
    wash.occupant.model.scrubTap();
  }

  private pickUpVehicle(vehicle: Vehicle): void {
    for (const st of this.stations) {
      if (st.occupant === vehicle) st.occupant = null;
    }
    vehicle.model.removeFromCharger();
    vehicle.model.location = 'carried';
    vehicle.notifiedFull = false;
    this.player.carrying = vehicle;
  }

  private dropVehicle(): void {
    const vehicle = this.player.carrying;
    if (!(vehicle instanceof Vehicle)) return;
    vehicle.model.location = 'floor';
    vehicle.setPosition(this.player.position.x, this.player.position.z + 0.8);
    this.player.carrying = null;
  }

  private placeVehicle(station: Station, vehicle: Vehicle): void {
    if (station.occupant) return;
    station.occupant = vehicle;
    vehicle.setPosition(station.position.x, station.position.z);
    this.player.carrying = null;
    if (station.type === 'wash') vehicle.model.location = 'wash';
    if (station.type === 'charger') vehicle.model.placeOnCharger();
    if (station.type === 'export') {
      vehicle.model.location = 'export';
      this.tryExport(station, vehicle);
    }
  }

  private updateCarried(): void {
    const c = this.player.carrying;
    if (c instanceof Vehicle) c.setPosition(this.player.position.x, this.player.position.z);
    else if (c instanceof CustomerGoods) c.setPosition(this.player.position.x, this.player.position.z - 0.6);
  }

  private updateVehicleLabels(): void {
    for (const v of this.vehicles) v.updateLabel();
  }

  private updateChargers(dtSec: number): void {
    for (const st of this.stations) {
      if (st.type !== 'charger') continue;
      const v = st.occupant;
      if (!v) continue;
      v.model.update(dtSec);
      if (v.model.battery >= 100 && !v.notifiedFull) {
        v.notifiedFull = true;
        this.flashStation(st, 0xffffff);
      }
      if (v.model.isOvercharged) {
        this.score.addPenalty(CONFIG.overchargePenaltyPerSec, dtSec);
        st.group.scale.setScalar(1 + 0.05 * Math.sin(performance.now() / 100));
        bus.emit('score:changed', this.score.score);
      } else {
        st.group.scale.setScalar(1);
      }
    }
  }

  private flashStation(station: Station, color: number): void {
    const pad = station.group.children[0] as THREE.Mesh;
    const material = pad.material as THREE.MeshStandardMaterial;
    const original = material.color.getHex();
    material.color.setHex(color);
    setTimeout(() => material.color.setHex(original), 200);
  }

  private buildConveyorSlots(): void {
    for (let i = 0; i < CONFIG.conveyorSlots; i++) {
      const pos = this.conveyorSlotPosition(i);
      const slot = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.06, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x9b59b6, transparent: true, opacity: 0.35 }),
      );
      slot.position.set(pos.x, 0.03, pos.z);
      this.scene.add(slot);
    }
  }

  private conveyorSlotPosition(slot: number): { x: number; z: number } {
    const conveyor = this.stations.find((st) => st.type === 'conveyor')!;
    return { x: conveyor.position.x, z: conveyor.position.z - 1.8 + slot * 1.1 };
  }

  private updateConveyor(dtSec: number): void {
    const overflow = this.conveyor.update(dtSec);
    for (const _e of overflow) {
      this.combo.onMiss();
      this.score.addPenalty(CONFIG.missPenalty, 1);
      bus.emit('combo:changed', this.combo.streak);
      bus.emit('score:changed', this.score.score);
    }
    this.conveyor.fill();

    for (const item of this.conveyorItems) {
      if (item === this.player.carrying) continue;
      if (this.flying.some((f) => f.entity === item)) continue;
      const pos = this.conveyorSlotPosition(item.data.slot);
      item.setPosition(pos.x, pos.z);
    }
    this.syncConveyorItems();
  }

  private syncConveyorItems(): void {
    const ids = new Set(this.conveyor.entities.map((e) => e.id));
    for (const item of [...this.conveyorItems]) {
      if (
        !ids.has(item.data.id) &&
        item !== this.player.carrying &&
        !this.flying.some((f) => f.entity === item)
      ) {
        item.dispose(this.scene);
        this.conveyorItems.splice(this.conveyorItems.indexOf(item), 1);
      }
    }
    for (const e of this.conveyor.entities) {
      if (!this.conveyorItems.some((i) => i.data.id === e.id)) {
        const pos = this.conveyorSlotPosition(e.slot);
        this.conveyorItems.push(new CustomerGoods(this.scene, pos.x, pos.z, e));
      }
    }
  }

  private pickUpEntity(entity: CustomerGoods): void {
    const taken = this.conveyor.take(entity.data.id);
    if (!taken) return;
    this.player.carrying = entity;
  }

  private tryLoadVehicle(entity: CustomerGoods): void {
    const vehicle = nearestWithin(
      this.player.position,
      this.vehicles.filter(
        (v) =>
          v.model.dirt === 0 &&
          v.model.battery >= 100 &&
          !v.model.loadedWith &&
          VEHICLES[v.model.type].req === entity.data.vehicleReq,
      ),
      CONFIG.interactionRange,
    );
    if (!vehicle) {
      this.dropEntity();
      return;
    }
    this.loadEntityOnto(vehicle, entity);
  }

  private throwEntity(): void {
    const entity = this.player.carrying;
    if (!(entity instanceof CustomerGoods)) return;
    const facing = this.player.facing;
    entity.setPosition(
      this.player.position.x + facing.x * 0.5,
      this.player.position.z + facing.z * 0.5,
    );
    this.flying.push({
      entity,
      vx: facing.x * CONFIG.throwSpeed,
      vz: facing.z * CONFIG.throwSpeed,
      traveled: 0,
    });
    this.player.carrying = null;
  }

  private updateFlying(dtSec: number): void {
    for (const f of [...this.flying]) {
      f.traveled += Math.hypot(f.vx, f.vz) * dtSec;
      f.entity.setPosition(
        f.entity.position.x + f.vx * dtSec,
        f.entity.position.z + f.vz * dtSec,
      );
      const t = Math.min(f.traveled / CONFIG.throwRange, 1);
      f.entity.mesh.position.y = 0.5 + Math.sin(t * Math.PI) * 0.8;

      const target = nearestWithin(
        f.entity.position,
        this.vehicles.filter(
          (v) =>
            v.model.dirt === 0 &&
            v.model.battery >= 100 &&
            !v.model.loadedWith &&
            VEHICLES[v.model.type].req === f.entity.data.vehicleReq,
        ),
        1.2,
      );
      if (target) {
        this.loadEntityOnto(target, f.entity);
        this.flying.splice(this.flying.indexOf(f), 1);
        continue;
      }
      if (f.traveled >= CONFIG.throwRange) {
        f.entity.mesh.position.y = 0.5;
        this.conveyor.putBack(f.entity.data);
        this.flying.splice(this.flying.indexOf(f), 1);
      }
    }
  }

  private loadEntityOnto(vehicle: Vehicle, entity: CustomerGoods): void {
    vehicle.model.loadedWith = { vehicleReq: entity.data.vehicleReq, tier: entity.data.tier };
    entity.dispose(this.scene);
    this.conveyorItems.splice(this.conveyorItems.indexOf(entity), 1);
    this.player.carrying = null;
  }

  private dropEntity(): void {
    const entity = this.player.carrying;
    if (!(entity instanceof CustomerGoods)) return;
    this.conveyor.putBack(entity.data);
    this.player.carrying = null;
  }

  private buildIntakeButtons(): void {
    const mk = (dx: number, type: VehicleType, label: string) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.style.cssText =
        'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);padding:10px 18px;border:none;border-radius:8px;background:#2ecc71;color:#fff;font-weight:bold;font-size:16px;';
      btn.style.marginLeft = `${dx}px`;
      btn.addEventListener('pointerdown', () => this.spawnVehicle(type));
      document.getElementById('ui')!.appendChild(btn);
    };
    mk(-60, 'bike', 'BIKE');
    mk(60, 'vf5', 'VF 5');
  }

  private spawnVehicle(type: VehicleType): void {
    const now = performance.now();
    if (now < this.intakeCooldownUntil) return;
    const intake = this.stations.find((st) => st.type === 'intake')!;
    if (intake.occupant) return;
    const v = new Vehicle(this.scene, intake.position.x, intake.position.z, type);
    this.vehicles.push(v);
    intake.occupant = v;
    this.intakeCooldownUntil = now + CONFIG.intakeCooldownMs;
  }

  private tryExport(station: Station, vehicle: Vehicle): void {
    if (!vehicle.model.canExport || !vehicle.model.loadedWith) {
      this.flashStation(station, 0xff0000);
      return;
    }
    const req = VEHICLES[vehicle.model.type].req;
    if (vehicle.model.loadedWith.vehicleReq !== req) {
      this.flashStation(station, 0xff0000);
      return;
    }
    const vip = vehicle.model.loadedWith.tier === 'vip' ? CONFIG.vipMultiplier : 1;
    const points = VEHICLES[vehicle.model.type].basePoints * this.combo.multiplier * vip;
    this.score.addDelivery(points);
    this.combo.onDelivery();
    station.occupant = null;
    vehicle.model.exported = true;
    vehicle.model.location = 'exported';
    vehicle.dispose(this.scene);
    this.vehicles.splice(this.vehicles.indexOf(vehicle), 1);
    bus.emit('score:changed', this.score.score);
    bus.emit('combo:changed', this.combo.streak);
    this.flashStation(station, 0x00ff00);
  }

  private updateTraffic(dtSec: number): void {
    this.trafficTimer += dtSec;
    if (this.trafficTimer >= CONFIG.trafficIntervalSec) {
      this.trafficTimer = 0;
      const npc = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.6, 0.5),
        new THREE.MeshStandardMaterial({ color: 0xe67e22 }),
      );
      npc.position.set(-12, 0.3, 0);
      this.scene.add(npc);
      this.npcs.push(npc);
    }

    for (const npc of [...this.npcs]) {
      npc.position.x += CONFIG.trafficSpeed * dtSec;
      if (npc.position.x > 12) {
        this.scene.remove(npc);
        npc.geometry.dispose();
        (npc.material as THREE.Material).dispose();
        this.npcs.splice(this.npcs.indexOf(npc), 1);
        continue;
      }
      const d = Math.hypot(npc.position.x - this.player.position.x, npc.position.z - this.player.position.z);
      if (d < 1.2) {
        this.player.stunnedUntil = performance.now() + CONFIG.trafficStunSec * 1000;
        if (this.player.carrying instanceof Vehicle) this.dropVehicle();
      }
    }
  }

  private updateTimer(dtSec: number): void {
    this.timeLeft -= dtSec;
    bus.emit('timer:changed', Math.max(0, this.timeLeft));
    if (this.timeLeft <= 0) {
      this.gameOver = true;
      bus.emit('game:over', this.score.score);
    }
  }
}
