export const businessTypes = {
  hotel: {
    allocationCapacity: 1,
    allocationHelp: 'One guest booking per room for the selected stay.',
    allocationTitle: 'Available hotel rooms',
    customerLabel: 'Guest',
    detailsHint: 'Add stay dates, services, and ID proof after the room is reserved.',
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
    allocationHelp: 'Assign one available reading seat to each active member.',
    allocationTitle: 'Available library seats',
    customerLabel: 'Member',
    detailsHint: 'Keep membership dates, facilities, and ID proof here.',
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
    allocationHelp: 'Show only rooms with vacant beds, plus the current room while editing.',
    allocationTitle: 'Available PG rooms',
    customerLabel: 'Tenant',
    detailsHint: 'Move-in dates, included facilities, and ID proof can be completed after allocation.',
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
