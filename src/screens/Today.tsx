import { ArrowRight, Check, ChevronRight, CircleAlert, Clock3, Footprints, HeartPulse, PawPrint, Pill, Plus, Utensils, NotebookPen, UsersRound } from '../icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { formatClock, kindNames, localDate, routineStatus, ukZone, type CareEntry, type CareKind, type Pet, type Routine } from '../model';
import { colors, fonts } from '../theme';

export const careIcons = { feed: Utensils, walk: Footprints, med: Pill, note: NotebookPen };
const fills = { feed: colors.peach, walk: colors.mint, med: colors.lavender, note: colors.yellow };
const labels = { feed: 'Feeding', walk: 'Walk', med: 'Medication', note: 'Note' };

type Props = {
  pet: Pet; person: string; routines: Routine[]; entries: CareEntry[]; now: Date; canEdit: boolean;
  onLog: (kind: CareKind) => void; onComplete: (routine: Routine) => void;
  onEditRoutine: (routine?: Routine) => void; onCircle: () => void; onKit: () => void;
};

export function PetPhoto({ pet, size = 36 }: { pet: Pet; size?: number }) {
  const source = pet.photoUrl ? { uri: pet.photoUrl } : pet.id === 'milo' ? require('../../assets/milo.jpg') : undefined;
  return source ? <Image source={source} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.mint }} /> :
    <View style={[styles.petAvatar, { width: size, height: size, borderRadius: size / 2 }]}><PawPrint size={size * 0.45} color={colors.green} /></View>;
}

