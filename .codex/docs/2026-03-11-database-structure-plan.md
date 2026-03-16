# Music Journal DB 구조 v1

## Summary
- 스키마는 `Better Auth` 코어 테이블과 앱 도메인 테이블을 한 Prisma 스키마에 같이 둔다.
- 유저는 분리 프로필 없이 `Better Auth user = 앱 users`로 통합한다.
- 일기 엔트리는 `1 user + 1 day + 1 track` 규칙으로 간다.
- 곡은 별도 `tracks` 테이블 없이 `journal_entries`에 스냅샷 컬럼으로 저장한다.
- day 1은 단일 관리자 유저로 운영하되, 스키마는 멀티유저 확장 가능하게 유지한다.

## Schema
- `mood`는 DB enum이 아니라 문자열 컬럼으로 저장하고, 허용값은 앱 validation으로 제한한다: `happy | calm | focused | melancholy | chaotic`
- Prisma 모델은 `User`, `Account`, `Session`, `Verification`, `JournalEntry`로 두고, 실제 테이블명은 `@@map`으로 `users`, `accounts`, `sessions`, `verifications`, `journal_entries`에 맞춘다.
- `User` -> `users`
  - `id`: UUID string PK
  - `name`: string
  - `email`: string, unique
  - `emailVerified`: boolean, default `false`
  - `image`: nullable string
  - `role`: nullable/optional string, default `"user"`
  - `banned`: nullable/optional boolean, default `false`
  - `banReason`: nullable string
  - `banExpires`: nullable datetime
  - `createdAt`, `updatedAt`
  - relations: `accounts`, `sessions`, `journalEntries`
- `Account` -> `accounts`
  - Better Auth 코어 필드 그대로 사용
  - 최소 포함: `id`, `userId`, `accountId`, `providerId`, `accessToken`, `refreshToken`, `accessTokenExpiresAt`, `refreshTokenExpiresAt`, `scope`, `idToken`, `password`, `createdAt`, `updatedAt`
  - `userId` FK -> `users.id`
  - Better Auth canonical unique/index 규칙 유지
- `Session` -> `sessions`
  - Better Auth 코어 필드 그대로 사용
  - 최소 포함: `id`, `userId`, `token`, `expiresAt`, `ipAddress`, `userAgent`, `createdAt`, `updatedAt`
  - admin 확장 필드 `impersonatedBy` 추가
  - `token` unique
  - `userId` FK -> `users.id`
- `Verification` -> `verifications`
  - Better Auth 코어 필드 그대로 사용
  - 최소 포함: `id`, `identifier`, `value`, `expiresAt`, `createdAt`, `updatedAt`
  - Better Auth canonical unique/index 규칙 유지
- `JournalEntry` -> `journal_entries`
  - `id`: UUID string PK
  - `userId`: UUID string FK -> `users.id`
  - `entryDate`: `DateTime @db.Date`
  - `mood`: string
  - `note`: string
  - track snapshot:
    - `spotifyTrackId`: string
    - `trackName`: string
    - `artistNames`: `String[]`
    - `albumName`: string
    - `albumImageUrl`: nullable string
    - `spotifyUrl`: string
    - `previewUrl`: nullable string
  - `createdAt`, `updatedAt`
  - unique: `(userId, entryDate)`
  - index: `(userId, entryDate)`
  - index: `(userId, spotifyTrackId)` for “자주 들은 곡” 집계
  - delete rule: user 삭제 시 cascade

## Implementation Changes
- `apps/api/prisma/schema.prisma`
  - 빈 스키마를 위 구조로 교체
  - `User/Account/Session/Verification`는 Better Auth 코어 스키마 기준으로 작성
  - `User`, `Session`에 admin 확장 필드 포함
  - `JournalEntry` 추가
- `apps/api/src/auth/auth.ts`
  - Better Auth를 `emailAndPassword + admin()` 기준으로 설정
  - `advanced.database.generateId = "uuid"`로 통일
  - `User/Session` 확장 필드는 Better Auth 설정과 Prisma 스키마가 정확히 일치해야 함
- 데이터 정책
  - true thread/reply/revision 테이블은 만들지 않음
  - 같은 날짜 재저장은 새 row가 아니라 같은 `journal_entries` row를 upsert/update
  - `note` 공백 금지, track 필수는 앱 validation에서 처리하고 DB `CHECK`는 day 1에 넣지 않음

## Test Plan
- `prisma validate`와 `prisma generate`가 통과해야 한다.
- 마이그레이션 후 `users/accounts/sessions/verifications/journal_entries` 테이블이 생성되어야 한다.
- Better Auth 회원가입 시 `users` + `accounts`가 생성되고 로그인 시 `sessions`가 생성되어야 한다.
- `users.role`, `users.banned`, `users.banReason`, `users.banExpires`, `sessions.impersonatedBy` 컬럼이 존재해야 한다.
- 동일 user가 같은 `entryDate`로 두 번 저장하면 중복 insert가 아니라 update/upsert 되어야 한다.
- 다른 user는 같은 날짜로 각각 엔트리를 가질 수 있어야 한다.
- `GROUP BY userId, spotifyTrackId` 집계로 자주 들은 곡 카운트가 가능해야 한다.
- user 삭제 시 해당 user의 `accounts`, `sessions`, `journal_entries`가 함께 정리되어야 한다.

## Assumptions
- day 1 인증 방식은 `email/password`만 사용한다. 소셜 로그인용 별도 도메인 테이블은 만들지 않는다.
- `role`은 Prisma enum이 아니라 `string`으로 둔다. Better Auth admin 플러그인이 role을 string 기반으로 다루고, 다중 role도 문자열로 확장할 수 있기 때문이다.
- 별도 `tracks` 테이블, `profiles` 테이블, `journal_entry_revisions` 테이블은 이번 v1에 포함하지 않는다.
- Better Auth 코어/Prisma/admin 확장 규칙은 공식 문서를 기준으로 맞춘다: [Database](https://better-auth.com/docs/concepts/database), [Prisma Adapter](https://better-auth.com/docs/adapters/prisma), [Admin Plugin](https://better-auth.com/docs/plugins/admin).
