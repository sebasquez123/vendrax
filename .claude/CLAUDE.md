<!-- CODEGRAPH_START -->
## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->

<!-- METBOT_DOMAINS_START -->

# Engineering Principles and Agent Culture

## 1. Calibrate the Scope of Changes

*GLOBAL RULE: Be always brief when replying any answer and keep concise*

Before implementing any non-trivial change, evaluate:

- Does it improve the integrity of the overall orchestration, or does it merely address an isolated symptom?
- What is the smallest change that addresses the root cause without introducing unnecessary complexity?
- Is there an approach that evolves the system coherently and prudently rather than patching it?

**Briefly explain this reasoning before executing non-trivial changes**, especially those involving architectural decisions, new abstractions, or cross-cutting modifications. Justify the chosen scope and its implications.

## 2. Prompts, Writing, and Naming Conventions

### Prompts and Writing

Precision matters more than length. Before expanding a prompt, instruction, description, or comment, determine whether information is genuinely missing or whether the issue lies in wording, clarity, or structure. Prefer improving existing content over adding redundant material.

Review every wording change against related elements, both literally and conceptually, to prevent redundancy, ambiguity, contradictions, or inconsistencies.

### Naming Conventions

Treat the names of fields, methods, tools, types, and states with the same rigor as the code itself. Follow established conventions and choose names that accurately express each element's purpose and behavior.

For example, if an operation returns the complete list of chart identifiers, prefer `getFullChartIds` over `sessionChartIdsField`. A name should enable the agent and the user to interpret the functionality consistently.

**MANDATORY:** Nomenclature of codebase must be self-explanatory - avoid using abbreviations, acronyms, or obscure terms that require external knowledge to understand. Use clear and descriptive names that convey the purpose and behavior of the code.

### Comments and Documentation

- Use meaningful annotations when they provide useful context, such as `@Summary`, `@Usage`, `@When`, or `@abstract` etc... **ONLY** at the beginning of files, modules, or functions. Avoid inline comments that merely restate the code.
- If a module requires extensive explanation, suggest a concise, module-specific README instead of scattering comments throughout the code, wait until developer confirm to add it.

### Sequentiality

When execution order or comprehension depends on sequence, prefer implementations that are sequential, localized, and easy to follow over instructions scattered across distant parts of the project. Use numbering or labels when they make the sequence explicit.

```js
/** 
 *    - 1. <Brief short descriptive title> */
      if (!args.config) return save(args);

      /**- 2. <Brief short descriptive title> */
      const savedFormData = await run_update({ name: 'get_chart_info', arguments: { request: { identifier: args.chart_id } } }, parseFormData);
      if (!savedFormData || typeof savedFormData !== 'object')
        return noSave(`the current configuration of chart ${args.chart_id} could not be read, so the update could not be checked for losses. Retry.`);
      /**- 3. <Brief short descriptive title> */
      const assessment = assessSavedChart(savedFormData as FormData);
      if (assessment.kind === 'unsupported_type')
        return noSave(
          `'${assessment.vizType}' charts cannot be changed from here (only xy, table, pie, big_number and handlebars). The change has to be made directly in the dashboard manager.`
        );
      if (assessment.kind === 'not_reproducible')
        return noSave(
          `saving would reset settings this tool cannot rebuild (${describeLosses(assessment)}). The change has to be made directly in the dashboard manager.`
        );
      /**- 4. <Brief short descriptive title> */
      return save(args);
```
## 3. Superset Domain Knowledge

Superset has its own business rules, capabilities, constraints, and conventions, shaped by its creation and configuration workflows. Do not assume it behaves like a generic charting tool.

Before proposing or implementing changes involving Superset:

- Use the available Superset MCP server to verify actual capabilities, parameters, schemas, API constraints, and entity states, as applicable.
- Analyze the complete use case and the methodological requirements governing the interaction between this project and Superset.
- Verify that the solution is compatible with the overall integration, not just the specific case that triggered the change.
- When modifying the Superset adapter, preserve compatibility with Superset's business rules and the project's internal contracts.

