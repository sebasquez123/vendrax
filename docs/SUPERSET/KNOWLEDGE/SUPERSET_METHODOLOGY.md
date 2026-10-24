# Metodología de creación y actualización de gráficos y dashboards en el gestor de paneles

## 0. Qué es este documento

Este documento explica, en términos de negocio y de proceso, cómo funciona la creación y edición de gráficos y dashboards en el gestor de paneles a través de Metbot. No es un manual técnico de las herramientas internas del asistente — es el contexto que permite entender, resolver dudas de un usuario y explicar con naturalidad **qué se puede hacer, en qué orden, y por qué una solicitud puntual a veces no se puede aplicar directamente desde el chat**.

La documentación técnica del servicio al que Metbot se conecta incluye funciones que Metbot no ofrece hoy al usuario (por ejemplo consultas SQL libres o la gestión de conexiones de base de datos). Ante cualquier diferencia, este documento es el que describe lo que el usuario realmente puede pedir.

## 1. El dashboard de trabajo

Cada conversación trabaja sobre **un dashboard seleccionado**. Dentro de esa conversación:

- Se puede consultar información de otros dashboards si el usuario lo pide explícitamente, pero las modificaciones (agregar un gráfico, renombrarlo, publicarlo o pasarlo a borrador) siempre aplican solo al dashboard seleccionado.
- No es posible reorganizar la disposición visual de un dashboard (mover, cambiar de fila o columna un gráfico existente), ni crear un dashboard nuevo desde el chat.
- Sí se puede **quitar** un gráfico del dashboard seleccionado sin borrarlo: el gráfico sigue existiendo, los demás dashboards lo conservan y se puede volver a agregar. Es útil, por ejemplo, en un dashboard clonado que trae gráficos que no se necesitan. **Eliminarlo** es otra cosa: lo borra para siempre, de todos los dashboards.
- Agregar un gráfico a este dashboard siempre significa: primero crearlo (o ya tenerlo creado), y luego incorporarlo al dashboard. Son dos operaciones distintas, aunque el asistente puede hacer ambas en una misma respuesta.

## 2. Qué gráficos se pueden crear y configurar en este panel

Metbot reconoce cinco familias de visualización. Cualquier solicitud que encaje en una de estas se puede construir y, más adelante, volver a editar desde el chat:

- **Tendencia o comparación** (líneas, barras, área, dispersión): para ver cómo cambia algo en el tiempo, comparar categorías entre sí, o detectar correlación entre dos valores.
- **Circular o de dona**: para mostrar cómo se reparte un total entre categorías.
- **Número clave (KPI)**: un solo valor destacado, con la opción de mostrar una pequeña tendencia debajo.
- **Tabla**: un listado de filas y columnas, en formato estándar o como grilla interactiva.
- **Tarjeta personalizada**: un reporte o tarjeta con un formato visual propio, pensado para KPIs combinados o reportes a medida.

Configurar cualquiera de estos gráficos significa, en esencia, decidir: de qué fuente de datos vienen los valores, qué columna o métrica se muestra, cómo se agrupan o separan los datos en categorías o series, qué filtros se aplican antes de graficar, y ajustes de presentación propios de cada tipo (por ejemplo el formato de los números, si se muestra la leyenda, o si una tabla se ordena por una columna).

## 3. Qué gráficos existen en el gestor de paneles pero no se pueden crear aquí

El gestor de paneles ofrece más tipos de visualización de los que Metbot sabe construir.

- **Tablas dinámicas, mapas de calor, gráficos combinados (dos series dibujadas de forma distinta) y embudos** no se pueden crear desde el chat, ni convertir otro gráfico en uno de ellos. Pero si ya existen, **sus opciones sí se pueden cambiar**: filas y columnas, métricas, totales, colores, etiquetas, formatos y más (sección 6).
- **Medidores, mapas, nubes de palabras, diagramas de flujo (sankey), árboles jerárquicos (treemap/sunburst), burbujas y diagramas de caja**, entre otros, no se pueden crear ni modificar desde el chat. Metbot puede mostrar su información y sus datos, pero cualquier cambio sobre ellos debe hacerse directamente en el gestor de paneles.

