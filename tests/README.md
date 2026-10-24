# Pruebas del agente

Conversan con el agente real desde la terminal, conectadas como el frontend. Hay circuitos por servicio (SUPERSET, PAY), un juez LLM que valora cada respuesta y un reporte por circuito en `tests/<SERVICIO>/reports/`.

## Correr

```bash
npm run test:agent                    # menú: servicio → catálogo → qué correr → repeticiones
```

Sin menú (para CI o un asistente): `npm run test:agent -- --service <SUPERSET|PAY> [--catalog <id>] [grupo …] [--circuit <id>,…] [--repeat <n>] [--list]`.

## `.env`

```bash
# El cliente que se simula: los mismos campos que el frontend envía al socket
CLIENT_TEST_APP_CLIENT_ID=<appClientId>
CLIENT_TEST_USER_ID=<tu id de usuario en PAY>
CLIENT_TEST_AUTHORIZATION=<tu token de PAY>
CLIENT_TEST_SCOPES=superset_mcp.pay_api
CLIENT_TEST_SUBDOMAINS=superset.general&pay.personas
CLIENT_TEST_MODES=superset.advance.guided&pay

# El modelo del agente y del juez (obligatorio). gpt-… u o… → OpenAI; cualquier otro → Gemini
CLIENT_TEST_MODEL=gemini-3.5-flash-lite

# Solo para SUPERSET
SUPERSET_TEST_DASHBOARD_ID=154
# SUPERSET_TEST_BASE_DASHBOARD_ID=   # opcional: gráficos base del desarrollador (ver SUPERSET/README.md)
```

**El handshake no lo revisa la prueba.** Se envía al gateway real, y si algo está mal configurado, el middleware o el guard lo rechazan. La terminal muestra el mismo error que recibiría el frontend:

```text
Conexión establecida  ✗ el socket recibió mcp/Agent/error: Invalid token (estado 401)
```

**Lo demás sale del `.env` del backend,** como siempre: la API key del proveedor y `LANGSMITH_*` para las trazas. El log del servidor queda en `error` durante la prueba.

## Cada servicio, en su dominio

Una corrida solo conversa sobre el servicio elegido:

- **SUPERSET** envía su `stateContext` (el dashboard y los eventos de la interfaz).
- **PAY** no envía ninguno, y falla si el agente usa una herramienta de otro servicio.

## Estructura

```text
tests/
  run.ts            entrada: menú o argumentos
  core/             motor común
    types/          interfaces
    config.ts       variables CLIENT_TEST_* y proveedor
    runtime.ts      conexión al gateway real y conversaciones
    runner.ts       orden de una corrida
    judge.ts        juez y su prompt
    report.ts       confiabilidad y reportes
    terminal.ts     progreso y menú de teclado
  SUPERSET/         circuitos y verificación del gestor de paneles
  PAY/              circuitos y verificación de PAY
```

**Agregar un servicio:**

1. Crea `tests/<SERVICIO>/service.ts` con un `TestService` (ver `core/types`).
2. Agrégalo a `SERVICES` en `run.ts`.
3. Agrega su script en `package.json` y su carpeta `reports/` al `.gitignore`.

PAY es el ejemplo más simple.
