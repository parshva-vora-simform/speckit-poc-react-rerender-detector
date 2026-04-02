# SpecKit POC: React Re-render Detector

A React 19 DevTool panel that tracks and visualizes component render behavior, prop changes, and performance insights in real-time.

## 🎯 Overview

This project provides a comprehensive rendering tracker for React applications with:

- **Live Component Overview** — Monitor all tracked components with render counts and severity levels
- **Detailed Render History** — View prop diffs for each render event with change reasoning
- **Performance Insights** — Automatic detection of high-render counts and reference instability issues
- **Keyboard Navigation** — Full WCAG 2.1 AA accessibility support with arrow keys and Escape

## 🚀 Quick Start

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app starts at `http://localhost:5176` with the render tracker panel visible in the bottom-right corner.

### Testing

```bash
npm test                # Run all tests
npm run test:coverage   # Generate coverage report
npm run lint            # Lint with ESLint
```

## 📦 Project Structure

```
src/
├── render-tracker/          # Engine (state management)
│   ├── types.ts            # RenderEvent, RenderReason types
│   ├── store.ts            # Singleton renderStore with subscribe/append
│   ├── useRenderTracker.ts # App-facing hook for tracking props
│   ├── shallowDiff.ts      # Prop comparison logic
│   └── __tests__/          # Engine tests (30 tests)
│
├── render-tracker-ui/       # UI Panel (React components)
│   ├── types.ts            # View-model types (ComponentSummary, PropValueDisplay)
│   ├── computeSummaries.ts # Severity + insight derivation
│   ├── computeEventRows.ts # Render event formatting
│   ├── useRenderSnapshot.ts # Hook subscribing to store
│   ├── RenderTrackerPanel.tsx
│   ├── ComponentListView.tsx
│   ├── ComponentDetailView.tsx
│   ├── InsightBadge.tsx
│   └── __tests__/          # UI tests (58 tests)
│
└── App.tsx                 # Test harness with interactive controls
```

## 🧪 Test UI Controls

The demo app includes interactive controls to test rendering behavior:

- **Counter Button** — Basic state increment
- **Text Input** — Frequent re-renders on keystroke
- **Toggle Button** — Boolean state changes
- **Color Picker** — String state mutations
- **Item List** — Array manipulation (add/remove)
- **Dynamic Data** — Reference changes (tests instability detection)

## 📊 Tracking API

### Track a component's renders

```tsx
import { useRenderTracker } from './render-tracker'

function MyComponent({ prop1, prop2 }) {
  useRenderTracker('MyComponent', { prop1, prop2 })
  // ... component logic
}
```

### Access render history (devtools only)

```tsx
import { RenderTrackerPanel } from './render-tracker-ui'

// In development only (automatically tree-shaken in production)
if (import.meta.env.DEV) {
  return <RenderTrackerPanel />
}
```

## 🎨 Features

### Live Component Overview
- **Render Count** — Total renders per component with severity badge
- **Severity Levels** — Low (1–5), Medium (6–20), High (>20)
- **Insight Badges** — Warnings and hints for performance issues

### Performance Insights
- ⚠️ **High Render Warning** — Triggers when >20 renders detected
- 💾 **Reference Instability Hint** — Shows when 5+ consecutive renders are due to reference changes (suggests useMemo/useCallback)

### Detailed View
- **Event History** — Chronological list of renders with 1-based numbering
- **Prop Diffs** — Table comparing current vs. previous prop values
- **Change Reasoning** — Labels showing why re-render occurred

## 📈 Test Coverage

```
All files          |   95.17 |    91.57 |   97.29 |   97.01 |
 render-tracker-ui |     100 |    95.23 |     100 |     100 |
 render-tracker    |   90.54 |    84.37 |   92.85 |   94.28 |
```

**88/88 tests passing** — 0 TypeScript errors, 0 ESLint warnings

## ⌨️ Keyboard Shortcuts

- **Arrow Up/Down** — Navigate component list
- **Enter** — Select component to view details
- **Escape** — Close detail view / return to overview

## 🔧 Tech Stack

- **React 19** — Latest hooks API (useSyncExternalStore)
- **TypeScript 5.9** — Strict mode with branded types
- **Vite 8** — Fast builds and HMR
- **Vitest 3** — Testing framework with jsdom + node environments
- **@testing-library/react** — Component testing utilities

## 📋 Constitution Principles

This project adheres to strict development guidelines:

1. ✅ **Component-First** — All UI in function components with explicit return types
2. ✅ **Strict TypeScript** — `strict: true`, no index access without guards
3. ✅ **Test-First** — Red-gate TDD for all features (tests before implementation)
4. ✅ **Performance-Aware** — Tree-shaking via `import.meta.env.DEV` guards
5. ✅ **Accessible** — WCAG 2.1 AA compliance (aria labels, keyboard nav)

## 📝 License

MIT
