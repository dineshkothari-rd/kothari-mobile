export type FirestoreRecord = {
  id: string;
  [key: string]: unknown;
};

export type TenantRecord = FirestoreRecord & {
  businessType?: string;
  documentId?: string;
  fullName?: string;
  email?: string;
  idProof?: string | null;
  idProofName?: string | null;
  idProofSize?: number;
  idProofType?: string | null;
  moveInTime?: string;
  moveInDate?: string;
  moveOutDate?: string;
  moveOutTime?: string;
  name?: string;
  phone?: string;
  rent?: number | string;
  room?: string;
  roomType?: string;
  services?: string[];
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

export type EnquiryRecord = FirestoreRecord & {
  businessType?: string;
  createdAt?: {
    seconds?: number;
    toDate?: () => Date;
  };
  email?: string;
  message?: string;
  name?: string;
  phone?: string;
  roomType?: string;
  status?: string;
};

export type NoticeRecord = FirestoreRecord & {
  createdAt?: {
    seconds?: number;
    toDate?: () => Date;
  };
  message?: string;
  title?: string;
  type?: string;
};

export type MeterReadingRecord = FirestoreRecord & {
  billAmount?: number | string;
  currentReading?: number | string;
  month?: string;
  note?: string;
  previousReading?: number | string;
  ratePerUnit?: number | string;
  tenantId?: string;
  tenantName?: string;
  tenantRoom?: string;
  unitsConsumed?: number | string;
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
