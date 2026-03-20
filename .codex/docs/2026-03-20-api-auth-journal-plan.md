# API 구현 계획 v1

## Summary
- 대상 문서 경로는 `.codex/docs/2026-03-20-api-auth-journal-plan.md`로 고정한다.
- 현재 기준점은 `apps/api/src/auth/auth.ts`, `apps/api/src/app.ts`, `apps/api/src/routes/index.ts`, `apps/api/prisma/schema.prisma`, `apps/web/src/lib/auth-client.ts`이다.
- 스키마에는 auth/journal 테이블이 이미 있으므로 이번 v1은 Prisma 마이그레이션 없이 진행하는 것을 기본값으로 둔다.
- 범위는 저널 `생성 / 전체 조회(커서 기반 무한 스크롤) / 개별 조회 / 수정 / 삭제`와 Better Auth + Spotify OAuth 기반 `회원가입 / 로그인 / 세션 조회`만 포함한다.
- 모든 신규 코드는 명시적 DI 패턴을 기준으로 작성한다. 의존성 조립은 composition root에서만 하고, controller/service는 인터페이스에만 의존한다.
- Spotify track search API는 이번 문서 범위에서 제외한다. 저널 생성/수정은 프론트가 선택한 track snapshot을 body로 전달받는다.
- `.codex/AGENTS.md`의 day-1 non-goal이던 Spotify 로그인 제외 규칙은 이번 사용자 요청으로 override된 것으로 취급한다.

## Current Baseline
- `apps/api/src/auth/auth.ts`
  - Better Auth 인스턴스가 Prisma adapter, `admin()` plugin, `emailAndPassword` 기준으로 이미 구성돼 있다.
- `apps/api/src/app.ts`
  - Express 앱은 CORS, body parser, `/api` 라우터, 공통 에러 핸들러만 연결돼 있다.
- `apps/api/src/routes/index.ts`
  - 현재 라우트는 `GET /api/health`만 존재한다.
- `apps/api/prisma/schema.prisma`
  - `User`, `Account`, `Session`, `Verification`, `JournalEntry` 모델이 이미 있고, `JournalEntry`는 `(userId, entryDate)` unique 제약을 갖는다.
- `apps/web/src/lib/auth-client.ts`
  - `createAuthClient`는 `/api`를 제거한 base URL을 Better Auth 루트로 사용하도록 구성돼 있다.

## Public APIs

### Auth
- 인증 surface는 Better Auth catch-all 하나로 고정한다.
- 라우트는 `app.all('/api/auth/*splat', toNodeHandler(auth))`로 마운트한다.
- 커스텀 `/api/session` 래퍼는 만들지 않는다.
- 프론트는 `signIn.social({ provider: "spotify" })`, `getSession()`, `signOut()`만 사용한다.

### Journal
- `POST /api/journals`
  - 인증 사용자 기준 신규 생성
  - 같은 `entryDate`가 이미 있으면 `409`
- `GET /api/journals?limit=20&cursor=YYYY-MM-DD`
  - `entryDate DESC` 커서 페이지네이션
  - 기본 20, 최대 50
  - 응답은 `{ items, pageInfo: { nextCursor, hasMore } }`
- `GET /api/journals/:journalId`
  - 본인 엔트리 상세 조회
- `PATCH /api/journals/:journalId`
  - `entryDate | mood | note | track` 부분 수정 허용
  - 날짜를 다른 기존 날짜로 바꾸려 하면 `409`
- `DELETE /api/journals/:journalId`
  - hard delete 후 `204`
  - 타 유저 엔트리는 존재 여부와 무관하게 `404`

## Request / Response Contract
- 공용 입력 타입은 아래로 고정한다.

```ts
type JournalTrackInput = {
  spotifyTrackId: string;
  trackName: string;
  artistNames: string[];
  albumName: string;
  albumImageUrl?: string | null;
  spotifyUrl: string;
  previewUrl?: string | null;
};

type CreateOrUpdateJournalInput = {
  entryDate: string; // YYYY-MM-DD
  mood: string;
  note: string;
  track: JournalTrackInput;
};
```

- list item 응답은 아래 필드만 포함한다.

```ts
type JournalListItem = {
  id: string;
  entryDate: string; // YYYY-MM-DD
  mood: string;
  notePreview: string;
  trackName: string;
  artistNames: string[];
  albumImageUrl?: string | null;
  spotifyUrl: string;
};
```

- detail 응답은 full `note`와 full `track` snapshot을 포함한다.
- 서비스는 `@db.Date`용 UTC normalization과 응답 직렬화(`YYYY-MM-DD`)를 담당한다.

## Implementation Changes

