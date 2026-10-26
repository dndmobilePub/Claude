---
name: project-init
description: 새 프로젝트를 시작할 때 docs/PROJECT.md의 프로젝트별 설정(서비스명, Figma URL, 기술 스택, 스타일링, 명령어)을 채울 때 사용.
---

# 프로젝트 초기 설정 절차

## 단계
1. `docs/PROJECT.md`를 읽고 [TODO]가 남은 항목을 확인한다.
2. 저장소 구성에서 추측할 수 있는 값을 찾는다.
   - `package.json`의 dependencies → 프레임워크, 스타일링, 주요 라이브러리
   - `package.json`의 scripts → 개발 서버, 빌드, 린트/테스트 명령어
   - 설정 파일(vite.config, next.config, tailwind.config 등) → 보조 근거
3. 항목별로 사용자에게 묻는다. 추측한 값이 있으면 근거와 함께 제안하고, 없으면 빈 질문으로 묻는다.
   - 서비스명
   - Figma 라이브러리 URL
   - 프레임워크 / 스타일링 / 기타 주요 라이브러리
   - 개발 서버 / 빌드 / 린트·테스트 명령어
4. 사용자가 "미정"이라고 한 항목은 [TODO]로 남긴다.
5. 반영할 내용을 미리 보여주고 승인을 받은 뒤 `docs/PROJECT.md`를 수정한다.

## 규칙
- IMPORTANT: 확인받지 않은 추측 값은 기록하지 않는다.
- `CLAUDE.md`는 수정하지 않는다. 프로젝트별 값은 `docs/PROJECT.md`에만 둔다.

## 완료 보고 형식
- 채운 항목 / [TODO]로 남긴 항목 목록
