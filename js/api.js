/**
 * Mock API 레이어 — 실제 서버 연동 시 fetch 호출로 교체.
 * 데모용 URL 파라미터:
 *   ?demo=error   → 최초 로딩 실패 (재시도 화면 확인)
 *   ?demo=closed  → 모이와산을 '운영 종료' 상태로 표시
 */
(function () {
  var params = new URLSearchParams(location.search);
  var failOnce = params.get('demo') === 'error';

  function delay(v, ms) { return new Promise(function (r) { setTimeout(function () { r(v); }, ms || 350); }); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function store(key, val) {
    try {
      if (val === undefined) return JSON.parse(localStorage.getItem(key));
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { return null; }
  }

  var state = { loggedIn: !!store('sg.loggedIn'), bookmarked: !!store('sg.bookmark') };

  window.API = {
    // GET /api/v1/guides/{guideId}
    getGuide: function (guideId) {
      if (failOnce) { failOnce = false; return delay(null, 600).then(function () { throw new Error('NETWORK'); }); }
      var g = clone(window.GUIDE_DETAIL);
      g.bookmarked = state.bookmarked;
      return delay(g);
    },
    // GET /api/v1/guides/{guideId}/courses
    getCourses: function (guideId) {
      var c = clone(window.GUIDE_COURSES);
      var pois = clone(window.POIS);
      if (params.get('demo') === 'closed') pois.moiwa.status = 'closed';
      return delay({ plans: c, pois: pois });
    },
    // POST /api/v1/users/bookmarks
    toggleBookmark: function (guideId) {
      state.bookmarked = !state.bookmarked;
      store('sg.bookmark', state.bookmarked);
      return delay({ bookmarked: state.bookmarked }, 150);
    },
    // POST /api/v1/itineraries/copy
    copyItinerary: function (guideId, planId) {
      return delay({ itineraryId: 'it-' + Date.now(), planId: planId }, 400);
    },
    // (가정) POST /api/v1/itineraries/{id}/items
    addPoi: function (itineraryId, poiId, dayNum) { return delay({ ok: true }, 200); },
    getMyItineraries: function () { return delay(clone(window.MY_ITINERARIES), 150); },

    // 인증 (데모)
    isLoggedIn: function () { return state.loggedIn; },
    login: function () { state.loggedIn = true; store('sg.loggedIn', true); return delay(true, 200); },
    logout: function () { state.loggedIn = false; store('sg.loggedIn', false); }
  };

  /* 트래킹 & 로그 (7장) — 실제 SDK 연동 전까지 콘솔 + dataLayer */
  window.dataLayer = window.dataLayer || [];
  window.track = function (event, props) {
    var payload = Object.assign({ event: event, ts: new Date().toISOString() }, props);
    window.dataLayer.push(payload);
    console.info('[track]', event, props);
  };
})();
