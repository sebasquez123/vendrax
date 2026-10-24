# MetBot MCP Toolkit

MetBot is MetGroup's MCP-enabled backend for connecting corporate knowledge work, LLM chat flows, and operational tools through a single NestJS application.

This project is built around the Model Context Protocol so MetGroup can expose internal and external services to agents in a controlled, reponsable and reusable way. The current implementation combines a Socket.IO streaming chat agent and MCP tool execution against a Google Workspace server as preliminar test sample.

The main idea is simple:

```text
user input -> chat/API layer -> agent orchestration -> MCP tool registry -> external tool server -> streamed result
```

![Proyect preview](src/assets/images/cover.png)

## Current Endpoints

Swagger UI: http://localhost:8080/client-api/swagger (use **Authorize** to send your `x-api-key`)

Every REST route requires the client's API key in the `x-api-key` header (see "API keys"), except `/auth/oauth/callback`, `/admin/health` and `/admin/health/database`. `/chat/assets` requires it as well as its signed `token`. Without it, or with a key that is not valid, the answer is `401` (`NO_API_KEY_ERROR` / `INVALID_API_KEY_ERROR`). The WebSocket chat does not use it.

| Method | Route | Area | What it does | Example |
|---|---|---|---|---|
| GET | `/chat/mcp/iframe` | Chat | Serves the embeddable Socket.IO chat page (it connects to `/chat/test`) | Open `/chat/mcp/iframe?appClientId=…&userId=…&scopes=…&subdomains=…&modes=…&jwt=…` in the browser |
| WS | `/chat/main` or `/chat/test` + event `mcp/Agent/ask` | Chat | Streams context, thinking, tool calls, chunks, and totals; `mcp/Agent/stop` stops the reply in progress | Connect a Socket.IO client and emit `mcp/Agent/ask` (payload and events in `docs/SUPERSET/FRONTEND_CONTRACT.md`) |
| GET | `/admin/health` | Admin | Health check: `{ status: 'ok', version, uptimeSeconds, timestamp }`; no API key needed | `curl http://localhost:8080/admin/health` |
| GET | `/admin/health/database` | Admin | Database health check: a `SELECT 1` that must answer within 3 s; `{ status: 'ok', latencyMs, timestamp }`, or `503` `DATABASE_UNAVAILABLE_ERROR`; no API key needed | `curl http://localhost:8080/admin/health/database` |
| GET | `/admin/guides/:reference` | Admin | The short guide shown before a chat (how to ask, what to keep in mind) for `superset` or `pay`, from `src/modules/admin/domain/templatessss/guides.ts`, in the language of `Accept-Language` (`es` or `en`, regional variants included; Spanish otherwise), with its texts in `src/shared/services/i18n/locales/<lang>/`; 404 for any other reference | `curl http://localhost:8080/admin/guides/superset -H "x-api-key: <key>" -H "Accept-Language: en"` |
| POST | `/admin/feedback` | Admin | Records a user's report about METBOT in `AUDITORY.AGENT_FEEDBACK`: `type` (what happened), `comment` and `conversation` (JSON), both optional. The client and the user must exist, or it answers 404; the user's name and id, the client and the date are added | `curl -X POST http://localhost:8080/admin/feedback -H "x-api-key: <key>" -H "Content-Type: application/json" -d "{\"appClientId\":\"<client uuid>\",\"userId\":123,\"type\":\"respuesta incorrecta\",\"comment\":\"…\",\"conversation\":[{\"usertype\":\"user\",\"message\":\"…\"}]}"` |
| GET | `/auth/oauth/callback` | Auth | OAuth callback: stores the user's grant for a server and renders a confirmation page | Called by the OAuth provider with `code` and `state` |
| POST | `/mcp/tools/call` | MCP Client | Calls one MCP tool directly on a selected server | `curl -X POST http://localhost:8080/mcp/tools/call -H "x-api-key: <key>" -H "Content-Type: application/json" -d "{\"serverName\":\"google_workspace_mcp\",\"url\":\"http://localhost:8000/mcp\",\"toolName\":\"search_gmail_messages\",\"toolArgs\":{\"query\":\"from:me\",\"user_google_email\":\"user@domain.com\"}}"` |
| GET | `/mcp/tools/get` | MCP Client | Lists available tools from a selected MCP server | `curl -X GET http://localhost:8080/mcp/tools/get -H "x-api-key: <key>" -H "Content-Type: application/json" -d "{\"serverName\":\"google_workspace_mcp\",\"url\":\"http://localhost:8000/mcp\",\"split\":10}"` |

