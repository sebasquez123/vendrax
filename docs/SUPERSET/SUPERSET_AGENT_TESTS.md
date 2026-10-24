# Pruebas del agente con LLM real (circuitos)

Prueba preventiva que se corre desde la terminal, con el motor común de [tests/README.md](../../tests/README.md) (menú, variables, conexión por el gateway real, juez y reportes). Aquí está lo propio de SUPERSET: conversa con el agente real sobre gráficos de prueba en Superset QA. Cada **circuito** crea un gráfico, lo cambia, lo estropea, pide que lo arreglen y lo borra:

- **Verificación determinista:** después de cada mensaje se lee en Superset lo que quedó guardado. Debe haber cambiado lo pedido y nada más.
- **Juez LLM:** valora la respuesta del agente de 0 a 100 % (si hizo lo esperado, si lo que dice coincide con lo que pasó, si es concisa y clara). Lee el paso, el recorrido del turno, lo verificado, el historial del circuito (resumido sin modelo, una línea por paso, incluidos los daños que hizo la prueba) y qué significa cada opción del gestor que el paso tocó (el mismo texto que lee el agente). Marca "Falla externa:" cuando lo esperado no ocurrió por un timeout o un error del servidor. Solo informa: nunca hace fallar la prueba.
- **Al final** se calculan la confiabilidad (pasos verificados, promedio del juez y, al repetir, estabilidad), se escribe el resumen del juez y se genera un reporte `.md` en `tests/SUPERSET/reports/`.

## 1. Preparar (una vez)

1. **Dashboard sandbox en QA.** Su dueño debe ser la cuenta del agente (`MET_BOT_PAY`) y su título debe contener "E2E". Los circuitos solo escriben ahí, y la prueba se detiene si el título no lo dice.
2. **En tu `.env`:**
   - **el cliente y el modelo:** `CLIENT_TEST_*`, con el ejemplo de [tests/README.md](../../tests/README.md). Sus `scopes` deben conceder `superset_mcp`; para el circuito Guiado, `modes` debe incluir `guided`;
   - **los ajustes de SUPERSET**, que la prueba sí revisa al preparar la corrida.

   No van en `.env.example`, porque `config.ts` exige todas sus claves.

   | Variable                          | Qué es                                                                                                                                                                                                                                                                |             |
   | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
   | `SUPERSET_TEST_DASHBOARD_ID`      | El id del dashboard sandbox.                                                                                                                                                                                                                                          | Obligatoria |
   | `SUPERSET_TEST_BASE_DASHBOARD_ID` | El dashboard con los gráficos base que crea el desarrollador (tabla dinámica, mapa de calor, combinado y embudo). Sin ella, sus circuitos se omiten y la corrida lo dice. Cómo armarlos: [tests/SUPERSET/README.md](../../tests/SUPERSET/README.md), "Gráficos base". | Opcional    |

   El modelo (`CLIENT_TEST_MODEL`) es común a todos los servicios. Nunca subas el token a git ni lo pegues en un chat; la terminal y el reporte no lo muestran.

3. **Datos de prueba:** cada circuito escribe sus propios datos, como los diría un usuario: su dataset (`dataset`) y los nombres reales de sus métricas y columnas. Los circuitos se reparten entre los tres datasets que el agente tiene precargados (`ACCOUNT_MOVEMENTS_VIEW`, `VIEW_ACTIVITY_SUPERVISION_LOGS` y `VIEW_CONTRACT_BALANCE_HISTORY`). Antes de escribir nada, la prueba comprueba que cada nombre exista en su dataset. [tests/SUPERSET/fixtures.ts](../../tests/SUPERSET/fixtures.ts) solo guarda cómo se arma cada gráfico base (`BASE_CHARTS`) y cómo se prepara un gráfico "de producción".
4. **Gráficos base (opcional, intervención del desarrollador):** solo para los circuitos de tabla dinámica, mapa de calor, combinado y embudo, que el MCP no crea. Se crean a mano una vez en un segundo dashboard sandbox, como indica [tests/SUPERSET/README.md](../../tests/SUPERSET/README.md). La prueba los encuentra por su tipo, guarda su configuración al empezar cada circuito y la restaura al terminar (también con Ctrl+C); nunca los borra.

