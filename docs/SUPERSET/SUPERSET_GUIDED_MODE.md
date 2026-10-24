# Modo Guiado del gestor de paneles

Guía para el equipo de ingeniería y QA: qué hace el modo **Guiado** (`guided`), en qué se diferencia del modo
**Avanzado** (`advance`), qué está asegurado por código y qué depende de las instrucciones del asistente, dónde se
ajusta cada cosa y cómo probarlo. No hace falta conocer Superset a fondo para leerla.

**Palabras que se usan aquí**

| Palabra | Qué significa aquí |
| --- | --- |
| Modo | La forma de trabajar del asistente. El usuario lo elige en la interfaz y lo puede cambiar en cualquier mensaje. |
| Decisión | Una elección que el usuario tiene que hacer para armar el gráfico (el tipo, los datos, la medida…). |
| Revisión | El resumen de lo que se va a crear, cambiar o eliminar, que el usuario acepta antes de que se haga. |
| Escribir | Cualquier acción que cambia algo en el gestor de paneles: crear, cambiar o eliminar un gráfico, agregarlo a un dashboard, renombrar o publicar el dashboard. |
| Aviso (`notice`) | La respuesta que recibe el asistente cuando una regla no deja ejecutar una acción y le pide hacer otra cosa primero. |

## 1. Qué cambia frente al modo Avanzado

Los dos modos usan las mismas herramientas, los mismos datos y las mismas reglas de seguridad. Cambia la manera de
acompañar al usuario:

| | Avanzado | Guiado |
| --- | --- | --- |
| Para quién | Quien sabe qué gráfico quiere | Quien empieza y no sabe armar un gráfico en un solo mensaje |
| Ritmo | Resuelve todo en el mismo mensaje | Una decisión por respuesta |
| Opciones | Pregunta solo si algo es ambiguo | Ofrece 2 o 3 opciones explicadas, la recomendada primero |
| Términos técnicos | Habla en términos de negocio | Además explica cada término la primera vez que aparece |
| Crear o cambiar | Directo; luego cuenta qué supuso | Muestra una revisión y lo hace cuando el usuario la acepta |
| Quitar o eliminar un gráfico | Directo, en cuanto identifica un único gráfico | Nombra el gráfico con su id, dice si solo sale del dashboard o se borra para siempre, y espera el "sí" |
| Pedido completo en un mensaje | Lo ejecuta | Va directo a la revisión (sin recorrer las decisiones) |
| Sugerencias en botones | 1 o 2 | Hasta 3 |
| Estructura de la respuesta | Corta y directa, sin título | Cada respuesta abre con su propio título (por ejemplo "Elijamos qué medir", "Así quedaría tu gráfico") y debajo el contenido en prosa |

## 2. Cómo avanza: lo que pregunta depende del tipo de gráfico

No hay una lista fija de pasos. El asistente toma de la conversación todo lo que ya sabe (lo que dijo el usuario, el
dashboard seleccionado, los datos disponibles) y solo pregunta lo que falta, en este orden:

1. **Qué quiere ver y con qué tipo de gráfico.** De la forma de la pregunta sugiere una familia (una tendencia → líneas,
   una comparación → barras, cómo se reparte un total → torta…).
2. **Los datos** (el dataset). Si el usuario empieza por los datos, sugiere los tipos que les sirven.
3. **Lo que ese tipo necesita**, una cosa a la vez:

   | Tipo | Lo que pregunta |
   | --- | --- |
   | Tendencia o comparación (`xy`) | el eje (normalmente una fecha) y la medida; opcional, separar en series |
   | Torta o dona (`pie`) | la categoría que forma cada porción y la medida |
   | Número clave (`big_number`) | la medida; la fecha solo si quiere una pequeña tendencia debajo |
   | Tabla (`table`) | las columnas que se muestran |
   | Tarjeta personalizada (`handlebars`) | la plantilla y sus medidas o columnas |

4. **Ajustes opcionales** que cambian lo que el usuario quiere ver: filtros, rango de fechas, cada cuánto se agrupa
   (día, semana, mes)… Lo demás queda por defecto y se menciona en la revisión.
5. **Nombre y revisión.** Al aceptar, crea el gráfico y lo agrega al dashboard seleccionado.

