/* Surfing Legals — informe HTML autónomo exportable/impreso. Sin consultas de red. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object' && module.exports)module.exports=api;
  else root.SLInforme=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function safeName(v){return String(v||'marca').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_-]+/gi,'_').slice(0,60);}
  function build(informe,options={}){
    if(!informe || !Array.isArray(informe.antecedentes))throw Error('Informe inválido');
    const date=options.fecha_consulta||informe.fecha_consulta||'No proporcionada';
    const pdf=options.nombre_pdf||informe.archivos?.pdf?.nombre||'Adjuntar reporte oficial del IMPI para cotejo';
    const source=informe.fuente||'CSV aportado de resultados del IMPI';
    const pdfHash=informe.archivos?.pdf?.sha256||'No disponible';
    const csvHash=informe.archivos?.csv?.sha256||'No disponible';
    const top=informe.antecedentes.slice(0,Math.min(15,informe.antecedentes.length));
    const row=r=>'<tr><td>'+esc(r.indice_original)+'</td><td>'+esc(r.denominacion)+'</td><td>'+esc(r.expediente)+'</td><td>'+esc(r.registro||'Sin dato')+'</td><td>'+esc(r.titular||'Sin dato')+'</td><td>'+esc(r.clase||'Sin dato')+'</td><td>'+esc(r.prioridad)+'</td><td>'+esc(r.ficha_revisada?'Actuación anotada':'Ficha sin revisar')+'</td></tr>';
    const detail=r=>'<article class="item"><h3>'+esc(r.denominacion)+' <small>Exp. '+esc(r.expediente)+' · Prioridad '+esc(r.prioridad)+'</small></h3><p>Registro: '+esc(r.registro||'No consignado')+' · Titular: '+esc(r.titular||'No consignado')+' · Clase: '+esc(r.clase)+'</p><p><strong>Razones de selección:</strong> '+esc((r.razones||[]).join(' '))+'</p><p><strong>Actuación/nota del CSV:</strong> '+esc(r.actuacion||'Sin anotación')+'</p></article>';
    const reviewed=informe.antecedentes.filter(r=>r.ficha_revisada).length;
    const exact=informe.antecedentes.filter(r=>r.comparacion?.exact).length;
    return '<!doctype html><html lang="es-MX"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Informe preliminar '+esc(informe.denominacion)+'</title><style>'+
      ':root{font-family:Arial,Helvetica,sans-serif;color:#24223c}body{margin:0;background:#f3f2f7;line-height:1.5}.paper{max-width:900px;margin:24px auto;background:white;padding:48px 50px;box-shadow:0 4px 25px #0001}h1,h2{font-family:Georgia,serif}h1{font-size:38px;margin:12px 0}h2{margin-top:35px;color:#1c1937;border-bottom:2px solid #00a996;padding-bottom:7px}h3{font-size:16px}.eyebrow{font-size:11px;color:#008a81;letter-spacing:2px;font-weight:700}.meta{padding:16px 20px;background:#eef6f5;border-left:4px solid #00a996}.item{padding:15px 0;border-bottom:1px solid #ddd}.item small{font-weight:400;color:#5e596b}.warning{padding:18px;background:#fff5e8;border-left:4px solid #bb7f21}table{border-collapse:collapse;width:100%;font-size:11px}th,td{text-align:left;padding:7px;border-bottom:1px solid #ddd;vertical-align:top;overflow-wrap:anywhere}th{background:#f0f0f5}footer{margin-top:30px;font-size:11px;color:#666}.screen-only{margin:20px auto;text-align:center}.screen-only button{padding:13px 20px;background:#00a996;color:white;border:0;cursor:pointer;border-radius:8px}@media print{body{background:white}.paper{padding:0;box-shadow:none;margin:0;max-width:none}.screen-only{display:none}h2,.item{break-inside:avoid}thead{display:table-header-group}tr{break-inside:avoid}@page{size:A4;margin:16mm}}@media(max-width:650px){.paper{margin:0;padding:20px}table{font-size:9px}}'+
      '</style></head><body><div class="screen-only"><button onclick="window.print()">Imprimir / guardar como PDF</button></div><main class="paper"><p class="eyebrow">SURFING LEGALS · PROPIEDAD INTELECTUAL</p><h1>Informe preliminar de antecedentes marcarios</h1>'+
      '<div class="meta"><p><strong>Denominación:</strong> '+esc(informe.denominacion)+'</p><p><strong>Clase consultada:</strong> '+esc(informe.clase||'No consignada')+' · <strong>Fecha de consulta:</strong> '+esc(date)+'</p><p><strong>Fuente de datos:</strong> '+esc(source)+'; documento de respaldo: '+esc(pdf)+'</p><p><strong>Antecedentes recibidos:</strong> '+informe.total+' · <strong>Coincidencias exactas en el CSV:</strong> '+exact+' · <strong>Actuaciones anotadas como revisadas:</strong> '+reviewed+'</p></div>'+
      '<h2>Alcance y limitaciones</h2><p>Se priorizan posibles antecedentes por coincidencias textuales y secuencias de palabras. La clasificación es para orientar la revisión profesional y <strong>no determina confundibilidad, vigencia, concesión ni viabilidad de registro</strong>. La búsqueda fonética fue efectuada fuera de este analizador; el algoritmo no consulta automáticamente el IMPI.</p>'+
      '<h2>Antecedentes prioritarios (máximo 15)</h2>'+top.map(detail).join('')+
      '<h2>Observaciones pendientes de revisión jurídica</h2><ul><li>Cotejar fichas originales, títulos, fechas y actuaciones ante el IMPI.</li><li>Verificar productos y servicios efectivamente protegidos, además de su clase.</li><li>Contrastar similitud fonética en el idioma de pronunciación pertinente.</li><li>Examinar traducciones literales y semejanzas conceptuales, sin inferir registros inexistentes.</li><li>Evaluar distintividad e impedimentos legales en el contexto de la solicitud concreta.</li></ul>'+
      '<h2>Anexo: totalidad de antecedentes importados</h2><p>El anexo conserva el orden de aparición del CSV, independientemente de la prioridad calculada.</p><table><thead><tr><th># IMPI</th><th>Denominación</th><th>Expediente</th><th>Registro</th><th>Titular</th><th>Clase</th><th>Prioridad</th><th>Ficha</th></tr></thead><tbody>'+informe.antecedentes.slice().sort((a,b)=>a.indice_original-b.indice_original).map(row).join('')+'</tbody></table>'+
      '<footer>Informe de apoyo generado localmente. No sustituye búsqueda registral oficial ni dictamen jurídico. Fecha de generación en dispositivo: '+esc(new Date().toLocaleString('es-MX'))+'.</footer></main></body></html>';
  }
  function download(informe,options){
    const html=build(informe,options);
    const blob=new Blob([html],{type:'text/html;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const anchor=document.createElement('a');
    anchor.href=url;anchor.download='SL_informe_preliminar_'+safeName(informe.denominacion)+'.html';
    document.body.append(anchor);anchor.click();anchor.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return {build,download};
});