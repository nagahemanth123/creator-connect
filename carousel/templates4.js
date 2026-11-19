/* Busy Fox Creator Connect — carousel templates, round 4: Telugu cinema & song lines, village & native place.
   Sticker pack is our own (made for Busy Fox in a Canva-sticker look; nothing taken from Canva or any film).
   Words are original placeholder lines in the style of a film subtitle or a song card: never real dialogues or lyrics.
   Photo spots open as soft colour washes. */
(function (root) {
	'use strict';
	var TP = root.CarouselTemplates, K = TP.kit, B = K.B, X = K.X, F = K.F, doc = K.doc, W = 1080;
	var w = function (n) { return 'wash/' + n; };
	var T = TP.list;
	function subtitle(b, i, te, en, y) { // a film-subtitle bar: Telugu line in yellow, English under it
		b.shape('rect', X(i), y, 940, 190, 'rgba(0,0,0,.55)', {r: 12});
		b.text(X(i), y - 36, 880, te, 54, 'teBold', {c: '#ffd84a'});
		b.text(X(i), y + 46, 880, en, 34, 'grotesk', {wt: 600, c: '#fff'});
	}

	/* CINEMA LINES · retro film-poster paper, a subtitle bar on every slide, ticket, clapboard, old TV */
	T.push({id: 'cinema-lines', name: 'Cinema Lines', family: 'cinema', blurb: 'Your photos like stills from a Telugu film: subtitle bars, a retro poster cover, ticket and clapboard', washes: ['maroon', 'espresso', 'butter', 'navy', 'terracotta'],
		make: function () {
			var b = B();
			b.photo(X(0), 640, 820, 900, w('maroon'), {frame: 'border', bw: 16, paper: '#f5ead2', hint: 'your best portrait', filter: 'warm'});
			b.text(X(0), 150, 960, 'నా కథ', 170, 'teBold', {c: '#c0392b', stroke: 10, strokeC: '#f5ead2', shadow: 'rgba(0,0,0,.35)', anim: F.pop(.1)});
			b.text(X(0), 1190, 900, 'NOW SHOWING', 70, 'chunky', {wt: 800, c: '#1d1b18', ls: 10});
			b.text(X(0), 1270, 900, 'starring you · in cinemas near you', 30, 'type', {c: '#3b2a2a'});
			b.stk('ticket-pink', X(0, 380), 360, 260, {rot: 14, anim: F.wig});
			b.photo(X(1), 675, W, 1350, w('espresso'), {hint: 'you, looking away', filter: 'warm'});
			subtitle(b, 1, 'ఈ రోజు నా కథ మొదలైంది', 'Today, my story begins.', 1170);
			b.photo(X(2), 675, W, 1350, w('navy'), {hint: 'close-up', filter: 'warm'});
			subtitle(b, 2, 'నవ్వు ఆపకు, ప్రపంచం చూస్తోంది', 'Keep smiling, the world is watching.', 1170);
			b.stk('clapboard', X(2, 350), 180, 220, {rot: 10, anim: F.wig});
			b.photo(X(3), 610, 760, 760, w('butter'), {frame: 'retro-tv', hint: 'a candid moment'});
			b.text(X(3), 1150, 860, 'interval', 90, 'script', {c: '#f5ead2'});
			b.stk('popcorn', X(3, -380), 1180, 200, {anim: F.float});
			b.photo(X(4), 675, W, 1350, w('terracotta'), {hint: 'walking away', filter: 'warm'});
			subtitle(b, 4, 'ఇంకా ఉంది...', 'To be continued...', 1170);
			b.stk('film-reel', X(4, -360), 200, 220, {anim: F.spin});
			b.text(X(5), 560, 900, 'శుభం', 220, 'teBold', {c: '#c0392b', stroke: 10, strokeC: '#f5ead2'});
			b.text(X(5), 760, 860, 'THE END', 80, 'chunky', {wt: 800, c: '#1d1b18', ls: 14});
			b.text(X(5), 900, 860, 'which scene was your favourite? comment below', 34, 'type', {c: '#3b2a2a'});
			b.stk('clapboard', X(5, 0), 1140, 220, {rot: -8});
			return doc(this, null, 6, {tex: 'poster-paper', scale: .9}, [null, {c: '#111'}, {c: '#111'}, {tex: 'cinema-curtain', scale: .9}, {c: '#111'}, {tex: 'poster-paper', scale: .9}], b.L);
		}});

	/* SONG LINES · lyric cards over your photos, a music card, an old radio and mic */
	T.push({id: 'song-lines', name: 'Song Lines', family: 'cinema', blurb: 'One song line per slide over your photos, with a music card, an old radio and a mic', washes: ['rose', 'maroon', 'lilac', 'navy', 'terracotta'],
		make: function () {
			var b = B();
			b.photo(X(0), 675, W, 1350, w('rose'), {hint: 'portrait'});
			b.photo(X(0, 0), 900, 420, 650, w('maroon'), {frame: 'music', title: 'Your favourite song', artist: 'Singer name', card: '#1b1b1b', ink: '#fff', hint: 'any', anim: F.float});
			b.text(X(0), 260, 900, 'on repeat', 120, 'script', {c: '#fff', shadow: 'rgba(0,0,0,.35)'});
			var lines = [['నీ నవ్వే నా పాట', 'Your smile is my song'], ['ఈ క్షణం ఆగిపోనీ', 'Let this moment stay'], ['గుండెల్లో ఒక రాగం', 'A tune inside my heart']];
			['maroon', 'lilac', 'navy'].forEach(function (c, i) {
				b.photo(X(i + 1), 675, W, 1350, w(c), {hint: 'you'});
				b.text(X(i + 1), 980, 900, '♪ ' + lines[i][0], 80, 'te', {c: '#fff', shadow: 'rgba(0,0,0,.45)', anim: F.type(.2)});
				b.text(X(i + 1), 1080, 860, lines[i][1], 36, 'grotesk', {wt: 600, c: '#ffd84a'});
			});
			b.stk('transistor', X(1, 340), 200, 230, {rot: 8, anim: F.wig});
			b.stk('rose-petals', X(2, -360), 220, 220, {anim: F.float});
			b.stk('microphone', X(3, 360), 230, 200, {rot: -10});
			b.photo(X(4), 620, 760, 900, w('terracotta'), {frame: 'polaroid', rot: -2, cap: 'our song', hint: 'portrait'});
			b.text(X(4), 1200, 860, 'tag the person this song reminds you of', 40, 'hand', {wt: 700, c: '#fff'});
			b.stk('vhs', X(4, 360), 170, 220, {rot: 12});
			return doc(this, null, 5, {c: '#111'}, [null, null, null, null, {tex: 'cinema-curtain', scale: .9}], b.L);
		}});

	/* AMMAMMA INTLO · whitewashed walls, pots, rope cot, tulsi kota, banana-leaf lunch */
	T.push({id: 'ammamma-intlo', name: 'Ammamma Intlo', family: 'village', blurb: 'Summer at grandma’s: whitewashed walls, pots, the rope cot, tulsi kota and a banana-leaf lunch', washes: ['sage', 'butter', 'terracotta', 'stone', 'teal'],
		make: function () {
			var b = B();
			b.stk('mango-branch', X(0, 330), 150, 380, {rot: 180, flip: true});
			b.text(X(0, -90), 230, 820, 'అమ్మమ్మ ఇంట్లో', 110, 'te', {c: '#2f5d1e'});
			b.text(X(0, -90), 330, 820, 'summer at ammamma’s', 44, 'hand', {wt: 700, c: '#8a4b2a'});
			b.photo(X(0, 0), 830, 800, 820, w('sage'), {frame: 'soft', paper: '#fffaf2', hint: 'you at the house'});
			b.stk('kunda', X(0, -400), 1230, 200, {});
			b.photo(X(1, -170), 440, 560, 700, w('butter'), {frame: 'polaroid', rot: -3, cap: 'mana illu', hint: 'the house'});
			b.photo(X(1, 230), 970, 520, 620, w('terracotta'), {frame: 'polaroid', rot: 4, cap: 'ammamma', hint: 'with family'});
			b.stk('brass-pot', X(1, -380), 1150, 220, {anim: F.wig});
			b.photo(X(2), 600, 900, 900, w('stone'), {frame: 'soft', paper: '#fffaf2', hint: 'lazy afternoon'});
			b.stk('rope-cot', X(2, 0), 1200, 560, {});
			b.text(X(2, 0), 160, 860, 'మధ్యాహ్నం నిద్ర', 70, 'te', {c: '#2f5d1e'});
			b.photo(X(3, 0), 560, 760, 760, w('butter'), {frame: 'soft', paper: '#fffaf2', hint: 'the food'});
			b.stk('banana-meal', X(3, 250), 1130, 380, {rot: -6});
			b.text(X(3, -230), 1130, 500, 'ఆవకాయ అన్నం', 64, 'te', {c: '#8a4b2a', rot: -4});
			b.photo(X(4, -270), 675, 540, 1350, w('teal'), {hint: 'courtyard'});
			b.photo(X(4, 270), 675, 540, 1350, w('sage'), {hint: 'you'});
			b.stk('tulsi-kota', X(4, -270), 1120, 300, {});
			b.photo(X(5), 620, 820, 900, w('terracotta'), {frame: 'polaroid', rot: 2, cap: 'see you next summer', hint: 'goodbye shot'});
			b.stk('cow', X(5, -330), 1210, 260, {});
			b.stk('cycle', X(5, 330), 1210, 260, {});
			return doc(this, null, 6, {tex: 'white-wall', scale: .9}, [], b.L);
		}});

	/* MANA OORU · one long village panorama: palms, the river boat, a bullock cart riding across */
	T.push({id: 'mana-ooru', name: 'Mana Ooru', family: 'village', blurb: 'One long village panorama: toddy palms, a Godavari boat, a bullock cart riding across every slide', washes: ['sage', 'teal', 'butter', 'powder', 'terracotta'],
		make: function () {
			var b = B(), n = 5;
			b.photo(n * W / 2, 940, n * W, 820, w('sage'), {hint: 'a wide field or river shot (one photo across all slides)'});
			['teal', 'butter', 'powder', 'terracotta', 'sage'].forEach(function (c, i) { b.photo(X(i, i % 2 ? 150 : -150), 360, 520, 560, w(c), {frame: 'polaroid', rot: i % 2 ? 4 : -4, hint: 'any'}); });
			b.text(X(0, -140), 1240, 700, 'మన ఊరు', 120, 'te', {c: '#fff', shadow: 'rgba(0,0,0,.4)'});
			b.stk('palms', X(0, 400), 820, 320, {});
			b.stk('boat', X(1, 300), 1150, 420, {anim: F.drift});
			b.text(X(2, 0), 1240, 860, 'గోదారి గట్టు మీద', 70, 'te', {c: '#fff', shadow: 'rgba(0,0,0,.4)'});
			b.stk('palms', X(3, -420), 800, 300, {flip: true});
			b.stk('bullock-cart', X(3, 200), 1160, 520, {anim: F.slide(.3)});
			b.path([[X(0, -500), 1320], [X(1, 0), 1290], [X(2, 0), 1320], [X(3, 0), 1290], [X(4, 400), 1320]], {c: '#fff', lw: 5, dash: [2, 16], plane: false, anim: F.draw});
			b.text(X(4, 0), 1240, 860, 'ఎక్కడున్నా, మన ఊరే మనది', 54, 'te', {c: '#fff', shadow: 'rgba(0,0,0,.4)'});
			b.stk('mango-branch', X(4, 350), 120, 340, {rot: 170});
			return doc(this, null, n, {grad: ['#bfe3f2', '#fdf6e3']}, [], b.L);
		}});
})(window);
