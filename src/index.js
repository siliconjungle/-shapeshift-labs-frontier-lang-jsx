import { parse } from '@babel/parser';
import { hashSemanticValue } from '@shapeshift-labs/frontier-lang-kernel';

export function parseJsxSemanticTree(sourceText, options = {}) {
  const sourceHash = options.sourceHash ?? hashSemanticValue({ kind: 'frontier.lang.jsx.source.v1', sourceText });
  const records = [];
  const proofGaps = [];
  let ast;
  const parserErrors = [];
  try {
    ast = parse(sourceText, parserOptions(options));
    for (const error of ast.errors ?? []) parserErrors.push(error.message);
  } catch (error) {
    const gap = proofGap('jsx-parser-error', error.message, undefined);
    return treeEnvelope(options, sourceHash, [], [gap], { status: 'failed', errors: [error.message] });
  }

  const roots = collectJsxRoots(ast);
  const rootCounts = new Map();
  for (const root of roots) pushJsxNode(root, [], rootCounts, sourceText, sourceHash, records, proofGaps);
  const parser = { status: parserErrors.length ? 'failed' : 'ok', errors: parserErrors };
  const parserGaps = parserErrors.map((message) => proofGap('jsx-parser-recovery', message, undefined));
  return treeEnvelope(options, sourceHash, records, [...proofGaps, ...parserGaps], parser);
}

export function createJsxSemanticMergeEvidence(sourceText, options = {}) {
  const tree = parseJsxSemanticTree(sourceText, options);
  return {
    kind: 'frontier.lang.jsxSemanticMergeEvidence',
    version: 1,
    status: tree.proofGaps.length ? 'needs-review' : 'ready',
    sourcePath: options.sourcePath,
    sourceHash: tree.sourceHash,
    treeHash: tree.treeHash,
    records: tree.records,
    proofGaps: tree.proofGaps,
    summary: tree.summary,
    autoMergeClaim: false,
    semanticEquivalenceClaim: false,
    rendererRuntimeEquivalenceClaim: false
  };
}

export function summarizeJsxSemanticTree(tree) {
  const records = tree.records ?? [];
  return {
    jsxElements: records.filter((record) => record.kind === 'element').length,
    jsxFragments: records.filter((record) => record.kind === 'fragment').length,
    jsxProps: records.reduce((sum, record) => sum + record.propRecords.filter((prop) => prop.kind === 'prop').length, 0),
    spreadProps: records.reduce((sum, record) => sum + record.propRecords.filter((prop) => prop.kind === 'spread').length, 0),
    keyedElements: records.filter((record) => record.keyPropValue !== undefined).length,
    proofGaps: (tree.proofGaps ?? []).length,
    parseErrors: (tree.parser?.errors ?? []).length
  };
}

export function queryJsxElementRecords(tree, query = {}) {
  return (tree.records ?? []).filter((record) => {
    if (query.tagName && record.tagName !== query.tagName) return false;
    if (query.identityKey && record.identityKey !== query.identityKey) return false;
    return true;
  });
}

function pushJsxNode(node, parentPath, siblingCounts, sourceText, sourceHash, records, proofGaps) {
  const fragment = node.type === 'JSXFragment';
  const opening = fragment ? undefined : node.openingElement;
  const tagName = fragment ? 'Fragment' : readJsxName(opening.name);
  const tagKind = fragment ? 'fragment' : opening.name.type;
  const ordinal = nextOrdinal(siblingCounts, tagName);
  const path = [...parentPath, `${tagName}[${ordinal}]`];
  const propRecords = fragment ? [] : (opening.attributes ?? []).map((attribute) => propRecord(attribute, sourceText));
  const keyProp = propRecords.find((record) => record.kind === 'prop' && record.name === 'key');
  const idProp = propRecords.find((record) => record.kind === 'prop' && record.name === 'id');
  const identityKey = keyProp?.valueText ? `key:${keyProp.valueText}` : idProp?.valueText ? `id:${idProp.valueText}` : path.join('/');
  const localGaps = [...propRecords.flatMap((record) => record.proofGaps ?? []), ...childExpressionGaps(node, sourceText)];
  const record = compactRecord({
    kind: fragment ? 'fragment' : 'element',
    tagName,
    tagKind,
    path,
    ordinal,
    identityKey,
    keyPropValue: keyProp?.valueText,
    propRecords,
    sourceSpan: sourceSpan(node),
    sourceHash,
    propHash: hashSemanticValue({ kind: 'frontier.lang.jsx.props.v1', props: propRecords.map(hashableProp) }),
    proofGaps: localGaps.length ? localGaps : undefined
  });
  records.push(record);
  proofGaps.push(...localGaps);

  const childCounts = new Map();
  for (const child of node.children ?? []) {
    if (child.type === 'JSXElement' || child.type === 'JSXFragment') {
      pushJsxNode(child, path, childCounts, sourceText, sourceHash, records, proofGaps);
    }
  }
}

