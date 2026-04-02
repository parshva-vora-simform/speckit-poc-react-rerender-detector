import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentDetailView } from '../ComponentDetailView';
import type { RenderEventRow, PropValueDisplay } from '../types';

/** Test helper: cast a plain string to the branded PropValueDisplay type. */
function pd(s: string): PropValueDisplay {
  // Safe cast in test context — the brand exists only at the type level.
  return s as unknown as PropValueDisplay;
}

function makeRow(
  renderNumber: number,
  overrides: Partial<RenderEventRow> = {},
): RenderEventRow {
  return {
    renderNumber,
    reason: 'parent-render',
    propDiffRows: [],
    ...overrides,
  };
}

describe('ComponentDetailView', () => {
  it('displays the component name as a heading', () => {
    render(
      <ComponentDetailView
        componentName="MyComponent"
        eventRows={[]}
        onClose={() => {}}
      />,
    );
    expect(screen.getByRole('heading', { name: /mycomponent/i })).toBeInTheDocument();
  });

  it('renders event rows in order with render number and reason', () => {
    const rows = [
      makeRow(1, { reason: 'parent-render' }),
      makeRow(2, { reason: 'props-change' }),
      makeRow(3, { reason: 'reference-change' }),
    ];
    render(
      <ComponentDetailView
        componentName="Comp"
        eventRows={rows}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText('#3')).toBeInTheDocument();
    expect(screen.getByText('parent-render')).toBeInTheDocument();
    expect(screen.getByText('props-change')).toBeInTheDocument();
    expect(screen.getByText('reference-change')).toBeInTheDocument();
  });

  it('shows "No prop changes detected." for parent-render events', () => {
    const rows = [makeRow(1, { reason: 'parent-render', propDiffRows: [] })];
    render(
      <ComponentDetailView componentName="Comp" eventRows={rows} onClose={() => {}} />,
    );
    expect(screen.getByText(/no prop changes detected/i)).toBeInTheDocument();
  });

  it('renders prop diff rows with key, prev, and next values', () => {
    const rows = [
      makeRow(1, {
        reason: 'props-change',
        propDiffRows: [
          {
            key: 'count',
            prevDisplay: pd('0'),
            nextDisplay: pd('1'),
            changeType: 'value-change',
          },
        ],
      }),
    ];
    render(
      <ComponentDetailView componentName="Comp" eventRows={rows} onClose={() => {}} />,
    );
    expect(screen.getByText('count')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('appends a new event row when re-rendered with additional eventRows', () => {
    const rows = [makeRow(1, { reason: 'parent-render' })];
    const { rerender } = render(
      <ComponentDetailView componentName="Comp" eventRows={rows} onClose={() => {}} />,
    );
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.queryByText('#2')).not.toBeInTheDocument();

    rerender(
      <ComponentDetailView
        componentName="Comp"
        eventRows={[...rows, makeRow(2, { reason: 'props-change' })]}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText('#2')).toBeInTheDocument();
  });

  it('calls onClose when the back button is clicked', async () => {
    const onClose = vi.fn();
    render(
      <ComponentDetailView componentName="Comp" eventRows={[]} onClose={onClose} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when the Escape key is pressed', async () => {
    const onClose = vi.fn();
    render(
      <ComponentDetailView componentName="Comp" eventRows={[]} onClose={onClose} />,
    );
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });
});
