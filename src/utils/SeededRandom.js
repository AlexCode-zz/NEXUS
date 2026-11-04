// Basado en el algoritmo de LCG (Linear Congruential Generator)
export class SeededRandom {
  constructor(seed = 12345) {
    this.seed = seed;
  }

  // Genera un número aleatorio entre 0 y 1
  random() {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  // Genera un entero en rango [min, max]
  range(min, max) {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  // Genera un float en rango [min, max]
  float(min, max) {
    return this.random() * (max - min) + min;
  }
}
