# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users
One person (the builder) on their own phone, iPhone and Android both in use. They want to keep the social side of Instagram (friends' posts, DMs, posting) without the algorithmic pull of Reels and Explore.

## Product Purpose
InstaDirect: a personal mobile app that wraps Instagram's mobile web and keeps only Messages. You can read and send DMs and open a single post or reel someone sends, without scrolling; everything else (feed, profiles, Reels, Explore, Stories) is unreachable. Success: staying in touch with friends without ever landing in a feed. Background: `PRD Personal Instagram Replacement.md` (broader original scope).

## Positioning
Instagram as a messenger: same account and conversations, but there is nowhere to scroll. Anything a friend sends opens alone and ends with a way back to the chat.

## Capabilities and Constraints
- Expo (React Native) shell around a single `react-native-webview`; Instagram's own web UI renders the content.
- Single section (Messages), so no tab bar. Viewer pages (post/reel) get a native back header; Instagram's web nav is hidden.
- Must feel like a native app on each OS (iOS HIG conventions on iPhone, Material 3 on Android), not a website in a frame.
- Always dark.
- No backend, no analytics, no private Instagram APIs; personal build only, not store-published.
- Selectors and URL rules live in `src/config/rules.ts`; Instagram's DOM can change at any time.
- Open: time limits (hard lock vs reminder) undecided.

## Product Principles
1. Removing the pull beats adding features: when in doubt, block.
2. Native where the hands touch it: navigation, back, feedback, and system states follow the OS.
3. Never trap the user: every blocked path and every finished reel lands somewhere useful.
4. Fragile parts stay in one config file and fail open to a usable page.
