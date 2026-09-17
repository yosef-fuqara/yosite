/**
 * Two-buffer height field. Expanding circular ripples with viscous decay —
 * the classic 2D water algorithm, sampled by both the hero WebGL surface
 * and the HTML glyphs so they share one liquid.
 */
export function createRippleField(cols, rows) {
  const n = cols * rows;
  let curr = new Float32Array(n);
  let prev = new Float32Array(n);

  function at(x, y) {
    return y * cols + x;
  }

  function sample(u, v) {
    const x = Math.max(0, Math.min(cols - 1.001, u * (cols - 1)));
    const y = Math.max(0, Math.min(rows - 1.001, v * (rows - 1)));
    const x0 = x | 0;
    const y0 = y | 0;
    const x1 = Math.min(cols - 1, x0 + 1);
    const y1 = Math.min(rows - 1, y0 + 1);
    const tx = x - x0;
    const ty = y - y0;
    const h00 = curr[at(x0, y0)];
    const h10 = curr[at(x1, y0)];
    const h01 = curr[at(x0, y1)];
    const h11 = curr[at(x1, y1)];
    return (
      h00 * (1 - tx) * (1 - ty) +
      h10 * tx * (1 - ty) +
      h01 * (1 - tx) * ty +
      h11 * tx * ty
    );
  }

  function stamp(u, v, strength, radius) {
    const cx = u * (cols - 1);
    const cy = v * (rows - 1);
    const r = Math.max(2.2, radius);
    const r2 = r * r;
    const x0 = Math.max(1, Math.floor(cx - r));
    const x1 = Math.min(cols - 2, Math.ceil(cx + r));
    const y0 = Math.max(1, Math.floor(cy - r));
    const y1 = Math.min(rows - 2, Math.ceil(cy + r));
    const falloff = r2 * 0.32;

    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        const dx = x - cx;
        const dy = y - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 > r2) continue;
        curr[at(x, y)] += strength * Math.exp(-d2 / falloff);
      }
    }
  }

  function step(damping) {
    const d = damping;
    for (let y = 1; y < rows - 1; y += 1) {
      const row = y * cols;
      for (let x = 1; x < cols - 1; x += 1) {
        const i = row + x;
        prev[i] =
          ((curr[i - 1] + curr[i + 1] + curr[i - cols] + curr[i + cols]) * 0.5 -
            prev[i]) *
          d;
      }
    }
    const swap = curr;
    curr = prev;
    prev = swap;
  }

  function peak() {
    let max = 0;
    for (let i = 0; i < n; i += 1) {
      const v = curr[i];
      const a = v < 0 ? -v : v;
      if (a > max) max = a;
    }
    return max;
  }

  function fillHeightTexture(data) {
    for (let i = 0; i < n; i += 1) {
      const enc = Math.max(0, Math.min(255, curr[i] * 118 + 128));
      const o = i * 4;
      data[o] = enc;
      data[o + 1] = 128;
      data[o + 2] = 128;
      data[o + 3] = 255;
    }
  }

  function fillDisplacement(data, width, height, u0, v0, u1, v1) {
    const eu = 1 / cols;
    const ev = 1 / rows;
    const denomX = Math.max(1, width - 1);
    const denomY = Math.max(1, height - 1);

    for (let y = 0; y < height; y += 1) {
      const vDown = v0 + (v1 - v0) * (y / denomY);
      const v = 1 - vDown;
      for (let x = 0; x < width; x += 1) {
        const u = u0 + (u1 - u0) * (x / denomX);
        const gx = (sample(u + eu, v) - sample(u - eu, v)) * 0.5;
        const gy = (sample(u, v + ev) - sample(u, v - ev)) * 0.5;
        const o = (y * width + x) * 4;
        data[o] = Math.max(0, Math.min(255, 128 + gx * 980));
        data[o + 1] = Math.max(0, Math.min(255, 128 - gy * 980));
        data[o + 2] = 128;
        data[o + 3] = 255;
      }
    }
  }

  return {
    cols,
    rows,
    stamp,
    step,
    sample,
    peak,
    fillHeightTexture,
    fillDisplacement,
  };
}

export function pickRippleGrid(width, height, mobile) {
  const aspect = width / Math.max(1, height);
  const cols = mobile ? 96 : 152;
  const rows = Math.max(48, Math.min(mobile ? 90 : 110, Math.round(cols / aspect)));
  return { cols, rows };
}
