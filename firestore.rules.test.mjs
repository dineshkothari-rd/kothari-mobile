import { readFileSync } from 'node:fs';
import test, { after } from 'node:test';

import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';

const projectId = 'demo-no-project';
const testEnv = await initializeTestEnvironment({
  firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  projectId,
});

after(() => testEnv.cleanup());

async function seed() {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, 'users', 'admin-1'), { accessStatus: 'active', role: 'admin' }),
      setDoc(doc(db, 'users', 'admin-2'), { accessStatus: 'suspended', role: 'admin' }),
      setDoc(doc(db, 'users', 'staff-1'), { accessStatus: 'active', role: 'staff' }),
      setDoc(doc(db, 'users', 'staff-2'), { accessStatus: 'suspended', role: 'staff' }),
      setDoc(doc(db, 'users', 'customer-1'), { accessStatus: 'active', customerId: 'tenant-1', role: 'customer' }),
      setDoc(doc(db, 'users', 'customer-2'), { accessStatus: 'active', customerId: 'tenant-2', role: 'customer' }),
      setDoc(doc(db, 'tenants', 'tenant-1'), { businessType: 'pg', name: 'Customer One', status: 'checked in' }),
      setDoc(doc(db, 'tenants', 'tenant-2'), { businessType: 'pg', name: 'Customer Two', status: 'checked in' }),
      setDoc(doc(db, 'tenants', 'tenant-3'), { businessType: 'pg', name: 'Customer Three', status: 'checked in' }),
      setDoc(doc(db, 'payments', 'payment-1'), { amountPaid: 500, tenantId: 'tenant-1' }),
      setDoc(doc(db, 'payments', 'payment-2'), { amountPaid: 700, tenantId: 'tenant-2' }),
      setDoc(doc(db, 'invoices', 'tenant-1_2026-08'), { tenantId: 'tenant-1', month: '2026-08', total: 1000 }),
      setDoc(doc(db, 'invoices', 'tenant-2_2026-08'), { tenantId: 'tenant-2', month: '2026-08', total: 1200 }),
      setDoc(doc(db, 'settlements', 'tenant-1'), { refundDue: 500, refundStatus: 'Due', tenantId: 'tenant-1' }),
      setDoc(doc(db, 'meterReadings', 'meter-1'), { currentReading: 100, tenantId: 'tenant-1' }),
      setDoc(doc(db, 'meterReadings', 'meter-2'), { currentReading: 200, tenantId: 'tenant-1' }),
      setDoc(doc(db, 'notices', 'notice-all'), { audience: 'all', message: 'All', title: 'All' }),
      setDoc(doc(db, 'notices', 'notice-one'), { audience: 'customer', message: 'One', tenantId: 'tenant-1', title: 'One' }),
      setDoc(doc(db, 'notices', 'notice-two'), { audience: 'customer', message: 'Two', tenantId: 'tenant-2', title: 'Two' }),
    ]);
  });
}

function signedIn(uid, role, extra = {}) {
  return testEnv.authenticatedContext(uid, { email: `${uid}@example.com`, email_verified: true, role, ...extra }).firestore();
}

test('customer can only read and request help for their own account', async () => {
  await seed();
  const db = signedIn('customer-1', 'customer', { customerId: 'tenant-1' });

  await assertSucceeds(getDoc(doc(db, 'tenants', 'tenant-1')));
  await assertSucceeds(getDoc(doc(db, 'payments', 'payment-1')));
  await assertSucceeds(getDoc(doc(db, 'invoices', 'tenant-1_2026-08')));
  await assertSucceeds(getDoc(doc(db, 'settlements', 'tenant-1')));
  await assertSucceeds(getDoc(doc(db, 'meterReadings', 'meter-1')));
  await assertSucceeds(getDoc(doc(db, 'notices', 'notice-all')));
  await assertSucceeds(getDoc(doc(db, 'notices', 'notice-one')));
  await assertFails(getDoc(doc(db, 'tenants', 'tenant-2')));
  await assertFails(getDoc(doc(db, 'payments', 'payment-2')));
  await assertFails(getDoc(doc(db, 'invoices', 'tenant-2_2026-08')));
  await assertFails(getDoc(doc(db, 'settlements', 'tenant-2')));
  await assertFails(getDoc(doc(db, 'notices', 'notice-two')));
  await assertSucceeds(setDoc(doc(db, 'supportRequests', 'request-1'), {
    createdAt: serverTimestamp(), createdBy: 'customer-1', customerId: 'tenant-1', message: 'Please help', status: 'open', type: 'issue',
  }));
  await assertFails(setDoc(doc(db, 'supportRequests', 'request-2'), {
    createdAt: serverTimestamp(), createdBy: 'customer-1', customerId: 'tenant-2', message: 'Not mine', status: 'open', type: 'issue',
  }));
  await assertFails(setDoc(doc(db, 'supportRequests', 'request-3'), {
    createdAt: serverTimestamp(), createdBy: 'customer-1', customerId: 'tenant-1', message: 'x'.repeat(2001), status: 'open', type: 'issue',
  }));
  await assertFails(setDoc(doc(db, 'supportRequests', 'request-4'), {
    createdAt: serverTimestamp(), createdBy: 'customer-1', customerId: 'tenant-1', message: 'Please help', response: 'Already approved', status: 'open', type: 'issue',
  }));
  await assertFails(setDoc(doc(db, 'supportRequests', 'request-5'), {
    createdAt: '2026-09-21', createdBy: 'customer-1', customerId: 'tenant-1', message: 'Forged time', status: 'open', type: 'issue',
  }));
  await assertFails(updateDoc(doc(db, 'settlements', 'tenant-1'), {
    refundStatus: 'Paid', refundedAt: serverTimestamp(), refundedBy: 'customer-1',
  }));

  const staleClaimsDb = signedIn('customer-1', 'customer', { customerId: 'tenant-2' });
  await assertSucceeds(getDoc(doc(staleClaimsDb, 'tenants', 'tenant-1')));
  await assertFails(getDoc(doc(staleClaimsDb, 'tenants', 'tenant-2')));
});

