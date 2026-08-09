import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';

import { radius, shadow, spacing, typography, useAppTheme, type AppColors } from '../../design/tokens';
import { db } from '../../lib/firebase/client';
import { TextField } from '../../shared/components/TextField';
import { useFirestoreCollection } from '../../shared/hooks/useFirestoreCollection';
import type { TenantRecord } from '../../shared/types/records';
import { toNumber } from '../../shared/utils/money';
import { businessTypeOptions, getBusinessType } from './businessTypes';
import { CustomerCard } from './CustomerCard';
import { customerStatusOptions, getCustomerStatus, matchesCustomerSearch } from './customerUtils';
import { FilterPill } from './FilterPill';
import { getRoomOccupancy, getRoomSummary, parseRoomLabel, roomNumbers } from './roomUtils';

type CustomerDraft = {
  businessType: string;
  email: string;
  idProof: string | null;
  idProofName: string | null;
  idProofSize: number;
  idProofType: string | null;
  moveInDate: string;
  moveInTime: string;
  moveOutDate: string;
  moveOutTime: string;
  name: string;
  phone: string;
  rent: number;
  room: string;
  roomType: string;
  services: string[];
  status: string;
};

const initialForm = {
  businessType: 'pg',
  email: '',
  idProof: null as string | null,
  idProofName: null as string | null,
  idProofSize: 0,
  idProofType: null as string | null,
  moveInDate: '',
  moveInTime: '12:00',
  moveOutDate: '',
  moveOutTime: '11:00',
  name: '',
  phone: '',
  rent: '',
  room: '',
  roomType: 'single',
  services: [] as string[],
  status: 'active',
};