## 4. Cómo se crea un gráfico nuevo

El asistente trabaja en dos modos, que el usuario elige en la interfaz y puede cambiar en cualquier mensaje:

- **Avanzado**: trabaja directo. Entiende el pedido, completa lo que falta con los datos disponibles y crea o cambia el gráfico en el mismo mensaje.
- **Guiado**: acompaña paso a paso a quien empieza. Avanza una decisión a la vez, ofrece opciones explicadas, explica cada término la primera vez que aparece y muestra un resumen antes de crear, cambiar o eliminar: nada se hace hasta que el usuario lo acepta. Si el pedido ya trae todo, va directo a ese resumen.

En los dos modos no hay una secuencia fija de pasos: el asistente parte de lo que el usuario ya dijo y solo pregunta lo que no puede resolver por sí mismo. Para crear un gráfico necesita cuatro cosas:

- **la fuente de datos** (el dataset),
- **el tipo de visualización** (sección 2),
- **lo que el gráfico muestra** según su tipo: la métrica o valor a medir, la columna de fecha o la categoría que lo agrupa, y los filtros que el usuario pida,
- **un nombre** para el gráfico.

Cada una se toma de la solicitud o se deduce cuando solo hay una opción razonable: el tipo de gráfico se deduce de la forma de la pregunta (una tendencia en el tiempo, una comparación entre categorías, cómo se reparte un total, un número clave, un listado); la métrica, de la métrica guardada cuyo nombre coincide con lo que pide el usuario; el eje de tiempo, de la fecha principal del dataset. El asistente conoce de antemano las fuentes de datos disponibles, sus columnas y sus métricas, así que sabe desde el primer mensaje si hay datos para lo que se pide; nunca pregunta por algo que esa información ya responde ni usa un nombre que no exista.

- Si la solicitud es completa, en el modo Avanzado el asistente **crea el gráfico de una vez** y, si hay un dashboard seleccionado, lo agrega a él en el mismo paso; en el modo Guiado, primero muestra el resumen y crea el gráfico cuando el usuario lo acepta. Luego cuenta qué construyó y qué supuso (por ejemplo, "agrupé por mes"), para que el usuario lo ajuste si quiere. La vista del dashboard se actualiza sola.
- Si algo admite dos interpretaciones que cambian el resultado —por ejemplo, "ventas" puede ser la *cantidad* de ventas o el *dinero* recaudado por ventas—, el asistente hace **una sola pregunta** con las opciones reales y después crea el gráfico.
- Si no hay datos para lo que se pide, lo dice directamente.

En el modo Avanzado, crear no requiere confirmación previa porque no cambia nada existente: un gráfico recién creado se puede ajustar o eliminar en el siguiente mensaje. En el modo Guiado, lo que el gráfico necesita depende de su tipo (por ejemplo, una torta necesita una categoría y una métrica; un número clave, solo una métrica), y el asistente pregunta solo por lo que ese tipo usa.

## 5. Cómo se actualiza un gráfico existente

1. **Se ubica el gráfico**: dentro del dashboard seleccionado, o buscándolo por nombre si el usuario se refiere a otro. Si varios coinciden, se pregunta cuál.
2. **Se revisa si el cambio se puede aplicar** (ver sección 6) a partir de la configuración actual del gráfico.
3. **Se aplica el cambio.** En el modo Guiado, antes se muestra cómo queda (antes → después) y se aplica cuando el usuario lo acepta. Solo cambia lo que se pidió: el resto de la configuración del gráfico (filtros de fecha, agrupación, buscador, alineación de columnas, etc.) queda exactamente como estaba.

Si el resultado es que el gráfico **no se actualizó**, eso se comunica tal cual, explicando el motivo en palabras simples — nunca se informa un cambio como aplicado si no lo fue.

## 6. Qué se puede cambiar de un gráfico existente y por qué a veces no se puede

