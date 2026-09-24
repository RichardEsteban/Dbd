/* ============================================================
   INDICADORES, BATCH (APLICATIVO), TÉCNICO Y PORTAL DEL CLIENTE
   ============================================================ */

function computeKpis(){
  const vivos = DB.tickets.filter(t=>!['VENCIDO','CANCELADO'].includes(t.estado));
  const porEstado = {}; DB.tickets.forEach(t=>porEstado[t.estado]=(porEstado[t.estado]||0)+1);
  const pagados = vivos.filter(t=>t.estado!=='RESERVADO');
  const viajes = DB.viajes.map(v=>{ const c=viajeCap(v),u=viajeUso(v); return {id:v.id,ruta:nomAL(v.alcance),fecha:v.fecha,m3:u.n,cap:c.n,kg:u.kg,capKg:c.kg,pct:c.n?u.n/c.n*100:0}; }).filter(x=>x.m3>0);
  let ok=0,tot=0;
  DB.tickets.forEach(t=>{ const v=by(DB.viajes,t.viaje); t.hist.forEach(h=>{ tot++; const e=estadoPaso(v,t,h.paso); if(e.est==='A TIEMPO') ok++; }); });
  const porProd = {}; pagados.forEach(t=>{ const v=by(DB.viajes,t.viaje); porProd[v.prod]=(porProd[v.prod]||0)+t.total; });
  return { tickets:vivos.length, porEstado, ingresos:sum(pagados,'total'), viajes, ocupProm:viajes.length?sum(viajes,'pct')/viajes.length:0,
           puntualidad:tot?ok/tot*100:100, pasos:tot, incidentes:DB.incidentes.length, abiertos:DB.incidentes.filter(i=>i.estado!=='CERRADO').length, porProd, m3:sum(vivos,'m3'), kg:sum(vivos,'kg') };
}
function hbars(items,unit){ const mx=Math.max(1,...items.map(i=>i.v)); return items.map(i=>`<div class="hb"><span>${esc(i.l)}</span><div class="hbb"><div style="width:${i.v/mx*100}%"></div></div><b>${i.t||n2(i.v)+(unit||'')}</b></div>`).join('')||'<i>Sin datos</i>'; }

route('indicadores',{title:'Consulta de indicadores',crumb:'2.1 Gerencial › 2.1.2 Consulta',view(){
  const ind=DB.indicadores, k=ind.kpis;
  if(!k) return msg('warn','Aún no hay indicadores generados. Ejecute <a href="#/batch-ind">3.1.2.1 Generación de indicadores</a>.');
  const estados=Object.entries(k.porEstado).map(([e,n])=>({l:e,v:n,t:String(n)}));
  return guide(['Esta consulta <b>solo lee</b> el último resultado del proceso batch de estadísticas.','Ocupación = m³ comprometidos ÷ capacidad de cada viaje.','Puntualidad = pasos confirmados dentro de la tolerancia ÷ pasos confirmados.','Para actualizar los datos, el administrador ejecuta la generación de indicadores (3.1.2.1).'],0)+
   `${msg('info','Datos calculados el <b>'+dmy(ymd(ind.generado))+' '+hhmm(ind.generado)+'</b>. <a href="#/batch-ind">Regenerar (batch) →</a>')}
    <div class="kpis">${kpi('Ocupación promedio de viajes',n2(k.ocupProm)+' %','meta 85 %')}${kpi('Tickets vigentes',k.tickets,n2(k.m3)+' m³ · '+n2(k.kg)+' kg')}${kpi('Ingresos (tickets pagados)',money(k.ingresos),'incluye IGV')}${kpi('Puntualidad de pasos',n2(k.puntualidad)+' %',k.pasos+' pasos confirmados')}${kpi('Incidentes',k.incidentes,k.abiertos+' abiertos')}</div>
    <div class="cards2"><div class="mini"><b>Ocupación por viaje (m³)</b>${hbars(k.viajes.map(v=>({l:v.id+' · '+v.ruta,v:v.pct,t:n2(v.m3)+'/'+n2(v.cap)+' m³ ('+Math.round(v.pct)+'%)'})))}</div>
    <div class="mini"><b>Tickets por estado</b>${hbars(estados)}<br><b>Ingresos por producto</b>${hbars(Object.entries(k.porProd).map(([p,v])=>({l:p,v,t:money(v)})))}</div></div>`; }});

