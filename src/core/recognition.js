import { state } from './state.js';

export function resamplePoints(pts, n = 20) {
  if (!pts || pts.length === 0) return [];
  if (pts.length === 1) return Array(n).fill({ x: pts[0].x, y: pts[0].y });

  let totalLength = 0;
  const dists = [0];
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    const d = Math.sqrt(dx * dx + dy * dy);
    totalLength += d;
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
  if (!ptsA || !ptsB || ptsA.length === 0 || ptsB.length === 0) return Infinity;
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

export function compareStrokeToProfile(normPts, ar, profile) {
  if (!profile || !profile.resampledPts) return Infinity;
  const sample = resamplePoints(normPts, 36);
  const cloudDist = pointCloudDistance(sample, profile.resampledPts);
  const arDiff = Math.abs(ar - (profile.ar || 1));
  return cloudDist + 0.15 * arDiff;
}

export const CANONICAL_CLOUDS = {
  'M': [
    // Standard uppercase M
    resamplePoints([
      { x: 0.05, y: 0.95 }, { x: 0.1, y: 0.5 }, { x: 0.15, y: 0.05 },
      { x: 0.32, y: 0.4 }, { x: 0.5, y: 0.75 }, { x: 0.68, y: 0.4 },
      { x: 0.85, y: 0.05 }, { x: 0.9, y: 0.5 }, { x: 0.95, y: 0.95 }
    ], 36),
    // Lowercase / curved 2-arch m
    resamplePoints([
      { x: 0.05, y: 0.95 }, { x: 0.05, y: 0.4 }, { x: 0.25, y: 0.05 },
      { x: 0.5, y: 0.65 }, { x: 0.75, y: 0.05 }, { x: 0.95, y: 0.4 },
      { x: 0.95, y: 0.95 }
    ], 36)
  ],
  'P': [
    // Uppercase P
    resamplePoints([
      { x: 0.15, y: 0.95 }, { x: 0.15, y: 0.5 }, { x: 0.15, y: 0.05 },
      { x: 0.5, y: 0.05 }, { x: 0.85, y: 0.12 }, { x: 0.92, y: 0.28 },
      { x: 0.85, y: 0.45 }, { x: 0.5, y: 0.5 }, { x: 0.15, y: 0.5 }
    ], 36),
    // Lowercase p with descender
    resamplePoints([
      { x: 0.15, y: 0.05 }, { x: 0.15, y: 0.95 }, { x: 0.15, y: 0.35 },
      { x: 0.55, y: 0.35 }, { x: 0.9, y: 0.5 }, { x: 0.55, y: 0.68 },
      { x: 0.15, y: 0.68 }
    ], 36)
  ],
  'C': [
    // Counter-clockwise & clockwise C
    resamplePoints([
      { x: 0.9, y: 0.15 }, { x: 0.6, y: 0.03 }, { x: 0.2, y: 0.15 },
      { x: 0.05, y: 0.4 }, { x: 0.05, y: 0.6 }, { x: 0.2, y: 0.85 },
      { x: 0.6, y: 0.97 }, { x: 0.9, y: 0.85 }
    ], 36)
  ],
  'N': [
    // Standard uppercase N
    resamplePoints([
      { x: 0.1, y: 0.95 }, { x: 0.1, y: 0.5 }, { x: 0.1, y: 0.05 },
      { x: 0.5, y: 0.5 }, { x: 0.9, y: 0.95 }, { x: 0.9, y: 0.5 }, { x: 0.9, y: 0.05 }
    ], 36),
    // Lowercase / curved 1-arch n
    resamplePoints([
      { x: 0.05, y: 0.95 }, { x: 0.05, y: 0.25 }, { x: 0.5, y: 0.05 },
      { x: 0.95, y: 0.25 }, { x: 0.95, y: 0.95 }
    ], 36)
  ],
  'S': [
    // Standard S curve
    resamplePoints([
      { x: 0.85, y: 0.12 }, { x: 0.5, y: 0.03 }, { x: 0.12, y: 0.22 },
      { x: 0.5, y: 0.5 }, { x: 0.88, y: 0.75 }, { x: 0.5, y: 0.97 }, { x: 0.15, y: 0.88 }
    ], 36)
  ]
};

export function recognizeMainMenuLetter(pts) {
  if (!pts || pts.length < 4) return null;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  pts.forEach(p => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });

  const w = maxX - minX;
  const h = maxY - minY;
  if (w < 10 && h < 10) return null; // Ignore tiny noise taps

  const ar = h / (w || 1);

  const normPts = pts.map(p => ({
    x: (p.x - minX) / (w || 1),
    y: (p.y - minY) / (h || 1)
  }));

  const sample = resamplePoints(normPts, 36);

  // 1. Check user-calibrated profiles in state.db if available
  if (state.db && state.db.letterProfiles && Object.keys(state.db.letterProfiles).length > 0) {
    let bestCalib = null;
    let minCalibDist = Infinity;
    for (const [letter, profile] of Object.entries(state.db.letterProfiles)) {
      if (!profile || !profile.resampledPts) continue;
      const d = compareStrokeToProfile(normPts, ar, profile);
      if (d < minCalibDist) {
        minCalibDist = d;
        bestCalib = letter;
      }
    }
    if (bestCalib && minCalibDist < 0.12) {
      return bestCalib;
    }
  }

  // 2. Score against all canonical cloud representations
  const scores = {};
  let bestLetter = null;
  let lowestDist = Infinity;

  for (const [letter, cloudOrList] of Object.entries(CANONICAL_CLOUDS)) {
    const list = Array.isArray(cloudOrList) ? cloudOrList : [cloudOrList];
    let minLetterDist = Infinity;
    for (const cloud of list) {
      const d = pointCloudDistance(sample, cloud);
      if (d < minLetterDist) minLetterDist = d;
    }
    scores[letter] = minLetterDist;
    if (minLetterDist < lowestDist) {
      lowestDist = minLetterDist;
      bestLetter = letter;
    }
  }

  // 3. Structural feature verification to handle close ambiguities
  const midLeft = sample.filter(p => p.x < 0.35 && p.y > 0.35 && p.y < 0.65);
  const midRight = sample.filter(p => p.x > 0.65 && p.y > 0.35 && p.y < 0.65);
  const bottomLeft = sample.filter(p => p.x < 0.4 && p.y > 0.65);
  const bottomRight = sample.filter(p => p.x > 0.55 && p.y > 0.65);

  // C: Clear open right aperture
  if (midRight.length === 0 && midLeft.length > 0 && scores['C'] < 0.12) {
    return 'C';
  }

  // P: Loop in upper portion, only stem in bottom right quadrant
  if (bottomLeft.length > 0 && bottomRight.length === 0 && scores['P'] < 0.14) {
    return 'P';
  }

  // S: Inflection with right curve
  if (scores['S'] < 0.13 && midRight.length > 0 && scores['S'] <= scores['C']) {
    return 'S';
  }

  // M vs N: M has a central downward dip/valley in the middle horizontal band (x in [0.35, 0.65])
  const midValleyPts = sample.filter(p => p.x >= 0.35 && p.x <= 0.65 && p.y > 0.45);
  if (scores['M'] < scores['N'] && midValleyPts.length > 0) {
    return 'M';
  }
  if (scores['N'] < scores['M']) {
    return 'N';
  }

  return bestLetter;
}

