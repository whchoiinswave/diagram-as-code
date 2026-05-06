import { Check, WandSparkles, X } from 'lucide-react';
import type { AiProposal } from '../../ai/proposal';

type ProposalPanelProps = {
  proposal: AiProposal | null;
  error: string | null;
  onCreateProposal: () => void;
  onApplyProposal: () => void;
  onCancelProposal: () => void;
};

export function ProposalPanel({
  proposal,
  error,
  onCreateProposal,
  onApplyProposal,
  onCancelProposal,
}: ProposalPanelProps) {
  return (
    <section className="proposal-panel" aria-label="AI proposal">
      <div className="panel-title">AI Proposal</div>
      <div className="proposal-body">
        {proposal ? (
          <>
            <div className="proposal-summary">
              <strong>{proposal.title}</strong>
              <span>{proposal.summary}</span>
            </div>
            <pre className="proposal-diff" aria-label="Proposal diff">
              {proposal.patch}
            </pre>
            {error ? <div className="proposal-error">{error}</div> : null}
            <div className="proposal-actions">
              <button className="small-button" type="button" title="Apply proposal" onClick={onApplyProposal}>
                <Check size={14} aria-hidden="true" />
                Apply
              </button>
              <button className="small-button" type="button" title="Cancel proposal" onClick={onCancelProposal}>
                <X size={14} aria-hidden="true" />
                Cancel
              </button>
            </div>
          </>
        ) : (
          <button className="proposal-create small-button" type="button" title="Generate mock AI proposal" onClick={onCreateProposal}>
            <WandSparkles size={14} aria-hidden="true" />
            Generate
          </button>
        )}
      </div>
    </section>
  );
}
