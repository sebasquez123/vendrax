# ADR-001: Autonomous chat agent; LLM router disconnected

- Date: 2026-10-07
- Status: Accepted (pending end-to-end validation against the scenario set below)

## Context

Each turn used two model calls. A classifier (`src/modules/router`) chose one workflow stage (intent → dataset →
metric → columns → confirmation → execution → persistence), one response schema out of ~20, and the tools allowed
for that stage. The main agent was told to "do only this stage's work this turn".

Leaders rejected the result as too sequential. A request such as "créame un gráfico de barras del recaudo por mes
por vendedor" took one turn per stage, even when everything needed was already known. They asked for an agent that
works like Claude, ChatGPT or Copilot connected to an MCP server: it decides what it needs, asks only what it
cannot resolve, and answers in bounded shapes.

Two findings shaped the decision:
- The stage lock and the per-stage tool filtering were exactly what made the flow sequential.
- "Confirm before creating" was never deterministic: `generate_chart` and `update_chart` changed Superset at once,
  and the only gate was the classifier's own judgment.

## Decision

- **One agent loop per turn, no classifier.** All connected tools are attached. The agent reasons by requirements
  and sufficiency (`src/knowledge/SUPERSET/general/advance/01_playbook/01_playbook.ts`): it infers what has a single candidate,
  asks once when two candidates would give materially different results, and states its assumptions.
- **Context is assembled deterministically** by `context` for every server in `connections`, from that
  server's knowledge pack (`src/knowledge/<SERVER>/`, numbered files, see its README), ordered static → dynamic:
  identity, instructions (playbook, reply shapes), knowledge (vocabulary, knowledge-base index), data catalog
  (the datasets listed in its PRELOAD), current state.
- **Control lives in deterministic layers**, not in a model's judgment:
  - A tool policy (LangChain `wrapToolCall` middleware) checks every call before it runs:
    - Creating, changing and renaming charts run directly; a chart is added only to the selected dashboard.
    - Taking a chart off the selected dashboard or deleting it, and renaming or publishing that dashboard, run
      directly through the REST API (the approval card was removed on 2026-10-14). Whether the agent asks first
      depends on the mode (see ADR-003).
  - Tool guards stay as they were (`form_data.guard` for updates).
- **The router module is kept, closed and unused.** No module imports it; nothing new is built on it.
- **Gemini runs the chat agent.** Ollama is not used for this flow.

## Consequences

- One model call less per turn, and no "routing error" turn left without tools or history.
- A complete request becomes one turn. An ambiguous one becomes one question, then one turn.
- The agent's quality depends on the playbook's clarity and on the model. Mitigations:
  - Every decision-relevant fact has a single source: rules in the playbook, tool usage in the tool descriptions,
    data in the catalog, concepts in the knowledge base.
  - The data catalog tags what each metric computes, so a count and a sum of money are not confused.
- Clients must send the state contract (`docs/SUPERSET/FRONTEND_CONTRACT.md`) on every turn.

## Validation

Before the router is considered retired for good, run the scenario set from the implementation plan on `/chat/test`
with LangSmith traces. Track:
- turns until the chart exists;
- questions per turn;
- tool calls per turn;
- invented names (must be 0);
- destructive changes without confirmation (must be 0).
