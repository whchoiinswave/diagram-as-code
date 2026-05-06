import { z } from 'zod';
import type { DiagramTarget, LaunchContext } from '../../diagram/types';

const fileTargetSchema = z.object({
  kind: z.literal('file'),
  uri: z.string().min(1),
  dialect: z.enum(['mermaid', 'd2', 'plantuml', 'graphviz', 'structurizr']),
});

const markdownBlockTargetSchema = z.object({
  kind: z.literal('markdown-block'),
  uri: z.string().min(1),
  dialect: z.enum(['mermaid', 'd2', 'plantuml', 'graphviz', 'structurizr']),
  blockIndex: z.coerce.number().int().nonnegative(),
  startLine: z.coerce.number().int().nonnegative(),
  endLine: z.coerce.number().int().nonnegative(),
  sourceHash: z.string().min(1),
});

export const diagramTargetSchema = z.discriminatedUnion('kind', [
  fileTargetSchema,
  markdownBlockTargetSchema,
]);

export const launchContextSchema = z.object({
  mode: z.enum(['embedded', 'workspace', 'collaboration']),
  workspaceId: z.string().optional(),
  rootUri: z.string().optional(),
  target: diagramTargetSchema.optional(),
  roomId: z.string().optional(),
  readOnly: z.boolean().optional(),
});

export function createRoomId(context: Pick<LaunchContext, 'workspaceId' | 'target'>): string {
  const workspace = context.workspaceId ?? 'workspace';
  const target = context.target;

  if (!target) {
    return `${workspace}:default`;
  }

  if (target.kind === 'markdown-block') {
    return `${workspace}:${target.uri}:${target.dialect}:${target.blockIndex}`;
  }

  return `${workspace}:${target.uri}:${target.dialect}`;
}

export function parseLaunchContext(input: URL | string): LaunchContext {
  const url = typeof input === 'string' ? new URL(input, 'http://localhost') : input;
  const encoded = url.searchParams.get('launch');

  if (encoded) {
    const raw = JSON.parse(decodeURIComponent(encoded));
    const context = launchContextSchema.parse(raw);
    return {
      ...context,
      roomId: context.roomId ?? createRoomId(context),
    };
  }

  const targetKind = url.searchParams.get('targetKind');
  let target: DiagramTarget | undefined;

  if (targetKind === 'file') {
    target = diagramTargetSchema.parse({
      kind: 'file',
      uri: url.searchParams.get('targetUri'),
      dialect: url.searchParams.get('dialect') ?? 'mermaid',
    });
  }

  if (targetKind === 'markdown-block') {
    target = diagramTargetSchema.parse({
      kind: 'markdown-block',
      uri: url.searchParams.get('targetUri'),
      dialect: url.searchParams.get('dialect') ?? 'mermaid',
      blockIndex: url.searchParams.get('blockIndex') ?? '0',
      startLine: url.searchParams.get('startLine') ?? '0',
      endLine: url.searchParams.get('endLine') ?? '0',
      sourceHash: url.searchParams.get('sourceHash') ?? 'unknown',
    });
  }

  const context = launchContextSchema.parse({
    mode: url.searchParams.get('mode') ?? 'workspace',
    workspaceId: url.searchParams.get('workspaceId') ?? undefined,
    rootUri: url.searchParams.get('rootUri') ?? undefined,
    readOnly: url.searchParams.get('readOnly') === 'true' ? true : undefined,
    target,
    roomId: url.searchParams.get('roomId') ?? undefined,
  });

  return {
    ...context,
    roomId: context.roomId ?? createRoomId(context),
  };
}
