/* Busy Fox Creator Connect: the Visits monitor (admin/visits/). Reads GET <api>/admin/visits-all with the team key kept on this device. */
(function () {
	'use strict';
	var cc = window.CC || {}, KEY = 'cc_admin_key', IST = 330 * 60000;
	function $(id) { return document.getElementById(id); }
	function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]; }); }
	function getKey() { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
	function setKey(v) { try { v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY); } catch (e) {} }
	function toast(t) { var el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(function () { el.classList.remove('on'); }, 2200); }
	function dur(s) { s = Math.round(s || 0); if (s < 60) return s + ' s'; var m = Math.floor(s / 60), r = s % 60; if (m < 60) return m + ' min' + (r ? ' ' + r + ' s' : ''); return Math.floor(m / 60) + ' h ' + (m % 60) + ' min'; }
	function when(iso) { var d = new Date(iso); return d.toLocaleDateString('en-IN', {weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata'}) + ', ' + d.toLocaleTimeString('en-IN', {hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata'}); }
	function ago(iso) { var s = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000)); if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + ' min ago'; if (s < 86400) return Math.floor(s / 3600) + ' h ago'; return Math.floor(s / 86400) + (Math.floor(s / 86400) === 1 ? ' day ago' : ' days ago'); }
	function clock(sec) { var m = Math.floor(sec / 60), s = sec % 60; return m + ':' + (s < 10 ? '0' : '') + s; }
	function istDay(ms) { return new Date(ms + IST).toISOString().slice(0, 10); }
	function istHour(ms) { return new Date(ms + IST).getUTCHours(); }
	var KIND = {me: 'Dashboard', report: 'Report'};
	// one visit's device and place, written out in full
	function devLine(v) { var d = v.device || {}; return [d.model, (d.os || '') + (d.osv ? ' ' + d.osv : ''), (d.app || '') + (d.appv ? ' ' + d.appv : '')].filter(Boolean).join(' · '); }
	function placeLine(v) { return [v.city, v.region, v.country].filter(Boolean).join(', ') + (v.postal ? ' ' + v.postal : ''); }
	function fullRows(v) {
		var d = v.device || {}, map = v.lat != null && v.lon != null ? ' · <a href="https://www.google.com/maps?q=' + encodeURIComponent(v.lat + ',' + v.lon) + '" target="_blank" rel="noopener">open on a map</a>' : '';
		var row = function (k, val) { return val ? '<div><dt>' + k + '</dt><dd>' + val + '</dd></div>' : ''; };
		return row('IP address', esc(v.ip) + (v.ipv ? ' (' + v.ipv + ')' : '')) +
			row('Location (from the IP)', esc(placeLine(v) || 'not known') + map) +
			row('Internet provider', esc(v.network || 'not known') + (v.asn ? ' · AS' + esc(v.asn) : '')) +
			row('Time zone', esc([v.tz, v.ip_tz && v.ip_tz !== v.tz ? 'IP says ' + v.ip_tz : ''].filter(Boolean).join(' · '))) +
			row('Device', esc([d.model, d.phone ? 'phone' : 'computer or tablet'].filter(Boolean).join(' · '))) +
			row('System', esc((d.os || '') + (d.osv ? ' ' + d.osv : ''))) +
			row('Opened in', esc((d.app || '') + (d.appv ? ' ' + d.appv : ''))) +
			row('Screen', esc([v.display ? v.display + ' screen' : '', v.screen ? v.screen + ' window' : '', v.dpr ? v.dpr + '× sharpness' : '', v.touch ? 'touch' : '', v.dark ? 'dark mode' : ''].filter(Boolean).join(' · '))) +
			row('Connection', esc(v.net ? v.net.toUpperCase() : '')) +
			row('Languages', esc(v.langs || v.lang || '')) +
			row('Came from', esc(v.from || ''));
	}

	var PERIODS = [['1', 'Today'], ['7', '7 days'], ['30', '30 days'], ['0', 'All']];
	var st = {d: null, who: new URLSearchParams(location.search).get('id') || '', kind: '', days: '30', ip: '', team: false, open: {}};

	function gate(msg) { $('app').hidden = true; $('gate').hidden = false; if (msg) { $('gmsg').textContent = msg; $('gmsg').classList.add('show'); } $('key').focus(); }
	function load(quiet) {
		var k = getKey();
		if (!k) return gate();
		if (!quiet) { $('refresh').disabled = true; $('refresh').textContent = 'Loading…'; }
		fetch(cc.api + '/admin/visits-all', {headers: {Authorization: 'Bearer ' + k}, cache: 'no-store'})
			.then(function (r) { return r.json().then(function (d) { return {s: r.status, d: d}; }); })
			.then(function (x) {
				$('refresh').disabled = false; $('refresh').textContent = 'Update';
				if (x.s === 401) { setKey(''); return gate('That key didn’t work.'); }
				if (!x.d.ok) return toast('Could not load the visits');
				st.d = x.d; $('gate').hidden = true; $('app').hidden = false;
				$('liveTxt').textContent = 'Updated ' + new Date().toLocaleTimeString('en-IN', {hour: 'numeric', minute: '2-digit'}) + '. Tap Update for the latest.';
				[].forEach.call(document.querySelectorAll('#list details[open]'), function (el) { st.open[el.getAttribute('data-k')] = 1; });
				render();
			})
			.catch(function () { $('refresh').disabled = false; $('refresh').textContent = 'Update'; if (!quiet) toast('No connection'); });
	}
	function shown() {
		var since = st.days === '0' ? 0 : (st.days === '1' ? Date.parse(istDay(Date.now()) + 'T00:00:00+05:30') : Date.now() - Number(st.days) * 86400000);
		return (st.d.visits || []).filter(function (v) {
			return (st.team || !v.team) && (!st.who || v.username === st.who) && (!st.kind || v.kind === st.kind) && (!st.ip || v.ip === st.ip) && Date.parse(v.start) >= since;
		});
	}
	function chip(group, val, text, extra) { return '<button type="button" class="vm-chip' + (st[group] === val ? ' on' : '') + (extra || '') + '" data-f="' + group + '" data-v="' + esc(val) + '">' + text + '</button>'; }
	function sum(a) { return a.reduce(function (n, v) { return n + (v.active_s || 0); }, 0); }
	function uniq(a, f) { var o = {}; a.forEach(function (v) { o[f(v)] = 1; }); return Object.keys(o).length; }

	function render() {
		var all = st.d.visits || [], list = shown(), teamN = all.filter(function (v) { return v.team; }).length;
		// filters
		$('filters').innerHTML =
			'<div class="vm-row"><span>Creator</span>' + chip('who', '', 'Everyone') + (st.d.creators || []).map(function (c) { return chip('who', c.username, '@' + esc(c.username)); }).join('') + '</div>' +
			'<div class="vm-row"><span>Page</span>' + chip('kind', '', 'Both') + chip('kind', 'me', 'Dashboard') + chip('kind', 'report', 'Report') + '</div>' +
			'<div class="vm-row"><span>When</span>' + PERIODS.map(function (p) { return chip('days', p[0], p[1]); }).join('') + '</div>' +
			(st.ip ? '<div class="vm-row"><span>IP</span><button type="button" class="vm-chip ip" data-f="ip" data-v="">' + esc(st.ip) + ' ×</button></div>' : '') +
			(teamN ? '<div class="vm-row"><span>Team</span><button type="button" class="vm-chip' + (st.team ? ' on' : '') + '" data-f="team" data-v="">' + (st.team ? 'Showing' : 'Hiding') + ' ' + teamN + ' Busy Fox team ' + (teamN === 1 ? 'visit' : 'visits') + '</button></div>' : '');
		// on right now
		var live = all.filter(function (v) { return (st.team || !v.team) && Date.now() - Date.parse(v.last) < 100000; });
		$('now').innerHTML = live.length ? '<div class="vm-now"><b>' + live.length + (live.length === 1 ? ' person is' : ' people are') + ' on a page right now</b><ul>' + live.map(function (v) {
			return '<li><span>@' + esc(v.username) + '</span> · ' + KIND[v.kind] + ' · ' + dur(v.active_s) + ' so far · ' + esc(v.ip) + ' · ' + esc(placeLine(v)) + ' · ' + esc(devLine(v)) + '</li>';
		}).join('') + '</ul></div>' : '';
		// tiles
		var me = list.filter(function (v) { return v.kind === 'me'; }), rep = list.filter(function (v) { return v.kind === 'report'; });
		$('tiles').innerHTML = [
			[list.length, 'visits'], [uniq(list, function (v) { return v.ip; }), 'IP addresses'],
			[dur(sum(me)), 'on the dashboard · ' + me.length + (me.length === 1 ? ' visit' : ' visits')], [dur(sum(rep)), 'on the report · ' + rep.length + (rep.length === 1 ? ' visit' : ' visits')],
			[list.length ? dur(sum(list) / list.length) : '–', 'average visit'], [list.length ? ago(list[0].start) : '–', 'last visit']
		].map(function (t) { return '<div><b>' + t[0] + '</b><span>' + t[1] + '</span></div>'; }).join('');
		if (!list.length) {
			var none = '<p class="vm-none">' + (all.length ? 'No visits match these filters.' : 'No visits yet. They are recorded each time a creator’s dashboard link or report link is opened.') + '</p>';
			['days', 'hours', 'creators', 'ips', 'parts', 'taps', 'list'].forEach(function (id) { $(id).innerHTML = none; });
			return;
		}
		days(list); hours(list); creators(list); ips(list); looked(list); tapped(list); visits(list);
	}
	function days(list) {
		var n = st.days === '1' ? 1 : st.days === '7' ? 7 : st.days === '30' ? 30 : Math.min(60, Math.max(7, Math.ceil((Date.now() - Date.parse(list[list.length - 1].start)) / 86400000) + 1));
		var keys = [], by = {};
		for (var i = n - 1; i >= 0; i--) { var k = istDay(Date.now() - i * 86400000); keys.push(k); by[k] = {me: 0, report: 0}; }
		list.forEach(function (v) { var k = istDay(Date.parse(v.start)); if (by[k]) by[k][v.kind]++; });
		var max = Math.max.apply(null, keys.map(function (k) { return by[k].me + by[k].report; })) || 1;
		$('days').innerHTML = '<div class="vm-bars">' + keys.map(function (k) {
			var d = by[k], t = d.me + d.report;
			return '<div class="' + (t ? '' : 'zero') + '" title="' + k + ': ' + d.me + ' dashboard, ' + d.report + ' report">' + (d.report ? '<i class="r" style="height:' + (100 * d.report / max) + '%"></i>' : '') + (d.me ? '<i style="height:' + (100 * d.me / max) + '%"></i>' : '') + '</div>';
		}).join('') + '</div><div class="vm-axis">' + keys.map(function (k, i) { return '<span>' + (n <= 10 || i % Math.ceil(n / 8) === 0 ? Number(k.slice(8)) + '/' + Number(k.slice(5, 7)) : '') + '</span>'; }).join('') + '</div>' +
			'<p class="vm-key"><span><i></i>Dashboard</span><span><i class="r"></i>Report</span><span>Busiest day: ' + max + (max === 1 ? ' visit' : ' visits') + '</span></p>';
	}
	function hours(list) {
		var h = []; for (var i = 0; i < 24; i++) h.push(0);
		list.forEach(function (v) { h[istHour(Date.parse(v.start))]++; });
		var max = Math.max.apply(null, h) || 1, best = h.indexOf(max);
		var lab = function (x) { return (x % 12 || 12) + (x < 12 ? ' am' : ' pm'); };
		$('hours').innerHTML = '<div class="vm-bars">' + h.map(function (c, i) { return '<div class="' + (c ? '' : 'zero') + '" title="' + lab(i) + ': ' + c + '">' + (c ? '<i style="height:' + (100 * c / max) + '%"></i>' : '') + '</div>'; }).join('') + '</div>' +
			'<div class="vm-axis">' + h.map(function (c, i) { return '<span>' + (i % 3 === 0 ? lab(i) : '') + '</span>'; }).join('') + '</div><p class="vm-key"><span>India time</span><span>Most opens around ' + lab(best) + '</span></p>';
	}
	function creators(list) {
		var by = {};
		list.forEach(function (v) { var g = by[v.username] || (by[v.username] = {u: v.username, n: 0, me: 0, rep: 0, me_s: 0, rep_s: 0, ips: {}, last: v.start}); g.n++; if (v.kind === 'me') { g.me++; g.me_s += v.active_s || 0; } else { g.rep++; g.rep_s += v.active_s || 0; } g.ips[v.ip] = 1; if (v.start > g.last) g.last = v.start; });
		var rows = Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return b.last.localeCompare(a.last); });
		$('creators').innerHTML = '<div class="vm-scroll"><table class="vm-table"><thead><tr><th>Creator</th><th class="n">Visits</th><th class="n">Dashboard</th><th class="n">Time</th><th class="n">Report</th><th class="n">Time</th><th class="n">IPs</th><th>Last visit</th></tr></thead><tbody>' + rows.map(function (g) {
			return '<tr><td><button type="button" data-f="who" data-v="' + esc(g.u) + '">@' + esc(g.u) + '</button></td><td class="n">' + g.n + '</td><td class="n">' + g.me + '</td><td class="n">' + dur(g.me_s) + '</td><td class="n">' + g.rep + '</td><td class="n">' + dur(g.rep_s) + '</td><td class="n">' + Object.keys(g.ips).length + '</td><td>' + when(g.last) + ' · ' + ago(g.last) + '</td></tr>';
		}).join('') + '</tbody></table></div>';
	}
	function ips(list) {
		var by = {};
		list.forEach(function (v) {
			var g = by[v.ip] || (by[v.ip] = {ip: v.ip, place: [v.city, v.region, v.country].filter(Boolean).join(', '), network: v.network, team: false, dev: {}, who: {}, n: 0, me: 0, rep: 0, me_s: 0, rep_s: 0, first: v.start, last: v.start});
			g.n++; if (v.kind === 'me') { g.me++; g.me_s += v.active_s || 0; } else { g.rep++; g.rep_s += v.active_s || 0; }
			g.team = g.team || Boolean(v.team); g.dev[devLine(v)] = 1; if (v.postal) g.place = placeLine(v); g.who['@' + v.username] = 1;
			if (v.start < g.first) g.first = v.start; if (v.start > g.last) g.last = v.start;
		});
		$('ips').innerHTML = Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return b.last.localeCompare(a.last); }).map(function (g) {
			return '<button type="button" class="vs-ip" data-f="ip" data-v="' + esc(g.ip) + '"><div class="vs-iph"><b>' + esc(g.ip || 'unknown') + '</b>' + (g.team ? '<span class="vs-tag team">Busy Fox team</span>' : '') + '</div>' +
				'<p>' + esc(g.place || 'Place not known') + (g.network ? ' · ' + esc(g.network) : '') + '</p><p>' + esc(Object.keys(g.dev).join(', ')) + '</p><p>Opened: ' + esc(Object.keys(g.who).join(', ')) + '</p>' +
				'<dl><div><dt>Visits</dt><dd>' + g.n + '</dd></div><div><dt>Dashboard</dt><dd>' + g.me + ' · ' + dur(g.me_s) + '</dd></div><div><dt>Report</dt><dd>' + g.rep + ' · ' + dur(g.rep_s) + '</dd></div></dl>' +
				'<p class="vs-fine">First ' + when(g.first) + ' · last ' + when(g.last) + '</p></button>';
		}).join('');
	}
	function rank(el, rows, fmt) {
		var top = rows.length ? rows[0][2] : 1;
		$(el).innerHTML = rows.length ? '<ul class="vm-rank">' + rows.slice(0, 14).map(function (r) { return '<li class="' + (r[0] === 'report' ? 'r' : '') + '"><span><small>' + KIND[r[0]] + '</small>' + esc(r[1]) + '</span><b>' + fmt(r[2]) + '</b><i style="--w:' + Math.max(2, Math.round(100 * r[2] / top)) + '%"></i></li>'; }).join('') + '</ul>' : '<p class="vm-none">Nothing recorded yet.</p>';
	}
	function looked(list) {
		var by = {};
		list.forEach(function (v) { Object.keys(v.parts || {}).forEach(function (k) { var id = v.kind + '|' + k; by[id] = (by[id] || 0) + v.parts[k]; }); });
		rank('parts', Object.keys(by).map(function (id) { var a = id.split('|'); return [a[0], a[1], by[id]]; }).sort(function (a, b) { return b[2] - a[2]; }), dur);
	}
	function tapped(list) {
		var by = {};
		list.forEach(function (v) { (v.taps || []).forEach(function (t) { var w = t.what.replace(/^(Picked an idea): .*/, '$1'), id = v.kind + '|' + w; by[id] = (by[id] || 0) + 1; }); });
		rank('taps', Object.keys(by).map(function (id) { var a = id.split('|'); return [a[0], a[1], by[id]]; }).sort(function (a, b) { return b[2] - a[2]; }), function (n) { return n + '×'; });
	}
	function visits(list) {
		$('list').innerHTML = list.slice(0, 300).map(function (v) {
			var parts = Object.keys(v.parts || {}).map(function (k) { return [k, v.parts[k]]; }).sort(function (a, b) { return b[1] - a[1]; }), top = parts.length ? parts[0][1] : 1, dev = v.device || {}, k = v.owner + v.sid;
			var bars = parts.map(function (p) { return '<li><span>' + esc(p[0]) + '</span><i style="--w:' + Math.max(3, Math.round(100 * p[1] / top)) + '%"></i><b>' + dur(p[1]) + '</b></li>'; }).join('');
			var taps = (v.taps || []).map(function (t) { return '<li><span>' + clock(t.at) + '</span>' + esc(t.what) + '</li>'; }).join('');
			return '<details class="vs-v" data-k="' + esc(k) + '"' + (st.open[k] ? ' open' : '') + '><summary><span class="vs-tag k-' + v.kind + '">' + KIND[v.kind] + '</span><span class="vs-who">@' + esc(v.username) + '</span><b>' + when(v.start) + '</b><span class="vs-d">' + dur(v.active_s) + '</span>' +
				'<small>' + esc(v.ip) + ' · ' + esc(placeLine(v) || 'place not known') + ' · ' + esc(devLine(v)) + (v.team ? ' · Busy Fox team' : '') + ' · ' + ago(v.start) + '</small></summary>' +
				'<div class="vs-body"><dl><div><dt>Opened</dt><dd>' + when(v.start) + '</dd></div><div><dt>Last activity</dt><dd>' + when(v.last) + '</dd></div><div><dt>Time actually reading</dt><dd>' + dur(v.active_s) + '</dd></div>' +
				'<div><dt>Scrolled</dt><dd>' + (v.scroll || 0) + '% of the page</dd></div><div><dt>Visitor</dt><dd>' + (v.returning ? 'Has opened it before on this device' : 'First time on this device') + '</dd></div>' +
				fullRows(v) + '</dl>' +
				(bars ? '<p class="vs-lab">Time on each part</p><ul class="vs-bars">' + bars + '</ul>' : '') +
				(taps ? '<p class="vs-lab">What was tapped (minutes:seconds into the visit)</p><ol class="vs-taps">' + taps + '</ol>' : '<p class="vs-fine">Nothing was tapped in this visit.</p>') + (v.ua ? '<p class="vs-lab">Browser signature</p><p class="vs-ua">' + esc(v.ua) + '</p>' : '') + '</div></details>';
		}).join('');
	}
	function csv() {
		var rows = [['creator', 'page', 'opened_ist', 'last_activity_ist', 'seconds_reading', 'scrolled_pct', 'ip', 'city', 'region', 'country', 'network', 'device', 'app', 'screen', 'returning', 'team', 'parts', 'taps', 'postal', 'latitude', 'longitude', 'model', 'system_version', 'app_version', 'connection', 'browser_signature']];
		shown().forEach(function (v) {
			rows.push([v.username, KIND[v.kind], when(v.start), when(v.last), v.active_s || 0, v.scroll || 0, v.ip, v.city, v.region, v.country, v.network, (v.device || {}).os, (v.device || {}).app, v.screen, v.returning ? 'yes' : 'no', v.team ? 'yes' : 'no',
				Object.keys(v.parts || {}).map(function (k) { return k + ' ' + v.parts[k] + 's'; }).join('; '), (v.taps || []).map(function (t) { return clock(t.at) + ' ' + t.what; }).join('; '), v.postal, v.lat, v.lon, (v.device || {}).model, (v.device || {}).osv, (v.device || {}).appv, v.net, v.ua]);
		});
		var text = rows.map(function (r) { return r.map(function (c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
		var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + text], {type: 'text/csv'})); a.download = 'busy-fox-visits-' + istDay(Date.now()) + '.csv'; a.click();
	}

	document.addEventListener('click', function (e) {
		var b = e.target.closest('[data-f]'); if (!b) return;
		var f = b.getAttribute('data-f'), v = b.getAttribute('data-v');
		if (f === 'team') st.team = !st.team; else st[f] = v;
		render();
		if (f === 'ip' && v) $('filters').scrollIntoView({behavior: 'smooth', block: 'start'});
	});
	$('refresh').addEventListener('click', function () { load(false); });
	$('csv').addEventListener('click', csv);
	$('open').addEventListener('click', function () { var v = $('key').value.trim(); if (!v) return; setKey(v); load(false); });
	$('key').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('open').click(); });
	load(false);
})();
