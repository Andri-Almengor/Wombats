# WOMBAT — El último hechicero

Un pequeño héroe. Cinco mundos. Mucha magia.

Plataformas 2D original en **HTML, CSS y JavaScript con Canvas**, sin frameworks, dependencias de ejecución, imágenes remotas ni cuentas. Toda la ilustración se dibuja por código y el sonido se sintetiza con Web Audio.

## Jugar

Descarga o clona el repositorio y abre **`index.html`** en un navegador moderno. No necesitas instalar paquetes ni compilar. Después de descargar los archivos, funciona sin conexión.

También puedes servirlo con Node.js 18 o superior:

```bash
git clone https://github.com/Andri-Almengor/Wombats.git
cd Wombats
npm start
```

Abre `http://localhost:8080`. El servidor solo entrega los tres archivos públicos del juego.

## Controles

| Acción | Teclas |
| --- | --- |
| Moverse | A / D o flechas izquierda / derecha |
| Saltar y hacer doble salto | Espacio, W o flecha arriba |
| Lanzar hechizo | J o Z; puedes mantener pulsada la tecla |
| Nova de área | K o X |
| Esquiva rápida con invulnerabilidad | Shift |
| Pausar / continuar | Esc o P |

Incluye botones táctiles en dispositivos con pantalla táctil. En teléfono, la orientación horizontal ofrece más espacio. La barra superior permite activar sonido, pausar y entrar en pantalla completa cuando el navegador lo admite.

## La aventura

La noche robó las estrellas. Un wombat con sombrero de mago debe atravesar cinco mundos y derrotar al Rey del Eclipse.

1. **Bosque del despertar:** introducción al salto y al combate; hongos hostiles y murciélagos.
2. **Grutas de cristal:** plataformas móviles, cristales y enemigos que disparan.
3. **Pantano de los susurros:** espinas y rutas elevadas.
4. **Cumbres de la luna:** enemigos adicionales y mayor dificultad.
5. **La torre del eclipse:** el encuentro final contra un jefe con dos ritmos de ataque.

Cada nivel tiene una ruta larga, plataformas elevadas, coleccionables y **tres runas**. Las runas son obligatorias para abrir el portal al final; puedes regresar a buscarlas. El último portal también exige derrotar al jefe.

### Vida y reinicio

- Comienzas con **cinco corazones**. Un golpe o una caída cuesta uno.
- Después de recibir daño hay un breve período de invulnerabilidad.
- Una caída te devuelve al último suelo seguro, descontando un corazón.
- Al perder el quinto corazón aparece una transición de carga y **toda la partida se reinicia automáticamente desde el nivel 1**, con cinco corazones, cero puntos y cero runas. No hay puntos de control que eviten este reinicio.
- Los corazones que encuentres restauran una unidad, hasta un máximo de cinco.
- Al cambiar de mundo recuperas un corazón y toda la energía.

### Combate y recompensas

- El ataque básico es ilimitado, con un pequeño intervalo entre disparos.
- Cada enemigo tiene vida propia. Su barra aparece después del primer golpe.
- La nova daña enemigos en un radio de 240 píxeles y elimina proyectiles cercanos. Consume 45 puntos de energía, que se regenera automáticamente.
- Derrotar enemigos recupera 12 puntos de energía.
- La esquiva ofrece 0,19 segundos de invulnerabilidad y se recarga en 1,2 segundos.
- Cristal: 10 puntos. Runa: 100. Enemigo: 50. Jefe: 500. Portal: 250. Victoria: 1.000 adicionales.
- Solo el récord se guarda en `localStorage`; la partida actual no se guarda. Si el navegador bloquea el almacenamiento, el juego continúa funcionando.

## Archivos y cambios

| Archivo | Responsabilidad |
| --- | --- |
| `index.html` | Pantalla inicial, interfaz, controles, pausa, carga y victoria |
| `styles.css` | Diseño, adaptación de pantalla y controles táctiles |
| `game.js` | Física, mapas, combate, dibujo, sonido y estados de la partida |
| `server.cjs` | Servidor local opcional sin dependencias |
| `tests/game.test.cjs` | Pruebas de reglas y transiciones |
| `.github/workflows/test.yml` | Verificación automática con GitHub Actions |

En `game.js`, `themes` define las paletas y nombres. `makeWorld(index)` construye los niveles de forma determinista. `update(dt)` avanza la simulación a 60 pasos por segundo; `draw()` dibuja con Canvas. `newGame()`, `loadLevel()`, `startTransition()` y `win()` controlan la aventura. Los escenarios comparten módulos de plataformas con diferencias de ambientación, enemigos, peligros y movimiento.

Para modificar dificultad: ajusta corazones en `newPlayer`, velocidad/gravedad en `update`, vida de enemigos en `makeWorld`, y costo/daño de la nova en `nova`. Mantén las tres runas accesibles y el portal sobre suelo seguro.

## Pruebas

```bash
npm test
```

Las pruebas usan el ejecutor integrado de Node, sin instalar paquetes. Verifican cinco niveles, runas, doble salto, daño e invulnerabilidad, muerte y reinicio, proyectiles, nova, esquiva, portales, jefe, caídas y pausa. La instrumentación de pruebas se inserta en memoria y no crea atajos en el juego publicado. `window.wombatDebug` solo expone consultas de diagnóstico de lectura.

## Publicar en GitHub Pages

En el repositorio: **Settings → Pages → Deploy from a branch → main → / (root) → Save**. Cuando GitHub termine de publicar, la dirección habitual será `https://andri-almengor.github.io/Wombats/`. Esta configuración se realiza en GitHub; subir el código por sí solo no activa Pages.

No requiere backend, variables de entorno, claves API, base de datos ni proceso de build.
