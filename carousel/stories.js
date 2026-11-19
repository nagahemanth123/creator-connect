/* Busy Fox Creator Connect — story templates (9:16, 1080 × 1920): Polaroid, Filmstrip, New Post.
   Built from our own sticker pack. Photo spots open as soft colour washes. Words keep clear of the top 200 px and
   bottom 300 px, where Instagram puts its own bars. */
(function (root) {
	'use strict';
	var TP = root.CarouselTemplates, K = TP.kit, B = K.B, F = K.F, doc = K.doc, T = TP.list;
	var STORY = {H: 1920, story: true};

	/* POLAROID · three fanned polaroids with tape, a gold clip and flowers */
	T.push({id: 'story-polaroid', name: 'Polaroid Story', family: 'story', noDress: true, blurb: 'Three fanned polaroids with tape, a gold clip and flowers, for a photo-dump story',
		variants: [
			{key: 'cream', label: 'Cream paper', sw: '#efe4d2', bg: {tex: 'ivory-paper', scale: .9}, ink: '#3b2a22', tape: 'washi-floral', flower: 'peony', washes: ['rose', 'butter', 'sage']},
			{key: 'blush', label: 'Blush organza', sw: '#f2cfd3', bg: {tex: 'blush-organza', scale: .9}, ink: '#7a2e3d', tape: 'washi-gingham', flower: 'tulips', washes: ['lilac', 'rose', 'powder']},
			{key: 'gingham', label: 'Blue gingham', sw: '#bcd0ea', bg: {tex: 'powder-gingham', scale: .9}, ink: '#25406b', tape: 'clear-tape', flower: 'babys-breath', washes: ['powder', 'butter', 'rose']},
			{key: 'stone', label: 'Travertine', sw: '#d9cbb8', bg: {tex: 'travertine', scale: .9}, ink: '#4a3a2c', tape: 'washi-floral', flower: 'eucalyptus', washes: ['terracotta', 'stone', 'sage']}
		],
		make: function (v) {
			var b = B(), ink = v.ink;
			b.text(330, 300, 560, 'photo dump', 120, 'script', {c: ink, rot: -6, anim: F.pop(.1)});
			b.text(300, 400, 480, '19 · 11 · 2026', 40, 'date', {c: ink});
			b.stk('sparkles-gold', 900, 290, 190, {anim: F.wig});
			b.photo(790, 640, 420, 500, 'ph/a', {frame: 'polaroid', rot: 8, cap: 'this week', hint: 'any', anim: F.rise(.2)});
			b.stk(v.tape, 790, 400, 200, {rot: 4});
			b.photo(560, 1030, 700, 820, 'ph/b', {frame: 'polaroid', rot: -4, cap: 'my favourite', hint: 'your best one', anim: F.rise(0)});
			b.stk('gold-clip', 330, 640, 170, {rot: -18});
			b.photo(260, 1560, 400, 480, 'ph/c', {frame: 'polaroid', rot: -10, cap: 'soft days', hint: 'any', anim: F.rise(.4)});
			b.stk(v.tape, 260, 1325, 180, {rot: -14});
			b.stk(v.flower, 840, 1420, 300, {rot: 10, anim: F.float});
			b.stk('doodle-hearts', 900, 1150, 170, {rot: 6});
			b.text(700, 1700, 560, 'more on my page →', 46, 'hand', {wt: 700, c: ink});
			return doc(this, v, 1, v.bg, [], b.L, STORY);
		}});

	/* FILMSTRIP · one tall roll of film with four frames running down the story */
	T.push({id: 'story-filmstrip', name: 'Filmstrip Story', family: 'story', noDress: true, blurb: 'A tall roll of film with four frames running down the story, a roll number and a canister',
		variants: [
			{key: 'cream', label: 'Cream', sw: '#efe4d2', bg: {tex: 'ivory-paper', scale: .9}, film: '#161412', ink: '#2c2420', washes: ['terracotta', 'butter', 'sage', 'rose']},
			{key: 'noir', label: 'Noir', sw: '#151515', bg: {grad: ['#1c1a19', '#0b0b0b']}, film: '#efe6d6', ink: '#f3eadc', washes: ['espresso', 'stone', 'maroon', 'navy']},
			{key: 'butter', label: 'Butter stripe', sw: '#f6e39a', bg: {tex: 'yellow-stripe', scale: .9}, film: '#161412', ink: '#3a2a12', washes: ['butter', 'teal', 'rose', 'terracotta']},
			{key: 'matcha', label: 'Matcha', sw: '#b9c99a', bg: {grad: ['#d3dcc4', '#a7b893']}, film: '#161412', ink: '#24321c', washes: ['sage', 'butter', 'powder', 'stone']}
		],
		make: function (v) {
			var b = B(), cx = 470, cy = 980, ax = Math.cos(86 * Math.PI / 180), ay = Math.sin(86 * Math.PI / 180);
			b.shape('film', cx, cy, 2100, 600, v.film, {rot: 86});
			[-705, -235, 235, 705].forEach(function (t, i) {
				b.photo(cx + ax * t, cy + ay * t, 400, 430, 'ph/f' + i, {rot: -4, hint: ['the start', 'a moment', 'the best part', 'the end'][i], shadow: false, anim: F.rise(i * .15)});
			});
			b.text(850, 330, 380, 'roll', 54, 'type', {c: v.ink});
			b.text(860, 420, 380, '01', 150, 'chunky', {wt: 800, c: v.ink});
			b.text(870, 900, 360, 'stories\nfrom this\nweek', 64, 'serif', {it: true, c: v.ink, lh: 1.05, anim: F.rise(.3)});
			b.text(1010, 1330, 380, '24 EXP · ISO 400', 30, 'date', {c: v.ink, rot: -90});
			b.stk('film-canister', 900, 1420, 220, {rot: 12, anim: F.wig});
			b.stk('clear-tape', 430, 70, 300, {rot: -8});
			b.stk('sparkles-gold', 900, 1120, 150, {anim: F.float});
			b.text(925, 1640, 290, 'swipe for\nthe full roll', 42, 'hand', {wt: 700, c: v.ink});
			return doc(this, v, 1, v.bg, [], b.L, STORY);
		}});

	/* NEW POST · a feed-post card with her photo in it, to send people to the post */
	T.push({id: 'story-newpost', name: 'New Post Story', family: 'story', noDress: true, blurb: 'A feed-post card with your photo in it and a big NEW POST title, to send people to the post',
		variants: [
			{key: 'blush', label: 'Blush', sw: '#f4c9cf', bg: {grad: ['#f8d9dc', '#f2b8c0']}, card: '#ffffff', ink: '#ffffff', title: '#c2185b', washes: ['rose']},
			{key: 'dark', label: 'After dark', sw: '#1b1b1b', bg: {grad: ['#2a2626', '#0e0d0d']}, card: '#141414', cardInk: '#f5f5f5', ink: '#f5f5f5', title: '#f5f5f5', washes: ['espresso']},
			{key: 'butter', label: 'Butter', sw: '#f7e39a', bg: {tex: 'yellow-stripe', scale: .9}, card: '#ffffff', ink: '#3a2a12', title: '#3a2a12', washes: ['butter']},
			{key: 'sage', label: 'Sage', sw: '#b9c9ad', bg: {grad: ['#d7e2cd', '#a9bd9b']}, card: '#ffffff', ink: '#24321c', title: '#24321c', washes: ['sage']}
		],
		make: function (v) {
			var b = B(), cw = 720, hh = cw * .15, ph = cw * 1.25, ch = hh + ph + hh * 1.25, top = 390;
			b.text(540, 250, 900, 'NEW POST', 150, 'chunky', {wt: 800, c: v.title, ls: 4, anim: F.pop(0)});
			b.ui('post', 540, top + ch / 2, cw, ch, {t: 'your.name', sub: 'Hyderabad', ph: ph, bg: v.card, c: v.cardInk || '#111', cap: 'new post is up, go see it', anim: F.rise(.1)});
			b.photo(540, top + hh + ph / 2, cw, ph, 'ph/p', {hint: 'the photo you posted', shadow: false, anim: F.rise(.1)});
			b.stk('sparkles-gold', 930, 330, 200, {anim: F.wig});
			b.stk('doodle-hearts', 140, 1240, 190, {rot: -8, anim: F.float});
			b.stk('doodle-arrow', 300, 1650, 230, {rot: -75});
			b.text(660, 1650, 520, 'go like it ♡', 64, 'hand', {wt: 700, c: v.ink});
			return doc(this, v, 1, v.bg, [], b.L, STORY);
		}});
})(window);
