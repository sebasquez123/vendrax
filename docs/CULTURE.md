## 1. Calibrate the Scope of Changes

Before implementing any non-trivial change, evaluate:

- Does it improve the integrity of the overall orchestration, or does it merely address an isolated symptom?
- What is the smallest change that addresses the root cause without introducing unnecessary complexity?
- Is there an approach that evolves the system coherently and prudently rather than patching it?

**Briefly explain this reasoning before executing non-trivial changes**, especially those involving architectural decisions, new abstractions, or cross-cutting modifications. Justify the chosen scope and its implications.

- **Preserve Existing Intent:** Understand why the current implementation exists before changing it. Preserve its intended behavior and existing capabilities unless the requested change explicitly requires otherwise.
- **Assess Impact Before Editing:** Identify affected modules, consumers, contracts, and execution paths. Consider indirect effects on orchestration and integration, not only the modified file.
- **Avoid Unrequested Scope Expansion:** Do not turn a focused task into a refactor, redesign, or cleanup initiative. Address adjacent issues only when they materially affect correctness, safety, or the requested outcome.
- **Prefer Explicit Trade-offs:** When multiple valid solutions exist, favor the simplest maintainable option and explain meaningful trade-offs rather than introducing unnecessary complexity.

## 2. Prompts, Writing, and Naming Conventions

### Prompts and Writing

Precision matters more than length. Before expanding a prompt, instruction, description, or comment, determine whether information is genuinely missing or whether the issue lies in wording, clarity, or structure. Prefer improving existing content over adding redundant material.

Review every wording change against related elements, both literally and conceptually, to prevent redundancy, ambiguity, contradictions, or inconsistencies.

- **Preserve Semantic Consistency:** When changing a name, description, prompt, or contract, review its related references and consumers. Keep terminology and meaning consistent across the complete interaction flow.
- **Make Behavior Explicit:** Names, comments, and descriptions should communicate actual behavior, including relevant constraints, side effects, and failure conditions. Never document intended behavior as though it were already implemented.

### Naming Conventions

Treat the names of fields, methods, tools, types, and states with the same rigor as the code itself. Follow established conventions and choose names that accurately express each element's purpose and behavior.

For example, if an operation returns the complete list of chart identifiers, prefer `getFullChartIds` over `sessionChartIdsField`. A name should enable the agent and the user to interpret the functionality consistently.

### Comments and Documentation

- Use meaningful annotations when they provide useful context, such as `@Summary`, `@Usage`, `@When`, or `@abstract` etc..
  
- Avoid excessive or redundant comments. Prioritize documentation at the beginning of files and around elements whose purpose or behavior is not self-evident.
- If a module requires extensive explanation, create a concise, module-specific README instead of scattering comments throughout the code.
- Document non-obvious constraints, intentional limitations, and decisions that would otherwise be easy to invalidate during future changes.

### Sequentiality

When execution order or comprehension depends on sequence, prefer implementations that are sequential, localized, and easy to follow over instructions scattered across distant parts of the project. Use numbering or labels when they make the sequence explicit.

## 3. Superset Domain Knowledge

Superset has its own business rules, capabilities, constraints, and conventions, shaped by its creation and configuration workflows. Do not assume it behaves like a generic charting tool.

Before proposing or implementing changes involving Superset:

- Use the available Superset MCP server to verify actual capabilities, parameters, schemas, API constraints, and entity states, as applicable.
- Analyze the complete use case and the methodological requirements governing the interaction between this project and Superset.
- Verify that the solution is compatible with the overall integration, not just the specific case that triggered the change.
- When modifying the Superset adapter, preserve compatibility with Superset's business rules and the project's internal contracts.
- **Verify Before Assuming:** Distinguish observed behavior from assumptions. If the available tools cannot verify a requirement, identify the uncertainty instead of inventing capabilities or constraints.
- **Preserve Configuration Integrity:** Before updating an existing entity, identify which settings can be safely preserved, which can be reconstructed, and which may be lost. Do not apply destructive updates when configuration integrity cannot be established.

The goal is to keep both sides of the integration aligned: Superset's actual capabilities and the way this server interprets, exposes, and orchestrates them.

## 4. Architecture and Design

Maintain the architecture established by the project. Follow its patterns and conventions, favoring coherent, extensible, and maintainable solutions. Do not introduce abstractions or design patterns merely for theoretical preference; they must address a genuine need.

### Architectural Principles and Styles

- **Hexagonal Architecture (Ports and Adapters):** Use ports and adapters to isolate the domain from external implementations and organize modules that support multiple strategies.
- **Clean Architecture:** Preserve separation of concerns and the appropriate direction of dependencies.
- **Architecture by Features:** Organize code around business capabilities or features, avoiding unnecessary technical fragmentation.
- **Domain-Driven Design (DDD):** Use domain language and business rules to structure models, contracts, and behavior.

### Contracts and Boundaries

- **Respect Existing Contracts:** Changes to ports, adapters, schemas, and public interfaces must account for their existing consumers. Avoid breaking changes unless explicitly required or justified by the task.
- **Keep Responsibilities Localized:** Place behavior in the layer that owns it. Avoid duplicating business rules across controllers, application services, and adapters.
- **Make Failure Behavior Consistent:** Preserve clear and predictable handling of errors, missing data, unsupported operations, and external service failures across integration boundaries.
- **Keep Abstractions Proportionate:** Introduce interfaces and extension points when they provide real decoupling or support meaningful variation, not merely to increase the number of architectural layers.

### Creational Patterns

Use Singleton, Factory, or Builder only when their responsibilities justify doing so.

Options to reason:

- Apply the **Strategy** pattern when multiple interchangeable behaviors or algorithms exist, using adapters where appropriate to isolate their implementations.
- Use adapters to integrate external services without coupling the domain to implementation details.
- Introduce the interfaces and abstractions needed to support multiple services and providers in an organized way, without anticipating variations that are not yet justified.
- **Singleton:** Avoid shared mutable state and ensure concurrency safety where applicable.
- **Factory:** Centralize implementation selection or object creation when genuine alternatives exist.
- **Builder:** Simplify the construction of complex objects when direct construction becomes difficult to maintain.

The priority is architectural consistency, operational simplicity, and justified extensibility—not the indiscriminate application of design patterns.