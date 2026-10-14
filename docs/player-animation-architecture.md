# Protagonista: reconstrucción del sistema visual

Base auditada: `87becf4` (main, PR #7 fusionado). Historial revisado: PR #5, #6 y #7, sus generadores, atlas, renderer, selector y pruebas. Fuente principal: `WOMBAT_Sprites_Protagonista_Nombrados(2).zip`, no los atlas ya procesados del repositorio. Su SHA-256 y los de todos los recursos utilizados constan en `src/player/assets-manifest.json`.

## Diagnóstico

| Defecto | Causa comprobada | Reconstrucción |
| --- | --- | --- |
| Tamaños distintos | PR #5/#6 combinaban celdas/escalas; #7 fijó el rectángulo, pero no el tamaño del cuerpo dentro del PNG | Calibración previa por referencia anatómica de cada hoja/secuencia, nunca por extensión de la magia |
| Trozos de otra pose, piernas cortadas | Las filas y columnas de las hojas originales no son una cuadrícula regular; el ZIP también contiene recortes defectuosos | 119 cuadros reconstruidos desde las nueve hojas raw; límites por corredores de transparencia revisados; cada píxel raw se asigna a un solo cuadro |
| Saltos de apoyo | El pivote [48,88] no correspondía a los pies reales; dash pasaba de suelo y=93 a y=68 | Orígenes de cuerpo/suelo revisados; pivote compensado tras recortar solo margen transparente |
| Fragmentos en movimiento básico | Nueve PNG básicos contienen componentes extranjeros en su borde izquierdo | Lista explícita de componentes revisados por acción/índice/bounding box; eliminación solo de ese componente y su franja de alpha, sin barrer efectos superiores |
| Secuencias cortadas | `cast`, `hit`, velocidad y una permanencia máxima de .34s seleccionaban directamente el clip | Controlador temporal propio; los one-shots concluyen o reciben una interrupción explícita |
| Relanzar el mismo hechizo no vuelve al inicio | Solo reiniciaba si cambiaba el nombre de la acción | Token `castSequence` nuevo reinicia incluso la misma acción |
| Aterrizaje perdido al correr | `land` solo se elegía si el estado siguiente era idle | Evento de aterrizaje, también con movimiento horizontal |
| Victoria inmóvil | El motor no avanza `time` en victoria | Delta de presentación desde RAF solo para victoria; pausa y menús siguen congelados |
| Estado anterior al cambiar mundo | La misma instancia de jugador conserva el WeakMap | `visualEpoch` identifica cada carga de bioma; partida nueva tiene una nueva instancia |
| Magia desalineada | Origen de combate y posición del bastón se confundían | Socket por fotograma; destello/conexión visual al proyectil durante sus primeros 90ms, sin mover su posición de colisión |
| Nova sin onda | El renderer de sprites no conservaba el efecto de `healFx < 0` del procedural | Se restaura la onda visual existente |

La grabación de referencia (24.7s, 1156×658, 30fps) se revisó con muestreo temporal. Muestra transiciones entre desplazamiento, salto y magia; no es una demostración de todos los estados de muerte/victoria. Estos últimos se verifican adicionalmente mediante escenarios controlados del motor.

## Archivos y responsabilidades

- `src/player/SpriteAssetManager.mjs`: valida el manifiesto, carga las tres imágenes una sola vez, espera `decode`, verifica dimensiones, limita esperas y almacena referencias estables por clip. Un fallo de variante busca sano; si falla sano se devuelve el control al procedural.
- `src/player/AnimationController.mjs`: tiempo, fase, fotograma, loop, fin de secuencia, token e interrupción/reinicio. Corrige la tolerancia numérica en límites de loop a distintos FPS.
- `src/player/PlayerVisualState.mjs`: interpreta eventos reales y prioridades. No modifica al jugador.
- `src/player/PlayerSpriteRenderer.mjs`: un píxel normalizado equivale a un píxel de mundo, espejo horizontal, pivote y socket; `save/restore` incluso ante errores.
- `src/wombat-sprites.mjs`: adaptador público y WeakMap por jugador; mantiene el fallback `?wombatRender=legacy` y la preferencia `wombat:render`. Los exports stateless antiguos quedan únicamente como compatibilidad para herramientas; el juego usa `PlayerVisualState`.
- `src/player/assets-manifest.json`: rectángulos, pivotes, sockets, FPS, loops, procedencia, calibración y hashes por imagen y por RGBA de cuadro.
- `public/assets/sprites/wombat/rebuilt/{sano,herido,critico}.png`: tres atlas RGBA nuevos. Los antiguos quedan como históricos y no se cargan en este camino.
- `scripts/player-assets/build.py`: reconstrucción reproducible a partir del ZIP.
- `docs/player-animation-contact-sheet.jpg`: hoja de revisión completa, no captura del navegador.

Los cambios de `engine.mjs` son contadores cosméticos (`visualEpoch`, `jumpSequence`, `landSequence`, `dashSequence`, `hurtSequence`, `pickupSequence`) y dos marcas en proyectiles. No se cambia gravedad, integración, velocidad, colisiones, hitbox 45×68, consumo, daño, cooldown, controles, mapas ni progresión. `App.jsx` solo aporta el delta visual en victoria. `render.mjs` conserva cámara y shake como transformaciones de mundo externas.

## Preparación gráfica

No se emplean los metadatos antiguos para decidir rectángulos raw. `RECIPES` y `GUIDES` describen filas reales, centros de cuerpo, puntos de apoyo y límites revisados. Las fronteras curvas buscan el camino de menor alpha alrededor de esos límites. Se conserva la propiedad de todos los píxeles, incluidas partículas desconectadas. `CORE_REPAIRS` contiene las nueve excepciones de contaminación comprobada en PNG básicos, cada una con una comprobación exacta del componente esperado.

Se conservan los 37 cuadros básicos del ZIP y se calibran antes de dibujarlos; los otros 119 se extraen otra vez de raw. La escala de cada hoja/secuencia es constante: no se ajusta al bounding box de cada frame. Las poses encogidas, inclinadas y tumbadas mantienen su anatomía natural. Cambiar de pose no cambia la escala del renderer. La referencia nominal de cuerpo erguido es 96px (el sombrero y los efectos exceden la hitbox deliberadamente).

El lienzo maestro de 512px existe solo durante generación. Después se eliminan márgenes transparentes, se compensa el pivote y se empaquetan tiles variables con dos píxeles transparentes de separación. No se dibujan tiles de 512px en runtime. Los atlas decodificados ocupan aproximadamente 12.6MB en conjunto. Se usa RGBA sin cuantización de paleta y nearest-neighbor; `imageSmoothingEnabled=false` durante dibujo. La carga es asíncrona y compartida entre partidas.

## Mapeo completo

| Acción | Cuadros sano | Reproducción / evento |
| --- | ---: | --- |
| idle | 8 | loop, quieto |
| walk | 8 | loop, velocidad horizontal; fase vinculada a velocidad |
| run | 10 | loop, transición con histéresis 235/205 px/s; conserva fase walk/run |
| jump_start | 3 | primer salto aceptado |
| jump_air | 2 | loop, vuelo sin caída rápida |
| double_jump | 5 | segundo salto aceptado |
| fall | 2 | loop, caída real |
| land | 3 | apoyo después de estar en el aire, también corriendo |
| dash | 6 | evento real; secuencia ajustada a los .19s originales |
| cast_basic | 8 | KeyQ interno / Chispa equipada en W |
| cast_fire | 8 | KeyE interno / Fuego equipado en W |
| cast_ice | 8 | KeyW interno / Escarcha equipada en W |
| cast_lightning | 8 | KeyF interno / Rayo equipado en W |
| cast_nova | 9 | KeyX interno / A |
| cast_heal | 8 | KeyR interno / D |
| cast_shield | 8 | KeyC interno / R |
| hurt | 4 | daño real, salvo bloqueo por escudo/invulnerabilidad |
| death | 10 | derrota, mantiene último cuadro hasta reinicio |
| victory | 8 | victoria real, reloj visual independiente |
| pickup | 6 | libro recogido realmente; el material muestra un libro, no se usa para monedas/runas |
| climb | 8 | preparado; no se activa sin mecánica de escalada |

Total: **21 acciones distintas, 25 clips contando variantes, 156 cuadros**. Están conectadas 20 acciones; 148 cuadros tienen uso actual y los 8 de climb quedan preparados.

Salud: sano >70%; herido >35% y ≤70%; crítico ≤35%. Herido y crítico solo incluyen idle (4) y walk (4), es decir 8 cuadros cada uno. Las otras acciones recurren a sano. La fase sigue el clip canónico sano y se proyecta proporcionalmente sobre los cuatro cuadros de la variante, sin reiniciar el reloj ni cambiar el apoyo.

## Política temporal e interrupciones

Muerte y victoria dominan todo. Después: daño, dash, nuevo salto, nuevo hechizo, secuencia de hechizo en curso, aterrizaje y salto en curso, recoger libro, locomoción. Eventos preemptados se consumen y no reaparecen tarde. Un nuevo salto interrumpe un aterrizaje o lanzamiento; un nuevo lanzamiento puede mostrarse en el aire. Aterrizar durante un hechizo no lo corta artificialmente.

Un lanzamiento individual reproduce todos sus cuadros aunque termine antes el cooldown. Un lanzamiento nuevo reinicia inmediatamente su clip, incluso el mismo hechizo: repetir Chispa rápidamente puede interrumpir la secuencia anterior; no se encola ni retrasa daño/maná para imponer una animación. A pocos FPS se saltan cuadros temporales como en cualquier animación por tiempo, sin ralentizar la física. Dash usa duración explícita del movimiento real. Pausa, selección de hechizo y mejoras congelan el reloj visual. Victoria utiliza RAF porque la simulación ya está detenida.

Los marcadores de ataque del ZIP nunca causan daño: la lógica de combate conserva su instante original. Los sockets y el destello son exclusivamente visuales; el proyectil conserva origen, alcance, trayectoria y colisión originales.

## Límites del material

Las nueve hojas raw permiten recuperar las piernas y eliminar contaminación entre filas. No hay hojas raw para las ocho animaciones básicas en este ZIP: sus extremos ya cortados (pequeñas puntas de capa/partículas), y algunos elementos que tocan el borde exterior de hojas raw, no pueden reconstruirse con píxeles que no existen. Se conservan los accesorios/efectos legítimos disponibles; no se inventa arte nuevo. Las poses dibujadas tienen variaciones anatómicas propias del material; la calibración evita zoom de render, pero no sustituye una revisión artística de las ilustraciones fuente.

Faltan variantes herido/crítico de 19 acciones y una mecánica de escalada. No se añade levitación ni escalada ficticia.

## Reproducir y verificar

```sh
python -m pip install -r scripts/player-assets/requirements.txt
python scripts/player-assets/build.py /ruta/WOMBAT_Sprites_Protagonista_Nombrados.zip
npm ci
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:browser
```

Para usar un Chromium local alternativo, definir `CHROMIUM_PATH`. El test de navegador inicia y cierra su servidor Vite en el mismo proceso, valida también el prefijo `/Wombats/`, recorre controles reales de React, decodifica/dibuja los 156 cuadros a derecha e izquierda, ejecuta los eventos del motor y simula una caída de red de assets. Las capturas temporales quedan en `test-results/` y GitHub Actions las guarda como artifact de revisión durante 14 días.

Las pruebas unitarias decodifican PNG (no solo IHDR), validan alpha y separación, hashes de cada cuadro, rectángulos disjuntos, fragmentos de ropa en clips sin efectos rojos, loops y finales, fases entre variantes, repeticiones, FPS variables, pivotes, orientación, daños, muerte, reinicio, epoch, menús y fallos de red/dimensiones/decode/timeout. Conservan las pruebas existentes de jugabilidad y generación de 2500 mundos.

La revisión en Chromium 153 verificó los estados activos, todos los frames, muerte terminando en índice 9, victoria avanzando, reinicio en idle y fallback ante bloqueo de PNG. No sustituye una validación en todos los navegadores/dispositivos; no se afirma que la anatomía del arte fuente sea idéntica en todas las ilustraciones.
