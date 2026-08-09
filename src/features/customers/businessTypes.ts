export const businessTypes = {
  hotel: {
    allocationCapacity: 1,
    allocationHelp: 'Pick an open room for this guest.',
    allocationTitle: 'Available hotel rooms',
    customerLabel: 'Guest',
    detailsHint: 'Add stay dates, services, and ID proof when you have them.',
    endDateLabel: 'Check-out date',
    feeLabel: 'Stay Charge',
    flowLabel: 'Hotel booking',
    id: 'hotel',
    label: 'Hotel',
    services: ['WiFi', 'Breakfast', 'Housekeeping', 'Parking', 'AC', 'Room Service'],
    startDateLabel: 'Check-in date',
    statusOptions: [
      { label: 'Booked', value: 'booked' },
      { label: 'Checked In', value: 'checked in' },
      { label: 'Checked Out', value: 'checked out' },
      { label: 'Cancelled', value: 'cancelled' },
    ],
    unitLabel: 'Room',
    usesTimeFields: true,
  },
  library: {
    allocationCapacity: 1,
    allocationHelp: 'Enter the seat number you want to assign.',
    allocationTitle: 'Available library seats',
    customerLabel: 'Member',
    detailsHint: 'Add membership dates, facilities, and ID proof when ready.',
    endDateLabel: 'Membership end',
    feeLabel: 'Membership Fee',
    flowLabel: 'Library membership',
    id: 'library',
    label: 'Library',
    services: ['WiFi', 'Locker', 'AC', 'Power Backup', 'Quiet Zone', 'Reserved Seat'],
    startDateLabel: 'Membership start',
    statusOptions: [
      { label: 'Active', value: 'active' },
      { label: 'Reserved', value: 'booked' },
      { label: 'Inactive', value: 'inactive' },
    ],
    unitLabel: 'Seat',
    usesTimeFields: false,
  },
  pg: {
    allocationCapacity: 2,
    allocationHelp: 'Pick a room with space available.',
    allocationTitle: 'Available PG rooms',
    customerLabel: 'Tenant',
    detailsHint: 'Add move-in dates, facilities, and ID proof when ready.',
    endDateLabel: 'Expected move-out',
    feeLabel: 'Monthly Rent',
    flowLabel: 'PG tenant onboarding',
    id: 'pg',
    label: 'PG',
    services: ['WiFi', 'Meals', 'Laundry', 'Parking', 'AC', 'Power Backup'],
    startDateLabel: 'Move-in date',
    statusOptions: [
      { label: 'Active', value: 'active' },
      { label: 'Booked', value: 'booked' },
      { label: 'Occupied', value: 'occupied' },
      { label: 'Inactive', value: 'inactive' },
    ],
    unitLabel: 'Room',
    usesTimeFields: false,
  },
};

export type BusinessTypeId = keyof typeof businessTypes;

export const businessTypeOptions = Object.values(businessTypes);

export function getBusinessType(type: unknown) {
  const key = String(type || 'pg') as BusinessTypeId;
  return businessTypes[key] || businessTypes.pg;
}
