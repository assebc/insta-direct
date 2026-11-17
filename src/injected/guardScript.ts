import {
  ALLOWED_PATHS,
  BLOCKED_LABELS,
  HIDDEN_SELECTORS,
  HIDDEN_TEXT_BLOCKS,
  INBOX_PATH,
  REWRITES,
  VIEWER_PATH,
  settings,
} from '../config/rules.ts';

/** Messages the injected script posts to the native side. */
export type GuardMessage =
  | { type: 'route'; url: string }
  | { type: 'blocked'; from: string; to: string; why: string }
  | { type: 'reelEnded' }
  | { type: 'reelPlaying' };

const VIEWER_CLASS = '__instadirect-viewer';

/**
 * Builds the script injected before Instagram's own code runs. It is a plain
 * ES5-ish string because it runs inside the WebView, not in Hermes.
 *
 * Responsibilities:
 *  - Route guard (allowlist): only Messages, single posts/reels and login
 *    pages. Blocked link taps are cancelled in place; anything that slips
 *    through history.pushState or a full load goes to the inbox.
 *  - CSS + MutationObserver suppression of links and modules that lead away.
 *  - Viewer pages (a post or reel opened from a chat): no scrolling, no loop,
 *    no auto-advance; tells native when a video ends so it can offer a way back.
 */
