import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthSession } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { applyCloud, loadCircles, subscribeCloud, supabase } from './cloud';
import { type Action, type CircleState, makeDemo, makeLocal, reduceCircle } from './model';

const key = 'petcircle.v1';
type DiskState = { demo: CircleState; local: CircleState; selectedId: string; alerts: boolean };

function initial(): DiskState {
  return { demo: makeDemo(), local: makeLocal(), selectedId: 'demo', alerts: false };
}

export function useCircles() {
  const [disk, setDisk] = useState<DiskState>(initial);
  const diskRef = useRef(disk);
  const writes = useRef(Promise.resolve());
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [cloudReady, setCloudReady] = useState(!supabase);
  const [shared, setShared] = useState<CircleState[]>([]);
  const [cloudError, setCloudError] = useState('');
  const sessionOwner = useRef<string | null>(null);
  const refreshId = useRef(0);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(key).then(value => {
      if (!active || !value) return;
      const parsed = JSON.parse(value) as Partial<DiskState>;
      const next = { ...initial(), ...parsed };
      diskRef.current = next;
      setDisk(next);
    }).catch(() => {}).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  const save = useCallback((change: (previous: DiskState) => DiskState) => {
    const write = writes.current.catch(() => undefined).then(async () => {
      const next = change(diskRef.current);
      await AsyncStorage.setItem(key, JSON.stringify(next));
      diskRef.current = next;
      setDisk(next);
    });
    writes.current = write;
    return write;
  }, []);

  const refresh = useCallback(async (owner: string) => {
    if (sessionOwner.current !== owner) return;
    const request = ++refreshId.current;
    try {
      const circles = await loadCircles();
      if (sessionOwner.current === owner && refreshId.current === request) {
        setShared(circles);
        setCloudError('');
      }
    } catch (error) {
      if (sessionOwner.current === owner && refreshId.current === request) {
        setShared(current => current.filter(circle => circle.role !== 'sitter'));
        setCloudError(error instanceof Error ? error.message : 'Could not refresh your shared circles.');
      }
    } finally {
      if (sessionOwner.current === owner && refreshId.current === request) setCloudReady(true);
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    const listener = client.auth.onAuthStateChange((_event, next) => {
      const nextOwner = next?.user.id ?? null;
      if (nextOwner !== sessionOwner.current) {
        sessionOwner.current = nextOwner;
        setShared([]);
        setCloudError('');
        setCloudReady(!nextOwner);
      } else if (!nextOwner) {
        setCloudReady(true);
      }
      setSession(next);
    });
    return () => listener.data.subscription.unsubscribe();
  }, []);

  const owner = session?.user.id;
  useEffect(() => {
    if (!owner) return;
    void refresh(owner);
    return subscribeCloud(() => void refresh(owner));
  }, [owner, refresh]);

  async function change(circleId: string, action: Action) {
    if (circleId === 'demo' || circleId === 'local') {
      await save(previous => ({ ...previous, [circleId]: reduceCircle(previous[circleId], action) }));
    } else {
      if (!owner) throw new Error('Sign in to update your shared circle.');
      await applyCloud(circleId, action);
      await refresh(owner);
    }
  }

  return {
    ready, cloudReady, cloudError, session, shared, disk, change,
    refresh: async () => { if (owner) await refresh(owner); },
    select: (selectedId: string) => save(previous => ({ ...previous, selectedId })),
    setAlerts: (alerts: boolean) => save(previous => ({ ...previous, alerts })),
  };
}
