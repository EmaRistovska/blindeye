import { pointCloudDistance, CANONICAL_CLOUDS, resamplePoints } from './test_pointcloud.mjs';

function debugLetter(name, rawPts) {
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
  for (const [letter, cloud] of Object.entries(CANONICAL_CLOUDS)) {
    const val = pointCloudDistance(sample, cloud);
    scores[letter] = val.toFixed(4);
    if (val < lowest) {
      lowest = val;
      best = letter;
    }
  }
  console.log(`[${name}] -> Winner: ${best} (${lowest.toFixed(4)}) | scores:`, scores);
}

// Multi-stroke P:
const pMulti = [
  {x:50,y:50},{x:50,y:120},{x:50,y:200},
  {x:50,y:50},{x:150,y:50},{x:180,y:90},{x:150,y:120},{x:50,y:120}
];
debugLetter('pMulti', pMulti);

// Multi-stroke M:
const mMulti = [
  {x:50,y:200},{x:50,y:50},
  {x:50,y:50},{x:150,y:150},{x:250,y:50},
  {x:250,y:50},{x:250,y:200}
];
debugLetter('mMulti', mMulti);

// Multi-stroke N:
const nMulti = [
  {x:50,y:50},{x:50,y:200},
  {x:50,y:50},{x:180,y:200},
  {x:180,y:200},{x:180,y:50}
];
debugLetter('nMulti', nMulti);

// Reverse C:
const cClockwise = [{x:180,y:180},{x:100,y:200},{x:50,y:150},{x:50,y:100},{x:100,y:30},{x:180,y:50}];
debugLetter('cClockwise', cClockwise);

// Bottom-up S:
const sBottomUp = [{x:50,y:180},{x:100,y:200},{x:180,y:160},{x:120,y:120},{x:50,y:70},{x:100,y:30},{x:180,y:50}];
debugLetter('sBottomUp', sBottomUp);
