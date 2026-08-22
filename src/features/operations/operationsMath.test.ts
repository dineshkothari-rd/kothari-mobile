import assert from 'node:assert/strict';
import test from 'node:test';

// @ts-expect-error Node runs this check with native TypeScript stripping.
import { calculateMonthlyDues, calculateOutstandingBalance, calculatePaymentResult } from './operationsMath.ts';

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
});

test('a hotel stay is charged once in its check-in month', () => {
  const hotelStay = { id: 'hotel-1', businessType: 'hotel', moveInDate: '2026-08-30', moveOutDate: '2026-09-02', rent: 5000, status: 'checked out' };
  assert.equal(calculateMonthlyDues([hotelStay], [], '2026-08')[0]?.rent, 5000);
  assert.deepEqual(calculateMonthlyDues([hotelStay], [], '2026-09'), []);
});
