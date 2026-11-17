/**
 * Navigation and DOM rules for InstaDirect: Instagram reduced to its DMs.
 *
 * Everything that is likely to break when Instagram changes its site lives in
 * this file. Prefer URL- and attribute-based rules over class names.
 *
 * This module must stay free of React Native imports: it is shared by the
 * native navigation hook, the injected WebView script and the unit tests.
 */

export const INBOX_PATH = '/direct/inbox/';
export const HOME_URL = `https://www.instagram.com${INBOX_PATH}`;

export const settings = {
  /** Hide "Use the app" / "Open app" banners and modals. */
  hideAppBanners: true,
  /** Force Instagram's dark theme. */
  darkTheme: true,
  /** Hide Instagram's web bottom nav (Home, Reels, Explore...). */
  hideWebNav: true,
  /** Posts and reels opened from a chat can't be scrolled (no "more posts", no next reel). */
  lockViewerScroll: true,
  /** Hide the Notes tray (short status bubbles) at the top of the inbox. */
  hideNotes: true,
} as const;

/** Patterns are strings so the same rules can be serialized into the injected script. */
export type Rewrite = { pattern: string; to: string; why: string };

/** Applied first: links that point at an allowed page through a disallowed URL. */
export const REWRITES: Rewrite[] = [
  // A reel shared as /reels/<id>/ opens in the single-reel viewer, not the Reels feed.
  { pattern: '^/reels/([A-Za-z0-9_-]+)/?$', to: '/reel/$1/', why: 'single reel via feed URL' },
];

/** The only pages InstaDirect shows. Everything else on instagram.com goes to the inbox. */
export const ALLOWED_PATHS: string[] = [
  // Messages: inbox, threads, requests, new message.
  '^/direct(?:/.*)?$',
  // A single post or reel (images and reels people send you), with or without a /<user>/ prefix.
  '^/(?:[A-Za-z0-9._]+/)?p/[A-Za-z0-9_-]+/?$',
  '^/(?:[A-Za-z0-9._]+/)?reel/[A-Za-z0-9_-]+/?$',
  // Login, 2FA, security checks, password reset. Not the activity feed.
  '^/accounts/(?!activity)(?:.*)$',
  '^/challenge(?:/.*)?$',
  '^/auth_platform(?:/.*)?$',
  '^/two_factor(?:/.*)?$',
  '^/oauth(?:/.*)?$',
  '^/legal(?:/.*)?$',
];

/** Pages where scrolling is locked and a native back header is shown. */
export const VIEWER_PATH = '^/(?:[A-Za-z0-9._]+/)?(p|reel)/[A-Za-z0-9_-]+/?$';

/** Friendly names for blocked pages, used in the "isn't part of InstaDirect" notice. */
export const BLOCKED_LABELS: { pattern: string; label: string }[] = [
  { pattern: '^/?$', label: 'The feed' },
  { pattern: '^/reels', label: 'Reels' },
  { pattern: '^/explore', label: 'Explore' },
  { pattern: '^/stories', label: 'Stories' },
  { pattern: '^/accounts/activity', label: 'Notifications' },
  { pattern: '^/[A-Za-z0-9._]+/?$', label: 'Profiles' },
];

export type PathVerdict = { kind: 'rewrite' | 'blocked'; to: string; why: string };

export function checkPath(pathname: string): PathVerdict | null {
  for (const r of REWRITES) {
    const re = new RegExp(r.pattern);
    if (re.test(pathname)) return { kind: 'rewrite', to: pathname.replace(re, r.to), why: r.why };
  }
  if (ALLOWED_PATHS.some((p) => new RegExp(p).test(pathname))) return null;
  const label = BLOCKED_LABELS.find((b) => new RegExp(b.pattern).test(pathname))?.label ?? 'That page';
  return { kind: 'blocked', to: INBOX_PATH, why: label };
}

export function viewerKind(pathname: string): 'post' | 'reel' | null {
  const m = new RegExp(VIEWER_PATH).exec(pathname);
  return m ? (m[1] === 'reel' ? 'reel' : 'post') : null;
}

/** Hosts that may be shown inside the WebView (top frame). */
const INSTAGRAM_HOST = /^(?:[a-z0-9-]+\.)*instagram\.com$/i;
/** Instagram's outbound-link redirector; its targets open in the system browser. */
const EXTERNAL_REDIRECTOR_HOST = /^l\.instagram\.com$/i;
/** "Log in with Facebook" needs a few Facebook auth paths, nothing else. */
const FACEBOOK_HOST = /^(?:www\.|m\.)?facebook\.com$/i;
const FACEBOOK_AUTH_PATH = /^\/(?:login|dialog|v\d+\.\d+\/dialog|checkpoint|recover|auth|two_step_verification)(?:[/.?]|$)/;

