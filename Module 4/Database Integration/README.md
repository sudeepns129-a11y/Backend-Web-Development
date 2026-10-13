# Database Integration Assignment

This assignment replaces the in-memory post repository with Prisma backed by PostgreSQL while keeping the HTTP contract stable.

## Run locally

```bash
npm install
cp .env.example .env
npm run prisma:format
npm run prisma:validate
npm run prisma:migrate
npm run prisma:generate
npm start
```

## Environment setup

Set `DATABASE_URL` in `.env` to a local PostgreSQL database, for example:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/community_dev?schema=public"
PORT=3000
```

Never commit `.env` or real credentials. `.env.example` contains placeholders only.

## Architecture

- Controllers call services.
- Services contain business validation.
- Repositories own Prisma database access.
- The shared client lives in `src/db/prisma.js`.

## Notes

The API still exposes the same `GET /posts`, `GET /posts/:id`, `POST /posts`, `PATCH /posts/:id`, and `DELETE /posts/:id` endpoints. The `Post` model uses a required `authorId` relation to a `User`, and the repository layer handles not-found, duplicate, invalid foreign key, and unexpected database errors without leaking Prisma internals.