test('staff can operate but cannot escalate roles or bypass lifecycle', async () => {
  await seed();
  const db = signedIn('staff-1', 'staff');

  await assertSucceeds(setDoc(doc(db, 'payments', 'payment-new'), {
    amountPaid: 500, balance: 500, businessType: 'pg', createdAt: serverTimestamp(), createdBy: 'staff-1', month: '2026-08', note: '', paidOn: '21/09/2026', status: 'Recorded', tenantId: 'tenant-2', tenantName: 'Customer Two', tenantRoom: 'Room 102', totalRent: 1000,
  }));
  const invoice = {
    baseAmount: 1000, businessType: 'pg', issuedAt: serverTimestamp(), issuedBy: 'staff-1', meterAmount: 100,
    month: '2026-09', status: 'Issued', tenantId: 'tenant-1', tenantName: 'Customer One', tenantRoom: 'Room 101', total: 1100,
  };
  await assertSucceeds(setDoc(doc(db, 'invoices', 'tenant-1_2026-09'), invoice));
  await assertFails(setDoc(doc(db, 'invoices', 'wrong-id'), invoice));
  await assertFails(updateDoc(doc(db, 'invoices', 'tenant-1_2026-08'), { total: 0 }));
  const settlement = {
    depositApplied: 1000, depositHeld: 1500, discount: 100, extraCharge: 100, finalBalance: 0,
    finalizedAt: serverTimestamp(), finalizedBy: 'staff-1', grossDue: 1000, ledgerBalance: 1000,
    month: '2026-09', paidAtSettlement: 0, paymentReceived: 0, refundDue: 500,
    refundStatus: 'Due', status: 'Final', tenantId: 'tenant-2', tenantName: 'Customer Two',
  };
  await assertFails(setDoc(doc(db, 'settlements', 'tenant-2'), settlement));
  await assertFails(setDoc(doc(db, 'settlements', 'wrong-id'), settlement));
  await assertFails(setDoc(doc(db, 'settlements', 'tenant-3'), { ...settlement, finalBalance: 999, tenantId: 'tenant-3' }));
  const checkout = writeBatch(db);
  checkout.update(doc(db, 'tenants', 'tenant-2'), { checkedOutAt: serverTimestamp(), status: 'checked out' });
  checkout.set(doc(db, 'settlements', 'tenant-2'), settlement);
  await assertSucceeds(checkout.commit());
  const balanceCheckout = writeBatch(db);
  balanceCheckout.update(doc(db, 'tenants', 'tenant-3'), { checkedOutAt: serverTimestamp(), status: 'checked out' });
  balanceCheckout.set(doc(db, 'settlements', 'tenant-3'), {
    ...settlement, depositApplied: 0, depositHeld: 0, discount: 0, extraCharge: 0,
    finalBalance: 500, grossDue: 500, ledgerBalance: 500, refundDue: 0,
    refundStatus: 'None', tenantId: 'tenant-3',
  });
  await assertSucceeds(balanceCheckout.commit());
  const balancePayment = {
    amountPaid: 200, balance: 300, businessType: 'pg', createdAt: serverTimestamp(),
    createdBy: 'staff-1', month: '2026-09', note: 'Settlement balance', paidOn: '22/09/2026',
    status: 'Recorded', tenantId: 'tenant-3', tenantName: 'Customer Three', tenantRoom: 'Room 103', totalRent: 500,
  };
  await assertFails(setDoc(doc(db, 'payments', 'wrong-settlement-note'), { ...balancePayment, note: '' }));
  await assertFails(setDoc(doc(db, 'payments', 'over-settlement'), { ...balancePayment, amountPaid: 600, balance: 0, totalRent: 600 }));
  await assertSucceeds(setDoc(doc(db, 'payments', 'balance-payment'), balancePayment));
  await assertSucceeds(updateDoc(doc(db, 'settlements', 'tenant-1'), {
    refundStatus: 'Paid', refundedAt: serverTimestamp(), refundedBy: 'staff-1',
  }));
  await assertFails(updateDoc(doc(db, 'settlements', 'tenant-1'), { finalBalance: 0 }));
  await assertFails(setDoc(doc(db, 'payments', 'payment-forged'), {
    amountPaid: 500, balance: 0, businessType: 'pg', createdAt: serverTimestamp(), createdBy: 'staff-1', month: 'not-a-month', note: '', paidOn: '21/09/2026', status: 'Recorded', tenantId: 'tenant-1', tenantName: 'Customer One', tenantRoom: 'Room 101', totalRent: 100,
  }));
  await assertSucceeds(updateDoc(doc(db, 'tenants', 'tenant-1'), { status: 'checked out' }));
  await assertFails(updateDoc(doc(db, 'tenants', 'tenant-1'), { status: 'booked' }));
  await assertFails(updateDoc(doc(db, 'users', 'staff-1'), { role: 'admin' }));
  await assertSucceeds(setDoc(doc(db, 'allocationGuards', 'room-101'), {
    inventoryType: 'room', reservations: [{ businessType: 'pg', customerId: 'tenant-1', status: 'checked in' }], updatedAt: serverTimestamp(),
  }));

  const suspendedDb = signedIn('staff-2', 'staff');
  await assertFails(getDoc(doc(suspendedDb, 'tenants', 'tenant-1')));
});

