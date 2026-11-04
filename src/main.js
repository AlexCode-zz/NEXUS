import './styles/main.css';

import * as THREE from 'three';
import { Scene } from './core/Scene.js';
import { Camera } from './core/Camera.js';
import { Renderer } from './core/Renderer.js';
import { AnimationLoop } from './core/AnimationLoop.js';
import { OrbitControls } from './core/OrbitControls.js';
import { WorldManager } from './worlds/WorldManager.js';
import { Background } from './worlds/Background.js';
import { InteractionController } from './controls/InteractionController.js';
import { ProceduralEngine } from './utils/ProceduralEngine.js';
import { GalleryUI } from './utils/GalleryUI.js';
import { PALETTES } from './utils/Palettes.js';

const DEFAULT_SEED = 12345;

/**
 * WORLD_META — Configuración visual por universo:
 *  pose   → posición orbital de la cámara (radio, inclinación, azimuth)
 *  limits → distancias mínima y máxima de la cámara orbital
 *  defaults → valores iniciales de los controles
 */
const WORLD_META = {
  cosmos: {
    display: 'Cosmos',
    pose: { radius: 48, phi: 1.02, theta: 0.42 },
    limits: [16, 150],
    defaults: { density: 100, speed: 1.0, turbulence: 0.0, attraction: 0.0, glow: 1.2, rotation: 1.0 }
  },
  cyberspace: {
    display: 'Cyber',
    pose: { radius: 27, phi: 1.22, theta: -0.35 },
    limits: [10, 70],
    defaults: { density: 60, speed: 1.2, turbulence: 0.4, attraction: 0.0, glow: 1.0, rotation: 0.6 }
  },
  solaris: {
    display: 'Solaris',
    pose: { radius: 40, phi: 0.98, theta: 0.28 },
    limits: [14, 110],
    defaults: { density: 80, speed: 1.0, turbulence: 0.6, attraction: 0.0, glow: 1.4, rotation: 0.8 }
  },
  singularity: {
    display: 'Void',
    pose: { radius: 36, phi: 1.12, theta: -0.5 },
    limits: [10, 90],
    defaults: { density: 100, speed: 1.6, turbulence: 0.2, attraction: 0.8, glow: 1.6, rotation: 1.2 }
  }
};

class NexusApp {
  constructor() {
    window.nexusApp = this;

    this.canvas = document.querySelector('#nexus-canvas');
    if (!this.canvas) {
      console.error('Canvas #nexus-canvas no encontrado');
      this._showFallback('No se encontró el elemento canvas en el documento.');
      return;
    }

    this.seed = DEFAULT_SEED;
    this.paletteIndex = 0;
    this.qualitySettings = {};
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.animationLoop = null;
    this.worldManager = null;
    this.background = null;
    this.interactionController = null;
    this.proceduralEngine = null;
    this.galleryUI = null;

    this.bounds = { width: window.innerWidth, height: window.innerHeight };
    this._prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this._onResize = this._onResize.bind(this);
    this._onVisibilityChange = this._onVisibilityChange.bind(this);

    this.init();
  }

  /* ==================================================================== */
  async init() {
    try {
      this._detectQuality();

      this.scene = new Scene();
      this.camera = new Camera();
      this.renderer = new Renderer(this.canvas, this.qualitySettings);

      // Controles orbitales de cámara
      this.camera.controls = new OrbitControls(this.camera, this.canvas);

      // Fondo espacial persistente (estrellas + nebulosas)
      this.background = new Background(this.scene, this.qualitySettings, DEFAULT_SEED + 7);
      this.background.build();

      this.worldManager = new WorldManager(this.scene, this.qualitySettings, this.seed);

      this.proceduralEngine = new ProceduralEngine();
      this.proceduralEngine.setSeed(this.seed);

      this.galleryUI = new GalleryUI(this);
      this.interactionController = new InteractionController(this.camera, this.renderer, this.worldManager);

      // Universo por defecto
      this.setWorld('cosmos', WORLD_META.cosmos.display, { silent: true });

      this._setupUIControls();
      this._setupKeyboardShortcuts();

      // Bucle de animación
      let lastTime = performance.now();
      let frames = 0;

      this.animationLoop = new AnimationLoop((delta, elapsedTime) => {
        this.camera.controls.update();
        this.interactionController.update();

        if (this.background) this.background.update(delta, elapsedTime);
        if (this.worldManager) this.worldManager.update(delta, elapsedTime);

        this.renderer.render(this.scene, this.camera);

        frames++;
        const now = performance.now();
        if (now >= lastTime + 1000) {
          this._updateFPS(frames);
          frames = 0;
          lastTime = now;
        }
      });

      document.addEventListener('visibilitychange', this._onVisibilityChange);
      window.addEventListener('resize', this._onResize);
      if (window.ResizeObserver) {
        this._resizeObserver = new ResizeObserver(this._onResize);
        this._resizeObserver.observe(this.canvas);
      }

      this.animationLoop.start();

      this._updateSeedDisplay();
      this._updateParticleCountDisplay();
      this._setStatus('Activo', true);

      console.log('NEXUS Engine v1.0.0 Inicializado Correctamente');
    } catch (error) {
      console.error('Error al inicializar NEXUS:', error);
      this.handleInitError(error);
    }
  }

