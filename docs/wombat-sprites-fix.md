# Corrección de animaciones · Técnico Wombat (13 oct 2026)

## Error reproducido
El vídeo de juego muestra que un salto normal intercala un cuadro de **levitación mágica** cerca del ápice. El selector anterior evaluaba automáticamente `vy` entre -130 y +115 como `levitate`, aunque el motor no permite levitar. También estaba limitado a 37 fotogramas, con poses genéricas para todas las magias, heridas y derrota.

## Cambios
- Conserva el renderer procedural como fallback (`?wombatRender=legacy`) y el atlas principal de 37 frames.
- Añade un atlas suplementario (121 frames) derivado de las 9 hojas adicionales aportadas por el usuario, con paleta PNG + alfa y anclaje uniforme.
- Cambia un salto normal a `jump` → `jump_air` → `fall`; la levitación solo se utiliza si el jugador tuviese un estado visual explícito `levitating`.
- Los hechizos `KeyQ`, `KeyW`, `KeyE`, `KeyF`, `KeyR`, `KeyC` y `KeyX` tienen animación diferenciada, mediante `visualSpell` (un campo **exclusivamente visual** guardado al lanzar un hechizo).
- Usa `run_fast` al correr, `hurt` al recibir daño, `defeat` durante muerte y `victory` en victoria.
- Evita el cambio arbitrario a `cast` para aterrizar y mantiene la huella de colisión del jugador, idéntica a la actual.
- Carga el atlas extra por separado; si no está disponible, utiliza la animación del atlas principal y, de fallar ambos, el dibujo procedural.

## Frames por hoja nueva
| Archivo | Acciones extraídas |
| --- | --- |
| `raw-extra/sheet_09.png` | `run_fast` (10) |
| `raw-extra/sheet_10.png` | `ice_cast` (8), `fire_cast` (8) |
| `raw-extra/sheet_11.png` | `lightning_cast` (8), `lightning_burst` (8) |
| `raw-extra/sheet_12.png` | `heal` (8), `shield_cast` (8) |
| `raw-extra/sheet_13.png` | `nova_cast` (11) |
| `raw-extra/sheet_14.png` | `hurt` (9), `defeat` (5) |
| `raw-extra/sheet_15.png` | `victory` (8), `book` (6) |
| `raw-extra/sheet_16.png` | `jump_staff` (8) |
| `raw-extra/sheet_17.png` | `book_cast` (8), `book_hold` (8) |

Total: 121 nuevos cuadros + 37 del atlas original = 158. Los 9 PNG `raw-extra` del repositorio están optimizados en 256 colores y a mitad de resolución para evitar aumentar innecesariamente el peso del despliegue; el material original de alta resolución se mantiene en el paquete de producción externo. La extracción es reproducible con `python scripts/generate_wombat_extra.py` (Pillow).

## Verificación
- `npm test`
- `npm run build`
- Verificar en navegador: salto normal y doble salto, idle↔correr, dash, siete hechizos, daño, muerte y reinicio, victoria y fallback.

Los fotogramas de combate producidos desde una ilustración en hoja pueden tener VFX cortados en sus propios bordes; no se generan cuadros sintéticos ni se modifican efectos jugables. Las animaciones suplementarias no cambian hitboxes ni movimiento.