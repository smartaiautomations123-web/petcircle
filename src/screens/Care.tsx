import { useMemo, useState } from 'react';
import { ClipboardList, Footprints, NotebookPen, Pill, Plus, Utensils } from '../icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { CareEntry, CareKind, Pet } from '../model';
import { formatClock, kindNames, localDate, shiftDate, ukZone } from '../model';
import { colors, fonts } from '../theme';

const categories = {
  feed: { label: 'Feeding', icon: Utensils, fill: colors.peach },
  walk: { label: 'Walks', icon: Footprints, fill: colors.mint },
  med: { label: 'Medication', icon: Pill, fill: colors.lavender },
  note: { label: 'Notes', icon: NotebookPen, fill: colors.yellow },
} satisfies Record<CareKind, { label: string; icon: typeof Pill; fill: string }>;

type Filter = CareKind | 'all';

const filters: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All activity' },
  { id: 'feed', label: categories.feed.label },
  { id: 'walk', label: categories.walk.label },
  { id: 'med', label: categories.med.label },
  { id: 'note', label: categories.note.label },
];

const dayFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: ukZone, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
});

function groupByDay(entries: CareEntry[], filter: Filter) {
  const grouped = new Map<string, { date: Date; entries: CareEntry[] }>();
  const matching = entries
    .filter(entry => filter === 'all' || filter === entry.kind)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  for (const entry of matching) {
    const date = new Date(entry.at);
    const key = Number.isFinite(date.getTime()) ? localDate(date) : '';
    const group = grouped.get(key);
    if (group) group.entries.push(entry);
    else grouped.set(key, { date, entries: [entry] });
  }

  return [...grouped.entries()];
}

function CareRow({ entry }: { entry: CareEntry }) {
  const category = categories[entry.kind];
  const Icon = category.icon;
  const time = new Date(entry.at);

  return (
    <View style={styles.row}>
      <View style={[styles.iconTile, { backgroundColor: category.fill }]}>
        <Icon size={18} color={colors.greenDark} strokeWidth={1.8} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{entry.title}</Text>
        <Text style={styles.rowMeta}>{kindNames[entry.kind]} · {entry.by}</Text>
        {entry.note ? <Text style={styles.note}>{entry.note}</Text> : null}
      </View>
      {Number.isFinite(time.getTime()) ? <Text style={styles.time}>{formatClock(time)}</Text> : null}
    </View>
  );
}

export function Care({ pet, entries, onLog }: { pet: Pet; entries: CareEntry[]; onLog: (kind?: CareKind) => void }) {
  const [filter, setFilter] = useState<Filter>('all');
  const groups = useMemo(() => groupByDay(entries, filter), [entries, filter]);
  const today = localDate();
  const yesterday = shiftDate(today, -1);
  const log = () => onLog(filter === 'all' ? undefined : filter);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text accessibilityRole="header" style={styles.title}>Care log</Text>
          <Text style={styles.subtitle}>See what’s been done for {pet.name} and who did it.</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Log care" onPress={log}
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
          <Plus size={19} color={colors.white} />
          <Text style={styles.addButtonLabel}>Log care</Text>
        </Pressable>
      </View>

      <View style={styles.filters}>
        {filters.map(({ id, label }) => (
          <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected: filter === id }}
            aria-pressed={filter === id}
            onPress={() => setFilter(id)} style={({ pressed }) => [
              styles.filter, filter === id && styles.activeFilter, pressed && styles.pressed,
            ]}>
            <Text style={[styles.filterLabel, filter === id && styles.activeFilterLabel]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {groups.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}><ClipboardList size={24} color={colors.green} strokeWidth={1.6} /></View>
          <Text style={styles.emptyTitle}>{filter === 'all' ? 'A fresh start' : 'No matching entries yet'}</Text>
          <Text style={styles.emptyBody}>{filter === 'all'
            ? `Log ${pet.name}’s first meal, walk, medication or note to start the timeline.`
            : 'New entries in this category will appear here.'}</Text>
          {filter !== 'all' ? (
            <Pressable accessibilityRole="button" onPress={() => setFilter('all')} style={styles.clearButton}>
              <Text style={styles.clearLabel}>Show all activity</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.timeline}>
          {groups.map(([key, group]) => {
            const day = key === today ? 'Today'
              : key === yesterday ? 'Yesterday'
              : key ? dayFormat.format(group.date) : 'Date unavailable';

            return (
              <View key={key} style={styles.group}>
                <View style={styles.dayHeading}>
                  <Text accessibilityRole="header" aria-level={2} style={styles.day}>{day}</Text>
                  <View style={styles.dayLine} />
                </View>
                <View style={styles.card}>
                  {group.entries.map((entry, index) => (
                    <View key={entry.id} style={index > 0 ? styles.rowBorder : undefined}>
                      <CareRow entry={entry} />
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 22, paddingTop: 8, paddingBottom: 14 },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: 14 },
  headerCopy: { flex: 1, minWidth: 190, gap: 4 },
  title: { color: colors.greenDark, fontFamily: fonts.heading, fontSize: 39, lineHeight: 46, letterSpacing: -1.6 },
  subtitle: { color: colors.muted, fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  addButton: { backgroundColor: colors.greenDark, minHeight: 46, borderRadius: 15, paddingHorizontal: 14,
    flexDirection: 'row', alignItems: 'center', gap: 6 },
  addButtonLabel: { color: colors.white, fontFamily: fonts.bold, fontSize: 13 },
  pressed: { opacity: 0.74 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  filter: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, borderColor: colors.line,
    borderWidth: 1, borderRadius: 24, minHeight: 44, paddingHorizontal: 12 },
  activeFilter: { backgroundColor: colors.mint, borderColor: colors.green },
  filterLabel: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12 },
  activeFilterLabel: { color: colors.greenDark, fontFamily: fonts.bold },
  timeline: { gap: 21 },
  group: { gap: 9 },
  dayHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  day: { color: colors.greenDark, fontFamily: fonts.bold, fontSize: 14 },
  dayLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
  card: { backgroundColor: colors.white, borderRadius: 20, borderColor: colors.line, borderWidth: 1,
    paddingHorizontal: 13 },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 13, gap: 10 },
  rowBorder: { borderTopColor: colors.line, borderTopWidth: StyleSheet.hairlineWidth },
  iconTile: { width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { color: colors.ink, fontFamily: fonts.bold, fontSize: 15, lineHeight: 20 },
  rowMeta: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12, lineHeight: 17 },
  time: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12, lineHeight: 20 },
  note: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, paddingTop: 3 },
  empty: { paddingHorizontal: 24, paddingVertical: 27, gap: 9, alignItems: 'center', backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.line, borderRadius: 20 },
  emptyIcon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.mint, borderRadius: 16 },
  emptyTitle: { color: colors.ink, fontFamily: fonts.bold, fontSize: 16 },
  emptyBody: { color: colors.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  clearButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 10 },
  clearLabel: { color: colors.greenDark, fontFamily: fonts.bold, fontSize: 13 },
});
