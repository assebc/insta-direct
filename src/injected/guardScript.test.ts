/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

import { buildGuardScript } from './guardScript.ts';

/**
 * Runs the injected script against a tiny fake browser. It only covers the
 * route guard; DOM suppression needs the real site and is verified on device.
 */
function makeBrowser(startPath: string) {
  const posted: any[] = [];
  const listeners: Record<string, Function[]> = {};
  const location = {
    pathname: startPath,
    get href() {
      return 'https://www.instagram.com' + this.pathname;
    },
    replaced: [] as string[],
    replace(p: string) {
      this.replaced.push(p);
      this.pathname = p;
    },
    assign(p: string) {
      this.pathname = p;
    },
  };
  const pushed: string[] = [];
  const history = {
    pushState(_s: unknown, _t: string, url: string) {
      pushed.push(url);
      location.pathname = new URL(url, location.href).pathname;
    },
    replaceState(_s: unknown, _t: string, url: string) {
      location.pathname = new URL(url, location.href).pathname;
    },
  };
  const el = () => {
    const classes = new Set<string>();
    return {
      appendChild() {},
      querySelectorAll: () => [],
      style: {} as Record<string, string>,
      classList: {
        add: (c: string) => classes.add(c),
        remove: (c: string) => classes.delete(c),
        contains: (c: string) => classes.has(c),
        toggle: (c: string, on: boolean) => (on ? classes.add(c) : classes.delete(c)),
      },
    };
  };
  const docListeners: Record<string, Function[]> = {};
  const document = {
    documentElement: el(),
    head: el(),
    body: null,
    getElementById: () => null,
    createElement: el,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener(t: string, fn: Function) {
      (docListeners[t] ??= []).push(fn);
    },
  };
  const timers: Function[] = [];
  const window: any = {
    location,
    history,
    document,
    URL,
    ReactNativeWebView: { postMessage: (s: string) => posted.push(JSON.parse(s)) },
    addEventListener(t: string, fn: Function) {
      (listeners[t] ??= []).push(fn);
    },
  };
  const ctx = vm.createContext({
    window,
    location,
    history,
    document,
    URL,
    JSON,
    Date,
    Math,
    MutationObserver: class {
      observe() {}
    },
    setInterval: () => 0,
    setTimeout: (fn: Function) => timers.push(fn),
  });
  vm.runInContext(buildGuardScript(), ctx);
  /** Simulate tapping <a href={href}>; returns whether the default was prevented. */
  const tapLink = (href: string) => {
    let prevented = false;
    const a = { getAttribute: () => href };
    const event = {
      target: { closest: () => a },
      preventDefault: () => (prevented = true),
      stopImmediatePropagation() {},
    };
    (docListeners.click ?? []).forEach((fn) => fn(event));
    return prevented;
  };
  return {
    window,
    location,
    history,
    posted,
    pushed,
    listeners,
    tapLink,
    html: document.documentElement,
    flush: () => timers.splice(0).forEach((f) => f()),
  };
}

test('script is valid JS and reports the starting route', () => {
  const b = makeBrowser('/direct/inbox/');
  assert.ok(b.window.__instadirect);
  assert.deepEqual(b.posted[0], { type: 'route', url: 'https://www.instagram.com/direct/inbox/' });
});

test('forces the dark theme class on <html>', () => {
  const b = makeBrowser('/direct/inbox/');
  assert.ok(b.html.classList.contains('__fb-dark-mode'));
  assert.equal(b.html.style.colorScheme, 'dark');
});

test('landing anywhere outside Messages goes to the inbox', () => {
  for (const start of ['/', '/explore/', '/reels/', '/someuser/']) {
    const b = makeBrowser(start);
    assert.deepEqual(b.location.replaced, ['/direct/inbox/'], start);
    assert.equal(b.posted[0].type, 'blocked');
  }
});

test('tapping a profile link in a chat is cancelled in place', () => {
  const b = makeBrowser('/direct/t/123/');
  assert.equal(b.tapLink('/someuser/'), true);
  assert.equal(b.location.pathname, '/direct/t/123/');
  assert.deepEqual(b.posted.at(-1), { type: 'blocked', from: '/someuser/', to: '/direct/t/123/', why: 'Profiles' });
});

test('tapping a shared post or reel opens it', () => {
  const b = makeBrowser('/direct/t/123/');
  assert.equal(b.tapLink('/p/abc/'), false);
  assert.equal(b.tapLink('/reel/abc/'), false);
  assert.equal(b.tapLink('https://www.instagram.com/reels/abc/'), true);
  assert.equal(b.location.pathname, '/reel/abc/');
});

test('SPA pushState out of Messages is swallowed and redirected', () => {
  const b = makeBrowser('/direct/inbox/');
  b.window.history.pushState({}, '', '/reels/');
  assert.deepEqual(b.pushed, []);
  b.flush();
  assert.deepEqual(b.location.replaced, ['/direct/inbox/']);
});

test('allowed pushState goes through and reports the route', () => {
  const b = makeBrowser('/direct/inbox/');
  b.window.history.pushState({}, '', '/direct/t/42/');
  assert.deepEqual(b.pushed, ['/direct/t/42/']);
  assert.deepEqual(b.posted.at(-1), { type: 'route', url: 'https://www.instagram.com/direct/t/42/' });
});

test('viewer pages lock scrolling via the <html> class', () => {
  const b = makeBrowser('/direct/t/1/');
  assert.equal(b.html.classList.contains('__instadirect-viewer'), false);
  b.listeners.touchstart?.forEach((fn) => fn());
  b.window.history.pushState({}, '', '/p/abc/');
  assert.equal(b.html.classList.contains('__instadirect-viewer'), true);
  b.window.history.pushState({}, '', '/direct/t/1/');
  assert.equal(b.html.classList.contains('__instadirect-viewer'), false);
});

test('a viewer cannot auto-advance to the next reel without a tap', () => {
  const b = makeBrowser('/reel/AAA/');
  b.window.history.pushState({}, '', '/reel/BBB/');
  assert.deepEqual(b.pushed, []);
  assert.equal(b.posted.at(-1).why, 'auto-advance');

  // ...but a user tap right before is fine (e.g. tapping a linked reel).
  b.listeners.touchstart.forEach((fn) => fn());
  b.window.history.pushState({}, '', '/reel/BBB/');
  assert.deepEqual(b.pushed, ['/reel/BBB/']);
});
