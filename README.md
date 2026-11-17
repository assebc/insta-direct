<p align="center">
  <img src="assets/icon.png" alt="InstaDirect icon" width="128" height="128">
</p>

<h1 align="center">InstaDirect</h1>

<p align="center"><b>Instagram's DMs, and nothing else.</b></p>

## What is this?

InstaDirect is a personal mobile app (iOS and Android, built with Expo) for people who want to keep talking to
friends on Instagram without getting pulled into the feed. It loads Instagram's own mobile website inside the app
and strips away everything except **your messages**.

What you get:

- Your inbox, chats and message requests, working the way they do on Instagram's mobile site.
- Posts and reels that someone sends you in a chat open in a viewer with a native back button. You see that one
  post: no scrolling to the next one, and a video plays once and then offers "Back to chat" or "Replay".
- On Android, Instagram's message notifications show up as InstaDirect notifications, so you never need to open
  the real app (see [Message notifications](#message-notifications-android)).

What you don't get: the feed, Reels, Explore, Stories, profiles or Instagram's notifications tab. Links to those
do nothing, and nothing you open can be scrolled into an endless feed.

You log in with your normal Instagram account. InstaDirect has no server of its own: it talks only to Instagram,
and your session stays in the WebView on your device.

The original [PRD](./PRD%20Personal%20Instagram%20Replacement.md) described a broader "Instagram without Reels" app;
InstaDirect is the narrower DMs-only version of it.

Personal use only: not for the App Store or Google Play, and not affiliated with Instagram or Meta.

## Install (Android)

Every push to `master` builds an APK and publishes it as a GitHub Release:
[latest APK](https://github.com/assebc/insta-direct/releases/latest/download/instadirect.apk).

## Run it

```bash
npm install
npx expo start          # scan the QR with Expo Go for a quick look
```

Expo Go is fine for trying it out. For camera/photo-library prompts and the forced dark theme you need a development build:
`npx expo run:ios` / `npx expo run:android` (needs Xcode / Android SDK), or `npx eas-cli@latest build --profile development`.

## What you can open

| Page | Behaviour |
| --- | --- |
| `/direct/...` (inbox, chats, requests) | the app; opens on the inbox |
| `/p/<id>/`, `/reel/<id>/` (also with a `/<user>/` prefix) | opens from a chat with a native back header; **no vertical scrolling**, sideways swipe through a carousel still works; videos play once, then a "Back to chat / Replay" sheet |
| `/reels/<id>/` | rewritten to `/reel/<id>/` |
| login, 2FA, security checks | allowed |
| anything else (feed, profiles, Reels, Explore, Stories, notifications) | tapping the link does nothing and shows "… isn't part of InstaDirect"; a full page load goes to the inbox |
| outbound links | open in the system browser |

Enforced in three layers: the native `onShouldStartLoadWithRequest` hook, an injected script that guards
link taps and `history.pushState`/`replaceState` (with a polling fallback), and CSS/`MutationObserver`
hiding of nav links and "More posts" / "Use the app" modules.

All rules live in [`src/config/rules.ts`](src/config/rules.ts) (`ALLOWED_PATHS`, `BLOCKED_LABELS`, selectors).
Toggles there: `hideAppBanners`, `darkTheme`, `hideWebNav`, `lockViewerScroll`.

## Message notifications (Android)

InstaDirect can't receive Instagram's push notifications itself, so on Android it borrows the official app's:

1. Install the official Instagram app, log in, turn on **message** notifications only (Settings → Notifications), and never open it again.
   Also turn off "Pause app activity if unused" for it, or Android may silence it after a few months.
2. Open InstaDirect and tap **Allow access** on the sheet, then enable InstaDirect under *Notification access*.

From then on, every Instagram message notification is replaced by an InstaDirect one (sender, message, profile picture,
inline Reply). Tapping it opens InstaDirect's inbox, never Instagram. It works while InstaDirect is closed because Android
keeps the listener running. Forwarded notifications are cleared when you open InstaDirect.
Code: [`modules/instadirect-notifications`](modules/instadirect-notifications) (local Expo module, Kotlin).
Needs a development build; it's absent in Expo Go and on iOS, where Apple doesn't allow reading other apps' notifications.

## Look and feel

Native chrome per OS: iOS navigation bar with "‹ Chats" and SF Symbols on iPhone, Material 3 top app bar on Android
(Material You colors on Android 12+). Always dark, thin progress line instead of a spinner, banner/snackbar notices,
native end-of-video sheet, offline screen. Instagram's own bottom nav and viewer header are hidden.

## Develop

```bash
npm test             # rule + injected-script tests (node:test)
npm run typecheck
npx expo-doctor
```
