# Conexión segura de prospectos — Surfing Legals (pendiente de activar)

## Destino verificado
Google Sheet **SL - Inteligencia Comercial - PRUEBA V1**, id:
\`1Gz73pG7ZYEea_2iny8IPryxmBEDYBya49VlV7F6705E\`.

La pestaña \`PROSPECTOS\` tiene exactamente estos encabezados, observados el 16-11-2026:
ID, FechaAlta, Nombre, Empresa, Unidad, Servicio, Canal, OrigenURL, Email,
Telefono, Estado, Prioridad, SiguienteAccion, FechaSeguimiento, Notas, Actualizado.

**No se escribió ningún registro en esta hoja. No se accedió ni modificó SIGES.**

## Arquitectura
- Página pública -> \`POST /api/prospectos\` (Cloudflare Pages Function).
- Pages Function valida tipo y tamaño, estructura, aceptación de privacidad, origen y Turnstile.
- Pages Function envía datos por HTTPS al Apps Script webapp con secreto **solo del lado servidor**.
- Apps Script valida nuevamente, comprueba el encabezado de PROSPECTOS y agrega una fila con ID idempotente.
- El navegador solo muestra éxito cuando ambos sistemas confirman la operación.

## Preparación necesaria (todavía no realizada)
1. Revisar y publicar el aviso de privacidad para atención de consultas comerciales, con versión.
2. Crear un proyecto Apps Script **nuevo e independiente** desde la hoja comercial. Pegar \`integrations/comercial-apps-script/Code.gs\`.
3. En *Project Settings → Script properties*, definir:
   - \`SL_SHEET_ID\` = ID exacto de la hoja de pruebas.
   - \`SL_INGEST_TOKEN\` = secreto aleatorio fuerte (>32 caracteres). No guardar en GitHub.
4. Implementar como web app bajo cuenta de servicio autorizada; evaluar permisos y exposición. El endpoint web recibe peticiones que solo autoriza mediante token, no debe hacerse público antes de revisar su configuración.
5. En **Cloudflare Pages** configurar en **Preview** (no Production):
   - \`SL_APPS_SCRIPT_URL\`: URL oficial implementada de Apps Script que termina en \`/exec\`.
   - \`SL_INGEST_TOKEN\`: **mismo** secreto.
   - \`SL_ALLOWED_ORIGINS\`: dirección de preview exacta (HTTPS). Para producción usar solo dominios autorizados.
   - \`SL_PRIVACY_VERSION\`: versión del aviso legal publicado.
   - \`TURNSTILE_SECRET\`: clave privada de Cloudflare Turnstile.
6. Configurar el widget público con \`TURNSTILE_SITE_KEY\` y el texto/URL del aviso de privacidad. **Aún no se ha habilitado el formulario para enviar datos**. El prototipo sigue usando correo \`mailto:\`.
7. Probar primero con un contacto ficticio: verificar una sola fila con ID \`WEB-MARCA-...\`, repetir mismo request_id y comprobar deduplicación. Verificar rechazo sin Turnstile, aviso no aceptado, origen incorrecto, campos inválidos y fallo del receptor.
8. Realizar validaciones de seguridad, privacidad, conservación y accesibilidad. Activar el formulario solo después de aprobarlas.

## Limitaciones del prototipo
- Sin Turnstile no hay POST exitoso; es intencional.
- La comprobación de \`Origin\` es una defensa secundaria, no sustituye Turnstile ni un control de abuso a nivel de Cloudflare.
- El secreto solo se usa servidor a servidor y debe rotarse si se filtra.
- El formulario del sitio sigue sin conectarse al endpoint: aún faltan aviso publicado y claves de Turnstile. No afirmar que ya se reciben prospectos.
- El sistema no realiza búsquedas en MARCANET y no concede diagnósticos automáticos.
- Cloudflare Pages Functions puede requerir configuración especial si el proyecto utiliza despliegue Git basado en Pages; comprobar la configuración antes de probar.

## Plan de aceptación
1. Confirmar la URL de preview.
2. Probar POST con datos ficticios y recibo positivo (id).
3. Comprobar registro y deduplicación en hoja comercial.
4. Probar rechazo de solicitud malformada, de bot y sin consentimiento.
5. Validar aviso de privacidad en UI.
6. Autorizar publicación solo después de la prueba y revisión jurídica.