Esta sección responde a la pregunta de "¿por qué no puedo cambiar esto si es un gráfico simple?".

**Cambio puntual (lo normal).** El asistente cambia solo la parte pedida y deja todo lo demás como estaba. Según el tipo de gráfico se puede cambiar, por ejemplo:

- **Tabla:** si se agrupa o muestra cada registro, qué columnas se muestran o por cuáles se agrupa, las métricas y las métricas en porcentaje del total, el orden, los filtros (incluido el rango de fechas), las filas por página o la paginación desde el servidor, el buscador, la fila de totales, las barras dentro de las celdas, los colores de positivos y negativos, el formato condicional (colorear celdas o filas según su valor, en verde, amarillo o rojo), el formato de fecha y la alineación o el formato de cada columna.
- **Circular o de dona:** la categoría y la métrica, el orden de las porciones, la paleta de colores, si es dona y el tamaño del hueco, las etiquetas (qué muestran, si van por fuera, el porcentaje mínimo para mostrarlas), el total, el formato de los números y la leyenda (si se muestra, su posición y su estilo).
- **Tendencia o comparación:** el eje X, las métricas, las series, el intervalo de tiempo (día, semana, mes…), la paleta de colores, la leyenda, los títulos de los ejes, los límites del eje Y, el formato de números y fechas, la escala logarítmica, los valores sobre el gráfico, los puntos sobre la línea, el apilado, la dirección de las barras, la rotación de las etiquetas y el zoom.
- **Número clave:** la métrica, el formato del número, su tamaño, el subtítulo y la línea de tendencia.
- **Tarjeta personalizada:** sus datos (agrupados o registro por registro), la plantilla y su estilo.
- **Tabla dinámica:** filas y columnas, métricas, cómo se combinan los valores (suma, promedio, porcentaje del total…), totales y subtotales, el orden, los formatos y el formato condicional.
- **Mapa de calor:** los ejes y la métrica, el intervalo de tiempo, el degradado de colores, el orden de los ejes, los valores en las celdas y la leyenda.
- **Gráfico combinado:** los datos de cada una de sus dos consultas, cómo se dibuja cada una (línea, barras, escalones…), en qué eje va, el apilado, los títulos y formatos de los ejes, la paleta y la leyenda.
- **Embudo:** las etapas y la métrica, el orden, cómo se calculan los porcentajes, las etiquetas, la paleta y la leyenda.
- **En todos:** el nombre y la descripción.

Los colores se cambian por paleta completa (Superset trae 18, como "Blue to green" o "Waves of blue"), no el color de una serie o categoría puntual. Si el dashboard tiene un esquema de colores propio, ese esquema manda sobre el de cada gráfico, y el asistente lo dice en vez de aplicar un cambio que no se vería.

Cuando alguien pide algo de la lista, el asistente revisa antes de guardar que las columnas y métricas existan en la fuente de datos, que los valores tengan sentido y que el cambio se vaya a ver: algunas opciones dependen de otra (el tamaño del hueco solo existe en una dona; la posición de la leyenda, solo si la leyenda se muestra; el intervalo de tiempo, solo si el eje X es una fecha). Si no, explica por qué y no cambia nada.

**Qué significa "restablecer".** Cada opción de un gráfico tiene un valor por defecto. Si un cambio no conservara una opción, esa opción volvería a su valor por defecto: el gráfico seguiría funcionando, pero con el aspecto estándar (por ejemplo, sin buscador o con la leyenda arriba). Perder un filtro de fechas o una agrupación es más grave, porque cambia **los datos que se muestran**. El cambio puntual evita ambos casos, porque no toca lo que no se pidió.

**Cambio de tipo de gráfico** (por ejemplo, de tabla a barras). Aquí sí hay que reconstruir el gráfico completo. Solo se hace si no se pierde nada importante: si el gráfico tiene filtros de fechas, métricas o columnas con fórmulas SQL, u otros ajustes que la reconstrucción no conserva, el cambio no se aplica y el asistente explica qué se perdería.

