import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { addDoc, collection, doc, onSnapshot, query, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, shadow, spacing, typography, useAppTheme, type AppColors } from '../../design/tokens';
import { auth, db } from '../../lib/firebase/client';
import { TextField } from '../../shared/components/TextField';
import { useLanguage } from '../../shared/i18n/LanguageProvider';
import type { CustomerProfile } from '../../shared/types/admin';
import type { NoticeRecord, PaymentRecord, SupportRequestRecord, TenantRecord } from '../../shared/types/records';
import { money } from '../../shared/utils/money';
import { getBusinessType } from '../customers/businessTypes';
import { getCustomerAllocationLabel, getCustomerName, getCustomerStatusGroup, getCustomerStatusLabel } from '../customers/customerUtils';
import { calculateMonthlyDues, getMonthDisplay, getMonthKey, getPaymentAmount, isVoided } from '../operations/operationsMath';
import { buildReceiptHtml, downloadPdf } from '../money/MoneyScreen';
import { mergeCustomerNotices } from './customerNotices';

type CustomerData = {
  customer: TenantRecord | null;
  error: string;
  loading: boolean;
  notices: NoticeRecord[];
  payments: PaymentRecord[];
  requests: SupportRequestRecord[];
  refresh: () => void;
  refreshing: boolean;
};

