/* ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   MOTION — FoxCut Creator Connect /join.  Runs after join.js and never touches its logic; see motion.css for the
   system (easings, durations, the three layers).

   This file only does what CSS cannot:
     1  prepares two things for CSS: the headline split into words, hand notes wrapped so they can be "written"
     2  entrances: ONE IntersectionObserver adds .is-seen (+ a --rd delay) to [data-reveal] blocks as they come up
        from the bottom of the screen. Anything already above the screen is shown at once, without playing.
     3  the phones: the old screen fades out as the new one slides in, and the score dial counts up
     4  the one idle loop (the heart) runs only while the hero is on screen and the tab is in front
     5  a small pop on the rate card price

   Safety: html.mv is set by the inline script in <head>, which also starts a 3 s timer that removes it again.
   This file cancels that timer only once everything below is running. If this file never loads, loads late,
   or throws, html.mv goes away and every block is simply visible.
   ══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
(function () {
	'use strict';
	var html = document.documentElement;
	if (!html.classList.contains('mv')) return; // no JS-driven motion: ?still, reduced motion, no IntersectionObserver, or the timer already gave up
	try { init(); clearTimeout(window.__mvT); } catch (e) { html.classList.remove('mv'); }

	function init() {
		var $$ = function (s, root) { return [].slice.call((root || document).querySelectorAll(s)); };
		var STEP = 70, EDGE = 0.08; // gap between neighbours; how far inside the bottom edge a block must be before it starts

		/* ── 1a. headline: each word becomes its own inline-block so they can rise one after another ── */
		var h1 = document.querySelector('.hero-h'), wn = 0;
		if (h1) [].slice.call(h1.childNodes).forEach(function (node) {
			if (node.nodeType === 1) { node.style.setProperty('--n', wn++); return; } // the <em> with the underline is one word
			if (node.nodeType !== 3) return;
			var frag = document.createDocumentFragment();
			node.textContent.split(/(\s+)/).forEach(function (part) {
				if (!part) return;
				if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
				var w = document.createElement('span'); w.className = 'w'; w.textContent = part; w.style.setProperty('--n', wn++);
				frag.appendChild(w);
			});
			h1.replaceChild(frag, node);
		});

		/* ── 1b. hand notes: text goes inside two spans; CSS slides the outer one in and the inner one back by the same
		       amount, so the words stay put and only the edge of the window travels: written, left to right ── */
		var notes = $$('.hi, .intro > .hand, .vs-head > .hand, .txt > .hand, .con-txt > .hand, .stage-note, .six-note, .vs-foot, .done-yay');
		var aligns = notes.map(function (p) { return getComputedStyle(p).textAlign; });
		notes.forEach(function (p, k) {
			var o = document.createElement('span'), i = document.createElement('span'), ta = aligns[k];
			o.className = 'wr' + (ta === 'center' ? ' c' : ta === 'right' || ta === 'end' ? ' r' : '');
			i.className = 'wr-i';
			o.style.setProperty('--wd', Math.max(300, Math.min(560, p.textContent.trim().length * 20)) + 'ms');
			while (p.firstChild) i.appendChild(p.firstChild);
			o.appendChild(i); p.appendChild(o); p.classList.add('has-wr');
		});

		/* ── 2. entrances ── */
		var all = $$('[data-reveal]'), nest = new Map(), roots = [];
		all.forEach(function (el) { // a block inside another block (the polaroids and notes on the hero stage) follows its parent
			var up = el.parentElement.closest('[data-reveal]');
			if (!up) { roots.push(el); return; }
			if (!nest.has(up)) nest.set(up, []);
			nest.get(up).push(el);
		});
		var BIG = '.stage, .get-phone, .six'; // show pieces that need a good part of themselves on screen before they start
		var PHONES = '.stage, .get-phone';
		var HERO = [['.hi', 0], ['.badge', 60], ['.hero-h', 110], ['.stage', 60], ['.hero-lede', 340], ['.hero-cta', 410], ['.tiles', 480]];
		var first = true;

		function finish(list) { // jump straight to the end of anything that was about to play out of sight
			list.forEach(function (el) {
				if (!el.getAnimations) return;
				el.getAnimations({subtree: true}).forEach(function (a) { if (/^m-/.test(a.animationName || '') && a.animationName !== 'm-beat') try { a.finish(); } catch (e) {} });
			});
		}
		function reveal(el, delay, instant) {
			if (el._seen) return;
			el._seen = 1; io.unobserve(el);
			var set = [el].concat(nest.get(el) || []), wrap = el.closest('.six-w, .steps-w');
			if (wrap && !wrap._seen) { wrap._seen = 1; set.push(wrap); }
			set.forEach(function (x) { x.style.setProperty('--rd', delay + 'ms'); x.classList.add('is-seen'); });
			if (el.matches(PHONES)) {
				if (instant) el.style.setProperty('--pd', '0ms');
				else {
					el.style.setProperty('--pd', (delay + 330) + 'ms'); // the screen wakes up once the phone has landed
					setTimeout(function () { el.style.setProperty('--pd', '0ms'); }, delay + 1700);
					$$('.p-view:not([hidden]) .dial', el).forEach(function (d) { dial(d, delay + 520); });
				}
			}
			if (instant) finish(set);
		}
		function onSee(entries) {
			var vh = window.innerHeight, line = vh * (1 - EDGE), past = [], now = [];
			entries.forEach(function (e) {
				var el = e.target, r = e.boundingClientRect;
				if (el._seen || !e.isIntersecting) return;
				if (r.bottom <= 0) { past.push(el); return; }
				var need = el.matches(BIG) ? Math.min(r.height * 0.4, vh * 0.28) : Math.min(r.height * 0.3, 120);
				if (line - r.top >= need - 1) now.push({el: el, r: r});
			});
			// a sideways row (the "how it feels" cards on phones) arrives together, not card by card as she swipes
			now.slice().forEach(function (o) {
				var row = o.el.parentElement;
				if (row.id !== 'perks') return;
				if (row._scr === undefined) row._scr = row.scrollWidth > row.clientWidth + 8;
				if (row._scr) $$(':scope > [data-reveal]', row).forEach(function (s) { if (!s._seen && !now.some(function (n) { return n.el === s; })) now.push({el: s, r: s.getBoundingClientRect()}); });
			});
			past.forEach(function (el) { reveal(el, 0, true); });
			now.sort(function (a, b) { return Math.abs(a.r.top - b.r.top) > 24 ? a.r.top - b.r.top : a.r.left - b.r.left; });
			var k = 0;
			now.forEach(function (o) {
				var d = null;
				if (first) HERO.forEach(function (h) { if (o.el.matches('.hero ' + h[0])) d = h[1]; });
				if (d === null) d = (first ? 620 : 0) + Math.min(k++, 6) * STEP;
				reveal(o.el, d, false);
			});
			first = false;
		}
		var th = []; for (var t = 0; t <= 10; t++) th.push(t / 20); th.push(1);
		// the "screen" this observer watches reaches endlessly upward and stops a little above the bottom edge:
		// a block counts from the moment it comes up past that line, and still counts if she has jumped far past it
		var io = new IntersectionObserver(onSee, {rootMargin: '100000px 0px -' + (EDGE * 100) + '% 0px', threshold: th});
		roots.forEach(function (el) {
			if (!el.getClientRects().length) { el._seen = 1; el.classList.add('is-seen'); (nest.get(el) || []).forEach(function (x) { x.classList.add('is-seen'); }); return; } // not laid out (a closed tab panel, the name line without ?for): nothing to wait for
			io.observe(el);
		});
		nest.forEach(function (list) { list.forEach(function (x) { if (!x.getClientRects().length) x.classList.add('is-seen'); }); });

		/* ── 3a. the score dial: sweeps round to its number while the number counts up (short, and only when shown) ── */
		function dial(d, delay) {
			var pr = d.querySelector('.pr'), b = d.querySelector('b');
			if (!pr || !b) return;
			var end = parseInt(b.getAttribute('data-to') || b.textContent, 10);
			if (!(end > 0)) return;
			b.setAttribute('data-to', end);
			clearTimeout(d._t); cancelAnimationFrame(d._raf);
			pr.style.strokeDashoffset = end; pr.style.visibility = 'hidden'; b.textContent = '0'; // hidden until it moves: a round-capped line of no length still shows as a dot
			var t0 = null, last = 0, D = 900;
			function tick(now) {
				if (t0 === null) { t0 = now; pr.style.visibility = ''; }
				var p = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - p, 4), n = Math.round(end * e);
				pr.style.strokeDashoffset = (end * (1 - e)).toFixed(2);
				if (n !== last) { b.textContent = n; last = n; }
				if (p < 1) d._raf = requestAnimationFrame(tick);
				else { pr.style.strokeDashoffset = ''; b.textContent = end; }
			}
			d._t = setTimeout(function () { d._raf = requestAnimationFrame(tick); }, delay || 0);
		}

		/* ── 3b. phones: join.js sets data-now on a phone when its screen changes; the old screen leaves as a fading copy ── */
		function ghost(old, back) {
			if (!old || !old.animate) return;
			var g = old.cloneNode(true);
			g.hidden = false; g.className = 'p-view m-ghost'; g.inert = true;
			['id', 'role', 'aria-labelledby'].forEach(function (a) { g.removeAttribute(a); });
			g.setAttribute('aria-hidden', 'true');
			$$('[id]', g).forEach(function (n) { n.removeAttribute('id'); });
			old.parentNode.appendChild(g);
			var done = function () { g.remove(); };
			var a = g.animate([{opacity: 1, transform: 'translateX(0)'}, {opacity: 0, transform: 'translateX(' + (back ? 14 : -14) + 'px)'}], {duration: 130, easing: 'cubic-bezier(.4, 0, 1, 1)', fill: 'forwards'});
			a.onfinish = a.oncancel = done; setTimeout(done, 400);
		}
		var onScreen = new WeakMap();
		var pio = new IntersectionObserver(function (es) { es.forEach(function (e) { onScreen.set(e.target, e.isIntersecting); }); });
		$$('.phone').forEach(function (phone) {
			pio.observe(phone);
			new MutationObserver(function (muts) {
				var old = muts[0].oldValue, now = phone.getAttribute('data-now');
				if (!old || old === now || !onScreen.get(phone) || document.hidden) return;
				var views = phone.querySelector('.p-views'), nv = views.querySelector('.p-view[data-view="' + now + '"]:not(.m-ghost)'), ov = views.querySelector('.p-view[data-view="' + old + '"]:not(.m-ghost)');
				$$('.m-ghost', views).forEach(function (g) { g.remove(); });
				ghost(ov, nv && nv.classList.contains('back'));
				if (nv) $$('.dial', nv).forEach(function (d) { dial(d, 140); });
			}).observe(phone, {attributes: true, attributeFilter: ['data-now'], attributeOldValue: true});
		});

		/* ── 4. the heart sticker's slow double beat: only while the hero is on screen and the tab is in front ── */
		var stage = document.querySelector('.stage'), stageIn = false;
		function idle() { if (stage) stage.classList.toggle('m-idle', stageIn && !document.hidden); }
		if (stage) new IntersectionObserver(function (e) { stageIn = e[0].isIntersecting; idle(); }).observe(stage);
		document.addEventListener('visibilitychange', idle);

		/* ── 5. rate card: the new price pops up into place ── */
		document.addEventListener('click', function (e) {
			var b = e.target.closest('[data-act="rate"]'), out = b && b.closest('.rates').querySelector('.rate-out');
			if (out && out.animate) out.animate([{opacity: 0, transform: 'translateY(7px)'}, {opacity: 1, transform: 'none'}], {duration: 280, easing: 'cubic-bezier(.22, .9, .3, 1)'});
		});
	}
})();
