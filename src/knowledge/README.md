# Conocimiento por dominio (`src/knowledge`)

Cada servidor que se conecta al agente (gestor de paneles, PAY…) es un **dominio** con su carpeta: todo lo que el agente
necesita para trabajar en él (qué puede hacer, cómo habla el negocio, qué datos existen, qué lee del estado del cliente y
qué reglas aplican). Los archivos están **numerados en el orden en que se llenan**. Solo `00` y `01` son obligatorios.

El motor (`src/modules/context`) es el mismo para todos. En cada turno, cada dominio de `connections` le entrega **un
pack**: el conjunto de esos archivos que aplica a lo que el cliente pidió. El motor arma el prompt siempre en el mismo
orden. **Para agregar un dominio, un subdominio o un modo, no se toca el motor.**

```text
src/knowledge/
  README.md          esta guía
  types.ts           el contrato de un pack y de un dominio (cada campo documentado)
  define_pack.ts     definePack() y los dos tipos de dominio (con modos / con subdominios)
  index.ts           el registro de dominios
  SUPERSET/          gestor de paneles: dominio → subdominio → modo (la referencia completa)
  PAY/               dominio → subdominio, sin modos
```

## Dominio, subdominio y modo

| Nivel | Qué es | Ejemplo |
| --- | --- | --- |
| **Dominio** | El servidor del que se arma el contexto | `superset` (gestor de paneles), `pay` |
| **Subdominio** | Un tema del dominio, con sus reglas y sus herramientas | `pay.personas`; el gestor de paneles tiene uno solo, `general` |
| **Modo** | Una postura del agente dentro de un subdominio: cómo trabaja con el usuario (playbook, formas de respuesta) y, si hace falta, sus propias herramientas y reglas | `superset.advance` (directo), `superset.guided` (paso a paso, para quien empieza) |

El cliente los pide al conectar, junto con los scopes (formato en `docs/SUPERSET/FRONTEND_CONTRACT.md`):

```text
scopes: 'superset_mcp.pay_api'   subdomains: 'superset.general&pay.personas'   modes: 'superset.advance&pay'
```

Si servidor, subdominio y modo no coinciden con el árbol y con los permisos del cliente, la conexión se rechaza; no hay
contexto por defecto. El modo se elige en cada mensaje entre los que se pidieron al conectar (sin `mode`, el primero), y
el pack se busca de nuevo en cada turno: cambiar de modo a mitad de una conversación no deja nada pendiente, porque el
servidor no guarda estado por modo. Al conectar, el cliente recibe cada modo con su nombre y su descripción (`mode` en
el `definePack` del modo) para mostrarlos en su selector.

**Dos formas de dominio** (`define_pack.ts`):

- **Con modos** (`defineDomainWithModes`, gestor de paneles). Cada modo es un pack completo, armado en tres capas para
  que nada se copie entre modos:
  - **dominio** (todos los modos): `00_server` (la identidad), `04_tool_glossary` (lo leen las herramientas, que no saben
    de modos) y `07_client_state` (el contrato con el frontend);
  - **subdominio** (los modos de `general`): las secciones comunes del playbook (`01_playbook`: `SCOPE`, `RESOLVING`,
    `RULES`), el vocabulario, la base de conocimiento, el catálogo, las reglas (`08`) y la apertura del turno (`09`);
  - **modo**: lo suyo (`01_playbook` con sus propias secciones, `02_reply_shapes`) y el componente de la base que
    reemplace o extienda con su propia carpeta. `guided` trae su `08` (nada se escribe antes de una revisión) y su
    `09`, que llama al `09` de la base y agrega esa regla.

  ```text
  SUPERSET/
    00_server/  04_tool_glossary/  07_client_state/              dominio
    general/                                                     subdominio: base de sus modos
      01_playbook/ 03_vocabulary/ 05_knowledge_base/ 06_preload_data_catalog/ 08_tool_policy/ 09_open_turn/
      advance/  01_playbook/ 02_reply_shapes/ index.ts           modo directo
      guided/   01_playbook/ 02_reply_shapes/ 08_tool_policy/ 09_open_turn/ index.ts   modo paso a paso
    index.ts                                                     defineDomainWithModes: general → [advance, guided]
  ```

