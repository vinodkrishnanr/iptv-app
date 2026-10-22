import AsyncStorage from '@react-native-async-storage/async-storage';
import type { XtreamCredentials } from './types';

const KEY_CREDS = 'iptv_creds';
const KEY_PROXY = 'iptv_proxy';

export async function saveCredentials(creds: XtreamCredentials): Promise<void> {
  await AsyncStorage.setItem(KEY_CREDS, JSON.stringify(creds));
}

export async function loadCredentials(): Promise<XtreamCredentials | null> {
  const raw = await AsyncStorage.getItem(KEY_CREDS);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as XtreamCredentials;
  } catch {
    return null;
  }
}

export async function clearCredentials(): Promise<void> {
  await AsyncStorage.removeItem(KEY_CREDS);
}

export async function saveProxy(url: string | null): Promise<void> {
  if (url) await AsyncStorage.setItem(KEY_PROXY, url);
  else await AsyncStorage.removeItem(KEY_PROXY);
}

export async function loadProxy(): Promise<string | null> {
  return AsyncStorage.getItem(KEY_PROXY);
}