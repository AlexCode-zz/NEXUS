import * as THREE from 'three';

export class OrbitControls {
  constructor(camera, element) {
    this.camera = camera.instance;
    this.element = element || document.body;
    this.enabled = true;
    this.enableRotate = true;
    this.enableZoom = true;
    this.enablePan = true;

    this.updateCallback = () => {};

    this.mouseDownPos = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.initEvents();
  }

  initEvents() {
    this.element.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.element.addEventListener('wheel', (e) => this.onWheel(e));
  }

  onMouseDown(e) {
    if (!this.enabled) return;

    this.mouseDownPos = { x: e.clientX, y: e.clientY };
    this.element.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.element.addEventListener('mouseup', (e) => this.onMouseUp(e));
  }

  onMouseMove(e) {
    if (!this.mouseDownPos) return;

    const deltaX = (e.clientX - this.mouseDownPos.x) * 0.005;
    const deltaY = (e.clientY - this.mouseDownPos.y) * 0.005;

    if (this.enableRotate) {
      const newPosition = this.camera.position.clone();
      newPosition.x -= deltaX * 5;
      newPosition.y += deltaY * 5;
      this.camera.position.copy(newPosition);
      this.camera.lookAt(0, 0, 0);
    }

    this.mouseDownPos = { x: e.clientX, y: e.clientY };
  }

  onMouseUp() {
    this.mouseDownPos = null;
    this.element.removeEventListener('mousemove', this.onMouseMove);
    this.element.removeEventListener('mouseup', this.onMouseUp);
  }

  onWheel(e) {
    if (!this.enabled) return;

    const delta = e.deltaY || e.wheelDelta;
    const newZ = Math.max(1, Math.min(20, this.camera.position.z + delta * 0.01));
    this.camera.position.z = newZ;
    this.camera.lookAt(0, 0, 0);
  }

  update() {
    this.updateCallback();
  }

  connect() {
    this.updateCallback = () => {};
  }

  disconnect() {
    this.element.removeEventListener('mousedown', this.onMouseDown);
    this.element.removeEventListener('wheel', this.onWheel);
    this.updateCallback = () => {};
  }

  dispose() {
    this.disconnect();
    this.mouseDownPos = null;
    this.raycaster = null;
    this.mouse = null;
    this.camera = null;
    this.element = null;
  }

  handleResize() {
    // Handler de resize simplificado
  }
}