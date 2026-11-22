/**
 * 삿포로 여행 가이드 Mock 데이터
 * - 실제 서비스에서는 아래 API 응답으로 대체된다.
 *   GET /api/v1/guides/{guideId}          -> GUIDE_DETAIL
 *   GET /api/v1/guides/{guideId}/courses  -> GUIDE_COURSES
 * - 콘텐츠 원문: code_artifact.md 4.0.x
 */

/* ---------- POI (장소) 마스터 ---------- */
window.POIS = {
  cts:        { name: '신치토세공항', gq: '新千歳空港', category: '공항', icon: '✈️', lat: 42.7752, lng: 141.6923, area: '치토세',
                reason: 'JR 쾌속 에어포트로 삿포로역까지 약 37분, 공항버스로 시내까지 약 70분.',
                tip: '공항버스는 국내선 쪽에서 탑승 권장 (선착순 탑승).' },
  sapporoSt:  { name: '삿포로역', gq: '札幌駅', category: '교통·쇼핑', icon: '🚉', lat: 43.0687, lng: 141.3508, area: '삿포로역',
                reason: '공항 열차·JR 근교 이동의 거점. 역 주변 쇼핑과 간식 거리가 풍부.',
                tip: '삿포로역–오도리–스스키노는 지하 보행공간으로 연결되어 추운 날 이동이 편리.' },
  odori:      { name: '오도리공원', gq: '大通公園 札幌', category: '공원', icon: '🌳', lat: 43.0605, lng: 141.3479, area: '오도리',
                reason: '도심 산책과 계절 행사 관람의 중심.' },
  tvTower:    { name: '삿포로 TV타워', gq: 'さっぽろテレビ塔', category: '전망', icon: '🗼', lat: 43.0611, lng: 141.3564, area: '오도리',
                reason: '오도리공원 동쪽 끝의 전망 타워. 공원 전체를 내려다볼 수 있음.' },
  clockTower: { name: '삿포로 시계탑', gq: '札幌市時計台', category: '역사', icon: '🕰️', lat: 43.0625, lng: 141.3536, area: '오도리',
                reason: '삿포로의 역사적 건축물이자 대표 사진 명소.' },
  redBrick:   { name: '홋카이도 구청사 (붉은 벽돌 청사)', gq: '北海道庁旧本庁舎', category: '역사', icon: '🧱', lat: 43.0640, lng: 141.3469, area: '삿포로역',
                reason: '붉은 벽돌의 역사적 건축물. 시계탑과 함께 둘러보기 좋음.' },
  susukino:   { name: '스스키노', gq: 'すすきの 札幌', category: '번화가', icon: '🌃', lat: 43.0556, lng: 141.3530, area: '스스키노',
                reason: '저녁 식사, 쇼핑, 야간 산책의 중심 번화가.' },
  tanuki:     { name: '다누키코지 상점가', gq: '狸小路商店街', category: '쇼핑', icon: '🛍️', lat: 43.0575, lng: 141.3535, area: '스스키노',
                reason: '지붕 덮인 아케이드 상점가. 눈 오는 날에도 쇼핑하기 좋음.' },
  nijo:       { name: '니조시장', gq: '二条市場 札幌', category: '시장', icon: '🦀', lat: 43.0590, lng: 141.3580, area: '오도리',
                reason: '해산물 덮밥과 아침 식사 후보.', tip: '영업시간과 휴무는 방문 전 확인.' },
  beer:       { name: '삿포로 맥주박물관·맥주원', gq: 'サッポロビール博物館', category: '박물관·식사', icon: '🍺', lat: 43.0714, lng: 141.3687, area: '히가시구',
                reason: '맥주 역사 전시와 징기스칸 식사를 함께.' },
  jingu:      { name: '홋카이도 신궁·마루야마공원', gq: '北海道神宮', category: '신사·공원', icon: '⛩️', lat: 43.0542, lng: 141.3110, area: '마루야마',
                reason: '신사와 숲길을 함께 둘러보기 좋은 코스.' },
  moiwa:      { name: '모이와산 전망대', gq: '藻岩山 山頂展望台', category: '야경', icon: '🌌', lat: 43.0228, lng: 141.3226, area: '모이와',
                reason: '날씨가 맑은 날 야경 코스로 추천.', tip: '로프웨이 운행 여부를 미리 확인.' },
  shiroi:     { name: '시로이코이비토 파크', gq: '白い恋人パーク', category: '테마파크', icon: '🍪', lat: 43.0889, lng: 141.2717, area: '니시구',
                reason: '과자 테마파크. 기념품 쇼핑과 가족 코스로 인기.' },
  otaruCanal: { name: '오타루 운하', gq: '小樽運河', category: '근교', icon: '🛶', lat: 43.1990, lng: 141.0019, area: '오타루',
                reason: '오타루의 상징. 저녁 가스등 야경이 특히 아름다움.' },
  sakaimachi: { name: '사카이마치 거리', gq: '堺町通り商店街 小樽', category: '근교·쇼핑', icon: '🏮', lat: 43.1925, lng: 141.0045, area: '오타루',
                reason: '유리공방, 스시·디저트 가게가 늘어선 거리. 해산물 점심 추천.' },
  orgel:      { name: '오타루 오르골당', gq: '小樽オルゴール堂 本館', category: '근교·쇼핑', icon: '🎶', lat: 43.1906, lng: 141.0062, area: '오타루',
                reason: '오르골 전시·판매. 사카이마치 거리 끝에 위치.' },
  biei:       { name: '비에이·후라노 (버스투어)', gq: '白金青い池', category: '근교 투어', icon: '🌾', lat: 43.4930, lng: 142.6142, area: '비에이',
                reason: '꽃밭·설경·청의호수 등 계절 풍경 중심. 하루를 따로 잡는 편이 좋음.',
                tip: '장거리 이동·날씨 영향이 크므로 투어 일정과 취소 규정 확인.' },
  jozankei:   { name: '조잔케이 온천', gq: '定山渓温泉', category: '온천', icon: '♨️', lat: 42.9676, lng: 141.1667, area: '조잔케이',
                reason: '온천과 계곡 풍경을 즐기는 휴식형 근교 일정.' },
  noboribetsu:{ name: '노보리베츠 온천', gq: '登別地獄谷', category: '온천', icon: '🌋', lat: 42.4970, lng: 141.1490, area: '노보리베츠',
                reason: '유황온천과 지옥계곡 등 다양한 체험과 설경 감상.' }
};

