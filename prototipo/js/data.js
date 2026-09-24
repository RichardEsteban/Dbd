/* ============================================================
   DATOS DE EJEMPLO EN MEMORIA (no hay base de datos).
   - PARÁMETROS: vehículo, carga, contenedor, alcance, horario, tipo de servicio, autómata.
   - TARIFAS y SEGUIMIENTO: son REPORTES (no se mantienen como parámetros).
   - TICKET: 1 ticket = 1 m³ mínimo de espacio dentro de un contenedor. Un envío compra
     tantos tickets como m³ ocupa (redondeado hacia arriba) y además debe respetar los kg.
   - EXPRESS: exclusivo de una sola carga; reserva todo el contenedor a tarifa fija.
   ============================================================ */

const HOY = new Date('2026-06-24T10:15:00');           // reloj simulado del prototipo
const DIAS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

const PASOS = [
  {n:1, nombre:'Recibido',   desc:'La carga entra al contenedor y el ticket se valida', por:'Autómata de carga',   ref:['sal',-60]},
  {n:2, nombre:'Despachado', desc:'La unidad sale del origen',                           por:'Sistema',             ref:['sal',0]},
  {n:3, nombre:'En tránsito',desc:'La unidad pasa un punto de control de la ruta',       por:'Sistema',             ref:['pct',0.25]},
  {n:4, nombre:'En parada',  desc:'Llega a una parada intermedia del alcance',           por:'Sistema',             ref:['pct',0.55]},
  {n:5, nombre:'En reparto', desc:'Llega a la ciudad de destino',                        por:'Sistema',             ref:['lle',-30]},
  {n:6, nombre:'Entregado',  desc:'La carga llega a la terminal de destino',                por:'Autómata de descarga',ref:['lle',0]},
  {n:7, nombre:'Cerrado',    desc:'El ticket se cierra con conformidad',                 por:'Sistema',             ref:['lle',15]}
];
const TIPOS_VEHICULO = ['Camión','Furgoneta','Cisterna'];
const MEDIOS = {tarjeta:'Tarjeta de crédito', pagoefectivo:'Transferencia y depósito en efectivo (PagoEfectivo)', banco:'Pago en bancos (BCP)'};

