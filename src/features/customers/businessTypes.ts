export const businessTypes = {
  hotel: {
    customerLabel: 'Guest',
    feeLabel: 'Stay Charge',
    id: 'hotel',
    label: 'Hotel',
    unitLabel: 'Room',
  },
  library: {
    customerLabel: 'Member',
    feeLabel: 'Membership Fee',
    id: 'library',
    label: 'Library',
    unitLabel: 'Seat',
  },
  pg: {
    customerLabel: 'Tenant',
    feeLabel: 'Monthly Rent',
    id: 'pg',
    label: 'PG',
    unitLabel: 'Room',
  },
};

export type BusinessTypeId = keyof typeof businessTypes;

export const businessTypeOptions = Object.values(businessTypes);

export function getBusinessType(type: unknown) {
  const key = String(type || 'pg') as BusinessTypeId;
  return businessTypes[key] || businessTypes.pg;
}
