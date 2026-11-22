/**
 * MapKit — 추천 코스 지도
 *   화면 지도 : OpenStreetMap (Leaflet) → 로드 실패 시 SVG 간략 경로
 *   Google    : 키 없이 쓰는 Google 지도 링크(Maps URLs)만 사용 — 장소 보기 / 경로 보기
 *
 * ⚠ 정책 (2026-11-22): Google Maps JavaScript API·API 키·Map ID 사용 금지.
 *   사용량 상한을 확실히 걸 수 없어 과금 위험이 있으므로, 화면 지도는 Google API를 불러오지 않는다.
 *
 * 공통 기능: 번호 핀(택1·운영 종료 색 구분), 같은 좌표 핀 라벨 병합("1·6"), 점선 경로(Polyline),
 *           경계 맞춤(최대 줌 제한), 핀 클릭 콜백, 핀 툴팁(장소명)
 */
(function () {
  var provider = null;

  function ready() {
    provider = window.L ? 'leaflet' : 'svg';
    return Promise.resolve(provider);
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

  /* ---------- Leaflet (OpenStreetMap) ---------- */
  function LeafletView(el, o) {
    this.el = el; this.o = o;
    el.dataset.provider = 'leaflet';
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

  /* ---------- SVG (Leaflet 로드 실패 시) ---------- */
  function SvgView(el, o) { this.el = el; this.o = o; el.dataset.provider = 'svg'; }
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

  /* ---------- Google 지도 링크 (Maps URLs — API 키 불필요·과금 없음) ---------- */
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
    create: function (el, o) {
      return (provider || (window.L ? 'leaflet' : 'svg')) === 'leaflet' ? new LeafletView(el, o || {}) : new SvgView(el, o || {});
    },
    placeUrl: placeUrl,
    routeUrl: routeUrl
  };
})();
