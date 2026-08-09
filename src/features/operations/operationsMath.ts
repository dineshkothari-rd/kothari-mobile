import type { DueRecord, ExpenseRecord, PaymentRecord, TenantRecord } from '../../shared/types/records';
import { toNumber } from '../../shared/utils/money';

const activeStatuses = new Set(['active', 'booked', 'checked in', 'occupied']);

function getMonthEndDate(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(year, monthNumber, 0, 23, 59, 59, 999);
}

export function getMonthKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getTenantName(tenant: TenantRecord) {
  return tenant.name || tenant.fullName || tenant.tenantName || 'Unnamed';
}

export function getPaymentTenantId(payment: PaymentRecord) {
  return payment.tenantId || payment.userId || '';
}

export function getPaymentAmount(payment: PaymentRecord) {
  return toNumber(payment.amountPaid ?? payment.amount ?? payment.paid);
}

export function getExpenseAmount(expense: ExpenseRecord) {
  return toNumber(expense.amount ?? expense.total ?? expense.cost);
}

export function getCollectedTotal(payments: PaymentRecord[] = []) {
  return payments.reduce((sum, payment) => sum + getPaymentAmount(payment), 0);
}

export function getExpenseTotal(expenses: ExpenseRecord[] = []) {
  return expenses.reduce((sum, expense) => sum + getExpenseAmount(expense), 0);
}

export function isTenantActiveForMonth(tenant: TenantRecord, month: string) {
  const status = String(tenant.status || 'active').toLowerCase();

  if (!activeStatuses.has(status)) return false;
  if (!tenant.moveInDate) return true;

  const moveInDate = new Date(tenant.moveInDate);
  if (Number.isNaN(moveInDate.getTime())) return true;

  return moveInDate <= getMonthEndDate(month);
}

function getDueStatus(rent: number, paid: number): DueRecord['status'] {
  const balance = Math.max(0, rent - paid);

  if (balance <= 0 && rent > 0) return 'Paid';
  if (paid > 0) return 'Partial';
  return 'Pending';
}

export function calculateMonthlyDues(
  tenants: TenantRecord[] = [],
  payments: PaymentRecord[] = [],
  month = getMonthKey(),
): DueRecord[] {
  const paymentsByTenant = payments.reduce<Record<string, number>>((map, payment) => {
    const tenantId = getPaymentTenantId(payment);

    if (!tenantId || payment.month !== month) return map;

    map[tenantId] = (map[tenantId] || 0) + getPaymentAmount(payment);
    return map;
  }, {});

  return tenants
    .filter((tenant) => isTenantActiveForMonth(tenant, month))
    .map((tenant) => {
      const rent = toNumber(tenant.rent);
      const paid = paymentsByTenant[tenant.id] || 0;
      const balance = Math.max(0, rent - paid);

      return {
        balance,
        businessType: tenant.businessType || 'pg',
        id: `${tenant.id}-${month}`,
        month,
        paid,
        phone: tenant.phone || '',
        rent,
        status: getDueStatus(rent, paid),
        tenantId: tenant.id,
        tenantName: getTenantName(tenant),
        tenantRoom: tenant.room || '',
      };
    });
}

export function summarizeDues(dues: DueRecord[] = []) {
  return dues.reduce(
    (summary, due) => {
      summary.expected += due.rent;
      summary.collected += due.paid;
      summary.balance += due.balance;

      if (due.status === 'Paid') summary.paidCount += 1;
      if (due.status === 'Partial') summary.partialCount += 1;
      if (due.status === 'Pending') summary.pendingCount += 1;

      return summary;
    },
    {
      balance: 0,
      collected: 0,
      expected: 0,
      paidCount: 0,
      partialCount: 0,
      pendingCount: 0,
    },
  );
}
