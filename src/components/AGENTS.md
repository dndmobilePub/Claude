# 컴포넌트 폴더 규칙

> 이 폴더의 파일을 다룰 때 자동으로 읽힌다. 토큰·상태·재사용 순서는 `docs/DESIGN.md`를 따른다.
> 퍼블 언어(JS / React / Vue)는 `docs/PROJECT.md`를 따른다. 언어마다 다른 부분은 표의 언어별 칸만 본다.
> 실제 폴더명·파일 구성은 프로젝트마다 다르므로 맨 아래 예외 섹션을 따른다.
> 이 파일은 실제 컴포넌트 폴더에 둔다. (기본 `src/components/`. 퍼블 소스 폴더가 다르면 `docs/HARNESS.md` 5번)

## 1. 계층
| 계층 | 역할 | 예 | 규칙 |
|---|---|---|---|
| 기본(ui) | Figma 디자인 시스템 컴포넌트와 1:1 대응 | Button, Input, Badge | 데이터·업무 로직 없음 |
| 조합(patterns) | 기본 컴포넌트를 묶은 반복 패턴 | Card, AmountInput | 표시 규칙은 가능, 데이터 가져오기 없음 |
| 화면 전용 | 한 화면에서만 쓰는 조각 | (화면 폴더 안, 종류별 폴더면 화면 HTML 안 — `docs/ARCHITECTURE.md` 4번) | 스타일을 따로 두지 않는다(ARCHITECTURE 8번). 두 화면 이상에서 쓰이면 조합 계층으로 옮긴다 |

- 가져다 쓰는 방향은 한쪽만 허용한다: 화면 전용 → 조합 → 기본. 기본 컴포넌트는 조합 컴포넌트를 가져오지 않는다.

## 2. 폴더 구조
- 컴포넌트 하나 = 폴더 하나. 폴더 이름은 컴포넌트 이름과 같다.
- 폴더 안 파일 역할: (8번 예외 "폴더 안 파일 구성"이 있으면 그것이 먼저다)

| 역할 | 필수 | 비고 |
|---|---|---|
| 본체 | 필수 | JS: 마크업 조각(HTML) / React: 컴포넌트 파일 / Vue: `.vue` 파일 |
| 스타일 | 스타일링 방식에 따름 | Tailwind면 별도 파일 없음. Vue는 `.vue` 안에 둘 수도 있음 |
| 동작 스크립트 | JS에서 동작이 있을 때만 | React·Vue는 본체 안에 둔다 |
| 타입(props) | React·Vue + TypeScript일 때 | 본체 안에 둘 수도 있음 — 프로젝트 예외를 따름 |
| 내보내기(index) | React·Vue 기본 (예외 칸에서 생략 가능) | 있으면 외부는 index로만 가져간다. 8번 "폴더 안 파일 구성"에 index를 두지 않기로 정했으면 본체 파일을 바로 가져간다 |
| 스토리 | 스토리북을 쓸 때 | `docs/PROJECT.md` 스토리북 |

## 3. 네이밍
- 컴포넌트 이름: PascalCase. Figma 컴포넌트(세트) 이름과 같게 한다.
  - Figma 이름에 `/` 경로가 있으면 경로를 이어 PascalCase로 만든다. 예) `Card/Bank` → `CardBank`
  - 경로 중 **컴포넌트 세트 이름까지만** 쓴다. 세트 안에서 variant 속성 값으로 나뉜 조각(예: `Single/Regular`, `Default/On`)은 빼고, variant는 4번 속성으로 옮긴다. 앞 단계와 같은 단어가 겹치면 한 번만 쓴다. 예) `Link/Mobile/LinkLine/Single/Regular` → `LinkLine`
  - 규칙대로 만든 이름이 길거나 어색하면 짧은 이름을 제안하고 승인받아 명세 `figma_name`과 함께 적는다.
  - 디바이스·크기만 다른 세트(예: `…/Mobile`·`…/PC`)를 코드 컴포넌트 하나로 만들 때는 그 표기를 이름에서 뺀다. 빼는 표기와 하나로 묶을지는 8번 예외 "Figma 이름 → 코드 이름"에 정한다. 비어 있으면 묻는다.
  - 한 코드 컴포넌트에 Figma 세트가 여럿이면 명세 `figma_name`에 쉼표로 모두 적는다. (7번)
- 폴더 이름: 컴포넌트 이름과 같다.
- JS: 마크업의 클래스 이름은 컴포넌트 이름을 바꾼 kebab-case를 기본 클래스로 쓴다. (예: `CardBank` → `card-bank`) 하위 요소·변형 표기 규칙은 예외 섹션의 클래스 이름 규칙을 따른다.
- 이벤트: React `on` + 동사 (`onChange`, `onConfirm`) / Vue `emit('change')` / JS 사용자 정의 이벤트를 쓸 때 kebab-case (`confirm`).

