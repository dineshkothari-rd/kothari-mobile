import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { addDoc, collection, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

import { radius, shadow, spacing, typography, useAppTheme, type AppColors } from '../../design/tokens';
import { FilterPill } from '../customers/FilterPill';
import { getBusinessType } from '../customers/businessTypes';
import { getCustomerAllocationLabel } from '../customers/customerUtils';
import {
  calculateMonthlyDues,
  getCollectedTotal,
  getMonthDisplay,
  getMonthKey,
  getPaymentAmount,
  getPaymentTenantId,
  matchesMonth,
  shiftMonth,
  summarizeDues,
} from '../operations/operationsMath';
import { useFirestoreCollection } from '../../shared/hooks/useFirestoreCollection';
import { TextField } from '../../shared/components/TextField';
import { db } from '../../lib/firebase/client';
import type { DueRecord, PaymentRecord, TenantRecord } from '../../shared/types/records';
import { money, toNumber } from '../../shared/utils/money';
import { ExpenseDesk } from './ExpenseDesk';

type MoneyView = 'dues' | 'collections' | 'expenses';
type DueStatusFilter = 'due' | 'partial' | 'pending' | 'paid' | 'all';
type PaymentStatusFilter = 'all' | 'paid' | 'partial' | 'pending' | 'recorded';
type PaymentDraft = {
  amountPaid: number;
  balance: number;
  businessType: string;
  month: string;
  note: string;
  paidOn: string;
  status: string;
  tenantId: string;
  tenantName: string;
  tenantRoom: string;
  totalRent: number;
};

const dueFilters: Array<{ label: string; value: DueStatusFilter }> = [
  { label: 'Due', value: 'due' },
  { label: 'Partial', value: 'partial' },
  { label: 'Pending', value: 'pending' },
  { label: 'Paid', value: 'paid' },
  { label: 'All', value: 'all' },
];

const paymentFilters: Array<{ label: string; value: PaymentStatusFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Paid', value: 'paid' },
  { label: 'Partial', value: 'partial' },
  { label: 'Pending', value: 'pending' },
  { label: 'Recorded', value: 'recorded' },
];

function getPaymentStatus(payment: PaymentRecord) {
  const status = String(payment.status || '').trim();

  if (status) return status;

  const totalRent = toNumber(payment.totalRent);
  const paid = getPaymentAmount(payment);
  const balance = toNumber(payment.balance);

  if (balance > 0) return paid > 0 ? 'Partial' : 'Pending';
  if (totalRent && paid >= totalRent) return 'Paid';
  return 'Recorded';
}

function getPaymentTenantName(payment: PaymentRecord, tenants: TenantRecord[]) {
  if (payment.tenantName) return payment.tenantName;

  const tenantId = getPaymentTenantId(payment);
  const tenant = tenants.find((item) => item.id === tenantId);

  return tenant?.name || tenant?.fullName || tenant?.tenantName || payment.name || 'Collection';
}

function getPaymentRoom(payment: PaymentRecord, tenants: TenantRecord[]) {
  if (payment.tenantRoom) return payment.tenantRoom;

  const tenantId = getPaymentTenantId(payment);
  const tenant = tenants.find((item) => item.id === tenantId);

  return tenant?.room || '';
}

function getPaymentBusinessType(payment: PaymentRecord, tenants: TenantRecord[]) {
  if (payment.businessType) return String(payment.businessType);

  const tenantId = getPaymentTenantId(payment);
  const tenant = tenants.find((item) => item.id === tenantId);

  return tenant?.businessType || 'pg';
}

function getPaymentAllocationLabel(payment: PaymentRecord, tenants: TenantRecord[]) {
  const room = getPaymentRoom(payment, tenants);
  const businessType = getPaymentBusinessType(payment, tenants);

  return getCustomerAllocationLabel({ businessType, room });
}

function getTenantDisplayName(tenant: TenantRecord) {
  return tenant.name || tenant.fullName || tenant.tenantName || 'Unnamed';
}

function matchesDueSearch(due: DueRecord, search: string) {
  const query = search.trim().toLowerCase();

  if (!query) return true;

  return [due.tenantName, due.tenantRoom, due.phone, due.businessType].some((value) =>
    String(value || '').toLowerCase().includes(query),
  );
}

function matchesDueStatus(due: DueRecord, filter: DueStatusFilter) {
  if (filter === 'all') return true;
  if (filter === 'due') return due.balance > 0;

  return due.status.toLowerCase() === filter;
}

function matchesPaymentSearch(payment: PaymentRecord, tenants: TenantRecord[], search: string) {
  const query = search.trim().toLowerCase();

  if (!query) return true;

  return [
    getPaymentTenantName(payment, tenants),
    getPaymentRoom(payment, tenants),
    payment.month,
    payment.paidOn,
    payment.note,
  ].some((value) => String(value || '').toLowerCase().includes(query));
}

function matchesPaymentStatus(payment: PaymentRecord, filter: PaymentStatusFilter) {
  if (filter === 'all') return true;

  return getPaymentStatus(payment).toLowerCase() === filter;
}

function getBalanceTotal(payments: PaymentRecord[]) {
  return payments.reduce((sum, payment) => sum + toNumber(payment.balance), 0);
}

function getPhoneDigits(phone: string) {
  return phone.replace(/\D/g, '');
}

function callPhone(phone: string) {
  if (!phone) return;

  Linking.openURL(`tel:${phone}`).catch(() => undefined);
}

function openWhatsApp(due: DueRecord) {
  const phone = getPhoneDigits(due.phone);

  if (!phone) return;

  const message = encodeURIComponent(
    `Hello ${due.tenantName}, your ${due.month} balance is ${money(due.balance)}. Please clear it when possible.`,
  );

  Linking.openURL(`https://wa.me/${phone}?text=${message}`).catch(() => undefined);
}

export function MoneyScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [view, setView] = useState<MoneyView>('dues');
  const [month, setMonth] = useState(getMonthKey());
  const [search, setSearch] = useState('');
  const [dueFilter, setDueFilter] = useState<DueStatusFilter>('due');
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatusFilter>('all');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentFormTenantId, setPaymentFormTenantId] = useState('');
  const [paymentFormAmount, setPaymentFormAmount] = useState(0);
  const [savingPayment, setSavingPayment] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState('');
  const [actionError, setActionError] = useState('');
  const tenants = useFirestoreCollection<TenantRecord>('tenants', { sortBy: 'createdAt' });
  const payments = useFirestoreCollection<PaymentRecord>('payments', { sortBy: 'createdAt' });

  const dues = useMemo(() => calculateMonthlyDues(tenants.data, payments.data, month), [month, payments.data, tenants.data]);
  const monthlyPayments = useMemo(
    () => payments.data.filter((payment) => matchesMonth(payment, month, ['paidOn', 'date', 'createdAt', 'updatedAt'])),
    [month, payments.data],
  );
  const visibleDues = useMemo(
    () => dues.filter((due) => matchesDueStatus(due, dueFilter) && matchesDueSearch(due, search)),
    [dueFilter, dues, search],
  );
  const visiblePayments = useMemo(
    () =>
      monthlyPayments.filter(
        (payment) => matchesPaymentStatus(payment, paymentFilter) && matchesPaymentSearch(payment, tenants.data, search),
      ),
    [monthlyPayments, paymentFilter, search, tenants.data],
  );
  const duesSummary = summarizeDues(dues);
  const visibleDuesSummary = summarizeDues(visibleDues);
  const collected = getCollectedTotal(visiblePayments);
  const balance = getBalanceTotal(visiblePayments);
  const loading = tenants.loading || payments.loading;
  const error = tenants.error || payments.error;
  const activeFilters = view === 'dues' ? dueFilters : paymentFilters;
  const currentMonth = getMonthKey();

  function clearFilters() {
    setSearch('');
    setDueFilter('due');
    setPaymentFilter('all');
  }

  function openPaymentForm(tenantId = '', amount = 0) {
    setActionError('');
    setPaymentFormAmount(amount);
    setPaymentFormTenantId(tenantId);
    setShowPaymentForm(true);
  }

  async function createPayment(payload: PaymentDraft) {
    setSavingPayment(true);
    setActionError('');

    try {
      await addDoc(collection(db, 'payments'), {
        ...payload,
        createdAt: serverTimestamp(),
      });
      setShowPaymentForm(false);
      setView('collections');
      setPaymentFilter('all');
    } catch (createError) {
      setActionError(createError instanceof Error ? createError.message : 'Could not record payment.');
    } finally {
      setSavingPayment(false);
    }
  }

  async function deletePayment(paymentId: string) {
    setDeletingPaymentId(paymentId);
    setActionError('');

    try {
      await deleteDoc(doc(db, 'payments', paymentId));
    } catch (deleteError) {
      setActionError(deleteError instanceof Error ? deleteError.message : 'Could not delete payment.');
    } finally {
      setDeletingPaymentId('');
    }
  }

  function confirmDeletePayment(payment: PaymentRecord) {
    Alert.alert(
      'Delete payment?',
      `Delete payment for ${getPaymentTenantName(payment, tenants.data)}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deletePayment(payment.id),
        },
      ],
    );
  }

  return (
    <View>
      {showPaymentForm ? (
        <PaymentFormSheet
          initialAmount={paymentFormAmount}
          initialTenantId={paymentFormTenantId}
          month={month}
          onClose={() => setShowPaymentForm(false)}
          onSubmit={createPayment}
          saving={savingPayment}
          styles={styles}
          tenants={tenants.data}
        />
      ) : null}

      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.kicker}>{getMonthDisplay(month)}</Text>
            <Text style={styles.title}>Money desk</Text>
          </View>
          <View style={styles.viewSwitch}>
            {(['dues', 'collections', 'expenses'] as MoneyView[]).map((item) => {
              const active = item === view;

              return (
                <Pressable key={item} onPress={() => setView(item)} style={[styles.switchItem, active && styles.switchItemActive]}>
                  <Text style={[styles.switchText, active && styles.switchTextActive]}>
                    {item === 'dues' ? 'Dues' : item === 'collections' ? 'Collections' : 'Expenses'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.monthNavigator}>
          <Pressable accessibilityRole="button" onPress={() => setMonth((value) => shiftMonth(value, -1))} style={styles.monthButton}>
            <Text style={styles.monthButtonText}>Prev</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => setMonth(currentMonth)} style={styles.monthValue}>
            <Text style={styles.monthValueText}>{month}</Text>
            <Text style={styles.monthValueHint}>{month === currentMonth ? 'Current month' : 'Tap to reset'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => setMonth((value) => shiftMonth(value, 1))} style={styles.monthButton}>
            <Text style={styles.monthButtonText}>Next</Text>
          </Pressable>
        </View>

        <View style={styles.heroMetrics}>
          <HeroMetric label="Expected" styles={styles} value={money(duesSummary.expected)} />
          <HeroMetric label="Collected" styles={styles} value={money(duesSummary.collected)} />
          <HeroMetric label="Due" danger styles={styles} value={money(duesSummary.balance)} />
        </View>

        {view === 'expenses' ? null : (
          <Pressable
            accessibilityRole="button"
            onPress={() => openPaymentForm()}
            style={styles.recordPaymentButton}
          >
            <Text style={styles.recordPaymentText}>Record payment</Text>
          </Pressable>
        )}
      </View>

      {loading ? (
        <View style={styles.statusRow}>
          <ActivityIndicator color={colors.brand} />
          <Text style={styles.statusText}>Loading money records</Text>
        </View>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {actionError ? <Text style={styles.errorText}>{actionError}</Text> : null}

      {view === 'expenses' ? null : (
        <View style={styles.toolbar}>
          <TextField
            label={view === 'dues' ? 'Search dues' : 'Search collections'}
            onChangeText={setSearch}
            placeholder={view === 'dues' ? 'Name, allocation, phone, type...' : 'Name, month, allocation, note...'}
            value={search}
          />
          <View style={styles.filterRail}>
            {activeFilters.map((filter) => {
              const active = view === 'dues' ? dueFilter === filter.value : paymentFilter === filter.value;

              return (
                <FilterPill
                  active={active}
                  key={filter.value}
                  label={filter.label}
                  onPress={() => {
                    if (view === 'dues') setDueFilter(filter.value as DueStatusFilter);
                    else setPaymentFilter(filter.value as PaymentStatusFilter);
                  }}
                />
              );
            })}
          </View>
        </View>
      )}

      {view === 'expenses' ? (
        <ExpenseDesk month={month} />
      ) : view === 'dues' ? (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Visible due balance</Text>
          <Text style={styles.summaryValue}>{money(visibleDuesSummary.balance)}</Text>
          <Text style={styles.summaryMeta}>
            {visibleDues.length} accounts, {visibleDuesSummary.partialCount} partial, {visibleDuesSummary.pendingCount} pending
          </Text>
        </View>
      ) : (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Visible collections</Text>
          <Text style={styles.summaryValue}>{money(collected)}</Text>
          <Text style={styles.summaryMeta}>
            {visiblePayments.length} records for {getMonthDisplay(month)}, {money(balance)} balance tracked
          </Text>
        </View>
      )}

      {view === 'expenses' ? null : view === 'dues' ? (
        visibleDues.length ? (
          visibleDues
            .slice(0, 50)
            .map((due) => (
              <DueCard due={due} key={due.id} onRecordPayment={() => openPaymentForm(due.tenantId, due.balance)} styles={styles} />
            ))
        ) : (
          <EmptyMoneyState clearFilters={clearFilters} styles={styles} />
        )
      ) : visiblePayments.length ? (
        visiblePayments
          .slice(0, 50)
          .map((payment) => (
            <PaymentCard
              deleting={deletingPaymentId === payment.id}
              key={payment.id}
              onDelete={() => confirmDeletePayment(payment)}
              payment={payment}
              styles={styles}
              tenants={tenants.data}
            />
          ))
      ) : (
        <EmptyMoneyState clearFilters={clearFilters} styles={styles} />
      )}
    </View>
  );
}

function PaymentFormSheet({
  initialAmount,
  initialTenantId,
  month,
  onClose,
  onSubmit,
  saving,
  styles,
  tenants,
}: {
  initialAmount: number;
  initialTenantId: string;
  month: string;
  onClose: () => void;
  onSubmit: (payload: PaymentDraft) => void;
  saving: boolean;
  styles: ReturnType<typeof createStyles>;
  tenants: TenantRecord[];
}) {
  const [tenantId, setTenantId] = useState(initialTenantId);
  const [paymentMonth, setPaymentMonth] = useState(month);
  const [amountPaid, setAmountPaid] = useState(initialAmount > 0 ? String(initialAmount) : '');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState('');
  const selectedTenantId = tenantId || tenants[0]?.id || '';
  const selectedTenant = tenants.find((tenant) => tenant.id === selectedTenantId);
  const selectedBusinessType = getBusinessType(selectedTenant?.businessType);
  const tenantRent = toNumber(selectedTenant?.rent);
  const paid = toNumber(amountPaid);
  const balance = Math.max(0, tenantRent - paid);
  const status = tenantRent && paid >= tenantRent ? 'Paid' : paid > 0 ? 'Partial' : 'Pending';
  const tenantOptions = useMemo(
    () =>
      tenants.slice(0, 80).map((tenant) => ({
        id: tenant.id,
        label: `${getTenantDisplayName(tenant)} / ${getCustomerAllocationLabel(tenant)}`,
      })),
    [tenants],
  );

  function submit() {
    if (!tenants.length) {
      setFormError('Add a customer before recording payments.');
      return;
    }

    if (!selectedTenant) {
      setFormError('Select a customer first.');
      return;
    }

    if (!paymentMonth.trim()) {
      setFormError('Enter payment month.');
      return;
    }

    if (!paid || paid <= 0) {
      setFormError('Enter a valid amount paid.');
      return;
    }

    onSubmit({
      amountPaid: paid,
      balance,
      businessType: selectedTenant.businessType || 'pg',
      month: paymentMonth.trim(),
      note: note.trim(),
      paidOn: new Date().toLocaleDateString('en-IN'),
      status,
      tenantId: selectedTenant.id,
      tenantName: getTenantDisplayName(selectedTenant),
      tenantRoom: getCustomerAllocationLabel(selectedTenant),
      totalRent: tenantRent,
    });
  }

  return (
    <Modal animationType="slide" transparent visible onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetBackdrop}>
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetKicker}>New collection</Text>
                <Text style={styles.sheetTitle}>Record payment</Text>
              </View>
              <Pressable disabled={saving} onPress={onClose} style={styles.sheetCloseButton}>
                <Text style={styles.sheetCloseText}>Close</Text>
              </Pressable>
            </View>

            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

            <Text style={styles.formLabel}>Customer</Text>
            {tenantOptions.length ? (
              <ScrollView
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
                style={styles.tenantPicker}
                contentContainerStyle={styles.tenantPickerContent}
              >
                {tenantOptions.map((tenant) => (
                  <FilterPill
                    active={selectedTenantId === tenant.id}
                    key={tenant.id}
                    label={tenant.label}
                    onPress={() => {
                      setTenantId(tenant.id);
                      setFormError('');
                    }}
                  />
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.formHelpText}>No customers found.</Text>
            )}

            <View style={styles.formGrid}>
              <TextField
                label="Month"
                onChangeText={(value) => {
                  setPaymentMonth(value);
                  setFormError('');
                }}
                placeholder="2026-08"
                value={paymentMonth}
              />
              <TextField
                keyboardType="numeric"
                label="Amount paid"
                onChangeText={(value) => {
                  setAmountPaid(value);
                  setFormError('');
                }}
                placeholder="5000"
                value={amountPaid}
              />
            </View>

            <View style={styles.formSummary}>
              <AmountCell label={selectedBusinessType.feeLabel} styles={styles} value={money(tenantRent)} />
              <AmountCell danger={balance > 0} label="Balance" styles={styles} value={money(balance)} />
              <AmountCell label="Status" styles={styles} value={status} />
            </View>

            <TextField label="Note" onChangeText={setNote} placeholder="Optional note" value={note} />

            <View style={styles.sheetActions}>
              <Pressable disabled={saving} onPress={onClose} style={[styles.sheetSecondaryAction, saving && styles.disabledAction]}>
                <Text style={styles.sheetSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable disabled={saving} onPress={submit} style={[styles.sheetPrimaryAction, saving && styles.disabledAction]}>
                {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.sheetPrimaryText}>Save payment</Text>}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function HeroMetric({
  danger = false,
  label,
  styles,
  value,
}: {
  danger?: boolean;
  label: string;
  styles: ReturnType<typeof createStyles>;
  value: string;
}) {
  return (
    <View style={styles.heroMetric}>
      <Text style={styles.heroMetricLabel}>{label}</Text>
      <Text style={[styles.heroMetricValue, danger && styles.heroMetricDanger]}>{value}</Text>
    </View>
  );
}

function DueCard({
  due,
  onRecordPayment,
  styles,
}: {
  due: DueRecord;
  onRecordPayment: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  const type = getBusinessType(due.businessType);
  const canContact = Boolean(due.phone);

  return (
    <View style={styles.recordCard}>
      <View style={styles.recordHeader}>
        <View style={styles.recordCopy}>
          <Text style={styles.recordTitle}>{due.tenantName}</Text>
          <Text style={styles.recordMeta}>
            {type.label} / {getCustomerAllocationLabel({ businessType: due.businessType, room: due.tenantRoom })}
          </Text>
        </View>
        <StatusBadge status={due.status} styles={styles} />
      </View>

      <View style={styles.amountGrid}>
        <AmountCell label={type.feeLabel} styles={styles} value={money(due.rent)} />
        <AmountCell label="Paid" styles={styles} value={money(due.paid)} />
        <AmountCell danger={due.balance > 0} label="Due" styles={styles} value={money(due.balance)} />
      </View>

      <View style={styles.actions}>
        <Pressable disabled={!canContact} onPress={() => callPhone(due.phone)} style={[styles.actionButton, !canContact && styles.disabledAction]}>
          <Text style={styles.actionText}>Call</Text>
        </Pressable>
        <Pressable disabled={!canContact} onPress={() => openWhatsApp(due)} style={[styles.actionButton, styles.actionButtonAccent, !canContact && styles.disabledAction]}>
          <Text style={styles.actionText}>WhatsApp</Text>
        </Pressable>
        <Pressable onPress={onRecordPayment} style={[styles.actionButton, styles.actionButtonSurface]}>
          <Text style={styles.actionTextAlt}>Record</Text>
        </Pressable>
      </View>
    </View>
  );
}

function PaymentCard({
  deleting,
  onDelete,
  payment,
  styles,
  tenants,
}: {
  deleting: boolean;
  onDelete: () => void;
  payment: PaymentRecord;
  styles: ReturnType<typeof createStyles>;
  tenants: TenantRecord[];
}) {
  const status = getPaymentStatus(payment);
  const allocation = getPaymentAllocationLabel(payment, tenants);
  const balance = toNumber(payment.balance);

  return (
    <View style={styles.recordCard}>
      <View style={styles.recordHeader}>
        <View style={styles.recordCopy}>
          <Text style={styles.recordTitle}>{getPaymentTenantName(payment, tenants)}</Text>
          <Text style={styles.recordMeta}>
            {payment.month || payment.paidOn || 'No date'}
            {allocation !== 'No allocation' ? ` / ${allocation}` : ''}
          </Text>
        </View>
        <StatusBadge status={status} styles={styles} />
      </View>

      <View style={styles.amountGrid}>
        <AmountCell label="Paid" styles={styles} value={money(getPaymentAmount(payment))} />
        <AmountCell danger={balance > 0} label="Balance" styles={styles} value={money(balance)} />
      </View>

      {payment.note ? <Text style={styles.note}>{String(payment.note)}</Text> : null}
      <Pressable disabled={deleting} onPress={onDelete} style={[styles.deleteButton, deleting && styles.disabledAction]}>
        <Text style={styles.deleteButtonText}>{deleting ? 'Deleting...' : 'Delete payment'}</Text>
      </Pressable>
    </View>
  );
}

function AmountCell({
  danger = false,
  label,
  styles,
  value,
}: {
  danger?: boolean;
  label: string;
  styles: ReturnType<typeof createStyles>;
  value: string;
}) {
  return (
    <View style={styles.amountCell}>
      <Text style={styles.amountLabel}>{label}</Text>
      <Text style={[styles.amountValue, danger && styles.amountDanger]}>{value}</Text>
    </View>
  );
}

function StatusBadge({ status, styles }: { status: string; styles: ReturnType<typeof createStyles> }) {
  const normalized = status.toLowerCase();
  const tone =
    normalized === 'paid'
      ? styles.badgeSuccess
      : normalized === 'partial'
        ? styles.badgeWarning
        : normalized === 'pending'
          ? styles.badgeDanger
          : styles.badgeNeutral;

  return (
    <View style={[styles.badge, tone]}>
      <Text style={styles.badgeText}>{status}</Text>
    </View>
  );
}

function EmptyMoneyState({
  clearFilters,
  styles,
}: {
  clearFilters: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No matching records</Text>
      <Text style={styles.emptyText}>Adjust search or filters to bring the right money records back into view.</Text>
      <Pressable onPress={clearFilters} style={styles.emptyAction}>
        <Text style={styles.emptyActionText}>Clear filters</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    hero: {
      backgroundColor: colors.ink,
      borderRadius: radius.lg,
      padding: spacing.lg,
    },
    heroTop: {
      gap: spacing.md,
    },
    kicker: {
      color: colors.panelAccent,
      fontSize: 13,
      fontWeight: typography.weight.black,
      textTransform: 'uppercase',
    },
    title: {
      color: colors.panelText,
      fontSize: 29,
      fontWeight: typography.weight.black,
      lineHeight: 34,
      marginTop: spacing.xs,
    },
    viewSwitch: {
      backgroundColor: colors.overlayFaint,
      borderRadius: radius.md,
      flexDirection: 'row',
      padding: spacing.xs,
    },
    switchItem: {
      alignItems: 'center',
      borderRadius: radius.sm,
      flex: 1,
      minHeight: 40,
      justifyContent: 'center',
    },
    switchItemActive: {
      backgroundColor: colors.surface,
    },
    switchText: {
      color: colors.panelMuted,
      fontSize: 13,
      fontWeight: typography.weight.black,
    },
    switchTextActive: {
      color: colors.text,
    },
    monthNavigator: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    monthButton: {
      alignItems: 'center',
      backgroundColor: colors.overlaySubtle,
      borderRadius: radius.md,
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
    },
    monthButtonText: {
      color: colors.panelText,
      fontSize: 13,
      fontWeight: typography.weight.black,
    },
    monthValue: {
      alignItems: 'center',
      backgroundColor: colors.overlayFaint,
      borderRadius: radius.md,
      flex: 1,
      minHeight: 52,
      justifyContent: 'center',
    },
    monthValueText: {
      color: colors.panelText,
      fontSize: 16,
      fontWeight: typography.weight.black,
    },
    monthValueHint: {
      color: colors.panelSubtle,
      fontSize: 11,
      fontWeight: typography.weight.bold,
      marginTop: 2,
    },
    heroMetrics: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    heroMetric: {
      backgroundColor: colors.overlayFaint,
      borderRadius: radius.md,
      flex: 1,
      padding: spacing.md,
    },
    heroMetricLabel: {
      color: colors.panelSubtle,
      fontSize: 11,
      fontWeight: typography.weight.black,
      textTransform: 'uppercase',
    },
    heroMetricValue: {
      color: colors.panelText,
      fontSize: 14,
      fontWeight: typography.weight.black,
      marginTop: spacing.xs,
    },
    heroMetricDanger: {
      color: colors.danger,
    },
    recordPaymentButton: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      marginTop: spacing.lg,
      minHeight: 48,
      justifyContent: 'center',
    },
    recordPaymentText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: typography.weight.black,
    },
    statusRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    statusText: {
      color: colors.muted,
      fontSize: 13,
      fontWeight: typography.weight.bold,
    },
    errorText: {
      backgroundColor: colors.dangerSoft,
      borderColor: colors.danger,
      borderRadius: radius.md,
      borderWidth: 1,
      color: colors.danger,
      fontSize: 13,
      fontWeight: typography.weight.bold,
      lineHeight: 19,
      marginTop: spacing.lg,
      padding: spacing.md,
    },
    toolbar: {
      gap: spacing.md,
      marginTop: spacing.lg,
    },
    filterRail: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    summaryCard: {
      backgroundColor: colors.surface,
      borderColor: colors.borderSoft,
      borderRadius: radius.lg,
      borderWidth: 1,
      marginTop: spacing.lg,
      padding: spacing.lg,
      ...shadow.card,
    },
    summaryLabel: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: typography.weight.black,
      textTransform: 'uppercase',
    },
    summaryValue: {
      color: colors.text,
      fontSize: 26,
      fontWeight: typography.weight.black,
      marginTop: spacing.xs,
    },
    summaryMeta: {
      color: colors.muted,
      fontSize: 13,
      fontWeight: typography.weight.bold,
      lineHeight: 19,
      marginTop: spacing.xs,
    },
    recordCard: {
      backgroundColor: colors.surface,
      borderColor: colors.borderSoft,
      borderRadius: radius.lg,
      borderWidth: 1,
      marginTop: spacing.md,
      padding: spacing.lg,
      ...shadow.card,
    },
    recordHeader: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: spacing.sm,
    },
    recordCopy: {
      flex: 1,
    },
    recordTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: typography.weight.black,
    },
    recordMeta: {
      color: colors.muted,
      fontSize: 13,
      fontWeight: typography.weight.bold,
      marginTop: spacing.xs,
    },
    badge: {
      borderRadius: radius.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    badgeSuccess: {
      backgroundColor: colors.successSoft,
    },
    badgeWarning: {
      backgroundColor: colors.warningSoft,
    },
    badgeDanger: {
      backgroundColor: colors.dangerSoft,
    },
    badgeNeutral: {
      backgroundColor: colors.accentSoft,
    },
    badgeText: {
      color: colors.text,
      fontSize: 11,
      fontWeight: typography.weight.black,
      textTransform: 'uppercase',
    },
    amountGrid: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    amountCell: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      flex: 1,
      padding: spacing.md,
    },
    amountLabel: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: typography.weight.black,
      textTransform: 'uppercase',
    },
    amountValue: {
      color: colors.success,
      fontSize: 14,
      fontWeight: typography.weight.black,
      marginTop: spacing.xs,
    },
    amountDanger: {
      color: colors.danger,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    actionButton: {
      alignItems: 'center',
      backgroundColor: colors.ink,
      borderRadius: radius.md,
      flex: 1,
      minHeight: 44,
      justifyContent: 'center',
    },
    actionButtonAccent: {
      backgroundColor: colors.success,
    },
    actionButtonSurface: {
      backgroundColor: colors.surfaceMuted,
    },
    disabledAction: {
      opacity: 0.45,
    },
    actionText: {
      color: colors.onBrand,
      fontSize: 13,
      fontWeight: typography.weight.black,
    },
    actionTextAlt: {
      color: colors.text,
      fontSize: 13,
      fontWeight: typography.weight.black,
    },
    deleteButton: {
      alignItems: 'center',
      backgroundColor: colors.dangerSoft,
      borderRadius: radius.md,
      marginTop: spacing.md,
      minHeight: 42,
      justifyContent: 'center',
    },
    deleteButtonText: {
      color: colors.danger,
      fontSize: 13,
      fontWeight: typography.weight.black,
    },
    note: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 19,
      marginTop: spacing.md,
    },
    emptyState: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.borderSoft,
      borderRadius: radius.lg,
      borderWidth: 1,
      marginTop: spacing.md,
      padding: spacing.xl,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: typography.weight.black,
      textAlign: 'center',
    },
    emptyText: {
      color: colors.muted,
      fontSize: 14,
      lineHeight: 20,
      marginTop: spacing.sm,
      textAlign: 'center',
    },
    emptyAction: {
      backgroundColor: colors.ink,
      borderRadius: radius.md,
      marginTop: spacing.lg,
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    emptyActionText: {
      color: colors.onBrand,
      fontSize: 13,
      fontWeight: typography.weight.black,
    },
    sheetBackdrop: {
      backgroundColor: 'rgba(0,0,0,0.54)',
      flex: 1,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      maxHeight: '92%',
      padding: spacing.lg,
    },
    sheetHandle: {
      alignSelf: 'center',
      backgroundColor: colors.border,
      borderRadius: radius.sm,
      height: 4,
      marginBottom: spacing.lg,
      width: 44,
    },
    sheetHeader: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: spacing.md,
      justifyContent: 'space-between',
    },
    sheetKicker: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: typography.weight.black,
      textTransform: 'uppercase',
    },
    sheetTitle: {
      color: colors.text,
      fontSize: 24,
      fontWeight: typography.weight.black,
      marginTop: spacing.xs,
    },
    sheetCloseButton: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    sheetCloseText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: typography.weight.black,
    },
    formLabel: {
      color: colors.text,
      fontSize: 13,
      fontWeight: typography.weight.black,
      marginBottom: spacing.sm,
      marginTop: spacing.lg,
      textTransform: 'uppercase',
    },
    tenantPicker: {
      maxHeight: 156,
    },
    tenantPickerContent: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    formHelpText: {
      color: colors.muted,
      fontSize: 14,
      fontWeight: typography.weight.bold,
      lineHeight: 20,
    },
    formGrid: {
      gap: spacing.md,
      marginTop: spacing.lg,
    },
    formSummary: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginVertical: spacing.lg,
    },
    sheetActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    sheetSecondaryAction: {
      alignItems: 'center',
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      flex: 1,
      minHeight: 48,
      justifyContent: 'center',
    },
    sheetSecondaryText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: typography.weight.black,
    },
    sheetPrimaryAction: {
      alignItems: 'center',
      backgroundColor: colors.ink,
      borderRadius: radius.md,
      flex: 1,
      minHeight: 48,
      justifyContent: 'center',
    },
    sheetPrimaryText: {
      color: colors.onBrand,
      fontSize: 14,
      fontWeight: typography.weight.black,
    },
  });
}
