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