export function Today({ pet, person, routines, entries, now, canEdit, onLog, onComplete, onEditRoutine, onCircle, onKit }: Props) {
  const wide = useWindowDimensions().width >= 960;
  const ordered = [...routines].sort((left, right) => left.time.localeCompare(right.time));
  const statuses = ordered.map(routine => ({ routine, ...routineStatus(routine, entries, now) }));
  const done = statuses.filter(item => item.state === 'done').length;
  const attention = statuses.filter(item => item.escalated);
  const next = statuses.find(item => item.state !== 'done');
  const lastMeal = [...entries].filter(entry => entry.kind === 'feed').sort((a, b) => b.at.localeCompare(a.at))[0];
  const lastMealToday = lastMeal && localDate(new Date(lastMeal.at)) === localDate(now);
  const heroImage = pet.photoUrl ? { uri: pet.photoUrl } : pet.id === 'milo' ? require('../../assets/milo.jpg') : undefined;
  const dateText = new Intl.DateTimeFormat('en-GB', { timeZone: ukZone, weekday: 'long', day: 'numeric', month: 'long' }).format(now);

  return (
    <View>
      <View style={styles.intro}>
        <Text style={styles.kicker}><Text style={styles.dateDot}>●</Text>  {dateText.toUpperCase()}</Text>
        <Text accessibilityRole="header" style={styles.heading}>{person === 'You' ? 'Today’s care' : 'Hello, ' + person.split(' ')[0] + '.'}</Text>
        <Text style={styles.subtitle}>Here’s what {pet.name} needs today.</Text>
      </View>

      <View style={[styles.dashboard, wide && styles.dashboardWide]}>
        <View style={styles.primary}>
          <View style={styles.hero}>
            {heroImage && <Image source={heroImage} style={styles.heroImage} resizeMode="cover" />}
            {heroImage && <LinearGradient colors={['#153E31', '#153E31', '#153E3100']} locations={[0, 0.36, 0.9]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />}
            <View style={styles.heroCopy}>
              <View style={styles.heroTag}><PawPrint color="#E3EFDD" size={13} /><Text style={styles.heroTagText}>FEEDING STATUS</Text></View>
              <Text accessibilityRole="header" style={styles.heroTitle}>{lastMealToday ? 'Meal logged' : 'No meal logged today'}</Text>
              <Text style={styles.heroBody}>{lastMealToday ? lastMeal.title + ' · ' + formatClock(lastMeal.at) : lastMeal ? 'Last meal was logged on ' + new Intl.DateTimeFormat('en-GB', { timeZone: ukZone, day: 'numeric', month: 'short' }).format(new Date(lastMeal.at)) + '.' : 'Check with your care circle before feeding.'}</Text>
              {lastMealToday && <Text style={styles.heroBy}>Logged by {lastMeal.by}</Text>}
              {!lastMealToday && <Pressable accessibilityRole="button" onPress={() => onLog('feed')} style={({ pressed }) => [styles.heroAction, pressed && styles.pressed]}><Plus size={15} color="#EFF7EA" /><Text style={styles.heroActionText}>Record a meal</Text></Pressable>}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionCopy}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>Daily routine</Text>
                <Text style={styles.sectionHint}>{ordered.length ? done + ' of ' + ordered.length + ' completed today' : 'Schedule recurring meals, walks and medication.'}</Text>
              </View>
              {canEdit && <Pressable accessibilityRole="button" accessibilityLabel="Add routine" onPress={() => onEditRoutine()} style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}><Plus size={17} color={colors.green} /><Text style={styles.outlineLabel}>Add routine</Text></Pressable>}
            </View>
            {ordered.length > 0 && (
              <View style={styles.routineCard}>
                {statuses.map(({ routine, state, due, escalated, entry }, index) => {
                  const Icon = careIcons[routine.kind];
                  return (
                    <View key={routine.id} style={[styles.routineRow, index > 0 && styles.routineBorder]}>
                      <View style={[styles.kindIcon, { backgroundColor: fills[routine.kind] }]}><Icon size={20} color={colors.greenDark} strokeWidth={1.8} /></View>
                      <Pressable accessibilityRole={canEdit ? 'button' : undefined} accessibilityLabel={canEdit ? 'Edit ' + routine.title : undefined} disabled={!canEdit} onPress={() => onEditRoutine(routine)} style={styles.routineInfo}>
                        <Text style={styles.routineName}>{routine.title}</Text>
                        <Text style={styles.routineDetails} numberOfLines={2}>{formatClock(due)}{routine.details ? ' · ' + routine.details : ''}</Text>
                        {entry && <Text style={styles.doneBy}>Done by {entry.by} at {formatClock(entry.at)}</Text>}
                        {state === 'late' && <Text style={styles.late}>{escalated ? 'Needs attention' : 'Overdue'}</Text>}
                      </Pressable>
                      {state === 'done' ? <View accessible accessibilityLabel="Completed" style={[styles.check, styles.completed]}><Check size={19} color={colors.greenDark} /></View> :
                        <Pressable accessibilityRole="button" accessibilityLabel={'Mark ' + routine.title + ' done'} onPress={() => onComplete(routine)} style={({ pressed }) => [styles.check, pressed && styles.pressed]}><Check size={17} color={colors.green} /></Pressable>}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        <View style={styles.secondary}>
          <View style={styles.sideCard}>
            <View style={styles.sideHeader}><View style={styles.smallIcon}><Clock3 size={18} color={colors.greenDark} /></View><Text accessibilityRole="header" style={styles.sideTitle}>Up next</Text></View>
            {next ? <><Text style={styles.nextTitle}>{next.routine.title}</Text><Text style={styles.sideBody}>{formatClock(next.due)}{next.state === 'late' ? ' · Overdue' : ' today'}</Text></> :
              <Text style={styles.sideBody}>{ordered.length ? 'All scheduled care is complete for today.' : 'Your next scheduled task will appear here.'}</Text>}
            {attention.length > 0 && <View style={styles.alert}><CircleAlert size={17} color={colors.red} /><Text style={styles.alertText}>{attention.length === 1 ? attention[0].routine.title + ' needs attention.' : attention.length + ' tasks need attention.'}</Text></View>}
          </View>

          <View style={styles.sideCard}>
            <Text accessibilityRole="header" style={styles.sideTitle}>Quick log</Text>
            <View style={styles.quickGrid}>
              {(Object.keys(careIcons) as CareKind[]).map(kind => {
                const Icon = careIcons[kind];
                return <Pressable key={kind} onPress={() => onLog(kind)} accessibilityRole="button" accessibilityLabel={'Log ' + kindNames[kind].toLowerCase()} style={({ pressed }) => [styles.quickTile, { backgroundColor: fills[kind] }, pressed && styles.pressed]}>
                  <Icon size={19} color={colors.greenDark} strokeWidth={1.8} /><Text style={styles.quickLabel}>{labels[kind]}</Text>
                </Pressable>;
              })}
            </View>
          </View>
          <Pressable accessibilityRole="button" onPress={onCircle} style={({ pressed }) => [styles.shortcut, pressed && styles.pressed]}>
            <UsersRound size={20} color={colors.greenDark} /><View style={styles.shortcutText}><Text style={styles.shortcutTitle}>Sitter handover</Text><Text style={styles.sideBody}>Share care instructions</Text></View><ArrowRight size={18} color={colors.green} />
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onKit} style={({ pressed }) => [styles.shortcut, pressed && styles.pressed]}>
            <HeartPulse size={20} color={colors.greenDark} /><View style={styles.shortcutText}><Text style={styles.shortcutTitle}>Emergency kit</Text><Text style={styles.sideBody}>Contacts and lost-pet pack</Text></View><ChevronRight size={19} color={colors.green} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { gap: 5, marginBottom: 23 },
  kicker: { fontFamily: fonts.bold, color: colors.green, fontSize: 11, letterSpacing: 1.7 },
  dateDot: { color: '#839B70', fontSize: 10 },
  heading: { fontFamily: fonts.heading, fontSize: 47, lineHeight: 52, color: colors.ink, letterSpacing: -1.4 },
  subtitle: { fontFamily: fonts.body, fontSize: 15, color: colors.muted },
  dashboard: { gap: 20 },
  dashboardWide: { flexDirection: 'row', alignItems: 'flex-start' },
  primary: { flex: 1, minWidth: 0, gap: 25 },
  secondary: { flexGrow: 0, flexShrink: 0, flexBasis: '33%', minWidth: 0, gap: 12 },
  hero: { minHeight: 226, overflow: 'hidden', borderRadius: 22, backgroundColor: '#153E31', justifyContent: 'center' },
  heroImage: { width: '62%', height: '100%', position: 'absolute', right: 0, top: 0 },
  heroCopy: { width: '68%', paddingHorizontal: 23, paddingVertical: 24, gap: 6, alignItems: 'flex-start' },
  heroTag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 6, backgroundColor: '#FFFFFF23', marginBottom: 6 },
  heroTagText: { fontFamily: fonts.bold, color: '#E3EFDD', fontSize: 9, letterSpacing: 1.2 },
  heroTitle: { fontFamily: fonts.heading, color: '#FFFDF7', fontSize: 36, lineHeight: 38, letterSpacing: -0.5 },
  heroBody: { fontFamily: fonts.bold, color: '#F4F8F1', fontSize: 13 },
  heroBy: { fontFamily: fonts.body, color: '#D6E6D4', fontSize: 12 },
  heroAction: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44 },
  heroActionText: { color: '#EFF7EA', fontFamily: fonts.bold, fontSize: 12 },
  section: { gap: 13 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  sectionCopy: { flex: 1 },
  sectionTitle: { fontFamily: fonts.heading, color: colors.ink, fontSize: 27, lineHeight: 32 },
  sectionHint: { fontFamily: fonts.body, color: colors.muted, fontSize: 12, marginTop: 2 },
  outlineButton: { borderWidth: 1, borderColor: colors.line, paddingHorizontal: 10, minHeight: 40, gap: 4, flexDirection: 'row', alignItems: 'center', borderRadius: 10, backgroundColor: colors.white },
  outlineLabel: { fontFamily: fonts.bold, color: colors.greenDark, fontSize: 11 },
  routineCard: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 13 },
  routineRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, gap: 11 },
  routineBorder: { borderTopWidth: 1, borderColor: colors.line },
  kindIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  routineInfo: { flex: 1, gap: 3, paddingVertical: 3 },
  routineName: { fontFamily: fonts.bold, color: colors.ink, fontSize: 14 },
  routineDetails: { fontFamily: fonts.body, color: colors.muted, fontSize: 11 },
  doneBy: { fontFamily: fonts.medium, color: colors.green, fontSize: 10 },
  late: { fontFamily: fonts.bold, color: colors.red, fontSize: 10 },
  check: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  completed: { borderColor: colors.mint, backgroundColor: colors.mint },
  sideCard: { padding: 15, gap: 8, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 16 },
  sideHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  smallIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.mint },
  sideTitle: { fontFamily: fonts.heading, color: colors.ink, fontSize: 21 },
  nextTitle: { fontFamily: fonts.bold, color: colors.ink, fontSize: 14 },
  sideBody: { fontFamily: fonts.body, color: colors.muted, fontSize: 11, lineHeight: 16 },
  alert: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: '#F9EAE2', borderRadius: 9, padding: 8, marginTop: 3 },
  alertText: { flex: 1, color: colors.red, fontFamily: fonts.bold, fontSize: 11 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  quickTile: { flexBasis: '45%', flexGrow: 1, flexDirection: 'row', gap: 6, alignItems: 'center', minHeight: 46, borderRadius: 10, paddingHorizontal: 7 },
  quickLabel: { flexShrink: 1, fontFamily: fonts.bold, color: colors.greenDark, fontSize: 10 },
  shortcut: { flexDirection: 'row', gap: 10, alignItems: 'center', minHeight: 60, paddingHorizontal: 13, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: '#F0F3EB' },
  shortcutText: { flex: 1, gap: 2 },
  shortcutTitle: { fontFamily: fonts.bold, color: colors.greenDark, fontSize: 12 },
  petAvatar: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.mint },
  pressed: { opacity: 0.72 },
});
