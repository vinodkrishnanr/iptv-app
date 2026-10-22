import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { VideoView, useVideoPlayer } from 'expo-video';
import { xtream, setProxy, wrapProxy } from './src/xtream';
import { saveCredentials, loadCredentials, clearCredentials, saveProxy, loadProxy } from './src/storage';
import WebPlayer from './src/WebPlayer';
import { matchesSearch } from './src/search';
import type {
  XtreamCredentials,
  LoginResult,
  Category,
  LiveStream,
  VodStream,
  Series,
  SeriesInfo,
  Episode,
  Screen,
} from './src/types';

const COLORS = {
  bg: '#0f1115',
  card: '#1a1d24',
  accent: '#e50914',
  text: '#ffffff',
  muted: '#9aa0a6',
  border: '#2a2e36',
};

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'login' });
  const [creds, setCreds] = useState<XtreamCredentials | null>(null);
  const [loginResult, setLoginResult] = useState<LoginResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // login form
  const [server, setServer] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [proxy, setProxyState] = useState('');

  useEffect(() => {
    (async () => {
      const c = await loadCredentials();
      const p = await loadProxy();
      if (p) {
        setProxyState(p);
        setProxy(p);
      } else if (Platform.OS === 'web') {
        // default proxy for web to bypass CORS in dev
        setProxyState('https://corsproxy.io/?');
        setProxy('https://corsproxy.io/?');
      }
      if (c) {
        setServer(c.server);
        setUsername(c.username);
        setPassword(c.password);
        setCreds(c);
        // auto-login
        try {
          setLoading(true);
          const r = await xtream.login(c);
          setLoginResult(r);
          setScreen({ name: 'home' });
        } catch (e: any) {
          setError(e?.message || 'Auto-login failed');
        } finally {
          setLoading(false);
        }
      }
    })();
  }, []);

  const handleLogin = useCallback(async () => {
    setError(null);
    if (!server || !username || !password) {
      setError('Please fill all fields');
      return;
    }
    const c: XtreamCredentials = { server, username, password };
    setLoading(true);
    try {
      setProxy(proxy || null);
      const r = await xtream.login(c);
      await saveCredentials(c);
      await saveProxy(proxy || null);
      setProxy(proxy || null);
      setCreds(c);
      setLoginResult(r);
      setScreen({ name: 'home' });
    } catch (e: any) {
      setError(e?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }, [server, username, password, proxy]);

  const handleLogout = useCallback(async () => {
    await clearCredentials();
    setCreds(null);
    setLoginResult(null);
    setScreen({ name: 'login' });
  }, []);

  if (screen.name === 'login') {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.loginScroll}>
          <Text style={styles.title}>IPTV Player</Text>
          <Text style={styles.subtitle}>Sign in with your Xtream credentials</Text>
          <TextInput
            style={styles.input}
            placeholder="Server URL (e.g. http://example.com:8080)"
            placeholderTextColor={COLORS.muted}
            value={server}
            onChangeText={setServer}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor={COLORS.muted}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={COLORS.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            placeholder="CORS proxy (web only, optional)"
            placeholderTextColor={COLORS.muted}
            value={proxy}
            onChangeText={setProxyState}
            autoCapitalize="none"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
          </TouchableOpacity>
          <Text style={styles.hint}>
            Tip: On web, Xtream servers usually lack CORS headers. A proxy (default corsproxy.io) is used.
          </Text>
        </ScrollView>
      </View>
    );
  }

  if (!creds) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No credentials</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {screen.name === 'home' && (
        <HomeScreen
          creds={creds}
          loginResult={loginResult}
          onNavigate={(s) => setScreen(s)}
          onLogout={handleLogout}
        />
      )}
      {screen.name === 'live' && (
        <LiveScreen
          creds={creds}
          categoryId={screen.categoryId}
          onBack={() => setScreen({ name: 'home' })}
          onPlay={(url, title) => setScreen({ name: 'player', url, title })}
        />
      )}
      {screen.name === 'vod' && (
        <VodScreen
          creds={creds}
          categoryId={screen.categoryId}
          onBack={() => setScreen({ name: 'home' })}
          onPlay={(url, title) => setScreen({ name: 'player', url, title })}
        />
      )}
      {screen.name === 'series' && (
        <SeriesScreen
          creds={creds}
          categoryId={screen.categoryId}
          onBack={() => setScreen({ name: 'home' })}
          onOpenSeries={(id) => setScreen({ name: 'seriesDetail', seriesId: id })}
        />
      )}
      {screen.name === 'seriesDetail' && (
        <SeriesDetailScreen
          creds={creds}
          seriesId={screen.seriesId}
          onBack={() => setScreen({ name: 'series' })}
          onPlay={(url, title) => setScreen({ name: 'player', url, title })}
        />
      )}
      {screen.name === 'player' && (
        <PlayerScreen
          url={screen.url}
          title={screen.title}
          onBack={() => setScreen({ name: 'home' })}
          creds={creds}
        />
      )}
    </View>
  );
}

