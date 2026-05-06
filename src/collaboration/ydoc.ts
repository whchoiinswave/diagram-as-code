import * as Y from 'yjs';

export type CollaborationDocument = {
  name: string;
  doc: Y.Doc;
  source: Y.Text;
  meta: Y.Map<unknown>;
  settings: Y.Map<unknown>;
  undoManager: Y.UndoManager;
};

export function createCollaborationDocument(name: string, initialSource = ''): CollaborationDocument {
  const doc = new Y.Doc();
  const source = doc.getText('source');
  const meta = doc.getMap('meta');
  const settings = doc.getMap('settings');

  if (initialSource) {
    source.insert(0, initialSource);
  }

  return {
    name,
    doc,
    source,
    meta,
    settings,
    undoManager: new Y.UndoManager(source),
  };
}

export function replaceSharedSource(source: Y.Text, nextSource: string): void {
  source.delete(0, source.length);
  source.insert(0, nextSource);
}

export function encodeDocumentState(doc: Y.Doc): Uint8Array {
  return Y.encodeStateAsUpdate(doc);
}

export function applyDocumentState(doc: Y.Doc, update: Uint8Array): void {
  Y.applyUpdate(doc, update);
}

export function cloneDocument(sourceDoc: Y.Doc): Y.Doc {
  const clone = new Y.Doc();
  applyDocumentState(clone, encodeDocumentState(sourceDoc));
  return clone;
}
