/* ============================================================
   DATOS DE EJEMPLO EN MEMORIA (no hay base de datos).
   - PARÁMETROS (solo TIPOS, variables fijas que definen el producto): tipo de vehículo, tipo de carga,
     tipo de contenedor, alcance, horario, tipo de servicio y tipo de autómata.
   - FLOTA (recursos físicos, Data-entry): vehículos con placa, contenedores y autómatas, cada uno con su estado.
   - TARIFAS y SEGUIMIENTO: son REPORTES (no se mantienen como parámetros).
   - TICKET: 1 ticket = 1 m³ mínimo de espacio dentro de un contenedor. Un envío compra
     tantos tickets como m³ ocupa (redondeado hacia arriba) y además debe respetar los kg.
   - EXPRESS: exclusivo de una sola carga; reserva todo el contenedor a tarifa fija.
   ============================================================ */

const HOY = new Date('2026-06-24T10:15:00');           // reloj simulado del prototipo
const DIAS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

const PASOS = [
  {n:1, nombre:'Recibido',   desc:'La carga entra al contenedor y el ticket se valida', por:'Autómata de carga',   ref:['sal',-60], aut:'carga'},
  {n:2, nombre:'Despachado', desc:'La unidad sale del origen',                           por:'Sistema',             ref:['sal',0]},
  {n:3, nombre:'En tránsito',desc:'La unidad pasa un punto de control de la ruta',       por:'Sistema',             ref:['pct',0.25]},
  {n:4, nombre:'En parada',  desc:'Llega a una parada intermedia del alcance',           por:'Sistema',             ref:['pct',0.55]},
  {n:5, nombre:'En reparto', desc:'Llega a la ciudad de destino',                        por:'Sistema',             ref:['lle',-30]},
  {n:6, nombre:'Entregado',  desc:'La carga llega a la terminal de destino',                por:'Autómata de descarga',ref:['lle',0], aut:'descarga'},
  {n:7, nombre:'Cerrado',    desc:'El ticket se cierra con conformidad',                 por:'Sistema',             ref:['lle',15]}
];
const MEDIOS = {tarjeta:'Tarjeta de crédito', pagoefectivo:'Transferencia y depósito en efectivo (PagoEfectivo)', banco:'Pago en bancos (BCP)'};

