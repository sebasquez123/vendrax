# Qué se puede y qué no se puede cambiar en un gráfico desde Metbot

## 0. Para qué sirve este documento

Es una guía para el equipo. Explica qué partes de un gráfico ya guardado puede cambiar el asistente, cuáles no y por qué. Así, cuando alguien pregunte "¿por qué no me deja cambiar X?", hay una respuesta, y lo que hoy no es posible queda anotado para abordarlo más adelante.

No hace falta conocer Superset a fondo para leerlo. Las claves técnicas van en una columna aparte, por si hay que buscarlas en el código.

**Glosario breve**

| Término | Qué significa aquí |
|---|---|
| Gráfico (chart) | Una visualización guardada: una tabla, una dona, unas barras, un número clave… |
| Gestor de paneles | Superset, la plataforma donde viven los dashboards y los gráficos. |
| Dashboard | Un tablero que agrupa varios gráficos. |
| MCP | El conector que usa el asistente para hablar con el gestor de paneles: crear, leer y consultar gráficos. |
| API REST | La vía directa del gestor de paneles. El asistente la usa para lo que el MCP no hace bien: cambiar solo una parte de un gráfico. |
| Configuración guardada (`params` / `form_data`) | Todas las opciones de un gráfico, guardadas como una lista de claves y valores (por ejemplo `include_search: true`). |
| Control | Cada opción del editor del gráfico (el buscador, la posición de la leyenda, las filas por página…). Cada control lee una clave con un nombre exacto. |
| Mapa de controles | La lista, en el código, de los controles que el asistente puede cambiar en cada tipo de gráfico (`EDITABLE_CONTROLS`, en `editable_controls.ts`). Lo que no está en ella se conserva tal cual y solo se cambia en el gestor de paneles. |
| Restablecer | Volver una opción a su valor por defecto. |
| Dueño (owner) | Usuario que puede modificar el gráfico. El gestor de paneles solo deja cambiar un gráfico a sus dueños. |
| Gráfico "propio" | Un gráfico cuyo dueño es la cuenta del asistente (lo creó el asistente, en cualquier conversación). |

## 1. Cómo el asistente se hace un cambio?

Cuando el usuario pide cambiar un gráfico, el asistente primero lo lee (`get_chart_info`). La respuesta trae `_update_support`, que dice qué se puede cambiar en **ese** gráfico. Después hay tres caminos, según lo pedido:

| Camino | Cuándo | Vía | Qué conserva |
|---|---|---|---|
| **Renombrar o describir** | Solo cambia el título o la descripción, en cualquier tipo de gráfico (también en los que no se pueden configurar desde aquí, como un velocímetro). | MCP (título) o API REST (título y descripción a la vez). | Todo. |
| **Cambio puntual** | Cualquier cambio dentro del mismo tipo de gráfico (quitar una columna, mover la leyenda, cambiar el rango de fechas…). También en tablas dinámicas, mapas de calor, gráficos combinados y embudos, que no se pueden reconstruir. | API REST: se lee la configuración guardada, se reemplazan solo las claves pedidas y se guarda. | Todo lo que no se pidió cambiar, exactamente como estaba. |
| **Cambio de tipo** | Pasar a otro tipo de gráfico (por ejemplo, de tabla a barras), solo entre los que el MCP construye: tendencia, tabla, circular, número clave y tarjeta. | MCP: reconstruye el gráfico completo. | Solo lo que el MCP sabe reconstruir. Si se perdería algo (un filtro de fechas, una fórmula SQL, ajustes del editor), el cambio **no se hace** y se explica por qué. |

**Qué gráfico se cambia.** El asistente busca el gráfico entre los del dashboard seleccionado. Si varios coinciden con lo que pide el usuario (por ejemplo, dos donas), pregunta cuál; si hay uno solo, aplica el cambio directamente. En el modo Avanzado, cambiar un gráfico no pide confirmación; en el modo Guiado, el asistente muestra el antes → después y aplica el cambio cuando el usuario lo acepta. Quitar un gráfico del dashboard o eliminarlo lo hace el asistente directamente por la API REST (`delete_chart` con `permanent`: `false` lo quita solo del dashboard seleccionado, `true` lo borra para siempre); renombrar o publicar el dashboard también lo hace el asistente por la API REST (`update_dashboard`). Ninguno pasa por una tarjeta de aprobación (en Guiado, el asistente pide confirmación antes).

**Sobre el mismo gráfico, sin borrar lo que no se pidió.** Si lo pedido no se puede hacer en ese gráfico (otro tipo que perdería ajustes, otra fuente de datos), el asistente puede crear un gráfico equivalente que lo haga, diciendo qué conserva, qué pierde y qué asumió. El original se conserva: sale del dashboard solo si reemplazarlo es lo que el usuario pidió, y un gráfico se borra para siempre solo si el usuario pide exactamente eso.

