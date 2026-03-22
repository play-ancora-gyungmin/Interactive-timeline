# 프론트엔드 베타 고도화 계획 v1

## Summary
- 대상 문서는 `.codex/docs/2026-03-23-frontend-beta-plan.md`로 고정한다.
- 목표는 `apps/web`의 현재 MVP를 모바일 우선, 한국어 우선, 베타 실사용 수준의 프론트엔드로 재구성하는 것이다.
- 이번 범위는 프론트엔드 중심 고도화이며, 백엔드 API 계약은 유지한다.
- 화면 수는 `.codex/AGENTS.md` 규칙에 맞춰 정확히 3개로 유지한다: `/`, `/capture`, `/library`.

## Current Baseline
- 현재 프론트는 수제 라우팅으로 `/`, `/today`, `/history`를 전환하고 있었다.
- 홈, 오늘 기록, 히스토리, Spotify 로그인, 저널 CRUD, API health 체크는 이미 동작하는 MVP 상태였다.
- 스타일은 `index.css`, `App.css` 전역 파일에 크게 모여 있었고, 화면별 책임 분리가 약했다.
- 백엔드는 `health`, `journals`, `spotify`, `better-auth`를 제공하므로 이번 단계는 프론트 정보 구조, 상태 처리, 시각 언어, 테스트 체계 정리가 중심이다.
- 개발 환경에서는 Spotify OAuth 자격증명이 기본적으로 비어 있을 수 있으므로, 읽기 전용 게스트 흐름이 필요하다.

## Key Decisions
- 라우팅은 `react-router-dom`으로 교체하고 퍼블리싱 화면은 `/`, `/capture`, `/library` 3개만 둔다.
- `/library`의 상세 펼침과 편집 상태는 추가 페이지를 만들지 않고 search param으로 관리한다: `?entry=<id>`와 `?entry=<id>&mode=edit`.
- 서버 상태는 `@tanstack/react-query`로 통합한다.
- 게스트 모드는 프론트 전용 데모 데이터로 구현하고, 홈과 라이브러리만 읽기 가능하게 둔다.
- 디자인은 전면 리디자인으로 가되, 톤은 “album sleeve journal”을 유지하고 UI 언어는 한국어 중심으로 통일한다.
- 타이포그래피는 한글 고딕 기반으로 고정한다. 기본 UI 폰트는 `Noto Sans KR`로 채택하고, 세리프 헤드라인은 사용하지 않는다.

## Implementation Changes
- 정보 구조를 `개요`, `기록하기`, `라이브러리`로 재편한다.
- `/`는 게스트 랜딩과 인증 사용자 개요를 겸하고, 최근 기록과 상태 요약을 보여준다.
- `/capture`는 감정 선택, Spotify 검색, 선택 곡 확인, 메모 작성, 저장의 단일 작성 흐름으로 고정한다.
- `/library`는 기록 피드, 상세 확인, 수정, 삭제를 한 화면 안에서 처리한다.
- `albumImageUrl`, `previewUrl`, `spotifyUrl`를 실제 카드와 상세 UI에 노출한다.
- 전역 CSS는 토큰과 리셋만 남기고, 레이아웃과 페이지 스타일은 CSS Modules로 분리한다.
- 공용 UI 상태는 로딩, 빈 상태, 오류, 권한 필요, 저장 성공 메시지까지 동일 패턴으로 정리한다.
- `packages/ui`는 현재 스텁 수준이므로 이번 단계에서는 `apps/web` 내부 프리미티브를 먼저 정리하고, 안정화 후 공유 패키지로 옮긴다.

## Typography
- `Noto Sans KR`를 프라이머리 폰트로 적용한다.
- 폰트 로딩 방식은 외부 CDN 링크가 아니라 패키지 의존성 방식으로 고정한다: `@fontsource/noto-sans-kr`.
- 초기 적용 weight는 `400`, `500`, `700`으로 제한한다.
- 폰트 import는 `apps/web/src/main.tsx`에서 앱 스타일보다 먼저 로드한다.
- CSS 변수는 `--font-sans: 'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', 'Segoe UI', sans-serif`로 고정한다.
- `body`, `button`, `input`, `textarea`, 네비게이션, 카드 제목까지 모두 `--font-sans`를 사용한다.
- 기존 serif 계열 타이틀 스택은 제거하고, 제목 대비는 크기와 두께와 자간으로 만든다.

## Test Plan
- `pnpm --filter web check-types`와 `pnpm --filter web lint`를 유지 통과해야 한다.
- 프론트 테스트는 `vitest`, `@testing-library/react`, `@testing-library/user-event`, `msw` 기준으로 추가한다.
- 게스트 홈, 게스트 라이브러리, 인증 사용자 작성, 수정, 삭제 흐름을 검증한다.
- 반응형 기준은 `390px`, `768px`, `1280px`로 고정한다.
- 접근성 기준은 키보드 탐색, 포커스 표시, 버튼과 입력 레이블, 다이얼로그, `prefers-reduced-motion` 대응까지 포함한다.
- 폰트 검증은 앱 루트가 `Noto Sans KR` 기반 폰트 변수를 사용하고, 주요 UI 요소가 동일 변수를 상속하는지 확인한다.

## Assumptions
- 이번 문서는 기존 계획 문서를 수정하지 않고 새 파일로 추가한다.
- 백엔드 API 스키마는 바꾸지 않는다.
- 국제화 시스템은 도입하지 않고, 이번 단계는 한국어 우선 카피로 고정한다.
- 공유 상세 페이지나 4번째 화면은 만들지 않는다.
- 인증 미구성 개발 환경에서도 홈과 라이브러리 데모 검증은 가능해야 한다.