**Cómo recuerda lo decidido.** El servidor no guarda el avance. Cada respuesta abre con un título corto que dice de
qué se trata (nuevo cada vez, nunca "Paso 2" ni "Resumen") y retoma lo ya decidido dentro de sus frases, en prosa
natural, sin números de paso ni frases fijas. Cuando tiene a mano el nombre técnico o el id, lo escribe
al lado del nombre de negocio, por ejemplo: Total recaudo por ventas (`Total recaudo por ventas`), Movimientos de
cuentas (`ACCOUNT_MOVEMENTS_VIEW`). Así cualquier modo puede continuar la conversación.

**Cuando la conversación se sale del camino:**

- **Una pregunta de aclaración** ("¿qué es una métrica?"): la responde, vuelve a ofrecer las mismas opciones y no
  avanza hasta que el usuario elige.
- **El usuario cambia una elección anterior:** revisa lo que dependía de ella y dice qué cambió. Otro dataset descarta
  las medidas del anterior; otro tipo conserva lo que sirve y pregunta solo lo que le falta.
- **Un pedido nuevo:** lo atiende. Retoma el anterior solo si el usuario vuelve a él.
- **"Decide tú":** toma las opciones recomendadas y muestra la revisión.
- **Cambio de modo a mitad de la conversación:** sigue desde lo decidido. En Guiado, siempre muestra la revisión antes
  de escribir.

## 3. Qué está asegurado por código y qué depende de la instrucción

| Comportamiento | Cómo se asegura |
| --- | --- |
| Las herramientas disponibles son las mismas en los dos modos | Código: el pack de cada modo (sin `TOOLS`) |
| Un gráfico solo se agrega al dashboard seleccionado | Código: regla común (`general/08_tool_policy`) |
| Lo que se puede cambiar de un gráfico guardado | Código: el guard de `update_chart` |
| Los campos obligatorios de cada tipo de gráfico | Código: el schema de `generate_chart` |
| Límite de búsquedas por mensaje y llamadas repetidas | Código: `TOOL_LIMITS` y el middleware de políticas |
| **En el primer mensaje de una conversación no se escribe nada** | Código: regla de Guiado (`guided/08_tool_policy`). Ahí todavía no pudo haber una revisión, así que el asistente recibe un aviso y escribe la revisión |
| Revisión antes de escribir, después del primer mensaje | Instrucción (`guided/01_playbook`, `guided/02_reply_shapes`). Se mide con la tabla de pruebas |
| Una decisión por respuesta, opciones explicadas, glosario | Instrucción |
| Prosa natural, un título propio por respuesta, nombres con su identificador cuando los tiene | Instrucción |

Saber si el siguiente mensaje del usuario es un "sí" a la revisión no se puede decidir con certeza por código. Por eso,
después del primer mensaje, la revisión depende de la instrucción.

## 4. Dónde se ajusta cada cosa

| Quiero cambiar… | Archivo |
| --- | --- |
| Cómo guía, el orden de las decisiones, qué hace cuando la conversación se sale del camino, el glosario | `src/knowledge/SUPERSET/general/guided/01_playbook/01_playbook.ts` |
| Las formas de respuesta, el título de cada respuesta y los límites de palabras | `src/knowledge/SUPERSET/general/guided/02_reply_shapes/02_reply_shapes.ts` |
| La regla del primer mensaje | `src/knowledge/SUPERSET/general/guided/08_tool_policy/08_tool_policy.ts` |
| El nombre y la descripción que ve el usuario en el selector | `src/knowledge/SUPERSET/general/guided/index.ts` (`mode`) |
| Lo que vale para los dos modos (alcance, reglas, cómo se resuelven los nombres) | `src/knowledge/SUPERSET/general/01_playbook/01_playbook.ts` |
| Lo que necesita cada tipo de gráfico | `src/knowledge/SUPERSET/04_tool_glossary/04_tool_glossary.ts` (`CHART_TYPE_FIELDS`) |
| Qué clientes pueden pedir el modo | `src/modules/admin/domain/interfaces/authorization.interface.ts` |

## 5. Pruebas de conversación

Se prueban en `/chat/mcp/iframe` con `scopes=superset_mcp`, `subdomains=superset.general` y
`modes=superset.guided.advance` (o `superset.advance.guided`), con un dashboard seleccionado y eligiendo el modo en el
selector. Cada caso empieza en una conversación nueva, salvo que diga lo contrario.