- **Con subdominios** (`defineDomainWithSubdomains`, PAY). Lo común se escribe una vez (`shared`: un pack completo) y
  cada subdominio agrega solo su sección de playbook, su vocabulario, sus herramientas y sus documentos (`topics`). Si se
  activan varios, el pack del turno es lo común más cada subdominio, en el orden en que se declaran:
  - playbook y vocabulario: lo común y luego lo de cada subdominio;
  - herramientas: la unión, sin repetir (si nadie declara `TOOLS`, todas las permitidas);
  - documentos: los comunes y los de cada subdominio, **una vez cada uno** (por `title`). Con más de un subdominio
    activo, cada documento del índice dice entre paréntesis a cuáles sirve, para que el agente elija buscar según el
    tema de la pregunta. La búsqueda sigue siendo sobre todo el namespace del dominio.

  ```text
  PAY/
    00_server/  01_playbook/  05_knowledge_base/           lo común (05 define cada documento una vez)
    personas/   01_playbook/  08_tool_policy/ (TOOLS)      búsqueda de personas, sin documentos propios
    ventas/     01_playbook/  08_tool_policy/ (TOOLS: [])  ayuda a vendedores, con el manual del vendedor (topics)
    index.ts                                               defineDomainWithSubdomains: personas, ventas
  ```

**Las herramientas de cada pack** las decide su `08_tool_policy` con `TOOLS` (nombres cortos). Sin `TOOLS`, el pack usa
todas las que el cliente tiene permitidas en ese servidor (así trabaja `superset.guided`). Por ejemplo, un modo de solo
lectura declararía solo las herramientas de lectura en su propio `08`. Para dejar fuera unas pocas sin listar todas las
demás, el `08` declara `EXCLUDED_TOOLS`: así `superset.advance` deja fuera `make_image`, que es del modo Guiado.

**Agregar un modo al gestor de paneles:**

1. Crea `general/<modo>/` con su `01_playbook` (sus secciones, unidas a `SCOPE`, `RESOLVING` y `RULES` de la base), su
   `02_reply_shapes` y su `index.ts`. El `index.ts` toma de `general/` lo que comparte y declara `mode: { label,
   description }` (sin `mode`, el servidor no arranca: el cliente no podría mostrarlo).
2. Si el modo cambia una regla o sus herramientas, dale su propio `08_tool_policy` (y, si la regla necesita datos del
   turno, su `09_open_turn`, que llama al de la base). Así lo hace `guided`.
3. Regístralo en `SUPERSET/index.ts` (`general: { advance: ADVANCE, guided: GUIDED, <modo>: … }`).
4. Permítelo al cliente en `authorization.interface.ts` (`subdomains: [{ name: 'general', modes: [...] }]`).

**Agregar un subdominio a PAY:**

1. Crea `PAY/<subdominio>/` con su `01_playbook` (solo su sección) y, si usa herramientas, su `08_tool_policy` con `TOOLS`.
   Si usa documentos que no son de todos los subdominios, defínelos una vez en `PAY/05_knowledge_base` y lístalos en
   `topics` de su `index.ts`.
2. Regístralo en `PAY/index.ts` (`subdomains: { personas: PERSONAS, <subdominio>: … }`).
3. Permítelo al cliente en `authorization.interface.ts` (`subdomains: [{ name: '<subdominio>', modes: [] }]`).

**Agregar un subdominio al gestor de paneles** (otra plataforma con sus propios datos, como VOA): la guía paso a paso,
con la configuración, el código y el frontend que implica, está en `docs/SUPERSET/SUPERSET_NEW_PLATFORM.md`.

## Los archivos de un servidor

| Archivo | ¿Obligatorio? | Exporta | Qué contiene |
| --- | --- | --- | --- |
| `00_server.ts` | **sí** | `SERVER` | El `serverName` de la conexión, el nombre visible y el prefijo de sus herramientas (`''` si no tienen) |
| `01_playbook.ts` | **sí** | `PLAYBOOK` | Alcance, cómo trabaja el agente, qué requiere cada acción, reglas que siempre aplican |
| `02_reply_shapes.ts` | no | `REPLY_SHAPES` | Formas de respuesta y sus límites de palabras |
| `03_vocabulary.ts` | no | `VOCABULARY` | Cómo nombran las cosas los usuarios → a qué apuntan; ambigüedades que se preguntan |
| `04_tool_glossary.ts` | no | glosarios con nombre propio | Significado de negocio de los valores técnicos que devuelven sus herramientas: datos (tablas, columnas) y valores (tipos de gráfico, títulos…). Lo leen sus herramientas |
| `05_knowledge_base.ts` | no | `KNOWLEDGE_BASE` | Namespace del RAG, nombre de **su** herramienta de búsqueda, índice de documentos y, opcional, la recuperación previa (`preload`) |
| `06_preload_data_catalog.ts` | no | `CATALOG` + `PRELOAD` | Qué datasets se precargan en cada turno (`PRELOAD`) y cómo se muestran al agente (caché de 10 min por usuario) |
| `07_client_state.ts` | no | `STATE` + `renderStateBlock` | Su clave en `stateContext`, qué lee de ella y cómo se muestra en el prompt |
| `08_tool_policy.ts` | no | `TOOL_LIMITS` + `checkToolCall` | Máximo de llamadas por herramienta en un turno, y reglas por riesgo |
| `09_open_turn.ts` | no | `openTurn` | Lo que cada turno agrega: el bloque de estado (07), parámetros para sus herramientas, aplicación de 08 |
| `index.ts` | **sí** | el pack o el dominio | `definePack({ … })` del pack; en la raíz del dominio, `defineDomainWithModes` o `defineDomainWithSubdomains` |

