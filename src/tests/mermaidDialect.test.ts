import { describe, expect, it } from 'vitest';
import { mermaidDialect } from '../diagram/dialects/mermaid/mermaidDialect';

describe('mermaidDialect', () => {
  it('detects common Mermaid diagram declarations', () => {
    expect(mermaidDialect.detect('flowchart LR\n  A --> B')).toBe(true);
    expect(mermaidDialect.detect('sequenceDiagram\n  A->>B: hello')).toBe(true);
  });

  it('does not detect unrelated source', () => {
    expect(mermaidDialect.detect('const diagram = true')).toBe(false);
  });

  it('returns an info diagnostic for empty source', async () => {
    await expect(mermaidDialect.render('   ')).resolves.toEqual({
      ok: false,
      diagnostics: [{ severity: 'info', message: 'Source is empty.' }],
    });
  });
});
