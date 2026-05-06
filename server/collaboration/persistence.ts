import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import * as Y from 'yjs';

function toFileName(roomId: string): string {
  return `${encodeURIComponent(roomId)}.ydoc`;
}

export class FileYDocPersistence {
  constructor(private readonly directory: string) {}

  async save(roomId: string, document: Y.Doc): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    await writeFile(path.join(this.directory, toFileName(roomId)), Y.encodeStateAsUpdate(document));
  }

  async load(roomId: string): Promise<Y.Doc> {
    const document = new Y.Doc();

    try {
      const update = await readFile(path.join(this.directory, toFileName(roomId)));
      Y.applyUpdate(document, update);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }

    return document;
  }
}