**Lo que no se cambia desde el chat**, aunque el gráfico sea de un tipo soportado:

- gráficos que pertenecen a otros usuarios: el gestor de paneles solo deja modificar un gráfico a sus dueños;
- el color de una serie o categoría puntual, las etiquetas (tags), los dueños, el dashboard en el que está el gráfico y su certificación;
- las métricas, columnas o filtros escritos con fórmulas SQL: se conservan, pero no se crean ni se editan aquí;
- cualquier otra opción del editor del gráfico que no esté en la lista anterior.

En resumen, para un gráfico concreto hay cuatro situaciones posibles:

| Situación | Resultado |
| - | - |
| El cambio está en la lista de lo que se puede cambiar de ese tipo de gráfico | Se aplica solo esa parte; el resto queda igual. |
| El cambio es de algo que no está en la lista (el color de una sola serie, etiquetas (tags), fórmulas SQL…) | **No se aplica**; se indica hacerlo directamente en el gestor de paneles. |
| El gráfico pertenece a otros usuarios | **No se aplica**; sus dueños pueden cambiarlo en el gestor de paneles. |
| Es una tabla dinámica, un mapa de calor, un gráfico combinado o un embudo | Se cambian sus opciones; no se puede convertir en otro tipo ni crear uno nuevo. |
| Es de otro tipo de visualización avanzado (sección 3) | **No se aplica**; cualquier edición debe hacerse directamente en el gestor de paneles. |

## 7. Preguntas frecuentes

**¿Qué gráficos podemos configurar en este panel?**
Primero se responde con la taxonomía general de las secciones 2 y 3: cualquier gráfico de tendencia/comparación, circular, número clave, tabla o tarjeta personalizada se puede crear o editar aquí; las tablas dinámicas, los mapas de calor, los gráficos combinados y los embudos no se crean aquí, pero sus opciones sí se cambian; el resto de tipos avanzados del gestor de paneles solo se pueden consultar. Para un gráfico puntual que el usuario ya tiene en el dashboard, si la pregunta es "¿puedo editar *este* gráfico en particular?", la respuesta depende de quién es su dueño y de qué se quiere cambiar, y se resuelve en el momento revisando el gráfico (sección 6).

**Cambié la leyenda (o las etiquetas, o el formato) y no se ve, ¿por qué?**
El asistente solo cambia opciones que se ven tanto en el dashboard como en el editor del gráfico. Si lo pedido no está en esa lista (sección 6), o no se vería (por ejemplo, la paleta de un gráfico en un dashboard con esquema de colores propio), lo dice en vez de guardarlo. Si un cambio hecho por otra vía no se ve, conviene revisarlo directamente en el gestor de paneles.

**¿Por qué no me deja reorganizar el dashboard o moverle los gráficos?**
Porque esa funcionalidad no existe desde el chat (sección 1); hoy solo se puede agregar un gráfico nuevo, quitar o eliminar uno, renombrar el dashboard, o cambiar su estado publicado/borrador.

**¿Cuándo se aplican los cambios al dashboard?**
En el momento en que el asistente los hace: quitar o eliminar un gráfico, renombrar el dashboard o publicarlo/pasarlo a borrador. La vista se actualiza sola, y el asistente informa el resultado tal como quedó guardado.

**¿Qué diferencia hay entre quitar un gráfico y eliminarlo?**
Quitarlo lo saca solo del dashboard seleccionado: el gráfico sigue existiendo y se puede volver a agregar. Eliminarlo lo borra para siempre, de todos los dashboards, y no se puede deshacer; solo se puede eliminar un gráfico propio del asistente. Si el pedido no deja claro que se quiere borrar para siempre (por ejemplo, un simple "elimina el gráfico"), el asistente solo lo quita del dashboard y avisa que el gráfico sigue existiendo.

