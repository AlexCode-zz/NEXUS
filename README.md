# NEXUS — Laboratorio Visual de Universos Generativos 3D

NEXUS es una aplicación web avanzada de visualización y experimentación 3D impulsada por WebGL y Three.js. Permite explorar, interactuar y generar universos procedurales en tiempo real, completamente independientes de inteligencia artificial y ejecutados de forma local en el navegador.

---

## 🌌 Universos

| Universo | Descripción |
|----------|-------------|
| **Cosmos** | Galaxia espiral con brazos luminosos y rotación orbital. |
| **Cyberspace** | Red neuronal digital con nodos y conexiones dinámicas. |
| **Solaris** | Océano de energía con ondas fluidas y tonalidades doradas. |

<div align="center">

### Cosmos

<video controls src="public/assets/cosmos-galaxy.mp4" width="100%" max-width="640"></video>

### Cyberspace

<video controls src="public/assets/cyberspace-galaxy.mp4" width="100%" max-width="640"></video>

### Solaris

<video controls src="public/assets/solaris-galaxy.mp4" width="100%" max-width="640"></video>

</div>

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

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.
