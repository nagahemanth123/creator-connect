/* Busy Fox Creator Connect: visit notes for the team page.
   <script src="../assets/track.js" data-kind="me|report"></script>
   Tells the worker that this dashboard or report was opened, how long it was really being read, which part was on screen
   and which buttons were tapped. Nothing typed is ever sent. Skipped for automated browsers. */
(function () {
	'use strict';
	var me = document.currentScript, kind = (me && me.getAttribute('data-kind')) === 'report' ? 'report' : 'me';
	var api = window.CC && window.CC.api;
	function read(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
	function write(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
	var token = (location.hash || '').replace(/^#/, '').trim() || (kind === 'me' ? read('cc_me_token') : '');
	if (!api || !token || token.length < 20 || navigator.webdriver || read('cc_notrack')) return;

	var sid = '', abc = 'abcdefghijklmnopqrstuvwxyz0123456789';
	for (var i = 0; i < 14; i++) sid += abc.charAt(Math.floor(Math.random() * 36));
	var seenKey = 'cc_seen_' + kind, ret = Boolean(read(seenKey));
	write(seenKey, '1');
	// what the phone itself says it is (model and system version are offered by Chrome on Android; iPhones do not say)
	var hint = {};
	try {
		if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) navigator.userAgentData.getHighEntropyValues(['model', 'platformVersion']).then(function (h) { hint = h || {}; dirty = true; }, function () {});
	} catch (e) {}
	var st = Date.now(), sec = 0, scroll = 0, parts = {}, taps = [], sent = 0, sends = 0, lastMove = Date.now(), dirty = true;

	function label(el) { return (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40); }
	function partNow() {
		var mid = window.innerHeight / 2, list = document.querySelectorAll(kind === 'report' ? 'section[id], header.hero' : '.pl-sheet, .hello, .stats, .sec'), hit = '';
		for (var j = 0; j < list.length; j++) {
			var el = list[j], r = el.getBoundingClientRect();
			if (!r.height || r.top > mid || r.bottom < mid) continue;
			if (el.classList.contains('pl-sheet')) return el.classList.contains('pl-ideas') ? '90-day plan list' : el.classList.contains('pl-form') ? 'Post form' : 'A post, opened';
			var h = el.querySelector('h2, h1');
			hit = el.classList.contains('hello') ? 'Top' : el.classList.contains('stats') ? 'Numbers' : (h ? label(h) : el.id || 'Page');
		}
		return hit || 'Top';
	}
	setInterval(function () {
		if (document.visibilityState !== 'visible' || Date.now() - lastMove > 60000) return; // only time when the page is really in front and in use
		sec++; dirty = true;
		var p = partNow(); parts[p] = (parts[p] || 0) + 1;
		if (sec % 30 === 0) send(false);
	}, 1000);
	['scroll', 'touchstart', 'mousemove', 'keydown', 'click'].forEach(function (ev) { window.addEventListener(ev, function () { lastMove = Date.now(); }, {passive: true, capture: true}); });
	window.addEventListener('scroll', function () {
		var d = document.documentElement, max = d.scrollHeight - window.innerHeight;
		if (max > 0) scroll = Math.max(scroll, Math.round(100 * window.scrollY / max));
	}, {passive: true});
	document.addEventListener('click', function (e) {
		var el = e.target.closest ? e.target.closest('[data-a], a[href], button') : null;
		if (!el || taps.length >= 150) return;
		var a = el.getAttribute('data-a'), what = a ? ({ideas: 'Opened the 90-day plan', useidea: 'Picked an idea: ' + label(el), day: 'Tapped a calendar day', prev: 'Previous month', next: 'Next month', 'new': 'Add my own post', open: 'Opened a post', save: 'Saved a post', approve: 'Approved a post', ask: 'Ask for a change', sendask: 'Sent a change request', done: 'Marked as posted', del: 'Deleted a post', close: 'Closed a sheet', ideasfor: 'Looked for an idea for a day'}[a] || 'Tapped: ' + a) : (el.tagName === 'A' ? 'Link: ' : 'Button: ') + label(el);
		taps.push({at: sec, what: what}); dirty = true;
	}, true);

	function send(last) {
		if (!dirty && !last) return;
		if (sends >= 80) return;
		sends++; dirty = false;
		var body = JSON.stringify({k: kind, t: token, sid: sid, st: st, sec: sec, scroll: scroll, parts: parts, taps: taps.slice(sent), ret: ret, team: Boolean(read('cc_admin_key')),
			model: hint.model || '', osv: hint.platform === 'Android' || hint.platform === 'macOS' ? (hint.platformVersion || '') : '', dpr: window.devicePixelRatio || 1, disp: (window.screen ? screen.width + 'x' + screen.height : ''),
			net: (navigator.connection && navigator.connection.effectiveType) || '', touch: (navigator.maxTouchPoints || 0) > 0, dark: Boolean(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches), langs: (navigator.languages || []).slice(0, 4).join(', '),
			scr: window.innerWidth + 'x' + window.innerHeight, lang: navigator.language || '', tz: (window.Intl && Intl.DateTimeFormat().resolvedOptions().timeZone) || '', ref: document.referrer ? document.referrer.split('/').slice(0, 3).join('/') : ''});
		sent = taps.length;
		try {
			if (last && navigator.sendBeacon) navigator.sendBeacon(api + '/track', new Blob([body], {type: 'text/plain'}));
			else fetch(api + '/track', {method: 'POST', body: body, keepalive: true, headers: {'content-type': 'text/plain'}}).catch(function () {});
		} catch (e) {}
	}
	setTimeout(function () { send(false); }, 350); // a moment for the phone to answer the model question
	document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') send(true); });
	window.addEventListener('pagehide', function () { send(true); });
})();
