#!/usr/bin/env python3
"""Import the user's named 156-frame production ZIP without re-slicing source sheets."""
from pathlib import Path
from zipfile import ZipFile
from PIL import Image
import argparse,io,json

p=argparse.ArgumentParser(description='Install the three original named WOMBAT atlases')
p.add_argument('zip_path',help='WOMBAT_Sprites_Protagonista_Nombrados.zip')
a=p.parse_args()
out=Path(__file__).resolve().parents[1]/'public/assets/sprites/wombat/named'
out.mkdir(parents=True,exist_ok=True)
with ZipFile(a.zip_path) as source:
 for variant,expected in (('sano',(960,2016)),('herido',(384,192)),('critico',(384,192))):
  key=f'atlases/tecnico_wombat__{variant}__lote1.png'
  im=Image.open(io.BytesIO(source.read(key))).convert('RGBA')
  if im.size!=expected:raise ValueError(f'{key}: expected {expected}, got {im.size}')
  meta=json.loads(source.read(f'metadata/tecnico_wombat__{variant}__lote1.json'))
  total=0
  for action,clip in meta['animations'].items():
   for rect in clip['frames']:
    x,y,w,h=[rect[k] for k in ('x','y','w','h')]
    if w!=96 or h!=96 or x<0 or y<0 or x+w>im.width or y+h>im.height:
     raise ValueError(f'{variant}/{action}: invalid sprite rect')
    if not im.crop((x,y,x+w,y+h)).getchannel('A').getbbox():
     raise ValueError(f'{variant}/{action}: empty sprite')
    total+=1
  expected_count=140 if variant=='sano' else 8
  if total!=expected_count:raise ValueError(f'{variant}: {total} != {expected_count}')
  # Indexed RGBA palette retains the real transparency, reducing network cost.
  dest=out/f'wombat-{variant}.png'
  im.quantize(colors=256,method=Image.Quantize.FASTOCTREE,dither=Image.Dither.NONE).save(dest,optimize=True)
  rgba=Image.open(dest).convert('RGBA')
  if rgba.getchannel('A').getextrema()[0]!=0:raise ValueError(f'{variant}: alpha channel lost')
  print(f'{dest}: {total} frames, {dest.stat().st_size} bytes, alpha checked')
