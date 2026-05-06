import type { DiagramFile } from './storage-provider';

export type FileTreeNode =
  | {
      id: string;
      name: string;
      kind: 'folder';
      children: FileTreeNode[];
    }
  | {
      id: string;
      name: string;
      kind: 'file';
      file: DiagramFile;
    };

type MutableFolder = Extract<FileTreeNode, { kind: 'folder' }>;

function sortNodes(nodes: FileTreeNode[]): FileTreeNode[] {
  return nodes.sort((a, b) => {
    if (a.kind !== b.kind) {
      return a.kind === 'folder' ? -1 : 1;
    }

    return a.name.localeCompare(b.name);
  });
}

export function buildFileTree(files: DiagramFile[]): FileTreeNode[] {
  const root: MutableFolder = { id: 'root', name: 'root', kind: 'folder', children: [] };
  const folderMap = new Map<string, MutableFolder>([['', root]]);

  for (const file of files) {
    const parts = file.relativePath.split('/').filter(Boolean);
    let folderPath = '';
    let parent = root;

    for (const part of parts.slice(0, -1)) {
      folderPath = folderPath ? `${folderPath}/${part}` : part;
      let folder = folderMap.get(folderPath);

      if (!folder) {
        folder = { id: `folder:${folderPath}`, name: part, kind: 'folder', children: [] };
        folderMap.set(folderPath, folder);
        parent.children.push(folder);
      }

      parent = folder;
    }

    parent.children.push({
      id: file.uri,
      name: parts.slice(-1)[0] ?? file.name,
      kind: 'file',
      file,
    });
  }

  for (const folder of folderMap.values()) {
    sortNodes(folder.children);
  }

  return root.children;
}

export function flattenFiles(nodes: FileTreeNode[]): DiagramFile[] {
  return nodes.flatMap((node) => {
    if (node.kind === 'file') {
      return [node.file];
    }

    return flattenFiles(node.children);
  });
}

export function getAdjacentFile(
  files: DiagramFile[],
  activeUri: string | null,
  direction: 'previous' | 'next',
): DiagramFile | null {
  if (files.length === 0) {
    return null;
  }

  const index = Math.max(
    0,
    files.findIndex((file) => file.uri === activeUri),
  );
  const offset = direction === 'next' ? 1 : -1;
  const nextIndex = (index + offset + files.length) % files.length;

  return files[nextIndex];
}
