# API/Auth/Journal 구현 현황 v1

## Summary
- 이 문서는 `2026-03-22` 기준 실제 구현 결과를 정리한 현황 문서다.
- 원래 계획 문서는 `.codex/docs/2026-03-20-api-auth-journal-plan.md`에 유지하고, 이 문서는 그 이후 실제 반영된 구조와 동작을 기록한다.
- 현재 범위는 `Better Auth + Spotify OAuth 로그인/세션`, `저널 CRUD`, `커서 기반 목록 조회`, `Spotify 트랙 검색 API`, `web 앱의 실제 API 연동`까지 포함한다.
- 제품 방향은 `하루 1개 대표곡`에서 `하루 여러 개를 올릴 수 있는 데일리 뮤직 로그/SNS`로 변경되었다.
- 모든 신규 백엔드 코드는 명시적 DI 패턴을 기준으로 작성했다. 의존성 생성과 연결은 composition root에서만 수행한다.

## 계획 대비 변경 사항
- 초기 계획 문서에서는 Spotify track search API를 제외했지만, 이후 요구사항 변경으로 실제 구현에는 `GET /api/spotify/tracks/search`를 추가했다.
- 저널 생성/수정 입력도 초기 계획의 `track snapshot 직접 전달` 방식에서 `spotifyTrackId 전달 -> 서버가 Spotify API로 조회 후 snapshot 저장` 방식으로 바뀌었다.
- 저널 조회 시에도 저장된 snapshot만 그대로 반환하지 않고, 가능하면 Spotify API에서 최신 메타데이터를 다시 조회하고 실패하면 DB snapshot으로 fallback 하도록 구현했다.
- 초기 계획의 `하루 1개 엔트리`와 `entryDate DESC 날짜 커서`는 더 이상 유지하지 않는다.
- 현재는 같은 사용자가 같은 날짜에 여러 개의 엔트리를 올릴 수 있고, 목록은 `createdAt DESC, id DESC` 기준의 피드형 커서로 조회한다.

## 현재 아키텍처

### Backend
- `apps/api/src/composition`
  - composition root에서 `auth`, `session reader`, `journal service`, `spotify service`, `router`를 조립한다.
- `apps/api/src/modules/auth`
  - Better Auth 설정, 세션 조회, `require-session` 미들웨어, Express 타입 확장을 관리한다.
- `apps/api/src/modules/journal`
  - `router / schemas / service / repository / types` 구조로 저널 도메인을 관리한다.
- `apps/api/src/modules/spotify`
  - Spotify Client Credentials 토큰 관리, 트랙 검색, 단건/다건 트랙 조회를 담당한다.
- `apps/api/src/middlewares`
  - 전역 공통 미들웨어만 둔다.
  - 파일명은 모두 소문자 `*.middleware.ts` 규칙으로 통일했다.

### Frontend
- `apps/web/src/app/router.tsx`
  - Better Auth 세션 상태에 따라 홈, 오늘 작성, 히스토리 화면을 분기한다.
- `apps/web/src/lib/api.ts`
  - 백엔드 API 호출과 응답 매핑을 담당한다.
- `apps/web/src/lib/journal.ts`
  - 화면 전용 저널/트랙 타입을 정의한다.
- `apps/web/src/pages`
  - 샘플 데이터 기반 화면을 제거하고 실제 API 기반 동작으로 교체했다.

## 구현 완료 범위

### Auth
- Better Auth catch-all을 `app.all('/api/auth/*splat', toNodeHandler(auth))`로 JSON body parser보다 먼저 마운트했다.
- Spotify OAuth 기반 로그인/회원가입/세션 조회를 사용한다.
- `emailAndPassword` 공개 플로우는 제거했다.
- Spotify 프로필의 `display_name`이 비어도 `users.name` 제약이 깨지지 않도록 fallback name 매핑을 넣었다.
- 프론트는 Better Auth client로 `signIn.social({ provider: "spotify" })`, `useSession()`, `signOut()`을 사용한다.

### Journal API
- `POST /api/journals`
  - 로그인 사용자만 생성 가능
  - 입력은 `entryDate`, `mood`, `note`, `spotifyTrackId`
  - 동일 사용자 + 동일 날짜 중복 생성도 허용
- `GET /api/journals`
  - 로그인 사용자 본인 기록만 조회
  - 최신 작성 순 피드형 커서 기반 페이지네이션
  - 응답은 `{ items, pageInfo: { nextCursor, hasMore } }`
- `GET /api/journals/:journalId`
  - 로그인 사용자 본인 기록 상세 조회
- `PATCH /api/journals/:journalId`
  - 로그인 사용자 본인 기록만 수정 가능
  - 타인 기록은 존재 여부와 무관하게 `404`
- `DELETE /api/journals/:journalId`
  - 로그인 사용자 본인 기록만 삭제 가능
  - 타인 기록은 존재 여부와 무관하게 `404`

### Spotify API
- `GET /api/spotify/tracks/search`
  - 로그인 사용자만 호출 가능
  - Spotify Client Credentials 기반으로 트랙 검색
  - limit validation 포함
- 내부적으로 단건 트랙 조회와 다건 트랙 조회도 구현되어 저널 생성/수정/조회에서 재사용한다.
- Spotify API 실패 시에는 상황에 따라 `502`, 자격증명 누락 시 `503`을 반환한다.

### Web 연결 상태
- 홈 화면
  - 로그인 상태면 최근 저널 3개를 API로 불러온다.
  - 비로그인 상태면 Spotify 로그인 유도 상태를 보여준다.
