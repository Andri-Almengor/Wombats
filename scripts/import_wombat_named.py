#!/usr/bin/env python3
"""Reproduce the original 156 named sprites and remove isolated cross-row bleed."""
from pathlib import Path
from zipfile import ZipFile
from PIL import Image
import argparse,io,json

SIZE=96

def remove_top_bleed(frame):
    """Delete ONLY stray upper-edge alpha islands disconnected from the character.

    Several frames in the source production atlas contain pieces from the prior
    sprite-sheet row. Those pieces touch y=0 and end before y=24, whereas the
    primary sprite continues to the middle/bottom of the cell. Preserve all
    connected character pixels and effects, including legitimate upper effects
    that extend below y=23.
    """
    width,height=frame.size
    if (width,height)!=(SIZE,SIZE):
        raise ValueError('Frame must be 96x96')
    alpha=list(frame.getchannel('A').getdata())
    visited=bytearray(SIZE*SIZE)
    components=[]
    for i,value in enumerate(alpha):
        if value<=25 or visited[i]:
            continue
        stack=[i]
        visited[i]=1
        area=0
        x0=SIZE; x1=-1; y0=SIZE; y1=-1
        while stack:
            u=stack.pop()
            y,x=divmod(u,SIZE)
            area+=1
            x0=min(x0,x);x1=max(x1,x);y0=min(y0,y);y1=max(y1,y)
            for yy in range(max(0,y-1),min(SIZE,y+2)):
                for xx in range(max(0,x-1),min(SIZE,x+2)):
                    v=yy*SIZE+xx
                    if not visited[v] and alpha[v]>25:
                        visited[v]=1
                        stack.append(v)
        components.append((area,x0,x1,y0,y1))
    if not components:
        return frame,0
    main=max(components,key=lambda component:component[0])
    pixels=frame.load()
    removed=0
    for area,x0,x1,y0,y1 in components:
        if area>=main[0] or y0>1 or y1>23 or area<6:
            continue
        for y in range(max(0,y0-1),min(SIZE,y1+2)):
            for x in range(max(0,x0-1),min(SIZE,x1+2)):
                pixels[x,y]=(0,0,0,0)
        removed+=1
    return frame,removed


def main():
    parser=argparse.ArgumentParser(description='Import the user-supplied WOMBAT named ZIP')
    parser.add_argument('zip_path')
    args=parser.parse_args()
    output=Path(__file__).resolve().parents[1]/'public/assets/sprites/wombat/named'
    output.mkdir(parents=True,exist_ok=True)
    all_removed=0
    with ZipFile(args.zip_path) as source:
        for variant,dimensions in [('sano',(960,2016)),('herido',(384,192)),('critico',(384,192))]:
            atlas_name=f'tecnico_wombat__{variant}__lote1.png'
            atlas=Image.open(io.BytesIO(source.read('atlases/'+atlas_name))).convert('RGBA')
            if atlas.size!=dimensions:
                raise ValueError(f'{atlas_name}: invalid dimensions {atlas.size}')
            info=json.loads(source.read('metadata/'+atlas_name.replace('.png','.json')))
            count=0
            removed=0
            for name,clip in info['animations'].items():
                for entry in clip['frames']:
                    x,y,w,h=[entry[key] for key in ('x','y','w','h')]
                    if w!=SIZE or h!=SIZE or x<0 or y<0 or x+w>atlas.width or y+h>atlas.height:
                        raise ValueError(f'Invalid rect: {variant}/{name}')
                    frame=atlas.crop((x,y,x+w,y+h))
                    if not frame.getchannel('A').getbbox():
                        raise ValueError(f'Empty frame: {variant}/{name}')
                    frame,cleared=remove_top_bleed(frame)
                    if cleared:
                        atlas.paste(frame,(x,y))
                        removed+=cleared
                    count+=1
            if count!=(140 if variant=='sano' else 8):
                raise ValueError(f'Unexpected frame count: {variant}/{count}')
            dest=output/f'wombat-{variant}.png'
            atlas.quantize(colors=256,method=Image.Quantize.FASTOCTREE,dither=Image.Dither.NONE).save(dest,optimize=True)
            test=Image.open(dest).convert('RGBA')
            if test.getchannel('A').getextrema()[0]!=0:
                raise ValueError(f'PNG transparency lost in {variant}')
            print(f'{dest}: {count} frames; removed {removed} foreign-row islands; {dest.stat().st_size} bytes')
            all_removed+=removed
    print(f'Total cleaned foreign-row islands: {all_removed}')

if __name__=='__main__':
    main()
