import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { radius, shadow, spacing, typography, useAppTheme, type AppColors } from '../../design/tokens';
import { useFirestoreCollection } from '../../shared/hooks/useFirestoreCollection';
import type { TenantRecord } from '../../shared/types/records';
import { businessTypeOptions } from './businessTypes';
import { CustomerCard } from './CustomerCard';
import { customerStatusOptions, getCustomerStatus, matchesCustomerSearch } from './customerUtils';
import { FilterPill } from './FilterPill';
import { getRoomOccupancy, getRoomSummary, parseRoomLabel } from './roomUtils';

export function CustomersScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const tenants = useFirestoreCollection<TenantRecord>('tenants', { sortBy: 'createdAt' });
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [mode, setMode] = useState('All');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const roomSummary = getRoomSummary(tenants.data);
  const roomOccupancy = getRoomOccupancy(tenants.data);
  const filtered = useMemo(
    () =>
      tenants.data.filter((tenant) => {
        const typeMatches = typeFilter ? (tenant.businessType || 'pg') === typeFilter : true;
        const statusMatches = statusFilter ? getCustomerStatus(tenant) === statusFilter : true;
        const roomMode = mode === 'Rooms' ? ['pg', 'hotel'].includes(String(tenant.businessType || 'pg')) && Boolean(tenant.room) : true;
        const roomMatches = selectedRoom ? parseRoomLabel(tenant.room).room === selectedRoom : true;
        const needsAttention = mode === 'Needs attention'
          ? ['booked', 'checked in'].includes(getCustomerStatus(tenant)) || !tenant.room
          : true;

        return typeMatches && statusMatches && roomMode && roomMatches && needsAttention && matchesCustomerSearch(tenant, search);
      }),
    [mode, search, selectedRoom, statusFilter, tenants.data, typeFilter],
  );

  function updateMode(nextMode: string) {
    setMode(nextMode);
    if (nextMode !== 'Rooms') setSelectedRoom('');
  }

  return (
    <View>
      <View style={styles.hero}>
        <Text style={styles.kicker}>Customers & Rooms</Text>
        <Text style={styles.title}>{tenants.data.length} records</Text>
        <Text style={styles.subtitle}>Room allocation, stay status, and contact visibility for day-to-day operations.</Text>
      </View>

      <View style={styles.summaryGrid}>
        <SummaryTile label="Occupied rooms" styles={styles} value={`${roomSummary.occupiedRooms}/${roomSummary.totalRooms}`} />
        <SummaryTile label="Available rooms" styles={styles} value={roomSummary.availableRooms} />
        <SummaryTile label="Active room customers" styles={styles} value={roomSummary.activeRoomCustomers} />
      </View>

      <View style={styles.modeSwitch}>
        {['All', 'Rooms', 'Needs attention'].map((item) => (
          <Pressable key={item} onPress={() => updateMode(item)} style={[styles.modeItem, mode === item && styles.modeItemActive]}>
            <Text style={[styles.modeText, mode === item && styles.modeTextActive]}>{item}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roomRail}>
        {roomOccupancy.slice(0, 10).map((room) => (
          <Pressable
            accessibilityRole="button"
            key={room.room}
            onPress={() => {
              setMode('Rooms');
              setSelectedRoom((current) => current === room.room ? '' : room.room);
            }}
            style={[
              styles.roomCard,
              room.status === 'Full' && styles.roomCardFull,
              selectedRoom === room.room && styles.roomCardSelected,
            ]}
          >
            <Text style={[styles.roomNumber, room.status === 'Full' && styles.roomTextFull]}>Room {room.room}</Text>
            <Text style={[styles.roomStatus, room.status === 'Full' && styles.roomStatusFull]}>{room.status}</Text>
            <Text style={[styles.roomMeta, room.status === 'Full' && styles.roomMetaFull]}>{room.occupants.length} guest{room.occupants.length === 1 ? '' : 's'}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {selectedRoom ? (
        <Pressable accessibilityRole="button" onPress={() => setSelectedRoom('')} style={styles.activeRoomFilter}>
          <Text style={styles.activeRoomFilterText}>Room {selectedRoom} selected - tap to clear</Text>
        </Pressable>
      ) : null}

      <TextInput
        autoCapitalize="none"
        onChangeText={setSearch}
        placeholder="Search name, room, phone..."
        placeholderTextColor={colors.muted}
        style={styles.search}
        value={search}
      />

      <Text style={styles.filterTitle}>Business</Text>
      <View style={styles.filters}>
        <FilterPill active={!typeFilter} label="All" onPress={() => setTypeFilter('')} />
        {businessTypeOptions.map((type) => (
          <FilterPill
            active={typeFilter === type.id}
            key={type.id}
            label={type.label}
            onPress={() => setTypeFilter(type.id)}
          />
        ))}
      </View>

      <Text style={styles.filterTitle}>Status</Text>
      <View style={styles.filters}>
        {customerStatusOptions.map((status) => (
          <FilterPill
            active={statusFilter === status.value}
            key={status.label}
            label={status.label}
            onPress={() => setStatusFilter(status.value)}
          />
        ))}
      </View>

      {tenants.loading ? (
        <View style={styles.statusRow}>
          <ActivityIndicator color={colors.brand} />
          <Text style={styles.statusText}>Loading customers</Text>
        </View>
      ) : null}

      {tenants.error ? <Text style={styles.errorText}>{tenants.error}</Text> : null}

      <View style={styles.list}>
        {filtered.length ? (
          filtered.slice(0, 40).map((tenant) => (
            <CustomerCard
              customer={tenant}
              expanded={selectedCustomerId === tenant.id}
              key={tenant.id}
              onToggle={() => setSelectedCustomerId((current) => current === tenant.id ? '' : tenant.id)}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No customers found</Text>
            <Text style={styles.emptyText}>Try a different search or filter.</Text>
          </View>
        )}
      </View>

      {filtered.length > 40 ? (
        <Text style={styles.footerText}>Showing first 40 records. Use search to narrow the list.</Text>
      ) : null}
    </View>
  );
}

function SummaryTile({
  label,
  styles,
  value,
}: {
  label: string;
  styles: ReturnType<typeof createStyles>;
  value: number | string;
}) {
  return (
    <View style={styles.summaryTile}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  hero: {
    backgroundColor: colors.ink,
    borderColor: colors.borderSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    ...shadow.card,
  },
  kicker: {
    color: colors.panelAccent,
    fontSize: 12,
    fontWeight: typography.weight.black,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.onBrand,
    fontSize: 34,
    fontWeight: typography.weight.black,
    lineHeight: 40,
    marginTop: spacing.sm,
  },
  subtitle: {
    color: colors.panelMuted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.sm,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  summaryTile: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderWidth: 1,
    borderRadius: radius.lg,
    flex: 1,
    minHeight: 86,
    padding: spacing.md,
    ...shadow.card,
  },
  summaryValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: typography.weight.black,
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: typography.weight.bold,
    lineHeight: 15,
    marginTop: 4,
  },
  search: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    marginTop: spacing.lg,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    ...shadow.card,
  },
  modeSwitch: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.sm,
    ...shadow.card,
  },
  modeItem: {
    alignItems: 'center',
    borderRadius: radius.md,
    flex: 1,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  modeItemActive: {
    backgroundColor: colors.ink,
  },
  modeText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: typography.weight.black,
  },
  modeTextActive: {
    color: colors.onBrand,
  },
  roomRail: {
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  roomCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    minHeight: 112,
    padding: spacing.md,
    width: 132,
    ...shadow.card,
  },
  roomCardFull: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  roomCardSelected: {
    borderColor: colors.brand,
    borderWidth: 2,
  },
  roomNumber: {
    color: colors.text,
    fontSize: 15,
    fontWeight: typography.weight.black,
  },
  roomStatus: {
    color: colors.brand,
    fontSize: 20,
    fontWeight: typography.weight.black,
    marginTop: spacing.lg,
  },
  roomMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: typography.weight.bold,
    marginTop: 3,
  },
  roomTextFull: {
    color: colors.onBrand,
  },
  roomStatusFull: {
    color: colors.panelAccent,
  },
  roomMetaFull: {
    color: colors.panelMuted,
  },
  activeRoomFilter: {
    alignSelf: 'flex-start',
    backgroundColor: colors.skySoft,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  activeRoomFilterText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: typography.weight.black,
  },
  filterTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: typography.weight.black,
    marginTop: spacing.lg,
    textTransform: 'uppercase',
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
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
  list: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.xl,
    ...shadow.card,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: typography.weight.black,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  footerText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: typography.weight.bold,
    lineHeight: 19,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  });
}
