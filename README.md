# UI 바이브 코딩 지침 구조

Claude Code로 UI를 만들기 위한 **재사용 가능한 md 지침 세트**입니다.
공통 규칙·절차·양식은 그대로 쓰고, 프로젝트마다 다른 값만 정해진 자리에 채워 사용합니다.

- 대상 범위: 기획(플로우·화면 명세) → 디자인(Figma 디자인 시스템) → 퍼블리싱(컴포넌트·화면 구현)
- 기준 도구: Claude Code + Figma MCP
- 모든 지침 문서는 한국어로 작성합니다.

---

## 1. 구조

```
CLAUDE.md                     # 라우터: 작업별로 읽을 문서 안내 (짧게 유지)
docs/
  PROJECT.md                  # 프로젝트별 설정: 서비스명·스택·라이브러리·명령어·Figma URL·토큰 위치
  PRODUCT.md                  # 기획·도메인·용어집
  DESIGN.md                   # 디자인 시스템 사용 규칙 (값은 Figma가 원본)
  ARCHITECTURE.md             # 코드 구조: 화면·라우트·데이터·임시 데이터·상태
  GIT.md                      # 브랜치·커밋·PR 규칙
  HARNESS.md                  # 권한·훅 설정 설명과 토큰 절감 습관
  ui-flow/_index.md           # 화면 ID 체계·상태 정의 + 현황 표(자동 생성)
  ui-flow/<도메인>.md          # 도메인별 플로우 (화면 ID·화면명의 원본)
  screens/<화면ID>.md          # 화면 명세 (화면당 1파일, frontmatter가 상태의 원본)
  components/_index.md        # 컴포넌트 명세 현황 표(자동 생성)
  components/<컴포넌트명>.md    # 컴포넌트 명세 (신규·확장·조합만)
  decisions/<번호>-<제목>.md    # 설계 결정 기록 (ADR)
.claude/
  settings.json               # 권한(읽기 금지·명령 차단·확인) + 훅 등록
  hooks/
    check-hardcoded.mjs       #   파일 수정 직후 하드코딩 색상·px 경고
    build-index.mjs           #   문서 수정 직후 _index.md 현황 표 재생성·불일치 경고
    session-reminder.mjs      #   대화 압축 후 핵심 규칙·작업 위치 재안내
  rules/                      # src/ 작업 시 자동 적용되는 규칙
    figma-design-system.md    #   Figma → 코드 구현 절차
    a11y.md                   #   접근성
    finance-ui.md             #   금융 UI
  skills/                     # 반복 절차
    project-init/             #   PROJECT.md 채우기
    write-flow/               #   도메인 플로우 작성
    write-screen-spec/        #   화면 명세 작성·확정 점검
    implement-screen/         #   화면 명세 → Figma 조회 → 구현 → 검증
    token-sync/               #   Figma 변수 → 코드 토큰 파일(tokens.css·tokens.ts), 읽기 전용 조회 스크립트 포함
    ds-check/                 #   디자인 시스템 위반 검출
  agents/
    design-system-reviewer.md #   독립 리뷰어 (명세·상태·코드 구조·접근성·금융 규칙)
templates/                    # 양식
  screen-spec.md              #   화면 명세
  flow.md                     #   플로우
  component-spec.md           #   컴포넌트 명세
  adr.md                      #   설계 결정 기록
src/components/CLAUDE.md      # 컴포넌트 폴더 규칙 (계층·네이밍·Props)
.github/pull_request_template.md  # PR 본문 양식
```

## 2. 재사용 구분

| 구분 | 파일 | 새 프로젝트에서 |
|---|---|---|
| 공통 | `CLAUDE.md`, `templates/`, `.claude/skills/`, `.claude/agents/`, `.claude/settings.json`, `.claude/hooks/`, `.github/pull_request_template.md` | 그대로 사용 (경로가 다르면 `docs/HARNESS.md` 5번대로 조정) |
| 공통 + 예외 섹션 | `docs/DESIGN.md`(9번), `docs/ARCHITECTURE.md`(10번), `docs/GIT.md`(7번), `docs/HARNESS.md`(6번), `.claude/rules/` 3종, `src/components/CLAUDE.md` | 맨 아래 "프로젝트별 예외" 섹션만 채움 |
| 프로젝트별 | `docs/PROJECT.md`, `docs/PRODUCT.md`, `docs/ui-flow/`, `docs/screens/`, `docs/components/`, `docs/decisions/` | 새로 작성 |

