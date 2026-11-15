import assert from 'node:assert/strict';
import test from 'node:test';
import { localDate, routineStatus, reduceCircle, makeDemo, ukDateTime, type Routine } from '../src/model';

const routine: Routine = { id: 'r1', petId: 'p1', kind: 'feed', title: 'Breakfast', time: '08:00', details: '', escalateMinutes: 30 };

test('care dates use UK time even around midnight in summer', () => {
  assert.equal(localDate(new Date('2026-07-04T23:15:00Z')), '2026-07-05');
  assert.equal(routineStatus(routine, [], new Date('2026-07-05T07:05:00Z')).due.toISOString(), '2026-07-05T07:00:00.000Z');
});

test('UK clock changes pick the first autumn hour and advance through the spring gap', () => {
  assert.equal(ukDateTime('2026-10-25', '01:30').toISOString(), '2026-10-25T00:30:00.000Z');
  assert.equal(ukDateTime('2026-03-29', '01:30').toISOString(), '2026-03-29T01:30:00.000Z');
});

test('an overdue routine escalates at its configured grace time', () => {
  assert.equal(routineStatus(routine, [], new Date('2026-11-13T08:15:00Z')).state, 'late');
  assert.equal(routineStatus(routine, [], new Date('2026-11-13T08:15:00Z')).escalated, false);
  assert.equal(routineStatus(routine, [], new Date('2026-11-13T08:30:00Z')).escalated, true);
});

test('the local store records one completion per scheduled day', () => {
  const state = makeDemo(new Date('2026-11-13T12:00:00Z'));
  const entry = { id: 'first', petId: 'p1', kind: 'feed' as const, title: 'Breakfast', note: '', at: '2026-11-13T08:00:00Z', by: 'Sam', routineId: 'r1', scheduledDate: '2026-11-13' };
  const next = reduceCircle(state, { type: 'log', entry });
  const repeated = reduceCircle(next, { type: 'log', entry: { ...entry, id: 'second' } });
  assert.equal(repeated.entries.filter(item => item.routineId === 'r1').length, 1);
  assert.equal(routineStatus(routine, repeated.entries, new Date('2026-11-13T12:00:00Z')).state, 'done');
  assert.equal(routineStatus(routine, repeated.entries, new Date('2026-11-14T12:00:00Z')).state, 'late');
});
