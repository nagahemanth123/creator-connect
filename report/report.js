/* Busy Fox Creator Connect — audit report renderer.
   One file for the live page (fetches the report by token) and the PDF/offline copy
   (build.py embeds the data as window.REPORT). Hand-rolled SVG charts, no libraries. */
(function () {
  'use strict';

  // Contact rule (owner, 15 Nov): business name "Busy Fox Marketing", email only, no phone numbers, no town.
  var AGENCY = { name: 'Busy Fox Marketing', email: 'admin@busyfox.in' };
  // Strawberry Mocha tokens (../assets/cc.css). Chart roles: cocoa = data, cherry = the one thing to look at.
  var C = {
    ink: '#2B1A17', ink2: '#53332D', mute: '#6E5551', mute2: '#866C67', stone: '#D9BFB8', stone2: '#F3DEDA',
    fox: '#C42847', foxt: '#A11F3A', paper: '#FFF9F7', line: '#EBCFCA', line2: '#F3DEDA', empty: '#F6EAE7',
    seq0: '#FBEFEC', seq1: '#3D2521', pink: '#F2B8C6', pinkDeep: '#D98799', butter: '#E2C35A'
  };
  var PALETTE = [C.ink2, C.fox, C.pinkDeep, C.stone, C.butter, C.mute2];
  var NA_TITLE = 'Not available from Instagram';
  // The team's PDF build (report/build.py, report/render.cjs) sets window.__CC_PDF_BUILD before the page loads.
  // Only then may the page print: report.css blanks every other print (Ctrl/Cmd+P, the browser menu) to one line.
  var PDF_BUILD = window.__CC_PDF_BUILD === true;
  if (PDF_BUILD) document.documentElement.classList.add('cc-pdf');
  // true while the PDF is rendered (Playwright emulates print media before the page loads); screen layout ignores it
  var PRINT = PDF_BUILD && !!(window.matchMedia && window.matchMedia('print').matches);
  // "FoxCut Creator Connect" lockup (../assets/watermark.css)
  function wm(cls) { return '<span class="wm-mark' + (cls ? ' ' + cls : '') + '"><b>FoxCut</b> Creator Connect</span>'; }

  /* ------------------------------------------------------------------ formatting */
  var NF = new Intl.NumberFormat('en-IN');
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function minus(s) { return String(s).replace(/^-/, '\u2212'); }
  function nint(v) { return isNum(v) ? minus(NF.format(Math.round(v))) : '\u2013'; }
  function compact(v) {
    if (!isNum(v)) return '\u2013';
    var a = Math.abs(v), s;
    // Indian units: 1 L = 1 lakh (1,00,000), 1 Cr = 1 crore (1,00,00,000)
    if (a >= 1e7) s = (v / 1e7).toFixed(a >= 1e8 ? 1 : 2).replace(/\.?0+$/, '') + ' Cr';
    else if (a >= 1e5) s = (v / 1e5).toFixed(a >= 1e6 ? 1 : 2).replace(/\.?0+$/, '') + ' L';
    else if (a >= 1e3) s = (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
    else s = String(Math.round(v));
    return minus(s);
  }
  function pct(v, d) { return isNum(v) ? minus((v * 100).toFixed(d == null ? 1 : d)) + '%' : '\u2013'; }
  function signed(v) {
    if (!isNum(v)) return '\u2013';
    var p = Math.round(v * 100);
    return (p > 0 ? '+' : p < 0 ? '\u2212' : '\u00b1') + Math.abs(p) + '%';
  }
  function fv(v, f) {
    if (v == null || (typeof v === 'number' && !isFinite(v))) return '\u2013';
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
      (o.right ? '<span class="fig-r">' + esc(o.right) + '</span>' : '') + (o.printRight ? '<span class="fig-r print-only">' + esc(o.printRight) + '</span>' : '') + '</div>' +
      (o.desc ? '<p class="fig-d">' + esc(o.desc) + '</p>' : '') + body +
      (o.note ? '<p class="fig-n">' + esc(o.note) + '</p>' : '') + (o.printNote ? '<p class="fig-n print-only">' + esc(o.printNote) + '</p>' : '') + '</figure>';
  }
  function figOrNA(title, data, body, o) {
    return isNA(data) ? fig(title, naBox(data), { cls: (o || {}).cls, right: (o || {}).right && !/^\d/.test(o.right) ? o.right : '' }) : fig(title, body(), o);
  }
  function reading(notes, title, cls) {
    notes = (notes || []).filter(Boolean);
    if (!notes.length) return '';
    return '<div class="reading ' + (cls || 'end') + '"><span class="hand">' + esc(title || 'Reading the numbers') + '</span><ul class="ticks">' +
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
    }).join('') + '</div><!--/stats-->';
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
      return '<li' + (!i.value ? ' class="zero"' : '') + '><span class="l">' + esc(i.label) + '</span><span class="v">' + esc(main) + (small ? '<small>' + esc(small) + '</small>' : '') +
        '</span><span class="t"><i style="width:' + w.toFixed(1) + '%"></i></span></li>';
    }).join('') + '</ul>';
  }
  function table(head, rows, o) {
    o = o || {};
    return '<div class="tw"><table class="tbl' + (o.stack ? ' stk' + (o.stack === 'all' ? ' stk-all' : '') : '') + '"><thead><tr>' + head.map(function (h, i) {
      return '<th' + (o.wide && o.wide.indexOf(i) >= 0 ? ' class="w"' : '') + '>' + esc(h) + '</th>';
    }).join('') + '</tr></thead><tbody>' + rows.map(function (r) {
      var cls = r.cls ? ' class="' + r.cls + '"' : '';
      var cells = r.cells || r;
      return '<tr' + cls + '>' + cells.map(function (c, i) {
        var raw = c && typeof c === 'object' && c.html != null;
        var cc = (o.wide && o.wide.indexOf(i) >= 0 ? 'w' : '') + (c && c.cls ? ' ' + c.cls : '');
        return '<td' + (cc.trim() ? ' class="' + cc.trim() + '"' : '') + (o.stack && i ? ' data-l="' + esc(head[i] || '') + '"' : '') + '>' + (raw ? c.html : esc(c == null ? '\u2013' : c)) + '</td>';
      }).join('') + '</tr>';
    }).join('') + '</tbody></table></div>';
  }
  function signedCell(v) {
    if (!isNum(v)) return '\u2013';
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
    // never draw a tick far below the data: no "-500%" under a -25% bar, no "-1 L" under a line that never goes below 0
    if (lo < 0 && min > lo + step * 0.35) {
      lo = Math.min(0, min) - step * 0.3;
      ticks = ticks.filter(function (t) { return t >= lo; });
    }
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
  function naInline(msg) { return naBox(msg || 'Not enough data for this chart yet.', 'Nothing to draw yet', true); }

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
    var every = Math.max(1, Math.ceil(n * (o.lw || 46) / pw)), labs = [];
    xs.forEach(function (lb, i) {
      if (i % every && i !== n - 1) return;
      var anchor = n === 1 ? 'middle' : i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle';
      var w = String(lb).length * 6.2, xx = x(i);
      var x0 = anchor === 'start' ? xx : anchor === 'end' ? xx - w : xx - w / 2;
      var cand = { lb: lb, xx: xx, anchor: anchor, x0: x0, x1: x0 + w };
      while (labs.length && cand.x0 < labs[labs.length - 1].x1 + 8) {
        if (i === n - 1 && labs.length > 1) labs.pop(); else return;
      }
      labs.push(cand);
    });
    labs.forEach(function (l) { s += '<text x="' + r1(l.xx) + '" y="' + (H - 6) + '" text-anchor="' + l.anchor + '">' + esc(l.lb) + '</text>'; });
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
    // o.topMin: only boxes resting on that many posts may be outlined as "best"
    var top = valid.filter(function (x) { return !o.topMin || !N || (N[x.r][x.c] || 0) >= o.topMin; }).sort(function (a, b) { return b.v - a.v; }).slice(0, o.top || 3);
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
      return '<li><i style="background:' + (it.color || PALETTE[k % PALETTE.length]) + '"></i>' + esc(it.label) + '<b>' + pct(it.value / tot, 0) + '</b><span style="color:var(--mute);font-size:12px;margin-left:4px;white-space:nowrap">' + compact(it.value) + '</span></li>';
    }).join('') + '</ul>';
    return '<div class="donut"><svg viewBox="0 0 150 150" role="img" xmlns="http://www.w3.org/2000/svg">' + s + '</svg>' + leg + '</div>';
  }

  var DRAW = { bars: drawBars, stack: drawStack, line: drawLine, heat: drawHeat, donut: drawDonut };
  function drawAll(force) {
    var els = document.querySelectorAll('.chart[data-ch]');
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
    // views first (the number on her profile), then how many different people that was
    var m = [
      ['Views', compact(p.views), o.hi === 'views'], ['People reached', compact(p.reach), o.hi === 'reach'], ['Likes', compact(p.likes), o.hi === 'likes'],
      ['Comments', compact(p.comments)], [o.hi === 'shares' ? 'Shares' : 'Saves', compact(o.hi === 'shares' ? p.shares : p.saves), o.hi === 'saves' || o.hi === 'shares'], ['Engaged', pct(p.er_r, 1), o.hi === 'er']
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
    // .sh is display:contents on screen; in print it becomes the full-width section band
    return '<div class="sh"><p class="eb">' + (num ? '<span class="hand">' + num + '</span>' : '') + '<span class="ex">' + esc(eyebrow) + '</span>' + wm('print-only') + '</p><h2 class="h">' + title + '</h2>' + (lead ? '<p class="lead">' + esc(lead) + '</p>' : '') + '</div>';
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
    h += '<h3 class="sub span">Who they are</h3>';
    h += '<div class="quad"><div class="g2">' + figOrNA('Gender', A.gender, function () { return ch('donut', A.gender, {}); }) +
      figOrNA('Age', A.age, function () { return ch('bars', A.age, { fmt: 'pct', h: 180 }); }) + '</div>';
    h += '<div class="g2">' + figOrNA('Top countries', A.countries, function () { return hbars(A.countries.items, { byShare: true }); }) +
      figOrNA('Top cities', A.cities, function () { return hbars(A.cities.items, { byShare: true }); }, { note: 'Share of the followers Instagram could place in a city.' }) + '</div></div>';
    h += '<h3 class="sub span">When they are online</h3>';
    var on = A.online;
    if (isNA(on)) h += naBox(on);
    else {
      h += '<p class="sub-lead span">Average followers online by weekday and hour over the last ' + on.days + ' days. Most active: ' + esc(on.best_ist.join(', ')) + ' (IST).</p>';
      h += '<div class="pair">' + fig('India time (IST)', ch('heat', { rows: on.rows, cols: hourCols(), col_labels: hourCols(true), values: on.ist.values, fmt: 'int' }, { h: 170 }), { note: on.ist.label + ' IST = Pacific + 12 h 30 m (daylight time) or + 13 h 30 m (standard time), shifted date by date.' });
      h += fig('As Meta returns it (Pacific time)', ch('heat', { rows: on.rows, cols: hourCols(false, true), values: on.pt.values, fmt: 'int' }, { h: 170 }), { note: 'Meta does not say which time zone it uses for this metric; Pacific time is the best-supported reading.' }) + '</div>';
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
    })), { note: 'Views = times played or seen (the number on your profile). People reached = different people. Both exist only for posts with insights. Engagement rate uses followers today.' });
    h += '<div class="g2">' + figOrNA('Posts by type, all time', P.by_type, function () {
      var tot = P.by_type.items.reduce(function (a, i) { return a + i.value; }, 0);
      return ch('donut', P.by_type, { center: nint(tot), centerSub: 'posts' });
    }) + fig('Typical post by format', table(['Format', 'Posts', 'Views', 'People reached', 'Likes', 'Engaged'], (P.by_format.rows || []).map(function (r) {
      return [r.format, nint(r.posts), compact(r.views), compact(r.reach), compact(r.likes), pct(r.er_r)];
    })), { right: 'Median, ' + P.by_format.window }) + '</div>';
    h += figOrNA('Posts per month by format', P.monthly_types, function () { return ch('stack', P.monthly_types, { h: 200 }); });
    h += fig('More per format', table(['Format', 'Comments', 'Saves', 'Shares', 'ER followers', 'Reach rate'], (P.by_format.rows || []).map(function (r) {
      return [r.format, nint(r.comments), nint(r.saves), nint(r.shares), pct(r.er_f), pct(r.rr)];
    })), { right: 'Median, ' + P.by_format.window });
    // top posts
    var T = P.top || {}, lists = T.lists || {}, cards = T.cards || {};
    var keys = ['views', 'reach', 'er', 'saves', 'shares', 'likes'].filter(function (k) { return lists[k] && lists[k].ids && lists[k].ids.length; });
    h += '<h3 class="sub span">Top posts</h3>';
    if (!keys.length) h += naBox('No posts to rank yet.');
    else {
      h += '<div class="tabs" role="tablist">' + keys.map(function (k, i) {
        return '<button class="tab" role="tab" type="button" data-tab="' + k + '" aria-selected="' + (i === 0) + '">' + esc(lists[k].label) + '</button>';
      }).join('') + '</div>';
      keys.forEach(function (k, i) {
        var hiMap = { views: 'views', er: 'er', reach: 'reach', saves: 'saves', shares: 'shares', likes: 'likes' };
        h += '<div class="tp-list' + (k === keys[0] || (k === 'reach' && keys[0] === 'views') || (k === 'er' && keys[0] !== 'views') ? '' : ' np') + '" data-list="' + k + '"' + (i === 0 ? '' : ' hidden') + '>' +
          '<p class="fig-t tp-title">Top posts by ' + esc(lists[k].label.toLowerCase()) + '</p><div class="posts">' +
          lists[k].ids.map(function (id, j) { return postCard(cards[id], j + 1, { hi: hiMap[k] }); }).join('') + '</div></div>';
      });
    }
    h += reading(P.notes);
    return h;
  }

  function secOpt(O, R) {
    if (isNA(O)) return naBox(O);
    var h = '<p class="sub-lead">Based on ' + nint(O.n) + ' posts with insights from ' + esc(O.window) + '. ' + esc(O.method) + '</p>';
    // the charts are a record of the past, not advice: a slot is only recommended from 8+ posts, or by the plan
    var boxN = (O.heat_reach && O.heat_reach.min_n) || 3, recN = O.rec_min_n || 8;
    var planSlots = R && R.plan && !isNA(R.plan) && R.plan.best_slots && R.plan.best_slots.length ? R.plan.best_slots : null;
    h += '<div class="g2">' + fig('What your past posts show: people reached', ch('heat', O.heat_reach, { h: 230, topMin: recN }), { right: 'IST, 3-hour blocks', note: 'Against your usual for the format. A box is drawn from ' + boxN + ' or more posts; only boxes with ' + recN + ' or more are outlined.' }) +
      fig('What your past posts show: engagement', ch('heat', O.heat_er, { h: 230, topMin: recN }), { right: 'IST, 3-hour blocks', note: 'A record of the past, not a recommendation: most boxes rest on only a few posts.' }) + '</div>';
    function slots(arr) {
      if (!arr || !arr.length) return naBox('No slot has ' + recN + ' or more posts with a clear lift, so we do not recommend one from the numbers alone.', 'Not enough posts in one slot yet', true);
      return '<ol class="steps">' + arr.map(function (b) { return '<li><strong>' + esc(b.slot) + '</strong>' + esc(b.text) + (/posts/.test(b.text) ? '' : ' \u00b7 ' + b.n + ' posts') + '</li>'; }).join('') + '</ol>';
    }
    if (planSlots) {
      h += fig('Your recommended slots', table(['Day', 'Time (IST)', 'Format', 'Why'], planSlots.map(function (x) { return [x.day, x.time_ist, x.format, x.why || '']; }), { wide: [3], stack: true }), { cls: 'wide', right: 'From your plan', note: 'Chosen by our strategist from these numbers, your followers\u2019 online hours and what you told us.' });
      if ((O.best_reach && O.best_reach.length) || (O.best_er && O.best_er.length)) h += '<div class="g2">' + fig('Past posts: strongest slots for people reached', slots(O.best_reach), { right: recN + '+ posts each' }) + fig('Past posts: strongest slots for engagement', slots(O.best_er), { right: recN + '+ posts each' }) + '</div>';
    } else {
      h += '<div class="g2">' + fig('Top slots for people reached', slots(O.best_reach), { right: recN + '+ posts each' }) + fig('Top slots for engagement', slots(O.best_er), { right: recN + '+ posts each' }) + '</div>';
    }
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
      })), { right: nint(Hs.distinct) + ' different tags used' }) +
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
        return fig(c.title, ch('line', { x: PA.trend.labels, series: [{ name: c.title, values: c.values }] }, { h: PRINT ? 112 : 140, right: 40, lw: 50 }));
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
      { label: 'Views vs prior 90 days', value: c.views && c.views.vs_prev, fmt: 'signed', sub: c.views && c.views.now != null ? nint(c.views.now) + ' on a usual post' : null },
      { label: 'People reached vs prior 90 days', value: c.reach && c.reach.vs_prev, fmt: 'signed', sub: c.reach && c.reach.now != null ? nint(c.reach.now) + ' different people, usual post' : null },
      { label: 'Likes vs a year ago', value: c.likes && c.likes.vs_year, fmt: 'signed', sub: c.likes && c.likes.now != null ? 'median ' + nint(c.likes.now) + ' per post' : null }
    ]);
    h += figOrNA('Views on a usual post, by month', M.views, function () { return ch('line', M.views, { h: 210 }); }, { right: 'Median' });
    h += '<div class="g2">' + figOrNA('Different people reached, usual post', M.reach, function () { return ch('line', M.reach, { h: 190 }); }, { right: 'Median' }) +
      figOrNA('Engagement by people reached', M.er_r, function () { return ch('line', M.er_r, { h: 190, fmt: 'pct' }); }, { right: 'Median' }) + '</div>';
    h += figOrNA('Median likes per post, by month', M.likes, function () { return ch('line', M.likes, { h: 190 }); }, { right: 'Since the first post' });
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
    var h = '<p class="sub-lead screen-only">' + esc(Pt.method) + '</p>', first = true;
    function fmts(o) {
      var f = o.formats || {};
      return Object.keys(f).sort(function (a, b) { return f[b] - f[a]; }).map(function (k) { return k + 's ' + pct(f[k], 0); }).join(', ');
    }
    [['ri', 'Ranked by reach'], ['er_r', 'Ranked by engagement']].forEach(function (pair) {
      var a = Pt[pair[0]];
      h += '<h3 class="sub screen-only">' + esc(pair[1]) + '</h3>';
      if (isNA(a)) { h += fig(pair[1], naBox(a)); return; }
      var rows = [['Format mix', fmts(a.top), fmts(a.bottom), fmts(a.all)]];
      (Pt.rows || []).forEach(function (r) {
        var key = r[1], f = r[2];
        var g = function (o) { var v = o[key]; return f === 'list' ? (v || []).join(', ') : f === 'text' ? (v || '\u2013') : fv(v, f === 'pct0' ? 'pct0' : f === 'dec' ? 'dec' : f); };
        rows.push([r[0], g(a.top), g(a.bottom), g(a.all)]);
      });
      h += fig('Top 10% vs bottom 25%', table(['', 'Top 10% (' + a.top.n + ')', 'Bottom 25% (' + a.bottom.n + ')', 'All (' + a.all.n + ')'], rows, { wide: [1, 2, 3] }), { cls: 'w2', printRight: pair[1], printNote: first ? Pt.method : null });
      first = false;
      var kt = a.keywords_top || [], kb = a.keywords_bottom || [];
      h += '<div class="g2">' + fig('Words more common in winners', kt.length ? '<ul class="chips">' + kt.map(function (k) {
        return '<li>' + esc(k.word) + '<b>' + pct(k.top, 0) + '</b></li>';
      }).join('') + '</ul><p class="fig-n">% of winning captions that use the word.</p>' : naBox('No word stands out yet.', 'Nothing stands out', true)) +
        fig('Words more common in the weakest', kb.length ? '<ul class="chips">' + kb.map(function (k) {
          return '<li>' + esc(k.word) + '<b>' + pct(k.top, 0) + '</b></li>';
        }).join('') + '</ul>' : naBox('No word stands out.', 'Nothing stands out', true)) + '</div>';
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
    })), { cls: 'w2', right: V.window, desc: 'Per 1,000 accounts reached. Shares and saves spread a post; follows and profile visits turn reach into an audience.' });
    h += '<div class="g2">' + figOrNA('Who the reach came from', V.follow_type, function () { return ch('donut', V.follow_type, {}); }, { right: 'Last 30 days' }) +
      fig('Follower magnets', V.magnets && V.magnets.length ? miniList(V.magnets, [['Follows', function (c) { return nint(c.follows); }], ['Views', function (c) { return compact(c.views); }], ['Reached', function (c) { return compact(c.reach); }]]) : naBox(V.magnets_na || 'Not available.'), { desc: 'Posts that brought the most new followers.' }) + '</div>';
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
    var cols = [['Watched', function (c) { return c.watch_s != null ? c.watch_s.toFixed(1) + ' s' : '\u2013'; }], ['Views', function (c) { return compact(c.views); }], ['Reached', function (c) { return compact(c.reach); }]];
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
      return { cls: r.me ? 'me' : '', cells: ['@' + r.username + (r.me ? ' (you)' : ''), compact(r.followers), fv(r.per_week, 'dec'), compact(r.avg_likes), compact(r.avg_comments), compact(r.avg_views), pct(r.er), pct(r.reel_share, 0), r.top_type ? r.top_type + 's' : '\u2013'] };
    })), { cls: 'w2' });
    function cmpBars(key, fmt) {
      return hbars(rows.map(function (r) { return { label: '@' + r.username + (r.me ? ' (you)' : ''), value: r[key] }; }), { fmt: fmt });
    }
    h += '<div class="g3">' + fig('Engagement', cmpBars('er', 'pct')) + fig('Posts per week', cmpBars('per_week', 'dec')) + fig('Avg reel views', cmpBars('avg_views', 'compact')) + '</div>';
    var best = rows.filter(function (r) { return !r.me && r.best_post; });
    if (best.length) {
      h += fig('Their best recent posts', '<ul class="mini">' + best.map(function (r) {
        return '<li><span class="c">' + esc(r.best_post.caption || '\u2013') + '<small>@' + esc(r.username) + ' \u00b7 ' + esc(r.best_post.type) + ' \u00b7 ' + esc(r.best_post.date) + '</small></span><span class="x"><span><small>Likes</small>' + compact(r.best_post.likes) + '</span></span></li>';
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

  // plan.goal {main, second, why}: shown with the headline
  function goalBlock(g) {
    if (!g || (!g.main && !g.second)) return '';
    var why = Array.isArray(g.why) ? g.why.filter(Boolean) : (g.why ? [g.why] : []);
    return '<dl class="goal">' + (g.main ? '<div><dt>Main goal</dt><dd>' + esc(g.main) + '</dd></div>' : '') +
      (g.second ? '<div><dt>Second goal</dt><dd>' + esc(g.second) + '</dd></div>' : '') +
      (why.length ? '<div class="gw"><dt>Why these</dt><dd>' + (why.length > 1 ? listItems(why, 'dash') : esc(why[0])) + '</dd></div>' : '') + '</dl>';
  }
  // cards in rows of four: one grid on screen, but each row is its own block for the PDF so a long set can break across pages
  function rows4(cards) {
    var h = '';
    for (var i = 0; i < cards.length; i += 4) h += '<div class="pillars">' + cards.slice(i, i + 4).join('') + '</div>';
    return h;
  }
  function finding(k, ev) {
    if (typeof k === 'string') return '<li>' + esc(k) + '</li>';
    return '<li><strong>' + esc(k.title) + (k.only_here ? ' <span class="tag-ni">Not in Instagram</span>' : '') + '</strong>' + esc(k.detail || '') +
      (ev && k.evidence ? '<span class="ev">' + esc(k.evidence) + '</span>' : '') + '</li>';
  }
  // plan.only_here [{title, detail}]: its own band right after the short version
  function secOnlyHere(Pl) {
    var a = Pl && Array.isArray(Pl.only_here) ? Pl.only_here.filter(Boolean) : [];
    if (!a.length) return '';
    return '<section class="sec flow" id="onlyhere" data-keep="300">' + head(null, 'Only in this audit', 'What Instagram\u2019s own dashboard <em>does not</em> show you', 'Worked out from every post you have made. You will not find these in the Instagram app.') +
      '<ol class="only span">' + a.map(function (x) {
        return typeof x === 'string' ? '<li class="fig"><p>' + esc(x) + '</p></li>' : '<li class="fig"><b>' + esc(x.title || '') + '</b>' + (x.detail ? '<p>' + esc(x.detail) + '</p>' : '') + '</li>';
      }).join('') + '</ol>' + '<p class="sec-wm no-print">' + wm() + '</p></section>';
  }

  function secPlan(Pl, R) {
    if (!Pl || isNA(Pl)) return naBox('Your growth plan is being written by our strategist from these numbers and will appear here.', 'Coming next', true);
    var h = '';
    if (Pl.headline || Pl.summary) h += '<div class="verdict-card dup"><span class="tape" aria-hidden="true"></span>' + (Pl.headline ? '<p class="verdict">' + esc(Pl.headline) + '</p>' : '') + (Pl.summary ? '<p class="vsum">' + esc(Pl.summary) + '</p>' : '') + goalBlock(Pl.goal) + '</div>';
    else if (Pl.goal) h += fig('Your goal', goalBlock(Pl.goal), { cls: 'dup' });
    if (Pl.key_findings && Pl.key_findings.length) {
      h += fig('Key findings', '<ol class="steps">' + Pl.key_findings.map(function (k) { return finding(k, true); }).join('') + '</ol>', { cls: 'dup' });
    }
    if ((Pl.working && Pl.working.length) || (Pl.not_working && Pl.not_working.length)) {
      h += '<div class="two">' + fig('What is working', listItems(Pl.working, 'ticks') || naBox('Nothing to show yet.')) + fig('What is not', listItems(Pl.not_working, 'cross') || naBox('Nothing to show yet.')) + '</div>';
    }
    if (Pl.pillars && Pl.pillars.length) {
      h += '<h3 class="sub">Content pillars</h3>' + rows4(Pl.pillars.map(function (p) {
        return '<div class="fig pillar"><h4>' + esc(p.name) + (p.share_pct != null ? '<span>' + esc(p.share_pct) + '% of posts</span>' : '') + '</h4>' +
          (p.why ? '<p>' + esc(p.why) + '</p>' : '') +
          (p.evidence ? '<p class="k">Evidence</p><p>' + esc(p.evidence) + '</p>' : '') +
          (p.from_prefs ? '<p class="k">From what you told us</p><p>' + esc(p.from_prefs) + '</p>' : '') +
          (p.formats && p.formats.length ? '<p class="k">Formats</p><ul class="chips">' + p.formats.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul>' : '') +
          (p.examples && p.examples.length ? '<p class="k">Ideas</p>' + listItems(p.examples, 'dash') : '') + '</div>';
      }));
    }
    if (Pl.stop && Pl.stop.length) h += fig('What to stop or cut down', listItems(Pl.stop, 'cross'), { cls: 'wide stop' });
    if ((Pl.posting_rules && Pl.posting_rules.length) || (Pl.best_slots && Pl.best_slots.length)) {
      h += '<h3 class="sub span">When and how to post</h3><div class="two">' +
        fig('Posting rules', listItems(Pl.posting_rules, 'ticks') || naBox('Nothing to show yet.')) +
        fig('Your slots', Pl.best_slots && Pl.best_slots.length ? table(['Day', 'Time (IST)', 'Format', 'Why'], Pl.best_slots.map(function (s) { return [s.day, s.time_ist, s.format, s.why || '']; }), { wide: [3], stack: 'all' }) : naBox('Nothing to show yet.')) + '</div>';
    }
    if (Pl.series && Pl.series.length) {
      h += '<h3 class="sub span">Your series</h3>' + rows4(Pl.series.map(function (x) {
        var ep = x.episodes, n = Array.isArray(ep) ? ep.length : ep;
        return '<div class="fig pillar"><h4>' + esc(x.name || '') + (n != null && n !== '' ? '<span>' + esc(n) + (isNum(+n) ? ' episode' + (+n === 1 ? '' : 's') : '') + '</span>' : '') + '</h4>' +
          (x.logline ? '<p>' + esc(x.logline) + '</p>' : '') +
          (x.slot ? '<p class="k">When</p><p>' + esc(x.slot) + '</p>' : '') +
          (x.proof ? '<p class="k">Why it will work</p><p>' + esc(x.proof) + '</p>' : '') +
          (Array.isArray(ep) && ep.length ? '<p class="k">Episodes</p>' + listItems(ep.map(function (e) { return typeof e === 'string' ? e : (e && (e.title || e.name)) || ''; }), 'dash') : '') +
          (x.episodes_note ? '<p class="k">Episodes</p><p>' + esc(x.episodes_note) + '</p>' : '') + '</div>';
      }));
    }
    var cal = Pl.calendar;
    if (cal && cal.weeks && cal.weeks.length) {
      h += '<h3 class="sub span">90-day calendar</h3><p class="sub-lead span">' + esc([cal.start ? 'Starts ' + cal.start : '', cal.posts_per_week ? cal.posts_per_week + ' posts a week' : '', cal.note || ''].filter(Boolean).join(' \u00b7 ')) + '</p>';
      // calendar.tentpoles [{date, what, big}]: the dates the 13 weeks are built around; calendar.rules [..]
      var tps = Array.isArray(cal.tentpoles) ? cal.tentpoles.filter(Boolean) : [], crules = Array.isArray(cal.rules) ? cal.rules.filter(Boolean) : [];
      if (tps.length || crules.length) {
        h += '<div class="two">' + (tps.length ? fig('Big dates in these weeks', '<ul class="tpl">' + tps.map(function (t) {
          return '<li' + (t.big ? ' class="big"' : '') + '><span class="d">' + esc(t.date || '') + '</span><span class="w">' + esc(t.what || '') + '</span></li>';
        }).join('') + '</ul>', { desc: 'The calendar is built around these. The highlighted one is the big one.' }) : '') +
          (crules.length ? fig('Calendar rules', listItems(crules, 'ticks')) : '') + '</div>';
      }
      h += '<div class="weeks">' + cal.weeks.map(function (w) {
        var wtp = Array.isArray(w.tentpoles) ? w.tentpoles.filter(Boolean) : [], wst = Array.isArray(w.stories) ? w.stories.filter(function (d) { return d && d.items && d.items.length; }) : [];
        return '<div class="fig wk' + (w.highlight ? ' big' : '') + '"><div class="fig-h"><b>Week ' + esc(w.week) + '</b><span class="fig-r">' + esc([w.dates, w.theme].filter(Boolean).join(' \u00b7 ')) + '</span></div>' +
          (w.highlight ? '<p class="wk-big">' + esc(w.highlight) + '</p>' : '') +
          (wtp.length ? '<ul class="wk-tp">' + wtp.map(function (t) { return '<li><i class="tpk">' + esc(t.date || 'Big date') + '</i> ' + esc(t.what || '') + '</li>'; }).join('') + '</ul>' : '') +
          '<ul class="cal">' + (w.posts || []).map(function (p) {
            var tp = p.tentpole ? (typeof p.tentpole === 'string' ? p.tentpole : 'Big day') : '';
            var chk = p.needs_check ? (typeof p.needs_check === 'string' ? p.needs_check : 'To confirm with you') : '';
            return '<li' + (tp ? ' class="tp"' : '') + '><span class="d">' + esc(p.day || '') + (p.date ? ' ' + esc(p.date) : '') + '<small>' + esc(p.time_ist || '') + ' IST</small></span>' +
              '<span class="h">' + (tp ? '<i class="tpk">' + esc(tp) + '</i>' : '') + '<b>' + esc(p.title || p.hook || '') + '</b>' +
              (p.title && p.hook ? '<small class="hk">' + esc(p.hook) + '</small>' : '') +
              '<small>' + (p.series ? '<em class="sr">' + esc(p.series) + '</em> \u00b7 ' : '') + esc([p.format, p.pillar].filter(Boolean).join(' \u00b7 ')) +
              (p.script_id ? ' <span class="okm" title="Script ' + esc(p.script_id) + '">script ready</span>' : '') + '</small>' +
              (p.notes ? '<small class="nt">' + esc(p.notes) + '</small>' : '') + (chk ? '<small class="ck">' + esc(chk) + '</small>' : '') + '</span></li>';
          }).join('') + '</ul>' +
          (w.shoot_plan ? '<p class="wk-n"><b>Shoot plan</b>' + esc(w.shoot_plan) + '</p>' : '') +
          (w.shelf_room ? '<p class="wk-n"><b>If something happens</b>' + esc(w.shelf_room) + '</p>' : '') +
          (wst.length ? '<div class="wk-st"><p class="k">' + esc(w.stories_title || 'Stories plan') + '</p>' + wst.map(function (d) {
            return '<p class="sd">' + esc(d.date || '') + '</p>' + listItems(d.items, 'dash');
          }).join('') + '</div>' : '') + '</div>';
      }).join('') + '</div>';
      // calendar.shelf [{title, series, trigger, replaces}]: reels written in advance for a moment that has no date yet
      var shelf = Array.isArray(cal.shelf) ? cal.shelf.filter(Boolean) : [];
      if (shelf.length) {
        h += fig('Ready when it happens', '<ul class="shelf">' + shelf.map(function (x) {
          return '<li><b>' + esc(x.title || '') + '</b>' + (x.series ? '<small><em class="sr">' + esc(x.series) + '</em>' + (x.script_id ? ' <span class="okm">script ready</span>' : '') + '</small>' : '') +
            (x.trigger ? '<p><span class="k">Post it when</span>' + esc(x.trigger) + '</p>' : '') +
            (x.replaces ? '<p><span class="k">Where it goes</span>' + esc(x.replaces) + '</p>' : '') + '</li>';
        }).join('') + '</ul>', { cls: 'wide shelf-fig', right: shelf.length + ' reels on the shelf', desc: cal.shelf_note || 'These reels have no date. Each one is written and waiting for a real moment; when it happens, post the matching one.' });
      }
    }
    var gt = Pl.growth_tactics;
    if (gt) {
      var groups = [['collabs', 'Collaborations'], ['hooks', 'Hooks'], ['profile_fixes', 'Profile and bio fixes'], ['keywords', 'Keywords and SEO'], ['other', 'Also']];
      var parts = groups.filter(function (g) { return gt[g[0]] && gt[g[0]].length; }).map(function (g) { return fig(g[1], listItems(gt[g[0]], 'ticks')); });
      if (parts.length) h += '<h3 class="sub span">Growing followers</h3><div class="two">' + parts.join('') + '</div>';
    }
    var br = Pl.brand_readiness;
    if (br) {
      h += '<h3 class="sub span">Brand-deal readiness</h3><div class="two"><div class="fig">' +
        (br.score != null ? '<div class="score"><b>' + esc(br.score) + '</b><span>out of ' + esc(br.out_of || 10) + (br.status ? ' \u00b7 ' + esc(br.status) : '') + '</span></div>' : '') +
        (br.summary ? '<p class="vsum" style="font-size:15.5px;margin-top:0">' + esc(br.summary) + '</p>' : '') + '</div><div>' +
        (br.strengths && br.strengths.length ? fig('Strengths', listItems(br.strengths, 'ticks')) : '') +
        (br.gaps && br.gaps.length ? fig('Fix before pitching', listItems(br.gaps, 'cross')) : '') + '</div></div>';
      var ts = br.trust_score, nf = br.not_fit && br.not_fit.length ? br.not_fit : null;
      if (ts != null && typeof ts !== 'object') ts = { score: ts, out_of: br.trust_out_of, parts: br.trust_parts };
      if (ts || nf) {
        var tparts = (ts && ts.parts) || [];
        h += '<div class="two">' + (ts ? fig('Brand trust score', '<div class="score"><b>' + esc(ts.score) + '</b><span>out of ' + esc(ts.out_of || 100) + '</span></div>' +
          (tparts.length ? '<ul class="tsp">' + tparts.map(function (t) {
            var mx = t.max != null ? t.max : t.out_of, w = isNum(+t.score) && +mx > 0 ? Math.max(0, Math.min(100, +t.score / +mx * 100)) : 0;
            return '<li><span class="l">' + esc(t.label || t.part || '') + '</span><span class="v">' + esc(t.score) + (mx != null ? '<small> / ' + esc(mx) + '</small>' : '') + '</span>' +
              '<i><u style="width:' + w.toFixed(1) + '%"></u></i>' + (t.note ? '<small class="n">' + esc(t.note) + '</small>' : '') + '</li>';
          }).join('') + '</ul>' : ''), { desc: 'How safe a brand would feel putting money behind this page today.' }) : '') +
          (nf ? fig('Not a fit right now', listItems(nf, 'cross'), { desc: 'Categories to say no to, or leave for later.' }) : '') + '</div>';
      }
      if (br.rates && br.rates.length) {
        h += '<p class="rates-note span"><b>Read this first</b>' + esc(br.rates_note || 'These are a starting range, not a quote. The views are yours; the price per view is our assumption for the Indian market at this size. Final rates depend on usage rights, exclusivity and deliverables.') + '</p>';
        h += fig('Rate guidance', table(['Deliverable', 'Range', 'Notes'], br.rates.map(function (r) {
          var cur = r.currency === 'INR' || !r.currency ? '\u20b9' : r.currency + ' ';
          return [r.deliverable, cur + nint(r.low) + '\u2013' + nint(r.high), r.note || ''];
        }), { wide: [2], stack: true }), { cls: 'wide' });
      }
      if (br.pitch_list && br.pitch_list.length) {
        h += fig('Who to pitch', table(['Category', 'Why you fit', 'Examples'], br.pitch_list.map(function (p) {
          return [p.category, p.why || '', (p.examples || []).join('; ')];
        }), { wide: [1, 2], stack: true }), { cls: 'wide' });
      }
    }
    if (Pl.kpis && Pl.kpis.length) {
      h += '<h3 class="sub span">Targets</h3>' + fig('30 / 60 / 90-day KPIs', table(['Metric', 'Now', '30 days', '60 days', '90 days'], Pl.kpis.map(function (k) {
        var f = k.fmt || 'int';
        return [k.metric, fv(k.now, f), fv(k.d30, f), fv(k.d60, f), fv(k.d90, f)];
      })));
    }
    if (Pl.next_steps && Pl.next_steps.length) h += fig('This week', '<ol class="steps">' + Pl.next_steps.map(function (s) { return '<li>' + esc(typeof s === 'string' ? s : (s.title || '') + ' ' + (s.detail || '')) + '</li>'; }).join('') + '</ol>');
    if (Pl.open_questions && Pl.open_questions.length) h += fig('Questions only you can answer', '<ol class="steps qs">' + Pl.open_questions.map(function (q) {
      return typeof q === 'string' ? '<li>' + esc(q) + '</li>' : '<li>' + (q['for'] ? '<span class="qf">' + esc(q['for']) + '</span>' : '') + esc(q.question || q.title || '') + '</li>';
    }).join('') + '</ol>', { cls: 'wide', desc: Pl.open_questions_lead || 'Your answers make the next version of this plan sharper. Reply to us on any of them.', note: Pl.open_questions_note || '' });
    if (Pl.author || Pl.written_at) h += '<p class="fig-n">Plan by ' + esc(Pl.author || 'Busy Fox') + (Pl.written_at ? ', ' + esc(Pl.written_at) : '') + '.</p>';
    return h;
  }

  function secNotes(D) {
    if (isNA(D)) return naBox(D);
    // plain words for her; the raw API replies stay in analysis.json for the team
    var PLAIN = {
      media_insights: 'Instagram does not report follows or profile visits for reels, only for photos and carousels. So "new followers per post" is shown for carousels only.',
      views_by_follower_type: 'Instagram would not split views between followers and non-followers this time, so that split is shown for people reached only.'
    };
    var seen = {}, errs = [];
    (D.errors || []).forEach(function (e) {
      var t = PLAIN[e.step] || (PDF_BUILD ? (e.step ? e.step + ': ' : '') + e.error : 'One smaller detail (' + String(e.step || 'a metric').replace(/_/g, ' ') + ') was not shared by Instagram on this pull.');
      if (!seen[t]) { seen[t] = 1; errs.push(t); }
    });
    (D.missing_files || []).forEach(function (f) { if (PDF_BUILD || !/^rivals/.test(f)) errs.push(PDF_BUILD ? f + ' was not received.' : 'One file (' + f.replace(/\.json$/, '').replace(/_/g, ' ') + ') did not arrive on this pull.'); });
    (D.bad_files || []).forEach(function (f) { errs.push(PDF_BUILD ? f + ' could not be read.' : 'One file (' + f.replace(/\.json$/, '').replace(/_/g, ' ') + ') could not be read on this pull.'); });
    // on paper the held-back list joins the definitions grid (its last row has room); on screen it is its own card
    var h = '<dl class="dn">' + (D.items || []).map(function (i) { return '<div><b>' + esc(i.title) + '</b><span>' + esc(i.text) + '</span></div>'; }).join('') +
      (errs.length ? '<div class="print-only"><b>Held back on this pull</b><span>' + esc(errs.join(' \u00b7 ')) + '</span></div>' : '') + '</dl>';
    if (errs.length) h += fig('What Instagram held back on this pull', '<ul class="dash">' + errs.map(function (e) { return '<li>' + esc(e) + '</li>'; }).join('') + '</ul>', { cls: 'screen-only' });
    return h;
  }

  /* ------------------------------------------------------------------ page */
  var SECTIONS = [
    { id: 'audience', key: 'audience', eyebrow: 'Audience', title: 'Who <em>follows</em> you', lead: 'Follower count, growth, who they are and when they are online.', fn: secAudience, flow: true },
    { id: 'posts', key: 'posts', eyebrow: 'Posts', title: 'What you have <em>posted</em>', lead: 'Every post from the first one to today: volume, formats, results and the best performers.', fn: secPosts, flow: true },
    { id: 'optimisation', key: 'optimization', eyebrow: 'Optimisation', title: 'When and how to <em>post</em>', lead: 'The days, hours, formats and hashtags that work best for you.', fn: secOpt, flow: true },
    { id: 'stories', key: 'stories', eyebrow: 'Stories', title: '<em>Stories</em>', lead: 'Reach, views, replies and drop-off for the stories we collected.', fn: secStories, flow: true, keep: 360 },
    { id: 'profile', key: 'profile_activity', eyebrow: 'Profile', title: 'Profile and <em>account</em> activity', lead: 'Accounts reached, views, link taps and engagement, in 30-day windows.', fn: secProfile, flow: true },
    { id: 'momentum', key: 'momentum', eyebrow: 'Momentum', title: 'Are you <em>growing</em>?', lead: 'Monthly medians since your first post: views, people reached, engagement and likes.', fn: secMomentum, flow: true },
    { id: 'consistency', key: 'consistency', eyebrow: 'Consistency', title: 'Rhythm and <em>breaks</em>', lead: 'How often you post, the longest gaps, and what happened to reach after them.', fn: secConsistency, flow: true },
    { id: 'patterns', key: 'patterns', eyebrow: 'Patterns', title: 'What your <em>best</em> posts share', lead: 'Your top 10% against your bottom 25%: format, timing, captions, hooks and words.', fn: secPatterns, flow: true, keep: 600 },
    { id: 'virality', key: 'virality', eyebrow: 'Virality and conversion', title: 'Shares, saves and <em>new followers</em>', lead: 'Which posts travel beyond your followers, and which turn viewers into followers.', fn: secVirality, flow: true },
    { id: 'reels', key: 'reels', eyebrow: 'Reels retention', title: 'Do people keep <em>watching</em>?', lead: 'Average watch time per reel, and how it relates to reach.', fn: secReels, flow: true },
    { id: 'quality', key: 'quality', eyebrow: 'Engagement quality', title: 'Who really <em>engages</em>', lead: 'Comments against likes, and the people who engage against the people who follow.', fn: secQuality, flow: true },
    { id: 'forecast', key: 'forecast', eyebrow: 'Forecast', title: 'Where followers are <em>heading</em>', lead: 'A simple estimate at the current pace.', fn: secForecast, flow: true, keep: 380 },
    { id: 'rivals', key: 'rivals', eyebrow: 'Rivals', title: 'How you <em>compare</em>', lead: 'Public numbers for the creators you named.', fn: secRivals, flow: true, keep: 360 },
    { id: 'kit', key: 'media_kit', eyebrow: 'Media kit', title: 'The numbers <em>brands</em> ask for', lead: 'Ready to paste into a pitch or a rate card.', fn: secKit, flow: true, keep: 480 },
    { id: 'prefs', key: 'prefs', eyebrow: 'What you told us', title: 'In your <em>words</em>', lead: 'Your answers on the connect page. The plan is built around them.', fn: secPrefs, flow: true, keep: 300 },
    { id: 'plan', key: 'plan', eyebrow: 'Growth plan', title: 'The <em>plan</em>', lead: 'What to do next, built from the numbers above and what you told us.', fn: secPlan, flow: true, keep: 430 }
  ];

  /* ------------------------------------------------------------------ story layer (web only)
     Turned on by plan.story (see ig-audits/<creator>/make_plan.py). The PDF and reports without it are unchanged.
     Adds: a 3D fan of her most-seen posts, a year-in-numbers band, a sticky chapter bar, charts that draw in when
     scrolled to, numbers that count up. ?still or reduced-motion shows everything in its final state. */
  var CHAPTERS = [
    { id: 'today', label: 'Today', secs: ['glance', 'onlyhere'] },
    { id: 'people', label: 'Your people', secs: ['audience', 'quality'] },
    { id: 'content', label: 'Your content', secs: ['posts', 'patterns', 'reels', 'virality'] },
    { id: 'timing', label: 'Timing', secs: ['optimisation', 'consistency', 'momentum', 'forecast', 'profile'] },
    { id: 'brands', label: 'Brands', secs: ['kit', 'prefs'] },
    { id: 'plan', label: 'Your plan', secs: ['plan'] }
  ];
  var STILL = /[?&]still\b/.test(location.search) || !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function lakh(v) {
    if (!isNum(v)) return '\u2013';
    if (v >= 1e7) return (v / 1e7).toFixed(1).replace(/\.0$/, '') + ' crore';
    if (v >= 1e5) return (v / 1e5).toFixed(v >= 1e6 ? 1 : 2).replace(/\.?0+$/, '') + ' lakh';
    return nint(v);
  }
  function storySecs(R) {
    var out = [];
    CHAPTERS.forEach(function (c) {
      c.secs.forEach(function (id) {
        var s = SECTIONS.filter(function (x) { return x.id === id; })[0];
        if (s && !isNA(R[s.key])) out.push(s);
      });
    });
    return out;
  }
  function storyNav(secs) {
    var have = { glance: 1 };
    secs.forEach(function (s) { have[s.id] = 1; });
    return '<nav class="chapnav" aria-label="Chapters"><div class="cn-in">' + CHAPTERS.map(function (c) {
      var first = c.secs.filter(function (id) { return have[id]; })[0];
      return first ? '<a href="#' + first + '" data-ch="' + c.id + '">' + esc(c.label) + '</a>' : '';
    }).join('') + '</div><i class="cn-bar" aria-hidden="true"></i></nav>';
  }
  function storyHero(R, ST) {
    var P = R.profile || {}, top = (R.posts && R.posts.top) || {}, cards = top.cards || {};
    var byViews = !!((top.lists || {}).views && top.lists.views.ids && top.lists.views.ids.length);
    var ids = ((top.lists || {})[byViews ? 'views' : 'reach'] || {}).ids || [];
    var best = ids.map(function (id) { return cards[id]; }).filter(function (c) { return c && c.thumb; }).slice(0, 5);
    // the most-seen post sits in the middle of the fan
    var order = best.length === 5 ? [best[3], best[1], best[0], best[2], best[4]] : best;
    var fan = order.map(function (c) {
      return '<a class="fc" href="' + esc(c.url || '#') + '" target="_blank" rel="noopener" aria-label="Open the post from ' + esc(c.date) + ' on Instagram">' +
        '<img src="' + esc(c.thumb) + '" alt="" decoding="async"><span class="fc-n"><b>' + esc(lakh(byViews ? c.views : c.reach)) + '</b>' + (byViews ? 'views' : 'reached') + '</span></a>';
    }).join('');
    var name = ST.first_name || (P.name || '').split(' ')[0] || '';
    var me = '<div class="me"><span class="tape" aria-hidden="true"></span>' +
      (ST.picture ? '<img src="' + esc(ST.picture) + '" alt="' + esc(P.name || name) + '">' : '<b class="ini">' + esc(name.charAt(0)) + '</b>') +
      '<span>@' + esc(P.username || '') + '</span></div>';
    var g = {};
    ((R.glance || {}).items || []).forEach(function (i) { g[i.label] = i; });
    var net = g['Net followers, 30 days'];
    return '<header class="hero"><div class="hero-t"><p class="hand">' + esc(ST.greeting || 'Your Instagram growth audit') + '</p>' +
      '<h1>' + (ST.title || esc(P.name || '')) + '</h1>' + (ST.intro ? '<p class="hero-lead">' + esc(ST.intro) + '</p>' : '') +
      '<div class="hero-m"><div><p>Followers today</p><b data-count>' + nint(P.followers) + '</b></div>' +
      (net && isNum(net.value) ? '<div><p>Net new followers, 30 days</p><b data-count>' + esc(fv(net.value, 'signed_int')) + '</b></div>' : '') +
      '<div><p>Posts we read</p><b data-count>' + nint(P.posts_found) + '</b></div></div>' +
      '<a class="btn solid" href="#plan">See your 90-day plan</a><p class="hero-wm">' + wm('fox') + '</p></div>' +
      '<div class="hero-s"><div class="stage"><div class="fan-tilt"><div class="fan">' + fan + me + '</div></div></div>' +
      (order.length ? '<p class="hand hero-cap">Your five most-seen posts. Tap one to open it.</p>' : '') + '</div></header>';
  }
  function storyYear(R, ST) {
    if (!ST.year || !ST.year.length) return '';
    var ft = (R.virality || {}).follow_type || {}, share = ft.non_follower_share;
    var h = '<section class="year" aria-label="Your last twelve months"><h2>' + (ST.year_title || 'Your last twelve months') + '</h2><div class="yr">' +
      ST.year.map(function (y) {
        return '<div><b data-count>' + nint(y.value) + '</b><p>' + esc(y.label) + '</p>' + (y.note ? '<small>' + esc(y.note) + '</small>' : '') + '</div>';
      }).join('') + '</div>';
    if (isNum(share)) {
      var a = Math.round(share * 100);
      h += '<div class="split"><p>Of everyone your posts reached last month, <b>' + a + ' in every 100 were not following you yet</b>. That is how growth starts.</p>' +
        '<div class="sbar" role="img" aria-label="' + a + '% new people, ' + (100 - a) + '% followers"><i style="--w:' + a + '%"><span>' + a + '% new people</span></i><u></u></div>' +
        '<div class="skey"><span>New people</span><span>Your followers, ' + (100 - a) + '%</span></div></div>';
    }
    return h + '<p class="band-wm year-wm">' + wm('light') + '</p></section>';
  }
  function countUp(el) {
    var txt = el.textContent, m = txt.match(/^([+−-]?)([\d,]+(?:\.\d+)?)(.*)$/);
    if (!m) return;
    var end = parseFloat(m[2].replace(/,/g, '')), dec = (m[2].split('.')[1] || '').length, t0 = 0, dur = 1300;
    if (!isFinite(end) || end === 0) return;
    var nf = new Intl.NumberFormat('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    // hold the final width while counting, so nothing beside the number moves
    var block = getComputedStyle(el).display !== 'inline';
    function hold(on) { if (block) { el.style.width = on ? Math.ceil(el.getBoundingClientRect().width) + 'px' : ''; el.style.whiteSpace = on ? 'nowrap' : ''; } }
    hold(true);
    (function step(t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = p < 1 ? m[1] + nf.format(end * e) + m[3] : txt;
      if (p < 1) requestAnimationFrame(step);
      else hold(false);
    })(performance.now());
    // a tab left in the background pauses the animation: the real number must still be there when she comes back
    setTimeout(function () { if (el.textContent !== txt) { el.textContent = txt; hold(false); } }, dur + 1200);
  }
  function storyWire(root) {
    var chOf = {};
    CHAPTERS.forEach(function (c) { c.secs.forEach(function (id) { chOf[id] = c.id; }); });
    var hero = root.querySelector('.hero');
    var blocks = root.querySelectorAll('.fig,.stats,.year,.verdict-card');
    var nums = root.querySelectorAll('[data-count],.stat .n:not(.t)');
    // the 13-week calendar opens on the first two weeks
    var weeks = root.querySelector('.weeks');
    if (weeks && weeks.children.length > 2) {
      var more = document.createElement('button');
      more.type = 'button'; more.className = 'btn more';
      more.textContent = 'Show all ' + weeks.children.length + ' weeks';
      more.addEventListener('click', function () {
        weeks.classList.add('open'); more.remove();
        weeks.querySelectorAll('.wk').forEach(function (w) { w.classList.add('in'); });
      });
      weeks.parentNode.insertBefore(more, weeks.nextSibling);
    }
    if (STILL || !('IntersectionObserver' in window)) {
      if (hero) hero.classList.add('on');
      blocks.forEach(function (b) { b.classList.add('in'); });
    } else {
      requestAnimationFrame(function () { requestAnimationFrame(function () { if (hero) hero.classList.add('on'); }); });
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
      blocks.forEach(function (b) { io.observe(b); });
      var cio = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { countUp(e.target); cio.unobserve(e.target); } });
      }, { threshold: 0.6 });
      nums.forEach(function (n) { cio.observe(n); });
      // the fan leans a little towards the pointer
      var stage = root.querySelector('.stage'), tilt = root.querySelector('.fan-tilt');
      if (stage && tilt && window.matchMedia('(hover:hover)').matches) {
        stage.addEventListener('pointermove', function (e) {
          var r = stage.getBoundingClientRect();
          tilt.style.setProperty('--ry', (((e.clientX - r.left) / r.width - 0.5) * 16).toFixed(1) + 'deg');
          tilt.style.setProperty('--rx', ((0.5 - (e.clientY - r.top) / r.height) * 10).toFixed(1) + 'deg');
        });
        stage.addEventListener('pointerleave', function () { tilt.style.setProperty('--ry', '0deg'); tilt.style.setProperty('--rx', '0deg'); });
      }
    }
    // safety net for the reveal: a block that was jumped over, flicked past or is taller than the screen still shows
    var pending = STILL ? [] : Array.prototype.slice.call(blocks);
    function sweep() {
      if (!pending.length) return;
      var line = window.innerHeight * 0.9;
      pending = pending.filter(function (b) {
        if (b.classList.contains('in')) return false;
        if (b.getBoundingClientRect().top < line) { b.classList.add('in'); return false; }
        return true;
      });
    }
    // chapter bar: where you are, and how far through
    var nav = root.querySelector('.chapnav');
    if (!nav) { window.addEventListener('scroll', sweep, { passive: true }); sweep(); return; }
    var links = nav.querySelectorAll('a'), secs = root.querySelectorAll('.sec'), bar = nav.querySelector('.cn-bar'), tick = 0, cur = '';
    function upd() {
      tick = 0;
      sweep();
      var y = window.scrollY || 0, max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.setProperty('--p', max > 0 ? Math.min(1, y / max).toFixed(4) : '0');
      var id = '';
      secs.forEach(function (s) { if (s.getBoundingClientRect().top < window.innerHeight * 0.4) id = chOf[s.id] || id; });
      if (id === cur) return;
      cur = id;
      links.forEach(function (a) {
        var on = a.getAttribute('data-ch') === id;
        a.setAttribute('aria-current', String(on));
        var box = nav.querySelector('.cn-in');
        if (on && box && box.scrollWidth > box.clientWidth + 1) {
          var left = Math.max(0, Math.min(box.scrollWidth - box.clientWidth, a.offsetLeft - (box.clientWidth - a.offsetWidth) / 2));
          if (Math.abs(box.scrollLeft - left) > 2) box.scrollTo({ left: left, behavior: STILL ? 'auto' : 'smooth' });
        }
      });
    }
    window.addEventListener('scroll', function () { if (!tick) tick = requestAnimationFrame(upd); }, { passive: true });
    upd();
  }

  function setPageCss(R) {
    var P = R.profile || {};
    var who = (P.username ? '@' + P.username + ' \u00b7 ' : '') + 'Instagram audit \u00b7 ' + AGENCY.name + ' \u00b7 ' + AGENCY.email;
    var css = '@page{@bottom-left{content:"' + who.replace(/["\\]/g, '') + '";font-family:"DM Sans",Helvetica,Arial,sans-serif;font-size:7.5pt;color:#6E5551}' +
      '@bottom-right{content:counter(page) " / " counter(pages);font-family:"DM Sans",Helvetica,Arial,sans-serif;font-size:7.5pt;color:#6E5551}}' +
      '@page :first{@bottom-left{content:none}@bottom-right{content:none}}@page back{margin:0;background:#3D2521;@bottom-left{content:none}@bottom-right{content:none}}';
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
    var Pl0 = R.plan && !isNA(R.plan) ? R.plan : null;
    var ST = !PRINT && Pl0 && Pl0.story ? Pl0.story : null;
    var secs = ST ? storySecs(R) : SECTIONS;
    root.classList.toggle('story', !!ST);
    root.classList.toggle('still', !!ST && STILL);
    var gen = R.generated_at ? new Date(R.generated_at) : null;
    var genLabel = gen && !isNaN(gen) ? gen.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : (P.today_label || '');
    var h = '<header class="head">' + logo('Marketing') + '<div class="head-r"><span class="when">Instagram audit · ' + esc(genLabel) + '</span></div></header>';
    h += '<header class="cover">' + tapes() + '<div class="cv-logo">' + logo('Marketing') + '</div>' +
      '<div class="cv-main">' + tapes() + '<p class="hand cv-kind">Your Instagram growth audit</p><h1 class="cv-name">' + esc(P.name || ('@' + (P.username || ''))) + '</h1>' +
      '<p class="cv-handle">@' + esc(P.username || '') + '</p>' +
      '<p class="cv-period"><span><b>' + esc(P.period || '') + '</b></span><span>' + nint(P.followers) + ' followers · ' + nint(P.posts_found) + ' posts</span><span class="no-print">Prepared by ' + esc(AGENCY.name) + '</span></p><p class="cv-wm">' + wm('fox') + '</p></div>' +
      '<div class="cv-foot"><span>Prepared by <b>' + esc(AGENCY.name) + '</b> · ' + esc(genLabel) + '</span><span>' + esc(AGENCY.email) + '</span></div></header>';
    if (ST) h += storyNav(secs) + storyHero(R, ST);
    // glance
    var G = R.glance || {}, Pl = R.plan && !isNA(R.plan) ? R.plan : null;
    // screen only: the lockup closes every section (in the PDF it sits in the section band and every page is tiled)
    var secWm = '<p class="sec-wm no-print">' + wm() + '</p>';
    h += '<section class="sec" id="glance">' + head(null, 'At a glance', 'The <em>short</em> version', null);
    if (Pl && Pl.headline) h += '<div class="verdict-card"><span class="tape" aria-hidden="true"></span><p class="verdict">' + esc(Pl.headline) + '</p>' + (Pl.summary ? '<p class="vsum">' + esc(Pl.summary) + '</p>' : '') + goalBlock(Pl.goal) + '</div>';
    else if (R.momentum && R.momentum.verdict) h += '<div class="verdict-card"><span class="tape" aria-hidden="true"></span><p class="verdict">Momentum: <em>' + esc(R.momentum.verdict.toLowerCase()) + '</em>.</p></div>';
    if (!isNA(G)) h += stats((G.items || []).map(function (i) { return { label: i.label, value: i.value, fmt: i.fmt, sub: i.sub }; }));
    if (Pl && Pl.key_findings && Pl.key_findings.length) {
      h += fig('Key findings', '<ol class="steps">' + Pl.key_findings.slice(0, 5).map(function (k) { return finding(k, false); }).join('') + '</ol>');
    } else if (G.facts && G.facts.length) h += reading(G.facts, 'Key facts');
    h += fig('Contents', '<ol class="toc">' + SECTIONS.map(function (s, i) {
      return '<li><span>' + (i + 1) + '</span><a href="#' + s.id + '">' + esc(s.eyebrow) + '</a></li>';
    }).join('') + '<li><span>·</span><a href="#notes">Notes on the data</a></li></ol>', { cls: 'no-print' });
    h += fig('Contents', '<ol class="toc toc-print">' + SECTIONS.map(function (s, i) {
      return '<li data-sec="' + s.id + '"><span>' + (i + 1) + '</span>' + esc(s.eyebrow) + '<b class="pg"></b></li>';
    }).join('') + '<li data-sec="notes"><span>·</span>Notes on the data<b class="pg"></b></li></ol>', { cls: 'print-only toc-fig' });
    h += secWm + '</section>';
    h += secOnlyHere(Pl);
    if (ST) h += storyYear(R, ST);
    secs.forEach(function (s, i) {
      var num = String(i + 1).padStart(2, '0');
      var body;
      try { body = s.fn(R[s.key], R); }
      catch (e) { body = naBox('This section could not be shown (' + (e && e.message ? e.message : 'error') + ').'); }
      // print-only copy of the takeaways, placed first so it sits beside the charts on a landscape page
      var lead = R[s.key] && !isNA(R[s.key]) ? reading(R[s.key].notes, null, 'lead-r') : '';
      if (lead) {
        // after the opening stat band when the section starts with one, otherwise first
        var m = body.indexOf('<!--/stats-->'), f = body.search(/<figure|class="kit"|class="pair"|class="tp-list"/);
        body = m >= 0 && (f < 0 || m < f) ? body.slice(0, m) + lead + body.slice(m) : lead + body;
      }
      // .pbk is print-only: an unbreakable spacer that starts the section on a new page when too little of the page is left
      h += (s.flow ? '<div class="pbk" aria-hidden="true"' + (s.keep ? ' style="--keep:' + s.keep + 'px"' : '') + '></div>' : '') + '<section class="sec' + (s.flow ? ' flow' : '') + '" id="' + s.id + '"' + (s.flow ? '' : ' data-newpage="1"') + (s.keep ? ' data-keep="' + s.keep + '"' : '') + '>' + head(num, s.eyebrow, s.title, s.lead) + body + secWm + '</section>';
    });
    h += '<section class="sec flow" id="notes" data-keep="360">' + head(null, 'Notes on the data', 'How to read this <em>report</em>', 'Definitions, time zones and the things Instagram does not share.') + secNotes(R.data_notes) + secWm + '</section>';
    h += '<footer class="band wm-tile light" style="page:back">' + logo('Marketing') +
      '<p class="hand">Thank you for connecting</p>' +
      '<h2>Questions about your audit, or want us to run the plan <em>with you</em>?</h2>' +
      '<p>Write to ' + esc(AGENCY.name) + ' and we will get back to you.</p>' +
      '<p class="ct">' + contactLine() + '</p>' +
      '<small>Numbers come from Instagram with your permission, as of ' + esc(P.today_label || '') + '. Times are India time (IST). This report is private to you; ask us any time to delete your data.</small>' +
      '<p class="band-wm">' + wm('light') + '</p></footer>';
    root.innerHTML = h;
    wire(root);
    markScroll(root);
    if (ST) storyWire(root);
    drawAll(true);
    var finish = function () {
      drawAll(true);
      if (PRINT) {
        try { paginate(root); } catch (e) { if (window.console) console.error('paginate failed, using CSS columns', e); }
        drawAll(true);
      }
      markScroll(root);
      window.__REPORT_READY = true;
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(finish); else finish();
  }

  /* ------------------------------------------------------------------ print pagination (PDF only)
     Chrome balances CSS columns only inside one page, so short runs of cards pile into the first column.
     For the PDF we lay the pages out ourselves: every block is measured at print width, then packed masonry-style
     (shortest of three columns) into fixed landscape pages; full-width blocks cross all columns; headings stay with
     the block after them; a section continues on the same page only if data-keep px (default 430) are still free. */
  var PAGE_H = 840, GAP = 13, SEC_GAP = 20, COLS = 3;  // A4 landscape content box is 843.5 css px tall at print scale .82
  var SPAN = '.sh,.stats,.wide,.pair,.quad,.tp-list,.pillars,.kit,.verdict-card,.prefs,.quote,.dn,h3.span,.sub-lead.span,ol.only,.rates-note';
  function paginate(root) {
    var secs = Array.prototype.slice.call(root.querySelectorAll('section.sec'));
    if (!secs.length) return;
    var W = Math.floor(secs[0].getBoundingClientRect().width) || root.clientWidth;
    var colW = (W - GAP * (COLS - 1)) / COLS;
    var meas = document.createElement('div');
    meas.className = 'pp-meas';
    root.appendChild(meas);
    var hidden = function (el) { return getComputedStyle(el).display === 'none'; };
    // 1. blocks per section
    var plan = secs.map(function (sec) {
      var items = [];
      if (sec.id === 'glance') items.push({ els: [sec], span: true });
      else {
        var walk = function (el) {
          Array.prototype.forEach.call(el.children, function (ch) {
            if (hidden(ch)) return;
            if (ch.matches('.g2,.g3,.g4,.two,.weeks') || (ch.tagName === 'DIV' && !ch.className && ch.querySelector('.fig'))) { walk(ch); return; }
            items.push({ els: [ch], span: ch.matches(SPAN) || (ch.parentNode === sec && ch.matches('.na')), head: ch.matches('h3.sub,.sub-lead,.sh') });
          });
        };
        walk(sec);
      }
      // headings travel with the block they introduce: with a full-width block they form one block; a column heading
      // joins the card after it; a full-width heading before cards becomes its own block that must fit with the first card
      var blocks = [], hb = [];
      items.forEach(function (it) {
        if (it.head && !it.els[0].matches('.sh')) { hb.push(it); return; }
        var heads = hb; hb = [];
        if (it.span || !heads.length) {
          blocks.push({ els: heads.reduce(function (a, h) { return a.concat(h.els); }, []).concat(it.els), span: it.span || heads.some(function (h) { return h.span; }), keepNext: it.els[0].matches('.sh') });
        } else if (heads.some(function (h) { return h.span; })) {
          blocks.push({ els: heads.reduce(function (a, h) { return a.concat(h.els); }, []), span: true, keepNext: true });
          blocks.push({ els: it.els, span: false });
        } else {
          blocks.push({ els: heads.reduce(function (a, h) { return a.concat(h.els); }, []).concat(it.els), span: false });
        }
      });
      if (hb.length) blocks.push({ els: hb.reduce(function (a, h) { return a.concat(h.els); }, []), span: true });
      return { sec: sec, blocks: blocks, newPage: sec.id === 'glance' || sec.getAttribute('data-newpage') === '1', keep: +(sec.getAttribute('data-keep') || 430) };
    });
    // 2. measure each block in a wrapper at its print width
    plan.forEach(function (p) {
      p.blocks.forEach(function (b) {
        var w = document.createElement('div');
        b.w2 = !b.span && b.els.some(function (el) { return el.matches('.w2'); });
        w.className = 'blk' + (b.span ? ' blk-span' : '');
        w.style.width = (b.span ? W : b.w2 ? 2 * colW + GAP : colW) + 'px';
        b.els.forEach(function (el) { w.appendChild(el); });
        meas.appendChild(w);
        b.wrap = w;
      });
    });
    drawAll(true);
    plan.forEach(function (p) { p.blocks.forEach(function (b) { b.h = Math.ceil(b.wrap.getBoundingClientRect().height); }); });
    // 3. pack into pages; if a section ends on a near-empty spill page after starting mid-page, re-pack with that
    //    section on a fresh page (a few rounds at most)
    // a block taller than a page (never in the sample) is scaled to fit rather than clipped
    plan.forEach(function (p) { p.blocks.forEach(function (b) { if (b.h > PAGE_H) { b.wrap.style.zoom = PAGE_H / b.h; b.h = PAGE_H; } }); });
    var pack = function (forced) {
      var pages = [], page = null, colH = null, startPage = {}, endPage = {}, midStart = {};
      var newPage = function () { page = []; pages.push(page); colH = [0, 0, 0]; };
      var top = function () { return Math.max.apply(null, colH); };
      newPage();
      plan.forEach(function (p, si) {
        var used = top();
        if (si > 0 && (p.newPage || forced[p.sec.id] || PAGE_H - used - SEC_GAP < p.keep)) { if (page.length) newPage(); }
        else if (used > 0) { colH = colH.map(function () { return used + SEC_GAP; }); midStart[p.sec.id] = true; }
        startPage[p.sec.id] = pages.length;
        var bl = p.blocks.slice();
        while (bl.length) {
          var b = bl.shift();
          if (b.span) {
            var nx = bl[0];
            var need = b.h + (b.keepNext && nx ? (nx.span ? Math.min(nx.h, 200) : nx.h) + GAP : 0);
            var t = top();
            if (t > 0 && t + need > PAGE_H) { newPage(); t = 0; }
            page.push({ b: b, x: 0, y: t, sec: p.sec.id });
            colH = colH.map(function () { return t + b.h + GAP; });
            continue;
          }
          if (b.w2) {
            var p0 = Math.max(colH[0], colH[1]), p1 = Math.max(colH[1], colH[2]);
            var cc = p0 <= p1 ? 0 : 1, yy = Math.min(p0, p1);
            if (yy + b.h > PAGE_H) { newPage(); cc = 0; yy = 0; }
            page.push({ b: b, x: cc * (colW + GAP), y: yy, sec: p.sec.id });
            colH[cc] = colH[cc + 1] = yy + b.h + GAP;
            continue;
          }
          var order = [0, 1, 2].sort(function (a, c) { return colH[a] - colH[c] || a - c; });
          var c = order[0];
          if (colH[c] + b.h > PAGE_H) {
            // backfill: a later card of the same run that fits goes here first, but never past its own heading
            var k = -1, headed = b.els[0].matches('h3.sub,.sub-lead');
            for (var j = 0; !headed && j < bl.length && j < 6 && !bl[j].span && !bl[j].els[0].matches('h3.sub,.sub-lead'); j++) {
              if (colH[c] + bl[j].h <= PAGE_H) { k = j; break; }
            }
            if (k >= 0) { bl.unshift(b); b = bl.splice(k + 1, 1)[0]; }
            else { newPage(); c = 0; }
          }
          page.push({ b: b, x: c * (colW + GAP), y: colH[c], sec: p.sec.id });
          colH[c] += b.h + GAP;
        }
        endPage[p.sec.id] = pages.length;
      });
      var fill = pages.map(function (pg) { return pg.length ? Math.max.apply(null, pg.map(function (it) { return it.y + it.b.h; })) / PAGE_H : 0; });
      return { pages: pages, startPage: startPage, endPage: endPage, midStart: midStart, fill: fill };
    };
    var forced = {}, res = pack(forced);
    for (var round = 0; round < 6; round++) {
      var bad = null;
      plan.forEach(function (p) {
        var id = p.sec.id, e = res.endPage[id];
        if (bad || !res.midStart[id] || e === res.startPage[id]) return;
        var last = res.pages[e - 1];
        var onlyThis = last.every(function (it) { return it.sec === id; });
        if (onlyThis && res.fill[e - 1] < 0.3) bad = id;
      });
      if (!bad) break;
      forced[bad] = true;
      res = pack(forced);
    }
    var pages = res.pages, startPage = res.startPage;
    window.__PAGINATE_FORCED = Object.keys(forced);
    // 4. build the page boxes and move the measured blocks in
    var host = document.createElement('div');
    host.className = 'pages';
    pages.forEach(function (pg) {
      if (!pg.length) return;
      var d = document.createElement('div');
      d.className = 'pp wm-tile';  // every PDF page carries the watermark
      pg.forEach(function (it) {
        it.b.wrap.style.left = it.x + 'px';
        it.b.wrap.style.top = it.y + 'px';
        d.appendChild(it.b.wrap);
      });
      host.appendChild(d);
    });
    // page numbers in the printed contents: cover is page 1, packed pages follow
    Array.prototype.forEach.call(host.querySelectorAll('.toc-print li'), function (li) {
      var n = startPage[li.getAttribute('data-sec')];
      li.querySelector('.pg').textContent = n ? String(n + 1) : '';
    });
    window.__PAGE_FILL = pages.filter(function (pg) { return pg.length; }).map(function (pg) {
      return { fill: Math.round(Math.max.apply(null, pg.map(function (it) { return it.y + it.b.h; })) / PAGE_H * 100),
        secs: pg.map(function (it) { var sec = it.b.els[0].closest ? (it.b.els[0].closest('section') || it.b.els[0]) : null; return sec && sec.id; }).filter(function (v, i, a) { return v && a.indexOf(v) === i; }) };
    });
    var band = root.querySelector('.band');
    root.insertBefore(host, band || null);
    secs.forEach(function (sec) { if (sec.parentNode && sec.parentNode !== meas && !sec.closest('.blk')) sec.parentNode.removeChild(sec); });
    Array.prototype.forEach.call(root.querySelectorAll('.pbk'), function (el) { el.parentNode.removeChild(el); });
    meas.parentNode.removeChild(meas);
    root.classList.add('paginated');
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
    root.querySelectorAll('img').forEach(function (i) { i.draggable = false; });
  }
  // a table wider than its card gets a one-line "swipe" note under it (phones only, see report.css)
  function markScroll(root) {
    if (PRINT) return;
    root.querySelectorAll('.tw').forEach(function (tw) {
      var wide = tw.scrollWidth > tw.clientWidth + 4;
      tw.classList.toggle('sx', wide);
      if (wide && !(tw.nextElementSibling && tw.nextElementSibling.classList.contains('tw-hint'))) {
        var p = document.createElement('p');
        p.className = 'tw-hint no-print';
        p.textContent = 'Swipe the table sideways to see every column.';
        tw.parentNode.insertBefore(p, tw.nextSibling);
      }
    });
  }

  /* ------------------------------------------------------------------ view online only
     The live page gives no way to keep a copy: no print (report.css blanks it), no Save page / Print shortcuts,
     no right-click, long-press or drag on pictures and charts. Links and text selection stay as they are.
     Screenshots cannot be stopped from a web page; the watermark is there for those. */
  function guard() {
    var pic = 'img,svg,canvas,picture,.ph,.fc,.me';
    var hit = function (e) { var t = e.target; return t && t.closest ? t.closest(pic) : null; };
    document.addEventListener('keydown', function (e) {
      var k = (e.key || '').toLowerCase();
      if ((e.metaKey || e.ctrlKey) && !e.altKey && (k === 's' || k === 'p')) { e.preventDefault(); e.stopPropagation(); }
    }, true);
    document.addEventListener('contextmenu', function (e) { if (hit(e)) e.preventDefault(); }, true);
    document.addEventListener('dragstart', function (e) { if (hit(e)) e.preventDefault(); }, true);
  }
  if (!PDF_BUILD) guard();

  function state(root, title, text, loading, retry) {
    root.innerHTML = '<header class="head">' + logo('Marketing') + '</header>' +
      '<div class="state">' + (loading ? '<div class="spin" aria-hidden="true"></div>' : '') + '<h1>' + title + '</h1>' +
      (text ? '<p>' + esc(text) + '</p>' : '') +
      (retry ? '<p>' + contactLine() + '</p>' : '') + '</div>';
  }

  // the page's own fonts, asked for early (while the report data is on its way) and waited for briefly before the first draw
  var FONTS = null;
  function fontsReady() {
    if (!FONTS) {
      var F = document.fonts, list = ['400 1em "Playfair Display"', 'italic 400 1em "Playfair Display"', '500 1em "Playfair Display"', '400 1em "DM Sans"', '600 1em "DM Sans"', '700 1em "Caveat"'];
      var all = F && F.load ? Promise.all(list.map(function (f) { return F.load(f).catch(function () {}); })) : Promise.resolve();
      FONTS = Promise.race([all, new Promise(function (ok) { setTimeout(ok, 1800); })]);
    }
    return FONTS;
  }
  function boot() {
    var root = document.getElementById('report');
    if (!root) return;
    if (window.REPORT) { fontsReady().then(function () { render(root, window.REPORT); }); return; }
    fontsReady();
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
        return fontsReady().then(function () { render(root, x.j.report); });
      })
      .catch(function () {
        state(root, 'We could not open this <em>report</em>', 'The link may have expired or been replaced by a newer one. Write to us and we will send a fresh link.', false, true);
      });
  }

  var t;
  window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(function () { drawAll(false); var r = document.getElementById('report'); if (r) markScroll(r); }, 120); });
  // The link's # holds the report key, so in-page links must scroll without touching it.
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
    var root = document.getElementById('report');
    if (!a || !root || !root.contains(a)) return;
    var id = a.getAttribute('href').slice(1), el = id ? document.getElementById(id) : null;
    e.preventDefault();
    if (!el) return;
    var nav = root.querySelector('.chapnav'), off = (nav ? nav.offsetHeight : 0) + 12;
    var still = root.classList.contains('still') || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + (window.scrollY || 0) - off), behavior: still ? 'auto' : 'smooth' });
  });
  window.addEventListener('hashchange', function () { if (!window.REPORT && !window.REPORT_DATA) boot(); });
  window.BFReport = { render: function (R) { render(document.getElementById('report'), R); }, redraw: function () { drawAll(true); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