export function buildGuardScript(): string {
  const config = {
    rewrites: REWRITES,
    allowed: ALLOWED_PATHS,
    labels: BLOCKED_LABELS,
    inbox: INBOX_PATH,
    viewer: VIEWER_PATH,
    viewerClass: VIEWER_CLASS,
    css:
      HIDDEN_SELECTORS.join(',\n') +
      ' { display: none !important; }\n' +
      (settings.lockViewerScroll
        ? `html.${VIEWER_CLASS}, html.${VIEWER_CLASS} body { overflow: hidden !important; overscroll-behavior: none !important; }\n` +
          `html.${VIEWER_CLASS} [data-instadirect-hidden] { display: none !important; }`
        : ''),
    textBlocks: HIDDEN_TEXT_BLOCKS.filter((b) => !b.onlyWhen || settings[b.onlyWhen]).map((b) => ({
      source: b.text.source,
      flags: b.text.flags,
      container: b.container,
      up: b.up,
      scroller: !!b.scroller,
    })),
    darkTheme: settings.darkTheme,
    hideWebNav: settings.hideWebNav,
    lockViewerScroll: settings.lockViewerScroll,
  };

  return `(function () {
  if (window.__instadirect) return;
  var CONFIG = ${JSON.stringify(config)};
  function re(p) { return new RegExp(p); }
  var REWRITES = CONFIG.rewrites.map(function (r) { return { re: re(r.pattern), to: r.to, why: r.why }; });
  var ALLOWED = CONFIG.allowed.map(re);
  var LABELS = CONFIG.labels.map(function (l) { return { re: re(l.pattern), label: l.label }; });
  var VIEWER = re(CONFIG.viewer);
  var TEXT_BLOCKS = CONFIG.textBlocks.map(function (b) {
    return { re: new RegExp(b.source, b.flags), container: b.container, up: b.up, scroller: b.scroller };
  });

  function post(msg) {
    try {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(msg));
    } catch (e) {}
  }

  // Same logic as checkPath() in src/config/rules.ts.
  function checkPath(pathname) {
    for (var i = 0; i < REWRITES.length; i++) {
      if (REWRITES[i].re.test(pathname)) {
        return { kind: 'rewrite', to: pathname.replace(REWRITES[i].re, REWRITES[i].to), why: REWRITES[i].why };
      }
    }
    for (var j = 0; j < ALLOWED.length; j++) if (ALLOWED[j].test(pathname)) return null;
    var why = 'That page';
    for (var k = 0; k < LABELS.length; k++) if (LABELS[k].re.test(pathname)) { why = LABELS[k].label; break; }
    return { kind: 'blocked', to: CONFIG.inbox, why: why };
  }

  function toUrl(url) {
    try { return new URL(url, location.href); } catch (e) { return null; }
  }

  function isInstagram(u) { return /(^|\\.)instagram\\.com$/i.test(u.hostname); }
  function isViewerPage() { return VIEWER.test(location.pathname); }

  // ---- user-gesture tracking (to tell user navigation from auto-advance) ----
  var lastGesture = 0;
  ['touchstart', 'pointerdown', 'keydown', 'click'].forEach(function (t) {
    window.addEventListener(t, function () { lastGesture = Date.now(); }, true);
  });
  function recentGesture() { return Date.now() - lastGesture < 1000; }

  // ---- route guard ----
  var lastHref = '';
  function check() {
    var hit = checkPath(location.pathname);
    if (hit && hit.to !== location.pathname) {
      post({ type: 'blocked', from: location.pathname, to: hit.to, why: hit.why });
      location.replace(hit.to);
      return;
    }
    if (location.href !== lastHref) {
      lastHref = location.href;
      post({ type: 'route', url: location.href });
      onRoute();
    }
  }

  function guardHistory(name) {
    var original = history[name];
    history[name] = function (state, title, url) {
      if (url != null) {
        var u = toUrl(String(url));
        if (u && isInstagram(u)) {
          var hit = checkPath(u.pathname);
          if (hit) {
            post({ type: 'blocked', from: u.pathname, to: hit.to, why: hit.why });
            // Let Instagram's router settle, then hard-navigate to the safe path.
            setTimeout(function () { location.replace(hit.to); }, 0);
            return;
          }
          // A viewer must never move to the next post/reel on its own.
          if (isViewerPage() && VIEWER.test(u.pathname) && u.pathname !== location.pathname && !recentGesture()) {
            post({ type: 'blocked', from: location.pathname, to: u.pathname, why: 'auto-advance' });
            return;
          }
        }
      }
      var result = original.apply(this, arguments);
      check();
      return result;
    };
  }
  guardHistory('pushState');
  guardHistory('replaceState');
  window.addEventListener('popstate', check);
  setInterval(check, 400);

  // Catch taps on links that leave Messages before Instagram's router sees
  // them, and simply don't go: you stay in the chat.
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var u = toUrl(a.getAttribute('href'));
    if (!u || !isInstagram(u)) return;
    var hit = checkPath(u.pathname);
    if (!hit) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (hit.kind === 'rewrite') { location.assign(hit.to); return; }
    post({ type: 'blocked', from: u.pathname, to: location.pathname, why: hit.why });
  }, true);

  // ---- CSS suppression ----
  function ensureStyle() {
    if (document.getElementById('__instadirect_style')) return;
    var root = document.head || document.documentElement;
    if (!root) return;
    var style = document.createElement('style');
    style.id = '__instadirect_style';
    style.textContent = CONFIG.css;
    root.appendChild(style);
  }

  // ---- text-based module suppression ----
  /**
   * Closest horizontal tray around el (e.g. the Notes tray), or null. A
   * vertical scroller (the chat list) also computes overflow-x to auto, so
   * only short, wide boxes count.
   */
  function scrollerOf(el) {
    for (var n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      var ox = getComputedStyle(n).overflowX;
      if (ox !== 'auto' && ox !== 'scroll') continue;
      var r = n.getBoundingClientRect();
      if (r.height > 0 && r.height < 220 && r.width > r.height * 1.5) return n;
      return null;
    }
    return null;
  }

  function hideTextBlocks(root) {
    if (!TEXT_BLOCKS.length || !root.querySelectorAll) return;
    var nodes = root.querySelectorAll('span, h2, h3, h4, div[role="heading"], button, a, div[role="button"]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.childElementCount > 1 || el.__instadirectSeen) continue;
      var text = (el.textContent || '').trim();
      if (!text || text.length > 40) continue;
      for (var j = 0; j < TEXT_BLOCKS.length; j++) {
        var b = TEXT_BLOCKS[j];
        if (!b.re.test(text)) continue;
        var target = b.scroller ? scrollerOf(el) : el.closest(b.container);
        // The tray may not be laid out yet; try again on the next DOM change.
        if (b.scroller && !target) break;
        if (!target && !b.scroller) {
          target = el;
          for (var k = 0; k < b.up && target.parentElement; k++) target = target.parentElement;
        }
        if (target && target !== document.body && target !== document.documentElement) {
          target.style.setProperty('display', 'none', 'important');
          // A hidden modal can leave the page scroll-locked.
          if (target.getAttribute('role') === 'dialog' && document.body && !isViewerPage()) {
            document.body.style.removeProperty('overflow');
            document.documentElement.style.removeProperty('overflow');
          }
        }
        el.__instadirectSeen = true;
        break;
      }
    }
  }

  // ---- dark theme ----
  // Best effort: the WebView already reports a dark color scheme (app.json /
  // forceDarkOn). Meta's web apps also key their theme off these html classes.
  function forceDark() {
    if (!CONFIG.darkTheme) return;
    var html = document.documentElement;
    if (!html) return;
    if (!html.classList.contains('__fb-dark-mode')) html.classList.add('__fb-dark-mode');
    html.classList.remove('__fb-light-mode');
    html.style.colorScheme = 'dark';
  }

  function fixedAncestor(el) {
    while (el && el !== document.body && el !== document.documentElement) {
      var pos = getComputedStyle(el).position;
      if (pos === 'fixed' || pos === 'sticky') return el;
      el = el.parentElement;
    }
    return null;
  }

  // ---- web bottom nav (Home, Reels, Explore...): hidden everywhere ----
  function hideWebNav() {
    if (!CONFIG.hideWebNav) return;
    var homes = document.querySelectorAll('a[href="/"]');
    for (var i = 0; i < homes.length; i++) {
      var bar = fixedAncestor(homes[i].parentElement);
      if (!bar || bar.style.display === 'none') continue;
      // Must look like the nav bar (several links, at the bottom), never the DM composer.
      var r = bar.getBoundingClientRect();
      if (bar.querySelectorAll('a[href]').length >= 3 && r.bottom >= window.innerHeight - 4 && r.height < 120) {
        bar.style.setProperty('display', 'none', 'important');
      }
    }
  }

  // ---- viewer pages: native header replaces Instagram's, no scrolling ----
  function syncViewer() {
    var html = document.documentElement;
    if (!html) return;
    var viewer = isViewerPage();
    html.classList.toggle(CONFIG.viewerClass, viewer && CONFIG.lockViewerScroll);
    if (!viewer || !document.elementFromPoint) return;
    // The web top bar (back arrow + "Post"/"Reel"): fixed/sticky, short, at the top.
    var bar = fixedAncestor(document.elementFromPoint(window.innerWidth / 2, 4));
    if (bar && !bar.hasAttribute('data-instadirect-hidden')) {
      var r = bar.getBoundingClientRect();
      if (r.top <= 1 && r.height > 0 && r.height < 80) bar.setAttribute('data-instadirect-hidden', '');
    }
  }

  // Vertical swipes on viewer pages do nothing (no "more posts", no next
  // reel). Horizontal swipes still page through a carousel post.
  var touchStart = null;
  document.addEventListener('touchstart', function (e) {
    touchStart = isViewerPage() && CONFIG.lockViewerScroll && e.touches.length === 1
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : null;
  }, { capture: true, passive: true });
  document.addEventListener('touchmove', function (e) {
    if (!touchStart || !isViewerPage()) return;
    var dx = Math.abs(e.touches[0].clientX - touchStart.x);
    var dy = Math.abs(e.touches[0].clientY - touchStart.y);
    if (dy > dx) { e.preventDefault(); e.stopPropagation(); }
  }, { capture: true, passive: false });
  window.addEventListener('scroll', function () {
    if (isViewerPage() && CONFIG.lockViewerScroll && window.scrollY !== 0) window.scrollTo(0, 0);
  }, { passive: true });

  // ---- videos on viewer pages: play once, then hand back to native ----
  var endedPosted = false;

  function onRoute() {
    endedPosted = false;
    syncViewer();
    tameVideos();
  }

  function tameVideos() {
    if (!isViewerPage()) return;
    var videos = document.querySelectorAll('video');
    for (var i = 0; i < videos.length; i++) {
      var v = videos[i];
      v.loop = false;
      v.removeAttribute('loop');
      if (v.__instadirectTamed) continue;
      v.__instadirectTamed = true;
      v.addEventListener('ended', function () {
        if (!isViewerPage() || endedPosted) return;
        endedPosted = true;
        post({ type: 'reelEnded' });
      });
      v.addEventListener('play', function (ev) {
        if (!isViewerPage()) return;
        // After the video ended, nothing may start playing unless the user asked.
        if (endedPosted && !recentGesture()) { ev.target.pause(); return; }
        endedPosted = false;
        // Opened by a tap (from a chat): play with sound instead of Instagram's muted default.
        if (recentGesture()) unmute(ev.target);
        post({ type: 'reelPlaying' });
      });
    }
  }

  // Instagram starts videos muted. Unmute once per video, inside a user
  // gesture (browsers refuse sound without one); after that, Instagram's own
  // mute button is respected.
  function unmute(v) {
    if (!v.muted || v.__instadirectUnmuted) return;
    v.__instadirectUnmuted = true;
    v.muted = false;
    v.volume = 1;
    if (v.paused && !v.ended) {
      var p = v.play();
      if (p && p.catch) p.catch(function () { v.muted = true; v.play(); });
    }
  }
  document.addEventListener('click', function () {
    if (!isViewerPage()) return;
    // After Instagram's own tap handler, so a deliberate mute tap isn't fought.
    setTimeout(function () {
      var videos = document.querySelectorAll('video');
      for (var i = 0; i < videos.length; i++) unmute(videos[i]);
    }, 0);
  }, false);

  // ---- observer ----
  var scheduled = false;
  function sweep() {
    scheduled = false;
    ensureStyle();
    forceDark();
    if (document.body) hideTextBlocks(document.body);
    hideWebNav();
    syncViewer();
    tameVideos();
  }
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    (window.requestAnimationFrame || setTimeout)(sweep);
  }
  new MutationObserver(schedule).observe(document.documentElement || document, {
    childList: true,
    subtree: true,
  });
  document.addEventListener('DOMContentLoaded', schedule);

  window.__instadirect = {
    replay: function () {
      var v = document.querySelector('video');
      if (v) { endedPosted = false; lastGesture = Date.now(); v.currentTime = 0; v.muted = false; v.play(); }
    },
    check: check,
  };

  ensureStyle();
  forceDark();
  check();
})();
true;`;
}