**¿Qué pasa si pido eliminar un gráfico por error?**
Si solo se quitó del dashboard, se puede volver a agregar. Si se eliminó para siempre, no se puede deshacer. En el modo Avanzado, el asistente actúa en cuanto identifica exactamente un gráfico (si varios coinciden, pregunta cuál). En el modo Guiado, antes nombra el gráfico, dice qué va a pasar y espera la confirmación del usuario. Si no hay certeza de cuál gráfico es, conviene usar el modo Guiado o pedir primero que el asistente lo muestre.

**¿Qué diferencia hay entre el modo Avanzado y el Guiado?**
Los dos pueden hacer lo mismo con los mismos datos. Avanzado resuelve el pedido en un mensaje; Guiado va paso a paso, explica los términos, ofrece opciones y pide aceptar un resumen antes de crear, cambiar o eliminar. Se puede cambiar de modo a mitad de una conversación: el asistente continúa desde lo que ya se decidió.

## 8. Lo que este asistente no hace hoy

- Reorganizar el layout de un dashboard (mover gráficos o cambiarlos de fila o columna).
- Crear un dashboard nuevo desde cero.
- Construir tablas dinámicas, mapas de calor, gráficos combinados o embudos (sus opciones sí se cambian), ni construir o editar cualquier otro tipo fuera de las cinco familias de la sección 2.
- Cambiar el color de una serie puntual, las etiquetas (tags), los dueños, la certificación de un gráfico o el dashboard al que pertenece, ni modificar gráficos de otros usuarios.
- Ejecutar consultas SQL libres, gestionar conexiones de base de datos, o generar enlaces de exploración fuera del propio gráfico creado.

Si una solicitud cae en esta lista, se comunica la limitación directamente en vez de intentar simularla con otra función.

## 9. Glosario: qué es cada pieza de un gráfico

Esta sección explica, en palabras simples, cada pieza que se puede elegir al crear un gráfico o cambiar después. Sirve para responder preguntas como "¿qué es la línea de tendencia?" o "¿para qué sirven los filtros?". Qué piezas tiene cada tipo de gráfico está en la sección 6.

### Los datos

**Dataset (fuente de datos, conjunto de datos):** la tabla de donde el gráfico toma la información, por ejemplo Movimientos de cuentas. Cada gráfico lee un solo dataset; para usar otro hay que crear un gráfico nuevo.

**Métrica:** el número que el gráfico calcula, como el dinero recaudado o la cantidad de ventas. Puede ser una métrica guardada en el dataset (ya definida, con su nombre de negocio) o una columna numérica con una agregación, por ejemplo la suma de VALOR.

**Agregación (suma, conteo, promedio):** cómo se juntan muchos registros en un solo número: sumar, contar, promediar, tomar el mínimo o el máximo, o contar los valores distintos. Contar dice cuántos registros hay; sumar acumula un valor, como el dinero.

**Columna o dimensión (categoría):** una característica de cada registro, como la fecha, el punto de venta o el tipo de dispositivo. Sirve para agrupar, separar en series o filtrar.

**Filtros:** las condiciones que deciden qué registros entran al gráfico antes de calcular, por ejemplo "solo el punto de venta Centro" o "estado distinto de anulada". Se pueden combinar varios. Comparan una columna con un valor: igual, distinto, mayor, menor, contiene un texto o está en una lista. Los filtros escritos con fórmulas SQL se conservan, pero no se crean ni se editan desde el chat.

**Rango de fechas (rango de tiempo):** un filtro sobre una columna de fecha que limita el periodo que se muestra: la última semana, el último mes, los últimos 30 días, el mes calendario anterior o entre dos fechas. Quitarlo hace que el gráfico muestre todo el histórico.

**Límite de filas:** cuántos registros como máximo trae el gráfico. Sirve para que un gráfico con muchos datos cargue rápido; si el límite es bajo, puede dejar datos por fuera.

### El tiempo

**Eje de tiempo:** la columna de fecha que ordena un gráfico de tendencia de izquierda a derecha.

**Intervalo de tiempo (granularidad, agrupar por día, semana o mes):** cada cuánto se agrupan los datos sobre el eje de tiempo: por hora, día, semana, mes, trimestre o año. Por ejemplo, "por mes" muestra un punto por cada mes. Solo aplica cuando el eje X es una fecha.

