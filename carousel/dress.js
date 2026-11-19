/* Busy Fox Creator Connect — template dressing.
   Every template gets a little more life after it is built: a piece of tape on each framed photo and stickers in the
   empty corners of each slide, picked to suit the template's family. They are ordinary stickers, so she can move or
   delete any of them. Stickers are our own (Higgsfield, made for Busy Fox). */
(function (root) {
	'use strict';
	var E = root.CarouselEngine, W = 1080;
	var POOL = {
		y2k: ['sparkles-gold', 'doodle-hearts', 'chrome-star', 'cherries', 'location-pin', 'headphones', 'pink-scooty', 'puffy-heart'],
		seamless: ['sparkles-gold', 'cloud', 'location-pin', 'butterfly', 'doodle-hearts', 'music-notes'],
		phone: ['sparkles-gold', 'headphones', 'music-notes', 'location-pin', 'cloud', 'iced-latte'],
		telugu: ['jasmine', 'anklet', 'sparkles-gold', 'jhumka', 'filter-coffee', 'pearls', 'parrot-green', 'lotus-bud'],
		cinema: ['music-notes', 'sparkles-gold', 'ticket', 'doodle-hearts', 'headphones'],
		village: ['chai-glass', 'auto-rickshaw', 'kite', 'parrot-green', 'filter-coffee', 'sparkles-gold', 'eucalyptus'],
		festival: ['sparkles-gold', 'jasmine', 'diya', 'lotus-bud', 'pearls', 'filter-coffee'],
		soft: ['peony', 'tulips', 'babys-breath', 'pearls', 'perfume', 'crescent-moon', 'white-bow', 'sparkles-gold'],
		diary: ['envelope', 'scallop-tag', 'eucalyptus', 'lipstick', 'doodle-hearts', 'pressed-flower', 'peony', 'chai-glass'],
		patterns: ['babys-breath', 'eucalyptus', 'butterfly', 'sparkles-gold', 'tulips', 'white-butterfly']
	};
	var TAPE = {soft: ['washi-floral', 'washi-gingham'], diary: ['washi-floral', 'clear-tape', 'washi-gingham'], y2k: ['washi-gingham', 'clear-tape'], telugu: ['washi-floral', 'clear-tape'], festival: ['washi-floral', 'clear-tape'], village: ['clear-tape', 'washi'], cinema: ['clear-tape'], patterns: ['washi-floral', 'clear-tape']};
	var FRAMED = /^(polaroid|border|soft|stamp)$/;
	var SPOTS = [[.13, .1], [.87, .1], [.13, .9], [.87, .9], [.5, .07], [.5, .93], [.09, .5], [.91, .5]];

	function ar(k) { return ((E.meta.stk || {})[k] || {}).ar || 1; }
	function has(k) { return !!((E.meta.stk || {})[k]); }
	function box(l) { return {x0: l.x - l.w / 2, x1: l.x + l.w / 2, y0: l.y - l.h / 2, y1: l.y + l.h / 2}; }
	function over(a, b) { return Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0)); }
	function seed(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return function () { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; }; }

	function dress(d, t) {
		if (!d || !d.layers || t.noDress) return d;
		var fam = t.family || 'soft', pool = (POOL[fam] || POOL.soft).filter(has), tapes = (TAPE[fam] || ['clear-tape', 'washi-floral']).filter(has), H = d.H || 1350;
		var rnd = seed(t.id + (d.variant || '')), n = 0, add = [];
		var mk = function (k, x, y, w, o) { o = o || {}; var l = {kind: 'sticker', id: 'z' + (++n).toString(36), k: k, x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(w / ar(k)), rot: o.rot || 0, dress: true}; if (o.anim) l.anim = o.anim; add.push(l); return l; };
		var stickers = d.layers.filter(function (l) { return l.kind === 'sticker' || l.kind === 'text' || l.kind === 'ui'; });

		// 1 · tape on framed photos that do not already have a clip, bow or tape at their top edge
		var ti = 0;
		d.layers.forEach(function (l) {
			if (l.kind !== 'photo' || !FRAMED.test(l.frame || '') || l.w > W * .9 || !tapes.length) return;
			var top = {x0: l.x - l.w * .3, x1: l.x + l.w * .3, y0: l.y - l.h / 2 - 70, y1: l.y - l.h / 2 + 70};
			if (stickers.some(function (s) { return s.kind === 'sticker' && over(box(s), top) > 0; })) return;
			var k = tapes[ti++ % tapes.length], w = Math.max(150, Math.min(260, l.w * .34)), r = (l.rot || 0) + (rnd() - .5) * 16;
			var clear = function (b) { return !stickers.some(function (s) { return s.kind === 'text' && over(box(s), b) > 0; }); };
			var cl = {x0: l.x - l.w / 2 - w * .3, x1: l.x - l.w / 2 + w * .6, y0: l.y - l.h / 2 - w * .3, y1: l.y - l.h / 2 + w * .4};
			var cr = {x0: l.x + l.w / 2 - w * .6, x1: l.x + l.w / 2 + w * .3, y0: cl.y0, y1: cl.y1};
			if (ti % 3 !== 0 && clear(top)) mk(k, l.x, l.y - l.h / 2 + 4, w, {rot: r});
			else if (clear(cl)) mk(k, l.x - l.w / 2 + w * .22, l.y - l.h / 2 + w * .12, w * .8, {rot: -38 + (l.rot || 0)}); // a diagonal corner piece
			else if (clear(cr)) mk(k, l.x + l.w / 2 - w * .22, l.y - l.h / 2 + w * .12, w * .8, {rot: 38 + (l.rot || 0)});
		});

		// 2 · stickers in the empty corners of each slide
		var pi = Math.floor(rnd() * pool.length), anims = [{a: 'float'}, {a: 'wiggle'}, null];
		for (var i = 0; i < d.n && pool.length; i++) {
			var x0 = i * W, on = function (l) { return l.x >= x0 && l.x < x0 + W; };
			var mine = d.layers.filter(on), pics = mine.filter(function (l) { return l.kind === 'photo' && !(l.w >= W * .85 && l.h >= H * .6); });
			var bleed = mine.some(function (l) { return l.kind === 'photo' && l.w >= W * .85 && l.h >= H * .6; });
			var solid = mine.filter(function (l) { return (l.kind === 'sticker' || l.kind === 'text' || l.kind === 'ui' || l.kind === 'cut') && l.w < W * .9; }).concat(add.filter(on));
			var own = mine.filter(function (l) { return l.kind === 'sticker' && l.w < W * .7; }).length;
			var cover = pics.concat(solid).reduce(function (s, l) { return s + Math.min(l.w, W) * Math.min(l.h, H); }, 0) / (W * H);
			var want = Math.max(0, (bleed ? 2 : cover < .45 ? 3 : 2) - own);
			var picked = [];
			var cands = SPOTS.map(function (p) {
				var size = bleed ? 230 : 270, cx = x0 + p[0] * W, cy = p[1] * H, b = {x0: cx - size / 2, x1: cx + size / 2, y0: cy - size / 2, y1: cy + size / 2};
				var hit = solid.reduce(function (s, l) { return s + over(box(l), b); }, 0), ph = pics.reduce(function (s, l) { return s + over(box(l), b); }, 0);
				return {cx: cx, cy: cy, size: size, hit: hit, score: hit * 4 + ph + rnd() * 900};
			}).filter(function (c) { return c.hit < c.size * c.size * .12; }).sort(function (a, b) { return a.score - b.score; });
			for (var c = 0; c < cands.length && picked.length < want; c++) {
				var q = cands[c];
				if (picked.some(function (p) { return Math.hypot(p.cx - q.cx, p.cy - q.cy) < 420; })) continue;
				picked.push(q);
				var k = pool[pi++ % pool.length], w = q.size * (ar(k) > 1.6 ? 1.35 : 1);
				mk(k, Math.min(Math.max(q.cx, x0 + w / 2 + 10), x0 + W - w / 2 - 10), q.cy, w, {rot: Math.round((rnd() - .5) * 26), anim: anims[picked.length % 3]});
			}
		}
		d.layers = d.layers.concat(add);
		return d;
	}
	root.CarouselDress = dress;
})(window);
