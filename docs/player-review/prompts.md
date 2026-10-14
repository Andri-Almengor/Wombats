# Solicitudes de generación utilizadas

Herramienta integrada `image_gen`, `transparent_background: true` en las tres
llamadas. No se usaron generaciones para crear diagramas ni para ocultar fallos
en las capturas del navegador. A continuación se conservan las especificaciones
del conjunto de prompts, incluyendo las restricciones que el generador incumplió.

## 1. Maestro (referencia: primer idle sano del repositorio)

Create ONE production master sprite of the referenced Técnico Wombat for a
side-scrolling pixel-art game, facing right, standing neutral with both boots on
same baseline. Brown wombat, navy floppy wizard hat and brass goggles, red
scarf/cape, blue technician coat, gold trim/belt, leather boots, wooden staff
with enclosed cyan crystal. Crisp intentional pixel art, simplified readable
shapes suitable for approximately 96 pixels tall. Whole body including hat and
staff, generous transparent margin. No magic glow, floating particles, cast
effect, shadow, ground, text or extra characters. Compact proportions. Genuine
RGBA transparency.

## 2. Primer lote (referencia: maestro generado)

Production animation sheet for this EXACT master Técnico Wombat. 12 separate
full-body sprites facing RIGHT in THREE horizontal rows of FOUR, with LARGE
transparent gaps. Row 1: four subtle idle breathing poses. Row 2: four ordered
walk cycle poses (right foot forward, passing, left foot forward, passing).
Row 3: four ordered run cycle poses (right stride, suspension, left stride,
suspension). Same camera and SAME SCALE. Keep skull, hat, face, coat, belt,
goggles and staff geometry IDENTICAL. Only legs/arms and cape animate, tiny bob.
No magic, sparks, detached dots, glow, shadows, ground, text, labels or grid.
True RGBA transparency. At least 60px transparent gutters. All feet/hats intact.

## 3. Reintento walk (referencia: maestro generado)

FOUR whole body WALK cycle frames in a single horizontal row on genuinely EMPTY
TRANSPARENT background. Facing right. Frame1: near boot reaches FORWARD RIGHT,
far boot behind LEFT. Frame2: near boot planted under body, far knee passing
forward. Frame3: REVERSE of frame1, near boot BACKWARD LEFT, far boot RIGHT.
Frame4: far boot planted, near knee passing forward. Third frame must visibly
swap legs. Tiny bob, same head/hat/staff scale and clothing. Enclosed cyan
crystal, no effects. 100px empty gutters, same size and baseline. No text, grid
or labels. Modest upright walking stance. Preserve compact master identity.
