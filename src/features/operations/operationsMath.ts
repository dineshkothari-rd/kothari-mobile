import type { DueRecord, ExpenseRecord, MeterReadingRecord, PaymentRecord, TenantRecord } from '../../shared/types/records';
import { toNumber } from '../../shared/utils/money';
import { getCustomerStatusGroup } from '../customers/customerUtils';

const activeStatuses = new Set(['active', 'checked in', 'occupied']);
const completedStatuses = new Set(['checked out', 'inactive']);
export const MAX_BILLABLE_METER_UNITS = 10_000;

export function getMeterReadingCandidates(text: string, minimumReading: number) {
  const matches = text.replace(/[oO]/g, '0').match(/\d+(?:[.,]\d+)?/g) || [];

  return [...new Set(matches.map((match) => Number(match.replace(',', '.'))))]
    .filter((value) => Number.isFinite(value)
      && value >= minimumReading
      && value - minimumReading <= MAX_BILLABLE_METER_UNITS)
    .sort((first, second) => first - second);
}

export function getMonthKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function shiftMonth(month: string, offset: number) {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(year, monthNumber - 1 + offset, 1);
  return getMonthKey(date);
}

export function getMonthDisplay(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(year, monthNumber - 1, 1);

  if (Number.isNaN(date.getTime())) return month;

  return date.toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
  });
}

export function getDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function readDateValue(record: Record<string, unknown>, fields: string[]) {
  for (const field of fields) {
    const value = record[field];

    if (!value) continue;

    if (typeof value === 'string') return value;

    if (value instanceof Date) return getDayKey(value);

    if (typeof value === 'object') {
      if ('toDate' in value && typeof value.toDate === 'function') {
        return getDayKey(value.toDate());
      }

      if ('seconds' in value && typeof value.seconds === 'number') {
        return getDayKey(new Date(value.seconds * 1000));
      }
    }
  }

  return '';
}

export function matchesDay(record: Record<string, unknown>, day: string, fields: string[]) {
  return readDateValue(record, fields).slice(0, 10) === day;
}

export function matchesMonth(record: Record<string, unknown>, month: string, fields: string[]) {
  if (typeof record.month === 'string') return record.month === month;

  return readDateValue(record, fields).slice(0, 7) === month;
}

export function matchesDailyStayAction(tenant: TenantRecord, action: string, day = getDayKey()) {
  const status = getCustomerStatusGroup(tenant);

  if (action === 'arrival') {
    const startDate = readDateValue(tenant, ['moveInDate', 'checkInDate']).slice(0, 10);
    return status === 'reserved' && Boolean(startDate) && startDate <= day;
  }

  if (action === 'departure') {
    const endDate = readDateValue(tenant, ['moveOutDate', 'checkOutDate', 'checkoutDate', 'endDate']).slice(0, 10);
    return status === 'active' && Boolean(endDate) && endDate <= day;
  }

  return true;
}

