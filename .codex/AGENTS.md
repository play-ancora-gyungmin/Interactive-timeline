# Daily Music Journal MVP - AGENTS.md

이 파일은 **Codex가 바로 읽고 작업할 수 있는 저장소 루트용 지시서**입니다.  
목표는 **하루 안에 배포 가능한 데일리 음악 일기앱 MVP**를 만드는 것입니다.

---

## Current Repo Mapping

이 문서는 **현재 저장소 구조를 기준으로 해석**한다.

- 프론트 제품 앱은 `apps/web`
- 백엔드 API 앱은 `apps/api`
- `apps/docs`는 day 1 MVP 핵심 범위 밖의 보조 앱
- `packages/ui`는 필요하면 재사용하는 선택형 공유 UI 패키지
- 루트는 `pnpm workspace + Turborepo` 모노레포로 유지한다.

즉, 이 문서 안에서 과거의 `web/`, `server/` 예시는 모두 현재 저장소에서는 **`apps/web`, `apps/api`로 대응**해서 읽는다.

---

## 0. 한 줄 요약

- **제품명**: Daily Music Journal
- **목표**: 사용자가 하루에 한 곡을 고르고, 짧은 감정/메모를 남기고, 지난 기록을 다시 보는 앱
- **개발 시간 제한**: 1 working day
- **퍼블리싱 화면 수**: 정확히 3개
- **권장 스택**: `Vite React + TypeScript + Express + Postgres + Prisma ORM 7`
- **Spotify 연동 방식(1일 MVP)**: **Client Credentials 기반 트랙 검색만 사용**
- **백엔드 아키텍처 원칙**: **명시적 의존성 주입(Dependency Injection) + 레이어 분리 + Composition Root + Prisma는 인프라 레이어에만 고립**
- **확장 방향**: 이후 `Spotify Authorization Code + PKCE`, 멀티유저, 캘린더 뷰, 통계 기능으로 확장

---

## 1. 스택 결정 원칙

### Primary recommendation

이 저장소의 기본 권장 조합은 아래입니다.

- **Frontend**: `Vite + React + TypeScript`
- **Backend**: `Express + TypeScript`
- **Database**: `Postgres`
- **ORM / schema / migrations**: `Prisma ORM 7`
- **Validation**: `zod`
- **HTTP client**: `fetch` 또는 `undici`
- **Styling**: 기본은 `CSS Modules` 또는 `plain CSS`; 이미 익숙하면 `Tailwind` 허용

### 왜 이 조합을 기본으로 잡는가

- **하루 안에 끝내기 쉽다.**
- **Codex가 다루기 좋은 보편적 구조**다.
- React 생태계가 넓어서 이후 기능 확장에 유리하다.
- Express는 얇고 단순해서 API MVP에 빠르다.
- Prisma는 **타입 안전한 접근 + 마이그레이션 + 생성된 클라이언트**를 한 번에 가져가기 좋다.
- Spotify secret을 서버에만 두기 쉽다.
- **명시적 DI를 적용하기 가장 단순하다.**

### Prisma 7 day-1 rules

Prisma 7로 갈 때는 아래 규칙을 고정한다.

- `prisma-client-js`가 아니라 **`prisma-client` generator**를 쓴다.
- generator의 **`output` 경로를 반드시 지정**한다.
- `prisma.config.ts`를 **서버 루트**에 두고 schema / migrations / datasource / seed를 여기서 관리한다.
- `dotenv/config`를 `prisma.config.ts`와 서버 런타임 양쪽에서 명시적으로 로드한다.
- Postgres 연결은 **`@prisma/adapter-pg` + `pg`** 조합으로 맞춘다.
- Prisma Client는 **Composition Root에서 생성**하고, repository 구현체에만 흘려보낸다.
- `prisma migrate dev` 뒤에 **필요하면 `prisma generate`를 명시적으로 실행**한다.
- 시드는 **`prisma db seed`를 명시적으로 실행**한다. Day 1에는 `migrate dev`가 알아서 시드를 돌린다고 가정하지 않는다.

### DI strategy for day 1

하루 MVP 기준 백엔드 DI 전략은 아래로 고정한다.

- **무거운 IoC 컨테이너 라이브러리를 먼저 넣지 않는다.**
- `inversify`, `tsyringe`, `typedi` 같은 도구는 day 1에는 기본 비권장이다.
- 대신 **constructor injection** 또는 **factory injection**으로 간다.
- 의존성 조립은 `composition/` 또는 `index.ts`의 **Composition Root**에서만 한다.
- 비즈니스 로직은 **포트 인터페이스**에만 의존한다.
- **Controller는 HTTP만 알고, Service는 유스케이스만 알고, Repository/Gateway만 외부 세계를 안다.**
- **PrismaClient는 인프라 의존성**이다. service와 controller가 직접 import하지 않는다.

즉, day 1 MVP에서는 **마법 같은 자동 주입보다 읽기 쉬운 명시적 주입**이 더 낫다.