function seed(){
  return {
    /* ---------- PARÁMETROS (solo tipos) ---------- */
    tiposVehiculo:[                            // categorías generales con sus características estándar
      {id:'TV-001', nombre:'Camión',    ejes:2, cargaMax:5500,  consumo:5},
      {id:'TV-002', nombre:'Furgoneta', ejes:2, cargaMax:10000, consumo:10},
      {id:'TV-003', nombre:'Cisterna',  ejes:3, cargaMax:10000, consumo:16},
      {id:'TV-004', nombre:'Blindado',  ejes:3, cargaMax:7000,  consumo:14}
    ],
    cargas:[                                   // "Tipo de carga": volumen y peso POR UNIDAD (bulto)
      {id:'CG-001', material:'Perecible',   volumen:0.5, peso:60,  temp:'−12 °C'},
      {id:'CG-002', material:'Frágil',      volumen:1,   peso:80,  temp:'15 °C'},
      {id:'CG-003', material:'Gas',         volumen:1.5, peso:350, temp:'0 °C'},
      {id:'CG-004', material:'Radioactivo', volumen:2,   peso:500, temp:'45 °C'},
      {id:'CG-005', material:'Abarrotes',   volumen:0.4, peso:120, temp:'ambiente'},
      {id:'CG-006', material:'Medicamentos',volumen:0.05,peso:8,   temp:'2 a 8 °C'},
      {id:'CG-007', material:'Dinero en efectivo', volumen:0.05, peso:25, temp:'ambiente'}
    ],
    tiposContenedor:[                          // tickets = m³ (1 ticket = 1 m³)
      {id:'TC-001', nombre:'Freezer',     material:'MC-1', tickets:36, cargaMax:4500, temp:'−20 / 10 °C'},
      {id:'TC-002', nombre:'Anti-shock',  material:'MC-2', tickets:60, cargaMax:8000, temp:'ambiente'},
      {id:'TC-003', nombre:'Hermético',   material:'MC-3', tickets:30, cargaMax:6000, temp:'−10 / 5 °C'},
      {id:'TC-004', nombre:'Blindado',    material:'MC-4', tickets:10, cargaMax:4000, temp:'ambiente'},
      {id:'TC-005', nombre:'Seco',        material:'MC-5', tickets:48, cargaMax:9000, temp:'ambiente'},
      {id:'TC-006', nombre:'Refrigerado', material:'MC-6', tickets:24, cargaMax:3500, temp:'2 / 8 °C'}
    ],
    alcances:[
      {id:'AL-001', origen:'Lima',     destino:'Chiclayo', via:'Asfaltada',      paradas:'Huacho, Trujillo', km:768,  horas:12},
      {id:'AL-002', origen:'Lima',     destino:'Junín',    via:'Asfalt./Trocha', paradas:'La Oroya',         km:300,  horas:6},
      {id:'AL-003', origen:'Trujillo', destino:'Tacna',    via:'Asfaltada',      paradas:'Lima, Ica',        km:1450, horas:25},
      {id:'AL-004', origen:'Lima',     destino:'Loreto',   via:'Fluvial',        paradas:'—',                km:null, horas:null},
      {id:'AL-005', origen:'Lima',     destino:'Arequipa', via:'Asfaltada',      paradas:'Ica, Nazca',       km:1010, horas:16},
      {id:'AL-006', origen:'Lima',     destino:'Ica',      via:'Asfaltada',      paradas:'Cañete, Chincha',  km:300,  horas:4},
      {id:'AL-007', origen:'Lima',     destino:'Trujillo', via:'Asfaltada',      paradas:'Huacho, Chimbote', km:560,  horas:9},
      {id:'AL-008', origen:'Lima',     destino:'Piura',    via:'Asfaltada',      paradas:'Trujillo, Chiclayo',km:980, horas:15},
      {id:'AL-009', origen:'Lima',     destino:'Cusco',    via:'Asfalt./Trocha', paradas:'Ica, Abancay',     km:1100, horas:20},
      {id:'AL-010', origen:'Chiclayo', destino:'Lima',     via:'Asfaltada',      paradas:'Trujillo, Huacho', km:768,  horas:12},
      {id:'AL-011', origen:'Arequipa', destino:'Lima',     via:'Asfaltada',      paradas:'Nazca, Ica',       km:1010, horas:16},
      {id:'AL-012', origen:'Junín',    destino:'Lima',     via:'Asfalt./Trocha', paradas:'La Oroya',         km:300,  horas:6},
      {id:'AL-013', origen:'Arequipa', destino:'Tacna',    via:'Asfaltada',      paradas:'Moquegua',         km:370,  horas:6},
      {id:'AL-014', origen:'Lima',     destino:'Tacna',    via:'Asfaltada',      paradas:'Ica, Arequipa',    km:1200, horas:19},
      {id:'AL-015', origen:'Trujillo', destino:'Lima',     via:'Asfaltada',      paradas:'Chimbote, Huacho', km:560,  horas:9}
    ],
    horarios:[
      {id:'HOR-001', diaSalida:'Lunes',     hSalida:'21:00', diaLlegada:'Martes',    hLlegada:'10:00'},
      {id:'HOR-002', diaSalida:'Miércoles', hSalida:'08:00', diaLlegada:'Miércoles', hLlegada:'20:00'},
      {id:'HOR-003', diaSalida:'Viernes',   hSalida:'14:00', diaLlegada:'Sábado',    hLlegada:'10:00'},
      {id:'HOR-004', diaSalida:'Domingo',   hSalida:'05:00', diaLlegada:'Domingo',   hLlegada:'17:00'},
      {id:'HOR-005', diaSalida:'Martes',    hSalida:'06:00', diaLlegada:'Miércoles', hLlegada:'06:00'},
      {id:'HOR-006', diaSalida:'Jueves',    hSalida:'07:00', diaLlegada:'Viernes',   hLlegada:'07:00'},
      {id:'HOR-007', diaSalida:'Sábado',    hSalida:'18:00', diaLlegada:'Domingo',   hLlegada:'18:00'},
      {id:'HOR-008', diaSalida:'Lunes',     hSalida:'06:00', diaLlegada:'Martes',    hLlegada:'06:00'},
      {id:'HOR-009', diaSalida:'Viernes',   hSalida:'05:00', diaLlegada:'Sábado',    hLlegada:'05:00'}
    ],
    servicios:[
      {id:'SER-001', nombre:'Perecible económico', modalidad:'Económico', base:'ticket'},
      {id:'SER-002', nombre:'Frágil express',      modalidad:'Express',   base:'fija'},
      {id:'SER-003', nombre:'Gas económico',       modalidad:'Económico', base:'ticket'},
      {id:'SER-004', nombre:'Radioactivo express', modalidad:'Express',   base:'fija'},
      {id:'SER-005', nombre:'Abarrotes económico', modalidad:'Económico', base:'ticket'},
      {id:'SER-006', nombre:'Medicamentos económico', modalidad:'Económico', base:'ticket'},
      {id:'SER-007', nombre:'Medicamentos express', modalidad:'Express',  base:'fija'},
      {id:'SER-008', nombre:'Traslado de valores express', modalidad:'Express', base:'fija'}
    ],
    tiposAutomata:[
      {id:'TA-001', nombre:'Brazo robótico de carga',    funcion:'carga'},
      {id:'TA-002', nombre:'Brazo robótico de descarga', funcion:'descarga'}
    ],
    /* ---------- FLOTA (recursos físicos: Data-entry) ---------- */
    vehiculos:[
      {id:'r-veh-001', placa:'XYZ123', tipo:'TV-001', estado:'OK'},
      {id:'r-veh-002', placa:'ABC345', tipo:'TV-002', estado:'OK'},
      {id:'r-veh-003', placa:'FGC576', tipo:'TV-003', estado:'OK'},
      {id:'r-veh-004', placa:'DEF890', tipo:'TV-002', estado:'MANTENIMIENTO'},
      {id:'r-veh-005', placa:'BCD456', tipo:'TV-001', estado:'OK'},
      {id:'r-veh-006', placa:'GHJ789', tipo:'TV-002', estado:'OK'},
      {id:'r-veh-007', placa:'KLM012', tipo:'TV-003', estado:'OK'},
      {id:'r-veh-008', placa:'BLD001', tipo:'TV-004', estado:'OK'},
      {id:'r-veh-009', placa:'NPQ345', tipo:'TV-001', estado:'OK'},
      {id:'r-veh-010', placa:'BLD002', tipo:'TV-004', estado:'OK'}
    ],
    contenedores:[
      {id:'r-cont-001', tipo:'TC-001', estado:'OK'},
      {id:'r-cont-002', tipo:'TC-002', estado:'OK'},
      {id:'r-cont-003', tipo:'TC-003', estado:'OK'},
      {id:'r-cont-004', tipo:'TC-004', estado:'MANTENIMIENTO'},
      {id:'r-cont-005', tipo:'TC-001', estado:'OK'},
      {id:'r-cont-006', tipo:'TC-005', estado:'OK'},
      {id:'r-cont-007', tipo:'TC-006', estado:'OK'},
      {id:'r-cont-008', tipo:'TC-004', estado:'OK'},
      {id:'r-cont-009', tipo:'TC-003', estado:'OK'},
      {id:'r-cont-010', tipo:'TC-002', estado:'OK'},
      {id:'r-cont-011', tipo:'TC-004', estado:'OK'}
    ],
    automatas:[
      {id:'AUT-001', nombre:'Autómata A', tipo:'TA-001', estado:'OK'},
      {id:'AUT-002', nombre:'Autómata B', tipo:'TA-002', estado:'OK'},
      {id:'AUT-003', nombre:'Autómata C', tipo:'TA-001', estado:'OK'},
      {id:'AUT-004', nombre:'Autómata D', tipo:'TA-002', estado:'MANTENIMIENTO'}
    ],
    /* ---------- CATÁLOGOS ---------- */
    protocolos:[
      {id:'PROT-001', nombre:'Ejecutar traslado',            secuencia:'Validar ticket → Salida → Pasos de la secuencia → Cierre', activacion:'Ticket pagado + unidad asignada',        version:'v3', activo:true},
      {id:'PROT-002', nombre:'Traslado seguro volátil',      secuencia:'Validar → Ruta segura → Salida → Cierre',                   activacion:'Ticket pagado + contenedor hermético',   version:'v1', activo:true},
      {id:'PROT-003', nombre:'Atención de falla mecánica',   secuencia:'Detener → Notificar → Reasignar unidad',                    activacion:'Incidente de tipo falla mecánica',        version:'v2', activo:true},
      {id:'PROT-004', nombre:'Respuesta a incidente crítico',secuencia:'Detener → Alertar → Reportar → Cierre',                     activacion:'Incidente con severidad crítica',         version:'v1', activo:true},
      {id:'PROT-005', nombre:'Traslado de valores',          secuencia:'Validar ticket y destinatario → Sellar contenedor → Salida → Ruta reservada → Entrega contra firma → Cierre', activacion:'Ticket pagado + contenedor y unidad blindados', version:'v1', activo:true}
    ],
    reglas:[
      {id:'REG-01', nombre:'Capacidad del viaje',       descripcion:'El ticket solo se genera si el espacio solicitado cabe en tickets (m³) Y en peso (kg).', accion:'Rechazar ticket', activo:true},
      {id:'REG-02', nombre:'Vencimiento de la reserva', descripcion:'Un ticket reservado que no se paga a tiempo libera su espacio.', accion:'Liberar espacio (batch)', activo:true},
      {id:'REG-03', nombre:'Tipo de unidad del producto', descripcion:'El viaje solo usa un vehículo y un contenedor del tipo que define el producto (y que estén operativos).', accion:'Rechazar asignación', activo:true},
      {id:'REG-04', nombre:'Día de salida',             descripcion:'La fecha del viaje debe coincidir con el día de salida del horario del producto.', accion:'Rechazar fecha', activo:true},
      {id:'REG-05', nombre:'Orden de los pasos',        descripcion:'Un paso solo se confirma si el anterior ya fue confirmado.', accion:'Bloquear paso', activo:true},
      {id:'REG-06', nombre:'Express exclusivo',         descripcion:'El servicio Express es exclusivo de una sola carga, cualquiera sea su tipo: reserva todo el contenedor y solo se permite en un viaje sin otros tickets.', accion:'Rechazar reserva', activo:true},
      {id:'REG-07', nombre:'Ventana del horario',       descripcion:'La duración del alcance debe caber entre la salida y la llegada programadas del horario del producto.', accion:'Rechazar ruta', activo:true}
    ],
    politicas:[
      {id:'POL-01', nombre:'IGV',                 descripcion:'Porcentaje de IGV aplicado a la estimación del precio.', valor:'18', activo:true},
      {id:'POL-02', nombre:'Reserva de espacio',  descripcion:'Minutos que se mantiene reservado el espacio antes del pago.', valor:'15', activo:true},
      {id:'POL-03', nombre:'Cancelación',         descripcion:'Horas antes de la salida hasta las que se cancela sin cargo.', valor:'24', activo:true},
      {id:'POL-04', nombre:'Tolerancia entre pasos', descripcion:'Minutos de tolerancia para confirmar un paso antes de generar un incidente de retraso.', valor:'30', activo:true}
    ],
    tiposIncidente:[
      {id:'INC-001', nombre:'Retraso en ruta',  categoria:'Operativo', severidad:'Baja',    protocolo:'PROT-001', activo:true},
      {id:'INC-002', nombre:'Falla mecánica',   categoria:'Vehículo',  severidad:'Media',   protocolo:'PROT-003', activo:true},
      {id:'INC-003', nombre:'Derrame de carga', categoria:'Seguridad', severidad:'Crítica', protocolo:'PROT-004', activo:true},
      {id:'INC-004', nombre:'Robo o desvío',    categoria:'Seguridad', severidad:'Crítica', protocolo:'PROT-004', activo:false}
    ],
    productos:[                                 // naturaleza del producto: combinación de tipos (la tarifa sale del reporte de tarifas)
      {id:'PROD01', tv:'TV-001', tc:'TC-001', tb:'CG-001', th:'HOR-002', prot:'PROT-001', ts:'SER-001', activo:true},
      {id:'PROD02', tv:'TV-002', tc:'TC-002', tb:'CG-002', th:'HOR-001', prot:'PROT-001', ts:'SER-002', activo:true},
      {id:'PROD03', tv:'TV-003', tc:'TC-003', tb:'CG-003', th:'HOR-003', prot:'PROT-002', ts:'SER-003', activo:true},
      {id:'PROD04', tv:'TV-002', tc:'TC-004', tb:'CG-004', th:'HOR-004', prot:'PROT-002', ts:'SER-004', activo:false},
      {id:'PROD05', tv:'TV-001', tc:'TC-001', tb:'CG-001', th:'HOR-005', prot:'PROT-001', ts:'SER-001', activo:true},
      {id:'PROD06', tv:'TV-001', tc:'TC-005', tb:'CG-005', th:'HOR-006', prot:'PROT-001', ts:'SER-005', activo:true},
      {id:'PROD07', tv:'TV-001', tc:'TC-005', tb:'CG-005', th:'HOR-007', prot:'PROT-001', ts:'SER-005', activo:true},
      {id:'PROD08', tv:'TV-002', tc:'TC-006', tb:'CG-006', th:'HOR-005', prot:'PROT-001', ts:'SER-006', activo:true},
      {id:'PROD09', tv:'TV-002', tc:'TC-006', tb:'CG-006', th:'HOR-006', prot:'PROT-001', ts:'SER-007', activo:true},
      {id:'PROD10', tv:'TV-004', tc:'TC-004', tb:'CG-007', th:'HOR-008', prot:'PROT-005', ts:'SER-008', activo:true},
      {id:'PROD11', tv:'TV-004', tc:'TC-004', tb:'CG-007', th:'HOR-009', prot:'PROT-005', ts:'SER-008', activo:true}
    ],
    /* ---------- REPORTE DE TARIFAS (datos de consulta, no parámetro) ---------- */
    tarifas:[
      {id:'TAR-001', prod:'PROD01', modalidad:'Económico', base:'ticket', valor:120, desde:'2026-01-01', hasta:'2026-12-31'},
      {id:'TAR-002', prod:'PROD02', modalidad:'Express',   base:'fija',   valor:300, desde:'2026-01-01', hasta:'2026-12-31'},
      {id:'TAR-003', prod:'PROD03', modalidad:'Económico', base:'ticket', valor:95,  desde:'2026-01-01', hasta:'2026-12-31'},
      {id:'TAR-004', prod:'PROD04', modalidad:'Express',   base:'fija',   valor:480, desde:'2026-01-01', hasta:'2026-05-31'},
      {id:'TAR-005', prod:'PROD05', modalidad:'Económico', base:'ticket', valor:120, desde:'2026-01-01', hasta:'2026-12-31'},
      {id:'TAR-006', prod:'PROD06', modalidad:'Económico', base:'ticket', valor:60,  desde:'2026-01-01', hasta:'2026-12-31'},
      {id:'TAR-007', prod:'PROD07', modalidad:'Económico', base:'ticket', valor:60,  desde:'2026-01-01', hasta:'2026-12-31'},
      {id:'TAR-008', prod:'PROD08', modalidad:'Económico', base:'ticket', valor:210, desde:'2026-01-01', hasta:'2026-12-31'},
      {id:'TAR-009', prod:'PROD09', modalidad:'Express',   base:'fija',   valor:900, desde:'2026-01-01', hasta:'2026-12-31'},
      {id:'TAR-010', prod:'PROD10', modalidad:'Express',   base:'fija',   valor:2500,desde:'2026-01-01', hasta:'2026-12-31'},
      {id:'TAR-011', prod:'PROD11', modalidad:'Express',   base:'fija',   valor:2500,desde:'2026-01-01', hasta:'2026-12-31'}
    ],
    clientes:[
      {id:'70112233',    clave:'123456', nombre:'Juan Ramos',          tipo:'Persona', tel:'987 654 321', email:'juan.ramos@mail.com'},
      {id:'20601234567', clave:'123456', nombre:'Comercial Norte SAC', tipo:'Empresa', tel:'014 456 789', email:'compras@comercialnorte.pe'},
      {id:'45871236',    clave:'123456', nombre:'María Vera',          tipo:'Persona', tel:'955 123 456', email:'maria.vera@mail.com'}
    ],
    /* ---------- CUENTAS DEL PERSONAL (el cliente entra con su propia cuenta) ---------- */
    usuarios:[
      {dni:'40000000', clave:'123456', nombre:'Modo demostración', rol:'demo'},
      {dni:'40000001', clave:'123456', nombre:'Ana Torres',        rol:'gerente'},
      {dni:'40000002', clave:'123456', nombre:'Luis Paredes',      rol:'supervisor'},
      {dni:'40000003', clave:'123456', nombre:'Rosa Medina',       rol:'admin'}
    ],
    /* ---------- OPERACIÓN (cambia con cada envío) ---------- */
    viajes:[
      {id:'VJ-0001', prod:'PROD01', alcance:'AL-001', fecha:'2026-06-24', veh:'r-veh-001', cont:'r-cont-001'},
      {id:'VJ-0002', prod:'PROD02', alcance:'AL-002', fecha:'2026-06-29', veh:'r-veh-002', cont:'r-cont-002'},
      {id:'VJ-0003', prod:'PROD03', alcance:'AL-002', fecha:'2026-06-26', veh:'r-veh-003', cont:'r-cont-003'},
      {id:'VJ-0000', prod:'PROD01', alcance:'AL-002', fecha:'2026-06-10', veh:'r-veh-001', cont:'r-cont-001'},
      {id:'VJ-0004', prod:'PROD10', alcance:'AL-007', fecha:'2026-06-29', veh:'r-veh-008', cont:'r-cont-008'},
      {id:'VJ-0005', prod:'PROD05', alcance:'AL-007', fecha:'2026-06-30', veh:'r-veh-005', cont:'r-cont-005'},
      {id:'VJ-0006', prod:'PROD06', alcance:'AL-005', fecha:'2026-06-25', veh:'r-veh-009', cont:'r-cont-006'},
      {id:'VJ-0007', prod:'PROD08', alcance:'AL-006', fecha:'2026-06-30', veh:'r-veh-006', cont:'r-cont-007'}
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
const tvDe = id => by(DB.tiposVehiculo,id), tcDe = id => by(DB.tiposContenedor,id), taDe = id => by(DB.tiposAutomata,id);
const nomTV = id => (tvDe(id)||{nombre:id}).nombre, nomTC = id => (tcDe(id)||{nombre:id}).nombre;
/* duración en horas de la ventana salida → llegada de un horario */
function ventanaHoras(th){ const d=(DIAS.indexOf(th.diaLlegada)-DIAS.indexOf(th.diaSalida)+7)%7; const [a,b]=th.hSalida.split(':').map(Number), [c,e]=th.hLlegada.split(':').map(Number); return d*24+((c*60+e)-(a*60+b))/60; }
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

function viajeCap(v){ const c=tcDe(by(DB.contenedores,v.cont).tipo), u=tvDe(by(DB.vehiculos,v.veh).tipo); return { n:c.tickets, kg:Math.min(c.cargaMax,u.cargaMax) }; }   // capacidad = la del tipo (estándar)
function ticketsDe(v){ return DB.tickets.filter(t => t.viaje===v.id && !['VENCIDO','CANCELADO'].includes(t.estado)); }
function viajeUso(v){ const t=ticketsDe(v); return { n:sum(t,'n'), kg:r2(sum(t,'kg')), m3:r2(sum(t,'m3')) }; }
function viajeLibre(v){ const c=viajeCap(v), u=viajeUso(v); return { n:c.n-u.n, kg:r2(c.kg-u.kg) }; }

function prodInfo(p){ return { tv:tvDe(p.tv), tc:tcDe(p.tc), tb:by(DB.cargas,p.tb), th:by(DB.horarios,p.th), prot:by(DB.protocolos,p.prot), ts:servicioDe(p), tar:tarifaDe(p) }; }
function nombreProducto(p){ const i=prodInfo(p); return i.tb.material+' · '+nomTV(p.tv)+' · '+(i.ts?i.ts.modalidad:'—'); }

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

/* Origen y destino los escribe el cliente (texto libre): el sistema los cruza con el parámetro Alcance */
const norm = s => String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').trim().toLowerCase();
const lugares = () => [...new Set(DB.alcances.filter(a=>a.km&&a.horas).flatMap(a=>[a.origen,a.destino]))];
function buscarAlcance(o,d){
  if(!norm(o)||!norm(d)) return {};
  if(norm(o)===norm(d)) return {error:'El origen y el destino no pueden ser el mismo lugar.'};
  const a = DB.alcances.find(x=>norm(x.origen)===norm(o)&&norm(x.destino)===norm(d));
  const rutas = DB.alcances.filter(x=>x.km&&x.horas).map(x=>x.origen+' → '+x.destino).join(', ');
  if(!a) return {error:'Aún no operamos la ruta '+o.trim()+' → '+d.trim()+'. Rutas disponibles: '+rutas+'.'};
  if(!a.km||!a.horas) return {error:'La ruta '+a.origen+' → '+a.destino+' todavía no tiene distancia ni duración definidas. Rutas disponibles: '+rutas+'.'};
  return {alcance:a};
}
function syncRuta(d){ const r=buscarAlcance(d.origen,d.destino); d.alc=r.alcance?r.alcance.id:''; d.rutaErr=r.error||''; if(r.alcance){ d.origen=r.alcance.origen; d.destino=r.alcance.destino; } }

/* Busca (o propone) el viaje de un producto/alcance/fecha con unidad y contenedor del tipo del producto, operativos y libres */
function resolverViaje(prod, alc, fecha){
  const exist = DB.viajes.find(v=>v.prod===prod.id && v.alcance===alc.id && v.fecha===fecha);
  if(exist) return {viaje:exist, nuevo:false};
  if(!alc.km || !alc.horas) return {error:'El alcance '+alc.id+' no tiene distancia ni duración definidas.'};
  const th = by(DB.horarios,prod.th), vent = ventanaHoras(th);
  if(reglaActiva('REG-07') && alc.horas>vent) return {error:'REG-07: la ruta '+alc.origen+' → '+alc.destino+' dura '+alc.horas+' h y el horario del producto ('+th.diaSalida+' '+th.hSalida+' → '+th.diaLlegada+' '+th.hLlegada+') solo permite '+n2(vent)+' h. Elija otro producto u horario.'};
  const rig = reglaActiva('REG-03');
  const ocupV = DB.viajes.filter(v=>v.fecha===fecha).map(v=>v.veh), ocupC = DB.viajes.filter(v=>v.fecha===fecha).map(v=>v.cont);
  const veh = DB.vehiculos.find(v=>(!rig||v.tipo===prod.tv) && v.estado==='OK' && !ocupV.includes(v.id));
  if(!veh) return {error:'No hay un vehículo tipo '+nomTV(prod.tv)+' disponible el '+dmy(fecha)+' (en uso o en mantenimiento).'};
  const con = DB.contenedores.find(c=>(!rig||c.tipo===prod.tc) && c.estado==='OK' && !ocupC.includes(c.id));
  if(!con) return {error:'No hay un contenedor '+nomTC(prod.tc)+' disponible el '+dmy(fecha)+' (en uso o en mantenimiento).'};
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
  mk('TK-80015','VJ-0004','20601234567','CG-007',40,'PAGADO',0,D('09:20'),[]);
  mk('TK-80016','VJ-0005','20601234567','CG-001',30,'PAGADO',0,D('09:25'),[]);
  mk('TK-80017','VJ-0006','45871236','CG-005',40,'PAGADO',0,D('09:30'),[]);
  mk('TK-80018','VJ-0007','70112233','CG-006',150,'PAGADO',0,D('09:35'),[]);
  mk('TK-80010','VJ-0000','45871236','CG-001',20,'CERRADO',7,new Date('2026-06-09T18:00:00'),
     ['07:00','08:00','09:25','12:00','13:20','14:05','14:15'].map((h,i)=>({paso:i+1,real:new Date('2026-06-10T'+h+':00'),por:by(PASOS,i+1,'n').por})));
  DB.incidentes.push({id:'IN-0001',tipo:'INC-001',ticket:'TK-80010',fecha:new Date('2026-06-10T11:40:00'),detalle:'Paso 4 confirmado con 42 min de retraso (tolerancia 30 min)',estado:'CERRADO'});
  DB.backups.push({id:'BK-0003',fecha:new Date('2026-06-23T23:30:00'),tipo:'Incremental',mb:412,destino:'Nube',ok:true,snap:null});
  DB.backups.push({id:'BK-0002',fecha:new Date('2026-06-22T23:30:00'),tipo:'Incremental',mb:398,destino:'Nube',ok:true,snap:null});
  DB.backups.push({id:'BK-0001',fecha:new Date('2026-06-21T23:30:00'),tipo:'Completo',mb:3120,destino:'Nube + disco',ok:true,snap:null});
  DB.indicadores = {generado:new Date('2026-06-24T06:00:00'), kpis:null};
})();
