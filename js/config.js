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
