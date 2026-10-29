"""Author the painted PBR atlas; run with system Python (Pillow + numpy)."""
from pathlib import Path
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from anatomy import point, uv, VEINS

OUT=Path(__file__).resolve().parent/'textures'
OUT.mkdir(exist_ok=True)
N=2048
base=Image.new('L',(N,N),19)
vein=Image.new('L',(N,N),0)
membrane=Image.new('L',(N,N),0)
rng=np.random.default_rng(2718)

def pixel(kind,t,r,under):
    x,y=point(kind,t,r); u,v=uv(kind,x,y,under)
    return (u*N,(1-v)*N)

def strip(kind,a,b,r0,r1,under,value):
    # Organic rounded, tapered patches, not straight concentric bands.
    pts=[]
    for side in (0,1):
        for j in range(45):
            s=(j/44 if side==0 else 1-j/44)
            t=a+(b-a)*s
            taper=math.sin(math.pi*s)**(0.19 if r1-r0>.12 else .38)
            center=(r0+r1)*0.5+0.013*math.sin(t*27)+0.002*math.sin(s*16+t*18)
            rad=center+(-1 if side==0 else 1)*(r1-r0)*.5*taper
            pts.append(pixel(kind,t,rad,under))
    ImageDraw.Draw(base).polygon(pts,fill=int(value))

for kind in ['fore','hind']:
    ts=VEINS[kind]
    for under in [False,True]:
        # A high contrast postdiscal ribbon broken into vein-delimited cells.
        for i,(a,b) in enumerate(zip(ts[:-1],ts[1:])):
            mid=(a+b)/2
            if kind=='fore':
                r0=0.46+0.08*math.cos(mid*5)
                r1=0.71+0.025*math.sin(mid*9)
                val=202+24*math.sin(mid*5)
            else:
                r0=0.38+0.04*math.sin(mid*8)
                r1=0.68+0.045*math.cos(mid*8)
                val=202+18*math.sin(mid*5)
            if under: val*=.86
            strip(kind,a+.006,b-.007,r0,r1,under,val)
            # Marginal lunules deliberately small: a broad dark border remains.
            strip(kind,a+.016,b-.016,.835,.882+(i%3)*.009,under,157 if under else 197)
            if i not in (0,len(ts)-2):
                strip(kind,a+.025,b-.026,.944,.953,under,86 if under else 121)
            # Long subtle silver basal streaks follow the discal cells.
            if i<7:
                strip(kind,a+.020,b-.024,.19,.37,under,(64 if under else 78)+i*3)
        # Strong primary veins with a softly raised profile baked in the normal.
        vd=ImageDraw.Draw(vein)
        bd=ImageDraw.Draw(base)
        for i,t in enumerate(ts):
            pts=[pixel(kind,t,float(r),under) for r in np.linspace(.06,.993,120)]
            vd.line(pts,fill=225,width=4 if i%3 else 5,joint='curve')
            bd.line(pts,fill=15,width=3 if i%3 else 4,joint='curve')
        # Curved discal cross-vein, closing the wing's central structural cell.
        pts=[pixel(kind,float(t),.405+.015*math.sin(t*17),under) for t in np.linspace(ts[1],ts[-3],130)]
        vd.line(pts,fill=170,width=3,joint='curve'); bd.line(pts,fill=22,width=2,joint='curve')
        # A few bifurcating secondary veins pass through the pale cells.
        for i in (2,4,6):
            a,b=ts[i],ts[i+1]
            pts=[pixel(kind,a+(b-a)*.46*min(1,(float(r)-.28)/.35),float(r),under) for r in np.linspace(.28,.97,100)]
            vd.line(pts,fill=160,width=3,joint='curve')
            bd.line(pts,fill=24,width=2,joint='curve')
        # Membrane weight only in pale cells, no alpha sorting or cutout edges.

gray=np.asarray(base.filter(ImageFilter.GaussianBlur(.35))).astype(np.float32)
yy,xx=np.indices((N,N))
# Fine imbricated scales: anisotropic, staggered and restrained at 2K.
scale=np.sin(xx*2.16+np.floor(yy/3)*1.1)*np.sin(yy*1.07)
grain=rng.normal(0,.75,(N,N))
mottle=np.asarray(Image.fromarray(np.uint8(rng.random((64,64))*255)).resize((N,N),Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(10))).astype(np.float32)/255-.5
gray=np.clip(gray+scale*2.2+grain+mottle*19*(gray/255),0,255)
# Warm editorial palette: charcoal shadows, ivory/cream highlights (not cold white).
CHARCOAL=np.array([24.,21.,17.],dtype=np.float32)
WARM_BEIGE=np.array([156.,148.,132.],dtype=np.float32)
IVORY=np.array([244.,235.,214.],dtype=np.float32)
t=np.clip(gray.astype(np.float32)/255.,0,1)
t=np.power(t,.93)
mid=.52
tm=np.clip(t/mid,0,1); tm2=np.clip((t-mid)/(1-mid),0,1)
rgb=CHARCOAL*(1-tm)[...,None]+WARM_BEIGE*tm[...,None]
rgb=rgb*(1-tm2[...,None])+IVORY*tm2[...,None]
warm=np.clip((t-.58)/.42,0,1)
rgb[...,0]+=warm*2.8; rgb[...,1]+=warm*1.4; rgb[...,2]-=warm*2.2
rgb=np.clip(rgb,0,255).astype(np.uint8)
Image.fromarray(rgb).quantize(colors=112).save(OUT/'wing_basecolor.png',optimize=True)
raised=np.asarray(vein.filter(ImageFilter.GaussianBlur(1.4))).astype(np.float32)/255
h=raised*1.35+scale*.065+grain*.02
dy,dx=np.gradient(h)
normal=np.stack([-dx*.58,dy*.58,np.ones_like(dx)],axis=-1)
normal/=np.linalg.norm(normal,axis=-1,keepdims=True)
Image.fromarray(np.uint8((normal*.5+.5)*255)).resize((1024,1024),Image.Resampling.LANCZOS).save(OUT/'wing_normal.png',optimize=True)
rough=np.clip(186-gray*.102+grain*.8+scale*2,146,204).astype(np.uint8)
orm=np.stack([np.full_like(rough,255),rough,np.zeros_like(rough)],axis=-1)
Image.fromarray(orm).resize((1024,1024),Image.Resampling.LANCZOS).save(OUT/'wing_orm.png',optimize=True)
# Transmission is at most 6%; veins and borders remain opaque.
trans=np.clip((gray-48)/195*17,0,17).astype(np.uint8)
Image.fromarray(np.repeat(trans[...,None],3,axis=2)).resize((1024,1024),Image.Resampling.LANCZOS).save(OUT/'wing_transmission.png',optimize=True)
# Body microtexture: reusable UV-space scale/fine longitudinal relief.
n=256; y,x=np.indices((n,n)); noise=rng.normal(0,1,(n,n))
body_h=.05*np.sin(x*.6+np.sin(y*.13))+.024*noise
dy,dx=np.gradient(body_h)
norm=np.stack([-dx,dy,np.ones_like(dx)],axis=-1); norm/=np.linalg.norm(norm,axis=-1,keepdims=True)
Image.fromarray(np.uint8((norm*.5+.5)*255)).save(OUT/'body_normal.png',optimize=True)
print('Created wing atlas: 2048 x 2048, four padded islands; body normal: 256 x 256')
