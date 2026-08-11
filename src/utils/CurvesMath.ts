/**
 * CurvesMath.ts
 *
 * Spline interpolation and LUT generation for the Curves adjustment.
 *
 * Design
 * ------
 * Control points are sorted by input (x) value and interpolated with a
 * monotone Hermite cubic spline (Fritsch–Carlson method).  Monotone splines
 * guarantee that the output value never exceeds the range defined by the
 * surrounding control points, which prevents the colour-value overshoot that
 * plain natural cubic splines exhibit near steep transitions.
 *
 * Channel-processing order (Photoshop-compatible)
 * -----------------------------------------------
 * For each pixel component (R, G, B independently):
 *   1. Apply the component-specific curve LUT  (red / green / blue channel).
 *   2. Apply the composite RGB curve LUT.
 * This matches Photoshop's documented behaviour: individual channel curves
 * reshape the tonal response of a single channel; the composite RGB curve
 * then applies a further global tonal adjustment.
 */

export type ControlPoint = { x: number; y: number };

/** Sort control points by x and clamp both axes to [0, 255]. */
export function normalizePoints(points: ControlPoint[]): ControlPoint[] {
  return points
    .map((p) => ({ x: clamp255(p.x), y: clamp255(p.y) }))
    .sort((a, b) => a.x - b.x);
}

function clamp255(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

/**
 * Monotone Hermite cubic spline through the supplied control points.
 * Returns a 256-entry Uint8ClampedArray lookup table.
 *
 * With only one control point the function returns a constant table.
 * With no control points it returns the identity table.
 */
export function buildLUT(rawPoints: ControlPoint[]): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256);
  const pts = normalizePoints(rawPoints);

  if (pts.length === 0) {
    for (let i = 0; i < 256; i++) lut[i] = i;
    return lut;
  }

  if (pts.length === 1) {
    const y = pts[0].y;
    lut.fill(y);
    return lut;
  }

  // Compute tangents using Fritsch–Carlson monotone cubic algorithm.
  const n = pts.length;
  const dx = new Float64Array(n - 1);
  const dy = new Float64Array(n - 1);
  const m = new Float64Array(n); // tangents

  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1].x - pts[i].x;
    dy[i] = pts[i + 1].y - pts[i].y;
  }

  // Secant slopes
  const secant = new Float64Array(n - 1);
  for (let i = 0; i < n - 1; i++) {
    secant[i] = dx[i] === 0 ? 0 : dy[i] / dx[i];
  }

  // Initial tangents: average of adjacent secants (Catmull–Rom-style)
  m[0] = secant[0];
  for (let i = 1; i < n - 1; i++) {
    m[i] = (secant[i - 1] + secant[i]) / 2;
  }
  m[n - 1] = secant[n - 2];

  // Fritsch–Carlson monotonicity constraint
  for (let i = 0; i < n - 1; i++) {
    if (secant[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
    } else {
      const alpha = m[i] / secant[i];
      const beta = m[i + 1] / secant[i];
      const r = alpha * alpha + beta * beta;
      if (r > 9) {
        const scale = 3 / Math.sqrt(r);
        m[i] = scale * alpha * secant[i];
        m[i + 1] = scale * beta * secant[i];
      }
    }
  }

  // Evaluate the spline at each integer input value 0–255.
  let seg = 0;
  for (let x = 0; x < 256; x++) {
    // Advance the segment index so that pts[seg].x <= x < pts[seg+1].x
    while (seg < n - 2 && x >= pts[seg + 1].x) seg++;

    if (x <= pts[0].x) {
      lut[x] = Math.max(0, Math.min(255, Math.round(pts[0].y)));
      continue;
    }
    if (x >= pts[n - 1].x) {
      lut[x] = Math.max(0, Math.min(255, Math.round(pts[n - 1].y)));
      continue;
    }

    const h = dx[seg];
    if (h === 0) {
      lut[x] = Math.max(0, Math.min(255, Math.round(pts[seg].y)));
      continue;
    }
    const t = (x - pts[seg].x) / h;
    const t2 = t * t;
    const t3 = t2 * t;

    // Hermite basis functions
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;

    const y =
      h00 * pts[seg].y +
      h10 * h * m[seg] +
      h01 * pts[seg + 1].y +
      h11 * h * m[seg + 1];

    lut[x] = Math.max(0, Math.min(255, Math.round(y)));
  }

  return lut;
}

/** Apply a single LUT to a value clamped to [0, 255]. */
export function applyLUT(lut: Uint8ClampedArray, value: number): number {
  return lut[Math.max(0, Math.min(255, value))];
}

/**
 * Apply curves to a single pixel (r, g, b) using the four channel LUTs.
 *
 * Processing order (Photoshop-compatible):
 *   R_out = rgbLUT[ redLUT[r] ]
 *   G_out = rgbLUT[ greenLUT[g] ]
 *   B_out = rgbLUT[ blueLUT[b] ]
 */
export function applyCurvesToPixel(
  r: number,
  g: number,
  b: number,
  rgbLUT: Uint8ClampedArray,
  redLUT: Uint8ClampedArray,
  greenLUT: Uint8ClampedArray,
  blueLUT: Uint8ClampedArray,
): [number, number, number] {
  return [
    rgbLUT[redLUT[r]],
    rgbLUT[greenLUT[g]],
    rgbLUT[blueLUT[b]],
  ];
}

/** Identity control points: straight diagonal from (0,0) to (255,255). */
export function identityPoints(): [ControlPoint, ControlPoint] {
  return [
    { x: 0, y: 0 },
    { x: 255, y: 255 },
  ];
}

/**
 * Returns true when the four LUTs collectively represent an identity
 * transformation (every input maps to itself).
 */
export function isIdentityCurves(
  rgbLUT: Uint8ClampedArray,
  redLUT: Uint8ClampedArray,
  greenLUT: Uint8ClampedArray,
  blueLUT: Uint8ClampedArray,
): boolean {
  for (let i = 0; i < 256; i++) {
    if (rgbLUT[i] !== i || redLUT[i] !== i || greenLUT[i] !== i || blueLUT[i] !== i) return false;
  }
  return true;
}

/**
 * Build a combined four-LUT object from the four sets of control points.
 */
export interface CurvesLUTs {
  rgb: Uint8ClampedArray;
  red: Uint8ClampedArray;
  green: Uint8ClampedArray;
  blue: Uint8ClampedArray;
}

export function buildCurvesLUTs(
  rgbPoints: ControlPoint[],
  redPoints: ControlPoint[],
  greenPoints: ControlPoint[],
  bluePoints: ControlPoint[],
): CurvesLUTs {
  return {
    rgb: buildLUT(rgbPoints),
    red: buildLUT(redPoints),
    green: buildLUT(greenPoints),
    blue: buildLUT(bluePoints),
  };
}

/**
 * Compute the luminance histogram of a pixel array.
 * Returns a 256-entry array of normalised [0, 1] frequencies.
 */
export function computeHistogram(pixels: Uint8ClampedArray): Float32Array {
  const counts = new Float32Array(256);
  const total = pixels.length / 4;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] === 0) continue;
    const luma = Math.round(0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]);
    counts[Math.max(0, Math.min(255, luma))]++;
  }
  const max = Math.max(...counts, 1);
  for (let i = 0; i < 256; i++) counts[i] = counts[i] / max;
  return counts;
}
