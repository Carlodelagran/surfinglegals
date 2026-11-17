/* Surfing Legals — orientacion inicial SIN consulta a IMPI.
 * No asigna clase Niza, riesgo, posibilidad ni registrabilidad.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.SLOrientacion=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
  const comunes=new Set(['SERVICIOS','PRODUCTOS','TIENDA','COMERCIAL','ONLINE','MEXICO','OFICIAL','ORIGINAL','PREMIUM','CALIDAD','EVENTO','FESTIVAL','CAFE','RESTAURANTE','ABOGADOS']);
  function prepare(input){
    const marca=String(input?.marca||'').trim().slice(0,100);
    const descripcion=String(input?.descripcion||'').trim().slice(0,600);
    const etapa=String(input?.etapa||'').trim();
    if(!marca||!descripcion)throw Error('Faltan marca o productos y servicios.');
    const tokens=norm(marca).split(' ').filter(Boolean);
    const elementosGenericos=tokens.filter(x=>comunes.has(x));
    const tareas=[
      'Identificar los productos o servicios específicos para determinar la clase o clases de Niza aplicables.',
      'Consultar antecedentes oficiales del IMPI en cada clase pertinente.',
      'Revisar coincidencias gráficas, fonéticas y conceptuales; verificar traducciones cuando corresponda.',
      'Cotejar situación jurídica, productos y servicios y vigencia de los antecedentes relevantes.'
    ];
    if(etapa==='Conflicto o requerimiento')tareas.unshift('Revisar el oficio, fecha de notificación y plazo de contestación antes de cualquier decisión.');
    else if(etapa==='En operación')tareas.unshift('Confirmar si la marca ya se utiliza en comercio y para cuáles productos o servicios.');
    else tareas.unshift('Verificar antecedentes antes de invertir en publicidad, empaques o lanzamiento.');
    return {marca,descripcion,etapa,elementosGenericos,tareas,
      tipo:'orientacion_sin_busqueda',
      estado:'pendiente_consulta_impi',
      explicacion:'La información ingresada permite preparar una ruta de revisión, pero aún no se han consultado registros del IMPI.',
      advertencia:'No puede determinarse disponibilidad, probabilidad de registro ni nivel de riesgo sin antecedentes oficiales y análisis jurídico.'};
  }
  return {prepare};
});