const activeAllocationStatuses = ['active', 'booked', 'checked in', 'occupied'];

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
  const [editingCustomer, setEditingCustomer] = useState<TenantRecord | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [actionError, setActionError] = useState('');
  const [viewingProof, setViewingProof] = useState<TenantRecord | null>(null);
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

  function openCreateForm() {
    setEditingCustomer(null);
    setActionError('');
    setShowForm(true);
  }

  function openEditForm(customer: TenantRecord) {
    setEditingCustomer(customer);
    setActionError('');
    setShowForm(true);
  }

  async function saveCustomer(payload: CustomerDraft) {
    setSaving(true);
    setActionError('');

    try {
      if (editingCustomer) {
        await updateDoc(doc(db, 'tenants', editingCustomer.id), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'tenants'), {
          ...payload,
          createdAt: serverTimestamp(),
          idProof: payload.idProof || null,
          idProofName: payload.idProofName || null,
          idProofSize: payload.idProofSize || 0,
          idProofType: payload.idProofType || null,
        });
      }

      setShowForm(false);
      setEditingCustomer(null);
    } catch (saveError) {
      setActionError(saveError instanceof Error ? saveError.message : 'Could not save customer.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteCustomer(customerId: string) {
    setDeletingId(customerId);
    setActionError('');

    try {
      await deleteDoc(doc(db, 'tenants', customerId));
    } catch (deleteError) {
      setActionError(deleteError instanceof Error ? deleteError.message : 'Could not delete customer.');
    } finally {
      setDeletingId('');
    }
  }

  function confirmDelete(customer: TenantRecord) {
    Alert.alert('Delete customer?', `Delete ${customer.name || 'this customer'}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteCustomer(customer.id) },
    ]);
  }

  return (
    <View>
      {showForm ? (
        <CustomerFormSheet
          customer={editingCustomer}
          customers={tenants.data}
          onClose={() => {
            setShowForm(false);
            setEditingCustomer(null);
          }}
          onSubmit={saveCustomer}
          saving={saving}
          styles={styles}
        />
      ) : null}
      <IdProofPreview onClose={() => setViewingProof(null)} proof={viewingProof} styles={styles} />

      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroCopy}>
            <Text style={styles.kicker}>Stays & seats</Text>
            <Text style={styles.title}>{tenants.data.length} customers</Text>
            <Text style={styles.subtitle}>Manage guests, members, rooms, seats, and contact details.</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={openCreateForm} style={styles.addButton}>
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.summaryGrid}>
        <SummaryTile label="Occupied rooms" styles={styles} value={`${roomSummary.occupiedRooms}/${roomSummary.totalRooms}`} />
        <SummaryTile label="Available rooms" styles={styles} value={roomSummary.availableRooms} />
        <SummaryTile label="Staying now" styles={styles} value={roomSummary.activeRoomCustomers} />
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
          <Text style={styles.activeRoomFilterText}>Room {selectedRoom} selected. Tap to clear</Text>
        </Pressable>
      ) : null}

      <TextInput
        autoCapitalize="none"
        onChangeText={setSearch}
        placeholder="Name, room, seat, phone..."
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
      {actionError ? <Text style={styles.errorText}>{actionError}</Text> : null}

      <View style={styles.list}>
        {filtered.length ? (
          filtered.slice(0, 40).map((tenant) => (
            <CustomerCard
              customer={tenant}
              deleting={deletingId === tenant.id}
              expanded={selectedCustomerId === tenant.id}
              key={tenant.id}
              onDelete={() => confirmDelete(tenant)}
              onEdit={() => openEditForm(tenant)}
              onToggle={() => setSelectedCustomerId((current) => current === tenant.id ? '' : tenant.id)}
              onViewIdProof={() => setViewingProof(tenant)}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Nothing found</Text>
          <Text style={styles.emptyText}>Try changing the search or filters.</Text>
          </View>
        )}
      </View>

      {filtered.length > 40 ? (
        <Text style={styles.footerText}>Showing first 40 customers. Search to find someone faster.</Text>
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

type CustomerFormStep = 'business' | 'allocation' | 'details';

const customerFormSteps: Array<{ id: CustomerFormStep; label: string }> = [
  { id: 'business', label: 'Business' },
  { id: 'allocation', label: 'Allocation' },
  { id: 'details', label: 'Details' },
];

function normalizeLibrarySeat(value: unknown) {
  const text = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
  const rawSeat = text.replace(/^SEAT/, '');
  const match = rawSeat.match(/^([A-Z])0*(\d{1,3})$/);

  if (!match) return rawSeat;

  return `${match[1]}${match[2].padStart(2, '0')}`;
}

function getAllocationKey(value: unknown, businessType: string) {
  const text = String(value || '').trim();

  if (businessType === 'library') {
    const seatMatch = text.match(/Seat\s+([A-Z]\d{1,2})/i) || text.match(/^([A-Z]\d{1,2})$/i);
    return normalizeLibrarySeat(seatMatch?.[1] || text);
  }

  return parseRoomLabel(text).room;
}

function CustomerFormSheet({
  customer,
  customers,
  onClose,
  onSubmit,
  saving,
  styles,
}: {
  customer: TenantRecord | null;
  customers: TenantRecord[];
  onClose: () => void;
  onSubmit: (payload: CustomerDraft) => void;
  saving: boolean;
  styles: ReturnType<typeof createStyles>;
}) {
  const [form, setForm] = useState(() => ({
    ...initialForm,
    businessType: customer?.businessType || initialForm.businessType,
    email: customer?.email || '',
    idProof: customer?.idProof || null,
    idProofName: customer?.idProofName || null,
    idProofSize: customer?.idProofSize || 0,
    idProofType: customer?.idProofType || null,
    moveInDate: customer?.moveInDate || '',
    moveInTime: customer?.moveInTime || '12:00',
    moveOutDate: customer?.moveOutDate || '',
    moveOutTime: customer?.moveOutTime || '11:00',
    name: customer?.name || customer?.fullName || customer?.tenantName || '',
    phone: customer?.phone || '',
    rent: customer?.rent ? String(customer.rent) : '',
    room: customer?.room || '',
    roomType: customer?.roomType || 'single',
    services: Array.isArray(customer?.services) ? customer.services : [],
    status: customer?.status || 'active',
  }));
  const [formError, setFormError] = useState('');
  const [formStep, setFormStep] = useState<CustomerFormStep>('business');
  const activeType = getBusinessType(form.businessType);
  const currentAllocation = getAllocationKey(customer?.room, form.businessType);
  const allocationNumbers = form.businessType === 'library' ? [] : roomNumbers;
  const allocationOccupants = customers.filter((item) => {
    const itemType = String(item.businessType || 'pg');
    const sameInventory = form.businessType === 'library'
      ? itemType === 'library'
      : ['pg', 'hotel'].includes(itemType);

    return item.id !== customer?.id && sameInventory && activeAllocationStatuses.includes(getCustomerStatus(item));
  });
  const availableAllocationOptions = allocationNumbers
    .map((allocation) => {
      const occupants = allocationOccupants.filter((item) => getAllocationKey(item.room, form.businessType) === allocation);
      const isCurrent = currentAllocation === allocation;
      const vacantSeats = Math.max(0, activeType.allocationCapacity - occupants.length);

      return {
        allocation,
        occupants,
        isCurrent,
        vacantSeats,
      };
    })
    .filter((room) => room.vacantSeats > 0 || room.isCurrent);
  const selectedAllocation = getAllocationKey(form.room, form.businessType);
  const selectedAllocationOccupants = selectedAllocation
    ? allocationOccupants.filter((item) => getAllocationKey(item.room, form.businessType) === selectedAllocation)
    : [];
  const selectedAllocationOpenSpots = Math.max(0, activeType.allocationCapacity - selectedAllocationOccupants.length);
  const selectedAllocationIsCurrent = Boolean(selectedAllocation && currentAllocation === selectedAllocation);
  const librarySeatAvailable = form.businessType !== 'library' || selectedAllocationIsCurrent || selectedAllocationOpenSpots > 0;
  const librarySeatLooksValid = form.businessType !== 'library' || !selectedAllocation || /^[A-Z]\d{2,3}$/.test(selectedAllocation);
  const canContinueAllocation = Boolean(form.name.trim() && form.phone.trim() && form.room.trim() && toNumber(form.rent));

  function updateField(name: keyof typeof form, value: string | string[]) {
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === 'roomType' ? { room: '' } : {}),
    }));
    setFormError('');
  }

  function updateBusinessType(type: string) {
    const nextType = getBusinessType(type);
    const nextStatus = nextType.statusOptions.some((status) => status.value === form.status)
      ? form.status
      : nextType.statusOptions[0]?.value || 'active';

    setForm((current) => ({
      ...current,
      businessType: type,
      room: '',
      roomType: 'single',
      services: current.services.filter((service) => nextType.services.includes(service)),
      status: nextStatus,
    }));
    setFormError('');
  }

  function updateLibrarySeat(value: string) {
    const seat = normalizeLibrarySeat(value);
    updateField('room', seat ? `Seat ${seat}` : '');
  }

  function goToStep(nextStep: CustomerFormStep) {
    if (nextStep === 'details' && !canContinueAllocation) {
      setFormStep('allocation');
      setFormError(`Name, phone, ${activeType.unitLabel.toLowerCase()} and amount are required.`);
      return;
    }

    if (nextStep === 'details' && !librarySeatLooksValid) {
      setFormStep('allocation');
      setFormError('Enter a valid seat like A01, B12, or C08.');
      return;
    }

    if (nextStep === 'details' && !librarySeatAvailable) {
      setFormStep('allocation');
      setFormError(`${activeType.unitLabel} ${selectedAllocation} is already assigned. Choose another seat.`);
      return;
    }

    setFormError('');
    setFormStep(nextStep);
  }

  function goNext() {
    if (formStep === 'business') {
      setFormStep('allocation');
      setFormError('');
      return;
    }

    if (formStep === 'allocation') {
      if (!canContinueAllocation) {
        setFormError(`Name, phone, ${activeType.unitLabel.toLowerCase()} and amount are required.`);
        return;
      }

      if (!librarySeatLooksValid) {
        setFormError('Enter a valid seat like A01, B12, or C08.');
        return;
      }

      if (!librarySeatAvailable) {
        setFormError(`${activeType.unitLabel} ${selectedAllocation} is already assigned. Choose another seat.`);
        return;
      }

      setFormStep('details');
      setFormError('');
    }
  }

  function goBack() {
    if (formStep === 'details') {
      setFormStep('allocation');
      return;
    }

    if (formStep === 'allocation') {
      setFormStep('business');
    }
  }

  function toggleService(service: string) {
    setForm((current) => ({
      ...current,
      services: current.services.includes(service)
        ? current.services.filter((item) => item !== service)
        : [...current.services, service],
    }));
  }

  async function pickIdProof() {
    setFormError('');

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setFormError('Photo library permission is required to attach ID proof.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      base64: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.55,
    });

    if (result.canceled) return;

    const asset = result.assets[0];

    if (!asset?.base64) {
      setFormError('Could not read selected image.');
      return;
    }

    const mimeType = asset.mimeType || 'image/jpeg';
    const approxBytes = Math.ceil((asset.base64.length * 3) / 4);

    setForm((current) => ({
      ...current,
      idProof: `data:${mimeType};base64,${asset.base64}`,
      idProofName: asset.fileName || `id-proof-${Date.now()}.jpg`,
      idProofSize: approxBytes,
      idProofType: mimeType,
    }));
  }

  function removeIdProof() {
    setForm((current) => ({
      ...current,
      idProof: null,
      idProofName: null,
      idProofSize: 0,
      idProofType: null,
    }));
    setFormError('');
  }

  function submit() {
    const rent = toNumber(form.rent);

    if (!form.name.trim() || !form.phone.trim() || !form.room.trim() || !rent) {
      setFormStep('allocation');
      setFormError(`Name, phone, ${activeType.unitLabel.toLowerCase()} and amount are required.`);
      return;
    }

    if (!librarySeatLooksValid) {
      setFormStep('allocation');
      setFormError('Enter a valid seat like A01, B12, or C08.');
      return;
    }

    if (!librarySeatAvailable) {
      setFormStep('allocation');
      setFormError(`${activeType.unitLabel} ${selectedAllocation} is already assigned. Choose another seat.`);
      return;
    }

    onSubmit({
      businessType: form.businessType,
      email: form.email.trim(),
      idProof: form.idProof,
      idProofName: form.idProofName,
      idProofSize: form.idProofSize,
      idProofType: form.idProofType,
      moveInDate: form.moveInDate.trim(),
      moveInTime: form.moveInTime.trim(),
      moveOutDate: form.moveOutDate.trim(),
      moveOutTime: form.moveOutTime.trim(),
      name: form.name.trim(),
      phone: form.phone.trim(),
      rent,
      room: form.room.trim(),
      roomType: form.roomType,
      services: form.services,
      status: form.status,
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
                <Text style={styles.sheetKicker}>{activeType.flowLabel}</Text>
                <Text style={styles.sheetTitle}>{customer ? 'Edit customer' : 'Add customer'}</Text>
              </View>
              <Pressable disabled={saving} onPress={onClose} style={styles.sheetCloseButton}>
                <Text style={styles.sheetCloseText}>Close</Text>
              </Pressable>
            </View>

            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

            <View style={styles.businessContext}>
              <Text style={styles.businessContextLabel}>{customer ? 'Editing for' : 'Adding for'}</Text>
              <Text style={styles.businessContextTitle}>{activeType.label}</Text>
              <Text style={styles.businessContextMeta}>{activeType.flowLabel}</Text>
            </View>

            <View style={styles.formStepper}>
              {customerFormSteps.map((step, index) => {
                const active = formStep === step.id;

                return (
                  <Pressable
                    accessibilityRole="button"
                    key={step.id}
                    onPress={() => goToStep(step.id)}
                    style={[styles.stepperItem, active && styles.stepperItemActive]}
                  >
                    <Text style={[styles.stepperIndex, active && styles.stepperIndexActive]}>{index + 1}</Text>
                    <Text style={[styles.stepperText, active && styles.stepperTextActive]} numberOfLines={1}>{step.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {formStep === 'business' ? (
              <>
                <Text style={styles.formLabel}>Business type</Text>
                <View style={styles.sheetFilters}>
                  {businessTypeOptions.map((type) => (
                    <FilterPill active={form.businessType === type.id} key={type.id} label={type.label} onPress={() => updateBusinessType(type.id)} />
                  ))}
                </View>
                <Text style={styles.detailHint}>{activeType.detailsHint}</Text>
              </>
            ) : null}

            {formStep === 'allocation' ? (
              <>
                <View style={styles.formGrid}>
                  <TextField label={`${activeType.customerLabel} name`} onChangeText={(value) => updateField('name', value)} placeholder="Full name" value={form.name} />
                  <TextField keyboardType="phone-pad" label="Phone" onChangeText={(value) => updateField('phone', value)} placeholder="Phone number" value={form.phone} />
                </View>

                <Text style={styles.formLabel}>{activeType.unitLabel}</Text>
                <View style={styles.roomPickerHeader}>
                  <Text style={styles.roomPickerTitle}>{activeType.allocationTitle}</Text>
                  <Text style={styles.roomPickerMeta}>{activeType.allocationHelp}</Text>
                </View>
                {form.businessType === 'library' ? (
                  <>
                    <TextField
                      autoCapitalize="characters"
                      label="Seat number"
                      onChangeText={updateLibrarySeat}
                      placeholder="A01, B12, C08..."
                      value={selectedAllocation}
                    />
                    {selectedAllocation ? (
                      <View
                        style={[
                          styles.allocationStatusBox,
                          (!librarySeatLooksValid || !librarySeatAvailable) && styles.allocationStatusBoxDanger,
                        ]}
                      >
                        <Text
                          style={[
                            styles.allocationStatusTitle,
                            (!librarySeatLooksValid || !librarySeatAvailable) && styles.allocationStatusTitleDanger,
                          ]}
                        >
                          {!librarySeatLooksValid
                            ? 'Invalid seat format'
                            : librarySeatAvailable
                              ? selectedAllocationIsCurrent
                                ? `Seat ${selectedAllocation} is current`
                                : `Seat ${selectedAllocation} is available`
                              : `Seat ${selectedAllocation} is already assigned`}
                        </Text>
                        <Text style={styles.allocationStatusMeta}>
                          {selectedAllocationOccupants.length} active member{selectedAllocationOccupants.length === 1 ? '' : 's'} currently assigned
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.inlineHelp}>Enter a seat code to check if it is free.</Text>
                    )}
                  </>
                ) : availableAllocationOptions.length ? (
                  <View style={styles.roomPickerGrid}>
                    {availableAllocationOptions.map((option) => {
                      const active = getAllocationKey(form.room, form.businessType) === option.allocation;
                      const allocationLabel = `${activeType.unitLabel} ${option.allocation}`;
                      const seatsLabel = option.isCurrent
                        ? `Current ${activeType.unitLabel.toLowerCase()}`
                        : `${option.vacantSeats} spot${option.vacantSeats === 1 ? '' : 's'} open`;

                      return (
                        <Pressable
                          accessibilityRole="button"
                          key={option.allocation}
                          onPress={() => updateField('room', allocationLabel)}
                          style={[styles.roomOption, active && styles.roomOptionActive]}
                        >
                          <Text style={[styles.roomOptionTitle, active && styles.roomOptionTitleActive]}>{allocationLabel}</Text>
                          <Text style={[styles.roomOptionMeta, active && styles.roomOptionMetaActive]}>{seatsLabel}</Text>
                          <Text style={[styles.roomOptionSubtle, active && styles.roomOptionMetaActive]}>
                            {option.occupants.length} assigned
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.noRoomBox}>
                    <Text style={styles.noRoomText}>No available {activeType.unitLabel.toLowerCase()} right now.</Text>
                  </View>
                )}

                <View style={styles.formGrid}>
                  <TextField keyboardType="numeric" label={activeType.feeLabel} onChangeText={(value) => updateField('rent', value)} placeholder="Amount" value={form.rent} />
                </View>

                <Text style={styles.formLabel}>Status</Text>
                <View style={styles.sheetFilters}>
                  {activeType.statusOptions
                    .filter((item, index, list) => list.findIndex((entry) => entry.value === item.value) === index && item.value)
                    .map((status) => (
                      <FilterPill active={form.status === status.value} key={status.value} label={status.label} onPress={() => updateField('status', status.value)} />
                    ))}
                </View>
              </>
            ) : null}

            {formStep === 'details' ? (
              <>
                <Text style={styles.detailHint}>
                  {activeType.detailsHint}
                </Text>

                <View style={styles.formGrid}>
                  <TextField keyboardType="email-address" label="Email" onChangeText={(value) => updateField('email', value)} placeholder="Email optional" value={form.email} />
                  <TextField label={activeType.startDateLabel} onChangeText={(value) => updateField('moveInDate', value)} placeholder="YYYY-MM-DD" value={form.moveInDate} />
                  {activeType.usesTimeFields ? (
                    <TextField label="Check-in time" onChangeText={(value) => updateField('moveInTime', value)} placeholder="HH:mm" value={form.moveInTime} />
                  ) : null}
                  <TextField label={activeType.endDateLabel} onChangeText={(value) => updateField('moveOutDate', value)} placeholder="YYYY-MM-DD" value={form.moveOutDate} />
                  {activeType.usesTimeFields ? (
                    <TextField label="Check-out time" onChangeText={(value) => updateField('moveOutTime', value)} placeholder="HH:mm" value={form.moveOutTime} />
                  ) : null}
                </View>

                <Text style={styles.formLabel}>Services</Text>
                <View style={styles.sheetFilters}>
                  {activeType.services.map((service) => (
                    <FilterPill active={form.services.includes(service)} key={service} label={service} onPress={() => toggleService(service)} />
                  ))}
                </View>

                <Text style={styles.formLabel}>ID proof</Text>
                <View style={styles.proofBox}>
                  {form.idProof ? (
                    <>
                      <Text style={styles.proofTitle}>{form.idProofName || 'ID proof attached'}</Text>
                      <Text style={styles.proofMeta}>{Math.round((form.idProofSize || 0) / 1024)} KB</Text>
                      <View style={styles.proofActions}>
                        <Pressable disabled={saving} onPress={pickIdProof} style={styles.proofAction}>
                          <Text style={styles.proofActionText}>Replace</Text>
                        </Pressable>
                        <Pressable disabled={saving} onPress={removeIdProof} style={styles.proofDangerAction}>
                          <Text style={styles.proofDangerText}>Remove</Text>
                        </Pressable>
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={styles.proofTitle}>No ID proof attached</Text>
                      <Text style={styles.proofMeta}>Attach a photo from the device gallery.</Text>
                      <Pressable disabled={saving} onPress={pickIdProof} style={styles.proofPrimaryAction}>
                        <Text style={styles.proofPrimaryText}>Attach ID proof</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              </>
            ) : null}

            <View style={styles.sheetActions}>
              <Pressable disabled={saving} onPress={formStep === 'business' ? onClose : goBack} style={[styles.sheetSecondaryAction, saving && styles.disabledAction]}>
                <Text style={styles.sheetSecondaryText}>{formStep === 'business' ? 'Cancel' : 'Back'}</Text>
              </Pressable>
              <Pressable disabled={saving} onPress={formStep === 'details' ? submit : goNext} style={[styles.sheetPrimaryAction, saving && styles.disabledAction]}>
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.sheetPrimaryText}>{formStep === 'details' ? (customer ? 'Save customer' : 'Add customer') : 'Next'}</Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function IdProofPreview({
  onClose,
  proof,
  styles,
}: {
  onClose: () => void;
  proof: TenantRecord | null;
  styles: ReturnType<typeof createStyles>;
}) {
  if (!proof) return null;

  const canPreview = String(proof.idProof || '').startsWith('data:image');

  return (
    <Modal animationType="fade" transparent visible onRequestClose={onClose}>
      <View style={styles.previewBackdrop}>
        <View style={styles.previewPanel}>
          <Text style={styles.previewTitle}>{proof.idProofName || 'ID proof'}</Text>
          {proof.idProofSize ? <Text style={styles.previewMeta}>{Math.round(proof.idProofSize / 1024)} KB</Text> : null}
          {canPreview ? (
            <Image resizeMode="contain" source={{ uri: proof.idProof || '' }} style={styles.previewImage} />
          ) : (
            <View style={styles.previewEmpty}>
              <Text style={styles.previewEmptyText}>Preview is available for image ID proofs.</Text>
            </View>
          )}
          <Pressable onPress={onClose} style={styles.previewClose}>
            <Text style={styles.previewCloseText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
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
  heroTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  heroCopy: {
    flex: 1,
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
  addButton: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  addButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: typography.weight.black,
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
  businessContext: {
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  businessContextLabel: {
    color: colors.panelMuted,
    fontSize: 11,
    fontWeight: typography.weight.black,
    textTransform: 'uppercase',
  },
  businessContextTitle: {
    color: colors.onBrand,
    fontSize: 22,
    fontWeight: typography.weight.black,
    marginTop: spacing.xs,
  },
  businessContextMeta: {
    color: colors.panelMuted,
    fontSize: 13,
    fontWeight: typography.weight.bold,
    marginTop: spacing.xs,
  },
  formStepper: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.md,
    padding: spacing.xs,
  },
  stepperItem: {
    alignItems: 'center',
    borderRadius: radius.sm,
    flex: 1,
    minHeight: 42,
    gap: spacing.xs,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  stepperItemActive: {
    backgroundColor: colors.ink,
  },
  stepperIndex: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: typography.weight.black,
  },
  stepperIndexActive: {
    color: colors.panelAccent,
  },
  stepperText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: typography.weight.black,
  },
  stepperTextActive: {
    color: colors.onBrand,
  },
  detailHint: {
    backgroundColor: colors.skySoft,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: typography.weight.bold,
    lineHeight: 19,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  formLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: typography.weight.black,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
    textTransform: 'uppercase',
  },
  sheetFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  roomPickerHeader: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  roomPickerTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: typography.weight.black,
  },
  roomPickerMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: typography.weight.bold,
    marginTop: spacing.xs,
  },
  roomPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  inlineHelp: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: typography.weight.bold,
    lineHeight: 19,
    marginTop: spacing.sm,
  },
  allocationStatusBox: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.sm,
    padding: spacing.md,
  },
  allocationStatusBoxDanger: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
  allocationStatusTitle: {
    color: colors.success,
    fontSize: 14,
    fontWeight: typography.weight.black,
  },
  allocationStatusTitleDanger: {
    color: colors.danger,
  },
  allocationStatusMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: typography.weight.bold,
    marginTop: spacing.xs,
  },
  roomOption: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 78,
    padding: spacing.md,
    width: '48%',
  },
  roomOptionActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  roomOptionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: typography.weight.black,
  },
  roomOptionTitleActive: {
    color: colors.onBrand,
  },
  roomOptionMeta: {
    color: colors.success,
    fontSize: 12,
    fontWeight: typography.weight.black,
    marginTop: spacing.xs,
  },
  roomOptionMetaActive: {
    color: colors.panelMuted,
  },
  roomOptionSubtle: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: typography.weight.bold,
    marginTop: 2,
  },
  noRoomBox: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warning,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  noRoomText: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: typography.weight.black,
    lineHeight: 19,
  },
  formGrid: {
    gap: spacing.md,
    marginTop: spacing.lg,
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
  proofBox: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  proofTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: typography.weight.black,
  },
  proofMeta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: typography.weight.bold,
    lineHeight: 19,
    marginTop: spacing.xs,
  },
  proofActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  proofAction: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    flex: 1,
    minHeight: 42,
    justifyContent: 'center',
  },
  proofActionText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: typography.weight.black,
  },
  proofDangerAction: {
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    flex: 1,
    minHeight: 42,
    justifyContent: 'center',
  },
  proofDangerText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: typography.weight.black,
  },
  proofPrimaryAction: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    marginTop: spacing.md,
    minHeight: 42,
    justifyContent: 'center',
  },
  proofPrimaryText: {
    color: colors.onBrand,
    fontSize: 13,
    fontWeight: typography.weight.black,
  },
  previewBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.68)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  previewPanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    maxHeight: '88%',
    padding: spacing.lg,
    width: '100%',
  },
  previewTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: typography.weight.black,
  },
  previewMeta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: typography.weight.bold,
    marginTop: spacing.xs,
  },
  previewImage: {
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    height: 430,
    marginTop: spacing.md,
    width: '100%',
  },
  previewEmpty: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    marginTop: spacing.md,
    padding: spacing.xl,
  },
  previewEmptyText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: typography.weight.bold,
    lineHeight: 20,
    textAlign: 'center',
  },
  previewClose: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    marginTop: spacing.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  previewCloseText: {
    color: colors.onBrand,
    fontSize: 13,
    fontWeight: typography.weight.black,
  },
  disabledAction: {
    opacity: 0.45,
  },
  });
}