/* ---------- GET /api/v1/guides/{guideId} ---------- */
window.GUIDE_DETAIL = {
  guideId: 'sapporo-001',
  regionCode: 'JP-HKD-SPK',
  regionTag: '일본 · 홋카이도',
  title: '삿포로 여행 가이드 — 명소, 추천 일정, 숙소, 맛집까지 한 번에',
  coverImage: null, // 미등록 시 Placeholder 노출 (WebP 권장)
  createdAt: '2026-11-22',
  viewCount: 1284,
  editor: { name: '삿포로 가이드 에디터' },
  summary: {
    season: '사계절 (겨울 설경 추천)',
    duration: '3박 4일',
    budget: '중간 수준',
    budgetNote: '항공 평수기 20~30만원대',
    tags: ['#설경', '#맛집탐방', '#온천', '#근교여행']
  },

  /* 4.0.1 기본 정보 */
  basicInfo: {
    location: [
      '일본 홋카이도의 중심 도시. 인구 약 200만 규모이며 사계절이 뚜렷하고 겨울에는 눈이 많이 내립니다.',
      '한국과는 비행기로 약 3시간 30분 정도 거리이며 서울, 청주, 부산 등의 국제공항을 이용해 이동할 수 있어요.',
      '여름/겨울 성수기 항공권은 평일 40~50만원대, 주말 60~70만원대가 평균이며 평수기는 20~30만원대로 방문이 가능합니다.'
    ],
    flightDeal: {
      label: '항공권 할인받기', partner: '트립닷컴', code: '3HAFLT3', until: '2026-11-30',
      url: 'https://3ha.in/r/822411', desc: '삿포로(신치토세) 항공권 검색 후 결제 시 할인코드 입력'
    },
    airport: [
      '신치토세공항에서 삿포로역까지 JR 쾌속 에어포트로 약 37분.',
      '공항버스로 시내까지 약 70분. 공항버스는 국내선으로 이동해 탑승 권장 (선착순 탑승으로 자리가 없으면 대기).',
      '삿포로역 숙소는 JR 기차, 오도리·스스키노 숙소는 리무진 버스 추천.'
    ],
    transit: ['IC카드', '교통패스', '컨택리스 카드'],
    tip: '삿포로역–오도리–스스키노는 지하 보행공간으로 이어지는 구간이 있어 추운 날 이동에 편리합니다.'
  },

  /* 4.0.2 가봐야 할 명소 */
  spots: {
    city: ['odori', 'clockTower', 'susukino', 'nijo', 'beer', 'jingu', 'moiwa', 'shiroi'],
    cityLabels: {
      odori: '오도리공원·삿포로 TV타워',
      clockTower: '삿포로 시계탑·홋카이도 구청사',
      susukino: '스스키노·다누키코지 상점가'
    },
    cityDesc: {
      odori: '도심 산책과 계절 행사 관람의 중심.',
      clockTower: '삿포로의 역사적 건축물과 사진 명소.',
      susukino: '저녁 식사, 쇼핑, 야간 산책.',
      nijo: '해산물 덮밥과 아침 식사 후보. 영업시간과 휴무는 방문 전 확인.',
      beer: '맥주 역사 전시와 징기스칸 식사.',
      jingu: '신사와 숲길을 함께 둘러보기 좋은 코스.',
      moiwa: '날씨가 맑은 날 야경 코스로 추천. 로프웨이 운행 여부 확인.',
      shiroi: '과자 테마파크·기념품·가족 코스.'
    },
    nearby: [
      { name: '오타루', icon: '🛶', desc: '운하, 사카이마치 거리, 오르골당, 유리공방, 스시·디저트. 삿포로에서 당일치기로 다녀오기 좋아요.' },
      { name: '비에이·후라노', icon: '🌾', desc: '꽃밭·설경·청의호수 등 계절 풍경 중심. 이동 거리가 길어 하루를 따로 잡는 편이 좋습니다.' },
      { name: '조잔케이', icon: '♨️', desc: '온천과 계곡 풍경을 즐기는 휴식형 근교 일정.' },
      { name: '노보리베츠', icon: '🌋', desc: '유황온천과 지옥계곡 등 다양한 체험을 하며 설경을 감상하기 좋아요.' },
      { name: '니세코', icon: '⛷️', desc: '스키·아웃도어가 목적이면 고려하되, 이동과 체류를 감안해 숙박 포함 여부를 검토하세요.' }
    ]
  },

  /* 4.0.4 추천 숙소 지역 */
  stays: [
    { area: '삿포로역', for: '공항 이동·JR 근교 이동이 중요', note: '공항 열차와 쇼핑 접근성이 편리. 버스투어 집결지는 상품별로 확인', hotels: ['케이한 호텔 삿포로'] },
    { area: '오도리공원', for: '첫 방문·도심 관광 중심', note: '삿포로역과 스스키노 사이에 있어 이동 균형이 좋음', hotels: ['라젠트 스테이 삿포로 오도리'] },
    { area: '스스키노', for: '맛집·야간 활동·쇼핑 중심', note: '식당과 번화가가 가까움. 밤늦은 시간의 거리 분위기를 고려', hotels: ['카락사 호텔', '도미인', '베셀 호텔 캄파나', '다이와 로이넷'] }
  ],
  staysNote: '숙소 후보와 예약 링크는 삿포로 여행 정보에 모아둔 목록을 참고하세요. 요금·객실·시설은 예약일 기준으로 다시 확인하세요.',

  /* 4.0.5 투어 비교 */
  tours: [
    { name: '오타루 자유여행', fit: '운하·상점가·스시를 여유롭게 즐기고 싶을 때', pro: '열차로 이동하기 쉬워 일정 조절이 자유로움', check: '귀환 열차 시간, 상점 휴무, 눈길 이동' },
    { name: '비에이·후라노 버스투어', fit: '여러 풍경 명소를 하루에 보고 싶을 때', pro: '대중교통 환승과 운전을 줄일 수 있음', check: '실제 방문지·체류시간, 총 소요시간, 식사 포함 여부, 취소 규정, 날씨 변수' },
    { name: '조잔케이·노보리베츠 온천 투어', fit: '자연 속에서 쉬고 싶을 때', pro: '온천과 풍경을 한 번에 즐기기 좋음', check: '송영 포함 여부, 입욕료·식사, 귀환 시간' },
    { name: '렌터카·자유 이동', fit: '여러 근교를 직접 조합하거나 일행이 여럿일 때', pro: '동선과 정차 장소를 자유롭게 선택', check: '겨울철 운전 경험·도로 상황·주차·보험 확인' }
  ],
  toursNote: [
    '투어는 가격만 비교하지 말고 출발 장소, 실제 방문지, 현지 체류시간, 식사 예약 방식, 사진 서비스, 취소 마감일을 함께 비교하세요.',
    '저장해둔 업체별 노선·가격은 삿포로 버스투어 정리본에서 확인하세요. 가격과 운행 조건은 작성 시점의 정보일 수 있으니 현재 판매 페이지에서 재확인하세요.'
  ],

  /* 4.0.6 준비물 */
  checklist: [
    { id: 'common', label: '계절 공통', items: [
      '여권, 항공권·숙소 예약 내역, 여행자보험 정보',
      '해외 결제 카드와 비상용 결제수단, 소액 엔화',
      'eSIM·로밍, 충전기, 보조배터리',
      '편한 신발, 작은 우산 또는 방수 겉옷, 상비약'
    ]},
    { id: 'winter', label: '겨울 추가', items: [
      '미끄럼 방지 밑창의 방수 신발 또는 부츠, 필요하면 아이젠',
      '보온 내의·두꺼운 양말·방풍 외투·장갑·목도리/넥워머·귀마개',
      '손·발 핫팩, 립밤·핸드크림 등 보습용품',
      '눈과 빙판길에 대비해 양손이 자유로운 가방'
    ]},
    { id: 'warm', label: '따뜻한 계절 추가', items: [
      '겹쳐 입을 얇은 옷',
      '자외선 차단용품',
      '비에 대비한 가벼운 겉옷'
    ]}
  ],
  checklistNote: '겨울 준비물의 상세 체크박스는 "겨울 삿포로 여행 준비물"에서 확인하세요. 실제 기온과 적설은 출발 직전에 확인하세요.',

  /* 4.0.7 맛집 */
  foods: [
    { kind: '미소라멘', icon: '🍜', shops: ['하루카', '테시카가 라멘'], point: '콘버터 라멘·매콤한 라멘 후보' },
    { kind: '스프카레', icon: '🍛', shops: ['스아게', '로지우라 커리 사무라이', '수프카레 사마', '가라쿠'], point: '채소·토핑·맵기 취향에 따라 선택' },
    { kind: '스시·회전초밥', icon: '🍣', shops: ['네무로 하나마루', '토리톤'], point: '해산물과 홋카이도 회전초밥' },
    { kind: '징기스칸', icon: '🐑', shops: ['다루마', '유우히', '마사진', '다이코쿠야'], point: '양고기 구이. 인기 매장은 대기·예약 확인' },
    { kind: '해산물·게 요리', icon: '🦀', shops: ['아이요', '카니자', '카니쇼군'], point: '이자카야부터 코스 요리까지 선택 폭이 있음' },
    { kind: '디저트·파르페', icon: '🍨', shops: ['파르페 커피 술 사토', '키노토야'], point: '늦은 밤 파르페 또는 유제품 디저트' }
  ],
  foodsNote: [
    '삿포로 대표 음식으로는 미소라멘, 스프카레, 징기스칸, 해산물과 유제품 디저트가 잘 알려져 있습니다.',
    '휴무·대기 시간은 방문 전 확인하고, 인기 식당은 예약 가능 여부를 살펴보세요.'
  ],
  foodsSource: { label: 'Japan National Tourism Organization', url: 'https://www.japan.travel/en/destinations/hokkaido/hokkaido/sapporo-and-around' }
};