## Getting Started

### Prerequisites

- Node.js 18 or newer
- npm
- A Gemini or OpenAI API key for the agent (`GEMINI_*` / `OPENAI_*` variables)
- The Google Workspace MCP server repository: https://github.com/taylorwilsdon/google_workspace_mcp
- MetGroup corporate Google Workspace MCP credentials, requested from the developer at `desarrollador.its19@metgroupsas.com`

### Environment Setup

0. Copy the example environment file.

```bash
cp .env.example .env
```

Optional variables, not in `.env.example` (the server starts without them):

- `RAG_API_URL`, `RAG_API_TOKEN`: the knowledge-base search; without both, the agent gets no search tool (nor its knowledge index).
- `ASSETS_SIGNING_SECRET`: a long random value that signs the links to reference images (`make_image`, served by
  `GET /chat/assets`). Without it no image is sent and the agent is told so.

### Local Run

1. Install dependencies.

```bash
npm install --legacy-peer-deps
```

2. Start the Google Workspace MCP server separately and make sure it is available at the URL configured in the project data.

- The server inventory (one URL per `serverName`) lives in the database.
- Its initial values come from the seed: `src/migrations/seeds/initial_seed.ts` (see "Usefull commands").
- Permissions live in tables too (migration `1761000000000-PermissionTables`). Each server's tools, subdomains and modes are in `METBOT`, and who may use them is in `ADMINISTRATIVE` (`CLIENT_*_PERMISSION`, `USER_TOOL_PERMISSION`). Seed 2 (`src/migrations/seeds/02_permissions_seed.ts`) fills them.
  - A new user gets, for each server its first connection asked for (`scopes`), access to it (`USER_SERVER_PERMISSION`, active) and the tools its client is permitted there (`USER_TOOL_PERMISSION`).
  - Rest of tools are granted by hand in `ADMINISTRATIVE.USER_TOOL_PERMISSION`.
  - A user reaches a server only with an active row in `ADMINISTRATIVE.USER_SERVER_PERMISSION`: without it, or with `active = false`, a connection asking for that server is refused. Its tools never grant access by themselves.

3. Start the MetBot backend.

```bash
npm run dev
```

4. Open the user interfaces for API quick reference.

- Swagger: http://localhost:8080/client-api/swagger
- Socket chat page: http://localhost:8080/chat/mcp/iframe (with the query parameters listed in "Current Endpoints")

### Run with Docker

Runs the backend and its own PostgreSQL in containers. You only need Docker and your `.env` (see "Environment Setup").

1. Start both containers. The first time it builds the image, which takes a few minutes.

   ```bash
   docker compose up -d --build
   ```

2. The first time only, create the tables and then load the initial data. Each command is a one-off job: it starts its own container, runs, and is removed when it ends. They are the same steps a deploy pipeline runs before starting the new version.

   ```bash
   docker compose run --rm migrations
   docker compose run --rm seeds 01_initial_seed
   docker compose run --rm seeds 02_permissions_seed
   ```

   - `migrations` runs the pending migrations (`dist/data-source.js`); with none pending it does nothing.
   - `seeds <seed>` runs only the seed you name, by its file name in `src/migrations/seeds` (with or without `.js`). Without a name, or with one that does not exist, it lists the available seeds. The first time, run them in order.
   - Both end with code 1 when they fail, so a pipeline stops there. `docker compose up` never starts them (they are in the `jobs` profile).

3. Open <http://localhost:8080/client-api/swagger>.

Good to know:

