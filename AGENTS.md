This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Project layout

InstaDirect: Instagram's DMs only. Single-screen app, no router. `App.tsx` renders `src/InstagramScreen.tsx`: one `WebView`, plus a native back header on post/reel viewer pages.

- `src/config/rules.ts` — the allowlist, rewrites, CSS selectors and text matches. Edit here first when Instagram changes its site.
- `src/injected/guardScript.ts` — builds the script injected into the WebView (route guard, suppression, scroll lock, video handling). Its `checkPath` mirrors the one in `rules.ts`.
- `src/ui/` — native chrome. Platform files: `ViewerHeader.ios.tsx` / `ViewerHeader.tsx` (Material 3), `Icon.ios.tsx` (SF Symbols) / `Icon.tsx` (Material icons). Colors from `theme.ts`.
- `modules/instadirect-notifications/` — local Expo module (Android only): a `NotificationListenerService` that re-posts the official Instagram app's message notifications as InstaDirect ones. JS API in `src/index.ts` (null on iOS / Expo Go); setup flow in `src/useMessageNotifications.ts`.
- Tests: `npm test` (Node's built-in runner, no Jest). Typecheck: `npm run typecheck`.

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
