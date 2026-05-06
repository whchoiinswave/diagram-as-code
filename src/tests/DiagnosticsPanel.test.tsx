import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DiagnosticsPanel } from '../components/diagnostics/DiagnosticsPanel';

describe('DiagnosticsPanel', () => {
  it('shows a quiet success state when there are no errors', () => {
    render(<DiagnosticsPanel renderState={{ status: 'success', svg: '<svg />' }} />);

    expect(screen.getByText('No render errors')).toBeInTheDocument();
  });

  it('renders diagnostics from an error state', () => {
    render(
      <DiagnosticsPanel
        renderState={{
          status: 'error',
          diagnostics: [{ severity: 'error', message: 'Unexpected token' }],
        }}
      />,
    );

    expect(screen.getByText('error')).toBeInTheDocument();
    expect(screen.getByText('Unexpected token')).toBeInTheDocument();
  });
});
