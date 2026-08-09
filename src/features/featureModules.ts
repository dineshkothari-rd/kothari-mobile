export type FeatureStatus = 'ready' | 'next' | 'planned';

export type FeatureModule = {
  id: string;
  title: string;
  description: string;
  sourceCollection?: string;
  status: FeatureStatus;
};

export const featureModules: FeatureModule[] = [
  {
    id: 'firebase',
    title: 'Firebase Core',
    description: 'Shared auth, Firestore, and environment configuration.',
    status: 'ready',
  },
  {
    id: 'overview',
    title: 'Operations Overview',
    description: 'Daily business summary with occupancy, dues, cash flow, and follow-ups.',
    status: 'next',
  },
  {
    id: 'tenants',
    title: 'Customers & Rooms',
    description: 'Customer profiles, room allocation, stay details, and ID proof flow.',
    sourceCollection: 'tenants',
    status: 'planned',
  },
  {
    id: 'dues',
    title: 'Dues',
    description: 'Monthly rent calculation, balances, and payment status.',
    status: 'planned',
  },
  {
    id: 'payments',
    title: 'Payments',
    description: 'Payment records, collections, and tenant-wise history.',
    sourceCollection: 'payments',
    status: 'planned',
  },
  {
    id: 'expenses',
    title: 'Cash Flow',
    description: 'Expenses, income view, categories, and net balance.',
    sourceCollection: 'expenses',
    status: 'planned',
  },
  {
    id: 'enquiries',
    title: 'Enquiries',
    description: 'Lead capture, status tracking, and follow-up notes.',
    sourceCollection: 'enquiries',
    status: 'planned',
  },
  {
    id: 'notices',
    title: 'Notices',
    description: 'Customer announcements and operational messages.',
    sourceCollection: 'notices',
    status: 'planned',
  },
  {
    id: 'meter',
    title: 'Meter Readings',
    description: 'Electric readings, usage, and billing support.',
    sourceCollection: 'meterReadings',
    status: 'planned',
  },
];
