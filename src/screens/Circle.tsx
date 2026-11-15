import { useState } from 'react';
import { Check, ChevronDown, Clock3, FileText, KeyRound, Link2, Plus, Share2, ShieldCheck, Users } from '../icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { printDocument, shareDocument, shareText, type ExportDocument } from '../exports';
import { routineStatus, ukZone, type CareEntry, type Invite, type Member, type Pet, type Role, type Routine } from '../model';
import { colors, fonts } from '../theme';

type Props = {
  pet: Pet;
  routines: Routine[];
  entries: CareEntry[];
  members: Member[];
  invites: Invite[];
  role: Role;
  demo?: boolean;
  onInvite: () => void;
  onJoin: () => void;
  onRevokeInvite: (id: string) => void;
  onRevokeMember: (id: string) => void;
};

const roles: Record<Role, string> = { owner: 'Owner', family: 'Family', sitter: 'Sitter' };
const dateTime = new Intl.DateTimeFormat('en-GB', { timeZone: ukZone, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const time = new Intl.DateTimeFormat('en-GB', { timeZone: ukZone, hour: 'numeric', minute: '2-digit' });

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?';
}

function active(expiresAt?: string) {
  return !expiresAt || new Date(expiresAt).getTime() > Date.now();
}

export function Circle(props: Props) {
  return <PetCircle key={props.pet.id} {...props} />;
}

function PetCircle({ pet, routines, entries, members, invites, role, demo, onInvite, onJoin, onRevokeInvite, onRevokeMember }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState('');
  const canInvite = role === 'owner';
  const now = new Date();
  const roster = members.filter((member) => !member.petId || member.petId === pet.id);
  const openInvites = invites.filter((invite) => !invite.claimed && active(invite.expiresAt) && (!invite.petId || invite.petId === pet.id));
  const recent = [...entries].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 3);
  const schedule = [...routines].sort((a, b) => a.time.localeCompare(b.time));
  const outstanding = schedule.map((routine) => ({ routine, ...routineStatus(routine, entries, now) }))
    .filter((task) => task.state !== 'done');
  const next = outstanding[0];
  const careDocument: ExportDocument = {
    title: `${pet.name}’s care handover`,
    subtitle: `Prepared ${dateTime.format(now)} (UK time). Check PetCircle for changes after this snapshot.`,
    sections: [
      ...(outstanding.length ? [{
        heading: 'Still due today',
        lines: outstanding.map(({ routine, due, state }) => `${time.format(due)} · ${routine.title}${state === 'late' ? ' (overdue)' : ''}${routine.details ? ` — ${routine.details}` : ''}`),
      }] : []),
      { heading: 'Daily routine', lines: schedule.length
        ? schedule.map((routine) => `${routine.time} · ${routine.title}${routine.details ? ` — ${routine.details}` : ''}`)
        : ['No daily routines are set.'] },
      ...(recent.length ? [{
        heading: 'Recently logged',
        lines: recent.map((entry) => `${dateTime.format(new Date(entry.at))} · ${entry.title} · ${entry.by}${entry.note ? ` — ${entry.note}` : ''}`),
      }] : []),
      ...(pet.instructions.trim() ? [{ heading: 'Care instructions', lines: [pet.instructions] }] : []),
      ...((pet.vetPhone || pet.emergencyPhone || pet.contactPhone) ? [{
        heading: 'Contacts',
        lines: [
          ...(pet.vetPhone ? [`${pet.vetName || 'Vet'} · ${pet.vetPhone}`] : []),
          ...(pet.emergencyPhone ? [`Out-of-hours vet · ${pet.emergencyPhone}`] : []),
          ...(pet.contactPhone ? [`${pet.contactName || 'Care contact'} · ${pet.contactPhone}`] : []),
        ],
      }] : []),
    ],
  };

  async function handleShare(message: () => ReturnType<typeof shareText>) {
    setFeedback('');
    try {
      if (await message() === 'copied') setFeedback('Copied to your clipboard.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Could not share. Try again.');
    }
  }

  async function handlePrint() {
    setFeedback('');
    try {
      await printDocument(careDocument);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Could not open the printable handover.');
    }
  }

  function shareInvite(invite: Invite) {
    const scope = invite.role === 'family' ? 'family' : 'temporary sitter';
    const petLabel = invite.petId === pet.id ? ` for ${pet.name}` : '';
    void handleShare(() => shareText('PetCircle invite',
      `Join my PetCircle as ${scope}${petLabel}. In PetCircle, sign in and choose “Join with a code” on the Circle tab.\n\nCode: ${invite.code}\nExpires ${dateTime.format(new Date(invite.expiresAt))} (UK time).`));
  }

  return (
    <View style={styles.screen}>
      <View>
        <Text accessibilityRole="header" style={styles.title}>Care circle</Text>
        <Text style={styles.intro}>Manage who helps care for {pet.name} and share the next shift.</Text>
      </View>

      <View style={styles.handover}>
        <View style={styles.handoverHeading}>
          <View style={styles.handoverIcon}><FileText size={22} color={colors.white} strokeWidth={1.8} /></View>
          <View style={styles.flex}>
            <Text accessibilityRole="header" style={styles.handoverTitle}>Sitter handover</Text>
            <Text style={styles.handoverCopy}>Routines, recent care and important contacts.</Text>
          </View>
        </View>
        <View style={styles.handoverTask}>
          {next ? <Clock3 size={17} color={colors.mint} /> : <Check size={17} color={colors.mint} />}
          <Text style={styles.handoverTaskText}>
            {next ? `${next.state === 'late' ? 'Overdue' : 'Next up'} · ${next.routine.title} at ${time.format(next.due)}`
              : schedule.length ? 'Today’s routines are complete' : 'No routines set yet'}
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded }} aria-expanded={expanded} style={styles.previewButton}
          onPress={() => setExpanded(!expanded)}>
          <Text style={styles.previewText}>{expanded ? 'Hide handover preview' : 'Preview handover'}</Text>
          <ChevronDown size={16} color={colors.mint} style={expanded ? styles.flipped : undefined} />
        </Pressable>
        {expanded && <View style={styles.preview}>
          {careDocument.sections.map(({ heading, lines }) => <View key={heading} style={styles.previewGroup}>
            <Text style={styles.previewHeading}>{heading}</Text>
            {lines.map((line, index) => <Text key={index} style={styles.previewCopy}>{line}</Text>)}
          </View>)}
        </View>}
        <View style={styles.actionRow}>
          <Pressable accessibilityRole="button" style={styles.handoverPrimary} onPress={() => void handleShare(() => shareDocument(careDocument))}>
            <Share2 size={16} color={colors.greenDark} />
            <Text style={styles.handoverPrimaryText}>Share handover</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={styles.handoverSecondary} onPress={() => void handlePrint()}>
            <Text style={styles.handoverSecondaryText}>Print / PDF</Text>
          </Pressable>
        </View>
      </View>

      {feedback ? <Text accessibilityLiveRegion="polite" style={styles.feedback}>{feedback}</Text> : null}

      <View style={styles.section}>
        <View style={styles.sectionTop}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>People</Text>
          {canInvite && <Pressable accessibilityRole="button" style={styles.inviteButton} onPress={onInvite}>
            <Plus size={17} color={colors.white} />
            <Text style={styles.inviteButtonText}>Invite</Text>
          </Pressable>}
        </View>
        <View style={styles.card}>
          {roster.length > 0 ? roster.map((member, index) => {
            const expired = !active(member.expiresAt);
            return <View key={member.id} style={[styles.person, index > 0 && styles.divider]}>
              <View style={[styles.avatar, { backgroundColor: member.role === 'sitter' ? colors.lavender : member.role === 'family' ? colors.peach : colors.mint }]}>
                <Text style={styles.avatarText}>{initials(member.name)}</Text>
              </View>
              <View style={styles.flex}>
                <Text style={styles.personName}>{member.name}</Text>
                <Text style={styles.detail}>
                  {roles[member.role]}{member.expiresAt ? ` · ${expired ? 'Expired' : 'Until'} ${dateTime.format(new Date(member.expiresAt))}` : ''}
                </Text>
              </View>
              {canInvite && member.role !== 'owner' && !expired
                ? <Pressable accessibilityRole="button" accessibilityLabel={`Remove access for ${member.name}`} onPress={() => onRevokeMember(member.id)} style={styles.smallButton}>
                  <Text style={styles.smallButtonText}>Remove</Text>
                </Pressable>
                : member.role === 'owner' ? <ShieldCheck size={18} color={colors.green} /> : null}
            </View>;
          }) : <View style={styles.empty}>
            <Users size={21} color={colors.green} />
            <Text style={styles.detail}>No other people are listed for this pet.</Text>
          </View>}
        </View>
        {canInvite && <Text style={styles.detail}>Family can see the shared circle. Sitters get temporary access for one pet.</Text>}
      </View>

      {canInvite && openInvites.length > 0 && <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>{demo ? 'Demo invites' : 'Pending invites'}</Text>
        {demo && <Text style={styles.detail}>These sample codes are for preview only. Create a shared circle to invite real carers.</Text>}
        <View style={styles.card}>
          {openInvites.map((invite, index) => <View key={invite.id} style={[styles.pending, index > 0 && styles.divider]}>
            <View style={styles.person}>
              <View style={[styles.avatar, { backgroundColor: colors.lavender }]}><KeyRound size={19} color={colors.ink} /></View>
              <View style={styles.flex}>
                <Text selectable style={styles.personName}>{invite.code}</Text>
                <Text style={styles.detail}>{roles[invite.role]}{invite.petId ? ` for ${pet.name}` : ''} · Expires {dateTime.format(new Date(invite.expiresAt))}</Text>
              </View>
            </View>
            <View style={styles.pendingActions}>
              {!demo && <Pressable accessibilityRole="button" accessibilityLabel={`Share ${invite.role} invite ${invite.code}`} onPress={() => shareInvite(invite)} style={styles.smallButton}>
                <Share2 size={15} color={colors.green} />
                <Text style={styles.smallButtonText}>Share code</Text>
              </Pressable>}
              <Pressable accessibilityRole="button" accessibilityLabel={`Revoke ${invite.role} invite ${invite.code}`} onPress={() => onRevokeInvite(invite.id)} style={styles.smallButton}>
                <Text style={styles.smallButtonText}>Revoke</Text>
              </Pressable>
            </View>
          </View>)}
        </View>
      </View>}

      <Pressable accessibilityRole="button" style={styles.join} onPress={onJoin}>
        <Link2 size={19} color={colors.green} />
        <Text style={styles.joinText}>Join with a code</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 22 },
  flex: { flex: 1, minWidth: 0 },
  title: { fontFamily: fonts.heading, color: colors.ink, fontSize: 39, lineHeight: 43, letterSpacing: -1.1 },
  intro: { fontFamily: fonts.body, color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 6 },
  handover: { backgroundColor: colors.greenDark, borderRadius: 24, padding: 17, gap: 13 },
  handoverHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  handoverIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  handoverTitle: { fontFamily: fonts.heading, color: colors.white, fontSize: 25, lineHeight: 30 },
  handoverCopy: { fontFamily: fonts.body, color: colors.mint, fontSize: 13, lineHeight: 18, marginTop: 2 },
  handoverTask: { borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.11)', paddingVertical: 10, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
  handoverTaskText: { flex: 1, fontFamily: fonts.medium, color: colors.white, fontSize: 13, lineHeight: 18 },
  previewButton: { minHeight: 44, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, marginVertical: -6 },
  previewText: { fontFamily: fonts.bold, fontSize: 13, color: colors.mint },
  flipped: { transform: [{ rotate: '180deg' }] },
  preview: { gap: 11, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.24)', paddingTop: 10 },
  previewGroup: { gap: 3 },
  previewHeading: { fontFamily: fonts.bold, color: colors.white, fontSize: 13 },
  previewCopy: { fontFamily: fonts.body, color: colors.mint, fontSize: 13, lineHeight: 19 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  handoverPrimary: { flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, borderRadius: 12, minHeight: 44, backgroundColor: colors.mint },
  handoverPrimaryText: { fontFamily: fonts.bold, color: colors.greenDark, fontSize: 13 },
  handoverSecondary: { minHeight: 44, borderRadius: 12, justifyContent: 'center', paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  handoverSecondaryText: { fontFamily: fonts.bold, color: colors.white, fontSize: 13 },
  feedback: { fontFamily: fonts.medium, color: colors.greenDark, fontSize: 13, lineHeight: 19 },
  section: { gap: 8 },
  sectionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { fontFamily: fonts.heading, color: colors.ink, fontSize: 26, lineHeight: 31 },
  inviteButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 5, minHeight: 44, borderRadius: 13, backgroundColor: colors.green },
  inviteButtonText: { fontFamily: fonts.bold, color: colors.white, fontSize: 14 },
  card: { borderWidth: 1, borderColor: colors.line, borderRadius: 19, paddingHorizontal: 13, backgroundColor: colors.white },
  person: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  divider: { borderTopWidth: 1, borderColor: colors.line },
  avatar: { width: 39, height: 39, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontFamily: fonts.bold, color: colors.ink, fontSize: 13 },
  personName: { fontFamily: fonts.bold, color: colors.ink, fontSize: 15, lineHeight: 20 },
  detail: { fontFamily: fonts.body, color: colors.muted, fontSize: 13, lineHeight: 19 },
  smallButton: { flexDirection: 'row', gap: 5, alignItems: 'center', minHeight: 44, paddingHorizontal: 5 },
  smallButtonText: { fontFamily: fonts.bold, color: colors.green, fontSize: 12 },
  empty: { flexDirection: 'row', gap: 9, alignItems: 'center', paddingVertical: 13 },
  pending: { paddingBottom: 3 },
  pendingActions: { flexDirection: 'row', gap: 12, marginTop: -9, marginLeft: 44 },
  join: { alignSelf: 'flex-start', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, minHeight: 44, paddingHorizontal: 13, borderWidth: 1, borderColor: colors.line, borderRadius: 13, backgroundColor: colors.white },
  joinText: { fontFamily: fonts.bold, color: colors.green, fontSize: 14 },
});