// ---------- Home ----------
function HomeScreen({
  creds,
  loginResult,
  onNavigate,
  onLogout,
}: {
  creds: XtreamCredentials;
  loginResult: LoginResult | null;
  onNavigate: (s: Screen) => void;
  onLogout: () => void;
}) {
  const ui = loginResult?.user_info;
  return (
    <ScrollView contentContainerStyle={styles.homeScroll}>
      <View style={styles.homeHeader}>
        <Text style={styles.title}>IPTV Player</Text>
        <TouchableOpacity onPress={onLogout}>
          <Text style={styles.link}>Logout</Text>
        </TouchableOpacity>
      </View>
      {ui && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account</Text>
          <Text style={styles.text}>User: {ui.username}</Text>
          <Text style={styles.text}>Status: {ui.status}</Text>
          <Text style={styles.text}>Expires: {ui.exp_date ? new Date(Number(ui.exp_date) * 1000).toLocaleDateString() : 'N/A'}</Text>
          <Text style={styles.text}>Max connections: {ui.max_connections}</Text>
        </View>
      )}
      <View style={styles.grid}>
        <TouchableOpacity style={styles.tile} onPress={() => onNavigate({ name: 'live' })}>
          <Text style={styles.tileText}>📺 Live TV</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tile} onPress={() => onNavigate({ name: 'vod' })}>
          <Text style={styles.tileText}>🎬 Movies (VOD)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tile} onPress={() => onNavigate({ name: 'series' })}>
          <Text style={styles.tileText}>🎞️ Series</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ---------- Live ----------
