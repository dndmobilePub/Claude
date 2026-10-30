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
AGENTS.md            # 라우터: 작업별로 읽을 문서 안내. Claude Code가 프로젝트 지침으로 읽음
CHANGELOG.md         # 공통 지침 버전 기록
docs/
  PROJECT.md         # 프로젝트별 설정 (서비스명·화면 언어·업종 규칙·입력 원본·뷰포트·퍼블 기술 스택·명령어)
  PRODUCT.md         # 기획·도메인·용어집
  DESIGN.md · ARCHITECTURE.md · PATTERNS.md · QA.md · GIT.md · HARNESS.md   # 공통 규칙 (맨 아래 "프로젝트별 예외")
  ia/ · storyboard/  # 입력 원본(IA·기획서)의 md 사본 — 스킬이 만듦
  ui-flow/ · screens/ · components/   # 플로우 · 화면 명세 · 컴포넌트 명세
  questions/ · changes/ · ds-requests/ · decisions/   # 질문 · 버전 변경 기록 · DS 변경 요청 · ADR
  batches/ · reports/                 # 작업 묶음 · 화면별 검수 보고
.claude/
  framework.json     # 공통 지침 버전 + 파일 분류 (업데이트의 기준)
  settings.json      # 권한·훅 등록
  hooks/ · scripts/  # 자동 점검·현황 생성·입력 원본 읽기·업데이트 스크립트 (외부 패키지 없음)
  rules/             # 퍼블 소스 폴더 작업 때 자동 적용: 공통(Figma 구현·접근성) + 업종 규칙(예: 금융 UI)
  skills/ · agents/  # 반복 절차 · 독립 리뷰어
