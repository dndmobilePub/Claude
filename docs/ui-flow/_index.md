# UI Flow 인덱스

> 플로우는 `write-flow`, 화면 명세는 `write-screen-spec` 스킬로 작성한다. (양식: `templates/flow.md`, `templates/screen-spec.md`)
> 맨 아래 "현황"은 `build-index` 훅이 자동 생성한다. 직접 고치지 말고 원본을 고친다.
> - 화면 ID·화면명 원본: 각 플로우 문서의 "2. 화면 목록" 표
> - 화면 상태·Figma 원본: 각 화면 명세의 frontmatter
> IMPORTANT: 현황 표는 전체를 읽지 말고 필요한 화면 ID·도메인 행만 검색한다. (토큰 절감)

## 화면 ID 체계
- 형식: `[도메인 약어]-[3자리 번호]` (예: ACC-010)
- 번호는 10 단위로 붙인다. (사이에 화면을 끼워 넣을 수 있게)
- 도메인 약어: [TODO: 예) ACC 계좌, TRF 이체]

## 화면 상태 정의
| 상태 | 의미 | 바꾸는 시점 |
|---|---|---|
| 명세 전 | 플로우에 등록됐지만 명세 파일이 없음 | 자동 표시 (frontmatter에 쓰지 않는다) |
| 초안 | 명세 작성 중 | `write-screen-spec` 저장 |
| 검토 | 기획·디자인 확인 중 | 확인 요청 시 |
| 확정 | 구현 가능 (Figma 노드·필수 섹션 채움) | `write-screen-spec` 확정 점검 통과 후 승인 |
| 구현완료 | implement-screen 완료 보고 승인됨 | `implement-screen` 마무리 |

## 현황
<!-- AUTO:START — 자동 생성. 직접 고치지 말고 원본 파일을 고친다 -->

아직 등록된 플로우가 없다.

<!-- AUTO:END -->
