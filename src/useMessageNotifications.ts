import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, PermissionsAndroid, Platform } from 'react-native';

import notifications from '../modules/instadirect-notifications/src';
import type { SetupStep } from './ui/NotificationSetupSheet';

const ASK_AGAIN_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
const INSTAGRAM_PLAY_STORE = 'market://details?id=com.instagram.android';

/**
 * Android message notifications (forwarded from the official Instagram app).
 * Decides whether to show the setup sheet, and clears forwarded
 * notifications whenever InstaDirect comes to the foreground.
 */
export function useMessageNotifications(onEnabled: () => void) {
  const [step, setStep] = useState<SetupStep | null>(null);
  const stepRef = useRef(step);
  stepRef.current = step;

  const refresh = useCallback(async () => {
    if (!notifications) return;
    notifications.clearForwarded();

    if (notifications.hasNotificationAccess()) {
      const wasAsking = stepRef.current !== null;
      setStep(null);
      await ensurePostPermission();
      if (wasAsking) onEnabled(); // just came back from granting access
      return;
    }
    const dismissedAt = notifications.getSetupDismissedAt();
    if (Date.now() - dismissedAt < ASK_AGAIN_AFTER_MS) return setStep(null);
    setStep(notifications.isInstagramInstalled() ? 'grant-access' : 'install-instagram');
  }, [onEnabled]);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);

  const primary = useCallback(() => {
    if (!notifications) return;
    if (step === 'install-instagram') {
      Linking.openURL(INSTAGRAM_PLAY_STORE).catch(() =>
        Linking.openURL('https://play.google.com/store/apps/details?id=com.instagram.android'),
      );
    } else {
      notifications.openNotificationAccessSettings();
    }
  }, [step]);

  const dismiss = useCallback(() => {
    notifications?.setSetupDismissedAt(Date.now());
    setStep(null);
  }, []);

  return { step, primary, dismiss };
}

/** Android 13+ needs a runtime permission to post the forwarded notifications. */
async function ensurePostPermission() {
  if (Platform.OS !== 'android' || Number(Platform.Version) < 33) return;
  const perm = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
  if (await PermissionsAndroid.check(perm)) return;
  await PermissionsAndroid.request(perm);
}
