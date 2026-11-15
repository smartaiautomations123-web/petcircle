import * as Crypto from 'expo-crypto';
import { blankPet, clockTime, formatClock, kindNames, localDate, routineStatus, shiftDate, ukDateTime, type Action, type CareKind, type CircleState, type Pet, type Routine } from './model';
import type { Field, FormSpec } from './Forms';

type Save = (action: Action, feedback: string) => Promise<void>;
const id = () => Crypto.randomUUID();
const validTime = /^([01]\d|2[0-3]):[0-5]\d$/;
const dateFormat = /^\d{4}-\d{2}-\d{2}$/;
const input = (key: string, label: string, initial = '', props: Partial<Field> = {}): Field => ({ key, label, initial, ...props });
const options = (values: Record<string, string>) => Object.entries(values).map(([value, label]) => ({ value, label }));

function required(value: string, label: string) {
  if (!value.trim()) throw new Error('Enter ' + label + '.');
  return value.trim();
}

function at(date: string, time: string) {
  const day = date.trim();
  if (!dateFormat.test(day) || !validTime.test(time.trim())) throw new Error('Use YYYY-MM-DD for the date and HH:MM for the time.');
  const checked = new Date(day + 'T12:00:00Z');
  if (!Number.isFinite(checked.getTime()) || checked.toISOString().slice(0, 10) !== day) throw new Error('Enter a valid date.');
  return ukDateTime(day, time.trim()).toISOString();
}

export function petForm(pet: Pet | undefined, save: Save, selected: (id: string) => void): FormSpec {
  const current = pet ?? blankPet(id());
  return {
    title: pet ? 'Edit ' + pet.name + '’s details' : 'Add a pet',
    label: 'Save pet',
    fields: [
      input('name', 'Pet name', current.name, { max: 80, placeholder: 'e.g. Milo' }),
      input('species', 'Species', current.species, { max: 60, placeholder: 'e.g. Dog' }),
      input('breed', 'Breed', current.breed, { max: 100 }),
      input('age', 'Age', current.age, { max: 40, placeholder: 'e.g. 4 years' }),
      input('photoUrl', 'Pet photo', current.photoUrl, { type: 'photo' }),
      input('description', 'Identifying features', current.description, { type: 'long' }),
      input('instructions', 'Care instructions', current.instructions, { type: 'long', max: 4000 }),
      input('vetName', 'Vet practice', current.vetName, { max: 120 }),
      input('vetPhone', 'Vet phone', current.vetPhone, { type: 'phone', max: 40 }),
      input('emergencyPhone', 'Out-of-hours vet phone', current.emergencyPhone, { type: 'phone', max: 40 }),
      input('contactName', 'Lost-pet contact name', current.contactName, { max: 100 }),
      input('contactPhone', 'Lost-pet contact phone', current.contactPhone, { type: 'phone', max: 40 }),
      input('microchip', 'Microchip number', current.microchip, { max: 60 }),
      input('insurer', 'Insurer', current.insurer, { max: 120 }),
      input('policyNumber', 'Policy number', current.policyNumber, { max: 80 }),
    ],
    submit: async values => {
      const clean = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()]));
      const next = { ...current, ...clean, name: required(values.name, 'a pet name'), species: required(values.species, 'a species') };
      await save({ type: 'savePet', pet: next }, next.name + '’s profile saved.');
      selected(next.id);
    },
  };
}

export function routineForm(pet: Pet, routine: Routine | undefined, save: Save): FormSpec {
  return {
    title: routine ? 'Edit routine' : 'Add a daily routine',
    description: 'Routines repeat daily. Set how long a late task can wait before it needs attention.',
    label: 'Save routine',
    fields: [
      { key: 'kind', label: 'Care type', initial: routine?.kind ?? 'feed', options: options({ feed: 'Feeding', walk: 'Walk', med: 'Medication' }) },
      input('title', 'Routine name', routine?.title, { max: 120, placeholder: 'e.g. Breakfast' }),
      input('time', 'Time (UK, HH:MM)', routine?.time, { max: 5, placeholder: '07:30' }),
      input('details', 'Instructions', routine?.details, { type: 'long', max: 1000 }),
      { key: 'grace', label: 'Flag after', initial: String(routine?.escalateMinutes ?? 30), options: [5, 15, 30, 60, 120, 240].map(value => ({ value: String(value), label: value >= 60 ? value / 60 + ' hr' : value + ' min' })) },
    ],
    submit: async values => {
      const time = values.time.trim();
      if (!validTime.test(time)) throw new Error('Enter a time such as 07:30 or 18:00.');
      await save({ type: 'saveRoutine', routine: { id: routine?.id ?? id(), petId: pet.id, kind: values.kind as Routine['kind'], title: required(values.title, 'a routine name'), time, details: values.details.trim(), escalateMinutes: Number(values.grace) } }, 'Routine saved.');
    },
    remove: routine ? { label: 'Remove routine', submit: () => save({ type: 'removeRoutine', id: routine.id }, 'Routine removed.') } : undefined,
  };
}

