# Revisión del protagonista después del PR #8

**Estado: NO APROBADO para sustituir los sprites de producción.** Este PR es
un borrador de trabajo con implementación de revisión y evidencia, no una
declaración de que los glitches del juego están resueltos.

Base: `df126151f669ed5d446ab31e4e5d54633b6f7b29` (PR #8 fusionado).
No se modifica física, hitboxes, controles, daño, maná ni cooldown.

## Qué se comprobó

Se ejecutó el juego React/Canvas y la batería Playwright sobre la base actual.
Las pruebas anteriores siguen pasando aunque la calidad de las poses no sea
adecuada: contar cuadros y validar rectángulos no demuestra continuidad visual.

| Área | Resultado y alcance |
|---|---|
| Dibujo duplicado del protagonista | `drawGame` limpia el Canvas y llama una vez al adaptador; este solo usa el procedural si no dibujó el sprite. No se encontró doble dibujo incondicional. |
| Arte | Las ilustraciones cambian silueta, ángulo de cabeza, hat y pose entre acciones. Una escala fija no corrige esos cambios internos. |
| Recortes | Los PNG actuales se dibujan con sus rectángulos; las pruebas descartan coordenadas fuera del atlas, pero no certifican que todo píxel pertenezca a la pose. No se afirma haber identificado todos los fragmentos denunciados. |
| Efectos | Los PNG de hechizos contienen magia y el motor dibuja proyectiles/partículas aparte. Existe composición de ambas capas; requiere separar el arte antes de decidir qué efecto quitar. No se retiraron efectos a ciegas. |
| Transparencia | La previsualización del generador mostró un fondo coloreado, pero al componer el PNG real sobre gris no apareció ese fondo. La sospecha inicial de fondo opaco fue descartada. |
| Generación nueva | La primera hoja repite la dirección de la zancada. La segunda mejora walk, pero no valida run ni la coherencia de todo el lote. |

## Material generado realmente

Se utilizó la herramienta integrada de generación de imágenes con transparencia,
sin API/CLI externo. Los PNG originales están en `sources/`:

- `master.png`: referencia maestra, personaje completo sin partículas ni halo.
- `locomotion-attempt-1.png`: cuatro poses por acción (idle, walk, run). Rechazada
  como conjunto: walk/run no forman un ciclo alternado convincente.
- `walk-attempt-2.png`: cuatro poses con instrucciones explícitas de alternancia.
  Conservada como candidata, no aceptada como reemplazo final.

Las solicitudes y restricciones de generación se documentan en `prompts.md`.
No se produjeron más animaciones después de identificar esta limitación.

## Preparación e integración de prueba

`scripts/player-review/build.py` usa rectángulos y ejes revisados individualmente.
No divide la hoja suponiendo una cuadrícula exacta. Mantiene una escala por
fuente, un lienzo de 128×128 y pivote [64,112] para todos los candidatos. La
cuantización alfa a 0/255 está limitada al arte nuevo del cuerpo, sin magia;
los originales completos se conservan. Nunca se aplica a los hechizos previos.

El atlas de revisión tiene 12 cuadros: 4 idle, 4 walk y 4 run. Esto **no significa
12 cuadros aprobados**. `manifest.json` lo declara `review-only`.

La ruta `player-review.html` compara producción/candidato sobre fondo de
contraste, permite pausar, avanzar cuadros y reflejar. Usa el renderizador real.
El enlace `?wombatRender=candidate` permite probar el mismo atlas dentro del
juego, solo para idle/walk/run. Las demás acciones usan producción, por lo que
habrá cambios de estilo: esta modalidad es exclusivamente diagnóstica.
Sin ese parámetro no se descargan ni se usan los candidatos. Si falla su carga,
se conserva el sprite actual. El fallback procedural anterior sigue disponible.

## Reproducción

```sh
python -m pip install -r scripts/player-assets/requirements.txt
python scripts/player-review/build.py
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:browser
npm run dev
```

Abrir `/player-review.html` (o `/Wombats/player-review.html` en GitHub Pages).
El build incluye ambas entradas. `CHROMIUM_PATH` permite usar un Chromium local.

La batería nueva comprueba aislamiento del modo candidato, alpha real, márgenes,
pivotes, reproducción de la página de revisión, orientación, integración con el
adaptador del juego y fallback de red. **No convierte el rechazo artístico en
una aprobación porque el test pase.**

## Evidencia y bloqueo

`comparison.gif` contiene capturas deterministas del Canvas del navegador,
producción a la izquierda y candidato a la derecha, con suelo/hitbox visibles.
`candidate-in-game.png` registra la integración de prueba. GitHub Actions guarda
las capturas individuales de las dos baterías en `player-animation-review`.

Falta un ciclo run con apoyos alternados y revisión visual satisfactoria del lote
completo; posteriormente faltan salto, caída, aterrizaje, dash, daño, muerte,
hechizos y variantes de salud con la nueva identidad. No se activa el lote por
defecto ni se recomienda fusionar este borrador como solución final.