templates/           # 명세·플로우·질문·보고 등 양식
src/components/AGENTS.md   # 컴포넌트 폴더 규칙 (퍼블 소스 폴더가 다르면 그 폴더로 옮김)
tests/               # 지침 원본 검사용 테스트 (프로젝트에는 쓰지 않음, 6번)
```

- 작업별로 어떤 문서·스킬을 쓰는지는 `AGENTS.md`, 훅·스크립트 하나하나의 역할은 `docs/HARNESS.md`, 파일 분류는 `.claude/framework.json`이 원본입니다. 이 트리는 큰 그림만 보여줍니다.

## 2. 재사용 구분
파일마다 **누가 관리하는지**가 정해져 있습니다. 공통 지침 업데이트(`/framework-update`)는 이 분류를 보고 파일마다 처리 방법을 정합니다. 원본은 `.claude/framework.json`의 `files`입니다.

| 분류 | 파일 | 프로젝트에서 | 공통 지침 업데이트 때 |
|---|---|---|---|
| 지침 관리 | `AGENTS.md`, `CHANGELOG.md`, `.claude/skills/`·`agents/`·`hooks/`·`scripts/`, `templates/`, PR 양식 | 고치지 않고 그대로 사용 (사람·AI 모두). 고칠 일은 원본 저장소에 보완 요청 | 새 버전으로 바뀜 |
| 지침 + 프로젝트 예외 | `docs/DESIGN.md`·`ARCHITECTURE.md`·`PATTERNS.md`·`QA.md`·`GIT.md`·`HARNESS.md`, `docs/*/_index.md`, `.claude/rules/`의 공통 규칙(Figma 구현·접근성), `src/components/AGENTS.md` | 맨 아래 "프로젝트별 예외" 섹션만 채움 (rules는 `paths`도) | 공통 부분만 바뀌고 예외 섹션·AUTO 블록·frontmatter는 유지 |
| 업종별 선택 | `.claude/rules/`의 업종 규칙 (예: `finance-ui.md`) | `docs/PROJECT.md` "업종 규칙"에 고른 것만 두고 나머지는 지움. 남긴 파일은 "지침 + 프로젝트 예외"와 같음 | 남긴 파일은 "지침 + 프로젝트 예외"와 같음. 지운 파일은 되살리지 않고, 새 업종 규칙은 알리기만 함 |
| 프로젝트 설정 | `docs/PROJECT.md`, `.claude/settings.json`, `.gitignore`, `README.md` | 프로젝트 값으로 채우거나 고침 | 바뀐 줄만 보여주고 사람이 반영 |
| 프로젝트 작성 | `docs/PRODUCT.md`, 그 밖에 프로젝트가 만드는 문서(명세·플로우·질문·보고 등)와 퍼블 파일 | 새로 작성 | 건드리지 않음 |
| 지침 원본 전용 | `tests/` | 지운다 (지침 원본 저장소에서만 씀) | 비교하지 않음 |

- 공통 규칙을 고치고 싶으면 프로젝트 저장소가 아니라 **이 원본 저장소**에서 고친 뒤 새 버전으로 내보냅니다. (6번)
- 프로젝트에서만 다른 점은 공통 규칙을 고치지 말고 예외 섹션이나 ADR로 남깁니다. "지침 관리"·"지침 + 프로젝트 예외" 파일의 공통 부분을 직접 고치면 다음 업데이트에서 "충돌"로 멈춥니다.

## 3. 새 프로젝트 시작 순서

### 준비
- Claude Code 설치, Node.js 설치 (훅 스크립트 실행용 — 프론트엔드 프로젝트라면 이미 있음)
- Figma MCP 서버를 Claude Code에 연결 (Figma 공식 문서 참고)
- 이 저장소의 **릴리스 태그**로 프로젝트 저장소를 시작 (`git clone --depth 1 --branch v<버전> https://github.com/dndmobilePub/Claude <프로젝트 폴더>` 후 `.git`을 지우고 새로 `git init`, 또는 GitHub Releases의 소스 압축 파일). `.claude/framework.json`에 시작한 버전이 들어 있어야 나중에 업데이트할 수 있습니다
  - 시작한 뒤 `tests/` 폴더는 지웁니다. 지침 원본을 검사하는 테스트라 프로젝트에서는 쓰지 않습니다
  - GitHub의 "Use this template"은 `main`을 복사합니다. `main`에 태그 이후 변경이 있으면 첫 업데이트 때 충돌로 보이므로, 템플릿 버튼은 `main`이 최신 태그와 같을 때만 씁니다
- 입력 원본 준비: IA 엑셀(.xlsx), 기획서(Figma 설계서 URL·PPT .pptx). 파일은 저장소 안에 두기를 권장 (IA·PPT 읽기 스크립트는 Node만 있으면 동작)

### 단계
| 구분 | 단계 | 할 일 | Claude Code에 요청하는 예 |
|---|---|---|---|
| 준비 | 1 | 프로젝트 설정 채우기 | `/project-init` |
| 준비 | 2 | 예외 섹션 채우기 (DESIGN.md 9번, ARCHITECTURE.md 11번, QA.md 6번, GIT.md 7번, rules(공통 2종 + 고른 업종 규칙), 컴포넌트 규칙 8번) | "finance-ui.md 예외 섹션 같이 채우자" |
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

### 시작 첫날 확인 목록
실제 프로젝트 환경과 원본으로 한 번씩 확인합니다. 지침은 예제 파일로만 검사했으므로, 안 되는 것이 있으면 프로젝트에서 고치지 말고 **이 원본 저장소**에 보완할 점으로 올립니다. (프로젝트에서 고치면 다음 업데이트 때 충돌로 멈춥니다)

| | 확인 | 방법 | 안 되면 |
|---|---|---|---|
| [ ] | `AGENTS.md`를 지침으로 읽는지 | Claude Code 버전 확인 후 "지금 읽은 프로젝트 지침을 요약해줘" | `docs/HARNESS.md` 1번 (`@AGENTS.md` 한 줄짜리 `CLAUDE.md`) |
| [ ] | Figma MCP 서버 이름·도구 | `/mcp`에서 서버 이름과 도구 목록 확인 | `.claude/settings.json`의 deny·ask를 서버 이름·도구에 맞춤 (`docs/HARNESS.md` 5번) |
| [ ] | 훅이 도는지 | 플로우 문서 하나를 고친 뒤 `docs/ui-flow/_index.md` 현황이 바뀌는지. Windows는 `node`가 경로에 있는지 | `docs/HARNESS.md` 3번, `node .claude/hooks/build-index.mjs` 수동 실행 |
| [ ] | IA 읽기 | `node .claude/skills/ia-sync/read-ia.mjs <IA 파일> sheets`, `dump`를 조금 → 병합 셀·숨김 행·WBS 색칠(`fills`)이 맞게 나오는지 | 원본 저장소에 보완 요청 (그동안은 `/ia-sync`에서 사람과 함께 확인) |
| [ ] | 기획서 PPT 읽기 | `node .claude/skills/write-flow/read-ppt.mjs <PPT> list`, `text` 몇 장 | 같음 |
| [ ] | Figma 조회 스크립트 | `/token-sync`·`/write-flow`에서 `read-variables`·`read-styles`·`read-storyboard`를 실제 파일로 한 번 실행 (`use_figma`는 실행마다 확인) | 같음 |
| [ ] | 점검 스크립트 | 첫 화면을 퍼블한 뒤 `node .claude/scripts/check-pub.mjs` | 같음 |

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

- **승인**: 규칙 원본은 `AGENTS.md` "항상 지킬 규칙"과 `docs/GIT.md` 5번입니다. 스킬은 단계마다 승인 지점에서 멈춥니다. 단계를 건너뛰지 않습니다.
- **입력 원본은 읽기만**: IA·기획서·디자인은 사람이 만듭니다. AI는 새로 그리거나 고치지 않고, 읽어서 분석한 뒤 md로 옮깁니다. (Figma 쓰기 도구는 권한 설정으로 막아 두었습니다)
- **원본은 하나**: 디자인 값은 Figma(코드 토큰 파일은 `token-sync`가 만드는 사본), 화면 ID·화면명·일정은 IA(`docs/ia/`는 `ia-sync`가 만드는 사본, IA가 없으면 플로우 문서), 기획 내용은 기획서(`docs/storyboard/`는 `write-flow`가 만드는 사본), 프로젝트 설정은 `PROJECT.md`, 구조·규칙 결정은 ADR, 디자인 시스템에 없는 것의 결정은 DS 변경 요청, Figma ↔ 코드 컴포넌트 연결은 컴포넌트 명세, 질문과 답은 `docs/questions/`의 질문 줄, 화면·컴포넌트 상태는 각 명세의 frontmatter. 같은 내용을 여러 곳에 복사하지 않습니다.
- **토큰 절감**: 작업에 필요한 문서·Figma 노드만 읽습니다. 명세·플로우는 파일을 잘게 나누고, 템플릿 주석은 작성 후 지웁니다. 빌드 결과·잠금 파일은 권한 설정으로 읽기를 막아 두었습니다. (`docs/HARNESS.md`)
- **역할 분리**: 하드코딩 값은 `ds-check`, 명세·접근성·업무 규칙 검토는 `design-system-reviewer`가 맡습니다. 검수 기준은 `docs/QA.md` 하나에 두고, 결과는 화면마다 `docs/reports/<화면ID>.md` 하나에 남깁니다.

## 6. 버전과 업데이트

### 프로젝트에서 새 버전 받기
- `/framework-update` — 지금 버전과 새 버전을 받아 비교하고, 충돌을 정리한 뒤 반영합니다. 무엇이 바뀌는지는 `CHANGELOG.md`에 있습니다.
- 입력 원본(IA·기획서·디자인)의 새 버전은 `/version-update`입니다. 둘은 다른 일입니다.

### 원본 저장소에서 새 버전 내보내기 (지침 관리자)
1. `CHANGELOG.md`에 새 버전 항목을 씁니다. 번호 규칙(major·minor·patch)은 그 파일 맨 위에 있습니다. major면 "옮기는 방법"을 꼭 적습니다.
2. `.claude/framework.json`의 `version`을 같은 번호로 바꿉니다. 파일을 추가·삭제했으면 `files` 분류도 고칩니다.
3. `node .claude/scripts/framework-update.mjs lint` — 모든 파일이 분류 하나에만 들어가는지 확인합니다.
   `node --test` — 저장소 루트에서 `tests/`의 테스트를 모두 돌립니다. (Node 내장, 패키지 설치 없음) 스크립트·훅을 고쳤으면 테스트도 함께 고치거나 더합니다.
4. 커밋 후 `v<버전>` 태그를 붙여 푸시합니다. (`git tag v0.2.0 && git push origin v0.2.0`)
