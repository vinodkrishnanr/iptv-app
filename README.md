# IPTV Player (Expo + React Native)

Cross-platform IPTV app (Android, iOS, Web) using the Xtream Codes API. Single codebase.

## Features
- Login with server URL, username, password
- Live TV (categories + streams)
- Movies / VOD (categories + streams)
- Series (categories, seasons, episodes)
- In-app video player (expo-video, HLS supported)
- CORS proxy support for web (configurable on login screen, with automatic fallbacks)
- Search with regex + exact-match toggle

## Run
```bash
cd iptv-app
npm install
npm run web        # web at http://localhost:8081
npm run android    # Android (requires emulator/device)
npm run ios        # iOS (macOS only)
```

## Troubleshooting "Failed to fetch"
On web, browsers block cross-origin requests to most Xtream servers. The app tries a direct
request first, then falls back through several CORS proxies. If it still fails:
- Try a different CORS proxy URL in the field on the login screen
- Leave the proxy field empty to attempt a direct request (works only if the server sends CORS)
- Run on native instead: `npm run android`
- Ensure the server URL includes `http://` or `https://`
- Note: an `http://` server cannot be reached from an `https://` web page (mixed content)

## Playback shows nothing / black screen
- On **web**, video URLs are now played **directly** (not through the CORS proxy) because proxies break HTTP range requests / streaming. If your page is served over HTTPS and the server is HTTP (mixed content), the browser will block it — run the dev server over HTTP or use the "Retry with proxy" button in the player.
- The player screen shows **Status**, any **error message**, the **URL being played**, and buttons to **Open in new tab** and **Retry with proxy**.
- If the file is `.mkv`/`.avi`/`.ts`, your browser may not support it — try "Open in new tab" to confirm. Native builds (Android/iOS) play most formats.

Credentials are stored locally via AsyncStorage.
