export function resamplePoints(pts, n = 32) {
  if (!pts || pts.length === 0) return [];
  if (pts.length === 1) return Array(n).fill({ x: pts[0].x, y: pts[0].y });

  let totalLength = 0;
  const dists = [0];
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    totalLength += Math.hypot(dx, dy);
    dists.push(totalLength);
  }

  if (totalLength === 0) return Array(n).fill({ x: pts[0].x, y: pts[0].y });

  const step = totalLength / (n - 1);
  const result = [pts[0]];
  let srcIdx = 0;

  for (let i = 1; i < n - 1; i++) {
    const targetDist = i * step;
    while (srcIdx < dists.length - 1 && dists[srcIdx + 1] < targetDist) {
      srcIdx++;
    }
    const d0 = dists[srcIdx];
    const d1 = dists[srcIdx + 1] || d0;
    const t = (d1 - d0) === 0 ? 0 : (targetDist - d0) / (d1 - d0);
    const p0 = pts[srcIdx];
    const p1 = pts[srcIdx + 1] || p0;

    result.push({
      x: p0.x + t * (p1.x - p0.x),
      y: p0.y + t * (p1.y - p0.y)
    });
  }

  result.push(pts[pts.length - 1]);
  return result;
}

// Point-cloud / Chamfer distance: Order and stroke-independent distance between two 2D shapes
export function pointCloudDistance(ptsA, ptsB) {
  let distAtoB = 0;
  for (let i = 0; i < ptsA.length; i++) {
    let minDist = Infinity;
    const pa = ptsA[i];
    for (let j = 0; j < ptsB.length; j++) {
      const pb = ptsB[j];
      const d = (pa.x - pb.x) ** 2 + (pa.y - pb.y) ** 2;
      if (d < minDist) minDist = d;
    }
    distAtoB += Math.sqrt(minDist);
  }

  let distBtoA = 0;
  for (let j = 0; j < ptsB.length; j++) {
    let minDist = Infinity;
    const pb = ptsB[j];
    for (let i = 0; i < ptsA.length; i++) {
      const pa = ptsA[i];
      const d = (pa.x - pb.x) ** 2 + (pa.y - pb.y) ** 2;
      if (d < minDist) minDist = d;
    }
    distBtoA += Math.sqrt(minDist);
  }

  return (distAtoB / ptsA.length + distBtoA / ptsB.length) / 2;
}

// 32-point canonical cloud representations
export const CANONICAL_CLOUDS = {
  'M': resamplePoints([
    {x:0.05, y:0.95}, {x:0.1, y:0.5}, {x:0.15, y:0.05},
    {x:0.32, y:0.4}, {x:0.5, y:0.75}, {x:0.68, y:0.4},
    {x:0.85, y:0.05}, {x:0.9, y:0.5}, {x:0.95, y:0.95}
  ], 36),
  'P': resamplePoints([
    {x:0.15, y:0.95}, {x:0.15, y:0.5}, {x:0.15, y:0.05},
    {x:0.5, y:0.05}, {x:0.85, y:0.12}, {x:0.92, y:0.28},
    {x:0.85, y:0.45}, {x:0.5, y:0.5}, {x:0.15, y:0.5}
  ], 36),
  'C': resamplePoints([
    {x:0.9, y:0.15}, {x:0.6, y:0.03}, {x:0.2, y:0.15},
    {x:0.05, y:0.4}, {x:0.05, y:0.6}, {x:0.2, y:0.85},
    {x:0.6, y:0.97}, {x:0.9, y:0.85}
  ], 36),
  'N': resamplePoints([
    {x:0.1, y:0.95}, {x:0.1, y:0.5}, {x:0.1, y:0.05},
    {x:0.5, y:0.5}, {x:0.9, y:0.95}, {x:0.9, y:0.5}, {x:0.9, y:0.05}
  ], 36),
  'S': resamplePoints([
    {x:0.85, y:0.12}, {x:0.5, y:0.03}, {x:0.12, y:0.22},
    {x:0.5, y:0.5}, {x:0.88, y:0.75}, {x:0.5, y:0.97}, {x:0.15, y:0.88}
  ], 36)
};

export function recognizeLetter(rawPts) {
  if (!rawPts || rawPts.length < 4) return null;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  rawPts.forEach(p => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });

  const w = maxX - minX;
  const h = maxY - minY;
  if (w < 10 && h < 10) return null; // Reject tiny noise taps

  // Normalize points to [0,1]x[0,1] bounding box
  const normPts = rawPts.map(p => ({
    x: (p.x - minX) / (w || 1),
    y: (p.y - minY) / (h || 1)
  }));

  const sample = resamplePoints(normPts, 36);

  // Compute Point Cloud Distances to all canonical letters
  const scores = {};
  let bestLetter = null;
  let minScore = Infinity;

  for (const [letter, cloud] of Object.entries(CANONICAL_CLOUDS)) {
    const dist = pointCloudDistance(sample, cloud);
    scores[letter] = dist;
    if (dist < minScore) {
      minScore = dist;
      bestLetter = letter;
    }
  }

  // Structural feature refinement
  const topQuarter = sample.filter(p => p.y < 0.35);
  const bottomQuarter = sample.filter(p => p.y > 0.65);
  const midLeft = sample.filter(p => p.x < 0.35 && p.y > 0.35 && p.y < 0.65);
  const midRight = sample.filter(p => p.x > 0.65 && p.y > 0.35 && p.y < 0.65);

  // C Check: C has NO points in the middle right (x > 0.65, y in [0.35, 0.65]) and open right side
  if (midRight.length === 0 && midLeft.length > 0 && scores['C'] < 0.28) {
    return 'C';
  }

  // P Check: P has a loop in the top half (both mid-left and mid-right in top half, bottom is only left stem)
  const bottomLeft = sample.filter(p => p.x < 0.4 && p.y > 0.65);
  const bottomRight = sample.filter(p => p.x > 0.55 && p.y > 0.65);
  if (bottomLeft.length > 0 && bottomRight.length === 0 && scores['P'] < 0.28) {
    return 'P';
  }

  // S Check: S has top-left curve, center crossing, and bottom-right + bottom-left curve
  if (scores['S'] < 0.28 && (scores['S'] <= scores['C'] || midRight.length > 0)) {
    return 'S';
  }

  // M vs N Check:
  // M has presence in bottom left, bottom right, top left, top right, and dip in middle
  // N has vertical sides and diagonal
  if (scores['M'] <= scores['N'] + 0.05 && (scores['M'] < 0.3)) {
    return 'M';
  }

  return bestLetter;
}
