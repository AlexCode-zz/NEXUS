export class ScreenshotManager {
  constructor(canvas) {
    this.canvas = canvas;
  }

  captureScreenshot() {
    try {
      // Crear un elemento temporal para la descarga
      const link = document.createElement('a');
      link.download = `nexus-screenshot-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
      link.href = this.canvas.toDataURL('image/png', 1.0);
      link.click();

      // Limpiar el elemento temporal
      setTimeout(() => {
        URL.revokeObjectURL(link.href);
      }, 100);

      return true;
    } catch (e) {
      console.error('Error al capturar screenshot:', e);
      return false;
    }
  }

  async captureThumbnail() {
    try {
      // Crear un canvas temporal para la miniatura
      const tempCanvas = document.createElement('canvas');
      const ctx = tempCanvas.getContext('2d');
      const scaleFactor = 0.25; // Reducir a 25% del tamaño original

      tempCanvas.width = this.canvas.width * scaleFactor;
      tempCanvas.height = this.canvas.height * scaleFactor;

      // Dibujar el canvas original escalado
      ctx.drawImage(
        this.canvas,
        0, 0, this.canvas.width, this.canvas.height,
        0, 0, tempCanvas.width, tempCanvas.height
      );

      // Convertir a blob y luego a base64
      const blob = await new Promise(resolve => tempCanvas.toBlob(resolve, 'image/jpeg', 0.7));
      const reader = new FileReader();

      return new Promise((resolve) => {
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error('Error al crear miniatura:', e);
      return null;
    }
  }
}
