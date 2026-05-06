export type EditorMode = 'embedded' | 'workspace' | 'collaboration';

export type DiagramDialectId =
  | 'mermaid'
  | 'd2'
  | 'plantuml'
  | 'graphviz'
  | 'structurizr';

export type Diagnostic = {
  severity: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  column?: number;
};

export type RenderResult =
  | { ok: true; svg: string }
  | { ok: false; diagnostics: Diagnostic[] };

export type RenderState =
  | { status: 'idle' }
  | { status: 'rendering' }
  | { status: 'success'; svg: string }
  | { status: 'error'; diagnostics: Diagnostic[] };

export type DiagramTemplate = {
  id: string;
  label: string;
  dialect: DiagramDialectId;
  source: string;
};

export type DiagramDialect = {
  id: DiagramDialectId;
  label: string;
  detect: (source: string) => boolean;
  render: (source: string) => Promise<RenderResult>;
  validate?: (source: string) => Promise<Diagnostic[]>;
  format?: (source: string) => Promise<string>;
  templates: DiagramTemplate[];
  aiHints: string;
};

export type DiagramTarget =
  | {
      kind: 'file';
      uri: string;
      dialect: DiagramDialectId;
    }
  | {
      kind: 'markdown-block';
      uri: string;
      dialect: DiagramDialectId;
      blockIndex: number;
      startLine: number;
      endLine: number;
      sourceHash: string;
    };

export type LaunchContext = {
  mode: EditorMode;
  workspaceId?: string;
  rootUri?: string;
  target?: DiagramTarget;
  roomId?: string;
  readOnly?: boolean;
};