export function logForm(pet: Pet, circle: CircleState, kind: CareKind | undefined, save: Save): FormSpec {
  const today = localDate();
  const unlogged = circle.routines.filter(routine => routine.petId === pet.id && routineStatus(routine, circle.entries).state !== 'done')
    .sort((a, b) => a.time.localeCompare(b.time));
  const routineChoices: Field[] = (['feed', 'walk', 'med'] as const).flatMap(careKind => {
    const matches = unlogged.filter(routine => routine.kind === careKind);
    return matches.length ? [{
      key: 'routine-' + careKind, label: 'Link to today’s routine', initial: '', show: values => values.kind === careKind,
      options: [{ value: '', label: 'Extra log' }, ...matches.map(routine => ({ value: routine.id, label: routine.title + ' · ' + formatClock(ukDateTime(today, routine.time)) }))],
    }] : [];
  });
  return {
    title: 'Log care for ' + pet.name,
    label: 'Save care log',
    fields: [
      { key: 'kind', label: 'Care type', initial: kind ?? 'feed', options: options(kindNames) },
      ...routineChoices,
      input('title', 'What happened?', '', { max: 120, placeholder: 'Optional name', show: values => !values['routine-' + values.kind] }),
      input('note', 'Notes', '', { type: 'long' }),
    ],
    submit: async values => {
      const kind = values.kind as CareKind;
      if (kind === 'note' && !values.title.trim() && !values.note.trim()) throw new Error('Write a title or a note.');
      const now = new Date();
      const linked = unlogged.find(routine => routine.id === values['routine-' + kind]);
      if (linked && localDate(now) !== today) throw new Error('A new care day has started. Reopen the log to choose a routine.');
      await save({ type: 'log', entry: {
        id: id(), petId: pet.id, kind, title: linked?.title ?? (values.title.trim() || kindNames[kind]),
        note: values.note.trim(), at: now.toISOString(), by: circle.person,
        ...(linked ? { routineId: linked.id, scheduledDate: today } : {}),
      } }, 'Care logged.');
    },
  };
}

export function healthForm(pet: Pet, kind: 'weight' | 'symptom', save: Save): FormSpec {
  const weight = kind === 'weight';
  return {
    title: weight ? 'Record weight' : 'Record a symptom',
    label: 'Save record',
    fields: [
      input('value', weight ? 'Weight (kg)' : 'Symptom', '', { type: weight ? 'number' : 'text', max: weight ? 10 : 160, placeholder: weight ? '28.4' : 'What did you notice?' }),
      input('date', 'Date (YYYY-MM-DD)', localDate(), { max: 10 }),
      input('note', 'Notes', '', { type: 'long' }),
    ],
    submit: async values => {
      let value = required(values.value, weight ? 'a weight' : 'a symptom');
      if (weight) {
        value = value.replace(',', '.');
        if (!/^\d+(\.\d{1,3})?$/.test(value) || Number(value) <= 0 || Number(value) > 2000) throw new Error('Enter a weight between 0 and 2,000 kg.');
      }
      const date = values.date.trim();
      const time = date === localDate() ? clockTime() : '12:00';
      const recorded = at(date, time);
      if (date > localDate()) throw new Error('Choose today or an earlier date.');
      await save({ type: 'addHealth', entry: { id: id(), petId: pet.id, kind, at: recorded, value, note: values.note.trim() } }, 'Health record saved.');
    },
  };
}

export function reminderForm(pet: Pet, save: Save): FormSpec {
  return {
    title: 'Add a vet reminder',
    label: 'Save reminder',
    fields: [
      { key: 'kind', label: 'Reminder type', initial: 'vet', options: options({ vet: 'Vet visit', vaccine: 'Vaccination' }) },
      input('title', 'Reminder name', '', { max: 120, placeholder: 'e.g. Annual check-up' }),
      input('date', 'Date (YYYY-MM-DD)', shiftDate(localDate(), 1), { max: 10 }),
      input('time', 'Time (UK, HH:MM)', '09:00', { max: 5 }),
      input('note', 'Notes', '', { type: 'long' }),
    ],
    submit: async values => {
      const due = at(values.date, values.time);
      if (Date.parse(due) <= Date.now()) throw new Error('Choose a future date and time.');
      await save({ type: 'addReminder', reminder: { id: id(), petId: pet.id, kind: values.kind as 'vet' | 'vaccine', title: required(values.title, 'a reminder name'), at: due, note: values.note.trim() } }, 'Reminder saved.');
    },
  };
}

export function inviteForm(pet: Pet, save: Save, demo: boolean): FormSpec {
  return {
    title: 'Invite a carer',
    description: 'Family members can manage care. Sitters can log care for ' + pet.name + ' during their access window.',
    label: 'Create invite code',
    fields: [
      { key: 'role', label: 'Access', initial: 'sitter', options: options({ sitter: 'Temporary sitter', family: 'Family member' }) },
      { key: 'days', label: 'Sitter access ends after', initial: '3', show: values => values.role === 'sitter', options: options({ 1: '1 day', 3: '3 days', 7: '7 days', 14: '14 days' }) },
    ],
    submit: async values => {
      const role = values.role as 'sitter' | 'family';
      const expiresAt = new Date(Date.now() + (role === 'family' ? 7 : Number(values.days)) * 86_400_000).toISOString();
      await save({ type: 'invite', invite: { id: id(), code: id().toUpperCase(), role, expiresAt, ...(role === 'sitter' ? { petId: pet.id } : {}) } }, demo ? 'Sample invite created.' : 'Invite created. Share the code from Care circle.');
    },
  };
}
