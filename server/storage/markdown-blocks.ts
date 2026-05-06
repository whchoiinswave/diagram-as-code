import { createHash } from 'node:crypto';

export type MarkdownBlockTarget = {
  blockIndex: number;
  dialect: string;
  sourceHash?: string;
};

export type MarkdownBlock = {
  blockIndex: number;
  dialect: string;
  source: string;
  startLine: number;
  endLine: number;
  sourceHash: string;
};

const fencePattern = /^```([A-Za-z0-9_-]+)[^\n]*$/;

export function hashSource(source: string): string {
  return `sha256:${createHash('sha256').update(source).digest('hex')}`;
}

export function findMarkdownBlocks(markdown: string, dialects = new Set(['mermaid'])): MarkdownBlock[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const open = lines[lineIndex].match(fencePattern);

    if (!open || !dialects.has(open[1].toLowerCase())) {
      continue;
    }

    const dialect = open[1].toLowerCase();
    const startLine = lineIndex;
    const content: string[] = [];
    lineIndex += 1;

    while (lineIndex < lines.length && !lines[lineIndex].startsWith('```')) {
      content.push(lines[lineIndex]);
      lineIndex += 1;
    }

    const source = content.join('\n');

    blocks.push({
      blockIndex: index,
      dialect,
      source,
      startLine,
      endLine: lineIndex,
      sourceHash: hashSource(source),
    });
    index += 1;
  }

  return blocks;
}

export function readMarkdownBlock(markdown: string, target: MarkdownBlockTarget): MarkdownBlock {
  const block = findMarkdownBlocks(markdown, new Set([target.dialect.toLowerCase()])).find(
    (item) => item.blockIndex === target.blockIndex,
  );

  if (!block) {
    throw new Error(`Markdown block not found: ${target.blockIndex}`);
  }

  return block;
}

export function replaceMarkdownBlock(
  markdown: string,
  target: MarkdownBlockTarget,
  nextSource: string,
): string {
  const block = readMarkdownBlock(markdown, target);

  if (target.sourceHash && target.sourceHash !== 'unknown' && target.sourceHash !== block.sourceHash) {
    throw new Error('Markdown block is stale');
  }

  const lines = markdown.split(/\r?\n/);
  const nextLines = [
    ...lines.slice(0, block.startLine + 1),
    ...nextSource.split(/\r?\n/),
    ...lines.slice(block.endLine),
  ];

  return nextLines.join('\n');
}