**Línea de tendencia (número clave):** una pequeña línea debajo del número clave que muestra cómo ha cambiado ese valor en el tiempo, por ejemplo el recaudo de cada día del último mes. Necesita una columna de fecha y un intervalo (día, semana, mes). Puede empezar en cero o ajustarse a los valores para que la variación se note más.

### Ejes, series y escalas (gráficos de tendencia o comparación)

**Eje X:** la línea horizontal del gráfico: casi siempre la fecha, o una categoría cuando se comparan grupos, como los puntos de venta.

**Eje Y:** la línea vertical, donde se leen los valores de las métricas.

**Serie (desglose, separar por):** dividir la misma métrica en varias líneas o barras, una por categoría. Por ejemplo, el recaudo diario separado por punto de venta muestra una línea por cada punto.

**Tipo de trazo:** cómo se dibujan los datos: líneas (para tendencias), barras (para comparar), área (líneas con el espacio de abajo relleno) o dispersión (puntos sueltos).

**Apilado:** poner las series una encima de otra en lugar de lado a lado, para ver el total y cómo se compone. El apilado al 100 % muestra cada parte como porcentaje del total.

**Orientación de las barras:** barras verticales (de abajo hacia arriba) u horizontales (de izquierda a derecha); las horizontales ayudan cuando los nombres de las categorías son largos.

**Títulos de los ejes:** un texto junto a cada eje que dice qué se mide, por ejemplo "Recaudo (COP)". Llevan un margen para no encimarse con los números del eje.

**Escala logarítmica:** una forma de dibujar el eje Y en la que cada paso multiplica en lugar de sumar. Sirve cuando hay valores muy grandes y muy pequeños en el mismo gráfico, para que los pequeños no queden aplastados.

**Límites del eje Y:** fijar dónde empieza y dónde termina el eje Y, por ejemplo que empiece en 0. Solo amplía el eje; nunca oculta datos que queden por fuera.

**Valores sobre el gráfico:** escribir el número encima de cada barra o punto.

**Puntos (marcadores):** un punto en cada dato de una línea o un área, para ver dónde cae cada valor. Se puede ajustar su tamaño.

**Rotación de las etiquetas del eje X:** girar los textos del eje X (0, 45 o 90 grados) para que no se monten unos con otros.

**Zoom:** una barra bajo el gráfico para acercarse a un tramo del eje X, por ejemplo una semana dentro de un año.

**Eje secundario (gráfico combinado):** un segundo eje Y, a la derecha, para una serie que se mide en otra escala, por ejemplo cantidad de ventas a la izquierda y dinero a la derecha.

### Leyenda, etiquetas y colores

**Leyenda:** el recuadro que dice qué color corresponde a cada serie o porción. Se puede mostrar u ocultar, ponerla arriba, abajo, a la izquierda o a la derecha, y elegir si se desplaza en una línea o muestra todos los elementos.

**Etiquetas (de una torta o un embudo):** los textos sobre cada porción o etapa. Pueden mostrar el nombre, el valor, el porcentaje o una combinación; ir dentro o fuera de la porción, con una línea que las une; y ocultarse en las porciones muy pequeñas. No son lo mismo que las etiquetas (tags) que clasifican un gráfico, que no se gestionan desde el chat.

**Paleta de colores:** el conjunto de colores que el gráfico usa para sus series o porciones. Superset trae 18, como "Superset Colors" (la predeterminada), "Blue to green" o "Waves of blue". Se cambia la paleta completa, no el color de una serie puntual. Si el dashboard tiene un esquema de colores propio, ese esquema manda sobre el del gráfico.

**Degradado de colores (mapa de calor):** la escala de color que va de los valores bajos a los altos, por ejemplo de verde claro a verde oscuro, o de amarillo a rojo.

### Formatos

**Formato de números:** cómo se escriben los valores: abreviados (1,2 mil o 3,4 M), con dos decimales, como porcentaje o como moneda.

