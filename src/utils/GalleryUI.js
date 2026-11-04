import { CompositionStorage } from './CompositionStorage.js';
import { ScreenshotManager } from './ScreenshotManager.js';

export class GalleryUI {
  constructor(app) {
    this.app = app;
    this.storage = new CompositionStorage();
    this.screenshotManager = new ScreenshotManager(app.canvas);
    this.container = null;
    this.initGalleryDOM();
  }

  initGalleryDOM() {
    const galleryHTML = `
      <div id="nexus-gallery-modal" class="nexus-modal" style="display:none;">
        <div class="modal-content">
          <div class="modal-header">
            <h2>NEXUS COMPOSITION GALLERY</h2>
            <button class="close-btn" onclick="window.nexusApp.galleryUI.toggleGallery(false)">[X]</button>
          </div>
          <div class="modal-actions">
            <button onclick="window.nexusApp.galleryUI.saveCurrentComposition()">SAVE CURRENT</button>
            <button onclick="window.nexusApp.galleryUI.exportJSON()">EXPORT JSON</button>
            <button onclick="window.nexusApp.galleryUI.importJSONPrompt()">IMPORT JSON</button>
          </div>
          <div class="gallery-grid" id="gallery-grid">
            <!-- Items de la galería -->
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', galleryHTML);
  }

  toggleGallery(show) {
    const modal = document.getElementById('nexus-gallery-modal');
    if (modal) {
      modal.style.display = show ? 'flex' : 'none';
      if (show) {
        this.renderGallery();
      }
    }
  }

  async saveCurrentComposition() {
    const name = prompt('Nombre de la composición:', `Universe_${Date.now().toString().slice(-4)}`);
    if (!name) return;

    const thumbnail = await this.screenshotManager.captureThumbnail();
    const composition = {
      id: Date.now().toString(),
      name: name,
      world: this.app.worldManager.currentWorld,
      seed: this.app.proceduralEngine.rng.seed,
      thumbnail: thumbnail,
      date: new Date().toISOString()
    };

    await this.storage.saveComposition(composition);
    this.renderGallery();
    alert('Composición guardada con éxito.');
  }

  async renderGallery() {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;

    const compositions = await this.storage.getCompositions();
    grid.innerHTML = '';

    if (compositions.length === 0) {
      grid.innerHTML = '<p class="no-items">No hay composiciones guardadas.</p>';
      return;
    }

    compositions.forEach(comp => {
      const card = document.createElement('div');
      card.className = 'gallery-card';
      card.innerHTML = `
        ${comp.thumbnail ? `<img src="${comp.thumbnail}" class="card-thumb" />` : '<div class="card-thumb-placeholder">NO THUMB</div>'}
        <div class="card-info">
          <h3>${comp.name}</h3>
          <p>World: ${comp.world}</p>
          <p>Seed: ${comp.seed}</p>
          <p class="date">${new Date(comp.date).toLocaleString()}</p>
        </div>
        <div class="card-actions">
          <button onclick="window.nexusApp.galleryUI.loadComposition('${comp.id}')">LOAD</button>
          <button onclick="window.nexusApp.galleryUI.deleteComposition('${comp.id}')">DELETE</button>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  async loadComposition(id) {
    const comp = await this.storage.getComposition(id);
    if (comp) {
      this.app.worldManager.activateWorld(comp.world);
      this.app.proceduralEngine.setSeed(comp.seed);
      this.app.proceduralEngine.randomizeParams(this.app.worldManager.worlds[comp.world]);
      this.app.updateActiveWorldInfo(comp.world);
      this.toggleGallery(false);
      alert(`Composición "${comp.name}" cargada con éxito.`);
    }
  }

  async deleteComposition(id) {
    if (confirm('¿Estás seguro de eliminar esta composición?')) {
      await this.storage.deleteComposition(id);
      this.renderGallery();
    }
  }

  async exportJSON() {
    const compositions = await this.storage.getCompositions();
    const jsonString = JSON.stringify(compositions, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nexus-compositions-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  importJSONPrompt() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          if (item.name && item.world && item.seed) {
            await this.storage.saveComposition(item);
          }
        }
        this.renderGallery();
        alert('Composiciones importadas con éxito.');
      } catch (err) {
        alert('Error al importar JSON: Archivo no válido.');
      }
    };
    input.click();
  }

  captureScreenshot() {
    this.screenshotManager.captureScreenshot();
  }
}
