import type { TenantRecord } from '../../shared/types/records';
import { getBusinessType } from './businessTypes';

export const customerStatusOptions = [
  { label: 'All', value: '' },
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Staying', value: 'staying' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

export function getCustomerName(customer: TenantRecord) {
  return customer.name || customer.fullName || customer.tenantName || 'Unnamed customer';
}

export function getCustomerStatus(customer: TenantRecord) {
  return String(customer.status || 'active').trim().toLowerCase();
}

export function getCustomerStatusGroup(customer: TenantRecord) {
  const status = getCustomerStatus(customer);

  if (status === 'booked') return 'upcoming';
  if (['checked out', 'inactive'].includes(status)) return 'completed';
  if (status === 'cancelled') return 'cancelled';
  return 'staying';
}

export function getCustomerStatusLabel(customer: TenantRecord) {
  const group = getCustomerStatusGroup(customer);

  if (group === 'upcoming') return 'Upcoming';
  if (group === 'completed') return 'Completed';
  if (group === 'cancelled') return 'Cancelled';
  return 'Staying';
}

export function matchesCustomerSearch(customer: TenantRecord, search: string) {
  const query = search.trim().toLowerCase();

  if (!query) return true;

  return [getCustomerName(customer), customer.room, customer.phone, customer.email, customer.documentId]
    .some((value) => String(value || '').toLowerCase().includes(query));
}

export function getCustomerSubtitle(customer: TenantRecord) {
  const businessType = getBusinessType(customer.businessType);

  return `${businessType.label} - ${getCustomerAllocationLabel(customer)}`;
}

export function getCustomerAllocationLabel(customer: Pick<TenantRecord, 'businessType' | 'room'>) {
  const businessType = getBusinessType(customer.businessType);
  const allocation = String(customer.room || '').trim();

  if (!allocation) return 'No allocation';

  return allocation.toLowerCase().startsWith(businessType.unitLabel.toLowerCase())
    ? allocation
    : `${businessType.unitLabel} ${allocation}`;
}