## 2. Correr

```bash
npm run test:agent                                     # menú: SUPERSET → catálogo → qué correr → repeticiones
npm run test:agent:superset                            # todos los grupos, sin menú
npm run test:agent:superset -- bars                    # uno o varios grupos, por nombre
npm run test:agent:superset -- --circuit bars-2        # solo ese circuito, por su id (varios: bars-1,bars-2)
npm run test:agent:superset -- bars --repeat 3         # cada circuito 3 veces, para ver su estabilidad
npm run test:agent:superset -- --list                  # los grupos y circuitos, sin correr nada
npm run test:agent:superset:productive                 # las pruebas productivas (mismas opciones)
```

La corrida va en este orden y se detiene en el primer problema, diciendo cuál:

1. **Handshake:** qué campos se envían (sin valores) y la API key del proveedor.
2. **Conexión como el cliente real:** el gateway y el guard reales deciden; si fallan, se muestra lo que recibió el socket (`mcp/Agent/error`).
3. **Preparación de SUPERSET:** sus ajustes, la conexión al gestor, el sandbox, los datos de prueba y los gráficos base.
4. **Circuitos:** grupo por grupo.
5. **Cierre:** limpieza, confiabilidad, resumen del juez y reportes.

```
Pruebas del agente · SUPERSET · gestor de paneles · Circuitos
  Handshake: appClientId, userId, Authorization, scopes, subdomains, modes
  Modelo del agente y del juez: gemini · gemini-…
  Conexión establecida  ✓ aceptada (modos: ["advance","guided"]) (9 s)
  ✓ SUPERSET_TEST_DASHBOARD_ID
  Preparación de SUPERSET · gestor de paneles  ✓ sandbox "E2E" (id 154) · ACCOUNT_MOVEMENTS_VIEW, VIEW_ACTIVITY_SUPERVISION_LOGS, VIEW_CONTRACT_BALANCE_HISTORY (4 s)

▶ bars · 2 circuito(s)

  Barras · 1 parámetro (bars-1 · 1/2)
    [1/5] crear      ✓ creado (id 3620) · juez 100 % cumple (41 s)
    [2/5] modificar  ⠋ 12 s
```

Al terminar se muestran la confiabilidad por grupo, la limpieza y el resumen del juez. Los reportes quedan en `tests/SUPERSET/reports/`, fuera de git:

- **Uno por circuito, con su id** (`bars-1.md` y `bars-1.json`), que se sobrescribe en cada corrida de ese circuito. Si hay repeticiones, van juntas.
- **El resumen de la última corrida** (`_current_run.md` y `_current_run.json`), que también se sobrescribe.

Cada formato tiene un lector distinto:

| Archivo           | Para                                            | Qué tiene                                                                                                                                                                                                                 |
| ----------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `_current_run.md` | Una persona, primero                            | Pasos a revisar (una línea cada uno), confiabilidad, expectativas sin respaldo, resumen del juez, enlaces a cada circuito y **dónde mirar** en el código.                                                                 |
| `<id>.md`         | Una persona                                     | Una tabla con todos los pasos (resultado y juez) y, solo de los pasos a revisar, el mensaje, lo esperado, el juez, las herramientas en una línea cada una y la respuesta.                                                 |
| `<id>.json`       | Corregir al agente (o un asistente que lo haga) | Cada turno completo: el contexto enviado, cada llamada con sus argumentos y su resultado (hasta 6000 caracteres), los eventos y la respuesta, más la configuración guardada del gráfico **antes y después** de cada paso. |

En el `.md`, argumentos y resultados se cortan a 160 caracteres. El recorrido sale de lo que el modelo recibió en su última llamada del turno. Lo registra la prueba al final de los middleware del agente, sin cambiar nada del turno.

**Código de salida:**