function seed(){
  return {
    /* ---------- PARÁMETROS ---------- */
    vehiculos:[
      {id:'r-veh-001', placa:'XYZ123', tipo:'Camión',    ejes:2, cargaMax:5000,  consumo:4,  estado:'OK'},
      {id:'r-veh-002', placa:'ABC345', tipo:'Furgoneta', ejes:4, cargaMax:12000, consumo:12, estado:'OK'},
      {id:'r-veh-003', placa:'FGC576', tipo:'Cisterna',  ejes:3, cargaMax:9000,  consumo:15, estado:'OK'},
      {id:'r-veh-004', placa:'DEF890', tipo:'Furgoneta', ejes:2, cargaMax:8000,  consumo:8,  estado:'MANTENIMIENTO'}
    ],
    cargas:[                                   // "Tipo de carga": volumen y peso POR UNIDAD (bulto)
      {id:'CG-001', material:'Perecible',   volumen:0.5, peso:0.5, temp:'−12 °C'},
      {id:'CG-002', material:'Frágil',      volumen:1,   peso:1,   temp:'15 °C'},
      {id:'CG-003', material:'Gas',         volumen:1.5, peso:1.5, temp:'0 °C'},
      {id:'CG-004', material:'Radioactivo', volumen:2,   peso:2,   temp:'45 °C'}
    ],
    contenedores:[                             // tickets = m³ (1 ticket = 1 m³)
      {id:'r-cont-001', tipo:'Freezer',    material:'MC-1', tickets:36, cargaMax:4500, temp:'−20 / 10 °C', estado:'OK'},
      {id:'r-cont-002', tipo:'Anti-shock', material:'MC-2', tickets:60, cargaMax:8000, temp:'ambiente',    estado:'OK'},
      {id:'r-cont-003', tipo:'Hermético',  material:'MC-3', tickets:30, cargaMax:6000, temp:'−10 / 5 °C',  estado:'OK'},
      {id:'r-cont-004', tipo:'Blindado',   material:'MC-4', tickets:20, cargaMax:3000, temp:'ambiente',    estado:'MANTENIMIENTO'}
    ],
    alcances:[
      {id:'AL-001', origen:'Lima',     destino:'Chiclayo', via:'Asfaltada',      paradas:'Huacho, Trujillo', km:768,  horas:12},
      {id:'AL-002', origen:'Lima',     destino:'Junín',    via:'Asfalt./Trocha', paradas:'La Oroya',         km:300,  horas:6},
      {id:'AL-003', origen:'Trujillo', destino:'Tacna',    via:'Asfaltada',      paradas:'Lima, Ica',        km:1450, horas:25},
      {id:'AL-004', origen:'Lima',     destino:'Loreto',   via:'Fluvial',        paradas:'—',                km:null, horas:null}
    ],
    horarios:[
      {id:'HOR-001', diaSalida:'Lunes',     hSalida:'21:00', diaLlegada:'Martes',    hLlegada:'10:00'},
      {id:'HOR-002', diaSalida:'Miércoles', hSalida:'08:00', diaLlegada:'Miércoles', hLlegada:'20:00'},
      {id:'HOR-003', diaSalida:'Viernes',   hSalida:'14:00', diaLlegada:'Sábado',    hLlegada:'10:00'},
      {id:'HOR-004', diaSalida:'Domingo',   hSalida:'05:00', diaLlegada:'Domingo',   hLlegada:'17:00'}
    ],
    servicios:[
      {id:'SER-001', nombre:'Perecible económico', modalidad:'Económico', base:'ticket'},
      {id:'SER-002', nombre:'Frágil express',      modalidad:'Express',   base:'fija'},
      {id:'SER-003', nombre:'Gas económico',       modalidad:'Económico', base:'ticket'},
      {id:'SER-004', nombre:'Radioactivo express', modalidad:'Express',   base:'fija'}
    ],
    automatas:[
      {id:'AUT-001', nombre:'Automata A', rol:'Brazo Robótico', estado:'OK'},
      {id:'AUT-002', nombre:'Autómata B', rol:'Brazo Robótico', estado:'OK'},
      {id:'AUT-003', nombre:'Autómata C', rol:'Brazo Robótico', estado:'OK'},
      {id:'AUT-004', nombre:'Autómata D', rol:'Brazo Robótico', estado:'MANTENIMIENTO'}
    ],
    /* ---------- CATÁLOGOS ---------- */
    protocolos:[
      {id:'PROT-001', nombre:'Ejecutar traslado',            secuencia:'Validar ticket → Salida → Pasos de la secuencia → Cierre', activacion:'Ticket pagado + unidad asignada',        version:'v3', activo:true},
      {id:'PROT-002', nombre:'Traslado seguro volátil',      secuencia:'Validar → Ruta segura → Salida → Cierre',                   activacion:'Ticket pagado + contenedor hermético',   version:'v1', activo:true},
      {id:'PROT-003', nombre:'Atención de falla mecánica',   secuencia:'Detener → Notificar → Reasignar unidad',                    activacion:'Incidente de tipo falla mecánica',        version:'v2', activo:true},
      {id:'PROT-004', nombre:'Respuesta a incidente crítico',secuencia:'Detener → Alertar → Reportar → Cierre',                     activacion:'Incidente con severidad crítica',         version:'v1', activo:true}
    ],
    reglas:[
      {id:'REG-01', nombre:'Capacidad del viaje',       descripcion:'El ticket solo se genera si el espacio solicitado cabe en tickets (m³) Y en peso (kg).', accion:'Rechazar ticket', activo:true},
      {id:'REG-02', nombre:'Vencimiento de la reserva', descripcion:'Un ticket reservado que no se paga a tiempo libera su espacio.', accion:'Liberar espacio (batch)', activo:true},
      {id:'REG-03', nombre:'Compatibilidad',            descripcion:'El contenedor y el vehículo deben ser compatibles con el tipo de carga.', accion:'Rechazar asignación', activo:true},
      {id:'REG-04', nombre:'Día de salida',             descripcion:'La fecha del viaje debe coincidir con el día de salida del horario del producto.', accion:'Rechazar fecha', activo:true},
      {id:'REG-05', nombre:'Orden de los pasos',        descripcion:'Un paso solo se confirma si el anterior ya fue confirmado.', accion:'Bloquear paso', activo:true},
      {id:'REG-06', nombre:'Express exclusivo',         descripcion:'El servicio Express es exclusivo de una sola carga, cualquiera sea su tipo: reserva todo el contenedor y solo se permite en un viaje sin otros tickets.', accion:'Rechazar reserva', activo:true}
    ],
    politicas:[
      {id:'POL-01', nombre:'IGV',                 descripcion:'Porcentaje de IGV aplicado a la estimación del precio.', valor:'18', activo:true},
      {id:'POL-02', nombre:'Reserva de espacio',  descripcion:'Minutos que se mantiene reservado el espacio antes del pago.', valor:'15', activo:true},
      {id:'POL-03', nombre:'Cancelación',         descripcion:'Horas antes de la salida hasta las que se cancela sin cargo.', valor:'24', activo:true},
      {id:'POL-04', nombre:'Tolerancia entre pasos', descripcion:'Minutos de tolerancia para confirmar un paso antes de generar un incidente de retraso.', valor:'30', activo:true}
    ],
    compat:[                                    // tipo de carga ↔ tipo de contenedor ↔ tipo de vehículo
      {id:'CP-001', tb:'CG-001', tc:'Freezer',    tv:'Camión',    ok:true, obs:'Cadena de frío'},
      {id:'CP-002', tb:'CG-002', tc:'Anti-shock', tv:'Furgoneta', ok:true, obs:''},
      {id:'CP-003', tb:'CG-003', tc:'Hermético',  tv:'Cisterna',  ok:true, obs:'Presión controlada'},
      {id:'CP-004', tb:'CG-004', tc:'Blindado',   tv:'Furgoneta', ok:true, obs:'Requiere unidad blindada'}
    ],
    tiposIncidente:[
      {id:'INC-001', nombre:'Retraso en ruta',  categoria:'Operativo', severidad:'Baja',    protocolo:'PROT-001', activo:true},
      {id:'INC-002', nombre:'Falla mecánica',   categoria:'Vehículo',  severidad:'Media',   protocolo:'PROT-003', activo:true},
      {id:'INC-003', nombre:'Derrame de carga', categoria:'Seguridad', severidad:'Crítica', protocolo:'PROT-004', activo:true},
      {id:'INC-004', nombre:'Robo o desvío',    categoria:'Seguridad', severidad:'Crítica', protocolo:'PROT-004', activo:false}
    ],
    productos:[                                 // combinación de parámetros (la tarifa sale del reporte de tarifas)
      {id:'PROD01', tv:'Camión',    tb:'CG-001', th:'HOR-002', prot:'PROT-001', ts:'SER-001', activo:true},
      {id:'PROD02', tv:'Furgoneta', tb:'CG-002', th:'HOR-001', prot:'PROT-001', ts:'SER-002', activo:true},
      {id:'PROD03', tv:'Cisterna',  tb:'CG-003', th:'HOR-003', prot:'PROT-002', ts:'SER-003', activo:true},
      {id:'PROD04', tv:'Furgoneta', tb:'CG-004', th:'HOR-004', prot:'PROT-002', ts:'SER-004', activo:false}
    ],
    /* ---------- REPORTE DE TARIFAS (datos de consulta, no parámetro) ---------- */
    tarifas:[
      {id:'TAR-001', prod:'PROD01', modalidad:'Económico', base:'ticket', valor:120, desde:'2026-01-01', hasta:'2026-12-31'},
      {id:'TAR-002', prod:'PROD02', modalidad:'Express',   base:'fija',   valor:300, desde:'2026-01-01', hasta:'2026-12-31'},
      {id:'TAR-003', prod:'PROD03', modalidad:'Económico', base:'ticket', valor:95,  desde:'2026-01-01', hasta:'2026-12-31'},
      {id:'TAR-004', prod:'PROD04', modalidad:'Express',   base:'fija',   valor:480, desde:'2026-01-01', hasta:'2026-05-31'}
    ],
    clientes:[
      {id:'70112233',    nombre:'Juan Ramos',          tipo:'Persona', tel:'987 654 321', email:'juan.ramos@mail.com'},
      {id:'20601234567', nombre:'Comercial Norte SAC', tipo:'Empresa', tel:'014 456 789', email:'compras@comercialnorte.pe'},
      {id:'45871236',    nombre:'María Vera',          tipo:'Persona', tel:'955 123 456', email:'maria.vera@mail.com'}
    ],
    /* ---------- OPERACIÓN (cambia con cada envío) ---------- */
    viajes:[
      {id:'VJ-0001', prod:'PROD01', alcance:'AL-001', fecha:'2026-06-24', veh:'r-veh-001', cont:'r-cont-001'},
      {id:'VJ-0002', prod:'PROD02', alcance:'AL-002', fecha:'2026-06-29', veh:'r-veh-002', cont:'r-cont-002'},
      {id:'VJ-0003', prod:'PROD03', alcance:'AL-002', fecha:'2026-06-26', veh:'r-veh-003', cont:'r-cont-003'},
      {id:'VJ-0000', prod:'PROD01', alcance:'AL-002', fecha:'2026-06-10', veh:'r-veh-001', cont:'r-cont-001'}
    ],
    tickets:[], incidentes:[], backups:[], indicadores:null, bitacoraBatch:[], ordenes:0
  };
}

