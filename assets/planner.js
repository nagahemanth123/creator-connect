/* Busy Fox Creator Connect: the content plan (month calendar, her yes on every post, timed posting, Monday report).
   Shared by each creator's dashboard (me/) and the Busy Fox team page (admin/).
   Planner.mount(container, {
     voice: 'creator' | 'team',
     who: 'username',
     req(sub, {method, json, body, query}): Promise<json>   calls <api>/me/<sub> or <api>/admin/<sub>?id=who
     postConnect: 'https://…?mode=post&for=…',
     toast(text)
   }) */
(function () {
	'use strict';
	var IST = 330 * 60000, DAY = 86400000;
	var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
	var DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
	var TYPE = {reel: 'Reel', carousel: 'Carousel', photo: 'Photo', story: 'Story'};
	var MARK = '<svg class="pl-mark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path pathLength="1" d="M4 13C30 9 66 12 96 9 70 14 34 17 6 21c28-3 62-5 90-5"/></svg>';
	var ARROW = '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M4 10h11M10.500 5l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
	function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]; }); }
	function n(v) { return v == null ? '–' : Number(v).toLocaleString('en-IN'); }
	function ist(ms) { var d = new Date(ms + IST); return {y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), dow: (d.getUTCDay() + 6) % 7, h: d.getUTCHours(), min: d.getUTCMinutes()}; }
	function pad(x) { return (x < 10 ? '0' : '') + x; }
	function dayKey(ms) { var t = ist(ms); return t.y + '-' + pad(t.m + 1) + '-' + pad(t.d); }
	function time(ms) { var t = ist(ms), h = t.h % 12 || 12; return h + (t.min ? ':' + pad(t.min) : '') + (t.h < 12 ? ' am' : ' pm'); }
	function dayLong(ms) { var t = ist(ms); return DOW[t.dow] + ' ' + t.d + ' ' + MONTHS[t.m].slice(0, 3); }
	function fromIst(date, tm) { return Date.parse(date + 'T' + tm + ':00+05:30'); }

	function mount(root, o) {
		var me = o.voice !== 'team', toast = o.toast || function () {};
		var now0 = ist(Date.now());
		var st = {d: null, y: now0.y, m: now0.m, open: null, form: null, ask: false, busy: false, up: null, ig: {}, fresh: true, deal: true, sheet: '', ideas: null};
		var LABEL = me ?
			{idea: 'Planned', review: 'Waiting for your yes', changes: 'Change asked', approved: 'Approved', posting: 'Going live', posted: 'Posted', failed: 'Didn’t post', due: 'Post it now', missed: 'Time passed'} :
			{idea: 'Idea', review: 'Waiting for her yes', changes: 'She asked for a change', approved: 'Approved', posting: 'Going live', posted: 'Posted', failed: 'Failed', due: 'Due: she posts it', missed: 'Missed its time'};

		function look(p) { // the status a person should see
			if (p.status === 'approved' && p.missed) return 'missed';
			if (p.status === 'approved' && Date.parse(p.at) <= Date.now() && (p.mode === 'self' || p.reminded_at)) return 'due';
			return p.status;
		}
		function posts() { return (st.d && st.d.posts) || []; }
		function byId(id) { return posts().filter(function (p) { return p.id === id; })[0]; }
		function url(m) { return st.d.media_base + m.key; }
		function load() {
			return o.req('posts').then(function (d) {
				if (!d || !d.ok) throw new Error((d && d.error) || 'error');
				var first = !st.d;
				st.d = d; render(); loadIg();
				if (!first && o.onChange) o.onChange(d); // the Today card follows the plan
			}).catch(function () { if (!st.d) root.innerHTML = '<p class="pl-none">Could not load the plan. Check your connection and try again.</p>'; else toast('Could not refresh'); });
		}
		// what is already on Instagram this month (so past dates show the real reel or photo)
		function mKey() { return st.y + '-' + pad(st.m + 1); }
		function loadIg() {
			var k = mKey();
			if (st.ig[k]) return;
			st.ig[k] = 'wait';
			o.req('ig', {query: 'month=' + k}).then(function (r) {
				st.ig[k] = (r && r.ok && r.media) || [];
				if (k === mKey() && !st.form && !st.open) { st.fresh = true; render(); }
			}, function () { delete st.ig[k]; });
		}
		function igAll() { var out = []; Object.keys(st.ig).forEach(function (k) { if (st.ig[k] !== 'wait') out = out.concat(st.ig[k]); }); return out; }
		function igOf(p) { return p.ig_media_id ? igAll().filter(function (x) { return x.id === p.ig_media_id; })[0] : null; }
		function igOnly() { // Instagram posts that are not already a post in this plan
			var mine = {}, list = st.ig[mKey()];
			posts().forEach(function (p) { if (p.ig_media_id) mine[p.ig_media_id] = 1; });
			return (list && list !== 'wait' ? list : []).filter(function (x) { return !mine[x.id]; });
		}
		function pic(p) { // the picture that stands for a planned post: its cover, a photo, the posted version, or the video's first frame
			var c = p.cover || (p.media || []).filter(function (m) { return m.kind === 'image'; })[0];
			if (c) return '<img src="' + esc(url(c)) + '" alt="" loading="lazy">';
			var g = igOf(p);
			if (g && g.thumb) return '<img src="' + esc(g.thumb) + '" alt="" loading="lazy" referrerpolicy="no-referrer">';
			var v = (p.media || []).filter(function (m) { return m.kind === 'video'; })[0];
			return v ? '<video src="' + esc(url(v)) + '#t=0.1" muted playsinline preload="metadata" tabindex="-1"></video>' : '';
		}
		function igPic(x) { return x.thumb ? '<img src="' + esc(x.thumb) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : ''; }
		function igRow(x) {
			var t = Date.parse(x.at), story = x.type === 'story';
			var nums = (story ? [x.reach != null ? n(x.reach) + ' reached' : '', x.views != null ? n(x.views) + ' views' : ''] : [x.likes != null ? n(x.likes) + ' likes' : '', x.comments != null ? n(x.comments) + ' comments' : '']).filter(Boolean).join(' · ');
			if (story) return '<' + (x.live && x.permalink ? 'a href="' + esc(x.permalink) + '" target="_blank" rel="noopener"' : 'div') + ' class="pl-row st"><span class="pl-th">' + (igPic(x) || 'Story') + '</span>' +
				'<span class="pl-rt"><b>Story' + (x.video ? ' (video)' : '') + '</b><small>' + time(t) + (nums ? ' · ' + nums : '') + '</small></span><span class="pl-tag ' + (x.live ? 's-approved">Live now' : 's-posted">Story') + '</span></' + (x.live && x.permalink ? 'a' : 'div') + '>';
			return '<a class="pl-row" href="' + esc(x.permalink) + '" target="_blank" rel="noopener"><span class="pl-th">' + (igPic(x) || esc(TYPE[x.type])) + '</span>' +
				'<span class="pl-rt"><b>' + esc(x.caption || TYPE[x.type]) + '</b><small>' + time(t) + ' · ' + TYPE[x.type] + (nums ? ' · ' + nums : '') + '</small></span><span class="pl-tag s-posted">On Instagram</span></a>';
		}
		function call(sub, opt, okMsg) {
			if (st.busy) return Promise.resolve(null);
			st.busy = true; paintBusy();
			return o.req(sub, opt).then(function (r) {
				st.busy = false;
				if (!r || !r.ok) { toast((r && r.error) || 'That did not work. Try again.'); paintBusy(); return null; }
				if (okMsg) toast(okMsg);
				return load().then(function () { return r; });
			}, function () { st.busy = false; paintBusy(); toast('No connection'); return null; });
		}
		function paintBusy() { [].forEach.call(root.querySelectorAll('.pl-sheet .btn'), function (b) { b.disabled = st.busy; }); }

		// ---------- pieces ----------
		function thumb(p) {
			return '<span class="pl-th">' + (pic(p) || esc(TYPE[p.type])) + '</span>';
		}
		function tag(p) { var s = look(p); return '<span class="pl-tag s-' + s + '">' + LABEL[s] + '</span>'; }
		function how(p) {
			if (p.status === 'posted') return p.posted_by === 'auto' ? 'Posted automatically' : 'Posted by ' + (me ? 'you' : 'her');
			return p.mode === 'self' ? (me ? 'You post this one' : 'She posts this one') : (st.d.can_post ? 'Posts on its own' : (me ? 'You post this one for now' : 'She posts it (auto-posting is off)'));
		}
		function row(p) {
			var t = Date.parse(p.at);
			return '<button class="pl-row" type="button" data-a="open" data-id="' + esc(p.id) + '">' + thumb(p) +
				'<span class="pl-rt"><b>' + esc(p.hook || p.caption || TYPE[p.type]) + '</b><small>' + time(t) + ' · ' + TYPE[p.type] + ' · ' + how(p) + '</small></span>' + tag(p) + '</button>';
		}
		function needs() {
			if (!me) {
				var ch = posts().filter(function (p) { return ['changes', 'failed', 'missed'].indexOf(look(p)) >= 0; });
				return ch.length ? '<div class="pl-needs"><p class="pl-h">Needs the team</p>' + ch.map(row).join('') + '</div>' : '';
			}
			var mine = posts().filter(function (p) { var s = look(p); return s === 'review' || s === 'due'; });
			return mine.length ? '<div class="pl-needs"><p class="pl-h">' + (mine.length === 1 ? 'One post needs you' : mine.length + ' posts need you') + '</p>' + mine.map(row).join('') + '</div>' : '';
		}
		function calendar() {
			var first = Date.UTC(st.y, st.m, 1) - IST, lead = ist(first).dow, days = new Date(Date.UTC(st.y, st.m + 1, 0)).getUTCDate();
			var today = dayKey(Date.now()), by = {}, planned = 0, onIg = 0, anyStory = false;
			posts().forEach(function (p) { var k = dayKey(Date.parse(p.at)); (by[k] = by[k] || []).push(p); });
			var live = {}, fresh = st.fresh, seq = 0;
			st.fresh = false;
			igOnly().forEach(function (x) { var k = dayKey(Date.parse(x.at)); (live[k] = live[k] || []).push(x); if (x.type === 'story') anyStory = true; else onIg++; });
			var cells = DOW.map(function (d) { return '<span class="pl-dow">' + d.charAt(0) + '<i>' + d.slice(1) + '</i></span>'; }).join('');
			for (var i = 0; i < lead; i++) cells += '<span class="pl-cell off"></span>';
			for (var d = 1; d <= days; d++) {
				var k = st.y + '-' + pad(st.m + 1) + '-' + pad(d), list = by[k] || [], on = live[k] || [], all = list.length + on.length;
				var dots = list.slice(0, 4).map(function (p) { return '<i class="s-' + look(p) + '"></i>'; }).join('') + (list.length < 4 && on.length ? '<i class="s-posted"></i>' : '');
				var say = all ? all + (all === 1 ? ' post' : ' posts') : (k < today ? 'no posts' : 'add a post');
				planned += list.length;
				var shot = '';
				for (var j = 0; j < list.length && !shot; j++) shot = pic(list[j]);
				for (j = 0; j < on.length && !shot; j++) if (on[j].type !== 'story') shot = igPic(on[j]);
				for (j = 0; j < on.length && !shot; j++) shot = igPic(on[j]);
				var stor = on.some(function (x) { return x.type === 'story'; });
				cells += '<button type="button" class="pl-cell' + (k === today ? ' today' : '') + (k < today ? ' past' : '') + (all ? ' has' : (k < today ? '' : ' free')) + (shot ? ' pic' : '') + (stor ? ' st' : '') + '"' + ' style="--k:' + d + (all ? ';--i:' + (seq++) : '') + '" data-a="day" data-id="' + k + '" aria-label="' + d + ' ' + MONTHS[st.m] + ', ' + say + '">' +
					(shot ? '<span class="pl-shot">' + shot + '</span>' : '') + '<b>' + d + '</b><span class="pl-dots">' + (shot && !list.length ? '' : dots) + '</span>' + (shot && all > 1 ? '<em>' + all + '</em>' : '') + '</button>';
			}
			var turn = st.turn; st.turn = '';
			return '<div class="pl-cal' + (fresh ? ' pl-fresh' : '') + (turn ? ' pl-' + turn : '') + '"><div class="pl-calhd"><button type="button" class="pl-nav" data-a="prev" aria-label="Previous month">‹</button><div class="pl-calt"><h3>' + MONTHS[st.m] + ' <em>' + st.y + '</em></h3>' + (planned || onIg ? '<p class="pl-calsub">' + [planned ? planned + ' planned' : '', onIg ? onIg + ' on Instagram' : ''].filter(Boolean).join(' · ') + '</p>' : '') + '</div><button type="button" class="pl-nav" data-a="next" aria-label="Next month">›</button></div><div class="pl-grid">' + cells + '</div>' +
				'<div class="pl-calft"><p class="pl-key">' + (planned ? '<span><i class="s-idea"></i>Planned</span><span><i class="s-review"></i>' + (me ? 'Needs your yes' : 'Needs her yes') + '</span><span><i class="s-approved"></i>Approved</span><span><i class="s-posted"></i>Posted</span>' : '') + (anyStory ? '<span><i class="s-story"></i>Story that day</span>' : '') + '</p><p class="pl-tip">Tap a free day to add a post</p></div></div>';
		}
		function agenda() {
			var list = posts().filter(function (p) { var t = ist(Date.parse(p.at)); return t.y === st.y && t.m === st.m; }); // planned posts only; what is already on Instagram lives on the calendar
			if (!list.length) return '<div class="pl-empty"><span class="pl-emptyart" aria-hidden="true"><svg viewBox="0 0 64 36" focusable="false"><path class="trail" d="M3 27c9 5 15-13 23-8s2 13 12 5" /><g class="pp"><path d="M38 17L61 6 50 30l-3.500-8z"/><path class="fold" d="M61 6L46.500 22 50 30z"/></g></svg></span><b>Nothing planned for ' + MONTHS[st.m] + ' yet</b><p>' + (me ? (ideas().length ? 'Pick an idea from your 90-day plan, or add a post of your own. Your team adds posts here too.' : 'Your team adds the month’s posts here, and you can add your own.') : 'Add a post, or fill the month from her audit plan.') + '</p></div>';
			var out = '', last = '';
			list.forEach(function (p) {
				var t = Date.parse(p.at), k = dayKey(t);
				if (k !== last) { out += (last ? '</div>' : '') + '<div class="pl-day" id="pl-d-' + k + '"><p class="pl-dl">' + dayLong(t) + '</p>'; last = k; }
				out += p.ig ? igRow(p.ig) : row(p);
			});
			return '<div class="pl-agenda">' + out + '</div></div>';
		}
		// men and women: Instagram gives this for the whole account over 30 days, never for one post
		function splitRow(label, v) {
			var tot = v ? v.men + v.women + v.other : 0;
			if (!tot) return '';
			var m = Math.round(v.men / tot * 100), w = Math.round(v.women / tot * 100), u = Math.max(0, 100 - m - w);
			return '<div class="pl-sp"><p class="pl-spt"><b>' + label + '</b><span>' + n(tot) + '</span></p>' +
				'<div class="pl-bar" role="img" aria-label="Men ' + m + ' percent, women ' + w + ' percent, not specified ' + u + ' percent"><i class="m" style="width:' + m + '%"></i><i class="w" style="width:' + w + '%"></i><i class="u"></i></div>' +
				'<p class="pl-leg"><span><i class="m"></i>Men <b>' + m + '%</b> <small>' + n(v.men) + '</small></span><span><i class="w"></i>Women <b>' + w + '%</b> <small>' + n(v.women) + '</small></span><span><i class="u"></i>Not specified <b>' + u + '%</b> <small>' + n(v.other) + '</small></span></p></div>';
		}
		function audience() {
			var a = st.d.audience;
			if (!a) return '';
			var rows = splitRow(me ? 'People you reached' : 'People she reached', a.reach) + splitRow(me ? 'People who liked, commented, saved or shared' : 'People who engaged', a.engaged) + splitRow(me ? 'Your followers' : 'Her followers', a.followers);
			return rows ? '<div class="pl-box pl-aud"><p class="hand">last 30 days</p><h3>Men and <em>women</em></h3>' + rows + '<p class="pl-fine">Instagram shares this for the whole account, not for a single post. “Not specified” are people who have not told Instagram.</p></div>' : '';
		}
		function weekSplit(w) {
			var a = w.audience || st.d.audience;
			if (!a) return '';
			var rows = splitRow('Reached', a.reach) + splitRow('Engaged', a.engaged);
			return rows ? '<div class="pl-wsp"><p class="pl-h">Men and women, last 30 days</p>' + rows + '</div>' : '';
		}
		function weekly() {
			var ws = (st.d.weekly || []);
			if (!ws.length) return me ? '' : '<div class="pl-box"><h3>Monday report</h3><p class="pl-fine">It is made every Monday morning once she has a plan. You can also make it now for last week.</p><div class="pl-acts"><button class="btn line" type="button" data-a="mkweekly">Make last week’s report</button></div></div>';
			var w = ws[0], t = w.totals || {}, f = w.followers || {};
			var best = (w.posts || []).filter(function (p) { return p.id === w.best; })[0];
			var range = dayLong(Date.parse(w.from)).slice(4) + ' to ' + dayLong(Date.parse(w.to) - DAY).slice(4);
			var gain = f.gain == null ? '–' : (f.gain > 0 ? '+' : '') + n(f.gain);
			return '<div class="pl-box pl-week"><p class="hand">every Monday</p><h3>Your week, <em>' + esc(range) + '</em></h3>' +
				'<div class="pl-tiles"><div><b>' + n(t.posts) + '</b><span>posts went out</span></div><div><b>' + n(t.reach) + '</b><span>people reached</span></div><div><b>' + gain + '</b><span>followers</span></div></div>' + weekSplit(w) +
				(best ? '<a class="pl-best' + (best.thumb ? '' : ' noimg') + '" href="' + esc(best.permalink) + '" target="_blank" rel="noopener">' + (best.thumb ? '<img src="' + esc(best.thumb) + '" alt="" referrerpolicy="no-referrer" loading="lazy">' : '') + '<span><small>Best post of the week</small><b>' + esc(best.caption || TYPE[best.type]) + '</b><small>' + n(best.reach) + ' reached · ' + n(best.likes) + ' likes · ' + n(best.saves) + ' saves</small></span></a>' : '<p class="pl-fine">No posts went out that week.</p>') +
				((w.next || []).length ? '<p class="pl-h">Coming this week</p><ul class="pl-next">' + w.next.map(function (x) { return '<li><span>' + dayLong(Date.parse(x.at)) + ', ' + time(Date.parse(x.at)) + '</span>' + esc(x.hook) + '</li>'; }).join('') + '</ul>' : '') +
				(me ? (w.note ? '<p class="pl-h">From your team</p><p class="pl-note">' + esc(w.note) + '</p>' : '') :
					'<p class="pl-h">Your note for her (what we do next week)</p><textarea id="pl-wnote" rows="3">' + esc(w.note || '') + '</textarea><div class="pl-acts"><button class="btn red" type="button" data-a="wnote" data-id="' + esc(w.week) + '">Save note</button><button class="btn line" type="button" data-a="mkweekly">Refresh the numbers</button></div>') +
				'</div>';
		}

		// ---------- her 90-day plan: pick an idea, give it a date ----------
		function ideas() { return (st.d && st.d.ideas) || []; }
		function usedBy(x) { return posts().filter(function (p) { return p.idea === x.key || (p.hook && p.hook === x.hook); })[0]; }
		function ideasBar() {
			var all = ideas();
			if (!all.length) return '';
			var free = all.filter(function (x) { return !usedBy(x); }), left = free.length, done = all.length - left, now = Date.now();
			var soon = free.filter(function (x) { return Date.parse(x.at) > now; });
			var peek = (soon.length ? soon : free).slice(0, 3).map(function (x, n) {
				var t = Date.parse(x.at), d = ist(t);
				return '<button type="button" class="pl-pk" style="--i:' + n + '" data-a="useidea" data-id="' + esc(x.key) + '" aria-label="Pick a date for: ' + esc(x.hook) + '">' +
					'<span class="pl-pkd">' + (t > now ? '<b>' + d.d + '</b><i>' + MONTHS[d.m].slice(0, 3) + '</i>' : '<b>+</b>') + '</span>' +
					'<span class="pl-rt"><b>' + esc(x.hook) + '</b><small>' + esc(x.format || TYPE[x.type]) + (x.pillar ? ' · ' + esc(x.pillar) : '') + '</small></span>' +
					'<span class="pl-go" aria-hidden="true">' + ARROW + '</span></button>';
			}).join('');
			return '<div class="pl-hero' + (left ? '' : ' done') + '"><span class="tape" aria-hidden="true"></span>' +
				'<button type="button" class="pl-ninety" data-a="ideas">' +
				'<span class="pl-lab">' + (me ? 'Your' : 'Her') + ' 90-day plan</span>' + (me && left ? '<span class="hand pl-start">start here</span>' : '') +
				'<span class="pl-big"><b class="pl-n">' + (left || all.length) + '</b><span class="pl-nt">' + (left ? (left === 1 ? 'idea is' : 'ideas are') + ' waiting for <em>a date' + MARK + '</em>' : 'ideas, all on <em>the calendar' + MARK + '</em>') + '</span></span>' +
				'<small>' + (!left ? 'Every idea has its day. Open the plan to see them.' : done ? done + ' of ' + all.length + ' already ' + (done === 1 ? 'has' : 'have') + ' a day. Pick the next one.' : (me ? 'Pick an idea, then choose the day you want to make it.' : 'Pick an idea and give it a date.')) + '</small>' +
				'<span class="pl-cta">' + (left ? 'See all ' + all.length + ' ideas' : 'Open the plan') + '<i aria-hidden="true">' + ARROW + '</i></span>' +
				'</button>' +
				(peek ? '<div class="pl-peek"><p class="pl-lab">' + (soon.length ? 'Next up' : 'Ready to go') + ' <span>tap one to pick its date</span></p>' + peek + '</div>' : '') + '</div>';
		}
		function ideasSheet() {
			var day = st.ideas.day, out = '', last = -1;
			ideas().forEach(function (x) {
				if (x.week !== last) { out += (last >= 0 ? '</div>' : '') + '<div class="pl-wk"><p class="pl-wkh"><span>Week ' + x.week + '</span>' + (x.theme ? '<b>' + esc(x.theme) + '</b>' : '') + '</p>'; last = x.week; }
				var p = usedBy(x), t = Date.parse(x.at);
				out += '<div class="pl-idea' + (p ? ' used' : '') + '"><span class="pl-rt"><b>' + esc(x.hook) + '</b><small>' + esc(x.format || TYPE[x.type]) + (x.pillar ? ' · ' + esc(x.pillar) : '') + ' · suggested ' + dayLong(t) + ', ' + time(t) + '</small></span>' +
					(p ? '<button type="button" class="pl-tag s-approved" data-a="open" data-id="' + esc(p.id) + '">On ' + dayLong(Date.parse(p.at)).slice(4) + '</button>' :
						'<button type="button" class="btn red small" data-a="useidea" data-id="' + esc(x.key) + '">' + (day ? 'Use this' : 'Pick a date') + '</button>') + '</div>';
			});
			return '<div class="pl-sheet pl-ideas" role="dialog" aria-modal="true" aria-label="90-day plan"><button class="pl-x" type="button" data-a="close" aria-label="Close">×</button>' +
				'<p class="hand">' + (day ? 'for ' + dayLong(fromIst(day, '12:00')) : 'from your audit') + '</p><h3>' + (me ? 'Your' : 'Her') + ' <em>90-day plan</em></h3>' +
				'<p class="pl-fine">' + (day ? 'Choose the idea you want to make on this day.' : 'Choose an idea, then set the day and time you want to make it. The suggested date is only a start: change it to suit you.') + '</p>' + out + '</div></div>';
		}

		// ---------- one post, opened ----------
		function media(p) {
			var list = p.media || [];
			if (!list.length) return '<div class="pl-nofile">' + (me ? 'The edit is not added yet.' : 'No file yet.') + '</div>';
			return '<div class="pl-media' + (list.length > 1 ? ' many' : '') + '">' + list.map(function (m) {
				return m.kind === 'video' ? '<video controls playsinline preload="metadata" src="' + esc(url(m)) + '"' + (p.cover ? ' poster="' + esc(url(p.cover)) + '"' : '') + '></video>' : '<img src="' + esc(url(m)) + '" alt="">';
			}).join('') + '</div>' + (list.length > 1 ? '<p class="pl-fine">' + list.length + ' slides. Swipe to see them all.</p>' : '');
		}
		function sheet(p) {
			var s = look(p), t = Date.parse(p.at), own = me ? p.by === 'creator' : true, locked = p.status === 'posting' || p.status === 'posted';
			var acts = '';
			if (me) {
				if (s === 'review') acts = st.ask ?
					'<textarea id="pl-ask" rows="3" placeholder="What should change? For example: use the second take, shorter caption."></textarea><div class="pl-acts"><button class="btn red" type="button" data-a="sendask">Send to my team</button><button class="btn line" type="button" data-a="noask">Back</button></div>' :
					'<div class="pl-acts"><button class="btn red" type="button" data-a="approve">Approve</button><button class="btn line" type="button" data-a="ask">Ask for a change</button></div><p class="pl-fine">' + (p.mode === 'auto' && st.d.can_post ? 'After your yes it posts on its own at ' + time(t) + ' on ' + dayLong(t) + '.' : 'After your yes it waits here for you to post at ' + time(t) + ' on ' + dayLong(t) + '.') + '</p>';
				else if (s === 'due' || (s === 'approved' && (p.mode === 'self' || !st.d.can_post))) acts =
					'<div class="pl-acts">' + (p.media || []).map(function (m, i) { return '<a class="btn line" href="' + esc(url(m)) + '" download="' + esc(m.name || 'post') + '" target="_blank" rel="noopener">Save ' + (m.kind === 'video' ? 'video' : 'photo') + ((p.media.length > 1) ? ' ' + (i + 1) : '') + '</a>'; }).join('') +
					(p.caption ? '<button class="btn line" type="button" data-a="copycap">Copy caption</button>' : '') + '<button class="btn red" type="button" data-a="done">I’ve posted it</button></div><p class="pl-fine">Save the file, post it on Instagram with the caption, then tap “I’ve posted it”.</p>';
			} else {
				if (!locked) acts = '<div class="pl-acts"><button class="btn red" type="button" data-a="edit">Edit</button>' + (s === 'failed' || s === 'missed' ? '' : '') + (p.status !== 'posted' ? '<button class="btn line" type="button" data-a="done">Mark as posted</button>' : '') + '<button class="btn line" type="button" data-a="del">Delete</button></div>';
			}
			if (me && own && !locked) acts += '<div class="pl-acts"><button class="btn line" type="button" data-a="edit">Edit</button><button class="btn line" type="button" data-a="del">Delete</button></div>';
			var notes = (p.notes || []).map(function (x) { return '<li><b>' + (x.by === 'creator' ? (me ? 'You' : 'Her') : (me ? 'Your team' : 'Team')) + '</b> ' + esc(x.text) + '</li>'; }).join('');
			return '<div class="pl-sheet" role="dialog" aria-modal="true" aria-label="Post"><button class="pl-x" type="button" data-a="close" aria-label="Close">×</button>' +
				'<p class="pl-when">' + dayLong(t) + ', ' + time(t) + ' <span>IST</span></p>' + tag(p) +
				(p.hook ? '<h3>' + esc(p.hook) + '</h3>' : '') + media(p) +
				(p.caption ? '<p class="pl-h">Caption</p><p class="pl-cap">' + esc(p.caption) + '</p>' : '') +
				'<p class="pl-meta">' + TYPE[p.type] + ' · ' + how(p) + (p.pillar ? ' · ' + esc(p.pillar) : '') + (p.by === 'creator' ? ' · added by ' + (me ? 'you' : 'her') : '') + '</p>' +
				(p.error && s !== 'posted' ? '<p class="pl-err">' + esc(p.error) + '</p>' : '') +
				(p.permalink ? '<p><a class="pl-link" href="' + esc(p.permalink) + '" target="_blank" rel="noopener">See it on Instagram</a></p>' : '') +
				(notes ? '<p class="pl-h">Notes</p><ul class="pl-notes">' + notes + '</ul>' : '') + acts + '</div>';
		}

		// ---------- add / edit ----------
		function blank(day) {
			var t = Date.now() + DAY, k = day || dayKey(t);
			return {id: '', date: k, time: '20:00', type: 'reel', mode: st.d.can_post ? 'auto' : 'self', hook: '', caption: '', pillar: '', media: [], cover: null, note: ''};
		}
		function toForm(p) { var t = ist(Date.parse(p.at)); return {id: p.id, date: dayKey(Date.parse(p.at)), time: pad(t.h) + ':' + pad(t.min), type: p.type, mode: p.mode, hook: p.hook || '', caption: p.caption || '', pillar: p.pillar || '', media: (p.media || []).slice(), cover: p.cover || null, note: '', status: p.status}; }
		function seg(name, cur, opts) { return '<div class="pl-seg">' + opts.map(function (x) { return '<button type="button" data-a="set" data-k="' + name + '" data-id="' + x[0] + '" class="' + (cur === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div>'; }
		function form(f) {
			var when = '<div class="pl-two"><div><label class="pl-l" for="pl-date">' + (f.idea ? 'Which day?' : 'Date') + '</label><input id="pl-date" type="date" value="' + esc(f.date) + '"></div><div><label class="pl-l" for="pl-time">Time (IST)</label><input id="pl-time" type="time" value="' + esc(f.time) + '"></div></div>'; // an idea from the plan asks for its day first
			var files = f.media.map(function (m, i) { return '<li>' + (m.kind === 'video' ? 'Video' : 'Photo') + ' · ' + esc(m.name || '') + '<button type="button" data-a="rmfile" data-id="' + i + '" aria-label="Remove file">×</button></li>'; }).join('');
			return '<div class="pl-sheet pl-form" role="dialog" aria-modal="true" aria-label="' + (f.id ? 'Edit post' : 'New post') + '"><button class="pl-x" type="button" data-a="close" aria-label="Close">×</button>' +
				'<h3>' + (f.id ? 'Edit <em>post</em>' : f.idea ? 'Give it <em>a date</em>' : (me ? 'Add your <em>own post</em>' : 'Add a <em>post</em>')) + '</h3>' +
				(f.idea ? '<p class="pl-from"><span class="pl-lab">From ' + (me ? 'your' : 'her') + ' 90-day plan</span>' + esc(f.hook) + '</p>' + when : (!f.id && ideas().length ? '<button type="button" class="pl-linkb" data-a="ideasfor">Or pick an idea from ' + (me ? 'your' : 'her') + ' 90-day plan for this day</button>' : '')) +
				'<label class="pl-l">What is it?</label>' + seg('type', f.type, [['reel', 'Reel'], ['carousel', 'Carousel'], ['photo', 'Photo'], ['story', 'Story']]) +
				(f.idea ? '' : when) +
				'<label class="pl-l">How does it go out?</label>' + seg('mode', f.mode, [['auto', me ? 'Post it for me' : 'Posts on its own'], ['self', me ? 'I’ll post it myself' : 'She posts it herself']]) +
				'<p class="pl-fine">' + (f.mode === 'auto' ? (st.d.can_post ? 'It goes live at this time without anyone touching it. Instagram’s trending audio cannot be added this way.' : 'Auto-posting is not on for this account yet, so at this time it will wait for ' + (me ? 'you' : 'her') + ' to post.') : 'Best for trending-audio reels: add the sound in Instagram while posting.') + '</p>' +
				'<label class="pl-l" for="pl-hook">Hook or idea</label><input id="pl-hook" type="text" maxlength="200" value="' + esc(f.hook) + '" placeholder="The first line people see">' +
				'<label class="pl-l" for="pl-cap">Caption</label><textarea id="pl-cap" rows="5" maxlength="2200" placeholder="Caption and hashtags">' + esc(f.caption) + '</textarea>' +
				'<label class="pl-l">Files</label>' + (files ? '<ul class="pl-files">' + files + '</ul>' : '') +
				(st.up ? '<p class="pl-prog"><i style="--p:' + st.up.p + '"></i><span>Uploading ' + esc(st.up.name) + ' · ' + Math.round(st.up.p * 100) + '%</span></p>' : '<label class="btn line pl-pick">Add ' + (f.type === 'reel' ? 'the video' : 'photos or video') + '<input id="pl-file" type="file" accept="video/mp4,video/quicktime,image/jpeg,image/png,image/webp"' + (f.type === 'carousel' ? ' multiple' : '') + ' hidden></label>') +
				(f.type === 'reel' ? '<p class="pl-fine">' + (f.cover ? 'Cover: ' + esc(f.cover.name) + ' <button type="button" class="pl-linkb" data-a="rmcover">remove</button>' : '<label class="pl-linkb">Add a cover photo<input id="pl-cover" type="file" accept="image/jpeg,image/png,image/webp" hidden></label>') + '</p>' : '') +
				'<p class="pl-fine">MP4 or MOV video up to 300 MB. Photos are saved as JPG.</p>' +
				(me ? '' : '<label class="pl-l" for="pl-note">Note for her (optional)</label><input id="pl-note" type="text" maxlength="600" value="' + esc(f.note) + '">') +
				'<div class="pl-acts">' + (me ? '<button class="btn red" type="button" data-a="save">Save</button>' :
					'<button class="btn red" type="button" data-a="send">Save and send for her yes</button><button class="btn line" type="button" data-a="save">Save only</button>' + (f.status === 'failed' || f.status === 'approved' ? '<button class="btn line" type="button" data-a="retry">Save and approve again</button>' : '')) + '</div></div>';
		}
		function readForm() {
			var f = st.form, g = function (id) { var el = root.querySelector('#' + id); return el ? el.value : null; };
			['date', 'time', 'hook', 'note'].forEach(function (k) { var v = g('pl-' + k); if (v != null) f[k] = v; });
			var c = g('pl-cap'); if (c != null) f.caption = c;
		}
		function submit(extra) {
			readForm();
			var f = st.form, at = fromIst(f.date, f.time);
			if (!at) return toast('Pick a date and time');
			if (st.up) return toast('Wait for the upload to finish');
			var body = Object.assign({id: f.id || undefined, at: new Date(at).toISOString(), type: f.type, mode: f.mode, hook: f.hook, caption: f.caption, pillar: f.pillar, idea: f.idea || undefined, media: f.media, cover: f.cover, note: f.note}, extra || {});
			call('post', {method: 'POST', json: body}, extra && extra.send ? 'Sent for her yes' : 'Saved').then(function (r) { if (r) { st.form = null; st.open = null; render(); } });
		}

		// ---------- uploads: photos become JPG in the browser, files go up in 10 MB parts ----------
		function toJpeg(file) {
			if (file.type === 'image/jpeg' && file.size < 8 * 1024 * 1024) return Promise.resolve(file);
			return createImageBitmap(file).then(function (bmp) {
				var k = Math.min(1, 1440 / bmp.width), c = document.createElement('canvas');
				c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
				c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
				return new Promise(function (res) { c.toBlob(function (b) { res(new File([b], file.name.replace(/\.[^.]+$/, '') + '.jpg', {type: 'image/jpeg'})); }, 'image/jpeg', 0.92); });
			});
		}
		function upload(file0) {
			var isImg = /^image\//.test(file0.type);
			return (isImg ? toJpeg(file0) : Promise.resolve(file0)).then(function (file) {
				st.up = {name: file.name, p: 0}; render();
				return o.req('upload-start', {method: 'POST', json: {name: file.name, type: file.type, size: file.size}}).then(function (s) {
					if (!s || !s.ok) throw new Error((s && s.error) || 'Could not start the upload');
					var parts = [], total = Math.ceil(file.size / s.part_size), q = 'key=' + encodeURIComponent(s.key) + '&upload=' + encodeURIComponent(s.upload_id);
					function next(i) {
						if (i > total) return o.req('upload-finish', {method: 'POST', query: q, json: {parts: parts}});
						return o.req('upload-part', {method: 'PUT', query: q + '&n=' + i, body: file.slice((i - 1) * s.part_size, i * s.part_size)}).then(function (r) {
							if (!r || !r.ok) throw new Error((r && r.error) || 'The upload stopped');
							parts.push(r.part); st.up.p = i / total;
							var bar = root.querySelector('.pl-prog'); if (bar) { bar.firstChild.style.setProperty('--p', st.up.p); bar.lastChild.textContent = 'Uploading ' + file.name + ' · ' + Math.round(st.up.p * 100) + '%'; }
							return next(i + 1);
						});
					}
					return next(1).then(function (r) {
						if (!r || !r.ok) throw new Error((r && r.error) || 'The upload did not finish');
						return {key: s.key, kind: s.kind, name: file.name, size: file.size};
					});
				});
			});
		}
		function addFiles(list, cover) {
			readForm();
			var files = [].slice.call(list), f = st.form;
			(function one() {
				var file = files.shift();
				if (!file) { st.up = null; return render(); }
				upload(file).then(function (m) {
					if (cover) f.cover = m;
					else if (f.type === 'carousel') f.media = f.media.concat([m]).slice(0, 10);
					else f.media = [m];
					one();
				}, function (e) { st.up = null; render(); toast(e.message || 'The upload did not work'); });
			})();
		}

		function spot(el) { var r = el.getBoundingClientRect(); return {x: r.left + r.width / 2, y: r.top + r.height / 2}; }
		function useIdea(id) { // an idea from the 90-day plan, straight into "give it a date"
			var x = ideas().filter(function (i) { return i.key === id; })[0];
			if (!x) return false;
			var sug = Date.parse(x.at), ti = ist(sug), f0 = blank(st.ideas && st.ideas.day ? st.ideas.day : (sug > Date.now() ? dayKey(sug) : undefined));
			f0.time = pad(ti.h) + ':' + pad(ti.min); f0.type = x.type; f0.hook = x.hook; f0.pillar = x.pillar; f0.idea = x.key;
			st.ideas = null; st.open = null; st.form = f0; render();
			return true;
		}
		// ---------- draw ----------
		function render() {
			var p = st.open ? byId(st.open) : null;
			if (st.open && !p) st.open = null;
			var warn = st.d.can_post ? '' : '<div class="pl-warn"><div><p class="pl-lab">Auto-posting is off</p><p>' + (me ? 'Approved posts wait here for you to post. Allow it once and Busy Fox posts them for you at the planned time.' : '@' + esc(o.who) + ' needs to connect once with the posting link. Until then every post is “she posts it”.') + '</p></div><a class="btn line" href="' + esc(o.postConnect || '#') + '"' + (me ? '' : ' data-a="copyconnect"') + '>' + (me ? 'Turn on auto-posting' : 'Copy the posting link') + '</a></div>';
			var keepY = window.scrollY, sheetKey = st.ideas ? 'ideas' : st.form ? 'form' : p ? 'post' : '', opening = sheetKey && sheetKey !== st.sheet, deal = st.deal;
			st.sheet = sheetKey; st.deal = false; // a sheet rises once when it opens, not on every redraw inside it
			root.innerHTML = '<div class="pl">' + needs() + ideasBar() + warn + calendar() +
				'<div class="pl-list"><div class="pl-listhd"><h3>Posts in <em>' + MONTHS[st.m] + '</em></h3><div class="pl-acts pl-top"><button class="btn line" type="button" data-a="new">' + (me ? 'Add my own post' : 'Add a post') + '</button>' + (me ? '' : '<button class="btn line" type="button" data-a="fill">Fill 4 weeks from her audit plan</button>') + '</div></div>' +
				agenda() + '</div>' + audience() + weekly() + '</div>' +
				(sheetKey ? '<div class="pl-back on' + (opening ? ' pl-open' : '') + '">' + (st.ideas ? ideasSheet() : st.form ? form(st.form) : sheet(p)) + '</div>' : '');
			if (window.Fun && window.Fun.planner) window.Fun.planner(root, {deal: deal});
			window.scrollTo(0, keepY);
			document.documentElement.classList.toggle('pl-lock', Boolean(st.form || p || st.ideas));
		}

		root.addEventListener('change', function (e) {
			if (e.target.id === 'pl-file' && e.target.files.length) addFiles(e.target.files, false);
			if (e.target.id === 'pl-cover' && e.target.files.length) addFiles(e.target.files, true);
		});
		root.addEventListener('click', function (e) {
			if (e.target.classList && e.target.classList.contains('pl-back')) { if (!st.up) { st.open = null; st.form = null; st.ask = false; st.ideas = null; render(); } return; }
			var b = e.target.closest('[data-a]');
			if (!b || !root.contains(b)) return;
			var a = b.getAttribute('data-a'), id = b.getAttribute('data-id'), p = st.open ? byId(st.open) : null;
			if (a === 'prev' || a === 'next') { st.m += a === 'next' ? 1 : -1; if (st.m > 11) { st.m = 0; st.y++; } if (st.m < 0) { st.m = 11; st.y--; } st.fresh = true; st.deal = true; st.turn = a; render(); return loadIg(); }
			if (a === 'day') {
				var el = root.querySelector('#pl-d-' + id);
				if (el) return el.scrollIntoView({behavior: 'smooth', block: 'center'});
				var onIg = igOnly().filter(function (x) { return dayKey(Date.parse(x.at)) === id && x.permalink && (x.type !== 'story' || x.live); })[0];
				if (onIg) return window.open(onIg.permalink, '_blank', 'noopener');
				if (id < dayKey(Date.now())) return;
				st.form = blank(id); return render();
			}
			if (a === 'open') { st.open = id; st.ask = false; st.ideas = null; return render(); }
			if (a === 'ideas') { st.ideas = {day: null}; return render(); }
			if (a === 'ideasfor') { readForm(); st.ideas = {day: st.form.date}; st.form = null; return render(); }
			if (a === 'useidea') return useIdea(id);
			if (a === 'close') { if (st.up) return toast('Wait for the upload to finish'); st.open = null; st.form = null; st.ask = false; st.ideas = null; return render(); }
			if (a === 'new') { st.form = blank(); return render(); }
			if (a === 'edit' && p) { st.form = toForm(p); return render(); }
			if (a === 'set') { readForm(); st.form[b.getAttribute('data-k')] = id; if (st.form.type !== 'carousel') st.form.media = st.form.media.slice(0, 1); return render(); }
			if (a === 'rmfile') { readForm(); st.form.media.splice(Number(id), 1); return render(); }
			if (a === 'rmcover') { readForm(); st.form.cover = null; return render(); }
			if (a === 'save') return submit();
			if (a === 'send') return submit({send: true});
			if (a === 'retry') return submit({retry: true});
			if (a === 'ask') { st.ask = true; render(); var ta = root.querySelector('#pl-ask'); if (ta) ta.focus(); return; }
			if (a === 'noask') { st.ask = false; return render(); }
			if (a === 'approve' && p) { var at1 = spot(b); return call('post-approve', {method: 'POST', query: 'pid=' + p.id}, 'Approved').then(function (r) { if (r) { if (window.Fun) window.Fun.confetti(at1.x, at1.y); st.open = null; render(); } }); }
			if (a === 'sendask' && p) { var txt = (root.querySelector('#pl-ask') || {}).value || ''; if (!txt.trim()) return toast('Write what should change'); return call('post-change', {method: 'POST', query: 'pid=' + p.id, json: {text: txt}}, 'Sent to your team').then(function (r) { if (r) { st.open = null; st.ask = false; render(); } }); }
			if (a === 'done' && p) { var at2 = spot(b); return call('post-done', {method: 'POST', query: 'pid=' + p.id}, 'Marked as posted').then(function (r) { if (r) { if (window.Fun) window.Fun.confetti(at2.x, at2.y); render(); } }); }
			if (a === 'del' && p) { if (!window.confirm('Delete this post from the plan? Its files are removed too.')) return; return call('post-delete', {method: 'POST', query: 'pid=' + p.id}, 'Deleted').then(function (r) { if (r) { st.open = null; render(); } }); }
			if (a === 'copycap' && p) return (navigator.clipboard ? navigator.clipboard.writeText(p.caption) : Promise.reject()).then(function () { toast('Caption copied'); }, function () { window.prompt('Copy the caption:', p.caption); });
			if (a === 'copyconnect') { e.preventDefault(); return (navigator.clipboard ? navigator.clipboard.writeText(o.postConnect) : Promise.reject()).then(function () { toast('Posting link copied'); }, function () { window.prompt('Copy this:', o.postConnect); }); }
			if (a === 'fill') return call('posts-from-plan', {method: 'POST', query: 'weeks=4'}).then(function (r) { if (r) toast(r.added ? r.added + ' posts added as ideas' : 'Nothing new to add'); });
			if (a === 'mkweekly') return call('weekly', {method: 'POST'}, 'Report made');
			if (a === 'wnote') return call('weekly-note', {method: 'POST', json: {week: id, note: (root.querySelector('#pl-wnote') || {}).value || ''}}, 'Note saved');
		});
		document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && (st.open || st.form || st.ideas) && !st.up && root.isConnected) { st.open = null; st.form = null; st.ask = false; st.ideas = null; render(); } });

		root.innerHTML = '<p class="pl-none">Loading…</p>';
		load();
		return {
			reload: load,
			// used by the Today card, the ideas bank and the anniversary strip (assets/dash.js, assets/party.js)
			open: function (id) { if (!st.d || !byId(id) || st.up) return false; st.open = id; st.ask = false; st.ideas = null; st.form = null; render(); return true; },
			idea: function (key) { return Boolean(st.d) && !st.up && useIdea(key); },
			add: function (pre) { // the add-post form with some fields already filled: {date, time, type, hook, caption, pillar}
				if (!st.d || st.up) return false;
				var f = blank(pre && pre.date);
				['time', 'type', 'hook', 'caption', 'pillar'].forEach(function (k) { if (pre && pre[k]) f[k] = pre[k]; });
				st.open = null; st.ideas = null; st.ask = false; st.form = f; render();
				return true;
			}
		};
	}
	window.Planner = {mount: mount};
})();
