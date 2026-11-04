# CHANGELOG

> 이 지침 세트(공통 지침)의 버전 기록이다. 프로젝트는 `framework-update` 스킬로 새 버전을 반영한다.
> 버전 번호: `major.minor.patch`
> - major: 프로젝트 파일 구조가 바뀌어 옮기는 작업이 필요함 (항목에 "옮기는 방법"을 꼭 적는다)
> - minor: 규칙·스킬·점검 추가, 기존 프로젝트는 그대로 동작
> - patch: 문구·버그 수정
> 항목 분류: 추가 / 변경 / 삭제 / 고침 / 옮기는 방법(major만)

## v0.3.0 — 2026-11-04
두 번째 시험 적용(시험용 저장소에서 실제 퍼블·검수까지)에서 나온 문제 중 급한 것과 규칙끼리 충돌하는 것을 고쳤다. 기존 프로젝트는 그대로 동작한다.

### 추가
- DS 변경 요청의 **가정 진행**: 사용자가 허락하면 요청 파일에 `assume: 예`와 4번 `- 가정:` 줄을 적고 결정 전에 진행한다. 화면을 멈추지 않고, 코드·문서에는 `가정(DS-ID)`를 붙인다 (`docs/ds-requests/_index.md` 2번, `templates/ds-request.md`). `build-index`는 가정 진행 요청의 화면을 경고하지 않고 현황에 "가정 진행 화면"으로 따로 보여 준다
- `DESIGN.md` 3-4 **토큰이 없는 종류(레이아웃 값 파일)**: 디자인 시스템에 토큰이 없는 폭·높이·z-index 등은 `docs/PROJECT.md` "레이아웃 값 파일" 한 곳에 `--layout-<용도>` 변수로 모으고 컴포넌트는 그 변수만 쓴다. `check-hardcoded` 훅·`ds-check`는 이 파일을 빼고 본다
- `docs/PROJECT.md` "레이아웃 값 파일"(기본 `<퍼블 소스 폴더>/styles/layout.css`)과 뷰포트 "디바이스 전환 폭"
- `DESIGN.md` 6-1: 반응형 화면의 전환 폭은 PROJECT.md 값을 따르고 공통 스타일 한 곳에서만 정의한다
- 컴포넌트 명세 `figma_name`에 **세트 여럿**(예: 디바이스별 `…/Mobile`·`…/PC`)을 쉼표로 적을 수 있다. `build-index`가 세트마다 연결 목록 줄을 만들고 세트별로 중복을 본다. Figma 경로 이름을 코드 이름으로 바꾸는 법은 `src/components/AGENTS.md` 3번, 실제 방식은 8번 예외 "Figma 이름 → 코드 이름"
- `ARCHITECTURE.md` 4-2: SVG를 넣는 방식 4가지(파일 참조 / 마크업 직접 / 빌드 도구 / CSS 마스크) 비교표. 받은 SVG의 색을 `currentColor`로 바꾸는 것은 Figma 수정이 아님 (`figma-design-system.md` 4번에도)
- `write-screen-spec` 확정 점검: 쓰는 컴포넌트 명세의 Variant·상태와 화면 명세가 맞는지 대조

### 변경
- `check-pub` P5: 화면 목록의 ID를 `docs/PROJECT.md` "화면 ID 형식"으로 읽는다. 비어 있으면 "영문으로 시작하고 숫자가 든 이름"으로 넓게 본다 (전에는 숫자로 끝나는 ID만 읽어 `ABC001_10MS` 같은 형식에서 P5가 늘 건너뛰었다). 화면 ID 형식 읽기는 `project-values.mjs`로 옮겨 `build-index`와 함께 쓴다
- `implement-screen`: 브랜치·PR 규칙을 스킬에 직접 적지 않고 `docs/GIT.md`(7번 예외 포함)를 따른다. 묶음은 한 대화가 기본이고 화면 사이 `/compact`는 권장으로 바꿨다 (`docs/batches/_index.md`도)
- `src/components/AGENTS.md` 2번: 내보내기(index)는 React·Vue 기본값이고, 8번 예외 "폴더 안 파일 구성"이 먼저다
- 검수 보고 가정 목록·QA C12에 `가정(DS-ID)` 포함

### 프로젝트에서 할 일 (framework-update 뒤)
- `docs/PROJECT.md`에 새 줄 두 개를 손으로 넣는다: "레이아웃 값 파일"(퍼블 기술 스택, 코드 토큰 위치 아래), "디바이스 전환 폭"(뷰포트 표 아래). 프로젝트 설정 파일이라 업데이트가 덮어쓰지 않는다
- `src/components/AGENTS.md` 8번 예외에 새 줄 "Figma 이름 → 코드 이름"이 생겼다. 예외 칸 새 줄은 업데이트 보고에 나오지 않을 수 있어 직접 확인한다
- 결정 전에 가정으로 진행 중인 DS 요청이 있으면 요청 파일에 `assume: 예`와 `- 가정:` 줄을 적는다
- 컴포넌트에 직접 쓴 폭·높이·z-index 숫자는 레이아웃 값 파일로 옮긴다

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
