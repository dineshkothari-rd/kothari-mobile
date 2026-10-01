import assert from 'node:assert/strict';
import test from 'node:test';

// @ts-expect-error Node runs this check with native TypeScript stripping.
import { maskDocumentId } from './customerUtils.ts';

test('private document numbers are masked in customer cards', () => {
  assert.equal(maskDocumentId('ABCD12345678'), '•••• 5678');
  assert.equal(maskDocumentId(''), '-');
});
