import { recognizeLetter } from './test_pointcloud.mjs';

console.log('Testing Point Cloud Recognizer on Single and Multi-stroke Inputs:');

// Single-stroke M:
const m1 = [{x:50,y:200},{x:80,y:50},{x:150,y:150},{x:220,y:50},{x:250,y:200}];
console.log('Single-stroke M:', recognizeLetter(m1));

// Multi-stroke M (3 strokes: stem, chevron, stem):
const mMulti = [
  {x:50,y:200},{x:50,y:50},
  {x:50,y:50},{x:150,y:150},{x:250,y:50},
  {x:250,y:50},{x:250,y:200}
];
console.log('Multi-stroke M:', recognizeLetter(mMulti));

// Single-stroke P:
const p1 = [{x:50,y:200},{x:50,y:50},{x:150,y:50},{x:180,y:100},{x:150,y:130},{x:50,y:130}];
console.log('Single-stroke P:', recognizeLetter(p1));

// Multi-stroke P (stem down, then top loop):
const pMulti = [
  {x:50,y:50},{x:50,y:120},{x:50,y:200},
  {x:50,y:50},{x:150,y:50},{x:180,y:90},{x:150,y:120},{x:50,y:120}
];
console.log('Multi-stroke P:', recognizeLetter(pMulti));

// Single-stroke C:
const c1 = [{x:180,y:50},{x:100,y:30},{x:50,y:100},{x:50,y:150},{x:100,y:200},{x:180,y:180}];
console.log('Single-stroke C:', recognizeLetter(c1));

// Clockwise C:
const cClockwise = [{x:180,y:180},{x:100,y:200},{x:50,y:150},{x:50,y:100},{x:100,y:30},{x:180,y:50}];
console.log('Clockwise C:', recognizeLetter(cClockwise));

// Single-stroke N:
const n1 = [{x:50,y:200},{x:50,y:50},{x:180,y:200},{x:180,y:50}];
console.log('Single-stroke N:', recognizeLetter(n1));

// Multi-stroke N:
const nMulti = [
  {x:50,y:50},{x:50,y:200},
  {x:50,y:50},{x:180,y:200},
  {x:180,y:200},{x:180,y:50}
];
console.log('Multi-stroke N:', recognizeLetter(nMulti));

// Single-stroke S:
const s1 = [{x:180,y:50},{x:100,y:30},{x:50,y:70},{x:120,y:120},{x:180,y:160},{x:100,y:200},{x:50,y:180}];
console.log('Single-stroke S:', recognizeLetter(s1));

// Bottom-up S:
const sBottomUp = [{x:50,y:180},{x:100,y:200},{x:180,y:160},{x:120,y:120},{x:50,y:70},{x:100,y:30},{x:180,y:50}];
console.log('Bottom-up S:', recognizeLetter(sBottomUp));
