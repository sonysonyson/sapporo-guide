/**
 * Mock API 레이어 — 실제 서버 연동 시 fetch 호출로 교체.
 * 로그인 없음: 북마크·내 일정은 접속한 브라우저(localStorage)에 저장 (일정은 js/itinerary.js)
 * 데모용 URL 파라미터:
 *   ?demo=error   → 최초 로딩 실패 (재시도 화면 확인)
 *   ?demo=closed  → 모이와산을 '운영 종료' 상태로 표시
 */
(function () {
  var params = new URLSearchParams(location.search);
  var failOnce = params.get('demo') === 'error';

  function delay(v, ms) { return new Promise(function (r) { setTimeout(function () { r(v); }, ms || 350); }); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  window.API = {
    // GET /api/v1/guides/{guideId}
    getGuide: function (guideId) {
      if (failOnce) { failOnce = false; return delay(null, 600).then(function () { throw new Error('NETWORK'); }); }
      var g = clone(window.GUIDE_DETAIL);
      g.bookmarked = !!lsGet('sg.bookmark.' + guideId);
      return delay(g);
    },
    // GET /api/v1/guides/{guideId}/courses
    getCourses: function (guideId) {
      var pois = clone(window.POIS);
      if (params.get('demo') === 'closed') pois.moiwa.status = 'closed';
      return delay({ plans: clone(window.GUIDE_COURSES), pois: pois });
    },
    // 북마크 — 로컬 저장 (서버 API 미사용)
    toggleBookmark: function (guideId) {
      var v = !lsGet('sg.bookmark.' + guideId);
      lsSet('sg.bookmark.' + guideId, v);
      return Promise.resolve({ bookmarked: v });
    }
  };

  /* 트래킹 & 로그 (7장) — 실제 SDK 연동 전까지 콘솔 + dataLayer */
  window.dataLayer = window.dataLayer || [];
  window.track = function (event, props) {
    window.dataLayer.push(Object.assign({ event: event, ts: new Date().toISOString() }, props));
    console.info('[track]', event, props);
  };
})();
