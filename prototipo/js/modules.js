/* ============================================================
   MÓDULOS GERENCIAL Y OPERATIVO
   ============================================================ */
let AHORA = new Date(HOY);                         // reloj simulado (el batch puede avanzarlo)
const route = (key,def) => { ROUTES[key]=def; };
const activos = (tabla,lab) => () => DB[tabla].filter(x=>x.activo!==false).map(x=>[x.id,lab(x)]);
const todos   = (tabla,lab) => () => DB[tabla].map(x=>[x.id,lab(x)]);
const nomCG = id => { const x=by(DB.cargas,id); return x?x.material:id; };
const nomAL = id => { const x=by(DB.alcances,id); return x?x.origen+' → '+x.destino:id; };
const horTxt = h => 'Sale '+h.diaSalida+' '+h2(h.hSalida);
const h2 = h12;
const vehDe = v => by(DB.vehiculos,v.veh);
const estOpts = () => [['OK','OK'],['MANTENIMIENTO','MANTENIMIENTO']];
const tiposContenedor = () => [...new Set(DB.contenedores.map(c=>c.tipo))];

/* ---------------------------------------------------------------- SEGURIDAD / LOGIN */
route('login',{title:'',view(){
  const cuentas=[...DB.usuarios.map(u=>[u.dni,u.clave,u.nombre,ROLES[u.rol].label]),...DB.clientes.slice(0,2).map(c=>[c.id,c.clave,c.nombre,'Cliente (portal)'])]
    .map(([d,p,n,r])=>`<a class="rolecard acc" href="javascript:void(0)" data-act="lg-fill" data-dni="${d}" data-pw="${p}"><b>${esc(n)}</b><small>${r} · ${d}</small></a>`).join('');
  return `<div class="login"><div class="win"><div class="bar-w"><span class="dots">● ● ●</span><span class="url">https://www.transporteexpress.com.pe/login</span></div>
   <div class="win-b"><h2 class="c">Bienvenido a Transporte Seguro</h2>
   <div class="lgrid"><div><div class="logo">🚚 LOGO</div>
     <form data-submit="login" id="lgform"><label class="fld ${UI.loginErr?'err':''}"><span>DNI o RUC</span><input id="lg-dni" name="dni" value="${esc(UI.loginDni||'')}" autocomplete="off"></label>
     <label class="fld ${UI.loginErr?'err':''}"><span>Contraseña</span><input id="lg-pw" name="pw" type="password">${UI.loginErr?`<em>✖ ${esc(UI.loginErr)}</em>`:''}</label>
     <label class="chk"><input type="checkbox" data-change="show-pw"> Mostrar contraseña</label>
     <button class="btn okb big">Iniciar sesión</button> <a class="lnk" href="#/registro">Crear cuenta de cliente</a></form>
     <div class="rolebox"><b>Cuentas de demostración</b> <small>(clic para autocompletar; clave 123456)</small>${cuentas}</div></div>
    <div class="sep"></div>
    <div class="qrbox"><b>Ingresa por QR</b><div class="qr" data-act="login-qr" title="Simular escaneo"></div><small>Autenticación adicional: escanee el QR desde la app móvil. Escriba primero su DNI y haga clic en el código para simular el escaneo.</small></div></div>
   </div></div></div>`; }});
const HOME = {demo:'parametros',gerente:'parametros',supervisor:'disponibilidad',admin:'batch-bd',cliente:'p-catalogo'};
function autenticar(dni,pw,porQR){
  dni=String(dni||'').trim(); if(!dni) return {error:'Ingrese su DNI o RUC.'};
  const u=DB.usuarios.find(x=>x.dni===dni), c=DB.clientes.find(x=>x.id===dni), cuenta=u||c;
  if(!cuenta) return {error:'No existe una cuenta con ese DNI o RUC. Puede crearla como cliente.'};
  if(!porQR && !pw) return {error:'Ingrese su contraseña.'};
  if(!porQR && cuenta.clave!==pw) return {error:'Contraseña incorrecta.'};
  return u?{role:u.rol,nombre:u.nombre}:{role:'cliente',cliente:c,nombre:c.nombre};
}
function iniciarSesion(r,via){
  SESSION.role=r.role; if(r.cliente) PCLI=r.cliente.id; UI.pd=null; UI.draft=null; UI.loginErr=''; UI.loginDni='';
  toast('✔ Sesión iniciada: <b>'+esc(r.nombre)+'</b> ('+ROLES[r.role].label+')'+(via?' · verificado por QR':'')); go(HOME[r.role]); }
ACT['login']=f=>{ const fd=new FormData(f); UI.loginDni=String(fd.get('dni')||'').trim(); const r=autenticar(UI.loginDni,fd.get('pw'),false);
  if(r.error){ UI.loginErr=r.error; render(); return; } iniciarSesion(r,false); };
ACT['login-qr']=()=>{ const dni=$('#lg-dni').value; const r=autenticar(dni,'',true); if(r.error){ UI.loginDni=dni; UI.loginErr=r.error; render(); return; } iniciarSesion(r,true); };
ACT['lg-fill']=el=>{ $('#lg-dni').value=el.dataset.dni; $('#lg-pw').value=el.dataset.pw; UI.loginErr=''; };
ACT['show-pw']=el=>{ $('#lg-pw').type=el.checked?'text':'password'; };

/* registro propio del cliente (autoservicio) */
UI.reg={vals:{},errs:{}};
route('registro',{title:'',view(){
  const v=UI.reg.vals, e=UI.reg.errs;
  const F=(k,label,ph,type='text')=>`<label class="fld ${e[k]?'err':''}"><span>${label}</span><input name="${k}" type="${type}" value="${type==='password'?'':esc(v[k]||'')}" placeholder="${ph||''}" autocomplete="off">${e[k]?`<em>✖ ${esc(e[k])}</em>`:''}</label>`;
  return `<div class="login"><div class="win"><div class="bar-w"><span class="dots">● ● ●</span><span class="url">https://www.transporteexpress.com.pe/registro</span></div>
   <div class="win-b"><h2 class="c">Crear cuenta de cliente</h2>
   <form data-submit="reg-save"><div class="fgrid">${F('id','DNI (8 dígitos) o RUC (11)','70112233')}
    <label class="fld ${e.tipo?'err':''}"><span>Tipo</span><select name="tipo">${optsHTML([['Persona','Persona'],['Empresa','Empresa']],v.tipo||'',true)}</select>${e.tipo?`<em>✖ ${esc(e.tipo)}</em>`:''}</label>
    ${F('nombre','Nombre o razón social')}${F('tel','Teléfono','987 654 321')}${F('email','Correo','nombre@correo.com')}${F('clave','Contraseña (mínimo 6)','','password')}${F('clave2','Repetir contraseña','','password')}</div>
    <div class="nav"><a class="btn" href="#/login">← Volver</a><button class="btn okb big">Crear cuenta e ingresar</button></div></form>
   </div></div></div>`; }});
ACT['reg-save']=f=>{ const fd=new FormData(f), v={}; ['id','tipo','nombre','tel','email','clave','clave2'].forEach(k=>v[k]=String(fd.get(k)||'').trim());
  const e={}; if(!/^\d{8}$|^\d{11}$/.test(v.id)) e.id='El DNI tiene 8 dígitos y el RUC 11'; else if(DB.clientes.some(c=>c.id===v.id)||DB.usuarios.some(u=>u.dni===v.id)) e.id='Ya existe una cuenta con ese documento';
  if(!v.tipo) e.tipo='Seleccione el tipo'; else if(!e.id){ if(v.id.length===8&&v.tipo!=='Persona') e.tipo='Un DNI corresponde a una persona'; if(v.id.length===11&&v.tipo!=='Empresa') e.tipo='Un RUC corresponde a una empresa'; }
  if(!v.nombre) e.nombre='Campo obligatorio'; if(!v.tel) e.tel='Campo obligatorio'; if(!/^\S+@\S+\.\S+$/.test(v.email)) e.email='Correo no válido';
  if(v.clave.length<6) e.clave='Mínimo 6 caracteres'; else if(v.clave!==v.clave2) e.clave2='Las contraseñas no coinciden';
  UI.reg={vals:v,errs:e}; if(Object.keys(e).length){ render(); return; }
  const c={id:v.id,clave:v.clave,nombre:v.nombre,tipo:v.tipo,tel:v.tel,email:v.email}; DB.clientes.push(c); UI.reg={vals:{},errs:{}};
  toast('✔ Cuenta creada'); iniciarSesion({role:'cliente',cliente:c,nombre:c.nombre},false); };


