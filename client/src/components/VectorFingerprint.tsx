import { useEffect, useRef } from 'react';

interface VectorFingerprintProps {
  vector: number[];
  height?: number;
  className?: string;
}

// Databricks brand palette for a diverging scale:
// negative → deep ink, zero → neutral, positive → Databricks red.
const NEG: [number, number, number] = [11, 32, 38]; // #0B2026
const MID: [number, number, number] = [238, 237, 233]; // #EEEDE9
const POS: [number, number, number] = [255, 54, 33]; // #FF3621

function lerp(a: [number, number, number], b: [number, number, number], t: number): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

/**
 * Renders a high-dimensional embedding as a compact color strip — one thin
 * column per dimension, colored by that dimension's (normalized) value. It's
 * not meant to be read value-by-value; it's a visual "fingerprint" that makes
 * two different vectors look obviously different at a glance.
 */
export function VectorFingerprint({ vector, height = 72, className }: VectorFingerprintProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || vector.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.clientWidth || 512;
    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(height * dpr);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // Normalize by the largest magnitude so the full color range is used.
    const maxAbs = vector.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1;
    const colWidth = cssWidth / vector.length;

    for (let i = 0; i < vector.length; i++) {
      const norm = vector[i] / maxAbs; // roughly [-1, 1]
      // Perceptual boost: most dimensions are small relative to the max, so a
      // signed square-root spreads the mid-range into visible color instead of
      // leaving the strip nearly flat.
      const t = Math.sign(norm) * Math.sqrt(Math.abs(norm));
      const color = t >= 0 ? lerp(MID, POS, t) : lerp(MID, NEG, -t);
      ctx.fillStyle = color;
      ctx.fillRect(i * colWidth, 0, Math.ceil(colWidth) + 0.5, height);
    }
  }, [vector, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height }}
      className={className}
      aria-label={`Visualization of a ${vector.length}-dimensional embedding vector`}
    />
  );
}
