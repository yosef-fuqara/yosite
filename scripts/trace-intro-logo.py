"""Trace the attached Y mark into SVG path data for the intro animation."""

from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

SRC = Path(
    r"C:\Users\yosef\.cursor\projects\c-Users-yosef-OneDrive-projects-yo-site"
    r"\assets\c__Users_yosef_AppData_Roaming_Cursor_User_workspaceStorage"
    r"_c214127008fa69e6788a30e37a0d3f40_images"
    r"_image-580875bd-1b02-453f-b7af-1cca7ca50f8e.jpg"
)
OUT = Path("src/data/introLogoGeometry.json")


def simplify_contour(contour: np.ndarray, epsilon_ratio: float) -> np.ndarray:
    peri = cv2.arcLength(contour, True)
    approx = cv2.approxPolyDP(contour, epsilon_ratio * peri, True)
    return approx.reshape(-1, 2).astype(np.float64)


def contour_to_path(points: np.ndarray) -> str:
    if len(points) < 3:
        return ""
    cmds = [f"M{points[0, 0]:.2f} {points[0, 1]:.2f}"]
    for x, y in points[1:]:
        cmds.append(f"L{x:.2f} {y:.2f}")
    cmds.append("Z")
    return " ".join(cmds)


def fit_circle(points: np.ndarray) -> tuple[float, float, float]:
    xs, ys = points[:, 0], points[:, 1]
    cx = float(xs.mean())
    cy = float(ys.mean())
    r = float(np.mean(np.hypot(xs - cx, ys - cy)))
    return cx, cy, r


def upper_surface_point(points: np.ndarray, target_x: float) -> dict:
    """Landing site: highest (min y) sample near the dot's x."""
    xs = points[:, 0]
    near = points[np.abs(xs - target_x) < 28]
    if len(near) == 0:
        near = points
    idx = int(np.argmin(near[:, 1]))
    px, py = near[idx]
    # local tangent from neighbors of the original contour
    all_idx = int(np.argmin(np.hypot(points[:, 0] - px, points[:, 1] - py)))
    prev_p = points[(all_idx - 3) % len(points)]
    next_p = points[(all_idx + 3) % len(points)]
    tx, ty = next_p - prev_p
    tl = max(np.hypot(tx, ty), 1e-6)
    tx, ty = tx / tl, ty / tl
    # inward-ish normal: rotate tangent and point toward centroid
    nx, ny = ty, -tx
    centroid = points.mean(axis=0)
    to_c = centroid - np.array([px, py])
    if nx * to_c[0] + ny * to_c[1] < 0:
        nx, ny = -nx, -ny
    return {
        "x": round(float(px), 2),
        "y": round(float(py), 2),
        "nx": round(float(nx), 4),
        "ny": round(float(ny), 4),
        "index": all_idx,
    }


def main() -> None:
    im = Image.open(SRC).convert("RGB")
    arr = np.array(im)
    lum = arr.mean(axis=2)
    mask = (lum < 40).astype(np.uint8) * 255

    n, labels, stats, cents = cv2.connectedComponentsWithStats(mask, connectivity=8)
    regions = []
    for i in range(1, n):
        regions.append(
            {
                "i": i,
                "area": int(stats[i, cv2.CC_STAT_AREA]),
                "cx": float(cents[i, 0]),
                "cy": float(cents[i, 1]),
            }
        )
    regions.sort(key=lambda r: r["area"], reverse=True)
    body_i, arm_i, dot_i = (r["i"] for r in regions[:3])

    def contour_of(index: int, epsilon: float) -> np.ndarray:
        layer = np.where(labels == index, 255, 0).astype(np.uint8)
        layer = cv2.morphologyEx(layer, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
        contours, _ = cv2.findContours(layer, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        contour = max(contours, key=cv2.contourArea)
        return simplify_contour(contour, epsilon)

    body = contour_of(body_i, 0.00028)
    arm = contour_of(arm_i, 0.00042)
    dot_pts = contour_of(dot_i, 0.002)
    dcx, dcy, dr = fit_circle(dot_pts)

    all_pts = np.vstack([body, arm, [[dcx - dr, dcy - dr], [dcx + dr, dcy + dr]]])
    minx, miny = all_pts.min(axis=0)
    maxx, maxy = all_pts.max(axis=0)
    pad = 36
    origin = np.array([minx - pad, miny - pad])
    width = (maxx + pad) - (minx - pad)
    height = (maxy + pad) - (miny - pad)
    size = float(max(width, height))
    # square viewBox, content centered
    ox = float(minx - pad - (size - width) / 2)
    oy = float(miny - pad - (size - height) / 2)

    body = body - [ox, oy]
    arm = arm - [ox, oy]
    dcx -= ox
    dcy -= oy

    landing = upper_surface_point(arm, dcx)

    geometry = {
        "viewBox": [0, 0, round(size, 2), round(size, 2)],
        "bodyPath": contour_to_path(body),
        "armPoints": [[round(float(x), 2), round(float(y), 2)] for x, y in arm],
        "armPath": contour_to_path(arm),
        "dot": {
            "cx": round(dcx, 2),
            "cy": round(dcy, 2),
            "r": round(dr, 2),
        },
        "landing": landing,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(geometry, indent=2), encoding="utf-8")
    print("wrote", OUT)
    print("viewBox", geometry["viewBox"])
    print("dot", geometry["dot"])
    print("landing", landing)
    print("points", len(body), len(arm))


if __name__ == "__main__":
    main()
