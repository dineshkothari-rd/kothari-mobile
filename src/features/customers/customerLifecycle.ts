export type CustomerLifecycleGroup = 'reserved' | 'active' | 'completed' | 'cancelled';

export function getLifecycleGroup(status: unknown): CustomerLifecycleGroup {
  const value = String(status || 'active').trim().toLowerCase();

  if (value === 'booked') return 'reserved';
  if (['checked out', 'inactive'].includes(value)) return 'completed';
  if (value === 'cancelled') return 'cancelled';
  return 'active';
}

export function getStartNowStatus(businessType: unknown) {
  return businessType === 'library' ? 'active' : 'checked in';
}

export function getLifecycleLabel(status: unknown, businessType: unknown) {
  const group = getLifecycleGroup(status);

  if (group === 'reserved') return businessType === 'hotel' ? 'Booked' : businessType === 'library' ? 'Reserved' : 'Move-in pending';
  if (group === 'completed') return businessType === 'hotel' ? 'Checked Out' : businessType === 'library' ? 'Inactive' : 'Moved out';
  if (group === 'cancelled') return 'Cancelled';
  return businessType === 'library' ? 'Active' : 'Staying';
}