- **Your `.env` is not copied into the image.** The container reads it when it starts. After changing it, run `docker compose up -d` again.
- **The database:** locally, the backend uses the PostgreSQL container, not the `DATABASE_URL` of your `.env`. Its data stays in the `metbot-db` volume across restarts. To use another database, remove the `DATABASE_URL` lines in `docker-compose.yml`.
- **Services on your computer:** inside the container, `localhost` is the container itself. A server URL in the database that points to your computer (PAY, Superset, RAG…) must use `host.docker.internal` instead of `localhost`.
- **Useful commands:**
  - `docker compose logs -f metbot`: see the backend's logs.
  - `docker compose down`: stop both containers; the data stays.
  - `docker compose down -v`: stop them and delete the database too.
- **Log files:** the container also writes its logs to `/var/log/metbot/`, in the `metbot-logs` volume, as `metbot.1.log`, `metbot.2.log`… (the highest number is the current one). See them with `docker compose exec metbot ls -lt /var/log/metbot`.
- **Health:** the image checks `GET /admin/health` every 60 s; `docker compose ps` shows the container as `healthy` or `unhealthy`.

#### Environments: local, QA and production

Three compose files, one per environment, each complete on its own. Each one reads its variables from its own file, which never goes into git or the image:

| Environment | File | Variables | Database |
| --- | --- | --- | --- |
| Local | `docker-compose.yml` | `.env` | its own PostgreSQL container |
| QA | `docker-compose.qa.yml` | `.env.qa`, on the QA host | the `DATABASE_URL` of `.env.qa` |
| Production | `docker-compose.prod.yml` | `.env.prod`, on the production host | the `DATABASE_URL` of `.env.prod` |

```bash
# local
docker compose up -d --build

# QA (on the QA host, with its .env.qa next to the compose file)
docker compose -f docker-compose.qa.yml --env-file .env.qa up -d --build
docker compose -f docker-compose.qa.yml --env-file .env.qa run --rm migrations

# production (same, with prod)
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm migrations
```

- `--env-file` gives Compose the `PORT` to publish; `env_file` in the file gives the container all its variables.
- QA and production run as separate projects (`metbot-qa`, `metbot-prod`) with their own image tag and log volume, so they never mix even on one host. Production restarts always; both cap Docker's own logs (10 MB per file).
- First deploy of an environment: `migrations`, then the seeds (new database only), then `apikey <clientId>` for each client, then `up`.

### Logs

Every event is one plain-text line: `LEVEL date [Context] message`, with its details on the same line. `LOG_LEVEL` picks the lowest level shown, on this scale: `trace` → `debug` → `info` → `warn` → `error` → `fatal` → `silent`.

| Level | What it shows | Where to use it |
| --- | --- | --- |
| `fatal` | The process cannot go on (the server fails to start) | Production |
| `error` | A message, request or dependency failed | Production |
| `warn` | It works degraded: a tool failed, a policy blocked a call, a slow query (over 1 s), missing knowledge | Production |
| `info` | The runtime: startup, socket connect and disconnect with the client's permissions, new users, feedback, and **one line per message** with its times | Production |
| `debug` | The steps of each message: the user's permissions, the tools and packs that reach the model (`Turn ready`), each tool call with its duration | Development |
| `trace` | Everything: tool arguments, SQL queries, payloads, MCP messages | Development |

- **One line per message** (`info`, from `ChatService`): `Turn completed · client … · user … · servers … · mode … · agent … · tools 3 · prepare 420ms · first chunk 1800ms · total 5200ms`. The outcome is `completed`, `aborted` or `failed`. The conversation itself is not logged: LangSmith shows it.
- **SQL queries** go to `trace`: complete with their parameters in development, one short line (`SELECT ADMINISTRATIVE.USER`) when `NODE_ENV=production`.
- **Log files** (optional): with `LOG_FILE=/path/metbot.log`, the same lines are also written there, without colors, and the folder is created if missing. A new numbered file starts every `LOG_FILE_SIZE` (default `50m`; `k`, `m` or `g`), and only the last `LOG_FILE_LIMIT` files are kept (default `20`): the oldest is deleted.

### API keys

Each client (`ADMINISTRATIVE.CLIENT`) has its own API key for the REST routes.

