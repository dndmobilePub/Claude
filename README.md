# UI 바이브 코딩 지침 구조

Claude Code로 UI를 만들기 위한 재사용 가능한 md 구조입니다. 현재는 골격(템플릿)만 있으며 `[TODO]` 부분을 채워 사용합니다.

## 구조
```
CLAUDE.md                 # 라우터: 작업별로 읽을 문서 안내
docs/
  PROJECT.md              # 프로젝트별 설정 (서비스명·스택·명령어·Figma URL)
  PRODUCT.md              # 기획·도메인
  DESIGN.md               # 디자인 시스템 규칙
  ui-flow/                # 화면 흐름 (_index + 도메인별)
  screens/                # 화면 명세 (화면당 1파일)
  decisions/              # 설계 결정 기록 (ADR)
.claude/
  rules/                  # 경로별 자동 적용 규칙
  skills/                 # 반복 절차
  agents/                 # 리뷰어 서브에이전트
templates/                # 새 프로젝트에 그대로 복사하는 양식
src/components/CLAUDE.md  # 컴포넌트 폴더 규칙
```

## 재사용 구분
- 공통(그대로 재사용): `docs/DESIGN.md`(9번 예외 섹션만 프로젝트별), `templates/`, `.claude/skills/`, `.claude/agents/`, `.claude/rules/`의 일반 규칙
- 프로젝트별(새로 작성): `docs/PROJECT.md`(서비스명·스택·명령어·Figma URL·토큰 위치, `project-init` 스킬로 작성 가능), `docs/PRODUCT.md`, `docs/ui-flow/`, `docs/screens/`
