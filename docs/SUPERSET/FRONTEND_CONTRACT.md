# Chat client contract

Every client of the chat agent (PAY web, embedded Superset view, any future one) must follow this contract. The
server keeps almost no conversation state: what the agent knows between turns is what the client sends back.

## 0. Connection: socket `auth` and `mcp/Agent/providers`

```ts
io(`${SOCKET_URL}/chat/main`, {
  transports: ['websocket'],
  auth: {
    appClientId: APP_CLIENT,
    userId: user.ID,
    scopes: 'superset_mcp.pay_api', // servers, separated by '.'
    subdomains: 'superset.general&pay.personas', // per domain: domain.subdomain[.subdomain…], groups separated by '&'
    modes: 'superset.advance.guided&pay', // per domain: domain.mode[.mode…]; a domain alone ('pay') asks for no mode
    Authorization: token,
    'x-api-key': API_KEY, // the client's API key, the same one REST uses
    language: 'es', // 'es' or 'en' (regional variants work); translates the modes and texts; Spanish when missing
    utc: '-5', // the user's UTC offset
  },
});
```

- Each `mcp/Agent/ask` checks `x-api-key`: missing gives `NO_API_KEY_ERROR`, and a key that is not valid or belongs to
  another client gives `INVALID_API_KEY_ERROR`, both through `mcp/Agent/error`.
- Every scope must have its knowledge domain, and both `subdomains` and `modes` must name it. The domain names are
  `superset` (dashboard manager, subdomain `general`, modes `advance` and `guided`) and `pay` (subdomains `personas`, the
  person lookup, and `ventas`, help for sellers from the seller manual; no modes). The first mode listed for a domain is
  its default. A PAY client that needs both asks for `pay.personas.ventas`.
- A subdomain or mode that does not exist, is not permitted for the client, or does not match the scopes refuses the
  connection with `mcp/Agent/error` (no default is assumed). The dashboard manager works with one subdomain at a time.
- Once accepted, the server sends:

```ts
export interface ConnectionEvent {
  session: string;
  providers: string[]; // engines for 'agent'
  modes: ModeOption[]; // the requested modes, in the requested order; [] when none: for a mode picker
  connection: string | undefined;
}

export interface ModeOption {
  id: string; // what 'mode' carries in mcp/Agent/ask, e.g. 'guided'
  label: string; // what the picker shows, e.g. 'Guiado'
  description: string; // one sentence on what the agent does in this mode (e.g. as the option's tooltip)
}
```

- `advance` (Avanzado) works directly: it resolves the request and creates or changes the chart in the same message.
- `guided` (Guiado) walks the user step by step: one decision per reply, explained options, and a review the user
  accepts before anything is created, changed or deleted. Render its suggestions (see 3) as buttons.

## 1. Request: `mcp/Agent/ask`

```ts
export interface IContext {
  context: Partial<IMessage>[]; // text history, oldest first: { usertype: 'user' | 'assistant', message }; a 'summary' entry may come first (section 6)
  newMessage: string;
  agent: string; // 'gemini' (default) or 'openai'
  mode?: string; // the id of one of ConnectionEvent.modes; without it, each domain uses the first mode it requested
  stateContext: {
    // One entry per server, under the key that server reads (see 2). Only Superset reads one today.
    SUPERSET?: {
      domain: string; // business domain, e.g. 'PAY': created names carry "[METBOT - PAY]"
      location: {
        id?: number; // selected dashboard; without id, none is selected
        uuid?: string;
        dashboard_title?: string;
      };
      events?: IStateLockPointEvent[]; // outcomes of the interface events (see 3), oldest first
    };
  };
}

export interface IStateLockPointEvent {
  date: string;
  status: 'completed' | 'failed'; // 'failed': the process failed in the interface
  tool: string; // the event's 'action', e.g. 'generate_chart'
  data?: Record<string, unknown>; // the event's 'object', unchanged
}
```

## 2. State: `stateContext.<SERVER>`

- `stateContext` holds **one entry per server**, under the key that server's knowledge pack declares in its
  `src/knowledge/<SERVER>/07_client_state/07_client_state.ts`. The dashboard manager reads `stateContext.SUPERSET`. A server that needs state of its
  own adds its key there first, coordinated with the clients; until then it reads nothing.
- The transport does not interpret the entries: each server validates its own.
- A piece that does not match is ignored (and logged), never guessed. For example, a missing or invalid
  `location.id` means "no dashboard selected", and an empty `domain` means names get no prefix.

## 3. Events the agent emits: `mcp/Agent/custom`

