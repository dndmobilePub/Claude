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
| 화면 흐름 파악 | `docs/ui-flow/_index.md` → 도메인별 플로우 |
| 새 플로우 작성 | `write-flow` 스킬 (양식 `templates/flow.md`) |
| 새 화면 명세 작성 | `write-screen-spec` 스킬 (양식 `templates/screen-spec.md`) |
| 새 컴포넌트 작성 | `templates/component-spec.md` → `docs/components/<컴포넌트명>.md`에 저장 |
| 컴포넌트 명세 확인 | `docs/components/_index.md` → 해당 명세 |
| 설계 결정 확인 | `docs/decisions/` |
| 설계 결정 기록 | `templates/adr.md` → `docs/decisions/<번호>-<제목>.md`에 저장 |

## 항상 지킬 규칙
- IMPORTANT: 필요한 문서만 읽는다. 전체 docs를 한꺼번에 읽지 않는다.
- IMPORTANT: 색상·간격·폰트는 토큰만 사용한다. 하드코딩 금지.
- IMPORTANT: 기존 컴포넌트를 먼저 찾고, 없을 때만 새로 만든다.
- 파일 생성·수정·커밋 전에는 사용자 승인을 받는다.
- 단계를 임의로 건너뛰지 않는다.

## 경로별 규칙 (자동 적용)
- `.claude/rules/figma-design-system.md`
- `.claude/rules/a11y.md`
- `.claude/rules/finance-ui.md`

## 반복 절차 (스킬)
- `project-init` — 새 프로젝트 시작 시 `docs/PROJECT.md` 채우기
- `write-flow` — 도메인 플로우 작성 (화면 목록·ID·흐름도·예외 흐름)
- `write-screen-spec` — 화면 명세 작성, "확정" 점검
- `implement-screen` — 화면 명세 → Figma 조회 → 구현 → 검증
- `ds-check` — 디자인 시스템 위반 검출
