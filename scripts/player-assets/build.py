#!/usr/bin/env python3
"""Rebuild reviewed ZIP artwork. Requires Pillow, numpy, scipy. Never grid-crop raw sheets.
Every source pixel belongs to exactly one frame; seams follow transparent gutters.
Body scale and feet are reviewed landmarks, independent of magic/alpha bounding boxes.
"""
from pathlib import Path
from zipfile import ZipFile
import argparse, json, io, hashlib
import numpy as np
from scipy.ndimage import label, find_objects, binary_dilation
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[2]
CELL=512; PIVOT=(160,400)
# source, row limits, bodies per row, neutral hat-to-sole height, body centres, soles
RECIPES={
 'cast_basic_fire':([0,350,635,955,1254],[4]*4,224,
 [[158,435,705,990],[172,485,795,1080],[158,435,710,985],[172,485,795,1080]],
 [[321]*4,[611]*4,[924]*4,[1205]*4]),
 'cast_ice_lightning':([0,405,720,1006,1254],[4]*4,218,
 [[163,443,719,975],[170,457,750,1036],[160,445,720,977],[175,454,745,1045]],
 [[389]*4,[701]*4,[1001]*4,[1237]*4]),
 'cast_heal_shield':([0,350,650,953,1254],[4]*4,231,
 [[167,473,780,1085],[180,477,788,1087],[162,481,785,1090],[163,480,790,1090]],
 [[326]*4,[616]*4,[925]*4,[1203]*4]),
 'cast_nova':([0,420,837,1254],[3]*3,252,
 [[233,626,1038],[205,620,1040],[215,620,1034]],[[393]*3,[813]*3,[1205]*3]),
 'run':([0,400,793],[5]*2,300,
 [[225,627,1035,1440,1835],[245,660,1055,1456,1860]],[[375]*5,[720,709,733,743,729]]),
 'hurt_death':([0,372,745,971],[4,5,5],258,
 [[158,493,807,1137],[159,478,792,1116,1442],[166,494,820,1145,1463]],
 [[351,351,355,352],[687,687,687,687,698],[933]*5]),
 'victory_pickup':([0,361,720,980,1254],[4,4,4,2],238,
 [[144,464,786,1116],[148,466,787,1100],[149,463,783,1093],[164,472]],
 [[352]*4,[695]*4,[968]*4,[1227]*2]),
 'climb':([0,449,887],[4,4],350,
 [[245,680,1105,1540],[245,680,1105,1540]],[[439]*4,[851]*4]),
 'state_variants':([0,340,648,960,1254],[4]*4,284,
 [[171,493,808,1118],[174,493,808,1118],[175,495,812,1122],[175,495,812,1122]],
 [[322]*4,[628]*4,[947]*4,[1230]*4])
}
# Clip windows are visually checked, row-major, not inferred from filenames.
WINDOWS={
 'cast_basic_fire':[('sano','cast_basic',0,8),('sano','cast_fire',8,16)],
 'cast_ice_lightning':[('sano','cast_ice',0,8),('sano','cast_lightning',8,16)],
 'cast_heal_shield':[('sano','cast_heal',0,8),('sano','cast_shield',8,16)],
 'cast_nova':[('sano','cast_nova',0,9)], 'run':[('sano','run',0,10)],
 'hurt_death':[('sano','hurt',0,4),('sano','death',4,14)],
 'victory_pickup':[('sano','victory',0,8),('sano','pickup',8,14)],
 'climb':[('sano','climb',0,8)],
 'state_variants':[('herido','idle',0,4),('herido','walk',4,8),('critico','idle',8,12),('critico','walk',12,16)]}
CORE_FEET={'idle':[91]*4+[90]*4,'walk':[91]*4+[88,88,89,88],
 'jump_start':[91,91,84],'jump_air':[82,79],'double_jump':[88,84,78,86,79],
 'fall':[84,87],'land':[85]*3,'dash':[93,93,93,68,68,68]}
# Reviewed foreign components at the left cut edge in pre-extracted core PNGs.
# No raw core sheets exist in this ZIP. Never remove arbitrary upper islands/FX.
CORE_REPAIRS={('idle',2):[0,28,3,33],('idle',6):[0,32,3,37],('idle',7):[0,30,2,36],
 ('jump_air',1):[0,25,3,31],('double_jump',1):[0,35,4,50],
 ('land',1):[0,28,3,31],('land',2):[0,36,1,41],
 ('dash',4):[0,27,16,47],('dash',5):[0,20,7,42]}
def repair_core(im,action,index):
 target=CORE_REPAIRS.get((action,index))
 if not target:return im
 a=np.array(im);labs,n=label(a[:,:,3]>25,np.ones((3,3)));found=False
 for k,b in enumerate(find_objects(labs),1):
  bounds=[b[1].start,b[0].start,b[1].stop,b[0].stop]
  if bounds==target:
   # Clear only this known fragment plus its alpha fringe, never other components.
   mask=(labs==k);fringe=binary_dilation(mask,iterations=1)&(a[:,:,3]<=25)
   a[mask|fringe]=0;found=True;break
 assert found,('Source changed: review repair again',action,index,target)
 return Image.fromarray(a)
