import { useState } from 'react';
import { CalendarDays, HeartPulse, Plus, Scale, Syringe, Trash2 } from '../icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { HealthEntry, Pet, Reminder } from '../model';
import { formatClock, ukZone } from '../model';
import { colors, fonts } from '../theme';

const dateFormat = new Intl.DateTimeFormat('en-GB', { timeZone: ukZone, day: 'numeric', month: 'short', year: 'numeric' });
const dayFormat = new Intl.DateTimeFormat('en-GB', { timeZone: ukZone, day: 'numeric', month: 'short' });
const numberFormat = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 3 });

type Props = {
  pet: Pet;
  health: HealthEntry[];
  reminders: Reminder[];
  canEdit: boolean;
  onHealth: (kind: HealthEntry['kind']) => void;
  onReminder: () => void;
  onRemoveReminder: (id: string) => void;
};

function formatDate(at: string, format = dateFormat) {
  const date = new Date(at);
  return Number.isFinite(date.getTime()) ? format.format(date) : 'Date unavailable';
}

function readWeight(value: string) {
  const match = value.trim().match(/^(\d+(?:[.,]\d+)?)\s*(?:kg)?$/i);
  if (!match) return null;
  const number = Number(match[1].replace(',', '.'));
  return Number.isFinite(number) && number > 0 ? number : null;
}

function displayWeight(value: string) {
  const weight = readWeight(value);
  return weight === null ? value : `${numberFormat.format(weight)} kg`;
}

function AddAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
      <Plus size={16} color={colors.greenDark} />
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

