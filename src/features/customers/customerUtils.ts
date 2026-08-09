import type { TenantRecord } from '../../shared/types/records';
import { getBusinessType } from './businessTypes';

export const customerStatusOptions = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Booked', value: 'booked' },
  { label: 'Checked In', value: 'checked in' },
  { label: 'Checked Out', value: 'checked out' },
  { label: 'Occupied', value: 'occupied' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Cancelled', value: 'cancelled' },
];

export function getCustomerName(customer: TenantRecord) {
  return customer.name || customer.fullName || customer.tenantName || 'Unnamed customer';
}

export function getCustomerStatus(customer: TenantRecord) {
  return String(customer.status || 'active').toLowerCase();
}

export function matchesCustomerSearch(customer: TenantRecord, search: string) {
  const query = search.trim().toLowerCase();

  if (!query) return true;

  return [getCustomerName(customer), customer.room, customer.phone, customer.email]
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
