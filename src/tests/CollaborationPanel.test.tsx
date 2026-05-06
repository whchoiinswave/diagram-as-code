import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createPresenceUser } from '../collaboration/awareness';
import { CollaborationPanel } from '../components/collaboration/CollaborationPanel';

describe('CollaborationPanel', () => {
  it('shows room, local presence, and provider status', () => {
    render(
      <CollaborationPanel
        roomId="docs:server://flow.mmd:mermaid"
        status="connected"
        user={createPresenceUser('Ada', 'user-1')}
      />,
    );

    expect(screen.getByText('docs:server://flow.mmd:mermaid')).toBeInTheDocument();
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByText('connected')).toBeInTheDocument();
  });
});
