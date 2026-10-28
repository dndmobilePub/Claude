# 컴포넌트 폴더 규칙

> 이 폴더의 파일을 다룰 때 자동으로 읽힌다. 토큰·상태·재사용 순서는 `docs/DESIGN.md`를 따른다.
> 퍼블 언어(JS / React / Vue)는 `docs/PROJECT.md`를 따른다. 언어마다 다른 부분은 표의 언어별 칸만 본다.
> 실제 폴더명·파일 구성은 프로젝트마다 다르므로 맨 아래 예외 섹션을 따른다.

## 1. 계층
| 계층 | 역할 | 예 | 규칙 |
|---|---|---|---|
| 기본(ui) | Figma 디자인 시스템 컴포넌트와 1:1 대응 | Button, Input, Badge | 데이터·업무 로직 없음 |
| 조합(patterns) | 기본 컴포넌트를 묶은 반복 패턴 | AccountCard, AmountInput | 표시 규칙은 가능, 데이터 가져오기 없음 |
| 화면 전용 | 한 화면에서만 쓰는 조각 | (화면 폴더 안에 둠 — `docs/ARCHITECTURE.md` 4번) | 두 화면 이상에서 쓰이면 조합 계층으로 옮긴다 |

- 가져다 쓰는 방향은 한쪽만 허용한다: 화면 전용 → 조합 → 기본. 기본 컴포넌트는 조합 컴포넌트를 가져오지 않는다.

## 2. 폴더 구조
- 컴포넌트 하나 = 폴더 하나. 폴더 이름은 컴포넌트 이름과 같다.
- 폴더 안 파일 역할:

| 역할 | 필수 | 비고 |
|---|---|---|
| 본체 | 필수 | JS: 마크업 조각(HTML) / React: 컴포넌트 파일 / Vue: `.vue` 파일 |
| 스타일 | 스타일링 방식에 따름 | Tailwind면 별도 파일 없음. Vue는 `.vue` 안에 둘 수도 있음 |
| 동작 스크립트 | JS에서 동작이 있을 때만 | React·Vue는 본체 안에 둔다 |
| 타입(props) | React·Vue + TypeScript일 때 | 본체 안에 둘 수도 있음 — 프로젝트 예외를 따름 |
| 내보내기(index) | React·Vue | 외부는 index로만 가져간다 |
| 스토리 | 스토리북을 쓸 때 | `docs/PROJECT.md` 스토리북 |

## 3. 네이밍
- 컴포넌트 이름: PascalCase. Figma 컴포넌트(세트) 이름과 같게 한다.
- 폴더 이름: 컴포넌트 이름과 같다.
- JS: 마크업의 클래스 이름은 컴포넌트 이름을 바꾼 kebab-case를 기본 클래스로 쓴다. (예: `AccountCard` → `account-card`) 하위 요소·변형 표기 규칙은 예외 섹션의 클래스 이름 규칙을 따른다.
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
- 새 컴포넌트는 `templates/component-spec.md`로 명세를 먼저 쓰고 승인받는다.
- 기본·조합 계층은 데이터를 직접 가져오지 않는다. 값과 상태는 바깥에서 받는다. (React·Vue: props / JS: 마크업에 채운 값)
- 해당하는 상태(로딩·비활성·에러)를 변형으로 지원한다.
- 금액·마스킹 표시는 공통 유틸 함수를 쓴다. (`finance-ui.md`)
- 입력 컴포넌트는 부모가 포커스를 옮길 수 있게 한다. (React: ref 전달 / Vue: ref 노출 / JS: 포커스 받을 요소에 `id`)

## 6. 기존 컴포넌트 수정
- IMPORTANT: 고치기 전에 사용처를 검색하고 영향받는 화면 목록을 보고한다.
- props·클래스 이름 변경·삭제처럼 기존 사용처가 깨지는 변경은 승인받은 뒤 진행한다.
- 변형이 필요하면 복사하지 말고 변형을 추가한다. (DESIGN.md 4번)

## 7. Code Connect
- 새 기본 컴포넌트를 만들면 Figma Code Connect 매핑 추가를 제안한다. (추가는 승인 후)

## 8. 프로젝트별 예외 (선택)
- 계층별 실제 폴더: [TODO: 예) src/components/ui, src/components/patterns]
- 폴더 안 파일 구성: [TODO: 예) JS: button.html, button.css / React: Button.jsx, Button.module.css, index.js / Vue: Button.vue, index.js]
- 클래스 이름 규칙 (JS): [TODO: 예) BEM — block__element--modifier]
- 스토리 파일 위치: [TODO: 예) 컴포넌트 폴더 안 / src/stories/]
- 테스트 작성 여부: [TODO]
- class·style 덮어쓰기 허용 범위: [TODO]
