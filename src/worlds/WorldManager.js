import { Cosmos } from './Cosmos.js';
import { Cyberspace } from './Cyberspace.js';
import { Solaris } from './Solaris.js';
import { Singularity } from './Singularity.js';

export class WorldManager {
  constructor(scene, qualitySettings) {
    this.scene = scene;
    this.qualitySettings = qualitySettings || {};
    this.currentWorld = null;
    this.worlds = {
      cosmos: new Cosmos(scene, qualitySettings),
      cyberspace: new Cyberspace(scene, qualitySettings),
      solaris: new Solaris(scene, qualitySettings),
      singularity: new Singularity(scene, qualitySettings)
    };
    this.transitioning = false;
    this.transitionProgress = 0;
  }

  activateWorld(worldName, params = {}) {
    if (this.transitioning || !this.worlds[worldName]) return;

    this.transitioning = true;
    this.transitionProgress = 0;

    // Desactivar mundo actual
    if (this.currentWorld) {
      this.worlds[this.currentWorld].destroy();
    }

    // Activar nuevo mundo
    this.worlds[worldName].init(params);
    this.currentWorld = worldName;

    // Simular transición
    const transitionDuration = 2.0;
    const transitionStart = Date.now();

    const transitionUpdate = () => {
      const elapsed = (Date.now() - transitionStart) / 1000;
      this.transitionProgress = Math.min(elapsed / transitionDuration, 1);

      if (this.transitionProgress < 1) {
        requestAnimationFrame(transitionUpdate);
      } else {
        this.transitioning = false;
      }
    };

    transitionUpdate();
  }

  update(delta, elapsedTime) {
    if (this.currentWorld && !this.transitioning) {
      this.worlds[this.currentWorld].update(delta, elapsedTime);
    }
  }

  destroy() {
    for (const worldName in this.worlds) {
      this.worlds[worldName].destroy();
    }
    this.currentWorld = null;
  }
}
