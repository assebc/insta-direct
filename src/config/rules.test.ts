/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { checkPath, decide, pathOf, viewerKind } from './rules.ts';

const IG = 'https://www.instagram.com';

test('allows Messages, single posts/reels and login', () => {
  for (const path of [
    '/direct/inbox/',
    '/direct/t/1234567890/',
    '/direct/requests/',
    '/direct/new/',
    '/p/Cabc123/',
    '/someuser/p/Cabc123/',
    '/reel/Cabc-1_23/',
    '/someuser/reel/Cabc123/',
    '/accounts/login/?next=%2F',
    '/accounts/onetap/',
    '/challenge/action/xyz/',
    '/two_factor/',
  ]) {
    assert.deepEqual(decide(IG + path), { action: 'allow' }, path);
  }
});

test('everything else goes to the inbox, with a name for the notice', () => {
  const cases: [string, string][] = [
    ['/', 'The feed'],
    ['/reels/', 'Reels'],
    ['/reels/audio/123/', 'Reels'],
    ['/explore/', 'Explore'],
    ['/explore/search/', 'Explore'],
    ['/stories/someuser/123/', 'Stories'],
    ['/accounts/activity/', 'Notifications'],
    ['/someuser/', 'Profiles'],
    ['/someuser/reels/', 'That page'],
    ['/someuser/tagged/', 'That page'],
    ['/create/select/', 'That page'],
  ];
  for (const [path, why] of cases) {
    assert.deepEqual(decide(IG + path), { action: 'redirect', to: `${IG}/direct/inbox/`, why }, path);
  }
});

test('a /reels/<id> link opens the single-reel viewer, not the feed', () => {
  assert.deepEqual(checkPath('/reels/C1a-B_2/'), { kind: 'rewrite', to: '/reel/C1a-B_2/', why: 'single reel via feed URL' });
});

test('viewer pages are posts and reels only', () => {
  assert.equal(viewerKind('/p/abc/'), 'post');
  assert.equal(viewerKind('/someone/p/abc/'), 'post');
  assert.equal(viewerKind('/reel/abc/'), 'reel');
  assert.equal(viewerKind('/direct/t/123/'), null);
  assert.equal(viewerKind('/reels/'), null);
});

test('outbound links leave the app', () => {
  assert.deepEqual(decide('https://l.instagram.com/?u=https%3A%2F%2Fexample.com%2Fa&e=x'), {
    action: 'external',
    url: 'https://example.com/a',
  });
  assert.deepEqual(decide('https://example.com/'), { action: 'external', url: 'https://example.com/' });
});

test('app-switching schemes are blocked, in-page schemes allowed', () => {
  assert.equal(decide('instagram://reels').action, 'block');
  assert.equal(decide('intent://explore#Intent;end').action, 'block');
  assert.equal(decide('blob:https://www.instagram.com/abc').action, 'allow');
  assert.equal(decide('about:blank').action, 'allow');
});

test('Facebook only for login paths', () => {
  assert.equal(decide('https://www.facebook.com/login/?next=x').action, 'allow');
  assert.equal(decide('https://m.facebook.com/v19.0/dialog/oauth?x').action, 'allow');
  assert.equal(decide('https://www.facebook.com/watch/').action, 'external');
});

test('iframes are not policed', () => {
  assert.equal(decide('https://www.google.com/recaptcha/api2/anchor', false).action, 'allow');
});

test('pathOf extracts the path', () => {
  assert.equal(pathOf('https://www.instagram.com/direct/inbox/?x=1#y'), '/direct/inbox/');
  assert.equal(pathOf('https://www.instagram.com'), '/');
});
