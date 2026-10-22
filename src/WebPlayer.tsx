import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Linking } from 'react-native';
import Hls from 'hls.js';

type Props = {
  url: string;
  onStatus?: (s: string) => void;
  onError?: (e: string) => void;
};

export default function WebPlayer({ url, onStatus, onError }: Props) {
  const containerRef = useRef<any>(null);
  const [status, setStatus] = useState('loading');
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const container = containerRef.current;
    if (!container || !url) return;

    setStatus('loading');
    setErrMsg('');
    onStatus?.('loading');

    const video = document.createElement('video');
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    video.muted = false;
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.backgroundColor = '#000';
    video.style.objectFit = 'contain';
    container.appendChild(video);

    let hls: Hls | null = null;
    const isHls = /\.m3u8(\?|$)/i.test(url);

    const report = (s: string, e?: string) => {
      setStatus(s);
      onStatus?.(s);
      if (e) { setErrMsg(e); onError?.(e); }
    };

    const onLoaded = () => report('readyToPlay');
    const onErr = () => {
      const msg = video.error ? `MEDIA_ERROR code=${video.error.code}: ${video.error.message}` : 'Format error';
      report('error', msg);
    };

    if (isHls && Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: true, backBufferLength: 90 });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        report('readyToPlay');
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          report('error', `HLS ${data.type}: ${data.details}`);
        }
      });
    } else if (isHls && video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      video.addEventListener('loadedmetadata', onLoaded);
      video.addEventListener('error', onErr);
      video.play().catch(() => {});
    } else {
      video.src = url;
      video.addEventListener('loadeddata', onLoaded);
      video.addEventListener('error', onErr);
      video.play().catch(() => {});
    }

    return () => {
      try {
        if (hls) hls.destroy();
        video.pause();
        video.removeAttribute('src');
        video.load();
        if (container.contains(video)) container.removeChild(video);
      } catch {}
    };
  }, [url]);

  const openExternal = () => {
    if (Platform.OS === 'web') {
      // Try VLC protocol first, fall back to new tab.
      const vlcUrl = `vlc://${url}`;
      window.open(vlcUrl, '_blank');
      setTimeout(() => window.open(url, '_blank'), 500);
    } else {
      Linking.openURL(url).catch(() => {});
    }
  };

  return (
    <View style={styles.wrap}>
      <View ref={containerRef} style={styles.videoBox} />
      {status === 'error' && (
        <View style={styles.errBox}>
          <Text style={styles.errText}>{errMsg || 'Playback failed'}</Text>
          <Text style={styles.hint}>
            This format may not be supported by the browser. Try "Open in external player (VLC)" or run on Android.
          </Text>
          <TouchableOpacity style={styles.btn} onPress={openExternal}>
            <Text style={styles.btnText}>Open in external player (VLC)</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#000' },
  videoBox: { flex: 1, backgroundColor: '#000' },
  errBox: { position: 'absolute', bottom: 10, left: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.8)', padding: 12, borderRadius: 8 },
  errText: { color: '#ff6b6b', fontWeight: 'bold', marginBottom: 6 },
  hint: { color: '#ccc', fontSize: 12, marginBottom: 8 },
  btn: { backgroundColor: '#e50914', padding: 10, borderRadius: 6, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' },
});