function ReminderList({ reminders, canEdit, onRemove }: {
  reminders: Reminder[];
  canEdit: boolean;
  onRemove: (id: string) => void;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  return (
    <View style={styles.card}>
      {reminders.map((reminder, index) => {
        const vaccine = reminder.kind === 'vaccine';
        const Icon = vaccine ? Syringe : CalendarDays;
        const date = new Date(reminder.at);
        const when = Number.isFinite(date.getTime())
          ? `${dateFormat.format(date)} at ${formatClock(date)}`
          : 'Date unavailable';

        return (
          <View key={reminder.id} style={index > 0 ? styles.rowBorder : undefined}>
            <View style={styles.row}>
              <View style={[styles.iconTile, { backgroundColor: vaccine ? colors.lavender : colors.peach }]}>
                <Icon size={19} color={colors.greenDark} strokeWidth={1.8} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{reminder.title}</Text>
                <Text style={styles.meta}>{when} · {vaccine ? 'Vaccination' : 'Vet visit'}</Text>
                {reminder.note ? <Text style={styles.note}>{reminder.note}</Text> : null}
              </View>
              {canEdit ? (
                <Pressable accessibilityRole="button" accessibilityLabel={`Remove reminder: ${reminder.title}`}
                  aria-expanded={pendingId === reminder.id}
                  onPress={() => setPendingId(pendingId === reminder.id ? null : reminder.id)}
                  style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
                  <Trash2 size={16} color={colors.muted} strokeWidth={1.8} />
                </Pressable>
              ) : null}
            </View>
            {canEdit && pendingId === reminder.id ? (
              <View style={styles.confirmRow}>
                <Text accessibilityLiveRegion="polite" style={styles.confirmLabel}>Remove this reminder?</Text>
                <Pressable accessibilityRole="button" onPress={() => setPendingId(null)} style={styles.confirmButton}>
                  <Text style={styles.actionLabel}>Cancel</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => {
                  setPendingId(null);
                  onRemove(reminder.id);
                }} style={styles.confirmButton}>
                  <Text style={styles.removeLabel}>Remove</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function WeightHistory({ entries }: { entries: HealthEntry[] }) {
  const latest = entries[0];
  const graph = entries.flatMap(entry => {
    const weight = readWeight(entry.value);
    return weight === null ? [] : [{ entry, weight }];
  }).slice(0, 6).reverse();
  const peak = Math.max(...graph.map(point => point.weight));
  const limit = Math.ceil(peak * 10) / 10;

  return (
    <>
      <View style={styles.weightCard}>
        <View style={styles.weightLead}>
          <View style={styles.weightIcon}><Scale size={20} color={colors.greenDark} strokeWidth={1.8} /></View>
          <View style={styles.weightLeadCopy}>
            <Text style={styles.weightLabel}>Latest weight</Text>
            <Text style={styles.weightValue}>{displayWeight(latest.value)}</Text>
            <Text style={styles.meta}>{formatDate(latest.at)}</Text>
            {latest.note ? <Text style={styles.note}>{latest.note}</Text> : null}
          </View>
        </View>
        {graph.length > 1 ? (
          <View style={styles.graph} accessible accessibilityLabel={graph.map(({ entry }) =>
            `${formatDate(entry.at)}: ${displayWeight(entry.value)}`).join(', ')}>
            {graph.map(({ entry, weight }, index) => (
              <View key={entry.id} style={styles.graphColumn}>
                <Text style={styles.graphValue} numberOfLines={1}>{numberFormat.format(weight)}</Text>
                <View style={[styles.bar, { height: Math.max(3, (weight / limit) * 45),
                  backgroundColor: index === graph.length - 1 ? colors.greenDark : colors.mutedGreen }]} />
                <Text style={styles.graphLabel} numberOfLines={1}>{formatDate(entry.at, dayFormat)}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
      {entries.length > 1 ? (
        <View style={styles.card}>
          {entries.slice(1).map((entry, index) => (
            <View key={entry.id} style={[styles.weightRow, index > 0 && styles.rowBorder]}>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{displayWeight(entry.value)}</Text>
                {entry.note ? <Text style={styles.note}>{entry.note}</Text> : null}
              </View>
              <Text style={styles.meta}>{formatDate(entry.at)}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </>
  );
}

export function Health({ pet, health, reminders, canEdit, onHealth, onReminder, onRemoveReminder }: Props) {
  const now = Date.now();
  const orderedReminders = [...reminders].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const upcoming = orderedReminders.filter(reminder => Date.parse(reminder.at) >= now);
  const past = orderedReminders.filter(reminder => !(Date.parse(reminder.at) >= now)).reverse();
  const orderedHealth = [...health].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const weights = orderedHealth.filter(entry => entry.kind === 'weight');
  const symptoms = orderedHealth.filter(entry => entry.kind === 'symptom');

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>Health records</Text>
        <Text style={styles.subtitle}>Appointments and health history for {pet.name}.</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text accessibilityRole="header" aria-level={2} style={styles.sectionTitle}>Upcoming reminders</Text>
          {canEdit ? <AddAction label="Add reminder" onPress={onReminder} /> : null}
        </View>
        {upcoming.length ? <ReminderList reminders={upcoming} canEdit={canEdit} onRemove={onRemoveReminder} /> : (
          <View style={styles.empty}>
            <CalendarDays size={22} color={colors.green} strokeWidth={1.7} />
            <Text style={styles.emptyText}>No vet or vaccination reminders coming up.</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text accessibilityRole="header" aria-level={2} style={styles.sectionTitle}>Weight history</Text>
          {canEdit ? <AddAction label="Log weight" onPress={() => onHealth('weight')} /> : null}
        </View>
        {weights.length ? <WeightHistory entries={weights} /> : (
          <View style={styles.empty}>
            <Scale size={22} color={colors.green} strokeWidth={1.7} />
            <Text style={styles.emptyText}>No weight measurements yet.</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text accessibilityRole="header" aria-level={2} style={styles.sectionTitle}>Symptom history</Text>
          {canEdit ? <AddAction label="Log symptom" onPress={() => onHealth('symptom')} /> : null}
        </View>
        {symptoms.length ? (
          <View style={styles.card}>
            {symptoms.map((entry, index) => (
              <View key={entry.id} style={[styles.row, index > 0 && styles.rowBorder]}>
                <View style={[styles.iconTile, { backgroundColor: colors.lavender }]}>
                  <HeartPulse size={18} color={colors.greenDark} strokeWidth={1.8} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle}>{entry.value}</Text>
                  <Text style={styles.meta}>{formatDate(entry.at)}</Text>
                  {entry.note ? <Text style={styles.note}>{entry.note}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.empty}>
            <HeartPulse size={22} color={colors.green} strokeWidth={1.7} />
            <Text style={styles.emptyText}>No symptoms recorded.</Text>
          </View>
        )}
      </View>

      {past.length ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text accessibilityRole="header" aria-level={2} style={styles.sectionTitle}>Past reminders</Text>
          </View>
          <ReminderList reminders={past} canEdit={canEdit} onRemove={onRemoveReminder} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 22, paddingTop: 8, paddingBottom: 14 },
  header: { gap: 4 },
  title: { color: colors.greenDark, fontFamily: fonts.heading, fontSize: 39, lineHeight: 46, letterSpacing: -1.6 },
  subtitle: { color: colors.muted, fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  section: { gap: 8 },
  sectionHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', minHeight: 43, columnGap: 8 },
  sectionTitle: { color: colors.greenDark, fontFamily: fonts.bold, fontSize: 17 },
  action: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 5 },
  actionLabel: { color: colors.greenDark, fontFamily: fonts.bold, fontSize: 13 },
  pressed: { opacity: 0.66 },
  card: { backgroundColor: colors.white, borderRadius: 20, borderColor: colors.line, borderWidth: 1, paddingHorizontal: 13 },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 13, gap: 10 },
  rowBorder: { borderTopColor: colors.line, borderTopWidth: StyleSheet.hairlineWidth },
  iconTile: { width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { color: colors.ink, fontFamily: fonts.bold, fontSize: 15, lineHeight: 20 },
  meta: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12, lineHeight: 17 },
  note: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, paddingTop: 3 },
  iconButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginVertical: -3, marginRight: -5 },
  confirmRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 9, paddingBottom: 8 },
  confirmLabel: { flexGrow: 1, color: colors.ink, fontFamily: fonts.medium, fontSize: 13 },
  confirmButton: { minHeight: 44, paddingHorizontal: 6, justifyContent: 'center' },
  removeLabel: { color: colors.red, fontFamily: fonts.bold, fontSize: 13 },
  weightCard: { backgroundColor: colors.mint, borderRadius: 21, padding: 15, gap: 16 },
  weightLead: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  weightLeadCopy: { flex: 1, gap: 1 },
  weightIcon: { width: 45, height: 45, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  weightLabel: { color: colors.greenDark, fontFamily: fonts.bold, fontSize: 12 },
  weightValue: { color: colors.greenDark, fontFamily: fonts.heading, fontSize: 30, lineHeight: 33 },
  graph: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  graphColumn: { flex: 1, alignItems: 'center', gap: 3 },
  graphValue: { color: colors.greenDark, fontFamily: fonts.bold, fontSize: 10 },
  graphLabel: { color: colors.muted, fontFamily: fonts.medium, fontSize: 10 },
  bar: { width: '72%', maxWidth: 32, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  weightRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingVertical: 10 },
  empty: { backgroundColor: colors.white, borderColor: colors.line, borderWidth: 1, borderRadius: 19,
    flexDirection: 'row', alignItems: 'center', gap: 11, padding: 16 },
  emptyText: { flex: 1, color: colors.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
});
