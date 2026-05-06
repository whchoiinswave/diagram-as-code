export type FlowchartNodeShape =
  | 'rectangle'
  | 'round'
  | 'diamond'
  | 'database'
  | 'circle'
  | 'subroutine'
  | 'implicit';

export type FlowchartNode = {
  id: string;
  label: string;
  shape: FlowchartNodeShape;
  lineIndex?: number;
  start?: number;
  end?: number;
};

export type FlowchartEdge = {
  id: string;
  from: string;
  to: string;
  label: string;
  type: FlowchartEdgeType;
  lineIndex: number;
};

export type FlowchartEdgeType = 'arrow' | 'line' | 'dotted' | 'thick';

export type FlowchartEdgeDraft = {
  from: string;
  to: string;
  label: string;
  type: FlowchartEdgeType;
};

export type FlowchartSelection =
  | {
      kind: 'node';
      id: string;
    }
  | {
      kind: 'edge';
      id: string;
    };

export type FlowchartStructure = {
  isFlowchart: boolean;
  direction: string | null;
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
};

export type AddFlowchartNodeOptions = {
  shape: Exclude<FlowchartNodeShape, 'implicit'>;
  label?: string;
};

export type UpdateFlowchartNodeOptions = {
  label: string;
  shape: Exclude<FlowchartNodeShape, 'implicit'>;
};

export type UpdateFlowchartEdgeOptions = {
  from: string;
  to: string;
  label: string;
  type: FlowchartEdgeType;
};

export type AddFlowchartEdgeOptions = {
  from: string;
  to: string;
  label?: string;
  type?: FlowchartEdgeType;
};

type NodeMatch = Required<Pick<FlowchartNode, 'id' | 'label' | 'start' | 'end'>> & {
  shape: Exclude<FlowchartNodeShape, 'implicit'>;
};

