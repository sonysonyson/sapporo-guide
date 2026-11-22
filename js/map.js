/**
 * MapKit — 추천 코스 지도 공급자 추상화
 *   1순위 google  : Google Maps JavaScript API (MAP_CONFIG.googleApiKey 필요)
 *   2순위 leaflet : OpenStreetMap (키 없음 / Google 로드·인증 실패 시 자동 대체)
 *   3순위 svg     : 지도 라이브러리 모두 실패 시 좌표 투영 간략 경로
 *
 * 공통 기능: 번호 핀(택1·운영 종료 색 구분), 같은 좌표 핀 라벨 병합("1·6"), 점선 경로(Polyline),
 *           경계 맞춤(fitBounds, 최대 줌 제한), 핀 클릭 콜백, 핀 툴팁(장소명)
 *
 * 사용:
 *   MapKit.ready().then(provider => { var v = MapKit.create(el, { interactive }); v.render({ points, route, onPinClick }); })
 *   MapKit.onFallback(fn) : Google 인증 실패 등으로 공급자가 바뀌면 호출 → 지도를 다시 그려야 함
 */
(function () {
  var CFG = window.MAP_CONFIG || {};
  var provider = null, readyPromise = null, fallbackHandlers = [];

  function log() { try { console.info.apply(console, ['[map]'].concat([].slice.call(arguments))); } catch (e) {} }

  /* ---------- Google Maps 로더 ---------- */
  function loadGoogle() {
    return new Promise(function (resolve, reject) {
      if (window.google && google.maps && google.maps.Map) return resolve();
      var done = false, cb = '__sgGmapsReady';
      window[cb] = function () { done = true; resolve(); };
      // 키 오류·결제 미설정·도메인 제한 위반 시 Google이 호출
      window.gm_authFailure = function () { log('Google Maps 인증 실패 → OpenStreetMap으로 전환'); switchTo('leaflet'); };
      var q = 'key=' + encodeURIComponent(CFG.googleApiKey) + '&v=weekly&libraries=marker&loading=async&callback=' + cb +
        '&language=' + encodeURIComponent(CFG.language || 'ko') + '&region=' + encodeURIComponent(CFG.region || 'KR');
      var s = document.createElement('script');
      s.src = 'https://maps.googleapis.com/maps/api/js?' + q;
      s.async = true;
      s.onerror = function () { reject(new Error('Google Maps 스크립트 로드 실패')); };
      document.head.appendChild(s);
      setTimeout(function () { if (!done) reject(new Error('Google Maps 로드 시간 초과')); }, 12000);
    });
  }

  function pickFallback() { return window.L ? 'leaflet' : 'svg'; }
  function switchTo(p) {
    if (provider === p) return;
    provider = p;
    fallbackHandlers.forEach(function (fn) { try { fn(p); } catch (e) {} });
  }

  function ready() {
    if (readyPromise) return readyPromise;
    var wantGoogle = (CFG.provider || 'google') === 'google' && CFG.googleApiKey;
    if (!wantGoogle) {
      if ((CFG.provider || 'google') === 'google') log('MAP_CONFIG.googleApiKey 가 비어 있어 OpenStreetMap으로 표시합니다');
      provider = pickFallback();
      readyPromise = Promise.resolve(provider);
    } else {
      readyPromise = loadGoogle().then(function () {
        if (!provider) provider = 'google'; // 로드 중 인증 실패로 이미 전환됐으면 유지
        return provider;
      }, function (err) {
        log(err.message, '→ OpenStreetMap으로 전환');
        provider = pickFallback();
        return provider;
      });
    }
    return readyPromise;
  }

  /* ---------- 공통 ---------- */
  function labelsFor(points) {
    var seen = {};
    return points.map(function (p) {
      var key = p.lat + ',' + p.lng;
      seen[key] = seen[key] ? seen[key] + '·' + p.no : String(p.no);
      return seen[key];
    });
  }
  function pinClass(p) { return 'pin' + (p.alt ? ' is-alt' : '') + (p.closed ? ' is-closed' : ''); }
  // 공급자가 바뀌면 이전 라이브러리가 남긴 DOM·스타일을 없애기 위해 같은 id의 새 컨테이너로 교체
  function freshContainer(el, p) {
    if (!el.dataset.provider || el.dataset.provider === p) { el.dataset.provider = p; return el; }
    var n = document.createElement(el.tagName);
    n.id = el.id; n.className = el.className; n.dataset.provider = p;
    el.replaceWith(n);
    return n;
  }

  /* ---------- Google ---------- */
  function GoogleView(el, o) {
    this.el = el; this.o = o; this.objs = [];
    this.map = new google.maps.Map(el, {
      mapId: CFG.googleMapId || 'DEMO_MAP_ID', // Advanced Marker 필수. DEMO_MAP_ID 는 개발용
      center: { lat: 43.0621, lng: 141.3544 }, zoom: 12,
      disableDefaultUI: !o.interactive,
      gestureHandling: o.interactive ? 'greedy' : 'none',
      keyboardShortcuts: !!o.interactive,
      clickableIcons: !!o.interactive,
      zoomControl: !!o.interactive, streetViewControl: !!o.interactive,
      mapTypeControl: false, fullscreenControl: false, rotateControl: false
    });
  }
  GoogleView.prototype.render = function (d) {
    var map = this.map, objs = this.objs, o = this.o;
    objs.forEach(function (x) { if (x.setMap) x.setMap(null); else x.map = null; });
    objs.length = 0;

    if (d.route.length > 1) {
      objs.push(new google.maps.Polyline({
        map: map, path: d.route.map(function (c) { return { lat: c[0], lng: c[1] }; }),
        strokeOpacity: 0, geodesic: false, zIndex: 1,
        icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: .9, strokeColor: '#2a6fdb', strokeWeight: 3, scale: 3 }, offset: '0', repeat: '14px' }]
      }));
    }
    var labels = labelsFor(d.points), Adv = google.maps.marker.AdvancedMarkerElement;
    d.points.forEach(function (p, i) {
      var pin = document.createElement('div');
      pin.className = pinClass(p);
      pin.innerHTML = '<span></span>'; pin.firstChild.textContent = labels[i];
      var mk = new Adv({ map: map, position: { lat: p.lat, lng: p.lng }, content: pin, title: p.name, zIndex: 10 + p.no });
      if (d.onPinClick) mk.addListener('click', function () { d.onPinClick(p.id); });
      objs.push(mk);
    });

    var b = new google.maps.LatLngBounds();
    d.points.forEach(function (p) { b.extend({ lat: p.lat, lng: p.lng }); });
    if (b.getNorthEast().equals(b.getSouthWest())) { map.setCenter(b.getCenter()); map.setZoom(14); return; }
    map.fitBounds(b, o.interactive ? 64 : 32);
    google.maps.event.addListenerOnce(map, 'idle', function () { if (map.getZoom() > 15) map.setZoom(15); });
  };
  GoogleView.prototype.resize = function () { /* Google Maps 는 컨테이너 크기 변화를 자동 감지 */ };

  /* ---------- Leaflet (OpenStreetMap) ---------- */
  function LeafletView(el, o) {
    this.el = el; this.o = o;
    var i = !!o.interactive;
    this.map = L.map(el, { zoomControl: i, dragging: i, scrollWheelZoom: i, doubleClickZoom: i, touchZoom: i, boxZoom: i, keyboard: i });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap' }).addTo(this.map);
    this.layer = L.layerGroup().addTo(this.map);
  }
  LeafletView.prototype.render = function (d) {
    var m = this.map, layer = this.layer, o = this.o;
    layer.clearLayers();
    if (d.route.length > 1) L.polyline(d.route, { color: '#2a6fdb', weight: 3, opacity: .85, dashArray: '6 6' }).addTo(layer);
    var labels = labelsFor(d.points);
    d.points.forEach(function (p, i) {
      var icon = L.divIcon({ className: '', iconSize: [26, 26], iconAnchor: [13, 26], html: '<div class="' + pinClass(p) + '"><span>' + labels[i] + '</span></div>' });
      var mk = L.marker([p.lat, p.lng], { icon: icon, zIndexOffset: p.no, title: p.name });
      if (d.onPinClick) mk.bindTooltip(p.name, { direction: 'top', offset: [0, -24] }).on('click', function () { d.onPinClick(p.id); });
      mk.addTo(layer);
    });
    m.invalidateSize();
    var b = L.latLngBounds(d.points.map(function (p) { return [p.lat, p.lng]; }));
    if (b.getNorthEast().equals(b.getSouthWest())) m.setView(b.getCenter(), 14);
    else m.fitBounds(b, { padding: o.interactive ? [56, 56] : [28, 28], maxZoom: 15 });
  };
  LeafletView.prototype.resize = function () { this.map.invalidateSize(); };

  /* ---------- SVG (최후 대체) ---------- */
  function SvgView(el, o) { this.el = el; this.o = o; }
  SvgView.prototype.render = function (d) {
    var pts = d.points, W = 320, H = 180, pad = 24;
    var lats = pts.map(function (p) { return p.lat; }), lngs = pts.map(function (p) { return p.lng; });
    var a = Math.min.apply(0, lats), A = Math.max.apply(0, lats), n = Math.min.apply(0, lngs), N = Math.max.apply(0, lngs);
    var sx = function (v) { return N === n ? W / 2 : pad + (v - n) / (N - n) * (W - pad * 2); };
    var sy = function (v) { return A === a ? H / 2 : H - pad - (v - a) / (A - a) * (H - pad * 2); };
    this.el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="100%">' +
      '<polyline points="' + d.route.map(function (c) { return sx(c[1]) + ',' + sy(c[0]); }).join(' ') + '" fill="none" stroke="#2a6fdb" stroke-width="2" stroke-dasharray="5 5"/>' +
      pts.map(function (p) {
        return '<g transform="translate(' + sx(p.lng) + ',' + sy(p.lat) + ')"><circle r="10" fill="' + (p.alt ? '#8b95a3' : '#2a6fdb') + '" stroke="#fff" stroke-width="2"/>' +
          '<text text-anchor="middle" dy="4" font-size="10" font-weight="800" fill="#fff">' + p.no + '</text></g>';
      }).join('') +
      '<text x="8" y="' + (H - 8) + '" font-size="9" fill="#8b95a3">' + (window.t ? t('map.fallback') : '') + '</text></svg>';
  };
  SvgView.prototype.resize = function () {};

  /* ---------- Google 지도 앱/웹 바로가기 (API 키 불필요) ---------- */
  function q(p) { return p.gq || (p.lat + ',' + p.lng); }
  function placeUrl(p) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q(p)); }
  function routeUrl(points) {
    if (points.length < 2) return points.length ? placeUrl(points[0]) : null;
    var mid = points.slice(1, -1).map(q);
    return 'https://www.google.com/maps/dir/?api=1&origin=' + encodeURIComponent(q(points[0])) +
      '&destination=' + encodeURIComponent(q(points[points.length - 1])) +
      (mid.length ? '&waypoints=' + encodeURIComponent(mid.join('|')) : '');
  }

  window.MapKit = {
    ready: ready,
    provider: function () { return provider; },
    onFallback: function (fn) { fallbackHandlers.push(fn); },
    create: function (el, o) {
      var p = provider || pickFallback();
      el = freshContainer(el, p);
      if (p === 'google') return new GoogleView(el, o || {});
      if (p === 'leaflet') return new LeafletView(el, o || {});
      return new SvgView(el, o || {});
    },
    placeUrl: placeUrl,
    routeUrl: routeUrl
  };
})();