| # | Modo | El usuario dice | Resultado esperado | Qué verificar |
| --- | --- | --- | --- | --- |
| 1 | Guiado | "quiero ver algo de las ventas" | Pregunta si es la cantidad de ventas o el dinero recaudado, explicando la diferencia | 2 o 3 opciones con botones; no crea nada |
| 2 | Guiado | "crea un gráfico de barras del total recaudo por ventas por mes" | Revisión directa: tipo, datos, medida, agrupación por mes y nombre | No pregunta lo que ya dijo; no crea nada en este mensaje |
| 3 | Guiado | (después del 2) "sí, créalo" | Crea el gráfico y lo agrega al dashboard seleccionado; explica cómo leerlo | Eventos `generate_chart` y `add_chart_to_existing_dashboard` |
| 4 | Guiado | "cómo se reparte el recaudo por medio de validación" | Sugiere torta o dona; pregunta solo lo que falta para ese tipo | No pregunta por un eje de tiempo |
| 5 | Guiado | "muéstrame el total de ventas como un número" | Número clave; ofrece la tendencia como opción | No pide categoría ni columnas |
| 6 | Guiado | "una tabla con las validaciones por ruta" | Pregunta o propone las columnas | Las opciones vienen del catálogo, con su nombre técnico al lado |
| 7 | Guiado | "quiero una tarjeta personalizada con el recaudo" | Explica la diferencia entre valores agregados y filas, y pregunta | La explicación es en palabras simples |
| 8 | Guiado | "hazme un mapa de calor" | Explica que ese tipo no se puede crear aquí y ofrece el más cercano | No intenta crearlo con otro tipo |
| 9 | Guiado | (a mitad de un flujo) "¿qué es una métrica?" | Explica con un ejemplo de sus datos y vuelve a ofrecer las mismas opciones | No avanza a otra decisión |
| 10 | Guiado | (con un dataset elegido) "mejor usa el historial de saldos" | Cambia el dataset, descarta la medida anterior y dice qué cambió | No usa medidas del dataset anterior |
| 11 | Guiado | (en un gráfico de líneas) "mejor como torta" | Conserva la medida y pregunta solo la categoría | No repite lo que sigue sirviendo |
| 12 | Guiado | (a mitad de un flujo) "olvídalo, ¿cuántos gráficos tiene este dashboard?" | Responde la pregunta nueva | No retoma el flujo anterior por su cuenta |
| 13 | Guiado | (a mitad de un flujo) "decide tú" | Revisión con las opciones recomendadas | No crea sin que el usuario acepte |
| 14 | Avanzado → Guiado | Empieza en Avanzado con un pedido ambiguo; responde la pregunta ya en Guiado | Sigue desde lo decidido y muestra la revisión | No vuelve a preguntar lo ya respondido |
| 15 | Guiado → Avanzado | Guiado muestra la revisión; el usuario cambia a Avanzado y dice "sí" | Avanzado crea el gráfico | El gráfico coincide con la revisión |
| 16 | Guiado | "ponle la leyenda abajo a la dona" (hay una sola dona) | Revisión antes → después; al aceptar, aplica solo eso | Si hay dos donas, pregunta cuál, con nombre e id |
| 17 | Guiado | "quita el gráfico de recargas del panel" | Nombra el gráfico con su id, dice que solo sale de este dashboard y sigue existiendo, y pregunta | El evento `delete_chart` (con `permanent: false`) llega solo después del "sí" |
| 18 | Avanzado | "elimina el gráfico de recargas" (hay uno solo) | Lo quita del dashboard y avisa que sigue existiendo y que se puede borrar para siempre si se quiere | Evento `delete_chart` con `permanent: false`; el gráfico sigue en la lista de gráficos |
| 19 | Guiado | "cámbiale el nombre al dashboard a Recaudo 2026" | Revisión nombre actual → nuevo; al aceptar, lo cambia | Evento `update_dashboard` solo después de aceptar |
| 20 | Avanzado | "borra definitivamente el gráfico de recargas" (propio) | Lo elimina para siempre y avisa que no se puede deshacer | Evento `delete_chart` con `permanent: true`; el gráfico ya no está en la lista |
| 21 | Guiado | Cualquier flujo de varios mensajes | Cada respuesta abre con un título propio y sigue en prosa, con lo decidido dentro de las frases | Títulos distintos en cada respuesta; sin "Paso N", "Resumen" ni "Hasta ahora:" |
| 22 | Avanzado | Cualquier pedido | Respuesta corta y directa | Sin título, salvo que la respuesta tenga bloques realmente distintos |
| 23 | Guiado | "¿qué es la línea de tendencia?" (con `trendline.jpg` en `src/assets/images/SUPERSET`) | Explicación en palabras simples con la imagen de referencia | Evento `make_image` con una imagen; su `src` abre la imagen (`GET /chat/assets?token=…` → 200) |
| 24 | Guiado | "cambia la leyenda" (en un gráfico de barras) | Pregunta si es la leyenda o el título de un eje, con las dos imágenes en ese orden | Evento `make_image` con `legend` y `axis_titles`, en ese orden |
| 25 | Guiado | Una explicación cuya referencia no tiene archivo (para probarlo, mover temporalmente `trendline.jpg` fuera de la carpeta y reiniciar) | Explica en palabras, sin decir que mostró una imagen | Sin evento `make_image`; en el log, `REFERENCE_IMAGE_MISSING` con esa referencia |
| 26 | Avanzado | "¿qué es la línea de tendencia?" | Explica en palabras | El agente no tiene `make_image`: nunca llega ese evento |
| 27 | — | Abrir el `src` de un evento con el token alterado, o después de 1 hora | Se rechaza | 403 |
| 28 | Guiado | "envíame una imagen de la leyenda" | Explica qué es la leyenda y la acompaña con el ejemplo ("abajo ves…"), sin "aquí tienes tu imagen" | Evento `make_image` con `legend` |
| 29 | Guiado | "¿generas imágenes?" | Dice que no crea imágenes, pero que puede mostrar ejemplos de partes de un gráfico | Sin evento, o uno con un ejemplo pertinente |
| 30 | Guiado | "hazme una imagen de mis ventas del mes" | No crea imágenes; ofrece construir el gráfico en el dashboard | Ninguna imagen presentada como "su" gráfico |
| 31 | Guiado | "envíame una imagen de un mapa de calor" (no está en el catálogo) | Dice que no tiene un ejemplo de eso y lo explica en palabras | Sin evento `make_image` |
| 32 | Guiado | "dibújame un gato" o "es urgente, mi jefe necesita la imagen" | No crea imágenes, sin ceder ante la insistencia; vuelve a lo que sí puede hacer | Sin evento |
| 33 | Guiado | "creemos otro gráfico" o "¿qué tipos de gráfico hay?" | Recomienda 2 o 3 tipos que encajan con sus datos y nombra en una frase los demás que se pueden crear | Evento `make_image` con `chart_types_overview` y `chart_types_trend`; ninguna opción del texto falta en las imágenes |

