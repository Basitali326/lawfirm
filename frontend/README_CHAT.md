# Messages UI (App Router)

Run:
```bash
cd frontend
npm install
npm run dev
```

Required env (.env.local):
```
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
NEXT_PUBLIC_AUTH_MODE=token
NEXT_PUBLIC_USE_NEXTAUTH=false
```

Page: `/messages`

Hooks:
- `useRoomsQuery(search)`
- `useMessagesQuery(roomId)`
- `useChatSocket({ token, onMessage, ... })`

UI: WhatsApp-like split view with sidebar + conversation and composer. Real-time updates via WebSocket; falls back to REST send if socket unavailable.
