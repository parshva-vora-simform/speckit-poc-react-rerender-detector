import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderStore } from '../../render-tracker';
import type { RenderEvent } from '../../render-tracker';
import { RenderTrackerPanel } from '../RenderTrackerPanel';

function makeEvent(
  componentName: string,
  overrides: Partial<RenderEvent> = {},
): RenderEvent {
  return {
    componentName,
    renderCount: 1,
    timestamp: new Date().toISOString(),
    reason: 'parent-render',
    changedKeys: [],
    prevProps: null,
    currentProps: {},
    ...overrides,
  };
}

afterEach(() => {
  renderStore.clear();
});

describe('RenderTrackerPanel — integration', () => {
  it('renders the panel title', () => {
    render(<RenderTrackerPanel />);
    expect(screen.getByRole('heading', { name: /render tracker/i })).toBeInTheDocument();
  });

  it('shows empty-state message when no components are tracked', () => {
    render(<RenderTrackerPanel />);
    expect(screen.getByText(/no components tracked/i)).toBeInTheDocument();
  });

  it('shows component list when store has tracked components', () => {
    renderStore.append('Alpha', makeEvent('Alpha'));
    renderStore.append('Beta', makeEvent('Beta', { renderCount: 25 }));
    render(<RenderTrackerPanel />);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('navigates to detail view when a component row is clicked', async () => {
    renderStore.append(
      'Gamma',
      makeEvent('Gamma', { reason: 'props-change', changedKeys: ['x'], currentProps: { x: 1 } }),
    );
    render(<RenderTrackerPanel />);
    await userEvent.click(screen.getByRole('button', { name: /gamma/i }));
    expect(screen.getByRole('heading', { name: /gamma/i })).toBeInTheDocument();
  });

  it('returns to overview when Escape is pressed in detail view', async () => {
    renderStore.append('Delta', makeEvent('Delta'));
    render(<RenderTrackerPanel />);
    await userEvent.click(screen.getByRole('button', { name: /delta/i }));
    // Detail pane open
    expect(screen.getByRole('heading', { name: /delta/i })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    // Back to overview
    expect(screen.getByText('Delta')).toBeInTheDocument();
  });

  it('live-updates the overview list when a new event is appended', () => {
    renderStore.append('Epsilon', makeEvent('Epsilon'));
    render(<RenderTrackerPanel />);
    expect(screen.getByText('1')).toBeInTheDocument();

    act(() => {
      renderStore.append('Epsilon', makeEvent('Epsilon', { renderCount: 2 }));
    });

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows high render count warning for components with >20 renders', () => {
    for (let i = 1; i <= 21; i++) {
      renderStore.append('HotComp', makeEvent('HotComp', { renderCount: i }));
    }
    render(<RenderTrackerPanel />);
    expect(screen.getByLabelText(/high render count warning/i)).toBeInTheDocument();
  });

  it('shows reference instability hint for 5 consecutive reference-change renders', () => {
    for (let i = 1; i <= 5; i++) {
      renderStore.append(
        'UnstableComp',
        makeEvent('UnstableComp', { renderCount: i, reason: 'reference-change', changedKeys: ['fn'] }),
      );
    }
    render(<RenderTrackerPanel />);
    expect(screen.getByLabelText(/usememo or usecallback/i)).toBeInTheDocument();
  });
});
