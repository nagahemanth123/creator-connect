/* Busy Fox Creator Connect: her Instagram anniversary (5 years or more, when it is within 90 days or was in the last 7).
   Party.mount(el, anniv, {planner(), req(sub, opt), toast, toIdea(id)})
   1) a ticket-style strip at the top of the dashboard: the number, the date, a live countdown, her first post, counts that roll up
   2) for about 25 seconds after the page opens, paper-cut pieces float up BEHIND the page's cards (never over text, never
      catching a tap); then the layer is removed from the page, and only the candle on the strip keeps moving
   3) "Plan my N-year reel" opens the planner's add-post form on that date; "Ask Busy Fox" stores a request for the team
   With ?still or reduced motion: the calm final state, no floating layer. */
(function () {
	'use strict';
	var IST = 330 * 60000, DAY = 86400000;
	var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	var calm = /[?&]still\b/.test(location.search) || !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
	var C = {cherry: '#C42847', dark: '#A11F3A', pink: '#F2B8C6', soft: '#FADDE4', rose: '#D98799', butter: '#F6E3A1', gold: '#E2C35A', cocoa: '#3D2521', cream: '#FFF9F7'};
	var SPARK = 'M12 1c.9 6.2 4.8 10.1 11 11-6.2.9-10.1 4.8-11 11-.9-6.2-4.8-10.1-11-11 6.2-.9 10.1-4.8 11-11z';
	function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]; }); }
	function full(v) { return Math.round(Number(v)).toLocaleString('en-IN'); }
	function short(v) { return window.Kit ? window.Kit.short(v) : full(v); }
	function day(iso) { var d = new Date(Date.parse(iso) + IST); return d.getUTCDate() + ' ' + MON[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }
	function svg(box, inner) { return '<svg viewBox="' + box + '" aria-hidden="true" focusable="false">' + inner + '</svg>'; }
	function serif(x, y, size, fill, text) { return '<text x="' + x + '" y="' + y + '" text-anchor="middle" font-family="Playfair Display, Georgia, serif" font-style="italic" font-weight="600" font-size="' + size + '" fill="' + fill + '">' + text + '</text>'; }
	var CANDLE = '<rect x="9" y="12" width="6" height="11" rx="1.500" fill="' + C.butter + '"/><path d="M9 16l6-2.500M9 20l6-2.500" stroke="' + C.gold + '" stroke-width="1.400"/><path class="pt-flame" fill="' + C.cherry + '" d="M12 2.500c2.200 2.600 3 4.300 3 5.700a3 3 0 0 1-6 0c0-1.400.8-3.100 3-5.700z"/>';
	// the paper pieces: [viewBox, markup, width in px]
	function pieces(a) {
		var y0 = new Date(Date.parse(a.first_post) + IST).getUTCFullYear(), y1 = y0 + a.years, n = String(a.years);
		var tag = function (label, bg, ink) { return ['0 0 64 30', '<path fill="' + bg + '" d="M5 0h54a5 5 0 0 1 5 5v5a5 5 0 0 0 0 10v5a5 5 0 0 1-5 5H5a5 5 0 0 1-5-5v-5a5 5 0 0 0 0-10V5a5 5 0 0 1 5-5z"/>' + serif(32, 21.500, 17, ink, label), 58]; };
		return [
			['0 0 44 44', '<circle cx="22" cy="22" r="22" fill="' + C.cherry + '"/>' + serif(22, 30, n.length > 1 ? 24 : 28, C.cream, n), 46],
			tag(y0, C.butter, C.cocoa), tag(y1, C.soft, C.dark),
			['0 0 24 24', '<path fill="' + C.gold + '" d="' + SPARK + '"/>', 26],
			['0 0 24 24', '<path fill="' + C.rose + '" d="' + SPARK + '"/>', 18],
			['0 0 24 24', CANDLE.replace('class="pt-flame" ', ''), 34],
			['0 0 24 24', '<rect x="2" y="9.500" width="20" height="12.500" rx="2.200" fill="' + C.cocoa + '"/><rect x="5" y="14" width="10" height="1.600" rx=".8" fill="' + C.cream + '"/><rect x="5" y="17.300" width="6" height="1.600" rx=".8" fill="' + C.rose + '"/><g transform="rotate(-14 2 8.6)"><rect x="2" y="4" width="20" height="4.600" rx="1.200" fill="' + C.cocoa + '"/><path fill="' + C.cream + '" d="M6.500 4h3l-2 4.600h-3zM12.500 4h3l-2 4.600h-3zM18.500 4h3l-2 4.600h-3z"/></g>', 36],
			['0 0 24 24', '<path fill="' + C.pink + '" d="M12 21C5 15.4 2 12 2 8.2 2 5.3 4.2 3 7 3c1.900 0 3.600 1 5 2.900C13.400 4 15.100 3 17 3c2.800 0 5 2.300 5 5.200 0 3.800-3 7.200-10 12.800z"/>', 24],
			['0 0 24 24', '<path fill="' + C.cherry + '" d="' + SPARK + '"/>', 14],
			['0 0 44 44', '<circle cx="22" cy="22" r="22" fill="' + C.butter + '"/>' + serif(22, 30, n.length > 1 ? 24 : 28, C.cocoa, n), 38]
		];
	}
	// the floating layer: every piece rises once or twice with a slow sway; after ~25 s the whole layer leaves the page
	function air(a) {
		if (calm || document.querySelector('.pt-air')) return;
		var set = pieces(a), wide = window.innerWidth >= 900, count = wide ? 24 : 15, layer = document.createElement('div');
		layer.className = 'pt-air';
		layer.setAttribute('aria-hidden', 'true');
		var seed = 7, rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
		var html = '';
		for (var i = 0; i < count; i++) {
			var p = set[i % set.length], lane = (i * 0.618034) % 1, dur = 9 + rnd() * 5, delay = i < 6 ? rnd() * 1.2 : (i / count) * 14 + rnd() * 1.5;
			html += '<i style="--x:' + (lane * 94 + 1).toFixed(1) + 'vw;--w:' + Math.round(p[2] * (wide ? 1.15 : .92)) + 'px;--d:' + dur.toFixed(1) + 's;--dl:' + delay.toFixed(1) + 's;--sw:' + Math.round(18 + rnd() * 30) * (i % 2 ? 1 : -1) + 'px;--r0:' + Math.round(-24 + rnd() * 48) + 'deg;--r1:' + Math.round(-30 + rnd() * 60) + 'deg;--y0:' + (i < 6 ? Math.round(20 + rnd() * 70) + 'vh' : '104vh') + '">' + svg(p[0], p[1]) + '</i>';
		}
		layer.innerHTML = html;
		document.documentElement.classList.add('pt-on');
		document.body.insertBefore(layer, document.body.firstChild);
		setTimeout(function () { layer.classList.add('pt-out'); }, 24500);
		setTimeout(function () { layer.remove(); document.documentElement.classList.remove('pt-on'); }, 26500);
	}
	function roll(el, to, wait) { // count up from zero, then leave the exact text in place
		var done = el.getAttribute('data-text');
		if (calm || !(to > 0)) { el.textContent = done; return; }
		var t0 = null, ms = 1500;
		el.textContent = '0';
		setTimeout(function () {
			requestAnimationFrame(function step(t) {
				if (t0 == null) t0 = t;
				var k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
				el.textContent = k < 1 ? full(to * e) : done;
				if (k < 1) requestAnimationFrame(step);
			});
		}, wait);
	}

	function mount(el, a, o) {
		if (!el) return;
		if (!a) { el.hidden = true; el.innerHTML = ''; return; }
		var n = a.years, at = Date.parse(a.at), toast = o.toast || function () {};
		var asked = a.asked;
		function left() {
			var ms = at - Date.now(), d = Math.floor(ms / DAY), h = Math.floor((ms - d * DAY) / 3600000);
			if (ms <= 0 && ms > -DAY) return '<b>Today</b> is the day';
			if (ms <= -DAY) return 'was <b>' + Math.floor(-ms / DAY) + '</b> ' + (Math.floor(-ms / DAY) === 1 ? 'day' : 'days') + ' ago';
			if (d >= 30) d = Math.ceil(ms / DAY); // far away: whole calendar days; in the last month the hours count too
			return '<b>' + d + '</b> ' + (d === 1 ? 'day' : 'days') + (d < 30 ? ' <b>' + h + '</b> ' + (h === 1 ? 'hour' : 'hours') : '') + ' to go';
		}
		function draw() {
			var facts = [];
			if (a.posts) facts.push([a.posts, full(a.posts), 'posts made']);
			if (a.views) facts.push([0, short(a.views), 'total views']);
			el.hidden = false;
			var offer = '<details class="pt-offer"' + (window.innerWidth >= 720 ? ' open' : '') + '><summary><b>Want your own ' + n + '-year celebration video?</b>' + (asked ? '<span class="pt-asked">Asked</span>' : '') + '<i aria-hidden="true"></i></summary>' +
				'<div class="pt-ob"><p>Ask Busy Fox for a customised template. You only drop in your clips and photos, and our template turns them into the finished video.</p>' +
				(asked ? '<span class="pt-asked">Asked. Busy Fox will message you.</span>' : '<button class="btn line" type="button" data-p="ask">Ask Busy Fox</button>') + '</div></details>';
			el.innerHTML = '<div class="pt-card"><span class="tape butter" aria-hidden="true"></span>' +
				'<div class="pt-top"><span class="pt-num" aria-hidden="true">' + n + '</span><div class="pt-ttl"><p class="hand">' + (a.days > 0 ? 'a big one is coming' : a.days === 0 ? 'it is today' : 'you did it') + '</p><h2><span class="sr">' + n + ' </span>years on <em>Instagram</em></h2></div>' +
				'<span class="pt-candle" aria-hidden="true">' + svg('0 0 24 24', CANDLE) + '</span></div>' +
				'<p class="pt-when"><span>' + esc(day(a.at)) + '</span><span class="pt-left" aria-live="off">' + left() + '</span></p>' +
				'<ul class="pt-facts"><li class="pt-first"><b>' + esc(day(a.first_post)) + '</b><span>your first post</span></li>' + facts.map(function (f) { return '<li><b data-to="' + f[0] + '" data-text="' + esc(f[1]) + '">' + esc(f[1]) + '</b><span>' + f[2] + '</span></li>'; }).join('') + '</ul>' +
				'<div class="pt-acts"><button class="btn butter" type="button" data-p="plan">Plan my ' + n + '-year reel</button>' + (a.idea ? '<button class="pt-link" type="button" data-p="idea">See your team’s idea for it</button>' : '') + '</div>' + offer + '</div>';
		}
		draw();
		[].forEach.call(el.querySelectorAll('.pt-facts b[data-to]'), function (b, i) { roll(b, Number(b.getAttribute('data-to')), 700 + i * 180); });
		if (!el.dataset.pt) {
			el.dataset.pt = '1';
			var lastTap = 0;
			el.addEventListener('click', function (e) {
				var b = e.target.closest('[data-p]');
				if (!b || Date.now() - lastTap < 450) return; // a fast double tap counts once
				lastTap = Date.now();
				var what = b.getAttribute('data-p'), pl = o.planner ? o.planner() : null;
				if (what === 'plan') {
					var ok = pl && pl.add({date: a.date < new Date(Date.now() + IST).toISOString().slice(0, 10) ? undefined : a.date, time: '19:00', type: 'reel', pillar: 'Anniversary',
						hook: a.idea ? a.idea.text : n + ' years on Instagram: from my first post to today',
						caption: 'My first post was on ' + day(a.first_post) + '. ' + n + ' years later, thank you for being here.'});
					if (!ok) toast('Your content plan is still loading');
					return;
				}
				if (what === 'idea' && o.toIdea) return o.toIdea(a.idea);
				if (what === 'ask') {
					b.disabled = true;
					o.req('ask', {method: 'POST', json: {kind: 'anniversary-template', note: n + '-year celebration video, anniversary on ' + day(a.at)}}).then(function (r) {
						if (!r || !r.ok) { b.disabled = false; return toast('That did not work. Try again.'); }
						asked = r.ask;
						var box = el.querySelector('.pt-offer'), old = box.querySelector('button');
						if (old) old.outerHTML = '<span class="pt-asked">Asked. Busy Fox will message you.</span>';
						box.querySelector('summary b').insertAdjacentHTML('afterend', '<span class="pt-asked">Asked</span>');
						toast('Asked. Busy Fox will message you.');
					}, function () { b.disabled = false; toast('No connection'); });
				}
			});
			// the countdown changes once a minute; the candle sleeps when the strip is off screen
			setInterval(function () { var s = el.querySelector('.pt-left'); if (s && !document.hidden) s.innerHTML = left(); }, 60000);
			if ('IntersectionObserver' in window && !calm) new IntersectionObserver(function (es) { es.forEach(function (x) { el.classList.toggle('pt-sleep', !x.isIntersecting); }); }).observe(el);
			air(a);
		}
	}
	window.Party = {mount: mount};
})();
