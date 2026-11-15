import type { CircleState } from './model';

export async function enableNotifications() {
  throw new Error('Device alerts are available on Android and iOS.');
}

export async function syncAlerts(_circles: CircleState[], _enabled: boolean) {}