### Dependency Injection
- 백엔드 신규 코드는 constructor injection 또는 factory injection 기반의 명시적 DI 패턴으로 작성한다.
- 의존성 생성과 연결은 `composition root`에서만 수행한다.
- controller는 HTTP 요청/응답과 validation 결과만 다루고, service 인터페이스를 주입받아 호출한다.
- service는 use case orchestration만 담당하고 repository, auth session reader, clock 같은 포트 인터페이스를 주입받는다.
- repository 구현체만 Prisma에 접근할 수 있다.
- service 내부에서 concrete 구현을 직접 `new` 하지 않는다.
- middleware도 가능하면 팩토리 함수로 만들고, 세션 조회 로직은 주입 가능한 auth gateway 또는 session reader에 위임한다.

### Auth
- `apps/api/src/auth/auth.ts`
  - `socialProviders.spotify`를 추가한다.
  - `emailAndPassword`는 런타임 플로우에서 제거한다.
  - Spotify consent는 `user-read-email,user-read-private,user-top-read,user-read-recently-played,user-library-read`를 초기부터 요청한다.
  - Spotify 프로필의 `display_name`이 비어도 `users.name` non-null 제약이 깨지지 않도록 `mapProfileToUser`에서 `name = display_name ?? email local-part ?? "Spotify User"`로 보정한다.
- `apps/api/src/config/env.config.ts`
  - `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_AUTH_SCOPES`를 추가한다.
  - Spotify redirect URL은 `${BETTER_AUTH_URL}/api/auth/callback/spotify`로 문서화한다.
- `apps/api/src/app.ts`
  - Better Auth handler를 JSON body parser보다 먼저 마운트한다.

### Journal
- `apps/api/src/modules/journal` 기준으로 `schemas / types / repository / service / router`를 분리한다.
- Prisma는 repository만 사용하고, service/controller는 Prisma를 직접 import하지 않는다.
- `repository interface -> prisma repository`, `service interface -> journal service` 구조로 분리한다.
- 라우터 생성도 `createJournalRouter(deps)` 형태로 구성해 테스트에서 mock service를 주입할 수 있게 한다.
- 인증 미들웨어 `requireSession`을 추가해 Better Auth 세션을 request headers로 조회하고 `req.auth = { userId, sessionId }`를 주입한다.
- `Express.Request` 타입 확장도 함께 정의한다.

### Error Handling
- `apps/api/src/middlewares/errorHandler.ts`와 `apps/api/src/middlewares/validate.ts`는 저널 범위에서 `{ success: false, message, errors? }` 형식으로 맞춘다.
- Zod field 오류는 `errors` 배열로 노출한다.

### Tests
- `apps/api/package.json`에 `vitest + supertest` 기반 `test` 스크립트를 추가한다.
- route/service 통합 테스트는 `createApp()` 경로를 직접 타도록 구성한다.

## Test Plan
- 인증 수동 검증
  - Spotify 로그인 시작
  - consent 완료
  - `/api/auth/callback/spotify` 복귀
  - `users/accounts/sessions` 생성 또는 재사용
  - 프론트 `authClient.getSession()` 성공
- 인증 자동 테스트
  - unauthenticated journal access `401`
  - valid session에서만 journal CRUD 성공
  - 같은 Spotify 계정으로 재로그인해도 user/account 중복 생성이 없음
- 저널 자동 테스트
  - create `201`
  - same-day duplicate create `409`
  - list page 간 중복/누락 없음
  - detail/update/delete는 본인 소유만 성공
  - delete 후 detail `404`
- 날짜 회귀 테스트
  - `entryDate`가 타임존 차이로 하루 밀리지 않고 항상 `YYYY-MM-DD`로 round-trip 된다
- 앱 회귀 테스트
  - Better Auth handler를 body parser 앞에 둔 뒤에도 `GET /api/health`와 기존 CORS credentials 동작이 유지된다

## Assumptions
- 초기 출시 인증은 Spotify 전용이다.
- email/password는 public flow에서 쓰지 않지만 기존 Prisma 스키마는 유지한다.
- 세션 조회는 Better Auth 기본 surface를 그대로 쓴다.
- 앱 전체 API 구현은 IoC 컨테이너 없이, 읽기 쉬운 명시적 DI 패턴으로 유지한다.
- OAuth 구현/세션 동작 기준은 아래 문서를 따른다.
  - Better Auth Installation: https://better-auth.com/docs/installation
  - Better Auth Client: https://www.better-auth.com/docs/concepts/client
  - Better Auth Session Management: https://www.better-auth.com/docs/concepts/session-management
  - Spotify Authorization Code Flow: https://developer.spotify.com/documentation/web-api/tutorials/code-flow
  - Spotify Scopes: https://developer.spotify.com/documentation/web-api/concepts/scopes
