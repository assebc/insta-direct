import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

/**
 * Android-only bridge to the notification forwarder. `null` on iOS, web and
 * in Expo Go (no custom native code there), so callers just hide the feature.
 */
export type InstaDirectNotifications = {
  hasNotificationAccess(): boolean;
  isInstagramInstalled(): boolean;
  openNotificationAccessSettings(): void;
  clearForwarded(): void;
  getSetupDismissedAt(): number;
  setSetupDismissedAt(ms: number): void;
};

const native: InstaDirectNotifications | null =
  Platform.OS === 'android' ? requireOptionalNativeModule<InstaDirectNotifications>('InstaDirectNotifications') : null;

export default native;