### Alternate backend option

`Elysia`를 쓰고 싶다면 허용한다. 단, 아래 조건을 지킨다.

- **라우트 계약은 Express안과 동일하게 유지**한다.
- 런타임이 이미 Bun 기반이거나, 타입 중심 DX를 더 중요하게 볼 때만 선택한다.
- Node에서 돌릴 경우 Node adapter를 사용한다.
- 하루 MVP 기준으로는 **새로운 런타임 학습 비용이 생기면 Express를 우선**한다.
- Elysia를 써도 **DI는 동일하게 explicit factory 방식**으로 유지한다.
- Elysia를 써도 Prisma 7 관련 규칙은 그대로 유지한다.

---

## 2. 절대 바꾸지 말아야 하는 범위

### Must-have

1. **화면은 3개만 배포**한다.
2. **Spotify API는 트랙 검색 용도만** 쓴다.
3. **하루 1개 엔트리**만 저장한다.
4. 한 엔트리에는 아래가 들어간다.
   - 날짜
   - mood 1개
   - 짧은 일기
   - Spotify track 1개
5. Postgres를 사용한다.
6. 백엔드에서 Spotify 토큰을 관리한다.
7. 프론트는 백엔드 API만 호출한다.
8. 모바일 화면에서도 무너지지 않게 만든다.
9. **백엔드 비즈니스 로직은 의존성 주입 패턴을 준수**한다.
10. **service에서 concrete 구현을 직접 `new` 하지 않는다.**
11. **service와 controller에서 PrismaClient를 직접 사용하지 않는다.**
12. **Repository 구현체만 Prisma에 직접 접근**한다.

### Explicit non-goals for day 1

아래는 **절대 1일차 범위에 넣지 않는다**.

- Spotify 로그인 / 사용자 Spotify 라이브러리 연동
- 재생 제어 / Web Playback SDK
- 소셜 피드
- 댓글 / 좋아요
- AI 감정 분석
- 이미지 업로드
- 오디오 파일 업로드
- 다중 곡 첨부
- 복잡한 캘린더 UI
- 다크모드 토글
- 관리자 화면
- SSR / Next.js / SvelteKit 전환
- 실시간 기능
- 무거운 DI 컨테이너 프레임워크 추가
- Prisma extension 남발
- 커스텀 migration SQL을 대량으로 손보는 작업

이런 것들을 집어넣는 순간 원데이 프로젝트가 아니라 야근 제조기다.

---

## 3. 제품 정의

### 핵심 사용자 흐름

1. 사용자가 홈에 들어온다.
2. 오늘의 기록을 쓰러 간다.
3. Spotify에서 곡을 검색한다.
4. 곡 1개를 선택한다.
5. mood를 고르고 메모를 쓴다.
6. 저장한다.
7. 기록 목록에서 지난 날들의 음악 일기를 다시 본다.

### MVP 가치

이 앱의 핵심 가치는 다음 하나다.

> **"그날의 감정과 연결된 곡을 날짜 단위로 남기고 다시 꺼내볼 수 있다."**

---

## 4. 화면 설계 (정확히 3개)

### Screen 1 — `/` Home

목적: 앱 소개 + 오늘 기록 유도 + 최근 기록 미리보기

포함 요소:

- 앱 이름 / 짧은 소개
- 오늘 날짜 표시
- `오늘 기록하기` CTA 버튼
- 최근 엔트리 3개 카드
- 비어 있을 때 empty state

필수 상태:

- 로딩
- 최근 기록 없음
- 최근 기록 3개 이하

### Screen 2 — `/today` Today Entry

목적: 오늘의 음악 일기 작성 / 수정

포함 요소:

- 날짜 표시 (기본값 오늘)
- mood selector (5개 이내)
- Spotify track search input
- 검색 결과 리스트
- 선택된 곡 카드
- 메모 textarea
- 저장 버튼
- 이미 오늘 기록이 있으면 `수정 모드`

권장 mood 목록:

- `happy`
- `calm`
- `focused`
- `melancholy`
- `chaotic`

### Screen 3 — `/history` History

목적: 지난 기록 목록 조회

포함 요소:

- 월 필터 또는 최근 30일 목록
- 엔트리 카드 리스트
- 카드 안에 날짜 / mood / 곡명 / 아티스트 / 메모 일부 표시
- 클릭 시 같은 화면 안에서 상세 펼침(accordion 또는 side panel)

주의:

- 상세 페이지를 따로 만들지 않는다.
- **3개 화면 제한** 때문에 detail은 `/history` 내부에서 처리한다.

---

## 5. 정보 구조와 데이터 모델

### Day 1 원칙