  /* ==================================================================== */
  /* Configuración de calidad                                             */
  /* ==================================================================== */

  _detectQuality() {
    const isMobile = window.innerWidth < 861 || /Mobi|Android|iPhone/i.test(navigator.userAgent);
    const prefersReduced = this._prefersReducedMotion;

    if (prefersReduced) {
      this.qualitySettings = { maxParticles: 2600, particleSize: 0.8, qualityLevel: 'low' };
    } else if (isMobile) {
      this.qualitySettings = { maxParticles: 9000, particleSize: 0.9, qualityLevel: 'medium' };
    } else {
      this.qualitySettings = { maxParticles: 24000, particleSize: 1.0, qualityLevel: 'high' };
    }
  }

  /* ==================================================================== */
  /* Ciclo de vida                                                        */
  /* ==================================================================== */

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (w === this.bounds.width && h === this.bounds.height) return;

    this.bounds.width = w;
    this.bounds.height = h;

    const previousQuality = JSON.stringify(this.qualitySettings);
    this._detectQuality();
    this.camera.resize();
    this.renderer.resize();
    this._applyViewOffset();

    // Solo reconstruir si ha cambiado el nivel de calidad (ej. cruzar el
    // umbral móvil/escritorio), no en cada evento de redimensionado.
    const currentQuality = JSON.stringify(this.qualitySettings);
    if (currentQuality !== previousQuality && this.currentWorld) {
      clearTimeout(this._resizeTimer);
      this._resizeTimer = setTimeout(() => {
        this.worldManager.activateWorld(this.currentWorld);
        this.worldManager.setPalette(this.paletteIndex);
        this._updateParticleCountDisplay();
      }, 250);
    }
  }

  _onVisibilityChange() {
    if (!this.animationLoop) return;
    if (document.hidden) {
      this.animationLoop.stop();
      this._setStatus('En pausa', false);
    } else {
      this.animationLoop.start();
      this._setStatus('Activo', true);
    }
  }

  /* ==================================================================== */
  /* API pública (UI)                                                     */
  /* ==================================================================== */

  setWorld(worldName, displayName = null, options = {}) {
    if (!this.worldManager || !WORLD_META[worldName]) return;

    this.worldManager.activateWorld(worldName);
    this._positionCameraForWorld(worldName);
    this._applyViewOffset();

    this.currentWorld = worldName;
    this.paletteIndex = Math.max(0, PALETTES.indexOf(PALETTES[this.paletteIndex] || PALETTES[0]));
    this.worldManager.setPalette(this.paletteIndex);
    this.background.setPalette(this.paletteIndex);

    this.updateActiveWorldInfo(displayName || WORLD_META[worldName].display);
    this._syncControlsToWorld(worldName);
    this._setStatus('Activo', true);

    if (!options.silent) {
      console.log(`Universo activo: ${WORLD_META[worldName].display} (seed ${this.seed})`);
    }
  }

  _positionCameraForWorld(worldName) {
    const meta = WORLD_META[worldName] || WORLD_META.cosmos;
    const { radius, phi, theta } = meta.pose;
    const cam = this.camera.instance;

    cam.position.set(0, 0, radius);
    this.camera.controls.setPose(cam.position.clone(), new THREE.Vector3(0, 0, 0));
    this.camera.controls.radius = radius;
    this.camera.controls.phi = phi;
    this.camera.controls.theta = theta;
    this.camera.controls.setLimits(meta.limits[0], meta.limits[1]);
    this.camera.controls.zoomDelta = 1;
    this.camera.controls.update();
  }

  generateNewComposition() {
    const world = this.worldManager && this.worldManager.getCurrentWorldInstance();
    if (!world) return;

    // Nueva semilla procedural
    this.seed = (Math.floor(Math.random() * 0xffffff) + 1) >>> 0;
    this.proceduralEngine.setSeed(this.seed);
    this.worldManager.setSeed(this.seed);
    this.proceduralEngine.randomizeParams(world);

    this.worldManager.setPalette(this.paletteIndex);
    this._syncSlidersFromWorld();
    this._updateSeedDisplay();
    this._updateParticleCountDisplay();
    this._toast(`Nueva composición generada · seed #${this.seed}`);
  }

  randomizeParams() {
    const world = this.worldManager && this.worldManager.getCurrentWorldInstance();
    if (!world) return;

    const rand = (min, max) => min + Math.random() * (max - min);

    const params = {
      speed: rand(0.2, 3.0),
      glow: rand(0.6, 2.6),
      rotation: rand(0.2, 2.4),
      density: Math.round(rand(35, 100))
    };
    if (world.params.turbulence !== undefined) params.turbulence = rand(0, 1.8);
    if (world.params.attraction !== undefined) params.attraction = rand(0, 1.6);

    world.setParams(params);
    world.setDensity(params.density / 100);

    // Reflejar en los sliders
    this._syncSlidersFromWorld();
    this._updateParticleCountDisplay();
    this._toast('Parámetros aleatorios aplicados');
  }

  resetSystem() {
    const world = this.worldManager && this.worldManager.getCurrentWorldInstance();
    if (!world) return;

    this.seed = DEFAULT_SEED;
    this.proceduralEngine.setSeed(this.seed);
    this.worldManager.setSeed(this.seed);
    this.worldManager.activateWorld(this.currentWorld);

    this.paletteIndex = 0;
    this.worldManager.setPalette(0);
    this.background.setPalette(0);
    this._syncPaletteUI();

    this._positionCameraForWorld(this.currentWorld);
    this._syncControlsToWorld(this.currentWorld);
    this._updateSeedDisplay();
    this._updateParticleCountDisplay();
    this._toast('Universo reiniciado a los valores iniciales');
  }

  showSeedDialog() {
    const seed = prompt('Introduce una semilla numérica para reproducir una composición:', String(this.seed));
    if (seed === null) return;
    const parsed = parseInt(seed, 10);
    if (!isNaN(parsed)) {
      this.seed = parsed >>> 0;
      this.proceduralEngine.setSeed(this.seed);
      this.worldManager.setSeed(this.seed);
      this.generateNewComposition();
      this._updateSeedDisplay();
    }
  }

  setEffect(effect) {
    if (!this.interactionController) return;
    this.interactionController.currentEffect = effect;
    document.querySelectorAll('[data-effect]').forEach((b) => {
      b.classList.toggle('active', b.dataset.effect === effect);
    });
  }

  setPalette(index) {
    if (index < 0 || index >= PALETTES.length) return;
    this.paletteIndex = index;
    this.worldManager.setPalette(index);
    this.background.setPalette(index);
    this._syncPaletteUI();
    this._toast(`Paleta: ${PALETTES[index].name}`);
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  /* ==================================================================== */
  /* Telemetría                                                           */
  /* ==================================================================== */

  updateActiveWorldInfo(name) {
    const els = [document.getElementById('active-world'), document.getElementById('footer-world')];
    els.forEach((el) => { if (el) el.textContent = name; });
  }

  _updateSeedDisplay() {
    const el = document.getElementById('current-seed');
    if (el) el.textContent = `#${this.seed}`;
  }

  _updateParticleCountDisplay() {
    const el = document.getElementById('particle-count');
    if (!el) return;
    const count = this.worldManager.getParticleCount();
    el.textContent = count.toLocaleString('es-ES');
  }

  _updateFPS(frames) {
    const el = document.getElementById('fps');
    if (el) el.textContent = String(frames);
  }

  _setStatus(text, online) {
    const headerEl = document.getElementById('status-text');
    if (headerEl) headerEl.textContent = online ? 'Online' : text;

    const footerEl = document.getElementById('footer-status');
    if (footerEl) footerEl.textContent = online ? 'Activo' : text;

    [document.getElementById('status-dot'), document.getElementById('footer-dot')].forEach((dot) => {
      if (!dot) return;
      dot.style.background = online ? 'var(--nx-cyan)' : '#ff5470';
      dot.style.boxShadow = `0 0 12px ${online ? 'var(--nx-cyan)' : '#ff5470'}`;
    });
  }

  _showFallback(message) {
    const fallback = document.getElementById('nx-fallback');
    const msg = document.getElementById('nx-fallback-msg');
    if (msg && message) msg.textContent = message;
    if (fallback) fallback.hidden = false;
  }

  _toast(message) {
    let toast = document.querySelector('.nx-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'nx-toast';
      document.getElementById('app').appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => toast.classList.remove('visible'), 2600);
  }

  /* ==================================================================== */
  /* Controles                                                            */
  /* ==================================================================== */

  _setupUIControls() {
    // --- Selector de universos (pestañas + tarjetas del panel) ---
    document.querySelectorAll('[data-world]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.setWorld(btn.dataset.world);
        this._markActiveWorld(btn.dataset.world);
      });
    });

    // --- Acciones del panel izquierdo ---
    const get = (id) => document.getElementById(id);
    get('btn-generate')?.addEventListener('click', () => this.generateNewComposition());
    get('btn-randomize')?.addEventListener('click', () => this.randomizeParams());
    get('btn-reset')?.addEventListener('click', () => this.resetSystem());
    get('btn-fullscreen')?.addEventListener('click', () => this.toggleFullscreen());

    // --- Acciones del footer ---
    get('btn-capture')?.addEventListener('click', () => this.galleryUI.captureScreenshot());
    get('btn-save')?.addEventListener('click', () => this.saveComposition());
    get('btn-share')?.addEventListener('click', () => this.shareComposition());

    // --- Modos de interacción ---
    document.querySelectorAll('[data-effect]').forEach((btn) => {
      btn.addEventListener('click', () => this.setEffect(btn.dataset.effect));
    });

    // --- Paleta de colores ---
    document.querySelectorAll('.nx-swatch').forEach((swatch, index) => {
      swatch.addEventListener('click', () => this.setPalette(index));
    });

    // --- Contraer paneles ---
    document.querySelectorAll('.nx-collapse').forEach((btn) => {
      btn.addEventListener('click', () => {
        const panel = document.getElementById(btn.dataset.target);
        if (panel) {
          panel.classList.toggle('collapsed');
          setTimeout(() => this._applyViewOffset(), 300);
        }
      });
    });

    // --- Abrir paneles en móvil (solo uno visible a la vez) ---
    get('btn-panel-left')?.addEventListener('click', () => this._toggleMobilePanel('panel-left'));
    get('btn-panel-right')?.addEventListener('click', () => this._toggleMobilePanel('panel-right'));

    // --- Sliders ---
    const sliders = [
      { id: 'ctrl-density', out: 'val-density', format: (v) => this._densityLabel(v), apply: (v) => this._setDensity(v / 100) },
      { id: 'ctrl-speed', out: 'val-speed', format: (v) => parseFloat(v).toFixed(1), apply: (v) => this._setParam('speed', parseFloat(v)) },
      { id: 'ctrl-turbulence', out: 'val-turbulence', format: (v) => parseFloat(v).toFixed(1), apply: (v) => this._setParam('turbulence', parseFloat(v)) },
      { id: 'ctrl-attraction', out: 'val-attraction', format: (v) => parseFloat(v).toFixed(1), apply: (v) => this._setParam('attraction', parseFloat(v)) },
      { id: 'ctrl-glow', out: 'val-glow', format: (v) => parseFloat(v).toFixed(1), apply: (v) => this._setParam('glow', parseFloat(v)) },
      { id: 'ctrl-rotation', out: 'val-rotation', format: (v) => parseFloat(v).toFixed(1), apply: (v) => this._setParam('rotation', parseFloat(v)) }
    ];

    sliders.forEach((slider) => {
      const el = document.getElementById(slider.id);
      const out = document.getElementById(slider.out);
      if (!el || !out) return;

      const paint = () => {
        const min = parseFloat(el.min);
        const max = parseFloat(el.max);
        const pct = ((parseFloat(el.value) - min) / (max - min)) * 100;
        el.style.setProperty('--pct', `${pct}%`);
      };
      const sync = () => {
        out.textContent = slider.format(el.value);
        paint();
      };

      el.addEventListener('input', () => {
        sync();
        slider.apply(el.value);
      });
      sync();
      el._sync = sync;
    });
  }

  _markActiveWorld(worldName) {
    document.querySelectorAll('[data-world]').forEach((b) => {
      b.classList.toggle('active', b.dataset.world === worldName);
    });
  }

  _toggleMobilePanel(id) {
    const panel = document.getElementById(id);
    if (!panel) return;
    const willOpen = !panel.classList.contains('panel-open');
    ['panel-left', 'panel-right'].forEach((p) => {
      document.getElementById(p)?.classList.remove('panel-open');
    });
    if (willOpen) panel.classList.add('panel-open');
  }

  _syncControlsToWorld(worldName) {
    const meta = WORLD_META[worldName] || WORLD_META.cosmos;
    const d = meta.defaults;
    const set = (id, value) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.value = value;
      if (typeof el._sync === 'function') el._sync();
    };

    set('ctrl-density', d.density);
    set('ctrl-speed', d.speed);
    set('ctrl-turbulence', d.turbulence);
    set('ctrl-attraction', d.attraction);
    set('ctrl-glow', d.glow);
    set('ctrl-rotation', d.rotation);

    this._markActiveWorld(worldName);
    this._updateParticleCountDisplay();
  }

  _densityLabel(sliderValue) {
    const fraction = parseFloat(sliderValue) / 100;
    const world = this.worldManager && this.worldManager.getCurrentWorldInstance();
    if (!world || typeof world.setDensity !== 'function') return '0';

    // Recuento exacto que se obtendrá al aplicar esta densidad
    const particles = Math.floor(this._worldBaseCount() * fraction);
    const total = particles + this._worldExtraCount(particles);
    return total.toLocaleString('es-ES');
  }

  _worldBaseCount() {
    const world = this.worldManager && this.worldManager.getCurrentWorldInstance();
    const base = this.qualitySettings.maxParticles || 24000;
    if (!world) return base;

    if (world.name === 'cyberspace') {
      return Math.min(Math.floor(base / 90), 200);
    }
    if (world.name === 'solaris') {
      const grid = Math.min(Math.floor(Math.sqrt(base)), 120);
      return grid * grid;
    }
    // Cosmos y Singularity: partículas base
    return base;
  }

  /** Elementos adicionales que forman parte del recuento total. */
  _worldExtraCount(baseParticles) {
    const world = this.worldManager && this.worldManager.getCurrentWorldInstance();
    const quality = this.qualitySettings.qualityLevel;
    if (!world) return 0;

    if (world.name === 'cosmos') {
      return quality === 'low' ? 60 : quality === 'medium' ? 120 : 200; // asteroides
    }
    if (world.name === 'solaris') {
      return Math.max(120, Math.floor(baseParticles * 0.04)); // brasas
    }
    return 0;
  }

  /** Sincroniza los sliders con los parámetros reales del universo. */
  _syncSlidersFromWorld() {
    const world = this.worldManager && this.worldManager.getCurrentWorldInstance();
    if (!world) return;

    const set = (id, value) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.value = value;
      if (typeof el._sync === 'function') el._sync();
    };

    const count = world.params.particleCount ?? world.params.nodeCount ?? 0;
    const density = Math.max(10, Math.min(100, Math.round((count / this._worldBaseCount()) * 100)));
    set('ctrl-density', density);
    if (world.params.speed !== undefined) set('ctrl-speed', Number(world.params.speed).toFixed(1));
    if (world.params.turbulence !== undefined) set('ctrl-turbulence', Number(world.params.turbulence).toFixed(1));
    if (world.params.attraction !== undefined) set('ctrl-attraction', Number(world.params.attraction).toFixed(1));
    if (world.params.glow !== undefined) set('ctrl-glow', Number(world.params.glow).toFixed(1));
    if (world.params.rotation !== undefined) set('ctrl-rotation', Number(world.params.rotation).toFixed(1));
  }

  _setParam(name, value) {
    const world = this.worldManager && this.worldManager.getCurrentWorldInstance();
    if (!world || typeof world.setParams !== 'function') return;
    world.setParams({ [name]: value });
  }

  _setDensity(fraction) {
    const world = this.worldManager && this.worldManager.getCurrentWorldInstance();
    if (!world) return;
    if (typeof world.setDensity === 'function') world.setDensity(fraction);
    this._updateParticleCountDisplay();
  }

  _syncPaletteUI() {
    document.querySelectorAll('.nx-swatch').forEach((swatch, index) => {
      swatch.classList.toggle('active', index === this.paletteIndex);
    });
  }

  /* ==================================================================== */
  /* Guardar / Compartir                                                  */
  /* ==================================================================== */

  _collectComposition() {
    const world = this.worldManager && this.worldManager.getCurrentWorldInstance();
    return {
      app: 'NEXUS',
      version: 1,
      world: this.currentWorld,
      seed: this.seed,
      palette: PALETTES[this.paletteIndex].name,
      paletteIndex: this.paletteIndex,
      params: world ? { ...world.params } : {},
      particleCount: this.worldManager.getParticleCount(),
      savedAt: new Date().toISOString()
    };
  }

  saveComposition() {
    const composition = this._collectComposition();
    try {
      const all = JSON.parse(localStorage.getItem('nexus-compositions') || '[]');
      all.unshift(composition);
      localStorage.setItem('nexus-compositions', JSON.stringify(all.slice(0, 20)));
    } catch (e) {
      console.warn('No se pudo guardar en localStorage:', e);
    }

    const blob = new Blob([JSON.stringify(composition, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nexus-${composition.world}-${composition.seed}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
    this._toast('Composición guardada');
  }

  async shareComposition() {
    const url = `${location.origin}${location.pathname}#seed=${this.seed}&world=${this.currentWorld}`;
    try {
      await navigator.clipboard.writeText(url);
      this._toast('Enlace copiado al portapapeles');
    } catch (e) {
      console.warn('No se pudo copiar el enlace:', e);
      this._toast(url);
    }
  }

  /* ==================================================================== */
  /* Atajos de teclado                                                    */
  /* ==================================================================== */

  _setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;

      const worlds = { Digit1: 'cosmos', Digit2: 'cyberspace', Digit3: 'solaris', Digit4: 'singularity' };
      if (worlds[e.code]) {
        this.setWorld(worlds[e.code]);
        return;
      }

      switch (e.code) {
        case 'KeyG': this.generateNewComposition(); break;
        case 'KeyR': this.randomizeParams(); break;
        case 'KeyS': this.showSeedDialog(); break;
        case 'KeyX': this.galleryUI.captureScreenshot(); break;
        case 'KeyP': this.galleryUI.toggleGallery(true); break;
        case 'KeyF': this.toggleFullscreen(); break;
        case 'BracketLeft': this.setPalette((this.paletteIndex + PALETTES.length - 1) % PALETTES.length); break;
        case 'BracketRight': this.setPalette((this.paletteIndex + 1) % PALETTES.length); break;
        default: break;
      }
    });
  }

  /* ==================================================================== */
  /* Composición: desplazamiento de la galaxia según los paneles          */
  /* ==================================================================== */

  _applyViewOffset() {
    const cam = this.camera && this.camera.instance;
    if (!cam) return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    const isDesktop = w >= 861;

    if (!isDesktop) {
      if (typeof cam.clearViewOffset === 'function') cam.clearViewOffset();
      cam.updateProjectionMatrix();
      return;
    }

    const left = this._panelVisibleWidth('panel-left');
    const right = this._panelVisibleWidth('panel-right');
    const gapCenter = left + (w - left - right) / 2;

    // Desplazamiento ligero a la derecha: la galaxia no queda centrada
    // cuando los paneles están abiertos.
    const shift = gapCenter - w / 2 + w * 0.035;

    if (Math.abs(shift) < 2) {
      if (typeof cam.clearViewOffset === 'function') cam.clearViewOffset();
    } else {
      cam.setViewOffset(w, h, -shift, 0, w, h);
    }
    cam.updateProjectionMatrix();
  }

  _panelVisibleWidth(id) {
    const panel = document.getElementById(id);
    if (!panel) return 0;
    const style = window.getComputedStyle(panel);
    if (style.display === 'none' || style.visibility === 'hidden') return 0;
    return panel.getBoundingClientRect().width || 0;
  }

  /* ==================================================================== */
  /* Limpieza                                                             */
  /* ==================================================================== */

  handleInitError(error) {
    this._setStatus('Error', false);
    this._showFallback(`No se pudo iniciar el motor 3D: ${error && error.message ? error.message : error}`);
  }

  destroy() {
    window.removeEventListener('resize', this._onResize);
    document.removeEventListener('visibilitychange', this._onVisibilityChange);
    if (this._resizeObserver) this._resizeObserver.disconnect();
    window.nexusApp = null;

    this.interactionController?.destroy();
    this.background?.destroy();
    this.worldManager?.destroy();
    this.animationLoop?.destroy();
    this.camera?.destroy();
    this.renderer?.destroy();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new NexusApp();
});

window.addEventListener('beforeunload', () => {
  if (window.nexusApp) window.nexusApp.destroy();
});
