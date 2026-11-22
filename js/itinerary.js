/**
 * 내 일정 — 로그인 없이 "접속한 브라우저(localStorage)" 기준으로 저장·내보내기
 * 데이터 모델:
 *   { id, title, startDate: 'YYYY-MM-DD' | '', source: { guideId, planId, planLabel } | null,
 *     days: [ { day: 1, items: ['poiId', ...] } ], createdAt, updatedAt }
 * 서버 저장 없음 → 같은 링크로 들어온 사람마다 각자의 일정이 생기고, 내보내기로 공유한다.
 */
(function () {
  var KEY = 'sg.itineraries.v1';

  function read() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function write(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { return false; }
  }
  function now() { return new Date().toISOString(); }
  function find(list, id) { return list.filter(function (x) { return x.id === id; })[0]; }
  function mutate(id, fn) {
    var list = read(), it = find(list, id);
    if (!it) return null;
    fn(it); it.updatedAt = now(); write(list); return it;
  }
  function ensureDay(it, dayNum) {
    var d = it.days.filter(function (x) { return x.day === dayNum; })[0];
    if (!d) { d = { day: dayNum, items: [] }; it.days.push(d); it.days.sort(function (a, b) { return a.day - b.day; }); }
    return d;
  }
  function addDays(iso, n) {
    var p = iso.split('-').map(Number), d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + n));
    return d.toISOString().slice(0, 10);
  }
  var WEEK = ['일', '월', '화', '수', '목', '금', '토'];
  function dayLabel(it, dayNum) {
    if (!it.startDate) return 'Day ' + dayNum;
    var iso = addDays(it.startDate, dayNum - 1), w = WEEK[new Date(iso + 'T00:00:00Z').getUTCDay()];
    return 'Day ' + dayNum + ' · ' + iso.slice(5).replace('-', '/') + '(' + w + ')';
  }

  /* ---------- 내보내기 포맷 ---------- */
  function toText(it, pois) {
    var lines = ['🗓️ ' + it.title];
    if (it.startDate) lines.push('출발일: ' + it.startDate.replace(/-/g, '.'));
    it.days.forEach(function (d) {
      lines.push('', '■ ' + dayLabel(it, d.day));
      if (!d.items.length) lines.push('  (비어 있음)');
      d.items.forEach(function (pid, i) {
        var p = pois[pid] || { name: pid, category: '' };
        lines.push('  ' + (i + 1) + '. ' + p.name + (p.category ? ' (' + p.category + ')' : ''));
      });
    });
    lines.push('', '— 삿포로 여행 가이드에서 만든 일정');
    return lines.join('\n');
  }

  function icsEsc(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  // RFC 5545: 한 줄 75 octet 초과 시 접기 (UTF-8 기준)
  function fold(line) {
    var out = [], cur = '', bytes = 0, limit = 75;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i], b = new TextEncoder().encode(ch).length;
      if (bytes + b > limit) { out.push(cur); cur = ' '; bytes = 1; limit = 75; }
      cur += ch; bytes += b;
    }
    out.push(cur);
    return out.join('\r\n');
  }
  function toICS(it, pois) {
    if (!it.startDate) return null;
    var stamp = now().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//sapporo-guide//itinerary//KO', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:' + icsEsc(it.title)];
    it.days.forEach(function (d) {
      var start = addDays(it.startDate, d.day - 1).replace(/-/g, ''), end = addDays(it.startDate, d.day).replace(/-/g, '');
      var names = d.items.map(function (pid, i) { return (i + 1) + '. ' + ((pois[pid] || {}).name || pid); });
      L.push('BEGIN:VEVENT',
        'UID:' + it.id + '-d' + d.day + '@sapporo-guide',
        'DTSTAMP:' + stamp,
        'DTSTART;VALUE=DATE:' + start,
        'DTEND;VALUE=DATE:' + end,
        'SUMMARY:' + icsEsc(it.title + ' · Day ' + d.day),
        'DESCRIPTION:' + icsEsc(names.join('\n') || '(비어 있음)'),
        'LOCATION:' + icsEsc('Sapporo, Hokkaido, Japan'),
        'END:VEVENT');
    });
    L.push('END:VCALENDAR');
    return L.map(fold).join('\r\n') + '\r\n';
  }
  function toJSON(it, pois) {
    return JSON.stringify({
      format: 'sapporo-guide-itinerary', version: 1, exportedAt: now(),
      itinerary: Object.assign({}, it, {
        days: it.days.map(function (d) {
          return { day: d.day, items: d.items.map(function (pid) {
            var p = pois[pid] || {};
            return { poiId: pid, name: p.name, category: p.category, lat: p.lat, lng: p.lng };
          }) };
        })
      })
    }, null, 2);
  }
  function download(filename, mime, content) {
    var blob = new Blob([content], { type: mime + ';charset=utf-8' });
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function safeName(s) { return String(s).replace(/[\\/:*?"<>|]+/g, '_').trim() || 'itinerary'; }

  window.Itin = {
    list: function () { return read().sort(function (a, b) { return b.updatedAt.localeCompare(a.updatedAt); }); },
    get: function (id) { return find(read(), id) || null; },
    create: function (o) {
      var list = read(), t = now();
      var it = { id: 'it-' + Date.now().toString(36), title: o.title, startDate: o.startDate || '', source: o.source || null,
        days: o.days && o.days.length ? o.days : [{ day: 1, items: [] }], createdAt: t, updatedAt: t };
      list.push(it);
      return write(list) ? it : null;
    },
    update: function (id, patch) { return mutate(id, function (it) { Object.assign(it, patch); }); },
    remove: function (id) { write(read().filter(function (x) { return x.id !== id; })); },
    addPoi: function (id, dayNum, poiId) { return mutate(id, function (it) { ensureDay(it, dayNum).items.push(poiId); }); },
    removePoi: function (id, dayNum, idx) {
      return mutate(id, function (it) { var d = ensureDay(it, dayNum); d.items.splice(idx, 1); });
    },
    addDay: function (id) { return mutate(id, function (it) { ensureDay(it, it.days.length ? it.days[it.days.length - 1].day + 1 : 1); }); },
    dayLabel: dayLabel,
    toText: toText, toICS: toICS, toJSON: toJSON, download: download, safeName: safeName
  };
})();
