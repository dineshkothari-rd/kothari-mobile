export type FirestoreRecord = {
  id: string;
  [key: string]: unknown;
};

export type TenantRecord = FirestoreRecord & {
  businessType?: string;
  fullName?: string;
  moveInDate?: string;
  moveOutDate?: string;
  moveOutTime?: string;
  name?: string;
  phone?: string;
  rent?: number | string;
  room?: string;
  status?: string;
  tenantName?: string;
};

export type PaymentRecord = FirestoreRecord & {
  amount?: number | string;
  amountPaid?: number | string;
  balance?: number | string;
  month?: string;
  name?: string;
  paid?: number | string;
  paidOn?: string;
  status?: string;
  tenantId?: string;
  tenantName?: string;
  tenantRoom?: string;
  totalRent?: number | string;
  userId?: string;
};

export type ExpenseRecord = FirestoreRecord & {
  amount?: number | string;
  category?: string;
  cost?: number | string;
  date?: string;
  description?: string;
  expenseDate?: string;
  name?: string;
  title?: string;
  total?: number | string;
};

export type DueRecord = {
  balance: number;
  businessType: string;
  id: string;
  month: string;
  paid: number;
  phone: string;
  rent: number;
  status: 'Paid' | 'Partial' | 'Pending';
  tenantId: string;
  tenantName: string;
  tenantRoom: string;
};