Los nombres de exportación son **los mismos en todos los servidores**. Cada componente vive en su propia carpeta,
con el mismo nombre, junto a lo que le pertenece:

```
07_client_state/
  07_client_state.ts        el componente
  07_client_state.spec.ts   su spec, si tiene lógica
  interfaces.ts             sus tipos propios, si tiene (ClientState, StateBlockInput…)
```

Solo los `index.ts` quedan fuera de las carpetas de componentes. El contrato que comparten todos los packs y el motor (`ServerIdentity`,
`VocabularyEntry`, `KnowledgeBase`, `DomainTurn`…) está en `src/knowledge/types.ts` y se importa desde ahí. Los
archivos de lógica explican en su cabecera qué hacen, cómo se usan (`@Usage`) y cuándo tocarlos (`@When`).

## Cómo configurar cada archivo

`SUPERSET/` (el gestor de paneles) es el ejemplo completo de cada uno. Cada sección dice lo mismo en el mismo orden:
**qué es**, **dónde aparece** (en qué parte del prompt o en qué herramienta lo ve el agente), **cómo se llena** (cada
campo y de dónde sacar su valor) y **cómo se comprueba**.

### 00_server.ts · obligatorio

**Qué es.** La identidad del servidor: une el pack con su conexión y dice cómo se nombra ante el agente.
**Dónde aparece.** `label` encabeza las partes del prompt (`# Gestor de paneles · instructions`); `toolPrefix` es el
inicio del nombre de cada herramienta que ve el modelo.

| Campo | Qué es | De dónde sacar el valor | Ejemplo |
| --- | --- | --- | --- |
| `serverName` | La clave técnica de la conexión; nunca la ve el agente | El valor de `ServerAdapters` (`src/entities/server.entity.ts`), el mismo `serverName` del servidor en la base de datos | `'superset_mcp'` |
| `label` | Cómo se llama el servidor en el prompt | Como lo diría el usuario; nunca el nombre de un producto | `'Gestor de paneles'` |
| `toolPrefix` | El prefijo de los nombres de sus herramientas. Con él, `06` y `08` usan los nombres cortos | El prefijo con que se registran sus herramientas (`TOOL_PREFIX` en sus `tool.ts`), o `''` si no tienen | `'Panels__'` |

**Cómo se comprueba.** Al arrancar, el log avisa si falta `serverName` o `label`.

### 01_playbook.ts · obligatorio

**Qué es.** Qué puede hacer el agente en este servidor, qué necesita cada acción y las reglas que siempre aplican.
**Dónde aparece.** En `# <Servidor> · instructions`, tal cual.
**Cómo se llena.** Un texto con encabezados `##`. En el gestor de paneles, `Scope` (qué puede y qué no), `Resolving
what the user names` y `Rules that always apply` son comunes a todos los modos (`general/01_playbook`); cada modo agrega
las suyas: `advance`, `How you work` y `Requirements` (qué necesita cada acción); `guided`, cómo guía, cómo crea
cualquier tipo de gráfico, cómo cambia o elimina, qué hace cuando la conversación se sale del camino y el glosario de
términos.

- Escribe requisitos y reglas, no pasos.
- No repitas cómo se usa una herramienta: eso va en su descripción.
- Lo que una herramienta puede o no hacer se confirma en su código o en el servidor, no se supone.

**Cómo se comprueba.** Si está vacío, el agente recibe un bloque mínimo y el log lo avisa al arrancar.

### 02_reply_shapes.ts · opcional

**Qué es.** Las formas que puede tomar una respuesta y el máximo de palabras de cada una. El agente elige una forma por
respuesta. Es propio de cada modo, y también decide los encabezados (la identidad común solo pone un `###` cuando la
respuesta tiene bloques realmente distintos y el 02 no dice nada): `advance` usa Answer, Question, Result y Limitation,
cortas y sin título; `guided`, Decision, Review, Result, Explanation y Limitation, cada una abierta por su propio
título y escrita en prosa.
**Dónde aparece.** En `# <Servidor> · instructions`, después del playbook.

### 03_vocabulary.ts · opcional

**Qué es.** Cómo nombran las cosas los usuarios y a qué apunta cada nombre. Sirve sobre todo para dos casos:

- **Ambigüedades:** "ventas" puede ser la cantidad de ventas o el dinero recaudado. Con dos destinos, el agente
  pregunta cuál en vez de elegir por parecido.
- **Sinónimos que no se parecen a la etiqueta:** "movimientos" es la métrica `transacciones`.

Si la etiqueta del catálogo ya resuelve el término (por ejemplo, "estado" → `STATUS_DESC "Estado del movimiento"`),
no hace falta una entrada.

**Dónde aparece.** En `# <Servidor> · knowledge`, bajo `## Business vocabulary`, una línea por entrada, en todos los
turnos:

```text
- "ventas" / "total ventas" → ambiguous, ask which one: metric Total ventas (ACCOUNT_MOVEMENTS_VIEW): cantidad de ventas…; or metric Total recaudo por ventas (ACCOUNT_MOVEMENTS_VIEW): dinero recaudado…
- "movimientos" → metric transacciones (ACCOUNT_MOVEMENTS_VIEW): cantidad de todos los movimientos de cuenta…
```

**Cómo se llena.** Una entrada por forma de decir algo:

```ts
{
  terms: ['ventas', 'total ventas'],          // cómo lo dice el usuario
  refersTo: [VENTAS_CANTIDAD, VENTAS_DINERO], // un destino: significa eso; dos o más: es ambiguo y el agente pregunta
  note: '…',                                  // opcional: algo más que el agente deba saber
}
```

| Campo | Qué es | De dónde sacar el valor | Ejemplo |
| --- | --- | --- | --- |
| `terms` | Las palabras del usuario. No se comparan con nada: son para el agente | Conversaciones reales, los mensajes de `KNOWLEDGE_SHORTAGE` en el log, el equipo de negocio. En minúscula y sin las palabras de alrededor ("gráfico de", "por mes") | `['movimientos', 'total de transacciones']` |
| `kind` | Qué tipo de cosa es: `'metric'` (métrica guardada del dataset) o `'column'` (columna) | Si en el catálogo aparece en "Saved metrics" o entre las columnas | `'metric'` |
| `name` | Su nombre técnico exacto, **nunca la etiqueta** | En el catálogo del prompt es el nombre que va antes de la etiqueta entre comillas (`Total ventas [count]`). En el gestor de paneles: editor del dataset → pestaña Metrics (`metric_name`) o Columns (`column_name`). También en `get_dataset_info` | `'Total ventas'` |
| `source` | El dataset que lo contiene, por su `table_name` | Uno de `PRELOAD.datasets` (`06`), como lo muestra el catálogo: `Dataset 123 · ACCOUNT_MOVEMENTS_VIEW` | `'ACCOUNT_MOVEMENTS_VIEW'` |
| `meaning` | Qué significa, en palabras de negocio. Es también el texto de la opción cuando el agente pregunta | El equipo de negocio. Corto y confirmado: el agente lo toma como cierto | `'cantidad de ventas (recargas y ventas de tarjeta)'` |
| `note` | Opcional: una aclaración de uso | — | — |

**Cómo se comprueba.** Al arrancar, el log avisa de una entrada sin términos o sin destinos. Además, cada vez que se
reconstruye el catálogo (`06`, a lo sumo cada 10 minutos por usuario), cada destino se busca en lo que el catálogo
leyó, en este orden:

1. el dataset cuyo `table_name` es `source`;
2. dentro de él, la lista de métricas o la de columnas, según `kind`;
3. en esa lista, `name`, exacto (respeta mayúsculas y espacios).

| Resultado | Qué aparece en el log | Qué hacer |
| --- | --- | --- |
| Lo encuentra | Nada | — |
| El dataset se leyó, pero `name` no está | `VOCABULARY_DRIFT`, con los términos y el destino | Lo renombraron o lo quitaron: corrige `name` (o `kind`) |
| El usuario no ve ese dataset | `The vocabulary of '…' points to data this user cannot see` | Revisa los permisos del usuario; el vocabulario está bien |
| `source` no está en `PRELOAD` | Nada: ese dataset no se lee, así que no se puede comprobar | Agrega el dataset a `PRELOAD` o corrige `source` |

El aviso solo queda en el log: el prompt no cambia. `sections.prompt.spec.ts` comprueba cómo se muestra.

### 04_tool_glossary.ts · opcional

**Qué es.** El significado de negocio de los valores técnicos que devuelven las herramientas, con la forma
`valor técnico exacto → { business_hint, aliases }`, en dos secciones:

1. **Los datos**: tablas, esquemas y las columnas de cada dataset (en `DATASET_COLUMN_GLOSSARIES`, por `table_name`).
2. **Los valores que devuelven las herramientas**: nombres de gráficos, tipos, fuentes, dashboards, filtros.

