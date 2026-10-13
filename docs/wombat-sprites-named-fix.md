# WOMBAT — corrección definitiva del render de sprites (lote nombrado)
Fecha: 13 de octubre de 2026.

## Causa del glitch (reproducido con Grabación 2026-10-13 163647)
El renderer del PR #6 dibujaba **dos atlas a escalas diferentes**: el inicial a 122x122 y el extra a 162x162, y sus puntos de apoyo se definían en lienzos distintos (96/144). Cada vez que cambiaba de animación, el Wombat se encogía o agrandaba y se desplazaba. Los extras se recortaban a mano desde hojas irregulares; podían mezclarse partes de sprites distintos.

## Fuente autorizada
`WOMBAT_Sprites_Protagonista_Nombrados(1).zip`, aportado por el usuario. Este PR **no vuelve a cortar las hojas originales**; usa los tres atlas de fotogramas **ya organizados** por acción/estado:
- `wombat-sano.png`: 21 acciones, 140 fotogramas de 96x96 (960x2016).
- `wombat-herido.png`: quieto/caminar, 8 fotogramas (384x192).
- `wombat-critico.png`: quieto/caminar, 8 fotogramas (384x192).
- Total: **156 cuadros originales**, transparencia PNG preservada. Los atlas se indexan en paleta optimizada sin reescalar cada cuadro por separado.

## Rendering
Solo se importa `src/assets/meta/wombat-named-animations.mjs`. **Todas** las acciones se dibujan con las mismas dimensiones de destino (126x126) y el mismo pivote del atlas ([48,88]). Cambian exclusivamente la región fuente y, al voltear, la orientación. El origen global es siempre `p.x+p.w/2, p.y+p.h` (pies del collider). Se evita la transición forzada a levitación y se usa salto normal/doble/caída con eventos de aterrizaje únicamente sobre terreno firme. No se modifica la hitbox, el motor ni los controles.

El selector evita reiniciar el tiempo de una animación si se sigue en el mismo estado. Repetir hechizo incrementa la secuencia visual ya existente (`castSequence`) y tiene un tiempo mínimo visual limitado que no altera enfriamientos.

## Variantes de ropa dañada
Los sprites herido/crítico solamente incluyen quieto y caminar: para correr, hechizos y aéreos se usa el atlas sano como opción temporal, de acuerdo con los datos disponibles. No se inventan variaciones.

## Fallback y seguridad
`?wombatRender=legacy` activa el render procedural. Si el atlas normal no carga o sus dimensiones no coinciden, el renderer vuelve al dibujo procedural. Para volver: borrar el parámetro y `localStorage.removeItem('wombat:render')`.

## Regenerar a partir del ZIP
`python -m pip install Pillow`
`python scripts/import_wombat_named.py "/ruta/WOMBAT_Sprites_Protagonista_Nombrados(1).zip"`

Ejecutar `npm test` y `npm run build`. La prueba visual real en navegador debe revisar caminata, sprint, jump/double jump, aterrizaje, esquiva, los siete hechizos y la recuperación tras daño o reinicio.