export function CustomerWorkspaceScreen({ onSignOut, profile }: { onSignOut: () => void; profile: CustomerProfile }) {
  const { colors } = useAppTheme();
  const { t } = useLanguage();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const { customer, error, loading, notices, payments, refresh, refreshing, requests } = useCustomerData(profile.customerId);
  const [requestType, setRequestType] = useState<'issue' | 'profile_correction'>('issue');
  const [requestMessage, setRequestMessage] = useState('');
  const [requestBusy, setRequestBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [receiptBusyId, setReceiptBusyId] = useState('');
  const month = getMonthKey();
  const isStaying = customer ? getCustomerStatusGroup(customer) === 'active' : false;
  const due = useMemo(
    () => customer && isStaying ? calculateMonthlyDues([customer], payments, month)[0] : null,
    [customer, isStaying, month, payments],
  );
  const business = getBusinessType(customer?.businessType);

  async function shareReceipt(payment: PaymentRecord) {
    if (!customer) return;
    setReceiptBusyId(payment.id);
    setActionError('');
    try {
      await downloadPdf({
        fileName: `kothari-receipt-${payment.id}.pdf`,
        html: buildReceiptHtml(payment, [customer], t),
        title: t('Payment receipt'),
      });
    } catch (receiptError) {
      setActionError(receiptError instanceof Error ? receiptError.message : t('Could not prepare receipt.'));
    } finally {
      setReceiptBusyId('');
    }
  }

  async function submitRequest() {
    const message = requestMessage.trim();
    const actorUid = auth.currentUser?.uid;
    if (!message) return setActionError(t('Describe what you need help with.'));
    if (!actorUid || !customer) return setActionError(t('Please sign in again.'));

    setRequestBusy(true);
    setActionError('');
    try {
      await addDoc(collection(db, 'supportRequests'), {
        createdAt: serverTimestamp(),
        createdBy: actorUid,
        customerId: profile.customerId,
        customerName: getCustomerName(customer),
        message,
        status: 'open',
        type: requestType,
      });
      setRequestMessage('');
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : t('Could not send request.'));
    } finally {
      setRequestBusy(false);
    }
  }

  useEffect(() => {
    if (profile.accessStatus !== 'invited') return;

    const batch = writeBatch(db);
    const activation = { accessStatus: 'active', activatedAt: serverTimestamp(), updatedAt: serverTimestamp() };
    batch.update(doc(db, 'users', profile.uid), activation);
    batch.update(doc(db, 'tenants', profile.customerId), activation);
    batch.commit().catch(() => undefined);
  }, [profile.accessStatus, profile.customerId, profile.uid]);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top + spacing.sm, spacing.lg) }]}>
        <View style={styles.brandMark}><Text style={styles.brandMarkText}>K</Text></View>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Kothari</Text>
          <Text numberOfLines={1} style={styles.headerTitle}>{profile.name}</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onSignOut} style={styles.signOutButton}>
          <Text style={styles.signOutText}>{t('Logout')}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}
        refreshControl={<RefreshControl colors={[colors.brand]} onRefresh={refresh} refreshing={refreshing} tintColor={colors.brand} />}
      >
        {loading ? <View style={styles.status}><ActivityIndicator color={colors.brand} /><Text style={styles.statusText}>{t('Loading latest details')}</Text></View> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {actionError ? <Text style={styles.error}>{actionError}</Text> : null}

        {customer ? (
          <>
            <View style={styles.hero}>
              <Text style={styles.kicker}>{t(business.label)}</Text>
              <Text style={styles.title}>{t('Hi')}, {getCustomerName(customer)}</Text>
              <Text style={styles.subtitle}>{getCustomerAllocationLabel(customer)} · {t(getCustomerStatusLabel(customer))}</Text>
              <View style={styles.dueCard}>
                <View>
                  <Text style={styles.dueLabel}>{t(isStaying ? 'Due balance' : 'Payment starts after check-in')}</Text>
                  <Text style={styles.dueMonth}>{getMonthDisplay(month)}</Text>
                </View>
                <Text style={[styles.dueValue, due?.balance ? styles.dueValuePending : null]}>{isStaying ? money(due?.balance || 0) : '—'}</Text>
              </View>
            </View>

            <View style={styles.details}>
              <Text style={styles.sectionTitle}>{t('Current details')}</Text>
              <DetailRow label={t(business.unitLabel)} styles={styles} value={getCustomerAllocationLabel(customer)} />
              <DetailRow label={t(business.startDateLabel)} styles={styles} value={String(customer.moveInDate || customer.checkInDate || '—')} />
              <DetailRow label={t(business.endDateLabel)} styles={styles} value={String(customer.moveOutDate || customer.checkoutDate || customer.endDate || '—')} />
              <DetailRow label={t('Status')} styles={styles} value={t(getCustomerStatusLabel(customer))} />
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('Latest payments')}</Text>
              <Text style={styles.sectionMeta}>{payments.length}</Text>
            </View>
            <View style={styles.card}>
              {payments.length ? payments.slice(0, 5).map((payment, index) => (
                <View key={payment.id} style={[styles.row, index > 0 && styles.rowBorder]}>
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowTitle}>{String(payment.month || payment.paidOn || t('Payment'))}</Text>
                    <Text style={styles.rowMeta}>{String(payment.status || t('Paid'))}</Text>
                  </View>
                  <View style={styles.paymentAction}>
                    <Text style={styles.rowValue}>{money(getPaymentAmount(payment))}</Text>
                    <Pressable disabled={receiptBusyId === payment.id} onPress={() => shareReceipt(payment)}>
                      <Text style={styles.receiptLink}>{t(receiptBusyId === payment.id ? 'Preparing...' : 'Receipt')}</Text>
                    </Pressable>
                  </View>
                </View>
              )) : <Text style={styles.emptyText}>{t('No payments recorded yet.')}</Text>}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('Notices')}</Text>
              <Text style={styles.sectionMeta}>{notices.length}</Text>
            </View>
            <View style={styles.card}>
              {notices.length ? notices.slice(0, 3).map((notice, index) => (
                <View key={notice.id} style={[styles.notice, index > 0 && styles.rowBorder]}>
                  <Text style={styles.rowTitle}>{String(notice.title || t('Notice'))}</Text>
                  <Text style={styles.noticeText}>{String(notice.message || '')}</Text>
                </View>
              )) : <Text style={styles.emptyText}>{t('No notices found')}</Text>}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('Help requests')}</Text>
              <Text style={styles.sectionMeta}>{requests.length}</Text>
            </View>
            <View style={styles.helpCard}>
              <View style={styles.requestTypes}>
                {([
                  { label: 'Support issue', value: 'issue' },
                  { label: 'Profile correction', value: 'profile_correction' },
                ] as const).map((item) => (
                  <Pressable key={item.value} onPress={() => setRequestType(item.value)} style={[styles.requestType, requestType === item.value && styles.requestTypeActive]}>
                    <Text style={[styles.requestTypeText, requestType === item.value && styles.requestTypeTextActive]}>{t(item.label)}</Text>
                  </Pressable>
                ))}
              </View>
              <TextField multiline label="How can we help?" numberOfLines={4} onChangeText={setRequestMessage} placeholder="Describe the issue or correction..." style={styles.messageInput} textAlignVertical="top" value={requestMessage} />
              <Pressable disabled={requestBusy} onPress={submitRequest} style={[styles.submitRequest, requestBusy && styles.disabled]}>
                <Text style={styles.submitRequestText}>{t(requestBusy ? 'Sending...' : 'Send request')}</Text>
              </Pressable>
              {requests.slice(0, 3).map((request) => (
                <View key={request.id} style={styles.requestRow}>
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowTitle}>{t(request.type === 'profile_correction' ? 'Profile correction' : 'Support issue')}</Text>
                    <Text numberOfLines={2} style={styles.rowMeta}>{request.message}</Text>
                    {request.response ? <Text numberOfLines={3} style={styles.requestResponse}>{request.response}</Text> : null}
                  </View>
                  <Text style={styles.requestStatus}>{t(request.status === 'in_progress' ? 'In progress' : request.status === 'resolved' ? 'Resolved' : 'Open')}</Text>
                </View>
              ))}
            </View>
          </>
        ) : !loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{t('Setup needed')}</Text>
            <Text style={styles.emptyText}>{t('Your account is not linked to a customer record yet.')}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function useCustomerData(customerId: string): CustomerData {
  const [customer, setCustomer] = useState<TenantRecord | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [notices, setNotices] = useState<NoticeRecord[]>([]);
  const [requests, setRequests] = useState<SupportRequestRecord[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => {
    setRefreshing(true);
    setRefreshKey((current) => current + 1);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    let broadcastNotices: NoticeRecord[] = [];
    let directNotices: NoticeRecord[] = [];
    const updateNotices = () => setNotices(mergeCustomerNotices(broadcastNotices, directNotices));

    const stopCustomer = onSnapshot(doc(db, 'tenants', customerId), (snapshot) => {
      setCustomer(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as TenantRecord : null);
      setLoading(false);
      setRefreshing(false);
    }, (snapshotError) => {
      setError(snapshotError.message);
      setLoading(false);
      setRefreshing(false);
    });
    const stopPayments = onSnapshot(query(collection(db, 'payments'), where('tenantId', '==', customerId)), (snapshot) => {
      setPayments(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as PaymentRecord)).filter((item) => !isVoided(item)).sort((a, b) => Number(b.createdAt?.seconds || 0) - Number(a.createdAt?.seconds || 0)));
    }, (snapshotError) => setError(snapshotError.message));
    const stopBroadcastNotices = onSnapshot(query(collection(db, 'notices'), where('audience', '==', 'all')), (snapshot) => {
      broadcastNotices = snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as NoticeRecord));
      updateNotices();
    }, (snapshotError) => setError(snapshotError.message));
    const stopDirectNotices = onSnapshot(query(collection(db, 'notices'), where('audience', '==', 'customer'), where('tenantId', '==', customerId)), (snapshot) => {
      directNotices = snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as NoticeRecord));
      updateNotices();
    }, (snapshotError) => setError(snapshotError.message));
    const stopRequests = onSnapshot(query(collection(db, 'supportRequests'), where('customerId', '==', customerId)), (snapshot) => {
      setRequests(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as SupportRequestRecord)).sort((a, b) => Number(b.createdAt?.seconds || 0) - Number(a.createdAt?.seconds || 0)));
    }, (snapshotError) => setError(snapshotError.message));

    return () => {
      stopCustomer();
      stopPayments();
      stopBroadcastNotices();
      stopDirectNotices();
      stopRequests();
    };
  }, [customerId, refreshKey]);

  return { customer, error, loading, notices, payments, refresh, refreshing, requests };
}

