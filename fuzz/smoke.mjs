import assert from 'node:assert/strict';
import { createJsxSemanticMergeEvidence } from '../dist/index.js';

for (const tag of ['div', 'span', 'Button']) {
  const evidence = createJsxSemanticMergeEvidence(`<${tag} key="${tag}" data-id="${tag}" />`);
  assert.equal(evidence.summary.jsxElements, 1);
  assert.equal(evidence.summary.keyedElements, 1);
}