CORE_REFERENCE={'idle':80,'walk':80,'jump_start':66,'jump_air':68,'double_jump':68,'fall':72,'land':74,'dash':80}
CORE_CENTRES={'idle':[51]*8,'walk':[51]*8,'jump_start':[49,49,49],'jump_air':[53,51],'double_jump':[55,49,50,55,51],'fall':[51,51],'land':[52,52,49],'dash':[59,58,64,58,60,61]}
# Staff crystal landmarks in raw coordinates, reviewed separately from effect bounds.
SOCKETS={
 'cast_basic':[(260,143),(523,111),(833,161),(1111,178),(296,445),(619,422),(894,412),(1179,429)],
 'cast_fire':[(259,755),(523,712),(831,767),(1105,786),(294,1048),(619,1030),(894,1018),(1179,1019)],
 'cast_ice':[(267,214),(548,193),(817,189),(1117,267),(285,530),(550,506),(856,503),(1156,518)],
 'cast_lightning':[(263,842),(548,851),(817,830),(1104,902),(276,1060),(550,1072),(849,1062),(1142,1066)],
 'cast_heal':[(272,147),(574,139),(870,118),(1140,115),(290,430),(570,435),(877,435),(1172,436)],
 'cast_shield':[(275,767),(584,764),(862,797),(1099,780),(271,1032),(582,1032),(871,1037),(1170,1031)],
 'cast_nova':[(330,206),(733,197),(1138,126),(328,525),(691,508),(1157,527),(328,972),(735,1008),(1150,1020)]}


GUIDES={
 'cast_basic_fire':[[308,570,878],[340,660,940],[308,572,880],[338,662,940]],
 'cast_ice_lightning':[[315,590,857],[322,610,915],[307,586,860],[319,615,910]],
 'cast_heal_shield':[[320,630,925],[336,633,940],[328,640,934],[331,635,931]],
 'run':[[405,812,1215,1600],[427,848,1244,1625]],
 'victory_pickup':[[309,620,950],[312,632,954],[312,638,945],[329]],
 'state_variants':[[328,643,957],[338,647,961],[326,644,961],[334,646,960]]
}

def seam(alpha,expected,radius=36):
 """Minimum-alpha vertical path; use transposition for horizontal boundaries.
 Slight regularization keeps a transparent route near its reviewed guide.
 """
 h,w=alpha.shape; lo=max(1,int(expected-radius));hi=min(w-1,int(expected+radius))
 costs=alpha[:,lo:hi].astype(float)*100+abs(np.arange(lo,hi)-expected)*.02
 prev=costs[0].copy();back=np.zeros(costs.shape,dtype=np.int16)
 for y in range(1,h):
  candidates=np.stack([np.r_[np.inf,prev[:-1]],prev,np.r_[prev[1:],np.inf]])
  choices=candidates.argmin(axis=0);back[y]=choices-1
  prev=costs[y]+candidates.min(axis=0)
 x=int(prev.argmin());path=np.zeros(h,dtype=int)
 for y in range(h-1,-1,-1):path[y]=x+lo;x+=int(back[y,x])
 return path

def split_sheet(im,recipe,source):
 a=np.array(im);h,w=a.shape[:2];ys,counts,ref,cxs,soles=recipe
 # Seams form a partition, preserving particles and antialias pixels on both sides.
 row=np.zeros((h,w),dtype=np.uint8)
 for y in ys[1:-1]:row+=(np.arange(h)[:,None]>=seam(a[:,:,3].T,y,16)[None,:])
 pieces=[];ownership=np.zeros((h,w),dtype=np.uint8)
 for r,count in enumerate(counts):
  top=max(0,ys[r]-16);bottom=min(h,ys[r+1]+16);cols=np.zeros((h,w),dtype=np.uint8)
  # Use each row's true column count (hurt uses 5-wide spacing for its 4 poses).
  width=w/(5 if recipe is RECIPES['hurt_death'] else 4 if recipe is RECIPES['victory_pickup'] else count)
  for c in range(1,count):
   guide=GUIDES.get(source,[]);expected=guide[r][c-1] if guide else c*width
   p=seam(a[top:bottom,:,3],expected,42)
   cols[top:bottom]+=(np.arange(w)[None,:]>=p[:,None])
  for c in range(count):
   mask=(row==r)&(cols==c);ownership+=mask
   data=a.copy();data[~mask]=0
   img=Image.fromarray(data);bbox=img.getbbox();assert bbox
   pieces.append((img.crop(bbox),bbox,(cxs[r][c],soles[r][c]),96/ref))
 assert np.all(ownership==1),'Source pixel ownership must be unique and complete'
 return pieces

