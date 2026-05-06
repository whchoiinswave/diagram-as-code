export type MarkdownDiagramBlock = {
  dialect: string;
  source: string;
};

const fencedBlockPattern = /```([A-Za-z0-9_-]+)[^\n]*\n([\s\S]*?)```/g;

export function extractFirstDiagramBlock(markdown: string): MarkdownDiagramBlock | null {
  for (const match of markdown.matchAll(fencedBlockPattern)) {
    const dialect = match[1].toLowerCase();

    if (dialect === 'mermaid') {
      return {
        dialect,
        source: match[2].trim(),
      };
    }
  }

  return null;
}

export function toMarkdownFence(source: string, dialect = 'mermaid'): string {
  return `\`\`\`${dialect}\n${source.trim()}\n\`\`\`\n`;
}
