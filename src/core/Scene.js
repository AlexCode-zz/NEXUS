import * as THREE from 'three';

export class Scene {
  constructor() {
    this.instance = new THREE.Scene();
    this.instance.background = new THREE.Color(0x030305);
    this.objects = [];
  }

  add(object) {
    this.instance.add(object);
    this.objects.push(object);
  }

  remove(object) {
    const index = this.objects.indexOf(object);
    if (index !== -1) {
      this.objects.splice(index, 1);
    }
    this.instance.remove(object);
  }

  clear() {
    this.objects.forEach(object => {
      this.instance.remove(object);
    });
    this.objects = [];
  }

  destroy() {
    this.clear();
    this.instance.background = null;
  }
}

