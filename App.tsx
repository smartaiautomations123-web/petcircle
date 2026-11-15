import { DMSerifText_400Regular } from '@expo-google-fonts/dm-serif-text';
import { Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import * as Crypto from 'expo-crypto';
import { Bell, Check, ChevronDown, ChevronRight, CircleAlert, ClipboardList, HeartPulse, Home, PawPrint, Settings2, ShieldPlus, UsersRound, X } from './src/icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { enableNotifications, syncAlerts } from './src/alerts';
import { createCircle, joinCircle, supabase } from './src/cloud';
import { Button, Form, Sheet, type FormSpec } from './src/Forms';
import { type Action, type CareKind, type Routine, type CircleState, localDate, routineStatus } from './src/model';
import { healthForm, inviteForm, logForm, petForm, reminderForm, routineForm } from './src/petForms';
import { Care } from './src/screens/Care';
import { Circle } from './src/screens/Circle';
import { Health } from './src/screens/Health';
import { Kit } from './src/screens/Kit';
import { PetPhoto, Today } from './src/screens/Today';
import { colors, fonts } from './src/theme';
import { useCircles } from './src/useCircles';

const tabs = [
  { id: 'today', label: 'Today', icon: Home },
  { id: 'care', label: 'Care log', icon: ClipboardList },
  { id: 'health', label: 'Health', icon: HeartPulse },
  { id: 'circle', label: 'Circle', icon: UsersRound },
  { id: 'kit', label: 'Kit', icon: ShieldPlus },
] as const;
type Tab = typeof tabs[number]['id'];
type Panel = 'pets' | 'settings' | 'alerts';

export default function App() {
  const [loaded, fontError] = useFonts({ DMSerifText_400Regular, Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold });
  return <SafeAreaProvider>
    <StatusBar style="dark" />
    {loaded || fontError ? <PetCircle /> : <View style={styles.loading}><ActivityIndicator color={colors.green} /></View>}
  </SafeAreaProvider>;
}

function PetCircle() {
  const store = useCircles();
  const { ready, disk, shared, session, cloudReady, cloudError } = store;
  const [tab, setTab] = useState<Tab>('today');
  const [petId, setPetId] = useState('');
  const [panel, setPanel] = useState<Panel>();
  const [form, setForm] = useState<FormSpec>();
  const [toast, setToast] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [alertBusy, setAlertBusy] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const notice = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const writes = useRef(false);
  const scroll = useRef<ScrollView>(null);
  const { width } = useWindowDimensions();
  const desktop = width >= 960;
  const activeShared = shared.filter(item => item.role !== 'sitter' || item.members.some(member => member.role === 'sitter' && member.expiresAt && Date.parse(member.expiresAt) > now.getTime()));
  const circles = [disk.demo, disk.local, ...activeShared];
  const selected = circles.find(item => item.id === disk.selectedId);
  const loading = !ready || (!selected && !!session && !cloudReady);
  const circle = selected ?? disk.local;
  const pet = circle.pets.find(item => item.id === petId) ?? circle.pets[0];
  const canEdit = circle.role !== 'sitter';
  const forPet = <T extends { petId: string },>(list: T[]) => list.filter(item => item.petId === pet?.id);
  const routines = forPet(circle.routines);
  const entries = forPet(circle.entries);
  const overdue = routines.filter(item => routineStatus(item, entries, now).escalated);
  const circleLost = !loading && !selected && disk.selectedId !== 'demo' && disk.selectedId !== 'local';

  useEffect(() => {
    if (circleLost) { setPanel(undefined); setForm(undefined); }
  }, [circleLost]);

  useEffect(() => {
    const update = () => setNow(new Date());
    const timer = setInterval(update, 15_000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') update(); });
    return () => { clearInterval(timer); listener.remove(); clearTimeout(notice.current); };
  }, []);

  useEffect(() => {
    if (!ready) return;
    void syncAlerts([disk.local, ...shared], disk.alerts).catch(() => {});
  }, [ready, disk.local, shared, disk.alerts, localDate(now)]);

  function show(message: string) {
    clearTimeout(notice.current);
    setToast(message);
    notice.current = setTimeout(() => setToast(''), 4500);
  }

  function go(next: Tab) {
    setTab(next);
    scroll.current?.scrollTo({ y: 0, animated: false });
  }

  async function save(action: Action, feedback: string) {
    await store.change(circle.id, action);
    setNow(new Date());
    show(feedback);
  }

  function open(spec: FormSpec) {
    setPanel(undefined);
    setForm(spec);
  }

  function openPanel(next: Panel) {
    setSettingsError('');
    setPanel(next);
  }

  function selectCircle(item: CircleState) {
    void store.select(item.id).catch(() => show('Could not save your selection.'));
    setPetId(item.pets[0]?.id ?? '');
    go('today');
    setPanel(undefined);
  }

  function openPet(edit = false) {
    open(petForm(edit ? pet : undefined, save, setPetId));
  }

  function openLog(kind?: CareKind) {
    if (pet) open(logForm(pet, circle, kind, save));
  }

  async function complete(routine: Routine) {
    if (writes.current) return;
    writes.current = true;
    try {
      const at = new Date();
      await save({ type: 'log', entry: {
        id: Crypto.randomUUID(), petId: routine.petId, kind: routine.kind, title: routine.title, note: '',
        at: at.toISOString(), by: circle.person, routineId: routine.id, scheduledDate: localDate(at),
      } }, routine.title + ' logged.');
    } catch (error) {
      show(error instanceof Error ? error.message : 'Could not log this task.');
    } finally {
      writes.current = false;
    }
  }

  function confirmRemoval(title: string, description: string, action: Action) {
    open({ title, description, label: 'Remove access', fields: [], submit: () => save(action, 'Access removed.') });
  }

  function authForm(register: boolean) {
    open({
      title: register ? 'Create an account' : 'Sign in',
      description: 'Use your account to share care across devices.',
      label: register ? 'Create account' : 'Sign in',
      fields: [
        { key: 'email', label: 'Email address', type: 'email', max: 254 },
        { key: 'password', label: 'Password', type: 'password', max: 128, placeholder: register ? 'At least 8 characters' : undefined },
      ],
      submit: async ({ email, password }) => {
        if (!supabase) throw new Error('Shared care requires a connected Supabase project.');
        if (!/^\S+@\S+\.\S+$/.test(email.trim()) || !password) throw new Error('Enter your email address and password.');
        if (register && password.length < 8) throw new Error('Choose a password with at least 8 characters.');
        const credentials = { email: email.trim(), password };
        const result = register ? await supabase.auth.signUp(credentials) : await supabase.auth.signInWithPassword(credentials);
        if (result.error) throw new Error(result.error.message);
        show(result.data.session ? 'Signed in. Open settings to create or join a circle.' : 'Check your email to confirm your account, then sign in.');
      },
    });
  }

  function circleForm(join: boolean) {
    if (!supabase || !session) {
      openPanel('settings');
      setSettingsError(supabase ? 'Sign in first to join or create a shared circle.' : 'Connect a Supabase project to use shared circles.');
      return;
    }
    open({
      title: join ? 'Join a circle' : 'Create a shared circle',
      description: join ? 'Ask the circle owner for your invite code.' : 'Invite family and sitters once you’ve added a pet.',
      label: join ? 'Join circle' : 'Create circle',
      fields: [
        { key: 'person', label: 'Your name', max: 80 },
        join ? { key: 'code', label: 'Invite code', max: 64 } : { key: 'name', label: 'Circle name', max: 80, placeholder: 'e.g. The Parker family' },
      ],
      submit: async values => {
        const person = values.person.trim();
        if (!person || !(join ? values.code.trim() : values.name.trim())) throw new Error('Fill in both fields.');
        const id = join ? await joinCircle(values.code.trim().toUpperCase(), person) : await createCircle(values.name.trim(), person);
        await store.refresh();
        await store.select(id);
        setPetId('');
        go('today');
        show(join ? 'You’ve joined the circle.' : 'Shared circle created.');
      },
    });
  }

  async function toggleAlerts() {
    setAlertBusy(true);
    setSettingsError('');
    try {
      const enabled = !disk.alerts;
      if (enabled) await enableNotifications();
      await syncAlerts([disk.local, ...shared], enabled);
      await store.setAlerts(enabled);
      show(enabled ? 'Device alerts enabled.' : 'Device alerts disabled.');
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : 'Could not update alerts.');
    } finally {
      setAlertBusy(false);
    }
  }

  function navigation() {
    return <View accessibilityRole="tablist" style={[styles.nav, desktop && styles.navDesktop]}>
      {tabs.map(item => {
        const Icon = item.icon;
        const active = tab === item.id;
        return <Pressable accessibilityRole="tab" aria-selected={active} key={item.id} onPress={() => go(item.id)} style={({ pressed }) => [styles.navItem, desktop && styles.navItemDesktop, active && styles.navActive, pressed && styles.pressed]}>
          <Icon size={desktop ? 17 : 20} strokeWidth={active ? 2.2 : 1.8} color={active ? colors.greenDark : colors.muted} />
          <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
        </Pressable>;
      })}
    </View>;
  }

  return <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
    <View style={styles.header}>
      <View style={styles.headerInner}>
        <Pressable accessibilityRole="button" accessibilityLabel="PetCircle home" onPress={() => go('today')} style={styles.brand}>
          <View style={styles.brandIcon}><PawPrint size={21} color="#EEF5E7" strokeWidth={2} /></View>
          <Text style={styles.brandText}>PetCircle</Text>
        </Pressable>
        {desktop && navigation()}
        <View style={styles.headerActions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Choose pet or circle" onPress={() => openPanel('pets')} style={styles.petPicker}>
            {pet ? <PetPhoto pet={pet} size={27} /> : <PawPrint size={17} color={colors.green} />}
            <Text numberOfLines={1} style={styles.petPickerLabel}>{pet?.name ?? 'Pets'}</Text>
            <ChevronDown size={14} color={colors.green} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Care alerts" onPress={() => openPanel('alerts')} style={styles.headerButton}>
            <Bell size={18} color={colors.greenDark} />{overdue.length > 0 && <View style={styles.alertDot} />}
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => openPanel('settings')} style={styles.headerButton}><Settings2 size={18} color={colors.greenDark} /></Pressable>
        </View>
      </View>
    </View>

    <ScrollView ref={scroll} style={styles.scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollInner}>
      <View style={[styles.main, !desktop && styles.mainMobile]}>
        {loading ? <ActivityIndicator color={colors.green} style={{ marginTop: 48 }} /> : <>
          {!!cloudError && session && <View style={styles.syncError}><CircleAlert size={18} color={colors.red} /><Text style={styles.syncErrorText}>Shared circles could not refresh.</Text><Pressable accessibilityRole="button" onPress={() => void store.refresh()} style={styles.link}><Text style={styles.linkText}>Retry</Text></Pressable></View>}
          {circleLost ? <View style={styles.empty}><View style={styles.emptyIcon}><UsersRound size={31} color={colors.greenDark} /></View><Text style={styles.emptyTitle}>Circle unavailable</Text><Text style={styles.emptyBody}>Sign in to the right account, or choose another circle.</Text><Button label="Choose a circle" onPress={() => openPanel('pets')} /><Button secondary label="Settings" onPress={() => openPanel('settings')} /></View> :
            !pet ? <View style={styles.empty}>
              <View style={styles.emptyIcon}><PawPrint size={31} color={colors.greenDark} /></View>
              <Text accessibilityRole="header" style={styles.emptyTitle}>{circle.name}</Text>
              <Text style={styles.emptyBody}>Add your first pet to start tracking meals, walks and appointments.</Text>
              {canEdit && <Button label="Add a pet" onPress={() => openPet()} />}
              <Button label="Explore the demo" onPress={() => selectCircle(disk.demo)} secondary />
            </View> : <>
              {tab === 'today' && <Today pet={pet} person={circle.person} routines={routines} entries={entries} now={now} canEdit={canEdit} onLog={openLog} onComplete={routine => void complete(routine)} onEditRoutine={routine => open(routineForm(pet, routine, save))} onCircle={() => go('circle')} onKit={() => go('kit')} />}
              {tab === 'care' && <Care key={pet.id} pet={pet} entries={entries} onLog={openLog} />}
              {tab === 'health' && <Health key={pet.id} pet={pet} health={forPet(circle.health)} reminders={forPet(circle.reminders)} canEdit={canEdit} onHealth={kind => open(healthForm(pet, kind, save))} onReminder={() => open(reminderForm(pet, save))} onRemoveReminder={id => void save({ type: 'removeReminder', id }, 'Reminder removed.').catch(error => show(error instanceof Error ? error.message : 'Could not remove this reminder.'))} />}
              {tab === 'circle' && <Circle key={circle.id + '/' + pet.id} pet={pet} routines={routines} entries={entries} members={circle.members} invites={circle.invites} role={circle.role} demo={circle.id === 'demo'} onInvite={() => {
                if (circle.id === 'local') { circleForm(false); return; }
                open(inviteForm(pet, save, circle.id === 'demo'));
              }} onJoin={() => circleForm(true)} onRevokeInvite={id => confirmRemoval('Revoke invite?', 'The recipient will be unable to redeem this code.', { type: 'revokeInvite', id })} onRevokeMember={id => confirmRemoval('Remove this carer?', 'This carer will lose access to the circle.', { type: 'revokeMember', id })} />}
              {tab === 'kit' && <Kit key={circle.id + '/' + pet.id} pet={pet} canEdit={canEdit} onEdit={() => openPet(true)} draftScope={(session?.user.id ?? 'device') + '/' + circle.id} />}
            </>}
          {circle.id === 'demo' && !circleLost && <View style={styles.demoFooter}>
            <View style={styles.demoText}><Text style={styles.demoLabel}>DEMO CIRCLE</Text><Text style={styles.demoHint}>Explore with Milo, or start your own care circle.</Text></View>
            <Pressable accessibilityRole="button" onPress={() => selectCircle(disk.local)} style={styles.link}><Text style={styles.linkText}>Start my circle</Text><ChevronRight size={15} color={colors.green} /></Pressable>
          </View>}
        </>}
      </View>
    </ScrollView>

    {!desktop && navigation()}
    {!!toast && <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.toast, { bottom: desktop ? 22 : 74 }]}>
      <Text style={styles.toastText}>{toast}</Text><Pressable accessibilityRole="button" accessibilityLabel="Dismiss message" onPress={() => setToast('')} style={styles.toastClose}><X size={16} color={colors.white} /></Pressable>
    </View>}

    {form && <Form spec={form} onClose={() => setForm(undefined)} />}
    {!form && panel === 'pets' && <Sheet title="Pets and circles" onClose={() => setPanel(undefined)}>
      <ScrollView contentContainerStyle={styles.panelContent}>
        {!circleLost && circle.pets.map(item => <Pressable accessibilityRole="button" key={item.id} onPress={() => { setPetId(item.id); setPanel(undefined); go('today'); }} style={styles.panelRow}>
          <PetPhoto pet={item} size={38} /><View style={styles.panelInfo}><Text style={styles.panelTitle}>{item.name}</Text><Text style={styles.panelHint}>{[item.breed || item.species, item.age].filter(Boolean).join(' · ')}</Text></View>
          {item.id === pet?.id && <Check size={20} color={colors.green} />}
        </Pressable>)}
        {canEdit && !circleLost && <Button label="Add a pet" onPress={() => openPet()} secondary />}
        <Text style={styles.panelSection}>Switch circle</Text>
        {circles.map(item => <Pressable accessibilityRole="button" key={item.id} onPress={() => selectCircle(item)} style={styles.panelRow}>
          <UsersRound color={colors.green} size={20} /><View style={styles.panelInfo}><Text style={styles.panelTitle}>{item.name}</Text><Text style={styles.panelHint}>{item.id === 'demo' ? 'Demo' : item.id === 'local' ? 'On this device' : item.role}</Text></View>
          {item.id === selected?.id && <Check size={19} color={colors.green} />}
        </Pressable>)}
      </ScrollView>
    </Sheet>}
    {!form && panel === 'alerts' && <Sheet title="Care alerts" onClose={() => setPanel(undefined)}>
      <ScrollView contentContainerStyle={styles.panelContent}>
        {overdue.length ? overdue.map(item => <View key={item.id} style={styles.panelRow}><CircleAlert size={19} color={colors.red} /><View style={styles.panelInfo}><Text style={styles.panelTitle}>{item.title}</Text><Text style={styles.panelHint}>{pet?.name} · Needs attention</Text></View></View>) :
          <Text style={styles.panelHint}>No daily routines need attention for {pet?.name ?? 'this circle'}.</Text>}
        {Platform.OS !== 'web' && <Button secondary label="Notification settings" onPress={() => openPanel('settings')} />}
      </ScrollView>
    </Sheet>}
    {!form && panel === 'settings' && <Sheet title="Settings" onClose={() => setPanel(undefined)}>
      <ScrollView contentContainerStyle={styles.panelContent}>
        <Text style={styles.panelSection}>Shared care</Text>
        {session ? <>
          <Text style={styles.panelHint}>{session.user.email}</Text>
          <Button label="Create a shared circle" onPress={() => circleForm(false)} />
          <Button label="Join with an invite code" onPress={() => circleForm(true)} secondary />
          <Button label="Sign out" secondary onPress={() => void supabase?.auth.signOut().then(({ error }) => {
            if (error) setSettingsError(error.message);
            else { selectCircle(disk.local); show('Signed out.'); }
          })} />
        </> : supabase ? <>
          <Button label="Sign in" onPress={() => authForm(false)} />
          <Button label="Create an account" onPress={() => authForm(true)} secondary />
        </> : <Text style={styles.panelHint}>Connect a Supabase project to sync with family and sitters. You can keep a care circle on this device in the meantime.</Text>}
        {Platform.OS !== 'web' && <>
          <Text style={styles.panelSection}>Device notifications</Text>
          <Text style={styles.panelHint}>Get vet reminders and overdue alerts for routines stored on this device. Shared routines flag overdue care inside PetCircle.</Text>
          <Button label={disk.alerts ? 'Turn off device alerts' : 'Enable device alerts'} onPress={() => void toggleAlerts()} secondary busy={alertBusy} />
        </>}
        {!!settingsError && <Text accessibilityRole="alert" style={styles.error}>{settingsError}</Text>}
      </ScrollView>
    </Sheet>}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.paper },
  header: { borderBottomWidth: 1, borderColor: colors.line, backgroundColor: '#FCFCF8' },
  headerInner: { minHeight: 67, width: '100%', maxWidth: 1216, alignSelf: 'center', paddingHorizontal: 19, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 7 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  brandIcon: { width: 35, height: 35, borderRadius: 11, backgroundColor: colors.greenDark, alignItems: 'center', justifyContent: 'center' },
  brandText: { color: colors.greenDark, fontFamily: fonts.heading, fontSize: 26, letterSpacing: -0.65 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  petPicker: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 44, paddingHorizontal: 5 },
  petPickerLabel: { maxWidth: 76, color: colors.greenDark, fontFamily: fonts.bold, fontSize: 12 },
  headerButton: { minWidth: 36, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  alertDot: { backgroundColor: colors.red, width: 7, height: 7, borderRadius: 5, position: 'absolute', top: 10, right: 8 },
  nav: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 7, gap: 3, justifyContent: 'space-around', backgroundColor: '#FCFCF8', borderTopWidth: 1, borderColor: colors.line },
  navDesktop: { borderTopWidth: 0, justifyContent: 'center', padding: 0, gap: 3, backgroundColor: 'transparent' },
  navItem: { flex: 1, flexBasis: 0, minHeight: 49, alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 10 },
  navItemDesktop: { flex: 0, flexBasis: 'auto', flexDirection: 'row', paddingHorizontal: 11, minHeight: 38, gap: 6 },
  navActive: { backgroundColor: colors.mint },
  navLabel: { fontSize: 10, color: colors.muted, fontFamily: fonts.bold },
  navLabelActive: { color: colors.greenDark },
  scroll: { flex: 1 },
  scrollInner: { flexGrow: 1, alignItems: 'center' },
  main: { width: '100%', maxWidth: 1136, paddingHorizontal: 24, paddingTop: 34, paddingBottom: 27 },
  mainMobile: { maxWidth: 680, paddingTop: 22 },
  demoFooter: { borderTopWidth: 1, borderColor: colors.line, marginTop: 23, paddingTop: 13, flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'space-between' },
  demoText: { flex: 1, gap: 4 },
  demoLabel: { fontSize: 9, letterSpacing: 1.2, color: colors.green, fontFamily: fonts.bold },
  demoHint: { fontSize: 11, color: colors.muted, fontFamily: fonts.body },
  link: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 3 },
  linkText: { fontSize: 12, color: colors.greenDark, fontFamily: fonts.bold },
  toast: { position: 'absolute', left: 16, right: 16, maxWidth: 480, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, backgroundColor: colors.greenDark, paddingLeft: 12, borderRadius: 12, elevation: 6 },
  toastText: { flex: 1, color: colors.white, fontFamily: fonts.medium, fontSize: 13 },
  toastClose: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  empty: { maxWidth: 440, width: '100%', alignSelf: 'center', gap: 12, marginTop: 37, padding: 22, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 22 },
  emptyIcon: { width: 59, height: 59, backgroundColor: colors.mint, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontFamily: fonts.heading, color: colors.ink, fontSize: 34 },
  emptyBody: { fontFamily: fonts.body, color: colors.muted, fontSize: 14, lineHeight: 21, marginBottom: 4 },
  panelContent: { paddingTop: 13, gap: 10 },
  panelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, padding: 10, borderRadius: 13, minHeight: 54 },
  panelInfo: { flex: 1, gap: 3 },
  panelTitle: { color: colors.ink, fontFamily: fonts.bold, fontSize: 14 },
  panelHint: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  panelSection: { fontFamily: fonts.heading, color: colors.ink, fontSize: 21, marginTop: 3 },
  syncError: { flexDirection: 'row', gap: 7, alignItems: 'center', backgroundColor: colors.peach, paddingHorizontal: 10, borderRadius: 11, marginBottom: 13 },
  syncErrorText: { flex: 1, color: colors.red, fontFamily: fonts.bold, fontSize: 12 },
  error: { color: colors.red, fontFamily: fonts.bold, fontSize: 13 },
  pressed: { opacity: 0.68 },
});
