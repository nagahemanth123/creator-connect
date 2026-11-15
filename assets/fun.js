/* Busy Fox Creator Connect: the playful layer for the dashboards. See fun.css.
   Fun.doodles(host)          paper-cut doodles that bob beside a heading
   Fun.ticker(text[])         returns a scrolling tape line element
   Fun.arrive(nodes)          drop in, one after another
   Fun.onScroll(nodes)        rise into place when scrolled to
   Fun.count(nodes)           count numbers up from zero
   Fun.confetti(x, y)         a burst of paper pieces from a point on screen */
(function () {
	'use strict';
	var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	var C = {cherry: '#C42847', pink: '#F2B8C6', butter: '#E2C35A', cocoa: '#3D2521', cream: '#FFF9F7'};
	var STAR = '<path d="M12 1.5l2.6 6.7 7 .5-5.4 4.6 1.8 6.9L12 16.4 5.9 20.2l1.9-6.9L2.4 8.7l7-.5z"/>';
	var SHAPES = {
		heart: '<path fill="' + C.cherry + '" d="M12 21C5 15.4 2 12 2 8.2 2 5.3 4.2 3 7 3c1.9 0 3.6 1 5 2.9C13.4 4 15.100 3 17 3c2.800 0 5 2.300 5 5.200 0 3.800-3 7.200-10 12.800z"/>',
		star: '<g fill="' + C.butter + '">' + STAR + '</g>',
		spark: '<path fill="' + C.pink + '" d="M12 1c.9 6.200 4.800 10.100 11 11-6.200.900-10.100 4.800-11 11-.900-6.200-4.800-10.100-11-11 6.200-.900 10.100-4.800 11-11z"/>',
		play: '<g><rect x="1.500" y="1.500" width="21" height="21" rx="6" fill="' + C.cocoa + '"/><path fill="' + C.cream + '" d="M9.500 7.500v9l7.500-4.500z"/></g>',
		ring: '<circle cx="12" cy="12" r="9.500" fill="none" stroke="' + C.cherry + '" stroke-width="2.200" stroke-dasharray="3.500 4.500" stroke-linecap="round"/>',
		squig: '<path fill="none" stroke="' + C.cocoa + '" stroke-width="2.400" stroke-linecap="round" d="M2 14c2.500-6 5-6 7.500 0s5 6 7.500 0 3.500-5 5-3"/>',
		cam: '<g><rect x="2" y="6" width="20" height="14" rx="4" fill="' + C.pink + '"/><rect x="8" y="3" width="8" height="5" rx="2" fill="' + C.pink + '"/><circle cx="12" cy="13" r="4.200" fill="' + C.cream + '"/><circle cx="12" cy="13" r="2" fill="' + C.cocoa + '"/></g>'
	};
	// [shape, motion, x%, y%, size px, seconds, delay, only on wide screens]
	var SET = [
		['heart', 'beat', 8, 6, 30, 0, 0, 0], ['star', 'turn', 34, 52, 38, 16, 0, 0], ['spark', 'wob', 58, 4, 30, 3.2, .4, 0],
		['play', 'bob', 76, 46, 40, 5.5, .2, 1], ['ring', 'turn', 52, 62, 26, 11, 0, 1], ['squig', 'bob', 14, 74, 44, 4.200, .8, 1],
		['cam', 'wob', 90, 2, 36, 4, 1, 1], ['spark', 'wob', 92, 78, 22, 2.800, 0, 1]
	];
	function svg(inner) { return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + inner + '</svg>'; }

	function doodles(host, where) {
		if (!host || host.querySelector('.fun-doodles')) return;
		var box = document.createElement('div');
		box.className = 'fun-doodles' + (where ? ' ' + where : ''); box.setAttribute('aria-hidden', 'true');
		box.innerHTML = SET.map(function (d) {
			return svg(SHAPES[d[0]]).replace('<svg', '<svg class="' + d[1] + (d[7] ? ' wide' : '') + '" style="--x:' + d[2] + '%;--y:' + d[3] + '%;--s:' + d[4] + 'px;' + (d[5] ? '--t:' + d[5] + 's;' : '') + '--d:' + d[6] + 's"');
		}).join('');
		host.classList.add('fun-host');
		host.appendChild(box);
	}
	function ticker(words) {
		var el = document.createElement('div'), star = svg('<g fill="' + C.butter + '">' + STAR + '</g>');
		el.className = 'fun-tick'; el.setAttribute('aria-hidden', 'true');
		var run = '<span>' + words.map(function (w, i) { return (i % 2 ? '<i>' + w + '</i>' : w) + star; }).join('') + '</span>';
		el.innerHTML = '<div>' + run + run + run + run + '</div>';
		return el;
	}
	function list(nodes) { return typeof nodes === 'string' ? [].slice.call(document.querySelectorAll(nodes)) : [].slice.call(nodes || []); }
	function arrive(nodes) { list(nodes).forEach(function (n, i) { n.style.setProperty('--i', i); n.classList.add('fun-in'); }); }
	function onScroll(nodes) {
		var all = list(nodes);
		if (calm || !('IntersectionObserver' in window)) return;
		var io = new IntersectionObserver(function (es) {
			es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('fun-show'); e.target.classList.remove('fun-wait'); io.unobserve(e.target); } });
		}, {rootMargin: '0px 0px -8% 0px'});
		all.forEach(function (n) { if (n.getBoundingClientRect().top > window.innerHeight * .9) { n.classList.add('fun-wait'); io.observe(n); } });
	}
	function count(nodes) {
		if (calm) return;
		list(nodes).forEach(function (el) {
			var txt = el.textContent, m = txt.match(/^([\d,]+)(.*)$/);
			if (!m) return;
			var end = parseInt(m[1].replace(/,/g, ''), 10), t0 = 0;
			if (!end) return;
			(function step(t) {
				if (!t0) t0 = t;
				var p = Math.min(1, (t - t0) / 1400), e = 1 - Math.pow(1 - p, 3);
				el.textContent = p < 1 ? Math.round(end * e).toLocaleString('en-IN') + m[2] : txt;
				if (p < 1) requestAnimationFrame(step);
			})(performance.now());
		});
	}
	function confetti(x, y) {
		if (calm) return;
		var box = document.createElement('div'), cols = [C.cherry, C.pink, C.butter, C.cocoa], h = '';
		box.className = 'fun-conf'; box.style.left = (x == null ? window.innerWidth / 2 : x) + 'px'; box.style.top = (y == null ? window.innerHeight / 2 : y) + 'px';
		for (var i = 0; i < 34; i++) {
			var a = Math.random() * Math.PI * 2, r = 70 + Math.random() * 170;
			h += '<i style="--c:' + cols[i % 4] + ';--dx:' + Math.round(Math.cos(a) * r) + 'px;--dy:' + Math.round(Math.sin(a) * r * .8 + 90) + 'px;--rot:' + Math.round(Math.random() * 720 - 360) + 'deg;--t:' + (0.9 + Math.random() * .7).toFixed(2) + 's"></i>';
		}
		box.innerHTML = h;
		document.body.appendChild(box);
		setTimeout(function () { box.remove(); }, 1900);
	}
	window.Fun = {doodles: doodles, ticker: ticker, arrive: arrive, onScroll: onScroll, count: count, confetti: confetti};
})();