## 4. 변형(variant)과 속성
- IMPORTANT: 디자인 값을 바깥에서 받지 않는다. (`color="#..."`, `padding={12}`, 인라인 `style` 금지) 선택지는 변형으로 제한한다.
- Figma variant 속성을 옮기는 방법:

| Figma | React·Vue | JS |
|---|---|---|
| `Size=Large` | `size="large"` prop | 변형 클래스 (예: `button--large`) |
| `State=Disabled` | `disabled` prop | `disabled` 속성 (네이티브 요소) 또는 `aria-disabled="true"` |
| `Type=Primary` | `variant="primary"` prop | 변형 클래스 (예: `button--primary`) |

- 변형 값은 Figma variant 값과 1:1로 맞춘다. React·Vue + TypeScript면 union 타입으로 정의한다.
- boolean prop은 `is`/`has` 또는 HTML 속성 이름(`disabled`, `required`)을 쓴다.
- 네이티브 속성(`aria-*`, `id`, `name` 등)은 그대로 전달한다.
- 외부에서 스타일을 덮어쓰는 방법(`className`, `class`, `style`) 허용 범위는 프로젝트 예외를 따른다.

## 5. 작성 규칙
- 새 컴포넌트는 `templates/component-spec.md`로 명세를 먼저 쓰고 승인받는다. 명세 `figma_name`에 연결할 Figma 컴포넌트 세트 이름을 적는다. (기본 계층은 필수)
- 기본·조합 계층은 데이터를 직접 가져오지 않는다. 값과 상태는 바깥에서 받는다. (React·Vue: props / JS: 마크업에 채운 값)
- 해당하는 상태(로딩·비활성·에러)를 변형으로 지원한다.
- 값 표시 포맷(예: 금액·날짜·마스킹)은 직접 만들지 않고 공통 유틸 함수를 쓴다. (`docs/ARCHITECTURE.md` 2번, 업종 규칙이 있으면 그 문서)
- 입력 컴포넌트는 부모가 포커스를 옮길 수 있게 한다. (React: ref 전달 / Vue: ref 노출 / JS: 포커스 받을 요소에 `id`)

## 6. 기존 컴포넌트 수정
- IMPORTANT: 고치기 전에 사용처를 검색하고 영향받는 화면 목록을 보고한다.
- 모양이 바뀌는 수정이면, 이미 검수한 사용 화면을 다시 비교하고 각 화면 보고 파일 "재검수 기록"에 남긴다. (`docs/QA.md` 5번)
- props·클래스 이름 변경·삭제처럼 기존 사용처가 깨지는 변경은 승인받은 뒤 진행한다.
- 변형이 필요하면 복사하지 말고 변형을 추가한다. (DESIGN.md 4번)
- 스타일은 컴포넌트 안에서 해결한다. 화면이 컴포넌트 스타일을 덮어써야 할 것 같으면 먼저 변형 추가를 검토한다. 정말 안 될 때만 `global.css` 예외 (ARCHITECTURE 8-1)

## 7. Figma 연결과 Code Connect
- Figma 컴포넌트와 코드 컴포넌트의 연결 원본은 컴포넌트 명세(`figma_name`, 4·5번 표)다. 연결 목록은 `docs/components/_index.md`에 자동으로 모인다. `figma_name`에 쉼표로 적은 세트는 세트마다 한 줄씩 연결 목록에 들어간다.
- `docs/PROJECT.md` "Code Connect 사용"이 "사용"일 때만: 컴포넌트가 구현완료되면 명세 내용대로 Figma Code Connect 등록을 제안한다. Figma에 쓰는 작업이라 반드시 승인받은 뒤 한다. 권한 설정은 `docs/HARNESS.md` 5번.

## 8. 프로젝트별 예외 (선택)
- 계층별 실제 폴더: [TODO: 예) src/components/ui, src/components/patterns]
- 폴더 안 파일 구성: [TODO: 예) JS: button.html, button.css / JS 종류별 폴더: html/components/button.html, css/components/button.css, js/components/button.js / React: Button.jsx, Button.module.css, index.js / Vue: Button.vue, index.js. index를 두지 않으면 빼고 적는다 — 2번 표보다 이 줄이 먼저다]
- Figma 이름 → 코드 이름: [TODO: 경로·디바이스 표기를 어떻게 바꾸는지와, 디바이스별 세트를 하나로 묶는지. 예) `/Mobile`·`/PC`·크기 표기(`16M/01`)는 빼고 경로를 이어 PascalCase, 디바이스별 세트는 컴포넌트 하나(폭으로 모양 전환)]
- 클래스 이름 규칙 (JS): [TODO: 예) BEM — block__element--modifier]
- 스토리 파일 위치: [TODO: 예) 컴포넌트 폴더 안 / src/stories/]
- 테스트 작성 여부: [TODO]
- class·style 덮어쓰기 허용 범위: [TODO]
