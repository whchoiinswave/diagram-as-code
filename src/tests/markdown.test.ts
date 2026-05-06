import { describe, expect, it } from 'vitest';
import { extractFirstDiagramBlock, toMarkdownFence } from '../diagram/markdown';

describe('markdown diagram helpers', () => {
  it('extracts first mermaid fenced block', () => {
    const block = extractFirstDiagramBlock(`# Example

\`\`\`ts
const a = 1
\`\`\`

\`\`\`mermaid
flowchart LR
  A --> B
\`\`\`
`);

    expect(block).toEqual({
      dialect: 'mermaid',
      source: 'flowchart LR\n  A --> B',
    });
  });

  it('wraps source as a mermaid fence', () => {
    expect(toMarkdownFence('flowchart LR\n  A --> B')).toBe(
      '```mermaid\nflowchart LR\n  A --> B\n```\n',
    );
  });
});
