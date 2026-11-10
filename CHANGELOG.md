# CHANGELOG

> 이 지침 세트(공통 지침)의 버전 기록이다. 프로젝트는 `framework-update` 스킬로 새 버전을 반영한다.
> 버전 번호: `major.minor.patch`
> - major: 프로젝트 파일 구조가 바뀌어 옮기는 작업이 필요함 (항목에 "옮기는 방법"을 꼭 적는다)
> - minor: 규칙·스킬·점검 추가, 기존 프로젝트는 그대로 동작
> - patch: 문구·버그 수정
> 항목 분류: 추가 / 변경 / 삭제 / 고침 / 옮기는 방법(major만)

## v0.5.0 — 2026-11-10
문서 종류는 그대로 두고, 같은 내용을 두 번 적던 곳을 줄였다. 사람이 화면마다 꼭 읽을 문서는 명세 하나, 검수 보고·질문은 문제가 있을 때만 보면 되게 한다.

### 변경
- **질문 현황표 줄임** (`build-index`, `docs/questions/_index.md` AUTO 블록): 칸을 ID·대상·확인 대상·차단·상태·파일로 줄였다. 질문 문장과 답은 원본 질문 파일에만 있다
- **검수 보고 줄임** (`templates/report.md`, `QA.md` 2번, `implement-screen` 7단계): 3번 공통 체크리스트·4번 화면별 완료 기준은 미충족·해당 없음·확인 못 함인 항목만 적고 나머지는 "그 밖의 항목 충족" 한 줄. 7번 "열린 질문" 줄을 뺐다 (화면 맵이 원본). 가정·새로 남긴 질문·남은 작업은 그대로 적는다 (C12 대조용)
- **화면 명세 반복 줄임** (`templates/screen-spec.md`, `write-screen-spec`):
  - 같은 처리 방법·안내 문장은 한 번만 적고 다른 행은 "위와 같음". "디자인 필요" 처리 방법이 같으면 상태 표 아래 한 줄로 모은다
  - 3번 상태 표: 패턴의 필수 상태는 해당 없어도 "해당 없음"과 이유를 남기고, 필수가 아닌 상태는 해당 없으면 행을 지운다 (작성 가이드와 3번 안내가 서로 다르게 읽히던 것을 정리)
  - 기획서 분석(`docs/storyboard/`) 문장을 명세에 그대로 옮기지 않는다. 명세 섹션 형태로 정리한 것만 적는다
- `docs/questions/_index.md` 4번 "화면 퍼블 완료 보고": 가정 목록과 새로 남긴 질문을 적고, 열린 질문은 적지 않는다

### 프로젝트에서 할 일 (framework-update 뒤)
- 질문 현황표는 `build-index`가 다시 만든다. 따로 할 일은 없다
- 이미 쓴 검수 보고·화면 명세는 고치지 않아도 된다. 다음에 검수하거나 명세를 고칠 때 새 양식대로 쓴다

## v0.4.3 — 2026-11-09
v0.4.2 적용 중 나온 문제를 고치고, 지침 문제를 프로젝트 안에서 모으는 자리를 정했다.

### 추가
- **`data-screen-open="<화면ID>"`**: 화면 ID가 따로 있는 드로어·풀팝업을 여는 요소에 붙인다. 개발이 "여는 곳"을 검색으로 찾고, `check-pub` P5가 이 ID도 화면 목록과 대조한다. 그 화면이 지금 DOM에 없으면 `aria-controls`는 비워 두고 개발 전달에 적는다 (`a11y.md` 1번, `ARCHITECTURE.md` 4·10번)
- **지침 문제 자리 `docs/questions/framework.md`**(Q-FW, 확인 대상 "지침 관리자"): 공통 지침 자체의 문제를 질문과 같은 표로 모은다. 새 버전에 반영되면 "확정 — v<버전>에서 반영". `docs/questions/_index.md` 예외 칸 "지침 문제 전달 방법"
- 컴포넌트 명세 5번 **"화면 상태" 표**: 조합 계층(선택 전·선택 후 등)용. 기본 계층은 "요소 상태" 표
- `.claude/launch.json`(Claude 앱 미리보기 설정)을 "프로젝트 설정" 분류에 넣음. 원본에는 파일이 없고, 만드는 법은 HARNESS 5번·project-init

