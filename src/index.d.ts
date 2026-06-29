export interface SourceSpan {
  readonly startOffset?: number;
  readonly endOffset?: number;
  readonly startLine?: number;
  readonly startColumn?: number;
  readonly endLine?: number;
  readonly endColumn?: number;
}

export interface JsxProofGap {
  readonly code: string;
  readonly status: 'not-claimed';
  readonly summary: string;
  readonly failClosed: true;
  readonly semanticEquivalenceClaim: false;
  readonly runtimeEquivalenceClaim: false;
  readonly sourceSpan?: SourceSpan;
}

export interface JsxPropRecord {
  readonly kind: 'prop' | 'spread';
  readonly name: string;
  readonly valueKind?: string;
  readonly valueText?: string;
  readonly valueHash?: string;
  readonly sourceSpan?: SourceSpan;
  readonly proofGaps?: readonly JsxProofGap[];
}

export interface JsxElementRecord {
  readonly kind: 'element' | 'fragment';
  readonly tagName: string;
  readonly tagKind: string;
  readonly path: readonly string[];
  readonly ordinal: number;
  readonly identityKey: string;
  readonly keyPropValue?: string;
  readonly propRecords: readonly JsxPropRecord[];
  readonly sourceSpan?: SourceSpan;
  readonly sourceHash?: string;
  readonly propHash?: string;
  readonly proofGaps?: readonly JsxProofGap[];
}

export interface JsxSemanticTree {
  readonly kind: 'frontier.lang.jsxSemanticTree';
  readonly version: 1;
  readonly sourcePath?: string;
  readonly sourceHash: string;
  readonly treeHash: string;
  readonly records: readonly JsxElementRecord[];
  readonly proofGaps: readonly JsxProofGap[];
  readonly parser: { readonly status: 'ok' | 'failed'; readonly errors: readonly string[] };
  readonly summary: ReturnType<typeof summarizeJsxSemanticTree>;
}

export interface JsxSemanticMergeEvidence {
  readonly kind: 'frontier.lang.jsxSemanticMergeEvidence';
  readonly version: 1;
  readonly status: 'ready' | 'needs-review';
  readonly sourcePath?: string;
  readonly sourceHash: string;
  readonly treeHash: string;
  readonly records: readonly JsxElementRecord[];
  readonly proofGaps: readonly JsxProofGap[];
  readonly summary: ReturnType<typeof summarizeJsxSemanticTree>;
  readonly autoMergeClaim: false;
  readonly semanticEquivalenceClaim: false;
  readonly rendererRuntimeEquivalenceClaim: false;
}

export function parseJsxSemanticTree(sourceText: string, options?: Record<string, unknown>): JsxSemanticTree;
export function createJsxSemanticMergeEvidence(sourceText: string, options?: Record<string, unknown>): JsxSemanticMergeEvidence;
export function summarizeJsxSemanticTree(tree: Pick<JsxSemanticTree, 'records' | 'proofGaps' | 'parser'>): {
  readonly jsxElements: number;
  readonly jsxFragments: number;
  readonly jsxProps: number;
  readonly spreadProps: number;
  readonly keyedElements: number;
  readonly proofGaps: number;
  readonly parseErrors: number;
};
export function queryJsxElementRecords(tree: Pick<JsxSemanticTree, 'records'>, query?: { readonly tagName?: string; readonly identityKey?: string }): readonly JsxElementRecord[];
