# Llevar el gestor de paneles a otra plataforma

## 0. Para qué sirve este documento

Es una guía para el equipo de ingeniería. Dice qué hay que crear, configurar o cambiar, y en qué orden, para que otra plataforma use el gestor de paneles desde Metbot. El ejemplo es VOA: otro producto, con su propio frontend y sus propios usuarios, y con muchos más datasets que PAY.

La sección [[5]](#5-qué-decide-lo-que-el-agente-entiende-que-se-puede-y-no-se-puede-cambiar) resume qué piezas deciden lo que el agente entiende que se puede y no se puede cambiar en un gráfico, y cuáles cambian con la plataforma.

Las rutas son las del código al 2026-10-15. Lo que no se pudo verificar está en la sección [[7]](#7-sin-verificar).

## 1. Qué es común y qué es propio de cada plataforma

El gestor de paneles funciona igual en cualquier plataforma: mismas herramientas, mismas reglas, mismos modos. Lo que cambia es **con qué cuenta** trabaja el agente y **qué datos** conoce.

| Común a todas (no se toca) | Propio de cada plataforma |
|---|---|
| Las herramientas del gestor (`src/modules/tools/infrastructure/tools/superset/`), el guard de cambios y la API REST (`src/modules/api`). | La cuenta de Superset del agente: qué datasets y dashboards ve, y qué gráficos puede editar (solo los que son de esa cuenta). |
| El playbook común (`SCOPE`, `RESOLVING`, `MATCHING_A_CHANGE`, `REMOVE_OR_DELETE`, `RULES`), los modos Avanzado y Guiado, y las reglas de herramientas (`08`). | Los datasets precargados (`06`), el vocabulario de negocio (`03`) y las etiquetas de columnas y nombres conocidos (`04`). |
| El contrato con el frontend: eventos, sugerencias y estado (`07`). | La base de conocimiento (`05`): sus documentos y su namespace. |
| | El cliente (`appClientId`), su API de usuarios, su prefijo de nombres (`domain`) y su frontend. |

En el árbol de conocimiento (ADR-002), una plataforma es un **subdominio** de SUPERSET: `superset.voa`, hermano de `general` (que hoy es el de PAY), con sus modos `advance` y `guided`. El motor no cambia.

## 2. Decisiones antes de empezar

| Decisión | Opciones | Recomendación |
|---|---|---|
| Cuenta de Superset | Reusar la de PAY (`MET_BOT_PAY`) o una cuenta de servicio propia de VOA. | **Cuenta propia.** Con la compartida, VOA ve y puede cambiar lo de PAY, y al revés: hoy el aislamiento depende solo de lo que ve la cuenta. |
| Cómo se validan los usuarios de VOA | Su propia API con JWT (un adapter nuevo) o la API de PAY. | Depende de VOA ([[3]](#3-paso-a-paso), paso 3). |
| Base de conocimiento | Namespace propio (por ejemplo `SUPERSET_VOA`) o el compartido (`SUPERSET`). | Propio si VOA tiene documentos que PAY no debe ver: la búsqueda consulta todo el namespace. |
| Datasets precargados | Cuáles se muestran completos en cada mensaje. | Los 2 o 3 que se usan casi siempre; el resto se busca ([[4]](#4-cuando-los-datasets-son-muchos)). |
| Nombre del subdominio de PAY | Dejar `general` o renombrarlo a `pay`. | Renombrarlo deja el árbol más claro, pero cambia lo que envía el frontend de PAY (`subdomains`): hacerlo coordinado o no hacerlo. |

## 3. Paso a paso

### Paso 1 · Superset

1. Crear la cuenta de servicio de VOA, con permisos solo sobre sus datasets y dashboards.
2. Comprobar que el servidor responda en `/health` y en el endpoint del MCP (`/mcp_remote/mcp`): sin `/health`, la conexión se rechaza.
3. En los dashboards de VOA donde el agente vaya a quitar gráficos, renombrar o publicar, esa cuenta debe ser dueña: el gestor solo deja editar a los dueños. Los gráficos que cree el agente quedan a nombre de la cuenta.

### Paso 2 · Base de datos de Metbot (configuración, sin código)

Las entidades están en `src/entities/`.

1. **`CLIENT`:** el cliente VOA. Su `id` es el `appClientId` que enviará su frontend; además `name`, `botName` y `serverName` (su API de usuarios, paso 3).
2. **Superset, con cuenta propia:**
   - `SERVER`: `serverName: 'superset_mcp'`, la URL de Superset y el `transport`;
   - `SERVER_AUTH`: `serverType: 'mcp'`, `authType: 'oauth'`;
   - `OAUTH_MCP_AUTH`: `schema: 'OauthMcpToolValidator'`, `mcpEndpoint: '/mcp_remote/mcp'`, `authEndpoint: '/api/v1/security/login'`, `refreshEndpoint: '/api/v1/security/refresh'`, y el `username` y la contraseña de la cuenta del paso 1.

   El `username` debe ser exactamente el usuario que Superset muestra como dueño: con él se decide qué gráficos puede editar el agente. Si queda vacío, el agente solo puede reconstruir gráficos completos, y el log de `ApiOrchestratorService` lo avisa.

   La contraseña no va en el seed ni en el repositorio. El seed actual (`src/migrations/seeds/initial_seed.ts`) tiene credenciales en texto plano: no repetir ese patrón con VOA.
3. **`CLIENT_SERVER`:** el vínculo de VOA con ese `SERVER`. Un cliente tiene un solo servidor por `serverName` (`AdminService.getServerListByClient`).

Con la cuenta compartida, el punto 2 no se crea: basta el vínculo `CLIENT_SERVER` con el `SERVER` de PAY.

### Paso 3 · La API de usuarios de VOA

Al conectar, `WsAuthGuard` (`src/shared/middlewares/auth.middleware.ts`) valida al usuario con la API "de casa" del cliente (`CLIENT.serverName`). Esa API debe:
- ser un servidor API con JWT;
- estar entre los `scopes` que pide el frontend;
- devolver el perfil del usuario (`getUserProfile`; en PAY, `POST /user/current`) con el mismo `userId`.

**Si VOA tiene su propia API**, hay que crear:
1. un valor nuevo en `ServerAdapters` (`src/entities/server.entity.ts`), por ejemplo `voa_api`;
2. un adapter de autenticación con `checkHealth` y `getUserProfile`, registrado en `src/modules/auth` como el de PAY;
3. su esquema en `getServerAuthSchema` y sus permisos en `getClientServerPermissions` (`authorization.interface.ts`);
4. un dominio de conocimiento `src/knowledge/VOA/`, registrado en `src/knowledge/index.ts`: cada scope necesita el suyo (`knowledge_request.ts`). Puede ser mínimo, como el de PAY;
5. sus filas `SERVER`, `SERVER_AUTH`, `JWT_API_AUTH` y `CLIENT_SERVER`.

**Si sus usuarios se validan con la API de PAY**, basta con `CLIENT.serverName = 'pay_api'` y el vínculo a ese servidor.

### Paso 4 · Permisos por cliente (código)

`getClientServerPermissions(_clientId)` y `getUserServerPermissions(_userId)` (`authorization.interface.ts`) **ignoran su argumento**: hoy cualquier cliente puede pedir cualquier subdominio y cualquier modo. Para VOA:
1. agregar `{ name: 'voa', modes: ['advance', 'guided'] }` a los `subdomains` de `superset_mcp`;
2. hacer que los permisos dependan del `clientId`, para que PAY solo pueda pedir `general` y VOA solo `voa`. Sin esto, el aislamiento entre plataformas queda solo en la cuenta de Superset.

### Paso 5 · El subdominio `voa` (conocimiento)

Estructura recomendada:

```text
SUPERSET/
  00_server/ 04_tool_glossary/ 07_client_state/   dominio: igual para todas las plataformas
  common/                                          lo que hoy está en general/ y no es de PAY: el 01 común, 08, 09,
                                                   y advance/ y guided/ (sus 01, 02 y el 08 y 09 de guided)
  general/   (PAY)                                 03, 05, 06 y el index.ts de cada modo
  voa/                                             03, 05, 06, un 08 propio si hace falta, y el index.ts de cada modo
```

Hoy las piezas comunes viven en `general/`. Con un segundo subdominio conviene moverlas a una carpeta del dominio (`common/`, nombre a decidir) para que `general` y `voa` las importen igual. Es mover archivos y ajustar imports, sin cambiar lógica. La alternativa mínima es que `voa` las importe desde `general/`.

Archivos de `voa/`:
1. **`03_vocabulary/03_vocabulary.ts`:** los términos de negocio de VOA. Cada `source` es el `table_name` de un dataset precargado; solo esos se verifican (si cambian, el log muestra `VOCABULARY_DRIFT`).
2. **`05_knowledge_base/05_knowledge_base.ts`:** el namespace ([[2]](#2-decisiones-antes-de-empezar)) y los `topics`, cada uno `planned` hasta que se ingeste.
3. **`06_preload_data_catalog/06_preload_data_catalog.ts`:** el `PRELOAD.datasets` de VOA. Necesita el cambio de código del paso 6.
4. **`08_tool_policy/` (opcional):** solo su `TOOL_LIMITS`, si VOA necesita más búsquedas por mensaje (hoy `list_datasets` admite 2). La regla del dashboard seleccionado sigue en el `08` común.
5. **`advance/index.ts` y `guided/index.ts`:** `definePack` igual a los de `general`, con los `03`, `05`, `06` (y `08`) de VOA y su `mode` (`label`, `description`).
6. **Registro** en `SUPERSET/index.ts`: `subdomains: { general: { … }, voa: { advance: …, guided: … } }`.

Una conexión usa un solo subdominio de SUPERSET (`packFor`): VOA pide `superset.voa`.

### Paso 6 · Código a ajustar

1. **Catálogo (`06`) reutilizable.** `buildDataCatalog` lee el `PRELOAD` de su propio archivo. Hay que convertirlo en una fábrica (por ejemplo `createCatalog(preload)`) que cada subdominio llame con su lista.
2. **Catálogo con muchos datasets.** Hoy hace una sola consulta `list_datasets` de hasta 100 y busca ahí los precargados. Si la cuenta ve más de 100 datasets, un precargado que no salga en esa página se pierde sin aviso. Hay que pedir solo los precargados: `filters: [{ col: 'table_name', opr: 'in', value: PRELOAD.datasets }]` (el validador ya lo admite). Con VOA es necesario.
3. **Glosario (`04`).** Es del dominio porque lo leen las herramientas. Se agregan ahí:
   - las etiquetas de columnas de los datasets de VOA (`DATASET_COLUMN_GLOSSARIES`, por `table_name`);
   - sus nombres conocidos (`table_name`, `datasource_name`, `dashboard_title`, `slice_names`).

   Las etiquetas de columnas también se aplican a los datasets que no se precargan (`get_dataset_info`). Así se dan nombres de negocio a muchos datasets sin cargarlos en cada mensaje. Hay que cuidar que dos plataformas no usen el mismo `table_name` con significados distintos.
4. **Ejemplos de PAY en el playbook de Guiado** (`guided/01_playbook.ts`: el ejemplo de nombres con `ACCOUNT_MOVEMENTS_VIEW` y el glosario de términos). Son ejemplos de formato, pero conviene volverlos neutros para que el agente de VOA no los tome como datos suyos.
5. **Zona horaria** (`identity.prompt.ts`, `UTC_OFFSET_HOURS = -5`): solo si VOA opera fuera de Colombia.
6. **Pruebas:**
   - `define_pack.spec.ts`: `modesBySubdomain` incluye `voa`;
   - `knowledge_request.spec.ts`: VOA pide `superset.voa`, y pedir `general` se rechaza (con el paso 4);
   - los specs del catálogo de VOA.

### Paso 7 · Base de conocimiento y documentación

1. Escribir los documentos de VOA en `docs/SUPERSET/KNOWLEDGE/` e ingestarlos en el namespace elegido (la ingesta se hace fuera de este repositorio).
2. Si el namespace es propio, ingestar también `KNOWLEDGE/SUPERSET_METHODOLOGY.md`: es el que responde qué se puede y qué no se puede hacer.
3. Pasar cada `topic` a `available` cuando esté ingestado. La búsqueda solo se ofrece con al menos un tema disponible y con el permiso `search_knowledge` del cliente.
4. Actualizar:
   - `src/knowledge/README.md`: la receta para agregar un subdominio al gestor de paneles;
   - `FRONTEND_CONTRACT.md`: el subdominio `voa`;
   - ADR-002, si se crea la carpeta `common/`.

### Paso 8 · Frontend de VOA (contrato completo en `FRONTEND_CONTRACT.md`)

1. **Conectar** a `/chat/main` con `auth`:
   - `appClientId` de VOA;
   - `scopes`: `superset_mcp` más su API de usuarios;
   - `subdomains`: `superset.voa` más los de su API;
   - `modes`: `superset.advance.guided`;
   - `Authorization`: el JWT del usuario.
2. **Mostrar los modos** que llegan en `mcp/Agent/providers` (`id`, `label`, `description`) y enviar `mode` en cada mensaje.
3. **Enviar en cada mensaje `stateContext.SUPERSET`:**
   - `domain: 'VOA'`: los nombres que crea el agente llevan `[METBOT - VOA]`;
   - `location`: el dashboard seleccionado;
   - `events`: los eventos recibidos.
4. **Atender `mcp/Agent/custom`:**
   - refrescar la vista después de cada cambio, sin ejecutar nada: el servidor ya lo hizo;
   - mostrar las sugerencias como botones (hasta 3);
   - devolver los eventos en `events`.

### Paso 9 · Verificación

| Qué | Cómo se comprueba |
|---|---|
| Conexión | VOA conecta con `superset.voa`; pedir `superset.general` se rechaza (con el paso 4). |
| Catálogo | El primer mensaje trae los datasets precargados de VOA; el log no muestra `VOCABULARY_DRIFT`. |
| Muchos datasets | Con más de 100 datasets visibles, los precargados siguen apareciendo; un dataset no precargado se encuentra con `list_datasets`. |
| Prefijo | Un gráfico creado lleva `[METBOT - VOA]`. |
| Cambios | En un gráfico creado por el agente, `_update_support` lista lo editable; en uno de otros usuarios, dice que no se puede. |
| Base de conocimiento | "¿Qué se puede cambiar de un gráfico?" se responde con la metodología. |
| Conversación | Las pruebas de `SUPERSET_CHART_LIMITS.md` [[6]](SUPERSET_CHART_LIMITS.md#6-pruebas-de-conversación) y `SUPERSET_GUIDED_MODE.md`, con datos de VOA. |

## 4. Cuando los datasets son muchos

El agente conoce los datos de tres formas:
1. **Precargados (`06`):** se muestran completos en cada mensaje, con columnas, métricas y etiquetas. Cada uno ocupa contexto en todos los mensajes; con más de unos tres, el código pide cargar solo los que el pedido necesite, y eso todavía no está construido.
2. **Buscados:** los demás los encuentra con `list_datasets` (2 veces por mensaje) y los lee con `get_dataset_info` (sin límite). Las etiquetas de columnas del `04` se aplican igual.
3. **Vocabulario (`03`):** traduce las palabras de los usuarios a métricas y columnas. Solo se verifica contra los datasets precargados.

Para VOA:
- precargar los 2 o 3 datasets centrales;
- dar etiquetas de columnas (`04`) a los demás;
- poner en el vocabulario los términos que más se repiten;
- subir el límite de `list_datasets` en su `08` si en las pruebas se queda corto.

## 5. Qué decide lo que el agente entiende que se puede y no se puede cambiar

| Pieza | Dónde | Qué le dice al agente | ¿Lo garantiza el código? | ¿Cambia con la plataforma? |
|---|---|---|---|---|
| Alcance (`SCOPE`) | `general/01_playbook` | Qué tipos de gráfico se crean y se cambian, y qué nunca se hace (crear dashboards, mover el layout, SQL libre). | No, es instrucción. | No |
| `_update_support` | `get_chart_info` → `describeUpdateSupport` (`form_data.guard.ts`), con el mapa de `editable_controls.ts` | Para ese gráfico: si se puede cambiar o por qué no (tipo no soportado, es de otros usuarios, se perderían ajustes). Si se puede: la lista de opciones editables con su descripción (`hint`) y de qué depende cada una (`shownWhen`), y si se puede cambiar de tipo. | Sí: sale del mapa de controles. | **Sí, por la cuenta:** un gráfico solo es editable si su dueño es la cuenta de la plataforma (`oauthMcpAuth.username`). |
| Regla de coincidencia (`MATCHING_A_CHANGE`) | `general/01_playbook` | Cómo pasar de las palabras del usuario a una opción: una → la cambia; dos → pregunta; ninguna → dice que no y ofrece la más cercana. Además, "etiquetas" y las opciones que dependen de otra. | No | No |
| Quitar o eliminar (`REMOVE_OR_DELETE`) | `general/01_playbook` | Cuándo `permanent` es `true` o `false`, según las palabras del usuario. | No | No |
| Guard (`checkChanges`) | `form_data.guard.ts` | Rechaza opciones fuera de la lista, valores inválidos, columnas o métricas que no existen, filtros SQL y cambios que no se verían. | Sí | No |
| Reconstrucción (`assessSavedChart`) | `form_data.guard.ts` | Cambio de tipo de gráfico solo si no se pierde nada. | Sí | No |
| Descripciones de herramientas | `update_chart`, `delete_chart`, `update_dashboard` | Para qué sirve cada parámetro y cómo leer `NOT UPDATED` y `NOT DONE`. | No | No |
| Reglas de herramientas (`08`) | `general/08_tool_policy`, `guided/08_tool_policy` | Solo se cambia el dashboard seleccionado; en Guiado, revisión antes de escribir en el primer mensaje. | Sí | No |
| Datos: vocabulario (`03`), catálogo (`06`), glosario (`04`) | Subdominio y dominio | Qué métrica o columna nombra el usuario en un cambio de datos ("agrega la métrica ventas"). | El guard comprueba que exista. | **Sí** |
| Metodología (RAG) | `KNOWLEDGE/SUPERSET_METHODOLOGY.md` [[6]](KNOWLEDGE/SUPERSET_METHODOLOGY.md#6-qué-se-puede-cambiar-de-un-gráfico-existente-y-por-qué-a-veces-no-se-puede) | Preguntas generales ("¿se pueden cambiar los colores?") antes de leer un gráfico. | No | Solo el namespace |

**Conclusión:** lo que se puede cambiar de un gráfico no depende de la plataforma. Lo deciden las reglas de Superset, copiadas en el guard. La plataforma influye solo en dos cosas:
- **la cuenta:** qué gráficos son editables;
- **los datos:** cómo se resuelven los nombres que pide el usuario.

**Dónde ajustar cuando el agente se equivoca** (igual en todas las plataformas):

| Síntoma | Pieza |
|---|---|
| Confunde dos opciones ("título del eje X" con la leyenda) | El `hint` de las dos en `EDITABLE_CONTROLS` (`editable_controls.ts`). |
| Una ambigüedad que aparece en cualquier gráfico | `MATCHING_A_CHANGE` (`general/01_playbook`). |
| No reconoce el nombre de una métrica o columna | El `03_vocabulary` de la plataforma, o la etiqueta en el `04`. |
| Guarda un cambio que no se ve | El `shownWhen` del control (`SUPERSET_CHART_LIMITS.md` [[5]](SUPERSET_CHART_LIMITS.md#5-cómo-hacer-editable-una-opción-más-para-desarrolladores)). |
| Falta una opción que el gestor sí tiene | Agregarla al mapa de controles (`SUPERSET_CHART_LIMITS.md` [[5]](SUPERSET_CHART_LIMITS.md#5-cómo-hacer-editable-una-opción-más-para-desarrolladores)). |
| Responde mal qué se puede hacer, sin haber leído un gráfico | `KNOWLEDGE/SUPERSET_METHODOLOGY.md` [[6]](KNOWLEDGE/SUPERSET_METHODOLOGY.md#6-qué-se-puede-cambiar-de-un-gráfico-existente-y-por-qué-a-veces-no-se-puede), y volver a ingestarlo. |

## 6. Riesgos

| Riesgo | Efecto | Qué hacer |
|---|---|---|
| Cuenta de Superset compartida | Una plataforma ve y cambia lo de la otra. | Cuenta propia ([[2]](#2-decisiones-antes-de-empezar)). |
| Permisos que no dependen del cliente | Cualquier cliente puede pedir cualquier subdominio. | Paso 4. |
| El frontend envía `domain` como texto libre | El prefijo de los nombres se puede falsear. | Decidir si el servidor lo fija por cliente (decisión de producto). |
| Ningún dashboard seleccionado | Quitar, eliminar, agregar o renombrar se permite en cualquier dashboard de la cuenta. | Que el frontend envíe siempre `location` en las vistas de dashboard. |
| Catálogo de una sola página | Datasets precargados que desaparecen sin aviso. | Paso 6, punto 2. |
| Caché del catálogo en memoria | No se comparte entre instancias ni se limpia. | Aceptable con una sola instancia; revisar al escalar. |
| Credenciales en el seed | Filtración. | Sacarlas del repositorio y no repetirlo con VOA. |

## 7. Sin verificar

- Si los usuarios de VOA se pueden validar con la API de PAY (`/user/current`).
- Cómo el MCP de Superset asigna permisos al token (se asume que son los de la cuenta).
- El orden por defecto de `list_datasets`.
- La API de ingesta del RAG y su convención de namespaces.
- La zona horaria de VOA.
