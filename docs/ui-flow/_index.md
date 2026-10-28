# UI Flow 인덱스

> 플로우는 `write-flow`, 화면 명세는 `write-screen-spec` 스킬로 작성한다. (양식: `templates/flow.md`, `templates/screen-spec.md`)
> 맨 아래 "현황"은 `build-index` 훅이 자동 생성한다. 직접 고치지 말고 원본을 고친다.
> - 화면 ID·화면명 원본: IA 사본 `docs/ia/screen-list.md` (`ia-sync`가 생성). IA가 없는 프로젝트는 각 플로우 문서의 "2. 화면 목록" 표
> - 예정일 원본: IA 사본의 "2. 일정" 표 (`docs/ia/source.md`의 "현황에 표시할 단계")
> - 화면 상태·Figma 원본: 각 화면 명세의 frontmatter
> IMPORTANT: 현황 표는 전체를 읽지 말고 필요한 화면 ID·도메인 행만 검색한다. (토큰 절감)

## 화면 ID 체계
- 형식: `docs/PROJECT.md`의 "화면 ID 형식" (정규식). 이 형식과 맞지 않는 ID는 경고한다.
- IA가 있으면 화면 ID는 IA가 정한다. 지침이 새 ID를 만들지 않는다.
- IA가 없으면 `write-flow`가 형식에 맞춰 제안하고 승인받는다. (번호는 사이에 끼워 넣을 수 있게 간격을 둔다)
- 도메인 키·약어: IA가 있으면 `docs/ia/source.md` 3번, 없으면 각 플로우 frontmatter(`code`)

## 화면 상태 정의
| 상태 | 의미 | 바꾸는 시점 |
|---|---|---|
| 플로우 전 | IA에 있지만 아직 어느 플로우에도 없음 (IA가 있는 프로젝트만) | 자동 표시 (frontmatter에 쓰지 않는다) |
| 명세 전 | 플로우에 등록됐지만 명세 파일이 없음 | 자동 표시 (frontmatter에 쓰지 않는다) |
| 초안 | 명세 작성 중 | `write-screen-spec` 저장 |
| 검토 | 기획·디자인 확인 중 | 확인 요청 시 |
| 확정 | 구현 가능 (Figma 노드·필수 섹션 채움) | `write-screen-spec` 확정 점검 통과 후 승인 |
| 구현완료 | implement-screen 완료 보고 승인됨 | `implement-screen` 마무리 |

## 현황
<!-- AUTO:START — 자동 생성. 직접 고치지 말고 원본 파일을 고친다 -->

아직 등록된 플로우가 없다.

<!-- AUTO:END -->
