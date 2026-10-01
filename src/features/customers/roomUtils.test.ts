import assert from 'node:assert/strict';
import test from 'node:test';

// @ts-expect-error Node runs this check with native TypeScript stripping.
import { canAllocateCustomer, getInventoryCalendar, getRoomSummary, PG_ROOM_CAPACITY, ROOM_COUNT, staysOverlap } from './roomUtils.ts';

test('future reservations hold inventory without counting as occupied rooms', () => {
  const customers = [
    { id: 'reservation', businessType: 'hotel', moveInDate: '2026-09-10', moveOutDate: '2026-09-12', room: 'Room 101', status: 'booked' },
    { id: 'guest', businessType: 'hotel', moveInDate: '2026-08-20', moveOutDate: '2026-08-24', room: 'Room 102', status: 'checked in' },
  ];
  const summary = getRoomSummary(customers, new Date(2026, 7, 22).getTime());
  assert.equal(summary.occupiedRooms, 1);
  assert.equal(summary.availableRooms, ROOM_COUNT - 1);
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
  const existingPgCustomers = Array.from({ length: PG_ROOM_CAPACITY }, (_, index) => ({ ...stay, id: `pg-${index}` }));
  const hotel = { ...stay, businessType: 'hotel', id: 'hotel' };
  const member = { ...stay, businessType: 'library', id: 'member', room: 'Seat A01' };

  assert.equal(canAllocateCustomer(stay, existingPgCustomers.slice(0, -1)), true);
  assert.equal(canAllocateCustomer(stay, existingPgCustomers), false);
  assert.equal(canAllocateCustomer(stay, [hotel]), false);
  assert.equal(canAllocateCustomer(member, [{ ...member, id: 'existing' }]), false);
});

test('inventory calendar shows future room, bed and seat commitments', () => {
  const customers = [
    { id: 'pg', businessType: 'pg', moveInDate: '2026-09-22', moveOutDate: '2026-09-24', room: 'Room 101 / Bed A', status: 'booked' },
    { id: 'seat', businessType: 'library', moveInDate: '2026-09-22', moveOutDate: '2026-09-23', room: 'Seat A01', status: 'active' },
  ];
  const [day] = getInventoryCalendar(customers, new Date(2026, 8, 22), 1);

  assert.equal(day.occupiedRooms, 1);
  assert.equal(day.openBeds, ROOM_COUNT * PG_ROOM_CAPACITY - 1);
  assert.equal(day.busySeats, 1);
  assert.equal(day.reservations, 1);
  const [previousDay] = getInventoryCalendar(customers, new Date(2026, 8, 21), 1);
  assert.equal(previousDay.occupiedRooms, 0);
  assert.equal(previousDay.busySeats, 0);
});
