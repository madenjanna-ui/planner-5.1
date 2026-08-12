// MaDenFlow Tasks 5.4
function escapeHtml(text){return String(text??"").replace(/[&<>\'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function loadTasks(date,container){
  container.innerHTML="";
  const list=getTasks(date);
  container.className="tasks";
  if(list.length===2)container.classList.add("two-columns");
  if(list.length>=3)container.classList.add("three-columns");
  if(list.length>=7)container.classList.add("compact");
  list.forEach((taskData,index)=>{
    const task=document.createElement("div");
    task.className="task";
    if(taskData.done)task.classList.add("done");
    task.classList.add(taskData.priority||"normal");
    if(list.length>=2)task.classList.add("grid-task");
    const listColor=taskData.listColor||"green";
    task.classList.add("list-"+listColor);
    const time=taskData.time||"";
    task.innerHTML=`<label class="task-check"><input type="checkbox" ${taskData.done?"checked":""}><span class="checkmark"></span></label><div class="task-text-wrap">${time?`<span class="task-time">${escapeHtml(time)}</span>`:""}<div class="task-text" title="${escapeHtml(taskData.text)}">${escapeHtml(taskData.text)}</div></div>`;
    const checkbox=task.querySelector("input");
    checkbox.addEventListener("change",()=>{toggleTask(date,index,checkbox.checked);renderWeek()});
    task.addEventListener("click",e=>{if(e.target.tagName==="INPUT"||e.target.classList.contains("checkmark"))return;showTaskMenu(task,date,index)});
    container.appendChild(task);
  });
}
function showTaskMenu(task,date,index){
  closeTaskMenu();
  const taskData=getTasks(date)[index];
  if(!taskData)return;
  const recurring=!!taskData.recurrenceId;
  const listMode=(appData.settings||{}).taskView==="list";
  const menu=document.createElement("div");
  menu.className="task-menu";
  menu.innerHTML=`
    <div class="task-preview">${taskData.time?`<div class="task-preview-time">🕒 ${escapeHtml(taskData.time)}</div>`:""}${escapeHtml(taskData.text)}</div>
    <button data-action="important">Важное</button>
    <button data-action="urgent">Срочное</button>
    <button data-action="normal">Обычное</button>
    ${listMode?`<div class="task-menu-line"></div><div class="task-menu-label">Цвет строки</div><div class="task-color-actions"><button data-action="list-green">🟢 Зелёная</button><button data-action="list-red">🔴 Красная</button><button data-action="list-black">⚫ Чёрная</button></div>`:""}
    <div class="task-menu-line"></div>
    <button data-action="edit">Редактировать</button>
    ${recurring?`<button data-action="edit-chain">✏️ Редактировать всю цепочку</button>`:""}
    <button data-action="delete">Удалить эту задачу</button>
    ${recurring?`<button data-action="delete-chain">🗑 Удалить всю цепочку</button>`:""}
  `;
  document.body.appendChild(menu);
  const rect=task.getBoundingClientRect();
  let left=Math.min(rect.left,window.innerWidth-310),top=rect.bottom+6;
  if(top+menu.offsetHeight>window.innerHeight)top=Math.max(8,rect.top-menu.offsetHeight-6);
  menu.style.left=Math.max(8,left)+"px";menu.style.top=top+"px";
  menu.querySelectorAll("button").forEach(button=>button.onclick=e=>{
    e.stopPropagation();
    const action=button.dataset.action;
    if(["important","urgent","normal"].includes(action)){changePriority(date,index,action);closeTaskMenu();renderWeek();return}
    if(action.startsWith("list-")){
      const color=action.slice(5); if(taskData.recurrenceId){if(confirm("Изменить цвет у всей повторяющейся цепочки?"))setRecurringChainListColor(taskData.recurrenceId,color);else setTaskListColor(date,index,color)}else setTaskListColor(date,index,color);closeTaskMenu();renderWeek();return
    }
    if(action==="edit")editTaskDialog(date,index,false);
    else if(action==="edit-chain")editTaskDialog(date,index,true);
    else if(action==="delete"){
      if(confirm("Удалить только эту задачу?")){deleteTask(date,index);closeTaskMenu();renderWeek()}
    } else if(action==="delete-chain"){
      if(confirm("Удалить ВСЕ задачи этой повторяющейся цепочки?")){deleteRecurringChain(taskData.recurrenceId);closeTaskMenu();renderWeek()}
    }
  });
}
function closeTaskMenu(){document.querySelectorAll(".task-menu").forEach(x=>x.remove())}
document.addEventListener("click",e=>{if(!e.target.closest(".task-menu")&&!e.target.closest(".task"))closeTaskMenu()});
function editTaskDialog(date,index,wholeChain=false){
  closeTaskMenu();
  const task=getTasks(date)[index];if(!task)return;
  selectedDate=date;
  const modal=document.getElementById("taskModal"),input=document.getElementById("newTaskInput"),time=document.getElementById("newTaskTime"),title=document.getElementById("taskModalTitle"),repeat=document.getElementById("recurrenceBox"),chain=document.getElementById("chainEditHint");
  title.textContent=wholeChain?"Редактировать цепочку":"Редактировать задачу";
  input.value=task.text;time.value=task.time||"";repeat.classList.add("hidden");
  chain.classList.toggle("hidden",!wholeChain);modal.dataset.editDate=date;modal.dataset.editIndex=index;modal.dataset.editChain=wholeChain?"1":"0";modal.classList.remove("hidden");input.focus();
}
function refreshDay(date){const day=document.querySelector(`[data-date="${date}"]`);if(day){const c=day.querySelector(".tasks");if(c)loadTasks(date,c)}}
function refreshTasks(){if(typeof renderWeek==="function")renderWeek()}
window.loadTasks=loadTasks;window.showTaskMenu=showTaskMenu;window.closeTaskMenu=closeTaskMenu;window.refreshDay=refreshDay;window.refreshTasks=refreshTasks;window.editTaskDialog=editTaskDialog;