const CANONICAL_DIGITS = {
  '0': {
    ar: 1.2,
    resampledPts: resamplePoints([
      { x: 0.5, y: 0.05 },
      { x: 0.15, y: 0.25 },
      { x: 0.1, y: 0.5 },
      { x: 0.15, y: 0.8 },
      { x: 0.5, y: 0.95 },
      { x: 0.85, y: 0.8 },
      { x: 0.9, y: 0.5 },
      { x: 0.85, y: 0.25 },
      { x: 0.5, y: 0.05 }
    ], 24)
  },
  '1': {
    ar: 2.2,
    resampledPts: resamplePoints([
      { x: 0.5, y: 0.05 },
      { x: 0.5, y: 0.5 },
      { x: 0.5, y: 0.95 }
    ], 24)
  },
  '2': {
    ar: 1.3,
    resampledPts: resamplePoints([
      { x: 0.15, y: 0.25 },
      { x: 0.5, y: 0.05 },
      { x: 0.85, y: 0.25 },
      { x: 0.45, y: 0.65 },
      { x: 0.15, y: 0.95 },
      { x: 0.85, y: 0.95 }
    ], 24)
  },
  '3': {
    ar: 1.3,
    resampledPts: resamplePoints([
      { x: 0.15, y: 0.15 },
      { x: 0.5, y: 0.05 },
      { x: 0.85, y: 0.25 },
      { x: 0.4, y: 0.5 },
      { x: 0.85, y: 0.75 },
      { x: 0.5, y: 0.95 },
      { x: 0.15, y: 0.85 }
    ], 24)
  },
  '4': {
    ar: 1.2,
    resampledPts: resamplePoints([
      { x: 0.75, y: 0.05 },
      { x: 0.15, y: 0.65 },
      { x: 0.9, y: 0.65 },
      { x: 0.75, y: 0.65 },
      { x: 0.75, y: 0.95 }
    ], 24)
  },
  '5': {
    ar: 1.3,
    resampledPts: resamplePoints([
      { x: 0.85, y: 0.05 },
      { x: 0.2, y: 0.05 },
      { x: 0.15, y: 0.45 },
      { x: 0.8, y: 0.55 },
      { x: 0.8, y: 0.85 },
      { x: 0.2, y: 0.95 }
    ], 24)
  },
  '6': {
    ar: 1.3,
    resampledPts: resamplePoints([
      { x: 0.75, y: 0.05 },
      { x: 0.2, y: 0.5 },
      { x: 0.2, y: 0.85 },
      { x: 0.5, y: 0.95 },
      { x: 0.85, y: 0.75 },
      { x: 0.5, y: 0.55 },
      { x: 0.2, y: 0.7 }
    ], 24)
  },
  '7': {
    ar: 1.3,
    resampledPts: resamplePoints([
      { x: 0.1, y: 0.05 },
      { x: 0.9, y: 0.05 },
      { x: 0.4, y: 0.95 }
    ], 24)
  },
  '8': {
    ar: 1.4,
    resampledPts: resamplePoints([
      { x: 0.5, y: 0.05 },
      { x: 0.15, y: 0.25 },
      { x: 0.85, y: 0.75 },
      { x: 0.5, y: 0.95 },
      { x: 0.15, y: 0.75 },
      { x: 0.85, y: 0.25 },
      { x: 0.5, y: 0.05 }
    ], 24)
  },
  '9': {
    ar: 1.3,
    resampledPts: resamplePoints([
      { x: 0.8, y: 0.45 },
      { x: 0.5, y: 0.05 },
      { x: 0.2, y: 0.25 },
      { x: 0.5, y: 0.45 },
      { x: 0.8, y: 0.45 },
      { x: 0.8, y: 0.95 }
    ], 24)
  }
};

