import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, shadow, spacing, typography, useAppTheme, type AppColors } from '../../design/tokens';
import type { TenantRecord } from '../../shared/types/records';
import { money } from '../../shared/utils/money';
import { useLanguage } from '../../shared/i18n/LanguageProvider';
import { getBusinessType } from './businessTypes';
import { getCustomerName, getCustomerStatus, getCustomerSubtitle } from './customerUtils';

type CustomerCardProps = {
  customer: TenantRecord;
  deleting?: boolean;
  expanded: boolean;
  onDelete?: () => void;
  onEdit?: () => void;
  onCheckOut?: () => void;
  checkingOut?: boolean;
  onCheckIn?: () => void;
  checkingIn?: boolean;
  onToggle: () => void;
  onViewIdProof?: () => void;
};

export function CustomerCard({ customer, checkingIn = false, checkingOut = false, deleting = false, expanded, onCheckIn, onCheckOut, onDelete, onEdit, onToggle, onViewIdProof }: CustomerCardProps) {
  const { colors } = useAppTheme();
  const { t } = useLanguage();
  const styles = createStyles(colors);
  const businessType = getBusinessType(customer.businessType);
  const services = Array.isArray(customer.services) ? customer.services : [];
  const additionalGuests = Array.isArray(customer.additionalGuests) ? customer.additionalGuests.filter(Boolean) : [];
  const status = getCustomerStatus(customer);
  const canCheckIn = customer.businessType === 'hotel' && status === 'booked';
  const canCheckOut = customer.businessType === 'hotel' && ['checked in', 'occupied', 'active'].includes(status);
  const snapshotTitle = customer.businessType === 'library'
    ? 'Membership snapshot'
    : customer.businessType === 'hotel'
      ? 'Stay snapshot'
      : 'Tenant snapshot';

  function callCustomer() {
    if (!customer.phone) return;
    Linking.openURL(`tel:${customer.phone}`).catch(() => undefined);
  }

  return (
    <View style={[styles.card, expanded && styles.cardExpanded]}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getCustomerName(customer).slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={styles.nameBlock}>
          <Text style={styles.name}>{getCustomerName(customer)}</Text>
          <Text style={styles.subtitle}>{getCustomerSubtitle(customer)}</Text>
        </View>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{t(status)}</Text>
        </View>
      </View>

      <View style={styles.detailGrid}>
        <Detail label={t(businessType.feeLabel)} styles={styles} value={money(customer.rent)} />
        <Detail action={callCustomer} label={t('Phone')} styles={styles} value={customer.phone || '-'} />
        <Detail label={t('Document ID')} styles={styles} value={customer.documentId || '-'} />
        <Detail label={t(businessType.startDateLabel)} styles={styles} value={customer.moveInDate || '-'} />
        <Detail label={t(businessType.endDateLabel)} styles={styles} value={customer.moveOutDate || '-'} />
      </View>

      {services.length ? (
        <View style={styles.services}>
          {services.slice(0, 4).map((service) => (
            <Text key={service} style={styles.service}>{service}</Text>
          ))}
        </View>
      ) : null}

      {customer.businessType === 'hotel' && additionalGuests.length ? (
        <View style={styles.additionalGuestsBox}>
          <Text style={styles.additionalGuestsLabel}>{t('Additional hotel guests')}</Text>
          {additionalGuests.map((guest, index) => (
            <Text key={`${guest}-${index}`} style={styles.additionalGuestName}>{index + 2}. {guest}</Text>
          ))}
        </View>
      ) : null}

      {customer.idProof ? (
        <Pressable disabled={!onViewIdProof} onPress={onViewIdProof}>
          <Text style={styles.proofText}>{t('ID proof attached')}{customer.idProofName ? ` - ${customer.idProofName}` : ''}</Text>
        </Pressable>
      ) : null}

      <Pressable accessibilityRole="button" onPress={onToggle} style={styles.toggleButton}>
        <Text style={styles.toggleButtonText}>{t(expanded ? 'Hide details' : 'View details')}</Text>
      </Pressable>

      {expanded ? (
        <View style={styles.expandedPanel}>
          <Text style={styles.expandedTitle}>{t(snapshotTitle)}</Text>
          <Text style={styles.expandedText}>
            {services.length ? `${services.join(', ')} ${t('included.')}` : t('No services added yet.')}
          </Text>
          <View style={styles.expandedActions}>
            {canCheckIn && onCheckIn ? (
              <Pressable accessibilityRole="button" disabled={checkingIn} onPress={onCheckIn} style={styles.expandedAction}>
                <Text style={styles.expandedActionText}>{t(checkingIn ? 'Checking in...' : 'Check in')}</Text>
              </Pressable>
            ) : null}
            {canCheckOut && onCheckOut ? (
              <Pressable accessibilityRole="button" disabled={checkingOut} onPress={onCheckOut} style={styles.expandedAction}>
                <Text style={styles.expandedActionText}>{t(checkingOut ? 'Checking out...' : 'Check out')}</Text>
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" disabled={!customer.phone} onPress={callCustomer} style={styles.expandedAction}>
              <Text style={styles.expandedActionText}>{t('Call')}</Text>
            </Pressable>
            {onEdit ? (
              <Pressable accessibilityRole="button" onPress={onEdit} style={styles.expandedAction}>
                <Text style={styles.expandedActionText}>{t('Edit')}</Text>
              </Pressable>
            ) : null}
          </View>
          {onDelete ? (
            <Pressable accessibilityRole="button" disabled={deleting} onPress={onDelete} style={[styles.deleteAction, deleting && styles.disabledAction]}>
              <Text style={styles.deleteActionText}>{t(deleting ? 'Deleting...' : 'Delete customer')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function Detail({
  action,
  label,
  styles,
  value,
}: {
  action?: () => void;
  label: string;
  styles: ReturnType<typeof createStyles>;
  value: string;
}) {
  const content = (
    <>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, action && styles.linkValue]} numberOfLines={1}>{value}</Text>
    </>
  );

  if (action) {
    return (
      <Pressable accessibilityRole="button" onPress={action} style={styles.detailBox}>
        {content}
      </Pressable>
    );
  }

  return <View style={styles.detailBox}>{content}</View>;
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    ...shadow.card,
  },
  cardExpanded: {
    borderColor: colors.brand,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  nameBlock: {
    flex: 1,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.copperSoft,
    borderRadius: radius.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  avatarText: {
    color: colors.copper,
    fontSize: 18,
    fontWeight: typography.weight.black,
  },
  name: {
    color: colors.text,
    fontSize: 17,
    fontWeight: typography.weight.black,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: typography.weight.bold,
    marginTop: 4,
  },
  statusPill: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  statusText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: typography.weight.black,
    textTransform: 'uppercase',
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  detailBox: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    minHeight: 66,
    padding: spacing.md,
    width: '48%',
  },
  detailLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: typography.weight.black,
    textTransform: 'uppercase',
  },
  detailValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: typography.weight.black,
    marginTop: 5,
  },
  linkValue: {
    color: colors.brand,
  },
  services: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  additionalGuestsBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  additionalGuestsLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: typography.weight.black,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  additionalGuestName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: typography.weight.bold,
    marginTop: 3,
  },
  service: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.sm,
    color: colors.accent,
    fontSize: 12,
    fontWeight: typography.weight.bold,
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  proofText: {
    color: colors.copper,
    fontSize: 12,
    fontWeight: typography.weight.bold,
    marginTop: spacing.md,
  },
  toggleButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.ink,
    borderRadius: radius.sm,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  toggleButtonText: {
    color: colors.onBrand,
    fontSize: 12,
    fontWeight: typography.weight.black,
  },
  expandedPanel: {
    backgroundColor: colors.skySoft,
    borderRadius: radius.md,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  expandedTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: typography.weight.black,
  },
  expandedText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  expandedActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  expandedAction: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  expandedActionText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: typography.weight.black,
  },
  deleteAction: {
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    marginTop: spacing.md,
    minHeight: 42,
    justifyContent: 'center',
  },
  deleteActionText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: typography.weight.black,
  },
  disabledAction: {
    opacity: 0.45,
  },
  });
}
