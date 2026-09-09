import fs from 'fs';

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

export const LETTER_TEMPLATES = {
  'M': [
    // Standard up-down-up-down
    resamplePoints([{x:0.05,y:0.95},{x:0.15,y:0.05},{x:0.5,y:0.7},{x:0.85,y:0.05},{x:0.95,y:0.95}]),
    // Soft curved M
    resamplePoints([{x:0.1,y:0.9},{x:0.2,y:0.1},{x:0.5,y:0.6},{x:0.8,y:0.1},{x:0.9,y:0.9}]),
    // Top-down M
    resamplePoints([{x:0.1,y:0.1},{x:0.1,y:0.9},{x:0.1,y:0.1},{x:0.5,y:0.7},{x:0.9,y:0.1},{x:0.9,y:0.9}]),
    // Lowercase m style
    resamplePoints([{x:0.05,y:0.95},{x:0.05,y:0.3},{x:0.3,y:0.05},{x:0.5,y:0.6},{x:0.75,y:0.05},{x:0.95,y:0.95}]),
    // Fast unistroke M
    resamplePoints([{x:0.1,y:0.85},{x:0.2,y:0.15},{x:0.5,y:0.55},{x:0.8,y:0.15},{x:0.9,y:0.85}])
  ],
  'P': [
    // Bottom up with top loop
    resamplePoints([{x:0.15,y:0.95},{x:0.15,y:0.05},{x:0.75,y:0.05},{x:0.95,y:0.25},{x:0.75,y:0.5},{x:0.15,y:0.5}]),
    // Top down retrace with top loop
    resamplePoints([{x:0.15,y:0.05},{x:0.15,y:0.95},{x:0.15,y:0.05},{x:0.75,y:0.05},{x:0.95,y:0.25},{x:0.75,y:0.5},{x:0.15,y:0.5}]),
    // Clockwise P starting from loop
    resamplePoints([{x:0.15,y:0.5},{x:0.75,y:0.5},{x:0.95,y:0.25},{x:0.75,y:0.05},{x:0.15,y:0.05},{x:0.15,y:0.95}]),
    // Lowercase p
    resamplePoints([{x:0.2,y:0.1},{x:0.2,y:0.95},{x:0.2,y:0.3},{x:0.85,y:0.3},{x:0.9,y:0.65},{x:0.2,y:0.7}])
  ],
  'C': [
    // Standard counter-clockwise C
    resamplePoints([{x:0.9,y:0.15},{x:0.5,y:0.02},{x:0.05,y:0.35},{x:0.05,y:0.65},{x:0.5,y:0.98},{x:0.9,y:0.85}]),
    // Clockwise C (drawn bottom to top)
    resamplePoints([{x:0.9,y:0.85},{x:0.5,y:0.98},{x:0.05,y:0.65},{x:0.05,y:0.35},{x:0.5,y:0.02},{x:0.9,y:0.15}]),
    // Wide curved C
    resamplePoints([{x:0.85,y:0.2},{x:0.4,y:0.05},{x:0.1,y:0.5},{x:0.4,y:0.95},{x:0.85,y:0.8}]),
    // Angular C
    resamplePoints([{x:0.85,y:0.1},{x:0.15,y:0.1},{x:0.15,y:0.9},{x:0.85,y:0.9}])
  ],
  'N': [
    // Standard bottom-up N
    resamplePoints([{x:0.1,y:0.95},{x:0.1,y:0.05},{x:0.9,y:0.95},{x:0.9,y:0.05}]),
    // Top-down retrace N
    resamplePoints([{x:0.1,y:0.05},{x:0.1,y:0.95},{x:0.1,y:0.05},{x:0.9,y:0.95},{x:0.9,y:0.05}]),
    // Lowercase n
    resamplePoints([{x:0.1,y:0.95},{x:0.1,y:0.25},{x:0.5,y:0.05},{x:0.9,y:0.35},{x:0.9,y:0.95}]),
    // Diagonal first N (top-left to bottom-left to top-right to bottom-right)
    resamplePoints([{x:0.15,y:0.05},{x:0.15,y:0.95},{x:0.85,y:0.05},{x:0.85,y:0.95}]),
    // Z-stroke variant often drawn for N
    resamplePoints([{x:0.1,y:0.1},{x:0.85,y:0.1},{x:0.15,y:0.9},{x:0.9,y:0.9}])
  ],
  'S': [
    // Standard top-down S
    resamplePoints([{x:0.85,y:0.12},{x:0.5,y:0.02},{x:0.1,y:0.25},{x:0.5,y:0.5},{x:0.9,y:0.75},{x:0.5,y:0.98},{x:0.15,y:0.88}]),
    // Bottom-up S
    resamplePoints([{x:0.15,y:0.88},{x:0.5,y:0.98},{x:0.9,y:0.75},{x:0.5,y:0.5},{x:0.1,y:0.25},{x:0.5,y:0.02},{x:0.85,y:0.12}]),
    // Sharp angular S
    resamplePoints([{x:0.85,y:0.1},{x:0.15,y:0.1},{x:0.15,y:0.5},{x:0.85,y:0.5},{x:0.85,y:0.9},{x:0.15,y:0.9}]),
    // Soft fluid S
    resamplePoints([{x:0.8,y:0.15},{x:0.4,y:0.05},{x:0.15,y:0.25},{x:0.5,y:0.5},{x:0.85,y:0.75},{x:0.6,y:0.95},{x:0.2,y:0.9}])
  ]
};