### 변경
- **원본 저장소에 이슈·PR을 직접 올리지 않는다** (AGENTS 항상 지킬 규칙, README, framework-update 스킬). 원본은 공개될 수 있어 프로젝트 값(서비스·고객사 이름, 화면 ID, Figma 키)이 밖으로 나가지 않게 한다
- 여는 요소의 속성을 나눔 (`a11y.md` 1번): 모달 대화상자(알럿·컨펌·풀팝업·화면을 덮는 드로어)는 `aria-haspopup="dialog"`만, 펼침형(드롭다운·아코디언·같은 화면 안 바텀시트)은 `aria-expanded` + `aria-controls`
- framework-update 커밋 순서: ① 공통 지침 반영 → ② 줄바꿈 정리(`.gitattributes`가 들어왔을 때, renormalize는 다른 변경까지 담으므로 다른 수정 전에) → ③ 프로젝트 할 일
- 재검수 기록(`QA.md` 5-2, 보고 8번): 비교 방법(캡처 / 계산값 / 키보드·읽기 순서)을 적는다. 마크업·속성만 바뀐 경우도 기록한다

### 고침
- "화면 확인 장치 폴더" 기본값 표기를 PROJECT.md와 같게 `<퍼블 소스 폴더>/preview/`로 (v0.4.2 CHANGELOG에는 `<퍼블 소스 폴더>preview/`로 적혀 있었다. 뜻은 같다)

### 프로젝트에서 할 일 (framework-update 뒤)
- 화면 ID가 있는 드로어·풀팝업을 여는 요소에 `data-screen-open`을 붙인다. 화면 ID를 주석으로 적어 두었으면 지운다
- 모달 대화상자를 여는 요소에 `aria-expanded`를 붙였으면 지우고 `aria-haspopup="dialog"`만 둔다
- 지침 문제를 따로 모아 두었으면 `docs/questions/framework.md`(양식 `templates/questions.md`, source `framework`, prefix `Q-FW`)로 옮긴다. 원본 저장소에 이슈로 올린 것이 있으면 이 파일로 옮긴 뒤 그 이슈를 닫는다
- 조합 계층 컴포넌트 명세의 상태 표를 "화면 상태" 표로 바꾼다 (다음에 고칠 때 해도 된다)
- 설정 확인 새 항목: `docs/questions/_index.md` 예외 칸 "지침 문제 전달 방법"

## v0.4.2 — 2026-11-09
네 번째 시험 적용(공통 지침 반영·푸터 정리)에서 나온 문제와, 입력 화면 묶음 전에 필요한 규칙을 넣었다.

