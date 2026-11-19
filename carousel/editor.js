/* Busy Fox Creator Connect — "Make a carousel".
   Pick a template, add photos, move/resize/turn anything, Foxy fills it in, then save the slides (still JPGs or, for the
   animated look, short MP4s for the slides that move) or put them straight into her content plan.
   Photos stay on the phone until she saves to the plan or asks Foxy (Foxy sees small copies, to place them and write).
   Touch rules: tap picks a piece, drag moves it, pink dot resizes, white dot turns, two fingers pinch + turn, double-tap edits.
   A full-slide piece that is not picked yet lets a swipe scroll the strip instead (tap it first, then drag it). Pieces are kept on the
   strip and never get smaller than a thumb, so she can always pick them again.
   Test switches: ?debug exposes window.__cr; ?rec=mr|wc|webm forces one video path. */
(function () {
	'use strict';
	var cc = window.CC || {}, E = window.CarouselEngine, TP = window.CarouselTemplates, W = E.W;
	var $ = function (id) { return document.getElementById(id); };
	var KEY = 'cc_me_token', DRAFT = 'cc_carousel_draft', HINT = 'cc_cr_hint';
	var MUXER = 'https://cdn.jsdelivr.net/npm/mp4-muxer@5.2.2/build/mp4-muxer.min.js';
	var MP = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
	var FPS = 30, MAX_PHOTOS = 20;
	var reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
	var small = Math.min(screen.width, screen.height) < 700;
	var MAX_SIDE = small ? 1600 : 2000;
	function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]; }); }
	function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
	function read(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
	function store(k, v) { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch (e) {} }
	var toastT;
	function toast(t) { var el = $('toast'), dk = document.querySelector('.cr-dock'); el.style.bottom = dk && !$('edit').hidden ? (dk.offsetHeight + 12) + 'px' : ''; /* sits above the tool bar */ el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { el.classList.remove('on'); }, 2600); }
	function note(t) { $('note').textContent = t || ''; }
	function rid() { return Math.random().toString(36).slice(2, 10); }
	function tfetch(url, opts, ms) { // a fetch that gives up, so no sheet can hang for ever
		opts = opts || {}; var ac = window.AbortController && !opts.signal ? new AbortController() : null, t = ac && setTimeout(function () { ac.abort(); }, ms || 60000);
		if (ac) opts.signal = ac.signal;
		return fetch(url, opts).then(function (r) { clearTimeout(t); return r; }, function (e) { clearTimeout(t); throw e; });
	}

	// ---------- state ----------
	var S = {doc: null, tpl: null, variant: null, mode: 'still', sel: null, adjust: false, photos: [], cuts: {}, undo: [], redo: [], scale: .3, dpr: 1, t0: performance.now(), busy: false, caption: '', tags: [], lang: read('cc_cr_lang') || 'both', handle: '', first: ''};
	var token = (location.hash || '').replace(/^#/, '').trim();
	if (token) store(KEY, token); else token = read(KEY);
	var cv, ctx, need = true;
	window.CarouselRedraw = function () { need = true; };
	window.CarouselUser = function (k) { var p = S.photos.filter(function (x) { return 'u:' + x.id === k; })[0]; return p ? p.bmp : null; };

	// ---------- gate ----------
	function gate(hand, title, msg, acts) {
		$('pick').hidden = $('edit').hidden = true; $('gate').hidden = false;
		$('gateHand').textContent = hand; $('gateTitle').innerHTML = title; $('gateMsg').textContent = msg;
		$('gateActs').innerHTML = ''; $('gateActs').hidden = !acts;
		(acts || []).forEach(function (a) { var b = document.createElement(a.href ? 'a' : 'button'); b.className = 'btn ' + (a.cls || 'red'); b.textContent = a.t; if (a.href) b.href = a.href; else { b.type = 'button'; b.onclick = a.fn; } $('gateActs').appendChild(b); });
	}
	function api(path, opts, ms) {
		opts = opts || {}; opts.headers = Object.assign({Authorization: 'Bearer ' + token}, opts.headers || {}); opts.cache = 'no-store';
		return tfetch(cc.api + path, opts, ms).then(function (r) { return r.json().catch(function () { return {ok: false, error: 'HTTP ' + r.status}; }); });
	}
	function check() {
		if (!token) return gate('hello', 'Open this from your <em>dashboard</em>', 'The carousel studio lives inside your Creator Connect dashboard. Open your dashboard link, then tap “Make a carousel”.');
		api('/me').then(function (d) {
			if (!d || !d.ok) { if (d && d.error === 'not_found') store(KEY, ''); return gate('hmm', 'Open this from your <em>dashboard</em>', 'This link is not valid any more. Open your Creator Connect dashboard again, or ask Busy Fox for a new link.'); }
			var p = d.profile || {}; S.handle = p.username ? '@' + p.username : ''; S.first = p.first || '';
			if (S.first) $('hello').textContent = 'swipe-worthy, ' + S.first;
			start();
		}, function () { gate('no signal', 'Could not <em>check your link</em>', 'Check your internet and try again.', [{t: 'Try again', fn: check}]); });
	}

	// ---------- start ----------
	function start() {
		$('gate').hidden = true;
		var back = $('back'); back.hidden = false; back.href = $('logo').href = '../me/#' + token;
		$('tplFonts').href = E.FONT_CSS;
		fetch('a/meta.json').then(function (r) { return r.json(); }).then(function (m) { E.setMeta(m); return E.fontsReady(); }).then(function () {
			cv = $('cv'); ctx = cv.getContext('2d');
			wire(); showPick(); restoreDraft();
			requestAnimationFrame(tick);
			if (/[?&]debug\b/.test(location.search)) window.__cr = {S: S, E: E, TP: TP, pickTpl: pickTpl, apply: applyFoxy, act: act, tools: tools};
		});
	}

	// ---------- pick screen ----------
	var FAMS = [['all', 'All'], ['story', 'Stories'], ['y2k', 'Y2K scrapbook'], ['seamless', 'Seamless'], ['phone', 'Phone screen'], ['telugu', 'Telugu traditional'], ['cinema', 'Cinema & songs'], ['village', 'Village & ooru'], ['festival', 'Festivals'], ['soft', 'Soft & dreamy'], ['diary', 'Diary'], ['patterns', '& Patterns']];
	var fam = 'all';
	function showPick() {
		$('edit').hidden = true; $('pick').hidden = false; S.sel = null;
		$('fams').innerHTML = FAMS.map(function (f) { return '<button type="button" data-f="' + f[0] + '" aria-pressed="' + (f[0] === fam) + '">' + f[1] + '</button>'; }).join('');
		Array.prototype.forEach.call($('fams').children, function (b) { b.onclick = function () { fam = b.dataset.f; showPick(); }; });
		var g = $('grid'); g.innerHTML = '';
		TP.list.filter(function (t) { return fam === 'all' || t.family === fam; }).forEach(function (t) {
			var b = document.createElement('button'); b.type = 'button'; b.className = 'cr-card';
			var c = document.createElement('canvas'); c.width = 900; c.height = 450;
			b.appendChild(c);
			var famName = (FAMS.filter(function (f) { return f[0] === t.family; })[0] || [])[1] || '';
			b.insertAdjacentHTML('beforeend', '<span class="fam">' + esc(famName) + '</span><b>' + esc(t.name) + '</b><span>' + esc(t.blurb) + '</span>' + (t.variants ? '<span class="sw">' + t.variants.map(function (v) { return '<i style="background:' + (v.sw || v.c1) + '" title="' + esc(v.label) + '"></i>'; }).join('') + '</span>' : ''));
			b.onclick = function () { pickTpl(t.id, t.variants ? t.variants[0].key : null); };
			g.appendChild(b);
			var d = TP.make(t.id, t.variants ? t.variants[0].key : null);
			var paint = function () { var x = c.getContext('2d'); x.save(); x.fillStyle = '#eee'; x.fillRect(0, 0, 900, 450); var k = 450 / d.H; x.scale(k, k); E.render(x, d, {x0: 0, vw: Math.min(d.n, 3) * W, mode: 'thumb', t: null}); x.restore(); };
			E.preload(E.docAssets(d).concat(cutKeys(d))).then(paint); paint();
		});
	}
	function cutKeys(d) { return d.layers.filter(function (l) { return l.kind === 'cut'; }).map(function (l) { var p = d.layers.filter(function (x) { return x.id === l.of; })[0]; return p && p.src && p.src.indexOf('ph/') === 0 ? 'cut/' + p.src.slice(3) : null; }).filter(Boolean); }
	function pickTpl(id, variant, keep, fresh) {
		if (!TP.list.some(function (t) { return t.id === id; })) return; // a template that no longer exists // keep = colour switch (keeps her work); fresh = start over (undo stays)
		var d = TP.make(id, variant);
		if (keep && S.doc && S.doc.tpl === id) carryOver(S.doc, d);
		if (!keep && !fresh) { S.undo = []; S.redo = []; S.caption = ''; S.tags = []; }
		if (fresh) S.redo = [];
		S.doc = d; S.tpl = TP.list.filter(function (t) { return t.id === id; })[0]; S.variant = d.variant || variant; S.sel = null; S.adjust = false; S.lastHit = null;
		if (keep) matchNature();
		undoBtns();
		$('pick').hidden = true; $('edit').hidden = false; hintShow();
		$('tplName').textContent = S.tpl.name; slidesNote();
		variants(); sizeButtons(); layout(); tools(); tray(); dots(); saveDraft();
		E.preload(E.docAssets(d).concat(cutKeys(d))).then(function () { need = true; });
		window.scrollTo({top: 0, behavior: reduced ? 'auto' : 'smooth'});
	}
	function carryOver(old, d) { // switching colour keeps her photos, her own words and where she moved things
		var byId = {}; old.layers.forEach(function (l) { byId[l.id] = l; });
		if (old.H !== d.H) { var from = d.H; d.H = old.H; resizeDoc(d, from); } // her size choice first, so her moved pieces keep their place
		d.gone = (old.gone || []).slice(); d.layers = d.layers.filter(function (l) { return d.gone.indexOf(l.id) < 0; }); // pieces she deleted stay deleted
		d.layers.forEach(function (l) {
			var o = byId[l.id]; if (!o) return;
			['x', 'y', 'w', 'h', 'rot', 'anim', 'hidden', 'op'].forEach(function (k) { if (o[k] !== undefined) l[k] = o[k]; });
			if (l.kind === 'photo' && o.src && o.src.indexOf('u:') === 0) { l.src = o.src; l.fit = o.fit; l.filter = o.filter; }
			if (l.kind === 'photo' && o.reshaped) { ['frame', 'shape', 'r', 'title', 'artist'].forEach(function (k) { if (o[k] !== undefined) l[k] = o[k]; else delete l[k]; }); l.reshaped = true; }
			if ((l.kind === 'text' || l.kind === 'ui') && o.edited) { l.t = o.t; l.edited = true; ['font', 'size', 'c', 'curve', 'align', 'bg', 'stroke', 'it', 'wt'].forEach(function (k) { if (o[k] !== undefined) l[k] = o[k]; }); }
		});
		old.layers.forEach(function (o) { if (o.added) d.layers.push(o); });
		d.n = old.n;
		d.layers = d.layers.filter(function (x) { return x.kind === 'path' || x.kind === 'cut' || x.x - x.w / 2 < d.n * W; });
	}
	function hintShow() { $('hint').hidden = !!read(HINT); }
	function slidesNote() { $('tplNote').textContent = (S.doc.story ? S.doc.n + (S.doc.n > 1 ? ' stories' : ' story') + ' · 9:16' : S.doc.n + ' slides · ' + (S.doc.H === 1350 ? '4:5' : '3:4')) + (S.mode === 'anim' ? ' · moving' : ''); }
	function variants() {
		var v = $('variants'), list = S.tpl.variants || [];
		v.innerHTML = list.map(function (x) { return '<button type="button" data-v="' + x.key + '" aria-pressed="' + (x.key === S.variant) + '" aria-label="' + esc(x.label) + '" title="' + esc(x.label) + '" style="background:' + (x.sw || x.c1) + '"></button>'; }).join('');
		Array.prototype.forEach.call(v.children, function (b) { b.onclick = function () { snap(); pickTpl(S.doc.tpl, b.dataset.v, true); toast(b.title); }; });
	}
	function sizeButtons() { document.querySelectorAll('[data-h]').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.h === S.doc.H)); }); var sg = document.querySelector('.seg[aria-label="Slide shape"]'); if (sg) sg.hidden = !!S.doc.story; } // stories are always 9:16
	function resizeDoc(d, fromH) {
		var k = d.H / fromH; if (k === 1) return;
		d.layers.forEach(function (l) { l.y *= k; if (l.kind === 'photo' && l.h > fromH * .3) l.h *= k; if (l.kind === 'sticker' && l.h >= fromH * .9) l.h *= k; if (l.pts) l.pts = l.pts.map(function (p) { return [p[0], p[1] * k]; }); });
	}

	// ---------- layout + drawing ----------
	function layout() {
		var st = $('stage'), inner = st.clientWidth - 28;
		var slideW = small || inner < 700 ? inner * .86 : Math.min(400, inner / 2.4);
		slideW = Math.min(slideW, Math.max(260, (window.innerHeight || 800) * .66) * W / S.doc.H); // a tall story still fits on the screen
		S.scale = slideW / W; S.dpr = Math.min(2, window.devicePixelRatio || 1);
		var w = Math.round(S.doc.n * W * S.scale), h = Math.round(S.doc.H * S.scale), pw = Math.round(w * S.dpr), ph = Math.round(h * S.dpr);
		cv.style.width = w + 'px'; cv.style.height = h + 'px';
		if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; } // resizing a canvas wipes it, so only when the size really changed
		need = true;
	}
	function tick(now) {
		var anim = S.mode === 'anim' && !reduced && !S.busy;
		if (S.doc && !$('edit').hidden && (need || anim)) { draw(anim ? ((now - S.t0) / 1000) % E.LOOP : null); need = false; }
		requestAnimationFrame(tick);
	}
	function draw(t) {
		var k = S.scale * S.dpr;
		ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
		ctx.setTransform(k, 0, 0, k, 0, 0);
		E.render(ctx, S.doc, {x0: 0, vw: S.doc.n * W, t: t, mode: 'edit', cuts: S.cuts});
		// seams between slides
		ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3 / S.scale; ctx.setLineDash([10 / S.scale, 8 / S.scale]);
		for (var i = 1; i < S.doc.n; i++) { ctx.beginPath(); ctx.moveTo(i * W, 0); ctx.lineTo(i * W, S.doc.H); ctx.stroke(); }
		ctx.restore();
		if (guide) { ctx.save(); ctx.strokeStyle = '#ff2d7a'; ctx.lineWidth = 2 / S.scale; if (guide.x != null) { ctx.beginPath(); ctx.moveTo(guide.x, 0); ctx.lineTo(guide.x, S.doc.H); ctx.stroke(); } if (guide.y != null) { ctx.beginPath(); ctx.moveTo(0, guide.y); ctx.lineTo(S.doc.n * W, guide.y); ctx.stroke(); } ctx.restore(); }
		var l = selLayer(); if (l) drawSel(l);
	}
	function selLayer() { return S.sel && S.doc.layers.filter(function (l) { return l.id === S.sel; })[0]; }
	function handles(l) {
		var a = (l.rot || 0) * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a), k = 1 / S.scale, nW = S.doc.n * W, m = 14 * k;
		var ext = Math.max(0, (70 * k - Math.min(l.w, l.h)) / 2); // a small piece pushes its dots outward, so the dots never cover it
		var P = function (x, y) { return [l.x + x * cs - y * sn, l.y + x * sn + y * cs]; }, off = 35 * k + ext;
		var rot = P(0, -l.h / 2 - off), rs = P(l.w / 2 + ext, l.h / 2 + ext);
		if (rot[1] < m) rot = P(0, -l.h / 2 + off); // no room above the slide: the turn dot sits just inside
		var cl = function (q) { return [clamp(q[0], m, nW - m), clamp(q[1], m, S.doc.H - m)]; }; // both dots always stay on the strip, so they can be grabbed
		return {box: E.corners(l), resize: cl(rs), rotate: cl(rot), top: P(0, -l.h / 2)};
	}
	function drawSel(l) {
		var h = handles(l), r = 11 / S.scale;
		ctx.save(); ctx.strokeStyle = S.adjust ? '#f6e3a1' : '#ff2d7a'; ctx.lineWidth = 2.5 / S.scale;
		if (l.kind === 'path') { l.pts.forEach(function (p) { ctx.beginPath(); ctx.arc(p[0], p[1], r * .8, 0, Math.PI * 2); ctx.stroke(); }); ctx.restore(); return; }
		ctx.beginPath(); h.box.forEach(function (p, i) { ctx[i ? 'lineTo' : 'moveTo'](p[0], p[1]); }); ctx.closePath(); ctx.stroke();
		if (!S.adjust) {
			ctx.beginPath(); ctx.moveTo(h.top[0], h.top[1]); ctx.lineTo(h.rotate[0], h.rotate[1]); ctx.stroke();
			[[h.resize, '#ff2d7a'], [h.rotate, '#fff']].forEach(function (q) { ctx.beginPath(); ctx.arc(q[0][0], q[0][1], r, 0, Math.PI * 2); ctx.fillStyle = q[1]; ctx.fill(); ctx.lineWidth = 3 / S.scale; ctx.strokeStyle = '#2b1a17'; ctx.stroke(); });
		}
		ctx.restore();
	}
	function dots() {
		var n = S.doc.n, cur = visibleSlide();
		$('dots').innerHTML = Array.from({length: n}, function (_, i) { return '<i class="' + (i === cur ? 'on' : '') + '"></i>'; }).join('');
		$('slideNo').textContent = (S.doc.story ? 'Story ' : 'Slide ') + (cur + 1) + ' of ' + n;
		$('prevS').disabled = cur <= 0; $('nextS').disabled = cur >= n - 1;
	}
	function visibleSlide() { return clamp(Math.round($('stage').scrollLeft / (W * S.scale)), 0, S.doc.n - 1); }

	// ---------- undo ----------
	function pushUndo(json) { if (S.undo[S.undo.length - 1] !== json) { S.undo.push(json); if (S.undo.length > 40) S.undo.shift(); } S.redo = []; undoBtns(); }
	function snap() { pushUndo(JSON.stringify(S.doc)); }
	function undoBtns() { $('undo').disabled = !S.undo.length; $('redo').disabled = !S.redo.length; }
	function undo() { if (!S.undo.length) return; S.redo.push(JSON.stringify(S.doc)); S.doc = JSON.parse(S.undo.pop()); S.adjust = false; after(); }
	function redo() { if (!S.redo.length) return; S.undo.push(JSON.stringify(S.doc)); S.doc = JSON.parse(S.redo.pop()); S.adjust = false; after(); }
	function after() { // everything on screen follows the doc (undo can change colour, size and slides too)
		if (S.sel && !selLayer()) { S.sel = null; S.adjust = false; }
		if (S.tpl && S.tpl.variants && S.doc.variant && S.doc.variant !== S.variant) { S.variant = S.doc.variant; variants(); }
		layout(); tools(); tray(); undoBtns(); slidesNote(); sizeButtons(); dots(); need = true; saveDraft();
	}

	// ---------- touching the strip ----------
	var drag = null, guide = null, lastTap = {t: 0, id: null}, pts = {};
	var MIN_SIDE = 64, SLOP = 8; // smallest a piece may get (slide units); finger wobble that still counts as a tap (screen px)
	function toDoc(e) { var r = cv.getBoundingClientRect(); return {x: (e.clientX - r.left) / S.scale, y: (e.clientY - r.top) / S.scale}; }
	function segDist(p, a, b) { var dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy, t = L ? clamp(((p.x - a[0]) * dx + (p.y - a[1]) * dy) / L, 0, 1) : 0; return Math.hypot(p.x - (a[0] + t * dx), p.y - (a[1] + t * dy)); }
	function hitAll(p) { // every piece under the finger, top first; small pieces get a thumb-sized target so they can always be picked again
		var out = [], half = 22 / S.scale;
		for (var i = S.doc.layers.length - 1; i >= 0; i--) {
			var l = S.doc.layers[i]; if (l.hidden || l.lock || l.kind === 'cut') continue;
			if (l.kind === 'path') { if (l.pts.some(function (q, j) { return segDist(p, q, l.pts[j + 1] || q) < Math.max(40, half); })) out.push(l); continue; }
			var q = E.local(l, p.x, p.y);
			if (Math.abs(q.x) <= Math.max(l.w / 2 + 14, half) && Math.abs(q.y) <= Math.max(l.h / 2 + 14, half)) out.push(l);
		}
		return out;
	}
	function pathBox(l) { var xs = l.pts.map(function (q) { return q[0]; }), ys = l.pts.map(function (q) { return q[1]; }), a = Math.min.apply(null, xs), b = Math.max.apply(null, xs), c = Math.min.apply(null, ys), d = Math.max.apply(null, ys); l.x = (a + b) / 2; l.y = (c + d) / 2; l.w = b - a; l.h = d - c; }
	function bigPiece(l) { return l.kind !== 'path' && l.w >= W * .85 && l.h >= S.doc.H * .4; } // a backdrop-size piece: swiping over it should scroll, not move it
	function scrollFirst(w) { return w.mode === 'move' && S.sel !== w.l.id && bigPiece(w.l); }
	function whatAt(p) {
		var l = selLayer(), R = 26 / S.scale;
		if (l && !S.adjust && l.kind !== 'path') { var h = handles(l), dr = Math.hypot(p.x - h.resize[0], p.y - h.resize[1]), dt = Math.hypot(p.x - h.rotate[0], p.y - h.rotate[1]); if (dr < R || dt < R) return {l: l, mode: dr <= dt ? 'resize' : 'rotate'}; }
		if (l && l.kind === 'path') { var bi = -1, bd = R; l.pts.forEach(function (q, i) { var d = Math.hypot(p.x - q[0], p.y - q[1]); if (d < bd) { bd = d; bi = i; } }); if (bi >= 0) return {l: l, mode: 'point', i: bi}; }
		var hit = hitAll(p)[0];
		return hit ? {l: hit, mode: S.adjust && hit.id === S.sel && hit.kind === 'photo' ? 'pan' : 'move'} : null;
	}
	function wire() {
		var st = $('stage');
		// stop the strip scrolling when the finger lands on something she can move (but a not-yet-picked backdrop lets the swipe scroll)
		cv.addEventListener('touchstart', function (e) { if (e.touches.length > 1 && selLayer()) { e.preventDefault(); return; } var w = whatAt(toDoc(e.touches[0])); if (w && !scrollFirst(w)) e.preventDefault(); }, {passive: false});
		cv.addEventListener('pointerdown', function (e) {
			if (e.isPrimary) pts = {}; // a fresh touch: forget any finger that never reported lifting
			pts[e.pointerId] = toDoc(e);
			var ids = Object.keys(pts);
			if (ids.length === 2 && selLayer()) { var l = selLayer(), a = pts[ids[0]], b = pts[ids[1]], cx = 0, cy = 0; if (l.pts) { l.pts.forEach(function (q) { cx += q[0]; cy += q[1]; }); cx /= l.pts.length; cy /= l.pts.length; }
				drag = {mode: S.adjust && l.kind === 'photo' ? 'pinchfit' : 'pinch', l: l, d0: Math.max(30, Math.hypot(a.x - b.x, a.y - b.y)), a0: Math.atan2(b.y - a.y, b.x - a.x), w0: l.w, h0: l.h, size0: l.size, rot0: l.rot || 0, s0: (l.fit || {}).s || 1, pre: JSON.stringify(S.doc), moved: false, pts0: l.pts && l.pts.map(function (q) { return q.slice(); }), c0: [cx, cy]}; return; }
			if (ids.length > 1) return;
			var p = pts[e.pointerId], w = whatAt(p), touch = e.pointerType === 'touch';
			if (!w) { drag = {mode: 'blank', p0: p, moved: false}; return; } // a tap on nothing puts the pieces down; a swipe just scrolls
			try { cv.setPointerCapture(e.pointerId); } catch (x) {}
			var now = performance.now(), body = w.mode === 'move' || w.mode === 'pan', second = body && w.l.id === lastTap.id && now - lastTap.t < 400;
			lastTap = second || !body ? {t: 0, id: null} : {t: now, id: w.l.id};
			if (body) S.lastHit = p;
			if (touch && scrollFirst(w)) { drag = {mode: 'tapselect', l: w.l, p0: p, moved: false}; return; }
			if (S.sel !== w.l.id) { S.sel = w.l.id; S.adjust = false; tools(); }
			drag = {mode: w.mode, l: w.l, i: w.i, p0: p, x0: w.l.x, y0: w.l.y, w0: w.l.w, h0: w.l.h, size0: w.l.size, rot0: w.l.rot || 0, fit0: Object.assign({s: 1, ox: .5, oy: .38}, w.l.fit || {}), pts0: w.l.pts && w.l.pts.map(function (q) { return q.slice(); }), pre: JSON.stringify(S.doc), moved: false, second: second};
			need = true;
		});
		cv.addEventListener('pointermove', function (e) {
			if (!pts[e.pointerId]) return;
			pts[e.pointerId] = toDoc(e);
			if (!drag) return;
			var l = drag.l, ids = Object.keys(pts), nW = S.doc.n * W, H = S.doc.H;
			if (drag.mode === 'pinch' || drag.mode === 'pinchfit') {
				if (ids.length !== 2) return;
				var a = pts[ids[0]], b = pts[ids[1]], k = Math.hypot(a.x - b.x, a.y - b.y) / drag.d0, dA = (Math.atan2(b.y - a.y, b.x - a.x) - drag.a0) * 180 / Math.PI;
				if (!drag.moved) { drag.moved = true; pushUndo(drag.pre); }
				if (drag.mode === 'pinchfit') l.fit = Object.assign({}, l.fit, {s: clamp(drag.s0 * k, 1, 5)});
				else if (l.kind === 'path') { var kk = clamp(k, .3, 4), r = dA * Math.PI / 180, cs = Math.cos(r), sn = Math.sin(r); l.pts = drag.pts0.map(function (q) { var x = (q[0] - drag.c0[0]) * kk, y = (q[1] - drag.c0[1]) * kk; return [clamp(drag.c0[0] + x * cs - y * sn, 0, nW), clamp(drag.c0[1] + x * sn + y * cs, 0, H)]; }); pathBox(l); }
				else { scaleLayer(l, drag, k); l.rot = drag.rot0 + dA; }
				need = true; return;
			}
			var p = pts[e.pointerId], dx = p.x - drag.p0.x, dy = p.y - drag.p0.y;
			if (!drag.moved) { if (Math.hypot(dx, dy) * S.scale < SLOP) return; drag.moved = true; if (drag.mode !== 'blank' && drag.mode !== 'tapselect') pushUndo(drag.pre); }
			if (drag.mode === 'blank' || drag.mode === 'tapselect') return;
			if (drag.mode === 'move') {
				if (l.kind === 'path') { dx = clamp(drag.x0 + dx, 0, nW) - drag.x0; dy = clamp(drag.y0 + dy, 0, H) - drag.y0; l.pts = drag.pts0.map(function (q) { return [q[0] + dx, q[1] + dy]; }); l.x = drag.x0 + dx; l.y = drag.y0 + dy; }
				else { // always keep the piece's middle on the strip, so a piece can never be lost off the edge
					var nx = clamp(drag.x0 + dx, 0, nW), ny = clamp(drag.y0 + dy, 0, H), g = {}, T = 9 / S.scale; // snap only when really close, so fine nudging still works
					var cx = Math.round((nx - W / 2) / W) * W + W / 2; if (Math.abs(nx - cx) < T) { nx = cx; g.x = cx; }
					if (Math.abs(ny - H / 2) < T) { ny = H / 2; g.y = ny; }
					l.x = nx; l.y = ny; var had = guide; guide = (g.x != null || g.y != null) ? g : null; if (guide && !had && navigator.vibrate) { try { navigator.vibrate(6); } catch (x) {} }
				}
			} else if (drag.mode === 'point') { l.pts[drag.i] = [clamp(drag.pts0[drag.i][0] + dx, 0, nW), clamp(drag.pts0[drag.i][1] + dy, 0, H)]; pathBox(l); }
			else if (drag.mode === 'resize') {
				var ref = {x: drag.x0, y: drag.y0, rot: drag.rot0}, q = E.local(ref, p.x, p.y), q0 = E.local(ref, drag.p0.x, drag.p0.y);
				scaleLayer(l, drag, Math.hypot(q.x, q.y) / Math.max(30, Math.hypot(q0.x, q0.y)));
			} else if (drag.mode === 'rotate') {
				var ang = drag.rot0 + (Math.atan2(p.y - drag.y0, p.x - drag.x0) - Math.atan2(drag.p0.y - drag.y0, drag.p0.x - drag.x0)) * 180 / Math.PI;
				ang = ((ang + 180) % 360 + 360) % 360 - 180; var sn2 = Math.round(ang / 45) * 45; l.rot = Math.abs(ang - sn2) < 4 ? sn2 : ang;
			} else if (drag.mode === 'pan') {
				var b2 = E.inner(l), im = E.img(l.src) || window.CarouselUser(l.src);
				if (im) { var c = E.cover(im, b2.w, b2.h, drag.fit0); l.fit = {s: drag.fit0.s, ox: clamp(drag.fit0.ox - dx / c.w, 0, 1), oy: clamp(drag.fit0.oy - dy / c.h, 0, 1)}; }
			}
			need = true;
		});
		function up(e) {
			delete pts[e.pointerId];
			if (!drag || Object.keys(pts).length) return;
			var d = drag, tap = e.type === 'pointerup' && !d.moved; drag = null; guide = null; need = true;
			if (d.mode === 'blank') { if (tap && S.sel) { S.sel = null; S.adjust = false; tools(); saveDraft(); } return; }
			if (d.mode === 'tapselect') { if (tap) { S.sel = d.l.id; S.adjust = false; tools(); } return; }
			if (d.moved) { lastTap = {t: 0, id: null}; saveDraft(); tools(); return; }
			tools(); if (d.second && tap) dbl(d.l);
		}
		cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
		window.addEventListener('blur', function () { pts = {}; drag = null; guide = null; });
		st.addEventListener('scroll', function () { dots(); }, {passive: true});
		window.addEventListener('resize', function () { if (S.doc && !$('edit').hidden) { layout(); dots(); } });
		document.addEventListener('keydown', function (e) {
			if (!$('sheet').hidden) { if (e.key === 'Escape' && sheetClose) sheetClose(); return; }
			if ($('edit').hidden) return;
			if ((e.metaKey || e.ctrlKey) && String(e.key).toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
			var free = document.activeElement === cv || document.activeElement === document.body;
			if (e.key === 'Escape' && S.sel && free) { S.sel = null; S.adjust = false; tools(); need = true; return; }
			var l = selLayer(); if (!l || !free) return;
			if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); act('delete'); return; }
			var mv = {ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10]}[e.key];
			if (mv) { e.preventDefault(); snap(); if (l.pts) { l.pts = l.pts.map(function (q) { return [q[0] + mv[0], q[1] + mv[1]]; }); pathBox(l); } else { l.x = clamp(l.x + mv[0], 0, S.doc.n * W); l.y = clamp(l.y + mv[1], 0, S.doc.H); } need = true; saveDraft(); }
		});
		$('undo').onclick = undo; $('redo').onclick = redo;
		$('toPick').onclick = function () { S.sel = null; S.adjust = false; S.draft = JSON.parse(JSON.stringify(draftObj())); saveDraft(); showPick(); renderDraftOffer(); };
		$('prevS').onclick = function () { goSlide(visibleSlide() - 1); }; $('nextS').onclick = function () { goSlide(visibleSlide() + 1); };
		$('hintX').onclick = function () { store(HINT, '1'); $('hint').hidden = true; };
		document.querySelectorAll('[data-h]').forEach(function (b) { b.onclick = function () { var h = +b.dataset.h; if (h === S.doc.H) return; snap(); var from = S.doc.H; S.doc.H = h; resizeDoc(S.doc, from); after(); }; });
		document.querySelectorAll('[data-mode]').forEach(function (b) { b.onclick = function () { S.mode = b.dataset.mode; S.t0 = performance.now(); document.querySelectorAll('[data-mode]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); slidesNote(); need = true; if (S.mode === 'anim' && !E.animated(S.doc)) toast('Tap a sticker or word, then “Animate”, to make it move'); }; });
		$('file').onchange = function () { addFiles(Array.prototype.slice.call(this.files || [])); this.value = ''; };
		$('foxyBtn').onclick = foxyFill;
		$('exportBtn').onclick = startExport;
	}
	function scaleLayer(l, d, k) { // never smaller than a thumb, never bigger than a few slides
		var kmin = l.kind === 'text' ? Math.min(1, 28 / Math.max(d.size0 || 90, 1)) : Math.min(1, MIN_SIDE / Math.max(Math.min(d.w0, d.h0), 1)), kmax = Math.max(1, 5400 / Math.max(d.w0, d.h0, 1));
		k = clamp(isFinite(k) ? k : 1, kmin, kmax);
		l.w = d.w0 * k; l.h = d.h0 * k;
		if (l.kind === 'text') { l.size = clamp(d.size0 * k, 12, 600); measureText(l); }
	}
	function dbl(l) { if (l.kind === 'text' || (l.kind === 'ui' && 't' in l)) return editText(l); if (l.kind === 'photo') return replacePhoto(l); }
	function goSlide(i) { $('stage').scrollTo({left: clamp(i, 0, S.doc.n - 1) * W * S.scale, behavior: reduced ? 'auto' : 'smooth'}); }
	function moveSlide(dir) { // swap the slide she is looking at with its neighbour (not for looks that flow across slides)
		var d = S.doc, i = visibleSlide(), j = i + dir;
		if (j < 0 || j >= d.n) return toast(dir < 0 ? 'This is already the first slide' : 'This is already the last slide');
		if (S.tpl.family === 'seamless' || d.layers.some(function (l) { return l.kind !== 'path' && l.kind !== 'cut' && l.w > W * 1.05; })) return toast('This look flows across the slides, so they cannot be swapped');
		snap();
		d.layers.forEach(function (l) { if (l.kind === 'cut') return; var s = Math.floor(l.x / W), sh = s === i ? dir * W : s === j ? -dir * W : 0; if (!sh) return; l.x += sh; if (l.pts) l.pts = l.pts.map(function (q) { return [q[0] + sh, q[1]]; }); });
		if (d.slideBg && d.slideBg.length) { var t = d.slideBg[i]; d.slideBg[i] = d.slideBg[j]; d.slideBg[j] = t; }
		after(); goSlide(j); toast('Slide ' + (i + 1) + ' is now slide ' + (j + 1));
	}

	// ---------- tools ----------
	var IC = {
		text: '<svg viewBox="0 0 24 24"><path d="M5 6V4h14v2"/><path d="M12 4v16"/><path d="M9 20h6"/></svg>',
		stk: '<svg viewBox="0 0 24 24"><path d="M14 3H6a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h8l7-7V6a3 3 0 0 0-3-3"/><path d="M14 21v-4a3 3 0 0 1 3-3h4"/></svg>',
		photo: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/></svg>',
		plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>', minus: '<svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>',
		adj: '<svg viewBox="0 0 24 24"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/></svg>',
		cut: '<svg viewBox="0 0 24 24"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4L8.1 15.9M14.5 14.5L20 20M8.1 8.1L12 12"/></svg>',
		fx: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 3v18"/><path d="M12 3a9 9 0 0 1 0 18"/></svg>',
		shape: '<svg viewBox="0 0 24 24"><path d="M4 20V10a8 8 0 0 1 16 0v10z"/></svg>',
		anim: '<svg viewBox="0 0 24 24"><path d="M5 3l14 9-14 9z"/></svg>',
		up: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/></svg>',
		down: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="12" height="12" rx="2"/><path d="M20 8v10a2 2 0 0 1-2 2H8"/></svg>',
		copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M4 16V5a1 1 0 0 1 1-1h11"/></svg>',
		del: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3"/></svg>',
		edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
		reset: '<svg viewBox="0 0 24 24"><path d="M4 4v6h6"/><path d="M4 10a8 8 0 1 1 2 6"/></svg>',
		done: '<svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>',
		match: '<svg viewBox="0 0 24 24"><circle cx="8" cy="8" r="4"/><circle cx="16" cy="16" r="4"/><path d="M12 8h6M6 16h6"/></svg>',
		stack: '<svg viewBox="0 0 24 24"><path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/></svg>',
		left: '<svg viewBox="0 0 24 24"><path d="M14 6l-6 6 6 6"/><path d="M20 12H8"/></svg>', right: '<svg viewBox="0 0 24 24"><path d="M10 6l6 6-6 6"/><path d="M4 12h12"/></svg>'
	};
	function underList() { return S.lastHit && S.doc ? hitAll(S.lastHit) : []; }
	function tools() { // the big few (Done, change, Duplicate, Delete) sit in the bar that stays on screen; the rest scroll
		var l = selLayer(), t = [], bar = [], keep = $('tools').scrollLeft;
		if (!l) {
			t = [['addText', 'Add words', IC.text], ['stickers', 'Stickers', IC.stk], ['addPhoto', 'Photo spot', IC.photo], ['addSlide', 'Add slide', IC.plus], ['dropSlide', 'Remove slide', IC.minus], ['slideL', 'Move slide left', IC.left], ['slideR', 'Move slide right', IC.right]];
			if (S.doc.story) t = t.map(function (x) { return [x[0], x[1].replace('slide', 'story')]; });
			if (S.doc.layers.some(function (x) { return x.lib === 'nat'; })) t.push(['match', 'Match colours', IC.match, 'foxy']);
			t.push(['reset', 'Start over', IC.reset]);
		} else if (S.adjust) {
			bar = [['adjustDone', 'Done', IC.done, 'hot']];
		} else {
			bar.push(['deselect', 'Done', IC.done, 'hot']);
			if (l.kind === 'photo') bar.push(['replace', 'Change photo', IC.photo]);
			if (l.kind === 'text' || (l.kind === 'ui' && 't' in l)) bar.push(['edit', 'Edit words', IC.edit]);
			bar.push(['copy', 'Duplicate', IC.copy], ['delete', 'Delete', IC.del, 'danger']);
			if (l.kind === 'photo') t.push(['adjust', 'Move photo inside', IC.adj], ['cutout', 'Foxy cut-out', IC.cut, 'foxy'], ['filter', 'Photo look', IC.fx], ['shape', 'Frame shape', IC.shape]);
			t.push(['animate', l.anim && l.anim.a ? 'Animation on' : 'Animate', IC.anim, l.anim && l.anim.a ? 'hot' : ''], ['forward', 'In front', IC.up], ['backward', 'Behind', IC.down]);
			if (underList().length > 1) t.push(['under', 'Pick the one below', IC.stack]);
		}
		var draw = function (el, list) { el.innerHTML = list.map(function (x) { return '<button type="button" class="cr-tool ' + (x[3] || '') + '" data-a="' + x[0] + '">' + x[2] + '<span>' + x[1] + '</span></button>'; }).join(''); Array.prototype.forEach.call(el.children, function (b) { b.onclick = function () { act(b.dataset.a); }; }); };
		$('selbar').hidden = !bar.length; $('selbar').style.setProperty('--n', bar.length);
		draw($('selbar'), bar); draw($('tools'), t); $('tools').hidden = !t.length; $('tools').scrollLeft = l ? 0 : keep;
	}
	function act(a) {
		var l = selLayer(), d = S.doc, vs = visibleSlide(), cx = vs * W + W / 2;
		if (a === 'addText') { snap(); var n = {kind: 'text', id: 't' + rid(), x: cx, y: d.H / 2, w: 760, t: 'Your words', size: 90, font: 'chunky', wt: 800, c: '#ffffff', shadow: 'rgba(0,0,0,.3)', rot: 0, added: true}; n.h = 110; d.layers.push(n); S.sel = n.id; after(); editText(n); return; }
		if (a === 'stickers') return stickerSheet();
		if (a === 'addPhoto') { snap(); var p = {kind: 'photo', id: 'p' + rid(), x: cx, y: d.H / 2, w: 560, h: 700, src: null, fit: {s: 1}, frame: 'polaroid', rot: -3, hint: 'any', added: true}; d.layers.push(p); S.sel = p.id; after(); replacePhoto(p); return; }
		if (a === 'addSlide') { if (d.n >= 10) return toast('Instagram allows 10 slides at most'); snap(); d.n++; after(); setTimeout(function () { $('stage').scrollTo({left: $('stage').scrollWidth, behavior: reduced ? 'auto' : 'smooth'}); }, 50); return; }
		if (a === 'dropSlide') { if (d.n <= (d.story ? 1 : 2)) return toast(d.story ? 'A story needs at least 1 frame' : 'A carousel needs at least 2 slides'); snap(); d.n--; d.layers = d.layers.filter(function (x) { return x.kind === 'path' || x.kind === 'cut' || x.x - x.w / 2 < d.n * W; });
			d.layers.forEach(function (x) { if (x.kind === 'cut' || x.x <= d.n * W) return; var sh = x.x - d.n * W; x.x -= sh; if (x.pts) x.pts = x.pts.map(function (q) { return [q[0] - sh, q[1]]; }); }); // a piece that reached over the cut slide is pulled back, so it can still be picked
			after(); return; }
		if (a === 'slideL' || a === 'slideR') return moveSlide(a === 'slideL' ? -1 : 1);
		if (a === 'reset') return sheet({hand: 'sure?', title: 'Start this template <em>over</em>?', html: '<p>Your photos stay in the tray. Words and moves go back to how the template looks.</p>', close: closeSheet, acts: [{t: 'Start over', fn: function () { closeSheet(); snap(); pickTpl(d.tpl, S.variant, false, true); toast('Started over. Undo brings your design back.'); }}, {t: 'Keep my design', cls: 'btn line', fn: closeSheet}]});
		if (a === 'match') { snap(); var m = matchNature(); after(); return toast(m ? 'Foxy matched ' + m + ' nature photo' + (m > 1 ? 's' : '') + ' to your colours' : 'Add your photos first'); }
		if (a === 'deselect') { S.sel = null; S.adjust = false; tools(); need = true; saveDraft(); return; }
		if (a === 'under') { var li = underList(), ix = li.indexOf(l), nx = li[(ix + 1) % li.length]; if (nx) { S.sel = nx.id; S.adjust = false; tools(); need = true; } return; }
		if (!l) return;
		if (a === 'replace') return replacePhoto(l);
		if (a === 'adjust') { if (!l.src) return replacePhoto(l); S.adjust = true; tools(); need = true; return toast('Drag to move the photo inside. Pinch to zoom.'); }
		if (a === 'adjustDone') { S.adjust = false; tools(); need = true; saveDraft(); return; }
		if (a === 'cutout') return cutSheet(l);
		if (a === 'filter') return pickSheet('Photo <em>look</em>', [['none', 'Natural'], ['warm', 'Warm'], ['fade', 'Faded film'], ['cool', 'Cool'], ['bw', 'Black & white']], l.filter || 'none', function (v) { l.filter = v; });
		if (a === 'shape') return pickSheet('Photo <em>shape</em>', [['rect', 'Square corners'], ['round', 'Rounded'], ['arch', 'Arch'], ['circle', 'Circle'], ['heart', 'Heart'], ['polaroid', 'Polaroid'], ['border', 'White border'], ['window', 'Mac window'], ['camera-silver', 'Silver camera'], ['camera-pink', 'Pink camera'], ['camera-dslr', 'Big camera'], ['retro-tv', 'Old TV'], ['stamp', 'Postage stamp'], ['soft', 'Soft rounded'], ['music', 'Music player']], l.frame && l.frame !== 'none' ? l.frame : (l.shape === 'arch' || l.shape === 'circle' || l.shape === 'heart' ? l.shape : (l.r ? 'round' : 'rect')), function (v) {
			if (['rect', 'round', 'arch', 'circle', 'heart'].indexOf(v) >= 0) { l.frame = 'none'; l.shape = v === 'round' ? 'rect' : v; l.r = v === 'round' ? 40 : 0; } else { l.frame = v; l.shape = 'rect'; if (/^camera/.test(v)) l.h = l.w; if (v === 'music') { l.h = l.w * 1.58; l.title = l.title || 'Song name'; l.artist = l.artist || 'Artist'; } }
			l.reshaped = true;
		});
		if (a === 'animate') return pickSheet('Make it <em>move</em>', [['', 'No movement'], ['float', 'Float'], ['wiggle', 'Wiggle'], ['swing', 'Swing'], ['spin', 'Spin'], ['pulse', 'Pulse'], ['pop', 'Pop in'], ['slide', 'Slide in'], ['rise', 'Rise up'], ['drift', 'Drift'], ['blink', 'Blink'], ['type', 'Type out (words)'], ['draw', 'Draw (flight path)'], ['zoom', 'Slow zoom (photos)']], (l.anim && l.anim.a) || '', function (v) { l.anim = v ? {a: v, d: (l.anim && l.anim.d) || 0} : null; if (v && S.mode !== 'anim') toast('Switch to “Moving” at the top to see it move'); });
		if (a === 'forward' || a === 'backward') { snap(); var i = d.layers.indexOf(l); d.layers.splice(i, 1); d.layers.splice(clamp(i + (a === 'forward' ? 1 : -1), 0, d.layers.length), 0, l); after(); return; }
		if (a === 'copy') { snap(); var c = JSON.parse(JSON.stringify(l)); c.id = l.kind.charAt(0) + rid(); var ox = Math.min(40, d.n * W - l.x), oy = Math.min(40, d.H - l.y); if (ox < 8) ox = -40; if (oy < 8) oy = -40; c.x += ox; c.y += oy; c.added = true; if (c.pts) c.pts = c.pts.map(function (q) { return [q[0] + ox, q[1] + oy]; }); d.layers.splice(d.layers.indexOf(l) + 1, 0, c); S.sel = c.id; after(); return; }
		if (a === 'delete') { snap(); if (!l.added) d.gone = (d.gone || []).concat([l.id]); d.layers = d.layers.filter(function (x) { return x !== l && !(x.kind === 'cut' && x.of === l.id); }); S.sel = null; after(); toast('Deleted. The undo arrow at the top brings it back.'); return; }
		if (a === 'edit') return editText(l);
	}
	function pickSheet(title, opts, cur, fn) {
		var box = sheet({hand: 'pick one', title: title, html: '<div class="cr-row" id="pk">' + opts.map(function (o) { return '<button type="button" class="cr-pill" data-v="' + esc(o[0]) + '" aria-pressed="' + (o[0] === cur) + '">' + esc(o[1]) + '</button>'; }).join('') + '</div>', close: closeSheet, acts: [{t: 'Done', fn: closeSheet}]});
		box.querySelectorAll('#pk button').forEach(function (b) { b.onclick = function () { snap(); fn(b.dataset.v); box.querySelectorAll('#pk button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); need = true; saveDraft(); tools(); }; });
	}

	// ---------- words ----------
	var FONT_LIST = [['chunky', 'Chunky'], ['grotesk', 'Clean'], ['serif', 'Serif'], ['display', 'Magazine'], ['hand', 'Handwritten'], ['script', 'Script'], ['bubble', 'Bubbly'], ['type', 'Typewriter'], ['te', 'తెలుగు చేతిరాత'], ['teBold', 'తెలుగు బోల్డ్'], ['teSerif', 'తెలుగు సెరిఫ్']];
	function colours() { var v = S.doc.vars || {}, base = ['#ffffff', '#111111', '#C42847', '#F6E3A1', '#1f3fae', '#e8692c', '#2f5d1e', '#f2b8c6']; Object.keys(v).forEach(function (k) { if (/^c\d$/.test(k) && /^#/.test(v[k])) base.unshift(v[k]); }); return base.filter(function (c, i, a) { return a.indexOf(c) === i; }).slice(0, 12); }
	function measureText(l) { // keeps the box the size of the words, so moving and resizing feel right
		if (l.kind !== 'text' || l.curve) { if (l.curve) l.h = l.size * 2.4; return; }
		var c = document.createElement('canvas').getContext('2d');
		c.font = (l.it ? 'italic ' : '') + (l.wt || 400) + ' ' + Math.round(l.size) + 'px ' + (E.FONTS[l.font] || E.FONTS.grotesk);
		var lines = 0; String(l.upper ? String(l.t).toUpperCase() : l.t).split('\n').forEach(function (para) { var line = '', n = 1; para.split(/(\s+)/).forEach(function (w) { var t = line + w; if (c.measureText(t.trim()).width > l.w && line.trim()) { n++; line = w; } else line = t; }); lines += n; });
		l.h = Math.round(lines * l.size * (l.lh || 1.12) + (l.bg ? l.size * .6 : 0));
	}
	function editText(l) {
		var isUi = l.kind === 'ui';
		var html = '<label for="tx">Words</label><textarea id="tx" rows="3">' + esc(l.t || '') + '</textarea>';
		if (!isUi) {
			html += '<label>Font</label><div class="cr-row" id="fnts">' + FONT_LIST.map(function (f) { return '<button type="button" class="cr-pill" data-v="' + f[0] + '" aria-pressed="' + (l.font === f[0]) + '" style="font-family:' + E.FONTS[f[0]].replace(/"/g, "'") + '">' + f[1] + '</button>'; }).join('') + '</div>';
			html += '<label>Colour</label><div class="cr-row" id="cols">' + colours().map(function (c) { return '<button type="button" class="cr-swatch" data-v="' + c + '" aria-pressed="' + (E.col(S.doc, l.c) === c) + '" style="background:' + c + '" aria-label="' + c + '"></button>'; }).join('') + '</div>';
			html += '<label for="sz">Size</label><input type="range" id="sz" min="20" max="320" value="' + Math.round(l.size) + '">';
			html += '<label for="cv2">Bend</label><input type="range" id="cv2" min="-60" max="60" value="' + (l.curve || 0) + '">';
			html += '<label>Style</label><div class="cr-row" id="sty">' + [['align-left', 'Left'], ['align-center', 'Centre'], ['align-right', 'Right'], ['bg', 'Label behind'], ['stroke', 'Outline'], ['shadow', 'Shadow'], ['upper', 'CAPITALS']].map(function (s) { var on = s[0].indexOf('align-') === 0 ? (l.align || 'center') === s[0].slice(6) : !!l[s[0]]; return '<button type="button" class="cr-pill" data-v="' + s[0] + '" aria-pressed="' + on + '">' + s[1] + '</button>'; }).join('') + '</div>';
		}
		snap();
		var done = function () { // no empty ghost pieces, and no empty step left in undo
			closeSheet();
			if (l.added && !String(l.t || '').trim()) { S.doc.layers = S.doc.layers.filter(function (x) { return x !== l; }); S.sel = null; after(); }
			else if (S.undo[S.undo.length - 1] === JSON.stringify(S.doc)) { S.undo.pop(); undoBtns(); }
		};
		var box = sheet({hand: 'say it', title: 'Edit the <em>words</em>', html: html, close: done, acts: [{t: 'Done', fn: done}]});
		var tx = box.querySelector('#tx'); tx.focus(); if (!l.edited || l.t === 'Your words') tx.select(); else tx.setSelectionRange(tx.value.length, tx.value.length);
		var upd = function () { l.edited = true; measureText(l); need = true; saveDraft(); };
		tx.oninput = function () { l.t = tx.value; upd(); };
		if (isUi) return;
		box.querySelectorAll('#fnts button').forEach(function (b) { b.onclick = function () { l.font = b.dataset.v; l.wt = /chunky|grotesk|display|teBold/.test(l.font) ? 800 : 400; l.it = false; box.querySelectorAll('#fnts button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); upd(); }; });
		box.querySelectorAll('#cols button').forEach(function (b) { b.onclick = function () { l.c = b.dataset.v; box.querySelectorAll('#cols button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); upd(); }; });
		box.querySelector('#sz').oninput = function () { var k = this.value / l.size; l.size = +this.value; l.w = Math.max(l.w, l.size * 2); upd(); };
		box.querySelector('#cv2').oninput = function () { l.curve = +this.value || 0; upd(); };
		box.querySelectorAll('#sty button').forEach(function (b) { b.onclick = function () {
			var v = b.dataset.v;
			if (v.indexOf('align-') === 0) { l.align = v.slice(6); box.querySelectorAll('#sty [data-v^="align-"]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); }
			else { var on = b.getAttribute('aria-pressed') !== 'true'; l[v] = on ? (v === 'bg' ? '#ffffff' : v === 'stroke' ? Math.max(4, l.size * .08) : v === 'shadow' ? 'rgba(0,0,0,.3)' : true) : (v === 'stroke' ? 0 : null); if (v === 'stroke' && on) l.strokeC = '#111'; b.setAttribute('aria-pressed', String(on)); }
			upd();
		}; });
	}

	// ---------- stickers ----------
	var STK = ['washi-floral', 'washi-gingham', 'clear-tape', 'gold-clip', 'sparkles-gold', 'doodle-hearts', 'doodle-arrow', 'scribble-circle', 'eucalyptus', 'babys-breath', 'tulips', 'peony', 'perfume', 'lipstick', 'filter-coffee', 'chai-glass', 'envelope', 'ribbon-banner', 'speech-bubble', 'scallop-tag', 'cloud', 'auto-rickshaw', 'pink-scooty', 'location-pin', 'music-notes', 'crescent-moon', 'anklet', 'headphones', 'camera-silver', 'camera-pink', 'cherries', 'cinnamon-roll', 'chrome-star', 'puffy-heart', 'butterfly', 'sunflower', 'hibiscus', 'cherry-blossom', 'gingham-bow', 'pink-bow', 'binder-clip', 'sticky-note', 'ticket', 'cassette', 'vinyl', 'coffee-cup', 'denim-pocket', 'torn-paper', 'newspaper', 'lace', 'spiral', 'washi', 'jasmine', 'bangles', 'bangles-red', 'bangles-yellow', 'bangles-green', 'bangles-pink', 'bangles-maroon', 'diya', 'kite', 'stamp', 'wax-seal', 'luggage-tag', 'pressed-flower', 'gold-corner', 'lotus', 'lotus-bud', 'temple-bell', 'coconut', 'veena', 'hand-mirror', 'hibiscus-red', 'mango-toran', 'kolam', 'modak', 'sugarcane', 'neem-mango', 'kalash-lotus', 'jhumka', 'parrot-green', 'ill-langa-voni', 'ill-veena-girl', 'ill-mirror-girl', 'ill-kolam-girl', 'camera-dslr', 'lantern', 'iced-latte', 'calendar', 'torn-strip', 'bunny', 'swan', 'pearls', 'white-bow', 'blue-bow', 'forget-me-not', 'rose-bouquet', 'daisy', 'gerbera', 'white-butterfly', 'peg', 'film-canister', 'sun-doodle', 'doodles-pink', 'clapboard', 'film-reel', 'ticket-pink', 'retro-tv', 'popcorn', 'microphone', 'transistor', 'vhs', 'rose-petals', 'aviators', 'kunda', 'brass-pot', 'rope-cot', 'bullock-cart', 'boat', 'palms', 'banana-meal', 'tulsi-kota', 'cycle', 'cow', 'mango-branch'];
	var UIS = [['bubble', 'Message bubble'], ['pin', 'Location pin'], ['note', 'Paper note'], ['label', 'Typed label'], ['notif', 'Notification'], ['search', 'Search bar'], ['like', 'Likes chip'], ['path', 'Flight path']];
	function stickerSheet() {
		var html = '<div class="cr-stk">' + STK.map(function (k) { return '<button type="button" data-k="' + k + '" aria-label="' + k.replace(/-/g, ' ') + '"><img src="a/stk/' + k + '.webp" alt="" loading="lazy"></button>'; }).join('') + '</div>';
		html += '<label>Phone-screen pieces</label><div class="cr-row" id="uis">' + UIS.map(function (u) { return '<button type="button" class="cr-pill" data-u="' + u[0] + '">' + u[1] + '</button>'; }).join('') + '</div>';
		var box = sheet({hand: 'stick it', title: 'Add a <em>sticker</em>', html: html, close: closeSheet, acts: [{t: 'Close', cls: 'btn line', fn: closeSheet}]});
		var cx = visibleSlide() * W + W / 2, cy = S.doc.H / 2;
		box.querySelectorAll('[data-k]').forEach(function (b) { b.onclick = function () {
			snap(); var k = b.dataset.k, ar = ((E.meta.stk[k] || {}).ar) || 1, w = /lace|spiral/.test(k) ? 140 : 300;
			var l = {kind: 'sticker', id: 's' + rid(), k: k, x: cx, y: cy, w: w, h: /lace|spiral/.test(k) ? S.doc.H : w / ar, rot: 0, added: true};
			S.doc.layers.push(l); S.sel = l.id; closeSheet(); after();
		}; });
		box.querySelectorAll('[data-u]').forEach(function (b) { b.onclick = function () {
			snap(); var u = b.dataset.u, l;
			if (u === 'path') l = {kind: 'path', id: 'f' + rid(), pts: [[cx - 380, cy + 200], [cx - 100, cy + 320], [cx + 200, cy + 120], [cx + 400, cy + 240]], c: '#fff200', lw: 6, dash: [3, 18], x: cx, y: cy + 200, w: 780, h: 200, rot: 0, added: true};
			else { var sz = {bubble: [420, 80, 'a quick trip to…'], pin: [320, 66, 'Hyderabad'], note: [380, 300, 'write something here'], label: [520, 84, 'Do what you love'], notif: [760, 170, 'You have a new memory'], search: [640, 96, 'cafes near me'], like: [260, 80, '1,204']}[u]; l = {kind: 'ui', id: 'u' + rid(), ui: u, x: cx, y: cy, w: sz[0], h: sz[1], t: sz[2], rot: 0, added: true}; if (u === 'note') l.size = 40; if (u === 'notif') l.title = 'Photos'; }
			S.doc.layers.push(l); S.sel = l.id; closeSheet(); after();
		}; });
	}

	// ---------- her photos ----------
	function addFiles(files) {
		var target = S.pickFor; S.pickFor = null; // the photo spot she tapped “Change photo” on (the first new photo goes there)
		files = files.filter(function (f) { return /^image\//.test(f.type) || /\.(jpe?g|png|heic|heif|webp)$/i.test(f.name); });
		if (!files.length) return;
		if (S.photos.length + files.length > MAX_PHOTOS) { toast('Up to ' + MAX_PHOTOS + ' photos at a time'); files = files.slice(0, MAX_PHOTOS - S.photos.length); if (!files.length) return; }
		note('Adding ' + files.length + ' photo' + (files.length > 1 ? 's' : '') + '…');
		var firstTime = !S.photos.length;
		Promise.all(files.map(loadPhoto)).then(function (list) {
			list = list.filter(Boolean); note('');
			if (!list.length) return toast('Those photos could not be opened. Try JPG or PNG.');
			S.photos = S.photos.concat(list); tray();
			var sel = target && S.doc.layers.filter(function (x) { return x.id === target && x.kind === 'photo'; })[0];
			if (sel || firstTime) snap();
			if (sel) setPhoto(sel, list[0]);
			if (firstTime) { quickFill(); toast('Placed in order. Tap “Foxy, fill it in” to let Foxy choose the best spots and write the words.'); }
			else if (!sel) toast(list.length + ' photo' + (list.length > 1 ? 's' : '') + ' added. Tap a photo spot, then tap the photo you want there.');
			after(); idbPut(list);
		});
	}
	function loadPhoto(f) {
		var id = rid();
		var open = function () { return createImageBitmap(f, {imageOrientation: 'from-image'}).catch(function () { return createImageBitmap(f); }).catch(function () { // older phones: let an <img> read it
			return new Promise(function (res, rej) { var u = URL.createObjectURL(f), im = new Image(); im.onload = function () { URL.revokeObjectURL(u); res(im); }; im.onerror = function () { URL.revokeObjectURL(u); rej(new Error('img')); }; im.src = u; }).then(function (im) { return {width: im.naturalWidth, height: im.naturalHeight, close: null, _im: im}; });
		}); };
		return open().then(function (bmp) {
			var k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height)), c = document.createElement('canvas');
			c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
			c.getContext('2d').drawImage(bmp._im || bmp, 0, 0, c.width, c.height); bmp.close && bmp.close();
			return new Promise(function (res) { c.toBlob(function (b) { res({id: id, bmp: c, blob: b, w: c.width, h: c.height, thumb: URL.createObjectURL(b)}); }, 'image/jpeg', .9); });
		}).catch(function () { return null; });
	}
	function setPhoto(l, p) {
		l.src = 'u:' + p.id; l.fit = {s: 1, ox: .5, oy: .38};
		var hasCut = S.doc.layers.some(function (x) { return x.kind === 'cut' && x.of === l.id; });
		if (l.op === 0 && !hasCut) l.op = 1;
		if (hasCut) cutFor(l.src).then(function () { need = true; }, function () { toast('Foxy could not cut you out of that photo in this browser'); }); // keep "words behind me" working with her own photo
		need = true;
	}
	function slots() { return S.doc.layers.filter(function (l) { return l.kind === 'photo' && l.lib !== 'nat'; }).sort(function (a, b) { return Math.floor(a.x / W) - Math.floor(b.x / W) || a.y - b.y; }); }
	function quickFill() { var s = slots(), i = 0; s.forEach(function (l) { if (!l.src || l.src.indexOf('u:') !== 0) { var p = S.photos[i % S.photos.length]; if (p) setPhoto(l, p); i++; } }); matchNature(); }
	function tray() {
		var used = {}; S.doc && S.doc.layers.forEach(function (l) { if (l.src && l.src.indexOf('u:') === 0) used[l.src.slice(2)] = 1; });
		var html = '<button type="button" class="add" id="addBtn">+ Add photos</button>' + S.photos.map(function (p) { return '<button type="button" data-id="' + p.id + '" class="' + (used[p.id] ? 'used' : '') + '" aria-label="Your photo"><img src="' + p.thumb + '" alt=""></button>'; }).join('');
		$('tray').innerHTML = html;
		$('addBtn').onclick = function () { S.pickFor = null; $('file').click(); };
		$('tray').querySelectorAll('[data-id]').forEach(function (b) { b.onclick = function () {
			var p = S.photos.filter(function (x) { return x.id === b.dataset.id; })[0], l = selLayer();
			if (!l || l.kind !== 'photo') { var empty = slots().filter(function (x) { return !x.src || x.src.indexOf('u:') !== 0; })[0]; if (!empty) return toast('Tap a photo on the slides first, then tap the photo you want there'); l = empty; S.sel = l.id; }
			snap(); setPhoto(l, p); after();
		}; });
	}
	function replacePhoto(l) {
		if (!S.photos.length) { S.sel = l.id; S.pickFor = l.id; tools(); $('file').click(); return; }
		var html = '<div class="cr-out" id="rp">' + S.photos.map(function (p) { return '<button type="button" class="cr-pill" style="padding:0;overflow:hidden" data-id="' + p.id + '"><img src="' + p.thumb + '" alt="Your photo"></button>'; }).join('') + '</div>';
		var box = sheet({hand: 'swap it', title: 'Pick a <em>photo</em>', html: html, close: closeSheet, acts: [{t: 'Add from my phone', fn: function () { closeSheet(); S.sel = l.id; S.pickFor = l.id; $('file').click(); }}, {t: 'Close', cls: 'btn line', fn: closeSheet}]});
		box.querySelectorAll('[data-id]').forEach(function (b) { b.onclick = function () { snap(); setPhoto(l, S.photos.filter(function (x) { return x.id === b.dataset.id; })[0]); closeSheet(); after(); }; });
	}

	// ---------- colour matching for & patterns (on the phone, free) ----------
	function avgColours(im) { var c = document.createElement('canvas'); c.width = 24; c.height = 16; var x = c.getContext('2d'); x.drawImage(im, 0, 0, 24, 16); var d = x.getImageData(0, 0, 24, 16).data, out = []; for (var i = 0; i < d.length; i += 4 * 7) out.push([d[i], d[i + 1], d[i + 2]]); return out; }
	function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
	function hsv(c) { var r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h = 0; if (d) { h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; } return [h, mx ? d / mx : 0, mx]; }
	function dist(a, b) { var A = hsv(a), B = hsv(b), dh = Math.min(Math.abs(A[0] - B[0]), 360 - Math.abs(A[0] - B[0])) / 180; return dh * 2 * Math.min(A[1], B[1]) + Math.abs(A[1] - B[1]) * .8 + Math.abs(A[2] - B[2]); }
	function matchNature() {
		var libs = S.doc.layers.filter(function (l) { return l.lib === 'nat'; }); if (!libs.length) return 0;
		var nat = E.meta.nat, keys = Object.keys(nat), usedK = {}, n = 0;
		libs.forEach(function (l) {
			var slide = Math.floor(l.x / W), mate = S.doc.layers.filter(function (x) { return x.kind === 'photo' && x.lib !== 'nat' && Math.floor(x.x / W) === slide && x.src && x.src.indexOf('u:') === 0; })[0];
			if (!mate) return;
			var im = window.CarouselUser(mate.src); if (!im) return;
			var cols = avgColours(im), best = null, bs = 1e9;
			keys.forEach(function (k) { if (usedK[k]) return; var nc = nat[k].cols.map(hex), s = 0; nc.slice(0, 2).forEach(function (c, i) { var m = Math.min.apply(null, cols.map(function (q) { return dist(q, c); })); s += m * (i ? .6 : 1); }); if (s < bs) { bs = s; best = k; } });
			if (best) { usedK[best] = 1; l.src = 'nat/' + best; n++; }
		});
		E.preload(libs.map(function (l) { return l.src; })).then(function () { need = true; });
		return n;
	}

	// ---------- Foxy cut-out (on the phone, MediaPipe selfie segmentation) ----------
	var seg = null;
	function segmenter() {
		if (seg) return seg;
		seg = import(MP + '/vision_bundle.mjs').then(function (V) {
			return V.FilesetResolver.forVisionTasks(MP + '/wasm').then(function (fs) {
				return V.ImageSegmenter.createFromOptions(fs, {baseOptions: {modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite', delegate: 'GPU'}, runningMode: 'IMAGE', outputConfidenceMasks: true, outputCategoryMask: false});
			});
		});
		seg.catch(function () { seg = null; });
		return seg;
	}
	function cutFor(src) {
		if (S.cuts[src]) return Promise.resolve(S.cuts[src]);
		if (src.indexOf('ph/') === 0) return E.preload(['cut/' + src.slice(3)]).then(function () { return E.img('cut/' + src.slice(3)); });
		var im = window.CarouselUser(src) || E.img(src); if (!im) return Promise.reject(new Error('noimg'));
		return segmenter().then(function (s) {
			// selfie_multiclass masks: 0 background, 1 hair, 2 body skin, 3 face skin, 4 clothes, 5 other things (tables, bags...)
			var res = s.segment(im), ms = res.confidenceMasks, m = ms[0], mw = m.width, mh = m.height;
			var person = [1, 2, 3, 4].filter(function (k) { return ms[k]; }).map(function (k) { return ms[k].getAsFloat32Array(); });
			var mc = document.createElement('canvas'); mc.width = mw; mc.height = mh; var mx = mc.getContext('2d'), id = mx.createImageData(mw, mh);
			for (var i = 0; i < mw * mh; i++) { var pv = 0; for (var k = 0; k < person.length; k++) pv += person[k][i]; id.data[i * 4 + 3] = Math.round(clamp((pv - .35) / .35, 0, 1) * 255); }
			mx.putImageData(id, 0, 0); res.confidenceMasks.forEach(function (x) { x.close(); });
			var out = document.createElement('canvas'); out.width = im.width; out.height = im.height; var ox = out.getContext('2d');
			ox.drawImage(im, 0, 0); ox.globalCompositeOperation = 'destination-in'; ox.imageSmoothingQuality = 'high'; ox.filter = 'blur(' + Math.max(1, im.width / 700) + 'px)'; ox.drawImage(mc, 0, 0, out.width, out.height);
			S.cuts[src] = out; return out;
		});
	}
	function cutSheet(l) {
		if (!l.src) return toast('Add a photo here first');
		var has = S.doc.layers.filter(function (x) { return x.kind === 'cut' && x.of === l.id; })[0];
		var box = sheet({hand: 'snip snip', title: 'Foxy <em>cut-out</em>', html: '<p>Foxy lifts you out of this photo.</p><div class="cr-row" id="co">' +
			'<button type="button" class="cr-pill" data-v="front">Words behind me</button><button type="button" class="cr-pill" data-v="pop">Pop out of the frame</button><button type="button" class="cr-pill" data-v="only">Just me (no background)</button>' + (has ? '<button type="button" class="cr-pill" data-v="off">Remove cut-out</button>' : '') + '</div><p class="cr-fine" id="coMsg">It works on your phone, nothing is uploaded. Best with one person and a clear outline.</p>', close: closeSheet, acts: [{t: 'Close', cls: 'btn line', fn: closeSheet}]});
		box.querySelectorAll('#co button').forEach(function (b) { b.onclick = function () {
			var v = b.dataset.v;
			if (v === 'off') { snap(); S.doc.layers = S.doc.layers.filter(function (x) { return x !== has; }); if (l.op === 0) l.op = 1; closeSheet(); return after(); }
			$('coMsg').textContent = 'Foxy is cutting you out… (the first time takes a few seconds)';
			box.querySelectorAll('#co button').forEach(function (x) { x.disabled = true; });
			cutFor(l.src).then(function () {
				snap();
				S.doc.layers = S.doc.layers.filter(function (x) { return !(x.kind === 'cut' && x.of === l.id); });
				var c = {kind: 'cut', id: 'c' + rid(), of: l.id, x: l.x, y: l.y, w: l.w, h: l.h, ext: v === 'pop' ? {t: .3, b: 0, l: .12, r: .12} : v === 'only' ? {t: .05, b: 0, l: .05, r: .05} : {t: 0, b: 0, l: 0, r: 0}, added: true};
				S.doc.layers.push(c); // on top, so words and stickers she wants behind her already are
				l.op = v === 'only' ? 0 : 1;
				closeSheet(); after(); toast(v === 'front' ? 'Done. Move words onto the photo: they sit behind you.' : 'Done');
			}, function () { $('coMsg').textContent = 'The cut-out could not run in this browser. Try Chrome or Safari, or another photo.'; box.querySelectorAll('#co button').forEach(function (x) { x.disabled = false; }); });
		}; });
	}

	// ---------- Foxy fill (Claude, through the Creator Connect worker) ----------
	function small64(p, side) { var k = Math.min(1, side / Math.max(p.w, p.h)), c = document.createElement('canvas'); c.width = Math.round(p.w * k); c.height = Math.round(p.h * k); c.getContext('2d').drawImage(p.bmp, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', .8).split(',')[1]; }
	function foxyFill() {
		if (!S.photos.length) { toast('Add your photos first, then Foxy places them'); return $('file').click(); }
		var langs = [['both', 'English + Telugu'], ['en', 'English'], ['te', 'Telugu']];
		var box = sheet({hand: 'hi, it’s Foxy', title: 'Shall I <em>fill it in</em>?', html: '<p>I look at small copies of your photos, put each one where it looks best, line up faces, and write the words, caption and hashtags. You can change anything after.</p><label>Words in</label><div class="cr-row" id="lg">' + langs.map(function (l) { return '<button type="button" class="cr-pill" data-v="' + l[0] + '" aria-pressed="' + (S.lang === l[0]) + '">' + l[1] + '</button>'; }).join('') + '</div><label for="about">What is this carousel about? (optional)</label><input type="text" id="about" maxlength="160" placeholder="e.g. my sister’s wedding week, café hopping in Jubilee Hills">', close: closeSheet,
			acts: [{t: 'Yes, fill it in', fn: function () { runFoxy(box.querySelector('#about').value); }}, {t: 'Not now', cls: 'btn line', fn: closeSheet}]});
		box.querySelectorAll('#lg button').forEach(function (b) { b.onclick = function () { S.lang = b.dataset.v; store('cc_cr_lang', S.lang); box.querySelectorAll('#lg button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); }; });
	}
	function runFoxy(about) {
		var photos = S.photos.slice(0, 12), d = S.doc;
		var req = {
			template: {id: d.tpl, name: S.tpl.name, about: S.tpl.blurb, slides: d.n, variant: S.variant || ''},
			lang: S.lang, about: String(about || '').slice(0, 160), handle: S.handle,
			photos: photos.map(function (p, i) { return {i: i, ar: +(p.w / p.h).toFixed(3), jpg: small64(p, 448)}; }),
			slots: slots().map(function (l) { var b = E.inner(l); return {id: l.id, slide: Math.floor(l.x / W) + 1, hint: l.hint || 'any', ar: +(b.w / b.h).toFixed(3), big: l.w * l.h > W * d.H * .45}; }),
			texts: d.layers.filter(function (l) { return (l.kind === 'text' || (l.kind === 'ui' && typeof l.t === 'string' && l.ui !== 'like')) && l.t; }).map(function (l) { return {id: l.id, slide: Math.floor(l.x / W) + 1, kind: l.kind === 'ui' ? l.ui : (l.size > 100 ? 'title' : 'line'), now: String(l.t).slice(0, 120), max: Math.max(6, Math.round(String(l.t).length * 1.4)), telugu_font: /^te/.test(l.font || '')}; })
		};
		var ac = window.AbortController ? new AbortController() : null, gone = false, tmo = setTimeout(function () { if (ac) ac.abort(); }, 90000);
		var stop = function () { gone = true; clearTimeout(tmo); clearInterval(tick2); if (ac) ac.abort(); closeSheet(); toast('Stopped. Nothing was changed.'); };
		var box = sheet({hand: 'on it', title: 'Foxy is <em>looking</em>…', html: '<div class="cr-prog"><i id="fp" style="width:15%"></i></div><p class="cr-fine">About 15 seconds. Keep this page open.</p>', close: stop, acts: [{t: 'Cancel', cls: 'btn line', fn: stop}]});
		var bar = box.querySelector('#fp'), tick2 = setInterval(function () { bar.style.width = Math.min(92, parseFloat(bar.style.width) + 6) + '%'; }, 900);
		api('/me/foxy/carousel', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(req), signal: ac && ac.signal}, 90000).then(function (r) {
			clearInterval(tick2); clearTimeout(tmo); if (gone) return;
			if (!r || !r.ok) return sheet({hand: 'oh no', title: 'Foxy could not <em>finish</em>', html: '<p>' + esc((r && r.error) || 'Something went wrong.') + '</p><p class="cr-fine">Your design is unchanged. You can place photos yourself by tapping them in the tray.</p>', close: closeSheet, acts: [{t: 'Close', fn: closeSheet}]});
			snap(); applyFoxy(r, photos); closeSheet(); after();
			toast('Foxy filled ' + (r.slots || []).length + ' spots and ' + (r.texts || []).length + ' words');
		}, function () { clearInterval(tick2); clearTimeout(tmo); if (gone) return; sheet({hand: 'no signal', title: 'Could not reach <em>Foxy</em>', html: '<p>Check your internet and try again.</p>', close: closeSheet, acts: [{t: 'Close', fn: closeSheet}]}); });
	}
	function applyFoxy(r, photos) {
		var byId = {}; S.doc.layers.forEach(function (l) { byId[l.id] = l; });
		(r.slots || []).forEach(function (s) { var l = byId[s.id], p = photos[s.photo]; if (!l || !p) return; setPhoto(l, p); l.fit = {s: 1, ox: clamp(+s.fx || .5, 0, 1), oy: clamp(+s.fy || .38, 0, 1)}; });
		(r.texts || []).forEach(function (t) { var l = byId[t.id]; if (!l || typeof t.text !== 'string' || !t.text.trim()) return; l.t = t.text.trim(); l.edited = true; if (/[ఀ-౿]/.test(l.t) && l.kind === 'text' && !/^te/.test(l.font || '')) l.font = l.size > 100 ? 'teBold' : 'te'; measureText(l); });
		if (r.caption) S.caption = r.caption; if (Array.isArray(r.hashtags)) S.tags = r.hashtags;
		matchNature();
	}

	// ---------- sheet ----------
	var sheetClose = null, lastFocus = null;
	function fitSheet() { // a phone keyboard shrinks the visible area: keep the sheet (and its text box) inside what she can see
		var s = $('sheet'), vv = window.visualViewport; if (s.hidden) return;
		if (vv && vv.height < window.innerHeight - 80) { s.style.top = vv.offsetTop + 'px'; s.style.height = vv.height + 'px'; s.style.bottom = 'auto'; }
		else { s.style.top = s.style.height = s.style.bottom = ''; }
		var f = document.activeElement; if (f && f.tagName === 'TEXTAREA' && s.contains(f)) f.scrollIntoView({block: 'nearest'});
	}
	if (window.visualViewport) { visualViewport.addEventListener('resize', fitSheet); visualViewport.addEventListener('scroll', fitSheet); }
	function sheet(o) {
		var box = $('sheetIn');
		if ($('sheet').hidden) lastFocus = document.activeElement;
		box.innerHTML = (o.hand ? '<p class="hand">' + esc(o.hand) + '</p>' : '') + '<h2 id="sheetTitle">' + o.title + '</h2>' + (o.html || '') + '<div class="acts"></div>';
		var acts = box.querySelector('.acts');
		(o.acts || []).forEach(function (a) { var b = document.createElement('button'); b.type = 'button'; b.className = a.cls || 'btn red'; b.textContent = a.t; b.onclick = function () { a.fn(b); }; acts.appendChild(b); });
		sheetClose = o.close || null;
		$('sheet').hidden = false; document.body.classList.add('cr-lock'); fitSheet(); box.scrollTop = 0;
		box.setAttribute('tabindex', '-1'); try { box.focus({preventScroll: true}); } catch (x) {}
		$('sheet').onclick = function (e) { if (e.target === $('sheet') && sheetClose) sheetClose(); };
		return box;
	}
	function closeSheet() {
		$('sheet').hidden = true; $('sheetIn').innerHTML = ''; sheetClose = null; need = true; tools(); document.body.classList.remove('cr-lock'); fitSheet();
		if (lastFocus && document.contains(lastFocus) && lastFocus.focus && lastFocus !== document.body) { try { lastFocus.focus({preventScroll: true}); } catch (x) {} } lastFocus = null;
	}

	// ---------- export ----------
	function stamp() { var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; }; return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()); }
	function slideCanvas(i, t) { var c = document.createElement('canvas'); c.width = W; c.height = S.doc.H; E.render(c.getContext('2d'), S.doc, {x0: i * W, vw: W, t: t, mode: 'export', cuts: S.cuts}); return c; }
	function still(i) { return new Promise(function (res, rej) { var c = slideCanvas(i, null); c.toBlob(function (b) { c.width = c.height = 0; b ? res({blob: b, type: 'image/jpeg', name: 'slide-' + (i + 1) + '-' + stamp() + '.jpg', kind: 'image', i: i}) : rej(new Error('still')); }, 'image/jpeg', .93); }); }
	function firstType(list) { for (var i = 0; i < list.length; i++) if (MediaRecorder.isTypeSupported(list[i])) return list[i]; return ''; }
	function recMedia(cvs, mime, kind, bits) {
		var stream = cvs.captureStream(FPS), chunks = [], mr = new MediaRecorder(stream, {mimeType: mime, videoBitsPerSecond: bits});
		mr.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
		var r = {kind: kind, err: null, start: function () { mr.onerror = function (e) { r.err = e.error || new Error('recorder'); }; mr.start(); }, frame: function () {},
			stop: function () { return new Promise(function (res, rej) { mr.onstop = function () { stream.getVideoTracks().forEach(function (t) { t.stop(); }); var b = new Blob(chunks, {type: kind === 'mp4' ? 'video/mp4' : 'video/webm'}); b.size ? res(b) : rej(new Error('empty')); }; try { mr.stop(); } catch (e) { rej(e); } }); },
			cancel: function () { try { mr.onstop = null; if (mr.state !== 'inactive') mr.stop(); } catch (e) {} stream.getVideoTracks().forEach(function (t) { t.stop(); }); }};
		return r;
	}
	function loadMuxer() { if (window.Mp4Muxer) return Promise.resolve(); return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = MUXER; s.crossOrigin = 'anonymous'; s.onload = function () { window.Mp4Muxer ? res() : rej(new Error('muxer')); }; s.onerror = function () { rej(new Error('muxer')); }; document.head.appendChild(s); }); }
	function recCodecs(cvs, H, bits) {
		var cfgs = ['avc1.640028', 'avc1.4d0028', 'avc1.42e028'].map(function (codec) { return {codec: codec, width: W, height: H, bitrate: bits, framerate: FPS, avc: {format: 'avc'}}; });
		return cfgs.reduce(function (p, cfg) { return p.then(function (ok) { return ok || VideoEncoder.isConfigSupported(cfg).then(function (s) { return s && s.supported ? cfg : null; }, function () { return null; }); }); }, Promise.resolve(null)).then(function (cfg) {
			if (!cfg) return null;
			return loadMuxer().then(function () {
				var M = window.Mp4Muxer, mux = new M.Muxer({target: new M.ArrayBufferTarget(), video: {codec: 'avc', width: W, height: H, frameRate: FPS}, fastStart: 'in-memory', firstTimestampBehavior: 'offset'});
				var last = -1, n = 0, r = {kind: 'mp4', err: null}, enc = new VideoEncoder({output: function (c, m) { mux.addVideoChunk(c, m); }, error: function (e) { r.err = e; }});
				enc.configure(cfg);
				r.start = function () {};
				r.frame = function (t) { var idx = Math.round(t * FPS); if (idx <= last || enc.encodeQueueSize > 4) return; last = idx; var vf = new VideoFrame(cvs, {timestamp: Math.round(idx * 1e6 / FPS), duration: Math.round(1e6 / FPS)}); enc.encode(vf, {keyFrame: n++ % 60 === 0}); vf.close(); };
				r.stop = function () { return enc.flush().then(function () { enc.close(); mux.finalize(); return new Blob([mux.target.buffer], {type: 'video/mp4'}); }); };
				r.cancel = function () { try { enc.close(); } catch (e) {} };
				return r;
			});
		});
	}
	function openRecorder(cvs, H) {
		var force = (location.search.match(/[?&]rec=(\w+)/) || [])[1], bits = 7000000, MR = window.MediaRecorder, can = !!(cvs.captureStream && MR && MR.isTypeSupported), tries = [];
		if (window.VideoEncoder && window.VideoFrame && (!force || force === 'wc')) tries.push(function () { return recCodecs(cvs, H, bits); });
		if (can && (!force || force === 'mr')) tries.push(function () { var mime = firstType(['video/mp4;codecs="avc1.640028"', 'video/mp4;codecs="avc1.4d0028"', 'video/mp4;codecs="avc1.42E01E"', 'video/mp4;codecs=avc1']); if (!mime && MR.isTypeSupported('video/mp4') && !MR.isTypeSupported('video/mp4;codecs=vp9')) mime = 'video/mp4'; return mime ? recMedia(cvs, mime, 'mp4', bits) : null; });
		if (can && (!force || force === 'webm')) tries.push(function () { var mime = firstType(['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']); return mime ? recMedia(cvs, mime, 'webm', bits) : null; });
		return tries.reduce(function (p, fn) { return p.then(function (r) { return r || Promise.resolve().then(fn).catch(function () { return null; }); }); }, Promise.resolve(null)).then(function (r) { if (!r) throw new Error('novideo'); return r; });
	}
	function video(i, ctl, onProg) { // one moving slide, 5 seconds, recorded in real time
		var c = document.createElement('canvas'); c.width = W; c.height = S.doc.H; $('vids').appendChild(c);
		var x = c.getContext('2d'), rec = null, draw = function (t) { E.render(x, S.doc, {x0: i * W, vw: W, t: t, mode: 'export', cuts: S.cuts}); };
		draw(0);
		return openRecorder(c, S.doc.H).then(function (r) {
			rec = r; rec.start(); var t0 = performance.now();
			return new Promise(function (res, rej) { (function step() {
				if (ctl.cancelled) return rej(new Error('cancelled')); if (document.hidden) return rej(new Error('hidden')); if (rec.err) return rej(rec.err);
				var t = (performance.now() - t0) / 1000; draw(Math.min(t, E.LOOP)); rec.frame(Math.min(t, E.LOOP)); onProg(t / E.LOOP);
				if (t >= E.LOOP) return res(); requestAnimationFrame(step);
			})(); });
		}).then(function () { return rec.stop(); }).then(function (blob) { c.remove(); return {blob: blob, type: blob.type, name: 'slide-' + (i + 1) + '-' + stamp() + '.' + rec.kind, kind: 'video', container: rec.kind, i: i}; }, function (e) { if (rec) rec.cancel(); c.remove(); throw e; });
	}
	function makeFiles(ctl, onProg) {
		var out = [], n = S.doc.n, moving = S.mode === 'anim';
		var seq = Promise.resolve();
		for (var i = 0; i < n; i++) (function (i) { seq = seq.then(function () {
			var asVideo = moving && E.slideAnimated(S.doc, i);
			onProg(i, n, asVideo ? 0 : 1, asVideo);
			return (asVideo ? video(i, ctl, function (f) { onProg(i, n, f, true); }) : still(i)).then(function (f) { out.push(f); });
		}); })(i);
		return seq.then(function () { return out; });
	}
	function startExport() {
		if (S.busy) return;
		if (S.sel) { S.sel = null; S.adjust = false; tools(); }
		var mine = function (l) { return l.src && l.src.indexOf('u:') === 0 && !!window.CarouselUser(l.src); };
		var empty = slots().filter(function (l) { return !l.src || (l.src.indexOf('u:') === 0 && !mine(l)); }).length, samples = slots().filter(function (l) { return l.src && l.src.indexOf('u:') !== 0; }).length; // sample photos and colour blocks count too
		var warn = empty ? '<p class="cr-warn">' + empty + ' photo spot' + (empty > 1 ? 's are' : ' is') + ' still empty.</p>' : '';
		if (samples) warn += '<p class="cr-warn">' + samples + ' photo spot' + (samples > 1 ? 's still show' : ' still shows') + ' a sample or a colour block. Put your photos there first, unless you like it that way.</p>';
		var moving = S.mode === 'anim' && S.doc.layers.some(function (l) { return l.anim && l.anim.a; });
		sheet({hand: 'nearly there', title: 'Save or <em>plan</em> it', html: warn + '<p>' + S.doc.n + ' slides, 1080 × ' + S.doc.H + '. ' + (moving ? 'Slides that move become 5-second videos; the rest are pictures.' : 'All slides are pictures.') + '</p>', close: closeSheet,
			acts: [{t: 'Save to my phone', fn: function () { go('save'); }}, {t: 'Add to my content plan', cls: 'btn butter', fn: planSheet}, {t: 'Keep editing', cls: 'linkbtn', fn: closeSheet}]});
	}
	function go(then, plan) {
		var ctl = {cancelled: false}, moving = S.mode === 'anim';
		var box = sheet({hand: 'one sec', title: 'Making your <em>slides</em>', html: '<p id="pgT">Slide 1…</p><div class="cr-prog"><i id="pgB"></i></div>' + (moving ? '<p class="cr-fine">Moving slides record at normal speed, 5 seconds each. Keep this page open on screen.</p>' : ''), acts: [{t: 'Cancel', cls: 'btn line', fn: function () { ctl.cancelled = true; }}]});
		S.busy = true;
		makeFiles(ctl, function (i, n, f, v) { var bar = box.querySelector('#pgB'), tx = box.querySelector('#pgT'); if (bar) bar.style.width = ((i + Math.min(1, f)) / n * 100).toFixed(1) + '%'; if (tx) tx.textContent = 'Slide ' + (i + 1) + ' of ' + n + (v ? ' (recording)' : ''); })
			.then(function (files) { S.busy = false; return then === 'save' ? saved(files) : upload(files, plan); }, function (e) {
				S.busy = false; var why = e && e.message;
				if (why === 'cancelled') { closeSheet(); return toast('Stopped. Nothing was saved.'); }
				sheet({hand: 'oh no', title: why === 'hidden' ? 'The recording <em>paused</em>' : why === 'novideo' ? 'This browser cannot make <em>videos</em>' : 'That did not <em>finish</em>', html: '<p>' + (why === 'hidden' ? 'The page went into the background. Keep it open on screen and try again.' : why === 'novideo' ? 'Switch to Pictures at the top to save pictures, or open this in Chrome or Safari.' : 'Your design is still here. Try again.') + '</p>', close: closeSheet, acts: [{t: 'Close', fn: closeSheet}]});
			});
	}
	function download(f) { var url = URL.createObjectURL(f.blob), a = document.createElement('a'); a.href = url; a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 60000); }
	// Browsers (Safari above all) keep only the last of several downloads fired at once, so save them one by one.
	function downloadAll(files, done) {
		files.forEach(function (f, i) { setTimeout(function () { download(f); if (i === files.length - 1 && done) done(); }, i * 900); });
	}
	function saved(files) {
		var urls = files.map(function (f) { return URL.createObjectURL(f.blob); }), list = files.map(function (f) { return new File([f.blob], f.name, {type: f.type}); });
		var canShare = false; try { canShare = !!(navigator.canShare && navigator.share && navigator.canShare({files: list})); } catch (e) {}
		var webm = files.some(function (f) { return f.container === 'webm'; });
		var html = '<div class="cr-out">' + files.map(function (f, i) { return f.kind === 'video' ? '<video src="' + urls[i] + '" muted loop autoplay playsinline></video>' : '<img src="' + urls[i] + '" alt="Slide ' + (i + 1) + '">'; }).map(function (m, i) { return '<button type="button" class="cr-one" data-i="' + i + '" title="Save slide ' + (i + 1) + '" style="all:unset;cursor:pointer;display:contents">' + m + '</button>'; }).join('') + '</div><p class="cr-fine">In Instagram, pick them in this order: 1 to ' + files.length + '. No watermark, nothing added. Tap a slide to save just that one.</p>' + (webm ? '<p class="cr-warn">This browser made WebM videos, which Instagram may refuse. Chrome or Safari on your phone make MP4.</p>' : '') + (S.caption ? '<label>Foxy’s caption</label><textarea id="capOut" rows="4">' + esc(S.caption + (S.tags.length ? '\n\n' + S.tags.join(' ') : '')) + '</textarea>' : '');
		var shut = function () { closeSheet(); urls.forEach(function (u) { URL.revokeObjectURL(u); }); };
		var acts = [];
		if (canShare) acts.push({t: 'Save or share all ' + files.length, fn: function () { navigator.share({files: list}).then(function () { toast('Done. Go post it!'); }, function (e) { if (e && e.name === 'AbortError') return; toast('Saving all ' + files.length + ' slides…'); downloadAll(files, function () { toast('Downloaded instead'); }); }); }});
		acts.push({t: canShare ? 'Download instead' : 'Download again', cls: 'btn line', fn: function () { toast('Saving all ' + files.length + ' slides…'); downloadAll(files, function () { toast('Saved to your downloads'); }); }});
		if (S.caption) acts.push({t: 'Copy caption', cls: 'btn line', fn: function () { var t = $('capOut').value; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { toast('Caption copied'); }, function () { $('capOut').select(); toast('Selected. Press copy.'); }); }});
		acts.push({t: 'Back to my design', cls: 'linkbtn', fn: shut});
		sheet({hand: 'ta-da', title: 'Your carousel is <em>ready</em>', html: html, close: shut, acts: acts});
		document.querySelectorAll('.cr-out .cr-one').forEach(function (b) { b.addEventListener('click', function () { var i = +b.getAttribute('data-i'); download(files[i]); toast('Saved slide ' + (i + 1)); }); });
		if (!canShare) downloadAll(files);
	}
	function planSheet() {
		var d = new Date(Date.now() + 86400000); d.setHours(19, 0, 0, 0);
		var local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
		var box = sheet({hand: 'plan it', title: 'Add to my <em>content plan</em>', html: '<label for="pAt">When</label><input type="datetime-local" id="pAt" value="' + local + '"><label for="pCap">Caption</label><textarea id="pCap" rows="5" placeholder="Write your caption, or ask Foxy to fill it in first">' + esc(S.caption + (S.tags.length ? '\n\n' + S.tags.join(' ') : '')) + '</textarea><label>Who posts it</label><div class="cr-row" id="pMode"><button type="button" class="cr-pill" data-v="self" aria-pressed="true">I’ll post it myself (you remind me)</button><button type="button" class="cr-pill" data-v="auto" aria-pressed="false">Post it for me</button></div><p class="cr-fine">“Post it for me” needs your posting permission. If it is not on yet, your dashboard shows the link to turn it on.</p>', close: closeSheet,
			acts: [{t: 'Make and add it', fn: function () { var at = box.querySelector('#pAt').value, m = box.querySelector('#pMode [aria-pressed="true"]').dataset.v; if (!at) return toast('Pick a date and time'); go('plan', {at: new Date(at).toISOString(), caption: box.querySelector('#pCap').value, mode: m}); }}, {t: 'Back', cls: 'btn line', fn: startExport}]});
		box.querySelectorAll('#pMode button').forEach(function (b) { b.onclick = function () { box.querySelectorAll('#pMode button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); }; });
	}
	function upOne(f) {
		var type = f.type.indexOf('video/mp4') === 0 ? 'video/mp4' : 'image/jpeg';
		if (f.container === 'webm') return Promise.reject(new Error('This browser made a WebM video, which Instagram does not take. Use Chrome or Safari, or switch to Pictures.'));
		return api('/me/upload-start', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({type: type, size: f.blob.size, name: f.name})}).then(function (s) {
			if (!s.ok) throw new Error(s.error || 'upload');
			var parts = [], n = Math.ceil(f.blob.size / s.part_size), chain = Promise.resolve();
			for (var i = 0; i < n; i++) (function (i) { chain = chain.then(function () { return tfetch(cc.api + '/me/upload-part?key=' + encodeURIComponent(s.key) + '&upload=' + encodeURIComponent(s.upload_id) + '&n=' + (i + 1), {method: 'PUT', headers: {Authorization: 'Bearer ' + token}, body: f.blob.slice(i * s.part_size, (i + 1) * s.part_size)}, 240000).then(function (r) { return r.json(); }).then(function (p) { if (!p.ok) throw new Error(p.error || 'part'); parts.push(p.part); }); }); })(i);
			return chain.then(function () { return api('/me/upload-finish?key=' + encodeURIComponent(s.key) + '&upload=' + encodeURIComponent(s.upload_id), {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({parts: parts})}); }).then(function (fin) { if (!fin.ok) throw new Error(fin.error || 'finish'); return {key: s.key, kind: s.kind, name: f.name, size: f.blob.size}; });
		});
	}
	function upload(files, plan) {
		var box = sheet({hand: 'sending', title: 'Adding it to your <em>plan</em>', html: '<p id="uT">Uploading slide 1 of ' + files.length + '…</p><div class="cr-prog"><i id="uB"></i></div>'});
		var media = [], seq = Promise.resolve();
		files.forEach(function (f, i) { seq = seq.then(function () { var t = box.querySelector('#uT'); if (t) t.textContent = 'Uploading slide ' + (i + 1) + ' of ' + files.length + '…'; return upOne(f).then(function (m) { media.push(m); var b = box.querySelector('#uB'); if (b) b.style.width = ((i + 1) / files.length * 100) + '%'; }); }); });
		seq.then(function () { return api('/me/post', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({at: plan.at, type: S.doc.story ? 'story' : 'carousel', caption: plan.caption, hook: S.tpl.name, media: media, mode: plan.mode})}); }).then(function (r) {
			if (!r.ok) throw new Error(r.error || 'The plan did not save.');
			sheet({hand: 'planned', title: 'It is in your <em>content plan</em>', html: '<p>' + files.length + ' slides for ' + new Date(plan.at).toLocaleString([], {weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit'}) + '. ' + (plan.mode === 'auto' ? 'It posts itself at that time if your posting permission is on.' : 'You will get a reminder to post it.') + '</p>', close: closeSheet, acts: [{t: 'Open my content plan', fn: function () { location.href = '../me/#' + token; }}, {t: 'Keep editing', cls: 'btn line', fn: closeSheet}]});
		}).catch(function (e) { sheet({hand: 'oh no', title: 'Not added <em>yet</em>', html: '<p>' + esc(e.message || 'The upload stopped.') + '</p><p class="cr-fine">Your design is still here. You can also save it to your phone and post it yourself.</p>', close: closeSheet, acts: [{t: 'Try again', fn: function () { go('plan', plan); }}, {t: 'Close', cls: 'btn line', fn: closeSheet}]}); });
	}

	// ---------- draft (doc in localStorage, photos in IndexedDB) ----------
	var dbP = null;
	function idb() { if (dbP) return dbP; dbP = new Promise(function (res, rej) { try { var r = indexedDB.open('cc-carousel', 1); r.onupgradeneeded = function () { r.result.createObjectStore('photos', {keyPath: 'id'}); }; r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; } catch (e) { rej(e); } }); return dbP; }
	function idbPut(list) { idb().then(function (db) { var tx = db.transaction('photos', 'readwrite'); list.forEach(function (p) { tx.objectStore('photos').put({id: p.id, blob: p.blob, at: Date.now()}); }); }).catch(function () {}); }
	function idbDrop(keepIds) { idb().then(function (db) { var tx = db.transaction('photos', 'readwrite'), st = tx.objectStore('photos'), q = st.openCursor(); q.onsuccess = function () { var c = q.result; if (c) { if (keepIds.indexOf(c.value.id) < 0 && !S.photos.some(function (p) { return p.id === c.value.id; })) c.delete(); c.continue(); } }; }).catch(function () {}); }
	function idbAll() { return idb().then(function (db) { return new Promise(function (res) { var out = [], r = db.transaction('photos').objectStore('photos').openCursor(); r.onsuccess = function () { var c = r.result; if (c) { out.push(c.value); c.continue(); } else res(out); }; r.onerror = function () { res([]); }; }); }).catch(function () { return []; }); }
	var saveT;
	function draftObj() { return {doc: S.doc, variant: S.variant, mode: S.mode, caption: S.caption, tags: S.tags, at: Date.now(), photos: S.photos.map(function (p) { return p.id; })}; }
	function saveDraft() { clearTimeout(saveT); saveT = setTimeout(function () { if (S.doc) store(DRAFT, JSON.stringify(draftObj())); }, 400); }
	window.addEventListener('pagehide', function () { clearTimeout(saveT); if (S.doc) store(DRAFT, JSON.stringify(draftObj())); }); // a quick close or reload still keeps the last move
	document.addEventListener('visibilitychange', function () { if (document.hidden && S.doc) { clearTimeout(saveT); store(DRAFT, JSON.stringify(draftObj())); } });
	function restoreDraft() {
		var raw = read(DRAFT), dr = null; try { dr = raw ? JSON.parse(raw) : null; } catch (e) { dr = null; }
		if (!dr || !dr.doc || !Array.isArray(dr.doc.layers) || !TP.list.some(function (t) { return t.id === dr.doc.tpl; })) { idbDrop([]); return; }
		idbAll().then(function (rows) {
			var keep = rows.filter(function (r) { return (dr.photos || []).indexOf(r.id) >= 0; });
			idbDrop(keep.map(function (r) { return r.id; })); // photos from older drafts do not pile up on her phone
			return Promise.all(keep.map(function (r) { return loadPhoto(r.blob).then(function (p) { if (p) p.id = r.id; return p; }); }));
		}).then(function (ps) {
			var have = {}; S.photos.forEach(function (p) { have[p.id] = 1; }); // she may have added photos while this was loading
			S.photos = S.photos.concat(ps.filter(function (p) { return p && !have[p.id]; })); S.draft = dr; renderDraftOffer(); if (S.doc && !$('edit').hidden) tray();
		});
	}
	function renderDraftOffer() {
		var dr = S.draft; if (!dr) return;
		var t = TP.list.filter(function (x) { return x.id === dr.doc.tpl; })[0];
		$('drafts').hidden = false;
		$('drafts').innerHTML = '<p class="hand">pick up where you left off</p><button type="button" class="btn line" id="resume">Continue “' + esc(t.name) + '”</button>';
		$('resume').onclick = function () { S.doc = JSON.parse(JSON.stringify(dr.doc)); S.tpl = t; S.variant = S.doc.variant || dr.variant; S.mode = dr.mode || 'still'; S.caption = dr.caption || ''; S.tags = dr.tags || []; S.undo = []; S.redo = []; S.sel = null; S.adjust = false; S.lastHit = null;
			var have = {}; S.photos.forEach(function (p) { have[p.id] = 1; });
			S.doc.layers.forEach(function (x) { if (x.src && x.src.indexOf('u:') === 0 && !have[x.src.slice(2)]) x.src = null; }); // a photo the phone no longer has becomes an empty spot, never a broken one
			S.doc.layers = S.doc.layers.filter(function (x) { return x.kind !== 'cut' || !!S.doc.layers.filter(function (p) { return p.id === x.of && p.src; })[0]; });
			$('pick').hidden = true; $('edit').hidden = false; hintShow(); $('tplName').textContent = t.name; document.querySelectorAll('[data-mode]').forEach(function (x) { x.setAttribute('aria-pressed', String(x.dataset.mode === S.mode)); });
			variants(); sizeButtons(); slidesNote(); layout(); tools(); tray(); dots(); undoBtns();
			E.preload(E.docAssets(S.doc).concat(cutKeys(S.doc))).then(function () { need = true; });
			// rebuild cut-outs of her own photos
			S.doc.layers.filter(function (l) { return l.kind === 'cut'; }).forEach(function (c) { var p = S.doc.layers.filter(function (x) { return x.id === c.of; })[0]; if (p && p.src && p.src.indexOf('u:') === 0) cutFor(p.src).then(function () { need = true; }, function () {}); });
		};
	}

	check();
})();