def build(zip_path):
 out=ROOT/'public/assets/sprites/wombat/rebuilt';out.mkdir(parents=True,exist_ok=True)
 manifest={'schemaVersion':1,'cell':CELL,'pivot':list(PIVOT),'sourceZipSha256':hashlib.sha256(Path(zip_path).read_bytes()).hexdigest(),'variants':{}}
 with ZipFile(zip_path) as z:
  names=json.loads(z.read('metadata/mapeo_acciones_es.json'))['acciones'];original={v:json.loads(z.read(f'metadata/tecnico_wombat__{v}__lote1.json')) for v in ['sano','herido','critico']}
  sources={};frames={v:{} for v in original}
  for source,recipe in RECIPES.items():
   path=f'raw/tecnico_wombat/{source}.png';data=z.read(path);sources[path]=hashlib.sha256(data).hexdigest()
   pieces=split_sheet(Image.open(io.BytesIO(data)).convert('RGBA'),recipe,source)
   for variant,action,start,end in WINDOWS[source]:
    frames[variant][action]=[(piece,path,i,SOCKETS.get(action,[None]*(end-start))[i-start]) for i,piece in enumerate(pieces) if start<=i<end]
  for action,soles in CORE_FEET.items():
   clip=[]
   for i,sole in enumerate(soles):
    path=f'sprites/tecnico_wombat/sano/{names[action]}/{names[action]}_{i+1:02}.png';data=z.read(path);sources[path]=hashlib.sha256(data).hexdigest();im=Image.open(io.BytesIO(data)).convert('RGBA')
    im=repair_core(im,action,i)
    clip.append(((im,(0,0,96,96),(CORE_CENTRES[action][i],sole),96/CORE_REFERENCE[action]),path,i,None))
   frames['sano'][action]=clip
  review=[]
  for variant,clips in frames.items():
   v={'file':f'{variant}.png','clips':{}};packed=[];pack_x=pack_y=row_h=0
   for action in original[variant]['animations']:
    sequence=clips[action];info=original[variant]['animations'][action];entries=[];row=[]
    for (im,bbox,origin,scale),source,source_index,socket in sequence:
     scaled=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.NEAREST)
     ox=PIVOT[0]+round((bbox[0]-origin[0])*scale);oy=PIVOT[1]+round((bbox[1]-origin[1])*scale)
     assert ox>=0 and oy>=0 and ox+scaled.width<=CELL and oy+scaled.height<=CELL,(variant,action,source_index,(ox,oy),scaled.size)
     cell=Image.new('RGBA',(CELL,CELL));cell.paste(scaled,(ox,oy));bounds=cell.getbbox();assert bounds
     trim=(max(0,bounds[0]-2),max(0,bounds[1]-2),min(CELL,bounds[2]+2),min(CELL,bounds[3]+2));tile=cell.crop(trim)
     if pack_x+tile.width>1024:pack_x=0;pack_y+=row_h;row_h=0
     x,y=pack_x,pack_y;pack_x+=tile.width;row_h=max(row_h,tile.height);packed.append((tile,x,y))
     staff=[PIVOT[0]+round((socket[0]-origin[0])*scale),PIVOT[1]+round((socket[1]-origin[1])*scale)] if socket else [PIVOT[0]+38,PIVOT[1]-65]
     entries.append({'x':x,'y':y,'width':tile.width,'height':tile.height,'pivot':[PIVOT[0]-trim[0],PIVOT[1]-trim[1]],'socket':[staff[0]-trim[0],staff[1]-trim[1]],'bounds':[bounds[0]-trim[0],bounds[1]-trim[1],bounds[2]-trim[0],bounds[3]-trim[1]],'source':source,'sourceIndex':source_index,'removedForeignComponent':CORE_REPAIRS.get((action,source_index)) if source.startswith('sprites/') else None,'sourceBounds':list(bbox),'sourceOrigin':list(origin),'scale':scale,'rgbaSha256':hashlib.sha256(tile.tobytes()).hexdigest()});row.append(cell.crop((60,220,260,430)))
    v['clips'][action]={'name':action,'fps':info['fps'],'loop':bool(info['loop']),'frames':entries}
    review.append((variant+'/'+action,row))
   atlas=Image.new('RGBA',(1024,pack_y+row_h))
   for tile,x,y in packed:atlas.paste(tile,(x,y))
   v.update(width=atlas.width,height=atlas.height)
   atlas.save(out/v['file'],optimize=True);v['sha256']=hashlib.sha256((out/v['file']).read_bytes()).hexdigest();manifest['variants'][variant]=v
  manifest['sourceHashes']=sources
  (ROOT/'src/player/assets-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
  contact=Image.new('RGB',(180+200*10,len(review)*224),(40,44,53));d=ImageDraw.Draw(contact)
  for i,(name,row) in enumerate(review):
   d.text((5,i*224+90),name,fill='white')
   for j,im in enumerate(row):
    x=180+j*200;y=i*224;contact.paste(im,(x,y),im);d.text((x,y),str(j+1),fill='white');d.line((x,y+180,x+200,y+180),fill='#717171')
  contact.save(ROOT/'docs/player-animation-contact-sheet.jpg')
  print('Built',sum(sum(len(c['frames']) for c in v['clips'].values()) for v in manifest['variants'].values()),'frames')
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('zip');build(p.parse_args().zip)
