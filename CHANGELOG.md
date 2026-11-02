# CHANGELOG

> 이 지침 세트(공통 지침)의 버전 기록이다. 프로젝트는 `framework-update` 스킬로 새 버전을 반영한다.
> 버전 번호: `major.minor.patch`
> - major: 프로젝트 파일 구조가 바뀌어 옮기는 작업이 필요함 (항목에 "옮기는 방법"을 꼭 적는다)
> - minor: 규칙·스킬·점검 추가, 기존 프로젝트는 그대로 동작
> - patch: 문구·버그 수정
> 항목 분류: 추가 / 변경 / 삭제 / 고침 / 옮기는 방법(major만)

## v0.2.0 — 2026-11-02
첫 시험 적용(시험용 저장소, 금융권 다건이체 화면 일부)에서 나온 문제를 고쳤다. 기존 프로젝트는 그대로 동작한다.

### 추가
- 토큰 변환 스크립트: `token-sync/export-tokens.js`(Figma 변수·텍스트·효과 스타일을 압축 형식 + 해시로 내보냄)와 `convert-tokens.mjs`(해시 검사 → `DESIGN.md` 3-2·3-3·9번대로 토큰 파일 생성, 기존 파일과 비교·삭제 토큰 사용처 보고, `--write`로 작성). 토큰 수백 개를 AI가 손으로 옮겨 쓰지 않는다
- `DESIGN.md` 9번 예외 칸 "숫자 단위 지정"·"모드 이름". 스크립트가 읽는 줄은 백틱 안 `키=값`으로 적는다
- `DESIGN.md` 3-3 텍스트 스타일 꾸밈(밑줄·취소선 → `-text-decoration`)
- README "시작 첫날 확인 목록"에 Figma 스크린샷 받기·토큰 변환
- write-flow 0단계: 기획서를 Figma에 이미지로 붙인 경우 이미지 노드를 한 장씩 스크린샷으로 읽는 절차. `read-storyboard.js`가 이미지 노드 목록(`images`)을 돌려줌

### 변경
- `DESIGN.md` 3-2: 게시에서 숨긴 변수도 동기화하는 변수·스타일이 가리키면 원시 토큰으로 포함한다 (숨긴 원시 색 + 공개 의미 토큰 구조). `token-sync` 멈춤 조건에서 "숨긴 변수" 삭제
- `token-sync` 2~5단계: 내보내기 → 임시 파일 → 변환·비교 → 승인 → `--write`
- Figma 스크린샷을 주소로 받지 못하면 `enableBase64Response: true`로 받는다 (`DESIGN.md` 2번, `QA.md` 3-2)
- `HARNESS.md`: `use_figma` 결과 48KB 제한, 지원하지 않는 API 금지

### 고침
- `read-storyboard.js`: Figma MCP가 지원하지 않는 `figma.loadAllPagesAsync()`를 쓰지 않는다. 페이지 목록만 먼저 받고 페이지는 하나씩 연다
- `read-variables.js`·`read-styles.js`·`read-storyboard.js`: 글자 수가 아니라 바이트(40,000)로 나눠 돌려준다 (한글이 많으면 48KB를 넘던 문제)
- 원본 검사 `tests/`: framework-update 테스트가 버전 번호에 묶여 있던 것을 지금 버전 기준으로 바꿈, `convert-tokens` 테스트 10개 추가 (모두 47개)

## v0.1.0 — 2026-10-30
첫 버전. 첫 적용 프로젝트에서 검증한 뒤 v1.0.0으로 올린다.

### 추가
- 라우터 `AGENTS.md`, 프로젝트 설정 `docs/PROJECT.md`, 공통 규칙(DESIGN·ARCHITECTURE·PATTERNS·QA·GIT·HARNESS)과 각 문서의 "프로젝트별 예외" 섹션
- 입력 원본 분석: IA(화면 목록·WBS 일정, `ia-sync`), 기획서(Figma 설계서·PPT, `write-flow`), Figma 변수·텍스트 스타일·그림자 → 코드 토큰(`token-sync`)
- 기획·명세: 도메인 플로우, 화면 명세와 확정 점검(`write-screen-spec`), 화면 패턴 8종, 공통 화면
- 퍼블·검수: 작업 묶음(`plan-batch`), 퍼블(`implement-screen`), 검수 기준과 화면별 보고 파일, 독립 리뷰어, `ds-check`·`check-pub`(P1~P8)
- 관리: 질문 모음(원본별 질문 파일), 입력 원본 버전 변경(`version-update`), DS 변경 요청, Figma ↔ 코드 컴포넌트 연결
- 하네스: 권한·훅(`check-hardcoded`·`build-index`·`session-reminder`), 경로별 규칙(Figma 구현·접근성)
- 업종 규칙: 프로젝트가 `docs/PROJECT.md` "업종 규칙"으로 고르는 경로별 규칙(예: 금융 UI `finance-ui.md`). `.claude/framework.json` "업종별 선택" 분류 — 프로젝트가 지운 파일은 업데이트 때 되살리지 않음
- 문서 기본 요소(`lang`·viewport·제목·웹폰트 한 곳, `docs/PROJECT.md` "화면 언어")와 에셋 규칙(위치·형식·파일 이름, Figma 임시 에셋 주소 금지), 검수 C15·`check-pub` P8
- 파일 구조 두 가지(화면 폴더 / 종류별 폴더), 퍼블 소스 폴더 설정, 스타일은 컴포넌트 안에서·예외만 `global.css`
- 배포: `.claude/framework.json`(버전·파일 분류: 지침 관리 / 지침 + 프로젝트 예외 / 업종별 선택 / 프로젝트 설정 / 프로젝트 작성 / 지침 원본 전용 — 누가 관리하는지로 나눔), `framework-update` 스킬·스크립트, 이 CHANGELOG
- `build-index`: 플로우 화면 목록에서 화면 ID 형식이 맞지 않는 행을 조용히 빼지 않고 경고 (테스트로 찾음)
- 원본 검사: `tests/`(framework-update·build-index·check-pub·IA·PPT 읽기·bump-ver, `node --test`, "지침 원본 전용" 분류라 프로젝트에 배포하지 않음), README "시작 첫날 확인 목록"
