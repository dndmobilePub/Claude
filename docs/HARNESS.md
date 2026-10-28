# HARNESS.md — 하네스 설정과 토큰 절감

> Claude Code 실행 환경 설정(`.claude/settings.json`, `.claude/hooks/`)의 역할과 바꾸는 방법을 설명한다.
> 하네스를 고치거나, 권한·훅 때문에 작업이 막혔을 때 읽는다.

## 1. 구성 한눈에 보기
| 장치 | 위치 | 역할 |
|---|---|---|
| 지침 라우팅 | `CLAUDE.md` | 작업별로 필요한 문서만 읽게 한다 |
| 경로별 규칙 | `.claude/rules/` | `src/` 작업 때만 자동으로 읽힌다 |
| 스킬·에이전트 | `.claude/skills/`, `.claude/agents/` | 절차는 필요할 때만 불러온다 |
| 권한 | `.claude/settings.json` → `permissions` | 읽지 않을 파일, 막을 명령, 확인받을 명령 |
| 훅 | `.claude/settings.json` → `hooks`, `.claude/hooks/` | 정해진 시점에 항상 실행되는 자동 점검 |

- 문서 규칙은 Claude가 "지키려고 노력"하는 것이고, 권한·훅은 실행 환경이 **항상 강제**하는 것이다. 꼭 지켜야 하는 것은 둘 다에 둔다.

## 2. 권한 (`permissions`)
평가 순서는 deny → ask → allow이며, 먼저 걸리는 규칙이 적용된다.

### deny — 읽기·실행 금지
| 대상 | 이유 |
|---|---|
| `.env`, `.env.*`(`.env.example` 제외), `secrets/`, `*.pem`, `*.key` | 비밀 값 보호. 읽기 금지는 수정·생성도 막는다 |
| `node_modules/`, `dist/`, `build/`, `.next/`, `coverage/` | **토큰 절감**: 검색·읽기 대상에서 뺀다 |
| `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml` | **토큰 절감** + 직접 수정 방지 (패키지 매니저로만 변경) |
| 강제 푸시, `git reset --hard`, `git clean`, `git branch -D`, `rm -rf` | 되돌릴 수 없는 작업 차단 (`docs/GIT.md` 5번) |

### ask — 실행 전 항상 확인
- `git commit`, `git push`, `git merge`, `git rebase`, `gh pr create`, `gh pr merge`
- 패키지 추가: `npm install`, `npm i`, `pnpm add`, `yarn add` (새 의존성 임의 추가 방지)
- Figma `use_figma`: Figma 파일을 고칠 수도 있는 도구라 실행할 때마다 코드를 보고 확인한다. 이 지침에서는 `token-sync`의 읽기 전용 조회에만 쓴다

### 주의
- 명령 규칙은 Claude가 보통 쓰는 형태를 막는 장치이지 완전한 보안 경계가 아니다. 다른 형태로 같은 명령을 쓸 수 있으므로 문서 규칙과 함께 둔다.

## 3. 훅 (`hooks`)
훅 스크립트는 Node로 작성했다. (프론트엔드 프로젝트에는 Node가 있으므로 별도 설치가 필요 없다)

| 훅 | 시점 | 하는 일 |
|---|---|---|
| `check-hardcoded.mjs` | 파일 수정 직후 (Edit·Write) | `src/`의 스타일·컴포넌트 파일에서 HEX·rgb/hsl 색상, 2px 이상 px 값을 찾아 Claude에게 알린다. 최대 10건만 보여준다 |
| `build-index.mjs` | 파일 수정 직후 (Edit·Write) | `docs/ui-flow/`·`docs/screens/`·`docs/components/` 파일이 바뀌면 두 `_index.md`의 AUTO 블록(현황 표)을 다시 만든다. ID 중복·허용되지 않은 상태 값 등 불일치를 Claude에게 알린다 |
| `session-reminder.mjs` | 대화 압축 직후 | 승인·토큰·디자인 핵심 규칙, 현재 브랜치, 커밋되지 않은 변경을 다시 알려준다 |

- `build-index`의 원본: 화면 ID·화면명은 플로우 문서 "2. 화면 목록" 표, 상태·Figma는 각 명세의 frontmatter. frontmatter는 한 줄짜리 `키: 값`만 읽는다.
- `build-index`가 고치는 `_index.md` 변경은 승인받은 원본 수정의 결과이므로 별도 승인을 받지 않는다. 커밋할 때는 원본과 함께 포함한다.
- 에디터에서 직접 문서를 고쳤으면 `node .claude/hooks/build-index.mjs`로 수동 실행한다. (경고가 있으면 종료 코드 1)
- `check-hardcoded`는 빠른 1차 경고다. 전체 점검(스타일 작성 방식·컴포넌트)은 `ds-check` 스킬이 맡는다.
- 제외 대상: 테스트·스토리 파일, `docs/PROJECT.md`의 "코드 토큰 위치"에 적힌 파일·폴더. 이 값이 [TODO]면 토큰 파일도 점검되므로 먼저 채운다.
- 훅 스크립트에 오류가 나면 작업을 막지 않고 통과시킨다.

## 4. 토큰 절감 작업 습관
| 습관 | 이유 |
|---|---|
| 화면 하나 = 대화 하나. 다른 화면으로 넘어갈 때 `/clear` | 이전 화면 맥락이 계속 쌓이지 않게 |
| 대화가 길어지면 `/compact` | 압축 후 `session-reminder` 훅이 핵심 규칙을 복원한다 |
| 화면 명세·플로우를 잘게 나누고, 템플릿 주석은 작성 후 지운다 | 읽는 양 자체를 줄인다 |
| Figma는 명세에 적힌 노드만 조회 | 파일 전체 조회는 결과가 매우 크다 |
| 넓은 코드 검색은 서브에이전트에 맡긴다 | 검색 결과 대신 결론만 대화에 남는다 |
| 같은 문서를 반복해서 붙여 넣지 않는다 | 파일 경로만 알려주면 필요한 부분만 읽는다 |

## 5. 프로젝트에서 바꾸는 방법
| 하고 싶은 것 | 방법 |
|---|---|
| 팀 전체 규칙 추가·변경 | `.claude/settings.json` 수정 → 원본 저장소에도 반영 검토 |
| 개인 설정 (예: 자주 쓰는 린트 명령 자동 허용) | `.claude/settings.local.json`에 작성 (git 제외 대상) |
| 빌드 결과 폴더가 다름 | deny 목록의 폴더 경로 수정 |
| 패키지 매니저가 다름 | ask 목록의 패키지 추가 명령 수정 |
| Figma MCP 서버 이름이 `figma`가 아님 | ask 목록의 `mcp__figma__use_figma`를 `mcp__<서버 이름>__use_figma`로 수정 (`/mcp`에서 이름 확인) |
| 하드코딩 점검 범위 조정 | `check-hardcoded.mjs`의 `RULES`·대상 경로 수정 |

- 설정을 바꾸면 Claude Code를 다시 시작해야 반영된다.
- 이 설정은 JSON이라 주석을 달 수 없으므로, 바꾼 이유는 이 문서나 ADR에 남긴다.

## 6. 프로젝트별 예외 (선택)
- [TODO: 예) 추가 deny 경로, 자동 허용한 명령과 이유]
