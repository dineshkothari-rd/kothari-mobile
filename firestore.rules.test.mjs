import { readFileSync } from 'node:fs';
import test, { after } from 'node:test';

import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

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
      setDoc(doc(db, 'users', 'staff-1'), { accessStatus: 'active', role: 'staff' }),
      setDoc(doc(db, 'users', 'staff-2'), { accessStatus: 'suspended', role: 'staff' }),
      setDoc(doc(db, 'users', 'customer-1'), { accessStatus: 'active', customerId: 'tenant-1', role: 'customer' }),
      setDoc(doc(db, 'users', 'customer-2'), { accessStatus: 'active', customerId: 'tenant-2', role: 'customer' }),
      setDoc(doc(db, 'tenants', 'tenant-1'), { businessType: 'pg', name: 'Customer One', status: 'checked in' }),
      setDoc(doc(db, 'tenants', 'tenant-2'), { businessType: 'pg', name: 'Customer Two', status: 'checked in' }),
      setDoc(doc(db, 'payments', 'payment-1'), { amountPaid: 500, tenantId: 'tenant-1' }),
      setDoc(doc(db, 'payments', 'payment-2'), { amountPaid: 700, tenantId: 'tenant-2' }),
      setDoc(doc(db, 'meterReadings', 'meter-1'), { currentReading: 100, tenantId: 'tenant-1' }),
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
  await assertSucceeds(getDoc(doc(db, 'meterReadings', 'meter-1')));
  await assertSucceeds(getDoc(doc(db, 'notices', 'notice-all')));
  await assertSucceeds(getDoc(doc(db, 'notices', 'notice-one')));
  await assertFails(getDoc(doc(db, 'tenants', 'tenant-2')));
  await assertFails(getDoc(doc(db, 'payments', 'payment-2')));
  await assertFails(getDoc(doc(db, 'notices', 'notice-two')));
  await assertSucceeds(setDoc(doc(db, 'supportRequests', 'request-1'), {
    createdBy: 'customer-1', customerId: 'tenant-1', message: 'Please help', status: 'open', type: 'issue',
  }));
  await assertFails(setDoc(doc(db, 'supportRequests', 'request-2'), {
    createdBy: 'customer-1', customerId: 'tenant-2', message: 'Not mine', status: 'open', type: 'issue',
  }));
});

test('staff can operate but cannot escalate roles or bypass lifecycle', async () => {
  await seed();
  const db = signedIn('staff-1', 'staff');

  await assertSucceeds(setDoc(doc(db, 'payments', 'payment-new'), {
    amountPaid: 500, createdBy: 'staff-1', month: '2026-08', tenantId: 'tenant-1',
  }));
  await assertSucceeds(updateDoc(doc(db, 'tenants', 'tenant-1'), { status: 'checked out' }));
  await assertFails(updateDoc(doc(db, 'tenants', 'tenant-1'), { status: 'booked' }));
  await assertFails(updateDoc(doc(db, 'users', 'staff-1'), { role: 'admin' }));

  const suspendedDb = signedIn('staff-2', 'staff');
  await assertFails(getDoc(doc(suspendedDb, 'tenants', 'tenant-1')));
});

test('admin manages access while unverified users are denied', async () => {
  await seed();
  const adminDb = signedIn('admin-1', 'admin');
  await assertSucceeds(updateDoc(doc(adminDb, 'users', 'staff-1'), { accessStatus: 'suspended' }));

  const unverified = testEnv.authenticatedContext('staff-1', { email: 'staff@example.com', email_verified: false, role: 'staff' }).firestore();
  await assertFails(getDoc(doc(unverified, 'tenants', 'tenant-1')));
});
