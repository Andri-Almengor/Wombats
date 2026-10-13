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
| Movimiento | **← / →** |
| Salto y doble salto | **Espacio** |
| Esquivar | **Shift** |
| Lanzar hechizo seleccionado | **W** |
| Nova | **A** |
| Sanarse | **D** |
| Escudo | **R** |
| Selector del hechizo W | **S** |
| Ventana de mejoras | **U** |
| Pausar | **Esc** |

**S** congela el juego y permite elegir Chispa, Fuego, Hielo o Rayo con las flechas. **Enter** confirma; **S / Esc** cancela. **U** congela igualmente todo el mundo, las partículas, las físicas, los enemigos y los temporizadores. Puedes comprar mejoras con el ratón o con controles táctiles; **U / Esc** cierra la ventana. Las teclas **A, D, R** siguen dedicadas a sus hechizos y **W** mantiene el hechizo elegido durante el paso entre mundos.

## Magia y progresión

**Chispa** es un proyectil veloz gratuito; **Fuego** aplica daño inicial y quemadura periódica; **Hielo** reduce movimiento y frecuencia de ataques y puede congelar; **Rayo** encadena enemigos y puede aturdir; **Nova** hace daño circular, retroceso y destruye proyectiles; **Sanación** recupera vida; **Escudo** absorbe impactos. Los enemigos poseen debilidades elementales.

**U** muestra un árbol de 20 mejoras con niveles, límites, precio creciente y comparación entre el valor actual y el siguiente. Hay especializaciones de daño, duración e intensidad elementales, radio de Nova, curación, resistencia de escudo, vida, magia, regeneración, eficiencia de maná y tiempo de lanzamiento. Las compras gastan esencias, cambian el combate y se conservan durante los cinco mundos. La aventura y sus habilidades comienzan de cero al morir o al iniciar una nueva partida.

Derrotar enemigos, explorar pasajes secretos y recoger recompensas proporciona esencias. En el mapa aparecen las rutas exploradas, la ubicación del wombat y los objetivos que ya fueron descubiertos.

## Cinco mundos diferentes

1. **Bosque encantado:** recorrido ondulado con bifurcaciones, ramas elevadas y secretos opcionales.
2. **Montañas de cristal:** ascenso vertical continuo entre cornisas, saltos, precipicios y plataformas móviles, con seguimiento vertical de cámara.
3. **Laberinto subterráneo:** 25 cámaras organizadas mediante un laberinto aleatorio de conexiones, pasillos bloqueados con paredes sólidas y objetivos en salas distantes. Un minijefe deja el libro antiguo al caer; sin él, las tres runas y la derrota del guardián, el portal no se desbloquea.
4. **Ruinas flotantes:** islas suspendidas con corrientes de viento, puentes móviles, rutas opcionales y riesgo de caída.
5. **Ciudadela del eclipse:** cinco cámaras de combate con sellos, obstáculos y jefe final que cambia sus patrones en tres fases y advierte antes de lanzar proyectiles.

Los cinco mapas se reconstruyen con una semilla por aventura; sus regiones y enlaces se validan para comprobar la conectividad geométrica. La cámara se mueve en ambos ejes. El sonido opcional incluye ambiente sintetizado diferente por bioma.

### Límites actuales

La accesibilidad se valida mediante conexiones y distancias de salto conservadoras, no mediante un agente que supere físicamente cada mapa. Las paredes del laberinto bloquean algunos corredores, pero las plataformas de salto todavía permiten atajos verticales. Los jefes disponen de patrones y anticipación visual, aunque no de secuencias animadas dibujadas a mano o música grabada.

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

Los tests nuevos generan **2.500 mapas** (500 semillas por cinco biomas, adicionales a la batería histórica de 1.000) y verifican geometría, ubicación de runas, portal, cambios de semilla, sanación, escudos, mejoras, combate y reinicio automático después de morir.

## Publicar en GitHub Pages

1. En GitHub abre **Settings → Pages**.
2. Selecciona **GitHub Actions** en Build and deployment.
3. Integra el pull request en `main`.
4. El workflow `Deploy Wombat` instalará dependencias, probará y compilará el juego, y publicará `dist/` en Pages.

Dirección esperada después de configurar Pages: https://andri-almengor.github.io/Wombats/

No necesita servidor de API, base de datos ni variables secretas. El mejor récord se guarda en `localStorage`. La construcción de React necesita instalar dependencias una vez; el sitio compilado usa todos los gráficos y la lógica del juego localmente (sin descargar sprites).

---

**Nota de migración:** Los antiguos archivos `game.js`, `styles.css` y `server.cjs` pertenecían al prototipo original. No forman parte del runtime React 2.0.
