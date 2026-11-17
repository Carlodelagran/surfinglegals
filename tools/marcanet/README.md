# MARCANET / IMPI — prueba técnica supervisada

**Estado: experimental, sin validación en el portal real.** Este código no constituye una conexión funcional confirmada. No se ejecuta desde el sitio web y no es el navegador de ChatGPT Work.

## Objetivo
Documentar la navegación de la búsqueda avanzada fonética del IMPI, preservando capturas y registrando exactamente dónde falla. No se descargan ni interpretan resultados automáticamente en esta versión. El sitio público de Surfing Legals no utiliza este módulo.

## Ejecución local (operador técnico)
1. Instalar Node.js 20 o superior.
2. En esta carpeta: `npm install` y `npx playwright install chromium`.
3. Ejecutar: `npm run buscar -- --clase 41 --marca "RETRO GAME FEST"`.
4. Revisar `evidencia/<fecha>/manifest.json` y capturas de pantalla.

## Criterios para considerar la búsqueda completada
- El portal confirma que los resultados terminaron de cargar.
- Se conoce y valida el número de filas, su procedencia y el momento de la consulta.
- Se descargó el PDF oficial, se conserva localmente y se vincula con la consulta.
- Se inspeccionó una muestra de filas y se verificaron correspondencias con el PDF.
- Los errores se registran diferenciando bloqueo, resultados vacíos y «Cargando».

Actualmente **ninguno de esos criterios se puede confirmar automáticamente** con este ejecutor. El código se detiene en «verificación pendiente» tras intentar la búsqueda, y no inventa resultados.

## Límites
No eludir CAPTCHAs, controles de sesión, autenticación, restricciones del portal ni límites de uso. No desplegar este proceso en Cloudflare Pages ni manejar clientes o expedientes sin revisar seguridad, privacidad, tasa de consultas y condiciones del servicio.

## Próximo desarrollo
Validar los selectores DOM con una sesión real supervisada. Solo entonces implementar lectura de tabla y descarga autenticada, con una comparación obligatoria contra los archivos oficiales. El CSV del caso RETRO GAME FEST se conserva como conjunto de regresión; no implica que el flujo del portal esté automatizado.

## Verificación técnica de los paquetes descargados por Work

Usar el verificador local, sin enviar documentos a terceros:

```bash
python3 verificar_paquete.py "IMPI_RETRO_GAME_FEST_clase_41.zip" --marca "RETRO GAME FEST" --clase 41
```

Comprueba esquema del CSV, orden de filas, duplicados, número de registros, actuaciones documentadas, encabezado PDF y hashes SHA-256. Permite expedientes multiclase si incluyen la clase buscada. El resultado `validado_estructuralmente` no afirma que el contenido del PDF coincide íntegramente con el CSV, ni que las marcas están vigentes. No publica datos de clientes ni evidencia en GitHub.

**Caso de regresión real:** el paquete aportado para RETRO GAME FEST clase 41 arrojó 297 antecedentes distintos; 292 filas con «41» como única clase y cinco filas multiclase que incluyen la clase 41; 177 con número de registro; ocho con anotaciones de actuaciones revisadas; ninguna denominación idéntica. Estos datos son una comprobación histórica de ese paquete, no una consulta en vivo.


## Normalización de datos y trazabilidad (nuevo)
El importador `importar_paquete.py` transforma el ZIP aportado por Work (CSV+PDF) en un JSON con expediente individual, orden original, marcas, titular, clases, número de registro, nota de actuación, estado de revisión y hashes SHA-256 de los archivos fuente.

```bash
python3 importar_paquete.py "IMPI_RETRO_GAME_FEST_clase_41.zip" \
  --marca "RETRO GAME FEST" --clase 41 --salida "consulta.json"
```

En la prueba local con el paquete de ejemplo: **297 expedientes, 0 denominaciones idénticas y 8 fichas con actuaciones anotadas**. Las cinco filas multiclase se aceptan cuando incluyen la clase solicitada.

**Privacidad:** `consulta.json`, el ZIP y los PDF no deben subirse a este repositorio público si contienen datos de clientes o material sensible. El importador no guarda información en SIGES ni llama a MARCANET.