- 오늘 작성 화면
  - Spotify 검색 결과를 실제 API로 가져온다.
  - 선택한 곡의 `spotifyTrackId`로 저널 생성 요청을 보낸다.
  - 같은 날에도 여러 번 새 기록을 올릴 수 있다.
- 히스토리 화면
  - 실제 저널 목록 API와 상세 API를 사용한다.
  - 최신 게시 순으로 엔트리를 보여준다.
  - 펼친 카드에서 수정/삭제를 바로 수행할 수 있다.
  - 더 보기 버튼으로 커서 기반 추가 조회를 수행한다.

## 현재 API 계약

### Journal Create / Update Input
```ts
type CreateJournalInput = {
  entryDate: string; // YYYY-MM-DD
  mood: 'happy' | 'calm' | 'focused' | 'melancholy' | 'chaotic';
  note: string;
  spotifyTrackId: string;
};
```

### Journal List Item
```ts
type JournalListItem = {
  id: string;
  entryDate: string;
  mood: 'happy' | 'calm' | 'focused' | 'melancholy' | 'chaotic';
  notePreview: string;
  createdAt: string;
  track: {
    spotifyTrackId: string;
    trackName: string;
    artistNames: string[];
    albumName: string;
    albumImageUrl: string | null;
    spotifyUrl: string;
    previewUrl: string | null;
  };
};
```

### Error Response
```ts
type ErrorResponse = {
  success: false;
  message: string;
  errors?: Array<{
    path?: string;
    message: string;
    location?: string;
  }>;
};
```

## 보안/권한 규칙
- 저널 관련 모든 CRUD는 로그인한 사용자만 접근 가능하다.
- 저널 상세 조회, 수정, 삭제는 모두 본인 소유 저널만 허용한다.
- 라우터에서 `require-session` 미들웨어로 인증을 강제하고, 서비스/저장소에서도 사용자 범위를 다시 확인한다.
- Spotify 검색 라우트도 로그인 사용자만 허용한다.

## 구현 세부 결정
- 전역 `routes/controllers/services` 구조 대신 도메인 기반 `modules/<domain>` 구조로 정리했다.
- `requireSession`도 인증 도메인 정책으로 보고 `modules/auth` 아래에 둔다.
- 공통 HTTP 미들웨어는 `src/middlewares`에 두고, 파일명 규칙은 `logger.middleware.ts`, `validate.middleware.ts`처럼 통일했다.
- 저널은 DB에 Spotify snapshot을 저장하되, 조회 시에는 가능한 경우 Spotify 최신 메타데이터를 다시 불러온다.
- Spotify 액세스 토큰은 서버 메모리에서 캐시한다.
- DB의 `(userId, entryDate)` unique 제약을 제거하고, `journal_entries_user_created_at_idx` 인덱스를 추가하는 마이그레이션을 준비했다.
- Today 화면은 더 이상 same-day upsert가 아니라 create-only다.
- History/API feed는 `entryDate`보다 `createdAt` 기준의 최신 게시 흐름을 우선한다.

## 검증 이력
- 아래 검증을 통과했다.
  - `pnpm --filter api check-types`
  - `pnpm --filter api lint`
  - `pnpm --filter api build`
  - `pnpm --filter api test`
  - `pnpm --filter web check-types`
  - `pnpm --filter web lint`
  - `pnpm --filter web build`
- 이전 단계에서 `pnpm --filter api prisma:validate`도 통과했다.
- `api test`는 `supertest`의 임시 로컬 포트 바인딩 때문에 권한 상승으로 실행했다.

## 커밋 이력
- `5c18cf0` `feat(api): add spotify auth and journal APIs`
  - Better Auth + Spotify OAuth, 저널 CRUD 기본 구현
- `65db2c6` `fix(api): enforce journal ownership checks`
  - 저널 수정/삭제 소유권 검증 강화
- `5ee960a` `refactor(api): organize code by domain modules`
  - 전역 레이어 구조를 도메인 모듈 구조로 정리
- `bff12b3` `refactor(api): standardize middleware filenames`
  - 미들웨어 파일명을 소문자 `*.middleware.ts`로 통일
- `00dc012` `feat(journal): integrate spotify track search`
  - Spotify 검색/조회 API 추가, 저널 작성/조회에 Spotify 메타데이터 연동, web 실API 연동

## 남아 있는 갭
- 실제 Spotify OAuth 수동 검증은 운영용 `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `BETTER_AUTH_URL` 기준으로 별도 확인이 필요하다.
- 현재는 사용자 본인 기록만 다루는 private history다. 진짜 SNS 느낌의 public feed나 타 유저 프로필/피드는 아직 없다.
- OAuth와 브라우저 전체 사용자 흐름에 대한 E2E 테스트는 아직 없다.

## 다음 단계 제안
- 1. private history를 넘어 `전체 공개 피드` 또는 `팔로우 피드` 요구사항을 확정한다.
- 2. `JournalEntry`에 공개 범위, 작성 위치, 해시태그 같은 SNS성 메타데이터가 필요한지 결정한다.
- 3. Spotify OAuth와 저널 작성/조회 흐름에 대해 Playwright 기반 E2E 테스트를 추가한다.
- 4. Spotify API 장애 시 사용자 메시지와 fallback UX를 더 명확하게 정리한다.
- 5. 필요한 경우 저널 목록 prefetch, optimistic update, 캐시 전략을 도입해 web 체감을 개선한다.

## 참고 문서
- 계획 문서: `.codex/docs/2026-03-20-api-auth-journal-plan.md`
- DB 구조 문서: `.codex/docs/2026-03-11-database-structure-plan.md`
