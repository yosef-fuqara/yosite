"""Recolor the provided wing atlas toward warm charcoal and ivory.

The mesh UVs stay on this atlas. Veins, spots and dark margins stay dark.
The colored membrane becomes warm ivory, never pure white. The original
JPEG is not modified.
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

SRC = Path(r"c:\Users\yosef\OneDrive\שולחן העבודה\projects\yo-site\blender\butterfly\_incoming\Texture\Alas mariposa.jpg")
OUT = Path(r"c:\Users\yosef\OneDrive\שולחן העבודה\projects\yo-site\blender\butterfly\textures\wing_ivory_reference.png")
NORMAL = Path(r"c:\Users\yosef\OneDrive\שולחן העבודה\projects\yo-site\blender\butterfly\textures\wing_ivory_normal.png")
OUT.parent.mkdir(parents=True, exist_ok=True)

rgb = np.asarray(Image.open(SRC).convert("RGB")).astype(np.float32)
lum = rgb[..., 0] * 0.2126 + rgb[..., 1] * 0.7152 + rgb[..., 2] * 0.0722
spread = rgb.max(axis=-1) - rgb.min(axis=-1)
paper = (lum > 236.0) & (spread < 28.0)
wing = ~paper

blur = np.asarray(
    Image.fromarray(np.clip(lum, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(5))
).astype(np.float32)
# Deep spots and veins stay black. The colored membrane is lifted into ivory
# so the wings read cream, not gray, on both white and black.
mark = wing & ((lum < 78.0) | (lum < blur * 0.66))
soft = np.clip((lum - 55.0) / 125.0, 0.0, 1.0)
soft = np.power(soft, 0.55)

charcoal = np.array([14.0, 12.0, 10.0], dtype=np.float32)
beige = np.array([198.0, 182.0, 156.0], dtype=np.float32)
ivory = np.array([238.0, 226.0, 202.0], dtype=np.float32)

membrane = beige * (1.0 - soft)[..., None] + ivory * soft[..., None]
color = np.broadcast_to(np.array([232.0, 220.0, 196.0], dtype=np.float32), rgb.shape).copy()
color[wing] = membrane[wing]
mark_strength = np.clip((92.0 - lum) / 70.0, 0.0, 1.0)
marked = charcoal * mark_strength[..., None] + membrane * (1.0 - mark_strength)[..., None]
color[mark] = marked[mark]

mask = Image.fromarray((wing.astype(np.uint8) * 255))
edge = wing & (np.asarray(mask.filter(ImageFilter.MinFilter(7))) < 128)
color[edge] = color[edge] * 0.35 + charcoal * 0.65
# Warm the lights, and keep them short of white.
warm = np.clip((soft - 0.45) / 0.55, 0.0, 1.0) * wing
color[..., 0] += warm * 3.0
color[..., 2] -= warm * 5.0
color = np.clip(color, 0, 242)
color[~wing] = (232, 220, 196)

alpha = np.where(wing, 255, 0).astype(np.uint8)
Image.fromarray(np.dstack([color.astype(np.uint8), alpha]), "RGBA").save(OUT, optimize=True)

# Vein relief from the dark markings. Subtle, so the wings stay satin.
height = np.clip(1.0 - mark_strength, 0.0, 1.0)
height = np.where(wing, height, 0.0)
height_img = Image.fromarray(np.clip(height * 255.0, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
h = np.asarray(height_img).astype(np.float32) / 255.0
dy, dx = np.gradient(h)
normal = np.stack([-dx * 1.6, dy * 1.6, np.ones_like(dx)], axis=-1)
normal /= np.linalg.norm(normal, axis=-1, keepdims=True) + 1e-8
normal_img = Image.fromarray(np.uint8((normal * 0.5 + 0.5) * 255.0)).resize((1060, 1500), Image.Resampling.LANCZOS)
normal_img.save(NORMAL, optimize=True)

sample = color[wing]
print("WROTE", OUT.name, "wing_mean", sample.mean(axis=0).round(1), "wing_hi", np.percentile(sample, 90, axis=0).round(1))
