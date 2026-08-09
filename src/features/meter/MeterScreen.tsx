import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { addDoc, collection, deleteDoc, doc, getDocs, limit, orderBy, query, serverTimestamp, where } from 'firebase/firestore';

import { radius, shadow, spacing, typography, useAppTheme, type AppColors } from '../../design/tokens';
import { db } from '../../lib/firebase/client';
import { TextField } from '../../shared/components/TextField';
import { useFirestoreCollection } from '../../shared/hooks/useFirestoreCollection';
import type { MeterReadingRecord, TenantRecord } from '../../shared/types/records';
import { money, toNumber } from '../../shared/utils/money';
import { FilterPill } from '../customers/FilterPill';
import { getCustomerAllocationLabel, getCustomerStatus } from '../customers/customerUtils';
import { getMonthKey } from '../operations/operationsMath';
import { useLanguage } from '../../shared/i18n/LanguageProvider';

const RATE_PER_UNIT = 10;

type MeterDraft = {
  billAmount: number;
  currentReading: number;
  month: string;
  note: string;
  previousReading: number;
  ratePerUnit: number;
  tenantId: string;
  tenantName: string;
  tenantRoom: string;
  unitsConsumed: number;
};

function getTenantName(tenant: TenantRecord) {
  return tenant.name || tenant.fullName || tenant.tenantName || 'Unnamed';
}

function isMeterCustomer(tenant: TenantRecord) {
  const businessType = String(tenant.businessType || 'pg');
  const activeStatuses = ['active', 'booked', 'checked in', 'occupied'];

  return ['pg', 'hotel'].includes(businessType) && activeStatuses.includes(getCustomerStatus(tenant)) && Boolean(tenant.room);
}

function matchesSearch(reading: MeterReadingRecord, search: string) {
  const queryText = search.trim().toLowerCase();

  if (!queryText) return true;

  return [reading.tenantName, reading.tenantRoom, reading.month, reading.note].some((value) =>
    String(value || '').toLowerCase().includes(queryText),
  );
}

function getUnitsTotal(readings: MeterReadingRecord[]) {
  return readings.reduce((sum, reading) => sum + toNumber(reading.unitsConsumed), 0);
}

function getBillTotal(readings: MeterReadingRecord[]) {
  return readings.reduce((sum, reading) => sum + toNumber(reading.billAmount), 0);
}

