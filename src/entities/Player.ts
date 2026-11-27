import * as THREE from 'three';
import { CONFIG } from '../config';
import type { InputState } from '../systems/InputSystem';
import type { Vehicle } from './Vehicle';
import type { CustomerGoods } from './CustomerGoods';

export class Player {
  readonly mesh: THREE.Mesh;
  carrying: Vehicle | CustomerGoods | null = null;
  stunnedUntil = 0;
  private facingVec = new THREE.Vector2(0, 1);
  private dashUntil = 0;
  private dashCooldownUntil = 0;

  get facing(): { x: number; z: number } {
    return { x: this.facingVec.x, z: this.facingVec.y };
  }

  constructor(scene: THREE.Scene) {
    this.mesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.4, 0.8, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff }),
    );
    this.mesh.position.set(0, 0.8, 2);
    scene.add(this.mesh);
  }

  get position(): { x: number; z: number } {
    return { x: this.mesh.position.x, z: this.mesh.position.z };
  }

  update(input: InputState, dtSec: number, nowMs: number): void {
    if (nowMs < this.stunnedUntil) return;

    if (input.dashJustPressed && nowMs >= this.dashCooldownUntil) {
      this.dashUntil = nowMs + CONFIG.dashDurationMs;
      this.dashCooldownUntil = nowMs + CONFIG.dashCooldownMs;
    }

    const speed = this.carrying ? CONFIG.playerSpeed * CONFIG.carrySpeedFactor : CONFIG.playerSpeed;
    let vx: number;
    let vz: number;
    if (nowMs < this.dashUntil) {
      vx = this.facingVec.x * CONFIG.dashSpeed;
      vz = this.facingVec.y * CONFIG.dashSpeed;
    } else {
      vx = input.move.x * speed;
      vz = input.move.y * speed;
      if (input.move.x !== 0 || input.move.y !== 0) {
        this.facingVec.set(input.move.x, input.move.y).normalize();
      }
    }

    this.mesh.position.x = THREE.MathUtils.clamp(
      this.mesh.position.x + vx * dtSec,
      -CONFIG.mapHalfWidth,
      CONFIG.mapHalfWidth,
    );
    this.mesh.position.z = THREE.MathUtils.clamp(
      this.mesh.position.z + vz * dtSec,
      -CONFIG.mapHalfDepth,
      CONFIG.mapHalfDepth,
    );
  }
}
