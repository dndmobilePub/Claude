# UI 바이브 코딩 지침 구조

Claude Code로 UI를 만들기 위한 **재사용 가능한 md 지침 세트**입니다.
공통 규칙·절차·양식은 그대로 쓰고, 프로젝트마다 다른 값만 정해진 자리에 채워 사용합니다.

- 대상 범위: 기획(플로우·화면 명세) → 디자인(Figma 디자인 시스템) → 퍼블리싱(컴포넌트·화면)
- 결과물: **개발팀에 넘기는 퍼블리싱 파일** (JS(HTML·CSS·JS) / React / Vue 중 프로젝트에서 선택). 화면 이동·서버 연결은 개발 몫입니다.
- 기준 도구: Claude Code + Figma MCP
- 모든 지침 문서는 한국어로 작성합니다.

---

## 1. 구조

```
CLAUDE.md                     # 라우터: 작업별로 읽을 문서 안내 (짧게 유지)
docs/
  PROJECT.md                  # 프로젝트별 설정: 서비스명·입력 원본(IA·기획서·Figma)·화면 ID 형식·퍼블 언어·스타일링·명령어·토큰 위치
  PRODUCT.md                  # 기획·도메인·용어집
  DESIGN.md                   # 디자인 시스템 사용 규칙 (값은 Figma가 원본)
  ARCHITECTURE.md             # 퍼블 파일 구조: 퍼블과 개발의 경계·화면 폴더·이동 표시·더미 데이터·상태 확인
  PATTERNS.md                 # 화면 패턴: 목록·상세·입력·확인·결과·검색·안내·동의의 필수 상태·빠지기 쉬운 항목
  QA.md                       # 검수 기준: 순서·공통 체크리스트·시각 비교(허용 차이·원인 분류)·결과·재검수
  GIT.md                      # 브랜치·커밋·PR 규칙
  HARNESS.md                  # 권한·훅 설정 설명과 토큰 절감 습관
  ia/source.md                # IA 읽는 방법 (시트·칼럼 매핑·도메인 대응·WBS 해석, ia-sync가 작성)
  ia/screen-list.md           # IA 사본: 화면 목록·일정 (화면 ID·화면명의 원본, ia-sync가 생성)
  storyboard/<도메인>.md       # 기획서 분석 (Figma 설계서·PPT의 md 사본, write-flow가 생성)
  ui-flow/_index.md           # 화면 ID 체계·공통 화면·상태 정의 + 현황 표(자동 생성)
  ui-flow/<도메인>.md          # 도메인별 플로우 (화면 목록은 IA를 따름. IA가 없으면 이 표가 원본)
  screens/<화면ID>.md          # 화면 명세 (화면당 1파일, frontmatter가 상태의 원본)
  components/_index.md        # Figma ↔ 코드 컴포넌트 연결 목록 + 명세 현황 표(자동 생성)
  components/<컴포넌트명>.md    # 컴포넌트 명세 (화면에서 쓰는 컴포넌트 모두. 기존 컴포넌트는 연결만 담은 짧은 명세)
  questions/_index.md         # 질문 기록 규칙 + 열린 질문 현황(자동 생성)
  questions/<원본>.md          # 질문 원본: ia·plan(기획서)·design(디자인)·spec(작업 중·원본끼리 다름)
  changes/_index.md           # 기준 버전·변경 기록 규칙 + 현재 버전·수정필요 현황(자동 생성)
  changes/<원본>-<버전>.md      # 입력 원본 새 버전의 변경 기록 (version-update가 생성)
  reports/<화면ID>.md          # 검수 보고 (화면당 1파일, 최신본만, implement-screen이 생성)
  batches/_index.md           # 작업 묶음 규칙 + 묶음 현황(자동 생성)
  batches/<묶음 ID>.md         # 작업 묶음: 대상 화면·순서·선행 조건 (plan-batch가 생성)
  ds-requests/_index.md       # DS 변경 요청 규칙(질문·요청·ADR 구분) + 열린 요청 현황(자동 생성)
  ds-requests/<요청 ID>-<이름>.md  # 디자인 시스템 추가·변경 요청과 결정·후속 작업
  decisions/<번호>-<제목>.md    # 설계 결정 기록 (ADR)
.claude/
  settings.json               # 권한(읽기 금지·명령 차단·확인) + 훅 등록
  hooks/
    check-hardcoded.mjs       #   파일 수정 직후 하드코딩 색상·px 경고
    build-index.mjs           #   문서 수정 직후 _index.md 현황 표 재생성·불일치 경고
    session-reminder.mjs      #   대화 압축 후 핵심 규칙·작업 위치 재안내
  scripts/
    office-zip.mjs            #   xlsx·pptx 공용 읽기 모듈 (외부 패키지 없음)
    check-pub.mjs             #   퍼블 점검 스크립트 P1~P6 (ds-check가 먼저 실행)
  rules/                      # src/ 작업 시 자동 적용되는 규칙
    figma-design-system.md    #   Figma → 코드 구현 절차
    a11y.md                   #   접근성
    finance-ui.md             #   금융 UI
  skills/                     # 반복 절차
    project-init/             #   PROJECT.md 채우기
    ia-sync/                  #   IA 엑셀 → docs/ia/ 사본, 읽기 스크립트(read-ia.mjs) 포함
    write-flow/               #   기획서(Figma·PPT) 분석 + 도메인 플로우 작성, 읽기 스크립트(read-storyboard.js·read-ppt.mjs) 포함
    write-screen-spec/        #   화면 명세 작성·확정 점검
    implement-screen/         #   화면 명세 → Figma 조회 → 퍼블 → 검증 → 개발 전달 보고
    token-sync/               #   Figma 변수·텍스트 스타일·그림자 → 코드 토큰 파일(tokens.css, text-styles.css, React·Vue는 참조 파일 포함), 읽기 전용 조회 스크립트 2개 포함
    ds-check/                 #   디자인 시스템 위반 검출
    plan-batch/               #   명세 확정 화면 → 작업 묶음(순서·선행 조건)
    version-update/           #   입력 원본 새 버전 → 변경 기록·영향 문서 수정필요·기준 버전 갱신 (bump-ver.mjs 포함)
  agents/
    design-system-reviewer.md #   독립 리뷰어 (명세·상태·코드 구조·접근성·금융 규칙)
templates/                    # 양식
  screen-spec.md              #   화면 명세
  flow.md                     #   플로우
  component-spec.md           #   컴포넌트 명세
  adr.md                      #   설계 결정 기록
  storyboard.md               #   기획서 분석
  ia-source.md                #   IA 읽는 방법
  ia-screen-list.md           #   IA 사본 (화면 목록·일정)
  questions.md                #   질문 파일
  change.md                   #   변경 기록 (버전 변경)
  report.md                   #   검수 보고
  batch.md                    #   작업 묶음
  ds-request.md               #   DS 변경 요청
src/components/CLAUDE.md      # 컴포넌트 폴더 규칙 (계층·네이밍·Props)
.github/pull_request_template.md  # PR 본문 양식
```

