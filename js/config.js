/**
 * 기능 플래그 — 코드는 유지하고 노출만 제어한다. 다시 쓰려면 true로 변경.
 *   itinerary : 일정 담기(+일정담기, 바텀시트 '내 일정에 담기'), 코스로 일정 만들기(FAB),
 *               '내 일정' 버튼·시트, 내보내기(텍스트/공유/.ics/.json)
 *   guideMeta : 타이틀 아래 작성일 · 조회수 · 에디터 표기
 *   bookmark  : 가이드 찜(북마크) — 가이드 목록·찜 목록 화면이 생기면 다시 켤 예정
 *   saveShortcut : 즐겨찾기 / 홈 화면에 추가 (찜 버튼 자리를 대체)
 * 변경 이력: 2026-11-22 itinerary·guideMeta 비활성화 / bookmark 비활성화 → saveShortcut 으로 교체
 */
window.FEATURES = {
  itinerary: false,
  guideMeta: false,
  bookmark: false,
  saveShortcut: true
};

/*
 * 지도 정책 (2026-11-22): Google Maps JavaScript API·API 키·Map ID 사용 금지 (과금 상한을 확실히 걸 수 없음).
 * 화면 지도는 OpenStreetMap, Google 지도는 키가 필요 없는 링크(장소 보기 / 경로 보기)로만 연결한다. → js/map.js
 */
