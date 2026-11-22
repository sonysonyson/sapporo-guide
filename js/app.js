(function () {
  'use strict';

  var FEAT = window.FEATURES || {};
  var GUIDE_ID =new URLSearchParams(location.search).get('guideId') || 'sapporo-001';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  var S = { guide: null, plans: [], pois: {}, planIdx: 1, day: 1, maps: {} };

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
    $('#fabWrap').hidden = view !== 'main' || !FEAT.itinerary;
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
    $('#btnMyPlans').hidden = !FEAT.itinerary;
    // FAB가 없으면 하단 여백 축소
    $('.bottom-spacer').style.height = FEAT.itinerary ? '' : '24px';
    if (FEAT.itinerary) updateBadge();
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
    $('#guideMeta').hidden = !FEAT.guideMeta;
    if (!FEAT.guideMeta) return;
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
      if (e.target.closest('.poi-card__add')) { e.stopPropagation(); if (FEAT.itinerary) startAddPoi(poiId, S.day); return; }
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
        (FEAT.itinerary ? '<button class="poi-card__add"' + (closed ? ' disabled' : '') + '>' + t('course.add') + '</button>' : '') + '</li>';
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
      (FEAT.itinerary
        ? '<div class="sheet__actions"><button class="btn btn--ghost" data-act="close">' + t('modal.cancel') + '</button>' +
          '<button class="btn btn--primary" data-act="add"' + (closed ? ' disabled style="opacity:.4"' : '') + '>' + t('sheet.addToPlan') + '</button></div>'
        : '<button class="btn btn--ghost btn--block" data-act="close" style="margin-top:16px">' + t('sheet.close') + '</button>');
    $('#sheetOverlay').hidden = false;
    $('#poiSheet').onclick = function (e) {
      var a = e.target.closest('[data-act]'); if (!a) return;
      closeSheet();
      if (a.dataset.act === 'add' && FEAT.itinerary) startAddPoi(poiId, dayNum || S.day);
    };
  }
  function closeSheet() { $('#sheetOverlay').hidden = true; }

  /* ============ 모달 ============ */
  function openModal(html, onAct) {
    $('#modal').innerHTML = html;
    $('#modalOverlay').hidden = false;
    $('#modal').onclick = function (e) { var a = e.target.closest('[data-act]'); if (a && !a.disabled) onAct(a.dataset.act, a); };
    var first = $('#modal input'); if (first) setTimeout(function () { first.focus(); }, 50);
  }
  function closeModal() { $('#modalOverlay').hidden = true; }
  var LOCAL_NOTICE = function () { return '<p class="local-notice">💾 <span>' + t('local.notice') + '</span></p>'; };

  function updateBadge() {
    var n = Itin.list().length, b = $('#myPlansBadge');
    b.hidden = !n; b.textContent = n;
  }

  /* ---- 새 일정 만들기 (이름 + 출발일) ---- */
  function openCreate(opts) {
    // opts: { plan?: 복사할 추천 플랜, poiId?, dayNum? : 만들면서 바로 담을 장소 }
    var defName = t('create.defaultName') + (opts.plan ? ' ' + opts.plan.label : '');
    openModal(
      '<h3>' + t('create.title') + '</h3>' +
      (opts.plan ? '<p>' + esc(t('create.fromPlan', { plan: opts.plan.label + ' ' + opts.plan.subtitle })) + '</p>' : '<p></p>') +
      '<label class="field"><span>' + t('create.name') + '</span><input id="fName" maxlength="40" value="' + esc(defName) + '"></label>' +
      '<label class="field"><span>' + t('create.start') + '</span><input id="fStart" type="date"></label>' +
      '<p class="hint">' + t('create.startHint') + '</p>' + LOCAL_NOTICE() +
      '<div class="modal__actions"><button class="btn btn--primary btn--block" data-act="create">' + t('modal.create') + '</button>' +
      '<button class="btn btn--ghost btn--block" data-act="close">' + t('modal.cancel') + '</button></div>',
      function (act) {
        if (act !== 'create') return closeModal();
        var title = $('#fName').value.trim() || defName, start = $('#fStart').value;
        var days = opts.plan
          ? opts.plan.days.map(function (d) {
              return { day: d.day, items: d.items.filter(function (it) { return S.pois[it.poi].status !== 'closed'; }).map(function (it) { return it.poi; }) };
            })
          : [{ day: 1, items: [] }];
        var it = Itin.create({ title: title, startDate: start, days: days,
          source: opts.plan ? { guideId: S.guide.guideId, planId: opts.plan.planId, planLabel: opts.plan.label } : null });
        if (!it) { closeModal(); return toast(t('toast.storageFail')); }
        closeModal(); updateBadge();
        if (opts.poiId) return pickDay(it.id, opts.poiId);
        toast(t('toast.copied', { plan: title }));
        openMyPlans(it.id);
      });
  }

  /* ---- 개별 장소 일정 담기: 일정 선택 → Day 선택 ---- */
  function startAddPoi(poiId, dayNum) {
    track('click_poi_add_schedule', { guide_id: S.guide.guideId, poi_id: poiId, day_num: dayNum });
    var list = Itin.list();
    if (!list.length) return openCreate({ poiId: poiId, dayNum: dayNum });
    openModal(
      '<h3>' + t('modal.selectPlan') + '</h3><p>' + esc(S.pois[poiId].name) + '</p>' +
      '<div class="plan-opts">' + list.map(function (it) {
        return '<button class="plan-opt" data-act="pick" data-id="' + it.id + '"><strong>' + esc(it.title) + '</strong><span>' +
          esc(it.startDate ? it.startDate.replace(/-/g, '.') : t('my.noStart')) + ' · Day ' + it.days.length + '</span></button>';
      }).join('') +
      '<button class="plan-opt" data-act="new"><strong>' + t('modal.newPlan') + '</strong></button></div>' +
      '<button class="btn btn--ghost btn--block" data-act="close">' + t('modal.cancel') + '</button>',
      function (act, el) {
        if (act === 'close') return closeModal();
        if (act === 'new') return openCreate({ poiId: poiId, dayNum: dayNum });
        pickDay(el.dataset.id, poiId);
      });
  }
  function pickDay(itId, poiId) {
    var it = Itin.get(itId);
    openModal(
      '<h3>' + t('modal.selectDay') + '</h3><p>' + esc(it.title) + ' · ' + esc(S.pois[poiId].name) + '</p>' +
      '<div class="day-pick">' + it.days.map(function (d) {
        return '<button class="day-chip" data-act="day" data-day="' + d.day + '">' + esc(Itin.dayLabel(it, d.day)) + '</button>';
      }).join('') +
      '<button class="day-chip" data-act="newday">' + t('modal.newDay') + '</button></div>' +
      '<button class="btn btn--ghost btn--block" data-act="close">' + t('modal.cancel') + '</button>',
      function (act, el) {
        if (act === 'close') return closeModal();
        var day = act === 'newday' ? it.days.length ? it.days[it.days.length - 1].day + 1 : 1 : +el.dataset.day;
        var r = Itin.addPoi(itId, day, poiId);
        closeModal(); updateBadge();
        toast(r ? t('toast.added', { plan: it.title, day: 'Day ' + day, poi: S.pois[poiId].name }) : t('toast.storageFail'));
      });
  }

  /* ---- 내 일정 시트: 확인·편집·내보내기 ---- */
  function openMyPlans(openId) {
    var list = Itin.list();
    $('#poiSheet').innerHTML =
      '<div class="sheet__grab"></div><div class="sheet__head"><h3>' + t('my.title') + '</h3>' +
      '<button class="icon-btn" data-act="close" aria-label="' + t('modal.cancel') + '"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
      LOCAL_NOTICE() +
      (list.length ? list.map(function (it) { return planCard(it, it.id === openId || list.length === 1); }).join('')
        : '<div class="my-empty">' + t('my.empty') + '</div>') +
      '<button class="btn btn--primary btn--block" data-act="new" style="margin-top:6px">' + t('modal.newPlan') + '</button>';
    $('#sheetOverlay').hidden = false;
    $('#poiSheet').onclick = onMyPlansClick;
    $('#poiSheet').onchange = function (e) {
      if (e.target.dataset.start === undefined) return;
      Itin.update(e.target.dataset.start, { startDate: e.target.value });
      openMyPlans(e.target.dataset.start);
    };
  }
  function planCard(it, open) {
    var count = it.days.reduce(function (n, d) { return n + d.items.length; }, 0);
    return '<details class="my-plan"' + (open ? ' open' : '') + '><summary><div class="my-plan__title"><strong>' + esc(it.title) + '</strong><span>' +
      esc(it.startDate ? it.startDate.replace(/-/g, '.') : t('my.noStart')) + ' · Day ' + it.days.length + ' · ' + t('my.items', { n: count }) +
      '</span></div></summary><div class="my-plan__body">' +
      '<label class="my-plan__date">📅 ' + t('create.start') + ' <input type="date" data-start="' + it.id + '" value="' + esc(it.startDate) + '"></label>' +
      it.days.map(function (d) {
        return '<div class="my-day"><h5>' + esc(Itin.dayLabel(it, d.day)) + '</h5><ol>' +
          (d.items.length ? d.items.map(function (pid, i) {
            var p = S.pois[pid] || { name: pid, category: '' };
            return '<li><b>' + (i + 1) + '</b><span>' + esc(p.name) + ' <em>' + esc(p.category) + '</em></span>' +
              '<button class="link-btn" data-act="rm" data-id="' + it.id + '" data-day="' + d.day + '" data-idx="' + i + '">' + t('my.removeItem') + '</button></li>';
          }).join('') : '<li><em>' + t('my.emptyDay') + '</em></li>') + '</ol></div>';
      }).join('') +
      '<div class="export-row">' +
      '<button class="chip-btn" data-act="exp" data-fmt="text" data-id="' + it.id + '">📋 ' + t('export.text') + '</button>' +
      '<button class="chip-btn" data-act="exp" data-fmt="share" data-id="' + it.id + '">📤 ' + t('export.share') + '</button>' +
      '<button class="chip-btn" data-act="exp" data-fmt="ics" data-id="' + it.id + '"' + (it.startDate ? '' : ' disabled title="' + esc(t('export.icsNeedDate')) + '"') + '>📅 ' + t('export.ics') + '</button>' +
      '<button class="chip-btn" data-act="exp" data-fmt="json" data-id="' + it.id + '">💾 ' + t('export.json') + '</button></div>' +
      '<div class="my-plan__foot"><button class="link-btn" data-act="addday" data-id="' + it.id + '">' + t('modal.newDay') + '</button>' +
      '<button class="link-btn link-btn--danger" data-act="del" data-id="' + it.id + '">' + t('my.remove') + '</button></div>' +
      '</div></details>';
  }
  function onMyPlansClick(e) {
    var a = e.target.closest('[data-act]'); if (!a || a.disabled) return;
    var id = a.dataset.id, act = a.dataset.act;
    if (act === 'close') return closeSheet();
    if (act === 'new') { closeSheet(); return openCreate({}); }
    if (act === 'rm') { Itin.removePoi(id, +a.dataset.day, +a.dataset.idx); return openMyPlans(id); }
    if (act === 'addday') { Itin.addDay(id); return openMyPlans(id); }
    if (act === 'del') {
      var it = Itin.get(id);
      if (!confirm(t('my.deleteConfirm', { plan: it.title }))) return;
      Itin.remove(id); updateBadge(); toast(t('toast.deleted')); return openMyPlans();
    }
    if (act === 'exp') exportPlan(id, a.dataset.fmt);
  }
  function exportPlan(id, fmt) {
    var it = Itin.get(id), name = Itin.safeName(it.title);
    track('click_export_itinerary', { guide_id: S.guide.guideId, itinerary_id: id, format: fmt });
    if (fmt === 'text') return copyText(Itin.toText(it, S.pois)).then(function () { toast(t('toast.textCopied')); });
    if (fmt === 'share') {
      var text = Itin.toText(it, S.pois);
      if (navigator.share) return navigator.share({ title: it.title, text: text }).catch(function () {});
      return copyText(text).then(function () { toast(t('toast.textCopied')); });
    }
    if (fmt === 'ics') {
      var ics = Itin.toICS(it, S.pois);
      if (!ics) return toast(t('export.icsNeedDate'));
      Itin.download(name + '.ics', 'text/calendar', ics); return toast(t('toast.downloaded'));
    }
    if (fmt === 'json') { Itin.download(name + '.json', 'application/json', Itin.toJSON(it, S.pois)); toast(t('toast.downloaded')); }
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
    API.toggleBookmark(S.guide.guideId).then(function (r) {
      S.guide.bookmarked = r.bookmarked;
      $('#btnBookmark').setAttribute('aria-pressed', String(r.bookmarked));
      toast(t(r.bookmarked ? 'toast.bookmarkOn' : 'toast.bookmarkOff'));
    });
  }
  function onFab() {
    if (!FEAT.itinerary) return;
    track('click_copy_full_course', { guide_id: S.guide.guideId, plan_id: curPlan().planId });
    openCreate({ plan: curPlan() });
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
    $('#btnMyPlans').onclick = function () { if (FEAT.itinerary) openMyPlans(); };
    $('#btnRetry').onclick = load;
    $('#btnCloseMap').onclick = closeFullMap;
    $('#sheetOverlay').onclick = function (e) { if (e.target === this) closeSheet(); };
    $('#modalOverlay').onclick = function (e) { if (e.target === this) closeModal(); };
    // 다른 탭에서 일정이 바뀌면 배지 동기화
    window.addEventListener('storage', function (e) { if (e.key && e.key.indexOf('sg.itineraries') === 0) updateBadge(); });
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