## 2. 재사용 구분

| 구분 | 파일 | 새 프로젝트에서 |
|---|---|---|
| 공통 | `CLAUDE.md`, `templates/`, `.claude/skills/`, `.claude/agents/`, `.claude/settings.json`, `.claude/hooks/`, `.claude/scripts/`, `.github/pull_request_template.md` | 그대로 사용 (경로가 다르면 `docs/HARNESS.md` 5번대로 조정) |
| 공통 + 예외 섹션 | `docs/DESIGN.md`(9번), `docs/ARCHITECTURE.md`(11번), `docs/GIT.md`(7번), `docs/HARNESS.md`(6번), `.claude/rules/` 3종, `src/components/CLAUDE.md` | 맨 아래 "프로젝트별 예외" 섹션만 채움 |
| 프로젝트별 | `docs/PROJECT.md`, `docs/PRODUCT.md`, `docs/ia/`, `docs/questions/`(`_index.md`의 1~4번 규칙은 공통), `docs/storyboard/`, `docs/ui-flow/`, `docs/screens/`, `docs/components/`, `docs/decisions/` | 새로 작성 |

- 공통 규칙을 고치고 싶으면 프로젝트 저장소가 아니라 **이 원본 저장소**에서 고친 뒤 각 프로젝트에 반영합니다.
- 프로젝트에서만 다른 점은 공통 규칙을 고치지 말고 예외 섹션이나 ADR로 남깁니다.