- **The key:** `mbk_` plus 32 random bytes (`crypto.randomBytes`, base64url). Only its SHA-256 hash is stored (`CLIENT.apiKeyHash`, unique), with `apiKeyRotatedAt`. The key itself is shown once, when it is created.
- **Create or rotate it:** the same command does both. The new key replaces the old one, which stops working at once.

  ```bash
  npm run apikey:rotate -- <clientId>          # local, against the DATABASE_URL of your .env
  docker compose run --rm apikey <clientId>    # in containers
  ```

- **Check it:** `ApiKeyMiddleware` (`src/shared/middlewares/api_key.middleware.ts`, registered in `AppModule`) hashes the `x-api-key` header and looks for an active client with that hash. For now it only checks that the key is authentic.
- **Code:** `src/shared/services/crypto/crypto.ts` (generate, hash, shape check), `AdminService.rotateClientApiKey` and `AdminService.getClientByApiKey`; the same `crypto.ts` is the rotation script when run directly; and the migration `1763000000000-ClientApiKey`.

## Module Map

```text
src/
  app.module.ts          Root composition and global validation setup.
  main.ts                Application bootstrap, Swagger, and server startup.
  config.ts              Environment loading and startup checks.
  data-source.ts         TypeORM data source used by the migration commands.
  assets/                Static images (README cover).
  entities/              TypeORM entities: clients, servers, users and their auth records.
  migrations/            Schema migrations and the initial seed (server inventory).

  modules/
    chat/                Embeddable chat page route, Socket.IO gateways, and streaming UI.
    agent/               LLM orchestration and provider adapters.
    context/             Per-turn context and tool policies of each connected domain (no model call).
    tools/               Tool definitions per server and their executors (MCP, API, knowledge base).
    mcp_client/          MCP connection management and tool execution.
    admin/               Database reads and writes for clients, servers, users and OAuth grants.
    auth/                Per-server authentication adapters and the OAuth callback route.
    router/              Closed: the former LLM classifier of workflow stages, disconnected (see docs/ADR/ADR-001-autonomous-agent.md).

  knowledge/             One knowledge domain per server: domain → subdomain → mode (see its README).
    SUPERSET/            Dashboard manager: subdomain 'general' (shared base) with modes 'advance' (direct) and 'guided' (step by step).
    PAY/                 Shared knowledge plus subdomains 'personas' and 'ventas'; no modes.

  shared/                Logging, filters, and cross-cutting context helpers.
```

## Architectural Direction

The repository follows a pragmatic mix of Hexagonal Architecture, Clean Architecture, and tactical DDD. Follow up the service @abstracts for grasping the general service' purposes and future' insights

- Hexagonal Architecture keeps external systems behind ports and adapters.
- Clean Architecture keeps transport concerns at the edges and business orchestration inside application services.
- DDD gives each bounded area a clear language: chat, agent, MCP client, and shared infrastructure.

### What each module owns

- `chat` owns the user-facing entry points: the Socket.IO gateways (`/chat/main`, `/chat/test`) and the embeddable chat page.
- `agent` owns model orchestration and provider-specific execution (Gemini for the chat agent; OpenAI optional).
- `context` is the engine that assembles, for every server in `connections`, what the agent receives on each turn (from the pack its knowledge domain resolves for the connection's subdomains and the message's mode) and the tool policy it enforces, in three phases: open (each server reads its own `stateContext` entry), preload (context the agent does not decide: catalog, cached; retrieval, when enabled — all in `preload.service.ts`) and assemble. It makes no model call; the agent decides by itself what each request needs.
- `knowledge` holds one domain per server (subdomains, and modes where they exist), in numbered files: the only place to edit what the agent knows and may do on that server.
- `tools` owns each server's tools (their schemas, the calls they make and the interface events they emit) and the knowledge search tool every server with a knowledge base gets, each with its own name and namespace.
- `router` is closed: it is kept for reference only and no module imports it.
- `mcp_client` owns MCP connectivity, tool lookup, and tool dispatch against remote servers.
- `admin` owns database access for clients, servers, users and OAuth grants; other modules read them through it.
- `auth` owns each server's authentication adapter and the OAuth callback that stores a user's grant.
- `shared` contains reusable infrastructure such as logging, exception handling, and request context helpers.

### Limits on a turn