/* ---- utilidades de simulación batch ---- */
function runSteps(steps,logId,barId,done){
  const log=$('#'+logId), bar=$('#'+barId); log.innerHTML=''; let i=0;
  const next=()=>{ if(i>=steps.length){ bar.style.width='100%'; if(done) done(); return; }
    const s=steps[i++]; const line=document.createElement('div'); line.className='ll'; line.textContent='⏳ '+s.txt; log.appendChild(line);
    bar.style.width=Math.round(i/steps.length*100)+'%';
    setTimeout(()=>{ const r=s.fn?s.fn():''; line.textContent='✔ '+s.txt+(r?' — '+r:''); next(); },650); };
  next();
}
const vencidos = () => DB.tickets.filter(t=>t.estado==='RESERVADO' && addMin(t.creado,+politica('POL-02',15))<=AHORA);

route('batch-bd',{title:'Actualización de base de datos',crumb:'3.1 Aplicativo › 3.1.1 (proceso batch)',view(){
  const ven=vencidos(), ent=DB.tickets.filter(t=>t.estado==='ENTREGADO');
  const hist=[...DB.bitacoraBatch].reverse().slice(0,5).map(b=>`<tr><td>${dmy(ymd(b.fecha))} ${hhmm(b.fecha)}</td><td>${esc(b.resumen)}</td></tr>`).join('');
  return guide(['Es un proceso <b>automático</b> (sin usuario): en producción corre cada 5 minutos.','1) Libera las reservas que no se pagaron a tiempo (REG-02).','2) Cierra los tickets ya entregados.','3) Recalcula el espacio disponible de todos los viajes.','En el prototipo se ejecuta con un botón y se puede avanzar el reloj para provocar vencimientos.'],0)+
   `<div class="kpis">${kpi('Reloj del sistema',hhmm(AHORA),dmy(ymd(AHORA)))}${kpi('Reservas vencidas pendientes',ven.length,ven.map(t=>t.id).join(', ')||'ninguna')}${kpi('Tickets entregados por cerrar',ent.length,ent.map(t=>t.id).join(', ')||'ninguno')}</div>
    <div class="toolbar"><button class="btn" data-act="clock">⏩ Avanzar reloj 20 min</button> <button class="btn okb" data-act="run-bd">▶ Ejecutar proceso ahora</button></div>
    <div class="progress"><div id="bd-bar"></div></div><div class="log" id="bd-log"><i>Sin ejecutar…</i></div>
    <h4>Últimas ejecuciones</h4><table class="tbl mini"><thead><tr><th>Fecha</th><th>Resultado</th></tr></thead><tbody>${hist||'<tr><td colspan="2" class="empty">Sin ejecuciones</td></tr>'}</tbody></table>`; }});
ACT['clock']=()=>{ AHORA=addMin(AHORA,20); toast('⏩ Reloj avanzado a '+hhmm(AHORA)); render(); };
ACT['run-bd']=()=>{
  const res={ven:[],cer:[],via:0};
  runSteps([
    {txt:'Buscando reservas vencidas (REG-02)',fn:()=>{ const v=vencidos(); v.forEach(t=>{t.estado='VENCIDO'; res.ven.push(t);}); return v.length?v.length+' liberada(s): '+v.map(t=>t.id+' ('+t.n+' ticket(s))').join(', '):'ninguna'; }},
    {txt:'Cerrando tickets entregados',fn:()=>{ DB.tickets.filter(t=>t.estado==='ENTREGADO').forEach(t=>{ const seq=secuenciaDe(by(DB.viajes,t.viaje)).pasos; t.paso=seq[seq.length-1]; t.estado='CERRADO'; t.hist.push({paso:t.paso,real:new Date(AHORA),por:'Sistema'}); res.cer.push(t); }); return res.cer.length+' cerrado(s)'; }},
    {txt:'Recalculando el espacio disponible de los viajes',fn:()=>{ res.via=DB.viajes.length; return DB.viajes.filter(v=>ticketsDe(v).length).map(v=>{const l=viajeLibre(v);return v.id+': '+l.n+' ticket(s) / '+n2(l.kg)+' kg libres';}).join(' · '); }}
  ],'bd-log','bd-bar',()=>{
    DB.bitacoraBatch.push({fecha:new Date(AHORA),resumen:res.ven.length+' reserva(s) liberada(s), '+res.cer.length+' ticket(s) cerrado(s), '+res.via+' viaje(s) recalculado(s)'});
    toast('✔ Actualización de base de datos completada'); setTimeout(render,900); });
};

route('batch-ind',{title:'Generación de indicadores',crumb:'3.1 Aplicativo › 3.1.2 Estadísticas › 3.1.2.1',view(){
  return guide(['Proceso batch que calcula las estadísticas a partir de los tickets, viajes y pasos.','Guarda el resultado para que la Consulta de indicadores (2.1.2.1) lo lea rápido, sin recalcular.','Ejecútelo después de emitir tickets o confirmar pasos para ver cómo cambian los números.'],0)+
   `<div class="toolbar"><button class="btn okb" data-act="run-ind">▶ Generar indicadores ahora</button> <span>Última generación: <b>${hhmm(DB.indicadores.generado)}</b></span></div>
    <div class="progress"><div id="in-bar"></div></div><div class="log" id="in-log"><i>Sin ejecutar…</i></div><div id="in-out"></div>`; }});
