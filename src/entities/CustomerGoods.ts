import * as THREE from 'three';
import type { ConveyorEntity } from '../core/ConveyorSystem';
import { makeLabel } from '../ui/label3d';

export class CustomerGoods {
  readonly data: ConveyorEntity;
  readonly mesh: THREE.Mesh;
  private bubble: THREE.Sprite;

  constructor(scene: THREE.Scene, x: number, z: number, data: ConveyorEntity) {
    this.data = data;
    const isCustomer = data.kind === 'customer';
    this.mesh = new THREE.Mesh(
      isCustomer
        ? new THREE.CapsuleGeometry(0.25, 0.4, 4, 8)
        : new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshStandardMaterial({ color: data.tier === 'vip' ? 0xf1c40f : 0xecf0f1 }),
    );
    this.mesh.position.set(x, 0.5, z);
    scene.add(this.mesh);

    const reqLabel = data.vehicleReq === 'car' ? 'Ô TÔ' : 'XE MÁY';
    const kindLabel = isCustomer ? 'KHÁCH' : 'HÀNG';
    const tierLabel = data.tier === 'vip' ? ' VIP' : '';
    this.bubble = makeLabel(`${kindLabel}${tierLabel} · ${reqLabel}`);
    this.bubble.position.set(0, 0.9, 0);
    this.mesh.add(this.bubble);
  }

  get position(): { x: number; z: number } {
    return { x: this.mesh.position.x, z: this.mesh.position.z };
  }

  setPosition(x: number, z: number): void {
    this.mesh.position.x = x;
    this.mesh.position.z = z;
  }

  dispose(scene: THREE.Scene): void {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
