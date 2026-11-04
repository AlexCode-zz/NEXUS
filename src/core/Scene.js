import * as THREE from 'three';

export class Scene {
  constructor() {
    this.instance = new THREE.Scene();
    this.instance.background = new THREE.Color(0x030305);
  }

  add(object) {
    this.instance.add(object);
  }

  remove(object) {
    this.instance.remove(object);
  }
}
