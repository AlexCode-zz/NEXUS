import { SeededRandom } from './SeededRandom.js';

export class ProceduralEngine {
  constructor() {
    this.rng = new SeededRandom();
    this.presets = {
      'deep-space': { particleCount: 10000, speed: 0.5, turbulence: 0.1, colorShift: 0.2 },
      'electric-dreams': { particleCount: 5000, speed: 2.0, turbulence: 0.8, colorShift: 0.9 },
      'golden-horizon': { particleCount: 7500, speed: 0.8, turbulence: 0.2, colorShift: 0.5 },
      'dark-matter': { particleCount: 12000, speed: 0.3, turbulence: 0.05, colorShift: 0.1 },
      'quantum-storm': { particleCount: 6000, speed: 3.0, turbulence: 1.5, colorShift: 0.8 },
      'frozen-galaxy': { particleCount: 9000, speed: 0.2, turbulence: 0.02, colorShift: 0.3 }
    };
  }

  setSeed(seed) {
    this.rng.seed = seed;
  }

  applyPreset(presetName, worldInstance) {
    const preset = this.presets[presetName];
    if (preset) {
      worldInstance.init(preset);
      console.log(`Aplicando preset: ${presetName}`);
    }
  }

  randomizeParams(worldInstance) {
    const randomParams = {
      particleCount: this.rng.range(3000, 15000),
      speed: this.rng.float(0.1, 3.0),
      turbulence: this.rng.float(0, 1.5),
      colorShift: this.rng.random()
    };
    worldInstance.init(randomParams);
  }
}
