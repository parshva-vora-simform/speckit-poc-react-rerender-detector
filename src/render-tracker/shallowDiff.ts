import type { DiffResult, RenderReason } from './types';

/**
 * Checks whether two non-primitive values are shallowly equal.
 * "Shallowly equal" means both have the same enumerable own-keys and all
 * corresponding values are strictly equal (===).
 *
 * This is intentionally one-level deep. Functions have zero own-keys, so two
 * distinct function references are considered shallowly equal here — resolved
 * to reference-change at the caller level.
 */
function isShallowEqual(
  a: unknown,
  b: unknown,
): boolean {
  if (a === b) return true;
  // Require both operands to be non-null objects OR functions.
  // Functions are non-primitives; two distinct function references with zero
  // own-keys are considered shallowly equal → classified as reference-change.
  const aIsObject = a !== null && (typeof a === 'object' || typeof a === 'function');
  const bIsObject = b !== null && (typeof b === 'object' || typeof b === 'function');
  if (!aIsObject || !bIsObject) return false;

  const aKeys = Object.keys(a as Record<string, unknown>);
  const bKeys = Object.keys(b as Record<string, unknown>);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    const aVal = (a as Record<string, unknown>)[key];
    const bVal = (b as Record<string, unknown>)[key];
    if (aVal !== bVal) return false;
  }
  return true;
}

/**
 * Compares two prop snapshots and returns a classified diff result.
 *
 * Algorithm (two-pass):
 *   1. For each key in the union of prev and next keys:
 *      a. If prev[key] === next[key] → no change for this key
 *      b. If isShallowEqual(prev[key], next[key]) → reference-change for this key
 *      c. Otherwise → value-change for this key
 *   2. Derive overall reason:
 *      props-change > reference-change > parent-render
 *
 * @pure No side effects. Safe to call in the render body.
 */
export function shallowDiff(
  prev: Readonly<Record<string, unknown>> | null,
  next: Readonly<Record<string, unknown>>,
): DiffResult {
  // First render — no previous snapshot
  if (prev === null) {
    return {
      reason: 'parent-render',
      changedKeys: [],
      valueChangedKeys: [],
      referenceChangedKeys: [],
    };
  }

  const valueChangedKeys: string[] = [];
  const referenceChangedKeys: string[] = [];

  // Build union of all keys from prev and next
  const allKeys = new Set([
    ...Object.keys(prev),
    ...Object.keys(next),
  ]);

  for (const key of allKeys) {
    const prevVal = prev[key];
    const nextVal = next[key];

    if (prevVal === nextVal) {
      // Strict equality — no change for this key
      continue;
    }

    // Values differ by reference; check if they are shallowly equal
    if (isShallowEqual(prevVal, nextVal)) {
      referenceChangedKeys.push(key);
    } else {
      valueChangedKeys.push(key);
    }
  }

  // Derive overall reason: props-change > reference-change > parent-render
  let reason: RenderReason;
  let changedKeys: string[];

  if (valueChangedKeys.length > 0) {
    reason = 'props-change';
    changedKeys = valueChangedKeys;
  } else if (referenceChangedKeys.length > 0) {
    reason = 'reference-change';
    changedKeys = referenceChangedKeys;
  } else {
    reason = 'parent-render';
    changedKeys = [];
  }

  return {
    reason,
    changedKeys,
    valueChangedKeys,
    referenceChangedKeys,
  };
}
