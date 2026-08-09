import type { TenantRecord } from '../../shared/types/records';

export const ROOM_START = 101;
export const ROOM_COUNT = 15;

export const roomNumbers = Array.from({ length: ROOM_COUNT }, (_, index) => String(ROOM_START + index));
export const bedLabels = ['Bed A', 'Bed B'] as const;

export function parseRoomLabel(value: unknown) {
  const text = String(value || '');
  const roomMatch = text.match(/Room\s+(\d+)/i);
  const legacyRoomMatch = text.match(/^(\d{1,3})\b/);
  const rawRoom = roomMatch?.[1] || legacyRoomMatch?.[1] || '';
  const room = rawRoom ? rawRoom.padStart(3, '0') : '';
  const bed = text.includes('Bed A')
    ? 'Bed A'
    : text.includes('Bed B')
      ? 'Bed B'
      : /Full Room|Double Room|Single/i.test(text)
        ? 'Full Room'
        : '';

  return { bed, room };
}

export function isRoomCustomer(customer: TenantRecord) {
  const businessType = customer.businessType || 'pg';

  if (!['pg', 'hotel'].includes(businessType)) return false;

  const status = String(customer.status || 'active').toLowerCase();
  const activeStatuses = ['active', 'booked', 'checked in', 'occupied'];

  if (!activeStatuses.includes(status)) return false;

  if (customer.moveOutDate) {
    const checkout = new Date(`${customer.moveOutDate}T${customer.moveOutTime || '11:00'}`);

    if (!Number.isNaN(checkout.getTime()) && checkout.getTime() < Date.now()) {
      return false;
    }
  }

  return Boolean(parseRoomLabel(customer.room).room);
}

export function getRoomSummary(customers: TenantRecord[]) {
  const activeRoomCustomers = customers.filter(isRoomCustomer);
  const occupiedRooms = new Set(activeRoomCustomers.map((customer) => parseRoomLabel(customer.room).room));

  return {
    activeRoomCustomers: activeRoomCustomers.length,
    availableRooms: Math.max(0, ROOM_COUNT - occupiedRooms.size),
    occupiedRooms: occupiedRooms.size,
    totalRooms: ROOM_COUNT,
  };
}

export function getRoomOccupancy(customers: TenantRecord[]) {
  const activeRoomCustomers = customers.filter(isRoomCustomer);

  return roomNumbers.map((room) => {
    const occupants = activeRoomCustomers.filter((customer) => parseRoomLabel(customer.room).room === room);

    return {
      availableBeds: Math.max(0, 2 - occupants.length),
      occupants,
      room,
      status: occupants.length >= 2 ? 'Full' : occupants.length === 1 ? 'Partial' : 'Open',
    };
  });
}
