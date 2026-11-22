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
  /**
   * 클립보드 복사 → Promise<boolean>. 절대 reject 하지 않음.
   * Clipboard API는 보안 컨텍스트(https/localhost)·권한이 필요하고 데스크톱 file:// 등에서 거부될 수 있어
   * 실패 시 execCommand 방식으로 재시도하고, 그래도 실패하면 안내 토스트를 띄운다.
   */
  function copyText(text) {
    function legacy() {
      var ta = document.createElement('textarea'), ok = false;
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0';
      document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove();
      if (!ok) toast(t('toast.copyFail'));
      return ok;
    }
    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, legacy);
    }
    return Promise.resolve(legacy());
  }
  function ifCopied(msgKey) { return function (ok) { if (ok) toast(t(msgKey)); }; }

  /**
   * 가로 스크롤 영역을 마우스로도 조작 가능하게: 세로 휠 → 가로 스크롤, 마우스 드래그, 양끝 페이드 표시.
   * (터치 기기는 기본 스와이프 그대로 사용)
   */
  function enableHScroll(el) {
    if (!el || el.dataset.hscroll) return;
    el.dataset.hscroll = '1';
    function edges() {
      var max = el.scrollWidth - el.clientWidth;
      el.classList.toggle('fade-l', el.scrollLeft > 2);
      el.classList.toggle('fade-r', max > 2 && el.scrollLeft < max - 2);
    }
    el.addEventListener('scroll', edges, { passive: true });
    window.addEventListener('resize', edges);
    el.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      var max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      // 끝에 닿으면 페이지 세로 스크롤로 넘김
      if ((e.deltaY < 0 && el.scrollLeft <= 0) || (e.deltaY > 0 && el.scrollLeft >= max - 1)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    }, { passive: false });
    var drag = null;
    el.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      drag = { x: e.clientX, left: el.scrollLeft, moved: false };
    });
    window.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) < 6) return;
      drag.moved = true; el.classList.add('is-dragging');
      el.scrollLeft = drag.left - dx;
    });
    window.addEventListener('pointerup', function () {
      if (!drag) return;
      var moved = drag.moved; drag = null; el.classList.remove('is-dragging');
      // 드래그 직후의 click(탭/칩 선택)은 무시
      if (!moved) return;
      var stop = function (ev) { ev.stopPropagation(); ev.preventDefault(); };
      el.addEventListener('click', stop, true);
      // click은 pointerup 직후 동기적으로 발생 → 다음 틱에 해제 (영역 밖에서 놓은 경우 다음 클릭을 삼키지 않도록)
      setTimeout(function () { el.removeEventListener('click', stop, true); }, 0);
    });
    requestAnimationFrame(edges);
  }
  function lsGet(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function fmtDate(iso) { return iso.replace(/-/g, '.'); }
  /* 한국 시간(KST, UTC+9) 기준 날짜 계산 — 보는 사람의 기기 시간대와 무관 */
  var KST_OFFSET = 9 * 3600000;
  function todayKST() { return new Date(Date.now() + KST_OFFSET).toISOString().slice(0, 10); }
  function daysLeftKST(untilIso) {
    // until 당일 = 0, 지나면 음수 (KST 자정 기준)
    return Math.round((Date.parse(untilIso + 'T00:00:00Z') - Date.parse(todayKST() + 'T00:00:00Z')) / 86400000);
  }
  function isExpiredKST(untilIso) { return Date.now() > Date.parse(untilIso + 'T23:59:59.999+09:00'); }
  function dday(untilIso) {
    var n = daysLeftKST(untilIso);
    return n > 0 ? 'D-' + n : n === 0 ? 'D-DAY' : t('deal.ended');
  }

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
    $('#btnBookmark').hidden = !FEAT.bookmark;
    $('#btnBookmark').setAttribute('aria-pressed', String(!!g.bookmarked));
    $('#btnSave').hidden = !FEAT.saveShortcut;
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
    enableHScroll(nav);
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
    // 유효기간(KST)이 지나도 카드·링크·코드는 유지하고 '할인 종료'로 표시
    var expired = isExpiredKST(d.until);
    var untilLabel = d.until.slice(5).replace('-', '/');
    $('#sec-info').innerHTML =
      '<h2 class="section__title">' + t('sec.info') + '</h2>' +
      '<h3 class="sub-title">📍 ' + t('info.location') + '</h3>' + checks(b.location) +
      (
        '<div class="deal' + (expired ? ' is-expired' : '') + '">' +
        '<a class="deal__top" id="dealLink" href="' + esc(d.url) + '" target="_blank" rel="noopener sponsored">' +
          '<span class="deal__plane" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M2.5 13.5l7-2 4.5-7.5 2 .5-2 7.5 5-1.5c1-.3 2 .4 2 1.4 0 .6-.4 1.1-1 1.3l-15.5 4.3-2-3.5z"/><path d="M4 20h16"/></svg></span>' +
          '<span class="deal__main">' +
            '<span class="deal__eyebrow">' + esc(d.partner) + ' · ' + t('deal.partner') + '</span>' +
            '<strong class="deal__title">' + esc(d.label) + '</strong>' +
            '<span class="deal__desc">' + esc(d.desc) + '</span>' +
          '</span>' +
          '<span class="deal__side"><span class="deal__dday">' + dday(d.until) + '</span>' +
          '<span class="deal__go" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 17L17 7M9 7h8v8"/></svg></span></span>' +
          '<span class="sr-only">' + t('deal.newWindow') + '</span>' +
        '</a>' +
        '<div class="deal__bottom">' +
          '<span class="deal__codebox"><small>' + t('deal.codeLabel') +
            (expired ? ' <em class="deal__endtag">' + t('deal.ended') + '</em>' : '') + '</small><b>' + esc(d.code) + '</b></span>' +
          '<span class="deal__until">' + (expired ? t('deal.endedOn', { date: untilLabel }) : t('deal.until', { date: untilLabel })) +
            '<small>' + t('deal.kst') + '</small></span>' +
          '<button class="deal__copy" id="btnCopyCode">' + t('deal.copy') + '</button>' +
        '</div></div>') +
      '<h3 class="sub-title">🚆 ' + t('info.airport') + '</h3>' + checks(b.airport) +
      '<h3 class="sub-title">💳 ' + t('info.transit') + '</h3>' +
      '<p class="plan-info" style="margin:0 0 8px">' + t('info.transitDesc') + '</p>' +
      '<div class="pill-row">' + b.transit.map(function (x) { return '<span class="pill">' + esc(x) + '</span>'; }).join('') + '</div>' +
      '<h3 class="sub-title">💡 ' + t('info.tip') + '</h3><div class="callout">' + esc(b.tip) + '</div>';
    var btn = $('#btnCopyCode');
    if (btn) btn.onclick = function () {
      track('click_flight_deal', { guide_id: S.guide.guideId, action: 'copy_code', expired: expired });
      copyText(d.code).then(ifCopied(expired ? 'deal.copiedExpired' : 'deal.copied'));
    };
    var link = $('#dealLink');
    // 링크 이동 시 할인코드도 함께 복사 → 결제 화면에서 바로 붙여넣기 (종료 후에는 링크만 이동)
    if (link) link.onclick = function () {
      track('click_flight_deal', { guide_id: S.guide.guideId, action: 'open_link', url: d.url, expired: expired });
      if (!expired) copyText(d.code).then(ifCopied('deal.copiedOnOpen'));
    };
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
      '<h3 class="sub-title">🚌 ' + t('spots.nearby') + '</h3><div class="h-scroll nearby-list" id="nearbyList">' +
      sp.nearby.map(function (n) {
        return '<div class="nearby"><div class="nearby__icon">' + n.icon + '</div><strong>' + esc(n.name) + '</strong><p>' + esc(n.desc) + '</p></div>';
      }).join('') + '</div>';
    $('#sec-spots').onclick = function (e) {
      var b = e.target.closest('[data-poi]'); if (b) openSheet(b.dataset.poi, null);
    };
    enableHScroll($('#nearbyList'));
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
      '<div class="mini-map" id="miniMap" role="button" tabindex="0" aria-label="' + t('course.mapExpand') + '">' +
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
    $('#miniMap').onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFullMap(); } };
    enableHScroll($('#dayChips'));
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

  /**
   * 지도 그리기 — 공급자(Google / OpenStreetMap / SVG)는 js/map.js 의 MapKit 이 결정.
   * 번호 핀·점선 경로·경계 맞춤·핀 클릭(전체 지도) 동작은 공급자와 무관하게 동일.
   */
  /*
   * 지연 생성: 작은 지도는 추천 일정 영역 근처까지 스크롤했을 때 처음 생성한다
   * (지도 타일 요청을 줄여 첫 화면 로딩을 가볍게 하고, OSM 타일 서버 부담도 줄임).
   * 생성 후에는 같은 지도 객체를 재사용 (일차·플랜 변경 시 핀·경로만 다시 그림)
   */
  function whenMiniVisible(cb) {
    var box = document.getElementById('miniMap');
    if (!box) return;
    if (!('IntersectionObserver' in window)) { box.dataset.seen = '1'; return cb(); }
    if (box._io) return; // 이미 관찰 중 → 보이면 그때 최신 일차로 그림
    box._io = new IntersectionObserver(function (entries) {
      if (!entries.some(function (e) { return e.isIntersecting; })) return;
      box._io.disconnect(); box.dataset.seen = '1';
      cb();
    }, { rootMargin: '300px 0px' });
    box._io.observe(box);
  }

  function drawMap(kind) {
    var box = document.getElementById('miniMap');
    if (kind === 'mini' && box && box.dataset.seen !== '1') {
      return whenMiniVisible(function () { drawMap('mini'); });
    }
    var canvasId = kind === 'mini' ? 'miniMapCanvas' : 'fullMapCanvas';
    var pts = dayPoints(), route = routeOf(pts);
    return MapKit.ready().then(function () {
      var el = document.getElementById(canvasId);
      if (!el) return;
      var v = S.maps[kind];
      if (!v || v.el !== el || el.dataset.provider !== MapKit.provider()) {
        v = S.maps[kind] = MapKit.create(el, { interactive: kind === 'full' });
      }
      v.render({ points: pts, route: route, onPinClick: kind === 'full' ? function (id) { openSheet(id, S.day); } : null });
    });
  }

  // Google 지도 앱/웹에서 이 날의 경로 열기 (API 키 불필요)
  function dayRouteUrl() {
    var pts = dayPoints();
    if (curDay().choice) return null; // 택1 일정은 경로가 없음
    return MapKit.routeUrl(pts.filter(function (p) { return !p.alt; }).map(function (p) { return S.pois[p.id]; }));
  }

  function openFullMap() {
    $('#fullMap').hidden = false;
    $('#fullMapTitle').textContent = curPlan().label + ' · ' + t('course.day', { n: S.day });
    var url = dayRouteUrl(), a = $('#btnGmapsRoute');
    a.hidden = !url;
    if (url) a.href = url;
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
      '<a class="gmaps-link" id="sheetGmaps" href="' + esc(MapKit.placeUrl(p)) + '" target="_blank" rel="noopener">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-5.6-6.5-11A6.5 6.5 0 0 1 18.5 10c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/></svg>' +
        t('map.openPlace') + '<span class="sr-only">' + t('deal.newWindow') + '</span></a>' +
      (FEAT.itinerary
        ? '<div class="sheet__actions"><button class="btn btn--ghost" data-act="close">' + t('modal.cancel') + '</button>' +
          '<button class="btn btn--primary" data-act="add"' + (closed ? ' disabled style="opacity:.4"' : '') + '>' + t('sheet.addToPlan') + '</button></div>'
        : '<button class="btn btn--ghost btn--block" data-act="close" style="margin-top:16px">' + t('sheet.close') + '</button>');
    $('#sheetOverlay').hidden = false;
    $('#sheetGmaps').onclick = function () { track('click_open_google_maps', { guide_id: S.guide.guideId, type: 'place', poi_id: poiId }); };
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
    if (fmt === 'text') return copyText(Itin.toText(it, S.pois)).then(ifCopied('toast.textCopied'));
    if (fmt === 'share') {
      var text = Itin.toText(it, S.pois);
      return shareOrCopy({ title: it.title, text: text }, text, 'toast.textCopied');
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
  /**
   * Web Share API 우선, 미지원(데스크톱 Firefox 등)·실패 시 클립보드 복사로 대체.
   * 사용자가 공유창을 닫은 경우(AbortError)는 아무것도 하지 않음.
   */
  function shareOrCopy(data, copyValue, copiedKey) {
    var canShare = navigator.share && (!navigator.canShare || navigator.canShare(data));
    if (!canShare) return copyText(copyValue).then(ifCopied(copiedKey));
    return navigator.share(data).catch(function (err) {
      if (err && err.name === 'AbortError') return;
      return copyText(copyValue).then(ifCopied(copiedKey));
    });
  }
  function onShare() {
    var g = S.guide;
    // location.origin 은 file:// 에서 "null" 이 되므로 현재 주소 기반으로 생성
    var u = new URL(location.href); u.search = '?guideId=' + encodeURIComponent(g.guideId); u.hash = '';
    var webUrl = u.toString();
    var deepLink = 'sapporoguide://guides/' + encodeURIComponent(g.guideId);
    var data = { title: g.title, text: g.title + '\n' + deepLink, url: webUrl };
    shareOrCopy(data, webUrl, 'toast.shareCopied');
  }
  /* ============ 즐겨찾기 / 홈 화면에 추가 ============
   * 웹페이지가 브라우저 즐겨찾기를 직접 추가할 수는 없음(보안상 막힘) → 가능한 경우 설치 창, 아니면 기기별 방법 안내
   *   - Chrome/Edge(안드로이드·PC): beforeinstallprompt 로 '홈 화면에 추가/앱 설치' 창을 바로 띄움 (https 배포 시)
   *   - iOS Safari / 그 외: 기기에 맞는 단계 안내 + 링크 복사
   */
  var installPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); installPrompt = e; });
  window.addEventListener('appinstalled', function () { installPrompt = null; toast(t('save.installed')); });

  function detectPlatform() {
    var ua = navigator.userAgent || '';
    var iOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (iOS) return 'ios';
    if (/Android/.test(ua)) return 'android';
    return /Mac/.test(navigator.platform || ua) ? 'mac' : 'pc';
  }
  function isStandalone() {
    return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  }
  var SAVE_GUIDES = ['ios', 'android', 'pc', 'mac'];

  function onSaveShortcut() {
    var platform = detectPlatform();
    if (isStandalone()) { track('click_save_shortcut', { guide_id: S.guide.guideId, platform: platform, method: 'already' }); return toast(t('save.already')); }
    if (installPrompt) {
      track('click_save_shortcut', { guide_id: S.guide.guideId, platform: platform, method: 'install_prompt' });
      var p = installPrompt; installPrompt = null;
      p.prompt();
      return p.userChoice.then(function (r) { if (r && r.outcome === 'accepted') toast(t('save.installed')); }).catch(function () {});
    }
    track('click_save_shortcut', { guide_id: S.guide.guideId, platform: platform, method: 'guide' });
    openSaveGuide(platform);
  }

  function saveSteps(key) {
    return '<ol class="save-steps">' + t('save.' + key + '.steps').split('|').map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol>';
  }
  function openSaveGuide(platform) {
    var others = SAVE_GUIDES.filter(function (k) { return k !== platform; });
    openModal(
      '<h3>' + t('save.title') + '</h3><p>' + t('save.desc') + '</p>' +
      '<div class="save-card is-main"><strong>' + t('save.' + platform + '.label') + '</strong>' + saveSteps(platform) + '</div>' +
      '<details class="save-more"><summary>' + t('save.others') + '</summary>' +
        others.map(function (k) { return '<div class="save-card"><strong>' + t('save.' + k + '.label') + '</strong>' + saveSteps(k) + '</div>'; }).join('') +
      '</details>' +
      '<div class="modal__actions"><button class="btn btn--ghost btn--block" data-act="copy">🔗 ' + t('save.copyLink') + '</button>' +
      '<button class="btn btn--primary btn--block" data-act="close">' + t('save.ok') + '</button></div>',
      function (act) {
        if (act === 'copy') {
          var u = new URL(location.href); u.hash = '';
          return copyText(u.toString()).then(ifCopied('toast.shareCopied'));
        }
        closeModal();
      });
  }

  function onBookmark() {
    if (!FEAT.bookmark) return;
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
    $('#btnSave').onclick = function () { if (FEAT.saveShortcut) onSaveShortcut(); };
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
    window.addEventListener('resize', function () { if (S.maps.mini) S.maps.mini.resize(); });
    $('#btnGmapsRoute').onclick = function () { track('click_open_google_maps', { guide_id: S.guide.guideId, type: 'route', day_num: S.day }); };
  }

  applyStaticI18n();
  bind();
  load();
})();