- 공통 규칙을 고치고 싶으면 프로젝트 저장소가 아니라 **이 원본 저장소**에서 고친 뒤 각 프로젝트에 반영합니다.
- 프로젝트에서만 다른 점은 공통 규칙을 고치지 말고 예외 섹션이나 ADR로 남깁니다.

## 3. 새 프로젝트 시작 순서

### 준비
- Claude Code 설치, Node.js 설치 (훅 스크립트 실행용 — 프론트엔드 프로젝트라면 이미 있음)
- Figma MCP 서버를 Claude Code에 연결 (Figma 공식 문서 참고)
- 이 저장소의 파일을 프로젝트 저장소 루트로 복사

### 단계
| 단계 | 할 일 | Claude Code에 요청하는 예 |
|---|---|---|
| 1 | 프로젝트 설정 채우기 | `/project-init` |
| 2 | 예외 섹션 채우기 (DESIGN.md 9번, ARCHITECTURE.md 10번, GIT.md 7번, rules 3종, 컴포넌트 규칙 8번) | "finance-ui.md 예외 섹션 같이 채우자" |
| 3 | 코드 토큰 파일 만들기 (Figma 변수가 바뀔 때마다 다시 실행) | `/token-sync` |
| 4 | 기획 문서 작성 | "PRODUCT.md 작성 도와줘" |
| 5 | 도메인별 플로우 작성 (화면 ID 부여 포함) | `/write-flow 이체` |
| 6 | 화면 명세 작성 | `/write-screen-spec TRF-010` |
| 7 | 명세 확정 점검 → 상태 "확정" | `/write-screen-spec TRF-010 확정점검` |
| 8 | 화면 구현 | `/implement-screen TRF-010` |

- 비어 있는 `[TODO]` 값이 작업에 필요하면 Claude가 추측하지 않고 먼저 묻습니다.

## 4. 화면 하나가 완성되는 흐름

```
/write-flow (화면 등록) → /write-screen-spec (초안) → 기획·디자인 확인 (검토)
→ /write-screen-spec 확정점검 (확정)
→ /implement-screen
    사전 점검 → Figma 조회 → 구현 계획 [승인] → 구현
    → 검증 (린트·테스트, ds-check, Figma 비교, design-system-reviewer)
    → 완료 기준 대조 → 보고 [승인] → 상태 갱신·커밋 (구현완료)
```

- 괄호 안의 상태는 화면 명세 frontmatter의 `status`에만 적습니다. `_index.md` 현황 표는 훅이 자동으로 다시 만듭니다.
- 새 컴포넌트가 필요하면 구현 전에 `templates/component-spec.md`로 명세를 쓰고 승인받습니다.
- 디자인 시스템에 없는 것이 나오면 멈추고 선택지를 받은 뒤 `templates/adr.md`로 기록합니다.

## 5. 운영 원칙

- **승인**: 파일 생성·수정·커밋 전에 항상 승인을 받습니다. 단계를 건너뛰지 않습니다.
- **원본은 하나**: 디자인 값은 Figma(코드 토큰 파일은 `token-sync`가 만드는 사본), 프로젝트 설정은 `PROJECT.md`, 결정은 ADR, 화면 목록은 플로우 문서, 화면·컴포넌트 상태는 각 명세의 frontmatter. 같은 내용을 여러 곳에 복사하지 않습니다.
- **토큰 절감**: 작업에 필요한 문서·Figma 노드만 읽습니다. 명세·플로우는 파일을 잘게 나누고, 템플릿 주석은 작성 후 지웁니다. 빌드 결과·잠금 파일은 권한 설정으로 읽기를 막아 두었습니다. (`docs/HARNESS.md`)
- **역할 분리**: 하드코딩 값은 `ds-check`, 명세·접근성·금융 규칙 검토는 `design-system-reviewer`가 맡습니다.