**Dónde aparece.** No va en el prompt. Cada herramienta importa por nombre los glosarios que necesita (el nombre es el
campo que explica) y los adjunta a su resultado como `_semantics`. El catálogo (`06`) usa `business_hint` como la
etiqueta entre comillas de cada tabla y columna.

| Campo | Qué es | De dónde sacar el valor |
| --- | --- | --- |
| la clave | El valor exacto que devuelve la herramienta | La respuesta de la herramienta o el servidor (`table_name`, `column_name`, `viz_type`…) |
| `business_hint` | Qué es, en una línea de negocio | El equipo de negocio o la `description` del servidor |
| `aliases` | Cómo lo dice el usuario, para que el agente lo reconozca | Igual que los `terms` de `03` |

Antes de agregar algo, intenta llenarlo en el servidor mismo (`verbose_name` / `description` del dataset), porque
así llega a todas sus herramientas a la vez.

**Cómo se comprueba.** No hay comprobación automática; se revisa en las respuestas de las herramientas.

### 05_knowledge_base.ts · opcional

**Qué es.** La base de conocimiento (RAG) del servidor: su namespace, su herramienta de búsqueda y el índice de sus
documentos.
**Dónde aparece.** El índice va en `# <Servidor> · knowledge`, una línea por documento `available`. La herramienta de
búsqueda se adjunta al agente con su propio nombre.

| Campo | Para qué sirve | Cómo se llena |
| --- | --- | --- |
| `namespace` | La base del RAG que consulta este servidor | El namespace donde se hizo la ingesta (`'SUPERSET'`). Único por servidor |
| `searchTool` | El nombre de **su** herramienta de búsqueda | `<prefijo>search_knowledge` (`Panels__search_knowledge`, `Pay__search_knowledge`). Único por servidor |
| `topics` | El índice de documentos que ve el agente | Un elemento por documento (ver abajo). En un dominio con subdominios, aquí van los documentos de **todos** los subdominios; los de algunos se definen en este mismo archivo y cada subdominio los lista en su `topics` |
| `preload` | La recuperación previa: el motor busca solo, sin que el agente lo pida (ver "La precarga") | `{ enabled: false }` hoy. `maxExcerpts` es opcional (3 por defecto) |

Cada documento de `topics`:

| Campo | ¿Lo ve el agente? | Para qué sirve | Cómo se llena |
| --- | --- | --- | --- |
| `title` | sí | Nombra el documento en el índice | Corto y distinto de los demás |
| `covers` | sí | Le permite decidir si vale la pena buscar | **Todas** las preguntas que responde el documento, separadas por comas, como las haría un usuario |
| `documentLocation` | **no** | Le dice al equipo dónde editar el documento y desde dónde volver a ingestarlo | La ruta en el repo o un enlace. Mientras está `planned`, quién lo escribe o dónde va a vivir |
| `status` | — | Lo publica o no | `'planned'` mientras se escribe; `'available'` cuando ya se hizo la ingesta |

Ejemplo de un documento que cubre varios casos:

```ts
{
  title: 'Glosario de negocio PAY',
  covers: 'what recaudo means and how it differs from a recarga, what a validación is, who the ente gestor and the operators are',
  documentLocation: 'docs/PAY/PAY_GLOSARIO.md',
  status: 'available',
}
```

El agente lo ve como una línea del índice: `- Glosario de negocio PAY: what recaudo means …, who the ente gestor and
the operators are.`

- Escribe `covers` en inglés, como el resto del prompt, y deja los términos de negocio como los dice el usuario.
- Si un documento mezcla temas que no tienen relación entre sí, conviene dividirlo, para que cada `covers` sea claro.

Cómo funciona:

- Cada servidor tiene **su propia herramienta de búsqueda**, con su propio nombre y namespace. Todos usan el mismo
  mecanismo (`src/modules/tools/infrastructure/tools/rag`), así que no hay que escribir código de herramienta por
  servidor.
- La herramienta **solo se adjunta cuando hay al menos un documento `available` y los permisos del cliente para ese
  servidor incluyen `search_knowledge`**. Si falta alguna de las dos, el agente no ve ni la herramienta ni el índice;
  si hay documentos pero falta el permiso, el log lo avisa.
- Cada índice nombra la herramienta de su servidor, y la identidad le indica al agente que busque en la base del
  servidor del que trata la pregunta. Al arrancar, el motor verifica que ningún par de servidores comparta namespace
  ni nombre de herramienta.
- Límite: 2 búsquedas por turno y por servidor, igual que cualquier otra búsqueda.

**Anunciar un documento nuevo:**

