#!/usr/bin/env python3
"""Reproducible sprite extraction from the eight original transparent WOMBAT PNGs.

Install Pillow (`python -m pip install Pillow`) and run:
    python scripts/generate_wombat_sprites.py
No game simulation or physics code is modified.
"""
from pathlib import Path
from PIL import Image
import json
import math

BASE = Path(__file__).resolve().parents[1] / 'public/assets/sprites/wombat'
CELL = 96
COLS = 8
# action / original sheet / columns / rows / extracted frames / seconds / looping
SHEETS = [
    ('idle', 1, 4, 2, 8, .135, True),
    ('walk', 2, 4, 2, 8, .095, True),
    ('jump', 3, 3, 1, 3, .125, False),
    ('jump_air', 4, 2, 1, 2, .13, True),
    ('levitate', 5, 3, 2, 5, .095, True),
    ('fall', 6, 2, 1, 2, .14, True),
    ('cast', 7, 3, 1, 3, .10, False),
    ('dash', 8, 3, 2, 6, .032, False),
]


def main():
    (BASE / 'frames').mkdir(parents=True, exist_ok=True)
    (BASE / 'atlases').mkdir(parents=True, exist_ok=True)
    frames = []
    meta = {
        'schemaVersion': 1,
        'source': '8 user-supplied original PNG sheets',
        'atlas': {'path': 'atlases/wombat.png', 'width': CELL * COLS,
                  'height': CELL * 5, 'columns': COLS, 'rows': 5,
                  'cellSize': [CELL, CELL], 'filter': 'nearest'},
        'animations': {}
    }

    for name, sheet, columns, rows, count, seconds, looping in SHEETS:
        original = Image.open(BASE / 'raw' / f'sheet_{sheet:02}.png').convert('RGBA')
        sequence = []
        for n in range(count):
            col, row = n % columns, n // columns
            region = (
                round(col * original.width / columns),
                round(row * original.height / rows),
                round((col + 1) * original.width / columns),
                round((row + 1) * original.height / rows),
            )
            frame = original.crop(region)
            valid = frame.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
            if valid is None:
                raise ValueError(f'Empty frame in sheet {sheet}, cell {n}')
            frame = frame.crop(valid)
            native_size = [frame.width, frame.height]
            scale = min(87 / frame.width, 88 / frame.height)
            width, height = round(frame.width * scale), round(frame.height * scale)
            scaled = frame.resize((width, height), Image.Resampling.LANCZOS)
            cell = Image.new('RGBA', (CELL, CELL))
            offset = ((CELL - width) // 2, 92 - height)
            cell.alpha_composite(scaled, offset)
            filename = f'{name}_{n+1:02}.png'
            cell.save(BASE / 'frames' / filename, optimize=True)
            ix = len(frames)
            bounds = cell.getchannel('A').getbbox()
            sequence.append({
                'file': f'frames/{filename}', 'index': ix,
                'rect': [(ix % COLS) * CELL, (ix // COLS) * CELL, CELL, CELL],
                'frameMs': round(seconds * 1000), 'pivot': [.5, .957],
                'usefulRect': list(bounds), 'sourceDimensions': native_size,
                'trimOffset': {'x': offset[0], 'y': offset[1]},
            })
            frames.append(cell)
        meta['animations'][name] = {
            'sourceSheet': f'raw/sheet_{sheet:02}.png',
            'loop': looping, 'frames': sequence,
        }

    if len(frames) != 37:
        raise ValueError(f'Expected 37 sprite frames, got {len(frames)}')
    atlas = Image.new('RGBA', (CELL * COLS, CELL * math.ceil(len(frames) / COLS)))
    for i, frame in enumerate(frames):
        atlas.alpha_composite(frame, ((i % COLS) * CELL, (i // COLS) * CELL))
    atlas.save(BASE / 'atlases/wombat.png', optimize=True)
    (BASE / 'atlas.json').write_text(
        json.dumps(meta, ensure_ascii=False, indent=2) + '\n', encoding='utf-8'
    )
    print(f'Exported {len(frames)} frames and {atlas.size} RGBA sprite atlas')


if __name__ == '__main__':
    main()
