/**
 * UI 문자열 사전 (1차 오픈: KR 전용, 추후 EN 확장 대비 — 화면 코드에 텍스트 하드코딩 지양)
 * 사용: t('key') / t('key', { n: 3 })
 */
window.I18N = {
  ko: {
    'nav.back': '뒤로가기',
    'nav.share': '공유하기',
    'nav.bookmark': '북마크',
    'cover.placeholder': 'SAPPORO',
    'meta.views': '조회 {n}',
    'summary.season': '추천 계절',
    'summary.duration': '권장 일정',
    'summary.budget': '예상 경비',
    'tab.info': '기본 정보',
    'tab.spots': '명소',
    'tab.course': '추천 코스',
    'tab.stay': '숙소',
    'tab.tour': '투어',
    'tab.check': '준비물',
    'tab.food': '맛집',
    'sec.info': '삿포로 기본 정보',
    'sec.spots': '가봐야 할 명소',
    'sec.course': '추천 일정',
    'sec.stay': '추천 숙소 지역',
    'sec.tour': '투어 비교',
    'sec.check': '꼭 챙겨야 할 준비물',
    'sec.food': '맛집 리스트',
    'info.location': '위치',
    'info.airport': '공항 이동',
    'info.transit': '시내 교통',
    'info.transitDesc': '아래 결제 수단을 모두 사용할 수 있어요.',
    'info.tip': '여행 팁',
    'deal.until': '~ {date}까지 할인코드',
    'deal.copy': '복사',
    'deal.copied': '할인코드가 복사되었어요',
    'spots.city': '삿포로 시내',
    'spots.nearby': '근교 여행지',
    'course.target': '추천 대상',
    'course.note': '참고',
    'course.day': 'Day {n}',
    'course.mapExpand': '지도 크게 보기',
    'course.choiceDay': '택1 일정 — 취향에 맞춰 한 곳을 골라보세요 (경로 미표시)',
    'course.alt': '택1',
    'course.add': '+ 일정담기',
    'course.closed': '운영 종료된 장소입니다',
    'stay.for': '이런 여행자에게',
    'stay.note': '장점·유의점',
    'stay.hotels': '숙소 후보',
    'tour.fit': '잘 맞는 경우',
    'tour.pro': '장점',
    'tour.check': '확인할 점',
    'check.progress': '{done} / {total} 준비 완료',
    'food.source': '출처',
    'fab.copy': '이 가이드 코스로 일정 만들기',
    'sheet.addToPlan': '내 일정에 담기',
    'sheet.tip': 'TIP',
    'modal.selectPlan': '어느 일정에 담을까요?',
    'modal.newPlan': '+ 새 일정 만들기',
    'modal.cancel': '취소',
    'login.title': '로그인이 필요해요',
    'login.desc': '북마크와 일정 담기는 로그인 후 이용할 수 있어요. 로그인 후 이 화면으로 돌아옵니다.',
    'login.cta': '로그인하기 (데모)',
    'toast.shareCopied': '공유 링크가 복사되었어요',
    'toast.bookmarkOn': '가이드를 찜했어요',
    'toast.bookmarkOff': '찜을 해제했어요',
    'toast.added': '"{plan}"에 {poi}을(를) 담았어요',
    'toast.copied': '"{plan}" 코스로 내 일정을 만들었어요',
    'toast.loggedIn': '로그인되었어요',
    'toast.noHistory': '이전 화면이 없어요 (가이드 목록으로 이동)',
    'error.title': '정보를 불러오지 못했어요',
    'error.desc': '네트워크 상태를 확인한 뒤 다시 시도해 주세요.',
    'error.retry': '다시 시도',
    'map.fallback': '지도를 불러오지 못해 간략 경로로 표시합니다'
  }
};

window.LOCALE = 'ko';
window.t = function (key, vars) {
  var s = (window.I18N[window.LOCALE] || {})[key] || key;
  if (vars) Object.keys(vars).forEach(function (k) { s = s.split('{' + k + '}').join(vars[k]); });
  return s;
};
