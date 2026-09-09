import { pointCloudDistance, CANONICAL_CLOUDS, resamplePoints } from '../src/core/recognition.js';

function analyze(name, rawPts, expected) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  rawPts.forEach(p => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });

  const w = maxX - minX;
  const h = maxY - minY;
  const normPts = rawPts.map(p => ({
    x: (p.x - minX) / (w || 1),
    y: (p.y - minY) / (h || 1)
  }));

  const sample = resamplePoints(normPts, 36);
  const scores = {};
  let best = null, lowest = Infinity;
  for (const [letter, cloudOrList] of Object.entries(CANONICAL_CLOUDS)) {
    const list = Array.isArray(cloudOrList) ? cloudOrList : [cloudOrList];
    let minD = Infinity;
    for (const cloud of list) {
      const d = pointCloudDistance(sample, cloud);
      if (d < minD) minD = d;
    }
    scores[letter] = minD.toFixed(4);
    if (minD < lowest) {
      lowest = minD;
      best = letter;
    }
  }
  const match = best === expected;
  console.log(`[${match ? 'PASS' : 'FAIL'}] ${name} -> Winner: ${best} (Exp: ${expected}) | scores:`, scores);
}

const testCases = [
  { name: 'M1: Standard uppercase', pts: [{x:40,y:190},{x:65,y:45},{x:140,y:145},{x:215,y:45},{x:240,y:190}], expected: 'M' },
  { name: 'M2: Multi-stroke 3 parts', pts: [{x:50,y:200},{x:50,y:50},{x:50,y:50},{x:150,y:150},{x:250,y:50},{x:250,y:50},{x:250,y:200}], expected: 'M' },
  { name: 'M3: Curved lowercase m', pts: [{x:40,y:180},{x:50,y:100},{x:80,y:70},{x:120,y:180},{x:150,y:70},{x:190,y:100},{x:200,y:180}], expected: 'M' },
  { name: 'M4: Fast zigzag M', pts: [{x:30,y:170},{x:70,y:30},{x:110,y:130},{x:160,y:40},{x:190,y:180}], expected: 'M' },
  { name: 'P1: Bottom-up single stroke', pts: [{x:50,y:200},{x:50,y:50},{x:150,y:50},{x:185,y:95},{x:150,y:135},{x:50,y:135}], expected: 'P' },
  { name: 'P2: Top-down retrace stem + loop', pts: [{x:60,y:40},{x:60,y:200},{x:60,y:40},{x:160,y:40},{x:190,y:85},{x:160,y:120},{x:60,y:120}], expected: 'P' },
  { name: 'P3: Multi-stroke stem + loop', pts: [{x:50,y:50},{x:50,y:120},{x:50,y:200},{x:50,y:50},{x:150,y:50},{x:180,y:90},{x:150,y:120},{x:50,y:120}], expected: 'P' },
  { name: 'P4: Lowercase p with descender', pts: [{x:60,y:80},{x:60,y:240},{x:60,y:100},{x:160,y:90},{x:180,y:140},{x:150,y:170},{x:60,y:170}], expected: 'P' },
  { name: 'C1: Counter-clockwise C', pts: [{x:190,y:50},{x:110,y:30},{x:45,y:100},{x:45,y:150},{x:110,y:205},{x:190,y:185}], expected: 'C' },
  { name: 'C2: Clockwise bottom to top', pts: [{x:190,y:185},{x:110,y:205},{x:45,y:150},{x:45,y:100},{x:110,y:30},{x:190,y:50}], expected: 'C' },
  { name: 'C3: Wide shallow C', pts: [{x:220,y:70},{x:140,y:40},{x:60,y:100},{x:60,y:160},{x:140,y:220},{x:220,y:190}], expected: 'C' },
  { name: 'N1: Single-stroke up-diag-up', pts: [{x:50,y:200},{x:50,y:50},{x:190,y:200},{x:190,y:50}], expected: 'N' },
  { name: 'N2: Multi-stroke stem + diag + stem', pts: [{x:50,y:50},{x:50,y:200},{x:50,y:50},{x:180,y:200},{x:180,y:200},{x:180,y:50}], expected: 'N' },
  { name: 'N3: Continuous top-left start N', pts: [{x:50,y:50},{x:50,y:200},{x:50,y:50},{x:180,y:200},{x:180,y:50}], expected: 'N' },
  { name: 'N4: Lowercase n single arch', pts: [{x:50,y:190},{x:50,y:90},{x:100,y:60},{x:160,y:90},{x:160,y:190}], expected: 'N' },
  { name: 'S1: Standard top-down', pts: [{x:180,y:50},{x:100,y:30},{x:45,y:70},{x:115,y:120},{x:185,y:160},{x:105,y:205},{x:45,y:185}], expected: 'S' },
  { name: 'S2: Bottom-up reverse', pts: [{x:45,y:185},{x:105,y:205},{x:185,y:160},{x:115,y:120},{x:45,y:70},{x:100,y:30},{x:180,y:50}], expected: 'S' },
  { name: 'S3: Angular zigzag S', pts: [{x:170,y:40},{x:60,y:40},{x:60,y:110},{x:170,y:130},{x:170,y:200},{x:60,y:200}], expected: 'S' },
  { name: 'S4: Fluid soft S', pts: [{x:160,y:60},{x:100,y:40},{x:60,y:80},{x:110,y:130},{x:160,y:170},{x:110,y:210},{x:50,y:190}], expected: 'S' }
];

for (const tc of testCases) {
  analyze(tc.name, tc.pts, tc.expected);
}
