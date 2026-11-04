import * as THREE from 'three';

/**
 * ORBITCONTROLS — Cámara orbital para explorar el universo.
 *
 * Implementación propia y ligera (sin dependencias) que sustituye a los
 * controles por defecto de Three.js:
 *  - Órbita esférica alrededor de un objetivo con amortiguación.
 *  - Arrastre con ratón o un dedo.
 *  - Rueda del ratón para acercar/alejar.
 *  - Pellizco (pinch) táctil con dos dedos.
 *  - Límites configurables de distancia e inclinación.
 */
export class OrbitControls {
  constructor(camera, element) {
    this.camera = camera;
    this.cameraInstance = camera ? camera.instance : null;
    this.element = element || document.body;
    this.enabled = true;

    this.target = new THREE.Vector3(0, 0, 0);
    this.radius = 40;
    this.theta = 0;
    this.phi = Math.PI / 2.6;
    this.thetaDelta = 0;
    this.phiDelta = 0;
    this.zoomDelta = 1;

    this.dampingFactor = 0.075;
    this.rotateSpeed = 1.0;
    this.zoomSpeed = 1.0;
    this.minRadius = 6;
    this.maxRadius = 140;
    this.minPhi = 0.12;
    this.maxPhi = Math.PI - 0.12;

    this.pointers = new Map();
    this.lastPinchDistance = 0;
    this.suspended = false;

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onWheel = this._onWheel.bind(this);
    this._onContextMenu = (e) => e.preventDefault();

    this._bind();
  }

  _bind() {
    const el = this.element;
    el.addEventListener('pointerdown', this._onPointerDown);
    el.addEventListener('wheel', this._onWheel, { passive: false });
    el.addEventListener('contextmenu', this._onContextMenu);
  }

  _onPointerDown(event) {
    if (!this.enabled) return;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    this.element.setPointerCapture?.(event.pointerId);
    if (this.pointers.size === 2) this.lastPinchDistance = this._pinchDistance();
  }

  _onPointerMove(event) {
    if (!this.enabled || !this.pointers.has(event.pointerId)) return;

    const previous = this.pointers.get(event.pointerId);
    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    previous.x = event.clientX;
    previous.y = event.clientY;

    if (this.pointers.size === 1) {
      // Rotación
      this.thetaDelta -= dx * 0.005 * this.rotateSpeed;
      this.phiDelta -= dy * 0.005 * this.rotateSpeed;
    } else if (this.pointers.size === 2) {
      // Pellizco (zoom)
      const distance = this._pinchDistance();
      if (this.lastPinchDistance > 0 && distance > 0) {
        const scale = this.lastPinchDistance / distance;
        this.zoomDelta *= (1 + (scale - 1) * this.zoomSpeed);
      }
      this.lastPinchDistance = distance;
    }
  }

  _onPointerUp(event) {
    this.pointers.delete(event.pointerId);
    this.element.releasePointerCapture?.(event.pointerId);
    if (this.pointers.size < 2) this.lastPinchDistance = 0;
  }

  _onWheel(event) {
    if (!this.enabled) return;
    event.preventDefault();
    const delta = event.deltaY || event.detail || 0;
    const scale = 1 + Math.sign(delta) * Math.min(Math.abs(delta) / 120, 3) * 0.08 * this.zoomSpeed;
    this.zoomDelta *= scale;
  }

  _pinchDistance() {
    const [a, b] = [...this.pointers.values()];
    if (!a || !b) return 0;
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  /* ------------------------------------------------------------------ */

  setPose(position, target) {
    const t = target || this.target;
    const p = position || this.cameraInstance.position;
    this.target.copy(t);

    const offset = p.clone().sub(this.target);
    this.radius = Math.max(0.001, offset.length());
    this.theta = Math.atan2(offset.x, offset.z);
    this.phi = Math.acos(Math.max(-1, Math.min(1, offset.y / this.radius)));
    this.thetaDelta = 0;
    this.phiDelta = 0;
    this.zoomDelta = 1;
    this._applyToCamera();
  }

  setLimits(minRadius, maxRadius) {
    this.minRadius = minRadius;
    this.maxRadius = maxRadius;
    this.radius = Math.min(this.maxRadius, Math.max(this.minRadius, this.radius));
  }

  update() {
    if (!this.cameraInstance) return;

    this.theta += this.thetaDelta * this.dampingFactor * 8;
    this.phi += this.phiDelta * this.dampingFactor * 8;
    this.radius /= this.zoomDelta;

    this.thetaDelta *= 1 - this.dampingFactor;
    this.phiDelta *= 1 - this.dampingFactor;
    this.zoomDelta = 1 + (this.zoomDelta - 1) * (1 - this.dampingFactor);

    this.phi = Math.max(this.minPhi, Math.min(this.maxPhi, this.phi));
    this.radius = Math.max(this.minRadius, Math.min(this.maxRadius, this.radius));

    this._applyToCamera();
  }

  _applyToCamera() {
    const sinPhi = Math.sin(this.phi);
    const x = this.target.x + this.radius * sinPhi * Math.sin(this.theta);
    const y = this.target.y + this.radius * Math.cos(this.phi);
    const z = this.target.z + this.radius * sinPhi * Math.cos(this.theta);

    this.cameraInstance.position.set(x, y, z);
    this.cameraInstance.lookAt(this.target);
  }

  dispose() {
    const el = this.element;
    if (el) {
      el.removeEventListener('pointerdown', this._onPointerDown);
      el.removeEventListener('wheel', this._onWheel);
      el.removeEventListener('contextmenu', this._onContextMenu);
    }
    this.pointers.clear();
  }
}
