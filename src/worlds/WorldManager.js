import { Cosmos } from './Cosmos.js';
import { Cyberspace } from './Cyberspace.js';
import { Solaris } from './Solaris.js';
import { Singularity } from './Singularity.js';

const WORLD_CLASSES = {
  cosmos: Cosmos,
  cyberspace: Cyberspace,
  solaris: Solaris,
  singularity: Singularity
};

const DISPLAY_NAMES = {
  cosmos: 'Cosmos',
  cyberspace: 'Cyberspace',
  solaris: 'Solaris',
  singularity: 'Singularity'
};

export class WorldManager {
  constructor(scene, qualitySettings, seed = 12345) {
    this.scene = scene;
    this.qualitySettings = qualitySettings || {};
    this.seed = seed;
    this.currentWorld = null;
    this.transitioning = false;
    this.transitionProgress = 0;

    // Instanciar los universos SIN inicializarlos (lazy):
    // nada se añade a la escena hasta que se activa un universo.
    this.worlds = {};
    for (const name of Object.keys(WORLD_CLASSES)) {
      this.worlds[name] = new WORLD_CLASSES[name](scene, this.qualitySettings, this.seed);
    }
  }

  activateWorld(worldName, params = {}) {
    if (this.transitioning || !this.worlds[worldName]) return;
    if (this.currentWorld === worldName && !params.force) {
      // Reaplicar parámetros si se pide explícitamente
      if (params && Object.keys(params).length) {
        this.worlds[worldName].setParams(params);
      }
      return;
    }

    this.transitioning = true;
    this.transitionProgress = 0;

    // Desactivar mundo actual (limpiar escena)
    if (this.currentWorld) {
      this.worlds[this.currentWorld].destroy();
    }

    // Activar nuevo mundo
    const world = this.worlds[worldName];
    world.init({ ...params, seed: this.seed });
    this.currentWorld = worldName;

    // Simular transición visual breve
    const transitionDuration = 1.2;
    const start = performance.now();
    const step = () => {
      const elapsed = (performance.now() - start) / 1000;
      this.transitionProgress = Math.min(elapsed / transitionDuration, 1);
      if (this.transitionProgress < 1) {
        requestAnimationFrame(step);
      } else {
        this.transitioning = false;
        this.transitionProgress = 1;
      }
    };
    step();
  }

  update(delta, elapsedTime) {
    if (this.currentWorld && !this.transitioning && this.worlds[this.currentWorld]) {
      this.worlds[this.currentWorld].update(delta, elapsedTime);
    }
  }

  getParticleCount() {
    if (this.currentWorld && this.worlds[this.currentWorld]) {
      const w = this.worlds[this.currentWorld];
      if (typeof w.getParticleCount === 'function') return w.getParticleCount();
    }
    return 0;
  }

  getCurrentWorld() {
    return this.currentWorld;
  }

  destroy() {
    for (const name of Object.keys(this.worlds)) {
      this.worlds[name].destroy();
    }
    this.worlds = {};
    this.currentWorld = null;
  }
}

export { DISPLAY_NAMES };
