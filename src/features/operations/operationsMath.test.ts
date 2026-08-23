import assert from 'node:assert/strict';
import test from 'node:test';

// @ts-expect-error Node runs this check with native TypeScript stripping.
import { calculateMonthlyDues, calculateOutstandingBalance, calculatePaymentResult, getDailyStayActions, getMeterChargeForMonth, getMeterReadingCandidates, getMeterReadingCharges, getRemainingPaymentBalance } from './operationsMath.ts';

test('reservation to checkout keeps an accurate customer ledger', () => {
  const reservation = { id: 'tenant-1', businessType: 'pg', moveInDate: '2026-08-10', rent: 3000, status: 'booked' };
  assert.deepEqual(calculateMonthlyDues([reservation], [], '2026-08'), []);

  const checkedIn = { ...reservation, status: 'checked in' };
  const readings = [{ id: 'meter-1', billAmount: 400, month: '2026-08', tenantId: 'tenant-1' }];
  const payments = [
    { id: 'payment-1', amountPaid: 1000, month: '2026-08', tenantId: 'tenant-1' },
    { id: 'payment-2', amountPaid: 500, month: '2026-08', tenantId: 'tenant-1' },
  ];
  assert.deepEqual(calculateMonthlyDues([checkedIn], payments, '2026-08', readings)[0], {
    baseAmount: 3000,
    balance: 1900,
    businessType: 'pg',
    id: 'tenant-1-2026-08',
    meterAmount: 400,
    month: '2026-08',
    paid: 1500,
    phone: '',
    rent: 3400,
    status: 'Partial',
    tenantId: 'tenant-1',
    tenantName: 'Unnamed',
    tenantRoom: '',
  });

  const checkedOut = { ...checkedIn, moveOutDate: '2026-08-20', status: 'checked out' };
  assert.equal(calculateMonthlyDues([checkedOut], payments, '2026-08', readings)[0]?.balance, 1900);
  assert.equal(calculateOutstandingBalance(checkedOut, payments, readings, '2026-10'), 1900);
  assert.deepEqual(calculateMonthlyDues([checkedOut], payments, '2026-09', readings), []);
});

test('second partial payment closes the balance used on its receipt', () => {
  const previous = [{ id: 'first', amountPaid: 500, month: '2026-08', tenantId: 'tenant-1' }];
  assert.deepEqual(calculatePaymentResult(1000, previous, 'tenant-1', '2026-08', 500), { balance: 0, status: 'Paid' });
  assert.equal(getRemainingPaymentBalance(1000, previous, 'tenant-1', '2026-08'), 500);
});

test('overlapping checkout reading does not bill consumed units twice', () => {
  const readings = [
    { id: 'check-in', currentReading: 100, month: '2026-08', previousReading: 100, ratePerUnit: 10, tenantId: 'tenant-1', unitsConsumed: 0 },
    { id: 'manual', billAmount: 500, currentReading: 150, month: '2026-08', previousReading: 100, ratePerUnit: 10, tenantId: 'tenant-1', unitsConsumed: 50 },
    { id: 'check-out', billAmount: 1000, currentReading: 200, month: '2026-09', previousReading: 100, ratePerUnit: 10, tenantId: 'tenant-1', unitsConsumed: 100 },
  ];

  assert.equal(getMeterChargeForMonth(readings, 'tenant-1', '2026-08'), 500);
  assert.equal(getMeterChargeForMonth(readings, 'tenant-1', '2026-09'), 500);
});

test('first absolute meter reading is a baseline, not consumed units', () => {
  const readings = [
    { id: 'baseline', billAmount: 859420, currentReading: 85942, month: '2026-08', previousReading: 0, ratePerUnit: 10, tenantId: 'tenant-1', unitsConsumed: 85942 },
  ];

  assert.equal(getMeterChargeForMonth(readings, 'tenant-1', '2026-08'), 0);
  assert.deepEqual(getMeterReadingCharges(readings, 'tenant-1').baseline, { amount: 0, units: 0 });
});

test('implausible OCR jump is held for review instead of entering financial totals', () => {
  const readings = [
    { id: 'check-in', currentReading: 2019, month: '2026-08', previousReading: 0, ratePerUnit: 10, readingType: 'check-in' as const, tenantId: 'tenant-1' },
    { id: 'bad-ocr', currentReading: 82880, month: '2026-08', previousReading: 2019, ratePerUnit: 10, tenantId: 'tenant-1' },
  ];

  assert.deepEqual(getMeterReadingCharges(readings, 'tenant-1')['bad-ocr'], { amount: 0, needsReview: true, units: 0 });
  assert.equal(getMeterChargeForMonth(readings, 'tenant-1', '2026-08'), 0);
});

test('OCR suggestions reject unrelated numbers and keep plausible meter readings', () => {
  assert.deepEqual(getMeterReadingCandidates('240V 50Hz display 04882 serial 823880', 2019), [4882]);
});

test('a hotel stay is charged once in its check-in month', () => {
  const hotelStay = { id: 'hotel-1', businessType: 'hotel', moveInDate: '2026-08-30', moveOutDate: '2026-09-02', rent: 5000, status: 'checked out' };
  assert.equal(calculateMonthlyDues([hotelStay], [], '2026-08')[0]?.rent, 5000);
  assert.deepEqual(calculateMonthlyDues([hotelStay], [], '2026-09'), []);
});

test('daily work highlights due stays and incomplete active profiles', () => {
  const complete = { documentId: 'ID-1', idProof: 'photo', phone: '9999999999', room: '101' };
  const tenants = [
    { ...complete, id: 'arrival', moveInDate: '2026-08-23', status: 'booked' },
    { ...complete, id: 'future', moveInDate: '2026-08-24', status: 'booked' },
    { ...complete, id: 'departure', moveInDate: '2026-08-01', moveOutDate: '2026-08-22', status: 'checked in' },
    { id: 'incomplete', moveInDate: '2026-08-01', status: 'active' },
    { id: 'done', moveInDate: '2026-07-01', moveOutDate: '2026-08-01', status: 'checked out' },
  ];

  assert.deepEqual(getDailyStayActions(tenants, '2026-08-23'), {
    arrivals: 1,
    departures: 1,
    incompleteProfiles: 1,
  });
});
