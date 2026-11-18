/* Busy Fox Creator Connect: the playful layer for the dashboards. See fun.css.
   Fun.doodles(host)          paper-cut doodles beside a heading: each one has its own small act
   Fun.ticker(text[])         returns a scrolling tape line element
   Fun.intro(page)            the page-load sequence for the greeting (photo, note, name letter by letter)
   Fun.arrive(nodes, wait)    drop in, one after another (wait = ms before the first)
   Fun.onScroll(nodes)        rise into place when scrolled to; the hand note gets a scribble that draws itself
   Fun.when(nodes, cls)       add a class once, when the node is fully on screen (the READY stamp)
   Fun.count(nodes, wait)     count numbers up from zero
   Fun.confetti(x, y)         paper pieces thrown up from a point on screen; they fall, drift and spin
   Fun.sparkle(el)            a small burst of flat sparks round an element
   Fun.planner(root, opt)     called by planner.js after every redraw: plays each entrance once, keeps loops asleep off screen */
(function () {
	'use strict';
	var calm = /[?&]still\b/.test(location.search) || !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); // ?still = the finished look, no motion
	var hasIO = 'IntersectionObserver' in window;
	var C = {cherry: '#C42847', dark: '#A11F3A', pink: '#F2B8C6', rose: '#D98799', butter: '#E2C35A', cocoa: '#3D2521', cream: '#FFF9F7'};
	var STAR = '<path d="M12 1.5l2.6 6.7 7 .5-5.4 4.6 1.8 6.9L12 16.4 5.9 20.2l1.9-6.9L2.4 8.7l7-.5z"/>';
	var SPARK = 'M12 1c.9 6.2 4.8 10.1 11 11-6.2.9-10.1 4.8-11 11-.9-6.2-4.8-10.1-11-11 6.2-.9 10.1-4.8 11-11z';
	function sp(x, y, s, col, n) { return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')"><path class="tw" style="--n:' + n + '" fill="' + col + '" d="' + SPARK + '"/></g>'; }
	var SHAPES = {
		heart: '<path fill="' + C.cherry + '" d="M12 21C5 15.4 2 12 2 8.2 2 5.3 4.2 3 7 3c1.900 0 3.600 1 5 2.900C13.400 4 15.100 3 17 3c2.800 0 5 2.300 5 5.200 0 3.800-3 7.200-10 12.800z"/>',
		twinkle: sp(0, 5, .62, C.butter, 0) + sp(13, 0, .36, C.rose, 1) + sp(15, 14, .3, C.cherry, 2),
		clap: '<rect x="2" y="9.500" width="20" height="12.500" rx="2.200" fill="' + C.cocoa + '"/><rect x="5" y="14" width="10" height="1.600" rx=".8" fill="' + C.cream + '"/><rect x="5" y="17.300" width="6" height="1.600" rx=".8" fill="' + C.rose + '"/>' +
			'<g class="arm"><rect x="2" y="4" width="20" height="4.600" rx="1.200" fill="' + C.cocoa + '"/><path fill="' + C.cream + '" d="M6.500 4h3l-2 4.600h-3zM12.500 4h3l-2 4.600h-3zM18.500 4h3l-2 4.600h-3z"/></g>',
		cam: '<rect class="shut" x="15.500" y="3.600" width="4" height="3.400" rx="1" fill="' + C.cocoa + '"/><rect x="2" y="6.500" width="20" height="14.500" rx="3.600" fill="' + C.rose + '"/><rect x="5" y="4" width="7" height="4" rx="1.500" fill="' + C.rose + '"/>' +
			'<circle cx="12" cy="13.800" r="4.800" fill="' + C.cream + '"/><circle class="lens" cx="12" cy="13.800" r="2.500" fill="' + C.cocoa + '"/><g transform="translate(15 -5) scale(.42)"><path class="flash" fill="' + C.butter + '" d="' + SPARK + '"/></g>',
		plane: '<g class="fly"><path fill="' + C.cherry + '" d="M2 10.500L22 3 13 21l-2.500-7z"/><path fill="' + C.dark + '" d="M22 3L10.500 14 13 21z"/></g>',
		squig: '<path class="pen" pathLength="1" fill="none" stroke="' + C.cocoa + '" stroke-width="2.400" stroke-linecap="round" d="M2 14c2.500-6 5-6 7.500 0s5 6 7.500 0 3.500-5 5-3"/>'
	};
	// [shape, x%, y%, size px, only on wide screens]  (the first three sit beside the logo on a phone)
	var SET = [
		['clap', 54, 6, 40, 0], ['heart', 6, 4, 30, 0], ['twinkle', 30, 46, 46, 0],
		['squig', 12, 78, 46, 1], ['cam', 86, 0, 38, 1], ['plane', 0, 58, 30, 1]
	];
	function svg(inner) { return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + inner + '</svg>'; }
	function list(nodes) { return typeof nodes === 'string' ? [].slice.call(document.querySelectorAll(nodes)) : nodes && nodes.nodeType ? [nodes] : [].slice.call(nodes || []); }
	function inView(el, part) { var r = el.getBoundingClientRect(); return r.width > 0 && r.top < window.innerHeight * (part || .88) && r.bottom > 0; }

	// loops sleep while they are off screen
	var vis = hasIO && !calm ? new IntersectionObserver(function (es) { es.forEach(function (e) { e.target.classList.toggle('fun-off', !e.isIntersecting); }); }, {rootMargin: '60px 0px'}) : null;
	function watch(el) { if (vis && el) vis.observe(el); }
	function unwatch(el) { if (vis && el) vis.unobserve(el); }

	function doodles(host, where) {
		if (!host || host.querySelector('.fun-doodles')) return;
		var box = document.createElement('div');
		box.className = 'fun-doodles' + (where ? ' ' + where : ''); box.setAttribute('aria-hidden', 'true');
		box.innerHTML = SET.map(function (d, i) {
			return svg(SHAPES[d[0]]).replace('<svg', '<svg class="d-' + d[0] + (d[4] ? ' wide' : '') + '" style="--x:' + d[1] + '%;--y:' + d[2] + '%;--s:' + d[3] + 'px;--n:' + i + '"');
		}).join('');
		host.classList.add('fun-host');
		host.appendChild(box);
		watch(box);
	}
	function ticker(words) {
		var el = document.createElement('div'), star = svg('<g fill="' + C.butter + '">' + STAR + '</g>');
		el.className = 'fun-tick'; el.setAttribute('aria-hidden', 'true');
		var run = '<span>' + words.map(function (w, i) { return (i % 2 ? '<i>' + w + '</i>' : w) + star; }).join('') + '</span>';
		el.innerHTML = '<div>' + run + run + run + run + '</div>';
		watch(el);
		return el;
	}
	// the greeting: the photo pops, the note slides in, the name is dealt letter by letter (put back as plain text afterwards)
	function intro(page) {
		if (calm || !page) return;
		page.classList.add('fun-go');
		gate = performance.now() + 1450; // the planner's own entrances wait until the greeting, numbers and tape line are in
		watch(page.querySelector('.fun-ring'));
		var em = page.querySelector('.hello h1 em'), txt = em && em.textContent;
		if (!em || !txt) return;
		var w0 = em.getBoundingClientRect().width, n = 0;
		if (txt.length <= 14 && /^[A-Za-z\u00C0-\u024F'’-]+$/.test(txt)) { // Latin names only: Telugu and other joined scripts must never be cut into letters
			em.innerHTML = txt.replace(/[\s\S]/g, function (ch) { return '<span style="--i:' + (n++) + '">' + (ch === '<' ? '&lt;' : ch === '&' ? '&amp;' : ch) + '</span>'; });
			em.classList.add('fun-split'); em.setAttribute('aria-label', txt);
			if (Math.abs(em.getBoundingClientRect().width - w0) > 1.5) n = 0; // the letters would shift when put back: move the whole word instead
		}
		if (!n) { em.textContent = txt; em.classList.remove('fun-split'); em.removeAttribute('aria-label'); em.classList.add('fun-word'); return; }
		setTimeout(function () { if (em.classList.contains('fun-split')) { em.textContent = txt; em.classList.remove('fun-split'); em.removeAttribute('aria-label'); } }, 1400 + n * 40);
	}
	function arrive(nodes, wait) { list(nodes).forEach(function (n, i) { n.style.setProperty('--i', i); if (wait) n.style.setProperty('--w', wait + 'ms'); n.classList.add('fun-in'); }); }
	var SCRIB = '<svg class="fun-scrib" viewBox="0 0 40 14" aria-hidden="true" focusable="false"><path pathLength="1" d="M2 9c4-7 8-7 10-1s5 6 8-1 7-6 9 0 5 3 9-2"/></svg>';
	function onScroll(nodes) {
		var all = list(nodes);
		all.forEach(function (n) { var h = n.querySelector(':scope > .hd > .hand'); if (h && !h.querySelector('.fun-scrib')) h.insertAdjacentHTML('beforeend', SCRIB); });
		if (calm) return;
		if (!hasIO) return all.forEach(function (n) { n.classList.add('fun-seen'); });
		var io = new IntersectionObserver(function (es) {
			es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('fun-show', 'fun-seen'); e.target.classList.remove('fun-wait'); io.unobserve(e.target); } });
		}, {rootMargin: '0px 0px -8% 0px'});
		all.forEach(function (n) { if (n.getBoundingClientRect().top > window.innerHeight * .9) { n.classList.add('fun-wait'); io.observe(n); } else n.classList.add('fun-seen'); });
	}
	function when(nodes, cls) {
		if (calm || !hasIO) return;
		var io = new IntersectionObserver(function (es) {
			es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.remove('fun-arm'); e.target.classList.add(cls); io.unobserve(e.target); } });
		}, {threshold: 1, rootMargin: '0px 0px -12% 0px'});
		list(nodes).forEach(function (n) { n.classList.add('fun-arm'); io.observe(n); });
	}
	function count(nodes, wait) {
		if (calm) return;
		list(nodes).forEach(function (el) {
			var txt = el.textContent, m = txt.match(/^([\d,]+)(.*)$/);
			if (!m) return;
			var end = parseInt(m[1].replace(/,/g, ''), 10), t0 = performance.now() + (wait || 0), last = '';
			if (!end) return;
			(function step() {
				var p = Math.min(1, Math.max(0, (performance.now() - t0) / 1300)), e = 1 - Math.pow(1 - p, 3);
				var s = p < 1 ? Math.round(end * e).toLocaleString('en-IN') + m[2] : txt;
				if (s !== last) el.textContent = last = s;
				if (p < 1 && el.isConnected) requestAnimationFrame(step);
			})();
		});
	}

	// paper confetti: thrown up from (x, y), then gravity. Three nested boxes so sideways drift, the fall and the spin each get their own curve.
	function confetti(x, y) {
		if (calm) return;
		if (x && x.getBoundingClientRect) { var r = x.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; }
		if (x == null) x = window.innerWidth / 2;
		if (y == null) y = window.innerHeight * .55;
		var box = document.createElement('div'), cols = [C.cherry, C.pink, C.butter, C.cherry, C.rose, C.cocoa, C.pink], kinds = ['', '', 'sq', 'dot', 'tri', 'rib'], h = '', small = window.innerWidth < 600;
		box.className = 'fun-conf'; box.style.left = x + 'px'; box.style.top = y + 'px';
		var room = Math.max(120, Math.min(y - 20, small ? 300 : 380)), N = small ? 40 : 48;
		for (var i = 0; i < N; i++) {
			var a = -Math.PI / 2 + (Math.random() - .5) * 2.300, v = .35 + Math.random() * .65, k = kinds[i % kinds.length];
			var dx = Math.sin(a + Math.PI / 2) * (small ? 150 : 230) * v + (Math.random() - .5) * 40, up = -room * v, dn = 120 + Math.random() * 260;
			h += '<i style="--dx:' + Math.round(dx) + 'px;--t:' + (1.25 + Math.random() * .7).toFixed(2) + 's;--d:' + Math.round(Math.random() * 90) + 'ms"><i style="--up:' + Math.round(up) + 'px;--dn:' + Math.round(dn) + 'px"><i class="' + k + '" style="--c:' + cols[i % cols.length] + ';--rz:' + Math.round(Math.random() * 900 - 450) + 'deg;--rx:' + Math.round(360 + Math.random() * 720) + 'deg"></i></i></i>';
		}
		box.innerHTML = h;
		document.body.appendChild(box);
		setTimeout(function () { box.remove(); }, 2300);
	}
	// flat sparks that jump out from round an element (the hero number when it has finished counting)
	function sparkle(el) {
		if (calm || !el || !el.isConnected) return;
		var r = el.getBoundingClientRect(), box = document.createElement('div'), cols = [C.cherry, C.cream, C.rose, C.cherry], h = '', N = 8;
		if (!r.width) return;
		box.className = 'fun-sp'; box.style.left = (r.left + r.width / 2 + window.scrollX) + 'px'; box.style.top = (r.top + r.height / 2 + window.scrollY) + 'px';
		for (var i = 0; i < N; i++) {
			var a = (i / N) * Math.PI * 2 + .3, rx = r.width / 2 + 2, ry = r.height / 2 - 4, far = 10 + (i % 3) * 7, s = 8 + (i * 5) % 7;
			h += '<i style="--x0:' + Math.round(Math.cos(a) * rx * .8) + 'px;--y0:' + Math.round(Math.sin(a) * ry * .8) + 'px;--x1:' + Math.round(Math.cos(a) * (rx + far)) + 'px;--y1:' + Math.round(Math.sin(a) * (ry + far)) + 'px;--d:' + (i % 4) * 35 + 'ms;width:' + s + 'px;height:' + s + 'px">' +
				(i % 3 === 2 ? '<b style="background:' + cols[i % 4] + '"></b>' : '<svg viewBox="0 0 24 24"><path fill="' + cols[i % 4] + '" d="' + SPARK + '"/></svg>') + '</i>';
		}
		box.innerHTML = h;
		document.body.appendChild(box);
		setTimeout(function () { box.remove(); }, 1100);
	}

	/* The planner rebuilds its whole DOM on every action, so one-shot entrances are kept here, per planner:
	   each plays once, is held until it is on screen, and if a redraw lands in the middle it carries on from where it was (--el = ms already played). */
	var gate = 0;
	var HERO_COUNT_AT = 380, HERO_COUNT = 900, HERO_DONE = HERO_COUNT_AT + HERO_COUNT;
	function planner(root, opt) {
		if (calm || !root) return;
		opt = opt || {};
		var S = root._fun || (root._fun = {seen: {}, io: [], nodes: []});
		S.io.forEach(function (io) { io.disconnect(); }); S.io = [];
		S.nodes.forEach(unwatch); S.nodes = [];
		if (opt.deal) S.seen.cal = 0;
		function stage(el, key, dur, cls, start) {
			if (!el) return;
			var t = S.seen[key], now = performance.now();
			if (t === -1) return;
			function go(t0, first) { el.style.setProperty('--el', Math.round(performance.now() - t0) + 'ms'); el.classList.add(cls); if (start) start(t0, first); }
			if (t) { if (now - t > dur) S.seen[key] = -1; else go(t, false); return; }
			if (!hasIO || inView(el)) { S.seen[key] = now; return go(now, true); }
			el.classList.add('fun-hold');
			var io = new IntersectionObserver(function (es) {
				if (!es.some(function (e) { return e.isIntersecting; })) return;
				io.disconnect();
				if (!el.isConnected) return;
				S.seen[key] = performance.now(); el.classList.remove('fun-hold'); go(S.seen[key], true);
			}, {rootMargin: '0px 0px -12% 0px'});
			io.observe(el); S.io.push(io);
		}
		var hero = root.querySelector('.pl-hero'), peek = root.querySelector('.pl-peek'), cal = root.querySelector('.pl-cal');
		clearTimeout(S.tm);
		if (performance.now() < gate) {
			[hero, peek, cal].forEach(function (n) { if (n) n.classList.add('fun-hold'); });
			S.tm = setTimeout(function () { [hero, peek, cal].forEach(function (n) { if (n) n.classList.remove('fun-hold'); }); if (root.contains(hero || cal)) planner(root); }, gate - performance.now() + 10);
			return;
		}
		stage(peek, 'peek', 1700, 'pl-dealt', function (t0, first) {
			// if the slips are on screen while the card is still landing, they wait for it
			if (first) { var h = S.seen.hero; S.wait = h > 0 ? Math.max(0, 760 - (t0 - h)) : h === -1 ? 0 : 760; }
			peek.style.setProperty('--w', Math.round(S.wait || 0) + 'ms');
		});
		stage(hero, 'hero', 3600, 'pl-land', function (t0, first) {
			var el = hero.querySelector('.pl-n'), end = el && parseInt(el.textContent, 10), last = -1;
			if (!end) return;
			el.style.minWidth = el.offsetWidth + 'px'; // the headline beside it must not shuffle while the number counts
			(function step() {
				if (!el.isConnected) return;
				var p = (performance.now() - t0 - HERO_COUNT_AT) / HERO_COUNT;
				if (p >= 1) { el.textContent = end; return; }
				var v = Math.round(end * (1 - Math.pow(1 - Math.max(0, p), 3)));
				if (v !== last) el.textContent = last = v;
				requestAnimationFrame(step);
			})();
			if (first) setTimeout(function () { var n = root.querySelector('.pl-hero .pl-n'); if (n && inView(n, 1)) sparkle(n); }, HERO_DONE + 40);
		});
		stage(cal, 'cal', 1150, 'pl-deal');
		[hero, cal].forEach(function (n) { if (n) { watch(n); S.nodes.push(n); } });
	}

	window.Fun = {doodles: doodles, ticker: ticker, intro: intro, arrive: arrive, onScroll: onScroll, when: when, count: count, confetti: confetti, sparkle: sparkle, planner: planner};
})();
