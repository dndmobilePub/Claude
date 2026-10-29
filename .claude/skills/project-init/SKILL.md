---
name: project-init
description: 새 프로젝트를 시작할 때 docs/PROJECT.md의 프로젝트별 설정(서비스명, 입력 원본(IA·기획서·Figma), 화면 ID 형식, 뷰포트, 퍼블 언어·스타일링·스토리북, 명령어)을 채울 때 사용.
---

# 프로젝트 초기 설정 절차

## 단계
1. `docs/PROJECT.md`를 읽고 [TODO]가 남은 항목을 확인한다.
2. 저장소 구성에서 추측할 수 있는 값을 찾는다.
   - `package.json`의 dependencies → 퍼블 언어(React·Vue 여부), TypeScript, 빌드 도구, 스타일링, 스토리북, 기타 주요 라이브러리
   - `package.json`의 scripts → 개발 서버, 빌드, 린트/테스트 명령어
   - 설정 파일(vite.config, tsconfig, tailwind.config, .storybook 등) → 보조 근거
   - `package.json`이 없고 HTML 파일만 있으면 퍼블 언어 "JS(HTML·CSS·JS)"를 제안한다.
3. 항목별로 사용자에게 묻는다. 추측한 값이 있으면 근거와 함께 제안하고, 없으면 빈 질문으로 묻는다.
   - 서비스명
   - IA 파일 경로 (없으면 "없음") / 화면 ID 형식 (IA의 화면 ID 몇 개를 보고 정규식을 제안하고 확인받는다)
   - 공통 화면 도메인 키 (기본 common) / 공통 화면 임시 ID 약어 (IA에 공통 화면이 없을 때만. 화면 ID 형식에 맞는지 확인)
   - Figma 기획 설계서 URL (없으면 "없음") / 기획서 PPT 경로 (없으면 "없음")
   - Figma 라이브러리 URL / Figma 변수 파일 URL (라이브러리와 같으면 "라이브러리와 같음") / Figma 스타일 파일 URL (변수 파일과 같으면 "변수 파일과 같음") / Code Connect 사용 여부 (사용이면 `docs/HARNESS.md` 5번 권한 변경 안내)
   - 뷰포트: 디바이스(모바일 전용인지, PC도 있는지) / 디자인 프레임 크기 / 구현 기준 폭 / 최소 폭. 디자인 화면 URL을 받으면 `get_metadata`로 프레임 크기를 읽어 제안한다
   - 퍼블 언어 / TypeScript / 빌드 도구 / 스타일링 / 스토리북 / 기타 주요 라이브러리
   - 코드 토큰 위치 (기본 `src/styles/tokens/`)
   - 개발 서버 / 빌드 / 린트·테스트 명령어 (정적 파일이라 없으면 "없음")
4. 사용자가 "미정"이라고 한 항목은 [TODO]로 남긴다.
5. 반영할 내용을 미리 보여주고 승인을 받은 뒤 `docs/PROJECT.md`를 수정한다.
6. 화면을 따로 여는 방법·상태를 바꿔 보는 방법·실제 경로는 `docs/ARCHITECTURE.md` 11번 예외 섹션에서 정한다는 것을 안내한다. (이 스킬에서 채우지 않는다)
7. IA 파일이 있으면 다음 작업으로 `ia-sync`를 안내한다. IA의 칼럼 읽는 방법은 이 스킬에서 정하지 않는다.

## 규칙
- IMPORTANT: 확인받지 않은 추측 값은 기록하지 않는다.
- `CLAUDE.md`는 수정하지 않는다. 프로젝트별 값은 `docs/PROJECT.md`에만 둔다.

## 완료 보고 형식
- 채운 항목 / [TODO]로 남긴 항목 목록
