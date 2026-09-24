/* ============================================================
   PORTAL DEL CLIENTE (estilo pulido)
   ============================================================ */
let PCLI = '70112233';                         // cliente con sesión iniciada (cambia al iniciar sesión)
const ICON = {'CG-001':'🧊','CG-002':'🥚','CG-003':'📦','CG-004':'🛢️'};
function portalShell(cur,inner){
  const L=[['p-catalogo','Catálogo'],['p-cotizar','Cotizar'],['p-rastrear','Rastrear envío'],['p-envios','Mis envíos']];
  const back = SESSION.role!=='cliente' ? `<a class="pback" href="#/${HOME[SESSION.role]}">← Volver al sistema interno</a>` : `<a class="pback" href="#/login">Salir</a>`;
  return `<header class="pnav"><div class="pbrand"><span class="pico">🚚</span> Transporte Seguro</div><nav>${L.map(([k,l])=>`<a href="#/${k}" class="${cur.key===k||(k==='p-cotizar'&&cur.key==='p-pago')?'on':''}">${l}</a>`).join('')}</nav><div class="puser"><span class="pav">👤</span> ${esc(by(DB.clientes,PCLI).nombre)} ${back}</div></header><main class="pmain">${inner}</main><footer class="pfoot">Prototipo · sin base de datos · los datos viven en memoria</footer>`;
}
const precioDe = p => { const t=tarifaDe(p); if(!t) return ''; return t.base==='fija'?money(t.valor)+' por envío exclusivo':money(t.valor)+' por ticket (1 m³)'; };
route('p-catalogo',{title:'',view(){
  const cards=DB.productos.filter(p=>p.activo&&tarifaVigente(tarifaDe(p))).map(p=>{ const i=prodInfo(p), cp=DB.compat.find(c=>c.ok&&c.tb===p.tb&&c.tv===p.tv), exp=esExpress(p);
    return `<div class="pcard"><div class="pcico">${ICON[p.tb]||'📦'}</div><h3>Carga ${esc(i.tb.material.toLowerCase())}</h3><p class="pdesc">Viaja en ${esc(p.tv.toLowerCase())}${cp?' con contenedor '+esc(cp.tc.toLowerCase()):''}. Sale los <b>${i.th.diaSalida}</b> a las ${h12(i.th.hSalida)}.</p>
     <div class="ptags"><span class="ptag ${exp?'exp':''}">${esc(i.ts.modalidad)}</span><span class="ptag">Temperatura ${esc(i.tb.temp)}</span><span class="ptag">${esc(i.prot.nombre)}</span></div>
     ${exp?'<p class="pmute">Servicio exclusivo: el contenedor viaja solo con tu carga.</p>':''}
     <div class="pprice">Desde <b>${precioDe(p)}</b></div><a class="pbtn" href="#/p-cotizar" data-act="p-pick" data-prod="${p.id}">Cotizar este servicio</a></div>`; }).join('');
  return `<section class="phero"><div><span class="pkick">Catálogo de servicios</span><h1>Transportamos tu carga con seguimiento paso a paso</h1><p>Elige el tipo de carga, reserva el espacio que necesitas (1 ticket = 1 m³) y sigue cada etapa del traslado. Sin llamadas, sin GPS externo.</p><a class="pbtn big" href="#/p-cotizar">Cotizar envío</a></div><div class="pheroart">🚚📦</div></section>
   <h2 class="ph2">¿Qué transportamos?</h2><div class="pgrid">${cards}</div>
   <h2 class="ph2">Rutas disponibles</h2><div class="pchips">${DB.alcances.filter(a=>a.km).map(a=>`<a class="pchip" href="#/p-cotizar" data-act="p-ruta" data-o="${esc(a.origen)}" data-d="${esc(a.destino)}">${esc(a.origen)} → ${esc(a.destino)} <small>${n2(a.km)} km · ${a.horas} h</small></a>`).join('')}</div>
   <h2 class="ph2">Cómo funciona</h2><div class="psteps"><div><b>1</b><h4>Reserva tu espacio</h4><p>Indicas qué envías y cuántas unidades; calculamos los tickets (m³) y kg que ocupará.</p></div><div><b>2</b><h4>Elige cómo pagar</h4><p>Ves el precio con IGV, reservamos tu espacio ${politica('POL-02',15)} minutos y eliges tarjeta, PagoEfectivo o banco.</p></div><div><b>3</b><h4>Sigue los 7 pasos</h4><p>Recibido, despachado, en tránsito, en parada, en reparto, entregado y cerrado.</p></div></div>`; }});