const nodeIdPattern = '[A-Za-z][A-Za-z0-9_.-]*';
const nodeMatchers: Array<{
  shape: Exclude<FlowchartNodeShape, 'implicit'>;
  regex: RegExp;
}> = [
  {
    shape: 'database',
    regex: /(^|[^A-Za-z0-9_.-])([A-Za-z][A-Za-z0-9_.-]*)\[\((.*?)\)\]/g,
  },
  {
    shape: 'subroutine',
    regex: /(^|[^A-Za-z0-9_.-])([A-Za-z][A-Za-z0-9_.-]*)\[\[(.*?)\]\]/g,
  },
  {
    shape: 'circle',
    regex: /(^|[^A-Za-z0-9_.-])([A-Za-z][A-Za-z0-9_.-]*)\(\((.*?)\)\)/g,
  },
  {
    shape: 'diamond',
    regex: /(^|[^A-Za-z0-9_.-])([A-Za-z][A-Za-z0-9_.-]*)\{(.*?)\}/g,
  },
  {
    shape: 'round',
    regex: /(^|[^A-Za-z0-9_.-])([A-Za-z][A-Za-z0-9_.-]*)\((?!\()(.*?)\)/g,
  },
  {
    shape: 'rectangle',
    regex: /(^|[^A-Za-z0-9_.-])([A-Za-z][A-Za-z0-9_.-]*)\[(?!\[|\()(.*?)\]/g,
  },
];

const edgeLabelPattern = new RegExp(`^\\s*(${nodeIdPattern}(?:[\\[({].*)?)\\s+--\\s+(.+?)\\s+-->\\s+(.+)$`);
const edgePipePattern = new RegExp(`^\\s*(${nodeIdPattern}(?:[\\[({].*)?)\\s+-->\\|(.+?)\\|\\s+(.+)$`);
const edgeSimplePattern = new RegExp(`^\\s*(${nodeIdPattern}(?:[\\[({].*)?)\\s+-->\\s+(.+)$`);
const edgeLinePipePattern = new RegExp(`^\\s*(${nodeIdPattern}(?:[\\[({].*)?)\\s+---\\|(.+?)\\|\\s+(.+)$`);
const edgeLineSimplePattern = new RegExp(`^\\s*(${nodeIdPattern}(?:[\\[({].*)?)\\s+---\\s+(.+)$`);
const edgeDottedLabelPattern = new RegExp(`^\\s*(${nodeIdPattern}(?:[\\[({].*)?)\\s+-\\.\\s+(.+?)\\s+\\.->\\s+(.+)$`);
const edgeDottedSimplePattern = new RegExp(`^\\s*(${nodeIdPattern}(?:[\\[({].*)?)\\s+-\\.->\\s+(.+)$`);
const edgeThickLabelPattern = new RegExp(`^\\s*(${nodeIdPattern}(?:[\\[({].*)?)\\s+==\\s+(.+?)\\s+==>\\s+(.+)$`);
const edgeThickSimplePattern = new RegExp(`^\\s*(${nodeIdPattern}(?:[\\[({].*)?)\\s+==>\\s+(.+)$`);

const shapeDefaults: Record<Exclude<FlowchartNodeShape, 'implicit'>, { label: string; prefix: string }> = {
  rectangle: { label: 'New node', prefix: 'Node' },
  round: { label: 'Step', prefix: 'Step' },
  diamond: { label: 'Decision?', prefix: 'Decision' },
  database: { label: 'Data store', prefix: 'Store' },
  circle: { label: 'State', prefix: 'State' },
  subroutine: { label: 'Process', prefix: 'Process' },
};

function isMeaningfulLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.length > 0 && !trimmed.startsWith('%%');
}

function getIndent(source: string): string {
  const lines = source.split(/\r?\n/);
  const bodyLine = lines.slice(1).find((line) => isMeaningfulLine(line));
  return bodyLine?.match(/^\s*/)?.[0] ?? '  ';
}

function sanitizeLabel(label: string): string {
  return label.trim().replace(/[\r\n[\]{}()]/g, ' ') || 'New node';
}

function formatNode(id: string, shape: Exclude<FlowchartNodeShape, 'implicit'>, label: string): string {
  const safeLabel = sanitizeLabel(label);

  if (shape === 'round') {
    return `${id}(${safeLabel})`;
  }

  if (shape === 'diamond') {
    return `${id}{${safeLabel}}`;
  }

  if (shape === 'database') {
    return `${id}[(${safeLabel})]`;
  }

  if (shape === 'circle') {
    return `${id}((${safeLabel}))`;
  }

  if (shape === 'subroutine') {
    return `${id}[[${safeLabel}]]`;
  }

  return `${id}[${safeLabel}]`;
}

function formatEdge(options: AddFlowchartEdgeOptions | UpdateFlowchartEdgeOptions): string {
  const label = options.label?.trim();
  const safeLabel = label?.replace(/[|\r\n]/g, ' ');
  const type = options.type ?? 'arrow';

  if (type === 'line') {
    return safeLabel ? `${options.from} ---|${safeLabel}| ${options.to}` : `${options.from} --- ${options.to}`;
  }

  if (type === 'dotted') {
    return safeLabel ? `${options.from} -. ${safeLabel} .-> ${options.to}` : `${options.from} -.-> ${options.to}`;
  }

  if (type === 'thick') {
    return safeLabel ? `${options.from} == ${safeLabel} ==> ${options.to}` : `${options.from} ==> ${options.to}`;
  }

  return safeLabel ? `${options.from} -->|${safeLabel}| ${options.to}` : `${options.from} --> ${options.to}`;
}

function findHeader(source: string): { isFlowchart: boolean; direction: string | null } {
  const firstLine = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith('%%'));
  const match = firstLine?.match(/^(flowchart|graph)\s+([A-Za-z]{2})\b/);

  if (!match) {
    return { isFlowchart: false, direction: null };
  }

  return { isFlowchart: true, direction: match[2] };
}

function parseNodeMatches(line: string): NodeMatch[] {
  const matches: NodeMatch[] = [];

  for (const matcher of nodeMatchers) {
    matcher.regex.lastIndex = 0;

    for (const match of line.matchAll(matcher.regex)) {
      const prefix = match[1] ?? '';
      const id = match[2];
      const label = match[3] ?? id;
      const start = match.index + prefix.length;
      const end = match.index + match[0].length;

      matches.push({
        id,
        label,
        shape: matcher.shape,
        start,
        end,
      });
    }
  }

  return matches.sort((a, b) => a.start - b.start);
}

function parseEndpointId(value: string): string | null {
  return value.trim().match(new RegExp(`^(${nodeIdPattern})`))?.[1] ?? null;
}

function createEdge(
  lineIndex: number,
  fromValue: string,
  toValue: string,
  label: string,
  type: FlowchartEdgeType,
): FlowchartEdge | null {
  const from = parseEndpointId(fromValue);
  const to = parseEndpointId(toValue);

  if (!from || !to) {
    return null;
  }

  return {
    id: `${lineIndex}:${from}:${to}`,
    from,
    to,
    label: label.trim(),
    type,
    lineIndex,
  };
}

function parseEdge(line: string, lineIndex: number): FlowchartEdge | null {
  const thickLabel = line.match(edgeThickLabelPattern);

  if (thickLabel) {
    return createEdge(lineIndex, thickLabel[1], thickLabel[3], thickLabel[2], 'thick');
  }

  const thickSimple = line.match(edgeThickSimplePattern);

  if (thickSimple) {
    return createEdge(lineIndex, thickSimple[1], thickSimple[2], '', 'thick');
  }

  const dottedLabel = line.match(edgeDottedLabelPattern);

  if (dottedLabel) {
    return createEdge(lineIndex, dottedLabel[1], dottedLabel[3], dottedLabel[2], 'dotted');
  }

  const dottedSimple = line.match(edgeDottedSimplePattern);

  if (dottedSimple) {
    return createEdge(lineIndex, dottedSimple[1], dottedSimple[2], '', 'dotted');
  }

  const linePipe = line.match(edgeLinePipePattern);

  if (linePipe) {
    return createEdge(lineIndex, linePipe[1], linePipe[3], linePipe[2], 'line');
  }

  const lineSimple = line.match(edgeLineSimplePattern);

  if (lineSimple) {
    return createEdge(lineIndex, lineSimple[1], lineSimple[2], '', 'line');
  }

  const pipe = line.match(edgePipePattern);

  if (pipe) {
    return createEdge(lineIndex, pipe[1], pipe[3], pipe[2], 'arrow');
  }

  const labeled = line.match(edgeLabelPattern);

  if (labeled) {
    return createEdge(lineIndex, labeled[1], labeled[3], labeled[2], 'arrow');
  }

  const simple = line.match(edgeSimplePattern);

  if (simple) {
    return createEdge(lineIndex, simple[1], simple[2], '', 'arrow');
  }

  return null;
}

function getExplicitNodeIds(source: string): Set<string> {
  const ids = new Set<string>();

  for (const line of source.split(/\r?\n/)) {
    for (const match of parseNodeMatches(line)) {
      ids.add(match.id);
    }
  }

  return ids;
}

function appendMissingNodeDeclarations(source: string, matches: NodeMatch[]): string {
  const explicitIds = getExplicitNodeIds(source);
  const uniqueMatches = new Map<string, NodeMatch>();

  matches.forEach((match) => {
    if (!explicitIds.has(match.id) && !uniqueMatches.has(match.id)) {
      uniqueMatches.set(match.id, match);
    }
  });

  if (uniqueMatches.size === 0) {
    return source;
  }

  const indent = getIndent(source);
  const additions = Array.from(uniqueMatches.values()).map((match) =>
    `${indent}${formatNode(match.id, match.shape, match.label)}`,
  );

  return `${source.trimEnd()}\n${additions.join('\n')}\n`;
}

function ensureNode(map: Map<string, FlowchartNode>, id: string, lineIndex?: number) {
  if (!map.has(id)) {
    map.set(id, {
      id,
      label: id,
      shape: 'implicit',
      lineIndex,
    });
  }
}

export function parseFlowchartStructure(source: string): FlowchartStructure {
  const header = findHeader(source);

  if (!header.isFlowchart) {
    return {
      ...header,
      nodes: [],
      edges: [],
    };
  }

  const lines = source.split(/\r?\n/);
  const nodesById = new Map<string, FlowchartNode>();
  const edges: FlowchartEdge[] = [];

  lines.forEach((line, lineIndex) => {
    if (!isMeaningfulLine(line) || /^(flowchart|graph)\b/.test(line.trim())) {
      return;
    }

    for (const match of parseNodeMatches(line)) {
      const existing = nodesById.get(match.id);

      if (!existing || existing.shape === 'implicit') {
        nodesById.set(match.id, {
          ...match,
          lineIndex,
        });
      }
    }

    const edge = parseEdge(line, lineIndex);

    if (edge) {
      edges.push(edge);
      ensureNode(nodesById, edge.from, lineIndex);
      ensureNode(nodesById, edge.to, lineIndex);
    }
  });

  return {
    ...header,
    nodes: Array.from(nodesById.values()).sort((a, b) => a.id.localeCompare(b.id)),
    edges,
  };
}

export function createUniqueFlowchartNodeId(
  source: string,
  shape: Exclude<FlowchartNodeShape, 'implicit'>,
): string {
  const structure = parseFlowchartStructure(source);
  const existing = new Set(structure.nodes.map((node) => node.id));
  const prefix = shapeDefaults[shape].prefix;
  let index = 1;
  let id = `${prefix}${index}`;

  while (existing.has(id) || new RegExp(`\\b${id}\\b`).test(source)) {
    index += 1;
    id = `${prefix}${index}`;
  }

  return id;
}

export function createFlowchartNodeSnippet(
  source: string,
  options: AddFlowchartNodeOptions,
): string {
  const id = createUniqueFlowchartNodeId(source, options.shape);
  const label = options.label ?? shapeDefaults[options.shape].label;

  return `\n${getIndent(source)}${formatNode(id, options.shape, label)}`;
}

export function addFlowchartNode(source: string, options: AddFlowchartNodeOptions): string {
  return `${source.trimEnd()}${createFlowchartNodeSnippet(source, options)}\n`;
}

export function addFlowchartEdge(source: string, options: AddFlowchartEdgeOptions): string {
  return `${source.trimEnd()}\n${getIndent(source)}${formatEdge(options)}\n`;
}

export function updateFlowchartNode(
  source: string,
  nodeId: string,
  options: UpdateFlowchartNodeOptions,
): string {
  const structure = parseFlowchartStructure(source);
  const node = structure.nodes.find((item) => item.id === nodeId);
  const nextNode = formatNode(nodeId, options.shape, options.label);

  if (node?.lineIndex !== undefined && node.start !== undefined && node.end !== undefined) {
    const lines = source.split(/\r?\n/);
    const line = lines[node.lineIndex];
    lines[node.lineIndex] = `${line.slice(0, node.start)}${nextNode}${line.slice(node.end)}`;
    return lines.join('\n');
  }

  return `${source.trimEnd()}\n${getIndent(source)}${nextNode}\n`;
}

export function updateFlowchartEdge(
  source: string,
  edgeId: string,
  options: UpdateFlowchartEdgeOptions,
): string {
  const structure = parseFlowchartStructure(source);
  const edge = structure.edges.find((item) => item.id === edgeId);

  if (!edge || !options.from || !options.to || options.from === options.to) {
    return source;
  }

  const lines = source.split(/\r?\n/);
  const previousLine = lines[edge.lineIndex] ?? '';
  const indent = previousLine.match(/^\s*/)?.[0] ?? getIndent(source);
  const preservedNodes = parseNodeMatches(previousLine);

  lines[edge.lineIndex] = `${indent}${formatEdge(options)}`;

  return appendMissingNodeDeclarations(lines.join('\n'), preservedNodes);
}

export function deleteFlowchartEdge(source: string, edgeId: string): string {
  const structure = parseFlowchartStructure(source);
  const edge = structure.edges.find((item) => item.id === edgeId);

  if (!edge) {
    return source;
  }

  const lines = source.split(/\r?\n/);
  const line = lines[edge.lineIndex] ?? '';
  const preservedNodes = parseNodeMatches(line);
  const nextSource = lines.filter((_, lineIndex) => lineIndex !== edge.lineIndex).join('\n');

  return appendMissingNodeDeclarations(nextSource, preservedNodes);
}

export function deleteFlowchartNode(source: string, nodeId: string): string {
  const lines = source.split(/\r?\n/);
  const preservedNodes: NodeMatch[] = [];
  const nextLines = lines.filter((line, lineIndex) => {
    const edge = parseEdge(line, lineIndex);
    const nodeMatches = parseNodeMatches(line);
    const removesLine =
      edge?.from === nodeId ||
      edge?.to === nodeId ||
      nodeMatches.some((match) => match.id === nodeId);

    if (removesLine) {
      preservedNodes.push(...nodeMatches.filter((match) => match.id !== nodeId));
    }

    return !removesLine;
  });

  return appendMissingNodeDeclarations(nextLines.join('\n'), preservedNodes);
}
