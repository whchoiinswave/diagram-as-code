import { defaultMermaidSource } from '../diagram/templates/mermaidTemplates';
import { createMemoryStorageProvider, type WorkspaceDocument } from './storage-provider';

export const sampleWorkspaceDocuments: WorkspaceDocument[] = [
  {
    uri: 'sample://architecture/system-flow.mmd',
    relativePath: 'architecture/system-flow.mmd',
    source: defaultMermaidSource,
    dialectHint: 'mermaid',
  },
  {
    uri: 'sample://docs/api-sequence.md',
    relativePath: 'docs/api-sequence.md',
    source: `sequenceDiagram
  participant User
  participant Editor
  participant Renderer
  User->>Editor: Update source
  Editor->>Renderer: Debounced render
  Renderer-->>User: SVG preview`,
    dialectHint: 'mermaid',
  },
  {
    uri: 'sample://domain/context-map.mermaid',
    relativePath: 'domain/context-map.mermaid',
    source: `flowchart TB
  Product[Product Team] --> EditorCore[Editor Core]
  EditorCore --> Mermaid[Mermaid Adapter]
  EditorCore --> Workspace[Workspace Provider]
  Workspace --> Files[(Diagram Files)]`,
    dialectHint: 'mermaid',
  },
  {
    uri: 'sample://database/schema.dbml',
    relativePath: 'database/schema.dbml',
    source: `Table diagrams {
  id varchar [pk]
  dialect varchar
  source text
}`,
    dialectHint: undefined,
  },
];

export function createSampleWorkspaceProvider() {
  return createMemoryStorageProvider('sample-workspace', sampleWorkspaceDocuments);
}
