/* Foxy on the creator dashboard.
   - "Foxy says" card near the top: 3 nudges for today + today's challenge and her Foxy streak.
   - The corner button opens the Foxy room: a full-screen space with Foxy (who changes mood as it works), today's
     challenge with a streak, quick-ask tiles, and the chat. Replies can end with action buttons (ask more, make a PDF,
     add an idea to her plan, open the carousel or story maker) and PDF cards (Open / Download / Share).
   Worker: GET /me/foxy/hello, GET/POST /me/foxy/chat (SSE), POST /me/foxy/chat-clear, /me/foxy/forget,
   /me/foxy/challenge-done, /me/post (her planner). Use: FoxyChat.init({api, token, first, mount}). */
(function () {
	'use strict';
	var O = {}, open = false, busy = false, history = [], loaded = false, ready = Promise.resolve(), day = null;
	var IMG = '../assets/foxy/', V = '?v=20261121a';
	var MOODS = {hello: 1, thinking: 1, pdf: 1, celebrate: 1, oops: 1, sit: 1}, mood = 'hello', moodTimer = 0;
	function pic(m, small) { return IMG + m + (small ? '-s' : '') + '.webp' + V; }
	function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]; }); }
	function md(t) { // a small, safe markdown: paragraphs, - and 1. lists, **bold**
		var lines = esc(t).split('\n'), out = [], list = null;
		function close() { if (list) { out.push('</' + list + '>'); list = null; } }
		lines.forEach(function (l) {
			var b = l.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
			var ul = /^\s*[-•]\s+(.*)$/.exec(b), ol = /^\s*\d+[.)]\s+(.*)$/.exec(b);
			if (ul || ol) { var k = ul ? 'ul' : 'ol'; if (list !== k) { close(); out.push('<' + k + '>'); list = k; } out.push('<li>' + (ul || ol)[1] + '</li>'); return; }
			close();
			if (b.trim()) out.push('<p>' + b.replace(/^#+\s*/, '') + '</p>');
		});
		close();
		return out.join('');
	}
	function visible(t) { // while streaming, hide the <actions> line Foxy writes at the end (and any half-typed start of it)
		var i = t.indexOf('<actions'); if (i >= 0) return t.slice(0, i);
		var j = t.lastIndexOf('<'); if (j >= 0 && '<actions>'.indexOf(t.slice(j)) === 0) return t.slice(0, j);
		return t;
	}
	function req(path, opts) {
		opts = opts || {}; opts.headers = Object.assign({Authorization: 'Bearer ' + O.token}, opts.headers || {}); opts.cache = 'no-store';
		return fetch(O.api + path, opts);
	}
	function postJson(path, body) { return req(path, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body || {})}).then(function (r) { return r.json(); }); }
	function el(h) { var d = document.createElement('div'); d.innerHTML = h.trim(); return d.firstChild; }
	var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

	// ---------- moods: Foxy's face follows what it is doing ----------
	function setMood(m, back) {
		if (!MOODS[m]) m = 'hello';
		clearTimeout(moodTimer);
		if (back) moodTimer = setTimeout(function () { setMood('hello'); }, back);
		if (m === mood) return; mood = m;
		document.querySelectorAll('[data-mood]').forEach(function (im) {
			im.src = pic(m, im.dataset.mood === 's');
			if (!still) { im.classList.remove('fx-pop'); void im.offsetWidth; im.classList.add('fx-pop'); }
		});
	}
	function status(t) { if (stat) stat.textContent = t || 'Knows your audit, numbers and plan'; }

	// ---------- "Foxy says" card ----------
	var says;
	function saysCard() {
		says = el('<section class="fx-says" aria-live="polite"><div class="fx-h"><img src="' + pic('hello', true) + '" alt="" width="52" height="52"><div><span>Foxy says</span><b>' + (O.first ? 'Hey ' + esc(O.first) + ', here is your nudge for today' : 'Your nudge for today') + '</b></div></div><p class="fx-wait">Looking at your numbers…</p></section>');
		var host = O.mount || document.querySelector('main') || document.body;
		host.insertBefore(says, host.firstChild);
		(function load(again) { req('/me/foxy/hello').then(function (r) { return r.json(); }).then(function (d) {
			if (d && d.error === 'making' && !again) { setTimeout(function () { load(true); }, 9000); return; } // another visit is making today's tips
			if (!d || !d.ok || !Array.isArray(d.tips) || !d.tips.length) { says.remove(); return; }
			day = d; paintSays(); paintChallenge();
		}, function () { says.remove(); }); })(false);
	}
	function paintSays() {
		var d = day, c = d.challenge, ch = d.ch || {};
		var html = '<ul class="fx-tips">' + d.tips.slice(0, 3).map(function (t, i) { return '<li><b>' + esc(t.title) + '</b><br>' + esc(t.text) + (t.ask ? '<br><button type="button" data-i="' + i + '">' + esc(t.cta || 'Ask Foxy') + '</button>' : '') + '</li>'; }).join('') + '</ul>' +
			(c ? '<button type="button" class="fx-chline"><span class="fx-chk' + (ch.done ? ' on' : '') + '" aria-hidden="true"></span><span><small>Today’s challenge · ' + c.minutes + ' min' + (ch.streak ? ' · ' + ch.streak + '-day streak' : '') + '</small>' + esc(c.title) + '</span><i aria-hidden="true">›</i></button>' : '') +
			'<button type="button" class="fx-open">Open Foxy</button>';
		var w = says.querySelector('.fx-wait, .fx-body'); var body = el('<div class="fx-body">' + html + '</div>'); w.replaceWith(body);
		body.querySelectorAll('[data-i]').forEach(function (b) { b.onclick = function () { send(d.tips[+b.dataset.i].ask); }; });
		body.querySelector('.fx-open').onclick = function () { show(); };
		var cl = body.querySelector('.fx-chline'); if (cl) cl.onclick = function () { show(); setTimeout(function () { var x = room.querySelector('.fx-ch'); if (x) x.scrollIntoView({block: 'center', behavior: still ? 'auto' : 'smooth'}); }, 80); };
	}

	// ---------- the Foxy room ----------
	var fab, room, scroller, log, ta, sendBtn, tiles, chBox, stat, hero;
	var TILES = [
		['cal', 'What should I post this week?'],
		['doc', 'Make my media kit PDF for brands'],
		['film', 'Give me 3 new reel ideas'],
		['chart', 'Why did my reach change lately?'],
		['mail', 'Write a pitch I can send to a brand'],
		['te', 'నా ఆడిట్ లో ముఖ్యమైనవి ఏమిటి?']];
	var ICON = {
		cal: '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
		doc: '<path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
		film: '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M10 9l5 3-5 3z"/>',
		chart: '<path d="M4 19h16M7 15l4-4 3 3 5-6"/>',
		mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M4 7l8 6 8-6"/>',
		te: '<path d="M5 6h14M12 4v2M8 6c0 5 3 9 9 11M16 6c-1 5-5 9-11 11"/>'};
	function svg(k) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICON[k] + '</svg>'; }

	function build() {
		fab = el('<button type="button" class="fx-fab" aria-haspopup="dialog" aria-label="Open Foxy, your assistant"><img src="' + pic('sit', true) + '" alt="" width="46" height="46"><span>Ask Foxy</span></button>');
		document.body.appendChild(fab); document.body.classList.add('fx-fab-pad');
		fab.onclick = show;
		room = el('<div class="fx-room" role="dialog" aria-modal="true" aria-label="Foxy" hidden>' +
			'<header class="fx-bar"><button type="button" class="fx-back" aria-label="Close Foxy"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>' +
			'<img data-mood="s" src="' + pic('hello', true) + '" alt="" width="40" height="40"><div class="fx-who"><b>Foxy</b><span class="fx-stat">Knows your audit, numbers and plan</span></div>' +
			'<button type="button" class="fx-new">New chat</button><button type="button" class="fx-more" aria-label="More" aria-haspopup="menu" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg></button>' +
			'<div class="fx-menu" role="menu" hidden><button type="button" role="menuitem" class="fx-forget">Forget everything</button></div></header>' +
			'<div class="fx-scroll"><section class="fx-hero"><img data-mood="l" src="' + pic('hello') + '" alt="Foxy, your growth buddy" width="240" height="240"><h2>' + (O.first ? 'Hey ' + esc(O.first) + '!' : 'Hey there!') + '</h2><p>I know your audit, your numbers and your plan. Ask me anything, in Telugu or English.</p></section>' +
			'<section class="fx-ch" aria-label="Today’s challenge" hidden></section>' +
			'<section class="fx-tiles" aria-label="Quick asks">' + TILES.map(function (t) { return '<button type="button">' + svg(t[0]) + '<span>' + esc(t[1]) + '</span></button>'; }).join('') + '</section>' +
			'<div class="fx-log" role="log" aria-live="polite"></div></div>' +
			'<form class="fx-form"><label class="fx-sr" for="fxIn">Message Foxy</label><textarea id="fxIn" rows="1" maxlength="1500" placeholder="Ask Foxy anything…"></textarea><button type="submit" aria-label="Send"><svg viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6"/></svg></button></form>' +
			'<p class="fx-fine">Foxy can get things wrong. Check numbers on your dashboard.</p></div>');
		document.body.appendChild(room);
		scroller = room.querySelector('.fx-scroll'); log = room.querySelector('.fx-log'); ta = room.querySelector('textarea'); sendBtn = room.querySelector('.fx-form button'); tiles = room.querySelector('.fx-tiles'); chBox = room.querySelector('.fx-ch'); stat = room.querySelector('.fx-stat'); hero = room.querySelector('.fx-hero');
		room.querySelector('.fx-back').onclick = hide;
		room.querySelector('.fx-new').onclick = function () { if (busy) return; req('/me/foxy/chat-clear', {method: 'POST'}).then(function () { history = []; render(); scroller.scrollTop = 0; }); };
		var more = room.querySelector('.fx-more'), menu = room.querySelector('.fx-menu');
		more.onclick = function () { menu.hidden = !menu.hidden; more.setAttribute('aria-expanded', String(!menu.hidden)); };
		room.addEventListener('click', function (e) { if (!menu.hidden && !menu.contains(e.target) && !more.contains(e.target)) { menu.hidden = true; more.setAttribute('aria-expanded', 'false'); } });
		room.querySelector('.fx-forget').onclick = function () { menu.hidden = true; forget(); };
		tiles.querySelectorAll('button').forEach(function (b) { b.onclick = function () { send(b.querySelector('span').textContent); }; });
		room.querySelector('form').onsubmit = function (e) { e.preventDefault(); send(ta.value); };
		ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(ta.value); } });
		ta.addEventListener('input', function () { ta.style.height = 'auto'; ta.style.height = Math.min(120, ta.scrollHeight) + 'px'; });
		document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) hide(); });
		var vv = window.visualViewport; // phone keyboard: keep the room (and the text box) above it
		function fit() {
			if (!open || !vv) { room.style.height = ''; return; }
			room.style.height = vv.height + 'px'; room.style.top = vv.offsetTop + 'px';
		}
		if (vv) { vv.addEventListener('resize', fit); vv.addEventListener('scroll', fit); }
		room.fit = fit;
	}
	function forget() {
		if (busy || log.querySelector('.fx-confirm')) return;
		var c = el('<div class="fx-m fox fx-confirm" role="alertdialog" aria-label="Forget everything?"><p><b>Forget everything?</b> Foxy will delete all your chats and everything it remembers about you. This cannot be undone.</p><div class="fx-cbtn"><button type="button" class="yes">Yes, forget</button><button type="button" class="no">Keep it</button></div></div>');
		log.appendChild(c); scroller.scrollTop = scroller.scrollHeight; c.querySelector('.no').focus();
		c.querySelector('.no').onclick = function () { c.remove(); ta.focus(); };
		c.querySelector('.yes').onclick = function () {
			c.querySelectorAll('button').forEach(function (x) { x.disabled = true; });
			req('/me/foxy/forget', {method: 'POST'}).then(function (r) { return r.json(); }).then(function (d) {
				if (!d || !d.ok) throw new Error('x');
				history = []; render();
				log.appendChild(el('<div class="fx-m fox"><p>Done. I have forgotten our chats and everything I noted about you. Your audit and dashboard numbers are still here for me to help with.</p></div>'));
			}).catch(function () { c.remove(); setMood('oops', 2500); log.appendChild(el('<div class="fx-m fox fx-err"><p>That did not go through. Try again in a moment.</p></div>')); });
		};
	}

	// ---------- today's challenge + streak ----------
	var DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
	function paintChallenge() {
		if (!chBox || !day || !day.challenge) return;
		var c = day.challenge, ch = day.ch || {done: false, streak: 0, week: []};
		chBox.hidden = false;
		chBox.className = 'fx-ch' + (ch.done ? ' done' : '');
		chBox.innerHTML = '<div class="fx-ch-top"><span class="fx-lab">Today’s challenge · ' + c.minutes + ' min</span>' +
			'<span class="fx-streak" title="Days in a row"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c1 3 4 5 4 9a4 4 0 0 1-8 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 0-8z"/></svg><b>' + (ch.streak || 0) + '</b><span>day' + (ch.streak === 1 ? '' : 's') + ' in a row</span></span></div>' +
			'<h3>' + esc(c.title) + '</h3><p>' + esc(c.text) + '</p>' +
			'<ol class="fx-week" aria-label="This week">' + (ch.week || []).map(function (w) { var dd = new Date(w.d + 'T12:00:00'); return '<li class="' + (w.on ? 'on' : '') + '"><i></i><span>' + DOW[dd.getDay()] + '</span></li>'; }).join('') + '</ol>' +
			'<div class="fx-ch-btn"><button type="button" class="fx-did">' + (ch.done ? 'Done today ✓' : 'I did it') + '</button>' + (c.ask ? '<button type="button" class="fx-help">Help me do it</button>' : '') + '</div>';
		chBox.querySelector('.fx-did').onclick = function (e) {
			var b = e.currentTarget, on = !ch.done; b.disabled = true;
			postJson('/me/foxy/challenge-done', {on: on, what: c.title}).then(function (r) {
				if (!r || !r.ok) throw new Error('x');
				day.ch = r.ch; paintChallenge(); paintSays();
				if (on) {
					setMood('celebrate', 3200);
					var at = chBox.getBoundingClientRect();
					if (window.Fun && window.Fun.confetti && !still) window.Fun.confetti(at.left + at.width / 2, at.top + 40);
					status(r.ch.streak > 1 ? r.ch.streak + ' days in a row. Lovely!' : 'Challenge done. See you tomorrow!');
					setTimeout(function () { status(''); }, 3200);
				}
			}).catch(function () { b.disabled = false; setMood('oops', 2500); status('That did not save. Try again.'); });
		};
		var h = chBox.querySelector('.fx-help'); if (h) h.onclick = function () { send(c.ask); };
	}

	function show() {
		open = true; room.hidden = false; fab.hidden = true; document.documentElement.classList.add('fx-lock');
		if (!loaded) { loaded = true; ready = req('/me/foxy/chat').then(function (r) { return r.json(); }).then(function (d) { if (d && d.ok && Array.isArray(d.messages) && !busy) { history = d.messages; render(); if (history.length) toEnd(); else scroller.scrollTop = 0; } }).catch(function () {}); }
		render(); paintChallenge(); room.fit(); if (!history.length) scroller.scrollTop = 0; else toEnd();
		setTimeout(function () { if (innerWidth > 700) ta.focus(); }, 60);
	}
	function hide() { open = false; room.hidden = true; fab.hidden = false; document.documentElement.classList.remove('fx-lock'); room.style.height = ''; fab.focus(); }
	function toEnd() { scroller.scrollTop = scroller.scrollHeight; }
	function render() {
		log.innerHTML = history.map(function (m, i) { return m.role === 'user' ? '<div class="fx-m me">' + esc(m.text) + '</div>' : bubble(m, i); }).join('');
		log.querySelectorAll('[data-h]').forEach(function (b) { wire(b, history[+b.dataset.h]); });
		tiles.hidden = history.length > 0; hero.classList.toggle('small', history.length > 0);
	}
	function bubble(m, i) { return '<div class="fx-m fox' + (m.err ? ' fx-err' : '') + '" data-h="' + i + '">' + inner(m) + '</div>'; }
	function inner(m) {
		return md(visible(m.text)) + cards(m.files) + (m.status ? '<p class="fx-making"><span class="fx-typing"><i></i><i></i><i></i></span> ' + esc(m.status) + '</p>' : '') + acts(m.actions);
	}

	// ---------- PDFs Foxy made ----------
	function cards(files) {
		return (files || []).map(function (f, i) {
			return '<div class="fx-file" data-f="' + i + '"><div class="fx-pdf" aria-hidden="true"><span>PDF</span></div><div class="fx-fmeta"><b>' + esc(f.title || f.name) + '</b><span>' + esc(f.name) + ' · ' + (f.pages || 1) + ' page' + (f.pages === 1 ? '' : 's') + '</span></div>' +
				'<div class="fx-fbtn"><a href="' + esc(f.url) + '" target="_blank" rel="noopener">Open</a><a href="' + esc(f.url) + '?dl=1" download>Download</a><button type="button" class="fx-share">Share</button></div></div>';
		}).join('');
	}
	// ---------- action buttons under a reply ----------
	var AICON = {ask: 'M5 12h13M13 6l6 6-6 6', pdf: 'M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM14 3v5h5', plan: 'M3.5 5h17v15h-17zM3.5 10h17M12 13v5M9.5 15.5h5', carousel: 'M7 4h10v16H7zM3 7v10M21 7v10', story: 'M6 3h12v18H6zM10 18h4'};
	function acts(list) {
		if (!list || !list.length) return '';
		return '<div class="fx-acts">' + list.map(function (a, i) { return '<button type="button" data-a="' + i + '"' + (a.done ? ' disabled class="done"' : '') + '><svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + AICON[a.k] + '"/></svg>' + esc(a.done ? a.doneLabel || 'Done' : a.label) + '</button>'; }).join('') + '</div>';
	}
	function wire(root, m) {
		(root.querySelectorAll('.fx-file') || []).forEach(function (c) {
			var f = m.files[+c.dataset.f], b = c.querySelector('.fx-share');
			b.onclick = function () {
				var done = function (t) { b.textContent = t; setTimeout(function () { b.textContent = 'Share'; }, 1800); };
				fetch(f.url).then(function (r) { return r.blob(); }).then(function (bl) {
					var file = new File([bl], f.name, {type: 'application/pdf'});
					if (navigator.canShare && navigator.canShare({files: [file]})) return navigator.share({files: [file], title: f.title});
					if (navigator.share) return navigator.share({title: f.title, url: f.url});
					return navigator.clipboard.writeText(f.url).then(function () { done('Link copied'); });
				}).catch(function (e) { if (e && e.name === 'AbortError') return; if (navigator.clipboard) navigator.clipboard.writeText(f.url).then(function () { done('Link copied'); }); });
			};
		});
		root.querySelectorAll('[data-a]').forEach(function (b) {
			var a = m.actions[+b.dataset.a];
			b.onclick = function () { act(a, b, m); };
		});
	}
	function act(a, b, m) {
		if (a.k === 'ask' || a.k === 'pdf') return send(a.ask);
		if (a.k === 'carousel') { location.href = '../carousel/?v=20261119c#' + O.token; return; }
		if (a.k === 'story') { location.href = '../make/?v=20261119c#' + O.token; return; }
		if (a.k === 'plan') {
			b.disabled = true; b.lastChild.textContent = 'Adding…';
			postJson('/me/post', {at: a.at, type: a.type, hook: a.hook, caption: a.caption, mode: 'self'}).then(function (r) {
				if (!r || !r.ok) throw new Error((r && r.error) || 'x');
				a.done = true; a.doneLabel = 'On your plan ✓'; b.className = 'done'; b.lastChild.textContent = a.doneLabel;
				setMood('celebrate', 2600);
				if (window.Fun && window.Fun.toast) window.Fun.toast('Added to your content plan');
			}).catch(function (e) { b.disabled = false; b.lastChild.textContent = a.label; setMood('oops', 2500); status(e.message && e.message !== 'x' ? e.message : 'Could not add it. Try again.'); setTimeout(function () { status(''); }, 3500); });
		}
	}

	// ---------- talking to Foxy ----------
	function send(text) {
		text = String(text || '').trim(); if (!text || busy) return;
		if (!open) show();
		busy = true; sendBtn.disabled = true; ta.value = ''; ta.style.height = 'auto';
		ready.then(function () { // her saved chat has to land first, or it would wipe this turn
			history.push({role: 'user', text: text});
			var me = {role: 'assistant', text: ''}; history.push(me); render(); toEnd();
			var bub = log.lastChild; bub.innerHTML = '<span class="fx-typing" aria-label="Foxy is thinking"><i></i><i></i><i></i></span>';
			setMood('thinking'); status('Thinking…');
			return ask(text, me, bub);
		});
	}
	function ask(text, me, bub) {
		var paint = function () { bub.innerHTML = inner(me); wire(bub, me); toEnd(); };
		return req('/me/foxy/chat', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({message: text})}).then(function (r) {
			if (!r.ok || !r.body) return r.json().catch(function () { return {}; }).then(function (d) { throw new Error(d.error || 'Foxy could not answer right now.'); });
			var rd = r.body.getReader(), dec = new TextDecoder(), buf = '';
			return (function pump() {
				return rd.read().then(function (x) {
					if (x.done) return;
					buf += dec.decode(x.value, {stream: true});
					var parts = buf.split('\n\n'); buf = parts.pop();
					parts.forEach(function (p) {
						var line = p.split('\n').filter(function (s) { return s.indexOf('data:') === 0; }).map(function (s) { return s.slice(5).trim(); }).join('');
						if (!line) return; var ev; try { ev = JSON.parse(line); } catch (e) { return; }
						if (ev.t === 'delta') { me.text += ev.text; me.status = ''; if (mood === 'thinking' || mood === 'pdf') status('Writing…'); }
						if (ev.t === 'status') { me.status = ev.text; setMood('pdf'); status(ev.text); }
						if (ev.t === 'file' && ev.file) { me.files = (me.files || []).filter(function (f) { return f.title !== ev.file.title; }).concat([ev.file]); me.status = ''; setMood('celebrate', 3000); status('Your PDF is ready'); } // a redo replaces the earlier card
						if (ev.t === 'actions' && Array.isArray(ev.actions)) me.actions = ev.actions;
						if (ev.t === 'error') throw new Error(ev.error || 'Foxy stopped.');
						if (ev.t !== 'done') paint();
					});
					return pump();
				});
			})();
		}).then(function () {
			me.text = visible(me.text).trimEnd();
			if (!me.text && !(me.files && me.files.length)) throw new Error('Foxy had nothing to say. Try asking again.');
			if (mood !== 'celebrate') setMood('hello');
			status('');
		}).catch(function (e) {
			me.text = e.message || 'Foxy could not answer right now.'; me.err = true; me.status = '';
			setMood('oops', 4000); status('');
		}).then(function () { busy = false; sendBtn.disabled = false; render(); toEnd(); });
	}

	window.FoxyChat = {init: function (o) {
		O = o || {}; if (!O.api || !O.token || window.__foxyOn) return; window.__foxyOn = true;
		build(); saysCard();
	}};
})();
