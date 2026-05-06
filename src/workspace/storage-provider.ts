import type { DiagramDialectId, DiagramTarget } from '../diagram/types';

export type DiagramFile = {
  uri: string;
  name: string;
  relativePath: string;
  dialectHint?: DiagramDialectId;
  kind: 'file';
};

export type StorageProvider = {
  id: string;
  label: string;
  writable: boolean;
  listFiles: (rootUri: string) => Promise<DiagramFile[]>;
  readTarget: (target: DiagramTarget) => Promise<string>;
  readTargetState?: (target: DiagramTarget) => Promise<TargetReadState>;
  writeTarget: (target: DiagramTarget, source: string) => Promise<TargetWriteState | void>;
  watch?: (rootUri: string, onChange: () => void) => () => void;
};

export type TargetReadState = {
  source: string;
  sourceHash?: string;
  stale?: boolean;
};

export type TargetWriteState = {
  sourceHash?: string;
};

export type WorkspaceDocument = {
  uri: string;
  relativePath: string;
  source: string;
  dialectHint?: DiagramDialectId;
};

export function detectDialectFromPath(path: string): DiagramDialectId | undefined {
  const lower = path.toLowerCase();

  if (lower.endsWith('.mmd') || lower.endsWith('.mermaid') || lower.endsWith('.md') || lower.endsWith('.mdx')) {
    return 'mermaid';
  }

  if (lower.endsWith('.d2')) {
    return 'd2';
  }

  if (lower.endsWith('.puml') || lower.endsWith('.plantuml')) {
    return 'plantuml';
  }

  if (lower.endsWith('.dot') || lower.endsWith('.gv')) {
    return 'graphviz';
  }

  if (lower.endsWith('.structurizr')) {
    return 'structurizr';
  }

  return undefined;
}

export function createMemoryStorageProvider(
  label: string,
  documents: WorkspaceDocument[],
): StorageProvider {
  const byUri = new Map<string, WorkspaceDocument>();

  for (const document of documents) {
    byUri.set(document.uri, {
      ...document,
      dialectHint: document.dialectHint ?? detectDialectFromPath(document.relativePath),
    });
  }

  return {
    id: 'memory',
    label,
    writable: true,
    async listFiles() {
      return Array.from(byUri.values())
        .sort((a, b) => a.relativePath.localeCompare(b.relativePath))
        .map((document) => ({
          uri: document.uri,
          name: document.relativePath.split('/').slice(-1)[0] ?? document.relativePath,
          relativePath: document.relativePath,
          dialectHint: document.dialectHint,
          kind: 'file',
        }));
    },
    async readTarget(target) {
      const document = byUri.get(target.uri);

      if (!document) {
        throw new Error(`Document not found: ${target.uri}`);
      }

      return document.source;
    },
    async readTargetState(target) {
      const document = byUri.get(target.uri);

      if (!document) {
        throw new Error(`Document not found: ${target.uri}`);
      }

      return {
        source: document.source,
        stale: false,
      };
    },
    async writeTarget(target, source) {
      const document = byUri.get(target.uri);

      if (!document) {
        throw new Error(`Document not found: ${target.uri}`);
      }

      byUri.set(target.uri, { ...document, source });
    },
  };
}

export async function createProviderFromFiles(files: FileList | File[]): Promise<StorageProvider> {
  const fileArray = Array.from(files);
  const documents = await Promise.all(
    fileArray.map(async (file) => {
      const relativePath = file.webkitRelativePath || file.name;

      return {
        uri: `browser://${relativePath}`,
        relativePath,
        source: await file.text(),
        dialectHint: detectDialectFromPath(relativePath),
      };
    }),
  );

  return createMemoryStorageProvider('Imported files', documents);
}
