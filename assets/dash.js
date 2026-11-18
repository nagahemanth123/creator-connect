/* Busy Fox Creator Connect: the parts of the creator dashboard that Instagram's own Insights does not have.
   Today card · weekly score, posts against her usual, alerts · ideas bank · brand kit ("For brands").
   Everything comes from GET <api>/me/dash, which the worker fills during its 3-hourly read. No AI calls.
   Dash.mount({req(sub, {method, json}), toast, planner: () => Planner handle, els: {strip, today, score, ideas, brands}, onAlerts(unread)}) */
(function () {
	'use strict';
	var IST = 330 * 60000, DAY = 86400000;
	var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	var TYPE = {reel: 'Reel', carousel: 'Carousel', photo: 'Photo', video: 'Video', story: 'Story'};
	var K = window.Kit, esc = K.esc, short = K.short, full = K.full;
	var still = /[?&]still\b/.test(location.search) || !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
	var NI = '<span class="ni">Not in Instagram</span>';
	var CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5.5 12.5l4.2 4.2L18.500 7.500" fill="none" stroke="currentColor" stroke-width="2.600" stroke-linecap="round" stroke-linejoin="round"/></svg>';
	var STAR = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3.200l2.600 5.600 6.100.7-4.500 4.200 1.200 6-5.400-3-5.400 3 1.200-6L3.300 9.500l6.100-.7z" stroke="currentColor" stroke-width="1.800" stroke-linejoin="round"/></svg>';
	var UP = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M8 13V3.500M3.800 7.500L8 3.300l4.200 4.200" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
	function ist(ms) { var d = new Date(ms + IST); return {y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), dow: d.getUTCDay(), h: d.getUTCHours(), min: d.getUTCMinutes()}; }
	function dayShort(ms) { var t = ist(ms); return t.d + ' ' + MON[t.m]; }
	function ago(iso, now) {
		var s = Math.max(0, (now - Date.parse(iso)) / 1000);
		if (s < 3600) return 'just now';
		if (s < 86400) return Math.round(s / 3600) + ' h ago';
		if (s < 7 * 86400) return Math.round(s / 86400) + (Math.round(s / 86400) === 1 ? ' day ago' : ' days ago');
		return dayShort(Date.parse(iso));
	}
	function ageWords(h) { return h < 1 ? 'just posted' : h < 48 ? h + (h === 1 ? ' hour old' : ' hours old') : Math.round(h / 24) + ' days old'; }
	function bg(url, cls, inner) { return '<span class="' + cls + '" data-bg="' + esc(url || '') + '">' + (inner || '') + '</span>'; }
	function copy(text, toast, msg) {
		(navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { toast(msg); }, function () { window.prompt('Copy this:', text); });
	}

	function mount(o) {
		var toast = o.toast || function () {}, els = o.els, d = null;
		var ui = {type: 'all', q: '', more: false, full: false, busy: false};
		try { var kept = JSON.parse(sessionStorage.getItem('cc_dash_ui') || '{}'); ['type', 'q', 'more', 'full', 'allAlerts'].forEach(function (k) { if (kept[k] != null) ui[k] = kept[k]; }); } catch (e) {}
		function keep() { try { sessionStorage.setItem('cc_dash_ui', JSON.stringify({type: ui.type, q: ui.q, more: ui.more, full: ui.full, allAlerts: ui.allAlerts})); } catch (e) {} } // the filter she chose survives a reload and back/forward

		function load(first) {
			return o.req('dash').then(function (r) {
				if (!r || !r.ok) throw new Error('dash');
				if (!first && d) { // a change in the plan: only the Today card can differ, so only it is redrawn
					var was = JSON.stringify(d.today);
					d.today = r.today; d.now = r.now;
					if (JSON.stringify(r.today) !== was) redraw(els.today, today);
					return;
				}
				d = r;
				draw(first);
			}).catch(function () {
				if (d) return;
				[els.today, els.score, els.ideas, els.brands].forEach(function (el) { if (el) el.innerHTML = '<p class="pl-none">Could not load this part. Check your connection and open the page again.</p>'; });
			});
		}
		function now() { return Date.parse(d.now); }
		function unread() { var seen = d.alerts.seen_at ? Date.parse(d.alerts.seen_at) : 0; return d.alerts.items.filter(function (x) { return Date.parse(x.at) > seen; }).length; }

		// ---------- "only here" strip ----------
		function strip() {
			var f = d.facts || {}, items = [];
			if (f.first_post && f.history_done) items.push(['Every post since', K.day(f.first_post), full(f.posts) + ' posts read. Instagram shows about 90 days.']);
			else if (f.posts) items.push(['Your history', full(f.posts) + ' posts', 'We are reading back to your very first post. Instagram shows about 90 days.']);
			items.push(['Each post', 'against your usual', 'Measured at the same age, so a new post is judged fairly.']);
			items.push(['Stories kept', f.stories_kept ? full(f.stories_kept) + ' saved' : 'after 24 hours', 'Instagram deletes story numbers after a day. We keep them.']);
			if (f.connected_at) items.push(['Followers, every day', 'since ' + dayShort(Date.parse(f.connected_at)), 'Saved daily, so your history grows past Instagram’s 30 days.']);
			return '<div class="os"><p class="os-h"><span class="hand">only here</span><b>What you get here that Instagram doesn’t show</b></p><ul>' + items.slice(0, 4).map(function (x) {
				return '<li><span>' + esc(x[0]) + '</span><b>' + esc(x[1]) + '</b><small>' + esc(x[2]) + '</small></li>';
			}).join('') + '</ul></div>';
		}

		// ---------- Today ----------
		var KIND = {post: 'Going out today', yes: 'Waiting for your yes', plan: 'Planned for today', posted: 'Posted today', idea: 'From your 90-day plan', nudge: 'A small one for today'};
		var GO = {post: 'Open the post', yes: 'See it and say yes', plan: 'Open the post', idea: 'Give it a date'};
		function today() {
			var t = d.today, p = t.pick, b = t.best, n = ist(now()), done = t.done || (p.auto_done ? {auto: true} : null);
			var cover = p.cover ? (p.cover.kind === 'video' ? '<span class="td-cover on"><video src="' + esc(p.cover.url) + '#t=0.1" muted playsinline preload="metadata" tabindex="-1"></video></span>' : bg(p.cover.url, 'td-cover')) : '';
			var meta = [p.type ? TYPE[p.type] : '', p.format && p.format.toLowerCase() !== (p.type || '') ? p.format : '', p.time ? (p.kind === 'posted' ? 'went out ' : p.kind === 'yes' ? 'planned for ' : '') + p.time : ''].filter(Boolean).join(' · ');
			var go = GO[p.kind] ? '<button class="btn red" type="button" data-a="go">' + GO[p.kind] + '</button>' : (p.kind === 'nudge' && /ideas/i.test(p.title) ? '<button class="btn red" type="button" data-a="toideas">Open my ideas bank</button>' : '');
			return '<div class="td' + (done ? ' td-done' : '') + (cover ? ' has-cover' : '') + '"><span class="tape" aria-hidden="true"></span>' +
				'<div class="td-top"><span class="lab">Today · ' + DOW[n.dow] + ' ' + n.d + ' ' + MON[n.m] + '</span>' + (t.streak > 1 ? '<span class="td-streak"><b>' + t.streak + '</b> days in a row</span>' : '') + '</div>' +
				'<div class="td-main">' + cover + '<div class="td-txt"><span class="td-kind">' + KIND[p.kind] + (meta ? ' <i>' + esc(meta) + '</i>' : '') + '</span><h3>' + esc(p.title) + '</h3><p>' + esc(p.line) + '</p></div></div>' +
				'<div class="td-best"><p class="td-bt"><span class="lab">Best time today</span><b>' + esc(b.label) + '</b></p><p class="td-why">' + esc(b.line) + (b.online ? ' ' + esc(b.online) : '') + (b.basis === 'yours' ? ' ' + NI : '') + '</p></div>' +
				'<div class="td-acts">' + go + '<button class="btn line td-tick' + (done ? ' on' : '') + '" type="button" data-a="done" aria-pressed="' + (done ? 'true' : 'false') + '"' + (done && done.auto ? ' disabled' : '') + '>' + CHECK + '<span>' + (done ? 'Done for today' : 'Done') + '</span></button>' +
				(done && !done.auto ? '<button class="td-undo" type="button" data-a="undo">Undo</button>' : '') + '</div></div>';
		}

		// ---------- weekly score ----------
		function arrow(cur, prev) {
			if (cur == null || prev == null) return '';
			var diff = cur - prev;
			if (Math.abs(diff) < 4) return '<span class="ws-ar flat" title="About the same as last week"><i></i><small>same</small></span>';
			return '<span class="ws-ar ' + (diff > 0 ? 'up' : 'down') + '" title="' + (diff > 0 ? 'Better' : 'Lower') + ' than last week">' + UP + '<small>' + (diff > 0 ? 'up' : 'down') + '</small></span>';
		}
		function score() {
			var s = d.score.now, last = d.score.last, lastBy = {};
			((last && last.parts) || []).forEach(function (p) { lastBy[p.key] = p; });
			if (!s) return '<div class="ws"><div class="ws-say"><span class="lab">This week</span><h3>Your score <em>starts soon</em></h3><p>We are reading your posts from Instagram. Your first score shows here within a few hours.</p></div></div>';
			var range = dayShort(Date.parse(s.from)) + ' to ' + dayShort(Date.parse(s.to) - DAY);
			var t = s.total, word = t == null ? '' : t >= 80 ? 'A great week' : t >= 65 ? 'A strong week' : t >= 45 ? 'A steady week' : t >= 25 ? 'A slow week' : 'A quiet week';
			var diff = t != null && last && last.total != null ? t - last.total : null;
			var dial = '<div class="ws-dial' + (t == null ? ' none' : '') + '" role="img" aria-label="' + (t == null ? 'No score yet' : 'Score ' + t + ' out of 100') + '"><svg viewBox="0 0 120 120" aria-hidden="true" focusable="false"><circle class="tr" cx="60" cy="60" r="51"/><circle class="pr" cx="60" cy="60" r="51" pathLength="100" style="--v:' + (t || 0) + '"/></svg><b>' + (t == null ? '–' : t) + '</b><span>out of 100</span></div>';
			var say = '<div class="ws-say"><span class="lab">' + (s.partial ? 'This week so far' : 'This week') + ' · ' + esc(range) + '</span>' +
				(t == null ? '<h3>Your score <em>starts soon</em></h3><p>The score needs at least two of the parts below. Each one says what it is waiting for.</p>' :
					'<h3>' + word.replace(/(\w+) week$/, '<em>$1</em> week') + '</h3>' +
					(diff != null ? '<p class="ws-delta ' + (diff > 3 ? 'up' : diff < -3 ? 'down' : 'flat') + '">' + (Math.abs(diff) <= 3 ? 'About the same as last week (' + last.total + ').' : (diff > 0 ? UP : UP) + '<span>' + Math.abs(diff) + ' points ' + (diff > 0 ? 'up on' : 'down from') + ' last week (' + last.total + ').</span>') + '</p>' : '<p>One number for your week, made of the parts below. Next week it shows arrows against this one.</p>')) +
				NI + '</div>';
			var parts = '<ul class="ws-parts">' + s.parts.map(function (p) {
				if (p.na) return '<li class="na"><p class="ws-ph"><b>' + esc(p.label) + '</b><span class="ws-pts">not counted yet</span></p><p class="ws-line">' + esc(p.na) + '</p></li>';
				var prev = lastBy[p.key];
				return '<li><p class="ws-ph"><b>' + esc(p.label) + '</b>' + arrow(p.pct, prev && !prev.na ? prev.pct : null) + '<span class="ws-pts"><b>' + p.pts + '</b> of ' + p.max + '</span></p>' +
					'<span class="ws-bar"><i style="--v:' + Math.max(2, p.pct) + '%"></i></span><p class="ws-line">' + esc(p.line) + '</p></li>';
			}).join('') + '</ul>';
			return '<div class="ws"><div class="ws-top">' + dial + say + '</div>' + parts + '<p class="pl-fine">Monday to Sunday, India time. Arrows compare each part with last week. “Your usual” is the middle value of your last 20 posts that are at least a week old.</p></div>';
		}
		function movers() {
			var list = (d.movers || []).filter(function (m) { return m.reach != null; }).slice(0, 5);
			if (!list.length) return '';
			var u = d.usual || {};
			return '<div class="mv"><div class="mv-h"><h3>Your new posts, <em>against your usual</em></h3>' + NI + '</div>' +
				'<p class="pl-fine">' + (u.reach != null ? 'A post that is 2 days old is compared with what your posts usually reach at 2 days. Your usual after a week is ' + short(u.reach) + ' different people reached.' : 'This starts once 5 of your posts are a week old with numbers from Instagram.') + '</p>' +
				list.map(function (m) {
					var r = m.ratio, tag = r == null ? '<span class="mv-x wait">too early</span>' : r >= 1.15 ? '<span class="mv-x up">' + (r >= 2 ? (Math.round(r * 10) / 10) + '× your usual' : '+' + Math.round((r - 1) * 100) + '% vs usual') + '</span>' : r <= 0.85 ? '<span class="mv-x down">−' + Math.round((1 - r) * 100) + '% vs usual</span>' : '<span class="mv-x flat">about usual</span>';
					return '<a class="mv-row" href="' + esc(m.link) + '" target="_blank" rel="noopener">' + bg(m.thumb, 'mv-th', esc(TYPE[m.type] || '')) +
						'<span class="mv-t"><b>' + esc(m.cap || TYPE[m.type] || 'Post') + '</b><small>' + (m.views != null ? '<u>' + short(m.views) + ' views</u> · ' : '') + short(m.reach) + ' different people reached · ' + ageWords(m.age_h) + '</small>' +
						(m.why && m.why.length ? '<span class="mv-why">' + m.why.map(function (w) { return '<i>' + esc(w) + '</i>'; }).join('') + '</span>' : '') + '</span>' + tag + '</a>';
				}).join('') + '</div>';
		}
		var AKIND = {takeoff: 'Taking off', best: 'Best ever', milestone: 'Milestone', quiet: 'Quiet', missed: 'Missed'};
		function alerts() {
			var list = d.alerts.items, seen = d.alerts.seen_at ? Date.parse(d.alerts.seen_at) : 0, n = unread();
			var rows = list.slice(0, ui.allAlerts ? 40 : 4).map(function (x) {
				var isNew = Date.parse(x.at) > seen;
				var tail = x.link ? '<a href="' + esc(x.link) + '" target="_blank" rel="noopener">Open on Instagram</a>' : x.post_id ? '<button type="button" data-a="openpost" data-id="' + esc(x.post_id) + '">Open in my plan</button>' : '';
				return '<li class="al-row k-' + esc(x.kind) + (isNew ? ' new' : '') + '">' + (x.thumb ? bg(x.thumb, 'al-th') : '<span class="al-th none" aria-hidden="true"></span>') +
					'<div><p class="al-k"><span>' + (AKIND[x.kind] || 'Alert') + '</span><small>' + ago(x.at, now()) + '</small>' + (isNew ? '<i class="al-dot" aria-label="New"></i>' : '') + '</p><b>' + esc(x.title) + '</b><p class="al-t">' + esc(x.text) + '</p>' + tail + '</div></li>';
			}).join('');
			return '<div class="al" id="alertsBox"><div class="al-h"><h3>Alerts' + (n ? '<i class="al-dot" aria-hidden="true"></i><span class="al-n">' + n + ' new</span>' : '') + '</h3>' + NI + '</div>' +
				(list.length ? '<ul>' + rows + '</ul>' + (list.length > 4 && !ui.allAlerts ? '<button class="ib-more" type="button" data-a="allalerts">Show all ' + list.length + '</button>' : '') :
					'<p class="al-none">Nothing to flag right now. We check every 3 hours for a post taking off, a follower milestone, a quiet week or a missed post.</p>') + '</div>';
		}

		// ---------- ideas bank ----------
		var TLAB = {hook: 'Hook', caption: 'Caption starter', reel: 'Reel idea'};
		var FROM = {team: 'From your Busy Fox team', you: 'From your own posts', plan: 'From your 90-day plan'};
		function bankItems() {
			var stars = d.bank.stars || [], q = ui.q.trim().toLowerCase();
			return d.bank.items.filter(function (x) {
				if (ui.type === 'saved' ? stars.indexOf(x.id) < 0 : ui.type !== 'all' && x.type !== ui.type) return false;
				return !q || (x.text + ' ' + (x.why || '') + ' ' + (x.pillar || '') + ' ' + (x.format || '')).toLowerCase().indexOf(q) >= 0;
			});
		}
		function ideas() {
			var all = d.bank.items, stars = d.bank.stars || [];
			if (!all.length) return '<div class="ib-empty"><b>Your ideas bank is filling up</b><p>It is built from your own best posts and your audit plan. Once Instagram shares numbers for a few of your posts, your best hooks and captions appear here.</p></div>';
			var count = function (t) { return t === 'saved' ? stars.filter(function (id) { return all.some(function (x) { return x.id === id; }); }).length : t === 'all' ? all.length : all.filter(function (x) { return x.type === t; }).length; };
			var tabs = [['all', 'All'], ['hook', 'Hooks'], ['caption', 'Captions'], ['reel', 'Reel ideas'], ['saved', 'Saved']].map(function (t) {
				return '<button type="button" role="tab" aria-selected="' + (ui.type === t[0]) + '" class="' + (ui.type === t[0] ? 'on' : '') + '" data-a="type" data-id="' + t[0] + '">' + t[1] + ' <i>' + count(t[0]) + '</i></button>';
			}).join('');
			var list = bankItems(), show = list.slice(0, ui.more ? 200 : 6);
			var cards = show.map(function (x) {
				var on = stars.indexOf(x.id) >= 0, label = x.type === 'reel' && x.format && !/reel/i.test(x.format) ? 'Post idea' : TLAB[x.type];
				return '<li class="ib-card t-' + x.type + '" data-id="' + esc(x.id) + '"><p class="ib-k"><span>' + label + '</span><small>' + (FROM[x.from] || '') + '</small></p>' +
					'<p class="ib-text">' + esc(x.text) + '</p>' +
					(x.why ? '<p class="ib-why"><b>Why this works for you</b>' + esc(x.why) + (x.source && x.source.url ? ' <a href="' + esc(x.source.url) + '" target="_blank" rel="noopener">See ' + esc((x.source.label || 'the post').replace(/^(\w)/, function (c) { return c.toLowerCase(); })) + '</a>' : '') + '</p>' : '') +
					'<div class="ib-acts"><button class="btn line" type="button" data-a="copy">Copy</button><button class="btn line" type="button" data-a="cal">Put on my calendar</button>' +
					'<button class="ib-star' + (on ? ' on' : '') + '" type="button" data-a="star" aria-pressed="' + on + '" aria-label="' + (on ? 'Remove from saved' : 'Save this idea') + '">' + STAR + '</button></div></li>';
			}).join('');
			return '<div class="ib"><div class="ib-bar"><label class="ib-q"><span class="sr">Search your ideas</span><input type="search" id="ib-q" placeholder="Search your ideas" value="' + esc(ui.q) + '" autocomplete="off"></label><div class="ib-tabs" role="tablist" aria-label="Kind of idea">' + tabs + '</div></div>' +
				(show.length ? '<ul class="ib-list">' + cards + '</ul>' : '<p class="al-none">' + (ui.type === 'saved' && !ui.q ? 'Tap the star on an idea to keep it here.' : 'Nothing matches. Try another word.') + '</p>') +
				(list.length > 6 && !ui.more ? '<button class="ib-more" type="button" data-a="more">Show all ' + list.length + '</button>' : '') + '</div>';
		}

		// ---------- for brands ----------
		function brands() {
			var s = d.share || {}, r = d.rate || {};
			var share = s.on ?
				'<div class="fb-share on"><p class="lab">Your private link for brands is on</p><p class="fb-url">' + esc(s.url) + '</p><div class="fb-acts"><button class="btn red" type="button" data-a="copylink">Copy link</button><a class="btn line" href="' + esc(s.url) + '" target="_blank" rel="noopener">See what a brand sees</a><button class="btn line" type="button" data-a="shareoff">Switch the link off</button></div>' +
				'<p class="pl-fine">' + (s.views ? 'Opened ' + s.views + (s.views === 1 ? ' time' : ' times') + (s.last_view ? ', last ' + ago(s.last_view, now()) : '') + '. ' : 'Not opened yet. ') + 'Anyone with the link can view the kit. They cannot download or print it. Switching it off kills the link for good.</p></div>' :
				'<div class="fb-share"><div><p class="lab">Share with a brand</p><p>Make a private, view-only link to this kit. Nothing is public until you tap the button, and you can switch it off any time.</p></div><button class="btn red" type="button" data-a="shareon">Create my brand link</button></div>';
			var money = function (x) { return x.low && x.high && x.low !== x.high ? '₹' + full(x.low) + ' to ₹' + full(x.high) : '₹' + full(x.high || x.low); };
			var price = !r || r.na ? '' : r.cards ? // the team's rate card wins over the formula
				'<div class="fb-rate"><p class="lab">Your rate card <i>only you see this</i></p><ul class="fb-cards">' + r.cards.map(function (x) { return '<li><span>' + esc(x.deliverable) + (x.note ? '<small>' + esc(x.note) + '</small>' : '') + '</span><b>' + money(x) + '</b></li>'; }).join('') + '</ul><p class="pl-fine">' + (r.rates_note ? esc(r.rates_note) + ' ' : '') + 'Set by ' + esc(r.by || 'Busy Fox Marketing') + '. ' + NI + '</p></div>' :
				'<div class="fb-rate"><p class="lab">What to ask for one reel <i>only you see this</i></p><p class="fb-rs"><b>' + money(r) + '</b></p><p class="pl-fine"><b>' + esc(r.label) + '</b> ' + esc(r.how) + ' Ask more for exclusivity, usage rights or more than one video. ' + NI + '</p></div>';
			return '<div class="fb"><div class="fb-kit' + (ui.full ? ' open' : '') + '">' + K.html(d.kit, {compact: !ui.full}) + '<button class="fb-toggle" type="button" data-a="full" aria-expanded="' + ui.full + '">' + (ui.full ? 'Show less' : 'See everything a brand will see') + '</button></div>' + share + price + '</div>';
		}

		function draw(first) {
			if (els.strip) els.strip.innerHTML = strip();
			if (els.party && window.Party && !els.party.dataset.pt) window.Party.mount(els.party, d.anniv, {planner: planner, req: o.req, toast: toast, toIdea: function (idea) {
				ui.type = 'all'; ui.q = idea.text.slice(0, 24); ui.more = false; keep(); redraw(els.ideas, ideas);
				document.getElementById('ideasSec').scrollIntoView({behavior: still ? 'auto' : 'smooth', block: 'start'});
			}});
			if (els.today) els.today.innerHTML = today();
			if (els.score) els.score.innerHTML = score() + movers() + alerts();
			if (els.ideas) els.ideas.innerHTML = ideas();
			if (els.brands) els.brands.innerHTML = brands();
			[els.today, els.score, els.brands].forEach(function (el) { if (el) K.wire(el); });
			var dial = els.score && els.score.querySelector('.ws-dial');
			if (dial) { if (still || !first) dial.classList.add('on'); else setTimeout(function () { dial.classList.add('on'); }, 500); }
			if (first && !still) [els.score, els.ideas].forEach(function (el) { if (!el) return; el.classList.add('dz-in'); setTimeout(function () { el.classList.remove('dz-in'); }, 2200); }); // rows rise once, never again on a redraw
			if (o.onAlerts) o.onAlerts(unread());
			watchAlerts();
		}
		function redraw(el, fn) { el.innerHTML = fn(); K.wire(el); var dial = el.querySelector('.ws-dial'); if (dial) dial.classList.add('on'); }

		// the unread dot goes once the alerts have been on screen for a moment
		var seenTimer = null, io = null;
		function watchAlerts() {
			var box = document.getElementById('alertsBox');
			if (!box || !unread() || !('IntersectionObserver' in window)) return;
			if (io) io.disconnect();
			io = new IntersectionObserver(function (es) {
				es.forEach(function (e) {
					clearTimeout(seenTimer);
					if (e.isIntersecting) seenTimer = setTimeout(function () {
						io.disconnect();
						o.req('alerts-seen', {method: 'POST', json: {}}).then(function (r) {
							if (!r || !r.ok) return;
							setTimeout(function () { // the dots fade where they are; nothing is redrawn under her finger
								d.alerts.seen_at = r.seen_at;
								[].forEach.call(document.querySelectorAll('#alertsBox .al-dot, #alertsBox .al-n'), function (x) { x.remove(); });
								[].forEach.call(document.querySelectorAll('#alertsBox .al-row.new'), function (x) { x.classList.remove('new'); });
								if (o.onAlerts) o.onAlerts(0);
							}, 4000);
						}, function () {});
					}, 2500);
				});
			}, {threshold: .5});
			io.observe(box);
		}

		function post(sub, body) {
			if (ui.busy) return Promise.resolve(null);
			ui.busy = true;
			return o.req(sub, {method: 'POST', json: body || {}}).then(function (r) { ui.busy = false; if (!r || !r.ok) { toast((r && r.error) || 'That did not work. Try again.'); return null; } return r; }, function () { ui.busy = false; toast('No connection'); return null; });
		}
		function planner() { return o.planner ? o.planner() : null; }
		function spot(el) { var r = el.getBoundingClientRect(); return {x: r.left + r.width / 2, y: r.top + r.height / 2}; }

		var lastTap = 0, lastWhat = '';
		document.addEventListener('click', function (e) {
			var b = e.target.closest('[data-a]');
			if (!b || !d) return;
			var what = b.getAttribute('data-a') + '|' + (b.getAttribute('data-id') || '') + '|' + ((b.closest('.ib-card') || b).getAttribute('data-id') || '');
			if (what === lastWhat && Date.now() - lastTap < 450 && [els.today, els.score, els.ideas, els.brands].some(function (el) { return el && el.contains(b); })) return; // a fast double tap counts once
			lastWhat = what; lastTap = Date.now();
			var host = [els.today, els.score, els.ideas, els.brands].filter(function (el) { return el && el.contains(b); })[0];
			if (!host) return;
			var a = b.getAttribute('data-a'), id = b.getAttribute('data-id'), p = d.today.pick, pl = planner();
			if (a === 'go') {
				if (p.kind === 'idea') { if (!pl || !pl.idea(p.idea_key)) toast('Open your 90-day plan below to pick it'); return; }
				if (!pl || !pl.open(p.post_id)) toast('Find it in your content plan below');
				return;
			}
			if (a === 'toideas') return document.getElementById('ideasSec').scrollIntoView({behavior: still ? 'auto' : 'smooth', block: 'start'});
			if (a === 'openpost') { if (!pl || !pl.open(id)) toast('Find it in your content plan below'); return; }
			if (a === 'done' || a === 'undo') {
				var at = spot(b), on = a === 'done' && !d.today.done;
				if (a === 'done' && d.today.done) return;
				return post('today-done', {on: on, kind: p.kind, what: p.title}).then(function (r) {
					if (!r) return;
					d.today.done = r.done; d.today.streak = r.streak;
					redraw(els.today, today);
					if (on) { if (window.Fun && !still) window.Fun.confetti(at.x, at.y); toast(r.streak > 1 ? r.streak + ' days in a row' : 'Done for today'); }
				});
			}
			if (a === 'allalerts') { ui.allAlerts = true; keep(); return redraw(els.score, function () { return score() + movers() + alerts(); }); }
			if (a === 'type') { ui.type = id; ui.more = false; keep(); return redraw(els.ideas, ideas); }
			if (a === 'more') { ui.more = true; keep(); return redraw(els.ideas, ideas); }
			var card = b.closest('.ib-card'), item = card ? d.bank.items.filter(function (x) { return x.id === card.getAttribute('data-id'); })[0] : null;
			if (a === 'copy' && item) return copy(item.text, toast, 'Copied');
			if (a === 'star' && item) {
				var was = d.bank.stars.indexOf(item.id) >= 0;
				d.bank.stars = was ? d.bank.stars.filter(function (x) { return x !== item.id; }) : [item.id].concat(d.bank.stars);
				if (ui.type === 'saved') redraw(els.ideas, ideas); // un-starring inside "Saved" takes the card away
				else { // everywhere else the star changes where it is: the list does not move
					b.classList.toggle('on', !was); b.setAttribute('aria-pressed', String(!was)); b.setAttribute('aria-label', was ? 'Save this idea' : 'Remove from saved');
					var tab = els.ideas.querySelector('.ib-tabs [data-id=saved] i'); if (tab) tab.textContent = d.bank.stars.length;
				}
				if (!was) toast('Saved');
				return o.req('bank-star', {method: 'POST', json: {id: item.id, on: !was}}).then(function (r) { if (r && r.ok) d.bank.stars = r.stars; }, function () {});
			}
			if (a === 'cal' && item) {
				if (!pl) return toast('Your content plan is still loading');
				var ok = item.idea_key ? pl.idea(item.idea_key) : pl.add(item.type === 'caption' ? {caption: item.text, type: /carousel/i.test(item.format || '') ? 'carousel' : /photo/i.test(item.format || '') ? 'photo' : 'reel'} : {hook: item.text.replace(/^Part 2 of “(.*)”$/, 'Part 2: $1'), pillar: item.pillar || '', type: /carousel/i.test(item.format || '') ? 'carousel' : /photo/i.test(item.format || '') ? 'photo' : 'reel'});
				if (!ok) toast('Your content plan is still loading');
				return;
			}
			if (a === 'full') { ui.full = !ui.full; keep(); redraw(els.brands, brands); if (!ui.full) els.brands.scrollIntoView({block: 'nearest'}); return; }
			if (a === 'shareon') return post('kit-share', {on: true}).then(function (r) { if (r) { d.share = r.share; redraw(els.brands, brands); toast('Your brand link is ready'); } });
			if (a === 'shareoff') { if (!window.confirm('Switch this link off? Brands who have it will not be able to open it any more.')) return; return post('kit-share', {on: false}).then(function (r) { if (r) { d.share = r.share; redraw(els.brands, brands); toast('The link is off'); } }); }
			if (a === 'copylink') return copy(d.share.url, toast, 'Link copied');
		});
		var typing = null;
		document.addEventListener('input', function (e) {
			if (e.target.id !== 'ib-q' || !d) return;
			ui.q = e.target.value; ui.more = false; keep();
			clearTimeout(typing);
			typing = setTimeout(function () {
				var pos = e.target.selectionStart;
				redraw(els.ideas, ideas);
				var q = document.getElementById('ib-q');
				if (q) { q.focus(); try { q.setSelectionRange(pos, pos); } catch (err) {} }
			}, 180);
		});

		if (o.first && o.first.ok) { d = o.first; draw(true); return {reload: function () { return load(false); }}; } // already fetched while the page was opening: no jump
		[els.today, els.score, els.ideas, els.brands].forEach(function (el) { if (el) el.innerHTML = '<p class="pl-none dz-wait">Loading…</p>'; });
		return {reload: function () { return load(false); }, ready: load(true)};
	}
	window.Dash = {mount: mount};
})();
