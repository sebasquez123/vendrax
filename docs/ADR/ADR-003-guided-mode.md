# ADR-003 · Guided mode for the dashboard manager

- **Status:** accepted (pending end-to-end validation with the test table in `docs/SUPERSET/SUPERSET_GUIDED_MODE.md`)
- **Date:** 2026-10-14

## Context

`advance` resolves a request from its context and creates or changes a chart in the same turn. People starting with
the dashboard manager often cannot state a chart in one message: they do not know its words, their data, or what a chart
needs. The former router walked them through stages, but ADR-001 retired it because the stage lock and the per-stage
tool filtering made every request sequential.

At the same time, the interface stopped showing an approval card: `delete_chart` and `update_dashboard` are now
carried out by the frontend as soon as the agent calls them, and their outcome comes back as a `completed` or `failed`
event.

## Decision

- A second mode, `superset.general.guided`, with the same tools, data and shared rules as `advance`. What changes is
  the posture: one decision per reply, 2-3 explained options, a glossary of terms explained the first time they come up,
  and a review the user accepts before anything is created, changed or deleted.
- The decisions to create a chart are the requirements of the chosen type (`describeChartTypeFields`, the same source
  `advance` uses), not a fixed list, so the method serves every type. Whatever the conversation already settles is not
  asked again: a complete request goes straight to the review.
- No stage is stored and no tool is locked by stage. The flow lives in the conversation: each reply opens with its own
  short title and carries what is decided in natural prose, with technical names and ids next to business names when
  the agent has them. This is also what lets the conversation switch modes, take side questions or change course.
- One deterministic backstop, in the mode's own `08_tool_policy`: in the first message of a conversation no review can
  have been shown, so every write is refused with a `notice` and the agent writes the review. After that, asking is the
  playbook's job; enforcing it in code would need the proposal mechanism removed on 2026-10-13.
- Removing or deleting a chart without the card (amended 2026-10-15): one tool, `delete_chart`, run by this server
  through the REST API. `permanent: false` takes the chart off the selected dashboard (it still exists);
  `permanent: true` deletes it for good and cleans the dashboard. When the user's words do not make "for good" clear,
  the agent only takes it off. `advance` acts as soon as exactly one chart is identified; `guided` says what will
  happen and acts only after the user confirms. Renaming or publishing the dashboard (`update_dashboard`) also runs
  through the REST API since then. The interface carries out no event any more: it records them and refreshes the
  view.
- `make_suggestions` accepts up to 3 options, shown as buttons.
- `make_image` (2026-10-15) shows up to 2 reference images of a term or an option (the chart types always as their pair, `chart_types_overview` and `chart_types_trend`), only in `guided`: `advance` leaves it
  out through its own 08 (`EXCLUDED_TOOLS`). Images live in `src/assets/images/SUPERSET` and travel as short-lived signed
  links (`GET /chat/assets`); an image that does not exist is logged and the agent is told it was not shown.
- Headings belong to each mode's reply shapes: the shared identity only adds a heading when a reply has genuinely
  distinct blocks and the shapes say nothing, and it names no client platform (PAY, VOA…), only Metgroup.
- The `rejected` event status is removed from the client contract; only `completed` and `failed` remain.

## Consequences

- Shared components of `general/` (playbook sections, vocabulary, knowledge base, catalog, rules, turn opening) are
  written once; `guided` owns its playbook, reply shapes, review rule and the turn opening that adds it.
- `advance` keeps its text except the rules about the removed card (checked against a baseline).
- Whether `guided` always reviews after the first message depends on the model following its playbook: it is measured
  with the test table (writes without a review must be 0).
- In `advance`, a deletion is immediate and irreversible; the only safeguard is identifying exactly one chart.
- The frontend receives each mode as `{ id, label, description }` and must render up to 3 suggestions.