ACT['run-ind']=()=>{
  let k;
  runSteps([
    {txt:'Leyendo tickets y viajes',fn:()=>DB.tickets.length+' tickets, '+DB.viajes.length+' viajes'},
    {txt:'Calculando ocupación (m³ y kg) por viaje',fn:()=>{ k=computeKpis(); return n2(k.ocupProm)+' % de ocupación promedio'; }},
    {txt:'Calculando puntualidad de los pasos',fn:()=>n2(k.puntualidad)+' % ('+k.pasos+' pasos)'},
    {txt:'Calculando ingresos por producto',fn:()=>money(k.ingresos)},
    {txt:'Guardando resultado para la consulta gerencial',fn:()=>{ DB.indicadores={generado:new Date(AHORA),kpis:k}; return 'guardado'; }}
  ],'in-log','in-bar',()=>{ $('#in-out').innerHTML=msg('ok','✔ Indicadores generados a las '+hhmm(AHORA)+'. <a href="#/indicadores">Ver Consulta de indicadores →</a>'); toast('✔ Indicadores generados'); });
};

/* ---- TÉCNICO ---- */
route('crecimiento',{title:'Crecimiento de la base de datos',crumb:'3.2 Técnico › 3.2.1 Mantenimiento de BD',view(){
  const pasos=sum(DB.tickets.map(t=>({n:t.hist.length})),'n');
  const T=[['Tickets',DB.tickets.length*1450,'Alto'],['Bitácora de pasos',(pasos+8)*1900,'Muy alto'],['Viajes',DB.viajes.length*620,'Medio'],['Clientes',DB.clientes.length*900,'Bajo'],['Incidentes',DB.incidentes.length*300,'Bajo']];
  const mb=rows=>rows*0.0012; const total=T.reduce((a,x)=>a+mb(x[1]),0);
  const proy=[...Array(6)].map((_,i)=>({l:['Jul','Ago','Sep','Oct','Nov','Dic'][i],v:total*Math.pow(1.07,i+1)}));
  return guide(['Muestra cuánto pesa cada tabla y cuánto crece.','Proyecta el tamaño de los próximos 6 meses con la tasa de crecimiento actual.','Recomienda archivar datos antiguos antes de que el rendimiento baje.'],0)+
   `<div class="kpis">${kpi('Tamaño actual',n2(total)+' MB','cifras de ejemplo escaladas')}${kpi('Crecimiento mensual','7 %','últimos 3 meses')}${kpi('Proyección a diciembre',n2(proy[5].v)+' MB','')}</div>
    <div class="cards2"><div><table class="tbl"><thead><tr><th>Tabla</th><th>Registros</th><th>Tamaño</th><th>Crecimiento</th></tr></thead><tbody>${T.map(x=>`<tr><td>${x[0]}</td><td>${n2(x[1])}</td><td>${n2(mb(x[1]))} MB</td><td>${x[2]}</td></tr>`).join('')}</tbody></table></div>
    <div class="mini"><b>Proyección (MB)</b>${hbars(proy.map(p=>({l:p.l,v:p.v,t:n2(p.v)+' MB'})))}</div></div>
    ${msg('warn','Recomendación: archivar tickets cerrados con más de 24 meses y la bitácora de pasos con más de 12 meses.')}`; }});

