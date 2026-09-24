/* ============================================================
   NÚCLEO DE INTERFAZ: rutas, árbol de módulos, componentes y
   motor de mantenimiento (agregar / editar / eliminar).
   ============================================================ */
const UI = { crud:{}, draft:null, guideOpen:true };
const ACT = {};            // acciones disparadas por data-act
const ROUTES = {};         // clave -> {title, crumb, view, after, guide}
const CRUDS = {};

const $ = (s,el=document) => el.querySelector(s);
const $$ = (s,el=document) => [...el.querySelectorAll(s)];
const esc = s => String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------------- sesión y perfiles ---------------- */
const SESSION = { role:null };
const ROLES = {
  demo:     {label:'Modo demostración', desc:'Ve todos los módulos (ideal para exponer).', sees:['seg','2.1','2.2','3.1','3.2']},
  gerente:  {label:'Gerente',           desc:'Parámetros, catálogos, consultas y reportes.', sees:['seg','2.1','2.2.2']},
  supervisor:{label:'Supervisor',        desc:'Solo lectura: disponibilidad, seguimiento, tickets e incidentes.', sees:['seg','2.2.2.1','2.2.2.2','2.2.2.5','2.2.2.6']},
  admin:    {label:'Administrador BD',  desc:'Procesos batch, backup y contingencia.',       sees:['seg','3.1','3.2']},
  cliente:  {label:'Cliente',           desc:'Portal web: catálogo, cotización y seguimiento.', sees:['portal']}
};

/* ---------------- árbol de módulos (foto del profesor + módulos de Figma) ---------------- */
const TREE = [
  {n:'',label:'Seguridad', k:'seg', kids:[{n:'',label:'Acceso y perfiles', r:'seguridad'}]},
  {n:'2.1',label:'Gerencial', k:'2.1', kids:[
    {n:'2.1.1',label:'Mantenimiento de parámetros', kids:[
      {n:'2.1.1.1',label:'Parámetros generales',      r:'parametros'},
      {n:'2.1.1.2',label:'Catálogo de productos',     r:'productos'},
      {n:'2.1.1.3',label:'Catálogo de reglas',        r:'reglas'},
      {n:'2.1.1.4',label:'Catálogo de protocolos',    r:'protocolos'},
      {n:'2.1.1.5',label:'Catálogo de políticas',     r:'politicas'},
      {n:'2.1.1.6',label:'Catálogo de compatibilidad',r:'compat', fig:1},
      {n:'2.1.1.7',label:'Tipos de incidente',        r:'tincidentes', fig:1}]},
    {n:'2.1.2',label:'Consulta', kids:[{n:'2.1.2.1',label:'Consulta de indicadores', r:'indicadores'}]}]},
  {n:'2.2',label:'Operativo', k:'2.2', kids:[
    {n:'2.2.1',label:'Data-entry', k:'2.2.1', kids:[
      {n:'2.2.1.1',label:'Registro de cliente',  r:'clientes'},
      {n:'2.2.1.2',label:'Asignación de ticket', r:'ticket/1', kids:[
        {n:'2.2.1.2.1',label:'Estimación del precio del servicio', r:'ticket/3'},
        {n:'2.2.1.2.2',label:'Confirmación del servicio',          r:'ticket/4'},
        {n:'2.2.1.2.3',label:'Medio de pago',                      r:'ticket/5'},
        {n:'2.2.1.2.4',label:'Orden de pago',                      r:'ticket/6'}]}]},
    {n:'2.2.2',label:'Reportes', k:'2.2.2', kids:[
      {n:'2.2.2.1',label:'Disponibilidad de vehículos', r:'disponibilidad'},
      {n:'2.2.2.2',label:'Seguimiento del envío',       r:'seguimiento'},
      {n:'2.2.2.3',label:'Reporte de clientes',         r:'rclientes', k:'2.2.2.3'},
      {n:'2.2.2.4',label:'Reporte de tarifas',          r:'rtarifas', k:'2.2.2.4'},
      {n:'2.2.2.5',label:'Tickets emitidos',            r:'tickets', fig:1},
      {n:'2.2.2.6',label:'Incidentes',                  r:'incidentes', fig:1}]}]},
  {n:'3.1',label:'Aplicativo (batch)', k:'3.1', kids:[
    {n:'3.1.1',label:'Actualización de base de datos', r:'batch-bd'},
    {n:'3.1.2',label:'Estadísticas', kids:[{n:'3.1.2.1',label:'Generación de indicadores', r:'batch-ind'}]}]},
  {n:'3.2',label:'Técnico', k:'3.2', kids:[
    {n:'3.2.1',label:'Mantenimiento de base de datos', kids:[
      {n:'3.2.1.1',label:'Crecimiento de la base de datos', r:'crecimiento'},
      {n:'3.2.1.2',label:'Backup', r:'backup'}]},
    {n:'3.2.2',label:'Contingencia', kids:[{n:'3.2.2.1',label:'Restauración de base de datos', r:'restauracion'}]}]}
];

