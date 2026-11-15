import { createClient, processLock } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import { AppState, Platform } from 'react-native'
import { setupURLPolyfill } from 'react-native-url-polyfill'

import type { Action, CircleState } from './model'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim()
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
const secureOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }

if (Platform.OS !== 'web') setupURLPolyfill()

// SecureStore has a per-value size limit. Base64 and UTF-8 can expand the auth
// session, so store short chunks and let the header select the active version.
type StorageHeader = { slot: 'a' | 'b'; count: number }

async function readHeader(name: string): Promise<StorageHeader | null> {
  const stored = await SecureStore.getItemAsync(name, secureOptions)
  if (!stored) return null
  const header = JSON.parse(stored) as StorageHeader
  return (header.slot === 'a' || header.slot === 'b') && Number.isSafeInteger(header.count) && header.count > 0 && header.count <= 100
    ? header
    : null
}

function chunkKey(name: string, slot: StorageHeader['slot'], index: number) {
  return `${name}.${slot}.${index}`
}

async function clearSlot(name: string, header: StorageHeader) {
  await Promise.all(Array.from({ length: header.count }, (_, index) =>
    SecureStore.deleteItemAsync(chunkKey(name, header.slot, index), secureOptions),
  ))
}

const nativeSessionStorage = {
  async getItem(name: string) {
    const header = await readHeader(name)
    if (!header) return null
    const chunks = await Promise.all(Array.from({ length: header.count }, (_, index) =>
      SecureStore.getItemAsync(chunkKey(name, header.slot, index), secureOptions),
    ))
    return chunks.every((chunk) => chunk !== null) ? chunks.join('') : null
  },
  async setItem(name: string, value: string) {
    const previous = await readHeader(name)
    const slot = previous?.slot === 'a' ? 'b' : 'a'
    const chunks = value.match(/[\s\S]{1,450}/gu) ?? ['']
    const header = { slot, count: chunks.length } satisfies StorageHeader
    if (header.count > 100) throw new Error('The secure sign-in session is too large.')
    try {
      for (const [index, chunk] of chunks.entries()) {
        await SecureStore.setItemAsync(chunkKey(name, slot, index), chunk, secureOptions)
      }
      await SecureStore.setItemAsync(name, JSON.stringify(header), secureOptions)
    } catch (error) {
      await clearSlot(name, header).catch(() => undefined)
      throw error
    }
    if (previous) await clearSlot(name, previous).catch(() => undefined)
  },
  async removeItem(name: string) {
    const header = await readHeader(name)
    await SecureStore.deleteItemAsync(name, secureOptions)
    if (header) await clearSlot(name, header)
  },
}

export const supabase = url && key ? createClient(url, key, {
  auth: {
    ...(Platform.OS === 'web' ? {} : { storage: nativeSessionStorage }),
    lock: processLock,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
}) : null

if (Platform.OS !== 'web' && supabase) {
  const client = supabase
  AppState.addEventListener('change', (state) => {
    if (state === 'active') void client.auth.startAutoRefresh()
    else void client.auth.stopAutoRefresh()
  })
}

function cloudClient() {
  if (!supabase) throw new Error('Connect a Supabase project to use shared circles.')
  return supabase
}

export async function loadCircles(): Promise<CircleState[]> {
  const { data, error } = await cloudClient().rpc('petcircle_load')
  if (error) throw new Error(error.message)
  return data as CircleState[]
}

export async function createCircle(name: string, person: string): Promise<string> {
  const { data, error } = await cloudClient().rpc('petcircle_create', { circle_name: name, display_name: person })
  if (error) throw new Error(error.message)
  return data as string
}

export async function joinCircle(code: string, person: string): Promise<string> {
  const { data, error } = await cloudClient().rpc('petcircle_join', { invite_code: code, display_name: person })
  if (error) throw new Error(error.message)
  return data as string
}

export async function applyCloud(circleId: string, action: Action): Promise<void> {
  const { error } = await cloudClient().rpc('petcircle_apply', { circle: circleId, action })
  if (error) throw new Error(error.message)
}

export function subscribeCloud(onChange: () => void): () => void {
  const client = cloudClient()
  let closed = false
  let channel: ReturnType<typeof client.channel> | undefined

  // Recheck permissions after a reconnect and periodically while the app is
  // active so an expiring sitter grant closes even when nobody writes to it.
  const appState = AppState.addEventListener('change', (state) => {
    if (state === 'active') onChange()
  })
  const interval = setInterval(() => {
    if (Platform.OS === 'web' || AppState.currentState === 'active') onChange()
  }, 30_000)

  void client.auth.getSession().then(({ data: { session } }) => {
    if (closed || !session) return
    channel = client.channel(`petcircle-updates-${session.user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'petcircle_updates', filter: `user_id=eq.${session.user.id}`,
      }, onChange)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'petcircle_updates', filter: `user_id=eq.${session.user.id}`,
      }, onChange)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') onChange()
      })
  }).catch(() => undefined)

  return () => {
    closed = true
    clearInterval(interval)
    appState.remove()
    if (channel) void client.removeChannel(channel)
  }
}
