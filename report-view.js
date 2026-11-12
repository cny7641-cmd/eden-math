/* 이든수학 성적 리포트 화면 (학생 포털과 선생님 미리보기가 같이 써요)
   EdenReport.render(payload) -> HTML 문자열,  EdenReport.css -> 스타일 */
(function () {
  'use strict';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var f1 = function (v) { return (Math.round(v * 10) / 10).toFixed(1); };
  var pc = function (v) { return v == null ? '-' : Math.round(v) + '%'; };
  var md = function (d) { var p = String(d || '').split('-'); return p.length === 3 ? (+p[1]) + '/' + (+p[2]) : ''; };
  var cn = function (c) { return c === '초등' ? '초등5·6' : /^[123]-[12]$/.test(c) ? '중' + c : String(c == null ? '' : c); };
  var KIND = { A: '수업교재', B: '외부교재', C: '기출' };
  var COURSES = ['초등', '1-1', '1-2', '2-1', '2-2', '3-1', '3-2'];
  var mean = function (a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : null; };

  /* ----- 성적 추이: 본인 · 반 평균 · 최고점 ----- */
  function chart(scores, max, mode) {
    var pts = scores.filter(function (p) { return p.t != null; });
    if (!pts.length) return '<div class="er-empty">아직 시험 기록이 없어요.</div>';
    pts = pts.slice(-16);
    var hi = Math.max(max, Math.ceil(Math.max.apply(null, pts.map(function (p) { return Math.max(p.t, p.m || 0); }))));
    var W = 640, H = 250, L = 34, R = 14, T = 18, B = 46, n = pts.length;
    var X = function (i) { return n === 1 ? (L + W - R) / 2 : L + i * (W - L - R) / (n - 1); };
    var Y = function (v) { return T + (1 - v / hi) * (H - T - B); };
    var g = '';
    [0, 0.25, 0.5, 0.75, 1].forEach(function (k) { var v = hi * k; g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" class="er-grid"/><text x="' + (L - 6) + '" y="' + (Y(v) + 3) + '" text-anchor="end" class="er-ax">' + Math.round(v) + '</text>'; });
    var line = function (key, cls) {
      var d = '', on = false;
      pts.forEach(function (p, i) { if (p[key] == null) { on = false; return; } d += (on ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(p[key]).toFixed(1); on = true; });
      return d ? '<path d="' + d + '" class="' + cls + '"/>' : '';
    };
    g += line('m', 'er-l-max') + line('a', 'er-l-avg') + line('t', 'er-l-me');
    pts.forEach(function (p, i) {
      var tip = cn(p.c) + ' ' + p.n + '회 (' + md(p.d) + ') 본인 ' + p.t + '점' + (p.a != null ? ' · 반 평균 ' + f1(p.a) : '') + (p.m != null ? ' · 최고점 ' + p.m : '');
      var l1 = mode === 'month' ? md(p.d) : p.n + '회', l2 = mode === 'month' ? cn(p.c) + ' ' + p.n + '회' : md(p.d);
      g += '<circle cx="' + X(i) + '" cy="' + Y(p.t) + '" r="5" class="er-dot"><title>' + esc(tip) + '</title></circle>' +
        '<text x="' + X(i) + '" y="' + (Y(p.t) - 9) + '" text-anchor="middle" class="er-val">' + p.t + '</text>' +
        '<text x="' + X(i) + '" y="' + (H - 28) + '" text-anchor="middle" class="er-ax">' + esc(l1) + '</text><text x="' + X(i) + '" y="' + (H - 14) + '" text-anchor="middle" class="er-ax2">' + esc(l2) + '</text>';
    });
    return '<div class="er-leg"><span><i class="me"></i>본인</span><span><i class="avg"></i>반 평균</span><span><i class="max"></i>최고점</span></div><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="누적테스트 성적 추이" class="er-svg">' + g + '</svg>';
  }

  var tile = function (label, value, sub, tone) { return '<div class="er-tile ' + (tone || '') + '"><span>' + esc(label) + '</span><b>' + value + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>'; };
  var card = function (title, sub, body) { return '<section class="er-card"><h3>' + esc(title) + (sub ? '<span>' + esc(sub) + '</span>' : '') + '</h3>' + body + '</section>'; };

  function openHw(list) {
    if (!list || !list.length) return '<div class="er-ok">미완료 과제가 없어요. 잘하고 있어요 👍</div>';
    return '<div class="er-tw"><table><thead><tr><th>날짜</th><th>수업</th><th>과제</th><th>상태</th></tr></thead><tbody>' + list.map(function (h) {
      return '<tr><td>' + esc(md(h.d)) + '</td><td>' + esc(cn(h.c)) + ' ' + h.n + '회</td><td>' + esc(h.item) + '</td><td><span class="er-pill ' + (h.st === '미제출' ? 'bad' : 'warn') + '">' + esc(h.st) + '</span></td></tr>';
    }).join('') + '</tbody></table></div>';
  }

  function kinds(list, note) {
    if (!list || !list.length) return '<div class="er-empty">오답 번호가 입력된 시험이 없어 아직 계산할 수 없어요.</div>';
    var cs = []; list.forEach(function (x) { if (cs.indexOf(x.c) < 0) cs.push(x.c); });
    cs.sort(function (a, b) { return COURSES.indexOf(b) - COURSES.indexOf(a); });
    var cell = function (k, c) {
      var x = list.filter(function (y) { return y.c === c && y.k === k; })[0];
      if (!x || !x.tot) return '<td class="n">-</td>';
      var v = x.ok / x.tot * 100, tone = v >= 80 ? 'good' : v >= 60 ? 'acc' : v >= 40 ? 'warn' : 'bad';
      return '<td class="n"><span class="er-pill ' + tone + '">' + Math.round(v) + '%</span><div class="er-sm">' + x.ok + '/' + x.tot + (x.avg != null ? ' · 반 ' + Math.round(x.avg) + '%' : '') + '</div></td>';
    };
    return '<div class="er-tw"><table><thead><tr><th>문항 과정</th>' + ['A', 'B', 'C'].map(function (k) { return '<th class="n">' + KIND[k] + '</th>'; }).join('') + '</tr></thead><tbody>' +
      cs.map(function (c) { return '<tr><td><b>' + esc(cn(c)) + '</b></td>' + ['A', 'B', 'C'].map(function (k) { return cell(k, c); }).join('') + '</tr>'; }).join('') + '</tbody></table></div><div class="er-sm">' + esc(note || '') + '</div>';
  }

  function units(list) {
    if (!list || !list.length) return '<div class="er-empty">단원이 분석된 시험의 오답 기록이 아직 없어요.</div>';
    var s = list.slice().sort(function (a, b) { return (COURSES.indexOf(b.c) - COURSES.indexOf(a.c)) || (b.w / b.t) - (a.w / a.t) || b.t - a.t; });
    return '<div class="er-units">' + s.map(function (x) {
      var wr = x.w / x.t * 100, ok = 100 - wr, tone = wr >= 50 ? 'bad' : wr >= 25 ? 'warn' : 'good', ac = x.avg != null ? 100 - x.avg : null;
      return '<div class="er-u"><div class="er-un">' + (x.c ? '<span class="er-cc">' + esc(x.c) + '</span> ' : '') + esc(x.u) + '</div><div class="er-ub"><i class="' + tone + '" style="width:' + Math.max(2, Math.round(ok)) + '%"></i>' + (ac != null ? '<b style="left:' + Math.min(99, Math.round(ac)) + '%" title="반 평균 정답률 ' + Math.round(ac) + '%"></b>' : '') + '</div><div class="er-uv"><b>정답률 ' + Math.round(ok) + '%</b> <span>출제 ' + x.t + ' · 오답 ' + x.w + (ac != null ? ' · 반 ' + Math.round(ac) + '%' : '') + '</span></div></div>';
    }).join('') + '</div><div class="er-sm">정답률 = 맞힌 문항 ÷ 출제된 문항. 세로 눈금은 반 평균 정답률이에요.</div>';
  }

  var ntCard = function (nt) { return nt && nt.analysis && nt.analysis.length ? card('학습 상태 분석', '누적테스트 기준', '<ul class="er-nt">' + nt.analysis.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>') : ''; };

  var analysis = function (t) { return card('분석 결과', '', t && String(t).trim() ? '<div class="er-an">' + esc(t) + '</div>' : '<div class="er-empty">분석 내용이 아직 없어요.</div>'); };

  function pane(P, B, mode) {
    var max = Math.max(P.max || 20, 0), sc = (B.scores || []).filter(function (p) { return p.t != null; });
    var avg = mean(sc.map(function (p) { return p.t; })), rel = mean(sc.filter(function (p) { return p.a != null; }).map(function (p) { return p.t - p.a; }));
    var top = sc.length ? Math.max.apply(null, sc.map(function (p) { return p.t; })) : null;
    var tiles;
    if (mode === 'month') {
      tiles = tile('이달 시험 평균', avg == null ? '-' : f1(avg) + '<small>점</small>', B.prevAvg != null && avg != null ? ((avg >= B.prevAvg ? '▲ ' : '▼ ') + f1(Math.abs(avg - B.prevAvg)) + ' (직전 대비)') : (sc.length ? sc.length + '회 응시' : ''), 'b') +
        tile('반 평균 대비', rel == null ? '-' : (rel >= 0 ? '+' : '') + f1(rel) + '<small>점</small>', '', rel != null && rel < 0 ? 'w' : 'g') +
        tile('미완료 과제', (B.hwOpen || []).length + '<small>건</small>', '', (B.hwOpen || []).length ? 'w' : 'g') +
        tile('출결', B.absN ? '결석 ' + B.absN + '회' : '결석 없음', B.sessN ? '이달 수업 ' + B.sessN + '회' : '', B.absN ? 'w' : 'g');
    } else {
      tiles = tile('과정 시험 평균', avg == null ? '-' : f1(avg) + '<small>점</small>', sc.length + '회 응시', 'b') +
        tile('반 평균 대비', rel == null ? '-' : (rel >= 0 ? '+' : '') + f1(rel) + '<small>점</small>', '', rel != null && rel < 0 ? 'w' : 'g') +
        tile('최고 점수', top == null ? '-' : top + '<small>점</small>', '', 'p') +
        tile('미완료 과제', (B.hwOpen || []).length + '<small>건</small>', '', (B.hwOpen || []).length ? 'w' : 'g');
    }
    var h = '<div class="er-tiles">' + tiles + '</div>';
    h += card('성적 추이', '누적테스트 · ' + max + '점 만점', chart(sc, max, mode));
    if (mode === 'course') {
      var fin = (B.fin || []).filter(function (x) { return x.t != null; });
      if (fin.length) h += card('총괄평가', (P.finMax || 20) + '점 만점', '<div class="er-tw"><table><thead><tr><th>구분</th><th>시험일</th><th class="n">점수</th><th class="n">전체 평균</th><th class="n">최고점</th></tr></thead><tbody>' +
        fin.map(function (x) { return '<tr><td>' + esc(x.name) + '</td><td>' + esc(md(x.d)) + '</td><td class="n"><b>' + x.t + '</b></td><td class="n">' + (x.a != null ? f1(x.a) : '-') + '</td><td class="n">' + (x.m != null ? x.m : '-') + '</td></tr>'; }).join('') + '</tbody></table></div>');
    }
    h += card('미완료 과제', mode === 'month' ? esc(P.month.replace('-', '년 ')) + '월' : cn(B.c) + '과정', openHw(B.hwOpen));
    h += card('영역별 정답률', mode === 'month' ? '이달 누적' : cn(B.c) + '과정 누적', kinds(B.kinds, '문항이 나온 과정(행)과 출처(열)별 정답률이에요. 작은 글씨는 맞힌 문항/전체 문항과 반 평균이에요.'));
    h += card('단원별 출제·오답·정답률', mode === 'month' ? '이달 누적' : cn(B.c) + '과정 누적', units(B.units));
    if (mode === 'month' && (B.notes || []).length) h += card('선생님 안내', '', B.notes.map(function (x) { return '<div class="er-note"><b>' + esc(md(x.d)) + ' · ' + esc(cn(x.c)) + ' ' + x.n + '회</b><p>' + esc(x.text) + '</p></div>'; }).join(''));
    h += ntCard(P.nt);
    h += analysis(B.analysis);
    return h;
  }

  function render(P) {
    if (!P) return '<div class="er"><div class="er-empty">리포트가 아직 발행되지 않았어요.</div></div>';
    if (!P.m) return '<div class="er"><div class="er-empty">이 리포트는 예전 형식이에요. 선생님이 다시 발행하면 새 화면으로 보여요.</div></div>';
    var cs = P.courses || [], ym = P.month;
    var head = '<header class="er-h"><div><h2>' + esc(P.name) + ' 학생 성적리포트</h2><p>' + esc(P.cls || '') + ' · ' + esc(ym.replace('-', '년 ')) + '월 발행</p></div></header>';
    var c = cs.length ? '<div class="er-pane" data-pane="c"><div class="er-chips" role="tablist">' + cs.map(function (x, i) { return '<button type="button" data-er-course="' + esc(x.c) + '" aria-pressed="' + (i === cs.length - 1) + '">' + esc(cn(x.c)) + '</button>'; }).join('') + '</div>' +
      cs.map(function (x, i) { return '<div class="er-cpane" data-cpane="' + esc(x.c) + '"' + (i === cs.length - 1 ? '' : ' hidden') + '>' + pane(P, x, 'course') + '</div>'; }).join('') + '</div>' : '<div class="er-empty">보여줄 과정이 아직 선택되지 않았어요.</div>';
    return '<div class="er">' + head + c + '</div>';
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-er-tab]');
    if (t) { var r = t.closest('.er'); r.querySelectorAll('[data-er-tab]').forEach(function (b) { b.setAttribute('aria-pressed', b === t ? 'true' : 'false'); }); r.querySelectorAll('.er-pane').forEach(function (p) { p.hidden = p.dataset.pane !== t.dataset.erTab; }); return; }
    var c = e.target.closest && e.target.closest('[data-er-course]');
    if (c) { var q = c.closest('.er-pane'); q.querySelectorAll('[data-er-course]').forEach(function (b) { b.setAttribute('aria-pressed', b === c ? 'true' : 'false'); }); q.querySelectorAll('.er-cpane').forEach(function (p) { p.hidden = p.dataset.cpane !== c.dataset.erCourse; }); }
  });

  var css = '.er{--c-me:var(--accent,#1D5FBF);--c-avg:#e0892b;--c-max:#2e9e6b;display:flex;flex-direction:column;gap:14px;font-size:14px;line-height:1.55}.er [hidden]{display:none!important}' +
    '.er-h h2{margin:0;font-size:21px}.er-h p{margin:2px 0 0;color:var(--muted,#667)}' +
    '.er-tabs,.er-chips{display:flex;gap:6px;flex-wrap:wrap}.er-tabs button{flex:1;min-height:44px;border:1px solid var(--line,#ddd);background:var(--surface,#fff);border-radius:12px;font-weight:700;font-size:15px;cursor:pointer;color:var(--muted,#667)}.er-tabs button[aria-pressed=true]{background:var(--accent,#1D5FBF);color:var(--accent-ink,#fff);border-color:var(--accent,#1D5FBF)}' +
    '.er-chips{margin-bottom:12px}.er-chips button{min-height:38px;padding:0 16px;border:1px solid var(--line,#ddd);background:var(--surface,#fff);border-radius:99px;font-weight:700;cursor:pointer;color:var(--ink,#222)}.er-chips button[aria-pressed=true]{background:var(--accent-soft,#E2ECFA);color:var(--accent,#1D5FBF);border-color:var(--accent,#1D5FBF)}' +
    '.er-pane,.er-cpane{display:flex;flex-direction:column;gap:14px}' +
    '.er-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}' +
    '.er-tile{background:var(--surface,#fff);border:1px solid var(--line,#ddd);border-radius:14px;padding:12px 14px;display:flex;flex-direction:column;gap:2px}' +
    '.er-tile span{font-size:12px;color:var(--muted,#667);font-weight:600}.er-tile b{font-size:24px;line-height:1.15}.er-tile b small{font-size:13px;color:var(--muted,#667);font-weight:600}.er-tile>small{font-size:12px;color:var(--muted,#667)}' +
    '.er-tile.b{border-left:5px solid var(--c-me)}.er-tile.g{border-left:5px solid var(--good,#1B7A4B)}.er-tile.w{border-left:5px solid var(--warn,#A65F00)}.er-tile.p{border-left:5px solid #7a5cc7}' +
    '.er-card{background:var(--surface,#fff);border:1px solid var(--line,#ddd);border-radius:14px;padding:14px 16px;min-width:0}' +
    '.er-card h3{margin:0 0 10px;font-size:15px;display:flex;justify-content:space-between;gap:8px;align-items:baseline;flex-wrap:wrap}.er-card h3 span{font-size:12px;color:var(--muted,#667);font-weight:500}' +
    '.er-svg{width:100%;height:auto;display:block}.er-grid{stroke:var(--line,#ddd);stroke-width:1}.er-ax{font-size:11px;fill:var(--ink,#222)}.er-ax2{font-size:9.5px;fill:var(--muted,#667)}.er-val{font-size:11px;font-weight:700;fill:var(--ink,#222)}' +
    '.er-l-me{fill:none;stroke:var(--c-me);stroke-width:3;stroke-linejoin:round;stroke-linecap:round}.er-l-avg{fill:none;stroke:var(--c-avg);stroke-width:2;stroke-dasharray:5 4}.er-l-max{fill:none;stroke:var(--c-max);stroke-width:2;stroke-dasharray:1 5;stroke-linecap:round}.er-dot{fill:var(--surface,#fff);stroke:var(--c-me);stroke-width:3}' +
    '.er-leg{display:flex;gap:14px;font-size:12px;margin-bottom:4px;flex-wrap:wrap}.er-leg i{display:inline-block;width:14px;height:3px;border-radius:2px;margin-right:5px;vertical-align:middle}.er-leg i.me{background:var(--c-me)}.er-leg i.avg{background:var(--c-avg)}.er-leg i.max{background:var(--c-max)}' +
    '.er-tw{overflow-x:auto}.er table{border-collapse:collapse;width:100%;font-size:13px}.er th,.er td{padding:7px 8px;border-bottom:1px solid var(--line,#ddd);text-align:left;vertical-align:top}.er th{font-size:12px;color:var(--muted,#667);white-space:nowrap}.er .n{text-align:right}' +
    '.er-sm{font-size:11.5px;color:var(--muted,#667);margin-top:2px}.er-ok{padding:12px;border-radius:10px;background:var(--good-soft,#DDF1E6);color:var(--good,#1B7A4B);font-weight:600}' +
    '.er-pill{display:inline-block;padding:1px 9px;border-radius:99px;font-weight:700;font-size:12px;background:var(--surface2,#eee);color:var(--muted,#667)}.er-pill.good{background:var(--good-soft,#DDF1E6);color:var(--good,#1B7A4B)}.er-pill.acc{background:var(--accent-soft,#E2ECFA);color:var(--accent,#1D5FBF)}.er-pill.warn{background:var(--warn-soft,#FBEBCF);color:var(--warn,#A65F00)}.er-pill.bad{background:var(--bad-soft,#F9E0DD);color:var(--bad,#B0302A)}' +
    '.er-nt{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px;line-height:1.55}.er-units{display:flex;flex-direction:column;gap:9px}.er-u{display:grid;grid-template-columns:minmax(90px,1.1fr) 2fr minmax(110px,1fr);gap:10px;align-items:center}.er-un{font-weight:600;overflow-wrap:anywhere}.er-cc{display:inline-block;font-size:11px;font-weight:700;padding:0 7px;border-radius:99px;background:var(--accent-soft,#E2ECFA);color:var(--accent,#1D5FBF);margin-right:2px}' +
    '.er-ub{position:relative;height:12px;border-radius:99px;background:var(--surface2,#eee)}.er-ub i{display:block;height:100%;border-radius:99px;background:var(--good,#1B7A4B)}.er-ub i.warn{background:var(--warn,#A65F00)}.er-ub i.bad{background:var(--bad,#B0302A)}.er-ub b{position:absolute;top:-3px;width:2px;height:18px;background:var(--ink,#222);opacity:.55}' +
    '.er-uv b{font-size:15px}.er-uv span{font-size:11.5px;color:var(--muted,#667)}@media (max-width:560px){.er-u{grid-template-columns:1fr 1fr}.er-ub{grid-column:1/-1;order:3}}' +
    '.er-bar{height:12px;border-radius:99px;background:var(--surface2,#eee);overflow:hidden}.er-bar i{display:block;height:100%;background:var(--c-me);border-radius:99px}.er-pl{display:flex;justify-content:space-between;gap:8px;margin-top:6px;flex-wrap:wrap}.er-pl span{color:var(--muted,#667)}' +
    '.er-list{list-style:none;margin:10px 0 0;padding:0}.er-list li{display:grid;grid-template-columns:48px 1fr;gap:8px;padding:6px 0;border-bottom:1px solid var(--line,#ddd)}.er-list li:last-child{border-bottom:0}.er-list .d{font-weight:700;font-variant-numeric:tabular-nums}' +
    '.er-note{border-left:3px solid var(--line,#ddd);padding:2px 0 2px 10px;margin-top:8px}.er-note p{margin:2px 0 0;white-space:pre-wrap;overflow-wrap:anywhere}' +
    '.er-an{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.75}.er-empty{color:var(--muted,#667);padding:14px 0;text-align:center}';

  window.EdenReport = { render: render, css: css };
})();
