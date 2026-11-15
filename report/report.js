/* Busy Fox Creator Connect — audit report renderer.
   One file for the live page (fetches the report by token) and the PDF/offline copy
   (build.py embeds the data as window.REPORT). Hand-rolled SVG charts, no libraries. */
(function () {
  'use strict';

  // Contact rule (owner, 15 Nov): business name "Busy Fox Marketing", email only, no phone numbers, no town.
  var AGENCY = { name: 'Busy Fox Marketing', email: 'busyfoxconsultancy@gmail.com' };
  // Strawberry Mocha tokens (../assets/cc.css). Chart roles: cocoa = data, cherry = the one thing to look at.
  var C = {
    ink: '#2B1A17', ink2: '#53332D', mute: '#6E5551', mute2: '#866C67', stone: '#D9BFB8', stone2: '#F3DEDA',
    fox: '#C42847', foxt: '#A11F3A', paper: '#FFF9F7', line: '#EBCFCA', line2: '#F3DEDA', empty: '#F6EAE7',
    seq0: '#FBEFEC', seq1: '#3D2521', pink: '#F2B8C6', pinkDeep: '#D98799', butter: '#E2C35A'
  };
  var PALETTE = [C.ink2, C.fox, C.pinkDeep, C.stone, C.butter, C.mute2];
  var NA_TITLE = 'Not available from Instagram';

  /* ------------------------------------------------------------------ formatting */
  var NF = new Intl.NumberFormat('en-IN');
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function minus(s) { return String(s).replace(/^-/, '\u2212'); }
  function nint(v) { return isNum(v) ? minus(NF.format(Math.round(v))) : '\u2014'; }
  function compact(v) {
    if (!isNum(v)) return '\u2014';
    var a = Math.abs(v), s;
    if (a >= 1e6) s = (v / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
    else if (a >= 1e5) s = Math.round(v / 1e3) + 'k';
    else if (a >= 1e3) s = (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
    else s = String(Math.round(v));
    return minus(s);
  }
  function pct(v, d) { return isNum(v) ? minus((v * 100).toFixed(d == null ? 1 : d)) + '%' : '\u2014'; }
  function signed(v) {
    if (!isNum(v)) return '\u2014';
    var p = Math.round(v * 100);
    return (p > 0 ? '+' : p < 0 ? '\u2212' : '\u00b1') + Math.abs(p) + '%';
  }
  function fv(v, f) {
    if (v == null || (typeof v === 'number' && !isFinite(v))) return '\u2014';
    switch (f) {
      case 'int': return nint(v);
      case 'compact': return compact(v);
      case 'pct': return pct(v, 1);
      case 'pct0': return pct(v, 0);
      case 'signed': return signed(v);
      case 'signed_int': return (v > 0 ? '+' : v < 0 ? '\u2212' : '') + NF.format(Math.abs(Math.round(v)));
      case 'dec': return minus((+v).toFixed(1));
      case 'dec2': return minus((+v).toFixed(2));
      case 'per1k': return minus((v * 1000).toFixed(1));
      case 'text': return String(v);
      case 'list': return Array.isArray(v) ? v.join(', ') : String(v);
      default: return isNum(v) ? nint(v) : String(v);
    }
  }
  function axisFmt(v, f, step) {
    if (f === 'pct' || f === 'pct0') return minus((v * 100).toFixed(step < 0.01 ? 1 : 0)) + '%';
    if (f === 'signed') return signed(v);
    if (f === 'dec' || f === 'dec2') return minus(step < 1 ? v.toFixed(1) : v.toFixed(0));
    if (step < 100 && Math.abs(v) >= 1000) return nint(v);
    if (step < 1000 && Math.abs(v) >= 10000) return minus((v / 1000).toFixed(1)) + 'k';
    return compact(v);
  }
  function isNA(x) { return !x || (typeof x === 'object' && !Array.isArray(x) && x.na); }

  /* ------------------------------------------------------------------ html helpers */
  function naBox(x, title, calm) {
    var reason = (x && x.na) || (typeof x === 'string' ? x : 'Instagram did not return this data.');
    return '<div class="na' + (calm ? ' calm' : '') + '"><b>' + esc(title || NA_TITLE) + '</b><span>' + esc(reason) + '</span></div>';
  }
  function fig(title, body, o) {
    o = o || {};
    return '<figure class="fig' + (o.cls ? ' ' + o.cls : '') + '"><div class="fig-h"><span class="fig-t">' + esc(title) + '</span>' +
      (o.right ? '<span class="fig-r">' + esc(o.right) + '</span>' : '') + '</div>' +
      (o.desc ? '<p class="fig-d">' + esc(o.desc) + '</p>' : '') + body +
      (o.note ? '<p class="fig-n">' + esc(o.note) + '</p>' : '') + '</figure>';
  }
  function figOrNA(title, data, body, o) {
    return isNA(data) ? fig(title, naBox(data), { right: (o || {}).right && !/^\d/.test(o.right) ? o.right : '' }) : fig(title, body(), o);
  }
  function reading(notes, title) {
    notes = (notes || []).filter(Boolean);
    if (!notes.length) return '';
    return '<div class="reading"><span class="hand">' + esc(title || 'Reading the numbers') + '</span><ul class="ticks">' +
      notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul></div>';
  }
  function stats(items) {
    items = (items || []).filter(function (i) { return i; });
    if (!items.length) return '';
    return '<div class="stats">' + items.map(function (i) {
      var txt = i.fmt === 'text';
      var val = fv(i.value, i.fmt || 'int');
      return '<div class="stat"><p class="k">' + esc(i.label) + '</p><p class="n' + (txt ? ' t' : '') + '">' + esc(val) + '</p>' +
        (i.sub ? '<p class="s">' + esc(i.sub) + '</p>' : '') + '</div>';
    }).join('') + '</div>';
  }
  function hbars(items, o) {
    o = o || {};
    items = (items || []).filter(function (i) { return i && i.value != null; });
    if (!items.length) return naBox('Nothing to show yet.');
    var max = Math.max.apply(null, items.map(function (i) { return o.byShare ? (i.share || 0) : (i.value || 0); })) || 1;
    return '<ul class="hb' + (o.flat ? ' flat' : '') + '">' + items.map(function (i) {
      var w = Math.max(0, (o.byShare ? (i.share || 0) : (i.value || 0)) / max * 100);
      var main = o.byShare ? pct(i.share, i.share < 0.1 ? 1 : 0) : fv(i.value, o.fmt || 'int');
      var small = o.byShare ? nint(i.value) : (i.share != null && o.showShare ? pct(i.share, 0) : '');
      return '<li><span class="l">' + esc(i.label) + '</span><span class="v">' + esc(main) + (small ? '<small>' + esc(small) + '</small>' : '') +
        '</span><span class="t"><i style="width:' + w.toFixed(1) + '%"></i></span></li>';
    }).join('') + '</ul>';
  }
  function table(head, rows, o) {
    o = o || {};
    return '<div class="tw"><table class="tbl"><thead><tr>' + head.map(function (h, i) {
      return '<th' + (o.wide && o.wide.indexOf(i) >= 0 ? ' class="w"' : '') + '>' + esc(h) + '</th>';
    }).join('') + '</tr></thead><tbody>' + rows.map(function (r) {
      var cls = r.cls ? ' class="' + r.cls + '"' : '';
      var cells = r.cells || r;
      return '<tr' + cls + '>' + cells.map(function (c, i) {
        var raw = c && typeof c === 'object' && c.html != null;
        var cc = (o.wide && o.wide.indexOf(i) >= 0 ? 'w' : '') + (c && c.cls ? ' ' + c.cls : '');
        return '<td' + (cc.trim() ? ' class="' + cc.trim() + '"' : '') + '>' + (raw ? c.html : esc(c == null ? '\u2014' : c)) + '</td>';
      }).join('') + '</tr>';
    }).join('') + '</tbody></table></div>';
  }
  function signedCell(v) {
    if (!isNum(v)) return '\u2014';
    return { html: '<span class="' + (v >= 0 ? 'pos' : 'neg') + '">' + esc(signed(v)) + '</span>' };
  }
  function listItems(arr, cls) {
    arr = (arr || []).filter(Boolean);
    if (!arr.length) return '';
    return '<ul class="' + (cls || 'ticks') + '">' + arr.map(function (x) {
      if (typeof x === 'string') return '<li>' + esc(x) + '</li>';
      return '<li>' + (x.title ? '<strong>' + esc(x.title) + '</strong> ' : '') + esc(x.detail || x.text || x.rule || '') +
        (x.why ? '<span class="ev">' + esc(x.why) + '</span>' : '') + (x.evidence ? '<span class="ev">' + esc(x.evidence) + '</span>' : '') + '</li>';
    }).join('') + '</ul>';
  }

  /* ------------------------------------------------------------------ charts */
  var CH = [];
  function ch(kind, data, o) {
    CH.push({ kind: kind, data: data, o: o || {} });
    var h = (o && o.h) || (kind === 'heat' ? 220 : kind === 'donut' ? 150 : 190);
    return '<div class="chart" data-ch="' + (CH.length - 1) + '" style="min-height:' + h + 'px"></div>';
  }
  function legend(items) {
    return '<ul class="legend">' + items.map(function (i) {
      return '<li><i class="' + (i.dash ? 'dash' : i.line ? 'ln' : '') + '" style="background:' + i.color + '"></i>' + esc(i.label) + '</li>';
    }).join('') + '</ul>';
  }
  function nice(min, max, count) {
    if (!isNum(min) || !isNum(max)) { min = 0; max = 1; }
    if (min === max) { if (max === 0) max = 1; else if (min > 0) min = 0; else max = 0; }
    var span = max - min, raw = span / Math.max(1, count);
    var mag = Math.pow(10, Math.floor(Math.log10(raw))), err = raw / mag;
    var step = (err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1) * mag;
    var lo = Math.floor(min / step + 1e-9) * step, hi = Math.ceil(max / step - 1e-9) * step;
    var ticks = [];
    for (var v = lo; v <= hi + step * 1e-6; v += step) ticks.push(Math.abs(v) < step * 1e-9 ? 0 : +v.toFixed(12));
    return { lo: lo, hi: hi, ticks: ticks, step: step };
  }
  function svg(W, H, inner) {
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" xmlns="http://www.w3.org/2000/svg">' + inner + '</svg>';
  }
  function r1(x) { return Math.round(x * 10) / 10; }
  function hex(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function mix(a, b, t) {
    t = Math.max(0, Math.min(1, t));
    var A = hex(a), B = hex(b);
    return 'rgb(' + A.map(function (x, i) { return Math.round(x + (B[i] - x) * t); }).join(',') + ')';
  }
  function naInline(msg) { return naBox(msg || 'Not enough data for this chart yet.'); }

  function drawBars(d, W, o) {
    var vals = (d.values || []).map(function (v) { return isNum(v) ? v : null; });
    var labels = d.labels || [];
    var n = vals.length;
    var nn = vals.filter(function (v) { return v != null; });
    if (!n || !nn.length) return naInline(o.empty);
    var f = d.fmt || o.fmt || 'int';
    var H = o.h || 190, L = o.left || 46, R = 8, T = 18, B = 24;
    var pw = W - L - R, ph = H - T - B;
    var sc = nice(Math.min(0, Math.min.apply(null, nn)), Math.max(0, Math.max.apply(null, nn)), o.ticks || 4);
    function y(v) { return T + ph - (v - sc.lo) / (sc.hi - sc.lo) * ph; }
    var slot = pw / n, bw = Math.max(1.5, Math.min(slot * (n > 40 ? 0.72 : 0.62), 44));
    var s = '';
    sc.ticks.forEach(function (t) {
      s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + r1(y(t)) + '" y2="' + r1(y(t)) + '" stroke="' + (t === 0 ? C.ink2 : C.line2) + '" stroke-width="1"/>';
      s += '<text class="yl" x="' + (L - 7) + '" y="' + r1(y(t) + 3.5) + '" text-anchor="end">' + esc(axisFmt(t, f, sc.step)) + '</text>';
    });
    var hi = {};
    (d.highlight || o.highlight || []).forEach(function (i) { hi[i] = 1; });
    if (!d.highlight && !o.highlight && o.hiMax !== false) {
      var mi = -1, mv = -Infinity;
      vals.forEach(function (v, i) { if (v != null && v > mv) { mv = v; mi = i; } });
      if (mv > 0) hi[mi] = 1;
    }
    var showVals = o.values !== false && n <= 14 && slot >= 30;
    var counts = d.counts;
    vals.forEach(function (v, i) {
      var cx = L + slot * i + slot / 2;
      if (v == null) {
        if (o.markEmpty !== false && n <= 30) s += '<circle cx="' + r1(cx) + '" cy="' + r1(y(0)) + '" r="1.6" fill="' + C.stone + '"/>';
        return;
      }
      var y0 = y(0), y1 = y(v), top = Math.min(y0, y1), h = Math.max(1, Math.abs(y1 - y0));
      var fill = hi[i] ? C.fox : (v < 0 ? C.stone : C.ink2);
      var tip = (labels[i] || '') + ': ' + fv(v, f) + (counts ? ' \u00b7 ' + counts[i] + (o.unit ? ' ' + o.unit : ' posts') : '');
      s += '<rect x="' + r1(cx - bw / 2) + '" y="' + r1(top) + '" width="' + r1(bw) + '" height="' + r1(h) + '" fill="' + fill + '"><title>' + esc(tip) + '</title></rect>';
      if (showVals) {
        var ty = v >= 0 ? top - 5 : top + h + 12;
        s += '<text class="v" x="' + r1(cx) + '" y="' + r1(ty) + '" text-anchor="middle">' + esc(f === 'int' ? compact(v) : fv(v, f)) + '</text>';
      }
    });
    var every = Math.max(1, Math.ceil(n * (o.lw || 38) / pw));
    labels.forEach(function (lb, i) {
      if (i % every) return;
      s += '<text x="' + r1(L + slot * i + slot / 2) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(lb) + '</text>';
    });
    return svg(W, H, s);
  }

  function drawStack(d, W, o) {
    var series = (d.series || []).filter(function (s) { return s.values && s.values.some(function (v) { return v; }); });
    var labels = d.labels || [];
    var n = labels.length;
    if (!n || !series.length) return naInline();
    var totals = labels.map(function (_, i) { return series.reduce(function (a, s) { return a + (s.values[i] || 0); }, 0); });
    var H = o.h || 190, L = 34, R = 8, T = 10, B = 24, pw = W - L - R, ph = H - T - B;
    var sc = nice(0, Math.max.apply(null, totals), 3);
    function y(v) { return T + ph - (v - sc.lo) / (sc.hi - sc.lo) * ph; }
    var slot = pw / n, bw = Math.max(1.5, Math.min(slot * 0.74, 30));
    var s = '';
    sc.ticks.forEach(function (t) {
      s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + r1(y(t)) + '" y2="' + r1(y(t)) + '" stroke="' + (t === 0 ? C.ink2 : C.line2) + '"/>';
      s += '<text class="yl" x="' + (L - 7) + '" y="' + r1(y(t) + 3.5) + '" text-anchor="end">' + t + '</text>';
    });
    labels.forEach(function (lb, i) {
      var acc = 0, cx = L + slot * i + slot / 2;
      series.forEach(function (se, k) {
        var v = se.values[i] || 0;
        if (!v) return;
        var y1 = y(acc + v), y0 = y(acc);
        s += '<rect x="' + r1(cx - bw / 2) + '" y="' + r1(y1) + '" width="' + r1(bw) + '" height="' + r1(Math.max(0.8, y0 - y1)) + '" fill="' + PALETTE[k % PALETTE.length] + '"><title>' + esc(lb + ': ' + v + ' ' + se.name.toLowerCase()) + '</title></rect>';
        acc += v;
      });
    });
    var every = Math.max(1, Math.ceil(n * (o.lw || 44) / pw));
    labels.forEach(function (lb, i) {
      if (i % every) return;
      s += '<text x="' + r1(L + slot * i + slot / 2) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(lb) + '</text>';
    });
    return svg(W, H, s) + legend(series.map(function (se, k) { return { label: se.name, color: PALETTE[k % PALETTE.length] }; }));
  }

  function drawLine(d, W, o) {
    var xs = d.x || [];
    var S = (d.series || []).filter(function (s) { return s.values && s.values.some(isNum); });
    var n = xs.length;
    if (!n || !S.length) return naInline(o.empty);
    var f = d.fmt || o.fmt || 'int';
    var H = o.h || 200, L = 46, R = o.right != null ? o.right : 46, T = 14, B = 24, pw = W - L - R, ph = H - T - B;
    var all = [];
    S.forEach(function (s) { s.values.forEach(function (v) { if (isNum(v)) all.push(v); }); });
    var mn = Math.min.apply(null, all), mx = Math.max.apply(null, all);
    if (o.zero !== false && mn >= 0) mn = 0;
    if (o.zero === false) { var pad = (mx - mn) * 0.12 || Math.abs(mx) * 0.02 || 1; mn -= pad; mx += pad; }
    var sc = nice(mn, mx, 4);
    function x(i) { return L + (n === 1 ? pw / 2 : i * pw / (n - 1)); }
    function y(v) { return T + ph - (v - sc.lo) / (sc.hi - sc.lo) * ph; }
    var s = '';
    sc.ticks.forEach(function (t) {
      s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + r1(y(t)) + '" y2="' + r1(y(t)) + '" stroke="' + (t === 0 && sc.lo < 0 ? C.ink2 : C.line2) + '"/>';
      s += '<text class="yl" x="' + (L - 7) + '" y="' + r1(y(t) + 3.5) + '" text-anchor="end">' + esc(axisFmt(t, f, sc.step)) + '</text>';
    });
    S.forEach(function (se, k) {
      var col = se.dash ? C.mute2 : (k === 0 ? C.ink : C.fox);
      var segs = [], cur = [];
      se.values.forEach(function (v, i) {
        if (isNum(v)) cur.push([x(i), y(v)]);
        else if (cur.length) { segs.push(cur); cur = []; }
      });
      if (cur.length) segs.push(cur);
      segs.forEach(function (sg) {
        if (sg.length === 1) { s += '<circle cx="' + r1(sg[0][0]) + '" cy="' + r1(sg[0][1]) + '" r="2" fill="' + col + '"/>'; return; }
        s += '<path d="M' + sg.map(function (p) { return r1(p[0]) + ' ' + r1(p[1]); }).join('L') + '" fill="none" stroke="' + col +
          '" stroke-width="' + (se.dash ? 1.3 : 2) + '"' + (se.dash ? ' stroke-dasharray="4 3"' : '') + ' stroke-linejoin="round" stroke-linecap="round"/>';
      });
      if (n <= 16 && !se.dash) {
        se.values.forEach(function (v, i) {
          if (isNum(v)) s += '<circle cx="' + r1(x(i)) + '" cy="' + r1(y(v)) + '" r="2.6" fill="' + C.paper + '" stroke="' + col + '" stroke-width="1.5"><title>' + esc(xs[i] + ': ' + fv(v, f)) + '</title></circle>';
        });
      }
      if (R >= 30 && (k === 0 || se.end)) {
        var li = -1;
        se.values.forEach(function (v, i) { if (isNum(v)) li = i; });
        var lv = se.values[li];
        if (li >= 0) s += '<text class="v" x="' + r1(x(li) + 6) + '" y="' + r1(y(lv) + 4) + '">' + esc(f === 'int' ? (o.zero === false && Math.abs(lv) < 1e5 ? nint(lv) : compact(lv)) : fv(lv, f)) + '</text>';
      }
    });
    var every = Math.max(1, Math.ceil(n * (o.lw || 46) / pw));
    xs.forEach(function (lb, i) {
      if (i % every && i !== n - 1) return;
      if (i !== n - 1 && n - 1 - i < every * 0.6) return;
      var anchor = n === 1 ? 'middle' : i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle';
      s += '<text x="' + r1(x(i)) + '" y="' + (H - 6) + '" text-anchor="' + anchor + '">' + esc(lb) + '</text>';
    });
    var leg = S.length > 1 ? legend(S.map(function (se, k) { return { label: se.name, color: se.dash ? C.mute2 : (k === 0 ? C.ink : C.fox), line: !se.dash, dash: se.dash }; })) : '';
    return svg(W, H, s) + leg;
  }

  function drawHeat(d, W, o) {
    var rows = d.rows || [], cols = d.cols || [], V = d.values || [], N = d.counts, minN = d.min_n || 0;
    var f = d.fmt || 'int';
    var nC = cols.length;
    if (!rows.length || !nC) return naInline();
    var L = 38, T = 2, B = 22;
    var cw = (W - L) / nC, chh = o.ch || (nC > 12 ? 20 : 28);
    var H = T + rows.length * chh + B;
    var valid = [];
    rows.forEach(function (_, r) {
      cols.forEach(function (_, c) {
        var v = V[r] && V[r][c];
        if (isNum(v) && (!N || (N[r][c] || 0) >= minN)) valid.push({ v: v, r: r, c: c });
      });
    });
    if (!valid.length) return naInline();
    var vs = valid.map(function (x) { return x.v; });
    var vmax = Math.max.apply(null, vs), vmin = Math.min.apply(null, vs);
    var posMax = Math.max(0.0001, vmax), negMax = Math.max(0.0001, -vmin);
    var top = valid.slice().sort(function (a, b) { return b.v - a.v; }).slice(0, o.top || 3);
    var topKey = {};
    top.forEach(function (x) { if (f !== 'signed' || x.v > 0) topKey[x.r + ':' + x.c] = 1; });
    function color(v) {
      if (f === 'signed') return v >= 0 ? mix(C.paper, C.fox, Math.pow(v / posMax, 0.85)) : mix(C.paper, C.mute2, 0.75 * Math.pow(-v / negMax, 0.85));
      return mix(C.seq0, C.seq1, Math.pow((v - vmin) / Math.max(1e-9, vmax - vmin), 0.9));
    }
    function dark(v) { return f === 'signed' ? v / posMax > 0.62 : (v - vmin) / Math.max(1e-9, vmax - vmin) > 0.55; }
    var s = '', showVal = o.values !== false && nC <= 12 && cw >= 29;
    rows.forEach(function (rl, r) {
      s += '<text x="' + (L - 8) + '" y="' + r1(T + r * chh + chh / 2 + 4) + '" text-anchor="end">' + esc(rl) + '</text>';
      cols.forEach(function (_, c) {
        var v = V[r] && V[r][c];
        var n = N ? (N[r][c] || 0) : null;
        var ok = isNum(v) && (!N || n >= minN);
        var x0 = L + c * cw + 1, y0 = T + r * chh + 1, w = cw - 2, h = chh - 2;
        var key = r + ':' + c;
        var fill = ok ? color(v) : C.empty;
        var lab = (d.col_labels ? d.col_labels[c] : cols[c]);
        var tip = rl + ' ' + lab + ': ' + (isNum(v) ? fv(v, f) : 'no posts') + (N ? ' (' + n + ' post' + (n === 1 ? '' : 's') + (ok ? '' : ', too few') + ')' : '');
        s += '<rect x="' + r1(x0) + '" y="' + r1(y0) + '" width="' + r1(w) + '" height="' + r1(h) + '" fill="' + fill + '"' +
          (topKey[key] ? ' stroke="' + (f === 'signed' ? C.ink : C.fox) + '" stroke-width="1.8"' : '') + '><title>' + esc(tip) + '</title></rect>';
        if (showVal && ok) {
          s += '<text class="' + (dark(v) ? 'vi' : 'v') + '" x="' + r1(x0 + w / 2) + '" y="' + r1(y0 + h / 2 + 4) + '" text-anchor="middle" style="font-size:' + (cw < 36 ? 9 : 10) + 'px">' + esc(f === 'pct' ? pct(v, 0) : fv(v, f)) + '</text>';
        }
      });
    });
    var every = Math.max(1, Math.ceil(nC * 30 / (W - L)));
    cols.forEach(function (cl, c) {
      if (c % every) return;
      s += '<text x="' + r1(L + c * cw + (nC > 12 ? 1 : cw / 2)) + '" y="' + (H - 6) + '" text-anchor="' + (nC > 12 ? 'start' : 'middle') + '">' + esc(cl) + '</text>';
    });
    var sw = function (cs) { return '<span class="sw">' + cs.map(function (c) { return '<i style="background:' + c + '"></i>'; }).join('') + '</span>'; };
    var scale = f === 'signed'
      ? '<div class="scale">Below usual ' + sw([mix(C.paper, C.mute2, .75), mix(C.paper, C.mute2, .35), C.paper, mix(C.paper, C.fox, .35), mix(C.paper, C.fox, .7), C.fox]) + ' Above usual \u00b7 outlined: best slots' + (minN ? ' \u00b7 blank: fewer than ' + minN + ' posts' : '') + '</div>'
      : '<div class="scale">Fewer ' + sw([C.seq0, mix(C.seq0, C.seq1, .3), mix(C.seq0, C.seq1, .6), C.seq1]) + ' More \u00b7 outlined: busiest</div>';
    return svg(W, H, s) + scale;
  }

  function drawDonut(d, W, o) {
    var items = (d.items || []).filter(function (i) { return isNum(i.value) && i.value > 0; });
    if (!items.length) return naInline();
    var tot = items.reduce(function (a, i) { return a + i.value; }, 0);
    var rr = 54, sw = 20, cx = 75, cy = 75, circ = 2 * Math.PI * rr, off = 0, s = '';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + rr + '" fill="none" stroke="' + C.stone2 + '" stroke-width="' + sw + '"/>';
    items.forEach(function (it, k) {
      var len = it.value / tot * circ;
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + rr + '" fill="none" stroke="' + (it.color || PALETTE[k % PALETTE.length]) + '" stroke-width="' + sw +
        '" stroke-dasharray="' + r1(Math.max(0, len - (items.length > 1 ? 1.5 : 0))) + ' ' + r1(circ) + '" stroke-dashoffset="' + r1(-off) + '" transform="rotate(-90 ' + cx + ' ' + cy + ')"><title>' + esc(it.label + ': ' + nint(it.value)) + '</title></circle>';
      off += len;
    });
    if (o.center) s += '<text x="' + cx + '" y="' + (cy + 2) + '" text-anchor="middle" style="font-family:var(--serif);font-size:22px;fill:' + C.ink + '">' + esc(o.center) + '</text>' +
      (o.centerSub ? '<text x="' + cx + '" y="' + (cy + 18) + '" text-anchor="middle" style="font-size:10px">' + esc(o.centerSub) + '</text>' : '');
    var leg = '<ul class="legend">' + items.map(function (it, k) {
      return '<li><i style="background:' + (it.color || PALETTE[k % PALETTE.length]) + '"></i>' + esc(it.label) + '<b>' + pct(it.value / tot, 0) + '</b><span style="color:var(--mute);font-size:12px;margin-left:4px">' + compact(it.value) + '</span></li>';
    }).join('') + '</ul>';
    return '<div class="donut"><svg viewBox="0 0 150 150" role="img" xmlns="http://www.w3.org/2000/svg">' + s + '</svg>' + leg + '</div>';
  }

  var DRAW = { bars: drawBars, stack: drawStack, line: drawLine, heat: drawHeat, donut: drawDonut };
  function drawAll(force) {
    var els = document.querySelectorAll('[data-ch]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i], c = CH[+el.getAttribute('data-ch')];
      if (!c) continue;
      var w = Math.floor(el.clientWidth);
      if (!w || (!force && el._w === w)) continue;
      el._w = w;
      try { el.innerHTML = DRAW[c.kind](c.data || {}, w, c.o); }
      catch (e) { el.innerHTML = naInline('This chart could not be drawn.'); }
      el.style.minHeight = '';
    }
  }

  /* ------------------------------------------------------------------ cards */
  function postCard(p, rank, o) {
    o = o || {};
    if (!p) return '';
    var m = [
      ['ER reach', pct(p.er_r, 1), o.hi === 'er'], ['Reach', compact(p.reach), o.hi === 'reach'], ['Likes', compact(p.likes), o.hi === 'likes'],
      ['Comments', compact(p.comments)], ['Views', compact(p.views)], [o.hi === 'shares' ? 'Shares' : 'Saves', compact(o.hi === 'shares' ? p.shares : p.saves), o.hi === 'saves' || o.hi === 'shares']
    ];
    var img = p.thumb ? '<img src="' + esc(p.thumb) + '" alt="" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add(\'noimg\');this.remove()">' : '';
    return '<article class="post"><a class="ph' + (p.thumb ? '' : ' noimg') + '" data-fmt="' + esc(p.fmt) + '"' + (p.url ? ' href="' + esc(p.url) + '" target="_blank" rel="noopener"' : '') + '>' + img +
      '<span class="fm">' + esc(p.fmt) + '</span>' + (rank ? '<span class="rk">' + rank + '</span>' : '') + '</a>' +
      '<p class="pd">' + esc(p.date) + ' \u00b7 ' + esc(p.time) + '</p>' +
      (p.caption ? '<p class="pc">' + esc(p.caption) + '</p>' : '') +
      '<dl class="pm">' + m.map(function (x) { return '<div><dt>' + x[0] + '</dt><dd' + (x[2] ? ' class="hi"' : '') + '>' + esc(x[1]) + '</dd></div>'; }).join('') + '</dl>' +
      (p.url ? '<a class="po no-print" href="' + esc(p.url) + '" target="_blank" rel="noopener">Open on Instagram \u2197</a>' : '') + '</article>';
  }
  function miniList(cards, cols) {
    cards = (cards || []).filter(Boolean);
    if (!cards.length) return naBox('Nothing to show yet.');
    return '<ul class="mini">' + cards.map(function (c) {
      var right = cols.map(function (k) { return '<span><small>' + esc(k[0]) + '</small>' + esc(k[1](c)) + '</span>'; });
      return '<li><span class="c">' + (c.url ? '<a href="' + esc(c.url) + '" target="_blank" rel="noopener">' : '') + esc(c.caption || c.type || c.fmt || 'Post') + (c.url ? '</a>' : '') +
        '<small>' + esc([c.fmt || c.type, c.date, c.time].filter(Boolean).join(' \u00b7 ')) + '</small></span>' +
        '<span class="x">' + right.join('') + '</span></li>';
    }).join('') + '</ul>';
  }

  /* ------------------------------------------------------------------ sections */
  function head(num, eyebrow, title, lead) {
    return '<p class="eb">' + (num ? '<span class="hand">' + num + '</span>' : '') + '<span class="ex">' + esc(eyebrow) + '</span></p><h2 class="h">' + title + '</h2>' + (lead ? '<p class="lead">' + esc(lead) + '</p>' : '');
  }

  function secAudience(A, R) {
    if (isNA(A)) return naBox(A);
    var h = '';
    var gl = A.gained_lost || {};
    h += stats([
      { label: 'Followers', value: A.followers },
      { label: 'Following', value: A.follows },
      !isNA(gl) && gl.net != null ? { label: 'Net change, 30 days', value: gl.net, fmt: 'signed_int' } : null,
      !isNA(gl) && gl.gained != null ? { label: 'Gained / lost, 30 days', value: nint(gl.gained) + ' / ' + nint(gl.lost), fmt: 'text', sub: gl.churn != null ? Math.round(gl.churn * 100) + ' unfollows per 100 follows' : null } : null
    ]);
    var trend = '';
    if (!isNA(A.rebuilt)) {
      trend = fig('Followers, last 30 days', ch('line', A.rebuilt, { zero: false, h: 190 }), { right: 'Rebuilt', note: A.rebuilt.method });
    } else {
      trend = fig('Followers, last 30 days', naBox(A.daily_new));
    }
    var snap = isNA(A.snapshots) ? fig('Saved daily totals', naBox(A.snapshots, 'Building from the connect date', true))
      : fig('Saved daily totals', ch('line', A.snapshots, { zero: false, h: 190 }), { right: 'Since ' + A.snapshots.since });
    h += '<div class="g2">' + trend + figOrNA('New followers per day', A.daily_new, function () {
      return ch('bars', A.daily_new, { h: 190, values: false, lw: 44 });
    }, { right: isNA(A.daily_new) ? '' : nint(A.daily_new.total) + ' in 30 days \u00b7 ' + A.daily_new.avg + '/day' }) + '</div>';
    h += '<div class="g2">' + snap + figOrNA('Gained vs lost, 30 days', gl, function () {
      return gl.items && gl.items.length ? hbars(gl.items, { flat: false }) : stats([{ label: 'Net follows', value: gl.net, fmt: 'signed_int' }]);
    }, { desc: 'Follows and unfollows Instagram counted over the last 30 days.' }) + '</div>';
    h += '<h3 class="sub">Who they are</h3>';
    h += '<div class="g2">' + figOrNA('Gender', A.gender, function () { return ch('donut', A.gender, {}); }) +
      figOrNA('Age', A.age, function () { return ch('bars', A.age, { fmt: 'pct', h: 180 }); }) + '</div>';
    h += '<div class="g2">' + figOrNA('Top countries', A.countries, function () { return hbars(A.countries.items, { byShare: true }); }) +
      figOrNA('Top cities', A.cities, function () { return hbars(A.cities.items, { byShare: true }); }, { note: 'Share of the followers Instagram could place in a city.' }) + '</div>';
    h += '<h3 class="sub">When they are online</h3>';
    var on = A.online;
    if (isNA(on)) h += naBox(on);
    else {
      h += '<p class="sub-lead">Average followers online by weekday and hour over the last ' + on.days + ' days. Most active: ' + esc(on.best_ist.join(', ')) + ' (IST).</p>';
      h += fig('India time (IST)', ch('heat', { rows: on.rows, cols: hourCols(), col_labels: hourCols(true), values: on.ist.values, fmt: 'int' }, { h: 170 }), { note: on.ist.label + ' IST = Pacific + 12 h 30 m (daylight time) or + 13 h 30 m (standard time), shifted date by date.' });
      h += fig('As Meta returns it (Pacific time)', ch('heat', { rows: on.rows, cols: hourCols(false, true), values: on.pt.values, fmt: 'int' }, { h: 170 }), { note: 'Meta does not say which time zone it uses for this metric; Pacific time is the best-supported reading.' });
    }
    h += reading(A.notes);
    return h;
  }
  function hourCols(ist, plain) {
    var out = [];
    for (var h = 0; h < 24; h++) {
      var hh = h % 12 || 12, ap = h < 12 ? 'a' : 'p';
      out.push(plain || !ist ? hh + ap : hh + ':30' + ap);
    }
    return out;
  }

  function secPosts(P) {
    if (isNA(P)) return naBox(P);
    var h = '';
    var W = P.windows || [];
    h += fig('Totals and averages by period', table(['Metric'].concat(W.map(function (w) { return w.label; })), (P.kpi_rows || []).map(function (r) {
      return [r[0]].concat(W.map(function (w) { return fv(w[r[1]], r[2] === 'dec' ? 'dec' : r[2]); }));
    })), { note: 'Reach, views, saves and shares exist only for posts with insights. Engagement rate uses followers today.' });
    h += '<div class="g2">' + figOrNA('Posts by type, all time', P.by_type, function () {
      var tot = P.by_type.items.reduce(function (a, i) { return a + i.value; }, 0);
      return ch('donut', P.by_type, { center: nint(tot), centerSub: 'posts' });
    }) + fig('Typical post by format', table(['Format', 'Posts', 'Reach', 'Likes', 'Views', 'ER reach'], (P.by_format.rows || []).map(function (r) {
      return [r.format, nint(r.posts), compact(r.reach), compact(r.likes), compact(r.views), pct(r.er_r)];
    })), { right: 'Median, ' + P.by_format.window }) + '</div>';
    h += figOrNA('Posts per month by format', P.monthly_types, function () { return ch('stack', P.monthly_types, { h: 200 }); });
    h += fig('More per format', table(['Format', 'Comments', 'Saves', 'Shares', 'ER followers', 'Reach rate'], (P.by_format.rows || []).map(function (r) {
      return [r.format, nint(r.comments), nint(r.saves), nint(r.shares), pct(r.er_f), pct(r.rr)];
    })), { right: 'Median, ' + P.by_format.window });
    // top posts
    var T = P.top || {}, lists = T.lists || {}, cards = T.cards || {};
    var keys = ['er', 'reach', 'saves', 'shares', 'likes'].filter(function (k) { return lists[k] && lists[k].ids && lists[k].ids.length; });
    h += '<h3 class="sub">Top posts</h3>';
    if (!keys.length) h += naBox('No posts to rank yet.');
    else {
      h += '<div class="tabs" role="tablist">' + keys.map(function (k, i) {
        return '<button class="tab" role="tab" type="button" data-tab="' + k + '" aria-selected="' + (i === 0) + '">' + esc(lists[k].label) + '</button>';
      }).join('') + '</div>';
      keys.forEach(function (k, i) {
        var hiMap = { er: 'er', reach: 'reach', saves: 'saves', shares: 'shares', likes: 'likes' };
        h += '<div class="tp-list' + (k === 'er' || k === 'reach' ? '' : ' np') + '" data-list="' + k + '"' + (i === 0 ? '' : ' hidden') + '>' +
          '<p class="fig-t tp-title">Top posts by ' + esc(lists[k].label.toLowerCase()) + '</p><div class="posts">' +
          lists[k].ids.map(function (id, j) { return postCard(cards[id], j + 1, { hi: hiMap[k] }); }).join('') + '</div></div>';
      });
    }
    h += reading(P.notes);
    return h;
  }

  function secOpt(O) {
    if (isNA(O)) return naBox(O);
    var h = '<p class="sub-lead">Based on ' + nint(O.n) + ' posts with insights from ' + esc(O.window) + '. ' + esc(O.method) + '</p>';
    h += '<div class="g2">' + fig('Best time for reach', ch('heat', O.heat_reach, { h: 230 }), { right: 'IST, 3-hour blocks' }) +
      fig('Best time for engagement', ch('heat', O.heat_er, { h: 230 }), { right: 'IST, 3-hour blocks' }) + '</div>';
    function slots(arr) {
      if (!arr || !arr.length) return naBox('No slot has enough posts yet.');
      return '<ol class="steps">' + arr.map(function (b) { return '<li><strong>' + esc(b.slot) + '</strong>' + esc(b.text) + ' \u00b7 ' + b.n + ' posts</li>'; }).join('') + '</ol>';
    }
    h += '<div class="g2">' + fig('Top slots for reach', slots(O.best_reach)) + fig('Top slots for engagement', slots(O.best_er)) + '</div>';
    h += '<div class="g2">' + fig('Reach by hour posted', ch('bars', O.by_hour, { h: 180, lw: 40, values: false }), { right: 'vs usual for the format' }) +
      fig('Reach by weekday', ch('bars', O.by_weekday, { h: 180, lw: 26 }), { right: 'vs usual for the format' }) + '</div>';
    var tr = (O.types && O.types.rows) || [];
    h += fig('Post types, most engaging first', table(['Format', 'Share of posts', 'Median reach', 'ER reach', 'Saves / 1k', 'Shares / 1k'], tr.map(function (r) {
      return [r.format, pct(r.share, 0), compact(r.reach), pct(r.er_r), fv(r.saves_r, 'per1k'), fv(r.shares_r, 'per1k')];
    })), { right: O.window });
    h += '<h3 class="sub">Hashtags</h3>';
    var Hs = O.hashtags;
    if (isNA(Hs)) h += naBox(Hs);
    else {
      h += '<div class="g2">' + fig('Top hashtags by interactions', table(['Hashtag', 'Uses', 'Interactions', 'Avg / post'], Hs.top.slice(0, 10).map(function (r) {
        return [r.tag, nint(r.uses), compact(r.inter), compact(r.avg_inter)];
      })), { right: Hs.distinct + ' different tags used' }) +
        fig('Most effective hashtags', Hs.effective.length ? table(['Hashtag', 'Uses', 'Avg reach', 'vs median'], Hs.effective.map(function (r) {
          return [r.tag, nint(r.uses), compact(r.avg_reach), signedCell(r.lift)];
        })) : naBox('No hashtag was used on 3+ posts with insights.'), { right: 'Median reach ' + compact(Hs.median_reach), desc: 'Average reach of posts using the tag (3+ uses) against your median post.' }) + '</div>';
      if (Hs.weak && Hs.weak.length) h += fig('Hashtags that go with lower reach', '<ul class="chips">' + Hs.weak.map(function (r) { return '<li>' + esc(r.tag) + '<b>' + esc(signed(r.lift)) + '</b></li>'; }).join('') + '</ul>');
    }
    h += fig('Reach by number of hashtags', ch('bars', O.tag_count, { h: 170 }), { right: 'vs usual for the format' });
    h += reading(O.notes);
    return h;
  }

  function secStories(S) {
    if (!S) return naBox('Stories were not collected.');
    if (S.collecting || isNA(S)) return naBox(S.na || S, 'Collecting', true);
    var h = stats([
      { label: 'Stories collected', value: S.count, sub: 'since ' + S.since },
      { label: 'Avg reach', value: S.avg_reach, sub: pct(S.reach_rate) + ' of followers' },
      { label: 'Avg views', value: S.avg_views },
      { label: 'Completion', value: S.completion, fmt: 'pct0', sub: 'views without exit or skip' },
      { label: 'Replies', value: S.totals && S.totals.replies },
      { label: 'Taps forward', value: S.tap_forward_rate, fmt: 'pct0', sub: 'of views' },
      { label: 'Taps back', value: S.tap_back_rate, fmt: 'pct', sub: 'of views' },
      { label: 'Exits', value: S.exit_rate, fmt: 'pct', sub: 'exit + swipe away' }
    ]);
    h += '<div class="g2">' + fig('Avg reach by hour posted', ch('bars', S.by_hour, { h: 180 }), { right: 'IST' + (S.best_hour ? ' \u00b7 best ' + S.best_hour : '') }) +
      fig('Top stories', miniList(S.top, [['Reach', function (c) { return nint(c.reach); }], ['Completion', function (c) { return pct(c.completion, 0); }]])) + '</div>';
    h += reading(S.notes);
    return h;
  }

  function secProfile(PA) {
    if (isNA(PA)) return naBox(PA);
    var h = '';
    if (isNA(PA.latest)) h += naBox(PA.latest);
    else {
      h += '<p class="sub-lead">Last 30 days: ' + esc(PA.latest.label) + '</p>';
      h += stats(PA.latest.items.map(function (i) { return { label: i.label, value: i.value, fmt: i.signed ? 'signed_int' : 'int', sub: i.sub }; }));
    }
    if (isNA(PA.trend)) h += fig('30-day windows over time', naBox(PA.trend));
    else {
      h += '<h3 class="sub">Trend, 30-day windows</h3><p class="sub-lead">' + esc(PA.trend.note) + '</p><div class="g3">' + PA.trend.charts.map(function (c) {
        return fig(c.title, ch('line', { x: PA.trend.labels, series: [{ name: c.title, values: c.values }] }, { h: 140, right: 40, lw: 50 }));
      }).join('') + '</div>';
    }
    h += '<div class="g2">' + figOrNA('Link taps by button', PA.taps, function () { return hbars(PA.taps.items, { showShare: true }); }, { right: 'Last 30 days' }) +
      figOrNA('Reach by format', PA.reach_by_product, function () { return ch('donut', PA.reach_by_product, {}); }, { right: 'Last 30 days' }) + '</div>';
    if (!isNA(PA.views_by_product)) h += '<div class="g2">' + fig('Views by format', ch('donut', PA.views_by_product, {}), { right: 'Last 30 days' }) + '<div></div></div>';
    h += reading(PA.notes);
    return h;
  }

  function secMomentum(M) {
    if (isNA(M)) return naBox(M);
    var c = M.compare || {};
    var h = stats([
      { label: 'Verdict', value: M.verdict, fmt: 'text' },
      { label: 'Reach vs prior 90 days', value: c.reach && c.reach.vs_prev, fmt: 'signed', sub: c.reach && c.reach.now != null ? 'median ' + nint(c.reach.now) + ' per post' : null },
      { label: 'Engagement vs prior 90 days', value: c.er_r && c.er_r.vs_prev, fmt: 'signed', sub: c.er_r && c.er_r.now != null ? pct(c.er_r.now) + ' by reach' : null },
      { label: 'Likes vs a year ago', value: c.likes && c.likes.vs_year, fmt: 'signed', sub: c.likes && c.likes.now != null ? 'median ' + nint(c.likes.now) + ' per post' : null }
    ]);
    h += figOrNA('Median likes per post, by month', M.likes, function () { return ch('line', M.likes, { h: 210 }); }, { right: 'Since the first post' });
    h += '<div class="g2">' + figOrNA('Median reach per post', M.reach, function () { return ch('line', M.reach, { h: 190 }); }) +
      figOrNA('Median engagement by reach', M.er_r, function () { return ch('line', M.er_r, { h: 190, fmt: 'pct' }); }) + '</div>';
    h += figOrNA('Median views per post', M.views, function () { return ch('line', M.views, { h: 190 }); });
    h += reading(M.notes);
    return h;
  }

  function secConsistency(Cn) {
    if (isNA(Cn)) return naBox(Cn);
    var st = Cn.streak || {};
    var h = stats([
      { label: 'Posts a week, last 52 weeks', value: Cn.weekly && Cn.weekly.avg, fmt: 'dec' },
      { label: 'Weeks with no post', value: Cn.weekly && Cn.weekly.zero_weeks, sub: 'of the last 52' },
      { label: 'Longest weekly streak', value: st.longest_weeks, sub: 'weeks in a row' },
      { label: 'Current streak', value: st.current_weeks, sub: 'weeks in a row' }
    ]);
    h += fig('Posts per week, last 52 weeks', ch('bars', Cn.weekly, { h: 170, hiMax: false, values: false, lw: 48 }), { right: 'Weeks start Monday' });
    h += fig('Average posts per week, by month', ch('bars', Cn.per_week_by_month, { h: 170, hiMax: false, values: false, lw: 48 }), { right: 'Since the first post' });
    h += '<div class="g2">' + fig('Longest breaks', table(['Break', 'Days', 'Reach before', 'After'], (Cn.gaps || []).map(function (g) {
      return [g.from + ' \u2192 ' + g.to, nint(g.days), compact(g.reach_before), signedCell(g.change)];
    })), { desc: 'Median reach in the 90 days before the break vs the next three posts.' }) +
      fig('Reach of the first post after a break', ch('bars', Cn.after_gap, { h: 190, lw: 70 }), { right: 'vs usual for the format' }) + '</div>';
    h += reading(Cn.notes);
    return h;
  }

  function secPatterns(Pt) {
    if (isNA(Pt)) return naBox(Pt);
    var h = '<p class="sub-lead">' + esc(Pt.method) + '</p>';
    function fmts(o) {
      var f = o.formats || {};
      return Object.keys(f).sort(function (a, b) { return f[b] - f[a]; }).map(function (k) { return k + 's ' + pct(f[k], 0); }).join(', ');
    }
    [['ri', 'Ranked by reach'], ['er_r', 'Ranked by engagement']].forEach(function (pair) {
      var a = Pt[pair[0]];
      h += '<h3 class="sub">' + esc(pair[1]) + '</h3>';
      if (isNA(a)) { h += naBox(a); return; }
      var rows = [['Format mix', fmts(a.top), fmts(a.bottom), fmts(a.all)]];
      (Pt.rows || []).forEach(function (r) {
        var key = r[1], f = r[2];
        var g = function (o) { var v = o[key]; return f === 'list' ? (v || []).join(', ') : f === 'text' ? (v || '\u2014') : fv(v, f === 'pct0' ? 'pct0' : f === 'dec' ? 'dec' : f); };
        rows.push([r[0], g(a.top), g(a.bottom), g(a.all)]);
      });
      h += fig('Top 10% vs bottom 25%', table(['', 'Top 10% (' + a.top.n + ')', 'Bottom 25% (' + a.bottom.n + ')', 'All (' + a.all.n + ')'], rows, { wide: [1, 2, 3] }));
      var kt = a.keywords_top || [], kb = a.keywords_bottom || [];
      h += '<div class="g2">' + fig('Words more common in winners', kt.length ? '<ul class="chips">' + kt.map(function (k) {
        return '<li>' + esc(k.word) + '<b>' + pct(k.top, 0) + '</b></li>';
      }).join('') + '</ul><p class="fig-n">% of winning captions that use the word.</p>' : naBox('No word stands out yet.')) +
        fig('Words more common in the weakest', kb.length ? '<ul class="chips">' + kb.map(function (k) {
          return '<li>' + esc(k.word) + '<b>' + pct(k.top, 0) + '</b></li>';
        }).join('') + '</ul>' : naBox('No word stands out.')) + '</div>';
    });
    h += reading(Pt.notes);
    return h;
  }

  function secVirality(V) {
    if (isNA(V)) return naBox(V);
    var o = V.overall || {};
    var nf = V.follow_type && !isNA(V.follow_type) ? V.follow_type.non_follower_share : null;
    var h = stats([
      { label: 'Follows per 1,000 reached', value: o.follows_k, fmt: 'dec' },
      { label: 'Profile visit \u2192 follow', value: o.pv_to_follow, fmt: 'pct0' },
      { label: 'Shares per 1,000 reached', value: o.shares_r != null ? o.shares_r * 1000 : null, fmt: 'dec' },
      { label: 'Reach from non-followers', value: nf, fmt: 'pct0', sub: 'last 30 days' }
    ]);
    h += fig('By format', table(['Format', 'Posts', 'Shares / 1k', 'Saves / 1k', 'Follows / 1k', 'Visits / 1k', 'Visit \u2192 follow'], (V.rows || []).map(function (r) {
      return [r.format, nint(r.posts), fv(r.shares_r, 'per1k'), fv(r.saves_r, 'per1k'), fv(r.follows_k, 'dec'), fv(r.pv_k, 'dec'), pct(r.pv_to_follow, 0)];
    })), { right: V.window, desc: 'Per 1,000 accounts reached. Shares and saves spread a post; follows and profile visits turn reach into an audience.' });
    h += '<div class="g2">' + figOrNA('Who the reach came from', V.follow_type, function () { return ch('donut', V.follow_type, {}); }, { right: 'Last 30 days' }) +
      fig('Follower magnets', V.magnets && V.magnets.length ? miniList(V.magnets, [['Follows', function (c) { return nint(c.follows); }], ['Reach', function (c) { return compact(c.reach); }]]) : naBox(V.magnets_na || 'Not available.'), { desc: 'Posts that brought the most new followers.' }) + '</div>';
    h += reading(V.notes);
    return h;
  }

  function secReels(Rl) {
    if (isNA(Rl)) return naBox(Rl);
    var h = stats([
      { label: 'Reels measured', value: Rl.n },
      { label: 'Typical avg watch time', value: Rl.median_s != null ? Rl.median_s.toFixed(1) + ' s' : null, fmt: 'text' },
      { label: 'Last 90 days', value: Rl.median_90d_s != null ? Rl.median_90d_s.toFixed(1) + ' s' : null, fmt: 'text' },
      { label: 'Hours watched', value: Rl.watch_hours }
    ]);
    h += '<div class="g2">' + fig('Reels by average watch time', ch('bars', Rl.dist, { h: 180, unit: 'reels' }), { right: 'Number of reels' }) +
      fig('Reach by watch time', ch('bars', Rl.reach_by_watch, { h: 180, unit: 'reels' }), { right: 'vs your usual reel' }) + '</div>';
    h += fig('Average watch time, by month', ch('line', Rl.trend, { h: 180, fmt: 'dec' }), { right: 'Median, seconds' });
    var cols = [['Watched', function (c) { return c.watch_s != null ? c.watch_s.toFixed(1) + ' s' : '\u2014'; }], ['Reach', function (c) { return compact(c.reach); }]];
    h += '<div class="g2">' + fig('Held attention longest', miniList(Rl.best, cols)) + fig('Lost people fastest', miniList(Rl.worst, cols)) + '</div>';
    h += '<p class="fig-n">' + esc(Rl.limit) + '</p>';
    h += reading(Rl.notes);
    return h;
  }

  function secQuality(Q) {
    if (isNA(Q)) return naBox(Q);
    var h = stats([{ label: 'Comments per 100 likes', value: Q.cpl != null ? Q.cpl * 100 : null, fmt: 'dec', sub: 'last 12 months' }].concat((Q.by_format || []).slice(0, 3).map(function (r) {
      return { label: r.format + 's', value: r.cpl != null ? r.cpl * 100 : null, fmt: 'dec', sub: 'comments per 100 likes' };
    })));
    h += fig('Comments per 100 likes, by month', ch('line', Q.trend, { h: 180, fmt: 'dec' }), { desc: 'Comments take more effort than likes; a rising line means a more involved audience.' });
    h += '<h3 class="sub">Who engages vs who follows</h3><p class="sub-lead">Share of followers against share of the accounts that liked, commented, saved or shared this month.</p>';
    var cmp = Q.compare || {};
    function paired(c) {
      return '<ul class="pb">' + c.items.map(function (i) {
        return '<li><div class="l">' + esc(i.label) + '<span>' + (i.index != null ? '\u00d7' + i.index.toFixed(2) : '') + '</span></div>' +
          '<div class="r"><span>Followers</span><span class="t"><i style="width:' + Math.min(100, (i.followers || 0) * 100 / maxShare(c)) + '%"></i></span><b>' + pct(i.followers, 0) + '</b></div>' +
          '<div class="r e"><span>Engaged</span><span class="t"><i style="width:' + Math.min(100, (i.engaged || 0) * 100 / maxShare(c)) + '%"></i></span><b>' + pct(i.engaged, 0) + '</b></div></li>';
      }).join('') + '</ul>';
    }
    function maxShare(c) { return Math.max.apply(null, c.items.map(function (i) { return Math.max(i.followers || 0, i.engaged || 0); })) || 1; }
    h += '<div class="g2">' + [['gender', 'Gender'], ['age', 'Age'], ['country', 'Country'], ['city', 'City']].map(function (p) {
      return figOrNA(p[1], cmp[p[0]], function () { return paired(cmp[p[0]]); });
    }).join('') + '</div>';
    h += reading(Q.notes);
    return h;
  }

  function secForecast(F) {
    if (isNA(F)) return naBox(F);
    var h = stats([{ label: 'Today', value: F.now }].concat((F.points || []).map(function (p) {
      return { label: 'In ' + p.days + ' days', value: p.mid, sub: nint(p.low) + '\u2013' + nint(p.high) };
    })));
    h += fig('Followers at the current pace', ch('line', F.chart, { h: 200, zero: false, right: 52 }), { right: 'Estimate', note: 'Pace: about ' + F.pace_per_day + ' net followers a day (range ' + F.pace_low + '\u2013' + F.pace_high + '). Based on ' + F.basis + '. A straight-line estimate, not a promise; the plan aims to beat it.' });
    if (F.milestones && F.milestones.length) h += '<ul class="dash">' + F.milestones.map(function (m) { return '<li>' + nint(m.target) + ' followers around ' + esc(m.date) + ' (' + nint(m.days) + ' days) at this pace.</li>'; }).join('') + '</ul>';
    h += reading(F.notes);
    return h;
  }

  function secRivals(Rv, R) {
    if (isNA(Rv)) return naBox(Rv);
    var plan = R && R.plan && !isNA(R.plan) ? R.plan : null;
    var rows = Rv.rows || [];
    var h = '<p class="sub-lead">' + esc(Rv.window) + '. ' + esc(Rv.method) + '</p>';
    h += fig('Side by side', table(['Account', 'Followers', 'Posts / week', 'Avg likes', 'Avg comments', 'Avg reel views', 'Engagement', 'Reels', 'Best format'], rows.map(function (r) {
      return { cls: r.me ? 'me' : '', cells: ['@' + r.username + (r.me ? ' (you)' : ''), compact(r.followers), fv(r.per_week, 'dec'), compact(r.avg_likes), compact(r.avg_comments), compact(r.avg_views), pct(r.er), pct(r.reel_share, 0), r.top_type ? r.top_type + 's' : '\u2014'] };
    })));
    function cmpBars(key, fmt) {
      return hbars(rows.map(function (r) { return { label: '@' + r.username + (r.me ? ' (you)' : ''), value: r[key] }; }), { fmt: fmt });
    }
    h += '<div class="g3">' + fig('Engagement', cmpBars('er', 'pct')) + fig('Posts per week', cmpBars('per_week', 'dec')) + fig('Avg reel views', cmpBars('avg_views', 'compact')) + '</div>';
    var best = rows.filter(function (r) { return !r.me && r.best_post; });
    if (best.length) {
      h += fig('Their best recent posts', '<ul class="mini">' + best.map(function (r) {
        return '<li><span class="c">' + esc(r.best_post.caption || '\u2014') + '<small>@' + esc(r.username) + ' \u00b7 ' + esc(r.best_post.type) + ' \u00b7 ' + esc(r.best_post.date) + '</small></span><span class="x"><span><small>Likes</small>' + compact(r.best_post.likes) + '</span></span></li>';
      }).join('') + '</ul>');
    }
    h += reading(Rv.notes);
    if (plan && plan.rival_takeaways && plan.rival_takeaways.length) h += '<div class="reading"><span class="fig-t">Takeaways</span>' + listItems(plan.rival_takeaways) + '</div>';
    return h;
  }

  function contactLine() {
    return '<a href="mailto:' + AGENCY.email + '">' + esc(AGENCY.email) + '</a>';
  }
  function logo(sub, tag) {
    var letters = (sub || 'Marketing').toUpperCase().split('').map(function (ch) { return '<span>' + (ch === ' ' ? '&nbsp;' : esc(ch)) + '</span>'; }).join('');
    return '<' + (tag || 'span') + ' class="logo" aria-label="' + esc(AGENCY.name) + '"><span class="mast">Busy<em>Fox</em></span><span class="sub" aria-hidden="true">' + letters + '</span></' + (tag || 'span') + '>';
  }
  function tapes() { return '<span class="tape t1" aria-hidden="true"></span><span class="tape t2" aria-hidden="true"></span>'; }

  function secKit(K, R) {
    if (isNA(K)) return naBox(K);
    var items = (K.items || []).map(function (i) { return { label: i.label, value: i.value, fmt: i.fmt, sub: i.sub }; });
    var h = '<div class="kit">' + tapes() + '<div class="kit-h"><b>' + esc(K.name || K.handle) + '</b><span>' + esc(K.handle) + ' \u00b7 ' + esc(K.period) + '</span></div>' + stats(items);
    if (K.audience && K.audience.length) h += '<dl>' + K.audience.map(function (a) { return '<div><dt>' + esc(a.label) + '</dt><dd>' + esc(a.value) + '</dd></div>'; }).join('') + '</dl>';
    h += '<div class="kit-c">Brand enquiries via ' + esc(AGENCY.name) + ': ' + contactLine() + '</div></div>';
    return h;
  }

  function secPrefs(Pf) {
    if (isNA(Pf)) return naBox(Pf, 'Not shared');
    var rows = [['Formats you will make', Pf.formats], ['Topics', Pf.topics], ['Posts per week', Pf.posts_per_week], ['On camera', Pf.face],
      ['Languages', Pf.languages], ['Main goal', Pf.goal], ['Brands you want to work with', Pf.brands], ['Will not do', Pf.wont_do]];
    var h = '<dl class="prefs">' + rows.filter(function (r) { return r[1] && (!Array.isArray(r[1]) || r[1].length); }).map(function (r) {
      return '<div><dt>' + esc(r[0]) + '</dt><dd>' + (Array.isArray(r[1]) ? '<ul class="chips">' + r[1].map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : esc(r[1])) + '</dd></div>';
    }).join('') + '</dl>';
    if (Pf.her_notes) h += '<blockquote class="quote">' + esc(Pf.her_notes) + '</blockquote>';
    return h;
  }

  function secPlan(Pl, R) {
    if (!Pl || isNA(Pl)) return naBox('Your growth plan is being written by our strategist from these numbers and will appear here.', 'Coming next', true);
    var h = '';
    if (Pl.headline || Pl.summary) h += '<div class="verdict-card"><span class="tape" aria-hidden="true"></span>' + (Pl.headline ? '<p class="verdict">' + esc(Pl.headline) + '</p>' : '') + (Pl.summary ? '<p class="vsum">' + esc(Pl.summary) + '</p>' : '') + '</div>';
    if (Pl.key_findings && Pl.key_findings.length) {
      h += fig('Key findings', '<ol class="steps">' + Pl.key_findings.map(function (k) {
        return typeof k === 'string' ? '<li>' + esc(k) + '</li>' : '<li><strong>' + esc(k.title) + '</strong>' + esc(k.detail || '') + (k.evidence ? '<span class="ev">' + esc(k.evidence) + '</span>' : '') + '</li>';
      }).join('') + '</ol>');
    }
    if ((Pl.working && Pl.working.length) || (Pl.not_working && Pl.not_working.length)) {
      h += '<div class="two">' + fig('What is working', listItems(Pl.working, 'ticks') || naBox('—')) + fig('What is not', listItems(Pl.not_working, 'cross') || naBox('—')) + '</div>';
    }
    if (Pl.pillars && Pl.pillars.length) {
      h += '<h3 class="sub">Content pillars</h3><div class="pillars">' + Pl.pillars.map(function (p) {
        return '<div class="fig pillar"><h4>' + esc(p.name) + (p.share_pct != null ? '<span>' + esc(p.share_pct) + '% of posts</span>' : '') + '</h4>' +
          (p.why ? '<p>' + esc(p.why) + '</p>' : '') +
          (p.evidence ? '<p class="k">Evidence</p><p>' + esc(p.evidence) + '</p>' : '') +
          (p.from_prefs ? '<p class="k">From what you told us</p><p>' + esc(p.from_prefs) + '</p>' : '') +
          (p.formats && p.formats.length ? '<p class="k">Formats</p><ul class="chips">' + p.formats.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul>' : '') +
          (p.examples && p.examples.length ? '<p class="k">Ideas</p>' + listItems(p.examples, 'dash') : '') + '</div>';
      }).join('') + '</div>';
    }
    if ((Pl.posting_rules && Pl.posting_rules.length) || (Pl.best_slots && Pl.best_slots.length)) {
      h += '<h3 class="sub">When and how to post</h3><div class="two">' +
        fig('Posting rules', listItems(Pl.posting_rules, 'ticks') || naBox('—')) +
        fig('Your slots', Pl.best_slots && Pl.best_slots.length ? table(['Day', 'Time (IST)', 'Format', 'Why'], Pl.best_slots.map(function (s) { return [s.day, s.time_ist, s.format, s.why || '']; }), { wide: [3] }) : naBox('—')) + '</div>';
    }
    var cal = Pl.calendar;
    if (cal && cal.weeks && cal.weeks.length) {
      h += '<h3 class="sub">90-day calendar</h3><p class="sub-lead">' + esc([cal.start ? 'Starts ' + cal.start : '', cal.posts_per_week ? cal.posts_per_week + ' posts a week' : '', cal.note || ''].filter(Boolean).join(' \u00b7 ')) + '</p>';
      h += '<div class="weeks">' + cal.weeks.map(function (w) {
        return '<div class="fig wk"><div class="fig-h"><b>Week ' + esc(w.week) + '</b><span class="fig-r">' + esc([w.dates, w.theme].filter(Boolean).join(' \u00b7 ')) + '</span></div>' +
          '<ul class="cal">' + (w.posts || []).map(function (p) {
            return '<li><span class="d">' + esc(p.day || '') + (p.date ? ' ' + esc(p.date) : '') + '<small>' + esc(p.time_ist || '') + ' IST</small></span>' +
              '<span class="h"><b>' + esc(p.hook || '') + '</b><small>' + esc([p.format, p.pillar].filter(Boolean).join(' \u00b7 ')) + '</small>' +
              (p.notes ? '<small class="nt">' + esc(p.notes) + '</small>' : '') + '</span></li>';
          }).join('') + '</ul></div>';
      }).join('') + '</div>';
    }
    var gt = Pl.growth_tactics;
    if (gt) {
      var groups = [['collabs', 'Collaborations'], ['hooks', 'Hooks'], ['profile_fixes', 'Profile and bio fixes'], ['keywords', 'Keywords and SEO'], ['other', 'Also']];
      var parts = groups.filter(function (g) { return gt[g[0]] && gt[g[0]].length; }).map(function (g) { return fig(g[1], listItems(gt[g[0]], 'ticks')); });
      if (parts.length) h += '<h3 class="sub">Growing followers</h3><div class="two">' + parts.join('') + '</div>';
    }
    var br = Pl.brand_readiness;
    if (br) {
      h += '<h3 class="sub">Brand-deal readiness</h3><div class="two"><div class="fig">' +
        (br.score != null ? '<div class="score"><b>' + esc(br.score) + '</b><span>out of ' + esc(br.out_of || 10) + (br.status ? ' \u00b7 ' + esc(br.status) : '') + '</span></div>' : '') +
        (br.summary ? '<p class="vsum" style="font-size:15.5px;margin-top:0">' + esc(br.summary) + '</p>' : '') + '</div><div>' +
        (br.strengths && br.strengths.length ? fig('Strengths', listItems(br.strengths, 'ticks')) : '') +
        (br.gaps && br.gaps.length ? fig('Fix before pitching', listItems(br.gaps, 'cross')) : '') + '</div></div>';
      if (br.rates && br.rates.length) {
        h += fig('Rate guidance', table(['Deliverable', 'Range', 'Notes'], br.rates.map(function (r) {
          var cur = r.currency === 'INR' || !r.currency ? '\u20b9' : r.currency + ' ';
          return [r.deliverable, cur + nint(r.low) + '\u2013' + nint(r.high), r.note || ''];
        }), { wide: [2] }), { note: br.rates_note || 'Guidance ranges for the Indian market at this size; final rates depend on usage rights, exclusivity and deliverables.' });
      }
      if (br.pitch_list && br.pitch_list.length) {
        h += fig('Who to pitch', table(['Category', 'Why you fit', 'Examples'], br.pitch_list.map(function (p) {
          return [p.category, p.why || '', (p.examples || []).join(', ')];
        }), { wide: [1, 2] }));
      }
    }
    if (Pl.kpis && Pl.kpis.length) {
      h += '<h3 class="sub">Targets</h3>' + fig('30 / 60 / 90-day KPIs', table(['Metric', 'Now', '30 days', '60 days', '90 days'], Pl.kpis.map(function (k) {
        var f = k.fmt || 'int';
        return [k.metric, fv(k.now, f), fv(k.d30, f), fv(k.d60, f), fv(k.d90, f)];
      })));
    }
    if (Pl.next_steps && Pl.next_steps.length) h += fig('This week', '<ol class="steps">' + Pl.next_steps.map(function (s) { return '<li>' + esc(typeof s === 'string' ? s : (s.title || '') + ' ' + (s.detail || '')) + '</li>'; }).join('') + '</ol>');
    if (Pl.author || Pl.written_at) h += '<p class="fig-n">Plan by ' + esc(Pl.author || 'Busy Fox') + (Pl.written_at ? ', ' + esc(Pl.written_at) : '') + '.</p>';
    return h;
  }

  function secNotes(D) {
    if (isNA(D)) return naBox(D);
    var h = '<dl class="dn">' + (D.items || []).map(function (i) { return '<div><b>' + esc(i.title) + '</b><span>' + esc(i.text) + '</span></div>'; }).join('') + '</dl>';
    var errs = (D.errors || []).map(function (e) { return (e.step ? e.step + ': ' : '') + e.error; });
    (D.missing_files || []).forEach(function (f) { errs.push(f + ' was not received.'); });
    (D.bad_files || []).forEach(function (f) { errs.push(f + ' could not be read.'); });
    if (errs.length) h += fig('What Instagram held back on this pull', '<ul class="dash">' + errs.map(function (e) { return '<li>' + esc(e) + '</li>'; }).join('') + '</ul>');
    return h;
  }

  /* ------------------------------------------------------------------ page */
  var SECTIONS = [
    { id: 'audience', key: 'audience', eyebrow: 'Audience', title: 'Who <em>follows</em> you', lead: 'Follower count, growth, who they are and when they are online.', fn: secAudience },
    { id: 'posts', key: 'posts', eyebrow: 'Posts', title: 'What you have <em>posted</em>', lead: 'Every post from the first one to today: volume, formats, results and the best performers.', fn: secPosts },
    { id: 'optimisation', key: 'optimization', eyebrow: 'Optimisation', title: 'When and how to <em>post</em>', lead: 'The days, hours, formats and hashtags that work best for you.', fn: secOpt },
    { id: 'stories', key: 'stories', eyebrow: 'Stories', title: '<em>Stories</em>', lead: 'Reach, views, replies and drop-off for the stories we collected.', fn: secStories, flow: true },
    { id: 'profile', key: 'profile_activity', eyebrow: 'Profile', title: 'Profile and <em>account</em> activity', lead: 'Accounts reached, views, link taps and engagement, in 30-day windows.', fn: secProfile, flow: true },
    { id: 'momentum', key: 'momentum', eyebrow: 'Momentum', title: 'Are you <em>growing</em>?', lead: 'Monthly medians since your first post: reach, engagement, likes and views.', fn: secMomentum },
    { id: 'consistency', key: 'consistency', eyebrow: 'Consistency', title: 'Rhythm and <em>breaks</em>', lead: 'How often you post, the longest gaps, and what happened to reach after them.', fn: secConsistency, flow: true },
    { id: 'patterns', key: 'patterns', eyebrow: 'Patterns', title: 'What your <em>best</em> posts share', lead: 'Your top 10% against your bottom 25%: format, timing, captions, hooks and words.', fn: secPatterns },
    { id: 'virality', key: 'virality', eyebrow: 'Virality and conversion', title: 'Shares, saves and <em>new followers</em>', lead: 'Which posts travel beyond your followers, and which turn viewers into followers.', fn: secVirality, flow: true },
    { id: 'reels', key: 'reels', eyebrow: 'Reels retention', title: 'Do people keep <em>watching</em>?', lead: 'Average watch time per reel, and how it relates to reach.', fn: secReels },
    { id: 'quality', key: 'quality', eyebrow: 'Engagement quality', title: 'Who really <em>engages</em>', lead: 'Comments against likes, and the people who engage against the people who follow.', fn: secQuality, flow: true },
    { id: 'forecast', key: 'forecast', eyebrow: 'Forecast', title: 'Where followers are <em>heading</em>', lead: 'A simple estimate at the current pace.', fn: secForecast, flow: true },
    { id: 'rivals', key: 'rivals', eyebrow: 'Rivals', title: 'How you <em>compare</em>', lead: 'Public numbers for the creators you named.', fn: secRivals },
    { id: 'kit', key: 'media_kit', eyebrow: 'Media kit', title: 'The numbers <em>brands</em> ask for', lead: 'Ready to paste into a pitch or a rate card.', fn: secKit },
    { id: 'prefs', key: 'prefs', eyebrow: 'What you told us', title: 'In your <em>words</em>', lead: 'Your answers on the connect page. The plan is built around them.', fn: secPrefs },
    { id: 'plan', key: 'plan', eyebrow: 'Growth plan', title: 'The <em>plan</em>', lead: 'What to do next, built from the numbers above and what you told us.', fn: secPlan, flow: true }
  ];

  function setPageCss(R) {
    var P = R.profile || {};
    var who = (P.username ? '@' + P.username + ' \u00b7 ' : '') + 'Instagram audit \u00b7 ' + AGENCY.name + ' \u00b7 ' + AGENCY.email;
    var css = '@page{@bottom-left{content:"' + who.replace(/["\\]/g, '') + '";font-family:"DM Sans",Helvetica,Arial,sans-serif;font-size:7.5pt;color:#6E5551}' +
      '@bottom-right{content:counter(page) " / " counter(pages);font-family:"DM Sans",Helvetica,Arial,sans-serif;font-size:7.5pt;color:#6E5551}}' +
      '@page :first{@bottom-left{content:none}@bottom-right{content:none}}@page back{margin:0;@bottom-left{content:none}@bottom-right{content:none}}';
    var el = document.getElementById('rp-page-css') || document.createElement('style');
    el.id = 'rp-page-css';
    el.textContent = css;
    document.head.appendChild(el);
  }

  function render(root, R) {
    CH.length = 0;
    R = R || {};
    var P = R.profile || {};
    document.title = (P.name || (P.username ? '@' + P.username : 'Creator')) + ' · Instagram audit | ' + AGENCY.name;
    setPageCss(R);
    var gen = R.generated_at ? new Date(R.generated_at) : null;
    var genLabel = gen && !isNaN(gen) ? gen.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : (P.today_label || '');
    var h = '<header class="head">' + logo('Marketing') + '<div class="head-r"><span class="when">Instagram audit · ' + esc(genLabel) + '</span>' +
      '<button class="btn" type="button" data-print>Save as PDF</button></div></header>';
    h += '<header class="cover">' + tapes() + '<div class="cv-logo">' + logo('Marketing') + '</div>' +
      '<div class="cv-main">' + tapes() + '<p class="hand cv-kind">Your Instagram growth audit</p><h1 class="cv-name">' + esc(P.name || ('@' + (P.username || ''))) + '</h1>' +
      '<p class="cv-handle">@' + esc(P.username || '') + '</p>' +
      '<p class="cv-period"><span><b>' + esc(P.period || '') + '</b></span><span>' + nint(P.followers) + ' followers · ' + nint(P.posts_found) + ' posts</span><span class="no-print">Prepared by ' + esc(AGENCY.name) + '</span></p></div>' +
      '<div class="cv-foot"><span>Prepared by <b>' + esc(AGENCY.name) + '</b> · ' + esc(genLabel) + '</span><span>' + esc(AGENCY.email) + '</span></div></header>';
    // glance
    var G = R.glance || {}, Pl = R.plan && !isNA(R.plan) ? R.plan : null;
    h += '<section class="sec" id="glance">' + head(null, 'At a glance', 'The <em>short</em> version', null);
    if (Pl && Pl.headline) h += '<div class="verdict-card"><span class="tape" aria-hidden="true"></span><p class="verdict">' + esc(Pl.headline) + '</p>' + (Pl.summary ? '<p class="vsum">' + esc(Pl.summary) + '</p>' : '') + '</div>';
    else if (R.momentum && R.momentum.verdict) h += '<div class="verdict-card"><span class="tape" aria-hidden="true"></span><p class="verdict">Momentum: <em>' + esc(R.momentum.verdict.toLowerCase()) + '</em>.</p></div>';
    if (!isNA(G)) h += stats((G.items || []).map(function (i) { return { label: i.label, value: i.value, fmt: i.fmt, sub: i.sub }; }));
    if (Pl && Pl.key_findings && Pl.key_findings.length) {
      h += fig('Key findings', '<ol class="steps">' + Pl.key_findings.slice(0, 5).map(function (k) {
        return typeof k === 'string' ? '<li>' + esc(k) + '</li>' : '<li><strong>' + esc(k.title) + '</strong>' + esc(k.detail || '') + '</li>';
      }).join('') + '</ol>');
    } else if (G.facts && G.facts.length) h += reading(G.facts, 'Key facts');
    h += fig('Contents', '<ol class="toc">' + SECTIONS.map(function (s, i) {
      return '<li><span>' + (i + 1) + '</span><a href="#' + s.id + '">' + esc(s.eyebrow) + '</a></li>';
    }).join('') + '<li><span>·</span><a href="#notes">Notes on the data</a></li></ol>', { cls: 'no-print' });
    h += '</section>';
    SECTIONS.forEach(function (s, i) {
      var num = String(i + 1).padStart(2, '0');
      var body;
      try { body = s.fn(R[s.key], R); }
      catch (e) { body = naBox('This section could not be shown (' + (e && e.message ? e.message : 'error') + ').'); }
      h += '<section class="sec' + (s.flow ? ' flow' : '') + '" id="' + s.id + '">' + head(num, s.eyebrow, s.title, s.lead) + body + '</section>';
    });
    h += '<section class="sec" id="notes">' + head(null, 'Notes on the data', 'How to read this <em>report</em>', 'Definitions, time zones and the things Instagram does not share.') + secNotes(R.data_notes) + '</section>';
    h += '<footer class="band" style="page:back">' + logo('Marketing') +
      '<p class="hand">Thank you for connecting</p>' +
      '<h2>Questions about your audit, or want us to run the plan <em>with you</em>?</h2>' +
      '<p>Write to ' + esc(AGENCY.name) + ' and we will get back to you.</p>' +
      '<p class="ct">' + contactLine() + '</p>' +
      '<small>Numbers come from Instagram with your permission, as of ' + esc(P.today_label || '') + '. Times are India time (IST). This report is private to you; ask us any time to delete your data.</small></footer>';
    root.innerHTML = h;
    wire(root);
    drawAll(true);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { drawAll(true); window.__REPORT_READY = true; });
    else window.__REPORT_READY = true;
  }

  function wire(root) {
    root.querySelectorAll('.tabs').forEach(function (tabs) {
      tabs.addEventListener('click', function (e) {
        var b = e.target.closest('.tab');
        if (!b) return;
        var key = b.getAttribute('data-tab');
        tabs.querySelectorAll('.tab').forEach(function (t) { t.setAttribute('aria-selected', String(t === b)); });
        var sec = tabs.parentNode;
        sec.querySelectorAll('.tp-list').forEach(function (l) { l.hidden = l.getAttribute('data-list') !== key; });
      });
    });
    var pb = root.querySelector('[data-print]');
    if (pb) pb.addEventListener('click', function () { window.print(); });
  }

  function state(root, title, text, loading, retry) {
    root.innerHTML = '<header class="head">' + logo('Marketing') + '</header>' +
      '<div class="state">' + (loading ? '<div class="spin" aria-hidden="true"></div>' : '') + '<h1>' + title + '</h1>' +
      (text ? '<p>' + esc(text) + '</p>' : '') +
      (retry ? '<p>' + contactLine() + '</p>' : '') + '</div>';
  }

  function boot() {
    var root = document.getElementById('report');
    if (!root) return;
    if (window.REPORT) { render(root, window.REPORT); return; }
    var token = (location.hash || '').replace(/^#/, '').trim();
    if (!token) { state(root, 'This link is missing its <em>key</em>', 'Open the full link we sent you. It ends with a # and a long code.', false, true); return; }
    var api = (window.CC && window.CC.api) || '';
    if (!api) { state(root, 'We could not reach the <em>report</em> service', 'Please try again in a minute.', false, true); return; }
    state(root, 'Opening your <em>audit</em>\u2026', '', true);
    fetch(api.replace(/\/+$/, '') + '/report?t=' + encodeURIComponent(token), { headers: { accept: 'application/json' }, cache: 'no-store' })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) {
        if (!x.ok || !x.j || !x.j.ok || !x.j.report) throw new Error('not found');
        window.REPORT_DATA = x.j.report;
        render(root, x.j.report);
      })
      .catch(function () {
        state(root, 'We could not open this <em>report</em>', 'The link may have expired or been replaced by a newer one. Write to us and we will send a fresh link.', false, true);
      });
  }

  var t;
  window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(function () { drawAll(false); }, 120); });
  window.addEventListener('hashchange', function () { if (!window.REPORT) boot(); });
  window.BFReport = { render: function (R) { render(document.getElementById('report'), R); }, redraw: function () { drawAll(true); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
