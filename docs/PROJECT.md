# PROJECT.md — 프로젝트별 설정

> 새 프로젝트마다 이 파일만 채운다. 나머지 지침은 그대로 재사용한다.
> 비어 있는 항목은 [TODO]로 둔다.
> 직접 채우거나 `project-init` 스킬로 채운다.

## 기본 정보
- 서비스명: [TODO]
- 화면 언어: [TODO: `<html lang>` 값. 예) ko. 비어 있으면 ko (`docs/ARCHITECTURE.md` 4-1)]
- 업종 규칙: [TODO: 쓰는 `.claude/rules/` 업종 규칙 파일. 여럿이면 쉼표로. 예) finance-ui.md / 없음. 쓰지 않는 업종 규칙 파일은 지운다 — 지운 파일은 공통 지침 업데이트 때 되살아나지 않는다 (`docs/HARNESS.md` 5번)]

## 입력 원본
> 원본 파일은 저장소 안에 두기를 권장한다. 버전 이력을 Git으로 추적할 수 있다. (예: `docs/ia/source/`, `docs/storyboard/source/`)
- IA 파일: [TODO: 경로. .xlsx 또는 .csv. 없으면 "없음" — 없으면 화면 목록 원본은 플로우 문서]
- 화면 ID 형식: [TODO: 정규식을 백틱으로 감싸 적는다. 예) `^[A-Z]{2,5}-\d{3}$` (ACC-010). 비어 있으면 이 예가 기본값]
- 공통 화면 도메인 키: [TODO: 기본 common. 공통 화면 플로우 문서 이름 docs/ui-flow/<키>.md (`docs/ui-flow/_index.md` "공통 화면")]
- 공통 화면 임시 ID 약어: [TODO: 예) COM. IA에 공통 화면이 없을 때만 쓴다. 화면 ID 형식에 맞아야 한다]
- Figma 기획 설계서: [TODO: URL. 없으면 "없음"]
- 기획서 PPT: [TODO: 경로. .pptx. 여러 개면 모두. 없으면 "없음"]
- Figma 라이브러리: [TODO: URL]
- Figma 변수 파일: [TODO: URL. 라이브러리와 같으면 "라이브러리와 같음"]
- Figma 스타일 파일: [TODO: URL. 텍스트·효과 스타일이 있는 파일. 변수 파일과 같으면 "변수 파일과 같음"]
- Code Connect 사용: [TODO: 사용 / 미사용. 기본 미사용. 사용하면 컴포넌트 명세 내용을 Figma에 등록한다 (`src/components/AGENTS.md` 7번)]

## 뷰포트
> 화면 폭 규칙은 `docs/DESIGN.md` 6-2를 따른다. 가로 폭만 유동이고, 여백·간격·글자 크기는 그대로다.
> 디바이스마다 한 줄. 모바일 전용이면 한 줄만 채운다. 해당 없는 줄은 지운다.
> - 디자인 프레임 크기: Figma 화면 프레임의 폭×높이. 높이는 참고용이다.
> - 구현 기준 폭: 실제로 주로 쓰일 폭. 디자인 프레임 폭과 같아도 된다.
> - 최소 폭: 이 폭까지 레이아웃이 깨지지 않아야 한다. 최대 폭은 두지 않는다. (넓어지면 가로 폭이 그대로 늘어난다)

| 디바이스 | 디자인 프레임 크기 | 구현 기준 폭 | 최소 폭 |
|---|---|---|---|
| [TODO: 예) 모바일] | [TODO: 예) 402×874] | [TODO: 예) 375] | [TODO: 예) 320] |

## 퍼블 기술 스택
> 결과물은 개발팀에 넘기는 퍼블리싱 파일이다. 라우팅·서버 연결·전역 상태는 개발 몫이라 여기서 정하지 않는다. (`docs/ARCHITECTURE.md` 1번)
- 퍼블 언어: [TODO: JS(HTML·CSS·JS) / React / Vue]
- TypeScript: [TODO: 사용 / 미사용. JS(HTML·CSS·JS)면 "미사용"]
- 빌드 도구: [TODO: 예) Vite / 없음(정적 파일)]
- 스타일링: [TODO: 예) CSS / SCSS / CSS Modules / Tailwind]
- 스토리북: [TODO: 사용 / 미사용]
- 기타 주요 라이브러리: [TODO: 없으면 "없음"]
- 퍼블 소스 폴더: [TODO: 기본 src/. 퍼블 파일을 두는 최상위 폴더. 저장소 루트는 쓰지 않는다. 훅·점검 스크립트가 이 폴더를 본다. 바꾸면 `docs/HARNESS.md` 5번의 손으로 바꿀 곳도 함께 바꾼다]
- 파일 구조: [TODO: 화면 폴더 / 종류별 폴더. 기본 화면 폴더. 종류별 폴더는 퍼블 언어가 JS(HTML·CSS·JS)일 때만 (`docs/ARCHITECTURE.md` 3번)]
- 코드 토큰 위치: [TODO: 기본 <퍼블 소스 폴더>/styles/tokens/, 종류별 폴더면 <퍼블 소스 폴더>/css/tokens/ (token-sync가 토큰 파일을 만드는 폴더)]

## 명령어
- 개발 서버: `[TODO]`
- 빌드: `[TODO]`
- 린트/테스트: `[TODO]`
