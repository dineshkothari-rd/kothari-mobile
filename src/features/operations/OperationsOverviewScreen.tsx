import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../design/tokens';
import { useFirestoreCollection } from '../../shared/hooks/useFirestoreCollection';
import type { ExpenseRecord, PaymentRecord, TenantRecord } from '../../shared/types/records';
import { money } from '../../shared/utils/money';
import {
  calculateMonthlyDues,
  getCollectedTotal,
  getExpenseTotal,
  getMonthKey,
  summarizeDues,
} from './operationsMath';
import { MetricTile } from './MetricTile';

export function OperationsOverviewScreen() {
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
  const dues = calculateMonthlyDues(tenants.data, payments.data, currentMonth);
  const duesSummary = summarizeDues(dues);
  const collected = getCollectedTotal(payments.data);
  const expensesTotal = getExpenseTotal(expenses.data);
  const net = collected - expensesTotal;

  return (
    <View>
      <View style={styles.introPanel}>
        <Text style={styles.kicker}>{currentMonth}</Text>
        <Text style={styles.title}>Today’s operating picture</Text>
        <Text style={styles.subtitle}>
          A live snapshot from Firebase, shaped for faster decisions before we add the detail screens.
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

      <View style={styles.focusPanel}>
        <Text style={styles.panelTitle}>Priority Queue</Text>
        <FocusRow label="Outstanding dues" value={`${duesSummary.pendingCount + duesSummary.partialCount} accounts`} />
        <FocusRow label="Open enquiries" value={`${enquiries.data.length} leads`} />
        <FocusRow label="Meter records" value={`${meterReadings.data.length} readings`} />
        <FocusRow label="Notices published" value={`${notices.data.length} notices`} />
      </View>
    </View>
  );
}

function FocusRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.focusRow}>
      <Text style={styles.focusLabel}>{label}</Text>
      <Text style={styles.focusValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  introPanel: {
    backgroundColor: colors.text,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  kicker: {
    color: '#99F6E4',
    fontSize: 12,
    fontWeight: typography.weight.black,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.onBrand,
    fontSize: 25,
    fontWeight: typography.weight.black,
    lineHeight: 31,
    marginTop: spacing.sm,
  },
  subtitle: {
    color: '#D0D5DD',
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
    backgroundColor: '#FEF3F2',
    borderColor: '#FECDCA',
    borderRadius: radius.md,
    borderWidth: 1,
    color: '#B42318',
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
  focusPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: spacing.lg,
    padding: spacing.lg,
  },
  panelTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: typography.weight.black,
    marginBottom: spacing.sm,
  },
  focusRow: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
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