- **`users` 모델은 유지**한다. 다만 day 1에는 `demo user` 하나로 운영해도 된다.
- 엔트리에 **Spotify track snapshot을 같이 저장**한다.
- track id만 저장하지 말고, 곡명/아티스트/앨범 이미지/spotify url도 저장한다.
- 이유: 나중에 Spotify 메타데이터가 바뀌어도 과거 일기가 덜 흔들린다.
- note 길이 제한과 공백 금지는 **zod + service validation**으로 먼저 막는다.
- DB 레벨 `CHECK` 제약은 day 1 필수는 아니다. 시간이 남으면 custom SQL migration으로 추가한다.

### Recommended Prisma schema

파일 위치: `apps/api/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
  runtime  = "nodejs"
}

datasource db {
  provider = "postgresql"
}

enum Mood {
  happy
  calm
  focused
  melancholy
  chaotic
}

model User {
  id          String         @id @default(uuid()) @db.Uuid
  email       String?        @unique
  displayName String?        @map("display_name")
  createdAt   DateTime       @default(now()) @map("created_at") @db.Timestamptz(6)
  entries     JournalEntry[]

  @@map("users")
}

model JournalEntry {
  id             String   @id @default(uuid()) @db.Uuid
  userId         String   @map("user_id") @db.Uuid
  entryDate      DateTime @map("entry_date") @db.Date
  mood           Mood
  note           String

  spotifyTrackId String   @map("spotify_track_id")
  trackName      String   @map("track_name")
  artistNames    String[] @map("artist_names")
  albumName      String   @map("album_name")
  albumImageUrl  String?  @map("album_image_url")
  spotifyUrl     String   @map("spotify_url")
  previewUrl     String?  @map("preview_url")

  createdAt      DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt      DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, entryDate], map: "journal_entries_user_date_unique")
  @@index([userId, entryDate], map: "journal_entries_user_date_idx")
  @@map("journal_entries")
}
```

### Recommended Prisma config

파일 위치: `apps/api/prisma.config.ts`

```ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
```

### Seed strategy

- day 1에는 `demo user` 1명만 넣는다.
- seed는 `prisma/seed.ts`에 둔다.
- seed는 **명시적으로만 실행**한다.
- seed script도 Prisma 7 방식대로 **driver adapter를 붙인 PrismaClient**를 사용한다.

### Date handling rule

- DB 컬럼은 `DATE`지만 Prisma 쪽 타입은 `DateTime`이다.
- 따라서 route param `YYYY-MM-DD`를 그대로 흘리지 말고 **전용 helper로 `Date` 객체로 변환**한다.
- serialize할 때는 항상 `YYYY-MM-DD`로 다시 잘라서 내려준다.
- 날짜 처리 helper를 `shared/date.ts` 같은 한 곳에 모은다.

---

## 6. API 계약

### 6.1 Health check

```http
GET /api/health
```

응답:

```json
{ "ok": true }
```

### 6.2 Spotify track search

```http
GET /api/music/search?q={query}
```

응답 예시:

```json
{
  "items": [
    {
      "spotifyTrackId": "4uLU6hMCjMI75M1A2tKUQC",
      "name": "Never Gonna Give You Up",
      "artists": ["Rick Astley"],
      "albumName": "Whenever You Need Somebody",
      "albumImageUrl": "https://...",
      "spotifyUrl": "https://open.spotify.com/track/...",
      "previewUrl": null
    }
  ]
}
```

규칙:

- 결과는 **최대 10개**만 반환한다.
- 프론트로 Spotify raw payload 전체를 넘기지 않는다.
- **normalize한 DTO만 반환**한다.

### 6.3 Get today's entry

```http
GET /api/entries/by-date/:date
```

예:

```http
GET /api/entries/by-date/2026-03-07
```

응답:

```json
{
  "item": {
    "id": "uuid",
    "entryDate": "2026-03-07",
    "mood": "calm",
    "note": "밤에 이 곡이 유난히 잘 맞았다.",
    "track": {
      "spotifyTrackId": "...",
      "name": "...",
      "artists": ["..."],
      "albumName": "...",
      "albumImageUrl": "...",
      "spotifyUrl": "...",
      "previewUrl": null
    }
  }
}
```

### 6.4 Upsert entry by date

```http
PUT /api/entries/by-date/:date
```

요청 바디:

```json
{
  "mood": "focused",
  "note": "오늘은 이 곡 덕분에 집중이 잘 됐다.",
  "track": {
    "spotifyTrackId": "...",
    "name": "...",
    "artists": ["Artist A", "Artist B"],
    "albumName": "Album",
    "albumImageUrl": "https://...",
    "spotifyUrl": "https://open.spotify.com/track/...",
    "previewUrl": null
  }
}
```

규칙:

- 같은 날짜 데이터가 있으면 수정
- 없으면 생성
- `note` 공백 저장 금지
- 곡 선택 없이 저장 금지
- `mood`는 미리 정한 값만 허용

### 6.5 Get history list

```http
GET /api/entries?month=2026-03
```

또는

```http
GET /api/entries?limit=30
```

응답:

```json
{
  "items": [
    {
      "id": "uuid",
      "entryDate": "2026-03-07",
      "mood": "happy",
      "notePreview": "오늘은 유난히 밝은 곡이 필요했다...",
      "track": {
        "spotifyTrackId": "...",
        "name": "...",
        "artists": ["..."],
        "albumImageUrl": "...",
        "spotifyUrl": "..."
      }
    }
  ]
}
```

---

## 7. 프론트엔드 구조

### Routing

- `/` → `HomePage`
- `/today` → `TodayEntryPage`
- `/history` → `HistoryPage`

### Suggested component structure

```txt
apps/web/src/
  app/
    router.tsx
    providers.tsx
  pages/
    HomePage.tsx
    TodayEntryPage.tsx
    HistoryPage.tsx
  components/
    layout/
      AppShell.tsx
      Header.tsx
      BottomNav.tsx
    entry/
      MoodSelector.tsx
      EntryForm.tsx
      EntryCard.tsx
      EntryList.tsx
      SelectedTrackCard.tsx
    music/
      TrackSearchInput.tsx
      TrackSearchResults.tsx
    common/
      Button.tsx
      EmptyState.tsx
      LoadingSpinner.tsx
      ErrorState.tsx
  features/
    entries/
      api.ts
      hooks.ts
      types.ts
    music/
      api.ts
      hooks.ts
      types.ts
  styles/
    globals.css
```

`apps/docs`는 day 1 MVP 핵심 구현 위치가 아니다. 문서성 페이지가 정말 필요하지 않다면 손대지 않아도 된다.

### Frontend rules

- 페이지는 얇게 유지하고, 비즈니스 로직은 `features/` 아래로 내린다.
- Spotify raw response type을 UI 전역으로 퍼뜨리지 않는다.
- API DTO와 UI 모델이 다르면 변환 함수를 둔다.
- state 라이브러리는 day 1에는 넣지 않는다. React state + simple hooks로 충분하다.
- 폼 라이브러리는 선택사항이다. 시간이 없으면 controlled input으로 간다.
- Prisma generated type을 프론트에 그대로 공유하지 않는다. **프론트는 API DTO만 본다.**

---

## 8. 백엔드 구조

### Suggested structure

```txt
apps/api/
  prisma/
    schema.prisma
    seed.ts
    migrations/
  prisma.config.ts
  src/
    app.ts
    composition/
      create-app-deps.ts
      register-routes.ts
    config/
      env.config.ts
      db.config.ts
    middlewares/
      errorHandler.ts
      logger.ts
      requestTimer.ts
      validate.ts
    generated/
      prisma/
        ... # generated, do not hand-edit
    modules/
      health/
        health.route.ts
      music/
        music.route.ts
        music.controller.ts
        music.service.ts
        music.gateway.ts
        spotify.gateway.ts
        music.dto.ts
      entries/
        entries.route.ts
        entries.controller.ts
        entries.service.ts
        entries.repository.ts
        prisma-entries.repository.ts
        entries.dto.ts
    shared/
      errors.ts
      http.ts
      validators.ts
      date.ts
      clock.ts
      logger.ts
```

현재 저장소에는 이미 `src/app.ts`, `src/config`, `src/middlewares`, `src/routes`가 있다.  
day 1에는 이 축을 유지한 채 `modules/`, `composition/`, `shared/`를 추가하면서 구조를 정리한다.

### Backend layer rules

- `route`는 HTTP path wiring만 한다.
- `controller`는 request/response mapping만 한다.
- `service`는 유스케이스와 검증만 한다.
- `repository`는 포트 인터페이스다.
- `prisma-entries.repository.ts`는 Prisma 구현체다.
- `music.gateway.ts`는 포트 인터페이스다.
- `music.service.ts`는 gateway 포트만 안다.
- `spotify.gateway.ts` 구현체만 Spotify API와 토큰 캐시를 안다.
- **PrismaClient import는 `config/db.config.ts` 또는 이후 분리한 `db/` 팩토리와 Prisma repository 구현체에서만 허용**한다.
- 생성된 Prisma 코드(`src/generated/prisma`)는 **절대 수동 수정하지 않는다.**

### DI boundary rules

아래 경계를 강제한다.

- `EntriesController` → `EntriesService` 에 의존
- `EntriesService` → `EntriesRepository`, `Clock`, `Logger` 에 의존
- `MusicController` → `MusicService` 에 의존
- `MusicService` → `MusicSearchGateway` 에 의존
- `PrismaEntriesRepository` → `PrismaClient` 에 의존
- `SpotifyGateway` → `fetch`, `env`, token cache에 의존

금지 규칙:

- controller에서 repository 직접 호출 금지
- service에서 Prisma query 직접 작성 금지
- service에서 Spotify fetch 직접 호출 금지
- route 파일에서 `new PrismaClient()` 금지
- app 전역에서 singleton import로 몰래 의존성 끌고오기 금지