**Formato de fecha:** cómo se escriben las fechas, por ejemplo 15/10/2026, oct 2026 o solo el día y el mes. El formato "inteligente" se adapta al intervalo de tiempo.

### Tabla

**Tabla agrupada o fila por fila:** una tabla agrupada junta los registros por una o varias columnas y calcula métricas para cada grupo (por ejemplo, el recaudo de cada punto de venta). Una tabla fila por fila muestra cada registro tal como está, con las columnas elegidas. Pasar de una a otra cambia qué se ve.

**Columnas:** en una tabla agrupada, las columnas por las que se agrupa; en una tabla fila por fila, las columnas que se muestran.

**Métricas en porcentaje del total:** muestran cada valor como su parte del total, por ejemplo qué porcentaje del recaudo aporta cada punto de venta. El total es el de las filas que trae la tabla.

**Orden:** en qué orden aparecen las filas. Una tabla agrupada se ordena por una métrica (de mayor a menor o al revés); una tabla fila por fila, por una o varias columnas.

**Buscador:** una caja de texto sobre la tabla para encontrar filas escribiendo una palabra.

**Filas por página (paginación):** cuántas filas se ven a la vez; el resto se recorre por páginas. 0 muestra todas.

**Paginación desde el servidor:** traer los datos de a una página por vez, para tablas con muchísimos registros. Es una función experimental del gestor de paneles.

**Fila de totales:** una última fila con el total de cada métrica, en tablas agrupadas.

**Barras dentro de las celdas:** una barra de fondo en las celdas numéricas, proporcional al valor, para comparar a simple vista.

**Colores de positivos y negativos:** pintar los números positivos y negativos con colores distintos.

**Formato condicional:** pintar celdas según una regla sobre su valor, por ejemplo poner en verde las ventas mayores a 1.000 o en rojo las menores a 100. El color puede ser verde, amarillo o rojo, ir en el fondo o en el texto, y aplicarse a la celda o a toda la fila. Sin una regla de comparación, sombrea todos los valores de menor a mayor.

**Formato por columna:** ajustes propios de cada columna: alineación, decimales, formato de fecha o ancho.

**Reordenar columnas:** permite a quien mira la tabla arrastrar las columnas para verlas en otro orden; ese orden no se guarda.

**Tabla estándar o grilla interactiva:** dos formas de mostrar una tabla; la grilla interactiva ofrece más herramientas a quien la mira.

### Tabla dinámica

**Tabla dinámica (tabla pivote, cruce de datos):** una tabla que cruza dos categorías, una en las filas y otra en las columnas, y pone una métrica en cada cruce. Por ejemplo, puntos de venta en las filas, meses en las columnas y el recaudo en cada celda.

**Filas y columnas de la tabla dinámica:** las categorías que forman las filas y las que forman las columnas del cruce.

**Métricas en filas o en columnas:** cuando hay varias métricas, si se muestran una al lado de la otra en las columnas o una debajo de la otra en las filas.

**Cómo se combinan los valores (función de agregación):** cómo se calculan las celdas y los totales: suma, conteo, promedio, mediana, mínimo, máximo, primero, último, conteo de valores únicos, o como fracción del total, de la fila o de la columna.

**Totales y subtotales:** una fila o columna adicional con el total de cada fila o columna, y subtotales por cada grupo cuando hay varias categorías anidadas. Los subtotales pueden ir arriba o abajo, a la izquierda o a la derecha.

**Transponer:** intercambiar filas y columnas.

**Combinar métricas:** mostrar las métricas juntas dentro de cada columna en lugar de en bloques separados.

**Orden de filas y columnas:** por nombre (de la A a la Z o al revés) o por valor (de menor a mayor o al revés).

**Límite de celdas:** cuántos datos como máximo trae la tabla dinámica.

### Mapa de calor

**Mapa de calor:** una cuadrícula que cruza dos categorías (una a lo ancho y otra a lo alto) y pinta cada cuadro con un color según su valor, del más bajo al más alto. Por ejemplo, días de la semana contra horas, coloreado por cantidad de ventas.