// Elastic distance between resampled sample and template
function computeStrokeScore(sample, template) {
  const n = sample.length;
  let directSum = 0;
  let reverseSum = 0;
  for (let i = 0; i < n; i++) {
    const s = sample[i];
    const t = template[i];
    const r = template[n - 1 - i];
    directSum += Math.hypot(s.x - t.x, s.y - t.y);
    reverseSum += Math.hypot(s.x - r.x, s.y - r.y);
  }
  return Math.min(directSum / n, reverseSum / n);
}

// Geometric feature analysis
export function extractShapeFeatures(normPts) {
  const n = normPts.length;
  if (n < 4) return null;

  const startP = normPts[0];
  const endP = normPts[n - 1];

  let leftCount = 0;
  let rightCount = 0;
  let topCount = 0;
  let bottomCount = 0;

  // Inflections
  let yPeaks = 0;   // top peaks (local y minimum)
  let yValleys = 0; // bottom valleys (local y maximum)
  let xLeftTurn = 0;
  let xRightTurn = 0;

  for (let i = 1; i < n - 1; i++) {
    const p = normPts[i];
    if (p.x < 0.4) leftCount++;
    if (p.x > 0.6) rightCount++;
    if (p.y < 0.4) topCount++;
    if (p.y > 0.6) bottomCount++;

    const dy1 = normPts[i].y - normPts[i - 1].y;
    const dy2 = normPts[i + 1].y - normPts[i].y;
    if (dy1 < -0.01 && dy2 > 0.01) yPeaks++; // moving up then down
    if (dy1 > 0.01 && dy2 < -0.01) yValleys++; // moving down then up

    const dx1 = normPts[i].x - normPts[i - 1].x;
    const dx2 = normPts[i + 1].x - normPts[i].x;
    if (dx1 < -0.01 && dx2 > 0.01) xLeftTurn++;
    if (dx1 > 0.01 && dx2 < -0.01) xRightTurn++;
  }

  // Check loop in top half (for P)
  let topLoopClosed = false;
  const topHalfPts = normPts.filter(p => p.y < 0.65);
  if (topHalfPts.length >= 8) {
    const topStart = topHalfPts[0];
    const topEnd = topHalfPts[topHalfPts.length - 1];
    if (Math.hypot(topStart.x - topEnd.x, topStart.y - topEnd.y) < 0.45) {
      topLoopClosed = true;
    }
  }

  return {
    startP, endP, yPeaks, yValleys, xLeftTurn, xRightTurn,
    leftCount, rightCount, topCount, bottomCount, topLoopClosed
  };
}

