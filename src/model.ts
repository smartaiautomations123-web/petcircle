export type Role = 'owner' | 'family' | 'sitter';
export type CareKind = 'feed' | 'walk' | 'med' | 'note';
export type Pet = {
  id: string; name: string; species: string; breed: string; age: string; description: string;
  vetName: string; vetPhone: string; emergencyPhone: string; microchip: string;
  insurer: string; policyNumber: string; instructions: string; contactName: string;
  contactPhone: string; photoUrl?: string;
};
export type Routine = {
  id: string; petId: string; kind: Exclude<CareKind, 'note'>; title: string;
  time: string; details: string; escalateMinutes: number;
};
export type CareEntry = {
  id: string; petId: string; kind: CareKind; title: string; note: string; at: string;
  by: string; routineId?: string; scheduledDate?: string;
};
export type HealthEntry = { id: string; petId: string; kind: 'weight' | 'symptom'; at: string; value: string; note: string };
export type Reminder = { id: string; petId: string; kind: 'vet' | 'vaccine'; title: string; at: string; note: string };
export type Member = { id: string; name: string; role: Role; expiresAt?: string; petId?: string };
export type Invite = { id: string; code: string; role: 'family' | 'sitter'; expiresAt: string; petId?: string; claimed?: boolean };
export type CircleState = {
  id: string; name: string; role: Role; person: string; pets: Pet[]; routines: Routine[];
  entries: CareEntry[]; health: HealthEntry[]; reminders: Reminder[]; members: Member[]; invites: Invite[];
};
export type Action =
  | { type: 'savePet'; pet: Pet }
  | { type: 'saveRoutine'; routine: Routine }
  | { type: 'removeRoutine'; id: string }
  | { type: 'log'; entry: CareEntry }
  | { type: 'addHealth'; entry: HealthEntry }
  | { type: 'addReminder'; reminder: Reminder }
  | { type: 'removeReminder'; id: string }
  | { type: 'invite'; invite: Invite }
  | { type: 'revokeInvite'; id: string }
  | { type: 'revokeMember'; id: string };

export const kindNames: Record<CareKind, string> = { feed: 'Feeding', walk: 'Walk', med: 'Medication', note: 'Care note' };
export const ukZone = 'Europe/London';

