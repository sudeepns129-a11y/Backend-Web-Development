# LU48 Starter — Session Authentication

## Setup

```bash
cp .env.example .env
npm install
npm run setup
npm run dev
```

Set `COOKIE_SECRET` in `.env` to at least 32 random characters. Keep `COOKIE_SECURE=false` for local HTTP; production must use HTTPS with `COOKIE_SECURE=true`.

Seeded demo account: `sam@example.com` / `SessionDemo!48`.

## Authentication API

- `POST /auth/register` creates a user with a normalized lowercase email and an asynchronously generated bcrypt password hash.
- `POST /auth/login` validates credentials and returns public user fields only. Unknown emails and incorrect passwords return the same `401 INVALID_CREDENTIALS` response.
- Set `BCRYPT_COST` in `.env` to control the bcrypt work factor (default: 12).

## Implement

Complete the TODOs in:

- `src/routes/authRoutes.js`
- `src/session/sessionStore.js`
- `src/middleware/requireSession.js`

Required endpoints: `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`.

Use Postman cookie jar or curl `-c cookies.txt` and `-b cookies.txt` to preserve the cookie between requests.
