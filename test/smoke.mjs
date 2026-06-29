import assert from 'node:assert/strict';
import { createJsxSemanticMergeEvidence, parseJsxSemanticTree, queryJsxElementRecords } from '../dist/index.js';

const source = `
export function View({ save }: { save: () => void }) {
  return <section id="profile"><button key="save" onClick={save}>Save</button></section>;
}
`;

const tree = parseJsxSemanticTree(source, { sourcePath: 'src/View.tsx' });
assert.equal(tree.parser.status, 'ok');
assert.equal(tree.summary.jsxElements, 2);
assert.equal(queryJsxElementRecords(tree, { tagName: 'button' })[0].identityKey, 'key:save');

const evidence = createJsxSemanticMergeEvidence(source, { sourcePath: 'src/View.tsx' });
assert.equal(evidence.kind, 'frontier.lang.jsxSemanticMergeEvidence');
assert.equal(evidence.status, 'needs-review');
assert.ok(evidence.proofGaps.some((gap) => gap.code === 'jsx-event-handler-runtime-boundary'));
assert.ok(evidence.proofGaps.some((gap) => gap.code === 'jsx-dynamic-child-expression') === false);