let DB = seed();

/* ---------- utilidades ---------- */
const by = (arr,id,key='id') => arr.find(x => x[key] === id);
const sum = (arr,k) => arr.reduce((a,x)=>a+(+x[k]||0),0);
const r2 = n => Math.round(n*100)/100;
const n2 = n => (Math.round(n*100)/100).toLocaleString('es-PE',{minimumFractionDigits:0,maximumFractionDigits:2});
const money = n => 'S/ ' + (Math.round(n*100)/100).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
const pad = (n,l=2) => String(n).padStart(l,'0');
const hhmm = d => pad(d.getHours())+':'+pad(d.getMinutes());
const ymd = d => d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const dmy = s => { const [y,m,d]=s.split('-'); return d+'/'+m+'/'+y; };
const diaDe = s => DIAS[new Date(s+'T12:00:00').getDay()];
const addMin = (d,m) => new Date(d.getTime()+m*60000);
const h12 = t => { const [h,m]=t.split(':').map(Number); return ((h+11)%12+1)+':'+pad(m)+' '+(h<12?'AM':'PM'); };
const BASE_TXT = {ticket:'Por espacio comprometido (m³/kg)', fija:'Tarifa fija'};

/* ---------- cálculos del negocio ---------- */
function espacio(cgId, unidades){
  const b = by(DB.cargas,cgId); if(!b || !(unidades>0)) return {m3:0,kg:0,n:0};
  const m3 = r2(b.volumen*unidades);
  return { m3, kg:r2(b.peso*unidades), n:Math.max(1,Math.ceil(m3-1e-9)) };      // 1 ticket = 1 m³ (mínimo 1)
}
function reglaActiva(id){ const r = by(DB.reglas,id); return !r || r.activo; }
function politica(id,def){ const p = by(DB.politicas,id); return p && p.activo ? p.valor : def; }

