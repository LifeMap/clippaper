**[English](README.md)** | **[한국어](README.ko.md)**

# ClippaperAI

**AI 에이전트 오케스트레이션 플랫폼** — 한국어 지원과 Slack 연동을 추가한 [Paperclip](https://github.com/paperclipai/paperclip) 포크.

ClippaperAI는 셀프 호스팅 Node.js 서버와 React UI로 AI 에이전트 팀을 관리합니다. 목표를 할당하고, 작업을 추적하고, 비용을 관리하고, 에이전트와 상호작용하세요 — 대시보드와 Slack에서 모두 가능합니다.

---

## 주요 기능

### 코어 기능 (Paperclip 기반)

- **에이전트 자유 선택** — 어떤 에이전트든, 어떤 런타임이든, 하나의 조직도
- **목표 정렬** — 모든 작업이 회사 미션으로 연결
- **하트비트** — 에이전트가 스케줄에 따라 깨어나 작업 수행
- **비용 관리** — 에이전트별 월별 예산, 자동 제한
- **거버넌스** — 채용 승인, 전략 수정, 에이전트 일시정지
- **조직도** — 계층 구조, 역할, 보고 라인
- **티켓 시스템** — 모든 대화 추적, 모든 결정 설명
- **모바일 지원** — 어디서든 관리 가능

### ClippaperAI 추가 기능

- **Slack 연동** — Socket Mode 기반 양방향 Slack 봇
  - `/clip agents` — 에이전트 목록 확인
  - `/clip ask` — 모달을 통한 이슈 생성
  - DM 지원 — 봇에게 직접 메시지 전송
  - 이슈 알림 — 생성, 완료, 실패 알림
  - 스레드 답글 — Slack 스레드에서 이슈에 코멘트 추가
  - 다시 열기 버튼 — Slack에서 완료된 이슈 재오픈
  - 승인/참여 요청 처리
- **한국어 지원** — UI 및 Slack 봇 전체 한국어 지원
- **DB 기반 Slack 설정** — UI에서 Slack 설정 관리, .env 파일 불필요
- **인앱 설정 가이드** — 설정 페이지에서 단계별 Slack 구성 가이드 제공

---

## 빠른 시작

### 사전 요구사항

- Node.js 20+
- pnpm 9.15+

### 설치

```bash
git clone https://github.com/LifeMap/clippaper.git
cd clippaper
pnpm install
```

### 실행 (개발 모드)

```bash
NODE_OPTIONS="--experimental-require-module" pnpm --filter @paperclipai/server dev
```

서버가 `http://localhost:3100`에서 시작되며, 내장 PostgreSQL 데이터베이스가 자동으로 생성됩니다.

### 실행 (운영 — Cloudflare Tunnel)

```bash
#!/bin/bash
export PATH="/path/to/node/bin:$PATH"
export NODE_OPTIONS="--experimental-require-module"

cd /path/to/clippaper
nohup pnpm --filter @paperclipai/server dev > ~/.paperclip/instances/default/server.log 2>&1 &

sleep 10
cloudflared tunnel run your-tunnel-name
```

---

## 인증

ClippaperAI는 두 가지 배포 모드를 지원합니다:

| 모드 | 설명 |
|------|------|
| `local_trusted` | 로그인 불필요. 로컬 개발용 기본값. |
| `authenticated` | better-auth 기반 이메일/비밀번호 로그인. 외부 접속용. |

인증을 활성화하려면 `~/.paperclip/instances/default/.env`에 추가:

```env
PAPERCLIP_DEPLOYMENT_MODE=authenticated
BETTER_AUTH_SECRET=임의의_랜덤_문자열
# 외부 접속용:
PAPERCLIP_DEPLOYMENT_EXPOSURE=public
PAPERCLIP_AUTH_BASE_URL_MODE=explicit
PAPERCLIP_AUTH_PUBLIC_BASE_URL=https://your-domain.com
```

첫 실행 시 서버 로그에 **board-claim URL**이 표시됩니다. 회원가입 후 해당 URL에 접속하면 관리자 권한을 획득할 수 있습니다.

---

## Slack 봇 설정

상세 가이드: [docs/guides/slack-setup.md](docs/guides/slack-setup.md)

또는 앱 내 설정 가이드: **설정 > Slack**

### 요약

1. [api.slack.com/apps](https://api.slack.com/apps)에서 Slack App 생성
2. Socket Mode 활성화, App Token(`xapp-`) 발급
3. Bot Token Scopes 추가: `chat:write`, `commands`, `im:history`, `im:read`, `im:write`, `channels:history`, `reactions:write`
4. `/clip` 슬래시 커맨드 생성
5. 이벤트 구독: `message.im`, `message.channels`
6. App Home Messages Tab 활성화
7. 앱 설치, Bot Token(`xoxb-`) 복사
8. ClippaperAI UI에서 설정: **설정 > Slack**

---

## 개발

```bash
pnpm dev              # 전체 개발 모드 (API + UI, watch)
pnpm dev:once         # watch 없이 개발 모드
pnpm dev:server       # 서버만 실행
pnpm build            # 전체 빌드
pnpm typecheck        # 타입 체크
pnpm test:run         # 테스트 실행
pnpm db:generate      # DB 마이그레이션 생성
pnpm db:migrate       # 마이그레이션 적용
```

---

## 프로젝트 구조

```
clippaper/
  packages/
    shared/           # 공유 타입, 검증, 상수
    db/               # DB 스키마, 마이그레이션 (Drizzle ORM)
  server/             # Express API 서버
    src/
      slack-bot/      # Slack 봇 (Socket Mode)
      services/       # 비즈니스 로직
      routes/         # API 라우트
  ui/                 # React 프론트엔드 (Vite)
    src/
      i18n/locales/   # en.json, ko.json
      pages/          # 페이지 컴포넌트
  docs/
    guides/           # 설정 가이드
```

---

## 기반 프로젝트

[Paperclip](https://github.com/paperclipai/paperclip) — AI 에이전트 회사를 위한 오픈소스 오케스트레이션. MIT 라이선스.

---

## 라이선스

MIT