export function recognizeLetterRobust(rawPts) {
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
  if (w < 10 && h < 10) return null;

  const ar = h / (w || 1);

  // Normalize coordinates into [0,1]x[0,1]
  const normPts = rawPts.map(p => ({
    x: (p.x - minX) / (w || 1),
    y: (p.y - minY) / (h || 1)
  }));

  const sample = resamplePoints(normPts, 32);

  // 1. Template matching with minimum distance across all variants
  const scores = {};
  for (const [letter, templates] of Object.entries(LETTER_TEMPLATES)) {
    let minScore = Infinity;
    for (const t of templates) {
      const s = computeStrokeScore(sample, t);
      if (s < minScore) minScore = s;
    }
    scores[letter] = minScore;
  }

  // Find lowest template score
  let bestLetter = null;
  let lowestScore = Infinity;
  for (const [letter, s] of Object.entries(scores)) {
    if (s < lowestScore) {
      lowestScore = s;
      bestLetter = letter;
    }
  }

  // 2. Feature analysis for verification and tie-breaking
  const feats = extractShapeFeatures(sample);

  // Strong Geometric Rules:
  // C: Monotonic open curve. Start and end both on right side (x > 0.4), middle bulge on left (x < 0.35), very few inflections
  const isClearC = (sample[0].x > 0.45 && sample[31].x > 0.45 && sample[16].x < 0.4 && feats.yPeaks <= 1 && feats.yValleys <= 1);
  if (isClearC && scores['C'] < 0.35) {
    return 'C';
  }

  // S: Double curve with middle inflection
  const isClearS = (
    (sample[0].x > 0.4 && sample[31].x < 0.6 && sample[16].x > 0.2) ||
    (sample[0].x < 0.6 && sample[31].x > 0.4 && sample[16].x > 0.2)
  ) && (feats.xLeftTurn >= 1 || feats.xRightTurn >= 1);
  if (isClearS && scores['S'] < 0.35) {
    return 'S';
  }

  // M: Multi-peak/valley signature (2 peaks or 2 valleys or classic 4-stroke shape)
  if ((feats.yPeaks >= 2 || feats.yValleys >= 2 || (sample[0].y > 0.5 && sample[31].y > 0.5 && sample[16].y > 0.3)) && scores['M'] < 0.38) {
    return 'M';
  }

  // P: Loop in top half and vertical stem in left
  if ((feats.topLoopClosed || (sample[0].y > 0.6 && sample[31].y > 0.3 && sample[31].y < 0.7)) && scores['P'] < 0.40) {
    return 'P';
  }

  // N: Diagonal stroke crossing across middle
  if (scores['N'] < 0.40) {
    return 'N';
  }

  return bestLetter;
}

// Test cases
console.log('Testing letter recognizer:');
// Simulate M
const mPts = [{x:50,y:200},{x:80,y:50},{x:150,y:150},{x:220,y:50},{x:250,y:200}];
console.log('Recognize M:', recognizeLetterRobust(mPts));

// Simulate P
const pPts = [{x:50,y:200},{x:50,y:50},{x:150,y:50},{x:180,y:100},{x:150,y:130},{x:50,y:130}];
console.log('Recognize P:', recognizeLetterRobust(pPts));

// Simulate C
const cPts = [{x:180,y:50},{x:100,y:30},{x:50,y:100},{x:50,y:150},{x:100,y:200},{x:180,y:180}];
console.log('Recognize C:', recognizeLetterRobust(cPts));

// Simulate N
const nPts = [{x:50,y:200},{x:50,y:50},{x:180,y:200},{x:180,y:50}];
console.log('Recognize N:', recognizeLetterRobust(nPts));

// Simulate S
const sPts = [{x:180,y:50},{x:100,y:30},{x:50,y:70},{x:120,y:120},{x:180,y:160},{x:100,y:200},{x:50,y:180}];
console.log('Recognize S:', recognizeLetterRobust(sPts));
