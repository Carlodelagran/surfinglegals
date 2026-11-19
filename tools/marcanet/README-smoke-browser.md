# Prueba controlada: MARCANET → captura local

## Qué sabemos

Work completó el 18/11/2026 una búsqueda fonética **RETRO GAME FEST, clase 41**, con 297 resultados informados por MARCANET (19:47:07). Los selectores identificados en el informe de Work son:
- Clase: `frmBsqFonetica:clases`
- Denominación: `frmBsqFonetica:denominacion`
- Buscar: `frmBsqFonetica:busquedaId2`

El formulario usa POST y PrimeFaces AJAX; por eso una petición HTTP sencilla no es una reproducción fiable. La prueba usa un navegador con JavaScript, sesión y cookies normales. **No se ha verificado aún este script de forma autónoma fuera de Work.**

## Ejecutar una sola búsqueda supervisada

En el repositorio, rama `feature/consulta-marca-v1`, desde una computadora con Node:

```bash
npm install --no-save playwright
npx playwright install chromium
node tools/marcanet/smoke-browser.mjs "RETRO GAME FEST" 41
```

La ventana de Chromium se abrirá visiblemente. No se automatizan reintentos, evasión de CAPTCHA ni consultas masivas. Si aparece bloqueo, validación humana o restricción de uso, detener e informar.

La carpeta `tmp/marcanet-pruebas/` guarda una captura y, solo si se reconoció una tabla con columnas obligatorias y expedientes coherentes, un `resultado-bruto.json`. Cuando no se reconoce la tabla, guarda un diagnóstico de encabezados. **No cargar estas capturas automáticamente al sitio ni a SIGES.**

## Criterios de aceptación

1. El navegador abre la interfaz oficial HTTPS `acervomarcas.impi.gob.mx:8181` sin navegación a dominios inesperados.
2. Se llenan clase y denominación y se espera la respuesta AJAX.
3. El encabezado de la tabla confirma la consulta realizada.
4. El contador oficial indica 297 resultados para RETRO GAME FEST / 41. La tabla exportada debe tener 297 filas no vacías, no filas inventadas.
5. Inspeccionar manualmente: posiciones 1 y 2 RETRO GAME expedientes 2220564 y 2220543; posición 3 GAME FEST expediente 1352323; todos clase 41.
6. Descargar y conservar el PDF de MARCANET como evidencia y comparar fila por fila y conteos.
7. Si la estructura de tabla cambia o no carga, no reportar éxito: inspeccionar pantalla y ajustar selectores.

## Arquitectura posterior

**No asumir que Work = navegador ejecutable automáticamente por Cloudflare Pages.** Para consultas de visitantes necesitaríamos un navegador gestionado de servidor, dentro de los límites y condiciones oficiales, una cola, control de concurrencia, costos y captura verificable de la respuesta. Cloudflare Pages Functions no puede ejecutar directamente un navegador Chromium de escritorio.

Tras la primera ejecución satisfactoria fuera de Work: probar otras dos denominaciones y clases y un caso sin resultados; evaluar la disponibilidad, latencia, estabilidad y restricciones de acceso. Entonces diseñar el servicio de navegador y el contrato de evidencia.

Mientras no haya pruebas autónomas y acceso validado, el endpoint `/api/marcas/consulta` permanece apagado. Las tres interfaces Preview y producción no se modifican.
