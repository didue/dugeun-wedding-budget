# 디두와 그니의 결혼 가계부💸

구글 시트 「결혼예산·지출기록」을 데이터베이스로 쓰는 PWA입니다. 휴대폰 홈 화면에 설치해서 앱처럼 씁니다.

```
[web: React PWA] ──POST(text/plain JSON)──▶ [gas: Apps Script 웹앱] ──▶ [구글 시트]
```

- `gas/`: Apps Script API (PIN 인증, 지출/체크리스트 CRUD, 데이터 규칙, 설정)
- `web/`: React + Vite + TypeScript + Tailwind, TanStack Query, vite-plugin-pwa

