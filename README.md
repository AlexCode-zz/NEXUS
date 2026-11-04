# NEXUS — Laboratorio Visual de Universos Generativos 3D

NEXUS es una aplicación web avanzada de visualización y experimentación 3D impulsada por WebGL y Three.js. Permite explorar, interactuar y generar universos procedurales en tiempo real, completamente independientes de inteligencia artificial y ejecutados de forma local en el navegador.

---

## 🚀 Características Principales

- **4 Universos Procedurales Únicos**:
  1. **Cosmos**: Galaxia espiral con brazos luminosos y rotación orbital.
  2. **Cyberspace**: Red neuronal digital con nodos y conexiones dinámicas.
  3. **Solaris**: Océano de energía con ondas fluidas y tonalidades doradas.
  4. **Singularity**: Agujero negro con disco de acreción y espiral gravitacional.
- **Motor de Interacción Física**: Atracción, repulsión, turbulencia, gravedad y rotación controladas por mouse o dispositivos táctiles.
- **Generación Procedural Avanzada**: Basada en semillas numéricas (`seed`) reproducibles y presets configurables.
- **Galería y Persistencia**: Almacenamiento local mediante `IndexedDB`/`localStorage`, soporte para capturas en PNG y exportación/importación en formato JSON.
- **Rendimiento Adaptativo**: Detección de dispositivos, limitación de pixel ratio y pausa automática en pestañas ocultas (Page Visibility API).
- **Diseño Futurista & Accesibilidad**: Interfaz inspirada en laboratorios científicos, contraste optimizado y soporte para `prefers-reduced-motion`.

---

## 🛠️ Tecnologías

- **Vite** — Entorno de desarrollo rápido y empaquetador moderno.
- **Three.js** — Motor gráfico 3D basado en WebGL.
- **CSS Moderno** — Estilos adaptativos, Grid/Flexbox y variables CSS.
- **JavaScript (ES Modules)** — Arquitectura modular limpia y orientada a objetos.

---

## 📋 Requisitos

- Node.js (v18 o superior recomendado)
- npm (v9 o superior)

---

## 📦 Instalación

```bash
# Clonar el repositorio
git clone https://github.com/AlexCode-zz/NEXUS.git
cd NEXUS

# Instalar dependencias
npm install
```

---

## ⚙️ Comandos de Desarrollo y Producción

```bash
# Iniciar servidor de desarrollo local
npm run dev

# Compilar para producción (genera la carpeta /dist)
npm run build

# Previsualizar el build de producción
npm run preview
```

---

## 📂 Estructura de Carpetas

```text
NEXUS/
├── public/
│   ├── assets/
│   ├── favicon.svg
│   └── interface.html
├── src/
│   ├── core/         # Motor base 3D (Scene, Camera, Renderer, AnimationLoop, OrbitControls)
│   ├── worlds/       # Universos (Cosmos, Cyberspace, Solaris, Singularity, WorldManager)
│   ├── systems/      # Sistemas de partículas, materiales y shaders
│   ├── controls/     # Controlador de interacción física
│   ├── utils/        # Motor procedural, SeededRandom, galería y screenshots
│   ├── styles/       # Hojas de estilo (main, interface, responsive)
│   └── main.js       # Punto de entrada principal
├── index.html
├── package.json
├── .gitignore
├── .env.example
└── README.md
```

---

## 🌌 Funcionamiento de los Universos

Cada universo utiliza geometrías optimizadas en búfer (`BufferGeometry`) y shaders personalizados en GLSL para garantizar un rendimiento fluido con miles de partículas en pantalla, evitando la creación de objetos independientes por partícula.

---

## 🎲 Generación Procedural

NEXUS implementa un generador congruencial lineal (`SeededRandom.js`) que permite reproducir exactamente la misma composición procedural utilizando una semilla numérica (`seed`). Los presets permiten alternar instantáneamente entre diferentes configuraciones visuales.

---

## ⌨️ Controles e Interacción

| Acción / Efecto | Tecla / Control | Descripción |
|-----------------|-----------------|-------------|
| **Cosmos** | `1` | Activa el universo Cosmos |
| **Cyberspace** | `2` | Activa el universo Cyberspace |
| **Solaris** | `3` | Activa el universo Solaris |
| **Singularity** | `4` | Activa el universo Singularity |
| **Attraction** | `A` | Efecto de atracción hacia el cursor |
| **Repulsion** | `R` | Efecto de repulsión desde el cursor |
| **Turbulence** | `T` | Genera caos y turbulencia local |
| **Gravity** | `G` | Atracción hacia el centro del universo |
| **Rotation** | `O` | Gira las partículas alrededor del cursor |
| **Generate** | Botón / `G` | Genera una nueva composición procedural |
| **Randomize** | Botón / `R` | Modifica parámetros aleatorios |
| **Seed** | Botón / `S` | Introduce una semilla numérica |
| **Gallery** | Botón / `P` | Abre la galería de composiciones guardadas |
| **Screenshot** | Botón / `X` | Captura y descarga imagen PNG |

---

## ⚠️ Limitaciones Conocidas

1. **Tamaño de Chunks**: Debido a la inclusión de Three.js y los shaders personalizados, el archivo principal supera los 500KB tras la minificación (advertencia estándar de Rollup sin afectar la funcionalidad).
2. **Dispositivos Móviles**: En dispositivos con GPUs muy limitadas, un número elevado de partículas activas puede reducir ligeramente la tasa de fotogramas (mitigado parcialmente por el sistema de calidad adaptable).

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.
