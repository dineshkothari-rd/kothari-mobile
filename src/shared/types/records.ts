export type FirestoreRecord = {
  id: string;
  [key: string]: unknown;
};

export type TenantRecord = FirestoreRecord & {
  additionalGuests?: string[];
  businessType?: string;
  documentId?: string;
  documentType?: string;
  fullName?: string;
  email?: string;
  accessStatus?: 'active' | 'invited' | 'revoked' | 'suspended';
  idProof?: string | null;
  idProofName?: string | null;
  idProofSize?: number;
  idProofType?: string | null;
  idProofBack?: string | null;
  idProofBackName?: string | null;
  idProofBackSize?: number;
  customerPhoto?: string | null;
  customerPhotoName?: string | null;
  customerPhotoSize?: number;
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
  checkedOutAt?: {
    seconds?: number;
    toDate?: () => Date;
  };
  checkedInAt?: {
    seconds?: number;
    toDate?: () => Date;
  };
  checkInMeterReading?: number | string;
  checkInMeterReadingId?: string;
  checkOutMeterReading?: number | string;
  checkOutMeterReadingId?: string;
  checkInDate?: string;
  checkOutDate?: string;
  checkoutDate?: string;
  checkoutTime?: string;
  endDate?: string;
  tenantName?: string;
  userId?: string;
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
  createdAt?: {
    seconds?: number;
    toDate?: () => Date;
  };
  updatedAt?: {
    seconds?: number;
    toDate?: () => Date;
  };
  date?: string;
  note?: string;
  businessType?: string;
  voidedAt?: { seconds?: number; toDate?: () => Date };
  voidedBy?: string;
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
  status?: string;
  voidedAt?: { seconds?: number; toDate?: () => Date };
  voidedBy?: string;
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
  audience?: 'all' | 'customer' | 'staff';
  createdAt?: {
    seconds?: number;
    toDate?: () => Date;
  };
  message?: string;
  tenantId?: string;
  tenantName?: string;
  title?: string;
  type?: string;
};

export type SupportRequestRecord = FirestoreRecord & {
  createdAt?: { seconds?: number; toDate?: () => Date };
  createdBy?: string;
  customerId?: string;
  customerName?: string;
  message?: string;
  response?: string;
  status?: 'in_progress' | 'open' | 'resolved';
  type?: 'issue' | 'profile_correction';
  updatedAt?: { seconds?: number; toDate?: () => Date };
  updatedBy?: string;
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
  readingType?: 'check-in' | 'check-out' | 'manual';
  photo?: string;
  photoSize?: number;
  ocrText?: string;
  readingSource?: string;
  createdAt?: {
    seconds?: number;
    toDate?: () => Date;
  };
};

export type DueRecord = {
  baseAmount: number;
  balance: number;
  businessType: string;
  id: string;
  meterAmount: number;
  month: string;
  paid: number;
  phone: string;
  rent: number;
  status: 'Paid' | 'Partial' | 'Pending';
  tenantId: string;
  tenantName: string;
  tenantRoom: string;
};