ACT['p-pick']=el=>{ const p=by(DB.productos,el.dataset.prod); UI.pd=Object.assign(newDraft(),{cliente:PCLI,tb:p.tb,prod:p.id,uds:''}); };

UI.pd = null;
const PD = () => UI.pd || (UI.pd=Object.assign(newDraft(),{cliente:PCLI}));
route('p-cotizar',{title:'',view(){
  const d=PD();
  if(d.ticket) return pDone(d);
  const bienes=DB.cargas.map(b=>[b.id,b.material]);
  const prods=prodsDisponibles(d).map(p=>[p.id,nombreProducto(p)]);
  const alcs=DB.alcances.filter(a=>a.km).map(a=>[a.id,a.origen+' → '+a.destino]);
  const alc=by(DB.alcances,d.alc), prod=by(DB.productos,d.prod), th=prod?by(DB.horarios,prod.th):null;
  const chips=th?`<div class="pchips">${proximasFechas(th.diaSalida,4).map(f=>`<button class="pchip btnchip ${d.fecha===f?'on':''}" data-act="pd-fecha" data-f="${f}">${diaDe(f).slice(0,3)} ${dmy(f)}</button>`).join('')}</div>`:'';
  const espd = d.tb&&+d.uds>0?espacio(d.tb,+d.uds):null;
  let right='<div class="pempty">Completa el formulario para ver tu tarifa y el espacio disponible.</div>';
  if(d.res){ if(!d.res.viaje) right=`<div class="perr">${d.res.error}</div>`;
   else { const tar=tarifaDe(prod), ver=d.res.ver, pr=estimarPrecio(tar,ver.need), v=d.res.viaje, pl=planViaje(v);
    right=`<div class="pprice2"><small>Total estimado (incluye IGV)</small><b>${money(pr.total)}</b><span>${pr.detalle}</span></div>
     <div class="prow"><span>Espacio a reservar</span><b>${ver.need} ticket(s) · ${n2(d.res.esp.kg)} kg${ver.express?' (Express)':''}</b></div>
     <div class="prow"><span>Disponible ese día</span><b>${ver.libre.n} ticket(s) · ${n2(ver.libre.kg)} kg</b></div>
     <div class="prow"><span>Salida / llegada estimada</span><b>${hhmm(pl.sal)} → ${hhmm(pl.lle)}</b></div>
     ${d.res.ok?`<div class="pok">✔ Hay espacio para tu carga</div><button class="pbtn big full" data-act="pd-solicitar">Solicitar servicio</button>`:`<div class="perr">${d.res.error}<br><small>Prueba otra fecha o reduce las unidades.</small></div>`}`; } }
  return `<h1 class="ph1">Cotizar envío</h1><div class="pcols"><div class="pbox"><h3>Datos del envío</h3>
    <label class="pf"><span>¿Qué envías?</span><select data-change="pd-set" name="tb">${optsHTML(bienes,d.tb,true)}</select></label>
    <label class="pf"><span>Unidades (bultos)</span><input type="number" min="1" name="uds" value="${esc(d.uds)}" data-change="pd-set" placeholder="Ej. 40">${espd?`<small>Ocuparán ${espd.n} ticket(s) (${n2(espd.m3)} m³) · ${n2(espd.kg)} kg</small>`:''}</label>
    <label class="pf"><span>Servicio</span><select data-change="pd-set" name="prod">${optsHTML(prods,d.prod,true)}</select></label>
    <label class="pf"><span>Origen</span><input name="origen" list="dl-lugares" value="${esc(d.origen)}" data-change="pd-set" placeholder="Ej. Lima" autocomplete="off"></label>
    <label class="pf"><span>Destino</span><input name="destino" list="dl-lugares" value="${esc(d.destino)}" data-change="pd-set" placeholder="Ej. Chiclayo" autocomplete="off"></label>
    <datalist id="dl-lugares">${lugares().map(l=>'<option value="'+esc(l)+'">').join('')}</datalist>
    ${d.rutaErr?`<div class="perr">${esc(d.rutaErr)}</div>`:alc?`<div class="pok">Ruta disponible: ${n2(alc.km)} km · ${alc.horas} h de viaje</div>`:''}
    <div class="pf"><span>Fecha de salida</span>${th?chips:'<small>Elige primero el servicio</small>'}</div></div>
    <div class="pbox pright"><h3>Tu tarifa</h3>${right}</div></div>`; }});
