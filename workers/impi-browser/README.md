# IMPI Browser Run — laboratorio independiente

**Objetivo prioritario:** conectar una consulta MARCANET de verdad con la UI de Surfing Legals, no publicar orientaciones sin antecedentes.

## Estado demostrado

- GitHub Actions + Chromium en contenedor: `RETRO GAME FEST`, clase 41, **297 filas** y coincidencia de los primeros tres expedientes con la búsqueda de Work.
- Cloudflare Worker `sl-impi-browser-lab`: **compilación `wrangler deploy --dry-run` y pruebas de validación exitosas**.
- **No desplegado en Cloudflare**: todavía no hay ejecución real desde Browser Run, latencia ni límite de uso verificado.
- UI de prueba en la rama Preview: `/servicios/consulta-marca/consulta-impi-lab/`; su API `/api/marcas/laboratorio` está **deshabilitada por defecto**.
- Producción y SIGES no han sido modificados.

## Cómo desplegar solo el laboratorio (con la cuenta Cloudflare autorizada)

1. Confirmar que el plan Cloudflare del proyecto permite Browser Run, revisar las cuotas y que las consultas automatizadas respeten los controles del IMPI.
2. Abrir terminal en la rama `feature/consulta-marca-v1` (nunca `main`), carpeta `workers/impi-browser`.
3. Ejecutar `npm install`, `npx wrangler login` y `npx wrangler deploy`. Esto crea **un Worker independiente** llamado `sl-impi-browser-lab`, no sustituye la web.
4. Crear una clave aleatoria exclusiva del piloto y guardarla mediante `npx wrangler secret put SL_IMPI_PILOT_KEY`. No enviarla en chat, correo ni registrarla en GitHub. **Sin este secreto, la consulta está deshabilitada.**
5. Verificar la dirección `https://sl-impi-browser-lab.<subdominio>.workers.dev/health` y una consulta de referencia autenticada `POST /internal/consulta`, JSON `{"marca":"RETRO GAME FEST","clase":"41"}`. El encabezado `Authorization: Bearer <clave>` se agrega solo en cliente interno confiable, nunca en la página pública.
6. Si recupera 297 filas y coinciden los tres expedientes, configurar **exclusivamente en el entorno Preview de Cloudflare Pages**:
   - `SL_IMPI_BROWSER_ENABLED` = `true`
   - `SL_IMPI_BROWSER_URL` = `https://sl-impi-browser-lab.<subdominio>.workers.dev`
   - `SL_IMPI_PILOT_KEY` = **secreto** con el mismo valor del Worker, nunca de acceso público.
   - Conservar el `TURNSTILE_SECRET` existente para el dominio Preview.
7. Volver a desplegar **Preview** (rama `feature/consulta-marca-v1`) y abrir:
   `https://feature-consulta-marca-v1.surfinglegals.pages.dev/servicios/consulta-marca/consulta-impi-lab/`.

La nueva página solo muestra hasta 25 antecedentes y el total **capturado**, no declara registrabilidad. Para el caso de referencia compara los 297 con el informe de Work; para búsquedas distintas, hasta contar con un criterio adicional de integridad, informa que la totalidad no está comprobada.

## Controles del laboratorio

- `/internal/consulta` requiere secreto exclusivo y no admite CORS público.
- Solo se permite inicialmente `RETRO GAME FEST | 41`. Para nuevas pruebas el administrador puede habilitar hasta tres pares adicionales mediante la variable privada `SL_IMPI_PILOT_ALLOWED_QUERIES`: ejemplo `NOMBRE UNO|41;NOMBRE DOS|35`. No habilitar sin revisión.
- Una sesión de navegador por solicitud; no hay bucles ni reintentos para esquivar verificaciones; falla ante bloqueo.
- El servicio y el sitio están separados: no se conectará a clientes reales hasta confirmar cuotas, controles antiabuso, condiciones del IMPI y trazabilidad de las consultas.
- No habilitar la captura real de prospectos ni modificar SIGES en esta fase.

## Siguiente fase, cuando funcione Cloudflare

1. Registrar tiempo por consulta, éxito y discrepancias en tres pruebas de marcas/clases.
2. Comprobar de manera automatizada el contador oficial, no solo las filas capturadas.
3. Crear límites de concurrencia y cuotas de llamadas en el servidor antes de habilitar consultas públicas.
4. Conectar el resultado de navegador al analizador jurídico, distinguiendo prioridad de cotejo y vigencia/estatus no verificados.
5. Habilitar un formulario de contacto con tratamiento real de datos personales, aviso adecuado y manejo seguro de leads **solo después de aprobación**.
