/* Busy Fox Creator Connect: Auto-DM campaign manager (comment a keyword -> get the link in a DM).
   Shared by the Busy Fox team dashboard (admin/) and each creator's own dashboard (me/).
   AutoDM.mount(container, {
     voice: 'admin' | 'creator',
     who: 'username',
     load():  Promise<{can_dm, webhook, campaigns, log}>,
     media(): Promise<[media]>,
     save(campaign): Promise<{ok, error}>,
     del(cid): Promise<{ok}>,
     subscribe(): Promise<{ok}>   (optional, admin only)
     connectLink: 'https://…?mode=dm&for=…',
     toast(text), onClose()       (optional)
   }) */
(function () {
	'use strict';
	var SPECIAL = {any: 'Any post', story: 'Story replies', dm: 'Any DM'};
	function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]; }); }
	function fmtDate(s) { if (!s) return ''; return new Date(s).toLocaleDateString('en-IN', {day: 'numeric', month: 'short'}); }
	function when(s) { return new Date(s).toLocaleString('en-IN', {day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit'}); }
	function thumb(m) { return m ? (m.thumbnail_url || m.media_url || '') : ''; }

	function mount(root, o) {
		var st = {data: null, media: [], edit: null, busy: false};
		var me = o.voice === 'creator';
		var toast = o.toast || function () {};
		function mediaById(id) { return st.media.filter(function (m) { return m.id === id; })[0]; }
		function blank() {
			return {media_id: (st.media[0] || {}).id || 'any', match: 'keyword', keywords: ['LINK'], dm_text: 'Hi! 💛 Here’s the link you asked for: {link}', link: '', public_reply: 'Sent it to your DMs! 📩', active: true};
		}
		function reload() {
			return o.load().then(function (d) { st.data = d || {}; render(); }, function () { root.innerHTML = '<p class="adm-none">Could not load. Check your connection and try again.</p>'; });
		}
		function start() {
			root.innerHTML = '<p class="adm-none">Loading…</p>';
			Promise.all([o.load(), o.media().catch(function () { return []; })]).then(function (r) {
				st.data = r[0] || {}; st.media = r[1] || []; render();
			}, function () { root.innerHTML = '<p class="adm-none">Could not load. Check your connection and try again.</p>'; });
		}
		function campRow(c) {
			var m = mediaById(c.media_id), t = thumb(m);
			var what = c.match === 'any' ? 'any comment' : 'comment ' + (c.keywords || []).map(function (k) { return '“' + esc(k) + '”'; }).join(' or ');
			var where = SPECIAL[c.media_id] || (m && m.caption ? m.caption.slice(0, 60) : (c.media_caption || 'a post'));
			return '<div class="adm-camp"><div class="adm-th">' + (t ? '<img src="' + esc(t) + '" alt="" referrerpolicy="no-referrer" loading="lazy">' : esc(SPECIAL[c.media_id] || 'Post')) + '</div>' +
				'<div class="adm-ct"><p><span class="adm-dot ' + (c.active ? 'on' : '') + '"></span><b>' + (c.active ? 'On' : 'Paused') + '</b> · ' + what + ' → DM' + (c.public_reply ? ' + public reply' : '') + '</p>' +
				'<small>' + esc(where) + (c.link ? ' · ' + esc(c.link.replace(/^https?:\/\//, '').slice(0, 48)) : '') + '</small></div>' +
				'<div class="adm-cb"><button class="btn line" type="button" data-a="edit" data-id="' + esc(c.id) + '">Edit</button><button class="btn line" type="button" data-a="toggle" data-id="' + esc(c.id) + '">' + (c.active ? 'Pause' : 'Turn on') + '</button><button class="btn line" type="button" data-a="del" data-id="' + esc(c.id) + '">Delete</button></div></div>';
		}
		function formHtml(c) {
			var opts = ['any', 'story', 'dm'].map(function (k) { return '<button type="button" data-a="pick" data-id="' + k + '" class="' + (c.media_id === k ? 'on' : '') + '">' + SPECIAL[k] + '</button>'; }).join('');
			var posts = st.media.map(function (m) {
				var t = thumb(m);
				return '<button type="button" data-a="pick" data-id="' + esc(m.id) + '" class="' + (c.media_id === m.id ? 'on' : '') + '" title="' + esc((m.caption || '').slice(0, 120)) + '" aria-label="' + esc((m.caption || 'Post').slice(0, 60)) + '">' +
					(t ? '<img src="' + esc(t) + '" alt="" referrerpolicy="no-referrer" loading="lazy">' : '<span>' + esc(m.media_type) + '</span>') + '<small>' + (m.media_product_type === 'REELS' ? 'Reel · ' : '') + fmtDate(m.timestamp) + '</small></button>';
			}).join('');
			return '<div class="adm-box adm-form" id="adm-form"><h3>' + (c.id ? 'Edit campaign' : 'New campaign') + '</h3>' +
				'<label class="adm-l">1 · Which post?</label><div class="adm-seg">' + opts + '</div>' + (posts ? '<div class="adm-posts">' + posts + '</div>' : '') +
				'<label class="adm-l">2 · When someone…</label><div class="adm-seg"><button type="button" data-a="match" data-id="keyword" class="' + (c.match !== 'any' ? 'on' : '') + '">comments a keyword</button><button type="button" data-a="match" data-id="any" class="' + (c.match === 'any' ? 'on' : '') + '">comments anything</button></div>' +
				'<input type="text" id="adm-kw" autocomplete="off" placeholder="Keywords, comma separated (e.g. LINK, PRICE)" value="' + esc((c.keywords || []).join(', ')) + '"' + (c.match === 'any' ? ' hidden' : '') + '>' +
				'<label class="adm-l">3 · …they get this DM</label><textarea id="adm-text" placeholder="Write {link} where the link should go">' + esc(c.dm_text || '') + '</textarea>' +
				'<input type="url" id="adm-link" inputmode="url" autocomplete="off" placeholder="https://… the link to send" value="' + esc(c.link || '') + '">' +
				'<label class="adm-l">4 · Public reply under the comment <span>(optional)</span></label><input type="text" id="adm-reply" placeholder="Leave empty for no public reply" value="' + esc(c.public_reply || '') + '">' +
				'<div class="adm-seg"><button type="button" data-a="active" data-id="1" class="' + (c.active !== false ? 'on' : '') + '">On</button><button type="button" data-a="active" data-id="0" class="' + (c.active === false ? 'on' : '') + '">Paused</button></div>' +
				'<div class="adm-row"><button class="btn red" type="button" data-a="save">Save campaign</button><button class="btn line" type="button" data-a="cancel">Cancel</button></div><p class="msg" id="adm-msg"></p></div>';
		}
		function render() {
			var d = st.data || {}, h = '';
			if (!d.can_dm) {
				h += '<div class="adm-warn"><b>' + (me ? 'Comment auto-replies are off.' : 'Not switched on for this account yet.') + '</b> ' +
					(me ? 'Tap below and allow access to comments and messages on Meta’s page (leave every switch on). It takes a minute.' : 'She needs to connect once more with comment &amp; message access (she must be an Instagram Tester until Meta approves auto-DM).') +
					'<div class="adm-row">' + (me ? '<a class="btn red" href="' + esc(o.connectLink) + '">Turn on auto-replies</a>' : '<button class="btn red small" type="button" data-copy="' + esc(o.connectLink) + '" data-msg="Auto-DM connect link copied">Copy auto-DM connect link</button>') + '</div></div>';
			} else if (!me && d.webhook && !d.webhook.ok && o.subscribe) {
				h += '<div class="adm-warn">Comment alerts aren’t subscribed for this account yet. <button class="btn line small" type="button" data-a="sub">Try again</button></div>';
			}
			var camps = d.campaigns || [];
			var bare = me && !d.can_dm && !camps.length && !(d.log || []).length && !st.edit; // off and never used: the one card that turns it on is enough
			if (bare) { root.innerHTML = h; return; }
			h += '<div class="adm-box"><div class="adm-head"><h3>' + (me ? 'Your campaigns' : 'Campaigns') + '</h3>' + (d.can_dm ? '<button class="btn red small" type="button" data-a="new">+ New campaign</button>' : '') + '</div>' +
				(camps.length ? camps.map(campRow).join('') : '<p class="adm-none">' + (d.can_dm ? 'No campaigns yet. Pick a post, choose a keyword like LINK and the link to send.' : 'Campaigns appear here once auto-replies are on.') + '</p>') + '</div>';
			if (st.edit) h += formHtml(st.edit);
			var log = d.log || [];
			h += '<div class="adm-box"><h3>' + (me ? 'Recent DMs' : 'Recent auto-DMs') + '</h3>' + (log.length ? '<ol class="adm-log">' + log.slice(0, 40).map(function (e) {
				var ok = e.dm === 'ok', skip = /^skipped/.test(e.dm || '');
				return '<li><span class="adm-when">' + when(e.at) + '</span><span><span class="' + (ok ? 'adm-ok' : skip ? 'adm-skip' : 'adm-err') + '">' + (ok ? 'Sent' : skip ? 'Skipped' : 'Not sent') + '</span> to @' + esc(e.from) + (e.text ? ' · “' + esc(e.text) + '”' : '') +
					(ok ? '' : '<small>' + esc(skip ? 'Already sent to this person today' : e.dm) + '</small>') + (e.reply && e.reply !== 'ok' ? '<small>Public reply: ' + esc(e.reply) + '</small>' : '') + '</span></li>';
			}).join('') + '</ol>' : '<p class="adm-none">Nothing sent yet.</p>') +
				'<p class="adm-fine">Instagram allows one private reply per comment; we send at most one DM per person per campaign each day and only to people who commented or replied first.' + (me ? '' : ' Until Meta approves auto-DM, Meta may only deliver to people with a role on the app.') + '</p></div>';
			root.innerHTML = h;
		}
		function readForm() {
			var c = st.edit;
			c.keywords = (root.querySelector('#adm-kw').value || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
			c.dm_text = root.querySelector('#adm-text').value; c.link = root.querySelector('#adm-link').value.trim(); c.public_reply = root.querySelector('#adm-reply').value;
			return c;
		}
		function withMedia(c) { var m = mediaById(c.media_id); return Object.assign({}, c, {media_caption: m ? (m.caption || '').slice(0, 80) : (c.media_caption || ''), media_permalink: m ? m.permalink : (c.media_permalink || '')}); }
		function scrollForm() { var f = root.querySelector('#adm-form'); if (f) f.scrollIntoView({behavior: 'smooth', block: 'start'}); }
		root.addEventListener('click', function (e) {
			var t = e.target.closest('[data-a]'); if (!t || st.busy) return;
			var a = t.getAttribute('data-a'), id = t.getAttribute('data-id');
			var camp = function () { return ((st.data && st.data.campaigns) || []).filter(function (c) { return c.id === id; })[0]; };
			if (a === 'new') { st.edit = blank(); render(); return scrollForm(); }
			if (a === 'cancel') { st.edit = null; return render(); }
			if (a === 'edit') { st.edit = JSON.parse(JSON.stringify(camp() || blank())); render(); return scrollForm(); }
			if (a === 'pick') { readForm(); st.edit.media_id = id; return render(); }
			if (a === 'match') { readForm(); st.edit.match = id; return render(); }
			if (a === 'active') { readForm(); st.edit.active = id === '1'; return render(); }
			if (a === 'save') {
				var c = withMedia(readForm()); st.busy = true; t.disabled = true;
				return o.save(c).then(function (r) {
					st.busy = false;
					if (!r || !r.ok) { t.disabled = false; var m = root.querySelector('#adm-msg'); m.textContent = (r && (r.error || r.message)) || 'Could not save'; m.classList.add('show'); return; }
					st.edit = null; toast('Campaign saved'); reload();
				}, function () { st.busy = false; t.disabled = false; toast('No connection'); });
			}
			if (a === 'toggle') {
				var c0 = camp(); if (!c0) return; c0 = Object.assign({}, c0, {active: !c0.active}); st.busy = true;
				return o.save(c0).then(function () { st.busy = false; toast(c0.active ? 'Turned on' : 'Paused'); reload(); }, function () { st.busy = false; toast('No connection'); });
			}
			if (a === 'del') {
				if (!confirm('Delete this campaign?')) return; st.busy = true;
				return o.del(id).then(function () { st.busy = false; toast('Deleted'); reload(); }, function () { st.busy = false; toast('No connection'); });
			}
			if (a === 'sub' && o.subscribe) return o.subscribe().then(function (r) { toast(r && r.ok ? 'Subscribed' : 'Still failing'); reload(); });
		});
		start();
		return {reload: reload};
	}
	window.AutoDM = {mount: mount};
})();
