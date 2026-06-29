import { parseJsxSemanticTree } from '../dist/index.js';

const source = Array.from({ length: 50 }, (_, index) => `<li key="${index}">Item ${index}</li>`).join('\n');
const start = performance.now();
const tree = parseJsxSemanticTree(`export const list = <ul>${source}</ul>;`);
const durationMs = performance.now() - start;
console.log(JSON.stringify({ package: '@shapeshift-labs/frontier-lang-jsx', records: tree.records.length, durationMs: Number(durationMs.toFixed(3)) }));
