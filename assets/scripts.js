/* Busy Fox Creator Connect: reel script packs (shared by me/ and admin/).
   window.Scripts.mount(el, {voice: 'creator'|'team', packs, req(sub, {method, json}), toast,
                             plan(): {posts, ideas}   the content plan, so a script can say when it is on the calendar
                             openPost(postId)         opens that planned post in the content plan})
   A library, closed by default: one row per pack (what it is, how many scripts, our picks, the next planned date). One pack is
   open at a time; inside it every script is a short row that opens to the full script. She taps "I'll shoot this" and can ask
   for a change. The handle: {refresh(), open(scriptId), openPack(packId), has(scriptId), update()}. */
(function () {
	'use strict';
	var IST = 330 * 60000;
	var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	var calm = /[?&]still\b/.test(location.search) || !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
	function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]; }); }
	function rich(s) { return esc(s).replace(/&lt;(\/?)em&gt;/g, '<$1em>'); } // titles may carry <em> and nothing else
	function plain(s) { return String(s || '').replace(/<[^>]+>/g, ''); }
	function when(iso) { return iso ? new Date(iso).toLocaleString('en-IN', {day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit'}) : ''; }
	function ist(ms) { var d = new Date(ms + IST); return {y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), dow: d.getUTCDay(), h: d.getUTCHours(), min: d.getUTCMinutes()}; }
	function dayShort(ms) { var t = ist(ms); return DOW[t.dow] + ' ' + t.d + ' ' + MON[t.m]; }
	function clock(ms) { var t = ist(ms), h = t.h % 12 || 12; return h + (t.min ? ':' + (t.min < 10 ? '0' : '') + t.min : '') + (t.h < 12 ? ' am' : ' pm'); }
	function postDate(s) { // "Thu 26 Nov 2026, 2:15 pm IST" -> ms (India time); 0 when it is written another way
		var m = /(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(20\d\d)(?:,?\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm))?/i.exec(String(s || ''));
		var mon = m ? MON.map(function (x) { return x.toLowerCase(); }).indexOf(m[2].toLowerCase()) : -1;
		if (!m || mon < 0) return 0;
		var h = m[4] ? (Number(m[4]) % 12) + (/pm/i.test(m[6]) ? 12 : 0) : 12;
		return Date.UTC(Number(m[3]), mon, Number(m[1]), h, Number(m[5] || 0)) - IST;
	}
	function copy(text) {
		if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).catch(function () { return old(text); });
		return old(text);
		function old(v) {
			var t = document.createElement('textarea'); t.value = v; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
			document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (e) {} document.body.removeChild(t);
			return Promise.resolve();
		}
	}
	var CHEV = '<span class="sc-chev" aria-hidden="true"><svg viewBox="0 0 20 20" focusable="false"><path d="M5 7.500l5 5 5-5"/></svg></span>';
	var PLUS = '<span class="sc-plus" aria-hidden="true"><svg viewBox="0 0 20 20" focusable="false"><path d="M10 4v12M4 10h12"/></svg></span>';

	function mount(el, o) {
		var packs = o.packs || null, noting = {}, busy = false, team = o.voice === 'team';
		var toast = o.toast || function () {};
		var ui = {pack: null, item: null}; // one pack open at a time, and one script inside it
		var KEY = 'cc_sc_ui_' + (team ? 't_' + (o.who || '') : 'c');
		try { var kept = JSON.parse(sessionStorage.getItem(KEY) || '{}'); if (kept.pack) { ui.pack = kept.pack; ui.item = kept.item || null; } } catch (e) {} // what was open survives a reload and back/forward
		function keep() { try { sessionStorage.setItem(KEY, JSON.stringify({pack: ui.pack, item: ui.item})); } catch (e) {} }
		el.classList.add('sc-root');

		// where each script sits in the content plan: on the calendar (a planned post), or only suggested in the 90-day plan
		function links() {
			var d = (o.plan && o.plan()) || {}, m = {};
			(d.ideas || []).forEach(function (x) { if (x.script_id) m[x.script_id] = {at: Date.parse(x.at), hook: x.hook, format: x.format, on: false}; });
			(d.posts || []).forEach(function (p) { if (p.script_id) m[p.script_id] = {at: Date.parse(p.at), hook: p.hook || (m[p.script_id] || {}).hook, format: (m[p.script_id] || {}).format, post_id: p.id, on: true}; });
			return m;
		}
		function dateOf(it, L) { var l = L[it.id]; return l && l.at ? l.at : postDate(it.post); }
		function kind(it, L) { var l = L[it.id]; return l && l.format ? l.format : /carousel|slides?\b/i.test((it.style || '') + ' ' + (it.len || '')) ? 'Carousel' : 'Reel'; }
		function oneLine(it, L) { var l = L[it.id]; return (l && l.hook) || it.hook || ''; }

		function item(p, it, i, L) {
			var picked = p.picks && p.picks[it.id], key = p.id + '/' + it.id, isOpen = ui.item === key, l = L[it.id] || {}, at = dateOf(it, L);
			var notes = (p.notes || []).filter(function (n) { return n.item === it.id; });
			var tags = (picked ? '<span class="sc-badge on">' + (team ? 'She picked this' : 'You’ll shoot this') + '</span>' : it.best ? '<span class="sc-badge">' + esc(String(it.best).split(' · ')[0]) + '</span>' : '') +
				(it.tentpole ? '<span class="sc-badge big">Big day</span>' : '');
			var meta = [kind(it, L), at ? dayShort(at) + (isOpen ? ', ' + clock(at) : '') : ''].filter(Boolean).join(' · ');
			var head = '<h4 class="sc-ih"><button class="sc-head" type="button" data-a="toggle" data-p="' + esc(p.id) + '" data-i="' + esc(it.id) + '" aria-expanded="' + (isOpen ? 'true' : 'false') + '">' +
				'<span class="sc-n">' + (i + 1) + '</span>' +
				'<span class="sc-ht"><b>' + esc(it.title) + '</b><span class="sc-meta">' + tags + '<i>' + esc(meta) + '</i></span>' + (isOpen ? '' : '<span class="sc-hook">' + esc(oneLine(it, L)) + '</span>') + '</span>' +
				PLUS + '</button></h4>';
			if (!isOpen) return '<article class="sc-it' + (picked ? ' picked' : '') + '" id="scs-' + esc(it.id) + '">' + head + '</article>';

			var beats = (it.beats || []).map(function (b) {
				return '<li><span class="sc-t">' + esc(b.t) + '</span><div><p>' + esc(b.do) + '</p>' + (b.text ? '<p class="sc-ost"><span>On screen</span><b>' + esc(b.text) + '</b></p>' : '') + '</div></li>';
			}).join('');
			var kit = [['How it looks', it.style], ['Length', it.len], ['How to shoot', it.shoot], ['Who’s in it', it.cast], ['You need', it.props], ['Sound', it.audio], ['If it doesn’t work', it.alt]].filter(function (r) { return r[1]; })
				.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('');
			var noteList = notes.length ? '<ul class="sc-notes">' + notes.map(function (n) { return '<li><b>' + (n.by === 'team' ? 'Busy Fox' : (team ? 'She' : 'You')) + '</b> ' + esc(n.text) + '<small>' + when(n.at) + '</small></li>'; }).join('') + '</ul>' : '';
			var acts = team ?
				'<p class="sc-status">' + (picked ? 'She picked this on ' + when(picked) + '.' : 'Not picked yet.') + '</p>' :
				'<button class="btn ' + (picked ? 'butter' : 'red') + '" type="button" data-a="pick" data-p="' + esc(p.id) + '" data-i="' + esc(it.id) + '">' + (picked ? 'Picked ✓ · tap to undo' : 'I’ll shoot this') + '</button>';
			acts += '<button class="btn line" type="button" data-a="note" data-p="' + esc(p.id) + '" data-i="' + esc(it.id) + '">' + (team ? 'Add a note for her' : 'Ask for a change') + '</button>';
			var noteBox = noting[key] ? '<div class="sc-write"><textarea rows="3" maxlength="1000" id="scn-' + esc(key.replace('/', '-')) + '" placeholder="' + (team ? 'A note she will see under this script' : 'What should we change? e.g. “no Amma, use my friend instead”') + '"></textarea><button class="btn red" type="button" data-a="send" data-p="' + esc(p.id) + '" data-i="' + esc(it.id) + '">Send</button></div>' : '';
			var whenLine = l.on ? '<span>On ' + (team ? 'her' : 'your') + ' calendar</span><b>' + esc(dayShort(l.at) + ', ' + clock(l.at)) + '</b>' + (o.openPost ? '<button type="button" data-a="topost" data-p="' + esc(p.id) + '" data-i="' + esc(it.id) + '">See it in ' + (team ? 'the' : 'my') + ' plan</button>' : '') :
				l.at ? '<span>In ' + (team ? 'her' : 'your') + ' 90-day plan for</span><b>' + esc(dayShort(l.at) + ', ' + clock(l.at)) + '</b>' :
				it.post ? '<span>Post it</span><b>' + esc(String(it.post).replace(/\s+20\d\d\b/, '').replace(/\s*IST$/, '')) + '</b>' : '';
			var why = (it.best && /·/.test(it.best)) || it.tentpole ? '<p class="sc-flag">' + [it.best, it.tentpole && String(it.best || '').indexOf(it.tentpole) < 0 ? 'Big day: ' + it.tentpole : ''].filter(Boolean).map(esc).join('<br>') + '</p>' : '';

			return '<article class="sc-it open' + (picked ? ' picked' : '') + '" id="scs-' + esc(it.id) + '">' + head +
				'<div class="sc-body' + (ui.anim === 'item' ? ' sc-in' : '') + '">' +
					(whenLine ? '<p class="sc-cal">' + whenLine + '</p>' : '') + why +
					(it.hook ? '<div class="sc-hk"><span class="sc-lab">The hook</span><p>' + esc(it.hook) + '</p></div>' : '') +
					(it.idea ? '<div><span class="sc-lab">The idea</span><p class="sc-idea">' + esc(it.idea) + '</p></div>' : '') +
					(it.why ? '<div class="sc-why"><span class="sc-lab">Why it works for you</span><p>' + esc(it.why) + '</p></div>' : '') +
					(beats || it.end ? '<div><span class="sc-lab">Shot by shot</span><ol class="sc-beats">' + beats + '</ol>' +
					(it.end ? '<p class="sc-end"><span>How it ends</span><b>' + esc(it.end) + '</b></p>' : '') + '</div>' : '') +
					(it.caption ? '<div class="sc-cap"><span class="sc-lab">Caption</span><pre>' + esc(it.caption) + '</pre><button class="btn line small" type="button" data-a="copy" data-p="' + esc(p.id) + '" data-i="' + esc(it.id) + '">Copy caption</button></div>' : '') +
					(kit ? '<dl class="sc-kit">' + kit + '</dl>' : '') +
					noteList +
					'<div class="sc-acts">' + acts + '</div>' + noteBox +
				'</div></article>';
		}

		function pack(p, L, first) {
			var items = p.items || [], n = Object.keys(p.picks || {}).length, fresh = !n, isOpen = ui.pack === p.id, now = Date.now();
			var ours = items.filter(function (it) { return it.best; }).length;
			var next = items.map(function (it) { return dateOf(it, L); }).filter(function (t) { return t > now; }).sort(function (a, b) { return a - b; })[0];
			var flag = team ? (n ? n + ' picked' : p.opened_at ? 'Seen' : 'Not opened') : (fresh ? 'New' : n + ' picked');
			var kick = team ? (p.opened_at ? 'she opened it ' + when(p.opened_at) : 'she hasn’t opened it yet') : (fresh ? (p.kicker || 'new, made for you') : 'you picked ' + n + ' · we’ll get ready to edit');
			var sum = [items.length + (items.length === 1 ? ' script' : ' scripts'), ours ? ours + (ours === 1 ? ' our pick' : ' our picks') : '', next ? 'next ' + dayShort(next) : ''].filter(Boolean);
			var head = '<h3 class="sc-hd"><button class="sc-ph" type="button" data-a="pack" data-p="' + esc(p.id) + '" aria-expanded="' + (isOpen ? 'true' : 'false') + '" aria-controls="scb-' + esc(p.id) + '">' +
				'<span class="sc-pt">' + (isOpen ? '<span class="sc-kick">' + esc(kick) + '</span>' : '') +
				'<span class="sc-title">' + rich(p.title || 'New reel scripts') + '</span>' +
				'<span class="sc-sum">' + sum.map(function (x) { return '<i>' + esc(x) + '</i>'; }).join('') + '</span></span>' + CHEV + '</button></h3>';
			var body = !isOpen ? '' : '<div class="sc-pb' + (ui.anim === 'pack' ? ' sc-in' : '') + '" id="scb-' + esc(p.id) + '">' +
				(p.note ? '<p class="sc-note">' + esc(p.note) + '</p>' : '') +
				((p.facts || []).length ? '<ul class="sc-facts">' + p.facts.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul>' : '') +
				'<div class="sc-list">' + items.map(function (it, i) { return item(p, it, i, L); }).join('') + '</div>' +
				((p.rules || []).length ? '<details class="sc-rules"><summary><span class="sc-lab">Before you shoot any of them</span><i aria-hidden="true"></i></summary><ul>' + p.rules.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul></details>' : '') +
				'</div>';
			return '<section class="sc-pack' + (isOpen ? ' open' : '') + (fresh && first && !team ? ' is-new' : '') + '" id="sc-' + esc(p.id) + '"><span class="sc-flag-s' + (fresh && !team ? ' new' : '') + '">' + esc(flag) + '</span>' + head + body + '</section>';
		}

		function draw() {
			if (!packs) { el.innerHTML = '<p class="sc-wait">Loading your scripts…</p>'; return; }
			if (ui.pack && !packs.some(function (p) { return p.id === ui.pack; })) { ui.pack = null; ui.item = null; }
			var L = links(), firstNew = packs.filter(function (p) { return !Object.keys(p.picks || {}).length; })[0];
			var total = packs.reduce(function (n, p) { return n + (p.items || []).length; }, 0);
			el.innerHTML = packs.length ? '<p class="sc-count">' + packs.length + (packs.length === 1 ? ' pack' : ' packs') + ' · ' + total + (total === 1 ? ' script' : ' scripts') + '<span>Tap a pack to open it</span></p><div class="sc-lib">' + packs.map(function (p) { return pack(p, L, p === firstNew); }).join('') + '</div>' : '<p class="sc-wait">No scripts yet.</p>';
			ui.anim = '';
		}
		// redraw without the page moving under her finger: the row she tapped stays where it was on the screen, and stays in view
		function redraw(sel, focus, free) { // free: only hold the line still (a button deep inside an open script), never pull it into view
			var a = sel ? el.querySelector(sel) : null, y0 = a ? a.getBoundingClientRect().top : null;
			draw();
			var b = sel ? el.querySelector(sel) : null;
			if (!b) return;
			var box = scroller();
			if (y0 != null) {
				var dy = b.getBoundingClientRect().top - y0;
				if (Math.abs(dy) > 1) box.scrollBy({top: dy, behavior: 'instant'});
			}
			var top = b.getBoundingClientRect().top;
			if (!free && (top < 8 || top > window.innerHeight - 120)) box.scrollBy({top: top - 12, behavior: 'instant'});
			if (focus) try { b.focus({preventScroll: true}); } catch (e) {}
		}
		function scroller() { // the page, or the sheet this list sits in on the team page
			for (var n = el.parentElement; n && n !== document.body; n = n.parentElement) { var oy = getComputedStyle(n).overflowY; if ((oy === 'auto' || oy === 'scroll') && n.scrollHeight > n.clientHeight) return n; }
			return window;
		}
		function find(pid, iid) {
			var p = (packs || []).filter(function (x) { return x.id === pid; })[0];
			return {p: p, it: p && (p.items || []).filter(function (x) { return x.id === iid; })[0]};
		}
		function seen(p) { if (!team && p && !p.opened_at) { p.opened_at = new Date().toISOString(); o.req('scripts-open', {method: 'POST', json: {pack: p.id}}).catch(function () {}); } }
		function refresh() { return o.req('scripts').then(function (r) { if (r && r.ok) { packs = r.packs || []; draw(); if (o.onChange) o.onChange(packs); } }); }
		// bring a pack or a script to the top of the screen. The page above it can still be settling (blocks arriving, sections
		// rising into place), so the landing is checked a few times and corrected, unless she has started scrolling herself.
		var bringN = 0;
		function bring(node) {
			if (!node) return;
			var id = node.id, n = ++bringN, hers = false, stop = function () { hers = true; };
			['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (ev) { window.addEventListener(ev, stop, {passive: true, once: true}); });
			node.scrollIntoView({behavior: calm ? 'auto' : 'smooth', block: 'start'});
			[700, 1300, 2100].forEach(function (ms) {
				setTimeout(function () {
					var now = document.getElementById(id);
					if (n !== bringN || hers || !now) return;
					var want = parseFloat(getComputedStyle(now).scrollMarginTop) || 0, off = now.getBoundingClientRect().top - want;
					if (Math.abs(off) > 5) scroller().scrollBy({top: off, behavior: 'instant'});
				}, ms);
			});
		}
		function packBtn(pid) { return '[data-a="pack"][data-p="' + pid + '"]'; }
		function actBtn(act, pid, iid) { return '#scs-' + iid + ' .sc-acts'; } // the row of buttons, not the button: a pressed button is drawn a little smaller, which would skew the measure
		function itemBtn(pid, iid) { return '[data-a="toggle"][data-p="' + pid + '"][data-i="' + iid + '"]'; }

		var lastTap = 0, lastWhat = '';
		el.addEventListener('click', function (e) {
			var b = e.target.closest('[data-a]'); if (!b || !el.contains(b) || busy) return;
			var a = b.getAttribute('data-a'), pid = b.getAttribute('data-p'), iid = b.getAttribute('data-i'), key = pid + '/' + iid, f = find(pid, iid);
			var what = a + '|' + key;
			if ((a === 'pack' || a === 'toggle') && what === lastWhat && Date.now() - lastTap < 400) return; // a fast double tap counts once
			lastWhat = what; lastTap = Date.now();
			if (a === 'pack') {
				if (!f.p) return;
				var opening = ui.pack !== pid;
				ui.pack = opening ? pid : null; ui.item = null; noting = {}; keep(); ui.anim = 'pack';
				redraw(packBtn(pid), true);
				if (opening) seen(f.p);
				return;
			}
			if (!f.it) return;
			if (a === 'toggle') {
				ui.item = ui.item === key ? null : key; keep(); ui.anim = 'item';
				redraw(itemBtn(pid, iid), true);
				return;
			}
			if (a === 'copy') { copy(f.it.caption || '').then(function () { toast('Caption copied'); }); return; }
			if (a === 'topost') { var l = links()[iid]; if (!l || !l.post_id || !o.openPost || !o.openPost(l.post_id)) toast('Find it in the content plan above'); return; }
			if (a === 'note') { noting[key] = !noting[key]; redraw(actBtn('note', pid, iid), false, true); var t = document.getElementById('scn-' + key.replace('/', '-')); if (t) t.focus({preventScroll: true}); return; }
			if (a === 'pick' || a === 'send') {
				var payload = {pack: pid, item: iid};
				if (a === 'pick') payload.on = !(f.p.picks && f.p.picks[iid]);
				else {
					var box = document.getElementById('scn-' + key.replace('/', '-'));
					payload.text = box ? box.value.trim() : '';
					if (!payload.text) { toast('Write a note first'); return; }
				}
				var spot = b.getBoundingClientRect(), cx = spot.left + spot.width / 2, cy = spot.top + spot.height / 2;
				busy = true; b.disabled = true;
				o.req(a === 'pick' ? 'scripts-pick' : 'scripts-note', {method: 'POST', json: payload}).then(function (r) {
					busy = false;
					if (!r || !r.ok) { b.disabled = false; toast((r && r.error) || 'Didn’t save. Try again.'); return; }
					if (a === 'pick') {
						f.p.picks = r.picks || {};
						toast(payload.on ? 'Picked. Busy Fox has been told.' : 'Pick taken back');
						if (payload.on && !calm && window.Fun && window.Fun.confetti) { try { window.Fun.confetti(cx, cy); } catch (x) {} }
					} else { f.p.notes = r.notes || []; noting[key] = false; toast(team ? 'Note added' : 'Sent to Busy Fox'); }
					redraw(actBtn(a === 'pick' ? 'pick' : 'note', pid, iid), false, true);
				}, function () { busy = false; b.disabled = false; toast('No connection. Try again.'); });
			}
		});

		draw();
		if (!packs || team) refresh();
		return {
			refresh: refresh,
			update: function () { if (packs) { var keepY = window.scrollY; draw(); if (window.scrollY !== keepY) window.scrollTo({top: keepY, behavior: 'instant'}); } }, // the plan changed: dates on the rows follow it
			has: function (sid) { return (packs || []).some(function (p) { return (p.items || []).some(function (it) { return it.id === sid; }); }); },
			openPack: function (pid) {
				var p = (packs || []).filter(function (x) { return x.id === pid; })[0];
				if (!p) return false;
				if (ui.pack !== pid) { ui.pack = pid; ui.item = null; keep(); draw(); seen(p); }
				bring(document.getElementById('sc-' + pid));
				return true;
			},
			open: function (sid) { // from a planned post: open that script's pack and the script itself, its title at the top of the screen
				var hit = null;
				(packs || []).forEach(function (p) { (p.items || []).forEach(function (it) { if (!hit && it.id === sid) hit = {p: p, it: it}; }); });
				if (!hit) return false;
				ui.pack = hit.p.id; ui.item = hit.p.id + '/' + hit.it.id; keep(); draw(); seen(hit.p);
				bring(document.getElementById('scs-' + sid));
				return true;
			}
		};
	}

	window.Scripts = {mount: mount};
})();