### Port examples

```ts
export interface EntriesRepository {
  findByUserAndDate(userId: string, entryDate: Date): Promise<EntryRecord | null>;
  upsertByUserAndDate(input: UpsertEntryRecord): Promise<EntryRecord>;
  listRecentByUser(userId: string, limit: number): Promise<EntryRecord[]>;
  listByUserAndMonth(userId: string, yearMonth: string): Promise<EntryRecord[]>;
}

export interface MusicSearchGateway {
  searchTracks(query: string): Promise<TrackSummary[]>;
}

export interface Clock {
  now(): Date;
}
```

### Composition Root example

```ts
const { prisma, pool } = createPrismaClient(env.DATABASE_URL);

const entriesRepository = new PrismaEntriesRepository(prisma);
const musicGateway = new SpotifyGateway({
  clientId: env.SPOTIFY_CLIENT_ID,
  clientSecret: env.SPOTIFY_CLIENT_SECRET,
  fetch: globalThis.fetch,
});

const entriesService = new EntriesService({
  entriesRepository,
  clock: systemClock,
  logger: consoleLogger,
  demoUserId: env.DEMO_USER_ID,
});

const musicService = new MusicService({
  musicSearchGateway: musicGateway,
});

const entriesController = new EntriesController(entriesService);
const musicController = new MusicController(musicService);
```

### Prisma-specific repository rule

`PrismaEntriesRepository` 안에서만 아래 같은 작업을 한다.

- `findUnique`, `findFirst`, `findMany`
- `upsert`
- DTO ↔ Prisma model mapping
- composite unique key 사용

예시 방향:

```ts
await prisma.journalEntry.upsert({
  where: {
    userId_entryDate: {
      userId,
      entryDate,
    },
  },
  update: {
    mood,
    note,
    trackName,
    artistNames,
    albumName,
    albumImageUrl,
    spotifyUrl,
    previewUrl,
    spotifyTrackId,
  },
  create: {
    userId,
    entryDate,
    mood,
    note,
    trackName,
    artistNames,
    albumName,
    albumImageUrl,
    spotifyUrl,
    previewUrl,
    spotifyTrackId,
  },
});
```

### Shutdown rule

- 종료 시 `await prisma.$disconnect()`를 호출한다.
- `pg` pool도 같이 정리한다.
- 현재 저장소 기준 종료 훅은 우선 `src/app.ts`에 둔다.
- 추후 `src/index.ts`로 부트스트랩을 분리하면 종료 훅도 그 파일로 함께 이동한다.

### Error response shape

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "track is required"
  }
}
```

---

## 9. Spotify 연동 전략

### Day 1 decision

**사용자 로그인 없이, 서버에서 Client Credentials로 검색만 한다.**

이 결정은 다음 이유로 고정한다.

- 하루 MVP에서 Spotify OAuth까지 넣으면 범위가 급격히 커진다.
- 이 앱의 MVP 핵심은 `곡 선택 + 일기 저장`이지 `개인 Spotify 데이터 동기화`가 아니다.
- 검색만으로도 제품 가치를 검증할 수 있다.

### Implementation notes

- `SPOTIFY_CLIENT_ID`와 `SPOTIFY_CLIENT_SECRET`는 서버 `.env`에만 둔다.
- 프론트는 절대 secret을 알면 안 된다.
- 프론트는 `/api/music/search`만 호출한다.
- 서버는 Spotify token endpoint로 access token을 받고 캐시한다.
- 서버는 Spotify search endpoint 결과를 필요한 필드만 추려서 반환한다.

### Later upgrade path

day 2 이후에는 아래 순서로 확장한다.

1. Spotify Authorization Code + PKCE 도입
2. 앱 사용자 계정 도입
3. 사용자별 Spotify 연결 상태 저장
4. 최근 재생곡 / 저장곡 연동

---

## 10. 권장 환경변수

### apps/api/.env

```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/music_journal
FRONT_URL=http://localhost:5173
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
DEMO_USER_ID=00000000-0000-0000-0000-000000000001
```

주의:

- 현재 `apps/api/src/config/env.config.ts`는 `FRONT_URL` 이름을 읽는다. day 1에는 `CLIENT_ORIGIN`보다 이 이름을 우선 사용한다.
- 현재 parser는 `NODE_ENV` 값을 읽어 `development | production | test`로 해석한다.

### apps/web/.env

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

주의:

- `VITE_*` 변수에는 비밀값을 넣지 않는다.
- Spotify secret은 반드시 서버에만 둔다.
- `DATABASE_URL`은 Prisma CLI와 서버 런타임 둘 다 읽는다.
- `dotenv/config`를 Prisma config와 서버 엔트리에서 둘 다 명시해도 괜찮다.

---

## 11. 권장 명령어와 부트스트랩 순서

### Option A — keep current monorepo (권장)

```bash
pnpm install

# web MVP dependencies
pnpm --filter web add react-router-dom zod

