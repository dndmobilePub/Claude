# CLAUDE.md — 프로젝트 라우터

> 이 파일은 짧게 유지한다 (100줄 내외). 세부 내용은 아래 문서로 연결만 한다.

## 프로젝트 설정
@docs/PROJECT.md

- IMPORTANT: PROJECT.md에 [TODO]가 남아 있고 지금 작업에 그 값이 필요하면, 추측하지 말고 사용자에게 먼저 묻는다.

## 작업별로 먼저 읽을 문서
| 작업 | 읽을 문서 |
|---|---|
| 기획·도메인 이해 | `docs/PRODUCT.md` |
| UI 작성·수정 | `docs/DESIGN.md` → 해당 `docs/screens/<화면ID>.md` |
| 퍼블 파일 위치·퍼블과 개발의 경계·더미 데이터 | `docs/ARCHITECTURE.md` (필요한 섹션만) |
| 퍼블 검수·결과 기록 | `docs/QA.md` → `docs/reports/<화면ID>.md` (양식 `templates/report.md`) |
| 이번에 퍼블할 화면 묶기·순서 정하기 | `plan-batch` 스킬 (규칙 `docs/batches/_index.md`, 양식 `templates/batch.md`) |
| IA 분석·갱신 | `ia-sync` 스킬 (양식 `templates/ia-source.md`, `templates/ia-screen-list.md`) |
| 화면 ID·화면명·일정 확인 | `docs/ia/screen-list.md` (해당 화면 ID·도메인 행만 검색) |
| 화면 흐름 파악 | `docs/ui-flow/_index.md` → 도메인별 플로우 |
| 공통 화면(오류·점검·세션 만료 등) | `docs/ui-flow/_index.md` "공통 화면" → 공통 화면 플로우 |
| 화면 패턴(필수 상태·빠지기 쉬운 항목) | `docs/PATTERNS.md` (해당 패턴 절만) |
| 기획서(Figma 설계서·PPT) 분석 | `write-flow` 스킬 0단계 (양식 `templates/storyboard.md`) |
| 기획서 분석 내용 확인 | `docs/storyboard/<도메인>.md` (해당 화면 절만) |
| 새 플로우 작성 | `write-flow` 스킬 (양식 `templates/flow.md`) |
| 새 화면 명세 작성 | `write-screen-spec` 스킬 (양식 `templates/screen-spec.md`) |
| 새 컴포넌트 작성 | `templates/component-spec.md` → `docs/components/<컴포넌트명>.md`에 저장 |
| Figma 변수 → 코드 토큰 반영 | `token-sync` 스킬 |
| 입력 원본(IA·기획서·디자인)의 새 버전 반영 | `version-update` 스킬 (규칙 `docs/changes/_index.md`) |
| 무엇이 바뀌었는지·수정필요 목록 확인 | `docs/changes/_index.md` 현황 → 해당 변경 기록 (대상 행만 검색) |
| 컴포넌트 명세 확인 | `docs/components/_index.md` → 해당 명세 |
| 질문 남기기·답 반영 (자료에 없음·해석 필요·원본끼리 다름) | `docs/questions/_index.md` 1~3번 → 해당 질문 파일 |
| 열린 질문 확인 | `docs/questions/_index.md` 현황 (대상·확인 대상 행만 검색) |
| 설계 결정 확인 | `docs/decisions/` |
| 설계 결정 기록 | `templates/adr.md` → `docs/decisions/<번호>-<제목>.md`에 저장 |
| 브랜치·커밋·PR | `docs/GIT.md` |
| 권한·훅 설정, 작업이 권한에 막힘 | `docs/HARNESS.md` |

## 항상 지킬 규칙
- IMPORTANT: 결과물은 개발에 넘기는 퍼블 파일이다. 화면 이동·서버 호출 같은 개발 몫은 구현하지 않는다. (`docs/ARCHITECTURE.md` 1번)
- IMPORTANT: 필요한 문서만 읽는다. 전체 docs를 한꺼번에 읽지 않는다.
- IMPORTANT: 색상·간격·폰트는 토큰만 사용한다. 하드코딩 금지.
- 코드 토큰 파일은 직접 고치지 않는다. `token-sync`로만 갱신한다.
- IMPORTANT: 기존 컴포넌트를 먼저 찾고, 없을 때만 새로 만든다.
- IMPORTANT: 화면 ID·화면명은 IA를 따른다. 새로 만들거나 바꾸지 않는다. (IA가 없는 프로젝트는 플로우 문서 화면 목록) `docs/ia/`는 `ia-sync`로만 갱신한다.
- IMPORTANT: 자료에 없는 것을 지어내지 않는다. 질문은 `docs/questions/`에만 한 줄씩 적고, 답·상태도 그 줄에서만 바꾼다. 다른 문서에는 질문 ID만 적는다.
- 화면·컴포넌트 상태는 각 명세의 frontmatter에서만 고친다. `_index.md`의 AUTO 블록은 훅이 만들므로 직접 고치지 않는다.
- IMPORTANT: 입력 원본(IA·기획서·Figma)은 읽기만 한다. 기획 설계서·디자인을 새로 그리거나, IA·PPT 파일을 고치지 않는다.
- 파일 생성·수정·커밋 전에는 사용자 승인을 받는다.
- 단계를 임의로 건너뛰지 않는다.

## 경로별 규칙 (자동 적용)
- `.claude/rules/figma-design-system.md`
- `.claude/rules/a11y.md`
- `.claude/rules/finance-ui.md`

## 반복 절차 (스킬)
- `project-init` — 새 프로젝트 시작 시 `docs/PROJECT.md` 채우기
- `ia-sync` — IA 엑셀(화면 목록·WBS 일정) → `docs/ia/` 사본 생성·갱신
- `write-flow` — 기획서(Figma 설계서·PPT) 분석 + 도메인 플로우 작성 (IA 기준 화면 목록·흐름도·예외 흐름)
- `write-screen-spec` — 화면 명세 작성, "확정" 점검
- `plan-batch` — 명세가 확정된 화면을 작업 묶음(순서·선행 조건)으로 묶기
- `implement-screen` — 화면 또는 묶음 → Figma 조회 → 퍼블 → 검수(`docs/QA.md`) → 보고 파일·개발 전달
- `token-sync` — Figma 변수 → 코드 토큰 파일(tokens.css, React·Vue는 참조 파일 포함) 생성·갱신
- `version-update` — 입력 원본 새 버전 → 다시 분석·변경 기록·영향 문서 "수정필요"·기준 버전 갱신
- `ds-check` — 디자인 시스템 위반 검출
