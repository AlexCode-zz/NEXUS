export class ParticlePhysics {
  constructor(velocities) {
    this.velocities = velocities;
  }

  update(positionsAttribute, delta, elapsedTime) {
    const positions = positionsAttribute.array;
    const count = positions.length / 3;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Movimiento orbital y turbulencia leve basada en velocidad
      positions[i3] += this.velocities[i3];
      positions[i3 + 1] += this.velocities[i3 + 1];
      positions[i3 + 2] += this.velocities[i3 + 2];

      // Rebotar o regenerar al alejarse demasiado del centro
      const x = positions[i3];
      const y = positions[i3 + 1];
      const z = positions[i3 + 2];
      const distSq = x * x + y * y + z * z;

      if (distSq > 400) { // Radio límite de 20 unidades
        positions[i3] *= 0.1;
        positions[i3 + 1] *= 0.1;
        positions[i3 + 2] *= 0.1;
      }
    }

    positionsAttribute.needsUpdate = true;
  }

  destroy() {
    this.velocities = null;
  }
}