/** Schemes the WebView handles itself (blob uploads, inline media, etc.). */
const INTERNAL_SCHEME = /^(?:about|blob|data|javascript):/i;

export type Decision =
  | { action: 'allow' }
  | { action: 'redirect'; to: string; why: string }
  | { action: 'external'; url: string }
  | { action: 'block'; why: string };

const URL_PARTS = /^([a-z][a-z0-9+.-]*):\/\/([^/?#]*)([^?#]*)(\?[^#]*)?(#.*)?$/i;

export function pathOf(url: string): string {
  const m = URL_PARTS.exec(url);
  return m ? m[3] || '/' : '/';
}

/**
 * Decide what to do with a navigation request. `isTopFrame` is false for
 * iframes (e.g. captcha widgets during login challenges), which we allow.
 */
export function decide(url: string, isTopFrame = true): Decision {
  if (INTERNAL_SCHEME.test(url)) return { action: 'allow' };

  const m = URL_PARTS.exec(url);
  if (!m) return { action: 'block', why: 'unparseable or non-web URL' };
  const [, scheme, host, rawPath, query = ''] = m;
  const path = rawPath || '/';

  if (!/^https?$/i.test(scheme)) {
    // instagram://, intent://, fb:// ... would leave the wrapper for the real app.
    return { action: 'block', why: `scheme ${scheme}` };
  }
  if (!isTopFrame) return { action: 'allow' };

  if (EXTERNAL_REDIRECTOR_HOST.test(host)) {
    const target = /[?&]u=([^&]+)/.exec(query);
    return { action: 'external', url: target ? safeDecode(target[1]) : url };
  }

  if (INSTAGRAM_HOST.test(host)) {
    const verdict = checkPath(path);
    if (verdict) return { action: 'redirect', to: `https://${host}${verdict.to}`, why: verdict.why };
    return { action: 'allow' };
  }

  if (FACEBOOK_HOST.test(host) && FACEBOOK_AUTH_PATH.test(path)) return { action: 'allow' };

  return { action: 'external', url };
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/**
 * CSS selectors hidden in the page. Attribute selectors on hrefs are far
 * more stable than Instagram's generated class names.
 */
export const HIDDEN_SELECTORS: string[] = [
  // Ways out of Messages: home logo/back arrow, Reels, Explore, notifications.
  'a[href="/"]',
  'a[href="/reels/"]',
  'a[href^="/explore"]',
  'a[href$="/reels/"]',
  'a[href^="/accounts/activity"]',
  // "Open app" / app-install nags.
  'a[href*="itunes.apple.com"]',
  'a[href*="apps.apple.com"]',
  'a[href^="instagram://"]',
  'a[href^="intent://"]',
  'a[href*="play.google.com"]',
];

/**
 * Text that marks a module we want gone. Instagram has no stable attributes
 * for these, so we match the heading text (English UI only). The hidden
 * element is the closest ancestor matching `container`; if none matches, the
 * ancestor `up` levels above the text node's element.
 *
 * These are best guesses and need tuning against the live site on a device.
 */
export type TextBlockRule = {
  text: RegExp;
  container: string;
  up: number;
  /**
   * Hide the closest horizontally scrolling ancestor instead (a carousel or
   * tray). If there is none, nothing is hidden, so a wrong guess can't take
   * out the whole page.
   */
  scroller?: boolean;
  onlyWhen?: 'hideAppBanners' | 'hideNotes';
};

export const HIDDEN_TEXT_BLOCKS: TextBlockRule[] = [
  { text: /^More reels/i, container: 'section', up: 4 },
  { text: /^More posts from/i, container: 'section', up: 4 },
  { text: /^Suggested reels/i, container: 'article, section', up: 4 },
  // Notes tray above the chat list; "Your note" is the caption under your own avatar.
  { text: /^(Your note|Leave a note|Share a note|Note\.\.\.)$/i, container: '', up: 0, scroller: true, onlyWhen: 'hideNotes' },
  // "Use the app" / "Open app" banners and modals.
  { text: /^(Use the app|Use app|Open app|Open Instagram|Get the app|Open in app)$/i, container: '[role="dialog"]', up: 2, onlyWhen: 'hideAppBanners' },
  { text: /^(See more from .+ in the app|Instagram is better in the app|Get the full experience)/i, container: '[role="dialog"]', up: 3, onlyWhen: 'hideAppBanners' },
];
