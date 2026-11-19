/* Busy Fox Creator Connect — carousel templates (round 2).
   Each template makes a fresh document (see engine.js). Sample photos (ph/…) are placeholders she replaces; every
   piece can be moved, resized, turned, re-coloured or deleted. Families: y2k · seamless · phone · telugu · patterns.
   Our own designs in the styles creators asked for; no other creator's artwork is copied. */
(function (root) {
	'use strict';
	var E = root.CarouselEngine, W = 1080;
	var X = function (i, dx) { return i * W + 540 + (dx || 0); };
	var uid = 0;
	function B(H) { // builder
		var L = [];
		function add(kind, o) { o.kind = kind; o.id = o.id || kind.charAt(0) + (++uid).toString(36); o.rot = o.rot || 0; L.push(o); return o; }
		return {
			L: L,
			photo: function (x, y, w, h, src, o) { o = o || {}; o.x = x; o.y = y; o.w = w; o.h = h; o.src = src; o.fit = o.fit || {s: 1}; return add('photo', o); },
			cut: function (of, o) { o = o || {}; o.of = of.id; o.hint = 'Foxy cut-out'; return add('cut', o); },
			text: function (x, y, w, t, size, font, o) { o = o || {}; o.x = x; o.y = y; o.w = w; o.t = t; o.size = size; o.font = font;
				var lines = String(t).split('\n').length; o.h = o.h || Math.round(size * (o.lh || 1.12) * lines + (o.bg ? size * .6 : 0) + (o.curve ? size * 1.4 : 0)); return add('text', o); },
			stk: function (k, x, y, w, o) { o = o || {}; var ar = (E.meta.stk[k] || {}).ar || 1; o.k = k; o.x = x; o.y = y; o.w = w; o.h = o.h || Math.round(w / ar); return add('sticker', o); },
			shape: function (sh, x, y, w, h, c, o) { o = o || {}; o.sh = sh; o.x = x; o.y = y; o.w = w; o.h = h; o.c = c; return add('shape', o); },
			ui: function (ui, x, y, w, h, o) { o = o || {}; o.ui = ui; o.x = x; o.y = y; o.w = w; o.h = h; return add('ui', o); },
			path: function (pts, o) { o = o || {}; o.pts = pts; var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
				o.x = (Math.min.apply(null, xs) + Math.max.apply(null, xs)) / 2; o.y = (Math.min.apply(null, ys) + Math.max.apply(null, ys)) / 2; o.w = Math.max.apply(null, xs) - Math.min.apply(null, xs); o.h = Math.max.apply(null, ys) - Math.min.apply(null, ys); return add('path', o); }
		};
	}
	function doc(t, v, n, bg, slideBg, L, extra) {
		var d = {v: 2, tpl: t.id, name: t.name, variant: v && v.key, n: n, H: 1350, vars: Object.assign({}, t.vars || {}, v || {}), bg: bg, slideBg: slideBg || [], layers: L};
		return Object.assign(d, extra || {});
	}
	var F = {float: {a: 'float'}, wig: {a: 'wiggle'}, pop: function (d) { return {a: 'pop', d: d || 0}; }, rise: function (d) { return {a: 'rise', d: d || 0}; }, slide: function (d) { return {a: 'slide', d: d || 0}; }, draw: {a: 'draw'}, type: function (d) { return {a: 'type', d: d || 0}; }, zoom: {a: 'zoom'}, spin: {a: 'spin'}, pulse: {a: 'pulse'}, swing: {a: 'swing'}, drift: {a: 'drift'}};

	var T = [];

	/* 2 ─ SCRAPBOOK MONTH · y2k · spiral notebook, polaroids, binder clips, a denim pocket */
	T.push({id: 'scrapbook', name: 'Scrapbook Month', family: 'y2k', blurb: 'Spiral notebook pages, polaroids, clips, pocket and notes',
		make: function () {
			var b = B(), pages = [{tex: 'grid-paper'}, {tex: 'grass', scale: .8}, {tex: 'grid-paper'}, {tex: 'yellow-stripe'}, {tex: 'grass', scale: .8}];
			for (var i = 0; i < 5; i++) b.stk('spiral', X(i, -490), 675, 110, {h: 1300});
			// cover
			b.photo(X(0, 40), 640, 760, 900, 'ph/y2k-swing', {frame: 'polaroid', rot: -3, cap: 'monthly recap', hint: 'portrait'});
			b.stk('binder-clip', X(0, 40), 170, 170, {rot: 4});
			b.text(X(0, 0), 1200, 820, 'Monthly\nrecap', 120, 'chunky', {wt: 800, c: '#1d1b18', mark: '$c1', lh: .95, rot: -3, anim: F.pop(.2)});
			b.stk('chrome-star', X(0, 400), 1050, 150, {anim: F.spin});
			// 2
			b.photo(X(1, -120), 430, 560, 660, 'ph/r1-flowers', {frame: 'polaroid', rot: -6, hint: 'any'});
			b.photo(X(1, 170), 900, 600, 700, 'ph/r1-latte', {frame: 'polaroid', rot: 5, hint: 'any'});
			b.stk('binder-clip', X(1, -120), 105, 140, {rot: -8});
			b.ui('note', X(1, 270), 300, 380, 330, {t: 'little things\nthat made\nthis month', size: 46, rot: 6});
			// 3
			b.photo(X(2, 10), 560, 840, 620, 'ph/y2k-red', {frame: 'border', bw: 22, rot: 2, hint: 'any'});
			b.photo(X(2, 150), 1050, 460, 420, 'ph/r1-brunch', {hint: 'food', rot: -8});
			b.stk('denim-pocket', X(2, 150), 1130, 520, {});
			b.stk('cherries', X(2, -330), 1110, 190, {rot: -12, anim: F.wig});
			b.text(X(2, -230), 140, 520, 'favourite dinner', 58, 'hand', {wt: 700, c: '#1d1b18', rot: -4});
			// 4
			b.photo(X(3, -130), 500, 600, 720, 'ph/cafe-pink', {frame: 'polaroid', rot: -4, hint: 'portrait'});
			b.photo(X(3, 230), 980, 520, 600, 'ph/r1-dessert', {frame: 'polaroid', rot: 7, hint: 'food'});
			b.stk('sticky-note', X(3, 260), 330, 300, {rot: 8});
			b.text(X(3, 260), 330, 240, 'café\nhopping\nera', 50, 'hand', {wt: 700, c: '#2b2620', rot: 8});
			b.stk('gingham-bow', X(3, -300), 170, 170, {rot: -15, anim: F.swing});
			// 5
			b.photo(X(4), 620, 820, 980, 'ph/r1-walk', {frame: 'polaroid', rot: 2, cap: 'onto the next', hint: 'portrait'});
			b.stk('puffy-heart', X(4, 360), 220, 170, {anim: F.pulse});
			b.text(X(4), 1240, 860, 'Comment your favourite slide', 50, 'grotesk', {wt: 600, c: '#1d1b18', bg: '#fff', br: 40});
			return doc(this, null, 5, {c: '#f4f1ea'}, pages, b.L);
		}, vars: {c1: '#f2d74e'}});

	/* 3 ─ SUMMER-MAXXING · seamless · one long bendy word across all five slides, photos sitting across the seams */
	T.push({id: 'summer-maxx', name: 'Summer-maxxing', family: 'seamless', blurb: 'One long word that bends across every slide; photos sit over the joins',
		make: function () {
			var b = B();
			b.photo(X(0, -150), 420, 640, 760, 'ph/sum-icecream', {rot: -4, stroke: 14, hint: 'portrait'});
			b.photo(X(0, 300), 980, 620, 700, 'ph/r1-pool', {rot: 5, stroke: 14, hint: 'any'});
			b.photo(X(1, 230), 420, 700, 560, 'ph/r1-breakfast', {rot: -3, stroke: 14, hint: 'food'});
			b.photo(X(1, 120), 1040, 560, 520, 'ph/r1-latte', {rot: 6, stroke: 14, hint: 'any'});
			b.photo(X(2, 260), 650, 760, 900, 'ph/r1-beach', {rot: 3, stroke: 14, hint: 'portrait'});
			b.photo(X(3, 250), 380, 660, 520, 'ph/r1-rooftop', {rot: -5, stroke: 14, hint: 'any'});
			b.photo(X(3, 60), 1030, 600, 560, 'ph/r1-brunch', {rot: 4, stroke: 14, hint: 'food'});
			b.photo(X(4, 120), 700, 780, 1000, 'ph/sum-sea', {rot: -2, stroke: 14, hint: 'portrait'});
			var tx = {font: 'bubble', c: '#fff', shadow: '$c2', stroke: 0};
			b.text(X(0, -260), 170, 360, 'sum', 150, 'bubble', Object.assign({rot: -8, anim: F.pop(0)}, tx));
			b.text(X(0, 640), 260, 1300, 'eeeeeeeeeeeeeeee', 150, 'bubble', Object.assign({curve: 34, anim: F.type(.3)}, tx));
			b.text(X(2, -80), 300, 1500, 'eeeeeeeeeeeeeeeeeeee', 150, 'bubble', Object.assign({curve: -30, anim: F.type(.6)}, tx));
			b.text(X(3, 420), 220, 1200, 'eeeeeeeeeeeeeeeeer', 150, 'bubble', Object.assign({curve: 28, anim: F.type(.9)}, tx));
			b.text(X(4, 40), 330, 820, 'maxxing', 140, 'chunky', Object.assign({wt: 800, rot: -4, upper: true, ls: 6, anim: F.pop(1.4)}, tx));
			b.stk('cherries', X(1, -420), 1220, 170, {anim: F.wig});
			b.stk('sunflower', X(2, 480), 1220, 200, {anim: F.spin});
			b.stk('butterfly', X(4, -360), 1200, 200, {anim: F.float});
			return doc(this, null, 5, {grad: ['$c1', '$c3']}, [], b.L);
		}, vars: {c1: '#9fd3f0', c2: '#e2711d', c3: '#fde6b8'}});

	/* 4 ─ MY CORE · seamless · flight path across the slides, words behind her (Foxy cut-out), music card, scrapbook pages */
	T.push({id: 'my-core', name: 'My Core', family: 'seamless', blurb: 'A dotted flight path joins the slides; Foxy cuts you out so words sit behind you',
		make: function () {
			var b = B();
			var p1 = b.photo(X(0), 675, W, 1350, 'ph/core-eyes', {hint: 'full-length portrait', fit: {s: 1, oy: .3}});
			b.text(X(0, 230), 300, 300, 'My', 120, 'chunky', {wt: 800, c: '#fff', shadow: 'rgba(0,0,0,.25)'});
			b.text(X(0, 190), 450, 640, 'Core', 230, 'chunky', {wt: 800, c: '#fff', shadow: 'rgba(0,0,0,.25)', anim: F.rise(.2)});
			b.cut(p1, {ext: {t: .02, b: 0, l: 0, r: 0}});
			var p2 = b.photo(X(1), 675, W, 1350, 'ph/core-stand', {hint: 'full-length portrait', fit: {s: 1, oy: .3}});
			b.photo(X(1, 290), 360, 300, 480, 'ph/r1-flowers', {frame: 'music', title: 'Our song', artist: 'Your favourite artist', hint: 'any', rot: 4, anim: F.float});
			b.path([[X(1, 290), 610], [X(1, 200), 720], [X(1, 60), 700], [X(1, -10), 560], [X(1, -20), 420]], {c: '#fff', lw: 6, dash: [], plane: false});
			// slide 3: scrapbook page on plaid
			b.stk('lace', X(2, -330), 675, 170, {h: 1350});
			b.photo(X(2, 40), 420, 520, 600, 'ph/core-stand', {frame: 'polaroid', paper: '$c1', rot: -4, hint: 'portrait'});
			b.stk('gingham-bow', X(2, -170), 150, 150, {rot: -18, anim: F.swing});
			b.photo(X(2, 200), 1020, 520, 560, 'ph/core-eyes', {frame: 'border', bw: 14, rot: 5, hint: 'portrait'});
			b.stk('binder-clip', X(2, 200), 760, 130, {rot: 6});
			b.text(X(2, 330), 330, 360, 'Think\nDifferent', 92, 'script', {c: '#fff', rot: -8, lh: 1});
			// slide 4: photo + note + label
			b.photo(X(3), 675, W, 1350, 'ph/core-eyes', {hint: 'portrait', fit: {s: 1.25, ox: .5, oy: .35}});
			b.ui('label', X(3, 120), 300, 520, 84, {t: 'Do what you love', bg: '$c3'});
			b.ui('note', X(3, -280), 560, 380, 300, {t: 'believe in yourself like the universe believes in you', size: 38, rot: -5});
			b.stk('ticket', X(3, 300), 1150, 260, {rot: 14});
			// slide 5: striped paper, polaroid, her cut-out standing beside it
			b.photo(X(4, -130), 460, 520, 620, 'ph/core-stand', {frame: 'polaroid', paper: '#c9ddf2', rot: -3, hint: 'portrait'});
			b.stk('binder-clip', X(4, -130), 150, 140, {});
			var p5 = b.photo(X(4, 250), 820, 520, 1040, 'ph/core-stand', {hint: 'full-length portrait', op: 0, fit: {s: 1, oy: .4}});
			b.cut(p5, {ext: {t: .05, b: 0, l: .05, r: .05}});
			b.ui('note', X(4, -280), 1060, 380, 300, {t: 'too busy creating my dream life!', size: 44, bg: '#f7d7e3', rot: 4});
			b.stk('sunflower', X(4, -420), 1260, 150, {anim: F.spin});
			b.stk('puffy-heart', X(4, -200), 1280, 110, {anim: F.pulse});
			b.text(X(4, -100), 140, 600, 'be a pretty girl with a pretty mind', 46, 'hand', {wt: 700, c: '#2b3a5a'});
			// the dotted flight path through every slide
			b.path([[X(0, -420), 860], [X(0, 120), 980], [X(0, 480), 760], [X(1, -300), 620], [X(1, -120), 1100], [X(2, -200), 1220], [X(2, 300), 1300], [X(3, -400), 1000], [X(3, 0), 760], [X(3, 420), 900], [X(4, -380), 700], [X(4, -40), 860]], {c: '#fff200', lw: 6, dash: [3, 18], pc: '#fff', pbg: 'rgba(0,0,0,.35)', anim: F.draw});
			return doc(this, null, 5, {c: '#1d2a44'}, [null, null, {tex: 'navy-plaid', scale: .8}, null, {tex: 'yellow-stripe', scale: .9}], b.L);
		}, vars: {c1: '#f6e7a1', c3: '#f3efe6'}});

	/* 5 ─ LIFE LATELY · phone · one colour theme, music cards, big type, little notes */
	var LL = [{key: 'green', label: 'Green', c1: '#e8f23a', c2: '#2f5d1e', tex: 'matcha', washes: ['sage', 'teal', 'butter'], washes: ['sage', 'butter', 'teal']}, {key: 'pink', label: 'Pink', c1: '#ffe14d', c2: '#c2366b', tex: 'plaster', washes: ['rose', 'magenta', 'lilac'], washes: ['rose', 'lilac', 'butter']}, {key: 'blue', label: 'Blue', c1: '#ffd84d', c2: '#1d4f91', tex: 'blue-tiles', washes: ['powder', 'navy', 'stone'], washes: ['powder', 'navy', 'butter']}];
	T.push({id: 'life-lately', name: 'Life Lately', family: 'phone', blurb: 'One colour theme, music player cards, big type and little notes', variants: LL,
		make: function (v) {
			var b = B();
			// 1: four photos + giant words
			b.photo(X(0, -270), 337, 540, 675, 'ph/core-eyes', {hint: 'portrait'});
			b.photo(X(0, 270), 337, 540, 675, 'ph/r1-flowers', {hint: 'any'});
			b.photo(X(0, -270), 1012, 540, 675, 'ph/r1-walk', {hint: 'any'});
			b.photo(X(0, 270), 1012, 540, 675, 'ph/r1-coffee', {hint: 'any'});
			b.text(X(0, 40), 640, 980, 'life\nlately', 230, 'chunky', {wt: 800, c: '$c1', lh: .82, ls: -4, anim: F.pop(.2)});
			b.text(X(0, -330), 1270, 380, 'auto rides & this song', 34, 'grotesk', {wt: 600, c: '#fff'});
			// 2: textured page with two bordered photos
			b.photo(X(1, -150), 430, 520, 600, 'ph/r1-desk', {frame: 'border', bw: 16, rot: -3, hint: 'any'});
			b.photo(X(1, 160), 960, 560, 560, 'ph/r1-reading', {frame: 'border', bw: 16, rot: 4, hint: 'any'});
			b.text(X(1, 300), 360, 340, 'lil happiness goes a long way', 46, 'grotesk', {wt: 600, c: '#fff', align: 'left'});
			b.text(X(1, -280), 1180, 360, 'work days', 66, 'hand', {wt: 700, c: '#fff', rot: -6});
			b.stk('chrome-star', X(1, 360), 1240, 120, {anim: F.spin});
			// 3: outfit details
			b.photo(X(2, -200), 675, 680, 1350, 'ph/r1-fit', {hint: 'outfit'});
			b.photo(X(2, 330), 760, 360, 560, 'ph/saree-bangles', {frame: 'border', bw: 12, hint: 'detail'});
			b.text(X(2, 330), 410, 380, 'outfit details', 50, 'grotesk', {wt: 600, c: '#fff'});
			b.text(X(2, 330), 1120, 360, 'my sister got me this bracelet', 34, 'grotesk', {c: '#fff'});
			// 4: two music cards + cable + big words
			b.photo(X(3), 675, W, 1350, 'ph/r1-beach', {hint: 'place'});
			b.photo(X(3, -200), 430, 330, 520, 'ph/r1-pool', {frame: 'music', title: 'Those eyes', artist: 'New West', rot: -4, hint: 'any'});
			b.photo(X(3, 200), 390, 330, 520, 'ph/r1-passport', {frame: 'music', title: 'Sparks', artist: 'Coldplay', card: '#1b1b1b', ink: '#fff', rot: 4, hint: 'any', anim: F.float});
			b.path([[X(3, -200), 690], [X(3, -260), 860], [X(3, -60), 960], [X(3, 120), 820], [X(3, 200), 650]], {c: '#fff', lw: 5, dash: [], plane: false});
			b.text(X(3, 170), 1120, 680, 'recent\nplaying\nsongs', 110, 'chunky', {wt: 800, c: '$c1', lh: .86, align: 'right'});
			// 5: rainy days
			b.photo(X(4), 337, W, 675, 'ph/r1-walk', {hint: 'place'});
			b.photo(X(4), 1012, W, 675, 'ph/sum-sea', {hint: 'place'});
			b.text(X(4, -200), 200, 500, 'I have a love-hate relationship with this weather', 40, 'grotesk', {wt: 600, c: '#fff', align: 'left'});
			b.text(X(4), 1270, 600, 'rainy days', 52, 'grotesk', {wt: 600, c: '#fff'});
			return doc(this, v, 5, {c: '$c2'}, [null, {tex: v.tex, scale: .8, tint: 'rgba(0,0,0,.08)'}, {c: '$c2'}], b.L);
		}});

	/* 6 ─ CAMERA CRUMBS · phone · Mac window, Photos album, message bubbles, location pin */
	T.push({id: 'camera-crumbs', name: 'Camera Crumbs', family: 'phone', blurb: 'Photos-app album, Mac window, message bubbles and a location pin',
		make: function () {
			var b = B();
			b.photo(X(0), 675, W, 1350, 'ph/y2k-red', {hint: 'place', filter: 'warm'});
			b.photo(X(0, 20), 560, 700, 700, 'ph/core-stand', {frame: 'window', cap: 'Photo Booth', hint: 'portrait', rot: -2});
			b.stk('hibiscus', X(0, 330), 260, 190, {rot: 12, anim: F.wig});
			b.text(X(0, -20), 1040, 820, 'life recently', 150, 'script', {c: '#fff', rot: -6});
			b.text(X(0, 140), 1150, 400, 'may moments', 40, 'grotesk', {c: '#fff'});
			// 2: album
			b.photo(X(1), 300, W, 600, 'ph/saree-window', {hint: 'portrait'});
			b.shape('rect', X(1), 520, W, 170, 'rgba(0,0,0,.28)');
			b.ui('album', X(1, -200), 470, 600, 150, {t: 'Favourites', sub: '30 items'});
			[['r1-coffee', -360, 790], ['saree-bangles', 0, 790], ['r1-dessert', 360, 790], ['r1-brunch', -360, 1150], ['r1-flowers', 0, 1150], ['r1-latte', 360, 1150]].forEach(function (g) {
				b.photo(X(1, g[1]), g[2], 352, 352, 'ph/' + g[0], {hint: 'any'});
			});
			// 3: four up + pin
			b.photo(X(2, -270), 337, 536, 671, 'ph/r1-coffee', {hint: 'any'});
			b.photo(X(2, 270), 337, 536, 671, 'ph/r1-rooftop', {hint: 'any'});
			b.photo(X(2, -270), 1012, 536, 671, 'ph/r1-dessert', {hint: 'any'});
			b.photo(X(2, 270), 1012, 536, 671, 'ph/r1-flowers', {hint: 'any'});
			b.ui('pin', X(2, 0), 675, 200, 70, {t: 'MAY'});
			b.text(X(2, 250), 610, 360, 'best of', 90, 'script', {c: '#fff'});
			// 4: chips over a grid
			b.photo(X(3, -270), 675, 540, 1350, 'ph/r1-fit', {hint: 'outfit'});
			b.photo(X(3, 270), 337, 540, 675, 'ph/r1-brunch', {hint: 'food'});
			b.photo(X(3, 270), 1012, 540, 675, 'ph/r1-cafe', {hint: 'place'});
			b.ui('bubble', X(3, -270), 560, 260, 74, {t: 'Snapshots', anim: F.pop(.2)});
			b.ui('bubble', X(3, 270), 640, 320, 74, {t: 'Camera crumbs', anim: F.pop(.6)});
			// 5: sky + messages
			b.photo(X(4), 675, W, 1350, 'ph/sum-sea', {hint: 'place'});
			b.ui('bubble', X(4, 160), 170, 420, 80, {t: 'a quick trip to…', anim: F.pop(.2)});
			b.ui('pin', X(4, 200), 270, 300, 66, {t: 'Rajahmundry', anim: F.pop(.6)});
			b.photo(X(4, -170), 860, 640, 780, 'ph/r1-latte', {frame: 'window', cap: 'sunset vibes', hint: 'any'});
			b.ui('bubble', X(4, 300), 1160, 320, 74, {t: 'Sunset vibes', side: 'them', anim: F.pop(1)});
			return doc(this, null, 5, {c: '#111'}, [], b.L);
		}});

	/* 7 ─ NEELI RANGU · telugu · six saree colours; title, accents, bangles and paper follow the colour */
	var SAREE = [
		{key: 'blue', label: 'Neeli blue', c1: '#1f3fae', c2: '#e9eefb', hue: 0, te: 'నీలి రంగు', en: 'in a blue saree'},
		{key: 'red', label: 'Kumkum red', c1: '#b3122b', c2: '#fbe9ea', hue: 128, te: 'ఎరుపు రంగు', en: 'in a red saree', washes: ['maroon', 'magenta', 'rose']},
		{key: 'yellow', label: 'Pasupu yellow', c1: '#c98a00', c2: '#fdf4dc', hue: 178, te: 'పసుపు రంగు', en: 'in a yellow saree', washes: ['butter', 'terracotta', 'stone']},
		{key: 'green', label: 'Chilaka green', c1: '#1e7a3c', c2: '#e6f4ea', hue: -95, te: 'ఆకుపచ్చ రంగు', en: 'in a green saree'},
		{key: 'pink', label: 'Gulabi pink', c1: '#d0397a', c2: '#fce8f1', hue: 100, te: 'గులాబీ రంగు', en: 'in a pink saree'},
		{key: 'maroon', label: 'Maroon', c1: '#6e1423', c2: '#f5e6e3', hue: 118, sat: .7, te: 'మెరూన్ రంగు', en: 'in a maroon saree', washes: ['maroon', 'rose', 'espresso']}
	];
	T.push({id: 'neeli-rangu', name: 'Rangu Cheera', family: 'telugu', blurb: 'Telugu saree carousel in six colours — title, bangles and paper follow your saree', variants: SAREE,
		make: function (v) {
			var b = B();
			// 1: three stacked frames, Telugu title in the saree colour
			b.photo(X(0), 225, W, 450, 'ph/saree-garden', {hint: 'portrait', fit: {s: 1, oy: .25}});
			b.photo(X(0), 675, W, 450, 'ph/saree-bangles', {hint: 'detail', filter: 'bw'});
			b.photo(X(0), 1125, W, 450, 'ph/saree-window', {hint: 'portrait', fit: {s: 1, oy: .4}});
			b.text(X(0, -250), 630, 520, v.te, 120, 'te', {c: '$c1', bg: 'rgba(255,255,255,.82)', br: 4, pad: 30, rot: -3, anim: F.rise(.2)});
			b.text(X(0, -250), 760, 520, 'Telugu ammai ' + v.en, 34, 'serif', {it: true, c: '#fff', shadow: 'rgba(0,0,0,.4)'});
			// 2: the close-up
			b.photo(X(1), 675, W, 1350, 'ph/saree-bangles', {hint: 'detail'});
			b.stk('jasmine', X(1, 380), 1180, 300, {rot: -70, anim: F.drift});
			b.text(X(1, 330), 1250, 300, 'చీర', 90, 'te', {c: '$c2'});
			// 3: two frames, bangles and torn paper
			b.photo(X(2), 340, W, 680, 'ph/saree-garden', {hint: 'portrait', fit: {s: 1.15, oy: .2}});
			b.photo(X(2), 1015, W, 670, 'ph/saree-window', {hint: 'portrait'});
			b.stk('torn-paper', X(2, -300), 690, 420, {rot: -8});
			b.text(X(2, -300), 690, 340, 'మట్టి గాజులు', 56, 'te', {c: '$c1', rot: -8});
			b.stk(v.key === 'blue' ? 'bangles' : 'bangles-' + v.key, X(2, 360), 700, 260, {rot: 18, anim: F.wig});
			// 4: black-and-white over colour
			b.photo(X(3), 340, W, 680, 'ph/saree-garden', {hint: 'portrait', filter: 'bw', fit: {s: 1.2, oy: .2}});
			b.photo(X(3), 1015, W, 670, 'ph/saree-lawn', {hint: 'place'});
			b.stk('torn-paper', X(3, -150), 700, 700, {rot: -2});
			b.text(X(3, -150), 700, 560, 'old songs,\nnew memories', 64, 'serif', {it: true, c: '$c1', rot: -2});
			// 5: the walk away
			b.photo(X(4), 675, W, 1350, 'ph/saree-lawn', {hint: 'place'});
			b.shape('rect', X(4), 1230, W, 240, '$c2', {op: .9});
			b.text(X(4), 1200, 900, 'మల్లె పూలు, మట్టి గాజులు, నీలి చీర', 46, 'te', {c: '$c1'});
			b.text(X(4), 1275, 900, 'save this for your next saree day', 30, 'grotesk', {wt: 600, c: '#333', upper: true, ls: 3});
			b.stk('jasmine', X(4, -380), 120, 260, {rot: 20});
			// the last line follows the colour
			b.L[b.L.length - 3].t = 'మల్లె పూలు, మట్టి గాజులు, ' + v.te.replace(' రంగు', '') + ' చీర';
			return doc(this, v, 5, {c: '$c2'}, [], b.L);
		}});

	/* 8 ─ & PATTERNS · patterns · nature on top, her below; Foxy matches the colours */
	T.push({id: 'patterns', name: '& Patterns', family: 'patterns', blurb: 'Nature photo on top, yours below — Foxy picks nature photos that match your colours',
		make: function () {
			var b = B(), pairs = [['red-hibiscus', 'saree-garden'], ['pink-lotus', 'cafe-pink'], ['moon-blue', 'core-stand'], ['orange-sun', 'sum-sea'], ['green-paddy', 'r1-walk'], ['moon-night', 'y2k-red']];
			pairs.forEach(function (p, i) {
				b.photo(X(i), 337, W, 675, 'nat/' + p[0], {hint: 'nature (library)', lib: 'nat', anim: i ? null : F.zoom});
				b.photo(X(i), 1012, W, 675, 'ph/' + p[1], {hint: 'portrait', fit: {s: 1, oy: .3}, anim: F.zoom});
			});
			b.text(X(0, -330), 640, 340, '& patterns', 60, 'serif', {it: true, c: '#fff', shadow: 'rgba(0,0,0,.35)'});
			return doc(this, null, 6, {c: '#fff'}, [], b.L);
		}});

	var WASH = {y2k: ['terracotta', 'teal', 'butter', 'rose', 'navy'], seamless: ['powder', 'butter', 'terracotta', 'teal', 'rose'], phone: ['sage', 'butter', 'espresso', 'powder'], telugu: ['maroon', 'magenta', 'butter', 'rose', 'stone'], patterns: ['rose', 'sage', 'powder', 'terracotta', 'lilac', 'espresso'], festival: ['butter', 'magenta', 'sage', 'maroon'], soft: ['rose', 'lilac', 'powder', 'stone'], diary: ['rose', 'stone', 'lilac', 'butter']};
	function make(id, variantKey) {
		var t = T.filter(function (x) { return x.id === id; })[0]; if (!t) return null;
		var v = t.variants ? (t.variants.filter(function (x) { return x.key === variantKey; })[0] || t.variants[0]) : null;
		uid = 0;
		var d = t.make(v);
		d.vars = Object.assign({}, t.vars || {}, v || {});
		var wash = (v && v.washes) || t.washes || WASH[t.family] || ['rose', 'sage', 'butter', 'powder'], wi = 0;
		d.layers.forEach(function (l) { if (l.kind === 'photo' && l.src && l.src.indexOf('ph/') === 0) l.src = 'wash/' + wash[wi++ % wash.length]; });
		return d;
	}
	root.CarouselTemplates = {list: T, make: make, SAREE: SAREE, kit: {B: B, X: X, F: F, doc: doc}};
})(window);