function puede(k){ if(!SESSION.role) return false; const s=ROLES[SESSION.role].sees; return s.some(x=>k===x||k.startsWith(x+'.')||x.startsWith(k+'.')||(x==='2.2'&&k.startsWith('2.2'))); }
function rutaDe(r){ return r.split('/')[0]; }

function treeHTML(cur){
  const rec = (nodes,depth,inh) => nodes.map(n=>{
    const k = n.k||inh;
    if(k && !puede(k)) return '';
    const active = n.r && (rutaDe(n.r)===cur.key) ? ' active':'';
    const head = `<span class="num">${esc(n.n)}</span>${esc(n.label)}${n.fig?'<i class="figtag" title="Módulo tomado del diseño en Figma">F</i>':''}`;
    if(n.kids && !n.r) return `<div class="tg"><div class="tl d${depth}">${head}</div>${rec(n.kids,depth+1,k)}</div>`;
    if(n.kids) return `<a class="tl d${depth} link${active}" href="#/${n.r}">${head}</a>${rec(n.kids,depth+1,k)}`;
    return `<a class="tl d${depth} link${active}" href="#/${n.r}">${head}</a>`;
  }).join('');
  return rec(TREE,0,'');
}

/* ---------------- componentes ---------------- */
const OKS   = ['ACTIVO','OK','PAGADO','CERRADO','ENTREGADO','A TIEMPO','VIGENTE','CONFIRMADO','LIBRE','Sí'];
const BADS  = ['NO ACTIVO','MANTENIMIENTO','VENCIDO','RETRASO','CANCELADO','No'];
function pill(t){ const c = OKS.includes(t)?'ok':BADS.includes(t)?'bad':'warn'; return `<span class="pill ${c}">${esc(t)}</span>`; }
function bar(used,cap,unit){ const p=cap?Math.min(100,used/cap*100):0; const cls=p>=90?'full':p>=60?'mid':'low';
  return `<div class="bar"><div class="bar-fill ${cls}" style="width:${p}%"></div></div><small>${n2(used)} / ${n2(cap)} ${unit} · ${Math.round(p)} %</small>`; }
function info(text){ return `<span class="ibtn" tabindex="0" aria-label="Información">i<span class="tip">${text}</span></span>`; }
function kpi(t,v,sub){ return `<div class="kpi"><small>${esc(t)}</small><b>${v}</b><small>${sub||''}</small></div>`; }
function guide(steps,cur){ return '';
}
function frame(title,url,body){ return `<div class="win"><div class="bar-w"><span class="dots">● ● ●</span><span class="url">transporteexpress.com.pe/${esc(url)}</span></div><div class="win-b">${body}</div></div>`; }
function toast(msg,kind='ok'){ const t=document.createElement('div'); t.className='toast '+kind; t.innerHTML=msg; $('#toasts').appendChild(t); setTimeout(()=>t.classList.add('show'),20); setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.remove(),300)},3800); }
function msg(kind,html){ return `<div class="msg ${kind}">${html}</div>`; }