const ukParts = new Intl.DateTimeFormat('en-GB', {
  timeZone: ukZone, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

function parts(date: Date) {
  return Object.fromEntries(ukParts.formatToParts(date).map(({ type, value }) => [type, value]));
}

export function localDate(date = new Date()) {
  const { year, month, day } = parts(date);
  return [year, month, day].join('-');
}

export function clockTime(date = new Date()) {
  const { hour, minute } = parts(date);
  return [hour, minute].join(':');
}

export function shiftDate(day: string, days: number) {
  const date = new Date(day + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function ukDateTime(date: string, time: string) {
  const wallTime = Date.parse(date + 'T' + time + ':00Z');
  if (!Number.isFinite(wallTime)) return new Date(NaN);
  // UK transitions currently occur at 01:00 UTC. The evening offset
  // picks the first occurrence in autumn and the next valid hour in spring.
  const { hour } = parts(new Date(date + 'T18:00:00Z'));
  const candidate = new Date(wallTime - (Number(hour) - 18) * 3_600_000);
  const requested = date + 'T' + time;
  const earlier = new Date(candidate.getTime() - 3_600_000);
  if (localDate(earlier) + 'T' + clockTime(earlier) === requested) return earlier;
  if (localDate(candidate) + 'T' + clockTime(candidate) < requested) return new Date(candidate.getTime() + 3_600_000);
  return candidate;
}

export function formatClock(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en-GB', { timeZone: ukZone, hour: 'numeric', minute: '2-digit', hour12: true }).format(date).replace(/\u202f/g, ' ');
}

export function routineStatus(routine: Routine, entries: CareEntry[], now = new Date()) {
  const date = localDate(now);
  const due = ukDateTime(date, routine.time);
  const entry = entries.find(item => item.routineId === routine.id && item.scheduledDate === date);
  const elapsed = now.getTime() - due.getTime();
  const state = entry ? 'done' : elapsed > 0 ? 'late' : 'pending';
  return { state, entry, due, escalated: !entry && elapsed >= routine.escalateMinutes * 60_000 } as const;
}

function put<T extends { id: string }>(items: T[], item: T): T[] {
  return items.some(current => current.id === item.id)
    ? items.map(current => current.id === item.id ? item : current)
    : [...items, item];
}

export function reduceCircle(state: CircleState, action: Action): CircleState {
  switch (action.type) {
    case 'savePet': return { ...state, pets: put(state.pets, action.pet) };
    case 'saveRoutine': return { ...state, routines: put(state.routines, action.routine) };
    case 'removeRoutine': return { ...state, routines: state.routines.filter(item => item.id !== action.id) };
    case 'log': {
      const entry = action.entry;
      if (state.entries.some(item => item.id === entry.id || (entry.routineId && item.routineId === entry.routineId && item.scheduledDate === entry.scheduledDate))) return state;
      return { ...state, entries: [entry, ...state.entries] };
    }
    case 'addHealth': return { ...state, health: put(state.health, action.entry) };
    case 'addReminder': return { ...state, reminders: put(state.reminders, action.reminder) };
    case 'removeReminder': return { ...state, reminders: state.reminders.filter(item => item.id !== action.id) };
    case 'invite': return { ...state, invites: put(state.invites, action.invite) };
    case 'revokeInvite': return { ...state, invites: state.invites.filter(item => item.id !== action.id) };
    case 'revokeMember': return { ...state, members: state.members.filter(item => item.id !== action.id) };
  }
}

export function blankPet(id: string): Pet {
  return { id, name: '', species: 'Dog', breed: '', age: '', description: '', vetName: '', vetPhone: '', emergencyPhone: '', microchip: '', insurer: '', policyNumber: '', instructions: '', contactName: '', contactPhone: '' };
}

export function makeDemo(now = new Date()): CircleState {
  const day = localDate(now);
  const petId = 'milo';
  const demoRoutine = (id: string, kind: Routine['kind'], title: string, time: string, details: string, escalateMinutes = 30): Routine =>
    ({ id, petId, kind, title, time, details, escalateMinutes });
  const routines = [
    demoRoutine('breakfast', 'feed', 'Breakfast', '07:30', '1 scoop of dry food'),
    demoRoutine('walk', 'walk', 'Afternoon walk', '13:00', '30 minutes around the park', 60),
    demoRoutine('dinner', 'feed', 'Dinner', '18:00', '1 scoop of dry food'),
    demoRoutine('medicine', 'med', 'Evening medication', '19:00', 'Follow the label on the prescription'),
  ];
  const entryAt = (id: string, routine: Routine, at: string, by: string, note = ''): CareEntry =>
    ({ id, petId, kind: routine.kind, title: routine.title, note, by, at: ukDateTime(at, routine.time).toISOString(), routineId: routine.id, scheduledDate: at });
  const yesterday = shiftDate(day, -1);
  const breakfast = entryAt('demo-breakfast', routines[0], day, 'Alex', 'Ate the full portion.');
  const breakfastWasDue = Date.parse(breakfast.at) <= now.getTime();
  return {
    id: 'demo', name: 'The Parker family', role: 'owner', person: 'Alex',
    pets: [{
      ...blankPet(petId), name: 'Milo', breed: 'Golden Retriever', age: '4 years',
      description: 'Golden coat, a sage-green collar and a small white patch on his chest.',
      vetName: 'Meadow Lane Vets', vetPhone: '01632 960042', emergencyPhone: '01632 960043',
      contactName: 'Alex Parker', contactPhone: '07700 900245', microchip: '900000000000001',
      insurer: 'Example Pet Cover', policyNumber: 'DEMO-PC-104',
      instructions: 'Milo gets one scoop of dry food at breakfast and dinner. Keep him on the lead near roads. His food and lead are by the back door. Follow the prescription label for any medication.',
    }],
    routines,
    entries: [
      ...(breakfastWasDue ? [breakfast] : []),
      entryAt('demo-dinner', routines[2], yesterday, 'Sam', 'Fresh water topped up.'),
      entryAt('demo-walk', routines[1], yesterday, 'Sam', 'Took the long route through the park.'),
    ],
    health: [
      ...['28.4', '28.2', '28.0', '28.1'].map((value, i): HealthEntry => ({ id: 'weight-' + i, petId, kind: 'weight', at: ukDateTime(shiftDate(day, -(i * 12 + 3)), '10:00').toISOString(), value, note: i === 0 ? 'Weighed at home' : '' })),
      { id: 'symptom-1', petId, kind: 'symptom', value: 'Itchy ears', at: ukDateTime(shiftDate(day, -7), '10:30').toISOString(), note: 'Scratching after the afternoon walk.' },
    ],
    reminders: [
      { id: 'vet-1', petId, kind: 'vet', title: 'Annual vet check-up', at: ukDateTime(shiftDate(day, 9), '10:30').toISOString(), note: 'Meadow Lane Vets' },
      { id: 'vac-1', petId, kind: 'vaccine', title: 'Booster vaccination', at: ukDateTime(shiftDate(day, 24), '14:00').toISOString(), note: 'Bring vaccination card' },
    ],
    members: [
      { id: 'alex', name: 'Alex Parker', role: 'owner' },
      { id: 'sam', name: 'Sam Parker', role: 'family' },
      { id: 'jemma', name: 'Jemma Lewis', role: 'sitter', petId, expiresAt: ukDateTime(shiftDate(day, 3), '18:00').toISOString() },
    ],
    invites: [],
  };
}

export function makeLocal(): CircleState {
  return {
    id: 'local', name: 'My care circle', role: 'owner', person: 'You', pets: [],
    routines: [], entries: [], health: [], reminders: [], members: [{ id: 'local-owner', name: 'You', role: 'owner' }], invites: [],
  };
}
