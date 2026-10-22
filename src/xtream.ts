import { Platform } from 'react-native';
import type {
  XtreamCredentials,
  LoginResult,
  Category,
  LiveStream,
  VodStream,
  Series,
  SeriesInfo,
  VodInfo,
  Episode,
} from './types';

// Known CORS proxies (tried in order on web when direct fetch fails).
const PROXY_CANDIDATES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
  'https://cors-anywhere.herokuapp.com/',
];

let proxyUrl: string | null = null;
export function setProxy(url: string | null) {
  proxyUrl = url && url.trim() ? url.trim() : null;
}
export function getProxy() {
  return proxyUrl;
}

export function wrapProxy(url: string): string {
  if (Platform.OS !== 'web') return url;
  const p = proxyUrl || PROXY_CANDIDATES[0];
  return p + encodeURIComponent(url);
}

function normalizeServer(server: string): string {
  let s = server.trim();
  if (!s.startsWith('http://') && !s.startsWith('https://')) {
    s = 'http://' + s;
  }
  return s.replace(/\/+$/, '');
}

function buildUrl(server: string, path: string, params: Record<string, string | number> = {}): string {
  const base = normalizeServer(server);
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) qs.set(k, String(v));
  const q = qs.toString();
  return `${base}${path}${q ? '?' + q : ''}`;
}

function proxyWrap(p: string, url: string): string {
  // allorigins uses ?url= form
  if (p.includes('allorigins')) return p + encodeURIComponent(url);
  return p + encodeURIComponent(url);
}

async function tryFetch(url: string): Promise<Response> {
  return fetch(url);
}

