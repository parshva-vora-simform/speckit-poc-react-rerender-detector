/**
 * Public barrel for the render-tracker-ui devtool panel (feature 002).
 *
 * IMPORTANT: This panel is for development use only.
 * Always guard imports or render calls with import.meta.env.DEV:
 *
 *   {import.meta.env.DEV && <RenderTrackerPanel />}
 *
 * In production builds, Vite replaces import.meta.env.DEV with `false`,
 * enabling tree-shaking of the entire render-tracker-ui module. (FR-013, SC-005)
 */

// View-model types
export type { SeverityLevel } from './types';
export type { PropValueDisplay } from './types';
export type { PropDiffRow } from './types';
export type { RenderEventRow } from './types';
export type { ComponentSummary } from './types';
export type { RenderTrackerPanelProps } from './types';

// Root panel component
export { RenderTrackerPanel } from './RenderTrackerPanel';
