# Optional asset-rebuild script. Run from unpacked project with Pillow, OpenCV, NumPy installed.
# It rebuilds independent transparent layer PNG files and the city backplate from the included artwork.
import os,cv2,numpy as np,math,time
from PIL import Image,ImageFilter
from pathlib import Path
P=str(Path(__file__).resolve().parents[1])
os.makedirs(P+'/assets/body',exist_ok=True)
for t in ['hair_left','hair_right','hair_other','background','particles'] : os.makedirs(P+'/assets/'+t,exist_ok=True)
src=np.array(Image.open(P+'/assets/art/scene_clean_source.png').convert('RGB'))
H,W=src.shape[:2]
def poly(points):
 a=np.zeros((H,W),np.uint8);cv2.fillPoly(a,[np.array(points,np.int32)],255);return a

def add_poly(arr,pp):cv2.fillPoly(arr,[np.array(pp,np.int32)],255)

left=poly([(442,166),(404,130),(355,130),(307,168),(254,189),(200,236),(136,290),(92,335),(107,383),(144,354),(180,302),(247,271),(206,329),(136,393),(130,458),(158,488),(209,455),(171,506),(183,545),(226,584),(275,612),(337,564),(384,509),(434,442),(473,389),(503,327),(491,257)])
# secondary outer wisps and disconnected tail tips
add_poly(left,[(220,290),(154,330),(54,399),(0,434),(0,464),(96,434),(170,389),(277,345)])
add_poly(left,[(391,445),(297,496),(206,525),(220,565),(276,615),(342,578),(416,518),(454,454)])
right=poly([(673,114),(672,27),(722,15),(780,47),(819,100),(838,157),(871,205),(890,269),(926,309),(982,351),(1028,410),(1090,452),(1112,477),(1064,465),(1033,489),(1098,519),(1102,551),(1062,551),(1057,585),(1027,637),(982,647),(961,610),(926,574),(917,502),(871,468),(830,428),(804,366),(769,322),(730,292),(707,242)])
# edge wisps
add_poly(right,[(827,257),(917,294),(999,339),(1070,381),(1125,452),(1120,483),(1059,445),(963,414),(874,369)])
other=poly([(456,135),(516,106),(566,92),(642,117),(682,159),(679,231),(649,275),(611,302),(564,319),(505,310),(475,273),(453,227)])
# other only moving small bangs, not entire face
other[:,:]=0
for pp in [
  [(475,140),(505,151),(497,215),(477,257),(462,244)],
  [(529,119),(550,129),(554,206),(542,244),(517,226)],
  [(580,117),(601,130),(602,217),(582,259),(563,249)],
  [(615,132),(635,147),(656,216),(640,266),(614,244)]]: add_poly(other,pp)
