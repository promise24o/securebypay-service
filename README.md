# SecureByPay Service

Node/Express backend for the SecureByPay technical assessment — Sign Up and Login APIs, backed by SQLite.

## Run locally

```bash
npm install
npm run dev
```

Server starts on `http://localhost:4000`.

## Endpoints

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me` (requires `Authorization: Bearer <token>`)
