/* Arranque del prototipo.
   Atajos útiles para exponer:  index.html?role=gerente   (entra directo con ese perfil)
                                index.html?role=demo&ejemplo=ticket  (asistente de ticket con datos cargados) */
(function init(){
  const base = snapshotDB();                                   // estado inicial: sirve como copia de respaldo
  DB.backups.forEach(b => { b.snap = structuredClone(base); });
  DB.indicadores.kpis = computeKpis();                        // resultado inicial del batch de estadísticas
  const q = new URLSearchParams(location.search);
  if(q.get('role') && ROLES[q.get('role')]) SESSION.role = q.get('role');
  if(q.get('ejemplo')==='ticket'){
    UI.draft = Object.assign(newDraft(),{cliente:'70112233',tb:'CG-001',uds:'40',largo:'100',ancho:'50',alto:'100',peso:'60',prod:'PROD01',origen:'Lima',destino:'Chiclayo',alc:'AL-001',fecha:'2026-06-24'}); calcRes(UI.draft);
  }
  render();
})();
