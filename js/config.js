/**
 * 기능 플래그 — 코드는 유지하고 노출만 제어한다. 다시 쓰려면 true로 변경.
 *   itinerary : 일정 담기(+일정담기, 바텀시트 '내 일정에 담기'), 코스로 일정 만들기(FAB),
 *               '내 일정' 버튼·시트, 내보내기(텍스트/공유/.ics/.json)
 *   guideMeta : 타이틀 아래 작성일 · 조회수 · 에디터 표기
 * 변경 이력: 2026-11-22 사용자 요청으로 둘 다 비활성화
 */
window.FEATURES = {
  itinerary: false,
  guideMeta: false
};

/**
 * 추천 코스 지도 설정 (js/map.js)
 *   provider     : 'google' | 'leaflet'
 *   googleApiKey : Google Cloud 콘솔에서 발급한 Maps JavaScript API 키.
 *                  비어 있거나 인증 실패(결제 미설정·도메인 제한 등) 시 OpenStreetMap으로 자동 대체.
 *                  ※ 키는 브라우저에 노출되므로 반드시 'HTTP 리퍼러(웹사이트) 제한'을 걸 것.
 *   googleMapId  : Advanced Marker 용 Map ID. 비우면 Google 개발용 'DEMO_MAP_ID' 사용 (운영 시 발급 권장)
 *   language / region : 지도 라벨 언어·지역 정책 (ko / KR)
 * 'Google 지도에서 보기 / 경로 보기' 링크는 키 없이도 동작.
 */
window.MAP_CONFIG = {
  provider: 'google',
  googleApiKey: '',
  googleMapId: '',
  language: 'ko',
  region: 'KR'
};