route('seguridad',{title:'Acceso y perfiles',crumb:'Seguridad',view(){
  const mods=['Parámetros y catálogos','Consulta de indicadores','Data-entry (lo usa el cliente en el portal)','Reportes','Procesos batch','Backup y restauración'];
  const M={gerente:[1,1,0,1,0,0],supervisor:[0,0,0,1,0,0],admin:[0,0,0,0,1,1],cliente:[0,0,0,0,0,0],demo:[1,1,1,1,1,1]};
  const rows=Object.keys(ROLES).map(k=>`<tr class="${SESSION.role===k?'sel':''}"><td><b>${ROLES[k].label}</b><br><small>${ROLES[k].desc}</small></td>${M[k].map(x=>`<td class="c">${x?'✔':'—'}</td>`).join('')}</tr>`).join('');
  return guide(['Ingresa con DNI y contraseña, o escaneando un QR (segundo método de autenticación).','El perfil define qué módulos aparecen en el menú de la izquierda.','El Cliente solo ve el portal web (catálogo, cotización, pago y seguimiento).','Cambie de perfil desde la parte superior para ver cada vista.'],0)+
   `<table class="tbl"><thead><tr><th>Perfil</th>${mods.map(m=>`<th>${m}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>
    ${msg('info','Sesión actual: <b>'+ROLES[SESSION.role].label+'</b>. El portal del cliente está siempre disponible desde el enlace superior.')}`; }});

/* ---------------------------------------------------------------- PARÁMETROS GENERALES */
function estadoCarga(id){
  const ts = DB.tickets.filter(t=>t.tb===id);
  if(ts.some(t=>t.estado==='EN RUTA')) return 'EN RUTA';
  if(ts.some(t=>['ENTREGADO','CERRADO'].includes(t.estado))) return 'ENTREGADO';
  return '—';
}
const ESTADO_UNIDAD = {label:'Estado', f:r=>pill(r.estado)};
const PARAM_CFG = {
  veh:{key:'veh',tabla:'vehiculos',label:'Vehículo',prefix:'r-veh-',padLen:3,canDisable:true,
    cols:[{label:'Código',k:'id'},{label:'Placa',k:'placa'},{label:'Tipo',k:'tipo'},{label:'Ejes',k:'ejes'},{label:'Carga máx.',f:r=>n2(r.cargaMax)+' kg'},{label:'Consumo',f:r=>r.consumo+' L/100km'},ESTADO_UNIDAD],
    fields:[{k:'placa',label:'Placa',type:'text',req:1,ph:'ABC123'},{k:'tipo',label:'Tipo',type:'select',opts:()=>TIPOS_VEHICULO.map(x=>[x,x]),req:1},{k:'ejes',label:'N° de ejes',type:'number',req:1,min:1},{k:'cargaMax',label:'Carga máxima (kg)',type:'number',req:1,min:1},{k:'consumo',label:'Consumo (L/100 km)',type:'number',req:1,min:1},{k:'estado',label:'Estado',type:'select',opts:estOpts,req:1,def:'OK'}],
    validate:(v,row)=>{ const e={}; if(v.placa&&!/^[A-Za-z0-9]{6}$/.test(v.placa)) e.placa='La placa tiene 6 caracteres alfanuméricos'; else if(DB.vehiculos.some(x=>x!==row&&x.placa.toUpperCase()===String(v.placa).toUpperCase())) e.placa='La placa '+v.placa+' ya está registrada'; return e; },
    onSave:r=>{ r.placa=String(r.placa).toUpperCase(); },
    used:r=>DB.viajes.filter(v=>v.veh===r.id).map(v=>'Viaje '+v.id)},
  car:{key:'car',tabla:'cargas',label:'Tipo de carga',prefix:'CG-',padLen:3,canDisable:false,
    cols:[{label:'Código',k:'id'},{label:'Material',k:'material'},{label:'Volumen',f:r=>r.volumen+' m³'},{label:'Peso',f:r=>r.peso+' kg'},{label:'Temperatura',k:'temp'},{label:'Estado',f:r=>{const e=estadoCarga(r.id);return e==='—'?'<span class="pill mute">SIN ENVÍOS</span>':pill(e)}}],
    fields:[{k:'material',label:'Material',type:'text',req:1},{k:'volumen',label:'Volumen por unidad (m³)',type:'number',step:'0.01',req:1,min:0.01,help:'Cada 1 m³ ocupado equivale a 1 ticket.'},{k:'peso',label:'Peso por unidad (kg)',type:'number',step:'0.01',req:1,min:0.01},{k:'temp',label:'Temperatura de transporte',type:'text',req:1,ph:'Ej. 2 a 8 °C'}],
    lock:r=>{ const t=DB.tickets.find(x=>x.tb===r.id&&x.estado==='EN RUTA'); return t?'No se puede modificar este tipo de carga mientras tenga envíos EN RUTA ('+t.id+'). Solo se edita cuando no hay carga en ruta.':''; },
    used:r=>[...DB.productos.filter(p=>p.tb===r.id).map(p=>'Producto '+p.id),...DB.compat.filter(c=>c.tb===r.id).map(c=>'Compatibilidad '+c.id),...DB.tickets.filter(t=>t.tb===r.id).map(t=>'Ticket '+t.id)]},
  con:{key:'con',tabla:'contenedores',label:'Contenedor',prefix:'r-cont-',padLen:3,canDisable:true,
    cols:[{label:'Código',k:'id'},{label:'Tipo',k:'tipo'},{label:'Material',k:'material'},{label:'N° máx. tickets',k:'tickets'},{label:'Carga máx.',f:r=>n2(r.cargaMax)+' kg'},{label:'Temperatura',k:'temp'},ESTADO_UNIDAD],
    fields:[{k:'tipo',label:'Tipo de contenedor',type:'text',req:1,ph:'Freezer'},{k:'material',label:'Material',type:'text',req:1,ph:'MC-1'},{k:'tickets',label:'N° máx. de tickets (1 ticket = 1 m³)',type:'number',req:1,min:1},{k:'cargaMax',label:'Carga máxima (kg)',type:'number',req:1,min:1},{k:'temp',label:'Rango de temperatura',type:'text',req:1},{k:'estado',label:'Estado',type:'select',opts:estOpts,req:1,def:'OK'}],
    validate:v=>{ const mx=Math.max(...DB.vehiculos.map(t=>t.cargaMax)); return v.cargaMax>mx?{cargaMax:'La carga máx. no puede superar la del vehículo más grande ('+n2(mx)+' kg)'}:{}; },
    used:r=>DB.viajes.filter(v=>v.cont===r.id).map(v=>'Viaje '+v.id)},
  al:{key:'al',tabla:'alcances',label:'Alcance',prefix:'AL-',padLen:3,canDisable:false,
    cols:[{label:'Código',k:'id'},{label:'Origen',k:'origen'},{label:'Destino',k:'destino'},{label:'Tipo de vía',k:'via'},{label:'Paradas',k:'paradas'},{label:'Distancia',f:r=>r.km?n2(r.km)+' km':'—'},{label:'Duración',f:r=>r.horas?r.horas+' h':'—'}],
    fields:[{k:'origen',label:'Origen (provincia)',type:'text',req:1},{k:'destino',label:'Destino (provincia)',type:'text',req:1},{k:'via',label:'Tipo de vía',type:'select',opts:()=>['Asfaltada','Asfalt./Trocha','Fluvial','Mixta'].map(x=>[x,x]),req:1},{k:'paradas',label:'Paradas intermedias',type:'text',ph:'Huacho, Trujillo'},{k:'km',label:'Distancia (km)',type:'number',req:1,min:1},{k:'horas',label:'Duración (h)',type:'number',req:1,min:1,help:'De aquí salen las horas esperadas de cada paso del seguimiento.'}],
    validate:v=>v.origen&&v.destino&&v.origen.toLowerCase()===v.destino.toLowerCase()?{destino:'El destino no puede ser igual al origen'}:{},
    used:r=>DB.viajes.filter(v=>v.alcance===r.id).map(v=>'Viaje '+v.id)},
  hor:{key:'hor',tabla:'horarios',label:'Horario',prefix:'HOR-',padLen:3,canDisable:false,
    cols:[{label:'Código',k:'id'},{label:'Día salida',k:'diaSalida'},{label:'Hora salida',f:r=>h2(r.hSalida)}],
    fields:[{k:'diaSalida',label:'Día de salida',type:'select',opts:()=>DIAS.map(d=>[d,d]),req:1},{k:'hSalida',label:'Hora de salida',type:'time',req:1}],
    validate:(v,row)=>{ const e={}; const dup=DB.horarios.find(h=>h!==row&&h.diaSalida===v.diaSalida&&h.hSalida===v.hSalida); if(dup) e.hSalida='Ya existe un horario '+v.diaSalida+' '+h2(v.hSalida)+' ('+dup.id+')'; return e; },
    used:r=>DB.productos.filter(p=>p.th===r.id).map(p=>'Producto '+p.id)},
  ser:{key:'ser',tabla:'servicios',label:'Tipo de servicio',prefix:'SER-',padLen:3,canDisable:false,
    cols:[{label:'Código',k:'id'},{label:'Servicio',k:'nombre'},{label:'Modalidad',k:'modalidad'},{label:'Base de cobro',f:r=>BASE_TXT[r.base]}],
    fields:[{k:'nombre',label:'Servicio',type:'text',req:1,ph:'Perecible económico'},{k:'modalidad',label:'Modalidad',type:'select',opts:()=>[['Económico','Económico'],['Express','Express']],req:1},{k:'base',label:'Base de cobro',type:'select',opts:()=>Object.entries(BASE_TXT),req:1,help:'Económico se cobra por espacio comprometido; Express es tarifa fija y exclusivo de una sola carga.'}],
    validate:v=>{ const e={}; if(v.modalidad==='Express'&&v.base&&v.base!=='fija') e.base='Express usa tarifa fija (reserva exclusiva del contenedor)'; if(v.modalidad==='Económico'&&v.base==='fija') e.base='Económico se cobra por espacio comprometido'; return e; },
    used:r=>DB.productos.filter(p=>p.ts===r.id).map(p=>'Producto '+p.id)},
  aut:{key:'aut',tabla:'automatas',label:'Autómata',prefix:'AUT-',padLen:3,canDisable:true,
    cols:[{label:'Código',k:'id'},{label:'Nombre',k:'nombre'},{label:'Rol',k:'rol'},ESTADO_UNIDAD],
    fields:[{k:'nombre',label:'Nombre',type:'text',req:1},{k:'rol',label:'Rol',type:'select',opts:()=>[['Brazo Robótico','Brazo Robótico']],req:1,def:'Brazo Robótico'},{k:'estado',label:'Estado',type:'select',opts:estOpts,req:1,def:'OK'}],
    used:r=>[]}
};
const PARAM_TABS = [['veh','Tipo de vehículo'],['car','Tipo de carga'],['con','Tipo de contenedor'],['al','Alcance'],['hor','Horario'],['ser','Tipo de servicio'],['aut','Autómata']];
const INFO = {
  con:'Un ticket equivale a ocupar el espacio mínimo de 1 m³ dentro de un contenedor. Por eso el “N° máx. de tickets” es igual a los m³ del contenedor.',
  car:'El estado indica si hay envíos de este tipo de carga EN RUTA o ya ENTREGADOS. Mientras haya carga en ruta, el registro no se puede editar ni eliminar.',
  ser:'Económico: se cobra por espacio comprometido (tickets). Express: tarifa fija por la reserva exclusiva de todo el contenedor; es exclusivo de una sola carga, cualquiera sea su tipo.',
  hor:'El horario define solo la salida (día y hora). La llegada estimada se calcula sumando la duración del Alcance elegido, así no hay dos fuentes que se contradigan.',
  al:'La duración del alcance se usa para calcular la hora esperada de cada paso del seguimiento, sin depender de un GPS.'
};
route('parametros',{title:'Parámetros generales',crumb:'2.1 Gerencial › 2.1.1 Mantenimiento de parámetros',view(arg){
  const key = PARAM_CFG[arg]?arg:'veh', cfg = PARAM_CFG[key];
  const tabs = PARAM_TABS.map(([k,l])=>`<a class="tab ${k===key?'on':''}" href="#/parametros/${k}">${l}</a>`).join('');
  return guide(['Elija el parámetro en las pestañas.','<b>Agregar</b>: se abre el formulario vacío; el código se completa solo.','Al <b>Guardar</b> el sistema valida; si algo está mal marca el campo y explica el motivo.','<b>Editar</b> exige seleccionar una fila; <b>Eliminar</b> pide confirmación.','Si el registro ya lo usan viajes o productos, no se elimina: se propone <b>deshabilitarlo</b> (unidades) o se indica qué lo usa.'],0)+
   msg('info','<b>Definición:</b> los parámetros son variables que se mantienen fijas para definir el producto. Las <b>tarifas</b> y el <b>seguimiento</b> no se mantienen aquí: son reportes (2.2.2).')+
   `<div class="tabs">${tabs}</div><div class="tabbody">${INFO[key]?`<div class="infoline">${info(INFO[key])}</div>`:''}${crudView(cfg)}</div>`; }});

/* ---------------------------------------------------------------- CATÁLOGOS */
const PROD_CFG = {key:'prod',tabla:'productos',label:'Producto',prefix:'PROD',canDisable:true,
  intro:'<b>Naturaleza del producto:</b> cada fila combina parámetros ya definidos. El origen y el destino no forman parte del producto: se eligen al asignar el ticket (Alcance). La tarifa sale del <a href="#/rtarifas">Reporte de tarifas</a>.',
  cols:[{label:'Tipo de producto',k:'id'},{label:'Tipo de vehículo',k:'tv'},{label:'Tipo de carga',f:r=>esc(nomCG(r.tb))},{label:'Horario',f:r=>esc(r.th)},{label:'Protocolo',f:r=>esc(r.prot)},{label:'Tipo de servicio',f:r=>esc((servicioDe(r)||{}).nombre||r.ts)},{label:'Tarifa',f:r=>{const t=tarifaDe(r);return t?esc(t.id):'—'}},COL_ESTADO],
  fields:[{k:'tv',label:'Tipo de vehículo',type:'select',opts:()=>TIPOS_VEHICULO.map(x=>[x,x]),req:1},{k:'tb',label:'Tipo de carga',type:'select',opts:todos('cargas',x=>x.material),req:1},{k:'th',label:'Horario',type:'select',opts:todos('horarios',horTxt),req:1},{k:'prot',label:'Protocolo',type:'select',opts:activos('protocolos',x=>x.nombre),req:1},{k:'ts',label:'Tipo de servicio',type:'select',opts:todos('servicios',x=>x.nombre+' ('+x.modalidad+')'),req:1},{k:'activo',label:'Estado',type:'estado',help:'ACTIVO exige compatibilidad y una tarifa vigente en el reporte.'}],
  validate:(v,row)=>{ const e={};
    const dup=DB.productos.find(p=>p!==row&&p.tv===v.tv&&p.tb===v.tb&&p.th===v.th&&p.ts===v.ts&&v.tv&&v.tb&&v.th&&v.ts); if(dup) e.tv='Ya existe un producto con esta combinación ('+dup.id+')';
    if(v.activo){ if(v.tv&&v.tb&&!DB.compat.some(c=>c.ok&&c.tb===v.tb&&c.tv===v.tv)) e.tb='No hay compatibilidad registrada entre este tipo de carga y este vehículo (Catálogo de compatibilidad)';
      const tar=row?tarifaDe(row):null; const s=by(DB.servicios,v.ts);
      if(!tar||!tarifaVigente(tar)) e.activo='Un producto ACTIVO necesita una tarifa vigente (revise el Reporte de tarifas)';
      else if(s&&tar.modalidad!==s.modalidad) e.ts='La tarifa del producto es '+tar.modalidad+' y el tipo de servicio es '+s.modalidad; }
    return e; },
  used:r=>[...DB.viajes.filter(v=>v.prod===r.id).map(v=>'Viaje '+v.id)]};
route('productos',{title:'Catálogo de productos',crumb:'2.1 Gerencial › 2.1.1 Mantenimiento de parámetros',view(){
  return guide(['Los productos se arman combinando parámetros (no se escriben libremente).','No puede repetirse la misma combinación.','Un producto ACTIVO exige compatibilidad entre carga y vehículo, y una tarifa vigente (ver el reporte de tarifas).','Solo los productos ACTIVOS aparecen al asignar un ticket y en el catálogo web del cliente.'],0)+
   `<div class="nat"><span class="natt">Naturaleza del producto</span>${crudView(PROD_CFG)}</div>`; }});

const REGLA_CFG={key:'reg',tabla:'reglas',label:'Regla',prefix:'REG-',canDisable:false,
  intro:'Cada regla <b>activa</b> se aplica de verdad en el prototipo. Pruebe: desactive REG-04 y asigne un ticket en una fecha que no sea el día de salida; o desactive REG-06 para ver cómo se comporta el servicio Express.',
  cols:[{label:'Regla',k:'id'},{label:'Nombre',k:'nombre'},{label:'Descripción',k:'descripcion'},{label:'Acción',k:'accion'},COL_ESTADO],
  fields:[{k:'nombre',label:'Nombre',type:'text',req:1},{k:'descripcion',label:'Descripción',type:'textarea',req:1},{k:'accion',label:'Acción si no se cumple',type:'text',req:1},{k:'activo',label:'Estado',type:'estado'}],
  used:r=>['Regla aplicada por el sistema: solo puede deshabilitarse (Editar → Estado)']};
route('reglas',{title:'Catálogo de reglas',crumb:'2.1 Gerencial › 2.1.1 Mantenimiento de parámetros',view(){
  return guide(['Las reglas del negocio viven aquí, no en el código.','REG-06: el servicio Express es exclusivo de una sola carga, cualquiera sea su tipo.','Active o desactive una regla con Editar → Estado.'],0)+crudView(REGLA_CFG); }});

const POL_CFG={key:'pol',tabla:'politicas',label:'Política',prefix:'POL-',canDisable:false,
  cols:[{label:'Política',k:'id'},{label:'Nombre',k:'nombre'},{label:'Descripción',k:'descripcion'},{label:'Valor',k:'valor'},COL_ESTADO],
  fields:[{k:'nombre',label:'Nombre',type:'text',req:1},{k:'descripcion',label:'Descripción',type:'textarea',req:1},{k:'valor',label:'Valor',type:'text',req:1},{k:'activo',label:'Estado',type:'estado'}],
  used:r=>['POL-01','POL-02','POL-04'].includes(r.id)?['Usada por la estimación del precio, la reserva o el seguimiento']:[]};
route('politicas',{title:'Catálogo de políticas',crumb:'2.1 Gerencial › 2.1.1 Mantenimiento de parámetros',view(){
  return guide(['Las políticas guardan valores de negocio (IGV, minutos de reserva, cancelación, tolerancia entre pasos).','Cambie el valor de POL-01 (IGV) y vea cómo cambia la estimación del precio.'],0)+crudView(POL_CFG); }});

const PROT_CFG={key:'prot',tabla:'protocolos',label:'Protocolo',prefix:'PROT-',canDisable:true,
  cols:[{label:'Protocolo',k:'id'},{label:'Nombre',k:'nombre'},{label:'Secuencia de eventos',k:'secuencia'},{label:'Condición de activación',k:'activacion'},{label:'Versión',k:'version'},COL_ESTADO],
  fields:[{k:'nombre',label:'Nombre',type:'text',req:1},{k:'secuencia',label:'Secuencia de eventos',type:'textarea',req:1,ph:'Validar → Ruta → Salida → Cierre'},{k:'activacion',label:'Condición de activación',type:'text',req:1},{k:'activo',label:'Estado',type:'estado'}],
  validate:v=>{ const n=(v.secuencia||'').split(/→|->/).filter(s=>s.trim()).length; return v.secuencia&&n<3?{secuencia:'La secuencia debe tener al menos 3 eventos separados por →'}:{}; },
  onSave:(r,edit)=>{ if(edit){ r.version='v'+((+String(r.version).replace('v',''))+1); } else r.version='v1'; },
  used:r=>[...DB.productos.filter(p=>p.prot===r.id).map(p=>'Producto '+p.id),...DB.tiposIncidente.filter(t=>t.protocolo===r.id).map(t=>'Tipo de incidente '+t.id)]};
route('protocolos',{title:'Catálogo de protocolos',crumb:'2.1 Gerencial › 2.1.1 Mantenimiento de parámetros',view(){
  return guide(['Un protocolo es la secuencia de eventos de un producto o de un incidente.','Cada cambio genera una versión nueva (v1 → v2 …).','Un protocolo en uso no se elimina: se deshabilita y se crea una versión nueva.'],0)+crudView(PROT_CFG); }});

const COMPAT_CFG={key:'cp',tabla:'compat',label:'Compatibilidad',prefix:'CP-',padLen:3,canDisable:false,
  cols:[{label:'Código',k:'id'},{label:'Tipo de carga',f:r=>esc(nomCG(r.tb))},{label:'Contenedor',k:'tc'},{label:'Vehículo',k:'tv'},{label:'Compatible',f:r=>pill(r.ok?'Sí':'No')},{label:'Observación',k:'obs'}],
  fields:[{k:'tb',label:'Tipo de carga',type:'select',opts:todos('cargas',x=>x.material),req:1},{k:'tc',label:'Tipo de contenedor',type:'select',opts:()=>tiposContenedor().map(x=>[x,x]),req:1},{k:'tv',label:'Tipo de vehículo',type:'select',opts:()=>TIPOS_VEHICULO.map(x=>[x,x]),req:1},{k:'ok',label:'Compatible',type:'bool',def:true},{k:'obs',label:'Observación',type:'text'}],
  validate:(v,row)=>{ const e={}; const d=DB.compat.find(c=>c!==row&&c.tb===v.tb&&c.tc===v.tc&&c.tv===v.tv); if(d) e.tv='Combinación ya registrada ('+d.id+')'; if(v.ok===false&&!v.obs) e.obs='Indique el motivo cuando no es compatible'; return e; },
  used:r=>[]};
route('compat',{title:'Catálogo de compatibilidad',crumb:'2.1 Gerencial › 2.1.1 (módulo de Figma)',view(){
  return guide(['Define qué tipo de carga puede ir en qué contenedor y en qué vehículo.','Al asignar un ticket, el sistema solo propone unidades y contenedores compatibles (REG-03).','Si no es compatible, se exige el motivo.'],0)+crudView(COMPAT_CFG); }});

const TINC_CFG={key:'tinc',tabla:'tiposIncidente',label:'Tipo de incidente',prefix:'INC-',padLen:3,canDisable:true,
  cols:[{label:'Código',k:'id'},{label:'Tipo de incidente',k:'nombre'},{label:'Categoría',k:'categoria'},{label:'Severidad',k:'severidad'},{label:'Protocolo asociado',k:'protocolo'},COL_ESTADO],
  fields:[{k:'nombre',label:'Tipo de incidente',type:'text',req:1},{k:'categoria',label:'Categoría',type:'select',opts:()=>['Operativo','Vehículo','Seguridad'].map(x=>[x,x]),req:1},{k:'severidad',label:'Severidad',type:'select',opts:()=>['Baja','Media','Alta','Crítica'].map(x=>[x,x]),req:1},{k:'protocolo',label:'Protocolo de respuesta',type:'select',opts:activos('protocolos',x=>x.id+' · '+x.nombre),req:1},{k:'activo',label:'Estado',type:'estado'}],
  used:r=>DB.incidentes.filter(i=>i.tipo===r.id).map(i=>'Incidente '+i.id)};
route('tincidentes',{title:'Tipos de incidente',crumb:'2.1 Gerencial › 2.1.1 (módulo de Figma)',view(){
  return guide(['Cada tipo de incidente tiene una severidad y un protocolo de respuesta.','Los incidentes de retraso se generan solos cuando un paso no se confirma dentro de la tolerancia (POL-04).'],0)+crudView(TINC_CFG); }});

/* ---------------------------------------------------------------- DATA-ENTRY: CLIENTES */
const CLI_CFG={key:'cli',tabla:'clientes',label:'Cliente',idEditable:true,idPh:'DNI (8) o RUC (11)',canDisable:false,
  intro:'Antes de asignar un ticket, el cliente debe estar registrado.',
  cols:[{label:'DNI / RUC',k:'id'},{label:'Nombre / Razón social',k:'nombre'},{label:'Tipo',k:'tipo'},{label:'Teléfono',k:'tel'},{label:'Correo',k:'email'},{label:'Tickets',f:r=>DB.tickets.filter(t=>t.cliente===r.id).length}],
  fields:[{k:'nombre',label:'Nombre o razón social',type:'text',req:1},{k:'tipo',label:'Tipo',type:'select',opts:()=>[['Persona','Persona'],['Empresa','Empresa']],req:1},{k:'tel',label:'Teléfono',type:'text',req:1},{k:'email',label:'Correo',type:'text',req:1}],
  validate:(v,row)=>{ const e={}; const id=(v.id||'').trim(); if(id&&!/^\d{8}$|^\d{11}$/.test(id)) e.id='El DNI tiene 8 dígitos y el RUC 11'; else if(id&&v.tipo){ if(id.length===8&&v.tipo!=='Persona') e.tipo='Un DNI corresponde a una persona'; if(id.length===11&&v.tipo!=='Empresa') e.tipo='Un RUC corresponde a una empresa'; }
    if(v.email&&!/^\S+@\S+\.\S+$/.test(v.email)) e.email='Correo no válido'; return e; },
  onSave:(r,edit)=>{ if(!r.clave) r.clave='123456'; },
  used:r=>DB.tickets.filter(t=>t.cliente===r.id).map(t=>'Ticket '+t.id)};
route('clientes',{title:'Registro de cliente',crumb:'2.2 Operativo › 2.2.1 Data-entry',view(){
  return guide(['Presione <b>Agregar</b> e ingrese DNI (8 dígitos) o RUC (11).','El sistema valida el documento, el tipo y el correo.','Al guardar, el cliente queda disponible para asignarle tickets.','Un cliente con tickets no se elimina.'],0)+crudView(CLI_CFG); }});

/* ---------------------------------------------------------------- ASIGNACIÓN DE TICKET (asistente de 6 pasos) */
const T_STEPS = ['Cliente y carga','Servicio y espacio','Estimación del precio','Confirmación del servicio','Medio de pago','Orden de pago'];
const T_CODE = ['','','2.2.1.2.1','2.2.1.2.2','2.2.1.2.3','2.2.1.2.4'];
function newDraft(){ return {cliente:'',tb:'',uds:'',origen:'',destino:'',rutaErr:'',prod:'',alc:'',fecha:'',res:null,ticket:null}; }
const D = () => UI.draft || (UI.draft = newDraft());
const ok1 = d => d.cliente && d.tb && +d.uds>0;
const ok2 = d => d.res && d.res.ok;
function calcRes(d){
  d.res=null; if(!(d.prod&&d.alc&&d.fecha)) return;
  const prod=by(DB.productos,d.prod), alc=by(DB.alcances,d.alc), th=by(DB.horarios,prod.th), esp=espacio(d.tb,+d.uds);
  if(reglaActiva('REG-04') && diaDe(d.fecha)!==th.diaSalida){ d.res={ok:false,error:'REG-04: este producto sale los <b>'+th.diaSalida+'</b> y el '+dmy(d.fecha)+' es '+diaDe(d.fecha).toLowerCase()+'. Elija una de las fechas sugeridas.'}; return; }
  const r=resolverViaje(prod,alc,d.fecha); if(r.error){ d.res={ok:false,error:r.error}; return; }
  const ver=verificarEspacio(r.viaje,esp,prod);
  d.res={ok:ver.ok,viaje:r.viaje,nuevo:r.nuevo,esp,ver,error:ver.ok?'':(ver.motivo.startsWith('REG-')?ver.motivo:'REG-01: '+ver.motivo)};
}
function stepper(cur,d){
  const maxOk = d.ticket?6 : !ok1(d)?1 : !ok2(d)?2 : 4;
  return `<div class="stepper">${T_STEPS.map((s,i)=>{ const n=i+1, cls=n===cur?'cur':n<cur?'done':''; const link=n<=maxOk&&n!==cur&&!(d.ticket&&n<4)?`href="#/ticket/${n}"`:'';
    return `<a class="st ${cls}" ${link}><b>${n}</b> ${s}${T_CODE[i]?`<small>${T_CODE[i]}</small>`:''}</a>`; }).join('')}</div>`; }
const G_TICKET=['<b>Cliente y carga:</b> elija al cliente, la carga y las direcciones; el sistema calcula el espacio (1 ticket = 1 m³) y los kg.','<b>Servicio y espacio:</b> elija producto, ruta y fecha; el sistema busca unidad y contenedor y verifica que quepa en tickets Y en peso, en tiempo real.','<b>Estimación del precio:</b> tarifa del reporte (por ticket o fija) más IGV.','<b>Confirmación:</b> se reserva el espacio y se genera el ticket (queda pendiente de pago).','<b>Medio de pago:</b> tarjeta, PagoEfectivo o banco, con el resumen de la orden.','<b>Orden de pago:</b> se ingresan los datos y se paga; el ticket pasa a PAGADO.'];

route('ticket',{title:'Asignación de ticket',crumb:'2.2 Operativo › 2.2.1 Data-entry › 2.2.1.2 Asignación de ticket',view(arg){
  const d=D(); let step=Math.max(1,Math.min(6,+arg||1));
  if(!d.ticket){ if(step>=5) step=4; if(step>=2&&!ok1(d)) step=1; else if(step>=3&&!ok2(d)) step=2; }
  else if(step<4) step=4;
  UI.tstep=step;
  const body=[t1,t2,t3,t4,t5,t6][step-1](d);
  return guide(G_TICKET,step)+stepper(step,d)+`<div class="card" id="tbody">${body}</div>`; }});

function t1(d){
  const cli=DB.clientes.map(c=>[c.id,c.nombre+' ('+c.id+')']), bienes=DB.cargas.map(b=>[b.id,b.material+' ('+b.volumen+' m³ · '+b.peso+' kg c/u)']);
  const esp=espacio(d.tb,+d.uds);
  return `<h3>1. Cliente y carga</h3>
   <div class="fgrid"><label class="fld"><span>Cliente *</span><select data-change="t1-set" name="cliente">${optsHTML(cli,d.cliente,true)}</select><small>¿No está? <a href="#/clientes">Regístrelo primero (2.2.1.1)</a></small></label>
   <label class="fld"><span>Tipo de carga *</span><select data-change="t1-set" name="tb">${optsHTML(bienes,d.tb,true)}</select></label>
   <label class="fld"><span>Unidades (bultos) *</span><input type="number" min="1" name="uds" value="${esc(d.uds)}" data-on="t1-live" placeholder="Ej. 10"></label>
   </div>
   <div id="t1-esp" class="calc">${espHTML(d,esp)}</div>
   ${d.err1?msg('bad','✖ '+d.err1):''}
   <div class="nav"><span></span><button class="btn okb" data-act="t1-next">Siguiente →</button></div>`;
}
function espHTML(d,esp){ const b=by(DB.cargas,d.tb); if(!b||!(+d.uds>0)) return '<i>Elija el tipo de carga y las unidades para calcular el espacio que comprometerá el ticket.</i>';
  return `<b>Espacio a comprometer</b> = ${d.uds} uds × ${b.volumen} m³ (${b.peso} kg c/u) → 1 ticket = 1 m³ (mínimo 1)<br><span class="big">${esp.n} ticket(s) · ${n2(esp.m3)} m³ · ${n2(esp.kg)} kg</span>`; }
ACT['t1-set']=el=>{ const d=D(); d[el.name]=el.value; if(el.name==='tb'){ d.prod=''; d.res=null; } $('#t1-esp').innerHTML=espHTML(d,espacio(d.tb,+d.uds)); };
ACT['t1-live']=el=>{ const d=D(); d.uds=el.value; $('#t1-esp').innerHTML=espHTML(d,espacio(d.tb,+d.uds)); };
ACT['t1-next']=()=>{ const d=D(), f=$('#tbody'); d.cliente=$('[name=cliente]',f).value; d.tb=$('[name=tb]',f).value; d.uds=$('[name=uds]',f).value;
  d.err1=!d.cliente?'Seleccione un cliente':!d.tb?'Seleccione el tipo de carga':!(+d.uds>0)?'Ingrese las unidades (mayor a 0)':'';
  if(d.err1){ $('#tbody').innerHTML=t1(d); return; } d.res=null; go('ticket/2'); };

const prodsDisponibles = d => DB.productos.filter(p=>p.activo&&p.tb===d.tb&&tarifaVigente(tarifaDe(p)));
function t2(d){
  const prods=prodsDisponibles(d).map(p=>[p.id,p.id+' · '+nombreProducto(p)]);
  const al=by(DB.alcances,d.alc);
  const prod=by(DB.productos,d.prod), th=prod?by(DB.horarios,prod.th):null, esp=espacio(d.tb,+d.uds);
  const chips=th?`<div class="chips">Fechas de salida (${th.diaSalida}): ${proximasFechas(th.diaSalida,4).map(f=>`<button class="chip ${d.fecha===f?'on':''}" data-act="t2-fecha" data-f="${f}">${dmy(f)}</button>`).join('')}</div>`:'';
  return `<h3>2. Servicio y espacio</h3>
   <div class="resumen">Carga: <b>${d.uds} × ${esc(nomCG(d.tb))}</b> → <b>${esp.n} ticket(s) · ${n2(esp.m3)} m³ · ${n2(esp.kg)} kg</b></div>
   <div class="fgrid"><label class="fld"><span>Producto *</span><select data-change="t2-set" name="prod">${optsHTML(prods,d.prod,true)}</select>${prods.length?'':'<em>No hay productos activos con tarifa vigente para este tipo de carga.</em>'}</label>
   <label class="fld"><span>Origen *</span><input name="origen" list="dl-lugares" value="${esc(d.origen)}" data-change="t2-set" placeholder="Ej. Lima"></label>
   <label class="fld"><span>Destino *</span><input name="destino" list="dl-lugares" value="${esc(d.destino)}" data-change="t2-set" placeholder="Ej. Chiclayo"></label><datalist id="dl-lugares">${lugares().map(l=>'<option value="'+esc(l)+'">').join('')}</datalist>
   <label class="fld"><span>Fecha del viaje *</span><input type="date" name="fecha" value="${esc(d.fecha)}" data-change="t2-set" min="2026-06-24"></label></div>${chips}
   ${d.rutaErr?msg('bad','✖ '+d.rutaErr):al?msg('info','Ruta '+esc(al.origen)+' → '+esc(al.destino)+': '+n2(al.km)+' km · '+al.horas+' h · '+esc(al.via)+(al.paradas&&al.paradas!=='—'?' · paradas: '+esc(al.paradas):'')):''}
   <div id="t2-res">${t2res(d)}</div>
   <div class="nav"><a class="btn" href="#/ticket/1">← Atrás</a><button class="btn okb" data-act="t2-next" ${ok2(d)?'':'disabled'}>Siguiente →</button></div>`;
}
function t2res(d){
  if(!d.res) return '<p class="hint">Elija producto, origen, destino y fecha para verificar el espacio disponible en tiempo real.</p>';
  if(!d.res.viaje) return msg('bad','✖ '+d.res.error);
  const v=d.res.viaje, veh=vehDe(v), con=by(DB.contenedores,v.cont), ver=d.res.ver, pl=planViaje(v), p=by(DB.productos,v.prod), i=prodInfo(p), exp=ver.express;
  const fila=(n,unit,cap,uso,sol)=>`<tr><td>${n}</td><td>${n2(cap)} ${unit}</td><td>${n2(uso)} ${unit}</td><td>${n2(sol)} ${unit}</td><td class="${(cap-uso-sol)<0?'neg':''}">${n2(cap-uso-sol)} ${unit}</td><td style="min-width:160px">${bar(Math.min(cap,uso+sol),cap,unit)}</td></tr>`;
  return `<div class="cards2"><div class="mini"><b>Viaje ${esc(v.id)}${d.res.nuevo?' <i>(nuevo)</i>':''}</b><br>Unidad: ${esc(veh.id)} · ${esc(veh.placa)} (${esc(veh.tipo)})<br>Contenedor: ${esc(con.id)} · ${esc(con.tipo)}<br>Salida: ${diaDe(v.fecha)} ${dmy(v.fecha)} ${hhmm(pl.sal)}<br>Llegada estimada: ${hhmm(pl.lle)} <small>(salida + ${pl.horas} h del alcance)</small></div>
   <div class="mini"><b>Servicio y protocolo</b><br>${esc(i.ts.nombre)} · ${esc(i.ts.modalidad)}<br>${esc(i.prot.id)} · ${esc(i.prot.nombre)}<br><small>${esc(i.prot.secuencia)}</small>${exp?'<br><b>Express:</b> reserva exclusiva de todo el contenedor ('+ver.cap.n+' tickets).':''}</div></div>
   <table class="tbl"><thead><tr><th>Dimensión</th><th>Capacidad</th><th>Ya comprometido</th><th>${exp?'Se reservará':'Solicitado'}</th><th>Disponible después</th><th>Ocupación</th></tr></thead><tbody>${fila('Tickets (m³)','tickets',ver.cap.n,ver.uso.n,ver.need)}${fila('Peso','kg',ver.cap.kg,ver.uso.kg,d.res.esp.kg)}</tbody></table>
   ${d.res.ok?msg('ok','✔ El espacio cabe en tickets y en peso. Puede continuar.'):msg('bad','✖ '+d.res.error+' <br><small>El ticket no se genera. Pruebe otra fecha o reduzca las unidades.</small>')}`;
}
ACT['t2-set']=el=>{ const d=D(); d[el.name]=el.value; if(el.name==='prod'){ d.fecha=''; } if(el.name==='origen'||el.name==='destino') syncRuta(d); calcRes(d); $('#tbody').innerHTML=t2(d); };
ACT['t2-fecha']=el=>{ const d=D(); d.fecha=el.dataset.f; calcRes(d); $('#tbody').innerHTML=t2(d); };
ACT['t2-next']=()=>{ if(ok2(D())) go('ticket/3'); };

function t3(d){
  const prod=by(DB.productos,d.prod), tar=tarifaDe(prod), ver=d.res.ver, pr=estimarPrecio(tar,ver.need), esp=d.res.esp;
  return `<h3>3. Estimación del precio del servicio</h3>
   <table class="tbl"><thead><tr><th>Concepto</th><th>Detalle</th><th class="r">Importe</th></tr></thead><tbody>
    <tr><td>Espacio comprometido</td><td>${ver.need} ticket(s) (${n2(esp.m3)} m³ reales) · ${n2(esp.kg)} kg en ${esc(d.res.viaje.cont)} / ${esc(vehDe(d.res.viaje).placa)}, ${dmy(d.fecha)}</td><td class="r">—</td></tr>
    <tr><td>Tarifa aplicada</td><td>${esc(tar.id)} · ${esc(tar.modalidad)} · ${BASE_TXT[tar.base]} · vigente ${dmy(tar.desde)} – ${dmy(tar.hasta)}</td><td class="r">—</td></tr>
    <tr><td>Servicio de transporte</td><td>${pr.detalle}</td><td class="r">${money(pr.sub)}</td></tr>
    <tr><td>IGV</td><td>${pr.igvPct} % (Política POL-01)</td><td class="r">${money(pr.igv)}</td></tr>
    <tr class="tot"><td colspan="2"><b>Total estimado</b></td><td class="r"><b>${money(pr.total)}</b></td></tr></tbody></table>
   <p class="hint">La estimación depende de los datos del <a href="#/rtarifas">Reporte de tarifas</a> y de la política de IGV.</p>
   <div class="nav"><a class="btn" href="#/ticket/2">← Atrás</a><a class="btn okb" href="#/ticket/4">Continuar →</a></div>`;
}

function t4(d){
  if(d.ticket){ const t=d.ticket; return `<h3>4. Servicio confirmado</h3>${msg('ok','✔ Ticket <b>'+t.id+'</b> generado y espacio reservado ('+t.n+' ticket(s)). Estado: '+t.estado)}<div class="nav"><span></span><a class="btn okb" href="#/ticket/5">Ir al medio de pago →</a></div>`; }
  const prod=by(DB.productos,d.prod), tar=tarifaDe(prod), ver=d.res.ver, pr=estimarPrecio(tar,ver.need), v=d.res.viaje, i=prodInfo(prod), seq=secuenciaDe(v);
  return `<h3>4. Confirmación del servicio</h3>
   <div class="cards2"><div class="mini"><b>Resumen</b><br>Cliente: ${esc(by(DB.clientes,d.cliente).nombre)}<br>Carga: ${d.uds} × ${esc(nomCG(d.tb))}<br>Producto: ${esc(prod.id)} · ${esc(nombreProducto(prod))}<br>Ruta: ${esc(nomAL(d.alc))}<br>Viaje: ${dmy(v.fecha)} · ${esc(vehDe(v).placa)} · ${esc(v.cont)}</div>
   <div class="mini"><b>Se comprometerá</b><br><span class="big">${ver.need} ticket(s) · ${n2(d.res.esp.kg)} kg</span><br>Total a pagar: <b>${money(pr.total)}</b><br>Reserva: ${politica('POL-02',15)} min para pagar</div></div>
   <div class="mini wide"><b>Cómo viajará su carga (${esc(i.prot.nombre)})</b><div class="seqchips">${seq.pasos.map(n=>`<span class="sc"><b>${n}</b> ${by(PASOS,n,'n').nombre}<small>${hhmm(esperadoPaso(v,n))}</small></span>`).join('')}</div></div>
   <div class="nav"><a class="btn" href="#/ticket/3">← Atrás</a><button class="btn okb big" data-act="t-confirm">✔ Confirmar servicio y reservar espacio</button></div>`;
}
/* crea el ticket (reserva el espacio) — compartido por el asistente y el portal */
function emitirTicket(d){
  const prod=by(DB.productos,d.prod), alc=by(DB.alcances,d.alc);
  const r=resolverViaje(prod,alc,d.fecha); if(r.error) return {error:r.error};
  const esp=espacio(d.tb,+d.uds), ver=verificarEspacio(r.viaje,esp,prod);      // verificación final en tiempo real
  if(!ver.ok) return {error:ver.motivo+' (otro ticket ocupó el espacio)'};
  if(!by(DB.viajes,r.viaje.id)) DB.viajes.push(r.viaje);
  const tar=tarifaDe(prod), pr=estimarPrecio(tar,ver.need); let n=88103; while(DB.tickets.some(t=>t.id==='TK-'+n)) n++;
  DB.ordenes++;
  const t={id:'TK-'+n,viaje:r.viaje.id,cliente:d.cliente,tb:d.tb,unidades:+d.uds,n:ver.need,m3:esp.m3,kg:esp.kg,origen:alc.origen,destino:alc.destino,tarifa:tar.id,sub:pr.sub,igv:pr.igv,total:pr.total,estado:'RESERVADO',paso:0,creado:new Date(AHORA),hist:[],medio:null,op:'OP-'+pad(DB.ordenes,6)};
  DB.tickets.push(t); return {ticket:t};
}
ACT['t-confirm']=()=>{ const d=D(); const r=emitirTicket(d); if(r.error){ toast('✖ '+r.error,'bad'); calcRes(d); go('ticket/2'); return; }
  d.ticket=r.ticket; toast('✔ Ticket '+d.ticket.id+' generado: espacio reservado'); go('ticket/5'); };
ACT['t-new']=()=>{ UI.draft=newDraft(); go('ticket/1'); render(); };

/* ---- pantallas de pago (compartidas: asistente interno y portal) ---- */
const BRANDS = ['Visa','Mastercard','American Express','Diners Club'];
function ordenResumen(t){
  const v=by(DB.viajes,t.viaje), p=by(DB.productos,v.prod), al=by(DB.alcances,v.alcance), pl=planViaje(v);
  return {v,p,al,pl,html:`Bienes(${t.unidades})<br>Unidad: ${esc(vehDe(v).placa)} (${esc(vehDe(v).tipo)})<br>Descripción: ${esc(nomCG(t.tb))} · ${t.n} ticket(s)<br>Ruta: ${esc(al.origen)}-${esc(al.destino)}<br>Monto final a pagar: <b>${money(t.total)}</b>`}; }
function payMethodHTML(t,ctx){
  if(reservaVencida(t)||t.estado==='VENCIDO') return vencidoHTML(t);
  const o=ordenResumen(t), pl=o.pl;
  const btn=m=>`<button class="mbtn" data-act="pay-select" data-m="${m}" data-t="${t.id}" data-ctx="${ctx}">Seleccionar</button>`;
  return `<div class="payw"><div class="payh"><span>Elige tu medio de pago</span><span class="ccc"><i></i><i></i><i></i></span></div>
   <div class="paycols"><div class="payleft"><b class="sub">Selecciona el medio de Pago</b>
     <div class="mrow"><div><b>Tarjeta de Crédito</b><div class="logos"><span class="lg visa">VISA</span><span class="lg amex">AMERICAN EXPRESS</span><span class="lg mc">●●</span><span class="lg dc">Diners Club</span></div></div>${btn('tarjeta')}</div>
     <div class="mrow"><div><b>Transferencia y depósito en efectivo</b><div class="logos"><span class="lg pe">Pago<br>Efectivo</span></div></div>${btn('pagoefectivo')}</div>
     <div class="mrow"><div><b>Pago en bancos</b><div class="logos"><span class="lg bcp">BCP</span></div></div>${btn('banco')}</div></div>
    <div class="payright"><b class="sub u">RUTA DEL ENVÍO</b><p>Origen: ${esc(o.al.origen)}<br>Destino: ${esc(o.al.destino)}<br><br>${diaDe(v0(t).fecha)} ${dmy(v0(t).fecha)} · salida ${hhmm(pl.sal)} · llegada estimada ${hhmm(pl.lle)}</p>
     <b class="sub u">RESUMEN DE TU ORDEN</b><p>${o.html}</p></div></div>
   <p class="hint">Ticket ${t.id} · reserva vigente hasta las ${hhmm(addMin(t.creado,+politica('POL-02',15)))}</p></div>`; }
const v0 = t => by(DB.viajes,t.viaje);
UI.pm = {}; UI.payErr = {}; UI.payVals = {};
function payFormHTML(t,ctx){
  const m = UI.pm[t.id]||'tarjeta', back = ctx==='p'?'#/p-pago/1/'+t.id:'#/ticket/5';
  if(t.estado==='PAGADO') return payDoneHTML(t,ctx);
  if(reservaVencida(t)||t.estado==='VENCIDO') return vencidoHTML(t);
  if(t.estado==='CANCELADO') return '<div class="paydone"><h3>Ticket cancelado</h3></div>';
  const er=UI.payErr[t.id]||{}, va=UI.payVals[t.id]||{};
  const F=(k,label,ph,extra='')=>`<label class="fld ${er[k]?'err':''}"><span>${label}</span><input name="${k}" value="${esc(va[k]||'')}" placeholder="${ph||''}" ${extra}>${er[k]?`<em>✖ ${esc(er[k])}</em>`:''}</label>`;
  const S=(k,label,list,ph)=>`<label class="fld ${er[k]?'err':''}"><span>${label}</span><select name="${k}">${optsHTML(list,va[k]||'',true)}</select>${er[k]?`<em>✖ ${esc(er[k])}</em>`:''}</label>`;
  let left;
  if(m==='tarjeta') left=`<form data-submit="pay-submit" data-t="${t.id}" data-ctx="${ctx}" id="payform"><div class="pbl"><h4>1. Datos de la Tarjeta</h4><div class="fgrid">${S('marca','Marca:',BRANDS.map(b=>[b,b]))}${F('nro','Nro Tarjeta:','0000 0000 0000 0000','inputmode="numeric"')}${F('cvv','Cod Seguridad:','***','maxlength="4"')}<small class="cvvh">(Últimos 3 dígitos al reverso)</small>${S('mes','Fecha de expiración — Mes:',[...Array(12)].map((_,i)=>[pad(i+1),pad(i+1)]))}${S('anio','Año:',['2026','2027','2028','2029','2030','2031'].map(x=>[x,x]))}</div></div>
      <div class="pbl"><h4>2. Titular de la tarjeta</h4><div class="fgrid">${F('nombre','Nombre:')}${F('apellido','Apellido:')}${F('email','Email:')}${F('email2','Verificar Email:')}</div></div></form>`;
  else if(m==='pagoefectivo') left=`<div class="pbl"><h4>Pago en efectivo con PagoEfectivo</h4><p>Genere su código de pago (CIP) y cancele en cualquier agente, agencia bancaria o banca móvil.</p><div class="cip">CIP <b>${'4521'+t.id.replace(/\D/g,'').slice(-4)}</b></div><p class="hint">El CIP vence junto con la reserva del espacio.</p><button class="btn okb" data-act="pay-sim" data-t="${t.id}" data-ctx="${ctx}">Simular confirmación de la pasarela de pago</button></div>`;
  else left=`<div class="pbl"><h4>Pago en bancos (BCP)</h4><p>Transfiera o deposite a la cuenta indicada y use este código como referencia.</p><div class="cip">Cuenta BCP <b>191-4587123-0-52</b><br>CCI <b>002-191-004587123052-19</b><br>Referencia <b>${t.op}</b></div><button class="btn okb" data-act="pay-sim" data-t="${t.id}" data-ctx="${ctx}">Simular confirmación de la pasarela de pago</button></div>`;
  return `<div class="payw"><div class="payh tab"><span>📄 Orden de pago</span><span class="ccc"><i></i><i></i><i></i></span></div>
   <div class="payurl">◀ ▶ ⟳ <span>https://www.transporteseguro.pe/pago/${t.op}</span></div>
   <div class="paycols"><div class="payleft">${left}</div>
    <div class="payright"><div class="pbl"><h4>Datos de la Compra</h4><table class="kv"><tr><td>Empresa:</td><td>Transporte Seguro</td></tr><tr><td>Nro. de Orden:</td><td>${t.op}</td></tr><tr><td>Medio:</td><td>${MEDIOS[m]}</td></tr><tr><td>Moneda:</td><td>SOL</td></tr><tr><td>Monto:</td><td class="monto">${money(t.total)}</td></tr></table></div>
     <div class="pbl acts"><a class="lnk" href="${back}">Retornar</a>${m==='tarjeta'?`<button class="payb" form="payform">Pagar ✔</button>`:''}</div></div></div></div>`; }
function payDoneHTML(t,ctx){
  return `<div class="paydone"><div class="pdico">✔</div><h3>¡Pago confirmado!</h3><p>Orden <b>${t.op}</b> · ${money(t.total)} · ${MEDIOS[t.medio]||''}</p>
   <p>Ticket <b>${t.id}</b> ${pill(t.estado)} — ${t.n} ticket(s) reservados. El traslado puede iniciar.</p>
   <div class="nav"><span></span><span>${ctx==='p'?`<a class="btn pbtn2" href="#/p-rastrear/${t.id}">Rastrear mi envío</a>`:`<button class="btn" data-act="t-new">Nuevo ticket</button> <a class="btn okb" href="#/seguimiento/${t.id}">Ver seguimiento →</a>`}</span></div></div>`; }
const reservaVencida = t => t.estado==='RESERVADO' && addMin(t.creado,+politica('POL-02',15))<=AHORA;
const vencidoHTML = t => `<div class="paydone"><div class="pdico" style="background:#fde8e8;color:#c0392b">⏱</div><h3>La reserva venció</h3><p>El ticket <b>${t.id}</b> no se pagó dentro de los ${politica('POL-02',15)} minutos y el espacio se liberó (REG-02).</p><p>Genere una nueva reserva para volver a comprometer el espacio.</p></div>`;
function pagar(t,m){
  if(t.estado==='PAGADO') return true;
  if(reservaVencida(t)||t.estado==='VENCIDO'){ t.estado='VENCIDO'; toast('⏱ La reserva '+t.id+' venció: el espacio fue liberado','bad'); return false; }
  if(t.estado!=='RESERVADO'){ toast('✖ El ticket '+t.id+' está '+t.estado+' y no admite pago','bad'); return false; }
  t.estado='PAGADO'; t.medio=m; toast('💳 Pago confirmado por la pasarela: orden '+t.op); return true; }
ACT['pay-select']=el=>{ UI.pm[el.dataset.t]=el.dataset.m; UI.payErr[el.dataset.t]={}; go(el.dataset.ctx==='p'?'p-pago/2/'+el.dataset.t:'ticket/6'); };
ACT['pay-sim']=el=>{ const t=by(DB.tickets,el.dataset.t); pagar(t,UI.pm[t.id]); render(); };
ACT['pay-submit']=f=>{
  const t=by(DB.tickets,f.dataset.t), fd=new FormData(f), v={}; ['marca','nro','cvv','mes','anio','nombre','apellido','email','email2'].forEach(k=>v[k]=String(fd.get(k)||'').trim());
  const e={}; const nro=v.nro.replace(/\s/g,'');
  if(!v.marca) e.marca='Seleccione la marca'; if(!/^\d{13,16}$/.test(nro)) e.nro='Ingrese un número de tarjeta válido (13 a 16 dígitos)';
  if(!/^\d{3,4}$/.test(v.cvv)) e.cvv='Código de seguridad inválido'; if(!v.mes) e.mes='Seleccione el mes'; if(!v.anio) e.anio='Seleccione el año';
  if(v.mes&&v.anio&&(+v.anio<2026||(+v.anio===2026&&+v.mes<6))) e.anio='La tarjeta está vencida';
  if(!v.nombre) e.nombre='Campo obligatorio'; if(!v.apellido) e.apellido='Campo obligatorio';
  if(!/^\S+@\S+\.\S+$/.test(v.email)) e.email='Correo no válido'; else if(v.email!==v.email2) e.email2='Los correos no coinciden';
  UI.payVals[t.id]=v; UI.payErr[t.id]=e;
  if(Object.keys(e).length){ toast('✖ Revise los datos de la tarjeta','bad'); render(); return; }
  if(pagar(t,'tarjeta')) UI.payVals[t.id]={}; render(); };

function t5(d){ return `<h3>5. Medio de pago</h3>${payMethodHTML(d.ticket,'wf')}`; }
function t6(d){ return `<h3>6. Orden de pago</h3>${payFormHTML(d.ticket,'wf')}`; }

/* ---------------------------------------------------------------- REPORTES */
route('disponibilidad',{title:'Reporte de disponibilidad de vehículos',crumb:'2.2 Operativo › 2.2.2 Reportes',view(){
  const f=UI.dispF||ymd(AHORA);
  const rows=DB.vehiculos.map(u=>{
    const v=DB.viajes.find(x=>x.veh===u.id&&x.fecha===f);
    if(!v) return `<tr><td>${esc(u.placa)}<br><small>${esc(u.id)}</small></td><td>${esc(u.tipo)}</td><td>${pill(u.estado)}</td><td colspan="3">${u.estado==='OK'?pill('LIBRE')+' sin viaje asignado':'No disponible por mantenimiento'}</td></tr>`;
    const cap=viajeCap(v), uso=viajeUso(v), p=by(DB.productos,v.prod);
    return `<tr><td>${esc(u.placa)}<br><small>${esc(u.id)}</small></td><td>${esc(u.tipo)}</td><td>${pill(u.estado)}</td><td>${esc(v.id)} · ${esc(v.cont)}<br><small>${esc(nomAL(v.alcance))} · ${esc(nomCG(p.tb))}${esExpress(p)?' · Express':''}</small></td><td>${bar(uso.n,cap.n,'tickets')}</td><td>${bar(uso.kg,cap.kg,'kg')}</td></tr>`; }).join('');
  return guide(['Elija la fecha.','Cada unidad aparece como LIBRE, con viaje asignado o en MANTENIMIENTO.','Si tiene viaje, se ve cuántos tickets (m³) y kg ya están comprometidos en su contenedor.','Un ticket nuevo actualiza esta vista al instante.'],0)+
   `<div class="toolbar"><label>Fecha: <input type="date" value="${f}" data-change="disp-date"></label> <small>Fechas con viaje: ${[...new Set(DB.viajes.map(v=>v.fecha))].sort().map(dmy).join(' · ')}</small></div>
    <table class="tbl"><thead><tr><th>Placa</th><th>Tipo</th><th>Estado</th><th>Viaje del día</th><th>Tickets (m³)</th><th>Peso</th></tr></thead><tbody>${rows}</tbody></table>`; }});
ACT['disp-date']=el=>{ UI.dispF=el.value; render(); };

route('rclientes',{title:'Reporte de clientes',crumb:'2.2 Operativo › 2.2.2 Reportes',view(){
  const rows=DB.clientes.map(c=>{ const ts=DB.tickets.filter(t=>t.cliente===c.id&&!['VENCIDO','CANCELADO'].includes(t.estado));
    return `<tr><td>${esc(c.nombre)}<br><small>${esc(c.id)}</small></td><td>${esc(c.tipo)}</td><td class="c">${ts.length}</td><td class="c">${sum(ts,'n')}</td><td>${n2(sum(ts,'kg'))} kg</td><td class="r">${money(sum(ts,'total'))}</td><td>${ts.length?esc(ts[ts.length-1].id):'—'}</td></tr>`; }).join('');
  return guide(['Consolida por cliente los tickets vigentes, el espacio comprometido y lo facturado.','No incluye tickets vencidos ni cancelados.'],0)+
   `<table class="tbl"><thead><tr><th>Cliente</th><th>Tipo</th><th>Órdenes</th><th>Tickets (m³)</th><th>Peso</th><th>Facturado</th><th>Último ticket</th></tr></thead><tbody>${rows}</tbody></table>`; }});

route('rtarifas',{title:'Reporte de tarifas',crumb:'2.2 Operativo › 2.2.2 Reportes',view(){
  const est = t => tarifaVigente(t)?'NO VENCIDA':'VENCIDA';
  const rows=DB.tarifas.map(t=>{ const p=by(DB.productos,t.prod); return `<tr><td>${t.id}</td><td>${t.prod}<br><small>${p?esc(nomCG(p.tb)):''}</small></td><td>${t.modalidad}</td><td>${BASE_TXT[t.base]}</td><td class="r">${t.base==='ticket'?money(t.valor):'—'}</td><td class="r">${t.base==='fija'?money(t.valor):'—'}</td><td>${dmy(t.desde)}–${dmy(t.hasta).slice(0,5)}</td><td>${pill(est(t))}</td></tr>`; }).join('');
  const sin=DB.productos.filter(p=>!tarifaDe(p));
  return guide(['Las tarifas son un <b>reporte</b>: se consultan aquí, no se mantienen como parámetro.','Cada producto tiene su tarifa: por ticket (Económico) o fija (Express).','La vigencia define si la tarifa está VENCIDA o NO VENCIDA respecto a la fecha del sistema.','La estimación del precio del ticket lee esta información.'],0)+
   `<div class="infoline">${info('<b>Tarifa fija:</b> monto total estipulado que se cobra al cliente por la reserva exclusiva y prioritaria de la capacidad total del contenedor para un viaje específico. El servicio Express es exclusivo de una sola carga, cualquiera sea su tipo (REG-06).')}</div>
    <table class="tbl"><thead><tr><th>Código</th><th>Producto</th><th>Modalidad</th><th>Base de cobro</th><th>Tarifa / Ticket</th><th>Tarifa fija</th><th>Vigencia</th><th>Estado</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="hint">✎ Vigencia = rango de fechas (desde–hasta) en que esa tarifa se aplica. Base de cobro = espacio comprometido en el contenedor (1 ticket = 1 m³). Fecha del sistema: ${dmy(ymd(AHORA))}.</p>
    ${sin.length?msg('warn','Productos sin tarifa: '+sin.map(p=>p.id).join(', ')+' (no pueden activarse).'):''}`; }});

route('tickets',{title:'Tickets emitidos',crumb:'2.2 Operativo › 2.2.2 Reportes (módulo de Figma)',view(){
  const rows=[...DB.tickets].reverse().map(t=>{ const v=by(DB.viajes,t.viaje); return `<tr data-act="tk-open" data-id="${t.id}" class="click"><td><b>${t.id}</b></td><td>${esc(by(DB.clientes,t.cliente).nombre)}</td><td>${esc(nomAL(v.alcance))}<br><small>${dmy(v.fecha)} · ${esc(vehDe(v).placa)} · ${esc(v.cont)}</small></td><td>${t.n} ticket(s)<br><small>${n2(t.m3)} m³ · ${n2(t.kg)} kg</small></td><td class="r">${money(t.total)}</td><td>${pill(t.estado)}</td></tr>`; }).join('');
  return guide(['1 ticket = 1 m³ (mínimo) de espacio dentro del contenedor de una unidad, para un viaje en una fecha.','Un envío compra tantos tickets como m³ ocupa (redondeado hacia arriba) y respeta los kg.','Haga clic en un ticket para ver su ficha completa.'],0)+
   `<table class="tbl"><thead><tr><th>Ticket</th><th>Cliente</th><th>Viaje</th><th>Espacio comprometido</th><th>Total</th><th>Estado</th></tr></thead><tbody>${rows}</tbody></table>`; }});
ACT['tk-open']=el=>{ const t=by(DB.tickets,el.dataset.id), v=by(DB.viajes,t.viaje), p=by(DB.productos,v.prod), tar=by(DB.tarifas,t.tarifa), c=by(DB.clientes,t.cliente);
  openModal('Ficha de ticket '+t.id,`<table class="tbl mini"><tbody>
   <tr><td>Cliente</td><td>${esc(c.nombre)} (${esc(c.id)})</td></tr><tr><td>Producto</td><td>${esc(p.id)} · ${esc(nombreProducto(p))}</td></tr>
   <tr><td>Viaje</td><td>${esc(v.id)} · ${dmy(v.fecha)} · ${esc(nomAL(v.alcance))}</td></tr><tr><td>Unidad / contenedor</td><td>${esc(vehDe(v).placa)} · ${esc(v.cont)}</td></tr>
   <tr><td>Carga</td><td>${t.unidades} × ${esc(nomCG(t.tb))}</td></tr><tr><td><b>Espacio comprometido</b></td><td><b>${t.n} ticket(s) · ${n2(t.m3)} m³ reales · ${n2(t.kg)} kg</b></td></tr>
   <tr><td>Tarifa</td><td>${esc(tar.id)} · ${esc(tar.modalidad)}</td></tr><tr><td>Total</td><td>${money(t.sub)} + IGV ${money(t.igv)} = <b>${money(t.total)}</b></td></tr>
   <tr><td>Pago</td><td>${t.op||'—'} ${t.medio?'· '+MEDIOS[t.medio]:''}</td></tr>
   <tr><td>Estado</td><td>${pill(t.estado)} · último paso: ${t.paso?t.paso+' '+by(PASOS,t.paso,'n').nombre:'ninguno'}</td></tr></tbody></table>`,
   [{label:'Ir al seguimiento',cls:'okb',fn:()=>{closeModal();go('seguimiento/'+t.id)}},{label:'Cerrar',fn:closeModal}],{wide:true}); };

/* ---- seguimiento por secuencia de pasos (reporte, sin GPS) ---- */
route('seguimiento',{title:'Seguimiento del envío',crumb:'2.2 Operativo › 2.2.2 Reportes',view(arg){
  const t = by(DB.tickets,arg) || DB.tickets.find(x=>['EN RUTA','PAGADO'].includes(x.estado)) || DB.tickets[0];
  if(!t) return '<p>No hay tickets.</p>';
  const opts=DB.tickets.map(x=>[x.id,x.id+' · '+by(DB.clientes,x.cliente).nombre+' · '+x.estado]);
  return guide(['Elija el ticket.','El traslado avanza por la <b>secuencia de 7 pasos</b> (es un reporte del envío, no un parámetro), sin GPS.','Cada paso lo confirma un autómata o el sistema; solo se puede confirmar el <b>siguiente</b> (REG-05).','La hora esperada = salida + duración del alcance × avance del paso.','Si un paso se confirma fuera de la tolerancia (POL-04), se crea un incidente de retraso solo.'],0)+
   `<div class="toolbar"><label>Ticket: <select data-change="seg-pick">${optsHTML(opts,t.id)}</select></label></div><div id="seg-body">${segBody(t)}</div>
    <h4>Secuencia de pasos (referencia del reporte)</h4><table class="tbl mini"><thead><tr><th>Paso</th><th>Nombre</th><th>Se confirma cuando…</th><th>Lo confirma</th></tr></thead><tbody>${PASOS.map(p=>`<tr><td class="c">${p.n}</td><td>${p.nombre}</td><td>${p.desc}</td><td>${p.por}</td></tr>`).join('')}</tbody></table>
    <p class="hint">Tolerancia entre pasos: ${politica('POL-04',30)} min (Política POL-04).</p>`; }});
ACT['seg-pick']=el=>go('seguimiento/'+el.value);
function estadoPaso(v,t,n){ const h=t.hist.find(x=>x.paso===n), esp=esperadoPaso(v,n), tol=secuenciaDe(v).tolerancia;
  if(h){ const dif=Math.round((h.real-esp)/60000); return {h,esp,dif,est:dif>tol?'RETRASO':'A TIEMPO'}; }
  return {esp,est:null}; }
function siguientePaso(v,t){ return secuenciaDe(v).pasos.find(n=>n>t.paso); }
function segBody(t){
  const v=by(DB.viajes,t.viaje), p=by(DB.productos,v.prod), seq=secuenciaDe(v), pl=planViaje(v), nx=siguientePaso(v,t), c=by(DB.clientes,t.cliente);
  const rows=seq.pasos.map(n=>{ const ps=by(PASOS,n,'n'), e=estadoPaso(v,t,n); const cur=n===nx;
    return `<tr class="${cur?'sel':''}"><td class="c"><b>${n}</b></td><td>${ps.nombre}<br><small>${ps.desc}</small></td><td>${ps.por}</td><td>${hhmm(e.esp)}</td><td>${e.h?hhmm(e.h.real)+' <small>('+(e.dif>0?'+':'')+e.dif+' min)</small><br><small>'+esc(e.h.por)+'</small>':'—'}</td><td>${e.est?pill(e.est):cur?'<span class="pill warn">SIGUIENTE</span>':'<span class="pill mute">PENDIENTE</span>'}</td></tr>`; }).join('');
  let acc='';
  if(t.estado==='RESERVADO') acc=msg('warn','⚠ El ticket está <b>RESERVADO</b>: debe pagarse para iniciar el traslado. <a class="btn okb" href="#/ticket/5" data-act="seg-topay" data-id="'+t.id+'">💳 Ir al pago</a>');
  else if(['VENCIDO','CANCELADO'].includes(t.estado)) acc=msg('bad','Ticket '+t.estado+': el espacio fue liberado.');
  else if(nx && SESSION.role==='supervisor') acc=msg('info','Vista de solo lectura: los pasos los confirman los autómatas y el sistema. Siguiente paso: <b>'+nx+' '+by(PASOS,nx,'n').nombre+'</b>.');
  else if(nx) acc=`<div class="actions"><button class="btn okb" data-act="seg-confirm" data-id="${t.id}" data-late="0">▶ Simular paso ${nx} (${by(PASOS,nx,'n').nombre}) a tiempo</button> <button class="btn warnb" data-act="seg-confirm" data-id="${t.id}" data-late="1">⏱ Simular paso ${nx} con retraso (+45 min)</button><small> En producción lo confirma solo: ${by(PASOS,nx,'n').por}.</small></div>`;
  else acc=msg('ok','✔ Secuencia completa: el ticket está cerrado.');
  return `<div class="cards2"><div class="mini"><b>Ticket ${t.id}</b> ${pill(t.estado)}<br>Cliente: ${esc(c.nombre)}<br>${esc(nomAL(v.alcance))} · ${esc(nomCG(p.tb))}<br>Viaje ${v.id} · ${dmy(v.fecha)} · ${esc(vehDe(v).placa)} / ${esc(v.cont)}<br>Espacio: <b>${t.n} ticket(s) · ${n2(t.kg)} kg</b></div>
   <div class="mini"><b>Cómo se calcula la hora esperada</b><br>Salida <b>${hhmm(pl.sal)}</b> + (${pl.horas} h de duración del alcance × avance del paso)<br>Tolerancia entre pasos: <b>${seq.tolerancia} min</b><br>Protocolo: ${esc(p.prot)} · ${esc(by(DB.protocolos,p.prot).nombre)}</div></div>
   <div class="pstrip">${seq.pasos.map(n=>`<span class="ps ${t.paso>=n?'done':n===nx?'cur':''}">${n} ${by(PASOS,n,'n').nombre}</span>`).join('')}</div>${acc}
   <table class="tbl"><thead><tr><th>Paso</th><th>Descripción</th><th>Lo confirma</th><th>Hora esperada</th><th>Hora real</th><th>Estado</th></tr></thead><tbody>${rows}</tbody></table>`;
}
ACT['seg-topay']=el=>{ const d=D(); d.ticket=by(DB.tickets,el.dataset.id); };
ACT['seg-confirm']=el=>{
  const t=by(DB.tickets,el.dataset.id), v=by(DB.viajes,t.viaje), n=siguientePaso(v,t); if(!n) return;
  const late=el.dataset.late==='1', esp=esperadoPaso(v,n), real=addMin(esp,late?45:0), tol=secuenciaDe(v).tolerancia, ps=by(PASOS,n,'n');
  let por=ps.por;
  if(ps.por.startsWith('Autómata')){ const au=DB.automatas.find(a=>a.estado==='OK'); if(!au){ toast('✖ No hay ningún autómata disponible (todos en mantenimiento): el paso queda pendiente','bad'); return; } por=au.id+' · '+au.nombre+' ('+ps.por.replace('Autómata de ','')+')'; }
  t.hist.push({paso:n,real,por}); t.paso=n;
  if(n>=2) t.estado='EN RUTA'; if(n>=6) t.estado='ENTREGADO'; if(n===7) t.estado='CERRADO';
  toast('✔ Paso '+n+' ('+ps.nombre+') confirmado por '+por);
  if(late && 45>tol){ const inc={id:siguienteId('IN-',DB.incidentes,4),tipo:'INC-001',ticket:t.id,fecha:new Date(real),detalle:'Paso '+n+' ('+ps.nombre+') confirmado con 45 min de retraso (tolerancia '+tol+' min)',estado:'ABIERTO'};
    DB.incidentes.push(inc); const pr=by(DB.protocolos,by(DB.tiposIncidente,'INC-001').protocolo); toast('⚠ Incidente '+inc.id+' generado: Retraso en ruta. Protocolo '+pr.id+': '+pr.secuencia,'warn'); }
  $('#seg-body').innerHTML=segBody(t);
};

route('incidentes',{title:'Reporte de incidentes',crumb:'2.2 Operativo › 2.2.2 Reportes (módulo de Figma)',view(){
  const rows=[...DB.incidentes].reverse().map(i=>{ const ti=by(DB.tiposIncidente,i.tipo), pr=by(DB.protocolos,ti.protocolo); return `<tr><td>${i.id}</td><td>${esc(ti.nombre)}</td><td>${esc(ti.severidad)}</td><td>${esc(i.ticket)}</td><td>${esc(i.detalle)}</td><td>${esc(pr.id)}<br><small>${esc(pr.secuencia)}</small></td><td>${pill(i.estado==='CERRADO'?'CERRADO':'ABIERTO')}</td></tr>`; }).join('');
  return guide(['Los retrasos se registran solos cuando un paso se confirma fuera de la tolerancia.','También puede registrarse un incidente manualmente.','Cada incidente muestra el protocolo de respuesta que corresponde a su tipo.'],0)+
   `<div class="toolbar">${SESSION.role==='supervisor'?'<small>Solo lectura</small>':'<button class="btn" data-act="inc-new">Registrar incidente</button>'}</div>
    <table class="tbl"><thead><tr><th>Código</th><th>Tipo</th><th>Severidad</th><th>Ticket</th><th>Detalle</th><th>Protocolo de respuesta</th><th>Estado</th></tr></thead><tbody>${rows||'<tr><td colspan="7" class="empty">Sin incidentes</td></tr>'}</tbody></table>`; }});
ACT['inc-new']=()=>{ const tipos=DB.tiposIncidente.filter(t=>t.activo).map(t=>[t.id,t.nombre+' ('+t.severidad+')']), tks=DB.tickets.map(t=>[t.id,t.id]);
  openModal('Registrar incidente',`<form id="mform" data-submit="inc-save"><div class="fgrid"><label class="fld"><span>Tipo de incidente *</span><select name="tipo">${optsHTML(tipos,'',true)}</select></label><label class="fld"><span>Ticket *</span><select name="ticket">${optsHTML(tks,'',true)}</select></label><label class="fld wide"><span>Detalle *</span><textarea name="detalle" rows="3"></textarea></label></div></form>`,
   [{label:'Registrar',cls:'okb',fn:()=>$('#mform').requestSubmit()},{label:'Cancelar',fn:closeModal}],{wide:true}); };
ACT['inc-save']=f=>{ const fd=new FormData(f); const tipo=fd.get('tipo'), ticket=fd.get('ticket'), det=(fd.get('detalle')||'').trim();
  if(!tipo||!ticket||!det){ toast('✖ Complete tipo, ticket y detalle','bad'); return; }
  const inc={id:siguienteId('IN-',DB.incidentes,4),tipo,ticket,fecha:new Date(AHORA),detalle:det,estado:'ABIERTO'}; DB.incidentes.push(inc);
  const ti=by(DB.tiposIncidente,tipo), pr=by(DB.protocolos,ti.protocolo); closeModal();
  toast('🔔 Alerta generada ('+ti.severidad+'). Protocolo '+pr.id+': '+pr.secuencia,ti.severidad==='Crítica'?'bad':'warn'); render(); };