export function MeterScreen() {
  const { colors } = useAppTheme();
  const { t } = useLanguage();
  const styles = createStyles(colors);
  const [search, setSearch] = useState('');
  const [tenantFilter, setTenantFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [actionError, setActionError] = useState('');
  const tenants = useFirestoreCollection<TenantRecord>('tenants', { sortBy: 'createdAt' });
  const readings = useFirestoreCollection<MeterReadingRecord>('meterReadings', { sortBy: 'createdAt' });
  const meterCustomers = useMemo(() => tenants.data.filter(isMeterCustomer), [tenants.data]);
  const filtered = useMemo(
    () =>
      readings.data.filter((reading) => {
        const tenantMatches = tenantFilter ? reading.tenantId === tenantFilter : true;
        return tenantMatches && matchesSearch(reading, search);
      }),
    [readings.data, search, tenantFilter],
  );
  const totalUnits = getUnitsTotal(filtered);
  const totalBill = getBillTotal(filtered);
  const loading = tenants.loading || readings.loading;
  const error = tenants.error || readings.error;

  function clearFilters() {
    setSearch('');
    setTenantFilter('');
  }

  async function createReading(payload: MeterDraft) {
    setSaving(true);
    setActionError('');

    try {
      await addDoc(collection(db, 'meterReadings'), {
        ...payload,
        createdAt: serverTimestamp(),
      });
      setShowForm(false);
    } catch (createError) {
      setActionError(createError instanceof Error ? createError.message : t('Could not save meter reading.'));
    } finally {
      setSaving(false);
    }
  }

  async function deleteReading(readingId: string) {
    setDeletingId(readingId);
    setActionError('');

    try {
      await deleteDoc(doc(db, 'meterReadings', readingId));
    } catch (deleteError) {
      setActionError(deleteError instanceof Error ? deleteError.message : t('Could not delete meter reading.'));
    } finally {
      setDeletingId('');
    }
  }

  function confirmDelete(reading: MeterReadingRecord) {
    Alert.alert(t('Delete reading?'), `${t('Delete reading for')} ${reading.tenantName || t('this customer')}? ${t('This cannot be undone.')}`, [
      { text: t('Cancel'), style: 'cancel' },
      { text: t('Delete'), style: 'destructive', onPress: () => deleteReading(reading.id) },
    ]);
  }

  return (
    <View style={styles.wrap}>
      {showForm ? (
        <MeterFormSheet onClose={() => setShowForm(false)} onSubmit={createReading} saving={saving} styles={styles} tenants={meterCustomers} />
      ) : null}

      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.kicker}>{t('Electricity')}</Text>
            <Text style={styles.title}>{t('Meter readings')}</Text>
            <Text style={styles.subtitle}>{t('Add readings and calculate the bill for each room.')}</Text>
          </View>
          <Pressable
            onPress={() => {
              setActionError('');
              setShowForm(true);
            }}
            style={styles.addButton}
          >
            <Text style={styles.addButtonText}>{t('Add reading')}</Text>
          </Pressable>
        </View>

        <View style={styles.metrics}>
          <Metric label={t('Readings')} styles={styles} value={String(filtered.length)} />
          <Metric label={t('Units')} styles={styles} value={String(totalUnits)} />
          <Metric label={t('Bill')} styles={styles} value={money(totalBill)} />
        </View>
      </View>

      {loading ? (
        <View style={styles.statusRow}>
          <ActivityIndicator color={colors.brand} />
          <Text style={styles.statusText}>{t('Loading meter readings')}</Text>
        </View>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {actionError ? <Text style={styles.errorText}>{actionError}</Text> : null}

      <View style={styles.toolbar}>
        <TextField label="Search readings" onChangeText={setSearch} placeholder="Name, room, month, note..." value={search} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRail}>
          <FilterPill active={!tenantFilter} label="All" onPress={() => setTenantFilter('')} />
          {meterCustomers.slice(0, 40).map((tenant) => (
            <FilterPill active={tenantFilter === tenant.id} key={tenant.id} label={getTenantName(tenant)} onPress={() => setTenantFilter(tenant.id)} />
          ))}
        </ScrollView>
      </View>

      {filtered.length ? (
        filtered.slice(0, 50).map((reading) => (
          <MeterCard deleting={deletingId === reading.id} key={reading.id} onDelete={() => confirmDelete(reading)} reading={reading} styles={styles} />
        ))
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>{t('No readings found')}</Text>
          <Text style={styles.emptyText}>{t('Add a reading or change the filters.')}</Text>
          <Pressable onPress={readings.data.length ? clearFilters : () => setShowForm(true)} style={styles.emptyAction}>
            <Text style={styles.emptyActionText}>{t(readings.data.length ? 'Clear filters' : 'Add reading')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function MeterFormSheet({
  onClose,
  onSubmit,
  saving,
  styles,
  tenants,
}: {
  onClose: () => void;
  onSubmit: (payload: MeterDraft) => void;
  saving: boolean;
  styles: ReturnType<typeof createStyles>;
  tenants: TenantRecord[];
}) {
  const { t } = useLanguage();
  const [tenantId, setTenantId] = useState(tenants[0]?.id || '');
  const [month, setMonth] = useState(getMonthKey());
  const [currentReading, setCurrentReading] = useState('');
  const [previousReading, setPreviousReading] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [loadingPrevious, setLoadingPrevious] = useState(false);
  const [formError, setFormError] = useState('');
  const selectedTenant = tenants.find((tenant) => tenant.id === tenantId);
  const current = toNumber(currentReading);
  const previous = previousReading ?? 0;
  const unitsConsumed = previousReading === null ? 0 : Math.max(0, current - previous);
  const billAmount = unitsConsumed * RATE_PER_UNIT;

  async function loadPrevious(nextTenantId: string) {
    setTenantId(nextTenantId);
    setCurrentReading('');
    setPreviousReading(null);
    setFormError('');

    if (!nextTenantId) return;

    setLoadingPrevious(true);

    try {
      const readingQuery = query(
        collection(db, 'meterReadings'),
        where('tenantId', '==', nextTenantId),
        orderBy('createdAt', 'desc'),
        limit(1),
      );
      const snap = await getDocs(readingQuery);
      setPreviousReading(snap.empty ? 0 : toNumber(snap.docs[0].data().currentReading));
    } catch (readError) {
      setPreviousReading(0);
      setFormError(readError instanceof Error ? readError.message : t('Could not load previous reading.'));
    } finally {
      setLoadingPrevious(false);
    }
  }

  function submit() {
    if (!selectedTenant) {
      setFormError(t('Select a customer first.'));
      return;
    }

    if (!month.trim() || !currentReading) {
      setFormError(t('Month and current reading are required.'));
      return;
    }

    if (previousReading !== null && current < previous) {
      setFormError(`${t('Current reading cannot be less than previous reading')} (${previous}).`);
      return;
    }

    onSubmit({
      billAmount,
      currentReading: current,
      month: month.trim(),
      note: note.trim(),
      previousReading: previous,
      ratePerUnit: RATE_PER_UNIT,
      tenantId: selectedTenant.id,
      tenantName: getTenantName(selectedTenant),
      tenantRoom: getCustomerAllocationLabel(selectedTenant),
      unitsConsumed,
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
                <Text style={styles.sheetKicker}>{t('Electricity')}</Text>
                <Text style={styles.sheetTitle}>{t('Add reading')}</Text>
              </View>
              <Pressable disabled={saving} onPress={onClose} style={styles.sheetCloseButton}>
                <Text style={styles.sheetCloseText}>{t('Close')}</Text>
              </Pressable>
            </View>

            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

            <Text style={styles.formLabel}>{t('Customer')}</Text>
            {tenants.length ? (
              <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} style={styles.tenantPicker} contentContainerStyle={styles.tenantPickerContent}>
                {tenants.slice(0, 80).map((tenant) => (
                  <FilterPill
                    active={tenantId === tenant.id}
                    key={tenant.id}
                    label={`${getTenantName(tenant)} / ${getCustomerAllocationLabel(tenant)}`}
                    onPress={() => loadPrevious(tenant.id)}
                  />
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.helpText}>{t('No rooms available for meter readings.')}</Text>
            )}

            <View style={styles.formGrid}>
              <TextField label="Month" onChangeText={setMonth} placeholder="2026-08" value={month} />
              <TextField keyboardType="numeric" label="Current reading" onChangeText={setCurrentReading} placeholder="1250" value={currentReading} />
            </View>

            <View style={styles.readingSummary}>
              <MeterMini label={t('Previous')} styles={styles} value={loadingPrevious ? t('Loading') : String(previous)} />
              <MeterMini label={t('Current')} styles={styles} value={String(current)} />
              <MeterMini label={t('Units')} styles={styles} value={String(unitsConsumed)} />
              <MeterMini label={t('Bill')} styles={styles} value={money(billAmount)} />
            </View>

            <TextField label="Note" onChangeText={setNote} placeholder="Optional note" value={note} />

            <View style={styles.sheetActions}>
              <Pressable disabled={saving} onPress={onClose} style={[styles.sheetSecondaryAction, saving && styles.disabled]}>
                <Text style={styles.sheetSecondaryText}>{t('Cancel')}</Text>
              </Pressable>
              <Pressable disabled={saving} onPress={submit} style={[styles.sheetPrimaryAction, saving && styles.disabled]}>
                {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.sheetPrimaryText}>{t('Save reading')}</Text>}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function MeterCard({
  deleting,
  onDelete,
  reading,
  styles,
}: {
  deleting: boolean;
  onDelete: () => void;
  reading: MeterReadingRecord;
  styles: ReturnType<typeof createStyles>;
}) {
  const { t } = useLanguage();
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle}>{reading.tenantName || t('Meter reading')}</Text>
          <Text style={styles.cardMeta}>
            {reading.month || t('No month')}
            {reading.tenantRoom ? ` / ${reading.tenantRoom}` : ''}
          </Text>
        </View>
        <Text style={styles.billText}>{money(reading.billAmount)}</Text>
      </View>

      <View style={styles.grid}>
        <MeterMini label={t('Previous')} styles={styles} value={String(toNumber(reading.previousReading))} />
        <MeterMini label={t('Current')} styles={styles} value={String(toNumber(reading.currentReading))} />
      </View>
      <View style={styles.grid}>
        <MeterMini label={t('Units')} styles={styles} value={String(toNumber(reading.unitsConsumed))} />
        <MeterMini label={t('Rate')} styles={styles} value={money(reading.ratePerUnit)} />
      </View>

      {reading.note ? <Text style={styles.note}>{String(reading.note)}</Text> : null}
      <Pressable disabled={deleting} onPress={onDelete} style={[styles.deleteButton, deleting && styles.disabled]}>
        <Text style={styles.deleteText}>{t(deleting ? 'Deleting...' : 'Delete reading')}</Text>
      </Pressable>
    </View>
  );
}

function MeterMini({ label, styles, value }: { label: string; styles: ReturnType<typeof createStyles>; value: string }) {
  return (
    <View style={styles.miniBox}>
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={styles.miniValue}>{value}</Text>
    </View>
  );
}

function Metric({ label, styles, value }: { label: string; styles: ReturnType<typeof createStyles>; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    wrap: {
      gap: spacing.lg,
    },
    hero: {
      backgroundColor: colors.surface,
      borderColor: colors.borderSoft,
      borderRadius: radius.lg,
      borderWidth: 1,
      padding: spacing.lg,
      ...shadow.card,
    },
    heroTop: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: spacing.md,
      justifyContent: 'space-between',
    },
    kicker: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: typography.weight.black,
      textTransform: 'uppercase',
    },
    title: {
      color: colors.text,
      fontSize: 24,
      fontWeight: typography.weight.black,
      marginTop: spacing.xs,
    },
    subtitle: {
      color: colors.muted,
      fontSize: 14,
      lineHeight: 21,
      marginTop: spacing.sm,
    },
    addButton: {
      backgroundColor: colors.ink,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    addButtonText: {
      color: colors.onBrand,
      fontSize: 13,
      fontWeight: typography.weight.black,
    },
    metrics: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    metric: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      flex: 1,
      padding: spacing.md,
    },
    metricLabel: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: typography.weight.black,
      textTransform: 'uppercase',
    },
    metricValue: {
      color: colors.text,
      fontSize: 16,
      fontWeight: typography.weight.black,
      marginTop: spacing.xs,
    },
    statusRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
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
      padding: spacing.md,
    },
    toolbar: {
      gap: spacing.md,
    },
    filterRail: {
      gap: spacing.sm,
      paddingRight: spacing.lg,
    },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.borderSoft,
      borderRadius: radius.lg,
      borderWidth: 1,
      padding: spacing.lg,
      ...shadow.card,
    },
    cardHeader: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: spacing.sm,
    },
    cardCopy: {
      flex: 1,
    },
    cardTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: typography.weight.black,
    },
    cardMeta: {
      color: colors.muted,
      fontSize: 13,
      fontWeight: typography.weight.bold,
      marginTop: spacing.xs,
    },
    billText: {
      color: colors.warning,
      fontSize: 16,
      fontWeight: typography.weight.black,
    },
    grid: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    miniBox: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      flex: 1,
      padding: spacing.md,
    },
    miniLabel: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: typography.weight.black,
      textTransform: 'uppercase',
    },
    miniValue: {
      color: colors.text,
      fontSize: 14,
      fontWeight: typography.weight.black,
      marginTop: spacing.xs,
    },
    note: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 19,
      marginTop: spacing.md,
    },
    deleteButton: {
      alignItems: 'center',
      backgroundColor: colors.dangerSoft,
      borderRadius: radius.md,
      marginTop: spacing.md,
      minHeight: 42,
      justifyContent: 'center',
    },
    deleteText: {
      color: colors.danger,
      fontSize: 13,
      fontWeight: typography.weight.black,
    },
    disabled: {
      opacity: 0.45,
    },
    emptyState: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.borderSoft,
      borderRadius: radius.lg,
      borderWidth: 1,
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
    helpText: {
      color: colors.muted,
      fontSize: 14,
      fontWeight: typography.weight.bold,
      lineHeight: 20,
    },
    formGrid: {
      gap: spacing.md,
      marginTop: spacing.lg,
    },
    readingSummary: {
      flexDirection: 'row',
      flexWrap: 'wrap',
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
