/* Foxy on the creator dashboard: "Foxy says" tips near the top (made once a day from her own numbers and audit) and a
   chat she can open from the corner to ask anything about her audit, her plan, what to post, what to avoid.
   Talks to the worker: GET <api>/me/foxy/hello, GET/POST <api>/me/foxy/chat (POST streams the answer as SSE),
   POST <api>/me/foxy/chat-clear. Use: FoxyChat.init({api, token, first, mount}) after the dashboard has loaded. */
(function () {
	'use strict';
	var O = {}, open = false, busy = false, history = [], loaded = false, ready = Promise.resolve();
	var FOX = '../assets/fox.png';
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
	function req(path, opts) {
		opts = opts || {}; opts.headers = Object.assign({Authorization: 'Bearer ' + O.token}, opts.headers || {}); opts.cache = 'no-store';
		return fetch(O.api + path, opts);
	}
	function cards(files) { // PDFs Foxy made: open, download, share (phones share the file itself, e.g. to WhatsApp)
		return (files || []).map(function (f, i) {
			return '<div class="fx-file" data-f="' + i + '"><div class="fx-pdf" aria-hidden="true"><span>PDF</span></div><div class="fx-fmeta"><b>' + esc(f.title || f.name) + '</b><span>' + esc(f.name) + ' · ' + (f.pages || 1) + ' page' + (f.pages === 1 ? '' : 's') + '</span></div>' +
				'<div class="fx-fbtn"><a href="' + esc(f.url) + '" target="_blank" rel="noopener">Open</a><a href="' + esc(f.url) + '?dl=1" download>Download</a><button type="button" class="fx-share">Share</button></div></div>';
		}).join('');
	}
	function wire(root, files) {
		root.querySelectorAll('.fx-file').forEach(function (c) {
			var f = files[+c.dataset.f], b = c.querySelector('.fx-share');
			b.onclick = function () {
				var done = function (t) { b.textContent = t; setTimeout(function () { b.textContent = 'Share'; }, 1800); };
				fetch(f.url).then(function (r) { return r.blob(); }).then(function (bl) {
					var file = new File([bl], f.name, {type: 'application/pdf'});
					if (navigator.canShare && navigator.canShare({files: [file]})) return navigator.share({files: [file], title: f.title});
					if (navigator.share) return navigator.share({title: f.title, url: f.url});
					return navigator.clipboard.writeText(f.url).then(function () { done('Link copied'); });
				}).catch(function (e) { if (e && e.name === 'AbortError') return; navigator.clipboard && navigator.clipboard.writeText(f.url).then(function () { done('Link copied'); }); });
			};
		});
	}
	function el(h) { var d = document.createElement('div'); d.innerHTML = h.trim(); return d.firstChild; }

	// ---------- "Foxy says" card ----------
	function says() {
		var card = el('<section class="fx-says" aria-live="polite"><div class="fx-h"><img src="' + FOX + '" alt=""><div><span>Foxy says</span><b>' + (O.first ? 'Hey ' + esc(O.first) + ', here is your nudge for today' : 'Your nudge for today') + '</b></div></div><p class="fx-wait">Looking at your numbers…</p></section>');
		var host = O.mount || document.querySelector('main') || document.body;
		host.insertBefore(card, host.firstChild);
		(function load(again) { req('/me/foxy/hello').then(function (r) { return r.json(); }).then(function (d) {
			if (d && d.error === 'making' && !again) { setTimeout(function () { load(true); }, 8000); return; } // another visit is making today's tips
			if (!d || !d.ok || !Array.isArray(d.tips) || !d.tips.length) { card.remove(); return; }
			var html = '<ul class="fx-tips">' + d.tips.slice(0, 3).map(function (t, i) { return '<li><b>' + esc(t.title) + '</b><br>' + esc(t.text) + (t.ask ? '<br><button type="button" data-i="' + i + '">' + esc(t.cta || 'Ask Foxy') + '</button>' : '') + '</li>'; }).join('') + '</ul><button type="button" class="fx-open">Ask Foxy anything</button>';
			card.querySelector('.fx-wait').outerHTML = html;
			card.querySelectorAll('[data-i]').forEach(function (b) { b.onclick = function () { send(d.tips[+b.dataset.i].ask); }; });
			card.querySelector('.fx-open').onclick = function () { show(); };
		}, function () { card.remove(); }); })(false);
	}

	// ---------- chat ----------
	var fab, panel, log, ta, sendBtn, chips;
	var STARTERS = ['What should I post this week?', 'Why did my reach drop?', 'What is my best time to post?', 'What should I stop doing?', 'Give me 3 reel ideas', 'Make my media kit PDF for brands', 'నా ఆడిట్ లో ముఖ్యమైనవి ఏమిటి?'];
	function build() {
		fab = el('<button type="button" class="fx-fab" aria-haspopup="dialog" aria-label="Ask Foxy, your assistant"><img src="' + FOX + '" alt=""><span>Ask Foxy</span></button>');
		document.body.appendChild(fab); document.body.classList.add('fx-fab-pad');
		fab.onclick = show;
		panel = el('<div class="fx-panel" role="dialog" aria-modal="false" aria-label="Chat with Foxy" hidden>' +
			'<div class="fx-top"><img src="' + FOX + '" alt=""><div><b>Foxy</b><span>Your growth buddy. Knows your audit and plan.</span></div><button type="button" class="fx-new" aria-label="Start a new chat">New</button><button type="button" class="fx-x" aria-label="Close">✕</button></div>' +
			'<div class="fx-log" role="log" aria-live="polite"></div>' +
			'<div class="fx-chips" aria-label="Ideas to ask"></div>' +
			'<form class="fx-form"><label class="sr" for="fxIn" style="position:absolute;left:-9999px">Message Foxy</label><textarea id="fxIn" rows="1" maxlength="1500" placeholder="Ask Foxy anything…"></textarea><button type="submit" aria-label="Send"><svg viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6"/></svg></button></form>' +
			'<p class="fx-fine">Foxy can get things wrong. Check numbers on your dashboard. <button type="button" class="fx-forget">Forget everything</button></p></div>');
		document.body.appendChild(panel);
		log = panel.querySelector('.fx-log'); ta = panel.querySelector('textarea'); sendBtn = panel.querySelector('.fx-form button'); chips = panel.querySelector('.fx-chips');
		panel.querySelector('.fx-x').onclick = hide;
		panel.querySelector('.fx-new').onclick = function () { if (busy) return; req('/me/foxy/chat-clear', {method: 'POST'}).then(function () { history = []; render(); }); };
		panel.querySelector('.fx-forget').onclick = function () { // her choice: wipes every chat and what Foxy remembers about her
			if (busy || log.querySelector('.fx-confirm')) return;
			var c = el('<div class="fx-m fox fx-confirm" role="alertdialog" aria-label="Forget everything?"><p><b>Forget everything?</b> Foxy will delete all your chats and everything it remembers about you. This cannot be undone.</p><div class="fx-cbtn"><button type="button" class="yes">Yes, forget</button><button type="button" class="no">Keep it</button></div></div>');
			log.appendChild(c); log.scrollTop = log.scrollHeight; c.querySelector('.no').focus();
			c.querySelector('.no').onclick = function () { c.remove(); ta.focus(); };
			c.querySelector('.yes').onclick = function () {
				c.querySelectorAll('button').forEach(function (x) { x.disabled = true; });
				req('/me/foxy/forget', {method: 'POST'}).then(function (r) { return r.json(); }).then(function (d) {
					if (!d || !d.ok) throw new Error('x');
					history = []; render();
					var ok = el('<div class="fx-m fox"><p>Done. I have forgotten our chats and everything I noted about you. Your audit and dashboard numbers are still here for me to help with.</p></div>'); log.appendChild(ok);
				}).catch(function () { c.remove(); var e = el('<div class="fx-m fox fx-err"><p>That did not go through. Try again in a moment.</p></div>'); log.appendChild(e); });
			};
		};
		panel.querySelector('form').onsubmit = function (e) { e.preventDefault(); send(ta.value); };
		ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(ta.value); } });
		ta.addEventListener('input', function () { ta.style.height = 'auto'; ta.style.height = Math.min(120, ta.scrollHeight) + 'px'; });
		document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) hide(); });
		var vv = window.visualViewport; // phone keyboard: keep the sheet (and the text box) above it instead of under it
		function fit() {
			if (!open || !vv || innerWidth > 560) { panel.style.height = ''; panel.style.bottom = ''; return; }
			panel.style.height = Math.max(240, vv.height - 40) + 'px'; panel.style.bottom = Math.max(0, innerHeight - vv.height - vv.offsetTop) + 'px';
			log.scrollTop = log.scrollHeight;
		}
		if (vv) { vv.addEventListener('resize', fit); vv.addEventListener('scroll', fit); }
		panel.fit = fit;
		ta.addEventListener('focus', function () { setTimeout(function () { fit(); ta.scrollIntoView({block: 'nearest'}); }, 250); });
		chips.innerHTML = STARTERS.map(function (s) { return '<button type="button">' + esc(s) + '</button>'; }).join('');
		chips.querySelectorAll('button').forEach(function (b) { b.onclick = function () { send(b.textContent); }; });
	}
	function show() {
		open = true; panel.hidden = false; fab.hidden = true;
		if (!loaded) { loaded = true; ready = req('/me/foxy/chat').then(function (r) { return r.json(); }).then(function (d) { if (d && d.ok && Array.isArray(d.messages) && !busy) { history = d.messages; render(); } }).catch(function () {}); }
		render(); setTimeout(function () { ta.focus(); }, 50);
	}
	function hide() { open = false; panel.hidden = true; fab.hidden = false; panel.fit(); fab.focus(); }
	function render() {
		var html = history.length ? '' : '<div class="fx-m fox"><p>Hi' + (O.first ? ' ' + esc(O.first) : '') + '! I’m Foxy. I know your audit, your numbers and your content plan. Ask me what to post, what is working, what to stop, or anything about growing on Instagram. Telugu or English, both fine.</p></div>';
		html += history.map(function (m, i) { return m.role === 'user' ? '<div class="fx-m me">' + esc(m.text) + '</div>' : '<div class="fx-m fox' + (m.err ? ' fx-err' : '') + '" data-h="' + i + '">' + md(m.text) + cards(m.files) + '</div>'; }).join('');
		log.innerHTML = html; log.scrollTop = log.scrollHeight;
		log.querySelectorAll('[data-h]').forEach(function (b) { var m = history[+b.dataset.h]; if (m.files && m.files.length) wire(b, m.files); });
		chips.hidden = history.length > 2;
	}
	function send(text) {
		text = String(text || '').trim(); if (!text || busy) return;
		if (!open) show();
		busy = true; sendBtn.disabled = true; ta.value = ''; ta.style.height = 'auto';
		ready.then(function () { // her saved chat has to land first, or it would wipe this turn
			history.push({role: 'user', text: text});
			var me = {role: 'assistant', text: ''}; history.push(me); render();
			var bubble = log.lastChild; bubble.innerHTML = '<span class="fx-typing" aria-label="Foxy is typing"><i></i><i></i><i></i></span>';
			return ask(text, me, bubble);
		});
	}
	function ask(text, me, bubble) {
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
						if (ev.t === 'delta') { me.text += ev.text; me.status = ''; }
						if (ev.t === 'status') me.status = ev.text;
						if (ev.t === 'file' && ev.file) { me.files = (me.files || []).filter(function (f) { return f.title !== ev.file.title; }).concat([ev.file]); me.status = ''; } // a redo replaces the earlier card
						if (ev.t === 'delta' || ev.t === 'status' || ev.t === 'file') {
							bubble.innerHTML = md(me.text) + cards(me.files) + (me.status ? '<p class="fx-making"><span class="fx-typing"><i></i><i></i><i></i></span> ' + esc(me.status) + '</p>' : '');
							if (me.files) wire(bubble, me.files);
							log.scrollTop = log.scrollHeight;
						}
						if (ev.t === 'error') throw new Error(ev.error || 'Foxy stopped.');
					});
					return pump();
				});
			})();
		}).then(function () { if (!me.text && !(me.files && me.files.length)) throw new Error('Foxy had nothing to say. Try asking again.'); }).catch(function (e) {
			me.text = e.message || 'Foxy could not answer right now.'; me.err = true;
		}).then(function () { busy = false; sendBtn.disabled = false; render(); });
	}

	window.FoxyChat = {init: function (o) {
		O = o || {}; if (!O.api || !O.token || window.__foxyOn) return; window.__foxyOn = true;
		build(); says();
	}};
})();
