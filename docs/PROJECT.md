# PROJECT.md — 프로젝트별 설정

> 새 프로젝트마다 이 파일만 채운다. 나머지 지침은 그대로 재사용한다.
> 비어 있는 항목은 [TODO]로 둔다.
> 직접 채우거나 `project-init` 스킬로 채운다.

## 기본 정보
- 서비스명: [TODO]

## 입력 원본
> 원본 파일은 저장소 안에 두기를 권장한다. 버전 이력을 Git으로 추적할 수 있다. (예: `docs/ia/source/`, `docs/storyboard/source/`)
- IA 파일: [TODO: 경로. .xlsx 또는 .csv. 없으면 "없음" — 없으면 화면 목록 원본은 플로우 문서]
- 화면 ID 형식: [TODO: 정규식을 백틱으로 감싸 적는다. 예) `^[A-Z]{2,5}-\d{3}$` (ACC-010). 비어 있으면 이 예가 기본값]
- Figma 기획 설계서: [TODO: URL. 없으면 "없음"]
- 기획서 PPT: [TODO: 경로. .pptx. 여러 개면 모두. 없으면 "없음"]
- Figma 라이브러리: [TODO: URL]
- Figma 변수 파일: [TODO: URL. 라이브러리와 같으면 "라이브러리와 같음"]

## 퍼블 기술 스택
> 결과물은 개발팀에 넘기는 퍼블리싱 파일이다. 라우팅·서버 연결·전역 상태는 개발 몫이라 여기서 정하지 않는다. (`docs/ARCHITECTURE.md` 1번)
- 퍼블 언어: [TODO: JS(HTML·CSS·JS) / React / Vue]
- TypeScript: [TODO: 사용 / 미사용. JS(HTML·CSS·JS)면 "미사용"]
- 빌드 도구: [TODO: 예) Vite / 없음(정적 파일)]
- 스타일링: [TODO: 예) CSS / SCSS / CSS Modules / Tailwind]
- 스토리북: [TODO: 사용 / 미사용]
- 기타 주요 라이브러리: [TODO: 없으면 "없음"]
- 코드 토큰 위치: [TODO: 기본 src/styles/tokens/ (token-sync가 토큰 파일을 만드는 폴더)]

## 명령어
- 개발 서버: `[TODO]`
- 빌드: `[TODO]`
- 린트/테스트: `[TODO]`
