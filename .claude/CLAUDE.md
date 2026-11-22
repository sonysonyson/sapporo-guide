# 삿포로 여행 가이드 — 프로젝트 컨텍스트

이 파일은 Claude Code가 세션 시작 시 자동으로 읽는다. 작업 전 아래 문서를 먼저 확인할 것.

## 문서 위치
| 파일 | 내용 |
| --- | --- |
| `../code_artifact.md` | **원본 화면 개발 요청서 (Source of Truth)**. 사용자가 직접 수정함 |
| `requirements/code_artifact.md` | 요청서 스냅샷 (구현 당시 버전, 변경 비교용) |
| `requirements/implementation-spec.md` | 요구사항 → 구현 매핑, 해석·결정 사항, 미결 사항 |
| `conversation-log.md` | 대화/작업 이력 (세션별 요청 · 결정 · 변경 파일) |

## 작업 규칙
1. 요구조건 우선순위: **요청서 4.0.x 콘텐츠 > 4.1~8장 공통 요구사항**. 4.0.x와 맞지 않거나 불필요한 기능은 무시 가능 (요청서 4.0 문구).
2. 사용자가 `code_artifact.md`를 수정했다면 `requirements/code_artifact.md` 스냅샷과 diff 비교 → 변경분 반영 → 스냅샷 갱신.
3. 매 작업 후 `conversation-log.md`에 날짜·요청·결정·변경 파일을 추가하고, 결정이 바뀌면 `implementation-spec.md`도 갱신.
4. UI 문자열은 `js/i18n.js`에만 둔다 (다국어 확장 대비, 하드코딩 지양). 콘텐츠는 `js/data.js`.
5. 응답·문서는 한국어로 작성.

## 코드 구조
```
index.html        화면 골격 (네비, 커버, 섹션 컨테이너, 시트/모달/전체지도)
css/style.css     모바일 우선 스타일 (최대 폭 480px 앱 프레임)
js/i18n.js        UI 문자열 사전 + t()
js/data.js        Mock 데이터 (가이드 상세, POI 좌표, 일차별 코스, 내 일정)
js/api.js         Mock API (5장 엔드포인트 대응) + track() 이벤트 로그
js/app.js         렌더링·인터랙션
```
실행: 폴더에서 `python -m http.server 8000` → http://localhost:8000
데모 파라미터: `?demo=error`(재시도 화면), `?demo=closed`(운영 종료 장소). 로그인 상태 초기화: localStorage `sg.loggedIn` 삭제.