ACT['pd-set']=el=>{ const d=PD(); d[el.name]=el.value; if(el.name==='tb'){ d.prod=''; d.fecha=''; } if(el.name==='prod') d.fecha=''; if(el.name==='origen'||el.name==='destino') syncRuta(d); calcRes(d); render(); };
ACT['p-ruta']=el=>{ const d=PD(); d.origen=el.dataset.o; d.destino=el.dataset.d; syncRuta(d); calcRes(d); };
ACT['pd-fecha']=el=>{ const d=PD(); d.fecha=el.dataset.f; calcRes(d); render(); };
ACT['pd-solicitar']=()=>{ const d=PD();
  const r=emitirTicket(d); if(r.error){ toast('✖ '+r.error,'bad'); calcRes(d); render(); return; }
  d.ticket=r.ticket; toast('✔ Servicio solicitado: ticket '+r.ticket.id); render(); };
function pDone(d){ const t=d.ticket;
  return `<div class="pdone"><div class="pdico">✔</div><h1>¡Tu espacio está reservado!</h1><p>Ticket <b>${t.id}</b> · ${t.n} ticket(s) · ${n2(t.kg)} kg · <b>${money(t.total)}</b></p>
   <p class="pmute">Estado: <b>${t.estado}</b>${t.estado==='RESERVADO'?'. Tienes '+politica('POL-02',15)+' minutos para pagar; luego el espacio se libera.':''}</p>
   <div class="pact">${t.estado==='RESERVADO'?`<a class="pbtn big" href="#/p-pago/1/${t.id}">💳 Elegir medio de pago</a>`:''}<a class="pbtn ghost big" href="#/p-rastrear/${t.id}" data-act="pd-reset">Rastrear mi envío</a><button class="pbtn ghost big" data-act="pd-reset2">Nueva cotización</button></div></div>`; }
const horasParaSalida = t => { const v=by(DB.viajes,t.viaje); return (planViaje(v).sal-AHORA)/3600000; };
const cancelable = t => ['RESERVADO','PAGADO'].includes(t.estado) && horasParaSalida(t)>=+politica('POL-03',24);
ACT['p-cancel']=el=>{ const t=by(DB.tickets,el.dataset.id); if(!cancelable(t)){ toast('✖ Ya no se puede cancelar sin cargo (menos de '+politica('POL-03',24)+' h para la salida)','bad'); return; }
  openModal('Cancelar ticket '+t.id,'<p>Se cancelará el ticket y se <b>liberará el espacio</b> ('+t.n+' ticket(s)) en el viaje del '+dmy(by(DB.viajes,t.viaje).fecha)+'.</p><p>Cancelación sin cargo hasta '+politica('POL-03',24)+' h antes de la salida (POL-03).</p>',[{label:'Sí, cancelar',cls:'badb',fn:()=>{ t.estado='CANCELADO'; closeModal(); toast('✔ Ticket '+t.id+' cancelado: espacio liberado'); render(); }},{label:'Volver',fn:closeModal}]); };
ACT['pd-reset']=()=>{ UI.pd=null; }; ACT['pd-reset2']=()=>{ UI.pd=null; render(); };

/* ---- pantallas previas al pago (portal) ---- */
route('p-pago',{title:'',view(arg){
  const [paso,id]=arg.split('/'); const t=by(DB.tickets,id);
  if(!t) return '<div class="pempty">No se encontró la orden. <a href="#/p-envios">Ver mis envíos</a></div>';
  if(t.estado==='VENCIDO') return '<div class="perr">La reserva venció y el espacio fue liberado. <a href="#/p-cotizar">Cotiza nuevamente</a>.</div>';
  return `<div class="pay-portal"><h1 class="ph1">${paso==='2'?'Orden de pago':'Elige tu medio de pago'}</h1>${paso==='2'?payFormHTML(t,'p'):t.estado==='PAGADO'?payDoneHTML(t,'p'):payMethodHTML(t,'p')}</div>`; }});

