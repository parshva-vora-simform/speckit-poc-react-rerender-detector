import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentListView } from '../ComponentListView';
import type { ComponentSummary } from '../types';

function makeSummary(
  componentName: string,
  totalRenderCount: number,
  overrides: Partial<ComponentSummary> = {},
): ComponentSummary {
  const severityLevel =
    totalRenderCount <= 5 ? 'low' : totalRenderCount <= 20 ? 'medium' : 'high';
  return {
    componentName,
    totalRenderCount,
    severityLevel,
    latestReason: 'parent-render',
    hasHighRenderWarning: totalRenderCount > 20,
    hasReferenceInstabilityHint: false,
    ...overrides,
  };
}

describe('ComponentListView', () => {
  it('shows an empty-state message when no summaries are provided', () => {
    render(<ComponentListView summaries={[]} onSelect={() => {}} />);
    expect(screen.getByText(/no components tracked/i)).toBeInTheDocument();
  });

  it('renders a row for each summary', () => {
    render(
      <ComponentListView
        summaries={[makeSummary('Alpha', 3), makeSummary('Beta', 25)]}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('displays the render count for each component', () => {
    render(
      <ComponentListView
        summaries={[makeSummary('Alpha', 7)]}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('displays the severity level label for each row', () => {
    render(
      <ComponentListView
        summaries={[
          makeSummary('Low', 3),
          makeSummary('Med', 10),
          makeSummary('High', 25),
        ]}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText('low')).toBeInTheDocument();
    expect(screen.getByText('medium')).toBeInTheDocument();
    expect(screen.getByText('high')).toBeInTheDocument();
  });

  it('calls onSelect with the component name when a row is clicked', async () => {
    const onSelect = vi.fn();
    render(
      <ComponentListView
        summaries={[makeSummary('Alpha', 3)]}
        onSelect={onSelect}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /alpha/i }));
    expect(onSelect).toHaveBeenCalledWith('Alpha');
  });

  it('adds a new component row without displacing existing rows', () => {
    const { rerender } = render(
      <ComponentListView
        summaries={[makeSummary('Alpha', 3)]}
        onSelect={() => {}}
      />,
    );
    rerender(
      <ComponentListView
        summaries={[makeSummary('Alpha', 3), makeSummary('Beta', 1)]}
        onSelect={() => {}}
      />,
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveTextContent(/alpha/i);
    expect(buttons[1]).toHaveTextContent(/beta/i);
  });
});
