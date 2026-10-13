#!/usr/bin/env python3
"""Extract new user-provided Stage02 sheets into a compact RGBA animation atlas.
No gameplay/physics logic changes. Input names are assigned by source visual action.
"""
from pathlib import Path
from PIL import Image
import json, math

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT / 'public/assets/sprites/wombat/raw-extra'
OUT=ROOT / 'public/assets/sprites/wombat'

CELL = 144
COLS = 8
# sheet label / uploaded filename suffix / columns / rows / designated animation frame windows
SHEETS = [
  ('run_fast','sheet_09.png',5,[5,5],[(0,10,'run_fast')]),
  ('elemental','sheet_10.png',4,[4,4,4,4],[(0,8,'ice_cast'),(8,16,'fire_cast')]),
  ('lightning','sheet_11.png',4,[4,4,4,4],[(0,8,'lightning_cast'),(8,16,'lightning_burst')]),
  ('shield','sheet_12.png',4,[4,4,4,4],[(0,8,'heal'),(8,16,'shield_cast')]),
  ('nova','sheet_13.png',4,[4,4,3],[(0,11,'nova_cast')]),
  ('damage','sheet_14.png',4,[4,5,5],[(0,9,'hurt'),(9,14,'defeat')]),
  ('victory','sheet_15.png',4,[4,4,4,2],[(0,8,'victory'),(8,14,'book')]),
  ('air_staff','sheet_16.png',4,[4,4],[(0,8,'jump_staff')]),
  ('book','sheet_17.png',4,[4,4,4,4],[(0,8,'book_cast'),(8,16,'book_hold')]),
]

DURATIONS={
 'run_fast':.085,'ice_cast':.066,'fire_cast':.066,'lightning_cast':.075,'lightning_burst':.075,
 'shield_cast':.073,'nova_cast':.07,'hurt':.10,'defeat':.18,'victory':.14,'book':.14,
 'jump_staff':.11,'heal':.105,'book_cast':.14,'book_hold':.14,
}

LOOPS={'run_fast','jump_staff','book','book_hold'}

def main():
    (OUT/'atlases').mkdir(parents=True,exist_ok=True)
    frames=[]; meta={'schemaVersion':2,'atlas':{'path':'atlases/wombat-extra.png','cell':CELL,'columns':COLS},'animations':{}}
    skipped=[]
    for sheet, suffix, cols, row_cells, clips in SHEETS:
        paths=[SOURCE/suffix]
        if not paths[0].is_file(): raise FileNotFoundError(paths[0])
        original=Image.open(paths[0]).convert('RGBA')
        pieces=[]
        rows=len(row_cells)
        y_edges=[0,round(355*original.height/971),round(720*original.height/971),original.height] if sheet=='damage' else [round(i*original.height/rows) for i in range(rows+1)]
        for r, count in enumerate(row_cells):
            for c in range(count):
                crop=original.crop((round(c*original.width/count),y_edges[r],round((c+1)*original.width/count),y_edges[r+1]))
                pixels=crop.getchannel('A').point(lambda x:255 if x>20 else 0)
                bounds=pixels.getbbox()
                pieces.append(crop.crop(bounds) if bounds else None)
        valid=[p for p in pieces[:4] if p]
        if not valid:raise ValueError('No source frames '+sheet)
        # One fixed scaling factor PER SHEET: prevent body zooming when spell effects expand.
        reference_width=sorted([p.width for p in valid])[len(valid)//2]
        reference_height=sorted([p.height for p in valid])[len(valid)//2]
        scale=min(96/max(1,reference_height),98/max(1,reference_width),1.0)
        # Per-sheet same optical centre. Spell sheets may extend to right; keep body on stage.
        for start,end,name in clips:
            sequence=[]
            for i in range(start,end):
                piece=pieces[i]
                if piece is None:
                    skipped.append((name,i));continue
                w,h=[max(1,round(x*scale)) for x in piece.size]
                scaled=piece.resize((w,h),Image.Resampling.LANCZOS)
                cell=Image.new('RGBA',(CELL,CELL))
                ox=(CELL-w)//2 if w<=104 else 18  # body at stable screen x
                oy=CELL-9-h
                # Clip only transparent or wide FX overflow, not the source's aspect ratio.
                cell.alpha_composite(scaled,(ox,oy))
                if cell.getchannel('A').getbbox() is None: skipped.append((name,i));continue
                index=len(frames);frames.append(cell)
                sequence.append({'index':index,'sourceSheet':sheet,'sourceCell':i,'duration':DURATIONS[name],
                                 'rect':[(index%COLS)*CELL,(index//COLS)*CELL,CELL,CELL],
                                 'usefulRect':list(cell.getchannel('A').getbbox()),
                                 'pivot':[.5,(CELL-9)/CELL], 'offset':[ox,oy]})
            if sequence:
                meta['animations'][name]={'loop':name in LOOPS,'frameDuration':DURATIONS[name],
                                          'frames':sequence,'sourceSheet':sheet}
    atlas=Image.new('RGBA',(CELL*COLS,CELL*math.ceil(len(frames)/COLS)))
    for i,im in enumerate(frames):atlas.alpha_composite(im,((i%COLS)*CELL,(i//COLS)*CELL))
    # Indexed palette with alpha to reduce transfer and memory; transparency is preserved.
    out=OUT/'atlases/wombat-extra.png';atlas.quantize(colors=256,method=Image.Quantize.FASTOCTREE,dither=Image.Dither.NONE).save(out,optimize=True)
    (OUT/'atlas-extra.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
    sheet=atlas.copy();sheet.thumbnail((1050,1300))
    # Preview is intentionally not committed. The atlas is the runtime resource.
    print('source pages',len(SHEETS),'clips',len(meta['animations']),'frames',len(frames),'atlas',atlas.size,'bytes',out.stat().st_size,'skipped',skipped)

if __name__=='__main__':main()