# api Prisma / runtime dependencies
pnpm --filter api add dotenv zod cors express pg @prisma/client @prisma/adapter-pg
pnpm --filter api add -D prisma tsx typescript @types/node @types/express @types/pg

# prisma init is already present in this repo; keep using apps/api/prisma and apps/api/src/generated/prisma
```

### apps/api package.json baseline

```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/app.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/app.js",
    "lint": "eslint .",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:seed": "prisma db seed",
    "prisma:studio": "prisma studio"
  }
}
```

### apps/api tsconfig baseline

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

### Prisma setup steps after init

```bash
cd apps/api
pnpm prisma migrate dev --name init
pnpm prisma generate
pnpm prisma db seed
```

### .gitignore baseline

```gitignore
# Prisma generated client and query engine
apps/api/src/generated/prisma
```

### Root-level convenience scripts (optional)

현재 루트는 이미 `package.json`을 가지고 있으니 아래 식으로 정리하면 된다.

```json
{
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "check-types": "turbo run check-types",
    "dev:web": "pnpm --filter web dev",
    "dev:api": "pnpm --filter api dev",
    "dev:docs": "pnpm --filter docs dev"
  }
}
```

### If using Elysia instead of Express

```bash
cd apps/api
pnpm add elysia @elysiajs/node cors dotenv zod pg @prisma/client @prisma/adapter-pg
pnpm add -D typescript tsx prisma @types/node @types/pg
pnpm prisma init --datasource-provider postgresql --output ../src/generated/prisma
```

단, API path와 응답 형태는 동일하게 유지한다.

---

## 12. 1일 개발 플랜

아래 순서는 **Codex가 그대로 실행하기 쉬운 우선순위**다.

### Phase 1 — 0:00 ~ 0:50

목표: 프로젝트 틀 만들기

해야 할 일:

- 현재 모노레포 기준 역할을 고정한다: `apps/web` 제품 UI, `apps/api` 제품 API
- `apps/web`의 Vite 기본 예제를 제거하고 앱 셸 진입점을 만든다.
- `apps/api`의 Express 기본 골격을 유지한 채 `/api/health`를 추가한다.
- `apps/api/package.json`에 `lint`, `prisma:*` 스크립트를 정리한다.
- `apps/api/.env.example`과 `apps/web/.env.example`을 작성한다.
- `apps/docs`는 day 1 범위 밖이라고 명시하고 방치하거나 최소한으로만 유지한다.
- 기본 실행 확인
- `/api/health` 연결 확인

완료 기준:

- `apps/web` dev server 실행됨
- `apps/api` dev server 실행됨
- 브라우저에서 `/api/health` 응답 확인됨
- `apps/api/prisma/schema.prisma`와 `apps/api/prisma.config.ts`가 준비됨

### Phase 2 — 0:50 ~ 1:50

목표: Prisma 7 연결과 스키마 확정

해야 할 일:

- `apps/api/prisma/schema.prisma` 작성
- `apps/api/prisma.config.ts` 점검
- `createPrismaClient()` 또는 현재 `db.config.ts` 기반 팩토리 작성
- `users`, `journal_entries` 모델 확정
- `cd apps/api && pnpm prisma migrate dev --name init`
- `cd apps/api && pnpm prisma generate`
- `apps/api/prisma/seed.ts` 작성
- `cd apps/api && pnpm prisma db seed`
- demo user seed

완료 기준:

- 로컬 DB에 테이블 생성됨
- generated client가 `apps/api/src/generated/prisma`에 생김
- demo user 1개 존재
- unique(userId, entryDate) 제약 확인

### Phase 3 — 1:50 ~ 2:40

목표: DI 골격과 Spotify 검색 프록시 완성

해야 할 일:

- `EntriesRepository`, `MusicSearchGateway`, `Clock` 포트 작성
- Composition Root 작성
- Spotify token 발급 로직 구현
- 메모리 캐시 추가
- `/api/music/search?q=` 구현
- 응답 normalize
- 빈 쿼리 / 4xx 처리

완료 기준:

- service가 포트 인터페이스만 참조함
- 곡 검색 시 최대 10개 결과 반환
- 프론트 없이 curl로 테스트 가능

### Phase 4 — 2:40 ~ 3:50

목표: 일기 CRUD 핵심 완성

해야 할 일:

- `GET /api/entries/by-date/:date`
- `PUT /api/entries/by-date/:date`
- `GET /api/entries?month=` 또는 `?limit=`
- zod validation 구현
- date helper 구현
- `PrismaEntriesRepository` 구현
- upsert 로직 구현

완료 기준:

- 오늘 엔트리 생성 가능
- 같은 날짜에 다시 저장하면 수정됨
- 목록 조회 가능
- controller/service에서 Prisma import 없음

### Phase 5 — 3:50 ~ 5:20

목표: 3개 화면 퍼블리싱 및 연결

해야 할 일:

- React Router 설정
- `HomePage`
- `TodayEntryPage`
- `HistoryPage`
- 공통 레이아웃 / 네비게이션
- API 연결

완료 기준:

- 세 화면 이동 가능
- 오늘 기록 작성 가능
- 기록 목록 확인 가능

### Phase 6 — 5:20 ~ 6:20

목표: 폴리시와 사용성 정리

해야 할 일:

- 로딩 / 에러 / empty state 추가
- 폼 validation 메시지 추가
- 모바일 간격 정리
- 버튼 상태 disabled 처리
- text overflow 정리
- 저장 직후 optimistic UI를 넣을지 판단

완료 기준:

- 빈 화면이 어색하지 않다
- 저장 흐름이 헷갈리지 않는다
- 모바일에서도 usable 하다

### Phase 7 — 6:20 ~ 7:15

목표: 빌드 검증과 구조 점검

해야 할 일:

- `pnpm --filter web build`
- `pnpm --filter api build`
- 루트 `pnpm build`, `pnpm lint`, `pnpm check-types` 기준도 점검
- `cd apps/api && pnpm prisma generate` 재확인
- 수동 QA
- `.env.example` 최종 점검
- fake repository / fake gateway로 교체 가능한 구조인지 확인

완료 기준:

- 빌드 통과
- 치명적 콘솔 에러 없음
- Prisma schema 변경 후 generate 경로가 꼬이지 않음
- 저장소 구조만 봐도 레이어가 이해됨

### Phase 8 — 7:15 ~ 8:00

목표: 마감 정리

해야 할 일:

- seed 데이터 정리
- 홈 문구 다듬기
- 스크린샷용 dummy data 입력
- 필요하면 간단 README 추가
- Prisma Studio로 데이터 최종 점검

완료 기준:

- 배포 가능한 MVP 상태
- 누가 봐도 무슨 앱인지 이해됨

---

## 13. 일정이 밀릴 때 자르는 순서

뒤처지면 아래 순서대로 잘라낸다.

1. 월 필터 제거 → 최근 30개 목록만 유지
2. 홈 최근 기록 카드 수 줄이기
3. History 상세 펼침 UI 단순화
4. cover image skeleton 제거
5. note 글자 수 카운터 제거
6. edit/create 구분 문구 최소화
7. seed script의 꾸밈용 데이터 줄이기

끝까지 **절대 자르면 안 되는 것**:

- Spotify 검색
- 날짜별 1일 1엔트리 저장
- 3개 화면
- Postgres 저장
- history 조회
- DI 경계 유지

---

## 14. 정의된 완료 조건 (Definition of Done)

아래가 모두 만족되면 day 1 완료다.

- 홈 / 오늘 / 히스토리 총 3개 화면이 보인다.
- Spotify에서 곡을 검색할 수 있다.
- 곡 1개를 선택할 수 있다.
- 메모를 저장할 수 있다.
- 같은 날짜 기록을 다시 열면 수정 가능하다.
- Postgres에 저장된다.
- 히스토리에서 지난 기록을 볼 수 있다.
- 프론트 비밀키 노출이 없다.
- Prisma migration 파일이 존재한다.
- Prisma generated client import 경로가 고정되어 있다.
- service가 port interface에만 의존한다.
- fake repo / fake gateway로 service 테스트가 가능하다.
- build가 통과한다.

---

## 15. 수동 QA 체크리스트

### Happy path

- `/today` 진입
- mood 선택
- 곡 검색 후 1개 선택
- 메모 입력
- 저장
- `/history`에서 확인
- `/today` 재진입 후 수정 저장

### Edge cases

- 빈 검색어 입력
- 검색 결과 없음
- mood 미선택 상태 저장
- note 공백 저장 시도
- track 미선택 상태 저장 시도
- 같은 날짜 재저장
- DB 연결 실패 시 메시지
- Spotify API 실패 시 메시지
- 잘못된 날짜 문자열 입력
- Prisma migration 후 generated client 경로 누락

---

## 16. 구현 디테일 가이드

### Backend normalization shape

Spotify 응답은 바로 쓰지 말고 아래 형태로 normalize한다.

```ts
export type TrackSummary = {
  spotifyTrackId: string;
  name: string;
  artists: string[];
  albumName: string;
  albumImageUrl: string | null;
  spotifyUrl: string;
  previewUrl: string | null;
};
```

### Entry DTO

```ts
export type EntryPayload = {
  mood: 'happy' | 'calm' | 'focused' | 'melancholy' | 'chaotic';
  note: string;
  track: TrackSummary;
};
```

### Prisma client factory example

```ts
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

