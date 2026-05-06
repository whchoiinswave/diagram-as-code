import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createMockAiProposal } from '../ai/proposal';
import { ProposalPanel } from '../components/ai/ProposalPanel';

describe('ProposalPanel', () => {
  it('starts a mock AI proposal', async () => {
    const user = userEvent.setup();
    const onCreateProposal = vi.fn();

    render(
      <ProposalPanel
        proposal={null}
        error={null}
        onCreateProposal={onCreateProposal}
        onApplyProposal={() => undefined}
        onCancelProposal={() => undefined}
      />,
    );

    await user.click(screen.getByTitle('Generate mock AI proposal'));

    expect(onCreateProposal).toHaveBeenCalled();
  });

  it('previews a diff and exposes apply/cancel actions', async () => {
    const user = userEvent.setup();
    const onApplyProposal = vi.fn();
    const onCancelProposal = vi.fn();
    const proposal = createMockAiProposal('flowchart LR\n  A --> B\n');

    render(
      <ProposalPanel
        proposal={proposal}
        error="Patch failed"
        onCreateProposal={() => undefined}
        onApplyProposal={onApplyProposal}
        onCancelProposal={onCancelProposal}
      />,
    );

    expect(screen.getByLabelText('Proposal diff')).toHaveTextContent('+ AIReview');
    expect(screen.getByText('Patch failed')).toBeInTheDocument();

    await user.click(screen.getByTitle('Apply proposal'));
    await user.click(screen.getByTitle('Cancel proposal'));

    expect(onApplyProposal).toHaveBeenCalled();
    expect(onCancelProposal).toHaveBeenCalled();
  });
});