const servicioDe = p => by(DB.servicios,p.ts);
const esExpress = p => { const s=servicioDe(p); return !!s && s.modalidad==='Express'; };
const tarifaDe = p => DB.tarifas.find(t=>t.prod===p.id);
const tarifaVigente = (t,fecha) => !!t && (fecha||ymd(HOY))>=t.desde && (fecha||ymd(HOY))<=t.hasta;

function viajeCap(v){ const c=by(DB.contenedores,v.cont), u=by(DB.vehiculos,v.veh); return { n:c.tickets, kg:Math.min(c.cargaMax,u.cargaMax) }; }
function ticketsDe(v){ return DB.tickets.filter(t => t.viaje===v.id && !['VENCIDO','CANCELADO'].includes(t.estado)); }
function viajeUso(v){ const t=ticketsDe(v); return { n:sum(t,'n'), kg:r2(sum(t,'kg')), m3:r2(sum(t,'m3')) }; }
function viajeLibre(v){ const c=viajeCap(v), u=viajeUso(v); return { n:c.n-u.n, kg:r2(c.kg-u.kg) }; }

function prodInfo(p){ return { tb:by(DB.cargas,p.tb), th:by(DB.horarios,p.th), prot:by(DB.protocolos,p.prot), ts:servicioDe(p), tar:tarifaDe(p) }; }
function nombreProducto(p){ const i=prodInfo(p); return i.tb.material+' · '+p.tv+' · '+(i.ts?i.ts.modalidad:'—'); }