The goal is to keep both sides of the integration aligned: Superset's actual capabilities and the way this server interprets, exposes, and orchestrates them.

## 4. Architecture and Design

Maintain the architecture established by the project. Follow its patterns and conventions, favoring coherent, extensible, and maintainable solutions. Do not introduce abstractions or design patterns merely for theoretical preference; they must address a genuine need.

### Architectural Principles and Styles

- **Hexagonal Architecture (Ports and Adapters):** Use ports and adapters to isolate the domain from external implementations and organize modules that support multiple strategies.
- **Clean Architecture:** Preserve separation of concerns and the appropriate direction of dependencies.
- **Architecture by Features:** Organize code around business capabilities or features, avoiding unnecessary technical fragmentation.
- **Domain-Driven Design (DDD):** Use domain language and business rules to structure models, contracts, and behavior.

### Creational Patterns

Use Singleton, Factory, or Builder only when their responsibilities justify doing so.

Options to reason:

- Apply the **Strategy** pattern when multiple interchangeable behaviors or algorithms exist as it is implemented as **adapters** right now.
- Use adapters to integrate external services without coupling the domain to implementation details.
- Introduce the interfaces and abstractions needed to support multiple services and providers in an organized way, without anticipating variations that are not yet justified.

- **Singleton:** Avoid shared mutable state and ensure thread or concurrency safety where applicable.
- **Factory:** Centralize implementation selection or object creation when genuine alternatives exist.
- **Builder:** Simplify the construction of complex objects when direct construction becomes difficult to maintain.

The priority is architectural consistency, operational simplicity, and justified extensibility—not the indiscriminate application of design patterns.

### TypeScript and Type Safety

- Consider to use TypeScript's types and interfaces uniformly into types or interfaces folders and files, rather than scattering them across the codebase. This improves discoverability and maintainability. follow the existing patterns and keep the code clean for eye.

- Use the codebase to place types and interfaces if the file does not follow the convention or is too small.

## 5. DevOps and Change Management

- **Verification First:** Always run the syntax, linting, type-checking, testing, and project-structure verification commands defined by the project, as applicable. Inspect the existing scripts and configuration to identify the correct commands instead of assuming them.

- **No Git-Based Writes:** Never use Git commands to create, modify, delete, restore, overwrite, or otherwise write files or alter the working tree. This includes commands such as `git checkout`, `git restore`, `git reset`, `git clean`, and `git stash`. Git may be used for read-only inspection when necessary.

- **Preserve Existing Work:** Never overwrite or discard existing changes without first understanding their purpose and impact. Do not revert unrelated modifications or assume the working tree is clean.

- **Validate Incrementally:** After each meaningful change, run the most relevant available verification commands. Before considering the task complete, run the full applicable verification suite and report any failures or checks that could not be executed.

- **Diagnose Before Fixing:** When a verification command fails, identify whether the failure was introduced by the current change or already existed. Fix the underlying cause when it falls within scope; do not conceal failures by weakening tests, disabling checks, or suppressing errors.

- **Dependency Discipline:** Before adding, removing, or upgrading a dependency, verify whether the existing stack already provides the required capability. Avoid unnecessary packages, version changes, and lockfile modifications.

- **Configuration and Environment Safety:** Inspect the impact of changes to environment variables, build configuration, scripts, containers, and deployment settings. Never expose secrets or overwrite environment-specific configuration with assumed defaults.

- **Operational Consistency:** Keep development, testing, build, and deployment workflows consistent with the project's existing conventions. Prefer reproducible commands and explicit configuration over undocumented local assumptions.

- **Report the Outcome:** Summarize the changes made, verification commands executed, their results, and any remaining risks or unverified behavior. Never claim that a check passed unless it was actually executed successfully.

## 6. Guide

Use `~docs/` to review the project's documentation and guidelines before making changes. Follow the established best practices and maintain consistency across the codebase. Keep the relevant documentation updated whenever a significant change or addition is made.

**Keep `SUPERSET_CHART_LIMITS.md` synchronized with `tests/SUPERSET` whenever either changes.** Use the test reports to identify issues and determine whether the agent's behavior needs to be corrected. Evaluate each proposed correction carefully, ensuring that changes remain consistent with the rest of the use cases and do not negatively affect other scenarios.