UI.bk = {freq:'Diaria',hora:'23:30',destino:'Nube + disco',ret:'30'};
route('backup',{title:'Backup',crumb:'3.2 Técnico › 3.2.1 Mantenimiento de BD › 3.2.1.2',view(){
  const b=UI.bk, hist=[...DB.backups].sort((x,y)=>y.fecha-x.fecha).map(k=>`<tr><td>${k.id}</td><td>${dmy(ymd(k.fecha))} ${hhmm(k.fecha)}</td><td>${k.tipo}</td><td>${n2(k.mb)} MB</td><td>${k.destino}</td><td>${pill(k.ok?'OK':'RETRASO')}</td></tr>`).join('');
  return guide(['Configure la frecuencia, la hora, el destino y la retención.','El backup programado corre solo; también puede lanzar uno manual.','Cada copia guarda el estado de los datos (tickets, viajes, clientes…).','Para volver a una copia use 3.2.2.1 Restauración.'],0)+
   `<div class="card"><h3>Programación</h3><form data-submit="bk-save" class="fgrid"><label class="fld"><span>Frecuencia</span><select name="freq">${optsHTML(['Diaria','Semanal','Cada 6 horas'].map(x=>[x,x]),b.freq)}</select></label><label class="fld"><span>Hora</span><input type="time" name="hora" value="${b.hora}"></label><label class="fld"><span>Destino</span><select name="destino">${optsHTML(['Nube + disco','Nube','Disco local'].map(x=>[x,x]),b.destino)}</select></label><label class="fld"><span>Retención (días)</span><input type="number" name="ret" value="${b.ret}" min="1"></label><div><button class="btn okb">Guardar programación</button></div></form></div>
    <div class="toolbar"><button class="btn okb" data-act="bk-now">💾 Backup manual ahora</button></div>
    <h4>Historial de copias</h4><table class="tbl"><thead><tr><th>Copia</th><th>Fecha</th><th>Tipo</th><th>Tamaño</th><th>Destino</th><th>Resultado</th></tr></thead><tbody>${hist}</tbody></table>`; }});
ACT['bk-save']=f=>{ const fd=new FormData(f); UI.bk={freq:fd.get('freq'),hora:fd.get('hora'),destino:fd.get('destino'),ret:fd.get('ret')}; toast('✔ Programación de backup guardada'); render(); };
function snapshotDB(){ const {backups,...rest}=DB; return structuredClone(rest); }
ACT['bk-now']=()=>{ const n=DB.backups.length+1, id='BK-'+pad(n,4);
  DB.backups.push({id,fecha:new Date(AHORA),tipo:'Manual',mb:Math.round(400+DB.tickets.length*3.1),destino:UI.bk.destino,ok:true,snap:snapshotDB()});
  toast('✔ Backup '+id+' creado ('+DB.tickets.length+' tickets, '+DB.clientes.length+' clientes)'); render(); };

route('restauracion',{title:'Restauración de base de datos',crumb:'3.2 Técnico › 3.2.2 Contingencia › 3.2.2.1',view(){
  const opts=[...DB.backups].sort((x,y)=>y.fecha-x.fecha).filter(b=>b.snap).map(b=>[b.id,b.id+' · '+dmy(ymd(b.fecha))+' '+hhmm(b.fecha)+' · '+b.tipo+' · '+(b.snap.tickets?b.snap.tickets.length:0)+' tickets']);
  return guide(['Elija la copia a restaurar.','El sistema advierte que los datos actuales se reemplazan.','Debe escribir <b>RESTAURAR</b> para confirmar (evita errores).','Se restaura en pasos: validar, detener escrituras, restaurar tablas y verificar integridad.','<b>Pruébelo:</b> genere un ticket, haga un backup manual, genere otro ticket y restaure el backup.'],0)+
   `${msg('warn','⚠ Restaurar <b>reemplaza</b> los datos actuales (tickets, viajes, clientes, parámetros) por los de la copia elegida.')}
    <div class="card"><div class="fgrid"><label class="fld"><span>Copia a restaurar</span><select id="rs-bk">${optsHTML(opts,opts[0]&&opts[0][0])}</select></label>
    <label class="fld"><span>Escriba RESTAURAR para confirmar</span><input id="rs-ok" placeholder="RESTAURAR"></label></div>
    <button class="btn badb" data-act="run-rs">Restaurar base de datos</button></div>
    <div class="progress"><div id="rs-bar"></div></div><div class="log" id="rs-log"><i>Sin ejecutar…</i></div>`; }});
ACT['run-rs']=()=>{
  if($('#rs-ok').value.trim()!=='RESTAURAR'){ toast('✖ Escriba RESTAURAR para confirmar','bad'); return; }
  const b=by(DB.backups,$('#rs-bk').value); if(!b||!b.snap){ toast('✖ Copia no válida','bad'); return; }
  const antes=DB.tickets.length;
  runSteps([
    {txt:'Validando la copia '+b.id,fn:()=>n2(b.mb)+' MB, integridad correcta'},
    {txt:'Deteniendo escrituras (modo mantenimiento)'},
    {txt:'Restaurando tablas',fn:()=>{ const keep=DB.backups; const snap=structuredClone(b.snap); DB=Object.assign(snap,{backups:keep}); UI.draft=null; UI.crud={}; return 'tickets '+antes+' → '+DB.tickets.length; }},
    {txt:'Verificando integridad de los datos',fn:()=>DB.tickets.length+' tickets, '+DB.viajes.length+' viajes, '+DB.clientes.length+' clientes'}
  ],'rs-log','rs-bar',()=>toast('✔ Restauración completada desde '+b.id));
};
