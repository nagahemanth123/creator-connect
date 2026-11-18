/* Busy Fox Creator Connect: the brand kit ("For brands").
   One renderer for the card on the creator's dashboard (me/) and the view-only page a brand opens (kit/).
   Kit.html(kit, {compact, now}) returns the markup; Kit.wire(root) loads the pictures (as backgrounds, so they cannot be
   dragged out or saved with a long press) and stops the right-click menu on them.
   Every number says what it is and which days it covers. A number Instagram did not give shows "Not available from Instagram". */
(function () {
	'use strict';
	var IST = 330 * 60000;
	var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	var TYPE = {reel: 'Reel', carousel: 'Carousel', photo: 'Photo', video: 'Video', story: 'Story'};
	function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]; }); }
	function full(v) { return v == null ? '–' : Math.round(Number(v)).toLocaleString('en-IN'); }
	function trim(x) { return String(Number(x.toFixed(x >= 100 ? 0 : x >= 10 ? 1 : 2))); }
	// 3,08,11,530 is hard to read on a phone: from one lakh up we say it the Indian way
	function short(v) {
		if (v == null) return '–';
		var n = Number(v), a = Math.abs(n);
		if (a >= 1e7) return trim(n / 1e7) + ' crore';
		if (a >= 1e5) return trim(n / 1e5) + ' lakh';
		return full(n);
	}
	function ist(ms) { var d = new Date(ms + IST); return {y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), h: d.getUTCHours(), min: d.getUTCMinutes()}; }
	function day(iso) { if (!iso) return ''; var t = ist(Date.parse(iso)); return t.d + ' ' + MON[t.m] + ' ' + t.y; }
	function clock(iso) { if (!iso) return ''; var t = ist(Date.parse(iso)), h = t.h % 12 || 12; return h + ':' + (t.min < 10 ? '0' : '') + t.min + (t.h < 12 ? ' am' : ' pm'); }
	function country(code) { try { return new Intl.DisplayNames(['en'], {type: 'region'}).of(code) || code; } catch (e) { return code; } }
	var CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5.5 12.5l4.2 4.2L18.500 7.500" fill="none" stroke="currentColor" stroke-width="2.600" stroke-linecap="round" stroke-linejoin="round"/></svg>';
	var NA = 'Not available from Instagram';

	function tile(label, m, value, sub, cls) {
		if (!m || m.na) return '<div class="kt-tile na' + (cls ? ' ' + cls : '') + '"><span class="kt-l">' + label + '</span><b>' + NA + '</b><small>' + esc((m && m.na) || 'Instagram has not shared this yet.') + '</small></div>';
		return '<div class="kt-tile' + (cls ? ' ' + cls : '') + '"><span class="kt-l">' + label + '</span><b>' + value + '</b><small>' + sub + '</small></div>';
	}
	function list(label, m, name) {
		if (!m || m.na) return '<div class="kt-list na"><span class="kt-l">' + label + '</span><b>' + NA + '</b><small>' + esc((m && m.na) || '') + '</small></div>';
		var top = m.items[0] ? m.items[0].pct : 1;
		return '<div class="kt-list"><span class="kt-l">' + label + '</span><ul>' + m.items.map(function (x) {
			return '<li><span>' + esc(name ? name(x.label) : x.label) + '</span><i><u style="width:' + Math.max(4, Math.round(x.pct / top * 100)) + '%"></u></i><b>' + (x.pct >= 10 ? Math.round(x.pct) : x.pct) + '%</b></li>';
		}).join('') + '</ul><small>' + esc(m.period) + '</small></div>';
	}
	function sign(v) { return (v > 0 ? '+' : v < 0 ? '−' : '') + short(Math.abs(v)); }

	function html(k, o) {
		o = o || {};
		if (!k) return '<p class="kt-none">The kit is being prepared.</p>';
		var read = k.read_at ? day(k.read_at) : '', readAt = k.read_at ? read + ', ' + clock(k.read_at) + ' IST' : '';
		var g = k.gender, rv = k.reel_views, er = k.er, ss = k.saves_shares, gr = k.growth, cs = k.consistency, nf = k.non_followers;
		var seal = '<header class="kt-seal"><span class="kt-check">' + CHECK + '</span><p><b>Verified by Busy Fox</b><span>' + (readAt ? 'Read from Instagram on ' + esc(readAt) : 'Waiting for the first read from Instagram') + '</span></p>' + (k.code ? '<span class="kt-code" title="Verification code"><small>Code</small>' + esc(k.code) + '</span>' : '') + '</header>';
		var who = '<div class="kt-who"><span class="kt-pic" data-bg="' + esc(k.picture || '') + '">' + esc((k.username || '?').charAt(0).toUpperCase()) + '</span><p><b>' + esc(k.name || '@' + k.username) + '</b><a href="https://www.instagram.com/' + esc(k.username) + '/" target="_blank" rel="noopener">@' + esc(k.username) + '</a></p></div>';
		var heads = '<div class="kt-heads">' +
			tile('Followers', k.followers, k.followers && !k.followers.na ? short(k.followers.v) : '', k.followers && !k.followers.na ? esc(k.followers.period) : '') +
			tile('Views', k.views30, k.views30 && !k.views30.na ? short(k.views30.v) : '', 'all posts, reels and stories · ' + esc((k.views30 || {}).period || '')) +
			tile('Different people reached', k.reach30, k.reach30 && !k.reach30.na ? short(k.reach30.v) : '', 'each person counted once · ' + esc((k.reach30 || {}).period || '')) +
			tile('Average views per reel', rv, rv && !rv.na ? short(rv.v) : '', rv && !rv.na ? esc(rv.period) + (rv.v30 != null ? ' · ' + short(rv.v30) + ' over the last ' + rv.n30 : '') : '') +
			'</div>';
		var trust = '<p class="kt-trust">These numbers were read directly from Instagram’s own data with the creator’s permission' + (read ? ' on <b>' + esc(read) + '</b>' : '') + '. They are not typed in or edited by the creator.</p>';
		if (o.compact) return '<article class="kt kt-compact">' + seal + who + heads + '</article>';

		var more = '<div class="kt-grid">' +
			tile('Engagement rate', er, er && !er.na ? er.v + '%' : '', er && !er.na ? esc(er.formula) + ' · ' + esc(er.period) + (er.by_reach != null ? ' · ' + er.by_reach + '% when divided by people reached' : '') : '') +
			tile('Saves + shares per post', ss, ss && !ss.na ? short(ss.v) : '', ss && !ss.na ? short(ss.saves) + ' saves and ' + short(ss.shares) + ' shares on average · ' + esc(ss.period) : '') +
			tile('Reach from non-followers', nf, nf && !nf.na ? nf.v + '%' : '', nf && !nf.na ? 'share of people reached who do not follow yet · ' + esc(nf.period) : '') +
			tile('Follower growth', gr, gr && !gr.na ? sign(gr.v) + (gr.pct != null ? ' <em>' + (gr.pct > 0 ? '+' : '') + gr.pct + '%</em>' : '') : '', gr && !gr.na ? esc(gr.period) + ' · ' + esc(gr.how) : '') +
			tile('Posting consistency', cs, cs && !cs.na ? cs.v + ' <em>posts a week</em>' : '', cs && !cs.na ? 'posted in ' + cs.active + ' of the ' + esc(cs.period) : '') +
			'</div>';
		var gender = !g || g.na ? '<div class="kt-list na"><span class="kt-l">Men and women</span><b>' + NA + '</b><small>' + esc((g && g.na) || '') + '</small></div>' :
			'<div class="kt-list kt-gender"><span class="kt-l">Men and women</span><div class="kt-bar" role="img" aria-label="Men ' + g.men + ' percent, women ' + g.women + ' percent, not specified ' + g.other + ' percent"><i class="m" style="width:' + g.men + '%"></i><i class="w" style="width:' + g.women + '%"></i><i class="u"></i></div>' +
			'<p class="kt-leg"><span><i class="m"></i>Men <b>' + g.men + '%</b></span><span><i class="w"></i>Women <b>' + g.women + '%</b></span><span><i class="u"></i>Not specified <b>' + g.other + '%</b></span></p><small>' + esc(g.period) + '</small></div>';
		var aud = '<div class="kt-sec"><h4>Who follows</h4><div class="kt-aud">' + gender + list('Top age groups', k.ages) + list('Top cities', k.cities, function (c) { return c.split(',')[0]; }) + list('Top countries', k.countries, country) + '</div></div>';
		var top = (k.top || []).length ? '<div class="kt-sec"><h4>Top 3 posts <span>last 90 days</span></h4><div class="kt-top">' + k.top.map(function (p, i) {
			return '<a class="kt-post" href="' + esc(p.link) + '" target="_blank" rel="noopener" draggable="false"><span class="kt-shot" data-bg="' + esc(p.thumb || '') + '"><em>' + (i + 1) + '</em><span>' + esc(TYPE[p.type] || 'Post') + '</span></span>' +
				'<span class="kt-pt"><small>' + esc(TYPE[p.type] || 'Post') + ' · ' + esc(day(p.at)) + '</small><strong>' + esc(p.cap || '') + '</strong>' +
				'<span class="kt-pn">' + (p.views != null ? '<b>' + short(p.views) + '</b> views' : '<b>' + short(p.reach) + '</b> different people reached') + '</span>' +
				(p.views != null && p.reach != null ? '<span class="kt-pr">' + short(p.reach) + ' different people reached</span>' : '') +
				'<span class="kt-pm">' + [p.likes != null ? short(p.likes) + ' likes' : '', p.comments != null ? short(p.comments) + ' comments' : '', p.saves != null ? short(p.saves) + ' saves' : '', p.shares != null ? short(p.shares) + ' shares' : ''].filter(Boolean).join(' · ') + '</span></span></a>';
		}).join('') + '</div></div>' : '<div class="kt-sec"><h4>Top 3 posts</h4><div class="kt-list na"><b>' + NA + '</b><small>No posts with numbers from Instagram in the last 90 days.</small></div></div>';
		var fine = '<footer class="kt-fine"><p><b>How to trust this page.</b> Busy Fox Marketing reads these numbers from Instagram through Instagram’s official connection, which the creator approved' + (k.connected_at ? ' on ' + esc(day(k.connected_at)) : '') + '. The creator cannot change any number here. Each number shows the days it covers.</p>' +
			'<p>' + (readAt ? 'Last updated ' + esc(readAt) + '. Read again every 3 hours. ' : '') + (k.code ? 'Verification code <b>' + esc(k.code) + '</b>: it belongs to this account and this date, and only appears on pages at work.busyfox.in.' : '') + '</p>' +
			'<p>“Views” counts every play or view. “Different people reached” counts each person once, so it is always the smaller number.' + (k.history && k.history.posts ? ' History read: ' + full(k.history.posts) + ' posts' + (k.history.first_post && k.history.complete ? ' since ' + esc(day(k.history.first_post)) : '') + '.' : '') + '</p></footer>';
		return '<article class="kt">' + seal + who + heads + trust + more + aud + top + fine + '</article>';
	}

	function wire(root) {
		[].forEach.call(root.querySelectorAll('[data-bg]'), function (el) {
			var src = el.getAttribute('data-bg');
			el.removeAttribute('data-bg');
			if (!src) return;
			var img = new Image();
			img.referrerPolicy = 'no-referrer';
			img.onload = function () { el.style.backgroundImage = 'url("' + src.replace(/"/g, '%22') + '")'; el.classList.add('on'); };
			img.src = src;
		});
		if (!root.dataset.ktWired) {
			root.dataset.ktWired = '1';
			root.addEventListener('contextmenu', function (e) { if (e.target.closest('.kt-shot, .kt-pic')) e.preventDefault(); });
			root.addEventListener('dragstart', function (e) { if (e.target.closest('.kt')) e.preventDefault(); });
		}
	}
	window.Kit = {html: html, wire: wire, short: short, full: full, day: day, clock: clock, esc: esc};
})();
