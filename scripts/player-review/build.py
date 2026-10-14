"""Prepare reviewed candidate rectangles; never infer a uniform generation grid.

Only opaque character pixels are retained (alpha >=128): these body-only
images have no legitimate translucent magic. Originals remain untouched.
One scale per source, not one fit-to-box scale per pose.
"""
from pathlib import Path
from PIL import Image
import json

ROOT = Path(__file__).resolve().parents[2]
DIR = ROOT / 'public/assets/sprites/wombat/candidates'
# Rectangles and body axes reviewed against the actual PNG, not the tool preview.
SPECS = {
 'idle': ('locomotion-attempt-1.png', .30, 4, [
  ([20,10,380,345],[195,336]), ([395,10,770,345],[577,336]),
  ([780,10,1150,345],[963,336]), ([1165,10,1536,345],[1345,336])]),
 'walk': ('walk-attempt-2.png', .1875, 8, [
  ([0,90,545,630],[285,618]), ([545,90,1090,630],[830,618]),
  ([1090,90,1635,630],[1375,618]), ([1635,90,2172,630],[1920,618])]),
 'run': ('locomotion-attempt-1.png', .30, 10, [
  ([10,680,405,1000],[220,989]), ([405,680,785,1000],[601,989]),
  ([785,680,1175,1000],[994,989]), ([1175,680,1536,1000],[1367,989])]),
}
atlas = Image.new('RGBA', (512,384))
manifest = {'file':'candidate-atlas.png','width':512,'height':384,
 'status':'review-only','reason':'Run cycle does not alternate the supporting legs convincingly.', 'clips':{}}
for row,(action,(source,scale,fps,poses)) in enumerate(SPECS.items()):
 original=Image.open(ROOT/'docs/player-review/sources'/source).convert('RGBA')
 frames=[]
 for col,(rect,origin) in enumerate(poses):
  tile=Image.new('RGBA',(128,128)); crop=original.crop(rect)
  crop.putalpha(crop.getchannel('A').point(lambda a:255 if a>=128 else 0))
  crop=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.NEAREST)
  dx=64-round((origin[0]-rect[0])*scale);dy=112-round((origin[1]-rect[1])*scale)
  assert dx>=0 and dy>=0 and dx+crop.width<=128 and dy+crop.height<=128
  tile.alpha_composite(crop,(dx,dy));bbox=tile.getbbox()
  assert bbox and min(bbox[:2])>=2 and max(bbox[2:])<=126
  atlas.alpha_composite(tile,(col*128,row*128))
  frames.append({'x':col*128,'y':row*128,'width':128,'height':128,'pivot':[64,112],
   'socket':[98,32],'source':source,'sourceRect':rect,'sourceOrigin':origin,'scale':scale})
 manifest['clips'][action]={'fps':fps,'loop':True,'frames':frames}
atlas.save(DIR/'candidate-atlas.png')
(DIR/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