### 추가
- `DESIGN.md` **5-2 요소 상태**: Figma variant 상태 값(Hover·Pressed·Focused·Disabled·Selected·Current·Error)을 CSS 의사 클래스·ARIA 속성에 대응시키는 표. 상태 모양은 클래스가 아니라 그 선택자로 건다. Figma에 없는 상태는 만들지 않고 질문하되 포커스 표시는 9번 예외 "기본 포커스 모양"으로 남긴다. 컴포넌트 명세 5번 상태 표에 "Figma 상태 값·CSS 대응" 칸
- `DESIGN.md` **5-3 움직임**: Figma 프로토타입·모션 토큰에 있는 것만 옮긴다. 화면 사이 전환은 개발 몫. `prefers-reduced-motion` 대응(a11y 6번). 9번 예외 "hover 처리"·"기본 포커스 모양"·"기본 움직임 값"
- 이동 태그 규칙에 **탭·드로어** (`a11y.md` 1번, `ARCHITECTURE.md` 4번): 같은 화면 안 탭은 `button role="tab"`, 다른 화면으로 가는 탭은 `a` + `aria-current`, 드로어·바텀시트·모달을 여는 요소는 `button aria-expanded`(`data-screen-link` 없음)
- **가정 값의 자리** (`DESIGN.md` 3-4·8번, `ds-requests/_index.md` 2번): 토큰 종류는 있는데 맞는 값이 없어 가정으로 진행하는 숫자도 레이아웃 값 파일에 `--assume-<종류>-<용도>`로 모은다. 컴포넌트는 `var()`만
- `check-pub` **P9 하드코딩**(중간): 색(HEX·rgb·hsl)과 2px 이상 px(소수 포함). 린트에서 늘 돌아, 어떤 도구로 고쳤든 결과가 같다. 규칙은 `.claude/scripts/hardcoded.mjs` 한 곳 — `check-hardcoded` 훅도 같은 함수를 쓴다
- `docs/PROJECT.md` **"화면 확인 장치 폴더"**(기본 `<퍼블 소스 폴더>preview/`): 개발에 넘기지 않는 미리보기 도구. `check-pub` P4·P9에서 빠진다
- 저장소 **`.gitattributes`**(`* text=auto eol=lf`, 이미지·글꼴·오피스 파일은 binary). "프로젝트 설정" 분류

### 변경
- 하드코딩 점검: 뷰포트 표의 구현 기준 폭·최소 폭과 디바이스 전환 폭을 폭 조건(min-width·max-width·@media·SCSS 변수)에 쓴 줄은 허용한다
- QA C2에 요소 상태 확인, 리뷰어 2·3번에 요소 상태·움직임·탭·드로어 태그

### 고침
- 하드코딩 점검이 `3.3px`·`14.4px` 같은 **소수 px를 놓치던 것**
- `framework-update`·`build-index`·`check-pub`·PROJECT.md 읽기가 **CRLF 파일**을 LF로 맞춰 읽는다. Windows 작업 폴더의 CRLF 때문에 같은 내용을 충돌로 보던 것
- `QA.md` 3-3이 허용 차이를 "5번 예외"로 잘못 가리키던 것 (6번), `PATTERNS.md`·리뷰어가 DESIGN 상태 절을 "5번"으로 가리키던 것 (5-1)

### 프로젝트에서 할 일 (framework-update 뒤)
- 업데이트 보고의 "설정 확인 — 새 항목"을 채운다: `docs/PROJECT.md` "화면 확인 장치 폴더", `docs/DESIGN.md` 9번 "hover 처리"·"기본 포커스 모양"·"기본 움직임 값". `.gitattributes`는 "설정 확인"으로 나온다 — 프로젝트에 없으면 새 버전 파일을 그대로 복사해 넣고, 있으면 차이를 보고 합친다
- `.gitattributes`를 넣은 뒤 Windows 작업 폴더에서 `git add --renormalize .`로 줄바꿈을 맞추고 따로 커밋한다
- `check-pub` P9에 걸린 값을 옮긴다: 토큰이 있으면 토큰, 토큰 종류가 없으면 `--layout-*`, 가정 값이면 `--assume-*` (레이아웃 값 파일). 린트가 P9 때문에 실패할 수 있다
- 탭·드로어·바텀시트를 여는 요소를 새 태그 규칙에 맞춘다
- 컴포넌트 명세 5번 상태 표에 "Figma 상태 값·CSS 대응" 칸을 채운다. 기존 명세는 다음에 고칠 때 채워도 된다

## v0.4.1 — 2026-11-04
문서·테스트의 예시 값 가운데 시험 적용 프로젝트에서 가져온 값을 일반 예시로 바꿨다. 동작은 바뀌지 않는다.

### 고침
- 예시 값 정리: `DESIGN.md` 3-4 레이아웃 값 예시의 Figma 노드, `src/components/AGENTS.md`·`templates/screen-spec.md`·`templates/flow.md`의 컴포넌트·화면 이름 예시를 특정 프로젝트와 무관한 값으로 바꿈
- 원본 테스트(`tests/check-pub.test.mjs`)의 화면 ID 예시를 일반 값으로 바꿈 (원본 전용, 프로젝트에는 영향 없음)

