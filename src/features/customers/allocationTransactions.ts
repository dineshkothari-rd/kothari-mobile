import { doc, serverTimestamp, type Transaction } from 'firebase/firestore';

import { db } from '../../lib/firebase/client';
import type { TenantRecord } from '../../shared/types/records';
import { getCustomerStatus } from './customerUtils';
import { canAllocateCustomer, getAllocationKey } from './roomUtils';

const allocationStatuses = new Set(['active', 'booked', 'checked in', 'occupied']);

type AllocationEntry = {
  businessType: string;
  customerId: string;
  id: string;
  moveInDate: string;
  moveInTime: string;
  moveOutDate: string;
  moveOutTime: string;
  status: string;
};

function getGuardId(customer: TenantRecord | undefined) {
  if (!customer || !allocationStatuses.has(getCustomerStatus(customer))) return '';
  const businessType = String(customer.businessType || 'pg');
  const allocation = getAllocationKey(customer.room, businessType);
  if (!allocation) return '';
  return businessType === 'library' ? `seat-${allocation}` : `room-${allocation}`;
}

function toEntry(customerId: string, customer: TenantRecord): AllocationEntry {
  return {
    businessType: String(customer.businessType || 'pg'),
    customerId,
    id: customerId,
    moveInDate: String(customer.moveInDate || customer.checkInDate || ''),
    moveInTime: String(customer.moveInTime || ''),
    moveOutDate: String(customer.moveOutDate || customer.checkOutDate || customer.checkoutDate || customer.endDate || ''),
    moveOutTime: String(customer.moveOutTime || customer.checkoutTime || ''),
    status: getCustomerStatus(customer),
  };
}

function assertAvailable(next: AllocationEntry, existing: AllocationEntry[]) {
  if (!canAllocateCustomer(next, existing)) {
    throw new Error('This room or seat was just assigned. Refresh and choose another.');
  }
}

export async function syncAllocationGuard(
  transaction: Transaction,
  customerId: string,
  previous: TenantRecord | undefined,
  next: TenantRecord,
  knownCustomers: TenantRecord[] = [],
) {
  const previousGuardId = getGuardId(previous);
  const nextGuardId = getGuardId(next);
  const guardIds = [...new Set([previousGuardId, nextGuardId].filter(Boolean))];
  const snapshots = await Promise.all(guardIds.map((guardId) => transaction.get(doc(db, 'allocationGuards', guardId))));

  const entriesByGuard = new Map<string, Map<string, AllocationEntry>>();
  guardIds.forEach((guardId, index) => {
    const stored = snapshots[index].data()?.reservations;
    const entries = new Map<string, AllocationEntry>();
    if (Array.isArray(stored)) {
      stored.forEach((entry) => {
        if (entry && typeof entry === 'object' && typeof entry.customerId === 'string') {
          entries.set(entry.customerId, { ...entry, id: entry.customerId } as AllocationEntry);
        }
      });
    }
    knownCustomers.forEach((customer) => {
      if (customer.id !== customerId && getGuardId(customer) === guardId && !entries.has(customer.id)) {
        entries.set(customer.id, toEntry(customer.id, customer));
      }
    });
    entries.delete(customerId);
    entriesByGuard.set(guardId, entries);
  });

  if (nextGuardId) {
    const nextEntry = toEntry(customerId, next);
    const entries = entriesByGuard.get(nextGuardId) || new Map<string, AllocationEntry>();
    assertAvailable(nextEntry, [...entries.values()]);
    entries.set(customerId, nextEntry);
    entriesByGuard.set(nextGuardId, entries);
  }

  guardIds.forEach((guardId) => {
    const guardRef = doc(db, 'allocationGuards', guardId);
    const reservations = [...(entriesByGuard.get(guardId)?.values() || [])];
    if (reservations.length) {
      // ponytail: one small active-reservation list per unit; use per-date lock docs if a unit ever carries hundreds of future bookings.
      transaction.set(guardRef, {
        inventoryType: guardId.startsWith('seat-') ? 'seat' : 'room',
        reservations,
        updatedAt: serverTimestamp(),
      });
    } else {
      transaction.delete(guardRef);
    }
  });
}
