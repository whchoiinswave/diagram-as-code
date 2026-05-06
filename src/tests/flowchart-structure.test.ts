import { describe, expect, it } from 'vitest';
import {
  addFlowchartEdge,
  addFlowchartNode,
  createFlowchartNodeSnippet,
  deleteFlowchartEdge,
  deleteFlowchartNode,
  parseFlowchartStructure,
  updateFlowchartEdge,
  updateFlowchartNode,
} from '../diagram/flowchart-structure';
import { defaultMermaidSource } from '../diagram/templates/mermaidTemplates';

describe('flowchart structure', () => {
  it('parses flowchart nodes, shapes, and edges from inline declarations', () => {
    const structure = parseFlowchartStructure(defaultMermaidSource);

    expect(structure.isFlowchart).toBe(true);
    expect(structure.direction).toBe('LR');
    expect(structure.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'Request', label: 'Client Request', shape: 'rectangle' }),
        expect.objectContaining({ id: 'Auth', label: 'Authorized?', shape: 'diamond' }),
        expect.objectContaining({ id: 'Store', label: 'Data Store', shape: 'database' }),
      ]),
    );
    expect(structure.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: 'Request', to: 'Gateway', label: '' }),
        expect.objectContaining({ from: 'Auth', to: 'Service', label: 'Yes' }),
      ]),
    );
  });

  it('creates unique node snippets for requested flowchart shapes', () => {
    const snippet = createFlowchartNodeSnippet(defaultMermaidSource, { shape: 'diamond' });

    expect(snippet).toBe('\n  Decision1{Decision?}');
  });

  it('appends flowchart nodes and edges', () => {
    const withNode = addFlowchartNode(defaultMermaidSource, { shape: 'circle', label: 'Done' });
    const withEdge = addFlowchartEdge(withNode, { from: 'Response', to: 'State1', label: 'finish' });

    expect(withNode).toContain('State1((Done))');
    expect(withEdge).toContain('Response -->|finish| State1');
  });

  it('appends flowchart edges with selected link styles', () => {
    expect(addFlowchartEdge(defaultMermaidSource, { from: 'Request', to: 'Response', type: 'line' })).toContain(
      'Request --- Response',
    );
    expect(
      addFlowchartEdge(defaultMermaidSource, {
        from: 'Request',
        to: 'Response',
        label: 'returns',
        type: 'dotted',
      }),
    ).toContain('Request -. returns .-> Response');
    expect(
      addFlowchartEdge(defaultMermaidSource, {
        from: 'Request',
        to: 'Response',
        label: 'fast',
        type: 'thick',
      }),
    ).toContain('Request == fast ==> Response');
  });

  it('parses selectable edge styles', () => {
    const source = `flowchart LR
  A --- B
  B -. slow .-> C
  C == fast ==> D`;
    const structure = parseFlowchartStructure(source);

    expect(structure.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: 'A', to: 'B', type: 'line', label: '' }),
        expect.objectContaining({ from: 'B', to: 'C', type: 'dotted', label: 'slow' }),
        expect.objectContaining({ from: 'C', to: 'D', type: 'thick', label: 'fast' }),
      ]),
    );
  });

  it('updates an inline node declaration while keeping the node id', () => {
    const nextSource = updateFlowchartNode(defaultMermaidSource, 'Auth', {
      label: 'Approved?',
      shape: 'rectangle',
    });

    expect(nextSource).toContain('Gateway --> Auth[Approved?]');
    expect(nextSource).not.toContain('Auth{Authorized?}');
  });

  it('adds an explicit declaration when updating an implicit node', () => {
    const source = 'flowchart LR\n  A --> B';
    const nextSource = updateFlowchartNode(source, 'B', {
      label: 'Target',
      shape: 'round',
    });

    expect(nextSource).toContain('  B(Target)');
  });

  it('deletes an edge while preserving inline node declarations', () => {
    const source = `flowchart LR
  A[Start] --> B[End]
  B --> C`;
    const edgeId = parseFlowchartStructure(source).edges.find((edge) => edge.from === 'A' && edge.to === 'B')?.id;

    expect(edgeId).toBeDefined();

    const nextSource = deleteFlowchartEdge(source, edgeId ?? '');

    expect(nextSource).not.toContain('A[Start] --> B[End]');
    expect(nextSource).toContain('A[Start]');
    expect(nextSource).toContain('B[End]');
    expect(nextSource).toContain('B --> C');
  });

  it('updates an edge while preserving inline node declarations', () => {
    const source = `flowchart LR
  A[Start] --> B[End]
  B --> C`;
    const edgeId = parseFlowchartStructure(source).edges.find((edge) => edge.from === 'A' && edge.to === 'B')?.id;

    expect(edgeId).toBeDefined();

    const nextSource = updateFlowchartEdge(source, edgeId ?? '', {
      from: 'A',
      to: 'B',
      label: 'done',
      type: 'dotted',
    });

    expect(nextSource).toContain('A -. done .-> B');
    expect(nextSource).toContain('A[Start]');
    expect(nextSource).toContain('B[End]');
  });

  it('deletes a node and connected edges while preserving unrelated declarations', () => {
    const source = `flowchart LR
  A[Start] --> B[Middle]
  B --> C[End]
  D[Other]`;
    const nextSource = deleteFlowchartNode(source, 'B');

    expect(nextSource).not.toContain('B[Middle]');
    expect(nextSource).not.toContain('A[Start] --> B[Middle]');
    expect(nextSource).not.toContain('B --> C[End]');
    expect(nextSource).toContain('A[Start]');
    expect(nextSource).toContain('C[End]');
    expect(nextSource).toContain('D[Other]');
  });
});