## v0.4.0 — 2026-11-04
세 번째 시험 적용(작업 묶음 02, 공통 컴포넌트를 함께 쓰는 탭 화면)에서 나온 문제 중 퍼블 방식에 영향을 주는 것과 자주 걸리는 도구 문제를 고쳤다. 기존 프로젝트는 그대로 동작한다.

### 추가
- `DESIGN.md` 6-3 **선(stroke)**: Figma 선 위치(안쪽·가운데·바깥)대로 옮기는 법. 안쪽 선을 그대로 `border`로 더해 선 두께만큼 커지는 것을 막는다. 9번 예외 "선 옮기는 방식", ds-check B·리뷰어 3번에 항목 추가
- `QA.md` 5-2 **공통 컴포넌트를 고친 경우의 재검수**: 쓰는 화면을 찾아 그 컴포넌트가 보이는 상태만 다시 비교하고, 각 보고 파일 8번 "재검수 기록"에 한 줄씩 남긴다. 보고 양식 8번 추가, 작업 묶음 작업 값에 "재검수"
- 플로우 양식 **"2-1. 도메인 밖 이동 화면"** 표: 다른 도메인 화면으로 가는 `data-screen-link` 대상을 적는 자리. 화면 맵에는 들어가지 않고 `check-pub` P5가 이동 대상으로 인정한다
- 화면 명세 10번 **"쓰는 컴포넌트의 가정"**: 공통 컴포넌트 안에 있는 가정(DS-ID·Q-ID)은 컴포넌트 명세에만 표시하고 화면 명세에는 이 한 줄로 모은다 (`docs/ds-requests/_index.md` 2번, `docs/questions/_index.md` 3번, write-screen-spec 확정 점검, QA C12)
- `framework-update`: 병합 파일의 예외 섹션과 프로젝트 설정 파일(PROJECT.md 등)에 새 버전이 더한 `- 키:` 항목을 "설정 확인"으로 이름까지 알린다. 예외 섹션 새 줄을 손으로 찾지 않아도 된다
- `framework-update.mjs --project <폴더>`: 새 버전 폴더의 스크립트로 프로젝트를 비교·반영한다. 스킬 3·5단계가 이 방식으로 바뀌어, 새 버전에서 고친 비교가 그 업데이트에 바로 적용된다. **이번 v0.4.0 업데이트부터** 이렇게 실행한다: `node <임시 폴더>/to/.claude/scripts/framework-update.mjs check --project . --from <임시 폴더>/from --to <임시 폴더>/to` (프로젝트의 스킬은 반영 뒤에 바뀌므로, 이번만 직접 이 명령으로 실행한다)

### 변경
- **이동 요소 태그** (`a11y.md` 1번, `ARCHITECTURE.md` 4번, 리뷰어 4번, implement-screen): 이동만 하는 요소는 `<a href="#" data-screen-link="…">`, 입력 확인·서버 호출 뒤에 이동하는 요소는 `<button type="button" data-screen-link="…">`. `#` 클릭으로 맨 위로 튀는 것은 화면 확인 장치 한 곳에서 막는다
- 질문 **"대상"·"반영 위치"는 쉼표로 여러 개**를 적는다. 같은 질문이 두 화면에 걸리면 줄을 나누지 않는다. `build-index`가 대상마다 열린 질문 수를 세고, 반영 위치마다 파일이 있는지 본다
- 컴포넌트 이름 만드는 법(`src/components/AGENTS.md` 3번): 컴포넌트 세트 이름까지만 쓰고 variant 속성 값으로 나뉜 경로 조각은 뺀다. 겹치는 단어는 한 번만. 기존 컴포넌트 모양을 고치면 6번에서 재검수로 이어진다
- `QA.md` 3-2 캡처: 폭은 창 크기가 아니라 뷰포트로 지정, 로딩이 끝난 뒤 찍기, 캡처 도구가 패키지면 개발용으로 승인받아 추가. 6번 예외 "화면 캡처 방법"의 예를 실제로 쓰인 방식으로. project-init이 캡처 명령을 한 번 실제로 돌려 본다
- `QA.md` 3-3: 허용 차이는 컴포넌트마다 본다. 같은 차이가 화면마다 되풀이되거나 쌓이면 구현 오류로 고친다
- 스킬의 브랜치 문장(plan-batch·ia-sync·token-sync·version-update·framework-update)을 "브랜치는 `docs/GIT.md`(7번 예외 포함)를 따른다. 예) …"로 통일
- `HARNESS.md` 3번: 셸 명령으로 문서를 고쳤으면 build-index를 직접 실행하고, 바뀐 `_index`는 "자동 생성"으로 같은 커밋에 넣는다
- `check-pub` P5 "확인 필요" 문구를 "값을 넘기는 곳(부모 화면의 prop·배열, 더미 데이터)"으로, 긴 바인딩식은 단어 경계에서 잘라 `…`를 붙인다

