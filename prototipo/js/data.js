/* ============================================================
   DATOS DE EJEMPLO EN MEMORIA (no hay base de datos).
   - PARÁMETROS (solo TIPOS, variables fijas que definen el producto): tipo de vehículo, tipo de carga,
     tipo de contenedor, alcance, horario, tipo de servicio y tipo de autómata.
   - FLOTA (recursos físicos, Data-entry): vehículos con placa, contenedores y autómatas, cada uno con su estado.
   - TARIFAS: se asocian a un TIPO DE SERVICIO + un ALCANCE (ruta); son un REPORTE (no se mantienen como parámetro).
   - SEGUIMIENTO: REPORTE con ubicación GPS de la unidad (sin puntos de control); cada vehículo lleva un equipo GPS.
   - TICKET: 1 ticket = 1 m³ mínimo de espacio dentro de un contenedor. Un envío compra
     tantos tickets como m³ ocupa (redondeado hacia arriba) y además debe respetar el peso por eje
     del vehículo (capacidad en kg = ejes × peso máximo por eje, política POL-05).
   - CARGA: el cliente digita las dimensiones (largo × ancho × alto) y el peso de su bulto y la cantidad.
   - EXPRESS: exclusivo de una sola carga; reserva todo el contenedor a tarifa fija.
   ============================================================ */

const HOY = new Date('2026-06-24T10:15:00');           // reloj simulado del prototipo
const DIAS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

const PASOS = [
  {n:1, nombre:'Recibido',   desc:'La carga entra al contenedor y el ticket se valida', por:'Autómata de carga',   ref:['sal',-60], aut:'carga'},
  {n:2, nombre:'Despachado', desc:'El GPS detecta que la unidad salió del origen',       por:'GPS de la unidad',    ref:['sal',0]},
  {n:3, nombre:'En tránsito',desc:'El GPS reporta que la unidad avanza por la ruta',     por:'GPS de la unidad',    ref:['avance',0.25]},
  {n:4, nombre:'En parada',  desc:'El GPS detecta la unidad en una parada intermedia',   por:'GPS de la unidad',    ref:['avance',0.55]},
  {n:5, nombre:'En reparto', desc:'El GPS detecta la unidad en la ciudad de destino',    por:'GPS de la unidad',    ref:['lle',-30]},
  {n:6, nombre:'Entregado',  desc:'La carga llega a la terminal de destino',                por:'Autómata de descarga',ref:['lle',0], aut:'descarga'},
  {n:7, nombre:'Cerrado',    desc:'El ticket se cierra con conformidad',                 por:'Sistema',             ref:['lle',15]}
];
const MEDIOS = {tarjeta:'Tarjeta de crédito', pagoefectivo:'Transferencia y depósito en efectivo (PagoEfectivo)', banco:'Pago en bancos (BCP)'};

