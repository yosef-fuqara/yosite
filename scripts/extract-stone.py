"""
Extract the stone asset from the design-reference screenshot and produce a
clean, edge-antialiased transparent PNG (background removed).

The source photo already sits on a near-pure-black backdrop, so we build an
alpha mask from local luminance/contrast rather than a flat threshold: this
keeps the naturally dark crevices of the rock (which are also near-black)
while cutting the flat black background around the silhouette to full
transparency, with a soft feather at the boundary for clean edges.
"""

from PIL import Image, ImageFilter
import numpy as np

SRC = r"C:\Users\yosef\.cursor\projects\c-Users-yosef-OneDrive-projects-yo-site\assets\c__Users_yosef_AppData_Roaming_Cursor_User_workspaceStorage_c214127008fa69e6788a30e37a0d3f40_images_image-9473627f-a5fa-4358-b899-8ba7c44adbff.png"
OUT_DIR = r"C:\Users\yosef\OneDrive\שולחן העבודה\projects\yo-site\public\images"
CROP_BOX = (470, 60, 1024, 576)  # (left, top, right, bottom) around the stone

im = Image.open(SRC).convert("RGB")
crop = im.crop(CROP_BOX)

# Upscale for smoother edges once masked (source is fairly low-res).
SCALE = 3
big = crop.resize((crop.width * SCALE, crop.height * SCALE), Image.LANCZOS)

arr = np.asarray(big).astype(np.float32)
luminance = (0.2126 * arr[:, :, 0] + 0.7152 * arr[:, :, 1] + 0.0722 * arr[:, :, 2])

# Local "detail" signal: the flat background has near-zero local variance,
# while the rock's rough texture has strong local contrast even in shadow.
gray_img = Image.fromarray(luminance.astype(np.uint8))
blur_small = np.asarray(gray_img.filter(ImageFilter.GaussianBlur(1))).astype(np.float32)
blur_large = np.asarray(gray_img.filter(ImageFilter.GaussianBlur(10))).astype(np.float32)
detail = np.abs(blur_small - blur_large)

# Alpha = combination of raw brightness and local detail/texture so that
# bright ridges AND dark-but-textured crevices are both kept opaque, while
# the smooth flat black backdrop drops to alpha 0.
alpha_from_luma = np.clip((luminance - 3) / 14.0, 0, 1)
alpha_from_detail = np.clip(detail / 3.0, 0, 1)
alpha = np.clip(np.maximum(alpha_from_luma, alpha_from_detail * 1.6), 0, 1)

alpha_img = Image.fromarray((alpha * 255).astype(np.uint8))
alpha_img = alpha_img.filter(ImageFilter.GaussianBlur(1.2))

# Suppress isolated background specks (small noise not connected to main mass)
alpha_arr = np.asarray(alpha_img).astype(np.float32)
alpha_arr = np.where(alpha_arr < 10, 0, alpha_arr)

rgba = big.convert("RGBA")
r, g, b, _ = rgba.split()
out = Image.merge("RGBA", (r, g, b, Image.fromarray(alpha_arr.astype(np.uint8))))

# Settle on 2x the original crop resolution: enough headroom for a large
# hero placement while keeping edges clean/anti-aliased (full 3x upscale is
# only used internally to compute a smooth mask).
FINAL_SCALE = 2
final = out.resize(
    (crop.width * FINAL_SCALE, crop.height * FINAL_SCALE), Image.LANCZOS
)

import os
os.makedirs(OUT_DIR, exist_ok=True)
final.save(os.path.join(OUT_DIR, "hero-stone.png"))
final.save(os.path.join(OUT_DIR, "hero-stone.webp"), quality=90, method=6)
print("saved", final.size)
