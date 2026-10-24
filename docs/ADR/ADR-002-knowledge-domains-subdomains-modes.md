# ADR-002 · Knowledge by domain → subdomain → mode

- **Status:** accepted
- **Date:** 2026-10-13 (amended 2026-10-14: shared base per subdomain, mode label and description; see ADR-003)

## Context

The agent's knowledge was one pack per connected server (`src/knowledge/<SERVER>`). METBOT now needs to tailor the
agent within a server:

- **subdomains:** the topics of a domain, each with its own rules and tools (PAY: personas, dispositivos…);
- **modes:** postures of the agent, each with its own playbook and, when needed, its own tools and rules (dashboard
  manager: the direct behavior, `advance`, and the step-by-step `guided`; later a read-only `analytics`).

The dashboard manager's behavior must not change.

## Decision

- The client asks for them when it connects, next to its scopes: `subdomains: 'superset.general&pay.personas'`,
  `modes: 'superset.advance&pay'` (a domain alone asks for no mode).
- The connection middleware refuses any request where server, subdomain and mode do not match the knowledge tree and
  the client's permissions (`verifyKnowledgeDomains`). A server without a knowledge domain cannot connect; there is no
  default context.
- The mode is picked per message (`mode`, like `agent`), among the requested ones; without it, the first one.
- Each turn, every domain resolves **one pack** (`KnowledgeDomain.packFor`), so the engine, the preload, the tool
  policies and the tools work as before. Two shapes of domain (`define_pack.ts`):
  - **with modes** (dashboard manager): each mode is a whole pack built in three layers, so nothing is copied between
    modes. Domain: identity (00), the tool glossary (04, read by the tools) and the client state contract (07).
    Subdomain (`general/`): the shared playbook sections, vocabulary, knowledge base, catalog, rules (08) and turn
    opening (09). Mode: its own playbook sections and reply shapes, plus any shared component it replaces or extends
    with its own folder. Every mode declares `mode: { label, description }`, which the client receives on connecting
    (`ConnectionEvent.modes`) for its mode picker;
  - **with subdomains** (PAY): shared knowledge once, each subdomain adds its playbook section, vocabulary, tools and
    knowledge-base documents. Active subdomains' documents are listed once each, naming the subdomains they serve;
    the search still covers the domain's whole namespace (restricting it per subdomain is pending).
- A pack narrows its tools with `TOOLS` in its `08_tool_policy`; without it, every tool the client permits.

## Consequences

- `superset.general.advance` is the former dashboard manager pack, unchanged (checked against a baseline when it was
  moved, and again when its shared components moved to `general/`).
- Clients must send `subdomains` and `modes`; without them the connection is refused.
- PMS and Google Workspace cannot connect until they have a knowledge domain.
- A new mode or subdomain is a folder, one registration line and one permission entry; the engine does not change.