`{ object, type: 'rendering', action, source: 'SuperSet' }`

| `action` | Executes | `object` |
| --- | --- | --- |
| `generate_chart` | already done on the server | `chart_id`, `chart_name`, `viz_type`, `dataset_id` |
| `add_chart_to_existing_dashboard` | already done on the server | `dashboard_id`, `chart_id`, `dashboard_title`, `charts` |
| `update_chart` | already done on the server | `chart_id`, `chart_name`, `viz_type`, `dataset_id` |
| `delete_chart` | already done on the server: the client only records it and refreshes the view (it must **not** delete or remove anything itself) | `chart_id`, `chart_title`, `dashboard_id`, `permanent` (`false`: taken off this dashboard, the chart still exists; `true`: deleted for good) |
| `update_dashboard` | already done on the server: the client only records it and refreshes the view (it must **not** update the dashboard itself) | `dashboard_id`, `dashboard_new_title`, `published` (the dashboard as saved) |
| `make_suggestions` | nothing (show the options, 1 to 3, as buttons; a picked one is sent as `newMessage`) | `suggestions` |
| `make_image` | nothing (show the reference images, 1 to 3, in the order received; `guided` mode only) | `images`: `[{ reference, title, src }]` (see below) |

Knowledge search tools (`Panels__search_knowledge`, `Pay__search_knowledge`, one per server) emit no event.

**Reference images (`make_image`).** Each `src` is a path relative to the server's origin, the same origin the socket
connects to: `/chat/assets?token=…`. `GET /chat/assets` requires the client's `x-api-key` header like every REST route,
so an `<img src>` cannot load it directly: fetch `SERVER_ORIGIN + src` with the header as a blob, render it with
`<img src={URL.createObjectURL(blob)} alt={title}>` and revoke that URL when the message leaves the view. Show them below
the agent's reply, only as illustrations of it, in the order of `images`; `title` also works as a caption. The agent
writes knowing they appear there ("abajo ves un ejemplo de…"). The link is signed and valid for 1 hour: the route answers
401 without a valid API key, 403 when the token is invalid or expired, and 404 when the file is gone. The event only carries the images that exist; if
an event arrives without images, paint nothing. Lists are not shown to the agent, so echoing it in `events` is harmless.

The main gateway never sends tool names to the client.

- Mutation events are emitted only when the action really succeeded on the server: the client carries out none of
  them any more. It records each one in `events` and refreshes the view.
- Whether the agent asks before taking a chart off or deleting it depends on the mode: `advance` acts once one chart is
  identified; `guided` asks the user to confirm first.
- Echo `object` back unchanged as `data` in `events`: the agent reads recent outcomes from there.

## 4. Streamed reply

`mcp/Agent/chunk` (text), `mcp/Agent/total` (end), `mcp/Agent/error`. Text written before a tool call is already part
of the reply.

## 5. Stopping a reply: `mcp/Agent/stop`

- Emit `mcp/Agent/stop` (no payload) to stop the reply in progress on this socket. Without one, nothing happens.
- The turn ends with `mcp/Agent/total` and `reason: 'aborted'` (`'completed'` when it finished on its own). Keep the text
  already received as the reply, or drop it; whatever the client keeps in `context` is what the agent sees next turn.
- An action already sent to a server (a chart created, a dashboard changed) is not undone: its `mcp/Agent/custom`
  event may still arrive before `total`, and must be recorded in `events` as usual.
- A new `mcp/Agent/ask` while a reply is in progress stops that reply first: one reply per socket at a time.
- Closing the socket also stops it.

## 6. Conversation summary: `mcp/Agent/summarized`

When `context` grows past a threshold (`SUMMARY_TRIGGER_MESSAGES` messages after the last summary, 20 by default), the
server compacts it in the background, after `mcp/Agent/total`, and emits:

```ts
{
  summary: string;                               // replaces the messages below, including an earlier summary
  summarizedMessages: { from: number; to: number }; // indexes of the 'context' sent in that ask, both included; from is always 0
  remainingMessages: number;                     // messages of that 'context' kept as they are, after the summary
  model: string;
  createdAt: string;                             // ISO
}
```

- Replace the first `to + 1` items of the stored history with `{ usertype: 'summary', message: summary }`, and keep
  everything after them, including the turn just answered and any message added meanwhile.
- Send that entry first in `context` from then on. Only the first item may be a `summary`.
- It is memory for the agent, not a chat message: never paint it as a bubble.
- Without this event (below the threshold, or when summarizing failed), keep sending the full history; it is tried again
  after the next turn.
