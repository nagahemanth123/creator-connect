/* Busy Fox Creator Connect: her Instagram anniversary (5 years or more, when it is within 90 days or was in the last 7).
   Party.mount(el, anniv, {planner(), req(sub, opt), toast, toIdea(id)})
   1) a ticket-style strip at the top of the dashboard: the number, the date, a live countdown, her first post, counts that roll up
   2) for about 25 seconds after the page opens, paper-cut pieces pop up from behind the top edge of the ticket and dance
      along it, and on wide screens more float up the empty margins beside the page: only where there is no text, never
      catching a tap, every piece whole from the moment it appears; then they leave, and only the candle keeps moving
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
	// The celebration, about 25 seconds, in two places where there is never any text:
	// 1) the pieces pop up from behind the top edge of the ticket and dance along it (the gap above the ticket is empty);
	// 2) on screens wide enough to have empty margins beside the page, more pieces float up those margins.
	// Every piece appears whole (it pops in, it never slides in from off screen) and fades before it reaches an edge.
	function air(a, host) {
		if (calm || host.querySelector('.pt-air')) return;
		var set = pieces(a), w = window.innerWidth, wide = w >= 720;
		var seed = 7, rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
		var row = document.createElement('div');
		row.className = 'pt-air';
		row.setAttribute('aria-hidden', 'true');
		// which pieces stand on the ticket, left to right: [piece, share of its height that shows above the edge]
		var cast = wide ? [[1, .78], [3, .8], [0, .7], [7, .8], [2, .78], [6, .72], [4, .85], [9, .7], [8, .9]] : [[1, .78], [3, .8], [0, .68], [7, .8], [2, .78]];
		var from = wide ? 30 : 47, to = wide ? 93 : 91, html = '';
		cast.forEach(function (c, i) {
			var p = set[c[0]], box = p[0].split(' '), width = Math.round(p[2] * (wide ? 1 : .8)), height = width * Number(box[3]) / Number(box[2]);
			html += '<i style="--x:' + (from + (to - from) * i / (cast.length - 1)).toFixed(1) + '%;--w:' + width + 'px;--sink:' + Math.round(height * (1 - c[1])) + 'px;--dl:' + (0.75 + i * 0.11).toFixed(2) + 's;--d:' + (2.2 + rnd() * 1.6).toFixed(2) + 's;--hop:' + Math.round(4 + rnd() * 5) + 'px;--r0:' + Math.round(-9 + rnd() * 6) + 'deg;--r1:' + Math.round(3 + rnd() * 7) + 'deg">' + svg(p[0], p[1]) + '</i>';
		});
		row.innerHTML = html;
		host.insertBefore(row, host.firstChild);
		var layers = [row];
		// the empty margins beside the page: only when each is at least 64px wide
		var page = document.querySelector('.wrap'), gutter = page ? Math.round(page.getBoundingClientRect().left + parseFloat(getComputedStyle(page).paddingLeft)) : 0;
		if (gutter >= 64) {
			var side = document.createElement('div');
			side.className = 'pt-side';
			side.setAttribute('aria-hidden', 'true');
			var out = '', count = 14;
			for (var i = 0; i < count; i++) {
				var q = set[(i * 3 + 1) % set.length], width2 = Math.min(Math.round(q[2] * 1.05), gutter - 20), room = gutter - 20 - width2;
				var x = 10 + rnd() * room, y0 = 52 + rnd() * 34, rise = 34 + rnd() * 26;
				out += '<i style="' + (i % 2 ? 'right' : 'left') + ':' + x.toFixed(0) + 'px;--w:' + width2 + 'px;--y0:' + y0.toFixed(0) + 'vh;--y1:' + (y0 - rise).toFixed(0) + 'vh;--d:' + (7 + rnd() * 4).toFixed(1) + 's;--dl:' + (0.6 + (i / count) * 12 + rnd()).toFixed(1) + 's;--r0:' + Math.round(-16 + rnd() * 32) + 'deg;--r1:' + Math.round(-16 + rnd() * 32) + 'deg">' + svg(q[0], q[1]) + '</i>';
			}
			side.innerHTML = out;
			document.documentElement.classList.add('pt-on');
			document.body.insertBefore(side, document.body.firstChild);
			layers.push(side);
		}
		setTimeout(function () { layers.forEach(function (l) { l.classList.add('pt-out'); }); }, 24500);
		setTimeout(function () { layers.forEach(function (l) { l.remove(); }); document.documentElement.classList.remove('pt-on'); }, 26500);
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
			air(a, el);
		}
	}
	window.Party = {mount: mount};
})();
