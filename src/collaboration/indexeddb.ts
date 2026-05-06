import { IndexeddbPersistence } from 'y-indexeddb';
import type * as Y from 'yjs';

export function createIndexedDbPersistence(roomId: string, document: Y.Doc): IndexeddbPersistence {
  return new IndexeddbPersistence(roomId, document);
}