test('admin manages access while unverified users are denied', async () => {
  await seed();
  const adminDb = signedIn('admin-1', 'admin');
  await assertSucceeds(updateDoc(doc(adminDb, 'users', 'staff-1'), { accessStatus: 'suspended' }));
  await assertFails(deleteDoc(doc(adminDb, 'tenants', 'tenant-1')));

  const unverified = testEnv.authenticatedContext('staff-1', { email: 'staff@example.com', email_verified: false, role: 'staff' }).firestore();
  await assertFails(getDoc(doc(unverified, 'tenants', 'tenant-1')));

  const suspendedAdmin = signedIn('admin-2', 'admin');
  await assertFails(getDoc(doc(suspendedAdmin, 'tenants', 'tenant-1')));
});

test('audit records require the signed-in actor and server time', async () => {
  await seed();
  const db = signedIn('staff-1', 'staff');

  await assertSucceeds(setDoc(doc(db, 'auditEvents', 'valid'), {
    action: 'payment.created', actorUid: 'staff-1', createdAt: serverTimestamp(),
  }));
  await assertFails(setDoc(doc(db, 'auditEvents', 'wrong-actor'), {
    action: 'payment.created', actorUid: 'admin-1', createdAt: serverTimestamp(),
  }));
  await assertFails(setDoc(doc(db, 'auditEvents', 'client-time'), {
    action: 'payment.created', actorUid: 'staff-1', createdAt: '2026-09-21',
  }));
  await assertFails(setDoc(doc(db, 'auditEvents', 'invented-action'), {
    action: 'admin.superpowers', actorUid: 'staff-1', createdAt: serverTimestamp(),
  }));
});

test('business writes reject oversized private data and invalid money records', async () => {
  await seed();
  const db = signedIn('staff-1', 'staff');

  await assertFails(setDoc(doc(db, 'tenants', 'oversized-proof'), {
    businessType: 'pg', customerPhoto: null, idProof: 'x'.repeat(260001), name: 'Customer', rent: 1000, room: 'Room 101', services: [], status: 'booked',
  }));
  await assertFails(setDoc(doc(db, 'expenses', 'huge-expense'), {
    amount: 10000001, category: 'maintenance', createdAt: serverTimestamp(), createdBy: 'staff-1', date: '2026-09-21', note: '', paymentMode: 'Cash', title: 'Invalid',
  }));
  await assertFails(setDoc(doc(db, 'meterReadings', 'oversized-photo'), {
    createdAt: serverTimestamp(), currentReading: 100, month: '2026-09', photo: 'x'.repeat(700001), photoSize: 700001, tenantId: 'tenant-1',
  }));
  await assertFails(updateDoc(doc(db, 'payments', 'payment-1'), {
    status: 'Voided', updatedAt: serverTimestamp(), voidedAt: serverTimestamp(), voidedBy: 'staff-1',
  }));
  await assertSucceeds(updateDoc(doc(db, 'payments', 'payment-2'), {
    status: 'Voided', updatedAt: serverTimestamp(), voidedAt: serverTimestamp(), voidedBy: 'staff-1',
  }));
  await assertSucceeds(updateDoc(doc(db, 'meterReadings', 'meter-1'), {
    status: 'Voided', voidedAt: serverTimestamp(), voidedBy: 'staff-1',
  }));
  await assertFails(updateDoc(doc(db, 'meterReadings', 'meter-2'), { currentReading: 50 }));
  await assertFails(deleteDoc(doc(db, 'meterReadings', 'meter-2')));
});

test('customers cannot read or change allocation guards', async () => {
  await seed();
  const db = signedIn('customer-1', 'customer', { customerId: 'tenant-1' });

  await assertFails(getDoc(doc(db, 'allocationGuards', 'room-101')));
  await assertFails(setDoc(doc(db, 'allocationGuards', 'room-101'), { inventoryType: 'room', reservations: [] }));
});
