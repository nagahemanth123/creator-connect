/* Busy Fox Creator Connect: the Visits panel on the team page.
   Visits.mount(container, {who, load(): Promise<{visits, by_ip}>, clearTeam(): Promise, toast}) */
(function () {
	'use strict';
	function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]; }); }
	function dur(s) { s = Math.round(s || 0); if (s < 60) return s + ' s'; var m = Math.floor(s / 60), r = s % 60; if (m < 60) return m + ' min' + (r ? ' ' + r + ' s' : ''); return Math.floor(m / 60) + ' h ' + (m % 60) + ' min'; }
	function when(iso) { var d = new Date(iso); return d.toLocaleDateString('en-IN', {weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata'}) + ', ' + d.toLocaleTimeString('en-IN', {hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata'}); }
	function clock(sec) { var m = Math.floor(sec / 60), s = sec % 60; return m + ':' + (s < 10 ? '0' : '') + s; }
	var KIND = {me: 'Dashboard', report: 'Report'};

	function mount(root, o) {
		var st = {d: null, team: false};
		function load() {
			root.innerHTML = '<p class="vs-none">Loading visits…</p>';
			o.load().then(function (d) { if (!d || !d.ok) throw new Error(); st.d = d; render(); }).catch(function () { root.innerHTML = '<p class="vs-none">Could not load the visits. Try again.</p>'; });
		}
		function render() {
			var all = st.d.visits || [], teamN = all.filter(function (v) { return v.team; }).length;
			var list = st.team ? all : all.filter(function (v) { return !v.team; });
			var ips = (st.d.by_ip || []).filter(function (g) { return st.team || !g.team; });
			var tot = function (k) { return list.filter(function (v) { return v.kind === k; }); };
			var sum = function (a) { return a.reduce(function (n, v) { return n + (v.active_s || 0); }, 0); };
			var me = tot('me'), rep = tot('report');
			var h = '<div class="vs-tiles"><div><b>' + list.length + '</b><span>visits</span></div><div><b>' + ips.length + '</b><span>' + (ips.length === 1 ? 'IP address' : 'IP addresses') + '</span></div>' +
				'<div><b>' + dur(sum(me)) + '</b><span>on the dashboard · ' + me.length + (me.length === 1 ? ' visit' : ' visits') + '</span></div><div><b>' + dur(sum(rep)) + '</b><span>on the report · ' + rep.length + (rep.length === 1 ? ' visit' : ' visits') + '</span></div></div>';
			if (teamN) h += '<p class="vs-fine">' + (st.team ? 'Showing ' : 'Hiding ') + teamN + (teamN === 1 ? ' visit' : ' visits') + ' made from a Busy Fox team device (a browser that has opened this team page). <button type="button" class="vs-link" data-v="team">' + (st.team ? 'Hide them' : 'Show them') + '</button> · <button type="button" class="vs-link" data-v="clear">Delete them</button></p>';
			if (!list.length) { root.innerHTML = h + '<p class="vs-none">No visits yet. Visits are recorded from 16 Nov 2026, each time her dashboard link or her report link is opened.</p>'; return; }
			h += '<h3 class="vs-h">By IP address</h3><div class="vs-ips">' + ips.map(function (g) {
				return '<div class="vs-ip"><div class="vs-iph"><b>' + esc(g.ip || 'unknown') + '</b>' + (g.team ? '<span class="vs-tag team">Busy Fox team</span>' : '') + '</div>' +
					'<p>' + esc(g.place || 'Place not known') + (g.network ? ' · ' + esc(g.network) : '') + '</p><p>' + esc(g.devices.join(', ')) + '</p>' +
					'<dl><div><dt>Visits</dt><dd>' + g.visits + '</dd></div><div><dt>Dashboard</dt><dd>' + g.me + ' · ' + dur(g.me_s) + '</dd></div><div><dt>Report</dt><dd>' + g.report + ' · ' + dur(g.report_s) + '</dd></div></dl>' +
					'<p class="vs-fine">First ' + when(g.first) + ' · last ' + when(g.last) + '</p></div>';
			}).join('') + '</div>';
			h += '<h3 class="vs-h">Every visit, newest first</h3><div class="vs-list">' + list.map(function (v) {
				var parts = Object.keys(v.parts || {}).map(function (k) { return [k, v.parts[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
				var top = parts.length ? parts[0][1] : 1;
				var bars = parts.map(function (p) { return '<li><span>' + esc(p[0]) + '</span><i style="--w:' + Math.max(3, Math.round(100 * p[1] / top)) + '%"></i><b>' + dur(p[1]) + '</b></li>'; }).join('');
				var taps = (v.taps || []).map(function (t) { return '<li><span>' + clock(t.at) + '</span>' + esc(t.what) + '</li>'; }).join('');
				var dev = v.device || {};
				return '<details class="vs-v"><summary><span class="vs-tag k-' + v.kind + '">' + KIND[v.kind] + '</span><b>' + when(v.start) + '</b><span class="vs-d">' + dur(v.active_s) + '</span>' +
					'<small>' + esc(v.ip) + ' · ' + esc([v.city, v.country].filter(Boolean).join(', ') || 'place not known') + ' · ' + esc(dev.os || '') + ', ' + esc(dev.app || '') + (v.team ? ' · Busy Fox team' : '') + '</small></summary>' +
					'<div class="vs-body"><dl>' +
					'<div><dt>Opened</dt><dd>' + when(v.start) + '</dd></div><div><dt>Last activity</dt><dd>' + when(v.last) + '</dd></div><div><dt>Time actually reading</dt><dd>' + dur(v.active_s) + '</dd></div>' +
					'<div><dt>Scrolled</dt><dd>' + (v.scroll || 0) + '% of the page</dd></div><div><dt>Visitor</dt><dd>' + (v.returning ? 'Has opened it before on this device' : 'First time on this device') + '</dd></div>' +
					'<div><dt>Device</dt><dd>' + esc(dev.os || '') + (dev.phone ? ' phone' : '') + ' · ' + esc(dev.app || '') + ' · screen ' + esc(v.screen || '?') + '</dd></div>' +
					'<div><dt>Network</dt><dd>' + esc(v.network || 'not known') + '</dd></div><div><dt>Place (from the IP)</dt><dd>' + esc([v.city, v.region, v.country].filter(Boolean).join(', ') || 'not known') + '</dd></div>' +
					(v.from ? '<div><dt>Came from</dt><dd>' + esc(v.from) + '</dd></div>' : '') + '</dl>' +
					(bars ? '<p class="vs-lab">Time on each part</p><ul class="vs-bars">' + bars + '</ul>' : '') +
					(taps ? '<p class="vs-lab">What was tapped (minutes:seconds into the visit)</p><ol class="vs-taps">' + taps + '</ol>' : '<p class="vs-fine">Nothing was tapped in this visit.</p>') +
					'</div></details>';
			}).join('') + '</div><p class="vs-fine">Time counts only while the page is in front and being used (it stops after a minute without a touch or scroll). Place is an estimate from the IP address. Visits are kept for 120 days.</p>';
			root.innerHTML = h;
		}
		root.addEventListener('click', function (e) {
			var b = e.target.closest('[data-v]'); if (!b) return;
			if (b.getAttribute('data-v') === 'team') { st.team = !st.team; return render(); }
			if (b.getAttribute('data-v') === 'clear') { if (!window.confirm('Delete the Busy Fox team’s own visits from this list?')) return; o.clearTeam().then(function (r) { if (o.toast) o.toast(r && r.ok ? 'Removed ' + r.removed : 'That did not work'); load(); }); }
		});
		load();
	}
	window.Visits = {mount: mount};
})();
