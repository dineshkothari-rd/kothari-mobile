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
    title: 'Secure login',
    description: 'Only approved accounts can open the app.',
    status: 'ready',
  },
  {
    id: 'overview',
    title: 'Home',
    description: 'A quick look at payments, dues, expenses, and follow-ups.',
    status: 'next',
  },
  {
    id: 'tenants',
    title: 'Customers',
    description: 'Manage PG tenants, hotel guests, library members, rooms, and seats.',
    sourceCollection: 'tenants',
    status: 'planned',
  },
  {
    id: 'dues',
    title: 'Dues',
    description: 'See who has paid and who still has balance due.',
    status: 'planned',
  },
  {
    id: 'payments',
    title: 'Payments',
    description: 'Record payments and review past collections.',
    sourceCollection: 'payments',
    status: 'planned',
  },
  {
    id: 'expenses',
    title: 'Cash flow',
    description: 'Track expenses, income, and net balance.',
    sourceCollection: 'expenses',
    status: 'planned',
  },
  {
    id: 'enquiries',
    title: 'Enquiries',
    description: 'Follow up with interested people and convert them to customers.',
    sourceCollection: 'enquiries',
    status: 'planned',
  },
  {
    id: 'notices',
    title: 'Notices',
    description: 'Share updates and important messages.',
    sourceCollection: 'notices',
    status: 'planned',
  },
  {
    id: 'meter',
    title: 'Meter Readings',
    description: 'Add room meter readings and calculate bills.',
    sourceCollection: 'meterReadings',
    status: 'planned',
  },
];
