// MaDenFlow — Повторные посещения
const visits = appData.visits || (appData.visits = []);
let editingVisitId = null;

function visitColorClass(color){return ['green','yellow','mint','red'].includes(color)?color:'mint'}
function renderVisits(){
  const list=document.getElementById('visitsList'); if(!list)return;
  list.innerHTML='';
  const sorted=[...visits].sort((a,b)=>(b.updated||b.created||0)-(a.updated||a.created||0));
  if(!sorted.length){list.innerHTML='<div class="visits-empty">Пока нет записей. Добавьте первое повторное посещение.</div>';return}
  sorted.forEach(v=>{
    const card=document.createElement('article'); card.className=`visit-note ${visitColorClass(v.color)}`;
    card.innerHTML=`<div class="visit-note-head"><strong>${escapeHtml(v.name)}</strong><span>${escapeHtml(v.date||'')}</span></div><div class="visit-note-text">${escapeHtml(v.note).replace(/\n/g,'<br>')}</div><div class="visit-note-actions"><button data-edit="${v.id}">✏️</button><button data-delete="${v.id}">🗑</button></div>`;
    list.appendChild(card);
  });
  list.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openVisitEditor(b.dataset.edit));
  list.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>{if(confirm('Удалить заметку?')){const i=visits.findIndex(v=>v.id===b.dataset.delete);if(i>=0)visits.splice(i,1);saveStorage();renderVisits()}});
}
function escapeHtml(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function openVisits(){renderVisits();document.getElementById('visitsModal').classList.remove('hidden')}
function openVisitEditor(id=null){
  editingVisitId=id;
  const v=id?visits.find(x=>x.id===id):null;
  document.getElementById('visitName').value=v?.name||'';
  document.getElementById('visitDate').value=v?.date||localKey(new Date());
  document.getElementById('visitNote').value=v?.note||'';
  document.getElementById('visitColor').value=v?.color||'mint';
  document.getElementById('visitEditorTitle').textContent=id?'Редактировать заметку':'Новая заметка';
  document.getElementById('visitEditorModal').classList.remove('hidden');
  setTimeout(()=>document.getElementById('visitName').focus(),50);
}
document.getElementById('visitsBtn').onclick=openVisits;
document.getElementById('visitsClose').onclick=()=>document.getElementById('visitsModal').classList.add('hidden');
document.getElementById('visitAddBtn').onclick=()=>openVisitEditor();
document.getElementById('visitCancelBtn').onclick=()=>document.getElementById('visitEditorModal').classList.add('hidden');
document.getElementById('visitSaveBtn').onclick=()=>{
  const name=document.getElementById('visitName').value.trim(), note=document.getElementById('visitNote').value.trim();
  if(!name){alert('Введите имя человека.');return} if(!note){alert('Запишите, о чём говорили.');return}
  const now=Date.now();
  if(editingVisitId){const v=visits.find(x=>x.id===editingVisitId);if(v){v.name=name;v.date=document.getElementById('visitDate').value;v.note=note;v.color=document.getElementById('visitColor').value;v.updated=now}}
  else visits.push({id:'v_'+now+'_'+Math.random().toString(36).slice(2,7),name,date:document.getElementById('visitDate').value,note,color:document.getElementById('visitColor').value,created:now,updated:now});
  saveStorage();document.getElementById('visitEditorModal').classList.add('hidden');renderVisits();
};
window.openVisits=openVisits;
