/* Busy Fox Creator Connect: reel script packs (shared by me/ and admin/).
   window.Scripts.mount(el, {voice: 'creator'|'team', packs, req(sub, {method, json}), toast})
   A pack is a highlighted cocoa card: what it is, a few facts, then each script as a card that opens
   to the full beat sheet, caption and kit. She taps "I'll shoot this" and can ask for a change. */
(function () {
	'use strict';
	function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]; }); }
	function rich(s) { return esc(s).replace(/&lt;(\/?)em&gt;/g, '<$1em>'); } // titles may carry <em> and nothing else
	function when(iso) { return iso ? new Date(iso).toLocaleString('en-IN', {day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit'}) : ''; }
	function copy(text) {
		if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
		var t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
		document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (e) {} document.body.removeChild(t);
		return Promise.resolve();
	}

	function mount(el, o) {
		var packs = o.packs || null, open = {}, noting = {}, busy = false, team = o.voice === 'team';
		var toast = o.toast || function () {};
		el.classList.add('sc-root');

		function item(p, it, i) {
			var picked = p.picks && p.picks[it.id], key = p.id + '/' + it.id, isOpen = open[key];
			var notes = (p.notes || []).filter(function (n) { return n.item === it.id; });
			var badge = picked ? '<span class="sc-badge on">' + (team ? 'She picked this' : 'You’ll shoot this') + '</span>' : (it.best ? '<span class="sc-badge">' + esc(it.best) + '</span>' : '');
			var head = '<button class="sc-head" type="button" data-a="toggle" data-p="' + esc(p.id) + '" data-i="' + esc(it.id) + '" aria-expanded="' + (isOpen ? 'true' : 'false') + '">' +
				'<span class="sc-n">' + (i + 1) + '</span>' +
				'<span class="sc-ht">' + badge + '<b>' + esc(it.title) + '</b><span class="sc-hook">' + esc(it.hook) + '</span><span class="sc-meta">' + esc([it.style, it.len, it.shoot ? 'shoot ' + it.shoot : ''].filter(Boolean).join(' · ')) + '</span></span>' +
				'<span class="sc-chev" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M10 4v12M4 10h12"/></svg></span></button>';
			if (!isOpen) return '<article class="sc-it' + (picked ? ' picked' : '') + '">' + head + '</article>';

			var beats = (it.beats || []).map(function (b) {
				return '<li><span class="sc-t">' + esc(b.t) + '</span><div><p>' + esc(b.do) + '</p>' + (b.text ? '<p class="sc-ost"><span>On screen</span><b>' + esc(b.text) + '</b></p>' : '') + '</div></li>';
			}).join('');
			var kit = [['Post', it.post], ['You need', it.props], ['Who’s in it', it.cast], ['Sound', it.audio]].filter(function (r) { return r[1]; })
				.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('');
			var noteList = notes.length ? '<ul class="sc-notes">' + notes.map(function (n) { return '<li><b>' + (n.by === 'team' ? 'Busy Fox' : (team ? 'She' : 'You')) + '</b> ' + esc(n.text) + '<small>' + when(n.at) + '</small></li>'; }).join('') + '</ul>' : '';
			var acts = team ?
				'<p class="sc-status">' + (picked ? 'She picked this on ' + when(picked) + '.' : 'Not picked yet.') + '</p>' :
				'<button class="btn ' + (picked ? 'butter' : 'red') + '" type="button" data-a="pick" data-p="' + esc(p.id) + '" data-i="' + esc(it.id) + '">' + (picked ? 'Picked ✓ · tap to undo' : 'I’ll shoot this') + '</button>';
			acts += '<button class="btn line" type="button" data-a="note" data-p="' + esc(p.id) + '" data-i="' + esc(it.id) + '">' + (team ? 'Add a note for her' : 'Ask for a change') + '</button>';
			var noteBox = noting[key] ? '<div class="sc-write"><textarea rows="3" maxlength="1000" id="scn-' + esc(key.replace('/', '-')) + '" placeholder="' + (team ? 'A note she will see under this script' : 'What should we change? e.g. “no Amma, use my friend instead”') + '"></textarea><button class="btn red" type="button" data-a="send" data-p="' + esc(p.id) + '" data-i="' + esc(it.id) + '">Send</button></div>' : '';

			return '<article class="sc-it open' + (picked ? ' picked' : '') + '">' + head +
				'<div class="sc-body">' +
					'<p class="sc-idea">' + esc(it.idea) + '</p>' +
					'<div class="sc-why"><span class="sc-lab">Why it works for you</span><p>' + esc(it.why) + '</p></div>' +
					'<div><span class="sc-lab">Shot by shot</span><ol class="sc-beats">' + beats + '</ol>' +
					(it.end ? '<p class="sc-end"><span>Last line on screen</span><b>' + esc(it.end) + '</b></p>' : '') + '</div>' +
					'<div class="sc-cap"><span class="sc-lab">Caption</span><pre>' + esc(it.caption) + '</pre><button class="btn line small" type="button" data-a="copy" data-p="' + esc(p.id) + '" data-i="' + esc(it.id) + '">Copy caption</button></div>' +
					'<dl class="sc-kit">' + kit + '</dl>' +
					noteList +
					'<div class="sc-acts">' + acts + '</div>' + noteBox +
				'</div></article>';
		}

		function pack(p) {
			var n = Object.keys(p.picks || {}).length, fresh = !n;
			var stamp = fresh ? 'New' : (team ? n + ' picked' : 'Picked');
			var kick = team ? (p.opened_at ? 'she opened it ' + when(p.opened_at) : 'she hasn’t opened it yet') : (fresh ? (p.kicker || 'new, made for you') : 'you picked ' + n + ' · we’ll get ready to edit');
			return '<div class="sc-pack' + (fresh ? ' is-new' : '') + '" id="sc-' + esc(p.id) + '"><span class="tape butter"></span><span class="stamp sc-stamp">' + stamp + '</span>' +
				'<p class="sc-kick">' + esc(kick) + '</p>' +
				'<h3 class="sc-title">' + rich(p.title || 'New reel scripts') + '</h3>' +
				(p.note ? '<p class="sc-note">' + esc(p.note) + '</p>' : '') +
				((p.facts || []).length ? '<ul class="sc-facts">' + p.facts.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul>' : '') +
				'<div class="sc-list">' + (p.items || []).map(function (it, i) { return item(p, it, i); }).join('') + '</div>' +
				((p.rules || []).length ? '<div class="sc-rules"><span class="sc-lab">Before you shoot any of them</span><ul>' + p.rules.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul></div>' : '') +
				'</div>';
		}

		function draw() {
			if (!packs) { el.innerHTML = '<p class="sc-wait">Loading your scripts…</p>'; return; }
			el.innerHTML = packs.length ? packs.map(pack).join('') : '<p class="sc-wait">No scripts yet.</p>';
			if (window.Fun && !el.dataset.thunk) { el.dataset.thunk = '1'; window.Fun.when(el.querySelectorAll('.sc-stamp'), 'fun-thunk'); }
		}
		function find(pid, iid) {
			var p = (packs || []).filter(function (x) { return x.id === pid; })[0];
			return {p: p, it: p && (p.items || []).filter(function (x) { return x.id === iid; })[0]};
		}
		function refresh() { return o.req('scripts').then(function (r) { if (r && r.ok) { packs = r.packs || []; draw(); if (o.onChange) o.onChange(packs); } }); }

		el.addEventListener('click', function (e) {
			var b = e.target.closest('[data-a]'); if (!b || !el.contains(b) || busy) return;
			var a = b.getAttribute('data-a'), pid = b.getAttribute('data-p'), iid = b.getAttribute('data-i'), key = pid + '/' + iid, f = find(pid, iid);
			if (!f.it) return;
			if (a === 'toggle') {
				open[key] = !open[key];
				draw();
				var head = el.querySelector('[data-a="toggle"][data-p="' + pid + '"][data-i="' + iid + '"]');
				if (head) { head.focus({preventScroll: true}); if (open[key]) head.scrollIntoView({block: 'nearest'}); }
				if (open[key] && !team && !f.p.opened_at) { f.p.opened_at = new Date().toISOString(); o.req('scripts-open', {method: 'POST', json: {pack: pid}}); }
				return;
			}
			if (a === 'copy') { copy(f.it.caption || '').then(function () { toast('Caption copied'); }); return; }
			if (a === 'note') { noting[key] = !noting[key]; draw(); var t = document.getElementById('scn-' + key.replace('/', '-')); if (t) t.focus(); return; }
			if (a === 'pick' || a === 'send') {
				var payload = {pack: pid, item: iid};
				if (a === 'pick') payload.on = !(f.p.picks && f.p.picks[iid]);
				else {
					var box = document.getElementById('scn-' + key.replace('/', '-'));
					payload.text = box ? box.value.trim() : '';
					if (!payload.text) { toast('Write a note first'); return; }
				}
				busy = true; b.disabled = true;
				o.req(a === 'pick' ? 'scripts-pick' : 'scripts-note', {method: 'POST', json: payload}).then(function (r) {
					busy = false;
					if (!r || !r.ok) { b.disabled = false; toast((r && r.error) || 'Didn’t save. Try again.'); return; }
					if (a === 'pick') {
						f.p.picks = r.picks || {};
						toast(payload.on ? 'Picked. Busy Fox has been told.' : 'Pick taken back');
						if (payload.on && window.Fun && window.Fun.confetti) { try { window.Fun.confetti(b); } catch (x) {} }
					} else { f.p.notes = r.notes || []; noting[key] = false; toast(team ? 'Note added' : 'Sent to Busy Fox'); }
					draw();
				}, function () { busy = false; b.disabled = false; toast('No connection. Try again.'); });
			}
		});

		draw();
		if (!packs || team) refresh();
		return {refresh: refresh};
	}

	window.Scripts = {mount: mount};
})();
