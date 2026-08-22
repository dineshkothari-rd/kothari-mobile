import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { radius, spacing, typography, useAppTheme, type AppColors } from '../../design/tokens';
import { useLanguage } from '../../shared/i18n/LanguageProvider';
import type { TenantRecord } from '../../shared/types/records';
import { toNumber } from '../../shared/utils/money';
import { getCustomerName } from './customerUtils';

export type LifecycleMeterResult = {
  ocrText: string;
  photo: string;
  photoSize: number;
  reading: number;
};

type LifecycleAction = 'check-in' | 'check-out';

function extractMeterCandidates(text: string) {
  const normalized = text.replace(/[oO]/g, '0');
  const matches = normalized.match(/\d+(?:[.,]\d+)?/g) || [];
  const values = matches
    .map((match) => Number(match.replace(',', '.')))
    .filter((value) => Number.isFinite(value) && value >= 0 && value <= 999999999);

  return [...new Set(values)].sort((first, second) => {
    const firstDigits = String(Math.trunc(first)).length;
    const secondDigits = String(Math.trunc(second)).length;
    return secondDigits - firstDigits || second - first;
  });
}

export function LifecycleMeterSheet({
  action,
  customer,
  minimumReading,
  onClose,
  onSubmit,
  saving,
}: {
  action: LifecycleAction;
  customer: TenantRecord;
  minimumReading: number;
  onClose: () => void;
  onSubmit: (result: LifecycleMeterResult) => void;
  saving: boolean;
}) {
  const { colors } = useAppTheme();
  const { t } = useLanguage();
  const styles = createStyles(colors);
  const [photo, setPhoto] = useState('');
  const [photoSize, setPhotoSize] = useState(0);
  const [ocrText, setOcrText] = useState('');
  const [reading, setReading] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const title = action === 'check-in' ? t('Check-in meter reading') : t('Check-out meter reading');

  async function captureAndRead() {
    setError('');
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      setError(t('Camera permission is required to scan the meter.'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]?.uri) return;

    setScanning(true);

    try {
      const context = ImageManipulator.manipulate(result.assets[0].uri);
      context.resize({ width: 1024 });
      const rendered = await context.renderAsync();
      const optimized = await rendered.saveAsync({ base64: true, compress: 0.45, format: SaveFormat.JPEG });

      if (!optimized.base64) throw new Error(t('Could not prepare meter photo.'));
      if (optimized.base64.length > 650_000) {
        throw new Error(t('Meter photo is too large. Move closer and retake it.'));
      }

      const { recognizeText } = await import('@infinitered/react-native-mlkit-text-recognition');
      const recognized = await recognizeText(optimized.uri);
      const detectedCandidates = extractMeterCandidates(recognized.text);
      const validCandidates = detectedCandidates.filter((value) => value >= minimumReading);
      const suggested = validCandidates[0] ?? detectedCandidates[0];

      setPhoto(`data:image/jpeg;base64,${optimized.base64}`);
      setPhotoSize(optimized.base64.length);
      setOcrText(recognized.text);
      setReading(suggested === undefined ? '' : String(suggested));

      if (suggested === undefined) setError(t('No meter number was detected. Retake the meter photo.'));
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : t('Could not read meter photo.'));
    } finally {
      setScanning(false);
    }
  }

  function submit() {
    const numericReading = toNumber(reading);

    if (!photo) {
      setError(t('Take a meter photo before continuing.'));
      return;
    }

    if (!reading.trim() || !Number.isFinite(numericReading)) {
      setError(t('Confirm a valid meter reading.'));
      return;
    }

    if (numericReading < minimumReading) {
      setError(`${t('Meter reading cannot be less than')} ${minimumReading}.`);
      return;
    }

    onSubmit({ ocrText, photo, photoSize, reading: numericReading });
  }

  return (
    <Modal animationType="slide" transparent visible onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text style={styles.kicker}>{t(action === 'check-in' ? 'Check in' : 'Check out')}</Text>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>{getCustomerName(customer)} / {String(customer.room || '-')}</Text>
              </View>
              <Pressable disabled={saving || scanning} onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeText}>{t('Close')}</Text>
              </Pressable>
            </View>

            <View style={styles.minimumBox}>
              <Text style={styles.minimumLabel}>{t('Minimum allowed reading')}</Text>
              <Text style={styles.minimumValue}>{minimumReading}</Text>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            {photo ? <Image resizeMode="contain" source={{ uri: photo }} style={styles.preview} /> : null}

            <Pressable disabled={saving || scanning} onPress={captureAndRead} style={styles.cameraButton}>
              {scanning ? (
                <ActivityIndicator color={colors.onBrand} />
              ) : (
                <Text style={styles.cameraButtonText}>{t(photo ? 'Retake and scan' : 'Take meter photo')}</Text>
              )}
            </Pressable>

            <View style={styles.readingField}>
              <Text style={styles.readingLabel}>{t('Detected meter reading')}</Text>
              <View style={styles.lockedReading}>
                <Text style={[styles.readingValue, !reading && styles.readingPlaceholder]}>
                  {reading || t('Take a clear meter photo to detect reading')}
                </Text>
                <Text style={styles.lockedBadge}>{t('Locked')}</Text>
              </View>
            </View>

            <Text style={styles.help}>{t('Reading is fetched from the meter photo and cannot be edited. Retake the photo if it is incorrect.')}</Text>

            <View style={styles.actions}>
              <Pressable disabled={saving || scanning} onPress={onClose} style={styles.secondaryAction}>
                <Text style={styles.secondaryText}>{t('Cancel')}</Text>
              </Pressable>
              <Pressable disabled={saving || scanning} onPress={submit} style={[styles.primaryAction, (saving || scanning) && styles.disabled]}>
                {saving ? <ActivityIndicator color={colors.onBrand} /> : <Text style={styles.primaryText}>{t(action === 'check-in' ? 'Save & check in' : 'Save & check out')}</Text>}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    backdrop: { backgroundColor: 'rgba(0,0,0,0.58)', flex: 1, justifyContent: 'flex-end' },
    sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, maxHeight: '94%', padding: spacing.lg },
    handle: { alignSelf: 'center', backgroundColor: colors.border, borderRadius: radius.sm, height: 4, marginBottom: spacing.lg, width: 44 },
    header: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
    headerCopy: { flex: 1 },
    kicker: { color: colors.brand, fontSize: 12, fontWeight: typography.weight.black, textTransform: 'uppercase' },
    title: { color: colors.text, fontSize: 23, fontWeight: typography.weight.black, marginTop: 4 },
    subtitle: { color: colors.muted, fontSize: 13, fontWeight: typography.weight.bold, marginTop: 5 },
    closeButton: { backgroundColor: colors.surfaceMuted, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    closeText: { color: colors.text, fontSize: 13, fontWeight: typography.weight.black },
    minimumBox: { alignItems: 'center', backgroundColor: colors.skySoft, borderRadius: radius.md, flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg, padding: spacing.md },
    minimumLabel: { color: colors.muted, fontSize: 13, fontWeight: typography.weight.bold },
    minimumValue: { color: colors.text, fontSize: 20, fontWeight: typography.weight.black },
    error: { backgroundColor: colors.dangerSoft, borderRadius: radius.md, color: colors.danger, fontSize: 13, fontWeight: typography.weight.bold, lineHeight: 19, marginTop: spacing.md, padding: spacing.md },
    preview: { backgroundColor: colors.surfaceMuted, borderRadius: radius.md, height: 210, marginTop: spacing.md, width: '100%' },
    cameraButton: { alignItems: 'center', backgroundColor: colors.ink, borderRadius: radius.md, justifyContent: 'center', marginTop: spacing.md, minHeight: 50 },
    cameraButtonText: { color: colors.onBrand, fontSize: 14, fontWeight: typography.weight.black },
    readingField: { marginTop: spacing.lg },
    readingLabel: { color: colors.muted, fontSize: 12, fontWeight: typography.weight.black, textTransform: 'uppercase' },
    lockedReading: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm, minHeight: 56, paddingHorizontal: spacing.md },
    readingValue: { color: colors.text, flex: 1, fontSize: 22, fontWeight: typography.weight.black },
    readingPlaceholder: { color: colors.muted, fontSize: 13, fontWeight: typography.weight.bold },
    lockedBadge: { backgroundColor: colors.accentSoft, borderRadius: radius.sm, color: colors.accent, fontSize: 11, fontWeight: typography.weight.black, marginLeft: spacing.sm, overflow: 'hidden', paddingHorizontal: spacing.sm, paddingVertical: 5, textTransform: 'uppercase' },
    help: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: spacing.sm },
    actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
    secondaryAction: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.md, flex: 1, justifyContent: 'center', minHeight: 48 },
    secondaryText: { color: colors.text, fontSize: 14, fontWeight: typography.weight.black },
    primaryAction: { alignItems: 'center', backgroundColor: colors.ink, borderRadius: radius.md, flex: 1.5, justifyContent: 'center', minHeight: 48 },
    primaryText: { color: colors.onBrand, fontSize: 14, fontWeight: typography.weight.black },
    disabled: { opacity: 0.5 },
  });
}
