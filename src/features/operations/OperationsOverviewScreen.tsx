import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { radius, shadow, spacing, typography, useAppTheme, type AppColors } from '../../design/tokens';
import { useFirestoreCollection } from '../../shared/hooks/useFirestoreCollection';
import type { ExpenseRecord, PaymentRecord, TenantRecord } from '../../shared/types/records';
import { money } from '../../shared/utils/money';
import {
  calculateMonthlyDues,
  getCollectedTotal,
  getDayKey,
  getExpenseTotal,
  getMonthDisplay,
  getMonthKey,
  matchesDay,
  matchesMonth,
  shiftMonth,
  summarizeDues,
} from './operationsMath';
import { MetricTile } from './MetricTile';

type DashboardPeriod = 'Today' | 'Month' | 'All';
const dashboardPeriods: DashboardPeriod[] = ['Today', 'Month', 'All'];

export function OperationsOverviewScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [period, setPeriod] = useState<DashboardPeriod>('Month');
  const [selectedMonth, setSelectedMonth] = useState(getMonthKey());
  const [selectedAction, setSelectedAction] = useState('dues');
  const tenants = useFirestoreCollection<TenantRecord>('tenants', { sortBy: 'createdAt' });
  const payments = useFirestoreCollection<PaymentRecord>('payments', { sortBy: 'createdAt' });
  const expenses = useFirestoreCollection<ExpenseRecord>('expenses', { sortBy: 'createdAt' });
  const enquiries = useFirestoreCollection('enquiries', { sortBy: 'createdAt' });
  const notices = useFirestoreCollection('notices', { sortBy: 'createdAt' });
  const meterReadings = useFirestoreCollection('meterReadings', { sortBy: 'createdAt' });

  const loading =
    tenants.loading ||
    payments.loading ||
    expenses.loading ||
    enquiries.loading ||
    notices.loading ||
    meterReadings.loading;
  const error =
    tenants.error ||
    payments.error ||
    expenses.error ||
    enquiries.error ||
    notices.error ||
    meterReadings.error;
  const currentMonth = getMonthKey();
  const reportMonth = period === 'Month' ? selectedMonth : currentMonth;
  const today = getDayKey();
  const paymentDateFields = ['paidOn', 'date', 'createdAt', 'updatedAt'];
  const expenseDateFields = ['date', 'expenseDate', 'createdAt', 'updatedAt'];
  const activityDateFields = ['createdAt', 'updatedAt', 'date'];
  const periodPayments = period === 'All'
    ? payments.data
    : period === 'Today'
      ? payments.data.filter((payment) => matchesDay(payment, today, paymentDateFields))
      : payments.data.filter((payment) => matchesMonth(payment, reportMonth, paymentDateFields));
  const periodExpenses = period === 'All'
    ? expenses.data
    : period === 'Today'
      ? expenses.data.filter((expense) => matchesDay(expense, today, expenseDateFields))
      : expenses.data.filter((expense) => matchesMonth(expense, reportMonth, expenseDateFields));
  const periodEnquiries = period === 'All'
    ? enquiries.data
    : period === 'Today'
      ? enquiries.data.filter((record) => matchesDay(record, today, activityDateFields))
      : enquiries.data.filter((record) => matchesMonth(record, reportMonth, activityDateFields));
  const periodNotices = period === 'All'
    ? notices.data
    : period === 'Today'
      ? notices.data.filter((record) => matchesDay(record, today, activityDateFields))
      : notices.data.filter((record) => matchesMonth(record, reportMonth, activityDateFields));
  const periodMeterReadings = period === 'All'
    ? meterReadings.data
    : period === 'Today'
      ? meterReadings.data.filter((record) => matchesDay(record, today, activityDateFields))
      : meterReadings.data.filter((record) => matchesMonth(record, reportMonth, activityDateFields));
  const dues = calculateMonthlyDues(tenants.data, payments.data, reportMonth);
  const duesSummary = summarizeDues(dues);
  const collected = getCollectedTotal(periodPayments);
  const expensesTotal = getExpenseTotal(periodExpenses);
  const net = collected - expensesTotal;
  const periodLabel = period === 'Today' ? today : period === 'Month' ? getMonthDisplay(reportMonth) : 'All time';
  const quickActions = [
    {
      id: 'dues',
      label: 'Collect dues',
      meta: `${duesSummary.pendingCount + duesSummary.partialCount} follow-ups`,
      value: money(duesSummary.balance),
      tone: colors.danger,
    },
    {
      id: 'enquiries',
      label: 'Review leads',
      meta: 'New enquiries',
      value: periodEnquiries.length,
      tone: colors.accent,
    },
    {
      id: 'meter',
      label: 'Meter cycle',
      meta: 'Reading records',
      value: periodMeterReadings.length,
      tone: colors.warning,
    },
  ];
  const activeAction = quickActions.find((action) => action.id === selectedAction) || quickActions[0];

  return (
    <View>
      <View style={styles.introPanel}>
        <View style={styles.introTop}>
          <Text style={styles.kicker}>{periodLabel}</Text>
          <View style={styles.periodSwitch}>
            {dashboardPeriods.map((item) => (
              <Pressable key={item} onPress={() => setPeriod(item)} style={[styles.periodItem, period === item && styles.periodItemActive]}>
                <Text style={[styles.periodText, period === item && styles.periodTextActive]}>{item}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        {period === 'Month' ? (
          <View style={styles.monthNavigator}>
            <Pressable accessibilityRole="button" onPress={() => setSelectedMonth((month) => shiftMonth(month, -1))} style={styles.monthButton}>
              <Text style={styles.monthButtonText}>Prev</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setSelectedMonth(currentMonth)} style={styles.monthValue}>
              <Text style={styles.monthValueText}>{getMonthDisplay(reportMonth)}</Text>
              <Text style={styles.monthValueHint}>{reportMonth === currentMonth ? 'Current month' : 'Tap to reset'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setSelectedMonth((month) => shiftMonth(month, 1))} style={styles.monthButton}>
              <Text style={styles.monthButtonText}>Next</Text>
            </Pressable>
          </View>
        ) : null}
        <Text style={styles.netLabel}>Net position</Text>
        <Text style={styles.netValue}>{money(net)}</Text>
        <Text style={styles.title}>Live operating picture</Text>
        <Text style={styles.subtitle}>
          {period === 'Today'
            ? 'Only records dated today are included in collected, expenses, and activity counts.'
            : period === 'Month'
              ? 'Current-month collections, expenses, dues, and activity counts from live Firebase data.'
              : 'All-time collections, expenses, and activity counts from every synced record.'}
        </Text>
      </View>

      {loading ? (
        <View style={styles.statusRow}>
          <ActivityIndicator color={colors.brand} />
          <Text style={styles.statusText}>Loading live records</Text>
        </View>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.metrics}>
        <MetricTile label="Customers" value={tenants.data.length} tone="brand" />
        <MetricTile label="Expected" value={money(duesSummary.expected)} tone="blue" />
        <MetricTile label="Collected" value={money(collected)} tone="green" />
        <MetricTile label="Due" value={money(duesSummary.balance)} tone={duesSummary.balance > 0 ? 'red' : 'green'} />
        <MetricTile label="Expenses" value={money(expensesTotal)} tone="orange" />
        <MetricTile label="Net" value={money(net)} tone={net >= 0 ? 'green' : 'red'} />
      </View>

      <View style={styles.actionSection}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.panelTitle}>Action Board</Text>
          <Text style={styles.sectionHint}>Tap to focus</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionRail}>
          {quickActions.map((action) => {
            const active = action.id === selectedAction;

            return (
              <Pressable
                accessibilityRole="button"
                key={action.id}
                onPress={() => setSelectedAction(action.id)}
                style={[styles.actionCard, active && styles.actionCardActive]}
              >
                <View style={[styles.actionDot, { backgroundColor: action.tone }]} />
                <Text style={[styles.actionLabel, active && styles.actionLabelActive]}>{action.label}</Text>
                <Text style={[styles.actionValue, active && styles.actionValueActive]}>{action.value}</Text>
                <Text style={[styles.actionMeta, active && styles.actionMetaActive]}>{action.meta}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={styles.activeActionPanel}>
          <Text style={styles.activeActionTitle}>{activeAction.label}</Text>
          <Text style={styles.activeActionValue}>{activeAction.value}</Text>
          <Text style={styles.activeActionText}>
            {activeAction.meta}. This focus changes when you tap another action card.
          </Text>
        </View>
      </View>

      <View style={styles.focusPanel}>
        <Text style={styles.panelTitle}>Priority Queue</Text>
        <FocusRow accent={colors.danger} label="Outstanding dues" styles={styles} value={`${duesSummary.pendingCount + duesSummary.partialCount} accounts`} />
        <FocusRow accent={colors.accent} label={`${period} enquiries`} styles={styles} value={`${periodEnquiries.length} leads`} />
        <FocusRow accent={colors.warning} label={`${period} meter records`} styles={styles} value={`${periodMeterReadings.length} readings`} />
        <FocusRow accent={colors.brand} label={`${period} notices`} styles={styles} value={`${periodNotices.length} notices`} />
      </View>
    </View>
  );
}

function FocusRow({
  accent,
  label,
  styles,
  value,
}: {
  accent: string;
  label: string;
  styles: ReturnType<typeof createStyles>;
  value: string;
}) {
  return (
    <View style={styles.focusRow}>
      <View style={styles.focusLabelWrap}>
        <View style={[styles.focusDot, { backgroundColor: accent }]} />
        <Text style={styles.focusLabel}>{label}</Text>
      </View>
      <Text style={styles.focusValue}>{value}</Text>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  introPanel: {
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  introTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  periodSwitch: {
    backgroundColor: colors.overlaySubtle,
    borderRadius: radius.md,
    flexDirection: 'row',
    padding: 3,
  },
  periodItem: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  periodItemActive: {
    backgroundColor: colors.onBrand,
  },
  periodText: {
    color: colors.panelMuted,
    fontSize: 11,
    fontWeight: typography.weight.black,
  },
  periodTextActive: {
    color: colors.ink,
  },
  monthNavigator: {
    alignItems: 'center',
    backgroundColor: colors.overlayFaint,
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  monthButton: {
    alignItems: 'center',
    backgroundColor: colors.overlaySubtle,
    borderRadius: radius.md,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  monthButtonText: {
    color: colors.onBrand,
    fontSize: 12,
    fontWeight: typography.weight.black,
  },
  monthValue: {
    alignItems: 'center',
    flex: 1,
  },
  monthValueText: {
    color: colors.onBrand,
    fontSize: 15,
    fontWeight: typography.weight.black,
  },
  monthValueHint: {
    color: colors.panelMuted,
    fontSize: 11,
    fontWeight: typography.weight.bold,
    marginTop: 2,
  },
  kicker: {
    color: colors.panelAccent,
    fontSize: 12,
    fontWeight: typography.weight.black,
    textTransform: 'uppercase',
  },
  netLabel: {
    color: colors.panelSubtle,
    fontSize: 12,
    fontWeight: typography.weight.bold,
    marginTop: spacing.lg,
  },
  netValue: {
    color: colors.onBrand,
    fontSize: 38,
    fontWeight: typography.weight.black,
    lineHeight: 44,
    marginTop: spacing.lg,
  },
  title: {
    color: colors.panelText,
    fontSize: 18,
    fontWeight: typography.weight.black,
    marginTop: spacing.lg,
  },
  subtitle: {
    color: colors.panelMuted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.sm,
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
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
    marginTop: spacing.md,
    padding: spacing.md,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  actionSection: {
    marginTop: spacing.lg,
  },
  sectionTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionHint: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: typography.weight.bold,
  },
  actionRail: {
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  actionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    minHeight: 136,
    padding: spacing.md,
    width: 154,
    ...shadow.card,
  },
  actionCardActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  actionDot: {
    borderRadius: 99,
    height: 10,
    width: 10,
  },
  actionLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: typography.weight.black,
    marginTop: spacing.lg,
  },
  actionLabelActive: {
    color: colors.onBrand,
  },
  actionValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: typography.weight.black,
    marginTop: spacing.sm,
  },
  actionValueActive: {
    color: colors.panelText,
  },
  actionMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: typography.weight.bold,
    marginTop: 4,
  },
  actionMetaActive: {
    color: colors.panelMuted,
  },
  activeActionPanel: {
    backgroundColor: colors.skySoft,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  activeActionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: typography.weight.black,
  },
  activeActionValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: typography.weight.black,
    marginTop: spacing.sm,
  },
  activeActionText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  focusPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: spacing.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  panelTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: typography.weight.black,
    marginBottom: spacing.sm,
  },
  focusRow: {
    alignItems: 'center',
    borderTopColor: colors.borderSoft,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  focusLabelWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  focusDot: {
    borderRadius: 99,
    height: 8,
    width: 8,
  },
  focusLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: typography.weight.bold,
  },
  focusValue: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: typography.weight.bold,
  },
  });
}