function LiveScreen({
  creds,
  categoryId,
  onBack,
  onPlay,
}: {
  creds: XtreamCredentials;
  categoryId?: string;
  onBack: () => void;
  onPlay: (url: string, title: string) => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCat, setSelectedCat] = useState<string | undefined>(categoryId);
  const [query, setQuery] = useState('');
  const [exact, setExact] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const cats = await xtream.getLiveCategories(creds);
        setCategories(cats || []);
        const s = await xtream.getLiveStreams(creds, selectedCat);
        setStreams(s || []);
      } catch (e: any) {
        setError(e?.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [creds, selectedCat]);

  const loadCat = (id?: string) => setSelectedCat(id);
  const filtered = streams.filter((s) => matchesSearch(s.name, query, exact));

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack}><Text style={styles.link}>← Back</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Live TV</Text>
      </View>
      <ScrollView horizontal style={styles.catScroll} contentContainerStyle={{ paddingHorizontal: 8 }}>
        <TouchableOpacity style={[styles.catChip, !selectedCat && styles.catChipActive]} onPress={() => loadCat(undefined)}>
          <Text style={styles.catChipText}>All</Text>
        </TouchableOpacity>
        {categories.map((c) => (
          <TouchableOpacity
            key={c.category_id}
            style={[styles.catChip, selectedCat === c.category_id && styles.catChipActive]}
            onPress={() => loadCat(c.category_id)}
          >
            <Text style={styles.catChipText}>{c.category_name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search (regex supported)..."
          placeholderTextColor={COLORS.muted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.exactToggle} onPress={() => setExact(!exact)}>
          <Text style={[styles.exactText, exact && styles.exactTextActive]}>{exact ? '☑' : '☐'} Exact</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.accent} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => String(i.stream_id)}
          numColumns={2}
          contentContainerStyle={{ padding: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.streamCard}
              onPress={() => onPlay(xtream.liveUrl(creds, item.stream_id), item.name)}
            >
              {item.stream_icon ? (
                <Image source={{ uri: item.stream_icon }} style={styles.streamIcon} />
              ) : (
                <View style={[styles.streamIcon, { backgroundColor: COLORS.card }]} />
              )}
              <Text style={styles.streamName} numberOfLines={2}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

// ---------- VOD ----------
function VodScreen({
  creds,
  categoryId,
  onBack,
  onPlay,
}: {
  creds: XtreamCredentials;
  categoryId?: string;
  onBack: () => void;
  onPlay: (url: string, title: string) => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [streams, setStreams] = useState<VodStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCat, setSelectedCat] = useState<string | undefined>(categoryId);
  const [query, setQuery] = useState('');
  const [exact, setExact] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const cats = await xtream.getVodCategories(creds);
        setCategories(cats || []);
        const s = await xtream.getVodStreams(creds, selectedCat);
        setStreams(s || []);
      } catch (e: any) {
        setError(e?.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [creds, selectedCat]);
  const filtered = streams.filter((s) => matchesSearch(s.name, query, exact));

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack}><Text style={styles.link}>← Back</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Movies</Text>
      </View>
      <ScrollView horizontal style={styles.catScroll} contentContainerStyle={{ paddingHorizontal: 8 }}>
        <TouchableOpacity style={[styles.catChip, !selectedCat && styles.catChipActive]} onPress={() => setSelectedCat(undefined)}>
          <Text style={styles.catChipText}>All</Text>
        </TouchableOpacity>
        {categories.map((c) => (
          <TouchableOpacity
            key={c.category_id}
            style={[styles.catChip, selectedCat === c.category_id && styles.catChipActive]}
            onPress={() => setSelectedCat(c.category_id)}
          >
            <Text style={styles.catChipText}>{c.category_name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search (regex supported)..."
          placeholderTextColor={COLORS.muted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.exactToggle} onPress={() => setExact(!exact)}>
          <Text style={[styles.exactText, exact && styles.exactTextActive]}>{exact ? '☑' : '☐'} Exact</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.accent} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => String(i.stream_id)}
          numColumns={2}
          contentContainerStyle={{ padding: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.streamCard}
              onPress={async () => {
                 const url = await xtream.getPlaybackUrl(creds, item.stream_id, item.container_extension);
                 onPlay(url, item.name);
               }}
            >
              {item.stream_icon ? (
                <Image source={{ uri: item.stream_icon }} style={styles.streamIcon} />
              ) : (
                <View style={[styles.streamIcon, { backgroundColor: COLORS.card }]} />
              )}
              <Text style={styles.streamName} numberOfLines={2}>{item.name}</Text>
              {item.rating ? <Text style={styles.rating}>★ {item.rating}</Text> : null}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

// ---------- Series ----------
function SeriesScreen({
  creds,
  categoryId,
  onBack,
  onOpenSeries,
}: {
  creds: XtreamCredentials;
  categoryId?: string;
  onBack: () => void;
  onOpenSeries: (id: number) => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCat, setSelectedCat] = useState<string | undefined>(categoryId);
  const [query, setQuery] = useState('');
  const [exact, setExact] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const cats = await xtream.getSeriesCategories(creds);
        setCategories(cats || []);
        const s = await xtream.getSeries(creds, selectedCat);
        setSeries(s || []);
      } catch (e: any) {
        setError(e?.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [creds, selectedCat]);
  const filtered = series.filter((s) => matchesSearch(s.name, query, exact));

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack}><Text style={styles.link}>← Back</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Series</Text>
      </View>
      <ScrollView horizontal style={styles.catScroll} contentContainerStyle={{ paddingHorizontal: 8 }}>
        <TouchableOpacity style={[styles.catChip, !selectedCat && styles.catChipActive]} onPress={() => setSelectedCat(undefined)}>
          <Text style={styles.catChipText}>All</Text>
        </TouchableOpacity>
        {categories.map((c) => (
          <TouchableOpacity
            key={c.category_id}
            style={[styles.catChip, selectedCat === c.category_id && styles.catChipActive]}
            onPress={() => setSelectedCat(c.category_id)}
          >
            <Text style={styles.catChipText}>{c.category_name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search (regex supported)..."
          placeholderTextColor={COLORS.muted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.exactToggle} onPress={() => setExact(!exact)}>
          <Text style={[styles.exactText, exact && styles.exactTextActive]}>{exact ? '☑' : '☐'} Exact</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.accent} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => String(i.series_id)}
          numColumns={2}
          contentContainerStyle={{ padding: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.streamCard} onPress={() => onOpenSeries(item.series_id)}>
              {item.cover ? (
                <Image source={{ uri: item.cover }} style={styles.streamIcon} />
              ) : (
                <View style={[styles.streamIcon, { backgroundColor: COLORS.card }]} />
              )}
              <Text style={styles.streamName} numberOfLines={2}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

// ---------- Series Detail ----------
function SeriesDetailScreen({
  creds,
  seriesId,
  onBack,
  onPlay,
}: {
  creds: XtreamCredentials;
  seriesId: number;
  onBack: () => void;
  onPlay: (url: string, title: string) => void;
}) {
  const [info, setInfo] = useState<SeriesInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [exact, setExact] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const i = await xtream.getSeriesInfo(creds, seriesId);
        setInfo(i);
      } catch (e: any) {
        setError(e?.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [creds, seriesId]);

  if (loading) return <View style={styles.container}><ActivityIndicator style={{ marginTop: 40 }} color={COLORS.accent} /></View>;
  if (error) return <View style={styles.container}><Text style={styles.error}>{error}</Text></View>;
  if (!info) return null;

  const episodesBySeason = info.episodes || {};

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 12 }}>
      <TouchableOpacity onPress={onBack}><Text style={styles.link}>← Back</Text></TouchableOpacity>
      <Text style={styles.headerTitle}>{info.info?.name}</Text>
      {info.info?.cover ? <Image source={{ uri: info.info.cover }} style={styles.cover} /> : null}
      {info.info?.plot ? <Text style={styles.text}>{info.info.plot}</Text> : null}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search episodes (regex supported)..."
          placeholderTextColor={COLORS.muted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.exactToggle} onPress={() => setExact(!exact)}>
          <Text style={[styles.exactText, exact && styles.exactTextActive]}>{exact ? '☑' : '☐'} Exact</Text>
        </TouchableOpacity>
      </View>
      {Object.keys(episodesBySeason).map((season) => {
        const eps = (episodesBySeason[season] || []).filter((ep: Episode) =>
          matchesSearch(`${ep.title} E${ep.episode_num}`, query, exact)
        );
        if (eps.length === 0 && query.trim()) return null;
        return (
          <View key={season} style={{ marginTop: 12 }}>
            <Text style={styles.sectionTitle}>Season {season}</Text>
            {eps.map((ep: Episode) => (
              <TouchableOpacity
                key={ep.id}
                style={styles.episodeRow}
                onPress={async () => {
                  const url = await xtream.getSeriesPlaybackUrl(creds, ep.id, ep.container_extension);
                  onPlay(url, `${info.info?.name} - S${season}E${ep.episode_num}`)
                }}
              >
                <Text style={styles.text}>
                  E{ep.episode_num}: {ep.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

// ---------- Player ----------
function PlayerScreen({ url, title, onBack, creds }: { url: string; title: string; onBack: () => void; creds: XtreamCredentials | null }) {
  const [status, setStatus] = useState<string>('loading');
  const [error, setError] = useState<string | null>(null);
  const [useProxy, setUseProxy] = useState(false);
  const playerUrl = useProxy ? wrapProxy(url) : url;

  const player = useVideoPlayer(playerUrl, (p) => {
    p.play();
  });

  useEffect(() => {
    const sub = player.addListener('statusChange', (e: any) => {
      setStatus(e.status);
      if (e.error) setError(e.error.message || String(e.error));
      else if (e.status !== 'error') setError(null);
    });
    return () => sub.remove();
  }, [player]);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack}><Text style={styles.link}>← Back</Text></TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
      </View>
      <View style={{ flex: 1, justifyContent: 'center', padding: 12 }}>
        {Platform.OS === 'web' ? (
          <View style={{ flex: 1 }}>
            <WebPlayer url={playerUrl} onStatus={setStatus} onError={(e) => setError(e)} />
          </View>
        ) : (
          <VideoView
            player={player}
            style={styles.video}
            contentFit="contain"
            nativeControls
          />
        )}
        <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 8 }}>Status: {status}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={{ color: COLORS.muted, fontSize: 11, marginTop: 8 }} numberOfLines={3}>{playerUrl}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {Platform.OS === 'web' && (
            <TouchableOpacity style={styles.button} onPress={() => {
              try { window.open(playerUrl, '_blank'); } catch {}
            }}>
              <Text style={styles.buttonText}>Open in new tab</Text>
            </TouchableOpacity>
          )}
          {Platform.OS === 'web' && (
            <TouchableOpacity style={styles.button} onPress={() => {
              try { (navigator as any).clipboard?.writeText(playerUrl); } catch {}
            }}>
              <Text style={styles.buttonText}>Copy URL</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.button} onPress={() => setUseProxy(!useProxy)}>
            <Text style={styles.buttonText}>{useProxy ? 'Use direct URL' : 'Retry with proxy'}</Text>
          </TouchableOpacity>
        </View>
        {Platform.OS === 'web' && (
          <Text style={styles.hint}>
            On web, browsers only decode HLS (m3u8) and MP4 (H.264). MKV/AVI/HEVC won't play in-browser. The app tries m3u8/mp4/ts/webm variants. If it still fails: copy the URL and open in VLC, or run on Android (npm run android) where all formats play.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loginScroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: COLORS.muted, marginBottom: 24 },
  input: {
    backgroundColor: COLORS.card,
    color: COLORS.text,
    padding: 14,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  button: {
    backgroundColor: COLORS.accent,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  error: { color: '#ff6b6b', marginBottom: 12 },
  hint: { color: COLORS.muted, fontSize: 12, marginTop: 16, textAlign: 'center' },
  text: { color: COLORS.text, fontSize: 14 },
  link: { color: COLORS.accent, fontSize: 16 },
  homeScroll: { padding: 16 },
  homeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  card: { backgroundColor: COLORS.card, padding: 16, borderRadius: 12, marginBottom: 16 },
  cardTitle: { color: COLORS.text, fontWeight: 'bold', marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    backgroundColor: COLORS.card,
    padding: 24,
    borderRadius: 12,
    width: '48%',
    alignItems: 'center',
    marginBottom: 12,
  },
  tileText: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  topBar: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', flex: 1 },
  catScroll: { maxHeight: 44, marginBottom: 8 },
  catChip: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  catChipText: { color: COLORS.text, fontSize: 13 },
  streamCard: { flex: 1, margin: 6, backgroundColor: COLORS.card, borderRadius: 10, padding: 8 },
  streamIcon: { width: '100%', height: 120, borderRadius: 8, resizeMode: 'cover' },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, marginBottom: 8, gap: 8 },
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.card,
    color: COLORS.text,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  exactToggle: { paddingHorizontal: 8, paddingVertical: 10 },
  exactText: { color: COLORS.muted, fontSize: 13 },
  exactTextActive: { color: COLORS.accent, fontWeight: 'bold' },
  streamName: { color: COLORS.text, fontSize: 13, marginTop: 6 },
  rating: { color: '#ffd700', fontSize: 12, marginTop: 2 },
  cover: { width: '100%', height: 200, borderRadius: 8, resizeMode: 'cover', marginVertical: 12 },
  sectionTitle: { color: COLORS.text, fontSize: 16, fontWeight: 'bold', marginTop: 8 },
  episodeRow: { padding: 10, backgroundColor: COLORS.card, borderRadius: 8, marginTop: 6 },
  video: { width: '100%', height: 300 },
});