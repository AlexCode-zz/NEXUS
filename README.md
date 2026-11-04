# NEXUS

Laboratorio visual de universos generativos en 3D interactivo e independiente.

## Tecnologías

- **Vite** — Empaquetador y entorno de desarrollo ultra rápido.
- **Three.js** — Motor gráfico 3D basado en WebGL.
- **CSS Moderno** — Estilos adaptativos e interfaz inmersiva.
- **JavaScript ES Modules** — Arquitectura modular limpia.

## Estructura del Proyecto

```text
NEXUS/
├── public/
│   ├── assets/
│   └── favicon.svg
├── src/
│   ├── core/         # Motor base 3D (Scene, Camera, Renderer, AnimationLoop)
│   ├── worlds/       # Definición de universos generativos
│   ├── systems/      # Sistemas transversales (audio, post-processing, etc.)
│   ├── shaders/      # Shaders GLSL personalizados
│   ├── components/   # Elementos de interfaz reutilizables
│   ├── controls/     # Controladores de cámara e interactividad
│   ├── config/       # Constantes y configuración general
│   ├── utils/        # Funciones auxiliares y matemáticas
│   ├── styles/       # Hojas de estilo CSS (main, interface, responsive)
│   └── main.js       # Punto de entrada principal
├── index.html
├── package.json
├── .gitignore
├── .env.example
└── README.md
```

## Desarrollo

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build
```

## Licencia

MIT