function estimarPrecio(tarifa, nTickets){
  let sub, detalle;
  if(tarifa.base==='fija'){ sub = tarifa.valor; detalle = 'Tarifa fija por reserva exclusiva del contenedor'; }
  else { sub = nTickets*tarifa.valor; detalle = nTickets+' ticket(s) × '+money(tarifa.valor)+' por ticket'; }
  const igvPct = +politica('POL-01',18), igv = sub*igvPct/100;
  return { sub:r2(sub), igvPct, igv:r2(igv), total:r2(sub+igv), detalle };
}

/* Horarios esperados de cada paso: salida + duración del alcance × avance (sin GPS) */
function planViaje(v){
  const al = by(DB.alcances,v.alcance), p = by(DB.productos,v.prod), th = by(DB.horarios,p.th);
  const sal = new Date(v.fecha+'T'+th.hSalida+':00'), horas = al.horas||0, lle = addMin(sal, horas*60);
  return { sal, lle, horas, km:al.km };
}
function esperadoPaso(v, n){
  const pl = planViaje(v), ps = by(PASOS,n,'n'); const [ref,val] = ps.ref;
  if(ref==='sal') return addMin(pl.sal,val);
  if(ref==='lle') return addMin(pl.lle,val);
  return addMin(pl.sal, pl.horas*60*val);
}
function secuenciaDe(v){ return { pasos:PASOS.map(p=>p.n), tolerancia:+politica('POL-04',30) }; }

function siguienteId(prefix, arr, len=2){
  let n = arr.length+1; while(arr.some(x=>x.id===prefix+pad(n,len))) n++;
  return prefix+pad(n,len);
}
function proximasFechas(dia, n=3){
  const out=[]; const d=new Date(HOY); d.setHours(12,0,0,0);
  while(out.length<n){ if(DIAS[d.getDay()]===dia && d>=new Date('2026-06-24T00:00:00')) out.push(ymd(d)); d.setDate(d.getDate()+1); }
  return out;
}

/* Busca (o propone) el viaje de un producto/alcance/fecha con unidad y contenedor compatibles y libres */
function resolverViaje(prod, alc, fecha){
  const exist = DB.viajes.find(v=>v.prod===prod.id && v.alcance===alc.id && v.fecha===fecha);
  if(exist) return {viaje:exist, nuevo:false};
  if(!alc.km || !alc.horas) return {error:'El alcance '+alc.id+' no tiene distancia ni duración definidas.'};
  const cp = DB.compat.find(c=>c.ok && c.tb===prod.tb && c.tv===prod.tv);
  if(reglaActiva('REG-03') && !cp) return {error:'No hay compatibilidad registrada entre este tipo de carga y este tipo de vehículo (Catálogo de compatibilidad).'};
  const tc = cp ? cp.tc : null;
  const ocupV = DB.viajes.filter(v=>v.fecha===fecha).map(v=>v.veh), ocupC = DB.viajes.filter(v=>v.fecha===fecha).map(v=>v.cont);
  const veh = DB.vehiculos.find(v=>v.tipo===prod.tv && v.estado==='OK' && !ocupV.includes(v.id));
  if(!veh) return {error:'No hay un vehículo tipo '+prod.tv+' disponible el '+dmy(fecha)+' (en uso o en mantenimiento).'};
  const con = DB.contenedores.find(c=>(!tc||c.tipo===tc) && c.estado==='OK' && !ocupC.includes(c.id));
  if(!con) return {error:'No hay un contenedor '+(tc||'')+' disponible el '+dmy(fecha)+' (en uso o en mantenimiento).'};
  return {viaje:{id:siguienteId('VJ-',DB.viajes,4),prod:prod.id,alcance:alc.id,fecha,veh:veh.id,cont:con.id}, nuevo:true};
}