function propRecord(attribute, sourceText) {
  if (attribute.type === 'JSXSpreadAttribute') {
    const gap = proofGap('jsx-spread-prop-runtime-boundary', 'Spread props require effective prop and renderer evidence.', sourceSpan(attribute));
    return { kind: 'spread', name: '...', valueKind: 'spread', valueText: sliceSource(sourceText, attribute.argument), valueHash: nodeHash(sourceText, attribute.argument), sourceSpan: sourceSpan(attribute), proofGaps: [gap] };
  }
  const name = readJsxName(attribute.name);
  const value = readPropValue(attribute.value, sourceText);
  const proofGaps = propProofGaps(name, value, attribute);
  return compactRecord({ kind: 'prop', name, ...value, sourceSpan: sourceSpan(attribute), proofGaps: proofGaps.length ? proofGaps : undefined });
}

function readPropValue(value, sourceText) {
  if (!value) return { valueKind: 'boolean', valueText: 'true', valueHash: hashSemanticValue({ kind: 'jsx.boolean', value: true }) };
  if (value.type === 'StringLiteral') return { valueKind: 'string', valueText: value.value, valueHash: hashSemanticValue({ kind: 'jsx.string', value: value.value }) };
  if (value.type === 'JSXExpressionContainer') return { valueKind: value.expression.type, valueText: sliceSource(sourceText, value.expression), valueHash: nodeHash(sourceText, value.expression) };
  if (value.type === 'JSXElement') return { valueKind: 'JSXElement', valueText: sliceSource(sourceText, value), valueHash: nodeHash(sourceText, value) };
  if (value.type === 'JSXFragment') return { valueKind: 'JSXFragment', valueText: sliceSource(sourceText, value), valueHash: nodeHash(sourceText, value) };
  return { valueKind: value.type, valueText: sliceSource(sourceText, value), valueHash: nodeHash(sourceText, value) };
}

function propProofGaps(name, value, attribute) {
  const gaps = [];
  if (/^on[A-Z]/.test(name)) gaps.push(proofGap('jsx-event-handler-runtime-boundary', `Event handler prop ${name} requires runtime behavior evidence.`, sourceSpan(attribute)));
  if (name === 'ref') gaps.push(proofGap('jsx-ref-runtime-boundary', 'Refs depend on renderer timing and host instances.', sourceSpan(attribute)));
  if (name === 'dangerouslySetInnerHTML') gaps.push(proofGap('jsx-dangerous-html-runtime-boundary', 'Dangerous HTML bypasses JSX child structure and requires runtime evidence.', sourceSpan(attribute)));
  if (name === 'style' && value.valueKind !== 'StringLiteral') gaps.push(proofGap('jsx-style-object-runtime-boundary', 'Style object merge needs effective style and cascade evidence.', sourceSpan(attribute)));
  if (value.valueKind && !['string', 'boolean'].includes(value.valueKind) && name !== 'key') gaps.push(proofGap('jsx-dynamic-prop-expression', `Dynamic prop ${name} requires use/def or runtime evidence.`, sourceSpan(attribute)));
  return gaps;
}

