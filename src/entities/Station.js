import * as THREE from 'three';
import { makeLabel } from '../ui/label3d';
export class Station {
    constructor(scene, type, x, z, color, label) {
        this.occupant = null;
        this.type = type;
        this.group = new THREE.Group();
        this.group.position.set(x, 0, z);
        const pad = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 1.8), new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.5 }));
        pad.position.y = 0.05;
        this.group.add(pad);
        const labelSprite = makeLabel(label);
        labelSprite.position.set(0, 1.2, 0);
        this.group.add(labelSprite);
        scene.add(this.group);
    }
    get position() {
        return { x: this.group.position.x, z: this.group.position.z };
    }
}