async function fetchJson<T>(url: string): Promise<T> {
  // Build list of URLs to try: direct first, then proxies (web only).
  const urlsToTry: string[] = [];
  if (Platform.OS !== 'web') {
    urlsToTry.push(url);
  } else {
    // direct attempt first (works if server sends CORS)
    urlsToTry.push(url);
    const proxies = proxyUrl ? [proxyUrl, ...PROXY_CANDIDATES] : PROXY_CANDIDATES;
    // de-dupe
    const seen = new Set<string>();
    for (const p of proxies) {
      if (seen.has(p)) continue;
      seen.add(p);
      urlsToTry.push(proxyWrap(p, url));
    }
  }

  let lastErr: any = null;
  for (const u of urlsToTry) {
    try {
      const res = await fetch(u);
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status}`);
        continue;
      }
      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        lastErr = new Error('Invalid JSON response (possible CORS block or proxy error).');
        continue;
      }
      return data as T;
    } catch (e: any) {
      lastErr = e;
      // network/CORS failure -> try next
      continue;
    }
  }
  const msg = lastErr?.message || 'Failed to fetch';
  if (/failed to fetch/i.test(msg) || lastErr?.name === 'TypeError') {
    throw new Error(
      'Network/CORS error: could not reach the server. On web, set a working CORS proxy (or run on native). ' +
        'Original: ' + msg
    );
  }
  throw new Error(msg);
}

export const xtream = {
  normalizeServer,

  async login(creds: XtreamCredentials): Promise<LoginResult> {
    const url = buildUrl(creds.server, '/player_api.php', {
      username: creds.username,
      password: creds.password,
    });
    const data = await fetchJson<any>(url);
    if (!data || !data.user_info) throw new Error('Login failed: invalid response');
    return data as LoginResult;
  },

  async getLiveCategories(creds: XtreamCredentials): Promise<Category[]> {
    const url = buildUrl(creds.server, '/player_api.php', {
      username: creds.username,
      password: creds.password,
      action: 'get_live_categories',
    });
    return fetchJson<Category[]>(url);
  },

  async getLiveStreams(creds: XtreamCredentials, categoryId?: string): Promise<LiveStream[]> {
    const params: Record<string, string | number> = {
      username: creds.username,
      password: creds.password,
      action: 'get_live_streams',
    };
    if (categoryId) params.category_id = categoryId;
    const url = buildUrl(creds.server, '/player_api.php', params);
    return fetchJson<LiveStream[]>(url);
  },

  async getVodCategories(creds: XtreamCredentials): Promise<Category[]> {
    const url = buildUrl(creds.server, '/player_api.php', {
      username: creds.username,
      password: creds.password,
      action: 'get_vod_categories',
    });
    return fetchJson<Category[]>(url);
  },

  async getVodStreams(creds: XtreamCredentials, categoryId?: string): Promise<VodStream[]> {
    const params: Record<string, string | number> = {
      username: creds.username,
      password: creds.password,
      action: 'get_vod_streams',
    };
    if (categoryId) params.category_id = categoryId;
    const url = buildUrl(creds.server, '/player_api.php', params);
    return fetchJson<VodStream[]>(url);
  },

  async getVodInfo(creds: XtreamCredentials, vodId: number): Promise<VodInfo> {
    const url = buildUrl(creds.server, '/player_api.php', {
      username: creds.username,
      password: creds.password,
      action: 'get_vod_info',
      vod_id: vodId,
    });
    return fetchJson<VodInfo>(url);
  },

  async getSeriesCategories(creds: XtreamCredentials): Promise<Category[]> {
    const url = buildUrl(creds.server, '/player_api.php', {
      username: creds.username,
      password: creds.password,
      action: 'get_series_categories',
    });
    return fetchJson<Category[]>(url);
  },

  async getSeries(creds: XtreamCredentials, categoryId?: string): Promise<Series[]> {
    const params: Record<string, string | number> = {
      username: creds.username,
      password: creds.password,
      action: 'get_series',
    };
    if (categoryId) params.category_id = categoryId;
    const url = buildUrl(creds.server, '/player_api.php', params);
    return fetchJson<Series[]>(url);
  },

  async getSeriesInfo(creds: XtreamCredentials, seriesId: number): Promise<SeriesInfo> {
    const url = buildUrl(creds.server, '/player_api.php', {
      username: creds.username,
      password: creds.password,
      action: 'get_series_info',
      series_id: seriesId,
    });
    return fetchJson<SeriesInfo>(url);
  },

  liveUrl(creds: XtreamCredentials, streamId: number, ext = 'm3u8'): string {
    const base = normalizeServer(creds.server);
    // Return raw URL (no CORS proxy) — HTML5 <video> plays cross-origin media
    // without CORS, and proxies break HTTP range requests / streaming.
    return `${base}/live/${creds.username}/${creds.password}/${streamId}.${ext}`;
  },

  vodUrl(creds: XtreamCredentials, streamId: number, ext: string): string {
    const base = normalizeServer(creds.server);
    return `${base}/movie/${creds.username}/${creds.password}/${streamId}.${ext || 'mp4'}`;
  },

  // Browser-playable container extensions (in priority order).
  // m3u8 (HLS) first since most IPTV servers transcode to HLS on request;
  // then mp4, then ts, then webm.
  BROWSER_EXTS: ['m3u8', 'mp4', 'ts', 'webm'] as string[],

  // Non-browser formats that commonly cause DEMUXER_ERROR_COULD_NOT_PARSE.
  NON_BROWSER_EXTS: ['mkv', 'avi', 'flv', 'wmv', 'mov', 'mpg', 'mpeg'] as string[],

  // Build candidate URLs for a VOD stream trying multiple container extensions.
  vodCandidates(creds: XtreamCredentials, streamId: number, ext: string): string[] {
    const base = normalizeServer(creds.server);
    const exts = new Set<string>();
    // original first
    if (ext) exts.add(ext);
    // then browser-friendly
    for (const e of this.BROWSER_EXTS) exts.add(e);
    return [...exts].map((e) => `${base}/movie/${creds.username}/${creds.password}/${streamId}.${e}`);
  },

  // Probe candidate URLs and return the first that responds with a video content-type
  // (or at least an OK status). Falls back to the original URL if none probe OK.
  async getPlaybackUrl(creds: XtreamCredentials, streamId: number, ext: string): Promise<string> {
    const candidates = this.vodCandidates(creds, streamId, ext);
    if (Platform.OS !== 'web') return candidates[0];
    for (const u of candidates) {
      try {
        // Use a range request to avoid downloading the whole file; some servers
        // ignore HEAD, so GET with Range is more reliable.
        const res = await fetch(u, { method: 'GET', headers: { Range: 'bytes=0-1023' } });
        if (!res.ok && res.status !== 206) continue;
        const ct = (res.headers.get('content-type') || '').toLowerCase();
        // Accept if content-type looks like video or octet-stream; reject obvious HTML/error pages.
        if (ct.includes('text/html') || ct.includes('application/json')) continue;
        // Drain body to free connection.
        try { await res.arrayBuffer(); } catch {}
        return u;
      } catch {
        continue;
      }
    }
    return candidates[0];
  },

  seriesUrl(creds: XtreamCredentials, episodeId: string, ext: string): string {
    const base = normalizeServer(creds.server);
    return `${base}/series/${creds.username}/${creds.password}/${episodeId}.${ext || 'mp4'}`;
  },

  seriesCandidates(creds: XtreamCredentials, episodeId: string, ext: string): string[] {
    const base = normalizeServer(creds.server);
    const exts = new Set<string>();
    if (ext) exts.add(ext);
    for (const e of this.BROWSER_EXTS) exts.add(e);
    return [...exts].map((e) => `${base}/series/${creds.username}/${creds.password}/${episodeId}.${e}`);
  },

  async getSeriesPlaybackUrl(creds: XtreamCredentials, episodeId: string, ext: string): Promise<string> {
    const candidates = this.seriesCandidates(creds, episodeId, ext);
    if (Platform.OS !== 'web') return candidates[0];
    for (const u of candidates) {
      try {
        const res = await fetch(u, { method: 'GET', headers: { Range: 'bytes=0-1023' } });
        if (!res.ok && res.status !== 206) continue;
        const ct = (res.headers.get('content-type') || '').toLowerCase();
        if (ct.includes('text/html') || ct.includes('application/json')) continue;
        try { await res.arrayBuffer(); } catch {}
        return u;
      } catch {
        continue;
      }
    }
    return candidates[0];
  },

  // Live streams: try m3u8 first, then ts.
  liveCandidates(creds: XtreamCredentials, streamId: number): string[] {
    const base = normalizeServer(creds.server);
    return [
      `${base}/live/${creds.username}/${creds.password}/${streamId}.m3u8`,
      `${base}/live/${creds.username}/${creds.password}/${streamId}.ts`,
    ];
  },
};