export function recognizeDigit(pts) {
  if (!pts || pts.length < 3) return null;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  pts.forEach(p => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });

  const w = maxX - minX;
  const h = maxY - minY;
  if (w < 10 && h < 10) return null; // Ignore tiny taps

  const ar = h / (w || 1);
  const startP = pts[0];
  const endP = pts[pts.length - 1];
  const diag = Math.hypot(w, h) || 1;
  const endDist = Math.hypot(endP.x - startP.x, endP.y - startP.y);
  const isClosed = endDist < Math.max(22, diag * 0.32);

  // Geometric Rule 1: Single vertical line is unequivocally '1'
  if (ar > 1.8 && !isClosed) {
    return '1';
  }

  // Geometric Rule 2: Top horizontal bar moving right, then descending down is '7'
  const firstQuarter = pts.slice(0, Math.max(2, Math.floor(pts.length / 4)));
  const topDx = firstQuarter[firstQuarter.length - 1].x - firstQuarter[0].x;
  if (topDx > w * 0.35 && startP.y < minY + h * 0.35 && endP.y > minY + h * 0.65 && !isClosed) {
    if (endP.x < maxX - w * 0.15) {
      return '7';
    }
  }

  // Geometric Rule 3: Closed loop spanning whole height is '0' or '8'
  if (isClosed && ar < 1.7) {
    const midY = minY + h * 0.5;
    let midCrossings = 0;
    for (let i = 1; i < pts.length; i++) {
      if ((pts[i - 1].y < midY && pts[i].y >= midY) || (pts[i - 1].y > midY && pts[i].y <= midY)) {
        midCrossings++;
      }
    }
    if (midCrossings >= 3) return '8';
    return '0';
  }

  // Template Matching: compare with 24-point canonical digit models
  const normPts = pts.map(p => ({
    x: (p.x - minX) / (w || 1),
    y: (p.y - minY) / (h || 1)
  }));

  const sample = resamplePoints(normPts, 24);
  let bestDigit = null;
  let bestScore = Infinity;

  for (const [digit, profile] of Object.entries(CANONICAL_DIGITS)) {
    let distSum = 0;
    for (let i = 0; i < 24; i++) {
      const dx = sample[i].x - profile.resampledPts[i].x;
      const dy = sample[i].y - profile.resampledPts[i].y;
      distSum += Math.sqrt(dx * dx + dy * dy);
    }
    const avgDist = distSum / 24;
    const arDiff = Math.abs(ar - profile.ar);
    const score = avgDist + 0.25 * arDiff;

    if (score < bestScore) {
      bestScore = score;
      bestDigit = digit;
    }
  }

  return bestDigit || '1';
}

