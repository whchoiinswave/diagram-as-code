import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { FileYDocPersistence } from '../../server/collaboration/persistence';
import { createPresenceUser } from '../collaboration/awareness';
import { cloneDocument, createCollaborationDocument, replaceSharedSource } from '../collaboration/ydoc';
import { isCollaborationMode, resolveRoomId } from '../collaboration/room';

describe('collaboration primitives', () => {
  it('creates a Yjs document with shared source, meta, settings, and undo manager', () => {
    const document = createCollaborationDocument('room-1', 'flowchart LR');

    expect(document.name).toBe('room-1');
    expect(document.source.toString()).toBe('flowchart LR');

    replaceSharedSource(document.source, 'sequenceDiagram');

    expect(document.source.toString()).toBe('sequenceDiagram');
  });

  it('encodes updates that can be applied to another Yjs document', () => {
    const source = createCollaborationDocument('source', 'flowchart LR');
    const clone = cloneDocument(source.doc);

    expect(clone.getText('source').toString()).toBe('flowchart LR');
  });

  it('creates stable room ids and detects collaboration mode', () => {
    const context = {
      mode: 'collaboration' as const,
      workspaceId: 'docs',
      target: { kind: 'file' as const, uri: 'server://a.mmd', dialect: 'mermaid' as const },
    };

    expect(resolveRoomId(context)).toBe('docs:server://a.mmd:mermaid');
    expect(isCollaborationMode(context)).toBe(true);
  });

  it('creates deterministic presence colors for a user id', () => {
    expect(createPresenceUser('Ada', 'user-1')).toEqual(createPresenceUser('Ada', 'user-1'));
  });

  it('persists Yjs documents to disk', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'diagram-ydoc-'));
    const persistence = new FileYDocPersistence(directory);
    const original = createCollaborationDocument('room', 'flowchart LR\n  A --> B');

    await persistence.save('room', original.doc);

    const loaded = await persistence.load('room');

    expect(loaded.getText('source').toString()).toBe('flowchart LR\n  A --> B');
  });
});