route('p-rastrear',{title:'',view(arg){
  const mios=DB.tickets.filter(t=>t.cliente===PCLI);
  const t=by(DB.tickets,arg)||mios.find(x=>x.estado==='EN RUTA')||mios[0];
  if(!t) return '<div class="pempty">Aún no tienes envíos.</div>';
  const v=by(DB.viajes,t.viaje), p=by(DB.productos,v.prod), seq=secuenciaDe(v), nx=siguientePaso(v,t), pl=planViaje(v);
  const idx=seq.pasos.filter(n=>n<=t.paso).length;
  const dots=seq.pasos.map(n=>{ const e=estadoPaso(v,t,n), cur=n===nx, done=!!e.h; return `<div class="pdot ${done?'done':cur?'cur':''}"><i>${done?'✓':n}</i><b>${by(PASOS,n,'n').nombre}</b><small>${done?hhmm(e.h.real):'esp. '+hhmm(e.esp)}</small></div>`; }).join('');
  const actual = t.estado==='RESERVADO'?'Pendiente de pago':t.paso?by(PASOS,t.paso,'n').nombre:'Por iniciar';
  const sig = nx&&t.estado!=='RESERVADO'?`Siguiente: <b>${nx} ${by(PASOS,nx,'n').nombre}</b> · esperado ${hhmm(esperadoPaso(v,nx))}`:t.estado==='CERRADO'?'Envío completado':'';
  const sel=`<select data-change="p-pick-t">${optsHTML(mios.map(x=>[x.id,x.id+' · '+nomAL(by(DB.viajes,x.viaje).alcance)]),t.id)}</select>`;
  return `<div class="ptrackhead"><div><span class="pkick">Seguimiento</span><h1 class="ph1">Ticket ${t.id}</h1><p class="pmute">${esc(nomAL(v.alcance))} · ${esc(nomCG(p.tb))} · ${t.n} ticket(s) · ${n2(t.kg)} kg reservados</p></div>${sel}</div>
   <div class="ptrack">${dots}</div>
   <div class="pcols"><div class="pbox"><h3>Paso ${idx} de ${seq.pasos.length}</h3><div class="pbig">${actual}</div><p>${sig}</p>${t.estado==='RESERVADO'?`<a class="pbtn" href="#/p-pago/1/${t.id}">💳 Pagar ahora</a> `:''}${cancelable(t)?`<button class="pbtn ghost" data-act="p-cancel" data-id="${t.id}">Cancelar ticket</button>`:''}<p class="pnote">🤖 Traslado automatizado: nuestro sistema confirma cada paso de la secuencia, sin depender de un GPS.</p></div>
    <div class="pbox"><h3>Tu viaje</h3><div class="prow"><span>Salida</span><b>${diaDe(v.fecha)} ${dmy(v.fecha)} · ${hhmm(pl.sal)}</b></div><div class="prow"><span>Llegada estimada</span><b>${hhmm(pl.lle)}</b></div><div class="prow"><span>Total</span><b>${money(t.total)}</b></div><div class="prow"><span>Estado</span><b>${t.estado}</b></div></div></div>`; }});
ACT['p-pick-t']=el=>go('p-rastrear/'+el.value);

route('p-envios',{title:'',view(){
  const rows=[...DB.tickets].filter(t=>t.cliente===PCLI).reverse().map(t=>{ const v=by(DB.viajes,t.viaje); return `<tr><td><b>${t.id}</b></td><td>${esc(nomAL(v.alcance))}</td><td>${dmy(v.fecha)}</td><td>${t.n} ticket(s) · ${n2(t.kg)} kg</td><td>${money(t.total)}</td><td><span class="pst ${t.estado.replace(' ','')}">${t.estado}</span></td><td>${t.estado==='RESERVADO'?`<a class="plink" href="#/p-pago/1/${t.id}">Pagar ›</a> `:''}<a class="plink" href="#/p-rastrear/${t.id}">Ver ›</a>${cancelable(t)?` <a class="plink cx" data-act="p-cancel" data-id="${t.id}" href="javascript:void(0)">Cancelar</a>`:''}</td></tr>`; }).join('');
  return `<div class="phead2"><h1 class="ph1">Mis envíos</h1><a class="pbtn" href="#/p-cotizar">Cotizar nuevo envío</a></div>
   <div class="ptable"><table><thead><tr><th>Ticket</th><th>Ruta</th><th>Fecha</th><th>Espacio</th><th>Total</th><th>Estado</th><th></th></tr></thead><tbody>${rows||'<tr><td colspan="7">Aún no tienes envíos.</td></tr>'}</tbody></table></div>`; }});
