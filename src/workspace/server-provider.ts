import type { DiagramTarget } from '../diagram/types';
import type { DiagramFile, StorageProvider, TargetReadState, TargetWriteState } from './storage-provider';

type FilesResponse = {
  files: DiagramFile[];
};

type ReadResponse = {
  source: string;
  sourceHash?: string;
  stale?: boolean;
};

type WriteResponse = {
  ok: boolean;
  sourceHash?: string;
};

export function createServerStorageProvider(root: string, endpoint = ''): StorageProvider {
  async function readTargetState(target: DiagramTarget): Promise<TargetReadState> {
    const response = await fetch(`${endpoint}/api/target/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ root, target }),
    });

    if (!response.ok) {
      throw new Error(`Failed to read server target: ${response.status}`);
    }

    return (await response.json()) as ReadResponse;
  }

  return {
    id: 'server',
    label: 'server-workspace',
    writable: true,
    async listFiles() {
      const response = await fetch(`${endpoint}/api/files?root=${encodeURIComponent(root)}`);

      if (!response.ok) {
        throw new Error(`Failed to list server files: ${response.status}`);
      }

      return ((await response.json()) as FilesResponse).files;
    },
    readTargetState,
    async readTarget(target: DiagramTarget) {
      return (await readTargetState(target)).source;
    },
    async writeTarget(target: DiagramTarget, source: string) {
      const response = await fetch(`${endpoint}/api/target/write`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ root, target, source }),
      });

      if (!response.ok) {
        throw new Error(`Failed to write server target: ${response.status}`);
      }

      const body = (await response.json()) as WriteResponse;

      return body.sourceHash ? ({ sourceHash: body.sourceHash } satisfies TargetWriteState) : {};
    },
  };
}
