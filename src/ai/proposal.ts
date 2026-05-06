import { applyPatch, createPatch } from 'diff';

export type AiProposal = {
  id: string;
  title: string;
  summary: string;
  baseSource: string;
  proposedSource: string;
  patch: string;
  targetLabel: string;
  createdAt: number;
};

export type CreateAiProposalInput = {
  id?: string;
  title: string;
  summary?: string;
  baseSource: string;
  proposedSource: string;
  targetLabel?: string;
  createdAt?: number;
};

export type ApplyAiProposalResult =
  | {
      ok: true;
      source: string;
    }
  | {
      ok: false;
      reason: 'patch-failed';
    };

function createProposalId() {
  return `proposal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createAiProposal({
  id = createProposalId(),
  title,
  summary = title,
  baseSource,
  proposedSource,
  targetLabel = 'diagram.mmd',
  createdAt = Date.now(),
}: CreateAiProposalInput): AiProposal {
  return {
    id,
    title,
    summary,
    baseSource,
    proposedSource,
    targetLabel,
    createdAt,
    patch: createPatch(targetLabel, baseSource, proposedSource, 'current', 'proposal', {
      context: 3,
    }),
  };
}

export function applyAiProposal(proposal: AiProposal, currentSource: string): ApplyAiProposalResult {
  if (currentSource === proposal.baseSource) {
    return {
      ok: true,
      source: proposal.proposedSource,
    };
  }

  const patched = applyPatch(currentSource, proposal.patch, {
    fuzzFactor: 0,
    autoConvertLineEndings: true,
  });

  if (patched === false) {
    return {
      ok: false,
      reason: 'patch-failed',
    };
  }

  return {
    ok: true,
    source: patched,
  };
}

function createUniqueSymbol(source: string, preferred: string) {
  if (!source.includes(preferred)) {
    return preferred;
  }

  let index = 2;
  let candidate = `${preferred}${index}`;

  while (source.includes(candidate)) {
    index += 1;
    candidate = `${preferred}${index}`;
  }

  return candidate;
}

function appendLine(source: string, line: string) {
  return `${source.trimEnd()}\n${line}\n`;
}

function createMockProposedSource(source: string) {
  const trimmedStart = source.trimStart();

  if (/^(flowchart|graph)\b/.test(trimmedStart)) {
    const reviewNode = createUniqueSymbol(source, 'AIReview');
    const applyNode = createUniqueSymbol(source, 'ApplyDecision');

    return appendLine(source, `  ${reviewNode}[AI review] --> ${applyNode}[Apply or cancel]`);
  }

  if (/^sequenceDiagram\b/.test(trimmedStart)) {
    const participant = createUniqueSymbol(source, 'AIAgent');

    return appendLine(source, `  participant ${participant} as AI Agent\n  ${participant}->>User: Suggest diagram update`);
  }

  if (/^erDiagram\b/.test(trimmedStart)) {
    const entity = createUniqueSymbol(source, 'PROPOSAL_REVIEW');

    return appendLine(source, `  ${entity} {\n    string status\n    string summary\n  }`);
  }

  if (/^classDiagram\b/.test(trimmedStart)) {
    const className = createUniqueSymbol(source, 'ProposalReview');

    return appendLine(source, `  class ${className} {\n    +string status\n    +string summary\n  }`);
  }

  if (/^stateDiagram/.test(trimmedStart)) {
    const stateName = createUniqueSymbol(source, 'AIReview');

    return appendLine(source, `  ${stateName}: AI review`);
  }

  return appendLine(source, '%% AI proposal: review before applying');
}

export function createMockAiProposal(source: string, targetLabel = 'diagram.mmd') {
  return createAiProposal({
    title: 'Mock AI update',
    summary: 'Adds a review-oriented diagram element.',
    baseSource: source,
    proposedSource: createMockProposedSource(source),
    targetLabel,
  });
}
