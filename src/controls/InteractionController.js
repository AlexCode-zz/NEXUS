import * as THREE from 'three';

export class InteractionController {
  constructor(camera, renderer, worldManager) {
    this.camera = camera;
    this.renderer = renderer;
    this.worldManager = worldManager;
    this.mouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points.threshold = 0.2;
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

    this.initEventListeners();
  }

  initEventListeners() {
    // Mouse events
    this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.renderer.domElement.addEventListener('mousedown', () => this.isMouseDown = true);
    this.renderer.domElement.addEventListener('mouseup', () => this.isMouseDown = false);

    // Touch events
    this.renderer.domElement.addEventListener('touchmove', (e) => this.onTouchMove(e));
    this.renderer.domElement.addEventListener('touchstart', () => this.isMouseDown = true);
    this.renderer.domElement.addEventListener('touchend', () => this.isMouseDown = false);

    // Keyboard events
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
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
    if (!this.worldManager.currentWorld) return;

    const currentWorld = this.worldManager.worlds[this.worldManager.currentWorld];

    // Raycasting para detectar partículas
    this.raycaster.setFromCamera(this.mouse, this.camera.instance);
    let intersects = [];

    if (currentWorld.mesh) {
      intersects = this.raycaster.intersectObject(currentWorld.mesh);
    } else if (currentWorld.nodesMesh) {
      intersects = this.raycaster.intersectObject(currentWorld.nodesMesh);
    }

    // Aplicar efecto de interacción
    if (intersects.length > 0) {
      const intersect = intersects[0];
      this.effects[this.currentEffect](intersect);
    }
  }

  applyAttraction(intersect) {
    const posAttr = intersect.object.geometry.getAttribute('position');
    const positions = posAttr.array;

    const index = intersect.index;
    if (index === undefined) return;

    const i3 = index * 3;
    const x = positions[i3];
    const y = positions[i3 + 1];
    const z = positions[i3 + 2];

    // Vector de atracción hacia el punto de intersección
    const force = this.interactionStrength * (this.isMouseDown ? 2 : 1);
    positions[i3] += (intersect.point.x - x) * force;
    positions[i3 + 1] += (intersect.point.y - y) * force;
    positions[i3 + 2] += (intersect.point.z - z) * force;

    posAttr.needsUpdate = true;
  }

  applyRepulsion(intersect) {
    const posAttr = intersect.object.geometry.getAttribute('position');
    const positions = posAttr.array;

    const index = intersect.index;
    if (index === undefined) return;

    const i3 = index * 3;
    const x = positions[i3];
    const y = positions[i3 + 1];
    const z = positions[i3 + 2];

    // Vector de repulsión desde el punto de intersección
    const force = this.interactionStrength * (this.isMouseDown ? 2 : 1);
    positions[i3] += (x - intersect.point.x) * force;
    positions[i3 + 1] += (y - intersect.point.y) * force;
    positions[i3 + 2] += (z - intersect.point.z) * force;

    posAttr.needsUpdate = true;
  }

  applyTurbulence(intersect) {
    const posAttr = intersect.object.geometry.getAttribute('position');
    const positions = posAttr.array;

    const index = intersect.index;
    if (index === undefined) return;

    const i3 = index * 3;
    const force = this.interactionStrength * 0.5 * (this.isMouseDown ? 3 : 1);

    // Turbulencia aleatoria en la zona
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
    const x = positions[i3];
    const y = positions[i3 + 1];
    const z = positions[i3 + 2];

    // Gravedad hacia el centro
    const force = this.interactionStrength * (this.isMouseDown ? 2 : 1);
    positions[i3] += -x * force * 0.1;
    positions[i3 + 1] += -y * force * 0.1;
    positions[i3 + 2] += -z * force * 0.1;

    posAttr.needsUpdate = true;
  }

  applyRotation(intersect) {
    const posAttr = intersect.object.geometry.getAttribute('position');
    const positions = posAttr.array;

    const index = intersect.index;
    if (index === undefined) return;

    const i3 = index * 3;
    const x = positions[i3];
    const y = positions[i3 + 1];
    const z = positions[i3 + 2];

    // Rotación alrededor del punto de intersección
    const force = this.interactionStrength * (this.isMouseDown ? 2 : 1);
    const angle = Date.now() * 0.001;
    const cosA = Math.cos(angle) * force;
    const sinA = Math.sin(angle) * force;

    positions[i3] = intersect.point.x + (x - intersect.point.x) * cosA - (z - intersect.point.z) * sinA;
    positions[i3 + 2] = intersect.point.z + (x - intersect.point.x) * sinA + (z - intersect.point.z) * cosA;

    posAttr.needsUpdate = true;
  }

  onKeyDown(e) {
    switch(e.code) {
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

    console.log(`Efecto actual: ${this.currentEffect}, Radio: ${this.interactionRadius.toFixed(1)}, Fuerza: ${this.interactionStrength.toFixed(2)}`);
  }

  destroy() {
    const element = this.renderer.domElement;
    element.removeEventListener('mousemove', this.onMouseMove);
    element.removeEventListener('mousedown', this.onMouseDown);
    element.removeEventListener('mouseup', this.onMouseUp);
    element.removeEventListener('touchmove', this.onTouchMove);
    element.removeEventListener('touchstart', this.onTouchStart);
    element.removeEventListener('touchend', this.onTouchEnd);
    window.removeEventListener('keydown', this.onKeyDown);

    this.mouse = null;
    this.raycaster = null;
  }
}