/* ---------- GET /api/v1/guides/{guideId}/courses ----------
 * item.alt   : 같은 날의 대안(택1) 장소 → 경로(Polyline)에서 제외, '택1' 뱃지
 * day.choice : 하루 전체가 택1 일정 → 경로 미표시
 * item.status: 'closed' 이면 운영 종료 처리 (Dimmed + 일정 담기 비활성화)
 */
window.GUIDE_COURSES = [
  {
    planId: '2n3d', label: '2박 3일', subtitle: '삿포로 시내 중심',
    target: '삿포로 첫 방문, 이동을 줄이고 시내 맛집과 쇼핑에 집중하고 싶은 경우',
    notes: [],
    days: [
      { day: 1, items: [ { poi: 'cts' }, { poi: 'odori' }, { poi: 'tvTower' }, { poi: 'clockTower' }, { poi: 'redBrick' }, { poi: 'susukino', memo: '저녁 식사' } ] },
      { day: 2, items: [ { poi: 'nijo', memo: '아침 식사' }, { poi: 'beer' }, { poi: 'jingu', alt: true }, { poi: 'moiwa', memo: '야경' } ] },
      { day: 3, items: [ { poi: 'sapporoSt', memo: '쇼핑·간식' }, { poi: 'cts' } ] }
    ]
  },
  {
    planId: '3n4d', label: '3박 4일', subtitle: '삿포로 + 오타루',
    target: '대표 명소와 근교 한 곳을 균형 있게 보고 싶은 경우',
    notes: ['오타루도 야경이 아름답고 구경할 곳이 많아 1박이 가능하다면 추천해요. 공항 → 오타루 1박하며 전망대 루트까지 다녀오세요.'],
    days: [
      { day: 1, items: [ { poi: 'cts' }, { poi: 'odori' }, { poi: 'clockTower' }, { poi: 'susukino' } ] },
      { day: 2, items: [ { poi: 'otaruCanal' }, { poi: 'sakaimachi', memo: '해산물 점심' }, { poi: 'orgel' } ] },
      { day: 3, items: [ { poi: 'beer' }, { poi: 'jingu', alt: true }, { poi: 'moiwa', memo: '저녁 야경' } ] },
      { day: 4, items: [ { poi: 'sapporoSt', memo: '여유 있게 쇼핑' }, { poi: 'cts' } ] }
    ]
  },
  {
    planId: '4n5d', label: '4박 5일', subtitle: '삿포로 + 근교 2곳',
    target: '근교 투어를 넣되 삿포로 시내도 여유 있게 즐기고 싶은 경우',
    notes: ['비에이·후라노는 장거리 이동과 계절·날씨 영향을 크게 받으므로 투어 일정과 취소 규정을 확인하세요.'],
    days: [
      { day: 1, items: [ { poi: 'cts' }, { poi: 'odori' }, { poi: 'susukino' } ] },
      { day: 2, items: [ { poi: 'otaruCanal' }, { poi: 'sakaimachi' }, { poi: 'orgel' } ] },
      { day: 3, choice: true, items: [ { poi: 'biei' }, { poi: 'jozankei' }, { poi: 'noboribetsu' } ] },
      { day: 4, choice: true, items: [ { poi: 'jingu' }, { poi: 'shiroi' }, { poi: 'moiwa' } ] },
      { day: 5, items: [ { poi: 'sapporoSt', memo: '쇼핑' }, { poi: 'cts' } ] }
    ]
  }
];
