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

export const WORLDS = {
  cosmos: { display: 'Cosmos', description: 'Galaxia espiral' },
  cyberspace: { display: 'Cyber', description: 'Red digital' },
  solaris: { display: 'Solaris', description: 'Energía pura' },
  singularity: { display: 'Void', description: 'Agujero negro' }
};

export const DISPLAY_NAMES = {
  cosmos: 'Cosmos',
  cyberspace: 'Cyber',
  solaris: 'Solaris',
  singularity: 'Void'
};

/**
 * WORLDMANAGER — Ciclo de vida de los universos.
 *
 * Inicialización perezosa: los universos se instancian pero no se añaden a
 * la escena hasta que se activan. Al cambiar de universo el anterior se
 * destruye completamente (geometrías, materiales e instancias) para no
 * fugar memoria GPU.
 */
export class WorldManager {
  constructor(scene, qualitySettings, seed = 12345) {
    this.scene = scene;
    this.qualitySettings = qualitySettings || {};
    this.seed = seed;
    this.currentWorld = null;
    this.worlds = {};

    for (const name of Object.keys(WORLD_CLASSES)) {
      this.worlds[name] = new WORLD_CLASSES[name](scene, this.qualitySettings, this.seed);
    }
  }

  activateWorld(worldName, params = {}) {
    if (!this.worlds[worldName]) return false;

    if (this.currentWorld && this.currentWorld !== worldName) {
      this.worlds[this.currentWorld].destroy();
    }

    const world = this.worlds[worldName];
    world.init({ ...params, seed: this.seed });
    this.currentWorld = worldName;
    return true;
  }

  update(delta, elapsedTime) {
    const world = this.getCurrentWorldInstance();
    if (world) world.update(delta, elapsedTime);
  }

  getCurrentWorldInstance() {
    return this.currentWorld ? this.worlds[this.currentWorld] : null;
  }

  getCurrentWorld() {
    return this.currentWorld;
  }

  getParticleCount() {
    const world = this.getCurrentWorldInstance();
    if (world && typeof world.getParticleCount === 'function') return world.getParticleCount();
    return 0;
  }

  setPalette(paletteIndex) {
    const world = this.getCurrentWorldInstance();
    if (world && typeof world.setPalette === 'function') world.setPalette(paletteIndex);
  }

  setPointer(point, active) {
    const world = this.getCurrentWorldInstance();
    if (world && typeof world.setPointer === 'function') world.setPointer(point, active);
  }

  setPointerConfig(config) {
    const world = this.getCurrentWorldInstance();
    if (world && typeof world.setPointerConfig === 'function') world.setPointerConfig(config);
  }

  setSeed(seed) {
    this.seed = seed;
  }

  destroy() {
    for (const name of Object.keys(this.worlds)) {
      this.worlds[name].destroy();
    }
    this.worlds = {};
    this.currentWorld = null;
  }
}
