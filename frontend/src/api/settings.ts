/**
 * API-Client für Site-Settings (Key/Value).
 */

import { api } from '../lib/api';

export interface SettingValue {
  key: string;
  value: string;
}

export async function getSetting(key: string): Promise<SettingValue> {
  return api<SettingValue>(`/settings/${encodeURIComponent(key)}`);
}

export async function updateSetting(key: string, value: string): Promise<SettingValue> {
  return api<SettingValue>(`/settings/${encodeURIComponent(key)}`, {
    method: 'PATCH',
    body: JSON.stringify({ value }),
  });
}
