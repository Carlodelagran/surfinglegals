# Consulta de marcas — arquitectura para automatización futura

## Estado al 17 de noviembre de 2026

**Funciona en Preview:** orientación local sin consultar expedientes; lectura de CSV/JSON normalizado en el laboratorio interno; clasificación preliminar de antecedentes; recepción de **prospectos ficticios** mediante Turnstile → Cloudflare Pages Function → Apps Script → hoja comercial de prueba.

**No funciona todavía:** búsqueda oficial automática, clasificación Niza automática fiable, descarga automática de expedientes, dictamen jurídico definitivo ni recepción de clientes reales. No anunciar estos servicios como activos.

## Flujo futuro

1. Usuario introduce denominación y productos/servicios.
2. Un módulo de orientación identifica clases candidatas y **solicita confirmación** cuando hay ambigüedad.
3. Servicio servidor/orquestador inicia búsqueda fonética **en la fuente oficial habilitada por el IMPI** con clase confirmada y denominación normalizada.
4. La búsqueda devuelve **expedientes reales**, con fuente, fecha de consulta y alcance; conservamos CSV/PDF/acuse o JSON fiel cuando sea legal y técnicamente posible.
5. Normalizamos registros mediante `sl.impi.consulta.v1` y rechazamos errores de formato, clase, expediente duplicado o conteo no coincidente.
6. Clasificamos prioridades de cotejo (identidad, secuencias de palabras, otros elementos); revisamos servicios, estatus, similitud fonética y conceptual. Las traducciones literales requieren análisis lingüístico y no se improvisan.
7. La interfaz solo puede mostrar resultados como **«antecedentes obtenidos del IMPI»** cuando el servicio obtuvo y validó una respuesta oficial atribuible. Si falla, declara «búsqueda no disponible»; nunca muestra coincidencias de prueba como reales.
8. El usuario solicita asesoría; solamente tras habilitar el aviso de privacidad y controles adecuados podrá activarse la captura de prospectos reales.

## Fuente oficial y accesibilidad

Flujo verificado manualmente por operador Work:
- `https://acervomarcas.impi.gob.mx:8181/` → «Búsqueda avanzada» → «Búsqueda fonética», denominación y clase.
- El caso de referencia `RETRO GAME FEST`, clase `41`, reportó 297 resultados mediante Work; el **ZIP original debe verificarse como archivo**, no reconstruirse con un listado de ocho antecedentes.
- El IMPI también publica plataformas de búsqueda fonética; el hecho de que exista una interfaz web **no autoriza asumir un endpoint público estable ni permitido para uso automatizado**.
- Puntos pendientes de verificar antes del robot: condiciones de uso, acceso, controles técnicos, volumen permitido, autorización o vía de datos oficial, paginación, exportaciones, cambios de interfaz, códigos de error, estabilidad y trazabilidad.

## Separación de responsabilidades

- Sitio estático público: campos y presentación de resultados; **sin** secretos de IMPI, Cloudflare ni Google.
- Pages Function: valida entradas, límites y sesiones; no expone tokens ni bases de datos; consulta únicamente a una capa de búsqueda autorizada.
- Worker de consulta: aislado del navegador, límites por usuario, colas, trazas y fallos cerrados; nunca intenta eludir CAPTCHA ni controles de acceso del IMPI.
- Motor `analizador-impi.js` / `analisis-juridico.js`: ordena coincidencias **ya obtenidas**, sin proclamar viabilidad jurídica. La etiqueta «ALTA» indica prioridad de **revisión**, no riesgo de rechazo.
- CRM comercial: separado de expedientes SIGES; integración con SIGES solo previa autorización explícita.

## Estado de las rutas

- `/servicios/consulta-marca/`: experiencia del visitante; sin carga de CSV, sin diagnósticos ni botón de prospecto ficticio.
- `/servicios/consulta-marca/laboratorio/`: importación local y análisis interno de CSV/JSON.
- `/servicios/consulta-marca/pruebas/`: comprobación sintética del receptor, solo en Preview y bajo la validación del servidor.

## Criterios antes de activar la búsqueda

- Conservar archivo oficial y huella SHA256, fecha, denominación, clase, total de registros y actuaciones cotejadas.
- Demostrar resultados trazables en al menos varias clases y denominaciones, incluyendo cero coincidencias y fallos.
- Validar estado de registro, vigencia, servicios, similitud fonética y conceptual con abogado.
- Probar controles antiabuso, protección de datos y contingencia si IMPI no responde.
- Mantener rama `main` y producción sin cambios hasta aprobación.

## Integración segura preparada (18/11/2026)

Se añadió `POST /api/marcas/consulta` (Cloudflare Pages Function) y la validación `functions/_lib/impi-official.mjs`.

**Estado real: APAGADO por defecto.** La función devuelve HTTP 503 `fuente_oficial_no_conectada`, sin solicitar al IMPI ni fabricar antecedentes.

Para activarla, se requieren **simultáneamente**:
- Evidencia de una API oficial documentada y habilitada para uso automatizado, con autorización/condiciones de acceso y soporte de búsqueda por marca y clase.
- Variables **solo en Preview**, tras autorización de la dirección: `IMPI_OFFICIAL_PROVIDER_ENABLED=true`, `IMPI_OFFICIAL_API_URL` (URL HTTPS estrictamente bajo `impi.gob.mx`) y `IMPI_OFFICIAL_API_KEY` como secreto; `TURNSTILE_SECRET` ya existente.
- Contrato de respuesta `sl.impi.proveedor.oficial.v1` que exija fuente y URL de consulta oficiales, fecha, denominación, clase, total exacto y expediente único con enlace oficial para **cada** antecedente.
- Pruebas de integración con datos oficiales, cotejo contra originales y controles de seguridad/rate limiting. **No se ha completado ninguna de estas condiciones.**

No deducir el esquema real del API a partir del contrato: el esquema implementado es **nuestro modelo interno de adaptación**, no documentación del IMPI.

### Vías públicas revisadas

- Servicio oficial de consulta al público: https://acervomarcas.impi.gob.mx:8181/marcanet/ (MARCANET), referencia desde https://www.gob.mx/impi/documentos/registro-de-marcas
- MARCia: https://marcia.impi.gob.mx/; guía del IMPI https://www.gob.mx/cms/uploads/attachment/file/745081/Gui_a_de_usuario_MARCia_3042022.pdf
- Otras pantallas visibles bajo dominio oficial: https://desabuscadormarcas.impi.gob.mx/fonetica y https://marcanetqa.impi.gob.mx/; **por sus nombres (desarrollo/QA) no deben tratarse como infraestructura de producción** sin confirmación expresa del IMPI.
- Datos abiertos: https://transparencia.impi.gob.mx/Paginas/DatosAbiertos.aspx; no se localizó un conjunto público completo que reemplace una búsqueda fonética oficial con estado registral actualizado.

No se encontró una API pública **documentada y autorizada** para ejecutar la búsqueda fonética IMPI automáticamente. No usar endpoints internos descubiertos mediante ingeniería inversa como sustituto de esa autorización.

### Validaciones automatizadas

`servicios/consulta-marca/tests/impi-broker.test.mjs` comprueba con **datos sintéticos**: validación de denominación/clase, rechazo de dominios falsos, conjuntos incompletos, consultas no coincidentes, expedientes repetidos y vínculos no oficiales. Las pruebas sintéticas no acreditan búsquedas reales.

El botón y las tres páginas existentes no cambian su comportamiento público. Solo se incorporó infraestructura aislada en la rama `feature/consulta-marca-v1`.