### 고침
- `build-index`를 손으로 실행할 때 표준 입력이 TTY가 아니면(다른 명령과 묶어 실행, 에이전트의 셸) 훅 입력을 끝없이 기다리던 것. 입력이 0.3초 안에 없으면 손 실행으로 본다. `</dev/null`을 붙이지 않아도 된다
- `build-index`가 절 안의 표를 읽을 때 아래 하위 절(`###`)의 표까지 섞어 읽던 것. 절의 첫 표만 읽는다
- `QA.md` 3-2가 캡처 방법을 "5번 예외"라고 잘못 가리키던 것 (6번)

### 프로젝트에서 할 일 (framework-update 뒤)
- 업데이트 보고의 "설정 확인 — 예외 섹션 새 항목"을 넣는다: `docs/DESIGN.md` 9번 "선 옮기는 방식"
- 플로우에 다른 도메인 이동 화면을 따로 적어 두었으면 "2-1. 도메인 밖 이동 화면" 표로 옮긴다 (`templates/flow.md`)
- 이동 요소를 새 태그 규칙에 맞춘다: 이동만 하는 `button`은 `a href="#"`로. 미리보기의 `#` 처리는 한 곳에서
- 공통 컴포넌트를 고친 뒤 다시 비교한 화면이 있으면 그 화면 보고 파일에 8번 "재검수 기록"을 더한다 (`templates/report.md` 8번을 복사)
- 화면 명세에 공통 컴포넌트의 가정을 값마다 적었으면 10번 "쓰는 컴포넌트의 가정" 한 줄로 모은다
- 테두리가 있는 컴포넌트를 `DESIGN.md` 6-3으로 확인한다
- 같은 내용으로 나눈 질문 줄은 그대로 둬도 된다. 새 질문부터 쉼표로 적는다

## v0.3.1 — 2026-11-04

### 고침
- `check-pub` P5: Vue 바인딩(`:data-screen-link="…"`·`v-bind:`)과 JSX `{식}`을 화면 ID로 잘못 읽어 "높음"을 내던 것을 고쳤다. 고정 값은 전처럼 화면 목록과 대조하고, 바인딩식은 식 안의 문자열 중 화면 ID 형식에 맞는 것만 대조한다. 화면 ID 문자열이 없는 바인딩식(예: `item.screenLink`)은 "확인 필요"로 알린다 (v0.3.0에서 P5가 실제로 돌기 시작하며 드러남. 이 때문에 린트가 실패할 수 있었다)

### 프로젝트에서 할 일 (framework-update 뒤)
- 없음. "확인 필요"로 나온 바인딩식은 값이 오는 곳(더미 데이터 등)의 화면 ID를 눈으로 확인한다

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
첫 시험 적용(시험용 저장소, 금융권 화면 일부)에서 나온 문제를 고쳤다. 기존 프로젝트는 그대로 동작한다.

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
