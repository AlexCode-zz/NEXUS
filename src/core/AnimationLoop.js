import * as THREE from 'three';

export class AnimationLoop {
  constructor(renderCallback) {
    this.renderCallback = renderCallback;
    this.clock = new THREE.Clock();
    this.isLooping = false;
    this.callbacks = [];
  }

  addCallback(fn) {
    this.callbacks.push(fn);
  }

  start() {
    if (this.isLooping) return;
    this.isLooping = true;
    this.clock.start();
    this.tick();
  }

  stop() {
    this.isLooping = false;
  }

  tick() {
    if (!this.isLooping) return;

    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    for (const callback of this.callbacks) {
      callback(delta, elapsedTime);
    }

    if (this.renderCallback) {
      this.renderCallback(delta, elapsedTime);
    }

    requestAnimationFrame(() => this.tick());
  }
}
