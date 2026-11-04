import * as THREE from 'three';

/**
 * INTERACTION CONTROLLER — El cursor interactúa con el universo.
 *
 * Cada frame se proyecta el puntero del ratón al espacio 3D y se envía al
 * universo activo como punto de influencia. Los universos basados en
 * shaders lo usan directamente en el vertex shader (sin recalcular
 * buffers, coste ~cero); los basados en CPU reciben la perturbación
 * nodo por nodo.
 */
const MODE_CODES = {
  attraction: 0,
  repulsion: 1,
  turbulence: 2,
  gravity: 3,
  orbit: 4
};

export class InteractionController {
  constructor(camera, renderer, worldManager) {
    this.camera = camera;
    this.renderer = renderer;
    this.worldManager = worldManager;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.pointerWorld = new THREE.Vector3();
    this.origin = new THREE.Vector3();
    this.insideCanvas = false;

    this.currentEffect = 'attraction';
    this.interactionRadius = 5.0;
    this.interactionStrength = 0.05;

    this._onPointerMove = (e) => this._handlePointer(e.clientX, e.clientY);
    this._onPointerLeave = () => { this.insideCanvas = false; };
    this._onPointerEnter = () => { this.insideCanvas = true; };
    this._onTouchMove = (e) => {
      if (e.touches && e.touches.length) {
        this.insideCanvas = true;
        this._handlePointer(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    this._onKeyDown = (e) => this._handleKey(e);

    this._bind();
  }

  _bind() {
    const el = this.renderer && this.renderer.domElement;
    if (!el) return;
    el.addEventListener('pointermove', this._onPointerMove);
    el.addEventListener('pointerenter', this._onPointerEnter);
    el.addEventListener('pointerleave', this._onPointerLeave);
    el.addEventListener('touchmove', this._onTouchMove, { passive: true });
    window.addEventListener('keydown', this._onKeyDown);
  }

  _handlePointer(clientX, clientY) {
    const el = this.renderer.domElement;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.insideCanvas = true;
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  _handleKey(e) {
    const actions = {
      KeyA: 'attraction',
      KeyR: 'repulsion',
      KeyT: 'turbulence',
      KeyG: 'gravity',
      KeyO: 'orbit'
    };
    if (actions[e.code]) {
      this.currentEffect = actions[e.code];
      return;
    }
    if (e.code === 'KeyI') this.interactionRadius = Math.min(12, this.interactionRadius + 0.5);
    else if (e.code === 'KeyD') this.interactionRadius = Math.max(1, this.interactionRadius - 0.5);
    else if (e.code === 'KeyU') this.interactionStrength = Math.min(0.12, this.interactionStrength + 0.01);
    else if (e.code === 'KeyJ') this.interactionStrength = Math.max(0.01, this.interactionStrength - 0.01);
    else return;

    const el = document.getElementById('inter-radius');
    if (el) el.textContent = this.interactionRadius.toFixed(1);
  }

  update() {
    if (!this.worldManager || !this.camera) return;
    const world = this.worldManager.getCurrentWorldInstance();
    if (!world) return;

    if (!this.insideCanvas) {
      this.worldManager.setPointer(null, false);
      return;
    }

    // Proyección del puntero al espacio del universo
    this.raycaster.setFromCamera(this.mouse, this.camera.instance);
    const distance = Math.max(6, this.camera.instance.position.distanceTo(this.origin));
    this.raycaster.ray.at(distance, this.pointerWorld);

    this.worldManager.setPointer(this.pointerWorld, true);
    this.worldManager.setPointerConfig({
      mode: this.currentEffect,
      radius: this.interactionRadius,
      strength: 2.4
    });

    // Perturbación por CPU para universos basados en nodos
    if (typeof world.setPointer !== 'function') return;
    this._applyCpuPerturbation(world, 0.033);
  }

  _applyCpuPerturbation(world, delta) {
    if (!world.nodes || !world.nodesMesh) return;
    const p = this.pointerWorld;
    const r = this.interactionRadius;
    const mode = MODE_CODES[this.currentEffect] ?? 0;
    const force = this.interactionStrength;

    for (const node of world.nodes) {
      const pos = node.position;
      const dx = pos.x - p.x;
      const dy = pos.y - p.y;
      const dz = pos.z - p.z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d > r || d < 0.0001) continue;

      const infl = (1 - d / r) * force * (mode === 1 ? -1 : 1);
      if (mode === 2) {
        pos.x += (Math.random() - 0.5) * infl * 6;
        pos.y += (Math.random() - 0.5) * infl * 6;
        pos.z += (Math.random() - 0.5) * infl * 6;
      } else {
        pos.x += (dx / d) * infl * 3 * delta * 60;
        pos.y += (dy / d) * infl * 3 * delta * 60;
        pos.z += (dz / d) * infl * 3 * delta * 60;
      }
    }
  }

  destroy() {
    const el = this.renderer && this.renderer.domElement;
    if (el) {
      el.removeEventListener('pointermove', this._onPointerMove);
      el.removeEventListener('pointerenter', this._onPointerEnter);
      el.removeEventListener('pointerleave', this._onPointerLeave);
      el.removeEventListener('touchmove', this._onTouchMove);
    }
    window.removeEventListener('keydown', this._onKeyDown);
  }
}
