import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Linking, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { setAudioModeAsync } from 'expo-audio';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';
import type { ShouldStartLoadRequest, WebViewNavigation } from 'react-native-webview/lib/WebViewTypes';

import { HOME_URL, INBOX_PATH, decide, pathOf, viewerKind } from './config/rules.ts';
import { buildGuardScript, type GuardMessage } from './injected/guardScript.ts';
import { useMessageNotifications } from './useMessageNotifications';
import ErrorState from './ui/ErrorState';
import LoadingBar from './ui/LoadingBar';
import Notice from './ui/Notice';
import NotificationSetupSheet from './ui/NotificationSetupSheet';
import ReelEndSheet from './ui/ReelEndSheet';
import ViewerHeader from './ui/ViewerHeader';
import { palette } from './ui/theme';

const GUARD_SCRIPT = buildGuardScript();

// iOS: WebView video uses the app's audio session, which is muted by the
// silent switch by default. Use playback audio like any video app; pause
// other apps' music while a reel plays.
setAudioModeAsync({
  playsInSilentMode: true,
  interruptionMode: 'doNotMix',
  shouldPlayInBackground: false,
}).catch(() => {});

export default function InstagramScreen() {
  // `WebView<object>`: the default generic (`undefined`) collapses the props type to `never`.
  const webview = useRef<WebView<object>>(null);
  const insets = useSafeAreaInsets();

  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [videoEnded, setVideoEnded] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [path, setPath] = useState(INBOX_PATH);

  const viewer = viewerKind(path);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2200);
    return () => clearTimeout(t);
  }, [notice]);

  const inject = useCallback((js: string) => webview.current?.injectJavaScript(`${js}; true;`), []);

  const onRoute = useCallback((url: string) => {
    const p = pathOf(url);
    setPath(p);
    if (!viewerKind(p)) setVideoEnded(false);
  }, []);

  /** Back to the chat the post/reel came from; the inbox if there's no history. */
  const goBack = useCallback(() => {
    setVideoEnded(false);
    if (canGoBack) webview.current?.goBack();
    else inject(`location.assign(${JSON.stringify(INBOX_PATH)})`);
  }, [canGoBack, inject]);

  // Android system Back walks WebView history; exits only at the root.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack && !videoEnded && !viewer) return false;
      goBack();
      return true;
    });
    return () => sub.remove();
  }, [canGoBack, videoEnded, viewer, goBack]);

  const onShouldStartLoadWithRequest = useCallback(
    (req: ShouldStartLoadRequest) => {
      const d = decide(req.url, req.isTopFrame ?? true);
      switch (d.action) {
        case 'allow':
          return true;
        case 'redirect':
          if (d.why !== 'single reel via feed URL') setNotice(`${d.why} isn't part of InstaDirect`);
          inject(`location.replace(${JSON.stringify(d.to)})`);
          return false;
        case 'external':
          Linking.openURL(d.url).catch(() => setNotice("Couldn't open that link"));
          return false;
        case 'block':
          return false;
      }
    },
    [inject],
  );

  const onMessage = useCallback(
    (e: WebViewMessageEvent) => {
      let msg: GuardMessage;
      try {
        msg = JSON.parse(e.nativeEvent.data);
      } catch {
        return;
      }
      switch (msg.type) {
        case 'blocked':
          if (msg.why !== 'auto-advance' && msg.why !== 'single reel via feed URL') {
            setNotice(`${msg.why} isn't part of InstaDirect`);
          }
          break;
        case 'reelEnded':
          setVideoEnded(true);
          break;
        case 'reelPlaying':
          setVideoEnded(false);
          break;
        case 'route':
          onRoute(msg.url);
          break;
      }
    },
    [onRoute],
  );

  const onNavigationStateChange = useCallback(
    (nav: WebViewNavigation) => {
      setCanGoBack(nav.canGoBack);
      onRoute(nav.url);
    },
    [onRoute],
  );

  const replay = useCallback(() => {
    setVideoEnded(false);
    inject('window.__instadirect && window.__instadirect.replay()');
  }, [inject]);

  const renderError = useCallback(
    (_domain: string | undefined, _code: number, description: string) => (
      <ErrorState description={description} onRetry={() => webview.current?.reload()} />
    ),
    [],
  );

  const source = useMemo(() => ({ uri: HOME_URL }), []);

  // Android: message notifications forwarded from the official Instagram app.
  const onNotificationsEnabled = useCallback(() => setNotice('Message notifications are on'), []);
  const setup = useMessageNotifications(onNotificationsEnabled);

  // Tapping a forwarded notification opens instadirect://direct/inbox.
  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      if (!url.startsWith('instadirect://')) return;
      setVideoEnded(false);
      inject(`location.assign(${JSON.stringify(INBOX_PATH)})`);
    });
    return () => sub.remove();
  }, [inject]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style="light" />

      {viewer && <ViewerHeader title={viewer === 'reel' ? 'Reel' : 'Post'} onBack={goBack} />}

      <View style={styles.content}>
        <WebView<object>
          ref={webview}
          source={source}
          originWhitelist={['*']}
          onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
          injectedJavaScriptBeforeContentLoaded={GUARD_SCRIPT}
          // Re-run after load in case the early injection was skipped (it's idempotent).
          injectedJavaScript={GUARD_SCRIPT}
          injectedJavaScriptForMainFrameOnly
          injectedJavaScriptBeforeContentLoadedForMainFrameOnly
          onMessage={onMessage}
          onNavigationStateChange={onNavigationStateChange}
          onLoadStart={() => {
            setLoading(true);
            setProgress(0);
          }}
          onLoadProgress={(e) => setProgress(e.nativeEvent.progress)}
          onLoadEnd={() => setLoading(false)}
          renderError={renderError}
          onContentProcessDidTerminate={() => webview.current?.reload()}
          onRenderProcessGone={() => {
            webview.current?.reload();
            return true;
          }}
          // Session persistence: keep the default persistent cookie store.
          incognito={false}
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          domStorageEnabled
          cacheEnabled
          // Media: inline playback, no autoplay without a tap.
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction
          mediaCapturePermissionGrantType="prompt"
          // Keep everything in this one WebView so our rules apply.
          setSupportMultipleWindows={false}
          javaScriptCanOpenWindowsAutomatically={false}
          // Native feel: edge-swipe back, no link previews popping over the UI.
          allowsBackForwardNavigationGestures
          pullToRefreshEnabled={!viewer}
          allowsLinkPreview={false}
          overScrollMode="never"
          // Viewer pages don't scroll at all (also enforced inside the page).
          bounces={!viewer}
          // Dark theme: iOS follows app.json `userInterfaceStyle`; Android needs this.
          forceDarkOn
          webviewDebuggingEnabled={__DEV__}
          style={styles.webview}
          containerStyle={styles.webview}
        />

        <LoadingBar progress={progress} visible={loading} />
        <Notice text={notice} />
        <ReelEndSheet visible={videoEnded} onBack={goBack} onReplay={replay} />
        <NotificationSetupSheet step={viewer ? null : setup.step} onPrimary={setup.primary} onDismiss={setup.dismiss} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  content: { flex: 1 },
  webview: { flex: 1, backgroundColor: palette.background },
});
