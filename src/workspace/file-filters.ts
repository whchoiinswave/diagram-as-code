const supportedExtensions = new Set([
  '.mmd',
  '.mermaid',
  '.md',
  '.mdx',
  '.d2',
  '.puml',
  '.plantuml',
  '.dot',
  '.gv',
  '.structurizr',
  '.dbml',
]);

export function isDiagramFile(path: string): boolean {
  const normalized = path.trim().toLowerCase();
  const dot = normalized.lastIndexOf('.');

  if (dot === -1) {
    return false;
  }

  return supportedExtensions.has(normalized.slice(dot));
}

export function listSupportedExtensions(): string[] {
  return Array.from(supportedExtensions).sort();
}