| Código | Cuándo                                      |
| ------ | ------------------------------------------- |
| `0`    | Todo chequeo determinista pasó.             |
| `1`    | Alguno falló, o la corrida no pudo empezar. |
| `130`  | Se interrumpió con Ctrl+C.                  |

Con Ctrl+C se borran los gráficos creados hasta ese momento. El del paso en curso puede quedar en el sandbox, así que revísalo. El juez nunca cambia el código de salida.

## 3. Agregar circuitos

Una prueba es una conversación escrita como la tendría un usuario: lo que dice en cada mensaje y lo que debe quedar guardado en Superset. Se escribe con los nombres reales de los datos, en el mismo lugar, sin depender de otro archivo.

Un **grupo** es un archivo `tests/SUPERSET/circuits/no-productive/<grupo>.ts` que exporta `group('<grupo>', [...])` y se lista en [circuits/no-productive/index.ts](../../tests/SUPERSET/circuits/no-productive/index.ts). Cada circuito es una conversación nueva, en el modo Avanzado salvo que diga `mode: 'guided'`.

```ts
export const BARS = group('bars', [
  {
    id: 'bars-1', // corto, estable y único: lo usan --circuit y el reporte
    name: 'Barras · 1 parámetro',
    dataset: 'ACCOUNT_MOVEMENTS_VIEW', // de donde salen las métricas y columnas que nombra
    steps: [
      ask('crear', 'Crea un gráfico de barras con Total ventas por mes usando DATE_TIME, llámalo "E2E barras 1" y agrégalo a este dashboard', {
        outcome: 'created',
        changes: { viz_type: 'echarts_timeseries_bar', x_axis: 'DATE_TIME', metrics: hasMetric('Total ventas') },
        expected: 'Crea el gráfico, lo agrega al dashboard y lo confirma, sin preguntar nada.',
      }),
      ask('modificar', 'Ponle título al eje Y: Ventas', {
        outcome: 'applied',
        changes: { y_axis_title: 'Ventas' },
        allowAlso: ['y_axis_title_margin'],
        expected: 'Pone "Ventas" como título del eje Y y lo confirma.',
      }),
      breakChart('estropear', { show_legend: false }),
      ask('arreglar', 'No se ve la leyenda del gráfico, ¿la puedes mostrar?', {
        outcome: 'applied',
        changes: { show_legend: true },
        expected: 'Vuelve a mostrar la leyenda y lo confirma.',
      }),
      ask('eliminar', 'Bórralo definitivamente', { outcome: 'deleted', expected: 'Lo borra y avisa que no se puede deshacer.' }),
    ],
  },
]);
```

**Los pasos:**