**Contra qué se compara el color:** el color de cada cuadro puede compararse con todo el mapa, solo con su columna o solo con su fila.

**Orden de los ejes del mapa de calor:** por nombre o por valor, en cada eje.

**Leyenda continua o por tramos:** la leyenda del mapa de calor puede ser una barra de degradado o una lista de rangos de valores.

**Valores en las celdas y porcentajes:** escribir el valor dentro de cada cuadro, y mostrar el porcentaje al pasar el cursor.

**Color por posición (normalizado):** colorear según el puesto de cada valor (del menor al mayor) en lugar de su valor exacto, útil cuando unos pocos valores muy altos opacan el resto.

### Gráfico combinado

**Gráfico combinado (series mixtas):** un gráfico de tendencia con dos consultas sobre el mismo eje de tiempo, cada una dibujada a su manera. Por ejemplo, la cantidad de ventas en barras y el recaudo en línea.

**Consulta A y consulta B:** cada una tiene sus propias métricas, series, filtros y límite de filas; el eje X y el intervalo de tiempo son comunes.

**Cómo se dibuja cada consulta:** línea, línea suave, dispersión, barras o escalones (la línea sube en tramos, al inicio, en medio o al final de cada intervalo).

**Área de una consulta:** rellenar el espacio bajo su línea.

### Embudo

**Embudo:** un gráfico de etapas que se van reduciendo, como clientes que inician, confirman y pagan. Cada etapa es una categoría y su tamaño, el valor de la métrica.

**Cálculo de porcentajes del embudo:** el porcentaje de cada etapa puede calcularse respecto a la primera etapa, a la etapa anterior o al total.

**Etiquetas del embudo:** qué se escribe en cada etapa (nombre, valor, porcentaje o una combinación) y qué se muestra al pasar el cursor.

### Número clave

**Número clave (KPI, indicador):** un solo valor destacado, como el recaudo del mes. Puede llevar una línea de tendencia debajo.

**Tamaño del número:** qué tan grande se ve el valor principal.

**Subtítulo:** un texto corto debajo del número, por ejemplo "Recaudo del mes". Se puede ajustar su tamaño.

### Torta o dona

**Torta y dona:** una torta reparte un total en porciones; una dona es la misma torta con un hueco en el centro. El tamaño del hueco y el de la torta se pueden ajustar.

**Categoría de las porciones:** la columna que define cada porción, por ejemplo el tipo de dispositivo.

**Orden de las porciones:** por valor (de la más grande a la más pequeña) o en el orden de las categorías.

**Total de la torta:** mostrar la suma de todas las porciones.

### Tarjeta personalizada

**Tarjeta personalizada (plantilla):** un gráfico cuyo aspecto se escribe con una plantilla HTML y estilos CSS, para reportes o tarjetas con un diseño propio. Sus datos pueden venir agrupados (con métricas) o fila por fila.

### El gráfico y el dashboard

**Título del gráfico:** el nombre que se ve en el dashboard. Los gráficos que crea o renombra el asistente llevan al inicio una marca con el dominio, por ejemplo "[METBOT - PAY]".

**Descripción:** un texto que explica qué muestra el gráfico; se ve en el dashboard junto al gráfico.

**Gráfico guardado:** un gráfico que queda en el gestor de paneles y se puede agregar a uno o varios dashboards. Una vista previa no se guarda.

**Dashboard (panel):** la página que reúne varios gráficos. La conversación trabaja sobre el dashboard seleccionado (sección 1).

**Publicado o borrador:** un dashboard publicado aparece en la lista de dashboards de los usuarios que tienen acceso a sus datos; uno en borrador solo aparece en la lista de sus dueños (y de los administradores), como trabajo en curso.

**Quitar o eliminar un gráfico:** quitarlo lo saca solo del dashboard seleccionado; eliminarlo lo borra para siempre, de todos los dashboards (sección 7).

**Esquema de colores del dashboard:** una paleta que el dashboard impone a todos sus gráficos; cuando existe, manda sobre la paleta de cada gráfico.