/* ---------------- modal ---------------- */
function openModal(title,body,actions=[],opts={}){
  UI.modalActions = actions;
  $('#modal-root').innerHTML = `<div class="ov" data-act="modal-bg"><div class="modal ${opts.wide?'wide':''} ${opts.kind||''}" role="dialog" onclick="event.stopPropagation()">
    <div class="mh"><b>${title}</b><span class="x" data-act="modal-close">✕</span></div><div class="mb">${body}</div>
    <div class="mf">${actions.map((a,i)=>`<button class="btn ${a.cls||''}" data-act="modal-action" data-i="${i}">${a.label}</button>`).join('')}</div></div></div>`;
  const f=$('#modal-root input,#modal-root select,#modal-root textarea'); if(f&&!opts.noFocus) f.focus();
}
function closeModal(){ $('#modal-root').innerHTML=''; UI.modalActions=null; }
ACT['modal-close'] = closeModal;
ACT['modal-bg'] = (el,e)=>{ if(e.target===el) closeModal(); };
ACT['modal-action'] = el => { const a=UI.modalActions[+el.dataset.i]; if(a&&a.fn) a.fn(); };
ACT['toggle-guide'] = () => { UI.guideOpen=!UI.guideOpen; const g=$('.guide'); if(g){ g.classList.toggle('closed',!UI.guideOpen); $('.gh span',g).textContent=UI.guideOpen?'▾':'▸'; } };

/* ---------------- router ---------------- */
function parseHash(){ const h=(location.hash||'#/').slice(2); const [key,...rest]=h.split('/'); return {key:key||'', arg:rest.join('/')}; }
function go(path){ location.hash = '#/'+path; }
function render(){
  const cur = parseHash();
  if(!SESSION.role && cur.key!=='login'){ go('login'); return; }
  if(SESSION.role==='cliente' && !cur.key.startsWith('p-') && cur.key!=='login'){ go('p-catalogo'); return; }
  if(SESSION.role && SESSION.role!=='cliente' && cur.key.startsWith('p-')){ /* portal accesible en demo */ }
  const R = ROUTES[cur.key] || ROUTES['login'];
  const app = $('#app');
  if(cur.key==='login'){ app.className='login-mode'; app.innerHTML=R.view(cur.arg); return; }
  if(cur.key.startsWith('p-')){ app.className='portal'; app.innerHTML = portalShell(cur, R.view(cur.arg)); if(R.after) R.after(cur.arg); window.scrollTo(0,0); return; }
  app.className='wf-mode';
  app.innerHTML = `<header class="top"><div class="brand">🚚 <b>Transporte Seguro</b> <small>prototipo</small></div>
     <div class="who">${ROLES[SESSION.role].label} <a href="#/p-catalogo" class="lnk">Ver portal del cliente ↗</a> <a href="#/login" class="lnk">Cambiar de perfil</a></div></header>
     <nav class="side">${treeHTML(cur)}<div class="legend"><i class="figtag">F</i> módulo agregado desde el diseño de Figma</div></nav>
     <main class="main"><div class="crumb">${R.crumb||''}</div><h1>${R.title}</h1>${R.view(cur.arg)}</main>`;
  if(R.after) R.after(cur.arg);
  window.scrollTo(0,0);
}
window.addEventListener('hashchange', render);
document.addEventListener('click', e=>{ const el=e.target.closest('[data-act]'); if(!el) return; const f=ACT[el.dataset.act]; if(f){ if(el.type==='submit') e.preventDefault(); f(el,e); } });
document.addEventListener('input', e=>{ const el=e.target.closest('[data-on]'); if(el&&ACT[el.dataset.on]) ACT[el.dataset.on](el,e); });
document.addEventListener('change', e=>{ const el=e.target.closest('[data-change]'); if(el&&ACT[el.dataset.change]) ACT[el.dataset.change](el,e); });
document.addEventListener('submit', e=>{ const f=e.target.closest('[data-submit]'); if(f){ e.preventDefault(); ACT[f.dataset.submit](f,e); } });
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeModal(); });