export function getDailyStayActions(tenants: TenantRecord[] = [], day = getDayKey()) {
  return tenants.reduce(
    (actions, tenant) => {
      const status = getCustomerStatusGroup(tenant);
      const startDate = readDateValue(tenant, ['moveInDate', 'checkInDate']).slice(0, 10);

      if (matchesDailyStayAction(tenant, 'arrival', day)) actions.arrivals += 1;
      if (matchesDailyStayAction(tenant, 'departure', day)) actions.departures += 1;
      if (
        (status === 'reserved' || status === 'active')
        && (!startDate || !tenant.room || !tenant.phone || !tenant.documentId || !tenant.idProof)
      ) actions.incompleteProfiles += 1;

      return actions;
    },
    { arrivals: 0, departures: 0, incompleteProfiles: 0 },
  );
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

export function isVoided(record: PaymentRecord | ExpenseRecord) {
  return Boolean(record.voidedAt) || String(record.status || '').toLowerCase() === 'voided';
}

export function getCollectedTotal(payments: PaymentRecord[] = []) {
  return payments.reduce((sum, payment) => sum + (isVoided(payment) ? 0 : getPaymentAmount(payment)), 0);
}

export function getExpenseTotal(expenses: ExpenseRecord[] = []) {
  return expenses.reduce((sum, expense) => sum + (isVoided(expense) ? 0 : getExpenseAmount(expense)), 0);
}

export function getMeterReadingCharges(readings: MeterReadingRecord[] = [], tenantId: string) {
  let billedThrough: number | undefined;

  return readings
    .filter((reading) => reading.tenantId === tenantId)
    .sort((first, second) => toNumber(first.currentReading) - toNumber(second.currentReading))
    .reduce<Record<string, { amount: number; needsReview?: boolean; units: number }>>((charges, reading) => {
      const hasMeterValues = reading.previousReading !== undefined && reading.currentReading !== undefined;

      if (!hasMeterValues) {
        charges[reading.id] = { amount: toNumber(reading.billAmount), units: toNumber(reading.unitsConsumed) };
        return charges;
      }

      const previous = toNumber(reading.previousReading);
      const current = toNumber(reading.currentReading);

      if (billedThrough === undefined && (reading.readingType === 'check-in' || previous === 0)) {
        billedThrough = current;
        charges[reading.id] = { amount: 0, units: 0 };
        return charges;
      }

      const units = Math.max(0, current - Math.max(previous, billedThrough ?? previous));
      const recordedUnits = toNumber(reading.unitsConsumed);
      const rate = toNumber(reading.ratePerUnit)
        || (recordedUnits > 0 ? toNumber(reading.billAmount) / recordedUnits : 0);
      billedThrough = Math.max(billedThrough ?? previous, current);
      charges[reading.id] = units > MAX_BILLABLE_METER_UNITS
        ? { amount: 0, needsReview: true, units: 0 }
        : { amount: units * rate, units };

      return charges;
    }, {});
}

export function meterReadingNeedsReview(readings: MeterReadingRecord[], reading: MeterReadingRecord) {
  return Boolean(reading.tenantId && getMeterReadingCharges(readings, reading.tenantId)[reading.id]?.needsReview);
}

export function getMeterChargeForMonth(
  readings: MeterReadingRecord[] = [],
  tenantId: string,
  month: string,
) {
  const charges = getMeterReadingCharges(readings, tenantId);

  return readings.reduce((total, reading) =>
    reading.tenantId === tenantId && reading.month === month
      ? total + (charges[reading.id]?.amount || 0)
      : total, 0);
}

export function isTenantActiveForMonth(tenant: TenantRecord, month: string) {
  const status = String(tenant.status || 'active').toLowerCase();

  if (!activeStatuses.has(status) && !completedStatuses.has(status)) return false;

  const startMonth = readDateValue(tenant, ['checkedInAt', 'moveInDate', 'checkInDate']).slice(0, 7);
  const endMonth = readDateValue(tenant, ['checkedOutAt', 'moveOutDate', 'checkOutDate', 'checkoutDate', 'endDate']).slice(0, 7);

  if (startMonth && month < startMonth) return false;
  if (endMonth && month > endMonth) return false;
  if (completedStatuses.has(status) && !startMonth && !endMonth) return false;

  // Hotel charges are for one stay, not a recurring monthly rent.
  if (tenant.businessType === 'hotel' && startMonth) return month === startMonth;

  return true;
}

function getDueStatus(rent: number, paid: number): DueRecord['status'] {
  const balance = Math.max(0, rent - paid);

  if (balance <= 0 && rent > 0) return 'Paid';
  if (paid > 0) return 'Partial';
  return 'Pending';
}

export function calculatePaymentResult(
  totalCharge: number,
  payments: PaymentRecord[],
  tenantId: string,
  month: string,
  amountPaid: number,
) {
  const alreadyPaid = payments.reduce((total, payment) =>
    getPaymentTenantId(payment) === tenantId && payment.month === month && !isVoided(payment)
      ? total + getPaymentAmount(payment)
      : total, 0);
  const paid = alreadyPaid + amountPaid;

  return { balance: Math.max(0, totalCharge - paid), status: getDueStatus(totalCharge, paid) };
}

export function getRemainingPaymentBalance(
  totalCharge: number,
  payments: PaymentRecord[],
  tenantId: string,
  month: string,
) {
  return calculatePaymentResult(totalCharge, payments, tenantId, month, 0).balance;
}

export function calculateMonthlyDues(
  tenants: TenantRecord[] = [],
  payments: PaymentRecord[] = [],
  month = getMonthKey(),
  meterReadings: MeterReadingRecord[] = [],
): DueRecord[] {
  const paymentsByTenant = payments.reduce<Record<string, number>>((map, payment) => {
    const tenantId = getPaymentTenantId(payment);

    if (!tenantId || payment.month !== month || isVoided(payment)) return map;

    map[tenantId] = (map[tenantId] || 0) + getPaymentAmount(payment);
    return map;
  }, {});
  return tenants
    .filter((tenant) => isTenantActiveForMonth(tenant, month))
    .map((tenant) => {
      const baseAmount = toNumber(tenant.rent);
      const meterAmount = getMeterChargeForMonth(meterReadings, tenant.id, month);
      const rent = baseAmount + meterAmount;
      const paid = paymentsByTenant[tenant.id] || 0;
      const balance = Math.max(0, rent - paid);

      return {
        baseAmount,
        balance,
        businessType: tenant.businessType || 'pg',
        id: `${tenant.id}-${month}`,
        meterAmount,
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

export function calculateOutstandingBalance(
  tenant: TenantRecord,
  payments: PaymentRecord[] = [],
  meterReadings: MeterReadingRecord[] = [],
  throughMonth = getMonthKey(),
) {
  const status = String(tenant.status || 'active').toLowerCase();
  if (status === 'booked' || status === 'cancelled') return 0;

  const startMonth = readDateValue(tenant, ['checkedInAt', 'moveInDate', 'checkInDate']).slice(0, 7) || throughMonth;
  const recordedEnd = readDateValue(tenant, ['checkedOutAt', 'moveOutDate', 'checkOutDate', 'checkoutDate', 'endDate']).slice(0, 7);
  const endMonth = recordedEnd && recordedEnd < throughMonth ? recordedEnd : throughMonth;
  const months = tenant.businessType === 'hotel' ? [startMonth] : [];

  if (tenant.businessType !== 'hotel') {
    // ponytail: 20-year cap protects corrupted dates; move to stored invoices if longer histories are ever needed.
    for (let month = startMonth, count = 0; month <= endMonth && count < 240; month = shiftMonth(month, 1), count += 1) {
      months.push(month);
    }
  }

  return months.reduce(
    (balance, month) => balance + (calculateMonthlyDues([tenant], payments, month, meterReadings)[0]?.balance || 0),
    0,
  );
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