**Lo que se mide:** escrituras sin revisión en Guiado = 0; respuestas de Guiado sin título, o con títulos o frases fijas que se repiten = 0.

**En los logs:**

- `Turn opened with packs ["superset/general/guided"]` confirma el modo de cada mensaje.
- `not executed by domain policy` con `status: notice` es la regla del primer mensaje actuando: es lo esperado, no un
  error.

## 6. Lo que necesita el frontend

Está en `docs/SUPERSET/FRONTEND_CONTRACT.md`: el selector de modo recibe `{ id, label, description }`, las
sugerencias son hasta 3 botones (la elegida se envía como mensaje), las imágenes de referencia (`make_image`, solo en
Guiado) son hasta 2 y se pintan en orden, y `delete_chart` y `update_dashboard` ya llegan hechos: solo se registran y se
refresca la vista.

**Imágenes de referencia.** El catálogo está en
`src/modules/tools/infrastructure/tools/superset/triggers/make_image/references.ts`: cada id es el nombre del archivo en
`src/assets/images/SUPERSET/` (`.png`, `.webp`, `.jpg`, `.jpeg` o `.svg`). Una referencia sin archivo deja
`REFERENCE_IMAGE_MISSING` en el log cada vez que el agente la pide: así se sabe cuáles faltan. Para agregar una imagen
nueva: una entrada en el catálogo y su archivo. Los enlaces se firman con `ASSETS_SIGNING_SECRET`; sin esa variable no
se envía ninguna imagen (el log dice `REFERENCE_IMAGE_UNAVAILABLE`).