Every agent turn, on every server and provider, is bounded so a slow or failing service never keeps the user waiting:

- **Each tool call** waits at most 50 s (`TOOL_CALL_TIMEOUT_MS` in `src/modules/tools/application/providers/tool_timeout.ts`, for the MCP, JWT and OAuth executors; the knowledge search keeps its own 15 s). The REST calls that complement Superset's MCP wait 15 s.
- **A tool that fails twice** in a turn (a timeout, a rejected call, `success: false`) is not called again, and the turn ends with a reply that says what could not be done (`failingToolMiddleware` in `src/modules/agent/domain/guards/agent.guards.ts`). A failed call may be retried once as it was; the playbook asks for one retry at most.
- **Tool and model budgets** close the turn with a reply after 8 tool results and stop it after 12 model calls (same file).
- **Long conversations** are compacted in the background after a reply: once `SUMMARY_TRIGGER_MESSAGES` messages (20) follow the last summary, `ChatService.compactConversation` folds everything but the last `SUMMARY_REMAINING_MESSAGES` (6) into a summary of up to `SUMMARY_MAX_WORDS` words (300), written by the adapter in `SUMMARY_AGENT` (`gemini` or `openai`) with `GEMINI_SUMMARY_MODEL` / `OPENAI_SUMMARY_MODEL` (each defaults to its main model). It reaches the client as `mcp/Agent/summarized` (`docs/SUPERSET/FRONTEND_CONTRACT.md`, section 6) and comes back as the first `context` entry, which the agent reads as `# Conversation so far` at the end of its instructions. The prompt is `src/modules/agent/domain/summary.prompt.ts`. All of these variables are optional.

### Adding a server to the chat agent

A server can be connected only with its knowledge domain: the client names its subdomains (and modes) next to its
scopes, and the connection is refused when they do not match. What the agent knows and may do on a server lives in
`src/knowledge/<SERVER>/`, in numbered files (`00_server` and `01_playbook` required, `02`–`09` optional) registered
in `src/knowledge/index.ts`. The engine assembles any registered domain the same way. The
convention, the order in which files are filled and how to close a knowledge gap reported in the logs
(`KNOWLEDGE_SHORTAGE`, `VOCABULARY_DRIFT`) are in `src/knowledge/README.md`. The client contract every chat client must
follow is in `docs/SUPERSET/FRONTEND_CONTRACT.md`.

## Out Of Scope

- Docker instructions for now.
- A generic public chat product.
- A full RAG pipeline.
- Prisma-typeorm or relational CRUD modules that are not part of the current MCP workflow.
- Apollo graphql http protocol for CRUD sufficient-based communication

## Installed Core Packages

- `NestJS`
- `Socket.IO`
- `Swagger` / OpenAPI
- `Zod`
- `LangChain`
- `@langchain/mcp-adapters`
- Gemini and OpenAI (`@langchain/google-genai`, `@langchain/openai`)

## Running

```bash
npm run dev
```

The application listens on the port defined in `.env`:

```bash
PORT=8080
```

## Usefull commands

@tip - Use formatting commands to keep project on rail with same format across developments and apply best practices.
```bash
npm run build ---> to build the project
npm run dev ---> to activate the watch mode
npm run format ---> to check and troubleshoot format issues.
npm run codegraph ---> to help agent read the project with less tokens
npm run test:agent ---> the agent's tests from the terminal, for every service (keyboard menu; SUPERSET, PAY), with an LLM judge (tests/README.md)

npx typeorm-ts-node-commonjs migration:revert -d src/data-source.ts ---> revert migrations
npx typeorm-ts-node-commonjs migration:run --dataSource src/data-source.ts ---> run migrations
npx ts-node src/migrations/seeds/initial_seed.ts ---> init seeds
npx ts-node src/migrations/seeds/02_permissions_seed.ts ---> seed 2: permissions (after the migrations)
npm run apikey:rotate -- <clientId> ---> create or rotate a client's API key (printed once)
npm run crypto:encrypt ---> encrypt a value with this server's CREDS_KEY (AES-256-GCM): it asks for the value hidden, so it stays out of the shell history (CREDS_KEY: 32 bytes in base64)
```
