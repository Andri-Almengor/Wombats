# Técnico Wombat · integración experimental de sprites (Etapa 02)

## Procedencia
Se utilizan únicamente las ocho hojas de sprites originales proporcionadas por el usuario el 13 de octubre de 2026. El atlas optimizado de 96 px por celda conserva fondos transparentes y se renderiza sin suavizado. Las ocho imágenes PNG originales también están archivadas en `public/assets/sprites/wombat/raw/` y los 37 fotogramas individuales en `frames/`. El navegador solo descarga el atlas cuando lo necesita.

| Hoja | Interpretación | Frames | Frames del atlas |
|---|---|---:|---|
| 1 | Idle | 8 | 0–7 |
| 2 | Walk | 8 | 8–15 |
| 3 | Jump | 3 | 16–18 |
| 4 | Jump air | 2 | 19–20 |
| 5 | Levitate | 5 | 21–25 |
| 6 | Fall | 2 | 26–27 |
| 7 | Cast | 3 | 28–30 |
| 8 | Dash | 6 | 31–36 |

El sprite se integra solo como capa visual: su punto de apoyo está anclado al suelo de la hitbox del protagonista. No se cambian `vx`, `vy`, saltos, colisiones, controles o hitboxes. El espejo horizontal utiliza Canvas `scale(-1,1)`.

## Fallback de depuración
Visitar el juego con `?wombatRender=legacy`, o ejecutar `localStorage.setItem('wombat:render', 'legacy')` y recargar. Si el PNG falla, el dibujo antiguo se activa automáticamente. Para restablecer: `localStorage.removeItem('wombat:render')`.

## Estados visuales provisionales
- Daño y muerte reutilizan `fall` hasta que existan hojas dedicadas.
- Aterrizaje reutiliza temporalmente `cast` como recuperación, con transición de 110 ms.
- Sanación reutiliza `cast` y superpone un brillo verde.
- Escudo conserva su efecto Canvas sobre el sprite.
- No hay sprites únicos aún para nova/victoria/recolección/ropa herida.

## Exportación de PNG individuales
El atlas es el recurso utilizado por el juego. Ejecutar `python -m pip install Pillow` y después `python scripts/generate_wombat_sprites.py` para regenerar `frames/*.png`, `atlases/wombat.png` y `atlas.json` a partir de los ocho PNG originales, sin modificar la física del juego. El script valida los recortes y la transparencia.

## Verificación
`npm test` valida el PNG real, sus dimensiones, el mapa de animaciones y las transiciones visuales. `npm run build` empaqueta el juego React+Vite. El workflow de pruebas existente ejecuta ambos comandos en cada PR.
