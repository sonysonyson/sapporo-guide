(function () {
  'use strict';

  var GUIDE_ID = new URLSearchParams(location.search).get('guideId') || 'sapporo-001';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  var S = { guide: null, plans: [], pois: {}, planIdx: 1, day: 1, pending: null, maps: {} };

  var TABS = [
    { id: 'sec-info', key: 'tab.info' },
    { id: 'sec-spots', key: 'tab.spots' },
    { id: 'sec-course', key: 'tab.course' },
    { id: 'sec-stay', key: 'tab.stay' },
    { id: 'sec-tour', key: 'tab.tour' },
    { id: 'sec-check', key: 'tab.check' },
    { id: 'sec-food', key: 'tab.food' }
  ];

  /* ============ 공통 ============ */
  function applyStaticI18n() {
    $$('[data-i18n]').forEach(function (el) { el.textContent = t(el.dataset.i18n); });
    $$('[data-i18n-aria]').forEach(function (el) { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  }
  var toastTimer;
  function toast(msg) {
    var el = $('#toast');
    el.textContent = msg; el.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('is-show'); }, 2200);
  }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {} ta.remove(); return Promise.resolve();
  }
  function lsGet(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function fmtDate(iso) { return iso.replace(/-/g, '.'); }

  function show(view) {
    $('#viewLoading').hidden = view !== 'loading';
    $('#viewError').hidden = view !== 'error';
    $('#viewMain').hidden = view !== 'main';
    $('#fabWrap').hidden = view !== 'main';
    $('#navbar').classList.toggle('is-solid', view !== 'main' || window.scrollY > 10);
  }

  /* ============ 로딩 ============ */
  function load() {
    show('loading');
    Promise.all([API.getGuide(GUIDE_ID), API.getCourses(GUIDE_ID)])
      .then(function (res) {
        S.guide = res[0]; S.plans = res[1].plans; S.pois = res[1].pois;
        renderAll();
        show('main');
        drawMap('mini'); // 컨테이너가 보인 뒤 다시 맞춰야 fitBounds 크기가 정확함
        onScroll();
        track('view_guide_detail', { guide_id: S.guide.guideId, region_code: S.guide.regionCode, referrer: document.referrer || 'direct' });
      })
      .catch(function () { show('error'); });
  }

  function renderAll() {
    var g = S.guide;
    document.title = g.title;
    $('#navTitle').textContent = g.title;
    $('#btnBookmark').setAttribute('aria-pressed', String(!!g.bookmarked));
    renderCover(); renderTitle(); renderSummary(); renderTabs();
    renderInfo(); renderSpots(); renderCourse(); renderStay(); renderTour(); renderCheck(); renderFood();
    $('#btnFab').textContent = t('fab.copy');
  }

  /* ============ 4.1 커버 / 타이틀 ============ */
  function renderCover() {
    var g = S.guide, el = $('#cover');
    if (g.coverImage) {
      el.innerHTML = '<img src="' + esc(g.coverImage) + '" alt="">';
      $('img', el).onerror = function () { el.innerHTML = placeholderCover(); };
    } else el.innerHTML = placeholderCover();
  }
  function placeholderCover() {
    var flakes = '';
    for (var i = 0; i < 40; i++) {
      var x = (i * 37) % 100, y = (i * 53) % 100, r = 0.4 + (i % 4) * 0.35;
      flakes += '<circle cx="' + x + '%" cy="' + y + '%" r="' + r + '" fill="#fff" opacity="' + (0.35 + (i % 3) * 0.2) + '"/>';
    }
    return '<div class="cover__placeholder"><svg preserveAspectRatio="none" viewBox="0 0 100 56">' +
      '<path d="M0 56 L0 40 L18 28 L30 36 L46 20 L62 34 L74 26 L100 42 L100 56 Z" fill="#eef4fb" opacity=".9"/>' +
      '<path d="M0 56 L0 46 L22 38 L40 46 L60 36 L80 44 L100 38 L100 56 Z" fill="#fff"/>' +
      '</svg><svg>' + flakes + '</svg><span>' + esc(t('cover.placeholder')) + '</span></div>';
  }
  function renderTitle() {
    var g = S.guide;
    $('#regionTag').textContent = g.regionTag;
    $('#guideTitle').textContent = g.title;
    $('#guideTitle').title = g.title;
    $('#guideMeta').innerHTML = '<i>' + esc(fmtDate(g.createdAt)) + '</i><i>·</i><i>' +
      esc(t('meta.views', { n: g.viewCount.toLocaleString('ko-KR') })) + '</i><i>·</i><i>' + esc(g.editor.name) + '</i>';
  }

  /* ============ 4.2 요약 / 앵커 탭 ============ */
  function renderSummary() {
    var s = S.guide.summary;
    $('#summaryCard').innerHTML =
      '<dl class="summary-grid">' +
      '<div><dt>' + t('summary.season') + '</dt><dd>' + esc(s.season) + '</dd></div>' +
      '<div><dt>' + t('summary.duration') + '</dt><dd>' + esc(s.duration) + '</dd></div>' +
      '<div><dt>' + t('summary.budget') + '</dt><dd>' + esc(s.budget) + '<small>' + esc(s.budgetNote) + '</small></dd></div>' +
      '</dl><div class="tags">' + s.tags.map(function (x) { return '<span class="tag">' + esc(x) + '</span>'; }).join('') + '</div>';
  }
  function renderTabs() {
    var nav = $('#anchorTabs');
    nav.innerHTML = TABS.map(function (tb) { return '<button data-target="' + tb.id + '">' + t(tb.key) + '</button>'; }).join('');
    nav.onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return;
      document.getElementById(b.dataset.target).scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  }
  function setActiveTab(id) {
    var nav = $('#anchorTabs');
    $$('button', nav).forEach(function (b) {
      var on = b.dataset.target === id;
      if (on && !b.classList.contains('is-active')) {
        // 탭 바만 가로로 이동 (페이지 세로 스크롤에는 영향 없음)
        nav.scrollTo({ left: b.offsetLeft - (nav.clientWidth - b.offsetWidth) / 2, behavior: 'smooth' });
      }
      b.classList.toggle('is-active', on);
    });
  }

  /* ============ 4.0.1 기본 정보 ============ */
  function checks(arr) { return '<ul class="checks">' + arr.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; }
  function renderInfo() {
    var b = S.guide.basicInfo, d = b.flightDeal;
    var expired = new Date() > new Date(d.until + 'T23:59:59');
    $('#sec-info').innerHTML =
      '<h2 class="section__title">' + t('sec.info') + '</h2>' +
      '<h3 class="sub-title">📍 ' + t('info.location') + '</h3>' + checks(b.location) +
      (expired ? '' :
        '<div class="deal"><div class="deal__body"><a class="deal__link" href="' + esc(d.url) + '">⏭️ ' + esc(d.label) + '</a>' +
        '<div class="deal__code">' + t('deal.until', { date: d.until.slice(5).replace('-', '/') }) + ' <b>' + esc(d.code) + '</b></div></div>' +
        '<button class="chip-btn" id="btnCopyCode">' + t('deal.copy') + '</button></div>') +
      '<h3 class="sub-title">🚆 ' + t('info.airport') + '</h3>' + checks(b.airport) +
      '<h3 class="sub-title">💳 ' + t('info.transit') + '</h3>' +
      '<p class="plan-info" style="margin:0 0 8px">' + t('info.transitDesc') + '</p>' +
      '<div class="pill-row">' + b.transit.map(function (x) { return '<span class="pill">' + esc(x) + '</span>'; }).join('') + '</div>' +
      '<h3 class="sub-title">💡 ' + t('info.tip') + '</h3><div class="callout">' + esc(b.tip) + '</div>';
    var btn = $('#btnCopyCode');
    if (btn) btn.onclick = function () { copyText(d.code).then(function () { toast(t('deal.copied')); }); };
  }

  /* ============ 4.0.2 명소 ============ */
  function renderSpots() {
    var sp = S.guide.spots;
    $('#sec-spots').innerHTML =
      '<h2 class="section__title">' + t('sec.spots') + '</h2>' +
      '<h3 class="sub-title">🏙️ ' + t('spots.city') + '</h3><div class="spot-list">' +
      sp.city.map(function (id) {
        var p = S.pois[id];
        return '<button class="spot" data-poi="' + id + '"><span class="spot__icon">' + p.icon + '</span><span><strong>' +
          esc(sp.cityLabels[id] || p.name) + '</strong><span>' + esc(sp.cityDesc[id] || p.reason) + '</span></span></button>';
      }).join('') + '</div>' +
      '<h3 class="sub-title">🚌 ' + t('spots.nearby') + '</h3><div class="h-scroll">' +
      sp.nearby.map(function (n) {
        return '<div class="nearby"><div class="nearby__icon">' + n.icon + '</div><strong>' + esc(n.name) + '</strong><p>' + esc(n.desc) + '</p></div>';
      }).join('') + '</div>';
    $('#sec-spots').onclick = function (e) {
      var b = e.target.closest('[data-poi]'); if (b) openSheet(b.dataset.poi, null);
    };
  }

  /* ============ 4.3 추천 코스 + 지도 ============ */
  function curPlan() { return S.plans[S.planIdx]; }
  function curDay() { return curPlan().days.find(function (d) { return d.day === S.day; }) || curPlan().days[0]; }

  function renderCourse() {
    var sec = $('#sec-course');
    sec.innerHTML =
      '<h2 class="section__title">' + t('sec.course') + '</h2>' +
      '<div class="seg" id="planSeg">' + S.plans.map(function (p, i) {
        return '<button data-i="' + i + '">' + esc(p.label) + '<small>' + esc(p.subtitle) + '</small></button>';
      }).join('') + '</div>' +
      '<div class="plan-info" id="planInfo"></div>' +
      '<div class="day-chips" id="dayChips" role="tablist"></div>' +
      '<div class="mini-map" id="miniMap" role="button" aria-label="' + t('course.mapExpand') + '">' +
      '<div class="map-canvas" id="miniMapCanvas"></div><div class="mini-map__shield"></div>' +
      '<span class="mini-map__expand">⤢ ' + t('course.mapExpand') + '</span></div>' +
      '<p class="choice-hint" id="choiceHint" hidden>' + t('course.choiceDay') + '</p>' +
      '<ol class="poi-list" id="poiList"></ol>';

    $('#planSeg').onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return;
      S.planIdx = +b.dataset.i; S.day = 1; updateCourse();
    };
    $('#dayChips').onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return;
      S.day = +b.dataset.day; updateCourse();
    };
    $('#miniMap').onclick = openFullMap;
    $('#poiList').onclick = function (e) {
      var card = e.target.closest('.poi-card'); if (!card) return;
      var poiId = card.dataset.poi;
      if (e.target.closest('.poi-card__add')) { e.stopPropagation(); startAddPoi(poiId, S.day); return; }
      openSheet(poiId, S.day);
    };
    updateCourse();
  }

  function updateCourse() {
    var plan = curPlan(), day = curDay();
    $$('#planSeg button').forEach(function (b, i) { b.classList.toggle('is-active', i === S.planIdx); });
    $('#planInfo').innerHTML = '✔️ <b>' + t('course.target') + ':</b> ' + esc(plan.target) +
      plan.notes.map(function (n) { return '<div class="note">' + esc(n) + '</div>'; }).join('');
    $('#dayChips').innerHTML = plan.days.map(function (d) {
      return '<button class="day-chip' + (d.day === S.day ? ' is-active' : '') + '" role="tab" data-day="' + d.day + '">' + t('course.day', { n: d.day }) + '</button>';
    }).join('');
    $('#choiceHint').hidden = !day.choice;

    var no = 0;
    $('#poiList').innerHTML = day.items.map(function (it) {
      var p = S.pois[it.poi], closed = p.status === 'closed', alt = it.alt || day.choice;
      no++;
      return '<li class="poi-card' + (closed ? ' is-closed' : '') + (it.alt ? ' is-alt' : '') + '" data-poi="' + it.poi + '" tabindex="0">' +
        '<span class="poi-card__no">' + no + '</span>' +
        '<div class="poi-card__thumb">' + p.icon + '</div>' +
        '<div class="poi-card__body"><div class="poi-card__head"><span class="poi-card__name">' + esc(p.name) + '</span>' +
        (alt ? '<span class="badge badge--alt">' + t('course.alt') + '</span>' : '') +
        (closed ? '<span class="badge badge--closed">' + t('course.closed') + '</span>' : '') + '</div>' +
        '<div class="poi-card__cat">' + esc(p.category) + (it.memo ? ' · ' + esc(it.memo) : '') + '</div>' +
        '<p class="poi-card__reason">' + esc(p.reason) + '</p></div>' +
        '<button class="poi-card__add"' + (closed ? ' disabled' : '') + '>' + t('course.add') + '</button></li>';
    }).join('');
    drawMap('mini');
  }

  /* ---- 지도 ---- */
  function dayPoints() {
    var day = curDay();
    return day.items.map(function (it, i) {
      var p = S.pois[it.poi];
      return { id: it.poi, no: i + 1, lat: p.lat, lng: p.lng, name: p.name, alt: !!it.alt || !!day.choice, closed: p.status === 'closed' };
    });
  }
  function routeOf(pts) {
    if (curDay().choice) return [];
    // 같은 좌표가 연속(공항→공항 등)인 경우도 그대로 연결
    return pts.filter(function (p) { return !p.alt; }).map(function (p) { return [p.lat, p.lng]; });
  }

  function drawMap(kind) {
    var canvasId = kind === 'mini' ? 'miniMapCanvas' : 'fullMapCanvas';
    var el = document.getElementById(canvasId), pts = dayPoints();
    if (!window.L) return drawFallback(el, pts);

    var m = S.maps[kind];
    if (!m || m._container !== el) {
      var interactive = kind === 'full';
      m = L.map(el, {
        zoomControl: interactive, dragging: interactive, scrollWheelZoom: interactive, doubleClickZoom: interactive,
        touchZoom: interactive, boxZoom: interactive, keyboard: interactive, attributionControl: true
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18, attribution: '&copy; OpenStreetMap'
      }).on('tileerror', function () { el.dataset.tileError = '1'; }).addTo(m);
      m._layer = L.layerGroup().addTo(m);
      S.maps[kind] = m;
    }
    m._layer.clearLayers();
    var route = routeOf(pts);
    if (route.length > 1) L.polyline(route, { color: '#2a6fdb', weight: 3, opacity: .85, dashArray: '6 6' }).addTo(m._layer);
    var seen = {};
    pts.forEach(function (p) {
      var key = p.lat + ',' + p.lng;
      var label = seen[key] ? seen[key] + '·' + p.no : String(p.no);
      seen[key] = label;
      var icon = L.divIcon({ className: '', iconSize: [26, 26], iconAnchor: [13, 26],
        html: '<div class="pin' + (p.alt ? ' is-alt' : '') + (p.closed ? ' is-closed' : '') + '"><span>' + label + '</span></div>' });
      var mk = L.marker([p.lat, p.lng], { icon: icon, zIndexOffset: p.no });
      if (kind === 'full') mk.bindTooltip(p.name, { direction: 'top', offset: [0, -24] }).on('click', function () { openSheet(p.id, S.day); });
      mk.addTo(m._layer);
    });
    m.invalidateSize();
    var bounds = L.latLngBounds(pts.map(function (p) { return [p.lat, p.lng]; }));
    if (bounds.getNorthEast().equals(bounds.getSouthWest())) m.setView(bounds.getCenter(), 14);
    else m.fitBounds(bounds, { padding: kind === 'mini' ? [28, 28] : [56, 56], maxZoom: 15 });
  }

  // Leaflet 로드 실패 시: 좌표를 SVG에 투영한 간략 경로
  function drawFallback(el, pts) {
    var lats = pts.map(function (p) { return p.lat; }), lngs = pts.map(function (p) { return p.lng; });
    var minLa = Math.min.apply(0, lats), maxLa = Math.max.apply(0, lats), minLn = Math.min.apply(0, lngs), maxLn = Math.max.apply(0, lngs);
    var W = 320, H = 180, pad = 24;
    var sx = function (v) { return maxLn === minLn ? W / 2 : pad + (v - minLn) / (maxLn - minLn) * (W - pad * 2); };
    var sy = function (v) { return maxLa === minLa ? H / 2 : H - pad - (v - minLa) / (maxLa - minLa) * (H - pad * 2); };
    var route = routeOf(pts).map(function (c) { return sx(c[1]) + ',' + sy(c[0]); }).join(' ');
    el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="100%">' +
      '<polyline points="' + route + '" fill="none" stroke="#2a6fdb" stroke-width="2" stroke-dasharray="5 5"/>' +
      pts.map(function (p) {
        return '<g transform="translate(' + sx(p.lng) + ',' + sy(p.lat) + ')"><circle r="10" fill="' + (p.alt ? '#8b95a3' : '#2a6fdb') + '" stroke="#fff" stroke-width="2"/>' +
          '<text text-anchor="middle" dy="4" font-size="10" font-weight="800" fill="#fff">' + p.no + '</text></g>';
      }).join('') +
      '<text x="8" y="' + (H - 8) + '" font-size="9" fill="#8b95a3">' + esc(t('map.fallback')) + '</text></svg>';
  }

  function openFullMap() {
    $('#fullMap').hidden = false;
    $('#fullMapTitle').textContent = curPlan().label + ' · ' + t('course.day', { n: S.day });
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { drawMap('full'); });
  }
  function closeFullMap() { $('#fullMap').hidden = true; document.body.style.overflow = ''; }

  /* ============ 장소 상세 바텀시트 ============ */
  function openSheet(poiId, dayNum) {
    var p = S.pois[poiId], closed = p.status === 'closed';
    $('#poiSheet').innerHTML =
      '<div class="sheet__grab"></div><div class="sheet__thumb">' + p.icon + '</div>' +
      '<h3>' + esc(p.name) + '</h3><div class="sheet__meta">' + esc(p.category) + ' · ' + esc(p.area) +
      (closed ? ' · <span class="badge badge--closed">' + t('course.closed') + '</span>' : '') + '</div>' +
      '<p>' + esc(p.reason) + '</p>' +
      (p.tip ? '<div class="callout"><b>' + t('sheet.tip') + '</b> ' + esc(p.tip) + '</div>' : '') +
      '<div class="sheet__actions"><button class="btn btn--ghost" data-act="close">' + t('modal.cancel') + '</button>' +
      '<button class="btn btn--primary" data-act="add"' + (closed ? ' disabled style="opacity:.4"' : '') + '>' + t('sheet.addToPlan') + '</button></div>';
    $('#sheetOverlay').hidden = false;
    $('#poiSheet').onclick = function (e) {
      var a = e.target.closest('[data-act]'); if (!a) return;
      closeSheet();
      if (a.dataset.act === 'add') startAddPoi(poiId, dayNum || S.day);
    };
  }
  function closeSheet() { $('#sheetOverlay').hidden = true; }

  /* ============ 로그인 체크 / 모달 ============ */
  function requireLogin(action) {
    if (API.isLoggedIn()) return action();
    S.pending = action; // 로그인 후 원래 화면·동작으로 복귀(Redirect)
    openModal(
      '<h3>' + t('login.title') + '</h3><p>' + t('login.desc') + '</p>' +
      '<div class="modal__actions"><button class="btn btn--primary btn--block" data-act="login">' + t('login.cta') + '</button>' +
      '<button class="btn btn--ghost btn--block" data-act="close">' + t('modal.cancel') + '</button></div>',
      function (act) {
        if (act === 'login') API.login().then(function () {
          closeModal(); toast(t('toast.loggedIn'));
          var fn = S.pending; S.pending = null; if (fn) setTimeout(fn, 300);
        });
        else { S.pending = null; closeModal(); }
      });
  }
  function openModal(html, onAct) {
    $('#modal').innerHTML = html;
    $('#modalOverlay').hidden = false;
    $('#modal').onclick = function (e) { var a = e.target.closest('[data-act]'); if (a) onAct(a.dataset.act, a); };
  }
  function closeModal() { $('#modalOverlay').hidden = true; }

  /* ---- 개별 장소 일정 담기 ---- */
  function startAddPoi(poiId, dayNum) {
    track('click_poi_add_schedule', { guide_id: S.guide.guideId, poi_id: poiId, day_num: dayNum });
    requireLogin(function () {
      API.getMyItineraries().then(function (list) {
        openModal(
          '<h3>' + t('modal.selectPlan') + '</h3><p>' + esc(S.pois[poiId].name) + '</p>' +
          '<div class="plan-opts">' + list.map(function (it) {
            return '<button class="plan-opt" data-act="pick" data-id="' + it.id + '" data-title="' + esc(it.title) + '"><strong>' +
              esc(it.title) + '</strong><span>' + esc(it.period) + '</span></button>';
          }).join('') +
          '<button class="plan-opt" data-act="new"><strong>' + t('modal.newPlan') + '</strong></button></div>' +
          '<button class="btn btn--ghost btn--block" data-act="close">' + t('modal.cancel') + '</button>',
          function (act, el) {
            if (act === 'close') return closeModal();
            var title = act === 'new' ? S.guide.regionTag.split('·').pop().trim() + ' 새 일정' : el.dataset.title;
            API.addPoi(el.dataset.id || 'new', poiId, dayNum).then(function () {
              closeModal(); toast(t('toast.added', { plan: title, poi: S.pois[poiId].name }));
            });
          });
      });
    });
  }

  /* ============ 4.0.4 숙소 / 4.0.5 투어 ============ */
  function renderStay() {
    var g = S.guide;
    $('#sec-stay').innerHTML = '<h2 class="section__title">' + t('sec.stay') + '</h2><div class="info-cards">' +
      g.stays.map(function (s) {
        return '<div class="info-card"><h4>🏨 ' + esc(s.area) + '</h4><dl>' +
          '<dt>' + t('stay.for') + '</dt><dd class="strong">' + esc(s.for) + '</dd>' +
          '<dt>' + t('stay.note') + '</dt><dd>' + esc(s.note) + '</dd>' +
          '<dt>' + t('stay.hotels') + '</dt><dd><div class="hotel-chips">' + s.hotels.map(function (h) { return '<span>' + esc(h) + '</span>'; }).join('') + '</div></dd>' +
          '</dl></div>';
      }).join('') + '</div><p class="note">' + esc(g.staysNote) + '</p>';
  }
  function renderTour() {
    var g = S.guide;
    $('#sec-tour').innerHTML = '<h2 class="section__title">' + t('sec.tour') + '</h2><div class="info-cards">' +
      g.tours.map(function (x) {
        return '<div class="info-card"><h4>' + esc(x.name) + '</h4><dl>' +
          '<dt>' + t('tour.fit') + '</dt><dd class="strong">' + esc(x.fit) + '</dd>' +
          '<dt>' + t('tour.pro') + '</dt><dd>' + esc(x.pro) + '</dd>' +
          '<dt>' + t('tour.check') + '</dt><dd>' + esc(x.check) + '</dd></dl></div>';
      }).join('') + '</div>' + g.toursNote.map(function (n) { return '<p class="note">' + esc(n) + '</p>'; }).join('');
  }

  /* ============ 4.0.6 준비물 체크리스트 ============ */
  function renderCheck() {
    var g = S.guide, saved = lsGet('sg.check.' + g.guideId, {});
    $('#sec-check').innerHTML = '<h2 class="section__title">' + t('sec.check') + '</h2>' +
      '<div class="check-progress"><div class="bar"><i id="checkBar"></i></div><span id="checkText"></span></div>' +
      g.checklist.map(function (grp) {
        return '<div class="check-group"><h3 class="sub-title">' + esc(grp.label) + '</h3>' +
          grp.items.map(function (it, i) {
            var k = grp.id + '-' + i;
            return '<label class="check-item"><input type="checkbox" data-k="' + k + '"' + (saved[k] ? ' checked' : '') + '><span>' + esc(it) + '</span></label>';
          }).join('') + '</div>';
      }).join('') + '<p class="note">' + esc(g.checklistNote) + '</p>';
    var update = function () {
      var boxes = $$('#sec-check input'), done = boxes.filter(function (b) { return b.checked; }).length;
      $('#checkBar').style.width = (done / boxes.length * 100) + '%';
      $('#checkText').textContent = t('check.progress', { done: done, total: boxes.length });
    };
    $('#sec-check').onchange = function (e) {
      if (!e.target.dataset.k) return;
      saved[e.target.dataset.k] = e.target.checked; lsSet('sg.check.' + g.guideId, saved); update();
    };
    update();
  }

  /* ============ 4.0.7 맛집 ============ */
  function renderFood() {
    var g = S.guide;
    $('#sec-food').innerHTML = '<h2 class="section__title">' + t('sec.food') + '</h2><div class="food-grid">' +
      g.foods.map(function (f) {
        return '<div class="food"><div class="food__icon">' + f.icon + '</div><strong>' + esc(f.kind) + '</strong><ul>' +
          f.shops.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul><p>' + esc(f.point) + '</p></div>';
      }).join('') + '</div>' +
      g.foodsNote.map(function (n) { return '<p class="note">' + esc(n) + '</p>'; }).join('') +
      '<p class="note">' + t('food.source') + ': <a href="' + esc(g.foodsSource.url) + '" target="_blank" rel="noopener">' + esc(g.foodsSource.label) + '</a></p>';
  }

  /* ============ 네비게이션 / FAB 동작 ============ */
  function onBack() {
    if (history.length > 1 && document.referrer) history.back();
    else toast(t('toast.noHistory'));
  }
  function onShare() {
    var g = S.guide;
    var webUrl = location.origin + location.pathname + '?guideId=' + encodeURIComponent(g.guideId);
    var deepLink = 'sapporoguide://guides/' + encodeURIComponent(g.guideId);
    var data = { title: g.title, text: g.title + '\n' + deepLink, url: webUrl };
    if (navigator.share) navigator.share(data).catch(function () {});
    else copyText(webUrl).then(function () { toast(t('toast.shareCopied')); });
  }
  function onBookmark() {
    var willAdd = !S.guide.bookmarked;
    track('click_guide_bookmark', { guide_id: S.guide.guideId, action_type: willAdd ? 'add' : 'remove' });
    requireLogin(function () {
      API.toggleBookmark(S.guide.guideId).then(function (r) {
        S.guide.bookmarked = r.bookmarked;
        $('#btnBookmark').setAttribute('aria-pressed', String(r.bookmarked));
        toast(t(r.bookmarked ? 'toast.bookmarkOn' : 'toast.bookmarkOff'));
      });
    });
  }
  function onFab() {
    track('click_copy_full_course', { guide_id: S.guide.guideId });
    requireLogin(function () {
      var plan = curPlan();
      API.copyItinerary(S.guide.guideId, plan.planId).then(function () {
        toast(t('toast.copied', { plan: plan.label + ' ' + plan.subtitle }));
      });
    });
  }

  /* ============ 스크롤: 네비 배경 전환 + 탭 스크롤스파이 ============ */
  var ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      if ($('#viewMain').hidden) return;
      var cover = $('#cover'), nav = $('#navbar');
      var threshold = cover.offsetHeight - nav.offsetHeight;
      nav.classList.toggle('is-solid', window.scrollY > threshold);
      var line = nav.offsetHeight + $('#anchorTabs').offsetHeight + 8, active = null;
      TABS.forEach(function (tb) {
        if (document.getElementById(tb.id).getBoundingClientRect().top - line <= 1) active = tb.id;
      });
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 2) active = TABS[TABS.length - 1].id;
      setActiveTab(active);
    });
  }

  /* ============ 바인딩 ============ */
  function bind() {
    $('#btnBack').onclick = onBack;
    $('#btnShare').onclick = onShare;
    $('#btnBookmark').onclick = onBookmark;
    $('#btnFab').onclick = onFab;
    $('#btnRetry').onclick = load;
    $('#btnCloseMap').onclick = closeFullMap;
    $('#sheetOverlay').onclick = function (e) { if (e.target === this) closeSheet(); };
    $('#modalOverlay').onclick = function (e) { if (e.target === this) { S.pending = null; closeModal(); } };
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeSheet(); closeModal(); closeFullMap(); }
      if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('poi-card')) openSheet(e.target.dataset.poi, S.day);
    });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { if (S.maps.mini) S.maps.mini.invalidateSize(); });
  }

  applyStaticI18n();
  bind();
  load();
})();