1. Agrega su entrada con `status: 'planned'` mientras se escribe. El agente no la ve.
2. Escribe el documento (por ejemplo `docs/PAY/PAY_GLOSARIO.md`) y haz la ingesta en el namespace del servidor.
3. Cámbiala a `status: 'available'`. Desde ese despliegue el agente ve el índice y tiene la herramienta.

### 06_preload_data_catalog.ts · opcional

**Qué es.** Los datos que el agente conoce antes de actuar: los datasets de `PRELOAD`, cada uno con sus columnas de
fecha, sus métricas guardadas (con lo que calculan: `[count]`, `[sum]`…) y sus demás columnas, con la etiqueta de
negocio junto a cada nombre técnico. Así puede crear un gráfico en un solo turno sin buscar nada.
**Dónde aparece.** En `# <Servidor> · data`, bajo `## Data catalog`, en todos los turnos.

**Cómo se llena.** Un solo objeto:

```ts
export const PRELOAD = {
  datasets: ['ACCOUNT_MOVEMENTS_VIEW', 'VIEW_CONTRACT_BALANCE_HISTORY', 'VIEW_ACTIVITY_SUPERVISION_LOGS'],
  tools: { list: 'list_datasets', details: 'get_dataset_info' },
  listPageSize: 100,
};
```

| Campo | Qué es | De dónde sacar el valor |
| --- | --- | --- |
| `datasets` | Los datasets que se precargan completos, en ese orden, por su `table_name` (es el mismo en todos los ambientes; los ids no) | El gestor de paneles → Datasets (nombre de la tabla), o `get_dataset_info` |
| `tools` | Las herramientas de lectura que los traen, por nombre corto | Los nombres de las herramientas, sin prefijo |
| `listPageSize` | Cuántos datasets pide el listado que encuentra los ids | Más que el total de datasets del servidor |

Cómo se arma, en cada reconstrucción:

1. Lista los datasets que **este usuario** ve, para conocer sus ids.
2. Se queda con los de `PRELOAD` que el usuario ve, en ese orden. Los demás no se muestran.
3. Lee el detalle de cada uno con `get_dataset_info`. Si uno falla, se muestra como "no disponible" y el agente
   puede leerlo con la herramienta.
4. Devuelve el bloque del prompt y el inventario de nombres que usa la comprobación de `03`.

El resultado se cachea 10 minutos por cliente, servidor y usuario. Hoy son los 3 datasets del gestor de paneles y
todos van completos. Si llegan a ser más, el siguiente paso es cargar solo los que necesita cada pedido; no está
construido.

**Cómo se comprueba.** `06_preload_data_catalog.spec.ts` comprueba qué se lee y cómo se muestra. Si un dataset deja
de existir o el usuario no lo ve, simplemente no aparece; si el vocabulario apunta a él, la comprobación de `03` lo
avisa en el log.

### 07_client_state.ts · opcional

**Qué es.** Lo que el agente sabe del estado de la interfaz: el dashboard seleccionado, el dominio y los últimos
eventos.
**Dónde aparece.** En `# <Servidor> · current state`, armado en cada turno por `09`.

El cliente envía **una entrada por servidor** en `stateContext`, bajo la clave que ese servidor declara en su
`07_client_state.ts`:

```text
stateContext: { SUPERSET: { domain, location: { id, uuid, dashboard_title }, events }, PAY: { … } }
```

El motor no interpreta ninguna entrada: a cada servidor le entrega solo la suya. Su `07_client_state.ts` declara:

- la clave (`stateContextKey: 'SUPERSET'`);
- qué lee de ella (esquema);
- cómo la muestra (`renderStateBlock`).

Lo inválido se descarta y se reporta en el log; nunca se adivina. Hoy solo el gestor de paneles lee una entrada:

- `domain`: el prefijo de los nombres creados;
- `location`: el dashboard seleccionado;
- `events`: los resultados de los eventos de la interfaz.

Para que un servidor lea algo nuevo del estado:

1. Agrega el campo a `ClientState` (`07_client_state/interfaces.ts`) y a su lectura en `07_client_state.ts` (o crea
   la carpeta con su `stateContextKey`, si aún no tiene).
2. Muéstralo en `renderStateBlock`, en el mismo archivo.
3. Coordina con el frontend que lo envíe bajo esa clave (`docs/SUPERSET/FRONTEND_CONTRACT.md`).

Contrato y plantilla viven juntos para que no se desincronicen.

### 08_tool_policy.ts · opcional

**Qué es.** Lo que nunca debe pasar, decida lo que decida el agente.
**Dónde aparece.** No va en el prompt: se aplica antes de ejecutar cada llamada a una herramienta, y si la bloquea, el
agente recibe el mensaje como respuesta de esa herramienta.