Whenever adjusting this project's agent based on test reports, apply sound technical judgment to determine what can and cannot realistically be corrected. Update the relevant parts of the agent configuration, tests, and documentation together so they accurately reflect the actual capabilities and limitations of the system.

**Do not treat test-imposed conditions as an absolute source of truth.** Test results are evidence to evaluate, not unquestionable requirements. Determine whether a reported failure reflects a genuine defect, an incorrect or overly restrictive test expectation, or a limitation of the system's actual capabilities. Do not modify the agent merely to satisfy a test if doing so would introduce incorrect behavior, unsupported capabilities, or regressions in other use cases.

In particular, keep the `update_chart` guard configuration, the tests, and the documentation aligned with what the system can actually support. Their rules, expectations, and descriptions must be mutually consistent and grounded in the real scope of the implementation.

**Communication:** Although the engineer working alongside you is technical, explain your reasoning and the rationale behind proposed changes clearly and directly, using simple language and avoiding unnecessary complexity.

**When Asked to Add a Chart to the Test Pack**

The engineer may request a test for a specific chart described in natural language from an end user's perspective, based on visual characteristics. Before creating the test, investigate the feasibility of the requested scenario using the available MCP resources and the Superset API.

**Access requirement:** If you do not have access to the MCP, reject the request and ask for access before proceeding.

Verify that the requested scenario can be covered by the catalogs defined in the guard. If the full test, or any of its components, lacks sufficient support, proceed according to the following criteria:

- **Partially supported scenario:** Create the test using only the elements that are sufficiently supported, and explain why the remaining elements were excluded.
- **Unsupported elements with identifiable prerequisites:** If the unsupported elements could be covered by meeting specific requirements or implementing additional capabilities, explain those prerequisites so the engineer can decide whether to proceed with the necessary changes or abort the request.
- **Insufficient support with no established path forward:** Do not assume the requested behavior is feasible. Explain the limitations and wait for a decision before proceeding.

Base these decisions on evidence from the MCP resources, the Superset API, and the guard's established catalogs. Do not assume that a chart or visual characteristic can be tested merely because it can be described in natural language.

**When asked to refine the system based on the test results**

*Evaluate Test Expectations and Agent Decisions Without Overfitting*

When reviewing test results, evaluate questionable expectations and the agent's decisions with the goal of improving the system as a whole. Do not rigidly bind the agent to existing tests or introduce overfitting by changing its behavior merely to satisfy specific test cases.

**The goal is not to achieve a 100% score, but to ensure that the agent performs its tasks correctly.** A score of 70–80% may be acceptable when the shortfall comes from a questionable expectation in a particular step, provided no critical requirement is violated and no serious behavioral failure occurs. Do not make the judge excessively permissive simply to improve scores, nor punish the agent before understanding what happened.

Investigate each discrepancy before deciding whether a change is necessary. Determine whether the agent is overlooking relevant information, a rule needs correction, data or catalog entries are missing, the test or judge has an incorrect expectation, or the objective is genuinely beyond the system's capabilities. If the objective cannot be achieved, make that limitation explicit in the system rather than implying unsupported capabilities.

Determine which component, if any, needs adjustment: the tests, the agent's rules, the evaluator (judge), or the catalogs that define the agent's available capabilities. Make only justified changes to critical aspects, considering their impact on other use cases and avoiding regressions.

**Prioritize identifying and correcting genuine gaps from an integrated, system-wide perspective.** The objective is to improve the entire system's correctness and reliability, not to maximize scores or satisfy individual tests at any cost.

- Investigate what has happened among the available resources and the incident aheaded.
- Evaluate what and where possibly went wrong, what the system lacks to cover the case and similar cases.
- Identify the gaps to heal and evaluate whether it improves the system as a whole and not particularly that test/task
- Socialice the proposal with developer before assuming the changes with friendly language to foster faster understanding.
- If approved your proposals by developer: apply the changes.
<!-- METBOT_DOMAINS_END -->