import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import type { DiagramTarget } from '../../src/diagram/types';
import { isDiagramFile } from '../../src/workspace/file-filters';
import { detectDialectFromPath, type DiagramFile } from '../../src/workspace/storage-provider';
import { hashSource, readMarkdownBlock, replaceMarkdownBlock } from './markdown-blocks';

export type ServerTargetReadState = {
  source: string;
  sourceHash?: string;
  stale?: boolean;
};

export type ServerTargetWriteState = {
  sourceHash?: string;
};

function assertInsideRoot(rootDir: string, targetPath: string): string {
  const root = path.resolve(rootDir);
  const resolved = path.resolve(targetPath);
  const relative = path.relative(root, resolved);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Target path escapes workspace root');
  }

  return resolved;
}

function uriToPath(rootDir: string, uri: string): string {
  if (uri.startsWith('server://')) {
    return assertInsideRoot(rootDir, path.join(rootDir, uri.slice('server://'.length)));
  }

  return assertInsideRoot(rootDir, uri);
}

export async function listWorkspaceFiles(rootDir: string): Promise<DiagramFile[]> {
  const entries = await fg(['**/*'], {
    cwd: rootDir,
    onlyFiles: true,
    dot: false,
    absolute: false,
  });

  return entries
    .filter(isDiagramFile)
    .sort((a, b) => a.localeCompare(b))
    .map((relativePath) => ({
      uri: `server://${relativePath}`,
      name: path.basename(relativePath),
      relativePath,
      dialectHint: detectDialectFromPath(relativePath),
      kind: 'file',
    }));
}

export async function readServerTarget(rootDir: string, target: DiagramTarget): Promise<string> {
  return (await readServerTargetState(rootDir, target)).source;
}

export async function readServerTargetState(
  rootDir: string,
  target: DiagramTarget,
): Promise<ServerTargetReadState> {
  const filePath = uriToPath(rootDir, target.uri);
  const content = await readFile(filePath, 'utf8');

  if (target.kind === 'markdown-block') {
    const block = readMarkdownBlock(content, {
      blockIndex: target.blockIndex,
      dialect: target.dialect,
      sourceHash: target.sourceHash,
    });

    return {
      source: block.source,
      sourceHash: block.sourceHash,
      stale: target.sourceHash !== 'unknown' && target.sourceHash !== block.sourceHash,
    };
  }

  return {
    source: content,
    stale: false,
  };
}

export async function writeServerTarget(
  rootDir: string,
  target: DiagramTarget,
  source: string,
): Promise<ServerTargetWriteState> {
  const filePath = uriToPath(rootDir, target.uri);

  if (target.kind === 'markdown-block') {
    const content = await readFile(filePath, 'utf8');
    const nextContent = replaceMarkdownBlock(
      content,
      {
        blockIndex: target.blockIndex,
        dialect: target.dialect,
        sourceHash: target.sourceHash,
      },
      source,
    );
    await writeFile(filePath, nextContent);
    return {
      sourceHash: hashSource(source),
    };
  }

  await writeFile(filePath, source);
  return {};
}
