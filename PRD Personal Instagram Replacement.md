# PRD: Personal Instagram Replacement

**Repo name:** `inboxreels` **Status:** Draft v1 **Platform:** iOS and Android (personal use) **Stack:** Expo (React Native), `react-native-webview`

## 1. Overview

A personal mobile app that replaces the Instagram app for one user. It wraps Instagram's web experience so you can view your feed of posts, like and comment, post photos and videos, and read and send DMs, while blocking the endless-scroll surfaces: the Reels feed and Explore. Reels still play when a friend sends one in a DM.

## 2. Problem

Instagram's reels feed is built to be endless. The official app mixes what you actually want (posts from people you follow, DMs, posting) with an algorithmic Reels feed that pulls you in. Existing options are all-or-nothing: use the app fully, or delete it and lose the social side.

## 3. Goals

- View the home feed of posts from people you follow.
- Like, comment and post photos or videos.
- Read and send DMs, and watch reels that are sent to you.
- Make the Reels feed and Explore page unreachable, or at least very hard to reach.
- End every reel with a clear return to where you came from, with no autoplay of the next video.
- Keep the user logged in using Instagram's own login page (no credential handling by the app).

## 4. Non-Goals

- Rebuilding Instagram's interface natively (the app wraps the web version).
- Using Instagram's private or unofficial APIs.
- Publishing to the App Store or Google Play (personal build only, see Risks).
- The Reels feed and Explore page (blocked by design).

## 5. Target User

A single user (the builder) who wants to post, like and keep up with friends on Instagram without the pull of the algorithmic Reels feed.

## 6. User Stories

1. As a user, I open the app and land on my home feed of posts from people I follow.
2. As a user, I log in once on Instagram's real login page and stay logged in.
3. As a user, I can like and comment on posts, and upload my own photo or video post.
4. As a user, I can open my DMs and tap a reel a friend sent, and it plays.
5. As a user, when a reel ends I get a clear back action and no next reel starts.
6. As a user, I cannot reach the Reels feed or Explore, even by accident.

## 7. Functional Requirements

### 7.1 Navigation lock (must have)

- Initial URL: `https://www.instagram.com/` (home feed).
- Allow the home feed, profiles, post pages (`/p/<id>`), DMs (`/direct/*`), single reels (`/reel/<id>`), post creation, and login and challenge paths.
- Block and cancel `/reels/` and `/explore/`, and redirect them to the home feed.
- A reel opened from a DM or a profile never advances to another reel.

### 7.2 UI suppression (must have)

- Inject CSS to hide the Reels and Explore links in the bottom navigation bar.
- Hide the Reels tab on profile pages, plus "More reels" and suggested-content modules.
- Disable swipe or scroll-to-next behavior on the reel player via injected JS.
- Optionally hide suggested posts in the home feed.

### 7.3 Native shell (must have)

- Persistent native Back and Home buttons.
- Hardware or gesture back returns to the previous allowed page, never to a blocked one.
- Session cookies persist across app restarts.
- Camera and media-library permissions so photo and video uploads work inside the WebView.

### 7.4 Nice to have

- Optional daily watch-time limit, or a counter of reels watched.
- Pause or lock mode on a schedule (for example, no access after 10 pm).
- Open reel links shared from other apps (share sheet or deep link) directly in the viewer.
- Dark mode follows system setting.

## 8. Technical Approach

- **Framework:** Expo with a single screen containing a `WebView`.
- **Routing control:** `onShouldStartLoadWithRequest` with a regex blocklist for `/reels/` and `/explore/`, plus a `window.location` watcher injected in JS to catch client-side (SPA) route changes that bypass the native hook.
- **DOM control:** `injectedJavaScript` and `injectedJavaScriptBeforeContentLoaded` using a `MutationObserver` to re-hide elements as Instagram re-renders.
- **Auth and uploads:** Instagram's own login page inside the WebView with cookie persistence, plus Expo camera and media permissions for the web upload flow.
- **No backend,** no analytics and no data collection.

## 9. Success Metrics

- Zero accidental reaches of the Reels feed or Explore in a two-week test period.
- Feed, likes, DMs and photo uploads work in at least 95% of attempts.
- Time spent in Instagram drops compared with the official app (self-measured via screen time).

## 10. Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Instagram changes its DOM and breaks selectors | Keep selectors in one config file and favor attribute and URL-based rules over class names |
| SPA routing bypasses the native navigation hook | Inject a JS URL watcher that redirects disallowed routes |
| Reel page offers swipe-to-next | Block touch scroll on the player and overlay a "Back to inbox" action at video end |
| Terms of Service gray area | Personal use only, no scraping, no private API, no store publishing |
| Login challenges (2FA, suspicious login) may need other URLs | Allow auth and challenge paths as discovered during testing |

## 11. Milestones

1. **M1: Skeleton.** Expo app, WebView, home feed loads, login works.
2. **M2: Lockdown.** Block Reels and Explore, plus the SPA route watcher.
3. **M3: Suppression.** Hide nav links, suggestions and swipe-to-next.
4. **M4: Posting and polish.** Photo and video upload, Back and Home buttons, error and offline states.
5. **M5: Extras.** Time limits, share-sheet deep links.

## 12. Open Questions

- Is the Reels feed blocked entirely, or only limited? This draft assumes blocked.
- Which post types can Instagram's mobile web create (photos, videos, Stories, Reels)? To confirm in testing.
- Should Stories be allowed, and should suggested posts be hidden in the home feed?
- Is a time limit a hard lock or a soft reminder?
