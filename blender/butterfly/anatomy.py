"""Shared, deterministic wing design. Coordinates are authored in millimetres."""
import math

FORE = [(0, 3), (4, 13), (17, 23), (33, 31), (47, 35),
        (51.5, 33), (50.5, 27), (47, 19), (43, 11), (37.5, 3.5),
        (30.5, -2), (23, -5.7), (14, -6.6), (5, -4), (0, -1.5)]
HIND = [(0, 2), (9, 2.3), (22, -0.6), (32, -5.5), (38, -12),
        (37, -18.5), (33.5, -23.5), (30, -26), (28.7, -34.5),
        (27, -39), (24.2, -37), (21, -33.5), (18.8, -31),
        (16.5, -31), (13.5, -30), (10, -26.5), (6, -20), (2.2, -12), (0, -3)]

def catmull(points, t):
    k = min(len(points)-2, int(t*(len(points)-1)))
    f = t*(len(points)-1)-k
    p0,p1,p2,p3 = [points[max(0,min(len(points)-1,j))] for j in (k-1,k,k+1,k+2)]
    return tuple(0.5*((2*b)+(-a+c)*f+(2*a-5*b+4*c-d)*f*f+(-a+3*b-3*c+d)*f*f*f)
                 for a,b,c,d in zip(p0,p1,p2,p3))

def outline(kind, t):
    x,y = catmull(FORE if kind=='fore' else HIND, t)
    # Small, soft scallops on the distal edge; the outline itself carries the tail.
    lo,hi = (0.39,0.91) if kind=='fore' else (0.24,0.87)
    if lo < t < hi:
        s=(t-lo)/(hi-lo)
        dent=(0.72 if kind=='fore' else 0.78)*math.sin(math.pi*s)**2*(0.5-0.5*math.cos(s*math.pi*18))
        l=math.hypot(x,y)
        x*=1-dent/l; y*=1-dent/l
    return x,y

def point(kind, t, r):
    x,y=outline(kind,t)
    # Veins and markings follow a slightly bent fan rather than perfect rays.
    bend=0.45*math.sin(math.pi*r)*math.sin(t*math.pi*1.6)
    return x*r, y*r+bend

def height(kind,t,r):
    x,y=point(kind,t,r)
    rise=(0.085 if kind=='fore' else 0.047)*x
    camber=(1.1 if kind=='fore' else 0.8)*math.sin(math.pi*r)*math.sin(math.pi*t)
    flute=0.15*r**2*math.sin(t*math.pi*20)*(math.sin(math.pi*t)**2)
    return rise+camber+flute

BOUNDS={'fore':(-2,54,-10,38),'hind':(-2,41,-42,5)}
def uv(kind, x,y, underside=False):
    xmin,xmax,ymin,ymax=BOUNDS[kind]
    # Four islands: fore/hind in columns, dorsal/ventral in rows, padded 32px.
    u=(x-xmin)/(xmax-xmin)*0.46875+0.015625+(0.5 if kind=='hind' else 0)
    v=(y-ymin)/(ymax-ymin)*0.46875+0.015625+(0 if underside else 0.5)
    return u,v

VEINS={'fore':[0.08,0.17,0.26,0.35,0.435,0.515,0.60,0.68,0.76,0.84,0.925],
       'hind':[0.10,0.21,0.30,0.39,0.47,0.56,0.65,0.73,0.81,0.90]}
