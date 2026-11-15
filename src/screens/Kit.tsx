import { useEffect, useState } from 'react';
import {
  Check, ChevronDown, CircleHelp, ClipboardList, FileText, HeartPulse, MapPin, PawPrint, Pencil, Phone,
  Printer, Radio, Share2, ShieldCheck,
} from '../icons';
import { Image, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { printablePhoto, printDocument, shareDocument, sharePdf, telephoneUri, type ExportDocument } from '../exports';
import type { Pet } from '../model';
import { colors, fonts } from '../theme';

type Props = { pet: Pet; canEdit: boolean; onEdit: () => void; draftScope?: string };
type IncidentDraft = { lastSeen: string; sightingNotes: string; checkedSteps: string[] };
type Feedback = { area: 'contacts' | 'poster' | 'instructions'; text: string; error?: boolean };

const incidentDrafts = new Map<string, IncidentDraft>();
const blankDraft: IncidentDraft = { lastSeen: '', sightingNotes: '', checkedSteps: [] };

export function Kit(props: Props) {
  const draftKey = JSON.stringify([props.draftScope, props.pet.id]);
  return <PetKit key={draftKey} draftKey={draftKey} {...props} />;
}

function PetKit({ pet, canEdit, onEdit, draftKey }: Props & { draftKey: string }) {
  const [posterOpen, setPosterOpen] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [draft, setDraft] = useState(() => incidentDrafts.get(draftKey) ?? blankDraft);
  const [publicPhone, setPublicPhone] = useState('');
  const [feedback, setFeedback] = useState<Feedback>();
  const { lastSeen, sightingNotes, checkedSteps } = draft;
  const hasDraft = Boolean(lastSeen || sightingNotes || checkedSteps.length);
  useEffect(() => {
    if (hasDraft) incidentDrafts.set(draftKey, draft);
    else incidentDrafts.delete(draftKey);
  }, [draft, hasDraft, draftKey]);
  const photo = printablePhoto(pet.photoUrl);
  const petSummary = [pet.breed || pet.species, pet.age].filter(Boolean).join(' · ');
  const careContact = pet.contactName.trim() || 'Care contact';
  const contacts = [
    { label: pet.vetName.trim() || 'Regular vet', phone: pet.vetPhone },
    { label: 'Out-of-hours vet', phone: pet.emergencyPhone },
    { label: careContact, phone: pet.contactPhone },
  ];
  const steps = [
    { id: 'last-seen', label: 'Write down where and when your pet was last seen.' },
    { id: 'chip', label: 'Tell your microchip database that your pet is missing.' },
    { id: 'vet', label: 'Contact nearby vets and animal rescue centres.' },
    ...(pet.species.toLowerCase() === 'dog'
      ? [{ id: 'council', label: 'Contact the local council’s dog warden.' }]
      : [{ id: 'neighbours', label: 'Ask neighbours to check garages and sheds.' }]),
    { id: 'poster', label: 'Share the poster with neighbours and local lost-pet groups.' },
  ];
  const poster: ExportDocument = {
    title: `Missing pet · ${pet.name}`,
    subtitle: petSummary || undefined,
    photo: photo ? { uri: photo, alt: `Photo of ${pet.name}` } : undefined,
    sections: [
      ...(pet.description.trim() ? [{ heading: 'How to recognise them', lines: [pet.description.trim()] }] : []),
      ...(lastSeen.trim() ? [{ heading: 'Last seen', lines: [lastSeen.trim()] }] : []),
      ...(sightingNotes.trim() ? [{ heading: 'What to know', lines: [sightingNotes.trim()] }] : []),
      ...(publicPhone.trim() ? [{ heading: 'Report a sighting', lines: [`Call ${publicPhone.trim()}`] }] : []),
    ],
  };
  const instructions: ExportDocument = {
    title: `${pet.name}’s care instructions`,
    subtitle: petSummary || undefined,
    sections: [
      { heading: 'Instructions', lines: [pet.instructions.trim() || 'No care instructions have been added.'] },
      ...(contacts.some((contact) => contact.phone.trim()) ? [{
        heading: 'Care contacts',
        lines: contacts.filter((contact) => contact.phone.trim()).map((contact) => `${contact.label} · ${contact.phone.trim()}`),
      }] : []),
    ],
  };

  async function doExport(document: ExportDocument, mode: 'share' | 'print' | 'pdf') {
    const area = document === poster ? 'poster' : 'instructions';
    setFeedback(undefined);
    if (document === poster && publicPhone.trim() && !telephoneUri(publicPhone)) {
      setFeedback({ area, text: 'Enter a valid public phone number or clear the field.', error: true });
      return;
    }
    try {
      if (mode === 'share') {
        if (await shareDocument(document) === 'copied') setFeedback({ area, text: 'Copied to your clipboard.' });
      } else if (mode === 'print') {
        await printDocument(document);
      } else {
        await sharePdf(document);
      }
    } catch (error) {
      setFeedback({ area, text: error instanceof Error ? error.message : 'Could not open the document. Try again.', error: true });
    }
  }

  async function callPhone(phone: string) {
    const target = telephoneUri(phone);
    if (!target) return;
    setFeedback(undefined);
    try {
      await Linking.openURL(target);
    } catch {
      setFeedback({ area: 'contacts', text: 'Your device could not start the call. Dial the displayed number.', error: true });
    }
  }

  function toggleStep(id: string) {
    setDraft((current) => ({
      ...current,
      checkedSteps: current.checkedSteps.includes(id)
        ? current.checkedSteps.filter((step) => step !== id)
        : [...current.checkedSteps, id],
    }));
  }

  function showFeedback(area: Feedback['area']) {
    return feedback?.area === area ? (
      <Text accessibilityLiveRegion="polite" style={[styles.feedback, feedback.error && styles.error]}>{feedback.text}</Text>
    ) : null;
  }

  return (
    <View style={styles.screen}>
      <View>
        <Text accessibilityRole="header" style={styles.title}>Pet kit</Text>
        <Text style={styles.intro}>Emergency contacts, important records and care instructions for {pet.name}.</Text>
      </View>

      <View style={styles.emergency}>
        <View style={styles.heroHeading}>
          <View style={styles.heroIcon}><HeartPulse size={22} strokeWidth={1.9} color={colors.red} /></View>
          <View style={styles.flex}>
            <Text accessibilityRole="header" style={styles.cardTitle}>Emergency contacts</Text>
            <Text style={styles.detail}>Call the vet or reach a care contact.</Text>
          </View>
        </View>
        <View style={styles.contacts}>
          {contacts.map((contact, index) => {
            const canCall = Boolean(telephoneUri(contact.phone));
            return <View key={index} style={[styles.contact, index > 0 && styles.contactDivider]}>
              <View style={styles.flex}>
                <Text style={styles.itemTitle}>{contact.label}</Text>
                <Text selectable={Boolean(contact.phone.trim())} style={styles.detail}>
                  {contact.phone.trim() || 'No number saved'}
                </Text>
              </View>
              {canCall && <Pressable accessibilityRole="button" accessibilityLabel={`Call ${contact.label}`}
                onPress={() => void callPhone(contact.phone)} style={styles.call}>
                <Phone size={17} color={colors.red} strokeWidth={2} />
              </Pressable>}
            </View>;
          })}
        </View>
        {showFeedback('contacts')}
      </View>

      <View style={styles.lostCard}>
        <View style={styles.heroHeading}>
          <View style={styles.lostIcon}><MapPin size={22} color={colors.greenDark} strokeWidth={1.9} /></View>
          <View style={styles.flex}>
            <Text accessibilityRole="header" style={styles.cardTitle}>Lost-pet pack</Text>
            <Text style={styles.detail}>Prepare a poster and track who you’ve contacted.</Text>
          </View>
        </View>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: checklistOpen }} aria-expanded={checklistOpen}
          style={styles.disclosure} onPress={() => setChecklistOpen(!checklistOpen)}>
          <ClipboardList size={17} color={colors.green} />
          <Text style={styles.disclosureText}>Missing pet checklist</Text>
          <ChevronDown size={17} color={colors.green} style={checklistOpen ? styles.flipped : undefined} />
        </Pressable>
        {checklistOpen && <View style={styles.checklist}>
          {steps.map((step) => {
            const checked = checkedSteps.includes(step.id);
            return <Pressable key={step.id} accessibilityRole="checkbox" accessibilityState={{ checked }} aria-checked={checked}
              onPress={() => toggleStep(step.id)} style={styles.step}>
              <View style={[styles.box, checked && styles.boxChecked]}>{checked && <Check size={14} color={colors.white} />}</View>
              <Text style={[styles.stepLabel, checked && styles.stepLabelChecked]}>{step.label}</Text>
            </Pressable>;
          })}
        </View>}

        <Pressable accessibilityRole="button" accessibilityState={{ expanded: posterOpen }} aria-expanded={posterOpen}
          style={styles.disclosure} onPress={() => setPosterOpen(!posterOpen)}>
          <Radio size={17} color={colors.green} />
          <Text style={styles.disclosureText}>Prepare missing pet poster</Text>
          <ChevronDown size={17} color={colors.green} style={posterOpen ? styles.flipped : undefined} />
        </Pressable>
        {posterOpen && <View style={styles.poster}>
          <View style={styles.posterPreview}>
            {photo ? <Image accessibilityLabel={`Photo of ${pet.name}`} source={{ uri: photo }} style={styles.posterPhoto} />
              : <View style={styles.posterIcon}><PawPrint size={23} color={colors.green} /></View>}
            <View style={styles.flex}>
              <Text style={styles.itemTitle}>Missing pet · {pet.name}</Text>
              {petSummary ? <Text style={styles.detail}>{petSummary}</Text> : null}
              {pet.description.trim() ? <Text style={styles.detail}>{pet.description.trim()}</Text> : null}
            </View>
          </View>
          <View style={styles.field}>
            <Text style={styles.itemTitle}>Where and when last seen</Text>
            <TextInput accessibilityLabel="Where and when last seen" placeholder="e.g. High Street, Friday around 5 pm"
              placeholderTextColor={colors.muted} maxLength={160} value={lastSeen}
              onChangeText={(value) => setDraft((current) => ({ ...current, lastSeen: value }))} style={styles.input} />
          </View>
          <View style={styles.field}>
            <Text style={styles.itemTitle}>Sighting instructions</Text>
            <TextInput accessibilityLabel="Sighting instructions" placeholder="e.g. Shy around people. Please call if spotted."
              placeholderTextColor={colors.muted} multiline maxLength={320} value={sightingNotes}
              onChangeText={(value) => setDraft((current) => ({ ...current, sightingNotes: value }))} style={[styles.input, styles.multiline]} />
          </View>
          <View style={styles.field}>
            <Text style={styles.itemTitle}>Public contact number</Text>
            <TextInput accessibilityLabel="Public contact number" placeholder="Phone number to include"
              placeholderTextColor={colors.muted} keyboardType="phone-pad" maxLength={35} value={publicPhone} onChangeText={setPublicPhone} style={styles.input} />
            <Text style={styles.detail}>Anyone with the poster can see this number.</Text>
            {telephoneUri(pet.contactPhone) && !publicPhone && <Pressable accessibilityRole="button" style={styles.textButton}
              onPress={() => setPublicPhone(pet.contactPhone.trim())}>
              <Text style={styles.textButtonLabel}>Use saved care contact</Text>
            </Pressable>}
          </View>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={() => void doExport(poster, 'share')}>
              <Share2 size={16} color={colors.white} />
              <Text style={styles.primaryButtonText}>Share text</Text>
            </Pressable>
            <Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={() => void doExport(poster, 'pdf')}>
              <Printer size={17} color={colors.green} />
              <Text style={styles.secondaryButtonText}>Poster PDF</Text>
            </Pressable>
          </View>
          {showFeedback('poster')}
        </View>}
        {(posterOpen || checklistOpen) && (hasDraft || publicPhone) ? <Pressable accessibilityRole="button" style={styles.textButton}
          onPress={() => { setDraft(blankDraft); setPublicPhone(''); setFeedback(undefined); }}>
          <Text style={styles.textButtonLabel}>Clear poster and checklist</Text>
        </Pressable> : null}
      </View>

      {(canEdit || pet.microchip.trim() || pet.insurer.trim() || pet.policyNumber.trim()) ? <View style={styles.section}>
        <View style={styles.sectionTop}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>Important records</Text>
          {canEdit && <Pressable accessibilityRole="button" onPress={onEdit} style={styles.textButton}>
            <Pencil size={15} color={colors.green} />
            <Text style={styles.textButtonLabel}>Edit details</Text>
          </Pressable>}
          {showFeedback('instructions')}
        </View>
        <View style={styles.whiteCard}>
          <View style={styles.record}>
            <View style={[styles.recordIcon, { backgroundColor: colors.lavender }]}><PawPrint size={19} color={colors.ink} /></View>
            <View style={styles.flex}>
              <Text style={styles.itemTitle}>Microchip number</Text>
              <Text selectable={Boolean(pet.microchip.trim())} style={styles.detail}>{pet.microchip.trim() || 'No number saved'}</Text>
            </View>
          </View>
          <View style={[styles.record, styles.recordDivider]}>
            <View style={[styles.recordIcon, { backgroundColor: colors.mint }]}><ShieldCheck size={19} color={colors.ink} /></View>
            <View style={styles.flex}>
              <Text style={styles.itemTitle}>Pet insurance</Text>
              <Text selectable={Boolean(pet.insurer.trim() || pet.policyNumber.trim())} style={styles.detail}>
                {[pet.insurer.trim(), pet.policyNumber.trim()].filter(Boolean).join(' · ') || 'No policy saved'}
              </Text>
            </View>
          </View>
        </View>
      </View> : null}

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>Care instructions</Text>
        <View style={styles.instructionsCard}>
          <View style={styles.heroHeading}>
            <View style={[styles.recordIcon, { backgroundColor: colors.yellow }]}>
              {pet.instructions.trim() ? <FileText size={19} color={colors.ink} /> : <CircleHelp size={19} color={colors.ink} />}
            </View>
            <Text style={[styles.detail, styles.flex]}>{pet.instructions.trim() || 'No care instructions have been added.'}</Text>
          </View>
          {pet.instructions.trim() ? <Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={() => void doExport(instructions, 'print')}>
            <Printer size={16} color={colors.green} />
            <Text style={styles.secondaryButtonText}>Print instructions</Text>
          </Pressable> : canEdit && <Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={onEdit}>
            <Pencil size={16} color={colors.green} />
            <Text style={styles.secondaryButtonText}>Add instructions</Text>
          </Pressable>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 22 },
  flex: { flex: 1, minWidth: 0 },
  title: { fontFamily: fonts.heading, color: colors.ink, fontSize: 39, lineHeight: 43, letterSpacing: -1.1 },
  intro: { fontFamily: fonts.body, color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 6 },
  emergency: { backgroundColor: colors.peach, borderRadius: 24, padding: 16, gap: 12 },
  heroHeading: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  heroIcon: { width: 43, height: 43, borderRadius: 15, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontFamily: fonts.heading, fontSize: 24, lineHeight: 29, color: colors.ink },
  detail: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.muted },
  itemTitle: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 19, color: colors.ink },
  contacts: { backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 16, paddingHorizontal: 12 },
  contact: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 57, paddingVertical: 6 },
  contactDivider: { borderTopWidth: 1, borderColor: 'rgba(161,68,49,0.15)' },
  call: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  lostCard: { borderRadius: 24, backgroundColor: colors.mint, padding: 16, gap: 9 },
  lostIcon: { width: 43, height: 43, borderRadius: 15, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  disclosure: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 44, borderRadius: 12, paddingHorizontal: 11, backgroundColor: 'rgba(255,255,255,0.62)' },
  disclosureText: { flex: 1, fontFamily: fonts.bold, fontSize: 13, lineHeight: 18, color: colors.greenDark },
  flipped: { transform: [{ rotate: '180deg' }] },
  checklist: { paddingHorizontal: 1 },
  step: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: 8 },
  box: { width: 21, height: 21, borderRadius: 6, backgroundColor: colors.white, borderColor: colors.green, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  boxChecked: { backgroundColor: colors.green },
  stepLabel: { flex: 1, fontFamily: fonts.medium, fontSize: 13, lineHeight: 19, color: colors.ink },
  stepLabelChecked: { color: colors.muted, textDecorationLine: 'line-through' },
  poster: { gap: 12, paddingTop: 3 },
  posterPreview: { backgroundColor: colors.white, borderRadius: 14, padding: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  posterIcon: { width: 48, height: 48, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.mint },
  posterPhoto: { width: 52, height: 52, borderRadius: 12 },
  field: { gap: 5 },
  input: { minHeight: 45, borderRadius: 11, paddingHorizontal: 10, paddingVertical: 9, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, fontFamily: fonts.body, fontSize: 14, color: colors.ink },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  primaryButton: { minHeight: 44, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 11, gap: 7, borderRadius: 12, backgroundColor: colors.green },
  primaryButtonText: { fontFamily: fonts.bold, color: colors.white, fontSize: 13 },
  secondaryButton: { minHeight: 44, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 11, gap: 7, borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  secondaryButtonText: { fontFamily: fonts.bold, color: colors.green, fontSize: 13 },
  feedback: { fontFamily: fonts.medium, color: colors.greenDark, fontSize: 13, lineHeight: 19 },
  error: { color: colors.red },
  section: { gap: 8 },
  sectionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sectionTitle: { fontFamily: fonts.heading, fontSize: 26, lineHeight: 31, color: colors.ink },
  textButton: { minHeight: 44, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6 },
  textButtonLabel: { fontFamily: fonts.bold, fontSize: 13, color: colors.green },
  whiteCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 13, borderRadius: 19 },
  record: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  recordDivider: { borderTopWidth: 1, borderColor: colors.line },
  recordIcon: { width: 39, height: 39, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  instructionsCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, padding: 13, borderRadius: 19, gap: 10 },
});
