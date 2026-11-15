import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { localDate, shiftDate, ukDateTime, type CircleState } from './model';

const channelId = 'petcircle-care';
const managedKey = 'petcircle.local.v1';

Notifications.setNotificationHandler({ handleNotification: async () => ({
  shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false,
}) });

export async function enableNotifications() {
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync(channelId, {
    name: 'PetCircle care', importance: Notifications.AndroidImportance.DEFAULT,
  });
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return;
  const requested = await Notifications.requestPermissionsAsync();
  if (!requested.granted) throw new Error('Allow PetCircle notifications in your device settings.');
}

type Alert = { key: string; at: number; title: string; body: string };

export function planAlerts(circles: CircleState[], now = new Date()) {
  const alerts: Alert[] = [];
  const today = localDate(now);
  for (const circle of circles) {
    // A phone that is offline cannot confirm completion by a different carer.
    // Shared routines use the in-app overdue status; local routines can alert offline.
    if (circle.id === 'local') {
      for (const routine of circle.routines) {
        const pet = circle.pets.find(item => item.id === routine.petId);
        if (!pet) continue;
        for (let offset = 0; offset < 5; offset++) {
          const date = shiftDate(today, offset);
          if (circle.entries.some(entry => entry.routineId === routine.id && entry.scheduledDate === date)) continue;
          alerts.push({
            key: circle.id + '/' + routine.id + '/' + date,
            at: ukDateTime(date, routine.time).getTime() + routine.escalateMinutes * 60_000,
            title: pet.name + ' · Care check', body: routine.title + ' hasn’t been logged.',
          });
        }
      }
    }
    if (circle.role !== 'sitter') {
      for (const reminder of circle.reminders) {
        const pet = circle.pets.find(item => item.id === reminder.petId);
        if (!pet) continue;
        const due = Date.parse(reminder.at);
        const previousDay = ukDateTime(shiftDate(localDate(new Date(due)), -1), '09:00').getTime();
        alerts.push({ key: circle.id + '/' + reminder.id, at: previousDay > now.getTime() ? previousDay : due, title: pet.name + ' · Vet reminder', body: reminder.title });
      }
    }
  }
  return alerts.filter(item => item.at > now.getTime() + 500).sort((a, b) => a.at - b.at).slice(0, 48);
}

let syncQueue = Promise.resolve();
export function syncAlerts(circles: CircleState[], enabled: boolean) {
  const run = async () => {
    const existing = await Notifications.getAllScheduledNotificationsAsync();
    const own = existing.filter(item => item.content.data?.source === managedKey);
    const desired = new Map((enabled ? planAlerts(circles) : []).map(alert => [alert.key, alert]));
    for (const item of own) {
      const key = String(item.content.data?.key);
      const alert = desired.get(key);
      if (alert && item.content.data?.at === alert.at && item.content.title === alert.title && item.content.body === alert.body) {
        desired.delete(key);
      } else {
        await Notifications.cancelScheduledNotificationAsync(item.identifier);
      }
    }
    for (const alert of desired.values()) {
      await Notifications.scheduleNotificationAsync({
        content: { title: alert.title, body: alert.body, data: { source: managedKey, key: alert.key, at: alert.at } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(alert.at), ...(Platform.OS === 'android' ? { channelId } : {}) },
      });
    }
  };
  syncQueue = syncQueue.catch(() => undefined).then(run);
  return syncQueue;
}