- **`TOOLS`** (opcional): las únicas herramientas que usa el pack, con su nombre corto. Sin `TOOLS`, usa todas las que
  el cliente tiene permitidas en el servidor (en `definePack`, `includedTools`). Ver "Dominio, subdominio y modo".
- **`EXCLUDED_TOOLS`** (opcional): las que el pack nunca ofrece aunque el cliente las permita (en `definePack`,
  `excludedTools`). Es más seguro que listar todas las demás en `TOOLS`: una herramienta nueva aparece sola.
- **`TOOL_LIMITS`** (en `definePack`, `toolCallLimits`): el máximo de llamadas por turno a una herramienta, con su nombre corto, sin prefijo
  (`list_datasets: 2`). La búsqueda de `05` ya trae 2 por defecto. Al llegar al límite, la llamada no se ejecuta y el
  agente tiene que responder con lo que tiene o preguntar.
- **`checkToolCall(call, facts)`**: recibe la herramienta con sus argumentos y los hechos del turno, y devuelve
  `{ decision: 'allow' }` o `{ decision: 'block', message, status }`. `status` es `'error'` cuando la llamada estaba mal
  (otro dashboard) y `'notice'` cuando el agente tiene que hacer otra cosa primero. Cada regla es una función con nombre
  (`checkAddToDashboard`), y la tabla completa de reglas está en la cabecera del archivo. En el gestor de paneles, la
  regla común es que un gráfico solo se agrega al dashboard seleccionado. `guided` agrega la suya en su propio `08`
  (`checkReviewShown`): en el primer mensaje de una conversación, donde todavía no pudo haber una revisión, ninguna
  escritura se ejecuta y el agente recibe un `notice` para mostrar la revisión.

### 09_open_turn.ts · opcional

**Qué es.** Lo que el servidor agrega a cada turno.
**Dónde aparece.** Une `07` y `08`: escribe el bloque de estado y aplica las reglas en cada llamada.

`openTurn({ state, previousMessageCount, now, socket })` corre al inicio de cada turno. Devuelve tres cosas, todas
opcionales:

- `statePrompt`: el bloque `# <Servidor> · current state`, armado con `renderStateBlock` de `07`.
- `stateContextToolParams`: valores del estado del cliente (`stateContext`) que reciben sus herramientas en ese turno (en el gestor de paneles: el dominio).
- `evaluateToolCall`: las reglas de `08`, con los hechos del turno.

Un modo con reglas propias tiene su `09`, que llama al de la base y aplica primero su regla (`guided/09_open_turn`).

### index.ts · obligatorio

En cada pack, `definePack({ server, playbook, … })` con los archivos que existan; en un modo, además, `mode: { label,
description }` para el selector del cliente. En la raíz del dominio, `defineDomainWithModes` o
`defineDomainWithSubdomains`, y el dominio se registra en `src/knowledge/index.ts`.

## Cómo se arma el prompt (orden garantizado por el motor)

En cada turno, para cada servidor de `connections` (en el orden en que llegan):

```text
# Assistant                      identidad, formato y reglas para varios servidores (común)
# <Servidor> · instructions      01 + 02
# <Servidor> · knowledge         03 + índice de 05 (solo documentos 'available', con el nombre de SU herramienta)
# <Servidor> · data              precarga: catálogo (06) y, si está activa, recuperación (05)
# <Servidor> · current state     07, como lo arma 09
# Session                        la fecha de hoy (común, una sola vez)
```

- Primero lo fijo y al final lo que cambia en cada turno, para que el proveedor pueda cachear el inicio del prompt.
- Nada se repite entre servidores: lo común (identidad, fecha, reglas de búsqueda) aparece una sola vez.
- Dentro de los archivos se usan encabezados `##` o menores: el `#` lo pone el motor.

Además, en cada turno:

- Las herramientas de cada servidor se identifican por **la conexión que las creó**, no por su prefijo.
- `08` se aplica a esas herramientas.
- A todas se les aplica el bloqueo de llamadas repetidas y el cierre del turno con una respuesta al usuario.

## La precarga: lo que el agente recibe sin decidirlo

Todo el contexto que el motor trae por su cuenta, antes del turno, vive en un solo lugar:
`src/modules/context/application/preload.service.ts`. Corre por servidor, en fases con orden fijo
(`PRELOAD_PHASES`), y su resultado va en `# <Servidor> · data`:

| Fase | Qué trae | Caché | Se activa con |
| --- | --- | --- | --- |
| 1 · catalog | El catálogo de datos (06): los datasets de `PRELOAD`, leídos con las herramientas del propio servidor; de paso revisa el vocabulario (03) contra lo que leyó | 10 min por cliente, servidor y usuario (`context_cache.service.ts`) | Tener `06_preload_data_catalog.ts` |
| 2 · retrieval | Documentos de su base de conocimiento (05) para el mensaje del usuario (RAG determinista) | No, porque depende del mensaje | `preload: { enabled: true }` en `05_knowledge_base.ts`, con documentos `available`. Hoy está apagado en todos |

