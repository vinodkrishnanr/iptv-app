import AsyncStorage from '@react-native-async-storage/async-storage';
import type { XtreamCredentials } from './types';

const KEY_CREDS = 'iptv_creds';
const KEY_PROXY = 'iptv_proxy';
const KEY_PLAYER_PREFS = 'iptv_player_prefs';

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

export type PlayerPref = 'internal' | 'external';

export type PlayerPrefs = {
  live: PlayerPref;
  vod: PlayerPref;
  series: PlayerPref;
  externalPackage: string; // android package name for external player (optional)
};

const DEFAULT_PREFS: PlayerPrefs = {
  live: 'internal',
  vod: 'internal',
  series: 'internal',
  externalPackage: '',
};

export async function loadPlayerPrefs(): Promise<PlayerPrefs> {
  const raw = await AsyncStorage.getItem(KEY_PLAYER_PREFS);
  if (!raw) return { ...DEFAULT_PREFS };
  try {
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<PlayerPrefs>) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export async function savePlayerPrefs(p: PlayerPrefs): Promise<void> {
  await AsyncStorage.setItem(KEY_PLAYER_PREFS, JSON.stringify(p));
}