| Paso                                  | Qué hace                                                                                                                                                                                                                                                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ask(etiqueta, mensaje, expectativa)` | Un mensaje del usuario al agente. La expectativa dice qué debe quedar en Superset (`outcome`, `changes`) y qué debe responder (`expected`).                                                                                                                                                                  |
| `breakChart(etiqueta, daño)`          | La prueba daña el gráfico por REST, como si alguien lo editara mal en Superset; en el mensaje siguiente el usuario describe el síntoma. El daño son claves (`{ show_legend: false }`) o una función que las calcula desde la configuración guardada (por ejemplo, agregar un filtro sin quitar los que hay). |
| `prepareChart(etiqueta, producción)`  | La prueba deja el gráfico como uno de producción, con lo que el agente no crea, para probar cambios que deben conservarlo: `sqlMetrics: [{ label, sql }]`, `sqlFilters: ['…']`, `timeRange: { column, range }` y `set: { … }` para cualquier otra opción (por ejemplo, una regla de formato).                |

`breakChart` y `prepareChart` no se juzgan; el juez lee en el historial qué hizo la prueba en cada uno.

**Los nombres:** en el mensaje, el nombre que usaría el usuario (por ejemplo, "Total Usado"); en `changes`, el nombre con que Superset guarda la métrica (el `metric_name`: `total_uso`). Los dos aparecen en `get_dataset_info`. Antes de correr, la prueba comprueba que cada métrica y columna de `changes` exista en el `dataset` del circuito; si no, se detiene y dice cuál. Las métricas con fórmula SQL que agrega un `prepareChart` cuentan como del circuito.

**`base: 'pivot' | 'heatmap' | 'mixed' | 'funnel'`** en un circuito lo hace trabajar sobre el gráfico base del desarrollador, en su dashboard, en lugar de crear uno. Un circuito así no puede tener pasos `created`, `removed` ni `deleted`; la corrida lo rechaza antes de empezar.

Los circuitos se reparten por las familias que el agente puede crear ([[2]](SUPERSET_CHART_LIMITS.md#2-lo-que-sí-se-puede-cambiar) de [SUPERSET_CHART_LIMITS.md](SUPERSET_CHART_LIMITS.md)), por lo que debe aclarar o rechazar ([[6]](SUPERSET_CHART_LIMITS.md#6-pruebas-de-conversación)) y por lo que no se puede hacer ([[3]](SUPERSET_CHART_LIMITS.md#3-lo-que-no-se-puede-cambiar), grupo `limits`). La lista está en [tests/SUPERSET/README.md](../../tests/SUPERSET/README.md).

| `outcome`     | Qué se comprueba en Superset                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------------- |
| `created`     | Se creó un gráfico (`generate_chart`), se agregó al sandbox y cumple `changes`. Pasa a ser el gráfico del circuito. |
| `applied`     | Se guardó (`update_chart`) con cada clave de `changes`, y nada más cambió salvo las de `allowAlso`.                 |
| `not_applied` | No escribió nada y el gráfico sigue igual.                                                                          |
| `asks`        | Lo mismo, y la respuesta pregunta algo.                                                                             |
| `removed`     | Salió del sandbox (`delete_chart` sin `permanent`) y sigue existiendo. La prueba lo borra al cerrar el circuito.    |
| `deleted`     | Se borró de forma definitiva (`delete_chart` con `permanent`) y ya no existe.                                       |

Las demás piezas de la expectativa:

- **Valores de `changes`:** un valor exacto, o un comparador de [checks.ts](../../tests/SUPERSET/harness/checks.ts) cuando el gestor guarda el valor de varias formas o el pedido admite varios:

  | Comparador                                               | Acepta                                                                                                          |
  | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
  | `hasMetric('Total ventas', …)`                           | Una lista de métricas que las incluye, guardadas por nombre o como objeto.                                      |
  | `metric('total_uso')`                                    | Una sola métrica (número clave, circular, orden de una tabla).                                                  |
  | `columns('DATE_TIME', …)`                                | Exactamente esas columnas, en cualquier orden.                                                                  |
  | `oneOf(a, b, …)`                                         | Cualquiera de esos valores ("muestra porcentajes": `percent` o `key_percent`).                                  |
  | `above(n)`, `below(n)`                                   | Un número mayor (o menor) que `n` ("agranda el hueco", "hazla más pequeña").                                    |
  | `matching(/regex/, 'descripción')`                       | Un texto que cumple el patrón (un formato, un CSS).                                                             |
  | `titled('…')`                                            | Un título que termina en ese texto (el agente agrega el prefijo del dominio).                                   |
  | `noFilterOn('SELLER')`, `timeRangeOn('DATE', anterior?)` | Filtros sin ninguno sobre esa columna; o con un rango de fechas sobre ella (distinto de `anterior`, si se da).  |
  | `anyTimeRange()`                                         | Filtros con un rango de fechas sobre cualquier columna, cuando el mensaje no dice cuál ("los últimos 30 días"). |
  | `hasSqlFilter('…')`                                      | Filtros que conservan ese filtro con fórmula SQL.                                                               |
  | `allOf(m1, m2, …)`                                       | Todos esos comparadores a la vez (un rango nuevo que conserva el filtro SQL).                                   |
  | `sortedBy('DATE_TIME', false)`                           | Una tabla fila por fila ordenada primero por esa columna (y en esa dirección, si se da).                        |
  | `formattingRule({ column, operator, … })`                | Un formato condicional con una regla que tiene esos campos.                                                     |

- **Título y descripción:** `changes` también puede nombrar `slice_name` y `description`, que Superset guarda fuera de la configuración; la prueba los lee junto con ella.
- **Valores por defecto:** se compara lo que el gráfico muestra. Una clave que nunca se guardó vale el valor por defecto del gestor (`byDefault` en `editable_controls.ts`), así que pedir "etiquetas por fuera" en una circular cumple aunque el agente no escriba `labels_outside: true`.
- **`expected`:** lo que el agente debería hacer o responder, en palabras. Es lo que el juez compara con la respuesta.

**La prueba no es la fuente de verdad.** La verdad es lo que el proyecto ya sabe:

- **Al modificar:** el guard, es decir, el mapa de controles de `editable_controls.ts`: qué opción existe para cada tipo y con qué valores.
- **Al crear:** lo que construye el `generate_chart` del MCP, según su esquema (`get_chart_type_schema`).

Antes de correr, y también con `--list`, [audit.ts](../../tests/SUPERSET/harness/audit.ts) contrasta cada expectativa estricta con esas fuentes:

- **Una clave sin respaldo** (una opción que el guard no lista, un valor que no acepta o algo que la creación por el MCP no fija con certeza) pasa a **observación**: se reporta como debilidad por confirmar y nunca cuenta como falla.
- **Un "no aplicado" que el guard sí permite** (`unsupported: { key, value? }`) deja el paso **sin respaldo**: se reporta, pero queda fuera de la confiabilidad y del código de salida hasta corregir el caso.
- **`observe`:** a mano, expectativas que se quieren mirar sin exigirlas.
- **El juez** trata lo esperado como una hipótesis. Si las herramientas muestran que no era posible y el agente actuó en consecuencia, su motivo empieza con "Expectativa dudosa:".

Antes de corregir al agente por un paso fallido, confirma la capacidad en el guard o en el MCP.

Si un paso `created` no crea el gráfico, el circuito se detiene. Cualquier otra falla deja seguir para recoger más datos.

## 4. Seguridad y limpieza

- **Antes de escribir,** la prueba comprueba las variables, la conexión (el token pasa por el guard real), el título "E2E" del sandbox y que cada métrica y columna de los circuitos exista en su dataset.
- **Solo se borra lo que creó la corrida:** cada gráfico creado (lo dicen los eventos `generate_chart`) se borra al terminar su circuito y otra vez al final de la corrida, si sigue existiendo.
  - Antes de borrarlo, la prueba lo quita del sandbox y del dashboard base, igual que hace la herramienta del agente: si solo se borrara, su lugar vacío quedaría en el dashboard.
  - Si no puede quitarlo de un dashboard, no lo borra y lo informa, para no dejar lugares vacíos.
- **Los gráficos base nunca se borran.** Son los que el desarrollador crea a mano en el dashboard base. La regla se aplica en dos puntos:
  - **Al definir un circuito:** un circuito sobre un gráfico base no puede crear el gráfico, quitarlo del dashboard ni borrarlo. Si lo intenta, el circuito no carga (`group` en `harness/circuit.ts`).
  - **Al limpiar:** la limpieza nunca borra un gráfico base, aunque su id apareciera entre los creados (`removeCharts` en `harness/superset.ts`).

  Al terminar el circuito, la configuración, el título y la descripción del gráfico base vuelven a como estaban al empezar. Si falla, se reintenta al final y el reporte lo marca en "Pasos a revisar".

- **Si algo queda,** el resultado lo dice ("quedaron los gráficos …"); bórralos a mano en el sandbox.

## 5. Archivos (`tests/SUPERSET/`)

El motor común (menú, conexión, juez, reportes, terminal) está en `tests/agent/` ([tests/README.md](../../tests/README.md)). Lo propio de SUPERSET:

| Archivo                   | Qué hace                                                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `README.md`               | Los circuitos disponibles, con su resultado esperado.                                                                                 |
| `service.ts`              | SUPERSET como servicio de prueba: sus catálogos, la preparación de la corrida, cómo corre cada circuito, la limpieza y "dónde mirar". |
| `fixtures.ts`             | Cómo se arma cada gráfico base (`BASE_CHARTS`) y cómo se prepara un gráfico "de producción" (`Production`).                           |
| `circuits/no-productive/` | Los grupos de circuitos.                                                                                                              |
| `circuits/productive/`    | Las pruebas productivas: un circuito por gráfico de los dashboards productivos de QA (crear y modificar), aparte del resto.           |
| `harness/runtime.ts`      | La conexión al gestor que dejó el guard, su API REST y las conversaciones con el `stateContext` de SUPERSET.                          |
| `harness/preflight.ts`    | Los ajustes de SUPERSET, el sandbox, los nombres de cada dataset y los gráficos base.                                                 |
| `harness/circuit.ts`      | Los pasos (`ask`, `breakChart`, `prepareChart`, `group`), el recorrido de un circuito y su verificación.                              |
| `harness/superset.ts`     | Lee, estropea, prepara, restaura y borra gráficos con el mismo adaptador REST del agente.                                             |
| `harness/checks.ts`       | Comparadores y diferencias de configuración.                                                                                          |
| `harness/audit.ts`        | Contrasta cada expectativa con el guard y con lo que el MCP construye.                                                                |
| `judge/evidence.ts`       | Lo que el juez lee de cada paso: el historial resumido y las opciones del gestor que tocó.                                            |
| `reports/`                | Los reportes, fuera de git.                                                                                                           |

## 6. Otros servicios

El mecanismo ya es común: otro servicio (como PAY) es una carpeta `tests/<SERVICIO>/` con su `service.ts`, y se elige en el menú. Cómo agregarlo: [tests/README.md](../../tests/README.md), "Agregar un servicio".

## 7. Límites conocidos

- **Cambios "colaterales":** si el agente reconstruye el gráfico entero (`config`) en vez de cambiar solo lo pedido (`changes`), pueden cambiar muchas claves y el paso falla por eso. Es un hallazgo, no un error de la prueba. Escribir por primera vez el valor por defecto del gestor (por ejemplo `legendOrientation: "top"`) no cuenta como cambio, porque no cambia lo que se ve; el reporte lo marca así. Los valores por defecto están en `editable_controls.ts` (`byDefault`).
- **Tipos que el MCP no crea** (tabla dinámica, mapa de calor, combinado, embudo): sus circuitos dependen de los gráficos base que arma el desarrollador, porque el adaptador no crea gráficos por REST (`POST /api/v1/chart/`). Tras un circuito, el gráfico base queda sin su "contexto de consulta" guardado (lo mismo que deja un cambio de datos, [[3]](SUPERSET_CHART_LIMITS.md#3-lo-que-no-se-puede-cambiar) de SUPERSET_CHART_LIMITS.md): basta guardarlo una vez en el gestor si se exporta a CSV.
- **Casos de [[6]](SUPERSET_CHART_LIMITS.md#6-pruebas-de-conversación) sin circuito:** los que dependen de otro dashboard o de gráficos de otros usuarios (paleta impuesta por el dashboard, dos donas en el mismo dashboard, gráficos ajenos) y los cambios de tipo.
- **El circuito Guiado** necesita `guided` en los `modes` del handshake.
- **Una corrida completa** son 20 circuitos y 141 mensajes al agente: entre 60 y 90 minutos. Para iterar, corre un grupo o un circuito.
- **No mide tokens ni costos;** las trazas quedan en LangSmith.
- **Cada corrida consume llamadas reales al modelo y escribe en QA:** se corre a pedido, no en cada commit.
- **El cliente MCP que se abre en cada turno nunca se cierra** (`ChatService.loadMcps`). Es un hallazgo aparte, también en producción. La corrida termina con un `process.exit` explícito.
- **Pendientes que salieron de los reportes:** [SUPERSET_AGENT_TODO.md](SUPERSET_AGENT_TODO.md), ordenados por prioridad, con esfuerzo y certeza.
