/* FoxCut Creator Connect — /join pitch page.
   1 personal link (?for=Name&ig=handle)      5 "what you get" stage (tabs on phones, scroll on desktop)
   2 sticky "Ask for my invite" dock           6 the tap-to-try pieces inside the mock screens
   3 request form (POST api + '/invite')       7 Instagram Insights / Creator Connect flip
   4 hero phone demo (tabs, swipe, autoplay)   8 playful bits ([data-play]) and paper confetti
   9 "Continue with Instagram" (same /start call as the connect page)
   Scroll entrances and all other movement are NOT done here: see motion.js / motion.css. */
(function () {
	'use strict';
	var $ = function (id) { return document.getElementById(id); };
	var $$ = function (s, root) { return [].slice.call((root || document).querySelectorAll(s)); };
	var q = new URLSearchParams(location.search);
	var calm = /[?&]still\b/.test(location.search) || !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
	var hasIO = 'IntersectionObserver' in window;
	function plain(v, max) { return String(v || '').replace(/[^\p{L}\p{M} .'-]/gu, '').trim().slice(0, max); }
	function handle(v) { return String(v || '').trim().replace(/^@+/, '').replace(/^(https?:\/\/)?((www|m)\.)?instagram\.com\//i, '').replace(/[\/?#].*$/, '').toLowerCase(); }
	var OKH = /^[a-z0-9._]{1,30}$/;

	/* ── 1. a link made for one person: ?for=Aisha&ig=aishas.aura ── */
	var who = plain(q.get('for'), 24), ig0 = handle(q.get('ig'));
	if (who) { $('hi-name').textContent = who + ','; $('hi').hidden = false; $('name').value = who; }
	if (OKH.test(ig0)) $('ig').value = ig0;

	/* ── 2. the bottom button on phones: shown once the hero button has scrolled away, hidden while the form is on screen ── */
	var dock = $('dock'), heroBtn = document.querySelector('.hero .btn'), join = $('join'), seenHero = true, seenJoin = false;
	function syncDock() { dock.classList.toggle('on', !seenHero && !seenJoin); }
	if (hasIO) {
		new IntersectionObserver(function (e) { seenHero = e[0].isIntersecting; syncDock(); }).observe(heroBtn);
		new IntersectionObserver(function (e) { seenJoin = e[0].isIntersecting; syncDock(); }, {threshold: 0.12}).observe(join);
	}

	/* ── 8a. paper confetti: flat pieces thrown up from a point, once. Nothing under reduced motion. ── */
	var COLS = ['#C42847', '#F2B8C6', '#E2C35A', '#D98799', '#3D2521', '#F6E3A1'];
	function confetti(x, y, n) {
		if (calm || !document.body.animate) return;
		var host = document.createElement('div');
		host.className = 'cf'; host.setAttribute('aria-hidden', 'true');
		host.style.transform = 'translate(' + x + 'px,' + y + 'px)';
		for (var i = 0; i < n; i++) {
			var p = document.createElement('i'), a = -Math.PI / 2 + (Math.random() - .5) * 2.2, v = 90 + Math.random() * 170;
			var dx = Math.cos(a) * v, up = Math.sin(a) * v, spin = (Math.random() - .5) * 900, t = 900 + Math.random() * 700;
			p.className = ['', 'd', 'r'][i % 3];
			p.style.background = COLS[i % COLS.length];
			host.appendChild(p);
			p.animate([
				{transform: 'translate(0,0) rotate(0deg)', opacity: 1},
				{transform: 'translate(' + dx * .7 + 'px,' + up + 'px) rotate(' + spin * .5 + 'deg)', opacity: 1, offset: .35, easing: 'ease-in'},
				{transform: 'translate(' + dx + 'px,' + (up + 260 + Math.random() * 120) + 'px) rotate(' + spin + 'deg)', opacity: 0}
			], {duration: t, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards'});
		}
		document.body.appendChild(host);
		setTimeout(function () { host.remove(); }, 1800);
	}
	function confettiAt(el, n) { var r = el.getBoundingClientRect(); confetti(r.left + r.width / 2, r.top + r.height / 2, n); }
	function replay(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

	/* ── 3. the request form ── */
	var form = $('f'), err = $('err'), go = $('go'), box = $('box'), busy = false;
	var nameIn = $('name'), igIn = $('ig'), at = $('at'), hint = $('ig-hint'), ticket = $('ticket'), tkAv = $('tk-av'), tkIg = $('tk-ig'), tkLab = $('tk-lab');
	var HINT0 = hint.textContent;
	function preview() {
		var n = plain(nameIn.value, 40), raw = igIn.value.trim(), u = handle(raw), ok = OKH.test(u);
		tkLab.textContent = n ? 'Invitation for ' + n : 'Invitation for you';
		var letter = (n || (ok ? u.replace(/[^a-z0-9]/g, '') : '')).charAt(0);
		tkAv.textContent = letter; tkAv.classList.toggle('fox', !letter);
		tkIg.textContent = '@' + (ok ? u : 'yourhandle');
		ticket.classList.toggle('is-empty', !ok);
		at.classList.toggle('is-ok', ok);
		at.classList.toggle('is-bad', !!raw && !ok);
		hint.classList.toggle('bad', !!raw && !ok);
		if (!raw) hint.textContent = HINT0;
		else if (ok) { hint.textContent = 'We will invite '; var b = document.createElement('b'); b.textContent = '@' + u; hint.appendChild(b); hint.appendChild(document.createTextNode('. Looks right?')); }
		else hint.textContent = 'Only letters, numbers, dots and underscores.';
	}
	nameIn.addEventListener('input', preview);
	igIn.addEventListener('input', preview);
	igIn.addEventListener('blur', function () { var u = handle(igIn.value); if (u !== igIn.value) { igIn.value = u; preview(); } }); // a pasted profile link becomes the handle
	preview();

	function fail(msg) { err.textContent = msg; err.hidden = false; go.disabled = false; go.textContent = 'Send me the invite'; busy = false; }
	form.addEventListener('submit', function (ev) {
		ev.preventDefault();
		if (busy) return;
		var name = plain(nameIn.value, 40), user = handle(igIn.value);
		err.hidden = true;
		if (!OKH.test(user)) { fail('Please check your Instagram username. Only letters, numbers, dots and underscores.'); igIn.focus(); return; }
		var mail = String($('email').value || '').trim().toLowerCase();
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail) || mail.length > 120) { fail('Please check your email address, so we can send you the steps.'); $('email').focus(); return; }
		var api = window.CC && window.CC.api;
		if (!api) { fail('Something is not set up on our side. Please reply to the message we sent you.'); return; }
		busy = true; go.disabled = true; go.textContent = 'Sending…';
		fetch(api + '/invite', {method: 'POST', headers: {'content-type': 'text/plain'}, body: JSON.stringify({name: name, username: user, email: mail, ref: plain(q.get('ref'), 40) || who, site: $('site').value})})
			.then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return {s: r.status, j: j}; }); })
			.then(function (r) {
				if (r.j && r.j.ok) {
					$('done-name').textContent = name ? ', ' + name : '';
					$('done-ig').textContent = '@' + user;
					form.hidden = true; $('done').hidden = false; box.classList.add('is-done'); $('done').focus();
					confettiAt(ticket, 34);
					return;
				}
				if (r.s === 429) return fail('That was a few tries in a row. Please wait a little and try again.');
				if (r.j && r.j.error === 'bad_username') return fail('Please check your Instagram username.');
				fail('That did not go through. Please try again in a minute.');
			})
			.catch(function () { fail('No connection. Please check your internet and try again.'); });
	});

	/* ── phones: show one view at a time ── */
	function showView(phone, name, back) {
		$$('.p-view', phone).forEach(function (v) {
			var on = v.getAttribute('data-view') === name;
			v.hidden = !on;
			v.classList.remove('is-in', 'back');
			if (on) { void v.offsetWidth; v.classList.add('is-in'); if (back) v.classList.add('back'); }
		});
		phone.setAttribute('data-now', name);
	}
	function swipe(el, fn) { // left / right swipe on a phone screen; up and down still scroll the page
		var x0 = null, y0 = 0;
		el.addEventListener('pointerdown', function (e) { x0 = e.clientX; y0 = e.clientY; });
		el.addEventListener('pointerup', function (e) {
			if (x0 === null) return;
			var dx = e.clientX - x0, dy = e.clientY - y0; x0 = null;
			if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.5) fn(dx < 0 ? 1 : -1);
		});
		el.addEventListener('pointercancel', function () { x0 = null; });
	}
	function roving(tabs, pick) { // arrow keys, Home and End on a tablist
		tabs.forEach(function (t, i) {
			t.addEventListener('click', function () { pick(i, true); });
			t.addEventListener('keydown', function (e) {
				var k = e.key, n = k === 'ArrowRight' || k === 'ArrowDown' ? i + 1 : k === 'ArrowLeft' || k === 'ArrowUp' ? i - 1 : k === 'Home' ? 0 : k === 'End' ? tabs.length - 1 : null;
				if (n === null) return;
				e.preventDefault(); n = (n + tabs.length) % tabs.length; pick(n, true); tabs[n].focus();
			});
		});
	}

	/* ── 4. hero phone: Today lives in the page; Report, Calendar and Brand kit are copies of the "what you get" screens ── */
	var hero = $('hero-phone'), getPhone = $('get-phone');
	var heroViews = hero.querySelector('.p-views'), heroTabs = $$('.p-tab', hero), HN = heroTabs.map(function (t) { return t.getAttribute('data-go'); });
	HN.forEach(function (n, i) {
		var v = heroViews.querySelector('[data-view="' + n + '"]');
		if (!v) { v = getPhone.querySelector('[data-view="' + n + '"]').cloneNode(true); v.hidden = true; heroViews.appendChild(v); }
		v.id = 'hv-' + n; v.setAttribute('role', 'tabpanel'); v.setAttribute('aria-labelledby', 'ht-' + n);
		heroTabs[i].id = 'ht-' + n; heroTabs[i].setAttribute('aria-controls', 'hv-' + n);
	});
	var heroAt = 0, AUTO = 5000, timer = 0, touched = calm, heroSeen = !hasIO;
	function heroGo(i, user) {
		var back = i < heroAt; heroAt = i;
		heroTabs.forEach(function (t, k) { var on = k === i; t.classList.toggle('is-on', on); t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1; });
		showView(hero, HN[i], back);
		if (user) stopAuto(); else schedule();
	}
	function schedule() {
		clearTimeout(timer);
		var run = !touched && heroSeen && !document.hidden;
		hero.classList.remove('is-auto');
		if (!run) return;
		void hero.offsetWidth; hero.classList.add('is-auto'); // restarts the thin progress line on the active tab
		timer = setTimeout(function () { heroGo((heroAt + 1) % HN.length, false); }, AUTO);
	}
	function stopAuto() { touched = true; clearTimeout(timer); hero.classList.remove('is-auto'); }
	hero.style.setProperty('--auto', AUTO + 'ms');
	roving(heroTabs, heroGo);
	swipe(heroViews, function (d) { heroGo((heroAt + d + HN.length) % HN.length, true); });
	['pointerdown', 'keydown'].forEach(function (ev) { hero.addEventListener(ev, stopAuto); });
	hero.addEventListener('focusin', function (e) { if (e.target.matches(':focus-visible')) stopAuto(); });
	if (hasIO) new IntersectionObserver(function (e) { heroSeen = e[0].isIntersecting; if (!touched) schedule(); }, {threshold: .35}).observe(hero);
	document.addEventListener('visibilitychange', function () { if (!touched) schedule(); });
	heroGo(0, false);

	/* ── 5. "what you get": four panels, one phone ── */
	var stage = $('get-stage'), gTabs = $$('.g-tab', stage), panels = $$('.f-panel', stage), gNav = $$('.p-tab', getPhone);
	var wide = window.matchMedia('(min-width: 900px)'), featAt = -1;
	function featGo(i, user) {
		if (i === featAt) return;
		var back = i < featAt; featAt = i;
		var name = panels[i].getAttribute('data-feat');
		gTabs.forEach(function (t, k) { var on = k === i; t.classList.toggle('is-on', on); t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1; });
		panels.forEach(function (p, k) { p.classList.toggle('is-on', k === i); });
		gNav.forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-go') === name); });
		showView(getPhone, name, back);
		if (user && !wide.matches) { // keep the tabs in view after a tap on a phone
			var top = stage.getBoundingClientRect().top;
			if (top < -4) window.scrollTo({top: window.scrollY + top, behavior: calm ? 'auto' : 'smooth'});
		}
	}
	panels.forEach(function (p, i) { p.setAttribute('role', 'tabpanel'); p.setAttribute('aria-labelledby', 'gt-' + i); });
	roving(gTabs, featGo);
	gNav.forEach(function (b) { // the phone's own bottom bar works for taps too
		b.addEventListener('click', function () {
			var i = panels.findIndex(function (p) { return p.getAttribute('data-feat') === b.getAttribute('data-go'); });
			if (i < 0) return;
			if (wide.matches) panels[i].scrollIntoView({behavior: calm ? 'auto' : 'smooth', block: 'center'}); else featGo(i, true);
		});
	});
	swipe(getPhone.querySelector('.p-views'), function (d) { if (!wide.matches) featGo(Math.max(0, Math.min(panels.length - 1, featAt + d)), true); });
	if (hasIO) { // desktop: the phone follows the panel crossing the middle of the screen
		var spy = new IntersectionObserver(function (es) {
			if (!wide.matches) return;
			es.forEach(function (e) { if (e.isIntersecting) featGo(panels.indexOf(e.target), false); });
		}, {rootMargin: '-50% 0px -50% 0px'});
		panels.forEach(function (p) { spy.observe(p); });
	}
	featGo(0, false);

	/* ── 6. tap-to-try pieces inside the mock screens (delegated, so the hero copies work too) ── */
	document.addEventListener('click', function (e) {
		var b = e.target.closest('[data-act]');
		if (!b) return;
		var act = b.getAttribute('data-act');
		if (act === 'done') {
			var on = b.getAttribute('aria-pressed') !== 'true';
			b.setAttribute('aria-pressed', on ? 'true' : 'false');
			b.closest('.item').classList.toggle('is-done', on);
			if (on) confettiAt(b, 14);
		} else if (act === 'day') {
			$$('.wk-post', b.closest('.wk')).forEach(function (li) {
				var me = li === b.parentNode;
				li.classList.toggle('is-open', me);
				li.querySelector('.wk-b').setAttribute('aria-expanded', me ? 'true' : 'false');
			});
		} else if (act === 'rate') {
			var box2 = b.closest('.rates'), out = box2.querySelector('.rate-out');
			$$('[data-act="rate"]', box2).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
			out.querySelector('b').textContent = b.getAttribute('data-v');
			out.querySelector('span').textContent = b.getAttribute('data-u');
		}
	});
	function chart(el) { // one slider: tap or slide anywhere on it, or use the arrow keys
		var bars = $$('.cbars i', el), out = el.querySelector('.chart-out'), at2 = bars.findIndex(function (b) { return b.classList.contains('is-on'); }), down = false;
		function set(i) {
			i = Math.max(0, Math.min(bars.length - 1, i));
			if (i === at2) return; at2 = i;
			bars.forEach(function (b, k) { b.classList.toggle('is-on', k === i); });
			var t = bars[i].getAttribute('data-t'), n = bars[i].getAttribute('data-n');
			out.querySelector('b').textContent = t; out.querySelector('span').textContent = n;
			el.setAttribute('aria-valuenow', i + 1);
			el.setAttribute('aria-valuetext', t.replace(/–/g, ' to ') + ': ' + n.toLowerCase());
		}
		function fromX(x) { var r = el.querySelector('.cbars').getBoundingClientRect(); set(Math.floor((x - r.left) / r.width * bars.length)); }
		el.addEventListener('pointerdown', function (e) { e.stopPropagation(); down = true; try { el.setPointerCapture(e.pointerId); } catch (x) {} fromX(e.clientX); });
		el.addEventListener('pointermove', function (e) { if (down) fromX(e.clientX); });
		['pointerup', 'pointercancel'].forEach(function (ev) { el.addEventListener(ev, function (e) { down = false; e.stopPropagation(); }); });
		el.addEventListener('keydown', function (e) {
			var k = e.key, n = k === 'ArrowRight' || k === 'ArrowUp' ? at2 + 1 : k === 'ArrowLeft' || k === 'ArrowDown' ? at2 - 1 : k === 'Home' ? 0 : k === 'End' ? bars.length - 1 : null;
			if (n === null) return;
			e.preventDefault(); e.stopPropagation(); set(n);
		});
	}
	$$('[data-chart]').forEach(chart);

	/* ── 7. Instagram Insights / Creator Connect: starts on Instagram, flips itself once when she reaches it, then it is hers ── */
	var vs = $('vs'), vsOpts = $$('.vs-opt', vs), vsTouched = false;
	function side(s) {
		vs.setAttribute('data-side', s);
		vsOpts.forEach(function (o) { o.setAttribute('aria-pressed', o.getAttribute('data-side') === s ? 'true' : 'false'); });
		$$('.vs-a', vs).forEach(function (a) { a.setAttribute('aria-hidden', a.classList.contains(s) ? 'false' : 'true'); });
	}
	vsOpts.forEach(function (o) { o.addEventListener('click', function () { vsTouched = true; side(o.getAttribute('data-side')); }); });
	side(calm || !hasIO ? 'cc' : 'ig');
	if (!calm && hasIO) {
		var vio = new IntersectionObserver(function (e) {
			if (!e[0].isIntersecting) return;
			vio.disconnect();
			setTimeout(function () { if (!vsTouched) side('cc'); }, 1500);
		}, {threshold: .6});
		vio.observe(vs);
	}

	/* ── 8b. playful bits: anything with data-play gets .poked for one beat when tapped ── */
	var HELLO = ['hi!', 'hello!', 'hey you', 'namaste!', 'on it!', 'we got you', 'hii!', 'yay!'];
	document.addEventListener('click', function (e) {
		var p = e.target.closest('[data-play="poke"]');
		if (!p) return;
		replay(p, 'poked');
		var cap = p.querySelector('.pal-cap');
		if (cap) { var n = (Number(p.getAttribute('data-n')) || 0) + 1; p.setAttribute('data-n', n); cap.textContent = HELLO[(HELLO.indexOf(p.getAttribute('data-hello')) + n) % HELLO.length]; }
		else confettiAt(p, 8);
	});
	$$('.g-tab, .p-tab').forEach(function (t) { t.addEventListener('click', function () { $$('.f-panel.is-on .f-try').forEach(function (n) { replay(n, 'poked'); }); }); });

	/* the "how it feels" row only scrolls sideways on phones, so it is only a keyboard stop there */
	var perksRow = $('perks'), perksMq = window.matchMedia('(max-width: 640px)');
	function perksStop() { if (perksMq.matches) perksRow.setAttribute('tabindex', '0'); else perksRow.removeAttribute('tabindex'); }
	perksStop();
	if (perksMq.addEventListener) perksMq.addEventListener('change', perksStop);

	/* ── 9. already invited: "Continue with Instagram" — the same /start call as the connect page (site/index.html) ── */
	var cc = window.CC || {};
	var ref = (q.get('ref') || q.get('for') || '').slice(0, 60);
	var mode = /^(dm|post)$/.test(q.get('mode') || '') ? q.get('mode') : '';
	var label = new Map();
	function say(btn, text) {
		var b = btn.closest('[data-cta]'), m = b && b.querySelector('.msg');
		if (m) { m.textContent = text; m.classList.add('show'); }
	}
	function reset(btn) { btn.disabled = false; btn.innerHTML = label.get(btn); }
	$$('.js-connect').forEach(function (btn) {
		label.set(btn, btn.innerHTML);
		btn.addEventListener('click', function () {
			$$('.msg').forEach(function (m) { m.classList.remove('show'); });
			btn.disabled = true; btn.textContent = 'Opening Instagram…';
			fetch(cc.api + '/start?ref=' + encodeURIComponent(ref) + (mode ? '&mode=' + mode : ''))
				.then(function (r) { return r.json(); })
				.then(function (d) {
					if (d.ok && d.url) { location.href = d.url; return; }
					say(btn, d.error === 'not_configured' ? 'This link isn’t switched on yet. Busy Fox will message you when it’s ready.' : 'We couldn’t open Instagram. Please try again in a minute.');
					reset(btn);
				})
				.catch(function () { say(btn, 'No connection. Check your internet and try again.'); reset(btn); });
		});
	});
	window.addEventListener('pageshow', function () { $$('.js-connect').forEach(reset); }); // back button from Instagram
	/* ── 10. story maker demo (#mk): Templates / Collages switch + a rail of designs; the same photos are restyled by data-d ── */
	(function () {
		var mk = $('mk'); if (!mk) return;
		var canvas = $('mk-canvas'), nameEl = $('mk-name'), modes = $$('.mk-mode', mk), rails = $$('.mk-rail', mk), all = $$('.mk-d', mk), last = {t: 'polaroid', c: 'c3'}, mode = 't';
		function design(d) {
			var b = all.find(function (x) { return x.getAttribute('data-d') === d; }); if (!b) return;
			mode = b.getAttribute('data-m'); last[mode] = d;
			canvas.setAttribute('data-d', d); mk.setAttribute('data-m', mode);
			all.forEach(function (x) { var on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
			modes.forEach(function (m) { var on = m.getAttribute('data-m') === mode; m.classList.toggle('is-on', on); m.setAttribute('aria-pressed', on ? 'true' : 'false'); });
			rails.forEach(function (r) { r.hidden = r.getAttribute('data-m') !== mode; });
			nameEl.textContent = b.getAttribute('data-name');
			if (b.scrollIntoView && b.offsetParent) { var r = b.parentNode, br = b.getBoundingClientRect(), rr = r.getBoundingClientRect(); if (br.left < rr.left || br.right > rr.right) r.scrollLeft += br.left - rr.left - 8; }
		}
		all.forEach(function (b) { b.addEventListener('click', function () { design(b.getAttribute('data-d')); }); });
		modes.forEach(function (m) { m.addEventListener('click', function () { design(last[m.getAttribute('data-m')]); }); });
		swipe(canvas, function (dir) { // swipe the story itself: next / previous design of the open rail
			var list = all.filter(function (x) { return x.getAttribute('data-m') === mode; }), i = list.findIndex(function (x) { return x.classList.contains('is-on'); });
			design(list[(i + dir + list.length) % list.length].getAttribute('data-d'));
		});
		design('polaroid');
	})();
})();

/* Invitation status: after she asks, check every 30 s whether the Busy Fox inviter has sent it, and say so. */
(function () {
	'use strict';
	var api = window.CC && window.CC.api, box = document.getElementById('inv-status'), done = document.getElementById('done'), igEl = document.getElementById('done-ig');
	if (!api || !box || !done || !('MutationObserver' in window)) return;
	var timer = 0, tries = 0;
	function acceptUrl() { // our own page: it opens Instagram in the browser, where invitations show (the app has no such screen)
		var u = (igEl.textContent || '').replace(/^@/, '').trim().toLowerCase(), n = (document.getElementById('name').value || '').trim();
		return '../accept/?for=' + encodeURIComponent(n || u) + '&ig=' + encodeURIComponent(u);
	}
	function show(sent) {
		[].forEach.call(document.querySelectorAll('.js-accept'), function (x) { x.href = acceptUrl(); });
		box.hidden = false; box.classList.add('show');
		box.textContent = '';
		if (!sent) { box.textContent = 'Waiting for your invitation to be sent\u2026'; return; }
		var b = document.createElement('b'); b.textContent = 'Your invitation is ready. ';
		var a = document.createElement('a'); a.href = acceptUrl(); a.textContent = 'Open your invitation page';
		box.appendChild(b); box.appendChild(a); box.appendChild(document.createTextNode(' for the two last taps: accept, then connect.'));
	}
	function check() {
		var u = (igEl.textContent || '').replace(/^@/, '').trim().toLowerCase();
		if (!/^[a-z0-9._]{1,30}$/.test(u)) return;
		fetch(api + '/invite/status?u=' + encodeURIComponent(u)).then(function (r) { return r.json(); }).then(function (j) {
			if (j && j.state === 'sent') { show(true); clearInterval(timer); }
		}).catch(function () {});
		if (++tries > 240) clearInterval(timer); // two hours, then stop asking
	}
	new MutationObserver(function () {
		if (done.hidden || timer) return;
		show(false); check(); timer = setInterval(function () { if (!document.hidden) check(); }, 30000);
	}).observe(done, {attributes: true, attributeFilter: ['hidden']});
})();
