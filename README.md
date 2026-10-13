# WOMBAT — El último hechicero (versión 2.0)

Una aventura de plataformas 2D con **React**, **Canvas**, **siete hechizos**, cinco biomas realmente diferentes, generación procedural y progresión por esencias. La partida se genera con una semilla aleatoria nueva **al comenzar, al reiniciar y al perder todos los corazones**. Los mundos ya no repiten un mapa fijo.

## Arranque rápido

Necesitas **Node.js 20.19+** y npm.

```bash
git clone https://github.com/Andri-Almengor/Wombats.git
cd Wombats
npm install
npm run dev
```

Abre la dirección que indica Vite (normalmente `http://localhost:5173`). Para preparar una versión publicable: `npm run build`; para probarla: `npm run preview`. La carpeta `dist/` es un sitio estático y, una vez compilado, puede alojarse sin backend.

> **Importante:** la versión 2 usa módulos y React. Abrir `index.html` directamente con `file://` ya no es el modo correcto. Usa Vite o publica el contenido generado en `dist/`.

## Controles

| Acción | Tecla |
|---|---|
| Mover | **A / D** o flechas |
| Saltar / doble salto | **Espacio**, **Z** o flecha arriba |
| Esquivar | **Shift** |
| Chispa, disparo continuo | **Q** |
| Escarcha, ralentiza enemigos | **W** |
| Fuego, proyectil explosivo | **E** |
| Sanación, recupera dos corazones | **R** |
| Relámpago, golpea enemigos cercanos | **F** |
| Escudo temporal | **C** |
| Nova, gran daño de área | **X** |
| Comprar mejoras | **1 / 2 / 3 / 4** o botones |
| Pausa | **P** o **Esc** |

Las teclas para hechizos están a la izquierda del teclado. En pantalla táctil, aparecen botones de movimiento, salto y esquiva; los siete hechizos se activan tocando sus tarjetas.

## Magia y progresión

- **Q: Chispa:** ataque de bajo daño sin costo, se puede mantener pulsado.
- **W: Escarcha:** consume 12 de energía y ralentiza el objetivo.
- **E: Fuego:** consume 18 y explota dañando enemigos alrededor.
- **R: Sanar:** consume 28 y recupera 2 puntos de vida (hasta el máximo).
- **F: Rayo:** consume 35 y golpea hasta cuatro enemigos cercanos.
- **C: Escudo:** consume 25 y concede protección por tiempo limitado.
- **X: Nova:** consume 50 y golpea en un radio de 250 píxeles, eliminando proyectiles enemigos cercanos.

Derrotar enemigos otorga **45 esencias** (150 por el jefe). Recoger cristales aporta 5. Las esencias permiten mejoras durante la aventura:

1. **Corazones:** +1 a la salud máxima (hasta 10), con curación parcial.
2. **Magia:** +30 al maná máximo (hasta 220).
3. **Poder:** +0.5 al multiplicador de daño (hasta 4).
4. **Recarga:** +4 a regeneración de maná por segundo (hasta 30; la última mejora llega a 30).

El precio inicial es 100 esencias y sube 85 por cada compra de la misma categoría. Se conservan las mejoras y esencias al entrar en el siguiente mundo. Al perder todos los corazones, empieza una partida nueva con atributos iniciales y semilla diferente.

## Los cinco mundos

1. **Bosque de los espíritus:** ramas y árboles, hongos saltarines, lobos y murciélagos.
2. **Minas de luz perdida:** cristales y plataformas elevadas, gólems y enemigos a distancia.
3. **Islas del veneno:** fango, espinas tóxicas, islas de vegetación y bombarderos.
4. **Ruinas entre las nubes:** plataformas flotantes y empuje variable del viento.
5. **Ciudadela del eclipse:** estandartes, guardianes y batalla contra el Rey del Eclipse.

Cada mundo tiene plataformas, enemigos, cristales y peligros colocados según una semilla, con rutas principales que mantienen saltos alcanzables. Recoge **tres runas** para abrir el portal de salida. En el quinto mundo también debes derrotar al jefe.

La animación del héroe muestra caminar, saltar, esquivar, lanzar hechizos, daño, muerte y curación; la capa y el rostro se deterioran a medida que disminuye la vida. Los enemigos tienen animaciones propias y comportamientos de patrulla, persecución o disparo.

## Arquitectura

| Archivo | Función |
|---|---|
| `src/App.jsx` | Componentes React: menú, pausa, HUD, grimorio, tienda, controles táctiles y sonido |
| `src/main.jsx` | Entrada React |
| `src/engine.mjs` | Física, animaciones de estado, hechizos, combate, IA enemiga, mejoras, transiciones |
| `src/world.mjs` | Semillas, cinco biomas, generación y validación de rutas |
| `src/render.mjs` | Dibujo del mundo, personajes, partículas y efectos con Canvas |
| `src/style.css` | Diseño adaptable y paneles |
| `tests/*.test.mjs` | Pruebas de generación, reglas, combate y progresión |
| `vite.config.js` | Build y base path para GitHub Pages |
| `.github/workflows/test.yml` | Tests y build en GitHub Actions |
| `.github/workflows/deploy.yml` | Despliegue estático a GitHub Pages desde main |

Para añadir un enemigo: amplía los tipos en `BIOMES[*].enemy` (en `world.mjs`), define sus estadísticas y comportamiento en `engine.mjs`, y su dibujo en `render.mjs`.

Para modificar el balance: en `engine.mjs`, ajusta `SPELLS`, `UPGRADES`, `upgradeCost`, `cast`, `damageEnemy` o `freshPlayer`. Cambia la estructura de biomas desde `createWorld` en `world.mjs` y conserva `validateWorld` y los tests.

## Pruebas

```bash
npm test
npm run build
```

Los tests generan **1.000 mapas** (200 semillas por cinco biomas) y verifican geometría, ubicación de runas, portal, cambios de semilla, sanación, escudos, mejoras, combate y reinicio automático después de morir.

## Publicar en GitHub Pages

1. En GitHub abre **Settings → Pages**.
2. Selecciona **GitHub Actions** en Build and deployment.
3. Integra el pull request en `main`.
4. El workflow `Deploy Wombat` instalará dependencias, probará y compilará el juego, y publicará `dist/` en Pages.

Dirección esperada después de configurar Pages: https://andri-almengor.github.io/Wombats/

No necesita servidor de API, base de datos ni variables secretas. El mejor récord se guarda en `localStorage`. La construcción de React necesita instalar dependencias una vez; el sitio compilado usa todos los gráficos y la lógica del juego localmente (sin descargar sprites).

---

**Nota de migración:** Los antiguos archivos `game.js`, `styles.css` y `server.cjs` pertenecían al prototipo original. No forman parte del runtime React 2.0.
