# NEXUS — Laboratorio Visual de Universos Generativos 3D

NEXUS es una aplicación web avanzada de visualización y experimentación 3D impulsada por WebGL y Three.js. Permite explorar, interactuar y generar universos procedurales en tiempo real, completamente independientes de inteligencia artificial y ejecutados de forma local en el navegador.

---

## Universos

| Universo | Descripción | Video |
|----------|-------------|-------|
| **Cosmos** | Galaxia espiral con brazos luminosos y rotación orbital. | [Ver video](https://github.com/AlexCode-zz/NEXUS/raw/main/public/assets/cosmos-galaxy.mp4) |
| **Cyberspace** | Red neuronal digital con nodos y conexiones dinámicas. | [Ver video](https://github.com/AlexCode-zz/NEXUS/raw/main/public/assets/cyberspace-galaxy.mp4) |
| **Solaris** | Océano de energía con ondas fluidas y tonalidades doradas. | [Ver video](https://github.com/AlexCode-zz/NEXUS/raw/main/public/assets/solaris-galaxy.mp4) |

---

## Tecnologias

- **Vite** — Entorno de desarrollo rápido y empaquetador moderno.
- **Three.js** — Motor grafico 3D basado en WebGL.
- **CSS Moderno** — Estilos adaptativos, Grid/Flexbox y variables CSS.
- **JavaScript (ES Modules)** — Arquitectura modular limpia y orientada a objetos.

---

## Requisitos

- Node.js (v18 o superior recomendado)
- npm (v9 o superior)

---

## Instalacion

```bash
# Clonar el repositorio
git clone https://github.com/AlexCode-zz/NEXUS.git
cd NEXUS

# Instalar dependencias
npm install
```

---

## Comandos de Desarrollo y Produccion

```bash
# Iniciar servidor de desarrollo local
npm run dev

# Compilar para produccion (genera la carpeta /dist)
npm run build

# Previsualizar el build de produccion
npm run preview
```

---

## Estructura de Carpetas

```text
NEXUS/
├── public/
│   ├── assets/
│   ├── favicon.svg
│   └── interface.html
├── src/
│   ├── core/         # Motor base 3D (Scene, Camera, Renderer, AnimationLoop, OrbitControls)
│   ├── worlds/       # Universos (Cosmos, Cyberspace, Solaris, Singularity, WorldManager)
│   ├── systems/      # Sistemas de particulas, materiales y shaders
│   ├── controls/     # Controlador de interaccion fisica
│   ├── utils/        # Motor procedural, SeededRandom, galeria y screenshots
│   ├── styles/       # Hojas de estilo (main, interface, responsive)
│   └── main.js       # Punto de entrada principal
├── index.html
├── package.json
├── .gitignore
├── .env.example
└── README.md
```

---

## Licencia

Este proyecto está bajo la Licencia MIT.
