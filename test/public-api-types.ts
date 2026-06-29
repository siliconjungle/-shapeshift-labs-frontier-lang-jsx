import type { JsxElementRecord, JsxSemanticMergeEvidence, JsxSemanticTree } from '../dist/index.js';
import { createJsxSemanticMergeEvidence, parseJsxSemanticTree } from '../dist/index.js';

const tree: JsxSemanticTree = parseJsxSemanticTree('<div />');
const evidence: JsxSemanticMergeEvidence = createJsxSemanticMergeEvidence('<div />');
const first: JsxElementRecord | undefined = tree.records[0];

tree.kind satisfies 'frontier.lang.jsxSemanticTree';
evidence.kind satisfies 'frontier.lang.jsxSemanticMergeEvidence';
first?.identityKey satisfies string | undefined;