## 3. 새 프로젝트 시작 순서

### 준비
- Claude Code 설치, Node.js 설치 (훅 스크립트 실행용 — 프론트엔드 프로젝트라면 이미 있음)
- Figma MCP 서버를 Claude Code에 연결 (Figma 공식 문서 참고)
- 이 저장소의 파일을 프로젝트 저장소 루트로 복사
- 입력 원본 준비: IA 엑셀(.xlsx), 기획서(Figma 설계서 URL·PPT .pptx). 파일은 저장소 안에 두기를 권장 (IA·PPT 읽기 스크립트는 Node만 있으면 동작)

### 단계
| 구분 | 단계 | 할 일 | Claude Code에 요청하는 예 |
|---|---|---|---|
| 준비 | 1 | 프로젝트 설정 채우기 | `/project-init` |
| 준비 | 2 | 예외 섹션 채우기 (DESIGN.md 9번, ARCHITECTURE.md 11번, QA.md 6번, GIT.md 7번, rules 3종, 컴포넌트 규칙 8번) | "finance-ui.md 예외 섹션 같이 채우자" |
| 디자인 | 3 | 코드 토큰 파일 만들기 | `/token-sync` |
| 기획 | 4 | IA 분석 → 화면 목록·일정 사본 | `/ia-sync` |
| 기획 | 5 | 기획 문서 작성 | "PRODUCT.md 작성 도와줘" |
| 기획 | 6 | 기획서(Figma·PPT) 분석 + 도메인별 플로우 작성 (화면 목록은 IA 기준) | `/write-flow transfer` |
| 기획·디자인 | 7 | 화면 명세 작성 (Figma 화면 프레임 확인 포함) | `/write-screen-spec TRF-010` |
| 기획·디자인 | 8 | 명세 확정 점검 → 상태 "확정" | `/write-screen-spec TRF-010 확정점검` |
| 퍼블리싱 | 9 | 확정된 화면을 작업 묶음으로 묶기 (순서·선행 조건) | `/plan-batch` |
| 퍼블리싱·검수 | 10 | 묶음 퍼블 → 화면마다 검수(`docs/QA.md`) → 보고 파일·개발 전달 | `/implement-screen 03-account-list` (화면 하나면 `TRF-010`) |
| 검수 | 11 | 사람이 보고 파일과 화면 확인 → PR 승인 | PR 리뷰 |

- 구분은 전체 흐름(준비 → 기획 → 디자인 → 퍼블리싱 → 검수) 중 어디에 속하는지입니다. 코드 토큰은 화면 작업보다 먼저 있어야 해서 3단계에 둡니다.
- 비어 있는 `[TODO]` 값이 작업에 필요하면 Claude가 추측하지 않고 먼저 묻습니다.
- IA가 없는 프로젝트는 4단계를 건너뜁니다. 이때는 6단계에서 화면 ID를 정하고 플로우 문서가 화면 목록의 원본이 됩니다.
- 진행 중에 IA·기획서·디자인의 새 버전을 받으면 `/version-update`로 반영합니다. 영향받은 화면만 "수정필요"가 되고, 명세 수정 → 확정 → 다시 퍼블 순서로 처리합니다.

## 4. 화면 하나가 완성되는 흐름

