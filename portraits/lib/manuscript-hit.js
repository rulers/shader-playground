// Map CSS object-fit: contain coordinates through the inverse paper projection.
export function isOnManuscript(
  clientX,
  clientY,
  bounds,
  width,
  height,
  matrix,
) {
  const scale = Math.min(bounds.width / width, bounds.height / height);
  if (!Number.isFinite(scale) || scale <= 0) return false;
  const x =
    (clientX - bounds.left - (bounds.width - width * scale) / 2) / scale;
  const y =
    (clientY - bounds.top - (bounds.height - height * scale) / 2) / scale;
  const [a, b, c, d, e, f] = matrix;
  const determinant = a * d - b * c;
  if (Math.abs(determinant) < 1e-8) return false;
  const paperX = (d * (x - e) - c * (y - f)) / determinant;
  const paperY = (-b * (x - e) + a * (y - f)) / determinant;
  return paperX >= 0 && paperY >= 0 && paperX <= width && paperY <= height;
}
