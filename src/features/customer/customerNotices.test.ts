import assert from 'node:assert/strict';
import test from 'node:test';

// @ts-expect-error Node runs this check with native TypeScript stripping.
import { mergeCustomerNotices } from './customerNotices.ts';

test('merges broadcast and direct notices without duplicates and newest first', () => {
  const shared = { id: 'shared', createdAt: { seconds: 2 } };
  const result = mergeCustomerNotices(
    [{ id: 'old', createdAt: { seconds: 1 } }, shared],
    [shared, { id: 'new', createdAt: { seconds: 3 } }],
  );

  assert.deepEqual(result.map(({ id }) => id), ['new', 'shared', 'old']);
});
