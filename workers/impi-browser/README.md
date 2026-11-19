# IMPI Browser Run — laboratorio independiente

Este piloto **no está desplegado** y **no está conectado a SurfingLegals.com, Pages Preview ni SIGES**.

Objetivo: ejecutar una única búsqueda fonética con Playwright/Browser Run sobre MARCANET:
- RETRO GAME FEST, clase 41.
- Debe recuperar 297 filas y validar los expedientes iniciales 2220564, 2220543 y 1352323.
- No intenta resolver estatus ni publicar un dictamen.
- Rechaza otras marcas y clases, no almacena prospectos, no acepta llamadas desde el navegador.
- No hay reintentos automáticos, navegación masiva ni evasión de controles del IMPI.

## Preparación para una ejecución controlada

El código se mantiene en la rama `feature/consulta-marca-v1`. Inspeccionar gastos/límites y condiciones de acceso antes de desplegar.

Desde la carpeta `workers/impi-browser`:

```bash
npm install
npx wrangler login
npx wrangler secret put SL_IMPI_PILOT_KEY
npx wrangler deploy
```

Usar una clave **nueva**, aleatoria y exclusiva del laboratorio. No compartirla en chats, logs, GitHub ni variables de texto plano. No reutilizar las claves de Turnstile o del CRM.

`GET /health` no hace búsquedas y solo informa que el laboratorio es cerrado.
`POST /internal/consulta` requiere `Authorization: Bearer <SL_IMPI_PILOT_KEY>` y JSON:
```json
{"marca":"RETRO GAME FEST","clase":"41"}
```

La salida contiene la tabla recuperada y marcada como captura de navegador, **no como respuesta de una API oficial**. Ante discrepancias o bloqueos, devuelve error sin resultados y cierra el navegador.

Por diseño el Worker permanece deshabilitado sin el secreto. Se desplegaría como **Worker independiente**, nunca como sustituto del sitio de producción. Confirmar antes de habilitar costos, condiciones de consulta del IMPI, protección de datos y límites de concurrencia.

## Siguientes validaciones

1. Comprobar que el Worker logra repetir los 297 resultados y cotejar fecha/encabezado.
2. Ensayar hasta tres consultas adicionales, ampliando expresamente los casos permitidos y sin cargas masivas.
3. Medir tiempo por búsqueda, éxito de filas, errores y límites del plan Cloudflare.
4. Solo tras esas pruebas, proponer control de cuotas, cola y conexión al motor de análisis en Preview. No activar solicitudes reales sin revisión de límites y condiciones de uso.