function seed(){
  return {
    /* ---------- PARÁMETROS (solo tipos) ---------- */
    tiposVehiculo:[                            // categorías generales con sus características estándar
      {id:'TV-001', nombre:'Camión',    ejes:2, consumo:5},
      {id:'TV-002', nombre:'Furgoneta', ejes:2, consumo:10},
      {id:'TV-003', nombre:'Cisterna',  ejes:3, consumo:16},
      {id:'TV-004', nombre:'Blindado',  ejes:3, consumo:14}
    ],
    cargas:[                                   // "Tipo de carga": solo código y material (las dimensiones las digita el cliente)
      {id:'CG-001', material:'Perecible'},
      {id:'CG-002', material:'Frágil'},
      {id:'CG-003', material:'Gas'},
      {id:'CG-004', material:'Radioactivo'},
      {id:'CG-005', material:'Abarrotes'},
      {id:'CG-006', material:'Medicamentos'},
      {id:'CG-007', material:'Dinero en efectivo'}
    ],
    tiposContenedor:[                          // el volumen (m³) es de cada contenedor de la flota
      {id:'TC-001', nombre:'Freezer',     material:'MC-1', temp:'−20 / 10 °C'},
      {id:'TC-002', nombre:'Anti-shock',  material:'MC-2', temp:'ambiente'},
      {id:'TC-003', nombre:'Hermético',   material:'MC-3', temp:'−10 / 5 °C'},
      {id:'TC-004', nombre:'Blindado',    material:'MC-4', temp:'ambiente'},
      {id:'TC-005', nombre:'Seco',        material:'MC-5', temp:'ambiente'},
      {id:'TC-006', nombre:'Refrigerado', material:'MC-6', temp:'2 / 8 °C'}
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
      {id:'r-veh-001', placa:'XYZ123', tipo:'TV-001', estado:'OK', gps:'GPS-001'},
      {id:'r-veh-002', placa:'ABC345', tipo:'TV-002', estado:'OK', gps:'GPS-002'},
      {id:'r-veh-003', placa:'FGC576', tipo:'TV-003', estado:'OK', gps:'GPS-003'},
      {id:'r-veh-004', placa:'DEF890', tipo:'TV-002', estado:'MANTENIMIENTO', gps:'GPS-004'},
      {id:'r-veh-005', placa:'BCD456', tipo:'TV-001', estado:'OK', gps:'GPS-005'},
      {id:'r-veh-006', placa:'GHJ789', tipo:'TV-002', estado:'OK', gps:'GPS-006'},
      {id:'r-veh-007', placa:'KLM012', tipo:'TV-003', estado:'OK', gps:'GPS-007'},
      {id:'r-veh-008', placa:'BLD001', tipo:'TV-004', estado:'OK', gps:'GPS-008'},
      {id:'r-veh-009', placa:'NPQ345', tipo:'TV-001', estado:'OK', gps:'GPS-009'},
      {id:'r-veh-010', placa:'BLD002', tipo:'TV-004', estado:'OK', gps:'GPS-010'}
    ],
    contenedores:[                             // vol = m³ del contenedor (1 ticket = 1 m³)
      {id:'r-cont-001', tipo:'TC-001', vol:36, estado:'OK'},
      {id:'r-cont-002', tipo:'TC-002', vol:60, estado:'OK'},
      {id:'r-cont-003', tipo:'TC-003', vol:30, estado:'OK'},
      {id:'r-cont-004', tipo:'TC-004', vol:10, estado:'MANTENIMIENTO'},
      {id:'r-cont-005', tipo:'TC-001', vol:36, estado:'OK'},
      {id:'r-cont-006', tipo:'TC-005', vol:48, estado:'OK'},
      {id:'r-cont-007', tipo:'TC-006', vol:24, estado:'OK'},
      {id:'r-cont-008', tipo:'TC-004', vol:10, estado:'OK'},
      {id:'r-cont-009', tipo:'TC-003', vol:30, estado:'OK'},
      {id:'r-cont-010', tipo:'TC-002', vol:60, estado:'OK'},
      {id:'r-cont-011', tipo:'TC-004', vol:10, estado:'OK'}
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
      {id:'REG-01', nombre:'Capacidad del viaje',       descripcion:'El ticket solo se genera si el espacio solicitado cabe en tickets (m³) Y en el peso por eje del vehículo (kg).', accion:'Rechazar ticket', activo:true},
      {id:'REG-02', nombre:'Vencimiento de la reserva', descripcion:'Un ticket reservado que no se paga a tiempo libera su espacio.', accion:'Liberar espacio (batch)', activo:true},
      {id:'REG-03', nombre:'Tipo de unidad del producto', descripcion:'El viaje solo usa un vehículo y un contenedor del tipo que define el producto (y que estén operativos).', accion:'Rechazar asignación', activo:true},
      {id:'REG-04', nombre:'Día de salida',             descripcion:'La fecha del viaje debe coincidir con el día de salida del horario del producto.', accion:'Rechazar fecha', activo:true},
      {id:'REG-05', nombre:'Orden de los pasos',        descripcion:'Un paso solo se confirma si el anterior ya fue confirmado.', accion:'Bloquear paso', activo:true},
      {id:'REG-06', nombre:'Express exclusivo',         descripcion:'El servicio Express es exclusivo de una sola carga, cualquiera sea su tipo: reserva todo el contenedor y solo se permite en un viaje sin otros tickets.', accion:'Rechazar reserva', activo:true},
      {id:'REG-07', nombre:'Ventana del horario',       descripcion:'La duración del alcance debe caber entre la salida y la llegada programadas del horario del producto.', accion:'Rechazar ruta', activo:true},
      {id:'REG-08', nombre:'Vehículo con GPS',         descripcion:'El viaje solo usa un vehículo con equipo GPS asignado, porque la ubicación del envío se sigue por GPS.', accion:'Rechazar asignación', activo:true}
    ],
    politicas:[
      {id:'POL-01', nombre:'IGV',                 descripcion:'Porcentaje de IGV aplicado a la estimación del precio.', valor:'18', activo:true},
      {id:'POL-02', nombre:'Reserva de espacio',  descripcion:'Minutos que se mantiene reservado el espacio antes del pago.', valor:'15', activo:true},
      {id:'POL-03', nombre:'Cancelación',         descripcion:'Horas antes de la salida hasta las que se cancela sin cargo.', valor:'24', activo:true},
      {id:'POL-05', nombre:'Peso máximo por eje',   descripcion:'Kilogramos que soporta cada eje del vehículo. Capacidad del vehículo = N° de ejes × este valor.', valor:'5000', activo:true},
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
    /* ---------- REPORTE DE TARIFAS (datos de consulta, no parámetro) ----------
       La tarifa se asocia a un TIPO DE SERVICIO + un ALCANCE (ruta): el precio depende de qué se presta y de cuánto se recorre.
       Se genera con una tarifa por km de cada servicio (la tarifa por ticket es por 1 m³; la fija, por todo el contenedor). */
    tarifas:[],
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

/* tarifa por km de cada tipo de servicio (S/) y vigencia; SER-004 (radioactivo) tiene la tarifa vencida a propósito */
const TARIFA_KM = {'SER-001':0.16,'SER-002':0.40,'SER-003':0.12,'SER-004':0.62,'SER-005':0.08,'SER-006':0.27,'SER-007':1.17,'SER-008':3.25};
function generarTarifas(db){
  let n=1; const out=[];
  db.servicios.forEach(sv=>{ db.alcances.filter(a=>a.km&&a.horas).forEach(al=>{
    out.push({id:'TAR-'+String(n++).padStart(3,'0'), ts:sv.id, alcance:al.id, modalidad:sv.modalidad, base:sv.base,
      valor:Math.max(10,Math.round(al.km*TARIFA_KM[sv.id]/5)*5), desde:'2026-01-01', hasta:sv.id==='SER-004'?'2026-05-31':'2026-12-31'}); }); });
  return out;
}
let DB = seed();
DB.tarifas = generarTarifas(DB);

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
/* El cliente digita: bultos (cant), largo/ancho/alto de un bulto en cm y peso de un bulto en kg */
function espacioDe(d){
  const c=+d.cant, l=+d.largo, a=+d.ancho, h=+d.alto, p=+d.peso;
  if(!(c>0 && l>0 && a>0 && h>0 && p>0)) return {m3:0,kg:0,n:0,vb:0};
  const vb = l*a*h/1e6, m3 = r2(vb*c);
  return { m3, kg:r2(p*c), n:Math.max(1,Math.ceil(m3-1e-9)), vb:r2(vb) };        // 1 ticket = 1 m³ (mínimo 1)
}
const pesoEje = () => +politica('POL-05',5000);
const capKgVeh = u => (tvDe(u.tipo)||{ejes:0}).ejes*pesoEje();                    // capacidad = ejes × peso máx. por eje
function reglaActiva(id){ const r = by(DB.reglas,id); return !r || r.activo; }
function politica(id,def){ const p = by(DB.politicas,id); return p && p.activo ? p.valor : def; }

const servicioDe = p => by(DB.servicios,p.ts);
const esExpress = p => { const s=servicioDe(p); return !!s && s.modalidad==='Express'; };
/* La tarifa depende del tipo de servicio del producto y del alcance (ruta) del viaje */
const tarifaDe = (p,alc) => DB.tarifas.find(t=>t.ts===p.ts && t.alcance===alc);
const tarifasDeServicio = ts => DB.tarifas.filter(t=>t.ts===ts);
const nomSer = id => (by(DB.servicios,id)||{nombre:id}).nombre;
const tarifaVigente = (t,fecha) => !!t && (fecha||ymd(HOY))>=t.desde && (fecha||ymd(HOY))<=t.hasta;

function viajeCap(v){ const c=by(DB.contenedores,v.cont), u=by(DB.vehiculos,v.veh); return { n:c.vol, kg:capKgVeh(u) }; }   // m³ del contenedor y kg por ejes del vehículo
function ticketsDe(v){ return DB.tickets.filter(t => t.viaje===v.id && !['VENCIDO','CANCELADO'].includes(t.estado)); }
function viajeUso(v){ const t=ticketsDe(v); return { n:sum(t,'n'), kg:r2(sum(t,'kg')), m3:r2(sum(t,'m3')) }; }
function viajeLibre(v){ const c=viajeCap(v), u=viajeUso(v); return { n:c.n-u.n, kg:r2(c.kg-u.kg) }; }

/* estado operativo de una unidad de la flota según los envíos que lleva (campo: 'veh' o 'cont') */
function unidadEnvio(campo,id){
  const peso={'EN RUTA':3,'ENTREGADO':2,'RESERVADO':1}; let best=null;
  DB.viajes.filter(v=>v[campo]===id).forEach(v=>{ const ts=ticketsDe(v).filter(t=>t.estado!=='CERRADO'); if(!ts.length) return;
    const st=ts.some(t=>t.estado==='EN RUTA')?'EN RUTA':ts.some(t=>t.estado==='ENTREGADO')?'ENTREGADO':'RESERVADO';
    if(!best||peso[st]>peso[best.st]||(peso[st]===peso[best.st]&&v.fecha<best.v.fecha)) best={v,st}; });
  if(!best) return {estado:'LIBRE',carga:'—',viaje:null};
  return {estado:best.st,carga:nomCG(by(DB.productos,best.v.prod).tb),viaje:best.v.id,fecha:best.v.fecha};
}
function prodInfo(p){ return { tv:tvDe(p.tv), tc:tcDe(p.tc), tb:by(DB.cargas,p.tb), th:by(DB.horarios,p.th), prot:by(DB.protocolos,p.prot), ts:servicioDe(p) }; }
function nombreProducto(p){ const i=prodInfo(p); return i.tb.material+' · '+nomTV(p.tv)+' · '+(i.ts?i.ts.modalidad:'—'); }

function estimarPrecio(tarifa, nTickets){
  let sub, detalle;
  if(tarifa.base==='fija'){ sub = tarifa.valor; detalle = 'Tarifa fija por reserva exclusiva del contenedor'; }
  else { sub = nTickets*tarifa.valor; detalle = nTickets+' ticket(s) × '+money(tarifa.valor)+' por ticket'; }
  const igvPct = +politica('POL-01',18), igv = sub*igvPct/100;
  return { sub:r2(sub), igvPct, igv:r2(igv), total:r2(sub+igv), detalle };
}

/* Horarios esperados de cada paso: salida + duración del alcance × avance. El GPS contrasta lo esperado con la posición real. */
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

/* ---------- SEGUIMIENTO GPS ----------
   Cada vehículo lleva un equipo GPS que reporta su posición. No hay puntos de control fijos: el recorrido es
   origen → paradas del alcance → destino y la posición se ubica sobre ese recorrido. (Prototipo: la señal se simula.) */
const COORD = {'Lima':[-12.046,-77.043],'Chiclayo':[-6.771,-79.840],'Junín':[-11.158,-75.993],'Trujillo':[-8.112,-79.029],'Tacna':[-18.006,-70.246],
  'Arequipa':[-16.409,-71.537],'Ica':[-14.068,-75.729],'Piura':[-5.194,-80.633],'Cusco':[-13.532,-71.967],'Huacho':[-11.107,-77.605],
  'La Oroya':[-11.519,-75.900],'Cañete':[-13.077,-76.384],'Chincha':[-13.410,-76.132],'Chimbote':[-9.085,-78.578],'Nazca':[-14.830,-74.939],
  'Abancay':[-13.634,-72.881],'Moquegua':[-17.195,-70.935]};
function distGeo(a,b){ const R=6371, rad=x=>x*Math.PI/180, dl=rad(b[0]-a[0]), dg=rad(b[1]-a[1]);
  const h=Math.sin(dl/2)**2+Math.cos(rad(a[0]))*Math.cos(rad(b[0]))*Math.sin(dg/2)**2; return 2*R*Math.asin(Math.sqrt(h)); }
/* recorrido del alcance: lista de lugares con su coordenada y su avance (0–1) sobre la ruta */
function rutaGPS(al){
  const nombres=[al.origen,...String(al.paradas||'').split(',').map(x=>x.trim()).filter(x=>x&&x!=='—'),al.destino];
  const pts=nombres.filter(n=>COORD[n]).map(n=>({n,c:COORD[n],acum:0}));
  for(let i=1;i<pts.length;i++) pts[i].acum=pts[i-1].acum+distGeo(pts[i-1].c,pts[i].c);
  const tot=pts.length?pts[pts.length-1].acum:0; pts.forEach(q=>q.f=tot?q.acum/tot:0); return {pts,tot};
}
/* avance (0–1) que ya garantiza el último paso confirmado */
function avancePaso(v,n){ if(!n) return 0; const pl=planViaje(v), ps=by(PASOS,n,'n'), [ref,val]=ps.ref;
  if(ref==='avance') return val; if(ref==='lle') return pl.horas?Math.min(1,Math.max(0,1+val/(pl.horas*60))):1; return 0; }
/* posición GPS actual de la unidad que lleva el ticket */
function gpsEstado(v,t){
  const al=by(DB.alcances,v.alcance), r=rutaGPS(al), pl=planViaje(v), veh=by(DB.vehiculos,v.veh);
  let f=0, estado='En la terminal de origen';
  if(['RESERVADO','PAGADO','VENCIDO','CANCELADO'].includes(t.estado)||!t.paso){ f=0; }
  else if(t.paso>=6){ f=1; estado='En la terminal de destino'; }
  else { const ft=pl.lle>pl.sal?(AHORA-pl.sal)/(pl.lle-pl.sal):0; f=Math.min(0.995,Math.max(avancePaso(v,t.paso),ft,0.01)); estado='En ruta'; }
  let c=r.pts.length?r.pts[0].c:[0,0], prev=r.pts[0], next=r.pts[r.pts.length-1];
  for(let i=1;i<r.pts.length;i++){ if(f<=r.pts[i].f+1e-9){ const a=r.pts[i-1], b=r.pts[i], k=b.f>a.f?(f-a.f)/(b.f-a.f):0;
      c=[a.c[0]+(b.c[0]-a.c[0])*k,a.c[1]+(b.c[1]-a.c[1])*k]; prev=a; next=b; break; } }
  const enRuta=estado==='En ruta', vel=enRuta?Math.round(al.km/al.horas):0;
  return { f, c, lat:c[0], lng:c[1], kmRec:Math.round(f*al.km), kmTot:al.km, vel, estado, prev, next, pts:r.pts,
    gps:(veh&&veh.gps)||'—', placa:veh?veh.placa:'—', ultima:new Date(AHORA),
    cerca:enRuta?(f>=0.995?'Llegando a '+next.n:'Entre '+prev.n+' y '+next.n):(f>=1?al.destino:al.origen) };
}
/* mapa esquemático del recorrido con la posición GPS (SVG) */
function mapaGPS(g){
  const W=420,H=230,pad=34, lats=g.pts.map(q=>q.c[0]), lngs=g.pts.map(q=>q.c[1]);
  const la0=Math.min(...lats), la1=Math.max(...lats), lo0=Math.min(...lngs), lo1=Math.max(...lngs);
  const kx=Math.cos(((la0+la1)/2)*Math.PI/180), spanX=Math.max(0.5,(lo1-lo0)*kx), spanY=Math.max(0.5,la1-la0);
  const sc=Math.min((W-2*pad)/spanX,(H-2*pad)/spanY), ox=(W-spanX*sc)/2, oy=(H-spanY*sc)/2;
  const X=c=>ox+((c[1]-lo0)*kx)*sc, Y=c=>oy+(la1-c[0])*sc;
  const line=g.pts.map(q=>X(q.c).toFixed(1)+','+Y(q.c).toFixed(1)).join(' ');
  const dots=g.pts.map((q,i)=>{ const x=X(q.c), y=Y(q.c), end=i===0||i===g.pts.length-1, right=x<W-90;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${end?5.5:3.5}" fill="${end?'#222':'#fff'}" stroke="#222" stroke-width="2"/><text x="${(x+(right?9:-9)).toFixed(1)}" y="${(y+4).toFixed(1)}" font-size="11" text-anchor="${right?'start':'end'}" fill="#222">${esc(q.n)}</text>`; }).join('');
  const px=X(g.c), py=Y(g.c);
  return `<svg class="gpsmap" viewBox="0 0 ${W} ${H}" role="img" aria-label="Mapa del recorrido con la posición GPS"><rect width="${W}" height="${H}" fill="#f4f1e8" stroke="#222" stroke-width="2"/>
   <polyline points="${line}" fill="none" stroke="#999" stroke-width="3" stroke-dasharray="6 5"/>${dots}
   <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="13" fill="#f2c200" fill-opacity=".35"><animate attributeName="r" values="9;17;9" dur="2s" repeatCount="indefinite"/></circle>
   <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="6" fill="#d12" stroke="#fff" stroke-width="2"/></svg>`;
}
/* tarjeta de ubicación GPS (reporte interno y portal) */
function gpsCardHTML(v,t){
  const g=gpsEstado(v,t), pct=Math.round(g.f*100);
  return `<div class="gpscard"><div class="gpshead"><b>📍 Ubicación GPS</b> <span class="pill ${g.estado==='En ruta'?'ok':'mute'}">${g.estado.toUpperCase()}</span></div>
   ${mapaGPS(g)}
   <div class="gpsgrid"><span>Posición</span><b>${esc(g.cerca)}</b><span>Coordenadas</span><b>${g.lat.toFixed(4)}, ${g.lng.toFixed(4)}</b>
   <span>Recorrido</span><b>${g.kmRec} de ${g.kmTot} km (${pct} %)</b><span>Velocidad</span><b>${g.vel} km/h</b>
   <span>Equipo / placa</span><b>${esc(g.gps)} · ${esc(g.placa)}</b><span>Última señal</span><b>${hhmm(g.ultima)}</b></div>
   <div class="gpsbar"><i style="width:${pct}%"></i></div></div>`;
}

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
  const gpsReq = reglaActiva('REG-08');
  const veh = DB.vehiculos.find(v=>(!rig||v.tipo===prod.tv) && v.estado==='OK' && !ocupV.includes(v.id) && (!gpsReq||v.gps));
  if(!veh) return {error:'No hay un vehículo tipo '+nomTV(prod.tv)+' con GPS disponible el '+dmy(fecha)+' (en uso, en mantenimiento o sin equipo GPS).'};
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
    if(express && esp.n>cap.n){ ok=false; motivo='La carga ocupa '+n2(esp.m3)+' m³ ('+esp.n+' ticket(s)) y el contenedor de este viaje tiene solo '+cap.n+' m³.'; return { ok, libre, cap, need, uso, motivo, express }; }
    if(!okN && !okKg) motivo='Espacio insuficiente en tickets y en peso por eje: solicitas '+need+' ticket(s) / '+n2(esp.kg)+' kg y quedan '+libre.n+' / '+n2(libre.kg)+' kg.';
    else if(!okN) motivo='Espacio insuficiente: solicitas '+need+' ticket(s) ('+n2(esp.m3)+' m³) y solo quedan '+libre.n+' ticket(s).';
    else if(!okKg) motivo='Peso por eje insuficiente: solicitas '+n2(esp.kg)+' kg y este vehículo ('+(tvDe(by(DB.vehiculos,viaje.veh).tipo)||{}).ejes+' ejes × '+n2(pesoEje())+' kg) solo admite '+n2(libre.kg)+' kg más. Con ese peso se necesitan al menos '+Math.ceil((uso.kg+esp.kg)/pesoEje())+' ejes.';
    ok = !reglaActiva('REG-01') || (okN && okKg);
    if(!ok){}
  }
  return { ok, libre, cap, need, uso, motivo, express };
}

/* ---------- tickets iniciales ---------- */
(function seedTickets(){
  const D = s => new Date('2026-06-24T'+s+':00');
  const DIM = {'CG-001':[100,50,100,60],'CG-002':[100,100,100,80],'CG-003':[150,100,100,350],'CG-004':[200,100,100,500],'CG-005':[100,80,50,120],'CG-006':[50,40,25,8],'CG-007':[50,40,25,25]};   // largo, ancho, alto (cm), peso (kg) por bulto
  const mk = (id,viaje,cli,cg,uds,estado,paso,creado,hist,extra)=>{
    const v = by(DB.viajes,viaje), p = by(DB.productos,v.prod), tar = tarifaDe(p,v.alcance), dm = DIM[cg], e = espacioDe({cant:uds,largo:dm[0],ancho:dm[1],alto:dm[2],peso:dm[3]});
    const n = esExpress(p) ? viajeCap(v).n : e.n, pr = estimarPrecio(tar,n);
    const t = {id,viaje,cliente:cli,tb:cg,unidades:uds,dim:{l:dm[0],a:dm[1],h:dm[2],p:dm[3]},n,m3:e.m3,kg:e.kg,tarifa:tar.id,sub:pr.sub,igv:pr.igv,total:pr.total,estado,paso,creado,hist:hist||[],
      medio:null,op:null};
    DB.ordenes++; t.op='OP-'+pad(DB.ordenes,6);
    if(estado!=='RESERVADO'&&estado!=='VENCIDO'){ t.medio='tarjeta'; t.pagado=creado; }
    DB.tickets.push(t);
  };
  mk('TK-88101','VJ-0001','70112233','CG-001',10,'EN RUTA',3,D('06:20'),[{paso:1,real:D('06:58'),por:'Autómata de carga'},{paso:2,real:D('08:02'),por:'GPS de la unidad'},{paso:3,real:D('10:12'),por:'GPS de la unidad'}]);
  mk('TK-88102','VJ-0001','20601234567','CG-001',48,'EN RUTA',3,D('06:25'),[{paso:1,real:D('06:59'),por:'Autómata de carga'},{paso:2,real:D('08:02'),por:'GPS de la unidad'},{paso:3,real:D('10:12'),por:'GPS de la unidad'}]);
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