**Qué opción se cambia.** El asistente busca lo que pide el usuario entre el título y la descripción del gráfico y las opciones que `_update_support` marca como editables, por lo que hace cada una:
- Si encaja una sola, la cambia.
- Si pueden ser dos (por ejemplo, "leyenda" puede ser la leyenda o el título de un eje), pregunta cuál antes de cambiar nada, con las dos opciones en palabras simples. "Título" a secas es el título del gráfico; solo pregunta si el usuario nombra un eje sin precisar cuál o si el gráfico ya muestra títulos de eje.
- Si la opción depende de otra ([[2]](#2-lo-que-sí-se-puede-cambiar), al final): cuando el pedido implica encender esa otra (mover una leyenda oculta es mostrarla; agrandar el hueco es hacerla dona), cambia las dos y lo dice. Cuando habría que reemplazar algo ya elegido (la columna del eje X, una métrica, la agrupación), no cambia nada: dice qué hace falta y ofrece hacerlo. Única excepción (decisión del 2026-10-18): "agrúpalo por semana" con el eje X en una categoría puede poner la fecha en el eje X y dejar la categoría como series, si así cumple el pedido y lo dice claramente.
- "Etiquetas" son las del gráfico, salvo que clasifiquen el gráfico ("ponle la etiqueta finanzas"): esas son tags y no se cambian desde aquí.
- Si ninguna hace lo pedido (por ejemplo, el texto de la leyenda, el color de una sola serie, el tamaño de la letra), dice que eso no se puede cambiar desde aquí y ofrece lo más cercano que sí (mover u ocultar la leyenda, otra paleta de colores). Nunca aplica esa otra opción en lugar de lo pedido.

Esta regla está en `src/knowledge/SUPERSET/general/01_playbook/01_playbook.ts` (`MATCHING_A_CHANGE`) y la usan los dos modos.

**Por qué el MCP solo no basta para algunas opciones.** El MCP escribe algunas opciones con nombres que el editor de gráficos no lee. El editor es la pantalla del gestor de paneles que se abre con "Editar gráfico"; se explica en [[4]](#4-nombres-viejos-de-algunas-opciones-alias). Por ejemplo:
- `legend_orientation`, cuando el control se llama `legendOrientation`;
- `y_axis_scale`, cuando el control es `logAxis`.

El dashboard a veces las aplica y el editor no, o ninguno de los dos. Por eso el cambio puntual solo escribe controles que se ven en **el dashboard y en el editor** (y, después de cada guardado del MCP, los alias de [[4]](#4-nombres-viejos-de-algunas-opciones-alias) pasan esos nombres a los nuevos).

**Dónde está en el código**

| Pieza | Archivo |
|---|---|
| Qué se puede cambiar, con qué valores y de qué depende cada opción (mapa de controles, alias) | `src/modules/tools/infrastructure/tools/superset/update/guards/editable_controls.ts` |
| Las comprobaciones antes de guardar (nombres, filtros, que el cambio se vea) y la reconstrucción | `src/modules/tools/infrastructure/tools/superset/update/guards/form_data.guard.ts` |
| El flujo de la herramienta (renombrar / cambio de tipo / cambio puntual) | `src/modules/tools/infrastructure/tools/superset/update/update_chart/tool.ts` |
| Las llamadas a la API REST | `src/modules/api/infrastructure/superset/superset.adapter.ts` |
| Token CSRF y cookie de sesión | `src/modules/auth/infrastructure/superset.adapter.ts` (`getApiSession`) |
| Reglas que siempre se cumplen (agregar, quitar o eliminar gráficos y renombrar o publicar, solo en el dashboard seleccionado; límite de búsquedas) | `src/knowledge/SUPERSET/general/08_tool_policy/08_tool_policy.ts` |

**Autenticación, en una línea.** El asistente reusa el token que ya valida para el MCP al comenzar cada mensaje (`authenticateMcp`: token guardado → refresh → login con las credenciales de la base de datos). Para guardar, pide además el token CSRF y la cookie de sesión. Es la misma cuenta que usa el MCP, así que los gráficos que el asistente crea siguen siendo editables por él.

## 2. Lo que sí se puede cambiar

La **"Clave técnica"** es la propiedad que se guarda. Cada **"Nota"** empieza por el tipo de cambio: **Dato** si cambia **qué datos** muestra el gráfico, o **Aspecto** si solo cambia **cómo se ven**. Sigue un ejemplo de cómo queda el gráfico y, después, las condiciones de la opción.

### Todos los tipos

| Elemento | Cómo lo diría el usuario | Clave técnica | Notas |
|---|---|---|---|
| Título | "ponle de título 'Ventas por mes'", "renómbralo como Recaudo diario" | `slice_name` | Aspecto: el nombre del gráfico cambia a "Ventas por mes". Lleva el prefijo `[METBOT - <dominio>]`. |
| Descripción visible en el dashboard | "agrégale la descripción 'recaudo semanal de ventas'" | `description` | Aspecto: el texto "recaudo semanal de ventas" aparece junto al gráfico en el dashboard. |
| Filtros, incluido el rango de fechas | "filtra solo Bogotá", "muestra solo los últimos 30 días", "quita el filtro de fecha" | `adhoc_filters` | Dato: el gráfico muestra solo los datos que cumplen el filtro, por ejemplo solo Bogotá o solo los últimos 30 días. Se envía la lista completa, así que los filtros que no se pidió quitar se conservan. Los filtros con fórmula SQL se conservan, pero no se crean ni se editan. |
| Límite de filas | "trae máximo 500 filas" | `row_limit` | Dato: el gráfico trae como máximo 500 filas de la fuente de datos. No aplica al número clave. |

### Tabla

| Elemento | Cómo lo diría el usuario | Clave técnica | Notas |
|---|---|---|---|
| Columnas por las que se agrupa | "quita la columna ESTADO", "agrúpala también por punto de venta" (tabla agrupada) | `groupby` | Dato: la tabla deja de agrupar por ESTADO, y cada fila resume las columnas que quedan. |
| Columnas visibles | "muestra también la columna CUENTA" (tabla sin agrupar) | `all_columns` | Dato: la columna CUENTA aparece en cada registro. |
| Agrupada o fila por fila | "no la agrupes, muestra cada registro", "agrúpala por punto de venta" | `query_mode` | Dato: la tabla pasa de mostrar totales por grupo a mostrar cada registro, o al revés. Se envía con las columnas (`all_columns`) o con las agrupaciones y métricas (`groupby`, `metrics`) del modo nuevo. También en la tarjeta personalizada. |
| Métricas | "agrega la métrica Total validaciones a la tabla" | `metrics` | Dato: aparece una columna con el Total validaciones de cada grupo. |
| Métricas en porcentaje del total | "muestra las ventas también como porcentaje del total" | `percent_metrics` | Dato: aparece una columna con el porcentaje que cada fila representa del total. Solo en tabla agrupada; el porcentaje es sobre las filas traídas. |
| Orden en tabla agrupada (solo por métrica) | "ordénala por Total validaciones, de mayor a menor" | `timeseries_limit_metric`, `order_desc` | Dato: las filas se ordenan según el Total validaciones. |
| Orden por columna | "ordénala por fecha, de la más reciente a la más antigua" (tabla sin agrupar) | `order_by_cols` | Dato: los registros se ordenan por fecha. |
| Buscador | "ponle un buscador a la tabla" / "quítale el buscador" | `include_search` | Aspecto: aparece o desaparece una caja de búsqueda sobre la tabla. |
| Paginación | "muestra 50 filas por página" | `page_length` | Aspecto: la tabla se divide en páginas de 50 filas; 0 las muestra todas en una página. No aplica con la paginación del servidor activa. |
| Paginación del servidor | "trae los datos del servidor por páginas" | `server_pagination`, `server_page_length` | Dato: la tabla pide al servidor una página a la vez, en lugar de traer todos los datos. Experimental en el gestor. Páginas de 10, 20, 50, 100 o 200. |
| Fila de totales | "muestra la fila de totales" | `show_totals` | Aspecto: aparece una fila al final con el total de cada métrica. |
| Barras dentro de las celdas numéricas | "quita las barras de las celdas numéricas" | `show_cell_bars` | Aspecto: las celdas numéricas dejan de mostrar la barra de fondo proporcional a su valor. |
| Color según el signo | "colorea los valores positivos y negativos" | `color_pn` | Aspecto: las barras de las celdas se colorean según el valor sea positivo o negativo. |
| Formato condicional | "pon en verde las ventas mayores a 1000", "pinta la fila completa" | `conditional_formatting` | Aspecto: las celdas que cumplen la regla se pintan, por ejemplo las ventas mayores a 1000 en verde. Se envía la lista completa de reglas. Cada regla lleva una columna o métrica que la tabla muestra; un operador (>, <, ≥, ≤, =, ≠, rangos, o sin valor para degradado); un color (verde, amarillo o rojo); y, si se quiere, el color del texto o la fila completa. |
| Reordenar columnas al ver | "deja que se puedan mover las columnas de la tabla" | `allow_rearrange_columns` | Aspecto: quien ve la tabla puede arrastrar sus columnas para reordenarlas. |
| Formato de fecha | "muestra las fechas como día/mes/año" | `table_timestamp_format` | Aspecto: las fechas pasan a verse como 18/10/2026. Formato d3, por ejemplo `%d/%m/%Y`. |
| Formato por columna | "alinea la fecha a la izquierda", "muestra VALOR con dos decimales" | `column_config` | Aspecto: cambia cómo se ve una columna concreta, por ejemplo VALOR con dos decimales. Se envía el objeto completo. |

### Circular o dona

| Elemento | Cómo lo diría el usuario | Clave técnica | Notas |
|---|---|---|---|
| Categoría de las porciones | "divide la torta por tipo de dispositivo" | `groupby` | Dato: cada porción pasa a ser un tipo de dispositivo. |
| Métrica | "que la torta mida el total de ventas" | `metric` | Dato: el tamaño de cada porción pasa a ser su total de ventas. |
| Orden | "ordena las porciones de mayor a menor" | `sort_by_metric` | Dato: las porciones se ordenan por su valor. |
| Paleta de colores | "usa tonos azules", "cambia los colores del gráfico" | `color_scheme` | Aspecto: todas las porciones cambian a la paleta elegida, por ejemplo tonos azules. Es una de las 18 paletas de Superset y cambia la paleta completa, no el color de una porción. No se aplica si el dashboard seleccionado tiene su propio esquema de colores. |
| Dona y tamaño del hueco | "hazla dona", "agranda el hueco del centro" | `donut`, `innerRadius` | Aspecto: la torta pasa a tener un hueco en el centro, o el hueco crece. Hueco de 0 a 100; solo existe en una dona. |
| Tamaño | "haz la torta más grande" | `outerRadius` | Aspecto: el círculo ocupa más espacio. De 10 a 100. |
| Contenido de las etiquetas | "muestra el porcentaje en cada porción", "deja solo los nombres" | `label_type` | Aspecto: cada porción muestra, por ejemplo, su porcentaje en lugar de su nombre. Valores: key, value, percent, key_value, key_percent, key_value_percent, value_percent. |
| Posición de las etiquetas | "pon las etiquetas por fuera, con líneas" | `labels_outside`, `label_line` | Aspecto: las etiquetas salen del círculo, unidas a su porción por una línea. Solo con las etiquetas visibles (`show_labels`). |
| Porcentaje mínimo para mostrar una etiqueta | "oculta las etiquetas de las porciones pequeñas" | `show_labels_threshold` | Aspecto: las porciones por debajo del porcentaje indicado (por ejemplo 5 %) no muestran etiqueta. |
| Total | "muestra el total en el gráfico" | `show_total` | Aspecto: aparece la suma de todas las porciones. |
| Formato numérico | "muestra los números con dos decimales" | `number_format` | Aspecto: los valores pasan a verse con dos decimales. Formato d3. |
| Leyenda | "pon la leyenda abajo", "quita la leyenda" | `show_legend`, `legendOrientation`, `legendType` | Aspecto: la leyenda se muestra, se oculta o cambia de lugar, por ejemplo abajo. Posiciones top, bottom, left y right. La posición y el estilo solo cuentan con la leyenda visible. |

### Tendencia o comparación (líneas, barras, área, dispersión)

| Elemento | Cómo lo diría el usuario | Clave técnica | Notas |
|---|---|---|---|
| Eje X | "usa la fecha de confirmación en el eje X" | `x_axis` | Dato: el eje horizontal pasa a ser la fecha de confirmación. |
| Métricas | "agrega la métrica transacciones al gráfico" | `metrics` | Dato: aparece una línea o barra más con las transacciones. |
| Series | "sepáralo por punto de venta" | `groupby` | Dato: cada punto de venta se dibuja como su propia línea o barra. |
| Intervalo de tiempo | "agrúpalo por semana" | `time_grain_sqla` | Dato: cada punto del eje X pasa a sumar una semana. Solo con un eje X de fecha. Si el eje es una categoría, el asistente puede poner la fecha en el eje X y dejar la categoría como series, y lo dice. |
| Paleta de colores | "cambia los colores del gráfico" | `color_scheme` | Aspecto: las series cambian a la paleta elegida. Igual que en la circular. |
| Leyenda | "pon la leyenda a la derecha" | `show_legend`, `legendOrientation`, `legendType` | Aspecto: la leyenda pasa a la derecha. La posición y el estilo solo cuentan con la leyenda visible. |
| Títulos de los ejes | "ponle 'Recaudo' de título al eje Y" | `x_axis_title`, `y_axis_title` (+ `_margin`) | Aspecto: el texto "Recaudo" aparece junto al eje vertical. Se pone con margen, para que no se encime con las etiquetas. |
| Formato del eje Y | "muestra los números del eje Y en millones", "muéstralos en porcentaje" | `y_axis_format` | Aspecto: el formato de los números del eje Y cambia; por ejemplo, 1500000 se ve como 1.5M. |
| Formato de fecha del eje X | "muestra las fechas del eje X como día/mes" | `x_axis_time_format` | Aspecto: las fechas del eje horizontal pasan a verse como 18/10. |
| Escala | "cámbiale el gráfico a escala logarítmica" | `logAxis` | Aspecto: el eje Y pasa a escala logarítmica, que permite comparar valores muy distintos en el mismo gráfico. |
| Límites del eje Y | "que el eje Y empiece en 0", "que el eje Y llegue hasta 1000" | `truncateYAxis`, `y_axis_bounds` | Aspecto: el eje vertical empieza o termina en el valor pedido. `[mín, máx]`, donde `null` es automático. Solo amplía el eje, nunca oculta datos. |
| Puntos en la línea | "marca cada punto de la línea", "haz los puntos más grandes" | `markerEnabled`, `markerSize` | Aspecto: cada dato se marca con un punto. En líneas, áreas y dispersión. Tamaño de 0 a 20. |
| Valores sobre el gráfico | "muestra los valores sobre las barras" | `show_value` | Aspecto: cada barra o punto muestra su número. |
| Apilado | "apila las barras", "apílalas al 100 %" | `stack` | Aspecto: las series se dibujan una sobre otra; al 100 %, cada barra muestra la proporción de cada serie. Sin apilar (null), `Stack` o `Expand`. |
| Dirección | "pon las barras horizontales" | `orientation` | Aspecto: las barras pasan a ir de izquierda a derecha. Solo en barras. |
| Rotación de las etiquetas del eje X | "gira 45 grados las etiquetas del eje X" | `xAxisLabelRotation` | Aspecto: los textos del eje horizontal se inclinan para que no se encimen. 0, 45 o 90. |
| Barra de zoom | "ponle una barra de zoom al gráfico" | `zoomable` | Aspecto: aparece una barra bajo el gráfico para acercarse a un periodo. |

### Número clave

| Elemento | Cómo lo diría el usuario | Clave técnica | Notas |
|---|---|---|---|
| Métrica | "que el número muestre el total de ventas" | `metric` | Dato: el número pasa a ser el total de ventas. |
| Formato | "muestra el número en pesos con dos decimales" | `y_axis_format` | Aspecto: el formato del número cambia; por ejemplo, pasa a verse en pesos con dos decimales. |
| Tamaño del número | "haz el número más grande" | `header_font_size` | Aspecto: el número se ve más grande. Tamaños de 0.2 a 0.6. |
| Subtítulo | "ponle debajo el texto 'ventas de hoy'" | `subtitle`, `subtitle_font_size` | Aspecto: el texto "ventas de hoy" aparece debajo del número. Reemplaza el `subheader` que escribe el MCP (alias, [[4]](#4-nombres-viejos-de-algunas-opciones-alias)). Tamaño de 0.125 a 0.4. |
| Nombre de la métrica | "muestra el nombre de la métrica debajo del número" | `show_metric_name`, `metric_name_font_size` | Aspecto: el nombre de la métrica, por ejemplo "Total cuentas", aparece debajo del número. El tamaño solo se ve con el nombre visible; va de 0.125 a 0.4. Habilitado el 2026-10-18 (lo usan los gráficos productivos). |
| Línea de tendencia | "quítale la línea de tendencia", "muestra la tendencia por mes" | `show_trend_line`, `time_grain_sqla`, `start_y_axis_at_zero` | Dato y aspecto: la línea bajo el número se oculta o pasa a agrupar por mes. Solo en el número clave con tendencia. |

### Tarjeta personalizada

| Elemento | Cómo lo diría el usuario | Clave técnica | Notas |
|---|---|---|---|
| Plantilla HTML y CSS | "cambia la plantilla de la tarjeta", "pon el texto de la tarjeta en azul" | `handlebarsTemplate`, `styleTemplate` | Aspecto: la tarjeta cambia su contenido o sus estilos; por ejemplo, el texto pasa a verse azul. |
| Datos | "que la tarjeta use la métrica transacciones" | `metrics`, `groupby`, `all_columns`, `order_desc` | Dato: la tarjeta pasa a calcular con las transacciones. |
| Agrupada o fila por fila | "muestra cada registro en la tarjeta" | `query_mode` | Dato: la tarjeta recibe cada registro, en lugar de totales por grupo. Igual que en la tabla. |

Los cuatro tipos siguientes se pueden cambiar pero no crear ni reconstruir: el MCP no los construye.

### Tabla dinámica

| Elemento | Cómo lo diría el usuario | Clave técnica | Notas |
|---|---|---|---|
| Filas y columnas | "pon los puntos de venta en filas", "pon los meses en columnas" | `groupbyRows`, `groupbyColumns` | Dato: los puntos de venta pasan a las filas y los meses a las columnas. |
| Métricas | "agrega el recaudo a la tabla dinámica" | `metrics` | Dato: cada celda muestra también el recaudo. |
| Métricas en filas o columnas | "pon las métricas en filas" | `metricsLayout` | Aspecto: los nombres de las métricas pasan de encabezar columnas a encabezar filas. `COLUMNS` o `ROWS`. |
| Cómo se combinan los valores | "que sume los valores", "que muestre el promedio", "muéstralo como % del total" | `aggregateFunction` | Dato: cada celda pasa a mostrar, por ejemplo, el promedio en lugar de la suma. Suma, conteo, promedio, mínimo, máximo, fracción del total, etc. |
| Totales y subtotales | "muestra los totales por fila" | `rowTotals`, `colTotals`, `rowSubTotals`, `colSubTotals` | Aspecto: aparece una columna con el total de cada fila. La posición se fija con `rowSubtotalPosition` (arriba o abajo) y `colSubtotalPosition` (izquierda o derecha). |
| Intercambiar filas y columnas | "voltea la tabla dinámica" | `transposePivot` | Aspecto: las filas pasan a ser columnas y las columnas, filas. |
| Métricas lado a lado | "muestra las métricas lado a lado" | `combineMetric` | Aspecto: las métricas se ven una junto a otra dentro de cada columna. |
| Orden | "ordena las filas por valor, de mayor a menor" | `rowOrder`, `colOrder` | Aspecto: las filas o columnas se ordenan por su valor. Por nombre o por valor, ascendente o descendente. |
| Formatos | "muestra los valores con dos decimales", "muestra las fechas como día/mes" | `valueFormat`, `date_format` | Aspecto: los valores se ven con dos decimales y las fechas como 18/10. Formato d3. |
| Formato condicional | "pinta en rojo los valores menores a 100" | `conditional_formatting` | Aspecto: las celdas que cumplen la regla se pintan, por ejemplo en rojo las menores a 100. Igual que en la tabla, pero la columna es una métrica. |
| Límite de celdas | "trae máximo 5000 filas" | `row_limit` | Dato: la consulta trae como máximo 5000 filas. |

### Mapa de calor

| Elemento | Cómo lo diría el usuario | Clave técnica | Notas |
|---|---|---|---|
| Ejes y valor | "pon los días en el eje X y los puntos de venta en el Y", "que mida el recaudo" | `x_axis`, `groupby`, `metric` | Dato: el mapa cruza días con puntos de venta, y el color de cada celda es su recaudo. |
| Intervalo de tiempo | "agrúpalo por semana" | `time_grain_sqla` | Dato: cada columna del mapa pasa a ser una semana. Solo con un eje X de fecha. |
| Paleta | "pinta el mapa en verdes", "usa un degradado de amarillo a rojo" | `linear_color_scheme` | Aspecto: el degradado de colores cambia, por ejemplo a verdes. Hay 11 degradados (azules, verdes, rojos, naranjas, morados, grises, amarillo→rojo, rojo→verde, rojo→azul, Viridis, Superset). |
| Contra qué se compara el color | "compara el color dentro de cada fila" | `normalize_across` | Aspecto: el color de cada celda se mide contra su fila, no contra todo el mapa. Todo el mapa, cada columna o cada fila. |
| Orden de los ejes | "ordena los ejes por valor" | `sort_x_axis`, `sort_y_axis` | Aspecto: las filas o columnas se ordenan por su valor. Por nombre o por valor. |
| Valores y leyenda | "muestra los valores dentro de las celdas" | `show_values`, `show_percentage`, `show_legend`, `legend_type`, `normalized` | Aspecto: cada celda muestra su número o su porcentaje, y la leyenda de colores se muestra u oculta. |
| Formatos | "muestra los números en millones" | `y_axis_format`, `x_axis_time_format` | Aspecto: los valores se ven como 1.5M, y las fechas del eje X con el formato pedido. Formato d3. |

### Gráfico combinado (dos consultas)

| Elemento | Cómo lo diría el usuario | Clave técnica | Notas |
|---|---|---|---|
| Datos de cada consulta | "agrega el recaudo a la segunda serie" | `metrics`, `groupby`, `adhoc_filters`, `row_limit` y sus versiones `_b` | Dato: la segunda consulta pasa a incluir el recaudo. El eje X y el intervalo de tiempo (`x_axis`, `time_grain_sqla`) son comunes a las dos. |
| Cómo se dibuja cada consulta | "dibuja la segunda serie en barras" | `seriesType`, `seriesTypeB` | Aspecto: la segunda serie pasa de línea a barras. Línea, dispersión, línea suave, barras o escalones. |
| Eje de cada consulta | "pon la segunda serie en el eje derecho" | `yAxisIndex`, `yAxisIndexB` | Aspecto: la segunda serie pasa a usar su propia escala, a la derecha. 0 es el eje principal y 1 el secundario. |
| Apilado, área, valores, puntos | "apila la primera serie", "muestra los valores sobre las series" | `stack`, `area`, `show_value`, `markerEnabled` y sus versiones `B` | Aspecto: la serie elegida se apila, se rellena como área, muestra sus valores o marca sus puntos. Cada opción es sí o no. |
| Ejes | "ponle título al eje derecho", "muestra el eje secundario en porcentaje" | `x_axis_title`, `y_axis_title`, `yAxisTitleSecondary`, `y_axis_format`, `y_axis_format_secondary`, `logAxis`, `logAxisSecondary` | Aspecto: aparece el título del eje derecho, o cambia el formato o la escala de un eje. |
| Paleta, leyenda y zoom | "cambia los colores del gráfico" | `color_scheme`, `show_legend`, `legendOrientation`, `legendType`, `zoomable` | Aspecto: las series cambian de paleta, la leyenda se mueve o aparece la barra de zoom. Paleta igual que en la circular. |

### Embudo

| Elemento | Cómo lo diría el usuario | Clave técnica | Notas |
|---|---|---|---|
| Etapas y valor | "que las etapas del embudo sean los estados", "que mida las ventas" | `groupby`, `metric` | Dato: cada etapa del embudo pasa a ser un estado, medido por sus ventas. |
| Orden | "ordena las etapas por valor" | `sort_by_metric` | Dato: las etapas se ordenan de mayor a menor. |
| Porcentajes | "calcula el porcentaje de cada etapa respecto a la anterior" | `percent_calculation_type` | Aspecto: cada etapa muestra su porcentaje frente a la anterior. Respecto a la primera etapa, a la anterior o al total. |
| Etiquetas | "muestra el nombre y el porcentaje en cada etapa" | `show_labels`, `label_type`, `show_tooltip_labels` | Aspecto: cada etapa muestra su nombre y su porcentaje. `label_type` es un número de 0 a 6 (nombre, valor, porcentaje y sus combinaciones). |
| Paleta, leyenda y formato | "cambia los colores del embudo", "pon la leyenda abajo" | `color_scheme`, `show_legend`, `legendOrientation`, `number_format` | Aspecto: el embudo cambia de paleta, la leyenda se mueve o los números cambian de formato. |

Antes de guardar, el asistente comprueba que las columnas y métricas existan en la fuente de datos, que los valores sean válidos (por ejemplo, que la leyenda vaya en una posición real), que no se pierda ningún filtro SQL y que el cambio se vaya a ver. Esto último sigue las reglas del propio editor del gestor, que oculta algunas opciones según otra: el hueco solo existe en una dona, la posición de la leyenda solo cuenta con la leyenda visible, el intervalo de tiempo solo con un eje X de fecha. En un dashboard con esquema de colores propio, ese esquema manda sobre la paleta de cada gráfico: el asistente lee el dashboard seleccionado y no cambia la paleta del gráfico si no se vería ahí. Las reglas con estructura propia también se comprueban: el formato condicional (columna, operador, valores y color) y el paso de agrupada a fila por fila. Si algo falla, no cambia nada y explica por qué. Cuando el pedido implica también la otra opción ("pon la leyenda abajo" con la leyenda oculta), el asistente cambia las dos y lo dice.

## 3. Lo que no se puede cambiar

| Elemento | Motivo | Detalle | Qué haría falta para habilitarlo |
|---|---|---|---|
| Etiquetas (tags) | **Configuración** | El gestor solo las muestra con la opción `TAGGING_SYSTEM` activa. En QA hay 0 tags y el MCP no puede asignarlas. | Activar la opción en el gestor y agregar los endpoints de tags al adapter de `src/modules/api` (`POST /api/v1/tag/2/<id>/`). |
| Gráficos de otros usuarios | **Imposibilidad (permisos)** | El gestor solo deja modificar un gráfico a sus dueños. La cuenta del asistente no es administradora. | Que un dueño agregue a la cuenta del asistente como dueño, desde el gestor. |
| Dueños, dashboards del gráfico, certificación | **Decisión (gobierno)** | La API lo permite, pero se excluye a propósito: son decisiones de quién administra, no ediciones del gráfico. | Una decisión de negocio, y después agregarlo al adapter. |
| Otros tipos avanzados (velocímetro, mapas, nube de palabras, sankey, treemap, sunburst, burbujas, diagrama de cajas…) | **Incapacidad** | El MCP no los construye y el mapa de controles no los incluye. Se pueden consultar, no cambiar. Las tablas dinámicas, los mapas de calor, los gráficos combinados y los embudos ya se cambian ([[2]](#2-lo-que-sí-se-puede-cambiar)). | Mapear los controles de ese tipo ([[5]](#5-cómo-hacer-editable-una-opción-más-para-desarrolladores)). |
| Crear una tabla dinámica, un mapa de calor, un gráfico combinado o un embudo, o convertir otro gráfico a esos tipos | **Incapacidad** | El MCP no construye esos tipos; solo sus opciones se cambian ([[2]](#2-lo-que-sí-se-puede-cambiar)). | Que el MCP los soporte. |
| Cambio de tipo en gráficos con ajustes avanzados | **Imposibilidad parcial** | La reconstrucción del MCP perdería filtros de fechas, fórmulas SQL o ajustes del editor. | — (se hace en el gestor). |
| Métricas, columnas o filtros con fórmula SQL | **Incapacidad (riesgo)** | Se conservan intactos, pero no se crean ni se editan desde el chat. | — |
| Color de una serie o categoría específica | **Incapacidad** | Se cambia la paleta completa ([[2]](#2-lo-que-sí-se-puede-cambiar)), no el color de una serie. El color fijo de una categoría vive en el dashboard (`label_colors`), no en el gráfico. | Escribir los metadatos del dashboard, que hay que enviar completos. |
| Paleta de un gráfico en un dashboard con esquema propio | **Límite del gestor** | El esquema de colores del dashboard manda sobre el de cada gráfico; las categorías que comparten varios gráficos conservan el color del dashboard. El asistente lo comprueba y no aplica un cambio que no se vería. | Cambiar o quitar el esquema del dashboard, desde sus propiedades en el gestor. |
| Paletas propias de la instancia | **Sin verificar** | Se aceptan las 18 paletas que trae Superset 6.1. Si QA tiene paletas propias (configuración `EXTRA_CATEGORICAL_COLOR_SCHEMES`), no están en la lista y se rechazan. | Indicar sus identificadores y agregarlos a `CATEGORICAL_SCHEMES` (`editable_controls.ts`). |
| Fuente de datos del gráfico (`datasource`) | **Incapacidad (riesgo)** | Otra fuente tiene otras columnas; el gráfico quedaría roto. | — (crear un gráfico nuevo). |
| Ordenar una tabla agrupada por una columna | **Límite del gestor** | Una tabla agrupada solo se ordena por una métrica. | — |
| Otras opciones del editor (comparación de periodos, cálculos avanzados, anotaciones, opciones de ECharts, márgenes, colores de borde…) | **Pendiente** | Funcionan en el gestor, pero aún no están en el mapa. Las habilitadas el 2026-10-15 están en [[2]](#2-lo-que-sí-se-puede-cambiar): formato condicional, porcentajes de métricas, paginación del servidor, límites del eje Y, puntos en la línea, subtítulo del número clave y paletas. | Agregarlas al mapa ([[5]](#5-cómo-hacer-editable-una-opción-más-para-desarrolladores)). |
| Exportar a CSV o reportes programados tras un cambio de datos | **Límite** | Tras un cambio de datos se borra el "contexto de consulta" guardado (`query_context`), porque describía los datos viejos. El dashboard y el asistente no se ven afectados. | Guardar el gráfico una vez desde el gestor. |
| Posición o tamaño del gráfico en el dashboard | **Fuera del gráfico** | Es el layout del dashboard, no el gráfico. | — |
| Claves viejas del MCP | **Desuso** | `y_axis_scale`, `x_axis_format`, `x_axis_sort_series_*`; `legend_orientation` y `handlebars_template` (estas dos solo se ven en el dashboard). | Todas menos `x_axis_sort_series_*`, que no tiene alias, se corrigen solas: justo después de cada creación o cambio de tipo, el sistema las pasa a los nombres nuevos ([[4]](#4-nombres-viejos-de-algunas-opciones-alias)). |

## 4. Nombres viejos de algunas opciones (alias)

**Dónde se ve un gráfico.** El mismo gráfico guardado se ve en dos lugares:
- **El dashboard:** el tablero donde los usuarios consultan sus gráficos.
- **El editor de gráficos:** la pantalla que se abre en el gestor de paneles al elegir "Editar gráfico". Ahí está cada opción del gráfico con su menú: la posición de la leyenda, la escala, los formatos…

Los dos leen la misma configuración guardada. Cada opción se guarda con un nombre técnico, por ejemplo `legendOrientation` para la posición de la leyenda.

**El problema.** Al crear un gráfico, el asistente usa el MCP, la conexión con el gestor de paneles. Para unas pocas opciones, el MCP guarda la opción con un **nombre viejo** que el gestor ya no lee en todos lados.

Por ejemplo, el MCP guarda la posición de la leyenda como `legend_orientation`, en lugar de `legendOrientation`:
- el dashboard todavía entiende el nombre viejo y muestra la leyenda abajo, como se pidió;
- el editor solo entiende el nombre nuevo, así que su menú dice "arriba", el valor por defecto.

Quien abre el gráfico para editarlo ve una posición distinta de la que muestra el dashboard.

**Qué es un alias.** Es la equivalencia entre el nombre viejo y el nuevo de una misma opción. El sistema la usa así:
1. **Justo después de que el MCP guarda un gráfico** (al crearlo o al cambiarle el tipo), el sistema relee el gráfico, pasa cada nombre viejo a su nombre nuevo y lo vuelve a guardar. Si el nombre nuevo ya tenía un valor, solo se borra el viejo. La escala logarítmica, además, cambia de forma: el MCP la guarda como `"log"` y el editor la lee como sí o no. Esto ocurre solo, sin que el asistente haga nada. Si no se pudiera guardar, la creación no falla: el gráfico queda como lo dejó el MCP.
2. Cuando el asistente cambia esa opción, la guarda con el nombre nuevo y borra el viejo. Así el dashboard y el editor muestran lo mismo.
3. Si el asistente se refiere a la opción por el nombre viejo, porque lo vio en la configuración, el cambio se aplica al nombre nuevo.

Por eso, un gráfico guardado por el asistente nunca queda con nombres viejos. La tabla dice lo que pasaba antes con cada uno.

**Opciones con nombre viejo:**

| Opción | Qué pasaba con el nombre viejo, antes de la corrección | Nombre nuevo | Nombre viejo |
|---|---|---|---|
| Posición de la leyenda | El dashboard la mostraba donde se pidió, pero el editor mostraba la posición por defecto. | `legendOrientation` | `legend_orientation` |
| Plantilla de la tarjeta personalizada | El dashboard mostraba la plantilla, pero el editor no. | `handlebarsTemplate` | `handlebars_template` |
| Escala logarítmica | No tenía efecto en ningún lado: el gráfico seguía con la escala normal. | `logAxis` | `y_axis_scale` |
| Formato de fecha del eje X | No tenía efecto en los gráficos de tendencia: las fechas seguían con el formato automático. | `x_axis_time_format` | `x_axis_format` |
| Subtítulo del número clave | El dashboard mostraba el subtítulo, pero el editor no. | `subtitle` | `subheader` |

**Para agregar un alias (desarrolladores):**
- agrega una línea en `MCP_ALIASES` (`editable_controls.ts`) con la forma `nombreNuevo: ['nombre_viejo']`;
- agrega una fila en esta tabla.

El nombre nuevo tiene que estar en el mapa de controles ([[5]](#5-cómo-hacer-editable-una-opción-más-para-desarrolladores)).

## 5. Cómo hacer editable una opción más (para desarrolladores)

**Cuándo usarlo.** Cuando se quiere que el asistente pueda cambiar desde el chat una opción que hoy no puede, por ejemplo una de las marcadas como **Pendiente** en [[3]](#3-lo-que-no-se-puede-cambiar).

**La idea.** El asistente solo cambia los controles que están en el mapa de controles (`EDITABLE_CONTROLS`, en `editable_controls.ts`), agrupados por tipo de gráfico. Agregar uno ahí basta: al leer un gráfico de ese tipo, el asistente lo ve en `_update_support` y ya puede cambiarlo. No hay que tocar sus instrucciones.

**Ejemplo: el buscador de la tabla.** En el editor del gráfico es la casilla "Search box". Al marcarla y guardar, la configuración del gráfico pasa a tener `include_search: true`. En el mapa está así:

```ts
table: {
  include_search: { hint: 'search box: true|false', values: BOOL },
},
```

**Pasos**

1. **Encontrar el nombre exacto del control.** Es la clave con la que el gestor de paneles guarda la opción; con otro nombre, el cambio no se ve en el editor (es lo que pasaba con los alias de [[4]](#4-nombres-viejos-de-algunas-opciones-alias)). La forma más simple: en un gráfico de prueba, cambiar la opción desde el editor, guardar y ver qué clave cambió en el `form_data` que devuelve `get_chart_info`. También está en el código del gestor, en el campo `name` del control: `superset-frontend/plugins/<plugin>/src/.../controlPanel.tsx` (el de la tabla es `plugin-chart-table/src/controlPanel.tsx`).
2. **Agregarlo al mapa** (`EDITABLE_CONTROLS`, en `editable_controls.ts`), dentro del tipo de gráfico que corresponda:
   - `hint` (obligatorio): qué hace y qué valores toma, en una línea y en inglés. Es lo único que el asistente lee del control.
   - `values` (lista cerrada) o `range` (mínimo y máximo): si los valores son fijos. Así se rechaza un valor inválido antes de guardar.
   - `names`: si el control guarda nombres de columnas o métricas, para comprobar que existan en la fuente de datos.
   - `data: true`: si el control cambia qué datos muestra el gráfico, no solo cómo se ve.
   - `vizTypes` o `queryMode`: si solo existe en algunos gráficos del tipo (por ejemplo, la dirección de las barras solo existe en barras).
   - `validate`: si el valor tiene una estructura propia que hay que revisar (como las reglas del formato condicional). Devuelve el motivo del rechazo, que el asistente le explica al usuario.
   - `shownWhen`: si el editor del gestor oculta el control según otro ajuste (el campo `visibility` del control en `controlPanel.tsx`; por ejemplo, `innerRadius` solo se ve con `donut` activo). Se copia esa regla tal cual, nunca una más estricta: así el asistente no guarda un cambio que no se vería, y el hint le dice de qué depende.
   - `byDefault`: el valor que usa el gestor mientras el gráfico nunca guardó la opción. Es el `default:` del control en `controlPanel.tsx`, el mismo que el dashboard aplica a una clave ausente (`applyDefaultFormData` en `dashboard/actions/hydrate.ts`).
     - **Solo con valores literales leídos en el código del gestor.** Si el valor se calcula (la paleta por defecto de la instancia, el intervalo de tiempo), es `null` sin efecto o no existe, se deja sin `byDefault`.
     - **Si difiere entre los tipos de la familia,** va en `byDefaultByVizType` (por ejemplo, `y_axis_title_margin` vale 15 en barras y 0 en línea).
     - **Dónde se usa:** el asistente lo lee en `_update_support` ("default …"), y las pruebas de circuitos no cuentan como cambio escribir el valor por defecto en una clave ausente.
     - **Validación:** `form_data.guard.spec.ts` comprueba que cada valor por defecto esté entre los `values` o el `range` del control.
3. **Probarlo** en un gráfico propio: pedir el cambio en el chat y comprobar que se vea **en el dashboard y en el editor del gráfico**. Si se ve solo en uno, el nombre no es el correcto.
4. **Agregar un caso** en `form_data.guard.spec.ts`.
5. **Actualizar la documentación:**
   - aquí, una fila en [[2]](#2-lo-que-sí-se-puede-cambiar) y, si estaba en [[3]](#3-lo-que-no-se-puede-cambiar), quitarla de allí;
   - si cambia lo que el usuario puede pedir, `KNOWLEDGE/SUPERSET_METHODOLOGY.md` [[6]](KNOWLEDGE/SUPERSET_METHODOLOGY.md#6-qué-se-puede-cambiar-de-un-gráfico-existente-y-por-qué-a-veces-no-se-puede), que es el documento que el asistente consulta en la base de conocimiento. Después hay que volver a ingestarlo.

## 6. Pruebas de conversación

Estos casos se prueban a mano. Los circuitos automáticos con el agente real (crear → cambiar → estropear → arreglar → borrar, con juez LLM) están en [SUPERSET_AGENT_TESTS.md](SUPERSET_AGENT_TESTS.md).

"Propio" = su dueño es la cuenta del asistente. 3504 es una copia de PAY_SITME_TABLA cuyo dueño es el asistente; 3199 es la original, de otros usuarios. Salvo que el caso diga "Guiado", se prueba en el modo Avanzado.

| # | El usuario dice | Gráfico | Resultado esperado | Qué verificar |
|---|---|---|---|---|
| 1 | "quita la columna ESTADO de la tabla" | 3504 | **Aplicado** | Sigue filtrada a 7 días, con buscador y agrupada; ESTADO ya no aparece. |
| 2 | "pon la leyenda abajo" | Dona propia, única en el dashboard | **Aplicado** | La leyenda está abajo en el dashboard **y** en el editor. |
| 3 | "muestra los porcentajes en la dona" | Dona propia | **Aplicado** | Las etiquetas muestran porcentaje. |
| 4 | "cambia la escala a logarítmica" | Líneas propio | **Aplicado** | El eje Y es logarítmico en ambas vistas. |
| 5 | "muestra solo los últimos 30 días" | Tabla propia | **Aplicado** | El rango de fechas es de 30 días; los demás filtros siguen. |
| 6 | "quita el filtro de fecha" | Tabla propia | **Aplicado**, avisando que ahora muestra todo el histórico | Ya no hay rango de fechas. |
| 7 | "muestra 50 filas por página" | Tabla propia | **Aplicado** | Paginación de 50. |
| 8 | "ordena la tabla por fecha" | Tabla agrupada | **No se aplica tal cual**: una tabla agrupada solo se ordena por una métrica; se ofrece eso | Nada cambió. |
| 9 | "agrega la columna CLIENTE_X" | Tabla propia | **No aplicado**: esa columna no existe; se ofrecen las que sí | Nada cambió. |
| 10 | "agrégale el tag finanzas" | Cualquiera | **No disponible**: las etiquetas no se gestionan desde aquí | No hubo llamada de cambio. |
| 11 | "cámbiale los colores a verde" | Circular o barras propio, en un dashboard sin esquema propio | **Propone** la paleta más cercana (por ejemplo "Blue to green") o pregunta entre dos; aclara que cambia la paleta completa | La paleta cambió en el dashboard y en el editor. |
| 12 | "convierte la tabla en barras" | 3504 | **No aplicado**: perdería el filtro de 7 días y la agrupación | Nada cambió. |
| 13 | "quita la columna ESTADO" | 3199 | **No aplicado**: pertenece a otros usuarios | Nada cambió. |
| 14 | "renómbralo a Ventas semanales" | Propio | **Aplicado** | El título lleva el prefijo del dominio. |
| 15 | "agrégale una descripción: ventas por día" | Propio | **Aplicado** | La descripción se ve en el dashboard. |
| 16 | "ponle título al eje Y: Validaciones" | Barras propio | **Aplicado** (título y margen) | El título no se encima con las etiquetas. |
| 17 | "muestra los totales por fila" | Tabla dinámica propia | **Aplicado** | Aparece la columna de totales; el resto de la tabla dinámica no cambió. |
| 18 | "hazla dona y agranda el hueco" | Circular propio | **Aplicado** | Dona con un hueco mayor (por ejemplo 50). |
| 19 | "pon la leyenda de la dona abajo" | Dashboard con dos donas | **Pregunta** cuál de las dos, con sus nombres; después **aplicado** en la elegida | Solo cambió la dona elegida. |
| 20 | "cambia la leyenda a 'Ventas'" | Barras propio | **Pregunta** si es la leyenda o el título de un eje | Nada cambia hasta que el usuario elige. |
| 21 | "cambia el color de la leyenda" | Barras o dona propia | **No disponible**: el texto y el color de la leyenda no se cambian desde aquí; se ofrece moverla u ocultarla | Nada cambió; no se aplicó otra opción en su lugar. |
| 22 | "ponle de título Recaudo mensual" | Barras propio sin títulos de eje | **Aplicado**: renombra el gráfico ("título" a secas es el del gráfico); pregunta solo si el gráfico ya muestra títulos de eje | El gráfico se llama "Recaudo mensual", con el prefijo del dominio. |
| 23 | "agrégale una descripción: cruce por zona" | Tabla dinámica (pivot) propia | **Aplicado**: el título y la descripción se cambian en cualquier tipo | La configuración de la tabla dinámica no cambió. |
| 24 | "quita la columna ESTADO" y luego "¿qué datos muestra ahora?" | 3504 | **Aplicado**; después responde con los datos actuales | Leer los datos de un gráfico funciona después de un cambio de datos (la consulta guardada se reinicia en ese cambio). |
| 25 | Guiado: "pon la leyenda abajo" (primer mensaje) | Dona propia | **Revisión** antes → después; **aplicado** al aceptar | No hay evento `update_chart` antes del "sí". |
| 26 | "quita este gráfico del panel" | Gráfico de otros usuarios, en un dashboard clonado del asistente | **Quitado** del dashboard; avisa que el gráfico sigue existiendo | Ya no aparece en el dashboard **ni vuelve al recargarlo**; sigue en la lista de gráficos. |
| 27 | "elimina el gráfico de recargas" (sin decir "para siempre") | Propio | **Quitado** del dashboard (`permanent: false`); avisa que sigue existiendo y que se puede borrar para siempre | Sigue en la lista de gráficos. |
| 28 | "bórralo definitivamente" | Propio | **Eliminado** para siempre (`permanent: true`); avisa que no se puede deshacer | Ya no está en la lista de gráficos; el dashboard no queda con un espacio vacío. |
| 29 | "bórralo definitivamente" | De otros usuarios | **No eliminado**: pertenece a otros usuarios; ofrece quitarlo solo del dashboard | Nada cambió. |
| 30 | "quita el gráfico de ventas" | Gráfico dentro de una pestaña | **Quitado** | La fila o columna que quedó vacía desaparece; la pestaña y los demás gráficos siguen igual. |
| 31 | "quita el gráfico de ventas" | Dashboard con un gráfico guardado desde el editor que nunca se guardó en el dashboard | **No aplicado**: hay que abrir el dashboard en el gestor de paneles y guardarlo una vez | Nada cambió; ningún otro gráfico desapareció. |
| 32 | "pon la leyenda abajo" | Dona propia con la leyenda oculta | **Aplicado**: muestra la leyenda y la pone abajo, y dice que también la mostró | La leyenda se ve abajo en el dashboard y en el editor. |
| 33 | "agranda el hueco" | Circular propio que no es dona | **Aplicado** convirtiéndolo en dona, y lo dice; o **pregunta** si se quiere dona | Nunca se guarda un hueco sin dona. |
| 34 | "agrúpalo por semana" | Barras propio con el eje X en una categoría (por ejemplo, PLACE) | **Aplicado o pregunta**: pone la fecha en el eje X por semana con la categoría como series y lo dice; o no cambia nada y ofrece hacerlo | Si cambió, el eje X es una fecha, el intervalo es semanal y la categoría sigue como series. |
| 35 | "ponle la etiqueta finanzas" | Cualquiera | **No disponible**: las etiquetas que clasifican el gráfico (tags) no se gestionan desde aquí | No se tocaron las etiquetas de las porciones. |
| 36 | "usa tonos azules" | Dona propia en un dashboard **con** esquema de colores propio | **No aplicado**: el dashboard impone sus colores; se indica cambiarlo en las propiedades del dashboard | Nada cambió. |
| 37 | "pon en rojo la cuenta con más de 1000" | Tabla agrupada propia | **Aplicado** (formato condicional en la métrica) | Las celdas que cumplen la regla se ven en rojo en el dashboard y en el editor. |
| 38 | "colorea la columna CLIENTE_X" | Tabla propia | **No aplicado**: la tabla no muestra esa columna; se dicen las que sí | Nada cambió. |
| 39 | "no la agrupes, muestra cada registro con fecha, punto y valor" | 3504 | **Aplicado**: pasa a fila por fila con esas columnas | La tabla muestra registros sueltos; los filtros siguen. |
| 40 | "no la agrupes" (sin decir columnas) | 3504 | **Pregunta** qué columnas mostrar, o propone las agrupadas actuales | Nada cambia hasta saber las columnas. |
| 41 | "muestra el recaudo como porcentaje del total" | Tabla agrupada propia | **Aplicado** (`percent_metrics`) | Aparece la columna con %. |
| 42 | "ponle de subtítulo 'ventas de hoy'" | Número clave propio creado por el asistente | **Aplicado** | El subtítulo se ve en el dashboard y en el editor (campo Subtitle). |
| 43 | "que el eje Y empiece en 0" | Líneas propio | **Aplicado** (`truncateYAxis` + `y_axis_bounds: [0, null]`) | El eje arranca en 0. |
| 44 | "la segunda serie en barras y en el eje derecho" | Gráfico combinado propio | **Aplicado** | La consulta B se ve en barras sobre el eje secundario. |
| 45 | "en tonos verdes" | Mapa de calor propio | **Aplicado** (`linear_color_scheme`) | El degradado es verde. |
| 46 | "muestra nombre y porcentaje en las etapas" | Embudo propio | **Aplicado** (`label_type: 4`) | Las etiquetas muestran nombre y porcentaje. |
| 47 | "conviértelo en tabla dinámica" | Tabla propia | **No aplicado**: el MCP no construye tablas dinámicas | Nada cambió. |
| 48 | "cambia el velocímetro a rojo" | Velocímetro (gauge) | **No disponible**: ese tipo no se cambia desde aquí | Nada cambió. |

**Si algo falla en la prueba:**
- "la sesión expiró": enviar de nuevo el mensaje; el token se revalida en cada mensaje.
- Un 400 con "CSRF" en el log (`SupersetApiAdapterService`): la cookie o el Referer no llegaron. Revisar `getApiSession`.
- "pertenece a otros usuarios" en un gráfico del asistente: la cuenta de la conexión MCP no es la dueña. El nombre de usuario guardado para el servidor en la base de datos (`oauthMcpAuth.username`) debe ser el mismo que el gestor de paneles muestra como dueño (`MET_BOT_PAY`; se compara sin distinguir mayúsculas).
- Solo se ofrecen cambios de tipo de gráfico, nunca cambios puntuales: falta ese nombre de usuario (el log de `ApiOrchestratorService` lo avisa).