function verificarEspacio(viaje, esp, prod){
  const cap = viajeCap(viaje), uso = viajeUso(viaje), libre = { n:cap.n-uso.n, kg:r2(cap.kg-uso.kg) };
  const express = prod && esExpress(prod), need = express ? cap.n : esp.n;
  let ok = true, motivo = '';
  if(express && reglaActiva('REG-06') && uso.n>0){
    ok=false; motivo='REG-06: el servicio Express es exclusivo de una sola carga y este viaje ya tiene '+uso.n+' ticket(s) reservados.';
  } else {
    const okN = need<=libre.n, okKg = esp.kg<=libre.kg;
    if(!okN && !okKg) motivo='Espacio insuficiente en tickets y en peso: solicitas '+need+' ticket(s) / '+n2(esp.kg)+' kg y quedan '+libre.n+' / '+n2(libre.kg)+' kg.';
    else if(!okN) motivo='Espacio insuficiente: solicitas '+need+' ticket(s) ('+n2(esp.m3)+' m³) y solo quedan '+libre.n+' ticket(s).';
    else if(!okKg) motivo='Peso insuficiente: solicitas '+n2(esp.kg)+' kg y solo quedan '+n2(libre.kg)+' kg.';
    ok = !reglaActiva('REG-01') || (okN && okKg);
    if(!ok){}
  }
  return { ok, libre, cap, need, uso, motivo, express };
}

/* ---------- tickets iniciales ---------- */
(function seedTickets(){
  const D = s => new Date('2026-06-24T'+s+':00');
  const mk = (id,viaje,cli,cg,uds,estado,paso,creado,hist,extra)=>{
    const v = by(DB.viajes,viaje), p = by(DB.productos,v.prod), tar = tarifaDe(p), e = espacio(cg,uds);
    const n = esExpress(p) ? viajeCap(v).n : e.n, pr = estimarPrecio(tar,n);
    const t = {id,viaje,cliente:cli,tb:cg,unidades:uds,n,m3:e.m3,kg:e.kg,tarifa:tar.id,sub:pr.sub,igv:pr.igv,total:pr.total,estado,paso,creado,hist:hist||[],
      medio:null,op:null};
    DB.ordenes++; t.op='OP-'+pad(DB.ordenes,6);
    if(estado!=='RESERVADO'&&estado!=='VENCIDO') t.medio='tarjeta';
    DB.tickets.push(t);
  };
  mk('TK-88101','VJ-0001','70112233','CG-001',10,'EN RUTA',3,D('06:20'),[{paso:1,real:D('06:58'),por:'Autómata de carga'},{paso:2,real:D('08:02'),por:'Sistema'},{paso:3,real:D('10:12'),por:'Sistema'}]);
  mk('TK-88102','VJ-0001','20601234567','CG-001',48,'EN RUTA',3,D('06:25'),[{paso:1,real:D('06:59'),por:'Autómata de carga'},{paso:2,real:D('08:02'),por:'Sistema'},{paso:3,real:D('10:12'),por:'Sistema'}]);
  mk('TK-80012','VJ-0002','45871236','CG-002',30,'PAGADO',0,D('09:05'),[]);
  mk('TK-80014','VJ-0003','20601234567','CG-003',8,'PAGADO',0,D('09:10'),[]);
  mk('TK-80013','VJ-0003','70112233','CG-003',4,'RESERVADO',0,D('09:40'),[]);
  mk('TK-80010','VJ-0000','45871236','CG-001',20,'CERRADO',7,new Date('2026-06-09T18:00:00'),
     ['07:00','08:00','09:25','12:00','13:20','14:05','14:15'].map((h,i)=>({paso:i+1,real:new Date('2026-06-10T'+h+':00'),por:by(PASOS,i+1,'n').por})));
  DB.incidentes.push({id:'IN-0001',tipo:'INC-001',ticket:'TK-80010',fecha:new Date('2026-06-10T11:40:00'),detalle:'Paso 4 confirmado con 42 min de retraso (tolerancia 30 min)',estado:'CERRADO'});
  DB.backups.push({id:'BK-0003',fecha:new Date('2026-06-23T23:30:00'),tipo:'Incremental',mb:412,destino:'Nube',ok:true,snap:null});
  DB.backups.push({id:'BK-0002',fecha:new Date('2026-06-22T23:30:00'),tipo:'Incremental',mb:398,destino:'Nube',ok:true,snap:null});
  DB.backups.push({id:'BK-0001',fecha:new Date('2026-06-21T23:30:00'),tipo:'Completo',mb:3120,destino:'Nube + disco',ok:true,snap:null});
  DB.indicadores = {generado:new Date('2026-06-24T06:00:00'), kpis:null};
})();