function childExpressionGaps(node, sourceText) {
  const gaps = [];
  for (const child of node.children ?? []) {
    if (child.type === 'JSXExpressionContainer') {
      const text = sliceSource(sourceText, child.expression).trim();
      if (text && text !== 'undefined' && text !== 'null') gaps.push(proofGap('jsx-dynamic-child-expression', 'Dynamic child expressions require render/value evidence.', sourceSpan(child)));
    }
  }
  return gaps;
}

function collectJsxRoots(ast) {
  const roots = [];
  walk(ast.program, false);
  return roots;
  function walk(node, insideJsx) {
    if (!node || typeof node.type !== 'string') return;
    const jsx = node.type === 'JSXElement' || node.type === 'JSXFragment';
    if (jsx) {
      if (!insideJsx) roots.push(node);
      return;
    }
    for (const value of Object.values(node)) {
      if (!value || typeof value !== 'object') continue;
      if (Array.isArray(value)) for (const item of value) walk(item, insideJsx || jsx);
      else walk(value, insideJsx || jsx);
    }
  }
}

function parserOptions(options) {
  return {
    sourceType: options.sourceType ?? 'module',
    sourceFilename: options.sourcePath,
    errorRecovery: true,
    plugins: options.parserPlugins ?? ['jsx', 'typescript', 'classProperties', 'importAttributes']
  };
}

function treeEnvelope(options, sourceHash, records, proofGaps, parser) {
  const tree = {
    kind: 'frontier.lang.jsxSemanticTree',
    version: 1,
    sourcePath: options.sourcePath,
    sourceHash,
    treeHash: hashSemanticValue({ kind: 'frontier.lang.jsx.tree.v1', records: records.map(hashableElement), proofGaps: proofGaps.map((gap) => gap.code) }),
    records,
    proofGaps,
    parser
  };
  return { ...tree, summary: summarizeJsxSemanticTree(tree) };
}

function readJsxName(name) {
  if (!name) return 'unknown';
  if (name.type === 'JSXIdentifier') return name.name;
  if (name.type === 'JSXNamespacedName') return `${readJsxName(name.namespace)}:${readJsxName(name.name)}`;
  if (name.type === 'JSXMemberExpression') return `${readJsxName(name.object)}.${readJsxName(name.property)}`;
  return name.type;
}

function proofGap(code, summary, span) {
  return compactRecord({ code, status: 'not-claimed', summary, failClosed: true, semanticEquivalenceClaim: false, runtimeEquivalenceClaim: false, sourceSpan: span });
}

function sourceSpan(node) {
  if (!node) return undefined;
  return compactRecord({ startOffset: node.start, endOffset: node.end, startLine: node.loc?.start?.line, startColumn: node.loc?.start ? node.loc.start.column + 1 : undefined, endLine: node.loc?.end?.line, endColumn: node.loc?.end ? node.loc.end.column + 1 : undefined });
}

function nextOrdinal(counts, key) {
  const next = (counts.get(key) ?? 0) + 1;
  counts.set(key, next);
  return next;
}

function sliceSource(sourceText, node) {
  if (!node || node.start === undefined || node.end === undefined) return undefined;
  return sourceText.slice(node.start, node.end);
}

function nodeHash(sourceText, node) {
  return hashSemanticValue({ kind: 'frontier.lang.jsx.nodeText.v1', text: sliceSource(sourceText, node) ?? '' });
}

function hashableProp(prop) {
  return { kind: prop.kind, name: prop.name, valueKind: prop.valueKind, valueText: prop.valueText, proofGaps: prop.proofGaps?.map((gap) => gap.code) };
}

function hashableElement(record) {
  return { kind: record.kind, tagName: record.tagName, path: record.path, identityKey: record.identityKey, keyPropValue: record.keyPropValue, props: record.propRecords.map(hashableProp), proofGaps: record.proofGaps?.map((gap) => gap.code) };
}

function compactRecord(record) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
}
