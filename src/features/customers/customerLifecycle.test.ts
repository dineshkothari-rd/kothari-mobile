import assert from 'node:assert/strict';
import test from 'node:test';

// @ts-expect-error Node runs this check with native TypeScript stripping.
import { getLifecycleGroup, getLifecycleLabel, getStartNowStatus } from './customerLifecycle.ts';

test('uses a reservation before service starts and business-aware active labels', () => {
  assert.equal(getLifecycleGroup('booked'), 'reserved');
  assert.equal(getLifecycleLabel('booked', 'pg'), 'Move-in pending');
  assert.equal(getLifecycleLabel('booked', 'hotel'), 'Booked');
  assert.equal(getStartNowStatus('library'), 'active');
  assert.equal(getStartNowStatus('pg'), 'checked in');
});
