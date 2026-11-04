import * as THREE from 'three';

export class InteractionController {
  constructor(camera, renderer, worldManager) {
    this.camera = camera;
    this.renderer = renderer;
    this.worldManager = worldManager;
    this.mouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points.threshold = 0.25;
    this.interactionRadius = 3;
    this.interactionStrength = 0.05;
    this.isMouseDown = false;
    this.currentEffect = 'attraction';

    this.effects = {
      attraction: this.applyAttraction.bind(this),
      repulsion: this.applyRepulsion.bind(this),
      turbulence: this.applyTurbulence.bind(this),
      gravity: this.applyGravity.bind(this),
      rotation: this.applyRotation.bind(this)
    };

    // Referencias vinculadas para poder eliminar los listeners en destroy()
    this._onMouseMove = (e) => this.onMouseMove(e);
    this._onMouseDown = () => { this.isMouseDown = true; };
    this._onMouseUp = () => { this.isMouseDown = false; };
    this._onTouchMove = (e) => this.onTouchMove(e);
    this._onTouchStart = () => { this.isMouseDown = true; };
    this._onTouchEnd = () => { this.isMouseDown = false; };
    this._onKeyDown = (e) => this.onKeyDown(e);

    this.initEventListeners();
  }

  initEventListeners() {
    const el = this.renderer.domElement;
    el.addEventListener('mousemove', this._onMouseMove);
    el.addEventListener('mousedown', this._onMouseDown);
    el.addEventListener('mouseup', this._onMouseUp);
    el.addEventListener('touchmove', this._onTouchMove, { passive: false });
    el.addEventListener('touchstart', this._onTouchStart);
    el.addEventListener('touchend', this._onTouchEnd);
    window.addEventListener('keydown', this._onKeyDown);
  }

  onMouseMove(e) {
    this.updateMousePosition(e.clientX, e.clientY);
    this.applyInteractionEffect();
  }

  onTouchMove(e) {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      this.updateMousePosition(touch.clientX, touch.clientY);
      this.applyInteractionEffect();
    }
  }

  updateMousePosition(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  applyInteractionEffect() {
    if (!this.worldManager || !this.worldManager.currentWorld) return;

    const currentWorld = this.worldManager.worlds[this.worldManager.currentWorld];
    this.raycaster.setFromCamera(this.mouse, this.camera.instance);

    let intersects = [];
    if (currentWorld.mesh) {
      intersects = this.raycaster.intersectObject(currentWorld.mesh);
    } else if (currentWorld.nodesMesh) {
      intersects = this.raycaster.intersectObject(currentWorld.nodesMesh);
    }

    if (intersects.length > 0) {
      this.effects[this.currentEffect](intersects[0]);
    }
  }

  applyAttraction(intersect) {
    this._shiftParticle(intersect, 1);
  }

  applyRepulsion(intersect) {
    this._shiftParticle(intersect, -1);
  }

  applyTurbulence(intersect) {
    const posAttr = intersect.object.geometry.getAttribute('position');
    const positions = posAttr.array;
    const index = intersect.index;
    if (index === undefined) return;
    const i3 = index * 3;
    const force = this.interactionStrength * 0.6 * (this.isMouseDown ? 3 : 1);
    positions[i3] += (Math.random() - 0.5) * force;
    positions[i3 + 1] += (Math.random() - 0.5) * force;
    positions[i3 + 2] += (Math.random() - 0.5) * force;
    posAttr.needsUpdate = true;
  }

  applyGravity(intersect) {
    const posAttr = intersect.object.geometry.getAttribute('position');
    const positions = posAttr.array;
    const index = intersect.index;
    if (index === undefined) return;
    const i3 = index * 3;
    const x = positions[i3], y = positions[i3 + 1], z = positions[i3 + 2];
    const force = this.interactionStrength * 0.12 * (this.isMouseDown ? 2 : 1);
    positions[i3] += -x * force;
    positions[i3 + 1] += -y * force;
    positions[i3 + 2] += -z * force;
    posAttr.needsUpdate = true;
  }

  applyRotation(intersect) {
    const posAttr = intersect.object.geometry.getAttribute('position');
    const positions = posAttr.array;
    const index = intersect.index;
    if (index === undefined) return;
    const i3 = index * 3;
    const x = positions[i3], y = positions[i3 + 1], z = positions[i3 + 2];
    const force = this.interactionStrength * (this.isMouseDown ? 2 : 1);
    const angle = performance.now() * 0.0015;
    const ca = Math.cos(angle) * force;
    const sa = Math.sin(angle) * force;
    const ix = intersect.point.x, iz = intersect.point.z;
    positions[i3] = ix + (x - ix) * ca - (z - iz) * sa;
    positions[i3 + 2] = iz + (x - ix) * sa + (z - iz) * ca;
    positions[i3 + 1] = y;
    posAttr.needsUpdate = true;
  }

  _shiftParticle(intersect, direction) {
    const posAttr = intersect.object.geometry.getAttribute('position');
    const positions = posAttr.array;
    const index = intersect.index;
    if (index === undefined) return;
    const i3 = index * 3;
    const x = positions[i3], y = positions[i3 + 1], z = positions[i3 + 2];
    const force = this.interactionStrength * (this.isMouseDown ? 2 : 1);
    positions[i3] += (intersect.point.x - x) * force * direction;
    positions[i3 + 1] += (intersect.point.y - y) * force * direction;
    positions[i3 + 2] += (intersect.point.z - z) * force * direction;
    posAttr.needsUpdate = true;
  }

  onKeyDown(e) {
    switch (e.code) {
      case 'KeyA': this.currentEffect = 'attraction'; break;
      case 'KeyR': this.currentEffect = 'repulsion'; break;
      case 'KeyT': this.currentEffect = 'turbulence'; break;
      case 'KeyG': this.currentEffect = 'gravity'; break;
      case 'KeyO': this.currentEffect = 'rotation'; break;
      case 'KeyI': this.interactionRadius = Math.min(5, this.interactionRadius + 0.5); break;
      case 'KeyD': this.interactionRadius = Math.max(1, this.interactionRadius - 0.5); break;
      case 'KeyU': this.interactionStrength = Math.min(0.1, this.interactionStrength + 0.01); break;
      case 'KeyJ': this.interactionStrength = Math.max(0.01, this.interactionStrength - 0.01); break;
    }
    console.log(`Efecto: ${this.currentEffect}, Radio: ${this.interactionRadius.toFixed(1)}, Fuerza: ${this.interactionStrength.toFixed(2)}`);
  }

  destroy() {
    const el = this.renderer && this.renderer.domElement;
    if (el) {
      el.removeEventListener('mousemove', this._onMouseMove);
      el.removeEventListener('mousedown', this._onMouseDown);
      el.removeEventListener('mouseup', this._onMouseUp);
      el.removeEventListener('touchmove', this._onTouchMove);
      el.removeEventListener('touchstart', this._onTouchStart);
      el.removeEventListener('touchend', this._onTouchEnd);
    }
    window.removeEventListener('keydown', this._onKeyDown);
    this.mouse = null;
    this.raycaster = null;
    this.camera = null;
    this.renderer = null;
    this.worldManager = null;
  }
}