# exclude face from left / right moving regions; these masks preserve outfit and neck at rest
body_occlude=poly([(426,363),(466,348),(507,381),(559,409),(612,396),(663,363),(708,328),(760,336),(829,366),(873,453),(921,554),(936,627),(899,678),(824,654),(803,726),(724,768),(626,722),(543,667),(462,633),(397,583),(366,512)])
left[body_occlude>0]=0; right[body_occlude>0]=0
# Main figure segmentation: contains foreground and primary fixed bangs / body.
body=poly([(0,741),(60,713),(130,697),(171,648),(225,593),(264,550),(321,521),(352,480),(387,410),(424,342),(435,276),(412,208),(420,144),(457,84),(511,57),(562,27),(651,18),(746,53),(795,126),(791,247),(834,306),(866,366),(896,434),(938,525),(946,645),(992,632),(1085,658),(1130,721),(1140,828),(1117,908),(1054,936),(0,941)])
# union all masks, then prioritize hair in its own layer. In fine fringe boundary, keep full body for optical fidelity.
total=np.maximum.reduce([body,left,right,other])
# Keep foreground opacity binary for no ghost seams at source resolution
left=np.where(left>0,255,0).astype('uint8'); right=np.where(right>0,255,0).astype('uint8');other=np.where(other>0,255,0).astype('uint8')
# Give body priority over moving hair on face / sleeves; minor attached hair roots remain fixed.
body_protect=cv2.erode(body_occlude,np.ones((9,9),np.uint8))
for a in [left,right,other]:a[body_protect>0]=0
# mask content: hair belongs only to hair layers unless overlap was intentionally protected
body=(total.astype(np.uint16)*(1- (np.maximum.reduce([left,right,other])>0).astype('uint16'))).astype('uint8')
# Restore city beneath the character from detailed neighboring skyline patches (not blurred):
# Use cloned textured city segments, without the female foreground, for the wholly occluded zones.
bg=src.copy()
# Select distant-city pixels only. Tile from city right region at x >= 1150; no main subject.
city_src=src[:,1190:1672]
for x0 in range(0,1180,190):
  sw=min(190,1180-x0)
  # offset varying by tile to keep pattern non-identical and vary skyline structures
  ox=(83+ x0*17//19)%max(1,city_src.shape[1]-sw-1)
  patch=city_src[:,ox:ox+sw]
  if x0%380==0: patch=patch[:,::-1]
  bg[:,x0:x0+sw]=patch
# Keep unoccluded original city exactly as in the high-quality illustration
fgmask=total>0
bg[~fgmask]=src[~fgmask]
# tile seams under foreground are offscreen, but gently blend rows where uncovered near the figure
# Create a reconstructable, fully registered 1x master: all pixels from original appear in correct positions.
# Save city at 4K with an 8-bit-resampled full-fidelity PNG; do not pre-blur any distant scenery.
Image.fromarray(bg).resize((3840,2160),Image.Resampling.LANCZOS).save(P+'/assets/background/city_4k.png',compress_level=6)

def crop_and_save(mask,path,box):
 x0,y0,x1,y1=box; arr=np.dstack([src[y0:y1,x0:x1],mask[y0:y1,x0:x1]])
 Image.fromarray(arr,'RGBA').save(path,compress_level=6)
# body is sprite on entire canvas with transparent pixels; alpha 1 where body present.
crop_and_save(body,P+'/assets/body/character.png',(0,0,W,H))
# premade hair frame paths stored in independent folders
regions={'hair_left':(0,105,565,660),'hair_right':(633,0,1190,690),'hair_other':(440,85,705,336)}
ms={'hair_left':left,'hair_right':right,'hair_other':other}
for name,(x0,y0,x1,y1) in regions.items():
 roi=np.dstack([src[y0:y1,x0:x1],ms[name][y0:y1,x0:x1]])
 hh,ww=roi.shape[:2]
 xx,yy=np.meshgrid(np.arange(ww,dtype=np.float32),np.arange(hh,dtype=np.float32))
 # identical first/last phase is periodic analytically; no crossfade, no browser puppet warp.
 for i in range(48):
  ang=2*math.pi*i/48
  if name=='hair_other':
   root,amp,denom,phase=80,1.15,max(1,hh-80),0.8
  elif name=='hair_left':
   root,amp,denom,phase=65,4.2,hh-65,0
  else:
   root,amp,denom,phase=30,4.9,hh-30,0.65
  rel=np.clip((yy-root)/max(1,denom),0,1)
  envelope=rel*rel*(3-2*rel)
  # aerodynamic lag: tips sweep farther and respond later than stable roots
  lag=ang - .64*rel+phase
  moveX=amp*envelope*np.sin(lag)
  moveY=amp*.35*envelope*np.cos(lag+.32)
  # sample source pixel from underlying sprite, offline export only
  warped=cv2.remap(roi,xx-moveX,yy-moveY,cv2.INTER_LINEAR,borderMode=cv2.BORDER_CONSTANT,borderValue=(0,0,0,0))
  Image.fromarray(warped,'RGBA').save(f'{P}/assets/{name}/{i:03}.png',compress_level=4)
  if i==0:Image.fromarray(roi,'RGBA').save(f'{P}/assets/{name}/source.png',compress_level=4)
 print('created',name,'frames=48', 'size',ww,hh, flush=True)
# original reference vs v2 composite: pixelwise exact in the fully masked area at rest.
mat=np.asarray(Image.open(P+'/assets/background/city_4k.png').resize((W,H),Image.Resampling.LANCZOS).convert('RGB')).copy()
# exact source-scale compositor for quick preview
mat=bg.astype('float32')
for mask in [left,right,body,other]:
 a=mask.astype('float32')[...,None]/255
 mat=mat*(1-a)+src*a
mat=np.clip(mat,0,255).astype('uint8')
Image.fromarray(mat).resize((1920,1080),Image.Resampling.LANCZOS).save(P+'/docs_layered_preview.png')
print('difference to art at rest',np.abs(mat.astype('float32')-src).mean(), 'max',np.abs(mat.astype('int16')-src).max())