```
/ia-sync (IA → 화면 목록, 플로우 전) → /write-flow (기획서 분석 → 플로우에 화면 등록, 명세 전) → /write-screen-spec (초안) → 기획·디자인 확인 (검토)
→ /write-screen-spec 확정점검 (확정)
→ /plan-batch (작업 묶음: 순서·선행 조건)
→ /implement-screen <묶음 ID> — 묶음 안 화면마다 아래를 반복
    사전 점검 → Figma 조회 → 퍼블 계획 [승인] → 퍼블 (이동은 data-screen-link 표시만)
    → 검수 (린트·테스트, ds-check, 디자인 프레임 폭에서 Figma 비교, 기준 폭·최소 폭, 상태별 확인, design-system-reviewer)
    → 공통 체크리스트·화면별 기준 대조 → 결과(통과/조건부 통과/미통과) → 보고 파일 [승인] → 상태 갱신·커밋 (구현완료)
→ PR 리뷰 (사람 검수)
```

- 괄호 안의 상태는 화면 명세 frontmatter의 `status`에만 적습니다. `_index.md` 현황 표는 훅이 자동으로 다시 만듭니다.
- 새 컴포넌트가 필요하면 구현 전에 `templates/component-spec.md`로 명세를 쓰고 승인받습니다.
- 디자인 시스템에 없는 것이 나오면 멈추고 DS 변경 요청(`docs/ds-requests/`)을 만들어 반영·대체·기각 결정을 받습니다. 결정 전에는 그 화면을 확정·퍼블하지 않습니다.
- Figma 컴포넌트는 연결 목록(`docs/components/_index.md`)으로 코드 컴포넌트와 맞춥니다. 연결 없는 라이브러리 컴포넌트를 만나면 멈춥니다.
- 어느 단계에서든 자료에 없는 것은 지어내지 않고 `docs/questions/`에 질문으로 남깁니다. 차단 질문이 열려 있으면 명세 확정·퍼블을 시작하지 않습니다. 열린 질문 수는 화면 맵과 `docs/questions/_index.md`에 자동으로 모입니다.

## 5. 운영 원칙

- **승인**: 파일 생성·수정·커밋 전에 항상 승인을 받습니다. 단계를 건너뛰지 않습니다.
- **입력 원본은 읽기만**: IA·기획서·디자인은 사람이 만듭니다. AI는 새로 그리거나 고치지 않고, 읽어서 분석한 뒤 md로 옮깁니다. (Figma 쓰기 도구는 권한 설정으로 막아 두었습니다)
- **원본은 하나**: 디자인 값은 Figma(코드 토큰 파일은 `token-sync`가 만드는 사본), 화면 ID·화면명·일정은 IA(`docs/ia/`는 `ia-sync`가 만드는 사본, IA가 없으면 플로우 문서), 기획 내용은 기획서(`docs/storyboard/`는 `write-flow`가 만드는 사본), 프로젝트 설정은 `PROJECT.md`, 구조·규칙 결정은 ADR, 디자인 시스템에 없는 것의 결정은 DS 변경 요청, Figma ↔ 코드 컴포넌트 연결은 컴포넌트 명세, 질문과 답은 `docs/questions/`의 질문 줄, 화면·컴포넌트 상태는 각 명세의 frontmatter. 같은 내용을 여러 곳에 복사하지 않습니다.
- **토큰 절감**: 작업에 필요한 문서·Figma 노드만 읽습니다. 명세·플로우는 파일을 잘게 나누고, 템플릿 주석은 작성 후 지웁니다. 빌드 결과·잠금 파일은 권한 설정으로 읽기를 막아 두었습니다. (`docs/HARNESS.md`)
- **역할 분리**: 하드코딩 값은 `ds-check`, 명세·접근성·금융 규칙 검토는 `design-system-reviewer`가 맡습니다. 검수 기준은 `docs/QA.md` 하나에 두고, 결과는 화면마다 `docs/reports/<화면ID>.md` 하나에 남깁니다.
