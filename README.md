# @shapeshift-labs/frontier-lang-jsx

Runtime-neutral JSX semantic merge evidence for Frontier Lang.

This package parses JSX/TSX source into source-bound records for elements, props, keys, children, spreads, and runtime-sensitive render boundaries. It does not claim React, Preact, Solid, or host-renderer equivalence by itself. Event handlers, refs, spreads, style objects, dynamic child expressions, and dangerous HTML remain explicit fail-closed proof gaps unless a higher-level compiler or runtime proof supplies stronger evidence.

```js
import { createJsxSemanticMergeEvidence } from '@shapeshift-labs/frontier-lang-jsx';

const evidence = createJsxSemanticMergeEvidence(
  'export function View() { return <button onClick={save}>Save</button>; }',
  { sourcePath: 'src/View.tsx' }
);

console.log(evidence.summary.jsxElements);
console.log(evidence.proofGaps.map((gap) => gap.code));
```

## Boundary

`frontier-lang-jsx` owns framework-neutral JSX source evidence. Project-level safe merge, TypeScript checker evidence, import/export rebasing, runtime browser probes, and final admission decisions stay in `@shapeshift-labs/frontier-lang-compiler` and adjacent runtime proof packages.
