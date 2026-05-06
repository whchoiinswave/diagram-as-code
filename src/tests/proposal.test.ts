import { describe, expect, it } from 'vitest';
import { applyAiProposal, createAiProposal, createMockAiProposal } from '../ai/proposal';

describe('AI proposal model', () => {
  it('creates a unified diff without mutating the base source', () => {
    const baseSource = 'flowchart LR\n  A --> B\n';
    const proposedSource = 'flowchart LR\n  A --> B\n  C --> D\n';
    const proposal = createAiProposal({
      id: 'proposal-test',
      title: 'Add node',
      baseSource,
      proposedSource,
      targetLabel: 'sample.mmd',
      createdAt: 1,
    });

    expect(proposal.baseSource).toBe(baseSource);
    expect(proposal.proposedSource).toBe(proposedSource);
    expect(proposal.patch).toContain('--- sample.mmd');
    expect(proposal.patch).toContain('+  C --> D');
  });

  it('applies a proposal to the exact base source', () => {
    const proposal = createAiProposal({
      title: 'Add node',
      baseSource: 'flowchart LR\n  A --> B\n',
      proposedSource: 'flowchart LR\n  A --> B\n  C --> D\n',
    });

    expect(applyAiProposal(proposal, proposal.baseSource)).toEqual({
      ok: true,
      source: proposal.proposedSource,
    });
  });

  it('reports a failed patch when the current source no longer matches', () => {
    const proposal = createAiProposal({
      title: 'Add node',
      baseSource: 'flowchart LR\n  A --> B\n',
      proposedSource: 'flowchart LR\n  A --> B\n  C --> D\n',
    });

    expect(applyAiProposal(proposal, 'sequenceDiagram\n  A->>B: Changed\n')).toEqual({
      ok: false,
      reason: 'patch-failed',
    });
  });

  it('creates a deterministic Mermaid-safe mock proposal shape', () => {
    const proposal = createMockAiProposal('flowchart LR\n  A --> B\n', 'demo.mmd');

    expect(proposal.targetLabel).toBe('demo.mmd');
    expect(proposal.proposedSource).toContain('AIReview');
    expect(proposal.patch).toContain('+  AIReview');
  });
});
