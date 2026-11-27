import * as THREE from 'three';
import type { StationType } from '../core/types';
import type { Vehicle } from './Vehicle';
import { makeLabel } from '../ui/label3d';

export class Station {
  readonly type: StationType;
  readonly group: THREE.Group;
  occupant: Vehicle | null = null;

  constructor(scene: THREE.Scene, type: StationType, x: number, z: number, color: number, label: string) {
    this.type = type;
    this.group = new THREE.Group();
    this.group.position.set(x, 0, z);

    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.1, 1.8),
      new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.5 }),
    );
    pad.position.y = 0.05;
    this.group.add(pad);

    const labelSprite = makeLabel(label);
    labelSprite.position.set(0, 1.2, 0);
    this.group.add(labelSprite);

    scene.add(this.group);
  }

  get position(): { x: number; z: number } {
    return { x: this.group.position.x, z: this.group.position.z };
  }
}