function DetailRow({ label, styles, value }: { label: string; styles: ReturnType<typeof createStyles>; value: string }) {
  return <View style={styles.detailRow}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>;
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: { backgroundColor: colors.canvas, flex: 1 },
    header: { alignItems: 'center', backgroundColor: colors.ink, flexDirection: 'row', gap: spacing.md, paddingBottom: spacing.lg, paddingHorizontal: spacing.lg },
    brandMark: { alignItems: 'center', backgroundColor: colors.copper, borderRadius: radius.md, height: 42, justifyContent: 'center', width: 42 },
    brandMarkText: { color: colors.onBrand, fontSize: 20, fontWeight: typography.weight.black },
    headerCopy: { flex: 1 },
    eyebrow: { color: colors.panelSubtle, fontSize: 11, fontWeight: typography.weight.bold, textTransform: 'uppercase' },
    headerTitle: { color: colors.panelText, fontSize: 18, fontWeight: typography.weight.black, marginTop: 2 },
    signOutButton: { backgroundColor: colors.overlaySubtle, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    signOutText: { color: colors.panelText, fontSize: 12, fontWeight: typography.weight.black },
    content: { alignSelf: 'center', maxWidth: 720, padding: spacing.lg, width: '100%' },
    status: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', padding: spacing.xl },
    statusText: { color: colors.muted, fontSize: 13, fontWeight: typography.weight.bold },
    error: { backgroundColor: colors.dangerSoft, borderRadius: radius.md, color: colors.danger, marginBottom: spacing.md, padding: spacing.md },
    hero: { backgroundColor: colors.ink, borderRadius: radius.lg, padding: spacing.lg, ...shadow.card },
    kicker: { color: colors.panelAccent, fontSize: 11, fontWeight: typography.weight.black, textTransform: 'uppercase' },
    title: { color: colors.panelText, fontSize: 27, fontWeight: typography.weight.black, lineHeight: 34, marginTop: spacing.sm },
    subtitle: { color: colors.panelMuted, fontSize: 14, marginTop: spacing.sm },
    dueCard: { alignItems: 'center', backgroundColor: colors.overlayFaint, borderRadius: radius.md, flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xl, padding: spacing.md },
    dueLabel: { color: colors.panelText, fontSize: 13, fontWeight: typography.weight.black },
    dueMonth: { color: colors.panelMuted, fontSize: 11, marginTop: 3 },
    dueValue: { color: colors.success, fontSize: 24, fontWeight: typography.weight.black },
    dueValuePending: { color: colors.panelAccent },
    details: { backgroundColor: colors.surface, borderColor: colors.borderSoft, borderRadius: radius.lg, borderWidth: 1, marginTop: spacing.lg, padding: spacing.lg, ...shadow.card },
    sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm, marginTop: spacing.xl },
    sectionTitle: { color: colors.text, fontSize: 18, fontWeight: typography.weight.black },
    sectionMeta: { color: colors.muted, fontSize: 12, fontWeight: typography.weight.bold },
    detailRow: { alignItems: 'center', borderTopColor: colors.borderSoft, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 46 },
    detailLabel: { color: colors.muted, flex: 1, fontSize: 13, fontWeight: typography.weight.bold },
    detailValue: { color: colors.text, flex: 1, fontSize: 13, fontWeight: typography.weight.black, textAlign: 'right' },
    card: { backgroundColor: colors.surface, borderColor: colors.borderSoft, borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing.lg, ...shadow.card },
    row: { alignItems: 'center', flexDirection: 'row', minHeight: 64 },
    rowBorder: { borderTopColor: colors.borderSoft, borderTopWidth: 1 },
    rowCopy: { flex: 1 },
    rowTitle: { color: colors.text, fontSize: 14, fontWeight: typography.weight.black },
    rowMeta: { color: colors.muted, fontSize: 12, marginTop: 3 },
    rowValue: { color: colors.success, fontSize: 15, fontWeight: typography.weight.black },
    paymentAction: { alignItems: 'flex-end', gap: spacing.xs },
    receiptLink: { color: colors.brand, fontSize: 12, fontWeight: typography.weight.black },
    notice: { paddingVertical: spacing.md },
    noticeText: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: spacing.xs },
    emptyState: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, marginTop: spacing.lg, padding: spacing.xl },
    emptyTitle: { color: colors.text, fontSize: 20, fontWeight: typography.weight.black },
    emptyText: { color: colors.muted, fontSize: 13, lineHeight: 20, paddingVertical: spacing.lg, textAlign: 'center' },
    helpCard: { backgroundColor: colors.surface, borderColor: colors.borderSoft, borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, ...shadow.card },
    requestTypes: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
    requestType: { backgroundColor: colors.surfaceRaised, borderRadius: radius.md, flex: 1, padding: spacing.sm },
    requestTypeActive: { backgroundColor: colors.ink },
    requestTypeText: { color: colors.muted, fontSize: 12, fontWeight: typography.weight.black, textAlign: 'center' },
    requestTypeTextActive: { color: colors.onBrand },
    messageInput: { minHeight: 96, paddingTop: spacing.md },
    submitRequest: { alignItems: 'center', backgroundColor: colors.brand, borderRadius: radius.md, marginTop: spacing.md, padding: spacing.md },
    submitRequestText: { color: colors.onBrand, fontSize: 13, fontWeight: typography.weight.black },
    disabled: { opacity: 0.55 },
    requestRow: { alignItems: 'center', borderTopColor: colors.borderSoft, borderTopWidth: 1, flexDirection: 'row', gap: spacing.md, marginTop: spacing.md, paddingTop: spacing.md },
    requestStatus: { color: colors.brand, fontSize: 11, fontWeight: typography.weight.black },
    requestResponse: { color: colors.success, fontSize: 12, lineHeight: 18, marginTop: spacing.xs },
  });
}
