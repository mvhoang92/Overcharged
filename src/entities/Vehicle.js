import * as THREE from 'three';
import { VehicleStateMachine } from '../core/VehicleStateMachine';
import { VEHICLES } from '../data/vehicles';
import { makeLabel, setLabelText } from '../ui/label3d';
export class Vehicle {
    constructor(scene, x, z, type) {
        this.notifiedFull = false;
        this.model = new VehicleStateMachine(type);
        const def = VEHICLES[type];
        const size = type === 'bike' ? [1.0, 0.5, 0.5] : [1.3, 0.6, 0.7];
        this.mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), new THREE.MeshStandardMaterial({ color: def.color }));
        this.mesh.position.set(x, size[1] / 2, z);
        scene.add(this.mesh);
        this.label = makeLabel('');
        this.label.position.set(0, 1.0, 0);
        this.mesh.add(this.label);
    }
    get position() {
        return { x: this.mesh.position.x, z: this.mesh.position.z };
    }
    setPosition(x, z) {
        this.mesh.position.x = x;
        this.mesh.position.z = z;
    }
    updateLabel() {
        const load = this.model.loadedWith ? ' | Đã gắn' : '';
        setLabelText(this.label, `Bẩn ${Math.round(this.model.dirt)}% | Pin ${Math.round(this.model.battery)}%${load}`);
    }
    dispose(scene) {
        scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
}
