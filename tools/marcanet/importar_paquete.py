#!/usr/bin/env python3
"""Importa PDF y CSV exportados del IMPI; NO verifica vigencia ni registrabilidad."""
import argparse,csv,hashlib,io,json,re,sys,zipfile
from pathlib import Path
import unicodedata

FIELDS=['#','Denominación','Expediente','Registro','Titular','Clase','TS','Actuación o fecha publicada en ficha']
def norm(t):
    s=''.join(c for c in unicodedata.normalize('NFD',str(t).upper()) if not unicodedata.combining(c))
    return re.sub(r'\s+',' ',re.sub(r'[^A-Z0-9]+',' ',s)).strip()
def import_bundle(path,mark,klass):
    with zipfile.ZipFile(path) as z:
        files=[f for f in z.infolist() if not f.is_dir()]
        if len(files)>12 or any(f.file_size>20_000_000 for f in files) or sum(f.file_size for f in files)>30_000_000: raise ValueError('Límites de tamaño excedidos')
        pdfs=[f for f in files if f.filename.lower().endswith('.pdf')]
        csvs=[f for f in files if f.filename.lower().endswith('.csv')]
        if len(pdfs)!=1 or len(csvs)!=1:raise ValueError('Se requiere exactamente un PDF y un CSV')
        pdf=z.read(pdfs[0]); raw=z.read(csvs[0])
        if not pdf.startswith(b'%PDF-'):raise ValueError('PDF sin cabecera reconocible')
    rows=list(csv.DictReader(io.StringIO(raw.decode('utf-8-sig'),newline='')))
    if not rows or not set(FIELDS).issubset(rows[0]):raise ValueError('CSV vacío o con columnas inesperadas')
    if any(r['#'].strip()!=str(i) for i,r in enumerate(rows,1)):raise ValueError('Orden no consecutivo')
    ids=[r['Expediente'].strip() for r in rows]
    if not all(ids) or len(set(ids))!=len(ids):raise ValueError('Expedientes faltantes o repetidos')
    if any(str(klass) not in re.findall(r'\d+',r['Clase']) for r in rows):raise ValueError('Resultado no incluye la clase buscada')
    records=[]
    for r in rows:
        action=r['Actuación o fecha publicada en ficha'].strip()
        reviewed=bool(action) and not 'FICHA INDIVIDUAL NO REVISADA' in norm(action)
        records.append({
          'orden_original':int(r['#']),'denominacion':r['Denominación'].strip(),
          'expediente':r['Expediente'].strip(),'registro':r['Registro'].strip() or None,
          'titular':r['Titular'].strip(),'clases':re.findall(r'\d+',r['Clase']),
          'tipo_signo':r['TS'].strip() or None,'actuacion_anotada':action or None,
          'ficha_revisada':reviewed,'estatus_registral_verificado':None
        })
    return {
     'schema':'sl.impi.consulta.v1',
     'origen':'Paquete PDF/CSV aportado por operador',
     'marca_buscada':mark,'clase_buscada':str(klass),
     'total':len(records),
     'coincidencias_exactas':sum(norm(r['denominacion'])==norm(mark) for r in records),
     'fichas_con_actuacion_anotada':sum(r['ficha_revisada'] for r in records),
     'archivos':{
       'pdf':{'nombre':Path(pdfs[0].filename).name,'sha256':hashlib.sha256(pdf).hexdigest()},
       'csv':{'nombre':Path(csvs[0].filename).name,'sha256':hashlib.sha256(raw).hexdigest()}
     },
     'limitaciones':['Valida estructura CSV y cabecera PDF, no concordancia íntegra PDF/CSV.',
       'No ejecuta una nueva búsqueda del IMPI.',
       'Las actuaciones anotadas no certifican vigencia actual ni registrabilidad.'],
     'antecedentes':records
    }
if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('zip');p.add_argument('--marca',required=True);p.add_argument('--clase',required=True);p.add_argument('--salida',required=True)
    a=p.parse_args()
    try:
        result=import_bundle(a.zip,a.marca,a.clase)
        Path(a.salida).write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
        print(json.dumps({'total':result['total'],'exactas':result['coincidencias_exactas'],
         'fichas_revisadas':result['fichas_con_actuacion_anotada']},ensure_ascii=False))
    except (ValueError,OSError,zipfile.BadZipFile,UnicodeError) as error:
        print(str(error),file=sys.stderr);sys.exit(2)