Si una fase falla, no aporta nada y el turno sigue: el agente puede llegar a lo mismo con sus herramientas. Para
agregar otro tipo de precarga, se agrega una fase en `PRELOAD_PHASES`, no en otro lugar.

## Agregar un dominio (ejemplo: PMS, con un subdominio y su base de conocimiento)

Un servidor sin dominio de conocimiento no puede conectarse: la conexión se rechaza.

1. El servidor debe existir en `ServerAdapters` y tener sus herramientas registradas en `src/modules/tools`. Eso es
   parte de conectar el servidor, no del conocimiento. Para que use su base de conocimiento, sus permisos de cliente
   deben incluir `search_knowledge`.
2. Crea `src/knowledge/PMS/` copiando PAY:
   - `00_server/00_server.ts`: `serverName: 'pms_api'`, `domain: 'pms'`, `label: 'PMS'`, `toolPrefix: ''`.
   - `01_playbook/01_playbook.ts`: lo común.
   - `05_knowledge_base/05_knowledge_base.ts`: `namespace: 'PMS'`, `searchTool: 'PMS__search_knowledge'`, sus temas.
   - `<subdominio>/`: al menos uno, con su sección de playbook.
   - `index.ts`: `defineDomainWithSubdomains({ shared, subdomains })`.
3. Regístralo en `src/knowledge/index.ts` y permite sus subdominios al cliente en `authorization.interface.ts`.
4. Arranca el servidor: el log reporta lo que falta (`Knowledge pack 'pms/…' is incomplete: …`).

## Equilibrio entre control y libertad

- **El playbook describe requisitos y reglas, no pasos.** El agente decide qué necesita cada pedido.
- **Lo determinista (08, 09) solo frena lo que no debe pasar**: una acción destructiva sin confirmar, búsquedas
  sin fin. Si una regla obliga al agente a seguir un orden, va en contra de esta convención.
- **Una sola fuente por hecho**:
  - reglas → `01`;
  - uso de cada herramienta → su descripción;
  - datos → `06` y el propio servidor;
  - significados → `03` / `04`;
  - conceptos → la base de conocimiento (`05`);
  - estado → `07`.

## Cerrar una brecha de conocimiento

El servidor registra en los logs:

- `KNOWLEDGE_SHORTAGE`: una búsqueda no encontró nada (con el servidor, el namespace y la consulta), o un turno se cerró
  sin resolver lo que pidió el usuario (con su mensaje).
- `VOCABULARY_DRIFT`: una entrada de `03_vocabulary` apunta a algo que el servidor ya no tiene. Es un solo aviso por
  reconstrucción del catálogo, con todas las entradas.
- `The vocabulary of '…' points to data this user cannot see`: no es un error del vocabulario sino de acceso; hay que
  revisar los permisos del usuario en el servidor.

| Síntoma | Dónde se corrige |
| --- | --- |
| No entiende un término del usuario, o lo confunde | `03_vocabulary.ts` |
| Un término tiene dos lecturas y debería preguntar | `03_vocabulary.ts`, con los dos destinos en `refersTo` |
| Un dato se muestra con nombre técnico o se interpreta mal | Primero en el propio servidor (`verbose_name` / `description`); si no se puede, en `04_tool_glossary.ts` |
| Un valor técnico (tipo de gráfico, nombre de dashboard) aparece en la respuesta | `04_tool_glossary.ts` |
| Falta una explicación, un concepto o un proceso | Un documento en `docs/<SERVIDOR>/`, su ingesta en el namespace y su entrada en `05_knowledge_base.ts` |
| Una pregunta que un documento sí responde no lo hace buscar | El `covers` de ese documento en `05_knowledge_base.ts` |
| Algo cambió de nombre (`VOCABULARY_DRIFT`) | El nombre en `03_vocabulary.ts` |
| El agente no tiene en cuenta algo que el cliente envía | `07_client_state/` (`ClientState` en `interfaces.ts` + `renderStateBlock`) |
| El agente hace algo que no debe, o no hace algo que debe | `01_playbook.ts` (o `08_tool_policy.ts`, si debe ser una regla dura) |

**Reglas de redacción:**

- Las claves van exactamente como las escribe el servidor (`table_name`, `column_name`, `metric_name`).
- Los términos del vocabulario van en minúscula, como los diría un usuario.
- Cada significado debe ser corto y verificable. No escribas uno que no esté confirmado: el agente lo tomará como
  cierto.
