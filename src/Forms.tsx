import { Camera, Check, X } from './icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from './theme';

type Values = Record<string, string>;
export type Field = {
  key: string; label: string; placeholder?: string; initial?: string; max?: number;
  type?: 'text' | 'long' | 'email' | 'password' | 'number' | 'phone' | 'photo';
  options?: { value: string; label: string }[]; show?: (values: Values) => boolean;
};

export type FormSpec = {
  title: string; description?: string; fields: Field[]; label: string;
  submit: (values: Values) => Promise<void> | void;
  remove?: { label: string; submit: () => Promise<void> | void };
};

export function Button({ label, onPress, secondary = false, busy = false }: { label: string; onPress: () => void; secondary?: boolean; busy?: boolean }) {
  return <Pressable accessibilityRole="button" aria-disabled={busy} disabled={busy} onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.secondary, pressed && { opacity: 0.73 }]}>
    {busy ? <ActivityIndicator color={secondary ? colors.greenDark : colors.white} /> : <Text style={[styles.buttonLabel, secondary && { color: colors.greenDark }]}>{label}</Text>}
  </Pressable>;
}

export function Sheet({ title, description, onClose, children }: { title: string; description?: string; onClose: () => void; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return <Modal animationType="fade" transparent visible onRequestClose={onClose} statusBarTranslucent>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
      <Pressable accessibilityElementsHidden importantForAccessibility="no" style={StyleSheet.absoluteFill} onPress={onClose} />
      <View accessibilityViewIsModal style={[styles.sheet, { paddingBottom: Math.max(20, insets.bottom) }]}>
        <View style={styles.sheetTop}>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.close}><X size={22} color={colors.ink} /></Pressable>
        </View>
        {description && <Text style={styles.description}>{description}</Text>}
        {children}
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

function message(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export function Form({ spec, onClose }: { spec: FormSpec; onClose: () => void }) {
  const [values, setValues] = useState<Values>(() => Object.fromEntries(spec.fields.map(field => [field.key, field.initial ?? ''])));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const set = (key: string, value: string) => setValues(previous => ({ ...previous, [key]: value }));

  async function submit(remove = false) {
    setBusy(true);
    setError('');
    try {
      if (remove) await spec.remove?.submit();
      else await spec.submit(values);
      onClose();
    } catch (failure) {
      setError(message(failure));
    } finally {
      setBusy(false);
    }
  }

  async function pickPhoto(key: string) {
    try {
      const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.9 });
      if (picked.canceled) return;
      const image = picked.assets[0];
      const context = ImageManipulator.ImageManipulator.manipulate(image.uri);
      context.resize({ width: Math.min(700, image.width) });
      const rendered = await context.renderAsync();
      const saved = await rendered.saveAsync({ compress: 0.66, format: ImageManipulator.SaveFormat.JPEG, base64: true });
      if (!saved.base64 || saved.base64.length > 395_000) throw new Error('Choose a smaller photo.');
      set(key, 'data:image/jpeg;base64,' + saved.base64);
      setError('');
    } catch (failure) {
      setError(message(failure));
    }
  }

  return <Sheet title={spec.title} description={spec.description} onClose={() => { if (!busy) onClose(); }}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.fields} showsVerticalScrollIndicator={false}>
      {spec.fields.filter(field => !field.show || field.show(values)).map(field => (
        <View key={field.key} style={styles.field}>
          <Text style={styles.label}>{field.label}</Text>
          {field.options ? <View style={styles.options}>{field.options.map(option => {
            const selected = values[field.key] === option.value;
            return <Pressable key={option.value} accessibilityRole="radio" aria-checked={selected} onPress={() => set(field.key, option.value)} style={[styles.chip, selected && styles.chipActive]}>
              {selected && <Check size={14} color={colors.greenDark} />}<Text style={[styles.chipLabel, selected && { color: colors.greenDark }]}>{option.label}</Text>
            </Pressable>;
          })}</View> : field.type === 'photo' ? <View style={styles.options}>
            {values[field.key] ? <Image source={{ uri: values[field.key] }} style={styles.preview} /> : null}
            <Pressable accessibilityRole="button" onPress={() => void pickPhoto(field.key)} style={styles.chip}><Camera size={17} color={colors.greenDark} /><Text style={styles.chipLabel}>Choose photo</Text></Pressable>
            {values[field.key] ? <Pressable accessibilityRole="button" onPress={() => set(field.key, '')} style={styles.chip}><Text style={styles.chipLabel}>Remove photo</Text></Pressable> : null}
          </View> : <TextInput
            accessibilityLabel={field.label}
            style={[styles.input, field.type === 'long' && styles.multiline]}
            value={values[field.key]}
            onChangeText={value => set(field.key, value)}
            placeholder={field.placeholder}
            placeholderTextColor="#66736A"
            maxLength={field.max ?? (field.type === 'long' ? 1500 : 160)}
            secureTextEntry={field.type === 'password'}
            keyboardType={field.type === 'email' ? 'email-address' : field.type === 'number' ? 'decimal-pad' : field.type === 'phone' ? 'phone-pad' : 'default'}
            autoCapitalize={field.type === 'email' || field.type === 'password' ? 'none' : 'sentences'}
            autoComplete={field.type === 'email' ? 'email' : field.type === 'password' ? 'current-password' : undefined}
            multiline={field.type === 'long'}
          />}
        </View>
      ))}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <Button label={spec.label} busy={busy} onPress={() => void submit()} />
      {spec.remove && <Pressable accessibilityRole="button" disabled={busy} onPress={() => confirm ? void submit(true) : setConfirm(true)} style={styles.remove}>
        <Text style={styles.removeLabel}>{confirm ? 'Confirm removal' : spec.remove.label}</Text>
      </Pressable>}
    </ScrollView>
  </Sheet>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#12291DD0', justifyContent: 'center', alignItems: 'center', padding: 15 },
  sheet: { backgroundColor: colors.paper, width: '100%', maxWidth: 500, maxHeight: '91%', borderRadius: 23, paddingHorizontal: 19, paddingTop: 15 },
  sheetTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  title: { flex: 1, color: colors.ink, fontFamily: fonts.heading, fontSize: 31, lineHeight: 36 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.mint },
  description: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginTop: 4 },
  fields: { gap: 15, paddingTop: 15, paddingBottom: 2 },
  field: { gap: 6 },
  label: { color: colors.ink, fontFamily: fonts.bold, fontSize: 13 },
  input: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 11, paddingHorizontal: 11, paddingVertical: 10, minHeight: 47, color: colors.ink, fontFamily: fonts.body, fontSize: 16 },
  multiline: { minHeight: 86, textAlignVertical: 'top' },
  options: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 10, minHeight: 44, borderRadius: 10, backgroundColor: colors.white },
  chipActive: { backgroundColor: colors.mint, borderColor: colors.mutedGreen },
  chipLabel: { color: colors.muted, fontFamily: fonts.bold, fontSize: 12 },
  preview: { width: 48, height: 48, borderRadius: 10 },
  button: { minHeight: 46, borderRadius: 12, backgroundColor: colors.greenDark, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  secondary: { backgroundColor: colors.mint, borderWidth: 1, borderColor: colors.mutedGreen },
  buttonLabel: { fontFamily: fonts.bold, fontSize: 13, textAlign: 'center', color: colors.white },
  error: { color: colors.red, fontFamily: fonts.bold, fontSize: 13 },
  remove: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  removeLabel: { color: colors.red, fontFamily: fonts.bold, fontSize: 13 },
});