/* ============================================================
   MOTOR DE MANTENIMIENTO (lista + agregar + editar + eliminar)
   Reproduce los 10 estados de pantalla diseñados en Figma:
   lista, formulario vacío, errores, guardado, editar sin fila,
   formulario precargado, cambios guardados, confirmar eliminar,
   eliminado y bloqueado por uso.
   ============================================================ */
const COL_ESTADO = {label:'Estado', f:r=>pill(r.activo?'ACTIVO':'NO ACTIVO')};

function crudView(cfg){
  CRUDS[cfg.key]=cfg;
  const st = UI.crud[cfg.key] = UI.crud[cfg.key] || {sel:null,q:'',aviso:'',hi:null};
  return `<div class="crud" id="crud-${cfg.key}">${crudBody(cfg)}</div>`;
}
function crudRows(cfg){ const st=UI.crud[cfg.key]; return DB[cfg.tabla].filter(r=>!st.q||JSON.stringify(r).toLowerCase().includes(st.q.toLowerCase())); }
function crudBody(cfg){
  const st = UI.crud[cfg.key], rows = crudRows(cfg);
  const head = cfg.cols.map(c=>`<th>${esc(c.label)} ▴</th>`).join('');
  const body = rows.length ? rows.map(r=>`<tr data-act="crud-row" data-key="${cfg.key}" data-id="${esc(r.id)}" class="${st.sel===r.id?'sel':''} ${st.hi===r.id?'hi':''}">${cfg.cols.map(c=>`<td>${c.f?c.f(r):esc(r[c.k])}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${cfg.cols.length}" class="empty">Sin registros. Presione <b>Agregar</b> para crear el primero.</td></tr>`;
  return `${cfg.intro?`<p class="intro">${cfg.intro}</p>`:''}
   <div class="toolbar"><button class="btn" data-act="crud-add" data-key="${cfg.key}">Agregar</button>
     <button class="btn" data-act="crud-edit" data-key="${cfg.key}">Editar</button>
     <button class="btn" data-act="crud-del" data-key="${cfg.key}">Eliminar</button>
     <input class="search" placeholder="🔍 Buscar…" value="${esc(st.q)}" data-on="crud-search" data-key="${cfg.key}"></div>
   ${st.aviso?msg('warn',st.aviso):''}
   <table class="tbl"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
   <p class="hint">Haga clic en una fila para seleccionarla · ${rows.length} registro(s)</p>`;
}
function crudRefresh(key){ const cfg=CRUDS[key]; const el=$('#crud-'+key); if(el) el.innerHTML=crudBody(cfg); }

ACT['crud-search'] = el => { const k=el.dataset.key; UI.crud[k].q=el.value; const pos=el.selectionStart; crudRefresh(k); const n=$('#crud-'+k+' .search'); n.focus(); n.setSelectionRange(pos,pos); };
ACT['crud-row'] = el => { const k=el.dataset.key; UI.crud[k].sel=el.dataset.id; UI.crud[k].aviso=''; UI.crud[k].hi=null; crudRefresh(k); };
ACT['crud-add'] = el => crudForm(CRUDS[el.dataset.key],null);
ACT['crud-edit'] = el => { const cfg=CRUDS[el.dataset.key], st=UI.crud[cfg.key];
  const row = DB[cfg.tabla].find(r=>r.id===st.sel);
  if(!row){ st.aviso='⚠ Seleccione un registro de la tabla para poder editarlo'; crudRefresh(cfg.key); return; }
  const lk = cfg.lock ? cfg.lock(row) : ''; if(lk){ st.aviso='🔒 '+lk; crudRefresh(cfg.key); return; }
  st.aviso=''; crudForm(cfg,row); };
ACT['crud-del'] = el => { const cfg=CRUDS[el.dataset.key], st=UI.crud[cfg.key];
  const row = DB[cfg.tabla].find(r=>r.id===st.sel);
  if(!row){ st.aviso='⚠ Seleccione un registro de la tabla para poder eliminarlo'; crudRefresh(cfg.key); return; }
  const lk = cfg.lock ? cfg.lock(row) : ''; if(lk){ st.aviso='🔒 '+lk; crudRefresh(cfg.key); return; }
  const refs = cfg.used ? cfg.used(row) : [];
  const name = (cfg.label||'registro')+' '+row.id;
  if(refs.length){
    const canOff = cfg.canDisable!==false;
    openModal('No se puede eliminar '+esc(name), `<p>Este registro ya lo usan otros datos:</p><ul class="refs">${refs.map(r=>`<li>${esc(r)}</li>`).join('')}</ul><p>${canOff?'Puede <b>deshabilitarlo</b> para que deje de ofrecerse sin perder el historial.':'Primero debe liberar o cambiar los registros que lo usan.'}</p>`,
      [...(canOff?[{label:'Deshabilitar',cls:'warnb',fn:()=>{ if('estado' in row){ row.estado='MANTENIMIENTO'; } else row.activo=false; closeModal(); toast('⚠ '+esc(name)+' deshabilitado','warn'); crudRefresh(cfg.key); }}]:[]),{label:'Cerrar',fn:closeModal}],{kind:'danger'});
  } else {
    openModal('¿Eliminar '+esc(name)+'?', '<p>Esta acción no se puede deshacer. El registro no está asociado a ningún producto, ticket ni viaje.</p>',
      [{label:'Eliminar',cls:'badb',fn:()=>{ const i=DB[cfg.tabla].indexOf(row); DB[cfg.tabla].splice(i,1); st.sel=null; closeModal(); toast('✔ '+esc(name)+' eliminado correctamente'); crudRefresh(cfg.key); }},{label:'Cancelar',fn:closeModal}]);
  }
};

function optsHTML(list,val,blank){ return (blank?'<option value="">— Seleccione —</option>':'')+list.map(([v,l])=>`<option value="${esc(v)}" ${String(v)===String(val)?'selected':''}>${esc(l)}</option>`).join(''); }
function fieldHTML(f,val,err,editing){
  let ctl='';
  const dis = f.lockOnEdit && editing ? 'disabled' : '';
  if(f.type==='select') ctl=`<select name="${f.k}" ${dis}>${optsHTML(f.opts(),val,true)}</select>`;
  else if(f.type==='estado') ctl=`<select name="${f.k}">${optsHTML([['1','ACTIVO'],['0','NO ACTIVO']],val===false?'0':'1')}</select>`;
  else if(f.type==='bool') ctl=`<select name="${f.k}">${optsHTML([['1','Sí'],['0','No']],val===false?'0':'1')}</select>`;
  else if(f.type==='textarea') ctl=`<textarea name="${f.k}" rows="3">${esc(val)}</textarea>`;
  else ctl=`<input name="${f.k}" type="${f.type==='number'?'number':f.type==='date'?'date':f.type==='time'?'time':'text'}" ${f.step?`step="${f.step}"`:''} value="${esc(Array.isArray(val)?val.join('-'):val)}" placeholder="${esc(f.ph||'')}" ${dis}>`;
  return `<label class="fld ${err?'err':''}"><span>${esc(f.label)}${f.req?' *':''}</span>${ctl}${f.help?`<small>${esc(f.help)}</small>`:''}${err?`<em>✖ ${esc(err)}</em>`:''}</label>`;
}
function crudForm(cfg,row,vals,errs){
  const editing = !!row; errs = errs||{}; vals = vals || (row?rowToVals(cfg,row):defaultsOf(cfg));
  const id = editing ? row.id : (cfg.idEditable ? '' : (cfg.newId?cfg.newId():siguienteId(cfg.prefix,DB[cfg.tabla],cfg.padLen||2)));
  const idField = cfg.idEditable
    ? `<label class="fld ${errs.id?'err':''} ${editing?'locked':''}"><span>Código *</span><input name="id" value="${esc(editing?row.id:(vals.id||''))}" placeholder="${esc(cfg.idPh||'')}" ${editing?'disabled':''}>${errs.id?`<em>✖ ${esc(errs.id)}</em>`:''}</label>`
    : `<label class="fld locked"><span>Código</span><input value="${esc(id)}${editing?'':' (automático)'}" disabled></label>`;
  const banner = Object.keys(errs).length ? msg('bad','✖ No se pudo guardar: corrija los campos marcados') : '';
  openModal((editing?'Editar ':'Nuevo ')+esc(cfg.label||'registro'),
   `<form id="mform" data-submit="crud-save" data-key="${cfg.key}" data-edit="${editing?row.id:''}">${banner}<div class="fgrid">${idField}${cfg.fields.map(f=>fieldHTML(f,vals[f.k],errs[f.k],editing)).join('')}</div></form>`,
   [{label:'Guardar',cls:'okb',fn:()=>$('#mform').requestSubmit()},{label:'Cancelar',fn:closeModal}],{wide:true});
}
function defaultsOf(cfg){ const o={}; cfg.fields.forEach(f=>{ o[f.k]=f.def!==undefined?f.def:(f.type==='estado'?true:''); }); return o; }
function rowToVals(cfg,row){ const o={}; cfg.fields.forEach(f=>{ o[f.k]= f.type==='pasos' ? (row[f.k]||[]).join('-') : row[f.k]; }); return o; }
function readForm(cfg,form){
  const fd=new FormData(form), v={};
  cfg.fields.forEach(f=>{
    let x = fd.has(f.k)? fd.get(f.k) : (form.elements[f.k]?form.elements[f.k].value:'');
    if(f.type==='number') x = x===''?'':Number(x);
    else if(f.type==='estado'||f.type==='bool') x = x==='1';
    else if(f.type==='pasos') x = String(x).split(/[^0-9]+/).filter(Boolean).map(Number);
    else x = typeof x==='string'?x.trim():x;
    v[f.k]=x;
  });
  return v;
}
ACT['crud-save'] = form => {
  const cfg=CRUDS[form.dataset.key], editId=form.dataset.edit, row=editId?DB[cfg.tabla].find(r=>r.id===editId):null;
  const vals=readForm(cfg,form), errs={};
  cfg.fields.forEach(f=>{
    const x=vals[f.k];
    if(f.req && (x===''||x===undefined||(Array.isArray(x)&&!x.length))) errs[f.k]='Campo obligatorio';
    else if(f.type==='number' && x!==''){ if(f.min!==undefined && x<f.min) errs[f.k]='Debe ser mayor'+(f.min===0?' a 0':' o igual a '+f.min); if(f.max!==undefined && x>f.max) errs[f.k]='Debe ser menor o igual a '+f.max; }
  });
  if(cfg.idEditable && !row){ const id = String(new FormData(form).get('id')||'').trim(); vals.id=id;
    if(!id) errs.id='Campo obligatorio'; else if(DB[cfg.tabla].some(r=>r.id.toUpperCase()===id.toUpperCase())) errs.id='Ya existe un registro con este código ('+id+')'; }
  if(cfg.validate){ Object.assign(errs, cfg.validate(vals,row)||{}); }
  if(Object.keys(errs).length){ crudForm(cfg,row,vals,errs); return; }
  const st=UI.crud[cfg.key]; let id;
  if(row){ Object.assign(row,vals); id=row.id; }
  else { id = cfg.idEditable ? vals.id : (cfg.newId?cfg.newId():siguienteId(cfg.prefix,DB[cfg.tabla],cfg.padLen||2)); DB[cfg.tabla].push(Object.assign({},vals,{id})); }
  if(cfg.onSave) cfg.onSave(row||DB[cfg.tabla][DB[cfg.tabla].length-1],!!row);
  st.sel=id; st.hi=id; st.aviso=''; closeModal();
  toast('✔ '+esc(cfg.label||'Registro')+' '+esc(id)+(row?' actualizado correctamente':' registrado correctamente'));
  crudRefresh(cfg.key);
  const tr=$('#crud-'+cfg.key+' tr.hi'); if(tr) tr.scrollIntoView({block:'nearest'});
  if(cfg.after) cfg.after(id);
};
