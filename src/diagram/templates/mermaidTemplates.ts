import type { DiagramTemplate } from '../types';

export const mermaidTemplates: DiagramTemplate[] = [
  {
    id: 'flowchart',
    label: 'Flow',
    dialect: 'mermaid',
    source: `flowchart LR
  Request[Client Request] --> Gateway[API Gateway]
  Gateway --> Auth{Authorized?}
  Auth -- Yes --> Service[Application Service]
  Auth -- No --> Reject[Reject]
  Service --> Store[(Data Store)]
  Service --> Response[Response]`,
  },
  {
    id: 'sequence',
    label: 'Sequence',
    dialect: 'mermaid',
    source: `sequenceDiagram
  participant User
  participant App
  participant API
  User->>App: Edit diagram source
  App->>API: Save draft
  API-->>App: Saved
  App-->>User: Render preview`,
  },
  {
    id: 'class',
    label: 'Class',
    dialect: 'mermaid',
    source: `classDiagram
  class DiagramDialect {
    +string id
    +render(source) RenderResult
    +validate(source) Diagnostic[]
  }
  class MermaidDialect
  DiagramDialect <|.. MermaidDialect`,
  },
  {
    id: 'erd',
    label: 'ERD',
    dialect: 'mermaid',
    source: `erDiagram
  WORKSPACE ||--o{ DIAGRAM : contains
  DIAGRAM ||--o{ REVISION : tracks
  USER ||--o{ REVISION : edits
  DIAGRAM {
    string id
    string dialect
    string source
  }`,
  },
];

export const defaultMermaidSource = mermaidTemplates[0].source;
