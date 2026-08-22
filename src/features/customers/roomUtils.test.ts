import assert from 'node:assert/strict';
import test from 'node:test';

// @ts-expect-error Node runs this check with native TypeScript stripping.
import { getRoomSummary, staysOverlap } from './roomUtils.ts';

test('future reservations hold inventory without counting as occupied rooms', () => {
  const customers = [
    { id: 'reservation', businessType: 'hotel', moveInDate: '2026-09-10', moveOutDate: '2026-09-12', room: 'Room 101', status: 'booked' },
    { id: 'guest', businessType: 'hotel', moveInDate: '2026-08-20', moveOutDate: '2026-08-24', room: 'Room 102', status: 'checked in' },
  ];
  const summary = getRoomSummary(customers, new Date(2026, 7, 22).getTime());
  assert.equal(summary.occupiedRooms, 1);
  assert.equal(summary.availableRooms, 10);
});

test('back-to-back reservations share a room but overlapping stays do not', () => {
  const first = { id: 'first', moveInDate: '2026-09-10', moveInTime: '12:00', moveOutDate: '2026-09-12', moveOutTime: '11:00', status: 'booked' };
  const next = { id: 'next', moveInDate: '2026-09-12', moveInTime: '12:00', moveOutDate: '2026-09-13', moveOutTime: '11:00', status: 'booked' };
  const overlap = { ...next, id: 'overlap', moveInDate: '2026-09-11' };

  assert.equal(staysOverlap(first, next), false);
  assert.equal(staysOverlap(first, overlap), true);
});
