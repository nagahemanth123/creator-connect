/* Busy Fox Creator Connect — carousel engine.
   A carousel is ONE wide strip (n slides × 1080 wide, 1350 or 1440 tall). Every piece on it is a layer with a centre
   (x, y), a size (w, h) and a rotation, so a creator can move, resize and turn anything, and a piece can sit across two
   slides (that is what makes a seamless panorama). The same draw code makes the editor view, the thumbnails and the
   exported files, so what she sees is what she posts.

   doc  = {v, tpl, name, n, H, vars{c1..}, bg, slideBg[], layers[], foxy{}}
   layer kinds: photo · cut (Foxy cut-out of a photo layer, drawn above things to put her in front of text) · text ·
                sticker · shape · path (dotted flight path) · ui (phone-screen pieces: music player, message bubble, album
                header, location pin, note, label, notification, search bar, window bar)
   anim: {a: float|wiggle|spin|swing|pulse|pop|slide|draw|type|zoom|blink|drift, d: delay s}  — one 5-second loop */
(function (root) {
	'use strict';
	var W = 1080, LOOP = 5, BASE = (root.CAROUSEL_BASE || '') ;
	var TAU = Math.PI * 2;
	var meta = {stk: {}, nat: {}};
	var imgs = {}, waiting = {};

	// ---------- fonts ----------
	var FONTS = {
		chunky: "'Bricolage Grotesque','Noto Sans Telugu',sans-serif",
		grotesk: "'DM Sans','Noto Sans Telugu',sans-serif",
		serif: "'Instrument Serif','Noto Serif Telugu',serif",
		display: "'Playfair Display','Noto Serif Telugu',serif",
		hand: "'Caveat','Gurajada',cursive",
		script: "'Mrs Saint Delafield','Caveat',cursive",
		bubble: "'Pacifico','Noto Sans Telugu',cursive",
		mono: "'IBM Plex Mono','Noto Sans Telugu',monospace",
		type: "'Special Elite','Noto Sans Telugu',monospace",
		ios: "-apple-system,'SF Pro Text','Inter','Noto Sans Telugu',sans-serif",
		te: "'Gurajada','Noto Serif Telugu',serif",
		teSerif: "'Noto Serif Telugu','Instrument Serif',serif",
		teBold: "'Ramaraja','Noto Sans Telugu',serif"
	};
	var FONT_CSS = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,800&family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,800&family=Instrument+Serif:ital@0;1&family=Playfair+Display:ital,wght@0,500;0,800;1,500&family=Caveat:wght@500;700&family=Mrs+Saint+Delafield&family=Pacifico&family=IBM+Plex+Mono:wght@400;600&family=Special+Elite&family=Inter:wght@400;600;700&family=Noto+Sans+Telugu:wght@400;700&family=Noto+Serif+Telugu:wght@400;700&family=Gurajada&family=Ramaraja&display=block';
	function fontsReady() {
		if (!document.fonts || !document.fonts.load) return Promise.resolve();
		var probes = ['800 40px "Bricolage Grotesque"', '600 40px "DM Sans"', '40px "Instrument Serif"', 'italic 40px "Instrument Serif"', '800 40px "Playfair Display"', 'italic 500 40px "Playfair Display"', '700 40px Caveat', '40px "Mrs Saint Delafield"', '40px Pacifico', '600 40px "IBM Plex Mono"', '40px "Special Elite"', '600 40px Inter', '700 40px "Noto Sans Telugu"', '40px "Noto Serif Telugu"', '40px Gurajada', '40px Ramaraja'];
		return Promise.all(probes.map(function (p) { return document.fonts.load(p, 'Aa తెలుగు').catch(function () {}); }));
	}

	// ---------- images ----------
	function url(k) { return /^(blob:|data:|https?:)/.test(k) ? k : BASE + 'a/' + k + (/\.(png|jpe?g|webp)$/.test(k) ? '' : (/^(stk|cut)\//.test(k) ? '.webp' : '.jpg')); }
	function img(k) { // returns a ready image or null (and starts loading it)
		if (!k) return null;
		if (root.CarouselUser && k.indexOf('u:') === 0) return root.CarouselUser(k);
		var c = imgs[k];
		if (c) return c.ready ? c.el : null;
		var el = new Image(); el.decoding = 'async'; el.crossOrigin = 'anonymous';
		c = imgs[k] = {el: el, ready: false};
		el.onload = function () { c.ready = true; (waiting[k] || []).forEach(function (f) { f(); }); delete waiting[k]; if (root.CarouselRedraw) root.CarouselRedraw(); };
		el.onerror = function () { c.ready = false; };
		el.src = url(k);
		return null;
	}
	function preload(keys) {
		return Promise.all(keys.filter(Boolean).map(function (k) {
			if (k.indexOf('u:') === 0) return Promise.resolve();
			if (img(k)) return Promise.resolve();
			return new Promise(function (res) { (waiting[k] = waiting[k] || []).push(res); setTimeout(res, 8000); });
		}));
	}
	function docAssets(doc) {
		var out = [];
		[doc.bg].concat(doc.slideBg || []).forEach(function (b) { if (b && (b.tex || b.src)) out.push(b.tex ? 'tex/' + b.tex : b.src); });
		doc.layers.forEach(function (l) {
			if (l.src) out.push(l.src);
			if (l.k) out.push('stk/' + l.k);
			if (l.frame && /^camera/.test(l.frame)) out.push('stk/' + l.frame);
			if (l.tape) out.push('stk/' + (l.tape === true ? 'washi' : l.tape));
		});
		return out;
	}

	// ---------- helpers ----------
	function col(doc, v) { return typeof v === 'string' && v.charAt(0) === '$' ? (doc.vars && doc.vars[v.slice(1)]) || '#000' : v; }
	function ease(e) { return 1 - Math.pow(1 - e, 3); }
	function back(e) { var c = 1.7; return 1 + (c + 1) * Math.pow(e - 1, 3) + c * Math.pow(e - 1, 2); }
	function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
	function rr(ctx, x, y, w, h, r) {
		r = Math.max(0, Math.min(r, w / 2, h / 2));
		ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
		ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
	}
	function shapePath(ctx, sh, w, h, r) { // centred at 0,0
		var x = -w / 2, y = -h / 2;
		if (sh === 'circle') { ctx.beginPath(); ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, TAU); return; }
		if (sh === 'arch') { var a = Math.min(w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + a); ctx.arc(0, y + a, w / 2, Math.PI, 0); ctx.lineTo(x + w, y + h); ctx.closePath(); return; }
		if (sh === 'heart') {
			ctx.beginPath(); ctx.moveTo(0, y + h * .28);
			ctx.bezierCurveTo(0, y + h * .02, x, y, x, y + h * .32); ctx.bezierCurveTo(x, y + h * .62, -w * .12, y + h * .78, 0, y + h);
			ctx.bezierCurveTo(w * .12, y + h * .78, x + w, y + h * .62, x + w, y + h * .32); ctx.bezierCurveTo(x + w, y, 0, y + h * .02, 0, y + h * .28); ctx.closePath(); return;
		}
		if (sh === 'star') {
			ctx.beginPath();
			for (var i = 0; i < 10; i++) { var rad = i % 2 ? .42 : 1, a2 = -Math.PI / 2 + i * Math.PI / 5; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a2) * w / 2 * rad, Math.sin(a2) * h / 2 * rad); }
			ctx.closePath(); return;
		}
		if (sh === 'scallop') {
			ctx.beginPath(); var n = Math.max(6, Math.round(w / 60)), s = w / n;
			ctx.moveTo(x, y + h);
			ctx.lineTo(x, y + s / 2);
			for (var j = 0; j < n; j++) ctx.arc(x + s * j + s / 2, y + s / 2, s / 2, Math.PI, 0);
			ctx.lineTo(x + w, y + h); ctx.closePath(); return;
		}
		rr(ctx, x, y, w, h, r || 0);
	}

	// ---------- animation ----------
	function anim(l, t) {
		var s = {dx: 0, dy: 0, rot: 0, sc: 1, op: 1, prog: 1, zoom: 1};
		var a = l.anim; if (!a || !a.a || t == null) return s;
		var d = a.d || 0, ph = (l.x + l.y) * .013, e;
		switch (a.a) {
			case 'float': s.dy = Math.sin(TAU * t / 2.5 + ph) * 14; break;
			case 'drift': s.dx = Math.sin(TAU * t / 5 + ph) * 18; s.dy = Math.cos(TAU * t / 5 + ph) * 10; break;
			case 'wiggle': s.rot = Math.sin(TAU * t / 1.25 + ph) * 7; break;
			case 'swing': s.rot = Math.sin(TAU * t / 2) * 9; break;
			case 'spin': s.rot = (t * 72) % 360; break;
			case 'pulse': s.sc = 1 + Math.sin(TAU * t / 1.2 + ph) * .06; break;
			case 'blink': s.op = (Math.floor(t * 2.4 + ph) % 2) ? .25 : 1; break;
			case 'pop': e = clamp((t - d) / .55, 0, 1); s.sc = e <= 0 ? 0 : back(e); s.op = e > 0 ? 1 : 0; break;
			case 'slide': e = ease(clamp((t - d) / .7, 0, 1)); s.dx = (1 - e) * -240; s.op = e; break;
			case 'rise': e = ease(clamp((t - d) / .7, 0, 1)); s.dy = (1 - e) * 160; s.op = e; break;
			case 'draw': s.prog = ease(clamp((t - d) / 1.8, 0, 1)); break;
			case 'type': s.prog = clamp((t - d) / 1.6, 0, 1); break;
			case 'zoom': s.zoom = 1 + .08 * (t / LOOP); break;
		}
		return s;
	}
	function animated(doc) { return doc.layers.some(function (l) { return l.anim && l.anim.a; }); }
	function slideAnimated(doc, i) {
		var x0 = i * W, x1 = x0 + W;
		return doc.layers.some(function (l) {
			if (!l.anim || !l.anim.a) return false;
			var r = Math.hypot(l.w, l.h) / 2 + 300;
			if (l.kind === 'path') return true;
			return l.x + r > x0 && l.x - r < x1;
		});
	}

	// ---------- photo placement ----------
	function cover(im, w, h, f) {
		f = f || {};
		var iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
		var k = Math.max(w / iw, h / ih) * (f.s || 1), dw = iw * k, dh = ih * k;
		var fx = f.ox == null ? .5 : f.ox, fy = f.oy == null ? .38 : f.oy;
		var x = clamp(w / 2 - fx * dw, w - dw, 0) - w / 2, y = clamp(h / 2 - fy * dh, h - dh, 0) - h / 2;
		return {x: x, y: y, w: dw, h: dh};
	}
	function filterFor(f) { return f === 'bw' ? 'grayscale(1) contrast(1.08)' : f === 'warm' ? 'sepia(.25) saturate(1.15) brightness(1.03)' : f === 'fade' ? 'contrast(.88) brightness(1.06) saturate(.85)' : f === 'cool' ? 'hue-rotate(-8deg) saturate(.9) brightness(1.04)' : 'none'; }

	// photo inner box for a frame, in layer-local coords (centre 0,0)
	function inner(l) {
		var w = l.w, h = l.h;
		if (l.frame === 'polaroid') { var p = w * .055; return {x: -w / 2 + p, y: -h / 2 + p, w: w - 2 * p, h: h - p - w * .2}; }
		if (l.frame === 'border') { var b = l.bw || 18; return {x: -w / 2 + b, y: -h / 2 + b, w: w - 2 * b, h: h - 2 * b}; }
		if (l.frame && /^camera/.test(l.frame)) { var m = (meta.stk[l.frame] || {}).screen || [.1, .3, .56, .4]; return {x: -w / 2 + m[0] * w, y: -h / 2 + m[1] * h, w: m[2] * w, h: m[3] * h}; }
		if (l.frame === 'phone') { var q = w * .045; return {x: -w / 2 + q, y: -h / 2 + q, w: w - 2 * q, h: h - 2 * q}; }
		if (l.frame === 'window') { var bar = Math.max(34, w * .07); return {x: -w / 2, y: -h / 2 + bar, w: w, h: h - bar}; }
		if (l.frame === 'music') { return {x: -w / 2 + w * .07, y: -h / 2 + w * .07, w: w * .86, h: w * .86}; }
		return {x: -w / 2, y: -h / 2, w: w, h: h};
	}

	// ---------- drawing pieces ----------
	function drawPhotoInto(ctx, doc, l, box, st, opts, cutOnly) {
		var src = l.src, im = src && (cutOnly ? ((opts.cuts && opts.cuts[src]) || (src.indexOf('ph/') === 0 ? img('cut/' + src.slice(3)) : null)) : img(src));
		if (!im) {
			if (cutOnly) return;
			ctx.fillStyle = col(doc, l.empty || '$soft') || 'rgba(0,0,0,.08)';
			ctx.fillRect(box.x, box.y, box.w, box.h);
			if (opts.mode === 'edit') {
				ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.font = '600 ' + Math.round(clamp(box.w * .07, 22, 44)) + 'px ' + FONTS.grotesk; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
				ctx.fillText(l.hint ? '+ ' + l.hint : '+ photo', box.x + box.w / 2, box.y + box.h / 2);
			}
			return;
		}
		var f = l.fit || {}, fz = {s: (f.s || 1) * st.zoom, ox: f.ox, oy: f.oy};
		var c = cover(img(src) || im, box.w, box.h, fz);
		ctx.save();
		ctx.translate(box.x + box.w / 2, box.y + box.h / 2);
		if (l.filter && l.filter !== 'none') ctx.filter = filterFor(l.filter);
		ctx.drawImage(im, c.x, c.y, c.w, c.h);
		ctx.restore();
	}
	function drawPhoto(ctx, doc, l, st, opts) {
		var w = l.w, h = l.h, fr = l.frame || 'none';
		if (l.shadow !== false && fr !== 'none' && !/^camera/.test(fr)) { ctx.shadowColor = 'rgba(30,20,10,.22)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 10; }
		if (fr === 'polaroid' || fr === 'border') { ctx.fillStyle = col(doc, l.paper || '#fbf8f2'); ctx.fillRect(-w / 2, -h / 2, w, h); }
		if (fr === 'phone') { ctx.fillStyle = '#111'; rr(ctx, -w / 2, -h / 2, w, h, w * .12); ctx.fill(); }
		if (fr === 'window') { ctx.fillStyle = '#fff'; rr(ctx, -w / 2, -h / 2, w, h, 18); ctx.fill(); }
		if (fr === 'music') { ctx.fillStyle = col(doc, l.card || '#f4f1ec'); rr(ctx, -w / 2, -h / 2, w, h, w * .07); ctx.fill(); }
		ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
		var b = inner(l);
		ctx.save();
		ctx.beginPath();
		if (fr === 'none') shapePath(ctx, l.shape, w, h, l.r || 0);
		else if (fr === 'phone') rr(ctx, b.x, b.y, b.w, b.h, w * .09);
		else if (fr === 'window') { ctx.rect(b.x, b.y, b.w, b.h); }
		else if (fr === 'music') rr(ctx, b.x, b.y, b.w, b.h, w * .04);
		else ctx.rect(b.x, b.y, b.w, b.h);
		ctx.clip();
		drawPhotoInto(ctx, doc, l, b, st, opts, false);
		ctx.restore();
		if (fr === 'none' && l.stroke) { ctx.lineWidth = l.stroke; ctx.strokeStyle = col(doc, l.strokeC || '#fff'); shapePath(ctx, l.shape, w, h, l.r || 0); ctx.stroke(); }
		if (fr === 'polaroid' && l.cap) { ctx.fillStyle = '#2b2620'; ctx.font = Math.round(w * .085) + 'px ' + FONTS.hand; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(l.cap, 0, h / 2 - w * .1); }
		if (fr === 'window') {
			var bar = b.y - (-h / 2);
			ctx.fillStyle = '#ececec'; ctx.save(); rr(ctx, -w / 2, -h / 2, w, bar + 18, 18); ctx.clip(); ctx.fillRect(-w / 2, -h / 2, w, bar); ctx.restore();
			['#ff5f57', '#febc2e', '#28c840'].forEach(function (c, i) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(-w / 2 + bar * .55 + i * bar * .55, -h / 2 + bar / 2, bar * .17, 0, TAU); ctx.fill(); });
			if (l.cap) { ctx.fillStyle = '#555'; ctx.font = '600 ' + Math.round(bar * .4) + 'px ' + FONTS.ios; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(l.cap, 0, -h / 2 + bar / 2); }
		}
		if (fr === 'music') drawMusic(ctx, doc, l, b);
		if (/^camera/.test(fr)) { var cam = img('stk/' + fr); if (cam) ctx.drawImage(cam, -w / 2, -h / 2, w, h); }
		if (l.tape) { var tp = img('stk/' + (l.tape === true ? 'washi' : l.tape)); if (tp) { ctx.save(); ctx.translate(0, -h / 2); ctx.rotate(-.06); var tw = w * .42; ctx.globalAlpha = .92; ctx.drawImage(tp, -tw / 2, -tw * .3, tw, tw * .6); ctx.restore(); } }
	}
	function drawMusic(ctx, doc, l, b) {
		var w = l.w, h = l.h, ink = col(doc, l.ink || '#1d1b18'), y = b.y + b.h + w * .07;
		ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = ink;
		ctx.font = '700 ' + Math.round(w * .075) + 'px ' + FONTS.ios; ctx.fillText(fit(ctx, l.title || 'Song name', b.w), b.x, y + w * .04);
		ctx.globalAlpha = .6; ctx.font = '400 ' + Math.round(w * .058) + 'px ' + FONTS.ios; ctx.fillText(fit(ctx, l.artist || 'Artist', b.w), b.x, y + w * .12); ctx.globalAlpha = 1;
		var py = y + w * .2; ctx.fillStyle = ink; ctx.globalAlpha = .2; rr(ctx, b.x, py, b.w, w * .018, w * .01); ctx.fill(); ctx.globalAlpha = 1; rr(ctx, b.x, py, b.w * (l.prog == null ? .38 : l.prog), w * .018, w * .01); ctx.fill();
		var cy = py + w * .13, s = w * .06;
		ctx.beginPath(); ctx.arc(0, cy, s * 1.25, 0, TAU); ctx.fill();
		ctx.fillStyle = col(doc, l.card || '#f4f1ec'); ctx.fillRect(-s * .42, cy - s * .55, s * .3, s * 1.1); ctx.fillRect(s * .12, cy - s * .55, s * .3, s * 1.1);
		ctx.fillStyle = ink;
		[-1, 1].forEach(function (d) { ctx.beginPath(); var x = d * w * .26; ctx.moveTo(x + d * -s * .5, cy - s * .55); ctx.lineTo(x + d * s * .35, cy); ctx.lineTo(x + d * -s * .5, cy + s * .55); ctx.fill(); ctx.fillRect(x + d * s * .4 - s * .06, cy - s * .55, s * .12, s * 1.1); });
	}
	function fit(ctx, t, max) { if (ctx.measureText(t).width <= max) return t; while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1); return t + '…'; }

	function textFont(l) { return (l.it ? 'italic ' : '') + (l.wt || 400) + ' ' + Math.round(l.size) + 'px ' + (FONTS[l.font] || FONTS.grotesk); }
	function wrap(ctx, text, max) {
		var out = [];
		String(text).split('\n').forEach(function (para) {
			var words = para.split(/(\s+)/), line = '';
			words.forEach(function (wd) {
				var test = line + wd;
				if (ctx.measureText(test.trim()).width > max && line.trim()) { out.push(line.trim()); line = wd.trim() + ''; }
				else line = test;
			});
			out.push(line.trim());
		});
		return out;
	}
	function drawText(ctx, doc, l, st) {
		var t = l.upper ? String(l.t || '').toUpperCase() : String(l.t || '');
		if (st.prog < 1 && l.anim && l.anim.a === 'type') t = t.slice(0, Math.floor(t.length * st.prog));
		ctx.font = textFont(l);
		if (ctx.letterSpacing !== undefined) ctx.letterSpacing = (l.ls || 0) + 'px';
		var color = col(doc, l.c || '#111');
		if (l.curve) return drawArcText(ctx, doc, l, t, color);
		var lines = wrap(ctx, t, l.w), lh = l.size * (l.lh || 1.12), total = lines.length * lh;
		var align = l.align || 'center', ax = align === 'left' ? -l.w / 2 : align === 'right' ? l.w / 2 : 0;
		ctx.textAlign = align; ctx.textBaseline = 'middle';
		if (l.bg) { // pill / label behind the words
			var widest = Math.max.apply(null, lines.map(function (s) { return ctx.measureText(s).width; })), pad = l.pad == null ? l.size * .45 : l.pad;
			var bw = Math.min(l.w + pad * 2, widest + pad * 2), bx = align === 'left' ? -l.w / 2 - pad : align === 'right' ? l.w / 2 - bw + pad : -bw / 2;
			ctx.fillStyle = col(doc, l.bg); rr(ctx, bx, -total / 2 - pad * .55, bw, total + pad * 1.1, l.br == null ? 10 : l.br); ctx.fill();
		}
		lines.forEach(function (s, i) {
			var y = -total / 2 + lh * (i + .5);
			if (l.mark) { var mw = ctx.measureText(s).width, mx = align === 'left' ? ax : align === 'right' ? ax - mw : -mw / 2; ctx.fillStyle = col(doc, l.mark); ctx.globalAlpha *= .9; ctx.fillRect(mx - 8, y - l.size * .05, mw + 16, l.size * .42); ctx.globalAlpha /= .9; }
			if (l.shadow) { ctx.fillStyle = col(doc, l.shadow); ctx.fillText(s, ax + l.size * .06, y + l.size * .07); }
			if (l.stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = l.stroke; ctx.strokeStyle = col(doc, l.strokeC || '#fff'); ctx.strokeText(s, ax, y); }
			ctx.fillStyle = color; ctx.fillText(s, ax, y);
		});
		if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '0px';
	}
	function drawArcText(ctx, doc, l, t, color) { // text along an arc: curve = degrees the whole line bends through (+ smile, - frown)
		var ang = l.curve * Math.PI / 180, chars = Array.from(t), widths = chars.map(function (c) { return ctx.measureText(c).width + (l.ls || 0); });
		var total = widths.reduce(function (a, b) { return a + b; }, 0), R = total / Math.abs(ang), dir = ang > 0 ? 1 : -1;
		ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
		var a = -total / 2;
		chars.forEach(function (c, i) {
			var mid = (a + widths[i] / 2) / R;
			ctx.save();
			ctx.translate(Math.sin(mid) * R, dir * (R - Math.cos(mid) * R) - 0);
			ctx.rotate(mid * dir);
			if (l.stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = l.stroke; ctx.strokeStyle = col(doc, l.strokeC || '#fff'); ctx.strokeText(c, 0, 0); }
			if (l.shadow) { ctx.fillStyle = col(doc, l.shadow); ctx.fillText(c, l.size * .05, l.size * .06); }
			ctx.fillStyle = color; ctx.fillText(c, 0, 0);
			ctx.restore();
			a += widths[i];
		});
	}
	function drawSticker(ctx, doc, l) {
		var im = img('stk/' + l.k); if (!im) return;
		if (l.hue) ctx.filter = 'hue-rotate(' + col(doc, l.hue) + 'deg)' + (l.sat ? ' saturate(' + l.sat + ')' : '');
		if (l.flip) ctx.scale(-1, 1);
		if (l.shadow) { ctx.shadowColor = 'rgba(30,20,10,.25)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 8; }
		ctx.drawImage(im, -l.w / 2, -l.h / 2, l.w, l.h);
	}
	function drawShape(ctx, doc, l) {
		ctx.fillStyle = col(doc, l.c || '#fff');
		if (l.tex) { var t = img('tex/' + l.tex); if (t) { var p = ctx.createPattern(t, 'repeat'); if (p) { if (p.setTransform) p.setTransform(new DOMMatrix().scale(l.texScale || .6)); ctx.fillStyle = p; } } }
		shapePath(ctx, l.sh, l.w, l.h, l.r || 0);
		if (l.c !== 'none') ctx.fill();
		if (l.line) { ctx.lineWidth = l.line; ctx.strokeStyle = col(doc, l.lineC || '#000'); if (l.dash) ctx.setLineDash(l.dash); ctx.stroke(); ctx.setLineDash([]); }
	}
	function drawPath(ctx, doc, l, st) { // dotted flight path through pts (strip coords), with a small plane at the end
		var pts = l.pts; if (!pts || pts.length < 2) return;
		var acc = [0];
		for (var i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
		var len = acc[acc.length - 1] * st.prog;
		ctx.strokeStyle = col(doc, l.c || '#fff'); ctx.lineWidth = l.lw || 5; ctx.lineCap = 'round'; ctx.setLineDash(l.dash || [2, 16]);
		ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
		var end = pts[0], ang = 0;
		for (var j = 1; j < pts.length; j++) {
			if (acc[j] <= len) { ctx.lineTo(pts[j][0], pts[j][1]); end = pts[j]; ang = Math.atan2(pts[j][1] - pts[j - 1][1], pts[j][0] - pts[j - 1][0]); }
			else { var k = (len - acc[j - 1]) / (acc[j] - acc[j - 1]); end = [pts[j - 1][0] + (pts[j][0] - pts[j - 1][0]) * k, pts[j - 1][1] + (pts[j][1] - pts[j - 1][1]) * k]; ang = Math.atan2(pts[j][1] - pts[j - 1][1], pts[j][0] - pts[j - 1][0]); ctx.lineTo(end[0], end[1]); break; }
		}
		ctx.stroke(); ctx.setLineDash([]);
		if (l.plane !== false) {
			ctx.save(); ctx.translate(end[0], end[1]); ctx.rotate(ang);
			var s = (l.lw || 5) * 5; ctx.fillStyle = col(doc, l.pc || l.c || '#fff');
			ctx.beginPath(); ctx.arc(0, 0, s * 1.3, 0, TAU); ctx.fillStyle = col(doc, l.pbg || 'rgba(0,0,0,.35)'); ctx.fill();
			ctx.fillStyle = col(doc, l.pc || l.c || '#fff');
			ctx.beginPath(); ctx.moveTo(s * .95, 0); ctx.lineTo(-s * .2, -s * .12); ctx.lineTo(-s * .45, -s * .85); ctx.lineTo(-s * .62, -s * .85); ctx.lineTo(-s * .45, -s * .12); ctx.lineTo(-s * .8, -s * .1); ctx.lineTo(-s * .95, -s * .38); ctx.lineTo(-s * 1.05, -s * .38); ctx.lineTo(-s * .98, 0);
			ctx.lineTo(-s * 1.05, s * .38); ctx.lineTo(-s * .95, s * .38); ctx.lineTo(-s * .8, s * .1); ctx.lineTo(-s * .45, s * .12); ctx.lineTo(-s * .62, s * .85); ctx.lineTo(-s * .45, s * .85); ctx.lineTo(-s * .2, s * .12); ctx.closePath(); ctx.fill();
			ctx.restore();
		}
	}
	function drawUI(ctx, doc, l) {
		var w = l.w, h = l.h, u = l.ui;
		if (u === 'bubble') {
			var me = l.side !== 'them', bg = col(doc, l.bg || (me ? '#1f8bff' : '#e9e9eb')), fg = col(doc, l.c || (me ? '#fff' : '#111'));
			ctx.fillStyle = bg; rr(ctx, -w / 2, -h / 2, w, h, Math.min(h / 2, 46)); ctx.fill();
			ctx.beginPath(); var tx = me ? w / 2 - 12 : -w / 2 + 12; ctx.moveTo(tx, h / 2 - 22); ctx.quadraticCurveTo(tx + (me ? 26 : -26), h / 2 + 4, tx + (me ? 30 : -30), h / 2 + 2); ctx.quadraticCurveTo(tx + (me ? 6 : -6), h / 2 + 2, tx - (me ? 14 : -14), h / 2 - 4); ctx.fill();
			ctx.fillStyle = fg; ctx.font = '500 ' + Math.round(l.size || h * .42) + 'px ' + FONTS.ios; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(fit(ctx, l.t || '', w - 40), 0, 2);
			return;
		}
		if (u === 'pin') {
			ctx.fillStyle = col(doc, l.bg || '#fff'); ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowBlur = 16; rr(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.fill(); ctx.shadowBlur = 0;
			var px = -w / 2 + h * .55; ctx.fillStyle = col(doc, l.ic || '#e5383b');
			ctx.beginPath(); ctx.arc(px, -h * .06, h * .2, Math.PI * .85, Math.PI * .15); ctx.lineTo(px, h * .3); ctx.closePath(); ctx.fill();
			ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px, -h * .06, h * .08, 0, TAU); ctx.fill();
			ctx.fillStyle = col(doc, l.c || '#111'); ctx.font = '600 ' + Math.round(h * .4) + 'px ' + FONTS.ios; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(fit(ctx, l.t || '', w - h * 1.2), px + h * .38, 2);
			return;
		}
		if (u === 'album') { // Photos-app style header: big title, small count, over a soft dark fade
			ctx.fillStyle = col(doc, l.c || '#fff'); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
			ctx.font = '700 ' + Math.round(h * .42) + 'px ' + FONTS.ios; ctx.fillText(l.t || 'Favourites', -w / 2, h * .08);
			ctx.globalAlpha = .85; ctx.font = '500 ' + Math.round(h * .2) + 'px ' + FONTS.ios; ctx.fillText((l.sub || '30 items'), -w / 2 + h * .3, h * .42);
			ctx.lineWidth = h * .035; ctx.strokeStyle = ctx.fillStyle; ctx.strokeRect(-w / 2, h * .27, h * .2, h * .16); ctx.globalAlpha = 1;
			return;
		}
		if (u === 'note') { // lined paper note, handwritten
			ctx.fillStyle = col(doc, l.bg || '#fffdf6'); ctx.shadowColor = 'rgba(30,20,10,.2)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
			ctx.strokeStyle = 'rgba(80,120,200,.25)'; ctx.lineWidth = 2; var lh = Math.max(34, (l.size || 40) * 1.25);
			for (var y = -h / 2 + lh * 1.2; y < h / 2 - 8; y += lh) { ctx.beginPath(); ctx.moveTo(-w / 2 + 16, y); ctx.lineTo(w / 2 - 16, y); ctx.stroke(); }
			ctx.fillStyle = col(doc, l.c || '#2b2620'); ctx.font = (l.size || 40) + 'px ' + FONTS.hand; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
			wrap(ctx, l.t || '', w - 48).forEach(function (s, i) { ctx.fillText(s, -w / 2 + 24, -h / 2 + lh * (1.2 + i) - 6); });
			return;
		}
		if (u === 'label') { // typed strip label
			ctx.fillStyle = col(doc, l.bg || '#f3efe6'); ctx.fillRect(-w / 2, -h / 2, w, h);
			ctx.fillStyle = col(doc, l.c || '#1b2a4a'); ctx.font = Math.round(l.size || h * .5) + 'px ' + FONTS.type; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(fit(ctx, l.t || '', w - 24), 0, 2);
			return;
		}
		if (u === 'notif') {
			ctx.fillStyle = col(doc, l.bg || 'rgba(245,245,247,.94)'); ctx.shadowColor = 'rgba(0,0,0,.2)'; ctx.shadowBlur = 24; rr(ctx, -w / 2, -h / 2, w, h, 34); ctx.fill(); ctx.shadowBlur = 0;
			var ic = h * .42; ctx.fillStyle = col(doc, l.ic || '#ff2d55'); rr(ctx, -w / 2 + h * .2, -ic / 2, ic, ic, ic * .24); ctx.fill();
			ctx.fillStyle = '#111'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
			ctx.font = '700 ' + Math.round(h * .2) + 'px ' + FONTS.ios; ctx.fillText(fit(ctx, l.title || 'Photos', w - ic - h * .6), -w / 2 + h * .3 + ic, -h * .04);
			ctx.font = '400 ' + Math.round(h * .19) + 'px ' + FONTS.ios; ctx.fillStyle = '#333'; ctx.fillText(fit(ctx, l.t || '', w - ic - h * .6), -w / 2 + h * .3 + ic, h * .24);
			return;
		}
		if (u === 'search') {
			ctx.fillStyle = col(doc, l.bg || '#fff'); ctx.shadowColor = 'rgba(0,0,0,.15)'; ctx.shadowBlur = 16; rr(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.fill(); ctx.shadowBlur = 0;
			ctx.strokeStyle = '#777'; ctx.lineWidth = h * .07; ctx.beginPath(); ctx.arc(-w / 2 + h * .52, -h * .04, h * .16, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-w / 2 + h * .64, h * .08); ctx.lineTo(-w / 2 + h * .74, h * .18); ctx.stroke();
			ctx.fillStyle = col(doc, l.c || '#222'); ctx.font = '500 ' + Math.round(h * .36) + 'px ' + FONTS.ios; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(fit(ctx, l.t || '', w - h * 1.2), -w / 2 + h * .95, 2);
			return;
		}
		if (u === 'like') { // heart + count chip
			ctx.fillStyle = col(doc, l.bg || '#fff'); rr(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.fill();
			ctx.save(); ctx.translate(-w / 2 + h * .55, 0); ctx.fillStyle = '#ff3040'; shapePath(ctx, 'heart', h * .5, h * .46); ctx.fill(); ctx.restore();
			ctx.fillStyle = '#111'; ctx.font = '700 ' + Math.round(h * .38) + 'px ' + FONTS.ios; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(l.t || '1,204', -w / 2 + h * .95, 2);
		}
	}

	// ---------- background ----------
	function drawBg(ctx, doc, b, x0, w, H) {
		if (!b) return;
		if (b.c) { ctx.fillStyle = col(doc, b.c); ctx.fillRect(x0, 0, w, H); }
		if (b.grad) { var g = ctx.createLinearGradient(x0, 0, x0, H); b.grad.forEach(function (s, i) { g.addColorStop(i / (b.grad.length - 1), col(doc, s)); }); ctx.fillStyle = g; ctx.fillRect(x0, 0, w, H); }
		if (b.tex) {
			var t = img('tex/' + b.tex);
			if (t) { var p = ctx.createPattern(t, 'repeat'); if (p) { var sc = b.scale || 1; if (p.setTransform) p.setTransform(new DOMMatrix().scale(sc)); ctx.fillStyle = p; ctx.fillRect(x0, 0, w, H); } }
			if (b.tint) { ctx.fillStyle = col(doc, b.tint); ctx.fillRect(x0, 0, w, H); }
		}
		if (b.src) { var im = img(b.src); if (im) { var c = cover(im, w, H, b.fit); ctx.drawImage(im, x0 + w / 2 + c.x, H / 2 + c.y, c.w, c.h); } }
		if (b.lines) { ctx.strokeStyle = col(doc, b.lines); ctx.lineWidth = 2; for (var x = x0 - (x0 % 54) + 54; x < x0 + w; x += 54) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); } }
		if (b.dots) { ctx.fillStyle = col(doc, b.dots); for (var yy = 30; yy < H; yy += 60) for (var xx = x0 - (x0 % 60) + ((yy / 60) % 2 ? 30 : 0); xx < x0 + w + 60; xx += 60) { ctx.beginPath(); ctx.arc(xx, yy, 5, 0, TAU); ctx.fill(); } }
	}

	// ---------- the whole thing ----------
	// opts: {x0 (strip x of the left edge), vw (strip width shown), t (seconds, null = finished still), mode: edit|export|thumb, cuts {src: canvas}, sel}
	function render(ctx, doc, opts) {
		opts = opts || {};
		var H = doc.H, x0 = opts.x0 || 0, vw = opts.vw || doc.n * W, t = opts.t == null ? null : opts.t;
		ctx.save();
		ctx.translate(-x0, 0);
		drawBg(ctx, doc, doc.bg, x0, vw, H);
		(doc.slideBg || []).forEach(function (b, i) { if (b && i * W < x0 + vw && (i + 1) * W > x0) drawBg(ctx, doc, b, i * W, W, H); });
		var byId = {};
		doc.layers.forEach(function (l) { byId[l.id] = l; });
		doc.layers.forEach(function (l) {
			if (l.hidden) return;
			var st = anim(l, t);
			if (st.op <= 0 || st.sc <= 0) return;
			if (l.kind === 'path') { ctx.save(); ctx.globalAlpha = l.op == null ? 1 : l.op; drawPath(ctx, doc, l, st); ctx.restore(); return; }
			var p = l.kind === 'cut' ? byId[l.of] : l;
			if (!p) return;
			var R = Math.hypot(p.w, p.h) / 2 + 400;
			if (p.x + R < x0 || p.x - R > x0 + vw) return;
			var ps = l.kind === 'cut' ? anim(p, t) : st;
			ctx.save();
			ctx.globalAlpha = (l.op == null ? 1 : l.op) * st.op;
			ctx.translate(p.x + ps.dx, p.y + ps.dy);
			ctx.rotate(((p.rot || 0) + ps.rot) * Math.PI / 180);
			ctx.scale(ps.sc, ps.sc);
			if (l.kind === 'photo') drawPhoto(ctx, doc, l, st, opts);
			else if (l.kind === 'cut') { var b = inner(p), e = l.ext || {t: .25, b: 0, l: .1, r: .1}; ctx.beginPath(); ctx.rect(b.x - b.w * e.l, b.y - b.h * e.t, b.w * (1 + e.l + e.r), b.h * (1 + e.t + e.b)); ctx.clip(); drawPhotoInto(ctx, doc, p, b, ps, opts, true); }
			else if (l.kind === 'text') drawText(ctx, doc, l, st);
			else if (l.kind === 'sticker') drawSticker(ctx, doc, l);
			else if (l.kind === 'shape') drawShape(ctx, doc, l);
			else if (l.kind === 'ui') drawUI(ctx, doc, l);
			ctx.restore();
		});
		ctx.restore();
	}

	// ---------- geometry for the editor ----------
	function local(l, x, y) { var a = -(l.rot || 0) * Math.PI / 180, dx = x - l.x, dy = y - l.y; return {x: dx * Math.cos(a) - dy * Math.sin(a), y: dx * Math.sin(a) + dy * Math.cos(a)}; }
	function hit(doc, x, y) {
		for (var i = doc.layers.length - 1; i >= 0; i--) {
			var l = doc.layers[i];
			if (l.hidden || l.lock || l.kind === 'cut') continue;
			if (l.kind === 'path') { if (l.pts.some(function (p) { return Math.hypot(p[0] - x, p[1] - y) < 40; })) return l; continue; }
			var p = local(l, x, y), pad = 14;
			if (Math.abs(p.x) <= l.w / 2 + pad && Math.abs(p.y) <= l.h / 2 + pad) return l;
		}
		return null;
	}
	function corners(l) {
		var a = (l.rot || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
		return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(function (k) { var x = k[0] * l.w / 2, y = k[1] * l.h / 2; return [l.x + x * c - y * s, l.y + x * s + y * c]; });
	}

	root.CarouselEngine = {W: W, LOOP: LOOP, FONTS: FONTS, FONT_CSS: FONT_CSS, meta: meta, render: render, hit: hit, local: local, corners: corners, img: img, url: url, preload: preload, docAssets: docAssets, fontsReady: fontsReady, animated: animated, slideAnimated: slideAnimated, inner: inner, cover: cover, col: col, rr: rr,
		setMeta: function (m) { meta.stk = m.stk || {}; meta.nat = m.nat || {}; }};
})(window);
