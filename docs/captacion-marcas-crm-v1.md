# Surfing Legals — Registro comercial de prospectos de marcas (especificación V1)

**Estado:** diseño técnico para futura integración. No hay backend de recepción configurado ni formulario público conectado. No modificar SIGES-SL sin pruebas sobre un entorno independiente.

## Flujo objetivo
1. Visitante introduce denominación y productos/servicios.
2. Interfaz aclara que no es una búsqueda oficial y ofrece asesoría jurídica.
3. Visitante indica nombre, correo y, opcionalmente, teléfono y autoriza de manera informada la recepción y tratamiento para atender su consulta conforme al aviso de privacidad publicado.
4. Backend recibe por HTTPS; valida datos, aplica antispam, límite de frecuencia y controles de origen adecuados; genera identificador opaco y fecha de recepción.
5. Se registra como **prospecto comercial** en una base separada, no como expediente jurídico existente.
6. Personal autorizado revisa; solo con contratación o instrucción expresa se enlaza a un cliente/expediente en SIGES.

## Modelo mínimo de datos
- id aleatorio no secuencial
- creado_en ISO8601 con zona/hora de referencia
- fuente: surfinglegals_consulta_marca
- denominacion, productos_servicios, etapa
- nombre_contacto, correo_contacto, telefono_contacto (opcional)
- version_aviso_privacidad, fecha_aceptacion, texto_autorizacion
- estado_comercial: nuevo / en_revision / contactado / propuesta / contratado / descartado
- responsable, siguiente_accion, fecha_seguimiento
- origen_resultados: sin_consulta / IMPI_evidencia_verificada
- id_consulta_IMPI (opcional; nunca inventado)

## Requisitos antes de habilitar envío web
- Publicar un aviso de privacidad adecuado e identificar responsable, finalidades, medios ARCO y transferencias.
- Distinguir consentimiento informado para contacto de autorización para comunicaciones promocionales.
- Evitar almacenar credenciales, teléfonos, RFC o expedientes en GitHub público.
- Validación **del lado servidor**, límites, protección antispam, registros de errores sin datos excesivos.
- Restricciones de acceso al CRM y plan de conservación/eliminación de datos.
- Prueba de integración con un proyecto separado de SIGES: importación reversible, idempotencia y deduplicación.
- Política de disponibilidad: si falla el backend, no decir «Solicitud enviada»; ofrecer únicamente el correo manual.
- No exponer ni usar Google Apps Script webapp público sin validar autenticación, controles de abuso y privacidad.

## Estado del prototipo
La página de la rama de desarrollo **solo prepara un correo** mediante mailto después de que el usuario ingresa sus datos. No transmite ni almacena prospectos automáticamente.

## Validación de aceptación para activar backend
- Enviar prospecto de prueba con datos ficticios.
- Verificar la recepción exacta y deduplicación.
- Comprobar que el visitante recibe confirmación **solo cuando el servidor confirma recepción**.
- Ejecutar pruebas de entrada inválida, saturación y fallos.
- Confirmar que SIGES productivo no fue modificado.
- Aprobar revisión jurídica del aviso de privacidad y la comunicación comercial.
