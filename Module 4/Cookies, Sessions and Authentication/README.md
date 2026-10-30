# Session-Based Authentication

## Requirements and setup

Use Node.js 18 or newer. From this project directory:

```bash
cp .env.example .env
npm install
npm run setup
npm run dev
```

On Windows PowerShell, copy `.env.example` with `Copy-Item .env.example .env`.

Configure `.env`:

- `DATABASE_URL`: SQLite database path.
- `COOKIE_SECRET`: long random signing secret.
- `COOKIE_SECURE=false` for local HTTP; use `true` only behind HTTPS.
- `SESSION_TTL_MS`: one-hour lifetime by default (`3600000`).
- `BCRYPT_COST`: bcrypt work factor, defaulting to 12.

Run `npm run setup` to generate Prisma Client, synchronize the database, and seed the demo account:

```text
sam@example.com / SessionDemo!48
```

Never commit `.env` or a real signing secret.

## API

| Endpoint | Success | Authentication errors |
|---|---|---|
| `POST /auth/register` | `201` with safe user fields | `400` invalid input, `409` duplicate email |
| `POST /auth/login` | `200` and signed `sid` cookie | `400` invalid input, `401 INVALID_CREDENTIALS` |
| `GET /auth/me` | `200` with safe user fields | `401 AUTH_REQUIRED` |
| `POST /auth/logout` | `204` and cleared `sid` cookie | Always idempotent |

### Login example

```bash
curl -i -c cookies.txt -H "Content-Type: application/json" \
  -d '{"email":"sam@example.com","password":"SessionDemo!48"}' \
  http://localhost:3000/auth/login
```

The opaque session ID is stored only in the signed, HTTP-only `sid` cookie. The server-side session map stores the user ID and expiration time, never credentials.

### Protected request

```bash
curl -i -b cookies.txt http://localhost:3000/auth/me
```

### Logout and replay protection

```bash
curl -i -b cookies.txt -c cookies.txt -X POST http://localhost:3000/auth/logout
curl -i -b cookies.txt http://localhost:3000/auth/me
```

After logout, the second request must return `401 AUTH_REQUIRED`, even if an old copied cookie is replayed, because the server session record is deleted.

## Cookie and session behavior

`sid` is configured centrally with:

- `httpOnly: true`
- `SameSite=Lax`
- `secure: true` only when `COOKIE_SECURE=true`
- signed cookie value
- `path=/`
- browser lifetime matching `SESSION_TTL_MS`

The in-memory Map is suitable for learning and local testing only. It loses all sessions when the server restarts and does not work across multiple server instances. Production should use a shared expiring store such as Redis, with equivalent create, resolve, expiration, and destroy operations.

## Tests

```bash
npm test
```

The test runner creates a temporary SQLite database, runs the authentication lifecycle checks, and removes the database afterward.
