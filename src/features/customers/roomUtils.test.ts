import assert from 'node:assert/strict';
import test from 'node:test';

// @ts-expect-error Node runs this check with native TypeScript stripping.
import { canAllocateCustomer, getRoomSummary, staysOverlap } from './roomUtils.ts';

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

test('allocation capacity blocks concurrent hotel, PG, and library conflicts', () => {
  const stay = { id: 'candidate', businessType: 'pg', moveInDate: '2026-09-10', room: 'Room 101', status: 'booked' };
  const firstPg = { ...stay, id: 'first' };
  const secondPg = { ...stay, id: 'second' };
  const hotel = { ...stay, businessType: 'hotel', id: 'hotel' };
  const member = { ...stay, businessType: 'library', id: 'member', room: 'Seat A01' };

  assert.equal(canAllocateCustomer(stay, [firstPg]), true);
  assert.equal(canAllocateCustomer(stay, [firstPg, secondPg]), false);
  assert.equal(canAllocateCustomer(stay, [hotel]), false);
  assert.equal(canAllocateCustomer(member, [{ ...member, id: 'existing' }]), false);
});
