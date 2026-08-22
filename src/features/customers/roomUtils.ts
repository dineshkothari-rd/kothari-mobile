import type { TenantRecord } from '../../shared/types/records';
import { getCustomerStatus } from './customerUtils';

export const ROOM_START = 101;
export const ROOM_COUNT = 11;

export const roomNumbers = Array.from({ length: ROOM_COUNT }, (_, index) => String(ROOM_START + index));
export const bedLabels = ['Bed A', 'Bed B'] as const;

function getTimestampDate(value: unknown) {
  if (value instanceof Date) return value;

  if (value && typeof value === 'object') {
    if ('toDate' in value && typeof value.toDate === 'function') return value.toDate();
    if ('seconds' in value && typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  }

  return null;
}

export function parseStayDate(value: unknown, time: unknown = '', endOfDay = false) {
  const timestampDate = getTimestampDate(value);

  if (timestampDate && !Number.isNaN(timestampDate.getTime())) return timestampDate;

  const text = String(value || '').trim();
  if (!text) return null;

  const dateOnly = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  const indianDate = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  const parts = dateOnly
    ? [Number(dateOnly[1]), Number(dateOnly[2]), Number(dateOnly[3])]
    : indianDate
      ? [Number(indianDate[3]), Number(indianDate[2]), Number(indianDate[1])]
      : null;

  if (parts) {
    const timeMatch = String(time || '').trim().match(/^(\d{1,2}):(\d{2})/);
    const hour = timeMatch ? Number(timeMatch[1]) : endOfDay ? 23 : 0;
    const minute = timeMatch ? Number(timeMatch[2]) : endOfDay ? 59 : 0;
    const date = new Date(parts[0], parts[1] - 1, parts[2], hour, minute, endOfDay && !timeMatch ? 59 : 0, endOfDay && !timeMatch ? 999 : 0);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getStayCheckout(customer: TenantRecord) {
  const checkoutTime = customer.moveOutTime || customer.checkoutTime;

  for (const checkoutValue of [customer.moveOutDate, customer.checkOutDate, customer.checkoutDate, customer.endDate, customer.checkedOutAt]) {
    const parsed = parseStayDate(checkoutValue, checkoutTime, !checkoutTime);
    if (parsed) return parsed;
  }

  return null;
}

function getStayStart(customer: TenantRecord) {
  for (const startValue of [customer.moveInDate, customer.checkInDate, customer.checkedInAt]) {
    const parsed = parseStayDate(startValue, customer.moveInTime);
    if (parsed) return parsed;
  }

  return null;
}

export function staysOverlap(first: TenantRecord, second: TenantRecord) {
  if ([getCustomerStatus(first), getCustomerStatus(second)].includes('cancelled')) return false;

  const firstStart = getStayStart(first);
  const secondStart = getStayStart(second);
  const firstEnd = getStayCheckout(first);
  const secondEnd = getStayCheckout(second);

  return (firstStart?.getTime() ?? Number.NEGATIVE_INFINITY) < (secondEnd?.getTime() ?? Number.POSITIVE_INFINITY)
    && (secondStart?.getTime() ?? Number.NEGATIVE_INFINITY) < (firstEnd?.getTime() ?? Number.POSITIVE_INFINITY);
}

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

export function isRoomCustomer(customer: TenantRecord, now = Date.now()) {
  const businessType = customer.businessType || 'pg';

  if (!['pg', 'hotel'].includes(businessType)) return false;

  const status = getCustomerStatus(customer);
  const activeStatuses = ['active', 'booked', 'checked in', 'occupied'];

  if (!activeStatuses.includes(status)) return false;

  const checkout = getStayCheckout(customer);
  const isLegacyLifecycle = !customer.checkedInAt && !customer.checkedOutAt;
  if (isLegacyLifecycle && checkout && checkout.getTime() <= now) return false;

  return Boolean(parseRoomLabel(customer.room).room);
}

export function isRoomOccupied(customer: TenantRecord, now = Date.now()) {
  return getCustomerStatus(customer) !== 'booked' && isRoomCustomer(customer, now);
}

export function getRoomSummary(customers: TenantRecord[], now = Date.now()) {
  const activeRoomCustomers = customers.filter((customer) => isRoomOccupied(customer, now));
  const occupiedRooms = new Set(activeRoomCustomers.map((customer) => parseRoomLabel(customer.room).room));

  return {
    activeRoomCustomers: activeRoomCustomers.length,
    availableRooms: Math.max(0, ROOM_COUNT - occupiedRooms.size),
    occupiedRooms: occupiedRooms.size,
    totalRooms: ROOM_COUNT,
  };
}

export function getRoomOccupancy(customers: TenantRecord[], now = Date.now()) {
  const activeRoomCustomers = customers.filter((customer) => isRoomOccupied(customer, now));

  return roomNumbers.map((room) => {
    const occupants = activeRoomCustomers.filter((customer) => parseRoomLabel(customer.room).room === room);
    const businessType = occupants.some((customer) => customer.businessType === 'hotel') ? 'hotel' : occupants.length ? 'pg' : '';
    const capacity = businessType === 'hotel' ? 1 : 2;
    const guestCount = occupants.reduce(
      (count, customer) => count + 1 + (customer.businessType === 'hotel' && Array.isArray(customer.additionalGuests) ? customer.additionalGuests.filter(Boolean).length : 0),
      0,
    );

    return {
      availableBeds: Math.max(0, capacity - occupants.length),
      businessType,
      capacity,
      guestCount,
      occupants,
      room,
      status: occupants.length >= capacity ? 'Full' : occupants.length === 1 ? 'Partial' : 'Open',
    };
  });
}
