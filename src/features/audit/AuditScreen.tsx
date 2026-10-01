import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { radius, spacing, typography, useAppTheme, type AppColors } from '../../design/tokens';
import { useFirestoreCollection } from '../../shared/hooks/useFirestoreCollection';
import type { AuditEventRecord } from '../../shared/types/records';
import { useLanguage } from '../../shared/i18n/LanguageProvider';

function formatTime(event: AuditEventRecord) {
  const value = event.createdAt;
  const date = value?.toDate?.() || (value?.seconds ? new Date(value.seconds * 1000) : null);
  return date ? date.toLocaleString('en-IN') : '—';
}

export function AuditScreen() {
  const { colors } = useAppTheme();
  const { t } = useLanguage();
  const styles = createStyles(colors);
  const events = useFirestoreCollection<AuditEventRecord>('auditEvents', { sortBy: 'createdAt' });

  return (
    <View>
      <Text style={styles.title}>{t('Audit history')}</Text>
      <Text style={styles.subtitle}>{t('Permanent record of important business actions.')}</Text>
      {events.loading ? <View style={styles.status}><ActivityIndicator color={colors.brand} /><Text style={styles.meta}>{t('Loading history')}</Text></View> : null}
      {events.error ? <Text style={styles.error}>{events.error}</Text> : null}
      {events.data.slice(0, 100).map((event) => (
        <View key={event.id} style={styles.card}>
          <Text style={styles.action}>{String(event.action || t('Business action')).replace(/[._]/g, ' ')}</Text>
          <Text style={styles.meta}>{formatTime(event)} · {String(event.entityType || 'record')} {String(event.entityId || '')}</Text>
          <Text style={styles.actor}>{t('Actor')}: {String(event.actorUid || '—')}</Text>
        </View>
      ))}
      {!events.loading && !events.data.length ? <Text style={styles.empty}>{t('No audit events yet.')}</Text> : null}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    title: { color: colors.text, fontSize: 24, fontWeight: typography.weight.black },
    subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginBottom: spacing.lg, marginTop: spacing.xs },
    status: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.lg },
    card: { backgroundColor: colors.surface, borderColor: colors.borderSoft, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.sm, padding: spacing.md },
    action: { color: colors.text, fontSize: 14, fontWeight: typography.weight.black, textTransform: 'capitalize' },
    meta: { color: colors.muted, fontSize: 12, marginTop: spacing.xs },
    actor: { color: colors.muted, fontSize: 11, marginTop: spacing.sm },
    error: { backgroundColor: colors.dangerSoft, borderRadius: radius.md, color: colors.danger, padding: spacing.md },
    empty: { color: colors.muted, padding: spacing.xl, textAlign: 'center' },
  });
}
