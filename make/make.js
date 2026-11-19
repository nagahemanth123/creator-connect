/* Busy Fox Creator Connect — "Make a story": story templates and collages, made on her phone.
   Everything is drawn on a canvas in 1080-wide design units, so the preview, the small thumbnails and the exported
   file all come from the same drawing code. Photos and videos never leave the device: the only network call is one
   read of GET <api>/me to check her dashboard link (and to prefill her @handle).
   Export: photos only -> 1080-wide JPEG (PNG when there is no photo at all).
           with a video -> MP4 by MediaRecorder (H.264) when the browser can; else WebCodecs + mp4-muxer; else WebM, said honestly.
   Test switches: ?rec=mr|wc|webm forces one video path. */
(function () {
	'use strict';
	var cc = window.CC || {};
	var $ = function (id) { return document.getElementById(id); };
	var KEY = 'cc_me_token';
	var MUXER = 'https://cdn.jsdelivr.net/npm/mp4-muxer@5.2.2/build/mp4-muxer.min.js';
	var MAX_MEDIA = 10, MAX_SEC = 15, FPS = 30;
	var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
	var small = Math.min(screen.width, screen.height) < 700 || (navigator.deviceMemory && navigator.deviceMemory <= 4);
	var MAX_SIDE = small ? 1600 : 2048; // photos are scaled down to this on the way in
	function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]; }); }
	function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
	function read(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
	function store(k, v) { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch (e) {} }
	var toastT = null;
	function toast(t) { var el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { el.classList.remove('on'); }, 2400); }
	function note(t) { var el = $('note'); el.textContent = t || ''; el.classList.toggle('show', !!t); if (t) el.scrollIntoView({block: 'nearest', behavior: reduced ? 'auto' : 'smooth'}); }

	// ---------- the gate: her dashboard link, checked with the same read the dashboard makes ----------
	var token = (location.hash || '').replace(/^#/, '').trim();
	if (token) store(KEY, token); else token = read(KEY);
	var handle = '';
	function gate(hand, title, msg, acts) {
		$('tool').hidden = true; $('gate').hidden = false;
		$('gateHand').textContent = hand; $('gateTitle').innerHTML = title; $('gateMsg').textContent = msg;
		$('gateActs').innerHTML = ''; $('gateActs').hidden = !acts;
		(acts || []).forEach(function (a) {
			var b = document.createElement(a.href ? 'a' : 'button');
			b.className = 'btn ' + (a.cls || 'red'); b.textContent = a.t;
			if (a.href) b.href = a.href; else { b.type = 'button'; b.onclick = a.fn; }
			$('gateActs').appendChild(b);
		});
	}
	function check() {
		if (!token) return gate('hello', 'Open this from your <em>dashboard</em>', 'This little studio lives inside your Creator Connect dashboard. Open your dashboard link, then tap “Make a story”.');
		gate('one sec', 'Opening your <em>studio</em>', 'Getting your paper, tape and scissors ready.');
		fetch(cc.api + '/me', {headers: {Authorization: 'Bearer ' + token}, cache: 'no-store'}).then(function (r) { return r.json(); }).then(function (d) {
			if (!d || !d.ok) {
				if (d && d.error === 'not_found') store(KEY, '');
				return gate('hmm', 'Open this from your <em>dashboard</em>', 'This link is not valid any more. Open your Creator Connect dashboard again, or ask Busy Fox for a new link.');
			}
			var p = d.profile || {};
			handle = p.username ? '@' + p.username : '';
			if (p.first) $('hello').textContent = 'cut, stick, post, ' + p.first;
			open();
		}, function () {
			gate('no signal', 'Could not <em>check your link</em>', 'Check your internet and try again. Your photos are never sent anywhere, this is only to open the studio.', [{t: 'Try again', fn: check}]);
		});
	}

	// ---------- palettes ----------
	// bg ground · ink text on the ground · sub quieter text · acc accent · accInk text on the accent · soft tint · pen accent on white paper · sw the two colours of the swatch
	var PAL = {
		berry: {n: 'Strawberry', bg: '#F7E6E3', ink: '#2B1A17', sub: '#6E5551', acc: '#C42847', accInk: '#FFFFFF', soft: '#F2B8C6', pen: '#C42847', film: '#2B1A17', tape: ['#F2B8C6', '#FADDE4']},
		mocha: {n: 'Mocha', bg: '#3D2521', ink: '#FBEDE8', sub: '#D9BFB8', acc: '#F6E3A1', accInk: '#2B1A17', soft: '#5E3D36', pen: '#53332D', film: '#1B110F', tape: ['#F6E3A1', '#FBF0C9']},
		butter: {n: 'Butter', bg: '#F8EDC4', ink: '#2B1A17', sub: '#6B5A3A', acc: '#C42847', accInk: '#FFFFFF', soft: '#EBD27A', pen: '#C42847', film: '#2B1A17', tape: ['#F2B8C6', '#FADDE4']},
		sage: {n: 'Sage', bg: '#DFE8D8', ink: '#22301F', sub: '#55684F', acc: '#3F6B3A', accInk: '#FFFFFF', soft: '#B9CCAD', pen: '#3F6B3A', film: '#22301F', tape: ['#F6E3A1', '#FBF0C9']},
		sky: {n: 'Sky', bg: '#DCE8F3', ink: '#1B2A3D', sub: '#4C607A', acc: '#2F5D9B', accInk: '#FFFFFF', soft: '#B4CBE3', pen: '#2F5D9B', film: '#1B2A3D', tape: ['#F2B8C6', '#FADDE4']},
		night: {n: 'Night', bg: '#151212', ink: '#FFFFFF', sub: '#C9C2C0', acc: '#F2B8C6', accInk: '#2B1A17', soft: '#3A3231', pen: '#151212', film: '#000000', tape: ['#F2B8C6', '#FADDE4']},
		paper: {n: 'White', bg: '#FFFFFF', ink: '#151212', sub: '#6B6462', acc: '#C42847', accInk: '#FFFFFF', soft: '#EEE6E3', pen: '#C42847', film: '#151212', tape: ['#F2B8C6', '#FADDE4']},
		// for words set on top of a photo
		oWhite: {n: 'White', on: '#FFFFFF', acc: '#C42847', accInk: '#FFFFFF', sw: ['#FFFFFF', '#C42847']},
		oButter: {n: 'Butter', on: '#F6E3A1', acc: '#F6E3A1', accInk: '#2B1A17', sw: ['#F6E3A1', '#3D2521']},
		oPink: {n: 'Pink', on: '#FADDE4', acc: '#F2B8C6', accInk: '#2B1A17', sw: ['#FADDE4', '#3D2521']},
		oInk: {n: 'Dark words', on: '#2B1A17', acc: '#2B1A17', accInk: '#FFF9F7', light: true, sw: ['#2B1A17', '#FFF9F7']}
	};
	var FAM = {serif: '"Playfair Display", Georgia, serif', sans: '"DM Sans", "Noto Sans Telugu", system-ui, sans-serif', hand: '"Caveat", "Noto Sans Telugu", cursive'};
	var FIELD = {label: ['Small label', 40, 0], title: ['Title', 120, 1], caption: ['Caption', 160, 1], handle: ['Your handle', 40, 0]};

	// ---------- state ----------
	var S = {fmt: 'story', fam: 'story', tpl: {story: 'scrap', collage: 'two'}, theme: {}, text: {label: null, title: null, caption: null, handle: null}, media: [], sel: -1, playing: !reduced, sound: true, dirty: false, busy: false, pending: 0};
	var hits = [], texts = [], need = true, railT = null, uid = 0;

	// ---------- drawing kit ----------
	function rrPath(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.arcTo(x + w, y, x + w, y + r, r); c.lineTo(x + w, y + h - r); c.arcTo(x + w, y + h, x + w - r, y + h, r); c.lineTo(x + r, y + h); c.arcTo(x, y + h, x, y + h - r, r); c.lineTo(x, y + r); c.arcTo(x, y, x + r, y, r); c.closePath(); }
	function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
	function torn(c, w, h, seed, amp) { // a rectangle with ripped edges; the same seed always tears the same way
		var r = rng(seed), step = 30, j = function () { return (r() - .5) * 2 * amp; }, x, y;
		c.moveTo(j(), j());
		for (x = step; x < w; x += step) c.lineTo(x, j());
		c.lineTo(w + j(), j());
		for (y = step; y < h; y += step) c.lineTo(w + j(), y);
		c.lineTo(w + j(), h + j());
		for (x = w - step; x > 0; x -= step) c.lineTo(x, h + j());
		c.lineTo(j(), h + j());
		for (y = h - step; y > 0; y -= step) c.lineTo(j(), y);
		c.closePath();
	}
	function circlePath(c, w, h) { c.arc(w / 2, h / 2, Math.min(w, h) / 2, 0, Math.PI * 2); }
	function archPath(c, w, h) { c.moveTo(0, h); c.lineTo(0, w / 2); c.arc(w / 2, w / 2, w / 2, Math.PI, 0); c.lineTo(w, h); c.closePath(); }
	function spec(q, size) { return (q.italic ? 'italic ' : '') + (q.weight || 400) + ' ' + Math.round(size * 100) / 100 + 'px ' + FAM[q.font || 'sans']; }
	function mw(c, s, tr) { return c.measureText(s).width + (tr ? tr * Math.max(0, Array.from(s).length - 1) : 0); }
	function wrap(c, s, w, tr) {
		var out = [];
		s.split('\n').forEach(function (par) {
			var words = par.split(/\s+/).filter(Boolean), line = '';
			if (!words.length) return out.push('');
			words.forEach(function (wd) {
				var t = line ? line + ' ' + wd : wd;
				if (mw(c, t, tr) <= w) { line = t; return; }
				if (line) out.push(line);
				if (mw(c, wd, tr) <= w) { line = wd; return; }
				var cur = ''; // one very long word: break it by letters
				Array.from(wd).forEach(function (ch) { if (cur && mw(c, cur + ch, tr) > w) { out.push(cur); cur = ch; } else cur += ch; });
				line = cur;
			});
			out.push(line);
		});
		return out;
	}
	function ready(m) { return m && (m.kind === 'image' || m.src.readyState >= 2); }
	function view(m, w, h) { // which part of the photo shows in a w×h spot (cover fit, her zoom and position)
		var sc = Math.max(w / m.w, h / m.h) * m.zoom, vw = Math.min(1, w / sc / m.w), vh = Math.min(1, h / sc / m.h);
		var cx = clamp(m.cx, vw / 2, 1 - vw / 2), cy = clamp(m.cy, vh / 2, 1 - vh / 2);
		return {sc: sc, vw: vw, vh: vh, cx: cx, cy: cy, sx: (cx - vw / 2) * m.w, sy: (cy - vh / 2) * m.h, sw: vw * m.w, sh: vh * m.h};
	}
	function placeholder(c, w, h, mode, q, m) { // an empty spot: clearly a stand-in, never mistaken for a design
		c.fillStyle = q.dark ? '#7A625D' : '#EBD9D4';
		c.fillRect(0, 0, w, h);
		if (mode === 'export') return;
		var ink = q.dark ? 'rgba(255,249,247,.82)' : 'rgba(110,85,81,.8)', full = mode === 'preview';
		c.strokeStyle = ink; c.fillStyle = ink; c.lineJoin = 'round'; c.lineCap = 'round';
		if (full && !q.path) { c.setLineDash([20, 16]); c.lineWidth = 4; c.strokeRect(24, 24, w - 48, h - 48); c.setLineDash([]); }
		var words = full && Math.min(w, h) > 260, s = clamp(Math.min(w, h) * (full ? .22 : .34), 44, 170), cx = w / 2, cy = h / 2 - (words ? s * .3 : 0);
		c.lineWidth = Math.max(4, s * .06);
		c.beginPath(); rrPath(c, cx - s / 2, cy - s * .4, s, s * .8, s * .1); c.stroke();
		c.beginPath(); c.arc(cx - s * .22, cy - s * .16, s * .08, 0, Math.PI * 2); c.fill();
		c.beginPath(); c.moveTo(cx - s * .4, cy + s * .28); c.lineTo(cx - s * .1, cy - s * .02); c.lineTo(cx + s * .08, cy + s * .16); c.lineTo(cx + s * .22, cy + s * .04); c.lineTo(cx + s * .4, cy + s * .28); c.stroke();
		if (words) {
			var fs = clamp(w * .085, 40, 72);
			c.font = '600 ' + fs + 'px ' + FAM.hand; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
			c.fillText(m ? 'loading…' : 'your photo or video', cx, cy + s * .4 + fs * 1.15, w - 60);
			c.textAlign = 'left';
		}
	}
	function textOf(tpl, key) {
		var v = S.text[key];
		if (v != null) return v;
		if (key === 'handle') return handle || '@yourhandle';
		return (tpl.def && tpl.def[key]) || '';
	}

	function painter(c, W, H, fmt, tpl, o) {
		var st = fmt === 'story', T = PAL[tpl.themes[S.theme[tpl.id] || 0]];
		var g = {c: c, W: W, H: H, st: st, T: T, top: st ? 220 : 70, bot: H - (st ? 250 : 70)};
		g.str = function (key) { return textOf(tpl, key); };
		g.bg = function (col) { c.fillStyle = col; c.fillRect(0, 0, W, H); };
		g.box = function (x, y, w, h, col, r) { c.fillStyle = col; c.beginPath(); if (r) rrPath(c, x, y, w, h, r); else c.rect(x, y, w, h); c.fill(); };
		g.slot = function (i, x, y, w, h, q) {
			q = q || {};
			var rot = (q.rot || 0) * Math.PI / 180, m = S.media[i];
			c.save();
			c.translate(x + w / 2, y + h / 2); c.rotate(rot); c.translate(-w / 2, -h / 2);
			c.save();
			c.beginPath();
			if (q.path) q.path(c, w, h); else if (q.r) rrPath(c, 0, 0, w, h, q.r); else c.rect(0, 0, w, h);
			c.clip();
			var drawn = false;
			if (ready(m)) { var v = view(m, w, h); try { c.drawImage(m.src, v.sx, v.sy, v.sw, v.sh, 0, 0, w, h); drawn = true; } catch (e) {} }
			if (!drawn) placeholder(c, w, h, o.mode, q, m);
			c.restore();
			if (o.mode === 'preview' && m && m.kind === 'video' && Math.min(w, h) > 150) { // a small mark so she can tell a clip from a photo (never in the export)
				c.fillStyle = 'rgba(43,26,23,.72)'; c.beginPath(); c.arc(50, 50, 30, 0, Math.PI * 2); c.fill();
				c.fillStyle = '#FFF9F7'; c.beginPath(); c.moveTo(41, 35); c.lineTo(66, 50); c.lineTo(41, 65); c.closePath(); c.fill();
			}
			c.restore();
			if (o.hits) o.hits.push({i: i, x: x, y: y, w: w, h: h, rot: rot});
		};
		g.fit = function (key, w, h, q) { // the size and line breaks at which the words fit their box: shrink first, then cut with an ellipsis
			var s = g.str(key).replace(/\s+$/, '');
			if (q.upper) s = s.toUpperCase();
			if (!s.trim()) return null;
			var size = q.size, min = q.min || Math.max(22, size * .4), lhK = q.lh || 1.18, max = q.max || 50, lines, tr, fitN;
			for (;;) {
				c.font = spec(q, size);
				tr = q.track && !/[^\u0000-ɏ‐-‧]/.test(s) ? q.track * size : 0; // letter-spacing would break joined scripts such as Telugu
				lines = wrap(c, s, w, tr);
				fitN = Math.max(1, Math.min(max, Math.floor((h + 2) / (size * lhK))));
				if (lines.length <= fitN) break;
				if (size <= min) {
					lines = lines.slice(0, fitN);
					var l = lines[fitN - 1];
					while (l.length > 1 && mw(c, l + '…', tr) > w) l = l.slice(0, -1);
					lines[fitN - 1] = l.replace(/\s+$/, '') + '…';
					break;
				}
				size = Math.max(min, size * .93);
			}
			var wmax = 0;
			lines.forEach(function (ln) { wmax = Math.max(wmax, mw(c, ln, tr)); });
			if (o.fonts) o.fonts[spec(q, 40)] = (o.fonts[spec(q, 40)] || '') + s;
			return {lines: lines, size: size, lh: size * lhK, wmax: wmax, tr: tr};
		};
		g.text = function (key, x, y, w, h, q) {
			if (o.texts) o.texts.push({key: key, x: x, y: y, w: w, h: h});
			var f = g.fit(key, w, h, q);
			if (!f) return null;
			c.save();
			if (q.rot) { c.translate(x + w / 2, y + h / 2); c.rotate(q.rot * Math.PI / 180); c.translate(-(x + w / 2), -(y + h / 2)); }
			c.font = spec(q, f.size); c.fillStyle = q.color; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
			if (q.shadow) { c.shadowColor = 'rgba(0,0,0,.42)'; c.shadowBlur = 22; c.shadowOffsetY = 3; }
			var th = f.lines.length * f.lh, y0 = q.va === 'middle' ? y + (h - th) / 2 : q.va === 'bottom' ? y + h - th : y;
			f.lines.forEach(function (ln, n) {
				var lw = mw(c, ln, f.tr), lx = q.align === 'center' ? x + (w - lw) / 2 : q.align === 'right' ? x + w - lw : x, by = y0 + n * f.lh + (f.lh - f.size) / 2 + f.size * .8;
				if (!f.tr) return c.fillText(ln, lx, by);
				Array.from(ln).forEach(function (ch) { c.fillText(ch, lx, by); lx += c.measureText(ch).width + f.tr; });
			});
			c.restore();
			return {y: y0, h: th, w: f.wmax, size: f.size};
		};
		g.tape = function (cx, cy, w, h, deg, cols) {
			cols = cols || T.tape || PAL.berry.tape;
			c.save();
			c.translate(cx, cy); c.rotate(deg * Math.PI / 180); c.globalAlpha = .9;
			c.beginPath(); c.moveTo(-w / 2 + 6, -h / 2); c.lineTo(w / 2 - 4, -h / 2); c.lineTo(w / 2, -h / 4); c.lineTo(w / 2 - 6, 0); c.lineTo(w / 2, h / 4); c.lineTo(w / 2 - 3, h / 2); c.lineTo(-w / 2 + 4, h / 2); c.lineTo(-w / 2, h / 4); c.lineTo(-w / 2 + 6, 0); c.lineTo(-w / 2, -h / 4); c.closePath(); c.clip();
			c.fillStyle = cols[1]; c.fillRect(-w / 2, -h / 2, w, h);
			c.fillStyle = cols[0];
			for (var x = -w / 2 - h; x < w / 2 + h; x += 26) { c.beginPath(); c.moveTo(x, h / 2); c.lineTo(x + 13, h / 2); c.lineTo(x + 13 + h * .7, -h / 2); c.lineTo(x + h * .7, -h / 2); c.closePath(); c.fill(); }
			c.restore();
		};
		g.gingham = function (x, y, w, h, col, cell) {
			cell = cell || 44;
			c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); c.globalAlpha = .34; c.fillStyle = col;
			for (var gx = x; gx < x + w; gx += cell * 2) c.fillRect(gx, y, cell, h);
			for (var gy = y; gy < y + h; gy += cell * 2) c.fillRect(x, gy, w, cell);
			c.restore();
		};
		g.polaroid = function (i, cx, cy, w, deg, q) {
			q = q || {};
			var pad = w * .055, pw = w - 2 * pad, ph = pw * (q.ratio || 1), strip = w * (q.strip || .19), h = pad + ph + strip, r = deg * Math.PI / 180;
			c.save(); c.translate(cx, cy); c.rotate(r); c.shadowColor = 'rgba(43,26,23,.3)'; c.shadowBlur = w * .06; c.shadowOffsetY = w * .022; c.fillStyle = '#FFFDFB'; c.fillRect(-w / 2, -h / 2, w, h); c.restore();
			var dy = -h / 2 + pad + ph / 2;
			g.slot(i, cx - Math.sin(r) * dy - pw / 2, cy + Math.cos(r) * dy - ph / 2, pw, ph, {rot: deg});
			if (q.key) {
				var ty = h / 2 - strip / 2 - pad * .1;
				g.text(q.key, cx - Math.sin(r) * ty - pw / 2, cy + Math.cos(r) * ty - strip * .36, pw, strip * .72, {font: 'hand', weight: 600, size: strip * .5, align: 'center', va: 'middle', color: q.color || '#2B1A17', rot: deg, max: 1, lh: 1.1});
			}
			return {top: cy - h / 2, bottom: cy + h / 2, h: h};
		};
		g.tag = function (cx, cy) { // a small paper tag on a collage, only when she has written something
			var q = {font: 'hand', weight: 700, size: 76, align: 'center', va: 'middle', color: '#2B1A17', max: 1, lh: 1.1, rot: -2};
			if (o.texts) o.texts.push({key: 'title', x: cx - 350, y: cy - 60, w: 700, h: 120});
			var f = g.fit('title', 700, 100, q);
			if (!f) return;
			var w = f.wmax + 96, h = f.lh + 44;
			c.save(); c.translate(cx, cy); c.rotate(-2 * Math.PI / 180); c.shadowColor = 'rgba(43,26,23,.3)'; c.shadowBlur = 26; c.shadowOffsetY = 8; c.fillStyle = '#FFFDFB'; c.fillRect(-w / 2, -h / 2, w, h); c.restore();
			var keep = o.texts; o.texts = null;
			g.text('title', cx - 350, cy - 50, 700, 100, q);
			o.texts = keep;
		};
		g.scrim = function (y0, y1, a0, a1) {
			var rgb = T.light ? '255,249,247' : '24,14,12', gr = c.createLinearGradient(0, y0, 0, y1);
			gr.addColorStop(0, 'rgba(' + rgb + ',' + a0 + ')'); gr.addColorStop(1, 'rgba(' + rgb + ',' + a1 + ')');
			c.fillStyle = gr; c.fillRect(0, Math.min(y0, y1), W, Math.abs(y1 - y0));
		};
		return g;
	}

	// ---------- the designs ----------
	function rows(g, n, tagAt) { // n photos stacked (story) or side by side (post); three stay stacked on a post, as three columns would be slivers
		var m = 28, gap = 20, W = g.W, H = g.H, i;
		g.bg(g.T.bg);
		if (g.st || n === 3) { var h = (H - 2 * m - gap * (n - 1)) / n; for (i = 0; i < n; i++) g.slot(i, m, m + i * (h + gap), W - 2 * m, h, {r: 18}); g.tag(W / 2, tagAt === 'mid' ? H / 2 : m + h + gap / 2); }
		else { var w = (W - 2 * m - gap * (n - 1)) / n; for (i = 0; i < n; i++) g.slot(i, m + i * (w + gap), m, w, H - 2 * m, {r: 18}); g.tag(W / 2, H / 2); }
	}
	var CT = ['paper', 'berry', 'mocha', 'night', 'sage'];
	var TPL = [
		{id: 'scrap', fam: 'story', name: 'Polaroid', n: 1, fields: ['label', 'title', 'caption', 'handle'], themes: ['berry', 'butter', 'sage', 'sky', 'mocha'],
			def: {label: 'today, lately', title: 'A slow Sunday', caption: 'Coffee first, everything else later'},
			draw: function (g) {
				var st = g.st, T = g.T;
				g.bg(T.bg); g.gingham(0, st ? 560 : 270, 1080, st ? 572 : 396, T.soft);
				var p = g.polaroid(0, 540, st ? 770 : 440, st ? 800 : 600, -3, {strip: .2, key: 'label', color: T.pen});
				g.tape(540, p.top + 8, st ? 230 : 180, st ? 58 : 46, -6);
				g.text('title', 90, st ? 1300 : 820, 900, st ? 210 : 150, {font: 'serif', weight: 600, size: st ? 104 : 80, lh: 1.06, align: 'center', va: 'middle', color: T.ink, max: 2});
				g.text('caption', 130, st ? 1522 : 978, 820, st ? 110 : 92, {font: 'sans', weight: 500, size: st ? 40 : 34, lh: 1.3, align: 'center', color: T.sub, max: 2});
				g.text('handle', 90, st ? 1640 : 1150, 900, 50, {font: 'sans', weight: 700, size: 30, track: .1, align: 'center', color: T.acc, max: 1});
			}},
		{id: 'bold', fam: 'story', name: 'Big title', n: 1, fields: ['label', 'title', 'caption', 'handle'], themes: ['oWhite', 'oButter', 'oPink', 'oInk'],
			def: {label: 'New reel', title: 'Three cafés you need to try', caption: 'Saved you the scrolling. Full list inside.'},
			draw: function (g) {
				var st = g.st, T = g.T, W = g.W, H = g.H, sh = !T.light;
				g.bg('#3D2521'); g.slot(0, 0, 0, W, H, {dark: true});
				g.scrim(H * .42, H, 0, T.light ? .86 : .76); g.scrim(0, st ? 420 : 240, T.light ? .5 : .4, 0);
				var lq = {font: 'sans', weight: 700, size: 30, track: .14, upper: true, max: 1, va: 'middle', color: T.accInk}, f = g.fit('label', 620, 60, lq);
				if (f) g.box(70, g.top, f.wmax + 56, 64, T.acc, 32);
				g.text('label', 98, g.top + 2, 620, 60, lq);
				g.text('handle', W - 70 - 400, g.top + 8, 400, 50, {font: 'sans', weight: 700, size: 30, align: 'right', color: T.on, shadow: sh, max: 1});
				g.text('title', 70, g.bot - 150 - (st ? 520 : 420), 940, st ? 520 : 420, {font: 'sans', weight: 800, size: st ? 150 : 124, lh: .98, upper: true, va: 'bottom', color: T.on, shadow: sh, max: 4});
				g.text('caption', 70, g.bot - 122, 940, 112, {font: 'sans', weight: 500, size: 40, lh: 1.3, color: T.on, shadow: sh, max: 2});
			}},
		{id: 'cover', fam: 'story', name: 'Magazine', n: 1, fields: ['title', 'label', 'caption'], themes: ['oWhite', 'oButter', 'oPink', 'oInk'],
			def: {title: 'Sunday', label: 'Issue 01 · the slow edit', caption: 'Long walks, filter coffee and one brand new reel'},
			draw: function (g) {
				var st = g.st, T = g.T, W = g.W, H = g.H, sh = !T.light, y = st ? 200 : 44;
				g.bg('#3D2521'); g.slot(0, 0, 0, W, H, {dark: true});
				g.scrim(0, y + 420, T.light ? .7 : .5, 0); g.scrim(H * .55, H, 0, T.light ? .82 : .7);
				g.text('title', 50, y, 980, 236, {font: 'serif', weight: 800, size: 216, lh: 1.05, upper: true, align: 'center', va: 'middle', color: T.on, shadow: sh, max: 1, min: 80});
				g.box(90, y + 244, 900, 4, T.on);
				g.text('label', 90, y + 262, 900, 44, {font: 'sans', weight: 600, size: 28, track: .2, upper: true, align: 'center', color: T.on, shadow: sh, max: 1});
				var q = {font: 'serif', italic: true, weight: 600, size: st ? 88 : 76, lh: 1.1, color: T.on, shadow: sh, max: 4}, f = g.fit('caption', 780, st ? 420 : 340, q);
				if (f) { var th = f.lines.length * f.lh; g.box(70, g.bot - th - 36, 110, 10, T.acc); }
				g.text('caption', 70, g.bot - (st ? 420 : 340), 780, st ? 420 : 340, Object.assign({va: 'bottom'}, q));
			}},
		{id: 'film', fam: 'story', name: 'Film strip', n: 3, fields: ['label', 'title', 'caption'], themes: ['mocha', 'berry', 'butter', 'night'],
			def: {label: 'Roll 01', title: 'behind the scenes', caption: 'Three frames from today’s shoot'},
			draw: function (g) {
				var st = g.st, T = g.T, fw = 560, fx = 260, fh = st ? 380 : 290, gap = 22, y0 = st ? 150 : 36, sx = fx - 72, sw = fw + 144, yE = y0 + 3 * (fh + gap) + (st ? 30 : 16), y, i;
				g.bg(T.bg); g.box(sx, -10, sw, yE + 10, T.film);
				for (y = 16; y < yE - 56; y += 74) { g.box(sx + 17, y, 38, 48, T.bg, 9); g.box(sx + sw - 55, y, 38, 48, T.bg, 9); }
				for (i = 0; i < 3; i++) g.slot(i, fx, y0 + i * (fh + gap), fw, fh, {r: 8});
				g.text('label', 90, yE + (st ? 36 : 24), 900, 40, {font: 'sans', weight: 700, size: 26, track: .24, upper: true, align: 'center', color: T.acc, max: 1});
				g.text('title', 90, yE + (st ? 80 : 60), 900, st ? 130 : 112, {font: 'hand', weight: 700, size: st ? 124 : 104, lh: 1, align: 'center', va: 'middle', color: T.ink, max: 1});
				g.text('caption', 130, yE + (st ? 214 : 176), 820, st ? 60 : 96, {font: 'sans', weight: 500, size: 36, lh: 1.3, align: 'center', color: T.sub, max: st ? 1 : 2});
			}},
		{id: 'newpost', fam: 'story', name: 'New post', n: 1, fields: ['label', 'title', 'caption', 'handle'], themes: ['berry', 'butter', 'sky', 'mocha', 'night'],
			def: {label: 'New post', title: 'It’s up!', caption: 'Go on, tap it. I’ll wait.'},
			draw: function (g) {
				var st = g.st, T = g.T, c = g.c, k = st ? 1 : .74, cw = 760 * k, x = (1080 - cw) / 2, y = st ? 350 : 150, hd = 104 * k, ph = cw * 1.12, ft = 96 * k, h = hd + ph + ft, ink = '#2B1A17';
				g.bg(T.bg);
				c.save(); c.shadowColor = 'rgba(43,26,23,.3)'; c.shadowBlur = 50; c.shadowOffsetY = 20; g.box(x, y, cw, h, '#FFFDFB', 34 * k); c.restore();
				c.fillStyle = T.soft; c.beginPath(); c.arc(x + 62 * k, y + hd / 2, 28 * k, 0, Math.PI * 2); c.fill();
				g.text('handle', x + 108 * k, y + hd / 2 - 26 * k, cw - 210 * k, 52 * k, {font: 'sans', weight: 700, size: 32 * k, va: 'middle', color: ink, max: 1});
				c.fillStyle = ink; [0, 1, 2].forEach(function (n) { c.beginPath(); c.arc(x + cw - 40 * k - n * 16 * k, y + hd / 2, 4.500 * k, 0, Math.PI * 2); c.fill(); });
				g.slot(0, x, y + hd, cw, ph);
				var iy = y + hd + ph + ft / 2, ix = x + 56 * k, s = 22 * k; // heart, speech bubble, paper plane
				c.strokeStyle = ink; c.lineWidth = 5 * k; c.lineJoin = 'round'; c.lineCap = 'round';
				c.beginPath(); c.moveTo(ix, iy + s * .9); c.bezierCurveTo(ix - s * 1.7, iy - s * .2, ix - s * .7, iy - s * 1.3, ix, iy - s * .45); c.bezierCurveTo(ix + s * .7, iy - s * 1.3, ix + s * 1.7, iy - s * .2, ix, iy + s * .9); c.stroke();
				ix += 86 * k; c.beginPath(); c.arc(ix, iy, s * .95, Math.PI * .65, Math.PI * 2.450); c.lineTo(ix - s * 1.050, iy + s * 1.050); c.closePath(); c.stroke();
				ix += 86 * k; c.beginPath(); c.moveTo(ix - s, iy - s * .8); c.lineTo(ix + s * 1.1, iy - s * .8); c.lineTo(ix - s * .1, iy + s); c.lineTo(ix - s * .2, iy - s * .1); c.closePath(); c.stroke();
				var lq = {font: 'sans', weight: 800, size: 46 * k + 8, track: .1, upper: true, max: 1, va: 'middle', align: 'center', color: T.accInk, rot: 5}, f = g.fit('label', 520, 80, lq);
				if (f) { var bw = f.wmax + 76, bx = x + cw - bw / 2 + 26 * k, by = y - 40 * k; c.save(); c.translate(bx, by); c.rotate(5 * Math.PI / 180); c.shadowColor = 'rgba(43,26,23,.25)'; c.shadowBlur = 18; c.shadowOffsetY = 6; g.box(-bw / 2, -46, bw, 92, T.acc, 46); c.restore(); g.text('label', bx - 260, by - 40, 520, 80, lq); }
				g.text('title', 90, y + h + (st ? 50 : 34), 900, st ? 150 : 124, {font: 'serif', italic: true, weight: 600, size: st ? 104 : 84, lh: 1.08, align: 'center', va: 'middle', color: T.ink, max: 2});
				g.text('caption', 130, y + h + (st ? 206 : 164), 820, st ? 58 : 100, {font: 'sans', weight: 500, size: 38, lh: 1.3, align: 'center', color: T.sub, max: st ? 1 : 2});
			}},
		{id: 'quote', fam: 'story', name: 'Quote', n: 1, fields: ['title', 'caption', 'handle'], themes: ['butter', 'berry', 'sage', 'mocha', 'night'],
			def: {title: 'Post the thing. Nobody is watching as closely as you think.', caption: 'Note to self'},
			draw: function (g) {
				var st = g.st, T = g.T, c = g.c, y = st ? 330 : 96, q = {font: 'serif', weight: 800, size: 440};
				g.bg(T.bg);
				c.font = spec(q, 440); c.fillStyle = T.soft; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillText('“', 84, y + 350);
				g.text('title', 110, st ? 560 : 290, 860, st ? 720 : 540, {font: 'serif', italic: true, weight: 400, size: st ? 100 : 88, lh: 1.2, va: 'middle', color: T.ink, max: 10});
				var py = st ? 1390 : 930;
				g.box(110, py - 62, 120, 8, T.acc);
				g.slot(0, 110, py, 200, 200, {path: circlePath});
				c.strokeStyle = T.acc; c.lineWidth = 6; c.beginPath(); c.arc(210, py + 100, 110, 0, Math.PI * 2); c.stroke();
				g.text('caption', 350, py + 36, 620, 64, {font: 'sans', weight: 700, size: 38, va: 'middle', color: T.ink, max: 1});
				g.text('handle', 350, py + 104, 620, 50, {font: 'sans', weight: 500, size: 30, va: 'middle', color: T.sub, max: 1});
			}},
		{id: 'date', fam: 'story', name: 'Save the date', n: 1, fields: ['label', 'title', 'caption', 'handle'], themes: ['sage', 'berry', 'butter', 'sky', 'mocha'],
			def: {label: 'Save the date', title: '24 Nov', caption: '3 days to go. Something lovely is coming.'},
			draw: function (g) {
				var st = g.st, T = g.T, c = g.c, aw = st ? 800 : 560, ax = (1080 - aw) / 2, ay = st ? 250 : 64, ah = st ? 840 : 556, b = ay + ah;
				g.bg(T.bg);
				c.save(); c.translate(ax - 20, ay - 20); c.strokeStyle = T.acc; c.lineWidth = 4; c.beginPath(); archPath(c, aw + 40, ah + 40); c.stroke(); c.restore();
				g.slot(0, ax, ay, aw, ah, {path: archPath});
				g.text('label', 90, b + (st ? 66 : 50), 900, 44, {font: 'sans', weight: 700, size: 30, track: .22, upper: true, align: 'center', color: T.acc, max: 1});
				g.text('title', 90, b + (st ? 116 : 96), 900, st ? 226 : 186, {font: 'serif', weight: 600, size: st ? 196 : 160, lh: 1.05, align: 'center', va: 'middle', color: T.ink, max: 1});
				g.text('caption', 130, b + (st ? 352 : 290), 820, st ? 110 : 96, {font: 'sans', weight: 500, size: st ? 40 : 34, lh: 1.3, align: 'center', color: T.sub, max: 2});
				g.text('handle', 90, st ? 1612 : 1230, 900, 50, {font: 'sans', weight: 700, size: 30, track: .1, align: 'center', color: T.acc, max: 1});
			}},
		{id: 'frame', fam: 'story', name: 'Quiet frame', n: 1, fields: ['title', 'label', 'handle'], themes: ['paper', 'berry', 'butter', 'sage', 'night'],
			def: {title: 'Golden hour, again', label: 'No. 01 · November'},
			draw: function (g) {
				var st = g.st, T = g.T, c = g.c, fw = st ? 840 : 720, fx = (1080 - fw) / 2, fy = st ? 300 : 84, fh = fw * 1.25, b = fy + fh;
				g.bg(T.bg);
				c.strokeStyle = T.ink; c.lineWidth = 3; c.strokeRect(fx - 28, fy - 28, fw + 56, fh + 56);
				g.slot(0, fx, fy, fw, fh);
				g.text('title', 110, b + (st ? 76 : 56), 860, st ? 92 : 82, {font: 'serif', italic: true, weight: 400, size: st ? 70 : 58, align: 'center', va: 'middle', color: T.ink, max: 1});
				g.text('label', 110, b + (st ? 176 : 142), 860, 40, {font: 'sans', weight: 600, size: 26, track: .24, upper: true, align: 'center', color: T.sub, max: 1});
				g.text('handle', 110, b + (st ? 236 : 196), 860, 44, {font: 'sans', weight: 700, size: 28, track: .1, align: 'center', color: T.acc, max: 1});
			}},

		{id: 'two', fam: 'collage', name: '2 up', n: 2, fields: ['title'], themes: CT, def: {}, draw: function (g) { rows(g, 2, 'mid'); }},
		{id: 'three', fam: 'collage', name: '3 up', n: 3, fields: ['title'], themes: CT, def: {}, draw: function (g) { rows(g, 3); }},
		{id: 'grid4', fam: 'collage', name: '4 grid', n: 4, fields: ['title'], themes: CT, def: {},
			draw: function (g) {
				var m = 28, gap = 20, w = (g.W - 2 * m - gap) / 2, h = (g.H - 2 * m - gap) / 2;
				g.bg(g.T.bg);
				for (var i = 0; i < 4; i++) g.slot(i, m + (i % 2) * (w + gap), m + (i > 1 ? 1 : 0) * (h + gap), w, h, {r: 18});
				g.tag(g.W / 2, g.H / 2);
			}},
		{id: 'bigtwo', fam: 'collage', name: '1 big, 2 small', n: 3, fields: ['title'], themes: CT, def: {},
			draw: function (g) {
				var m = 28, gap = 20, W = g.W, H = g.H, bh = (H - 2 * m - gap) * .62, sh = H - 2 * m - gap - bh, w = (W - 2 * m - gap) / 2;
				g.bg(g.T.bg);
				g.slot(0, m, m, W - 2 * m, bh, {r: 18}); g.slot(1, m, m + bh + gap, w, sh, {r: 18}); g.slot(2, m + w + gap, m + bh + gap, w, sh, {r: 18});
				g.tag(W / 2, m + bh + gap / 2);
			}},
		{id: 'torn', fam: 'collage', name: 'Torn paper', n: 3, fields: ['title', 'caption'], themes: ['berry', 'butter', 'sage', 'sky', 'mocha'],
			def: {title: 'little moments', caption: 'keep these ones'},
			draw: function (g) {
				var st = g.st, T = g.T, c = g.c, pad = 20;
				var P = st ? [[60, 370, 700, 510, -3], [340, 830, 680, 490, 3.500], [70, 1250, 620, 430, -2]] : [[40, 190, 600, 420, -3], [450, 460, 590, 410, 3.500], [60, 860, 560, 420, -2]];
				g.bg(T.bg);
				g.text('title', 90, st ? 190 : 30, 900, st ? 124 : 110, {font: 'hand', weight: 700, size: st ? 120 : 100, lh: 1, align: 'center', va: 'middle', color: T.acc, max: 1});
				P.forEach(function (p, i) {
					c.save(); c.translate(p[0] + p[2] / 2, p[1] + p[3] / 2); c.rotate(p[4] * Math.PI / 180); c.translate(-p[2] / 2 - pad, -p[3] / 2 - pad);
					c.shadowColor = 'rgba(43,26,23,.3)'; c.shadowBlur = 36; c.shadowOffsetY = 12; c.fillStyle = '#FFFDFB'; c.beginPath(); torn(c, p[2] + 2 * pad, p[3] + 2 * pad, i * 7 + 3, 9); c.fill(); c.restore();
					g.slot(i, p[0], p[1], p[2], p[3], {rot: p[4], path: function (cx, w, h) { torn(cx, w, h, i * 13 + 5, 6); }});
				});
				g.tape(P[0][0] + 110, P[0][1] - 2, 190, 52, -24); g.tape(P[1][0] + P[1][2] - 80, P[1][1] + 6, 180, 50, 30); g.tape(P[2][0] + 90, P[2][1] + P[2][3] + 4, 180, 50, 14);
				g.text('caption', st ? 716 : 650, st ? 1380 : 960, st ? 310 : 380, st ? 240 : 220, {font: 'hand', weight: 600, size: 70, lh: 1.02, align: 'center', va: 'middle', color: T.ink, max: 3, rot: 4});
			}},
		{id: 'pile', fam: 'collage', name: 'Polaroid pile', n: 4, fields: ['title', 'handle'], themes: ['butter', 'berry', 'sage', 'sky', 'mocha'],
			def: {title: 'this week, in four'},
			draw: function (g) {
				var st = g.st, T = g.T;
				var P = st ? [[320, 620, 510, -7], [750, 780, 490, 5], [340, 1150, 490, 4], [740, 1340, 510, -5]] : [[290, 420, 420, -7], [770, 450, 410, 5], [320, 900, 410, 4], [770, 950, 420, -5]];
				g.bg(T.bg);
				g.text('title', 90, st ? 176 : 26, 900, st ? 124 : 112, {font: 'hand', weight: 700, size: st ? 118 : 100, lh: 1, align: 'center', va: 'middle', color: T.acc, max: 1});
				P.forEach(function (p, i) { var r = g.polaroid(i, p[0], p[1], p[2], p[3], {strip: .17}); if (i === 0 || i === 3) g.tape(p[0] + (i ? 30 : -20), r.top + 10, 170, 48, i ? 8 : -12); });
				g.text('handle', 90, st ? 1650 : 1262, 900, 50, {font: 'sans', weight: 700, size: 30, track: .1, align: 'center', color: T.acc, max: 1});
			}}
	];
	function cur() { var id = S.tpl[S.fam]; return TPL.filter(function (t) { return t.id === id; })[0]; }
	function dims(fmt) { return {W: 1080, H: (fmt || S.fmt) === 'story' ? 1920 : 1350}; }

	function render(c, px, fmt, tpl, o) {
		var d = dims(fmt), k = px / d.W;
		c.save();
		c.setTransform(k, 0, 0, k, 0, 0);
		c.clearRect(0, 0, d.W, d.H);
		tpl.draw(painter(c, d.W, d.H, fmt, tpl, o));
		if (o.mode === 'preview' && S.sel >= 0 && o.hits) o.hits.forEach(function (h) { // the chosen spot, outlined on screen only
			if (h.i !== S.sel) return;
			c.save(); c.translate(h.x + h.w / 2, h.y + h.h / 2); c.rotate(h.rot);
			c.lineWidth = 10; c.strokeStyle = '#FFFFFF'; c.strokeRect(-h.w / 2 + 5, -h.h / 2 + 5, h.w - 10, h.h - 10);
			c.setLineDash([28, 18]); c.strokeStyle = '#C42847'; c.strokeRect(-h.w / 2 + 5, -h.h / 2 + 5, h.w - 10, h.h - 10);
			c.restore();
		});
		c.restore();
	}

	// ---------- fonts: canvas text only looks right once the web fonts are in ----------
	var fontSeen = {};
	function loadFonts(map) {
		if (!document.fonts || !document.fonts.load) return Promise.resolve(false);
		var jobs = Object.keys(map).filter(function (k) { var id = k + '|' + map[k]; if (fontSeen[id]) return false; fontSeen[id] = 1; return true; }).map(function (k) { return document.fonts.load(k, map[k]).catch(function () {}); });
		if (!jobs.length) return Promise.resolve(false);
		return Promise.race([Promise.all(jobs), new Promise(function (r) { setTimeout(r, 4000); })]).then(function () { return true; });
	}
	function fontsFor(tpl, fmt) { // a dry run of the design to find every font and word it uses, then wait for them
		var map = {}, c = document.createElement('canvas').getContext('2d');
		render(c, 108, fmt || S.fmt, tpl, {mode: 'export', fonts: map});
		map['800 40px ' + FAM.serif] = (map['800 40px ' + FAM.serif] || '') + '“';
		map['600 40px ' + FAM.hand] = (map['600 40px ' + FAM.hand] || '') + 'your photo or video loading…';
		Object.keys(map).forEach(function (k) { delete fontSeen[k + '|' + map[k]]; });
		return loadFonts(map);
	}

	// ---------- preview ----------
	var cv, ctx;
	function layout() {
		var d = dims(), stage = $('stage'), aw = stage.clientWidth - 28, wide = window.innerWidth >= 900;
		var maxH = wide ? clamp(window.innerHeight - 330, 340, 760) : clamp(window.innerHeight * .58, 300, 620);
		var w = Math.floor(Math.min(aw, maxH * d.W / d.H)), h = Math.round(w * d.H / d.W), box = $('cvbox');
		box.style.width = w + 'px'; box.style.height = h + 'px';
		var px = Math.min(1080, Math.round(w * Math.min(window.devicePixelRatio || 1, 3)));
		if (cv.width !== px || cv.height !== Math.round(px * d.H / d.W)) { cv.width = px; cv.height = Math.round(px * d.H / d.W); }
		need = true;
	}
	function paint() {
		hits = []; texts = [];
		var map = {};
		render(ctx, cv.width, S.fmt, cur(), {mode: 'preview', hits: hits, texts: texts, fonts: map});
		loadFonts(map).then(function (fresh) { if (fresh) { need = true; rail(); } });
	}
	function visibleVideos() { var n = cur().n; return S.media.filter(function (m, i) { return i < n && m.kind === 'video'; }); }
	function tick() {
		if (!S.busy && !document.hidden && (need || (S.playing && visibleVideos().length))) { need = false; paint(); }
		requestAnimationFrame(tick);
	}
	function syncVideos() { // only the clips that are in the design play; the rest wait quietly
		var n = cur().n, any = false;
		S.media.forEach(function (m, i) {
			if (m.kind !== 'video') return;
			m.src.muted = true;
			if (i < n) any = true;
			if (i < n && S.playing && !S.busy) { if (m.src.paused) m.src.play().catch(function () {}); } else if (!m.src.paused) m.src.pause();
		});
		var b = $('playBtn');
		b.hidden = !any; b.setAttribute('aria-pressed', S.playing ? 'true' : 'false'); b.setAttribute('aria-label', S.playing ? 'Pause the videos' : 'Play the videos');
	}

	// ---------- the bits around the canvas ----------
	function changed(what) { // one place that redraws whatever a change touches
		if (what !== 'view') S.dirty = S.dirty || what === 'media' || what === 'text' || what === 'look';
		need = true;
		clearTimeout(railT); railT = setTimeout(rail, what === 'text' ? 260 : 60);
		if (what === 'view' || what === 'text') return;
		if (S.sel >= Math.min(S.media.length, cur().n)) S.sel = -1;
		syncVideos(); tray(); slotbar(); hint();
		if (what === 'tpl' || what === 'look') { fields(); swatches(); }
	}
	function hint() {
		var n = cur().n, have = Math.min(S.media.length, n);
		$('hint').textContent = S.sel >= 0 ? 'drag to move it, pinch or slide to zoom' : !have ? 'tap a spot to add a photo or video' : have < n ? 'tap an empty spot to fill it' : 'tap a photo to move, zoom or swap it';
		$('trayHand').textContent = S.media.length ? S.media.length + ' added' : 'none yet';
		$('exportBtn').textContent = visibleVideos().length ? 'Export video' : 'Export';
	}
	function rail() {
		var box = $('rail'), list = TPL.filter(function (t) { return t.fam === S.fam; }), d = dims(), key = S.fam + S.fmt;
		if (box.dataset.key !== key) {
			box.dataset.key = key; box.innerHTML = '';
			list.forEach(function (t) {
				var b = document.createElement('button'), c = document.createElement('canvas');
				b.type = 'button'; b.dataset.id = t.id;
				c.width = 144; c.height = Math.round(144 * d.H / d.W); c.style.height = Math.round(72 * d.H / d.W) + 'px';
				b.appendChild(c); b.appendChild(document.createTextNode(t.name));
				box.appendChild(b);
			});
		}
		Array.prototype.forEach.call(box.children, function (b) {
			var t = TPL.filter(function (x) { return x.id === b.dataset.id; })[0];
			b.setAttribute('aria-pressed', t.id === S.tpl[S.fam] ? 'true' : 'false');
			render(b.firstChild.getContext('2d'), 144, S.fmt, t, {mode: 'thumb'});
		});
		$('railTitle').textContent = S.fam === 'story' ? 'Pick a template' : 'Pick a collage';
		Array.prototype.forEach.call(document.querySelectorAll('.seg button'), function (b) {
			b.setAttribute('aria-pressed', (b.dataset.fmt ? b.dataset.fmt === S.fmt : b.dataset.fam === S.fam) ? 'true' : 'false');
		});
		trayThumbs();
	}
	function trayThumbs() {
		Array.prototype.forEach.call($('tray').querySelectorAll('canvas'), function (c) {
			var m = S.media[Number(c.dataset.i)];
			if (!ready(m)) return;
			var v = view({w: m.w, h: m.h, zoom: 1, cx: .5, cy: .5}, 128, 128);
			try { c.getContext('2d').drawImage(m.src, v.sx, v.sy, v.sw, v.sh, 0, 0, 128, 128); } catch (e) {}
		});
	}
	function tray() {
		var n = cur().n, html = S.media.map(function (m, i) {
			return '<button type="button" data-i="' + i + '" class="' + (m.kind === 'video' ? 'vid' : '') + (i >= n ? ' off' : '') + '" aria-pressed="' + (i === S.sel ? 'true' : 'false') + '" aria-label="' + (m.kind === 'video' ? 'Video ' : 'Photo ') + (i + 1) + (i >= n ? ', not in this layout' : '') + '"><canvas width="128" height="128" data-i="' + i + '"></canvas><b>' + (i + 1) + '</b></button>';
		}).join('');
		if (S.pending) html += '<button type="button" class="wait" disabled>adding ' + S.pending + '…</button>';
		html += '<button type="button" class="add" data-add="1" aria-label="Add photos or videos"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4v12M4 10h12" fill="none" stroke="currentColor" stroke-width="2.200" stroke-linecap="round"/></svg></button>';
		$('tray').innerHTML = html;
		var extra = S.media.length - n, old = document.getElementById('trayFine');
		if (old) old.remove();
		if (extra > 0) { var p = document.createElement('p'); p.id = 'trayFine'; p.className = 'mk-trayfine'; p.textContent = 'This layout shows ' + n + '. The faded ' + (extra === 1 ? 'one is' : 'ones are') + ' kept safe for a bigger layout.'; $('tray').parentNode.appendChild(p); }
		trayThumbs();
	}
	function slotbar() {
		var m = S.media[S.sel], bar = $('slotbar');
		bar.hidden = !m;
		cv.classList.toggle('sel', !!m);
		if (!m) return;
		$('slotName').textContent = (m.kind === 'video' ? 'Video ' : 'Photo ') + (S.sel + 1) + ' of ' + S.media.length;
		$('zoom').value = m.zoom;
		bar.querySelector('[data-a="left"]').disabled = S.sel === 0;
		bar.querySelector('[data-a="right"]').disabled = S.sel >= S.media.length - 1;
	}
	function fields() {
		var tpl = cur(), box = $('fields');
		box.innerHTML = tpl.fields.map(function (k) {
			var f = FIELD[k], v = esc(textOf(tpl, k)), ph = tpl.fam === 'collage' && k === 'title' && !(tpl.def || {}).title ? 'A little tag, if you like' : '';
			return '<label><span>' + (ph ? 'Tag' : f[0]) + '</span>' + (f[2] ? '<textarea rows="2" maxlength="' + f[1] + '" data-k="' + k + '" placeholder="' + ph + '">' + v + '</textarea>' : '<input type="text" maxlength="' + f[1] + '" data-k="' + k + '" value="' + v + '" autocomplete="off" autocapitalize="off">') + '</label>';
		}).join('');
		$('textSec').hidden = !tpl.fields.length;
	}
	function swatches() {
		var tpl = cur(), on = S.theme[tpl.id] || 0;
		$('swatches').innerHTML = tpl.themes.map(function (id, i) {
			var p = PAL[id], sw = p.sw || [p.bg, p.acc];
			return '<button type="button" data-i="' + i + '" aria-pressed="' + (i === on ? 'true' : 'false') + '"><i style="background:linear-gradient(135deg,' + sw[0] + ' 50%,' + sw[1] + ' 50%)"></i>' + esc(p.n) + '</button>';
		}).join('');
	}

	// ---------- photos and videos in ----------
	function isHeic(f) { return /hei[cf]/i.test(f.type) || /\.hei[cf]$/i.test(f.name); }
	function isVideo(f) { return /^video\//.test(f.type) || (!f.type && /\.(mp4|mov|m4v|webm|3gp|mkv)$/i.test(f.name)); }
	function loadImage(file) {
		return new Promise(function (res, rej) {
			var url = URL.createObjectURL(file), img = new Image();
			img.onload = function () {
				var k = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas');
				c.width = Math.max(1, Math.round(img.naturalWidth * k)); c.height = Math.max(1, Math.round(img.naturalHeight * k));
				try { c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); } catch (e) { URL.revokeObjectURL(url); return rej('image'); }
				URL.revokeObjectURL(url); img.src = '';
				res({kind: 'image', src: c, w: c.width, h: c.height});
			};
			img.onerror = function () { URL.revokeObjectURL(url); rej(isHeic(file) ? 'heic' : 'image'); };
			img.src = url;
		});
	}
	function loadVideo(file) {
		return new Promise(function (res, rej) {
			var url = URL.createObjectURL(file), v = document.createElement('video'), done = false;
			function bad() { if (done) return; done = true; clearTimeout(t); v.removeAttribute('src'); try { v.load(); } catch (e) {} v.remove(); URL.revokeObjectURL(url); rej('video'); }
			var t = setTimeout(bad, 20000);
			v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('muted', ''); v.preload = 'auto';
			v.onloadedmetadata = function () {
				if (done) return;
				if (!v.videoWidth) return bad();
				done = true; clearTimeout(t);
				v.onerror = null;
				v.addEventListener('loadeddata', function () { need = true; setTimeout(trayThumbs, 80); });
				res({kind: 'video', src: v, w: v.videoWidth, h: v.videoHeight, dur: v.duration, url: url});
			};
			v.onerror = bad;
			$('vids').appendChild(v);
			v.src = url;
			v.play().catch(function () {}); // an iPhone only loads the first frame once it is asked to play
		});
	}
	function dispose(m) {
		if (!m) return;
		if (m.kind === 'video') { try { m.src.pause(); if (m.node) m.node.disconnect(); m.src.removeAttribute('src'); m.src.load(); } catch (e) {} m.src.remove(); URL.revokeObjectURL(m.url); }
		else { m.src.width = m.src.height = 0; }
	}
	function addFiles(list, replaceAt) {
		var files = Array.prototype.slice.call(list || []), probs = [];
		if (!files.length) return;
		if (replaceAt != null) files = files.slice(0, 1);
		var room = MAX_MEDIA - S.media.length + (replaceAt != null ? 1 : 0);
		if (files.length > room) { probs.push('You can keep up to ' + MAX_MEDIA + ' photos and videos here at once, so ' + (files.length - room) + ' were left out.'); files = files.slice(0, Math.max(0, room)); }
		note('');
		S.pending = files.length; tray();
		var chain = Promise.resolve();
		files.forEach(function (f) {
			chain = chain.then(function () {
				return (isVideo(f) ? loadVideo(f) : loadImage(f)).then(function (m) {
					m.id = ++uid; m.zoom = 1; m.cx = .5; m.cy = .5;
					if (replaceAt != null && S.media[replaceAt]) { dispose(S.media[replaceAt]); S.media[replaceAt] = m; } else S.media.push(m);
				}, function (why) {
					var nm = '“' + (f.name || 'That file').slice(0, 40) + '”';
					probs.push(why === 'heic' ? nm + ' is a HEIC photo and this browser cannot open those. Save or share it as a JPG from your gallery, then add it again.' :
						why === 'video' ? nm + ' is a video this browser cannot play. An MP4 from your phone’s camera works best.' :
						nm + ' could not be opened. Try a JPG or PNG photo, or an MP4 video.');
				}).then(function () { S.pending--; changed('media'); });
			});
		});
		chain.then(function () { S.pending = 0; changed('media'); if (probs.length) note(probs.join(' ')); });
	}
	var pickFor = null;
	function pick(replaceAt) { var f = $('file'); pickFor = replaceAt == null ? null : replaceAt; f.multiple = pickFor == null; f.value = ''; f.click(); }

	// ---------- touching the canvas ----------
	function at(e) { var r = cv.getBoundingClientRect(), k = 1080 / r.width; return {x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k, k: k}; }
	function hitSlot(p) {
		for (var n = hits.length - 1; n >= 0; n--) {
			var h = hits[n], dx = p.x - (h.x + h.w / 2), dy = p.y - (h.y + h.h / 2), cs = Math.cos(-h.rot), sn = Math.sin(-h.rot), lx = dx * cs - dy * sn, ly = dx * sn + dy * cs;
			if (Math.abs(lx) <= h.w / 2 && Math.abs(ly) <= h.h / 2) return h;
		}
		return null;
	}
	function hitOf(i) { return hits.filter(function (h) { return h.i === i; })[0]; }
	function select(i) { S.sel = i; changed('sel'); if (i >= 0) $('slotbar').scrollIntoView({block: 'nearest', behavior: reduced ? 'auto' : 'smooth'}); }
	function setZoom(m, z) { m.zoom = clamp(z, 1, 4); $('zoom').value = m.zoom; changed('view'); }
	function wire() {
		var pts = {}, down = null, pinch = null;
		function count() { return Object.keys(pts).length; }
		cv.addEventListener('pointerdown', function (e) {
			var p = at(e), h = hitSlot(p);
			pts[e.pointerId] = p;
			if (count() === 2 && S.sel >= 0) { var a = Object.keys(pts).map(function (k) { return pts[k]; }); pinch = {d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1, z: S.media[S.sel].zoom}; down = null; return; }
			down = {id: e.pointerId, x: p.x, y: p.y, cx: e.clientX, cy: e.clientY, hit: h, moved: false, drag: false};
			if (h && S.media[h.i] && e.pointerType === 'mouse' && S.sel !== h.i) select(h.i); // with a mouse, press and drag straight away
			if (h && h.i === S.sel && S.media[h.i]) { down.drag = true; try { cv.setPointerCapture(e.pointerId); } catch (er) {} }
		});
		cv.addEventListener('pointermove', function (e) {
			if (!pts[e.pointerId]) return;
			var p = at(e);
			pts[e.pointerId] = p;
			if (pinch && count() === 2) { var a = Object.keys(pts).map(function (k) { return pts[k]; }); setZoom(S.media[S.sel], pinch.z * Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) / pinch.d); return; }
			if (!down || down.id !== e.pointerId) return;
			if (Math.hypot(e.clientX - down.cx, e.clientY - down.cy) > 7) down.moved = true;
			if (!down.drag || !down.moved) return;
			var h = hitOf(S.sel), m = S.media[S.sel];
			if (!h || !m) return;
			var dx = p.x - down.x, dy = p.y - down.y, cs = Math.cos(-h.rot), sn = Math.sin(-h.rot), v = view(m, h.w, h.h);
			m.cx = clamp(v.cx - (dx * cs - dy * sn) / v.sc / m.w, v.vw / 2, 1 - v.vw / 2);
			m.cy = clamp(v.cy - (dx * sn + dy * cs) / v.sc / m.h, v.vh / 2, 1 - v.vh / 2);
			down.x = p.x; down.y = p.y;
			S.dirty = true; changed('view');
		});
		function up(e) {
			var d = down && down.id === e.pointerId ? down : null;
			delete pts[e.pointerId];
			if (count() < 2) pinch = null;
			if (!d) return;
			down = null;
			if (e.type === 'pointercancel' || d.moved) return;
			var h = d.hit;
			if (h) {
				if (!S.media[h.i]) return pick();
				if (S.sel !== h.i) select(h.i);
				return;
			}
			var t = texts.filter(function (b) { return d.x >= b.x && d.x <= b.x + b.w && d.y >= b.y && d.y <= b.y + b.h; })[0];
			if (S.sel >= 0) select(-1);
			if (t) { var el = $('fields').querySelector('[data-k="' + t.key + '"]'); if (el) { el.focus(); el.scrollIntoView({block: 'center', behavior: reduced ? 'auto' : 'smooth'}); } }
		}
		cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
		cv.addEventListener('wheel', function (e) { var m = S.media[S.sel]; if (!m) return; e.preventDefault(); setZoom(m, m.zoom * Math.exp(-e.deltaY * .0015)); }, {passive: false});
		cv.addEventListener('keydown', function (e) { // arrow keys nudge the chosen photo
			var m = S.media[S.sel], k = {ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]}[e.key];
			if (e.key === 'Escape' && S.sel >= 0) return select(-1);
			if (!m || !k) return;
			e.preventDefault(); m.cx = clamp(m.cx + k[0] * .02, 0, 1); m.cy = clamp(m.cy + k[1] * .02, 0, 1); S.dirty = true; changed('view');
		});

		$('zoom').addEventListener('input', function () { var m = S.media[S.sel]; if (m) { m.zoom = Number(this.value); S.dirty = true; changed('view'); } });
		$('slotbar').addEventListener('click', function (e) {
			var b = e.target.closest('[data-a]'), i = S.sel, m = S.media[i];
			if (!b || !m) return;
			var a = b.dataset.a;
			if (a === 'done') return select(-1);
			if (a === 'replace') return pick(i);
			if (a === 'remove') { dispose(m); S.media.splice(i, 1); S.sel = -1; return changed('media'); }
			var j = a === 'left' ? i - 1 : i + 1;
			if (j < 0 || j >= S.media.length) return;
			S.media[i] = S.media[j]; S.media[j] = m; S.sel = j < cur().n ? j : -1; changed('media');
		});
		$('tray').addEventListener('click', function (e) {
			var b = e.target.closest('button');
			if (!b) return;
			if (b.dataset.add) return pick();
			if (b.dataset.i == null) return;
			var i = Number(b.dataset.i);
			if (i >= cur().n) return toast('Pick a layout with more spots to use this one');
			select(S.sel === i ? -1 : i);
		});
		$('rail').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; S.tpl[S.fam] = b.dataset.id; changed('tpl'); });
		document.querySelector('.mk-switch').addEventListener('click', function (e) {
			var b = e.target.closest('button');
			if (!b) return;
			if (b.dataset.fmt) { if (S.fmt === b.dataset.fmt) return; S.fmt = b.dataset.fmt; layout(); } else { if (S.fam === b.dataset.fam) return; S.fam = b.dataset.fam; }
			changed('tpl');
		});
		$('fields').addEventListener('input', function (e) { var k = e.target.dataset.k; if (!k) return; S.text[k] = e.target.value; changed('text'); });
		$('swatches').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; S.theme[cur().id] = Number(b.dataset.i); changed('look'); });
		$('addBtn').onclick = function () { pick(); };
		$('playBtn').onclick = function () { S.playing = !S.playing; syncVideos(); need = true; };
		$('exportBtn').onclick = startExport;
		$('file').addEventListener('change', function () { addFiles(this.files, pickFor); });

		// dropping files on a computer
		var depth = 0;
		function hasFiles(e) { return e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') >= 0; }
		window.addEventListener('dragenter', function (e) { if (!hasFiles(e)) return; depth++; $('drop').hidden = false; });
		window.addEventListener('dragleave', function (e) { if (!hasFiles(e)) return; depth = Math.max(0, depth - 1); if (!depth) $('drop').hidden = true; });
		window.addEventListener('dragover', function (e) { if (hasFiles(e)) e.preventDefault(); });
		window.addEventListener('drop', function (e) {
			if (!hasFiles(e)) return;
			e.preventDefault(); depth = 0; $('drop').hidden = true;
			var h = e.target === cv ? hitSlot(at(e)) : null, fs = e.dataTransfer.files;
			addFiles(fs, h && S.media[h.i] && fs.length === 1 ? h.i : null);
		});

		window.addEventListener('resize', layout);
		if (window.ResizeObserver) new ResizeObserver(layout).observe($('stage'));
		document.addEventListener('visibilitychange', function () { need = true; });
		window.addEventListener('beforeunload', function (e) { if (S.dirty) { e.preventDefault(); e.returnValue = ''; } });
		if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', function () { need = true; clearTimeout(railT); railT = setTimeout(rail, 80); });
	}

	// ---------- sheets ----------
	var sheetClose = null;
	function sheet(o) {
		var box = $('sheetIn');
		box.innerHTML = (o.hand ? '<p class="hand">' + esc(o.hand) + '</p>' : '') + '<h2 id="sheetTitle">' + o.title + '</h2>' + (o.html || '') + '<div class="acts"></div>';
		var acts = box.querySelector('.acts');
		(o.acts || []).forEach(function (a) {
			var b = document.createElement('button');
			b.type = 'button'; b.className = a.cls || 'btn red'; b.textContent = a.t; if (a.id) b.id = a.id;
			b.onclick = function () { a.fn(b); };
			acts.appendChild(b);
		});
		sheetClose = o.close || null;
		$('sheet').hidden = false; document.body.style.overflow = 'hidden';
		var first = acts.querySelector('button'); if (first) first.focus();
		return box;
	}
	function closeSheet() { $('sheet').hidden = true; $('sheetIn').innerHTML = ''; document.body.style.overflow = ''; sheetClose = null; need = true; $('exportBtn').focus(); }
	document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('sheet').hidden && sheetClose) sheetClose(); });

	// ---------- export ----------
	function stamp() { var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; }; return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()); }
	function makeStill() { // exactly the preview, 1080 wide, with nothing added
		var tpl = cur(), d = dims();
		return fontsFor(tpl).then(function () {
			var c = document.createElement('canvas');
			c.width = d.W; c.height = d.H;
			render(c.getContext('2d'), d.W, S.fmt, tpl, {mode: 'export'});
			var photo = Math.min(S.media.length, tpl.n) > 0, type = photo ? 'image/jpeg' : 'image/png';
			return new Promise(function (res, rej) {
				c.toBlob(function (b) { c.width = c.height = 0; b ? res({blob: b, type: type, name: S.fmt + '-' + stamp() + (photo ? '.jpg' : '.png'), kind: 'image', w: d.W, h: d.H}) : rej(new Error('still')); }, type, .93);
			});
		});
	}

	var AC = null;
	function audioFor(vids) { // the clips' own sound, mixed into one track (never played out loud while it records)
		try {
			var Ctx = window.AudioContext || window.webkitAudioContext;
			if (!Ctx) return null;
			AC = AC || new Ctx();
			if (AC.state === 'suspended') AC.resume();
			var dest = AC.createMediaStreamDestination();
			vids.forEach(function (m) { if (!m.node) m.node = AC.createMediaElementSource(m.src); m.node.connect(dest); });
			if (!dest.stream.getAudioTracks().length) return null;
			return {stream: dest.stream, on: function () { vids.forEach(function (m) { m.src.muted = false; m.src.volume = 1; }); }, off: function () { vids.forEach(function (m) { m.src.muted = true; try { m.node.disconnect(dest); } catch (e) {} }); }};
		} catch (e) { return null; }
	}
	function firstType(list) { for (var i = 0; i < list.length; i++) if (MediaRecorder.isTypeSupported(list[i])) return list[i]; return ''; }
	function recMedia(cvs, mime, audio, kind, bits) {
		var stream = cvs.captureStream(FPS), chunks = [], err = null;
		if (audio) audio.stream.getAudioTracks().forEach(function (t) { stream.addTrack(t); });
		var mr = new MediaRecorder(stream, {mimeType: mime, videoBitsPerSecond: bits, audioBitsPerSecond: 128000});
		mr.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
		var r = {kind: kind, how: 'MediaRecorder', mime: mime, audio: !!audio, err: null,
			start: function () { mr.onerror = function (e) { r.err = e.error || new Error('recorder'); }; mr.start(); },
			frame: function () {},
			stop: function () { return new Promise(function (res, rej) { mr.onstop = function () { stream.getVideoTracks().forEach(function (t) { t.stop(); }); var b = new Blob(chunks, {type: kind === 'mp4' ? 'video/mp4' : 'video/webm'}); b.size ? res(b) : rej(err || new Error('empty')); }; try { mr.stop(); } catch (e) { rej(e); } }); },
			cancel: function () { try { mr.onstop = null; if (mr.state !== 'inactive') mr.stop(); } catch (e) {} stream.getVideoTracks().forEach(function (t) { t.stop(); }); }};
		return r;
	}
	function loadMuxer() {
		if (window.Mp4Muxer) return Promise.resolve();
		return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = MUXER; s.crossOrigin = 'anonymous'; s.onload = function () { window.Mp4Muxer ? res() : rej(new Error('muxer')); }; s.onerror = function () { rej(new Error('muxer')); }; document.head.appendChild(s); });
	}
	function recCodecs(cvs, H, bits) { // H.264 frames from WebCodecs, wrapped into a plain MP4 by mp4-muxer (no sound on this path)
		var cfgs = ['avc1.640028', 'avc1.4d0028', 'avc1.42e028'].map(function (codec) { return {codec: codec, width: 1080, height: H, bitrate: bits, framerate: FPS, avc: {format: 'avc'}}; });
		return cfgs.reduce(function (p, cfg) { return p.then(function (ok) { return ok || VideoEncoder.isConfigSupported(cfg).then(function (s) { return s && s.supported ? cfg : null; }, function () { return null; }); }); }, Promise.resolve(null)).then(function (cfg) {
			if (!cfg) return null;
			return loadMuxer().then(function () {
				var M = window.Mp4Muxer, mux = new M.Muxer({target: new M.ArrayBufferTarget(), video: {codec: 'avc', width: 1080, height: H, frameRate: FPS}, fastStart: 'in-memory', firstTimestampBehavior: 'offset'});
				var last = -1, n = 0, r = {kind: 'mp4', how: 'WebCodecs + mp4-muxer', mime: 'video/mp4; ' + cfg.codec, audio: false, err: null};
				var enc = new VideoEncoder({output: function (chunk, meta) { mux.addVideoChunk(chunk, meta); }, error: function (e) { r.err = e; }});
				enc.configure(cfg);
				r.start = function () {};
				r.frame = function (t) {
					var idx = Math.round(t * FPS);
					if (idx <= last || enc.encodeQueueSize > 4) return;
					last = idx;
					var vf = new VideoFrame(cvs, {timestamp: Math.round(idx * 1e6 / FPS), duration: Math.round(1e6 / FPS)});
					enc.encode(vf, {keyFrame: n++ % 60 === 0}); vf.close();
				};
				r.stop = function () { return enc.flush().then(function () { enc.close(); mux.finalize(); return new Blob([mux.target.buffer], {type: 'video/mp4'}); }); };
				r.cancel = function () { try { enc.close(); } catch (e) {} };
				return r;
			});
		});
	}
	function openRecorder(cvs, H, audio) { // MP4 from the browser's own recorder, else WebCodecs, else WebM
		var force = (location.search.match(/[?&]rec=(\w+)/) || [])[1], bits = H > 1400 ? 8000000 : 6500000;
		var MR = window.MediaRecorder, can = !!(cvs.captureStream && MR && MR.isTypeSupported), tries = [];
		if (can && (!force || force === 'mr')) tries.push(function () {
			var av = audio ? firstType(['video/mp4;codecs="avc1.640028,mp4a.40.2"', 'video/mp4;codecs="avc1.4d0028,mp4a.40.2"', 'video/mp4;codecs="avc1.42E01E,mp4a.40.2"', 'video/mp4;codecs="avc1,mp4a.40.2"']) : '';
			var mime = av || firstType(['video/mp4;codecs="avc1.640028"', 'video/mp4;codecs="avc1.4d0028"', 'video/mp4;codecs="avc1.42E01E"', 'video/mp4;codecs=avc1']), withA = !!av;
			// a bare "video/mp4" is H.264 on an iPhone, but could be VP9 in Chrome, which Instagram may refuse: only take it where VP9-in-MP4 does not exist
			if (!mime && MR.isTypeSupported('video/mp4') && !MR.isTypeSupported('video/mp4;codecs=vp9') && !MR.isTypeSupported('video/mp4;codecs="vp09.00.10.08"')) { mime = 'video/mp4'; withA = !!audio; }
			return mime ? recMedia(cvs, mime, withA ? audio : null, 'mp4', bits) : null;
		});
		if (window.VideoEncoder && window.VideoFrame && (!force || force === 'wc')) tries.push(function () { return recCodecs(cvs, H, bits); });
		if (can && (!force || force === 'webm')) tries.push(function () {
			var av = firstType(['video/webm;codecs="vp9,opus"', 'video/webm;codecs="vp8,opus"']), mime = (audio && av) || firstType(['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']);
			return mime ? recMedia(cvs, mime, audio && av ? audio : null, 'webm', bits) : null;
		});
		return tries.reduce(function (p, fn) { return p.then(function (r) { return r || Promise.resolve().then(fn).catch(function () { return null; }); }); }, Promise.resolve(null)).then(function (r) { if (!r) throw new Error('novideo'); return r; });
	}
	function rewind(m) {
		return new Promise(function (res) {
			var v = m.src;
			v.pause();
			if (v.currentTime < .04) return res();
			var t = setTimeout(res, 2500);
			v.addEventListener('seeked', function f() { v.removeEventListener('seeked', f); clearTimeout(t); res(); });
			v.currentTime = 0;
		});
	}
	function makeVideo(ctl, onProg) {
		var tpl = cur(), d = dims(), vids = visibleVideos(), audio = null, rec = null, cvs = document.createElement('canvas');
		var dur = clamp(Math.max.apply(null, vids.map(function (m) { return isFinite(m.dur) && m.dur > 0 ? m.dur : 10; })), 1, MAX_SEC);
		cvs.width = d.W; cvs.height = d.H;
		$('vids').appendChild(cvs);
		var c = cvs.getContext('2d'), draw = function () { render(c, d.W, S.fmt, tpl, {mode: 'export'}); };
		if (S.sound) audio = audioFor(vids); // made inside her tap, as browsers ask
		function tidy() { if (audio) audio.off(); cvs.remove(); cvs.width = cvs.height = 0; S.busy = false; syncVideos(); need = true; }
		S.busy = true; syncVideos();
		return fontsFor(tpl).then(function () { draw(); return openRecorder(cvs, d.H, audio); }).then(function (r) {
			rec = r;
			if (audio && !rec.audio) { audio.off(); audio = null; }
			return Promise.all(vids.map(rewind));
		}).then(function () {
			if (audio) audio.on();
			return Promise.all(vids.map(function (m) { return m.src.play().catch(function () {}); }));
		}).then(function () {
			draw(); rec.start();
			var t0 = performance.now();
			return new Promise(function (res, rej) {
				(function step() {
					if (ctl.cancelled) return rej(new Error('cancelled'));
					if (document.hidden) return rej(new Error('hidden'));
					if (rec.err) return rej(rec.err);
					var t = (performance.now() - t0) / 1000;
					draw(); rec.frame(Math.min(t, dur)); onProg(Math.min(t, dur), dur);
					if (t >= dur) return res();
					requestAnimationFrame(step);
				})();
			});
		}).then(function () { return rec.stop(); }).then(function (blob) {
			var out = {blob: blob, type: blob.type, kind: 'video', container: rec.kind, how: rec.how, mime: rec.mime, sound: !!audio, dur: dur, w: d.W, h: d.H, name: S.fmt + '-' + stamp() + '.' + rec.kind};
			tidy();
			return out;
		}, function (e) { if (rec) rec.cancel(); tidy(); throw e; });
	}

	function startExport() {
		if (S.busy) return;
		var tpl = cur(), empty = tpl.n - Math.min(S.media.length, tpl.n);
		if (S.pending) return toast('Still adding your photos, one moment');
		if (S.sel >= 0) select(-1);
		if (empty === tpl.n && tpl.n > 0 && tpl.id !== 'quote') return sheet({hand: 'nearly', title: 'Add a photo <em>first</em>', html: '<p class="body">The spots are still empty. Add a photo or a video and it is ready to export.</p>', close: closeSheet,
			acts: [{t: 'Add photos or videos', fn: function () { closeSheet(); pick(); }}, {t: 'Not now', cls: 'btn line', fn: closeSheet}]});
		if (empty > 0) return sheet({hand: 'one thing', title: empty === 1 ? 'One spot is <em>still empty</em>' : empty + ' spots are <em>still empty</em>', html: '<p class="body">Empty spots come out as plain colour blocks. Fill them, or pick a layout with fewer spots.</p>', close: closeSheet,
			acts: [{t: 'Add photos or videos', fn: function () { closeSheet(); pick(); }}, {t: 'Export anyway', cls: 'btn line', fn: function () { go(); }}]});
		go();
	}
	function go(stillOnly) {
		var video = !stillOnly && visibleVideos().length > 0, ctl = {cancelled: false};
		if (!video) {
			sheet({hand: 'one sec', title: 'Making your <em>picture</em>', html: '<div class="mk-prog"><i style="width:60%"></i></div>'});
			return makeStill().then(done, function () { fail('We could not make the picture this time.', 'Your design is still here. Try again, and if it keeps happening, try a layout with fewer photos.'); });
		}
		var box = sheet({hand: 'rolling', title: 'Making your <em>video</em>', html: '<p class="body" id="progTxt">Getting the clips ready…</p><div class="mk-prog"><i id="progBar"></i></div><p class="fine">Keep this page open and on screen while it records. It plays through once at normal speed.</p>',
			acts: [{t: 'Cancel', cls: 'btn line', fn: function () { ctl.cancelled = true; }}]});
		var bar = box.querySelector('#progBar'), txt = box.querySelector('#progTxt'), lastS = -1;
		makeVideo(ctl, function (t, dur) {
			bar.style.width = (t / dur * 100).toFixed(1) + '%';
			var s = Math.floor(t);
			if (s !== lastS) { lastS = s; txt.textContent = 'Recording second ' + Math.min(s + 1, Math.ceil(dur)) + ' of ' + Math.ceil(dur) + '…'; }
		}).then(done, function (e) {
			var why = e && e.message;
			if (why === 'cancelled') { closeSheet(); return toast('Stopped. Nothing was saved.'); }
			if (why === 'hidden') return fail('The recording stopped', 'The page went into the background, so the video paused. Keep it open on screen and try again.', true);
			if (why === 'novideo') return fail('This browser cannot make videos', 'It has no video recorder we can use. You can still save your design as a picture.', true);
			fail('The video did not finish', 'Something went wrong while recording. Your design is still here, so you can try again or save a picture instead.', true);
		});
	}
	function fail(title, msg, offerStill) {
		var acts = [{t: 'Try again', fn: function () { closeSheet(); startExport(); }}];
		if (offerStill) acts.push({t: 'Save a picture instead', cls: 'btn line', fn: function () { go(true); }});
		acts.push({t: 'Close', cls: 'linkbtn', fn: closeSheet});
		sheet({hand: 'oh no', title: esc(title), html: '<p class="body">' + esc(msg) + '</p>', close: closeSheet, acts: acts});
	}
	function download(out) {
		var url = URL.createObjectURL(out.blob), a = document.createElement('a');
		a.href = url; a.download = out.name; a.rel = 'noopener';
		document.body.appendChild(a); a.click(); a.remove();
		setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
		S.dirty = false;
	}
	function done(out) {
		window.__mkLast = {name: out.name, type: out.type, size: out.blob.size, how: out.how || 'canvas', mime: out.mime || out.type, sound: !!out.sound};
		var url = URL.createObjectURL(out.blob), file = null, canShare = false;
		try { file = new File([out.blob], out.name, {type: out.type}); canShare = !!(navigator.canShare && navigator.share && navigator.canShare({files: [file]})); } catch (e) {}
		var isV = out.kind === 'video', webm = isV && out.container === 'webm';
		var facts = out.w + ' × ' + out.h + (isV ? ' · ' + (webm ? 'WebM' : 'MP4') + ' · ' + Math.round(out.dur) + ' s · ' + (out.sound ? 'with the clips’ sound' : 'no sound') : out.type === 'image/png' ? ' · PNG' : ' · JPG');
		var html = (isV ? '<video class="mk-out" src="' + url + '" controls playsinline loop></video>' : '<img class="mk-out" src="' + url + '" alt="Your exported design">') + '<p class="fine">' + esc(facts) + '. No watermark, nothing added.</p>';
		if (webm) html += '<p class="mk-warn"><b>Heads up:</b> this browser could only make a WebM video, and Instagram may not accept it. Chrome or Safari on your phone make an MP4. You can also save a picture instead.</p>';
		else if (isV && S.sound && !out.sound) html += '<p class="mk-warn">This browser could not record the clips’ sound, so the video is silent. Add music in Instagram when you post.</p>';
		function shut() { closeSheet(); URL.revokeObjectURL(url); } // the preview leaves the page first, then its file is let go
		var acts = [];
		if (canShare) acts.push({t: isV ? 'Save or share the video' : 'Save or share the picture', fn: function () {
			navigator.share({files: [file]}).then(function () { S.dirty = false; toast('Done. Go post it!'); }, function (e) {
				if (e && e.name === 'AbortError') return; // she closed the share sheet herself
				download(out); toast('Sharing did not open, so it was downloaded instead');
			});
		}});
		acts.push({t: canShare ? 'Download instead' : 'Download again', cls: 'btn line', fn: function () { download(out); toast('Saved to your downloads'); }});
		if (isV) acts.push({t: 'Save a picture instead', cls: 'btn line', fn: function () { $('sheetIn').innerHTML = ''; URL.revokeObjectURL(url); go(true); }});
		acts.push({t: 'Back to my design', cls: 'linkbtn', fn: shut});
		sheet({hand: canShare ? 'ta-da' : 'saved', title: isV ? 'Your video is <em>ready</em>' : 'Your picture is <em>ready</em>', html: html + (canShare ? '' : '<p class="body">It is in your downloads folder. From there, add it to your story or post.</p>'), close: shut, acts: acts});
		if (!canShare) { try { download(out); } catch (e) { toast('The download did not start. Tap “Download again”.'); } }
	}

	// ---------- open ----------
	function open() {
		$('gate').hidden = true; $('tool').hidden = false;
		var back = $('back'); back.hidden = false; back.href = $('logo').href = '../me/#' + token;
		cv = $('cv'); ctx = cv.getContext('2d');
		wire(); layout(); fields(); swatches(); tray(); slotbar(); hint(); syncVideos(); rail();
		fontsFor(cur()).then(function () { need = true; rail(); });
		requestAnimationFrame(tick);
		if (/[?&]debug\b/.test(location.search)) window.__mk = {S: S, hits: function () { return hits; }, TPL: TPL};
	}
	check();
})();
