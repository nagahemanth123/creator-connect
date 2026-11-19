/* Busy Fox Creator Connect — carousel templates, round 3: temple trip, café, digital diary, traditional with our own
   illustrations, festival days (4 colour sets), soft swan, documenting summer, saree fit check, ammayi core,
   film roll, date stamp, photo dump on a rope, big words across. Photo spots open as soft colour washes (no example
   photos); every piece is movable. Our own designs in the styles creators asked for; nothing copied. */
(function (root) {
	'use strict';
	var TP = root.CarouselTemplates, K = TP.kit, B = K.B, X = K.X, F = K.F, doc = K.doc, W = 1080;
	var w = function (n) { return 'wash/' + n; };
	var T = TP.list;

	/* TEMPLE DIARIES · white frames over the joins, stone, lotus, bells */
	T.push({id: 'temple-diaries', name: 'Temple Diaries', family: 'telugu', blurb: 'A temple trip in white frames that cross the slides, with lotus, bells and kolam', washes: ['magenta', 'stone', 'butter', 'rose'],
		make: function () {
			var b = B();
			b.photo(X(0, -190), 690, 640, 1180, w('magenta'), {frame: 'border', bw: 18, hint: 'portrait'});
			b.photo(X(0, 380), 520, 560, 800, w('powder'), {frame: 'border', bw: 18, rot: 3, hint: 'temple / place'});
			b.text(X(0, 380), 200, 520, 'Temple diaries', 72, 'script', {c: '$c1', rot: 3});
			b.text(X(0, -230), 1270, 520, 'గుడి కథలు', 50, 'te', {c: '#fff', shadow: 'rgba(0,0,0,.35)'});
			b.stk('lotus', X(0, -440), 1200, 240, {anim: F.float});
			b.photo(X(1, -120), 420, 600, 700, w('butter'), {frame: 'border', bw: 18, rot: -2, hint: 'detail'});
			b.photo(X(1, 230), 1000, 600, 640, w('rose'), {frame: 'border', bw: 18, rot: 2, hint: 'portrait'});
			b.stk('temple-bell', X(1, 420), 140, 150, {anim: F.swing});
			b.photo(X(2, 300), 660, 900, 1000, w('stone'), {frame: 'border', bw: 18, hint: 'two of you'});
			b.stk('kolam', X(2, -300), 180, 240, {op: .9});
			b.stk('lotus-bud', X(3, -470), 1080, 200, {});
			b.photo(X(3, 60), 675, 760, 1100, w('magenta'), {frame: 'border', bw: 18, rot: -1, hint: 'portrait'});
			b.stk('coconut', X(3, 360), 1210, 230, {anim: F.wig});
			b.photo(X(4, -230), 400, 520, 640, w('butter'), {frame: 'border', bw: 16, rot: -3, hint: 'prasadam / food'});
			b.photo(X(4, 200), 920, 600, 720, w('rose'), {frame: 'border', bw: 16, rot: 3, hint: 'detail'});
			b.stk('jasmine', X(4, -300), 1150, 260, {rot: -15});
			b.stk('ill-kolam-girl', X(5, -260), 1060, 380, {});
			b.text(X(5, 120), 300, 760, 'Om Namah Shivaya', 70, 'script', {c: '$c1'});
			b.photo(X(5, 160), 800, 600, 700, w('stone'), {frame: 'border', bw: 16, rot: 2, hint: 'any'});
			return doc(this, null, 6, {tex: 'temple-stone', scale: .9, tint: 'rgba(250,244,236,.55)'}, [], b.L);
		}, vars: {c1: '#8a1c4a'}});

	/* CAFÉ LO · dark café, cameras, film strip, a dotted line between photos */
	T.push({id: 'cafe-lo', name: 'Café Lo', family: 'phone', blurb: 'A moody café dump: cameras, a film strip, a mini music player and a dotted line', washes: ['espresso', 'sage', 'navy', 'terracotta'],
		make: function () {
			var b = B();
			b.photo(X(0), 830, W, 1040, w('espresso'), {hint: 'you with your drink'});
			b.photo(X(0, -300), 1110, 380, 380, w('sage'), {frame: 'camera-silver', rot: -4, hint: 'café'});
			b.text(X(0, 60), 190, 760, 'oka café lo', 104, 'bubble', {c: '#fff', shadow: 'rgba(0,0,0,.4)', curve: 18, anim: F.pop(.2)});
			b.ui('like', X(0, 300), 380, 240, 72, {t: '♡ café diaries'});
			b.photo(X(1, 40), 760, 900, 900, w('sage'), {frame: 'camera-pink', hint: 'café / plants'});
			b.stk('lantern', X(1, -340), 260, 260, {anim: F.swing});
			b.text(X(1, 250), 220, 400, 'feel it', 64, 'marker', {c: '#fff', rot: -6});
			b.shape('film', X(2, -250), 675, 360, 1350, '#111');
			['espresso', 'navy', 'terracotta'].forEach(function (c, i) { b.photo(X(2, -250), 230 + i * 445, 280, 400, w(c), {hint: 'any'}); });
			b.photo(X(2, 230), 675, 560, 1250, w('sage'), {hint: 'you'});
			b.photo(X(3), 675, W, 1350, w('navy'), {hint: 'you'});
			b.photo(X(3, -220), 1080, 420, 420, w('espresso'), {frame: 'camera-dslr', rot: -3, hint: 'your drink'});
			b.text(X(3, 120), 160, 600, 'summer bistro', 70, 'script', {c: '#fff'});
			b.path([[X(3, -380), 360], [X(3, -120), 560], [X(3, 160), 470], [X(3, 340), 700]], {c: '#fff', lw: 4, dash: [2, 14], plane: false});
			b.photo(X(4), 675, W, 1350, w('espresso'), {hint: 'the café'});
			b.photo(X(4, 260), 300, 420, 520, w('terracotta'), {frame: 'border', bw: 12, rot: 4, hint: 'food'});
			b.photo(X(4, -260), 1070, 300, 470, w('sage'), {frame: 'music', title: 'Café song', artist: 'Your playlist', card: '#1b1b1b', ink: '#fff', hint: 'any', anim: F.float});
			b.stk('iced-latte', X(4, 330), 1150, 220, {anim: F.wig});
			return doc(this, null, 5, {tex: 'cafe-bokeh', scale: .9, tint: 'rgba(0,0,0,.35)'}, [], b.L);
		}});

	/* DEAR MONTH · a digital diary: calendar page, torn paper, stamp frames, curved notes */
	T.push({id: 'dear-month', name: 'Dear Month', family: 'diary', blurb: 'Monthly recap diary: a calendar page, torn paper, stamp frames and handwritten notes', washes: ['rose', 'stone', 'lilac', 'butter'],
		make: function () {
			var b = B();
			b.photo(X(0, 180), 675, 700, 1350, w('rose'), {hint: 'portrait'});
			b.stk('torn-strip', X(0, -170), 675, 120, {h: 1350});
			b.stk('calendar', X(0, -300), 300, 300, {rot: -6});
			b.text(X(0, -300), 330, 240, 'NOV', 90, 'chunky', {wt: 800, c: '#c0392b', rot: -6});
			b.text(X(0, -310), 560, 420, 'dear november', 64, 'script', {c: '#2b2620', rot: -4});
			b.text(X(0, -280), 1050, 400, 'falling for myself, falling for you', 40, 'hand', {wt: 700, c: '#2b2620', curve: 40, rot: -10});
			b.photo(X(1, -230), 400, 540, 700, w('stone'), {frame: 'stamp', rot: -3, hint: 'any'});
			b.photo(X(1, 240), 960, 520, 680, w('lilac'), {frame: 'stamp', rot: 3, hint: 'any'});
			b.stk('bunny', X(1, 330), 330, 260, {anim: F.float});
			b.text(X(1, -230), 1100, 420, 'cute nails, cute coffee', 46, 'hand', {wt: 700, c: '#2b2620', rot: -4});
			b.photo(X(2, -270), 337, 540, 675, w('butter'), {hint: 'drink'});
			b.photo(X(2, 270), 337, 540, 675, w('rose'), {hint: 'any'});
			b.photo(X(2, -270), 1012, 540, 675, w('lilac'), {hint: 'any'});
			b.photo(X(2, 270), 1012, 540, 675, w('stone'), {hint: 'any'});
			b.stk('sunflower', X(2), 675, 240, {anim: F.spin});
			b.photo(X(3), 675, 760, 1000, w('rose'), {frame: 'polaroid', rot: -2, cap: 'just a girl', hint: 'portrait'});
			b.stk('torn-paper', X(3, 300), 200, 380, {rot: 8});
			b.text(X(3, 300), 200, 300, 'and her obsession over flowers', 34, 'hand', {wt: 700, c: '#2b2620', rot: 8});
			b.photo(X(4, -270), 675, 540, 1350, w('stone'), {hint: 'you'});
			b.photo(X(4, 270), 400, 540, 800, w('butter'), {hint: 'dessert'});
			b.photo(X(4, 270), 1150, 540, 400, w('lilac'), {hint: 'any'});
			b.text(X(4, 270), 860, 480, 'official berry season', 46, 'hand', {wt: 700, c: '#fff', shadow: 'rgba(0,0,0,.35)'});
			b.photo(X(5, -150), 500, 620, 800, w('rose'), {frame: 'stamp', rot: -2, hint: 'work / desk'});
			b.stk('calendar', X(5, 330), 1080, 260, {rot: 8});
			b.text(X(5, 330), 1110, 220, '30', 90, 'chunky', {wt: 800, c: '#c0392b', rot: 8});
			b.text(X(5, -120), 1140, 640, 'work, passion, life balance', 50, 'script', {c: '#2b2620'});
			return doc(this, null, 6, {tex: 'ivory-paper', scale: .9}, [], b.L);
		}});

	/* BOMMA · maroon silk, our own illustrations, veena, bell, mirror */
	T.push({id: 'bomma', name: 'Bomma', family: 'telugu', blurb: 'Traditional saree story on maroon silk, with our own illustrations, veena, bells and a hand mirror', washes: ['maroon', 'rose', 'butter', 'magenta'],
		make: function () {
			var b = B();
			b.photo(X(0, 40), 640, 700, 1000, w('rose'), {frame: 'border', bw: 14, hint: 'full-length'});
			b.stk('veena', X(0, 430), 760, 220, {});
			b.stk('temple-bell', X(0, -420), 120, 140, {anim: F.swing});
			b.stk('lotus', X(0, -380), 1220, 260, {});
			b.text(X(0, 30), 1240, 700, 'బాపు బొమ్మ', 90, 'te', {c: '#f6e3a1'});
			b.photo(X(1), 675, W, 1350, w('maroon'), {hint: 'sitting pose'});
			b.stk('temple-bell', X(1, 300), 120, 150, {anim: F.swing});
			b.photo(X(2, -270), 337, 540, 675, w('rose'), {hint: 'hands / bangles'});
			b.photo(X(2, 270), 337, 540, 675, w('sage'), {hint: 'detail'});
			b.photo(X(2, 0), 1012, W, 675, w('butter'), {hint: 'saree border'});
			b.photo(X(3, -170), 520, 560, 760, w('rose'), {frame: 'polaroid', rot: -3, hint: 'jewellery'});
			b.stk('ill-mirror-girl', X(3, 250), 1000, 480, {});
			b.stk('hand-mirror', X(3, 340), 300, 240, {rot: 12, anim: F.wig});
			b.stk('ill-langa-voni', X(4, -290), 1000, 460, {});
			b.photo(X(4, 200), 600, 620, 1100, w('magenta'), {hint: 'portrait'});
			b.stk('lotus-bud', X(4, -380), 300, 180, {});
			b.photo(X(5, 0), 640, 720, 940, w('stone'), {frame: 'stamp', filter: 'bw', hint: 'close-up'});
			b.stk('hibiscus-red', X(5, 360), 1160, 300, {anim: F.float});
			b.stk('ill-veena-girl', X(5, -320), 1110, 360, {});
			return doc(this, null, 6, {tex: 'maroon-silk', scale: .9}, [null, null, null, {tex: 'ivory-paper'}, {tex: 'maroon-silk'}, {tex: 'maroon-silk'}], b.L);
		}});

	/* FESTIVAL DAYS · four festival colour sets; the title is hers to change */
	var FEST = [
		{key: 'vinayaka', sw: '#55612a', label: 'Vinayaka Chavithi', c1: '#e7c76d', c2: '#fff7df', tex: 'olive-gold', en: 'Vinayaka Chavithi ki ila', te: 'వినాయక చవితి శుభాకాంక్షలు', s1: 'modak', s2: 'lotus', washes: ['butter', 'magenta', 'sage', 'rose']},
		{key: 'sankranti', sw: '#9fc3ea', label: 'Sankranti', c1: '#1d3c78', c2: '#fffaf0', tex: 'powder-gingham', en: 'Sankranti vibes', te: 'సంక్రాంతి శుభాకాంక్షలు', s1: 'kite', s2: 'sugarcane', washes: ['powder', 'butter', 'terracotta', 'teal']},
		{key: 'diwali', sw: '#7a1426', label: 'Deepavali', c1: '#f3cf7a', c2: '#fff5e1', tex: 'maroon-silk', en: 'Deepavali ki ila', te: 'దీపావళి శుభాకాంక్షలు', s1: 'diya', s2: 'jasmine', washes: ['maroon', 'magenta', 'butter', 'espresso']},
		{key: 'ugadi', sw: '#2f6b2a', label: 'Ugadi', c1: '#2f6b2a', c2: '#fffbe8', tex: 'yellow-stripe', en: 'Ugadi subhakankshalu', te: 'ఉగాది శుభాకాంక్షలు', s1: 'neem-mango', s2: 'mango-toran', washes: ['sage', 'butter', 'terracotta', 'rose']}
	];
	T.push({id: 'festival-days', name: 'Festival Days', family: 'festival', blurb: 'Festival carousel in four colour sets: Vinayaka Chavithi, Sankranti, Deepavali, Ugadi', variants: FEST,
		make: function (v) {
			var b = B(), ws = v.washes;
			b.text(X(0, -150), 150, 700, v.en, 56, 'type', {c: '$c1', align: 'left'});
			b.text(X(0, -150), 235, 700, v.te, 42, 'te', {c: '$c1', align: 'left'});
			b.photo(X(0, -180), 830, 560, 760, w(ws[0]), {hint: 'portrait'});
			b.photo(X(0, 330), 560, 300, 460, w(ws[1]), {hint: 'detail'});
			b.stk(v.s2, X(0, 380), 1150, 260, {anim: F.float});
			b.photo(X(1, -170), 420, 580, 520, w(ws[2]), {hint: 'any'});
			b.photo(X(1, 200), 1010, 600, 520, w(ws[0]), {hint: 'any'});
			b.stk(v.s1, X(1, -330), 1060, 240, {anim: F.wig});
			b.photo(X(2, 0), 380, 640, 520, w(ws[1]), {hint: 'portrait'});
			b.photo(X(2, 0), 990, 640, 560, w(ws[3]), {hint: 'back / saree'});
			b.stk(v.s2, X(2, 400), 680, 200, {});
			b.photo(X(3, -260), 400, 400, 560, w(ws[0]), {hint: 'any'});
			b.photo(X(3, 210), 900, 560, 760, w(ws[2]), {hint: 'portrait'});
			b.stk('lotus', X(3, -280), 1080, 240, {anim: F.float});
			b.photo(X(4, 0), 620, 680, 980, w(ws[3]), {hint: 'portrait'});
			b.stk(v.s1, X(4, -360), 200, 220, {});
			b.text(X(4, 0), 1240, 860, v.te, 44, 'te', {c: '$c1'});
			return doc(this, v, 5, {tex: v.tex, scale: .9}, [], b.L);
		}});

	/* SOFT SWAN · blush organza, soft rounded frames, scallops, pearls, bows */
	T.push({id: 'soft-swan', name: 'Soft Swan', family: 'soft', blurb: 'Blush organza, soft rounded frames, scalloped edges, pearls and bows', washes: ['rose', 'lilac', 'stone', 'powder'],
		make: function () {
			var b = B();
			b.photo(X(0, -270), 337, 540, 675, w('rose'), {hint: 'any'});
			b.photo(X(0, 270), 337, 540, 675, w('stone'), {hint: 'any'});
			b.photo(X(0, -270), 1012, 540, 675, w('lilac'), {hint: 'any'});
			b.photo(X(0, 270), 1012, 540, 675, w('rose'), {hint: 'any'});
			b.stk('swan', X(0, 320), 640, 260, {anim: F.drift});
			b.photo(X(1), 675, 640, 920, w('lilac'), {frame: 'soft', hint: 'portrait'});
			b.text(X(1), 1240, 800, 'dressing up like a swan', 56, 'script', {c: '#7c5a63'});
			b.photo(X(2), 640, 600, 760, w('rose'), {frame: 'soft', hint: 'portrait'});
			b.stk('white-bow', X(2, 0), 250, 220, {anim: F.swing});
			b.shape('scallop', X(3, 540), 1130, 2160, 440, '#fbeef0', {op: .92});
			['stone', 'rose', 'lilac'].forEach(function (c, i) { b.photo(X(3, 540) + (i - 1) * 330, 580, 280, 460, w(c), {frame: 'border', bw: 10, hint: 'any'}); });
			b.photo(X(4, 230), 480, 470, 600, w('lilac'), {frame: 'soft', rot: 3, hint: 'portrait'});
			b.stk('pearls', X(4, 150), 1030, 600, {rot: -8});
			b.photo(X(5), 675, W, 1350, w('stone'), {hint: 'flat lay'});
			b.photo(X(6, -270), 675, 540, 1350, w('rose'), {hint: 'you'});
			b.photo(X(6, 270), 675, 540, 1350, w('lilac'), {hint: 'you'});
			b.stk('white-bow', X(6, 0), 140, 180, {});
			return doc(this, null, 7, {tex: 'blush-organza', scale: .8}, [], b.L);
		}});

	/* DOCUMENTING SUMMER · soft blue gingham, bows, forget-me-nots, a rose bouquet */
	T.push({id: 'documenting', name: 'Documenting Summer', family: 'soft', blurb: 'Soft blue gingham, bows, forget-me-nots, a rose bouquet and little labels', washes: ['powder', 'teal', 'butter', 'rose'],
		make: function () {
			var b = B();
			b.text(X(0, -60), 170, 700, 'documenting', 90, 'script', {c: '#1f4f8a'});
			b.text(X(0, -40), 270, 700, 'summer', 110, 'chunky', {wt: 800, c: '#f2c230', stroke: 6, strokeC: '#1f4f8a'});
			b.stk('blue-bow', X(0, -330), 140, 150, {anim: F.swing});
			b.photo(X(0, 0), 830, 820, 880, w('powder'), {frame: 'border', bw: 16, hint: 'you'});
			b.stk('white-butterfly', X(0, 380), 520, 160, {anim: F.float});
			b.photo(X(1, -150), 675, 760, 1350, w('teal'), {hint: 'full-length'});
			b.stk('rose-bouquet', X(1, 330), 1050, 360, {rot: 6});
			b.photo(X(2), 675, W, 1350, w('butter'), {hint: 'walking'});
			b.stk('forget-me-not', X(2, 380), 1200, 220, {anim: F.wig});
			b.ui('label', X(2, -260), 1200, 260, 64, {t: 'the fit 3', bg: '#e6eefb'});
			b.photo(X(3, -260), 675, 560, 1350, w('powder'), {hint: 'with flowers'});
			b.photo(X(3, 280), 400, 480, 620, w('rose'), {frame: 'border', bw: 12, hint: 'detail'});
			b.photo(X(3, 280), 1020, 480, 560, w('teal'), {frame: 'border', bw: 12, hint: 'any'});
			b.photo(X(4), 780, 820, 820, w('butter'), {frame: 'border', bw: 16, hint: 'you'});
			b.ui('bubble', X(4, 160), 250, 520, 80, {t: 'soft girl aesthetic in the city?', side: 'them'});
			b.stk('forget-me-not', X(4, -380), 1200, 200, {});
			b.photo(X(5), 675, W, 1350, w('teal'), {hint: 'place'});
			b.ui('bubble', X(5, 0), 560, 400, 80, {t: 'pinterest enough?', side: 'them', bg: '#dbe7fb'});
			return doc(this, null, 6, {tex: 'powder-gingham', scale: .8}, [], b.L);
		}});

	/* FIT CHECK · flower-macro and silk grounds, stamp frames, daisies, a music card */
	T.push({id: 'fit-check', name: 'Saree Fit Check', family: 'telugu', blurb: 'Warm flower and silk grounds, postage-stamp frames, daisies and a music card', washes: ['terracotta', 'maroon', 'butter', 'magenta'],
		make: function () {
			var b = B();
			b.photo(X(0), 675, 700, 1080, w('terracotta'), {frame: 'stamp', hint: 'full-length saree'});
			b.text(X(0), 1260, 700, 'fit check', 70, 'marker', {c: '#fff'});
			b.photo(X(1, 230), 675, 600, 1350, w('maroon'), {hint: 'laughing'});
			b.stk('daisy', X(1, -220), 200, 280, {anim: F.spin});
			b.photo(X(1, -260), 1060, 300, 470, w('butter'), {frame: 'music', title: 'Saree song', artist: 'Your playlist', card: '#1b1b1b', ink: '#fff', hint: 'any'});
			b.photo(X(2, -10), 380, 600, 640, w('magenta'), {frame: 'stamp', hint: 'saree drape'});
			b.photo(X(2, -10), 1020, 600, 560, w('butter'), {frame: 'stamp', hint: 'detail'});
			b.stk('daisy', X(2, 350), 700, 240, {});
			b.photo(X(3, 0), 420, 500, 600, w('terracotta'), {frame: 'stamp', hint: 'jewellery'});
			b.photo(X(3, 0), 1010, 500, 560, w('maroon'), {frame: 'stamp', hint: 'full-length'});
			b.stk('gerbera', X(3, 400), 150, 240, {anim: F.float});
			b.photo(X(4, -150), 675, 780, 1350, w('magenta'), {hint: 'portrait'});
			b.stk('gerbera', X(4, 380), 220, 260, {});
			b.photo(X(5, 20), 360, 640, 560, w('butter'), {frame: 'stamp', hint: 'flowers / detail'});
			b.photo(X(5, -60), 1000, 560, 600, w('terracotta'), {frame: 'stamp', hint: 'you'});
			b.stk('daisy', X(5, 360), 780, 260, {anim: F.spin});
			b.text(X(5, 300), 1260, 360, 'soft heart, strong mind', 32, 'hand', {wt: 700, c: '#fff'});
			return doc(this, null, 6, {tex: 'orange-silk', scale: .9}, [{tex: 'orange-silk'}, {tex: 'orange-silk'}, {tex: 'dahlia'}, {tex: 'dahlia'}, {tex: 'orange-silk'}, {tex: 'dahlia'}], b.L);
		}});

	/* AMMAYI CORE · cream frames, Telugu handwritten lines, lotus, kalash, parrot */
	T.push({id: 'ammayi-core', name: 'Ammayi Core', family: 'telugu', blurb: 'Cream frames with Telugu handwritten lines, lotus, a brass kalash and a parrot', washes: ['stone', 'rose', 'butter', 'sage'],
		make: function () {
			var b = B(), lines = ['నా సోకులు', 'పట్టు చీర కట్టుకుని', 'బుట్టబొమ్మలా', 'చిన్ని చిన్ని ఆశలు', 'అమ్మ నగలు', 'నవ్వుతూ ఉండాలి', 'రాధికలా'], ws = ['stone', 'rose', 'butter', 'sage', 'rose', 'stone', 'butter'];
			for (var i = 0; i < 7; i++) {
				b.photo(X(i), 650, 940, 1220, w(ws[i]), {frame: 'soft', paper: '#fdf3ec', hint: i ? 'portrait / detail' : 'saree flat lay'});
				b.text(X(i, 200), 300, 420, lines[i], 54, 'te', {c: '#fff', shadow: 'rgba(0,0,0,.4)', rot: -3});
			}
			b.stk('parrot-green', X(0, 360), 160, 170, {anim: F.float});
			b.stk('lotus', X(0, -360), 1180, 300, {});
			b.stk('jhumka', X(2, 390), 220, 200, {anim: F.swing});
			b.stk('lotus-bud', X(4, -440), 1100, 200, {});
			b.stk('lotus', X(5, -360), 1180, 320, {anim: F.float});
			b.stk('kalash-lotus', X(6, 340), 1100, 300, {});
			b.stk('parrot-green', X(6, 350), 300, 160, {flip: true, anim: F.float});
			return doc(this, null, 7, {tex: 'ivory-paper', scale: .9}, [], b.L);
		}});

	/* FILM ROLL · one film strip running through every slide, doodles around it */
	T.push({id: 'film-roll', name: 'Film Roll', family: 'seamless', blurb: 'One film strip runs through every slide, with sun doodles and handwritten notes', washes: ['rose', 'teal', 'butter', 'terracotta', 'lilac', 'sage'],
		make: function () {
			var b = B(), n = 6, ws = ['rose', 'teal', 'butter', 'terracotta', 'lilac', 'sage'];
			b.shape('film', n * W / 2 + 180, 675, n * W - 360, 380, '#2a1b1d');
			for (var k = 0; k < 16; k++) b.photo(470 + k * 360, 675, 300, 280, w(ws[k % ws.length]), {hint: 'any'});
			b.stk('film-canister', X(0, -360), 675, 220, {rot: -4});
			b.stk('sun-doodle', X(0, -380), 210, 260, {anim: F.spin});
			b.text(X(0, -230), 1080, 520, 'first 15 days of\nFebruary', 52, 'marker', {c: '#3b2a2a', align: 'left'});
			b.text(X(1, -60), 230, 520, 'photo dump', 72, 'marker', {c: '#c2366b', rot: -6, curve: 14});
			b.text(X(2, 0), 1080, 400, 'Mumbai', 70, 'marker', {c: '#c2366b'});
			b.stk('sun-doodle', X(3, 320), 1150, 300, {anim: F.spin});
			b.stk('doodles-pink', X(3, -200), 260, 260, {});
			b.text(X(4, 220), 1100, 420, 'week of love', 60, 'marker', {c: '#c2366b'});
			b.text(X(5, 140), 230, 520, 'so far, so good!', 76, 'marker', {c: '#3b2a2a', rot: -4});
			b.stk('sun-doodle', X(5, 330), 1150, 320, {anim: F.spin});
			return doc(this, null, n, {tex: 'ivory-paper', scale: .9}, [], b.L);
		}});

	/* DATE STAMP · warm film photos, an orange camera date, torn splits */
	T.push({id: 'date-stamp', name: 'Date Stamp', family: 'y2k', blurb: 'Warm film-camera look with an orange date stamp and torn split photos', washes: ['espresso', 'terracotta', 'stone', 'maroon'],
		make: function () {
			var b = B(), stamp = function (i, x, y) { b.text(X(i, x), y, 360, "'25  10 21", 46, 'date', {c: '#ff8a1f', align: 'left', shadow: 'rgba(120,40,0,.45)'}); };
			b.photo(X(0), 675, W, 1350, w('espresso'), {filter: 'warm', hint: 'close-up'}); stamp(0, -280, 1260);
			b.photo(X(1, -270), 675, 540, 1350, w('terracotta'), {filter: 'warm', hint: 'you'});
			b.photo(X(1, 270), 337, 540, 675, w('stone'), {filter: 'warm', hint: 'any'});
			b.photo(X(1, 270), 1012, 540, 675, w('maroon'), {filter: 'warm', hint: 'any'});
			b.stk('torn-strip', X(1, 0), 675, 100, {h: 1350});
			b.photo(X(2), 675, W, 1350, w('stone'), {filter: 'warm', hint: 'you'}); stamp(2, 100, 1260);
			b.photo(X(3), 675, W, 1350, w('maroon'), {filter: 'warm', hint: 'you'});
			b.photo(X(3, 0), 560, 620, 460, w('terracotta'), {frame: 'border', bw: 10, filter: 'warm', hint: 'any'}); stamp(3, -260, 1260);
			b.photo(X(4), 675, W, 1350, w('espresso'), {filter: 'warm', hint: 'jewellery close-up'}); stamp(4, 180, 1240);
			b.photo(X(5), 337, W, 675, w('terracotta'), {filter: 'warm', hint: 'any'});
			b.photo(X(5), 1012, W, 675, w('stone'), {filter: 'warm', hint: 'any'});
			b.stk('torn-paper', X(5, 0), 675, 1200, {h: 90, rot: 1});
			return doc(this, null, 6, {c: '#1a1210'}, [], b.L);
		}});

	/* PHOTO DUMP ON A ROPE · polaroids pegged on a string across the slides */
	T.push({id: 'photo-rope', name: 'Photo Dump on a Rope', family: 'seamless', blurb: 'Polaroids pegged on one string that runs across every slide', washes: ['rose', 'powder', 'butter', 'sage', 'lilac', 'terracotta'],
		make: function () {
			var b = B(), n = 5, pts = [], ws = ['rose', 'powder', 'butter', 'sage', 'lilac', 'terracotta'];
			for (var x = 0; x <= n * W; x += 90) pts.push([x, 330 + Math.sin(x / (n * W) * Math.PI * n) * 60 + 30]);
			b.path(pts, {c: '#8b6b4a', lw: 6, dash: [], plane: false, anim: F.draw});
			for (var k = 0; k < 9; k++) {
				var px = 300 + k * 560, py = 330 + Math.sin(px / (n * W) * Math.PI * n) * 60 + 30;
				b.photo(px, py + 300, 380, 470, w(ws[k % ws.length]), {frame: 'polaroid', rot: (k % 2 ? 4 : -4), hint: 'any', anim: F.swing});
				b.stk('peg', px, py + 40, 60, {rot: (k % 2 ? 4 : -4)});
			}
			b.text(X(0, -60), 160, 760, 'photo dump', 110, 'marker', {c: '#c2366b', rot: -4});
			b.text(X(4, 0), 1200, 760, 'see you next month', 60, 'marker', {c: '#3b2a2a'});
			b.stk('doodles-pink', X(2, 0), 1160, 220, {});
			return doc(this, null, n, {tex: 'plaster', scale: .9}, [], b.L);
		}});

	/* BIG WORDS ACROSS · one bold word per slide over full photos */
	T.push({id: 'big-words', name: 'Big Words', family: 'seamless', blurb: 'One bold word per slide over your photos: a sentence you swipe through', washes: ['navy', 'espresso', 'teal', 'maroon', 'sage'],
		make: function () {
			var b = B(), words = ['It’s', 'never', 'too', 'late', 'to start'], ws = ['navy', 'espresso', 'teal', 'maroon', 'sage'];
			words.forEach(function (wd, i) {
				b.photo(X(i), 675, W, 1350, w(ws[i]), {hint: 'you'});
				b.text(X(i, -40), 420 + (i % 2) * 260, 900, wd, 200, 'chunky', {wt: 800, c: '$c1', lh: .9, anim: F.rise(.15)});
			});
			return doc(this, null, 5, {c: '#111'}, [], b.L);
		}, vars: {c1: '#f5e663'}});
})(window);