export function createPrismaClient(connectionString: string) {
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  return { prisma, pool };
}
```

### Repository implementation rule of thumb

- repository는 Prisma model을 직접 반환하지 않는다.
- service가 쓰는 도메인 레코드 형태로 한 번 변환한다.
- `include` / `select`는 필요한 필드만 쓴다.
- `upsert`와 `findMany` 정도로도 day 1은 충분하다.
- query 최적화에 집착하지 말고, 타입과 흐름을 먼저 맞춘다.

### Date helper example

```ts
export function parseDateOnly(input: string): Date {
  return new Date(`${input}T00:00:00.000Z`);
}

export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}
```

### UI data rules

- note preview는 90자 안팎으로 자른다.
- artist는 `artists.join(', ')`로 표시한다.
- album image가 없으면 fallback placeholder 사용
- external spotify link는 새 탭으로 연다.

---

## 17. 보안과 설정 규칙

- Spotify secret은 프론트에 절대 노출하지 않는다.
- 서버 CORS origin은 로컬 개발 주소로 제한한다.
- DB URL은 서버 `.env`에서만 읽는다.
- 프론트 `.env`에는 public base URL만 둔다.
- 로그에 access token 전체를 찍지 않는다.
- generated Prisma client를 프론트 번들에 끌고 가지 않는다.
- Prisma schema 변경 후 generate 없이 커밋하지 않는다.

---

## 18. Codex working agreements

Codex는 아래 규칙을 지켜 작업한다.

1. **먼저 수직 슬라이스를 완성**한다. (`health -> prisma -> spotify search -> entry save -> screens`)
2. scope 밖 기능을 넣지 않는다.
3. 타입을 우회하지 않는다. (`any` 남발 금지)
4. raw Spotify payload를 컴포넌트 전역에 퍼뜨리지 않는다.
5. 비밀값을 프론트 번들에 넣지 않는다.
6. 라우트 계약을 먼저 고정하고 UI를 맞춘다.
7. build/typecheck를 깨는 상태로 마무리하지 않는다.
8. 같은 기능을 두 군데에서 중복 구현하지 않는다.
9. 설명보다 작동하는 MVP를 먼저 만든다.
10. 시간이 부족하면 폴리시를 버리고 핵심 흐름을 지킨다.
11. Prisma schema를 바꾸면 migration과 generate 상태를 같이 점검한다.
12. generated Prisma 파일은 고치지 않고, schema를 고친 뒤 regenerate한다.
13. PrismaClient는 Composition Root와 repository 구현체 바깥으로 퍼뜨리지 않는다.

---

## 19. Day 2 이후 확장 백로그

우선순위 순서:

1. Spotify Authorization Code + PKCE
2. 실제 사용자 인증
3. 다중 사용자 지원
4. 월별 캘린더 히트맵
5. mood 통계
6. 즐겨찾는 아티스트 집계
7. 사진/짧은 태그 추가
8. Apple Music / YouTube Music provider abstraction
9. export/import
10. 모바일 앱 포장

---

## 20. 최종 권장 결론

### Recommend this stack for the one-day build

- `Vite React + TypeScript`
- `Express + TypeScript`
- `Postgres`
- `Prisma ORM 7`
- `Spotify Client Credentials search only`

### Use Elysia only when

- 이미 Bun 기반으로 작업 중이거나
- Elysia 문법과 런타임에 익숙하고
- Node adapter 설정 비용이 부담되지 않을 때

### Product rule of thumb

이 프로젝트의 핵심은 **음악 검색 앱**이 아니라 **음악이 붙은 하루 기록 앱**이다.

곡 데이터를 더 많이 다루는 것보다,
**오늘 기록 작성 -> 저장 -> 다시 보기** 흐름을 먼저 끝내는 것이 맞다.

---

## 21. 참고 문서

- [OpenAI Codex - AGENTS.md guide](https://developers.openai.com/codex/guides/agents-md/)
- [OpenAI Codex overview](https://developers.openai.com/codex/)
- [Spotify Web API overview](https://developer.spotify.com/documentation/web-api)
- [Spotify Client Credentials Flow](https://developer.spotify.com/documentation/web-api/tutorials/client-credentials-flow)
- [Spotify Authorization Code Flow](https://developer.spotify.com/documentation/web-api/tutorials/code-flow)
- [Spotify Search API reference](https://developer.spotify.com/documentation/web-api/reference/search)
- [Prisma ORM docs](https://www.prisma.io/docs)
- [Prisma ORM 7 upgrade guide](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7)
- [Prisma PostgreSQL quickstart](https://www.prisma.io/docs/prisma-orm/quickstart/postgresql)
- [Prisma generators reference](https://www.prisma.io/docs/orm/prisma-schema/overview/generators)
- [Prisma config reference](https://www.prisma.io/docs/orm/reference/prisma-config-reference)
- [Prisma seeding guide](https://www.prisma.io/docs/orm/prisma-migrate/workflows/seeding)
- [Elysia Node adapter](https://elysiajs.com/integrations/node)
- [Express official site](https://expressjs.com/)
- [Vite guide](https://vite.dev/guide/)
- [Vite env variables and security notes](https://vite.dev/guide/env-and-mode)
