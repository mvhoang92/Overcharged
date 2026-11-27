import * as THREE from 'three';
import { makeLabel } from '../ui/label3d';
export class CustomerGoods {
    constructor(scene, x, z, data) {
        this.data = data;
        const isCustomer = data.kind === 'customer';
        this.mesh = new THREE.Mesh(isCustomer
            ? new THREE.CapsuleGeometry(0.25, 0.4, 4, 8)
            : new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: data.tier === 'vip' ? 0xf1c40f : 0xecf0f1 }));
        this.mesh.position.set(x, 0.5, z);
        scene.add(this.mesh);
        const reqLabel = data.vehicleReq === 'car' ? 'Ô TÔ' : 'XE MÁY';
        const kindLabel = isCustomer ? 'KHÁCH' : 'HÀNG';
        const tierLabel = data.tier === 'vip' ? ' VIP' : '';
        this.bubble = makeLabel(`${kindLabel}${tierLabel} · ${reqLabel}`);
        this.bubble.position.set(0, 0.9, 0);
        this.mesh.add(this.bubble);
    }
    get position() {
        return { x: this.mesh.position.x, z: this.mesh.position.z };
    }
    setPosition(x, z) {
        this.mesh.position.x = x;
        this.mesh.position.z = z;
    }
    dispose(scene) {
        scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
}
