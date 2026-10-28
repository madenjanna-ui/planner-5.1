// MaDenFlow 5.0 — основной движок
console.log("MaDenFlow 5.0 запущен 🚀");
const planner=document.getElementById("planner"),weekTitle=document.getElementById("weekTitle");
const weekDays=["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
let currentDate=new Date(),selectedDate=null,calendarCursor=new Date();
function getMonday(date){const d=new Date(date);let day=d.getDay()||7;d.setDate(d.getDate()-day+1);return d}
function localKey(d){return localDateKey(d)}
// Seasonal palette: muted colors are used for the date context, not to replace task-specific colors.
const SEASONAL_MONTHS=[
  {name:"Карамельный",base:"#B87333",tint:"rgba(184,115,51,.14)"},
  {name:"Сиреневый",base:"#B99AD8",tint:"rgba(185,154,216,.17)"},
  {name:"Аква",base:"#62BDB8",tint:"rgba(98,189,184,.17)"},
  {name:"Кайенский",base:"#B94E57",tint:"rgba(185,78,87,.13)"},
  {name:"Зелёный",base:"#83A94C",tint:"rgba(131,169,76,.16)"},
  {name:"Золотой",base:"#D5A52D",tint:"rgba(213,165,45,.17)"},
  {name:"Коралловый",base:"#E58C85",tint:"rgba(229,140,133,.17)"},
  {name:"Солнечный",base:"#E98B2A",tint:"rgba(233,139,42,.16)"},
  {name:"Баха-блю",base:"#3C8DB6",tint:"rgba(60,141,182,.15)"},
  {name:"Лазурный",base:"#1687A7",tint:"rgba(22,135,167,.15)"},
  {name:"Бордовый",base:"#8B3D52",tint:"rgba(139,61,82,.14)"},
  {name:"Пагода",base:"#286D82",tint:"rgba(40,109,130,.15)"}
];
function seasonForDate(date){return SEASONAL_MONTHS[(date instanceof Date?date:new Date(date)).getMonth()]||SEASONAL_MONTHS[0]}
function renderWeek(){
  planner.innerHTML="";
  const monday=getMonday(currentDate),sunday=new Date(monday);
  sunday.setDate(monday.getDate()+6);
  // Keep one crisp landscape behind the entire weekly canvas; blur only glass panels.
  planner.style.setProperty("--week-landscape", `url("month-backgrounds/month-${String(monday.getMonth()+1).padStart(2,"0")}.jpg")`);
  // Share the current landscape with the fixed viewport canvas, so it continues behind the bottom week bar and safe areas.
  document.body.style.setProperty("--week-landscape", `url("month-backgrounds/month-${String(monday.getMonth()+1).padStart(2,"0")}.jpg")`);
  const fmt=d=>`${d.getDate()}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}`;
  const taskView=(appData.settings||{}).taskView||"cards";
  weekTitle.textContent=taskView==="weekColumns"
    ? `${String(monday.getDate()).padStart(2,"0")}.${String(monday.getMonth()+1).padStart(2,"0")}–${String(sunday.getDate()).padStart(2,"0")}.${String(sunday.getMonth()+1).padStart(2,"0")}.${String(sunday.getFullYear()).slice(-2)}`
    : `${fmt(monday)} – ${fmt(sunday)}`;
  let maxTasks=0;
  const listMode=taskView==="list";
  document.body.dataset.taskView=taskView;
  planner.classList.toggle("week-columns",taskView==="weekColumns");
  const today=new Date(); today.setHours(0,0,0,0);
  const sections=[];
  for(let i=0;i<7;i++){
    const date=new Date(monday); date.setDate(monday.getDate()+i);
    const key=localKey(date), count=getTasks(key).length;
    maxTasks=Math.max(maxTasks,count);
    const section=document.createElement("section");
    section.className="day"+(date.getDay()===0||date.getDay()===6?" weekend":"");
    const dayOnly=new Date(date); dayOnly.setHours(0,0,0,0);
    if(dayOnly.getTime()===today.getTime()) section.classList.add("today");
    if(dayOnly<today) section.classList.add("past-day");
    section.dataset.date=key; section.dataset.taskCount=count;
    const season=seasonForDate(date);
    section.style.setProperty("--season-color",season.base);
    section.style.setProperty("--season-tint",season.tint);
    section.style.setProperty("--month-landscape", `url("month-backgrounds/month-${String(date.getMonth()+1).padStart(2,"0")}.jpg")`);
    const monthLabel=date.toLocaleDateString("ru-RU",{month:"short"}).replace(".","");
    section.innerHTML=`<div class="day-content"><div class="tasks"></div></div><div class="day-title"><div class="day-date-side"><span class="day-weekday">${weekDays[i]}</span><div class="day-date-main"><span class="day-number">${date.getDate()}</span><span class="day-month" style="--month-season-color:${season.base}">${monthLabel}</span></div>${date.toDateString()===new Date().toDateString()?'<span class="day-star">★</span>':''}</div></div>`;
    if(taskView==="weekColumns"){
      // Левый столбец: Пн–Ср; правый: Чт–Вс.
      const positions=[ [1,1],[2,1],[3,1],[1,2],[2,2],[3,2],[4,2] ];
      section.style.gridRow=String(positions[i][0]);
      section.style.gridColumn=String(positions[i][1]);
      section.classList.add("week-column-day");
    }else{
      section.style.gridRow=""; section.style.gridColumn="";
      section.classList.remove("week-column-day");
    }
    planner.appendChild(section);
    const taskContainer=section.querySelector(".tasks");
    const settings=appData.settings||{};
    const isTwoColumns=taskView==="weekColumns";
    const savedLimit=isTwoColumns?(settings.maxDayTasksTwoColumns??settings.maxDayTasks):(settings.maxDayTasksOneColumn??settings.maxDayTasks);
    const allowedLimits=isTwoColumns?[4,5,6,7,8,9,10,11,12]:[4,6,12];
    const configuredTaskLimit=allowedLimits.includes(Number(savedLimit))?Number(savedLimit):(isTwoColumns?6:6);
    // Sunday is fitted after layout measurement; other days follow the selected limit.
    const visibleTaskLimit=(i===6 && isTwoColumns)?getTasks(key).length:configuredTaskLimit;
    taskContainer.style.setProperty("--day-task-limit", configuredTaskLimit);
    taskContainer.dataset.taskLimit=String(configuredTaskLimit);
    loadTasks(key,taskContainer);
    // Only uncolored tasks inherit the month's soft tint. Explicit user colors remain untouched.
    [...taskContainer.children].forEach((task,idx)=>{
      const item=getTasks(key)[idx];
      if(!item?.cardColor){task.classList.add("seasonal-task-default");task.style.setProperty("--season-task-tint",season.tint);task.style.setProperty("--season-task-accent",season.base);}
    });
    const actualVisibleCount=Math.min(getTasks(key).length,visibleTaskLimit);
    taskContainer.style.setProperty("--day-task-count", Math.max(1,actualVisibleCount));
    [...taskContainer.children].forEach((task,idx)=>{
      task.style.setProperty("display",idx<visibleTaskLimit?"flex":"none","important");
    });
    sections.push({section,count});
  }
  planner.classList.remove("week-normal","week-compact","week-ultra");
  planner.classList.add(maxTasks>=7?"week-ultra":maxTasks>=4?"week-compact":"week-normal");
  if(listMode){
    sections.forEach(({section,count})=>{
      section.classList.add("list-day"); section.style.flex="1 1 0";
      section.style.setProperty("--list-count",count);
      section.classList.toggle("list-two-columns",count>=3&&count<=4);
      section.classList.toggle("list-three-columns",count>=5);
      section.classList.toggle("list-dense",count>=6);
      section.classList.toggle("list-ultra",count>=9);
    });
  }else{
    sections.forEach(({section})=>{
      section.classList.remove("list-day","list-two-columns","list-dense","list-ultra");
      section.style.flex=""; section.style.removeProperty("--list-count");
    });
  }
  if(taskView==="weekColumns"){
    const days=Array.from(planner.querySelectorAll(":scope > .day"));
    const left=document.createElement("div"); left.className="week-column-stack week-column-left";
    const right=document.createElement("div"); right.className="week-column-stack week-column-right";
    days.forEach((day,i)=>{ day.style.gridRow=""; day.style.gridColumn=""; day.classList.add("week-column-day"); (i<3?left:right).appendChild(day); });
    planner.replaceChildren(left,right);
  }
  updateDayStatus(); activateDays();
  if(taskView==="weekColumns") requestAnimationFrame(applyTwoColumnTaskSizing);
}
function applyTwoColumnTaskSizing(){
  if(!planner.classList.contains("week-columns"))return;
  const settings=appData.settings||{};
  const limit=Math.max(4,Math.min(12,Number(settings.maxDayTasksTwoColumns??settings.maxDayTasks)||6));
  const days=[...planner.querySelectorAll(".week-column-stack>.day")];
  if(!days.length)return;
  const gap=2;
  let sharedRowHeight=0;
  // Use Thursday–Saturday as the reference: these three day cards have equal height.
  const reference=days.find(day=>{const d=new Date(day.dataset.date+"T12:00:00");return d.getDay()===4;})||days[0];
  const refTasks=reference.querySelector(".tasks");
  const available=refTasks?refTasks.clientHeight:0;
  sharedRowHeight=Math.max(18,Math.floor((available-gap*(limit-1))/limit));
  planner.style.setProperty("--week-task-row-height",sharedRowHeight+"px");
  planner.style.setProperty("--week-task-gap",gap+"px");
  days.forEach(day=>{
    const container=day.querySelector(".tasks");if(!container)return;
    const isSunday=new Date(day.dataset.date+"T12:00:00").getDay()===0;
    container.style.setProperty("--day-task-limit",String(limit));
    container.querySelectorAll(".task").forEach((task,index)=>{
      const fits=isSunday?index<Math.floor((container.clientHeight+gap)/(sharedRowHeight+gap)):index<limit;
      task.style.setProperty("display",fits?"flex":"none","important");
      task.style.setProperty("height",sharedRowHeight+"px","important");
      task.style.setProperty("min-height",sharedRowHeight+"px","important");
      task.style.setProperty("max-height",sharedRowHeight+"px","important");
    });
  });
}

function activateDays(){
  document.querySelectorAll(".day").forEach(day=>{
    day.onclick=e=>{
      if(e.target.closest(".task,.task-menu,input,button,a,textarea,select")) return;
      selectedDate=day.dataset.date;
      document.querySelectorAll(".day").forEach(x=>x.classList.remove("selected-day"));
      day.classList.add("selected-day");
      openDayPopup(selectedDate);
    };
  });
}
function getRussianTaskWord(n){const n10=n%10,n100=n%100;if(n10===1&&n100!==11)return "дело";if(n10>=2&&n10<=4&&(n100<12||n100>14))return "дела";return "дел";}
function openDayPopup(dateKey){
  closeDayPopup();
  const list=getTasks(dateKey)||[];
  const d=new Date(dateKey+"T12:00:00");
  const weekday=d.toLocaleDateString("ru-RU",{weekday:"long"});
  const dateText=d.toLocaleDateString("ru-RU",{day:"numeric",month:"long"});
  const overlay=document.createElement("div");
  overlay.className="day-popup-overlay";
  overlay.dataset.date=dateKey;
  const title=weekday.charAt(0).toUpperCase()+weekday.slice(1)+", "+dateText;
  const rows=list.map((t,index)=>{
    const priority=t.priority||"normal", done=t.done?" done":"";
    const time=t.time?`<span class="day-popup-time">${escapeHtml(t.time)}</span>`:"";
    return `<div class="day-popup-task-row ${priority}${done}" data-index="${index}">
      <button type="button" class="day-popup-task ${priority}${done}" data-index="${index}" aria-label="Открыть задачу ${escapeHtml(t.text||"")}">
        ${time}<span class="day-popup-text">${escapeHtml(t.text||"")}</span>
      </button>
      <div class="day-popup-actions">
        <button type="button" class="day-popup-action day-popup-edit" data-action="edit" data-index="${index}" aria-label="Редактировать только это событие" title="Редактировать это событие">✏️</button>
        ${t.recurrenceId ? `<button type="button" class="day-popup-action day-popup-chain" data-action="chain-menu" data-index="${index}" aria-label="Действия с цепочкой повторений" title="Действия с повторениями"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.07 0l2-2a5 5 0 0 0-7.07-7.07l-1.15 1.15"/><path d="M14 11a5 5 0 0 0-7.07 0l-2 2A5 5 0 0 0 12 20.07l1.15-1.15"/></svg></button>` : `<button type="button" class="day-popup-action day-popup-delete" data-action="delete" data-index="${index}" aria-label="Удалить это событие" title="Удалить событие"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v5m4-5v5"/></svg></button>`}
      </div>
    </div>`;
  }).join("");
  overlay.innerHTML=`<div class="day-popup" role="dialog" aria-modal="true">
    <div class="day-popup-head"><div><div class="day-popup-title">${title}</div><div class="day-popup-subtitle">${list.length?list.length+" "+getRussianTaskWord(list.length)+" на этот день":"День свободен"}</div></div><button class="day-popup-close" type="button" aria-label="Закрыть">×</button></div>
    <div class="day-popup-list">${rows||'<div class="day-popup-empty">Пока нет задач ✨</div>'}</div>
    <button class="day-popup-add" type="button">＋ Добавить задачу</button>
  </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector(".day-popup-close").onclick=e=>{e.stopPropagation();closeDayPopup()};
  overlay.querySelector(".day-popup-add").onclick=e=>{
    e.preventDefault();
    e.stopPropagation();
    selectedDate=dateKey;
    // Открываем именно форму, а не функцию addTask(), которая может
    // сразу сохранить задачу без показа формы.
    selectedDate=dateKey;
    closeDayPopup();
    const modal=document.getElementById("taskModal");
    if(modal){
      modal.dataset.editDate="";
      modal.dataset.editIndex="";
      modal.dataset.editChain="0";
      document.getElementById("taskModalTitle").textContent="Новая задача";
      document.getElementById("newTaskInput").value="";
      document.getElementById("newTaskTime").value="";
      setTaskCardColor(appData.settings.newTaskCardColor||getTaskCardColor()||"soft-blue");
      document.getElementById("repeatTask").checked=false;
      document.getElementById("repeatOptions").classList.add("hidden");
      document.getElementById("recurrenceBox").classList.remove("hidden");
      const until=new Date(dateKey+"T12:00:00");
      until.setFullYear(until.getFullYear()+1);
      document.getElementById("repeatUntil").value=localKey(until);
      modal.classList.remove("hidden");
      setTimeout(()=>document.getElementById("newTaskInput").focus(),50);
    }
  };
  overlay.querySelectorAll('.day-popup-task, .day-popup-action').forEach(button=>button.onclick=e=>{
    e.preventDefault();
    e.stopPropagation();
    selectedDate=dateKey;
    const index=Number(button.dataset.index);
    const task=(getTasks(dateKey)||[])[index];
    if(!task) return;
    if(button.dataset.action === "chain-menu"){
      const row=button.closest(".day-popup-task-row");
      const existing=row.querySelector(".chain-action-menu");
      if(existing){existing.remove();return;}
      overlay.querySelectorAll(".chain-action-menu").forEach(x=>x.remove());
      const menu=document.createElement("div");
      menu.className="chain-action-menu";
      menu.innerHTML=`<button type="button" data-chain-action="edit-one"><span>✎</span><span>Изменить это событие</span></button><button type="button" data-chain-action="edit-all"><span>⛓</span><span>Изменить всю цепочку</span></button><button type="button" data-chain-action="delete-one"><span>⌫</span><span>Удалить это событие</span></button><button type="button" data-chain-action="delete-all" class="danger"><span>⛓</span><span>Удалить всю цепочку</span></button>`;
      menu.style.position="fixed";
      menu.style.zIndex="100000";
      document.body.appendChild(menu);
      const placeChainMenu=()=>{
        const r=button.getBoundingClientRect();
        const mw=Math.min(270,window.innerWidth-24), mh=menu.offsetHeight||180;
        let left=Math.max(12,Math.min(window.innerWidth-mw-12,r.right-mw));
        let top=r.bottom+8;
        if(top+mh>window.innerHeight-12)top=Math.max(12,r.top-mh-8);
        menu.style.width=mw+"px";menu.style.left=left+"px";menu.style.top=top+"px";
      };
      placeChainMenu();
      const dismissMenu=ev=>{if(!menu.contains(ev.target)&&ev.target!==button){menu.remove();document.removeEventListener("pointerdown",dismissMenu,true);window.removeEventListener("resize",placeChainMenu);overlay.removeEventListener("scroll",placeChainMenu,true);}};
      setTimeout(()=>document.addEventListener("pointerdown",dismissMenu,true),0);
      window.addEventListener("resize",placeChainMenu);overlay.addEventListener("scroll",placeChainMenu,true);
      menu.querySelectorAll("button").forEach(item=>item.addEventListener("click",ev=>{
        ev.preventDefault();ev.stopPropagation();
        const choice=item.dataset.chainAction;menu.remove();
        if(choice==="edit-one"){closeDayPopup();openTaskEditor(dateKey,index);return;}
        if(choice==="edit-all"){
          if(!task.recurrenceId||typeof getRecurrence!=="function"){alert("Не удалось определить цепочку повторений.");return;}
          closeDayPopup();openTaskEditor(dateKey,index);const modal=document.getElementById("taskModal");modal.dataset.editChain="1";document.getElementById("taskModalTitle").textContent="Изменить цепочку";document.getElementById("chainEditHint").classList.remove("hidden");return;
        }
        if(choice==="delete-one"){
          if(!confirm("Удалить только это событие? Остальные повторения останутся."))return;
          const dayTasks=getTasks(dateKey)||[];dayTasks.splice(index,1);if(!dayTasks.length&&tasks[dateKey])delete tasks[dateKey];if(typeof saveStorage==="function")saveStorage();if(typeof renderWeek==="function")renderWeek();openDayPopup(dateKey);return;
        }
        if(choice==="delete-all"){
          if(!confirm("Удалить всю цепочку повторений? Это действие нельзя отменить."))return;
          if(typeof deleteRecurringChain==="function")deleteRecurringChain(task.recurrenceId);if(typeof renderWeek==="function")renderWeek();openDayPopup(dateKey);
        }
      }));
      return;
    }
    if(button.dataset.action === "edit-chain"){
      if(!task.recurrenceId || typeof getRecurrence !== "function"){
        alert("Не удалось определить цепочку повторений. Обновите страницу и попробуйте ещё раз.");
        return;
      }
      closeDayPopup();
      openTaskEditor(dateKey,index);
      const modal=document.getElementById("taskModal");
      modal.dataset.editChain="1";
      document.getElementById("taskModalTitle").textContent="Редактировать цепочку повторений";
      document.getElementById("chainEditHint").classList.remove("hidden");
      return;
    }
    if(button.dataset.action === "delete-chain"){
      if(!task.recurrenceId || typeof deleteRecurringChain !== "function"){
        alert("Не удалось определить цепочку этого события. Обновите страницу и попробуйте ещё раз.");
        return;
      }
      const label=task.text ? `«${task.text}»` : "эту цепочку событий";
      if(!confirm(`Удалить ВСЕ события цепочки ${label}? Это действие нельзя отменить.`)) return;
      try{
        deleteRecurringChain(task.recurrenceId);
        if(typeof renderWeek === "function") renderWeek();
        openDayPopup(dateKey);
      }catch(err){
        console.error("MaDenFlow: ошибка удаления цепочки событий",err);
        alert("Не удалось удалить цепочку событий. Попробуйте ещё раз.");
      }
      return;
    }
    if(button.dataset.action === "delete"){
      const label=task.text ? `«${task.text}»` : "это событие";
      if(!confirm(`Удалить только ${label}? Остальные события цепочки останутся.`)) return;
      try{
        const dayTasks=getTasks(dateKey);
        if(!Array.isArray(dayTasks)) throw new Error("Список задач дня недоступен");
        dayTasks.splice(index,1);
        if(!dayTasks.length && tasks[dateKey]) delete tasks[dateKey];
        if(typeof saveStorage === "function") saveStorage();
        if(typeof renderWeek === "function") renderWeek();
        openDayPopup(dateKey);
      }catch(err){
        console.error("MaDenFlow: ошибка удаления события",err);
        alert("Не удалось удалить событие. Попробуйте ещё раз.");
      }
      return;
    }
    openTaskEditor(dateKey,index);
  });
  overlay.addEventListener("click",e=>{if(e.target===overlay)closeDayPopup()});
}
function openTaskEditor(dateKey,index){
  const task=(getTasks(dateKey)||[])[index];
  if(!task) return;
  const modal=document.getElementById("taskModal");
  modal.dataset.editDate=dateKey; modal.dataset.editIndex=String(index); modal.dataset.editChain="0";
  document.getElementById("taskModalTitle").textContent="Изменить задачу";
  document.getElementById("newTaskInput").value=task.text||"";
  document.getElementById("newTaskTime").value=task.time||"";
  setTaskCardColor(task.cardColor||"soft-blue");
  const recurrence=task.recurrenceId&&typeof getRecurrence==="function"?getRecurrence(task.recurrenceId):null;
  document.getElementById("repeatTask").checked=!!recurrence;
  document.getElementById("recurrenceBox").classList.remove("hidden");
  document.getElementById("repeatOptions").classList.toggle("hidden",!recurrence);
  document.getElementById("repeatType").value=recurrence?.type||"weekly";
  document.getElementById("repeatUntil").value=recurrence?.until||"";
  document.querySelectorAll(".repeat-weekday").forEach(x=>x.checked=!!recurrence?.weekdays?.includes(Number(x.value)));
  document.getElementById("repeatWeekdays").classList.toggle("hidden",(recurrence?.type||"")!=="customDays");
  document.getElementById("chainEditHint").classList.add("hidden");
  modal.classList.remove("hidden");
  setTimeout(()=>document.getElementById("newTaskInput").focus(),50);
}
// Показываем параметры повторения только по запросу пользователя.
const repeatToggle=document.getElementById("repeatTask");
const repeatTypeSelect=document.getElementById("repeatType");
if(repeatToggle){repeatToggle.addEventListener("change",()=>{
  document.getElementById("repeatOptions").classList.toggle("hidden",!repeatToggle.checked);
});}
if(repeatTypeSelect){repeatTypeSelect.addEventListener("change",()=>{
  document.getElementById("repeatWeekdays").classList.toggle("hidden",repeatTypeSelect.value!=="customDays");
});}

// Six soft card colors are selectable in the create/edit task form.
const TASK_CARD_COLORS=["soft-blue","soft-green","soft-orange","soft-pink","soft-purple","soft-teal"];
function getTaskCardColor(){const selected=document.querySelector("#taskCardColorPicker .task-card-color.is-selected");return selected?.dataset.cardColor||"soft-blue";}
function setTaskCardColor(color){const safe=TASK_CARD_COLORS.includes(color)?color:"soft-blue";document.querySelectorAll("#taskCardColorPicker .task-card-color").forEach(btn=>{const active=btn.dataset.cardColor===safe;btn.classList.toggle("is-selected",active);btn.setAttribute("aria-pressed",active?"true":"false")});}
document.querySelectorAll("#taskCardColorPicker .task-card-color").forEach(btn=>btn.addEventListener("click",()=>{const color=btn.dataset.cardColor;setTaskCardColor(color);appData.settings.newTaskCardColor=color;saveStorage();}));

// Сохранение и отмена задачи. Этот обработчик должен находиться в app.js,
// потому что именно здесь открывается форма taskModal.
const saveTaskButton=document.getElementById("saveTaskBtn");
if(saveTaskButton){
  saveTaskButton.onclick=function(e){
    e.preventDefault();
    e.stopPropagation();
    const modal=document.getElementById("taskModal");
    const input=document.getElementById("newTaskInput");
    const time=document.getElementById("newTaskTime");
    const text=(input.value||"").trim();
    if(!selectedDate){
      const dayPopup=document.querySelector(".day-popup-overlay");
      if(dayPopup) selectedDate=dayPopup.dataset.date||null;
    }
    if(!selectedDate){ alert("Сначала выберите день для задачи."); return; }
    if(!text){ input.focus(); return; }
    const editDate=modal.dataset.editDate||"";
    const editIndex=modal.dataset.editIndex||"";
    const editChain=modal.dataset.editChain==="1";
    try{
      if(editDate!=="" && editIndex!==""){
        const task=(getTasks(editDate)||[])[Number(editIndex)];
        if(editChain && task && task.recurrenceId && typeof editRecurringChain==="function"){
          if(!document.getElementById("repeatTask").checked){alert("Чтобы изменить всю цепочку, оставьте включённым «Повторять задачу». Для изменения только одного события используйте «Редактировать». ");return;}
          const repeatType=document.getElementById("repeatType").value;
          const days=[...document.querySelectorAll(".repeat-weekday:checked")].map(x=>Number(x.value));
          if(repeatType==="customDays"&&!days.length){alert("Выберите хотя бы один день недели.");return;}
          editRecurringChain(task.recurrenceId,text,time.value);
          if(typeof updateRecurringChain==="function") updateRecurringChain(task.recurrenceId,repeatType,days,document.getElementById("repeatUntil").value);
        }else if(typeof editTask==="function"){
          editTask(editDate,Number(editIndex),text,time.value);
        }else{ alert("Не удалось найти функцию редактирования задачи."); return; }
      }else if(document.getElementById("repeatTask").checked){
        if(typeof addRecurringTask!=="function"){ alert("Функция повторяющихся задач недоступна."); return; }
        const repeatType=document.getElementById("repeatType").value;
        const repeatDays=[...document.querySelectorAll(".repeat-weekday:checked")].map(x=>Number(x.value));
        if(repeatType==="customDays"&&!repeatDays.length){alert("Выберите хотя бы один день недели.");return;}
        const recurrenceId=addRecurringTask(selectedDate,text,repeatType,document.getElementById("repeatUntil").value,time.value,repeatDays);
        if(recurrenceId){Object.keys(tasks).forEach(dayKey=>(tasks[dayKey]||[]).forEach(item=>{if(item.recurrenceId===recurrenceId)item.cardColor=getTaskCardColor();}));if(typeof saveStorage==="function")saveStorage();}
      }else{
        if(typeof addTask!=="function"){ alert("Функция сохранения задач недоступна."); return; }
        addTask(selectedDate,text,{time:time.value,cardColor:getTaskCardColor()});
      }
      if(editDate!=="" && editIndex!==""){
        const edited=(getTasks(editDate)||[])[Number(editIndex)];
        if(edited){
          const cardColor=getTaskCardColor();
          if(editChain && edited.recurrenceId){
            Object.keys(tasks).forEach(dayKey=>(tasks[dayKey]||[]).forEach(item=>{if(item.recurrenceId===edited.recurrenceId)item.cardColor=cardColor;}));
          }else edited.cardColor=cardColor;
          if(typeof saveStorage==="function")saveStorage();
        }
      }
      modal.classList.add("hidden");
      modal.dataset.editDate=""; modal.dataset.editIndex=""; modal.dataset.editChain="0";
      if(typeof renderWeek==="function") renderWeek();
    }catch(err){
      console.error("MaDenFlow: ошибка сохранения задачи",err);
      alert("Не удалось сохранить задачу. Проверьте подключение файла tasks.js и попробуйте ещё раз.");
    }
  };
}
const cancelTaskButton=document.getElementById("cancelTaskBtn");
if(cancelTaskButton){
  cancelTaskButton.onclick=function(e){
    e.preventDefault();
    const modal=document.getElementById("taskModal");
    modal.classList.add("hidden");
    modal.dataset.editDate=""; modal.dataset.editIndex=""; modal.dataset.editChain="0";
  };
}

function closeDayPopup(){
  document.querySelectorAll(".day-popup-overlay").forEach(p=>p.remove());
}
// Надёжное закрытие окна дня: крестик, тап по фону и Escape.
document.addEventListener("click",function(e){
  const overlay=e.target.closest && e.target.closest(".day-popup-overlay");
  if(!overlay) return;
  if(e.target.closest(".day-popup-close") || e.target===overlay){
    e.preventDefault();
    e.stopPropagation();
    closeDayPopup();
  }
},true);
document.addEventListener("keydown",function(e){
  if(e.key==="Escape" && document.querySelector(".day-popup-overlay")) closeDayPopup();
});
function activateAddButtons(){}
function changeWeek(n){currentDate.setDate(currentDate.getDate()+n*7);renderWeek()}
function updateDayStatus(){document.querySelectorAll(".day-status").forEach(s=>{const list=getTasks(s.dataset.date)||[];s.textContent=!list.length?"⚪":list.every(x=>x.done)?"🟢":"🟡"})}
// Календарь
function openCalendar(){calendarCursor=new Date(currentDate);renderCalendar();document.getElementById("calendarModal").classList.remove("hidden")}
function renderCalendar(){const y=calendarCursor.getFullYear(),m=calendarCursor.getMonth();document.getElementById("calendarTitle").textContent=new Date(y,m,1).toLocaleDateString("ru-RU",{month:"long",year:"numeric"});const grid=document.getElementById("calendarGrid");grid.innerHTML=weekDays.map(d=>`<div class="cal-weekday">${d}</div>`).join("");const first=(new Date(y,m,1).getDay()||7)-1,days=new Date(y,m+1,0).getDate();for(let i=0;i<first;i++)grid.insertAdjacentHTML("beforeend",`<div class="cal-empty"></div>`);for(let day=1;day<=days;day++){const d=new Date(y,m,day),key=localKey(d),btn=document.createElement("button");btn.className="cal-day";if(d.toDateString()===new Date().toDateString())btn.classList.add("today");if(d>=getMonday(currentDate)&&d<=new Date(getMonday(currentDate).getFullYear(),getMonday(currentDate).getMonth(),getMonday(currentDate).getDate()+6))btn.classList.add("in-week");btn.textContent=day;btn.onclick=()=>{currentDate=d;renderWeek();document.getElementById("calendarModal").classList.add("hidden")};grid.appendChild(btn)}}
document.getElementById("calendarBtn").onclick=openCalendar;document.getElementById("calendarPrev").onclick=()=>{calendarCursor.setMonth(calendarCursor.getMonth()-1);renderCalendar()};document.getElementById("calendarNext").onclick=()=>{calendarCursor.setMonth(calendarCursor.getMonth()+1);renderCalendar()};document.getElementById("calendarToday").onclick=()=>{currentDate=new Date();renderWeek();document.getElementById("calendarModal").classList.add("hidden")};document.getElementById("calendarClose").onclick=()=>document.getElementById("calendarModal").classList.add("hidden");
// Служение
 document.getElementById("serviceBtn").onclick=()=>openService(localKey(currentDate).slice(0,7));
// Настройки
const settingsModal=document.getElementById("settingsModal");
function applySettings(){
  const settings=appData.settings||{};
  if(settings.taskView==="list") settings.taskView="cards";
  document.body.classList.toggle("dark",!!settings.darkMode);
  document.body.dataset.theme=settings.theme||"standard";
  document.body.dataset.glassTheme=settings.theme==="glass"?"on":"off";
  document.body.dataset.colorTheme=settings.theme!=="glass"?"on":"off";
  document.body.dataset.scenicGlass=settings.scenicGlass===false?"off":"on";
  document.body.style.setProperty("--day-card-blur",(settings.theme==="glass"?Number(settings.dayCardBlur ?? 16):0)+"px");
  const matteLevel=Math.max(0,Math.min(100,Number(settings.glassMatte ?? 65)));
  document.body.style.setProperty("--glass-matte-alpha",(0.12+(matteLevel/100)*0.68).toFixed(3));
  document.body.dataset.fontSize=settings.fontSize||"medium";
  document.body.dataset.plannerFontSize=settings.plannerFontSize||settings.fontSize||"medium";
  document.body.dataset.taskFontSize=settings.taskFontSize||settings.fontSize||"medium";
  document.body.dataset.gradient=settings.gradientDays?"on":"off";
  document.body.dataset.taskView=settings.taskView==="weekColumns"?"weekColumns":"cards";
  const activeLimit=(settings.taskView==="weekColumns"?(settings.maxDayTasksTwoColumns??settings.maxDayTasks):(settings.maxDayTasksOneColumn??settings.maxDayTasks));
  document.body.dataset.taskCapacity=String(Number(activeLimit)||6);
  document.body.dataset.listTextColor=settings.listTextColor||"navy";
  document.body.dataset.sidebarColor=settings.sidebarColor||"bluegray";
  const custom=settings.theme==="custom" && settings.appearance;
  document.body.dataset.customAppearance=custom?"on":"off";
  document.body.dataset.appearanceOverrides="on";
  const a=settings.appearance||{};
  const root=document.documentElement.style;
  root.setProperty("--custom-bg",a.bg||"#eef3fb");
  root.setProperty("--custom-weekday",a.weekday||"#dce7fa");
  root.setProperty("--custom-weekend",a.weekend||"#f5dce9");
  root.setProperty("--custom-card",a.card||"#ffffff");
  root.setProperty("--custom-text",a.text||"#26364d");
  root.setProperty("--custom-sidebar",a.sidebar||"#e0e8f2");
  root.setProperty("--custom-card-alpha",String(Number(a.opacity??100))+"%");
  root.setProperty("--custom-card-radius",(a.radius||14)+"px");
  root.setProperty("--custom-task-font",(a.font||15)+"px");
  root.setProperty("--week-task-font",(a.font||15)+"px");
  root.setProperty("--week-task-time-font",Math.max(10,Math.round((a.font||15)*0.82))+"px");
  root.setProperty("--custom-weekday-size",(a.weekdaySize||20)+"px");
  root.setProperty("--custom-date-size",(a.dateSize||30)+"px");
  root.setProperty("--custom-month-size",(a.monthSize||14)+"px");
  if(settings.appearance?.dateColor) root.setProperty("--custom-date-color",a.dateColor); else root.removeProperty("--custom-date-color");
  root.setProperty("--custom-week-text-color",a.weekTextColor||"#26364d");
  root.setProperty("--custom-time-color",a.timeColor||"#26364d");
  if(settings.appearance?.headerColor) root.setProperty("--custom-header-color",a.headerColor); else root.removeProperty("--custom-header-color");
  if(settings.appearance?.calendarSize) root.setProperty("--custom-calendar-font",a.calendarSize+"px"); else root.removeProperty("--custom-calendar-font");
  document.body.dataset.weekTextMode=a.systemText||"system";
  document.body.dataset.timeTextMode=a.timeMode||"auto";
  root.setProperty("--task-time-color",a.timeMode==="custom"?(a.timeColor||"#26364d"):(a.timeMode==="system"?(a.text||"#26364d"):"#26364d"));
}
function updateNotificationStatus(){
  const el=document.getElementById("notificationStatus");
  if(!el)return;
  if(!("Notification" in window)){el.textContent="Этот браузер не поддерживает уведомления.";return}
  if(Notification.permission==="denied"){el.textContent="Уведомления запрещены в настройках браузера.";return}
  el.textContent=appData.settings.notifications?(Notification.permission==="granted"?"Уведомления включены.":"Нужно разрешить уведомления браузеру."):"Уведомления выключены.";
}
function openSettings(){
  document.getElementById("darkModeToggle").checked=!!appData.settings.darkMode;
  document.getElementById("themeSelect").value=appData.settings.theme||"standard";
  const sidebarColorSelect=document.getElementById("sidebarColorSelect");
  if(sidebarColorSelect) sidebarColorSelect.value=appData.settings.sidebarColor||"bluegray";
  document.getElementById("gradientDaysToggle").checked=!!appData.settings.gradientDays;
  document.getElementById("taskViewSelect").value=appData.settings.taskView==="weekColumns"?"weekColumns":"cards";
  syncTaskCapacityOptions();
  const listColorSelect=document.getElementById("listTextColorSelect");
  if(listColorSelect) listColorSelect.value=appData.settings.listTextColor||"navy";
  document.getElementById("notificationsToggle").checked=!!appData.settings.notifications;
  document.getElementById("accountEmail").value=appData.settings.email||"";
  document.getElementById("accountStatus").textContent=appData.settings.email?`Email сохранён: ${appData.settings.email}`:"Email не подключён";
  updateNotificationStatus();
  settingsModal.classList.remove("hidden");
}
document.getElementById("settingsBtn").onclick=openSettings;
document.getElementById("settingsClose").onclick=()=>settingsModal.classList.add("hidden");
document.getElementById("darkModeToggle").onchange=e=>{appData.settings.darkMode=e.target.checked;applySettings();saveStorage()};
document.getElementById("gradientDaysToggle").onchange=e=>{appData.settings.gradientDays=e.target.checked;applySettings();saveStorage()};
document.getElementById("themeSelect").onchange=e=>{document.getElementById("appearanceModal").dataset.activeTheme=e.target.value;appData.settings.theme=e.target.value;appData.settings.scenicGlass=e.target.value==="glass";if(e.target.value==="custom"){appData.settings.appearance=appData.settings.appearance||{bg:"#eef3fb",weekday:"#dce7fa",weekend:"#f5dce9",card:"#ffffff",text:"#26364d",sidebar:"#e0e8f2",font:15,opacity:100,radius:14,weekdaySize:20,dateSize:30,monthSize:14,systemText:"system",weekTextColor:"#26364d",timeMode:"auto",timeColor:"#26364d"};}applySettings();saveStorage();updateAppearancePreview();};
const sidebarColorSelect=document.getElementById("sidebarColorSelect");
if(sidebarColorSelect) sidebarColorSelect.onchange=e=>{appData.settings.sidebarColor=e.target.value;applySettings();saveStorage()};
function syncTaskCapacityOptions(){
  const select=document.getElementById("maxDayTasksSelect");
  if(!select)return;
  const twoColumns=(appData.settings.taskView==="weekColumns");
  const values=twoColumns?[4,5,6,7,8,9,10,11,12]:[4,6,12];
  const key=twoColumns?"maxDayTasksTwoColumns":"maxDayTasksOneColumn";
  const legacy=Number(appData.settings.maxDayTasks);
  let selected=Number(appData.settings[key]);
  if(!values.includes(selected)) selected=values.includes(legacy)?legacy:6;
  if(!values.includes(selected)) selected=values[0];
  appData.settings[key]=selected;
  select.innerHTML=values.map(n=>`<option value="${n}">${n} дел</option>`).join("");
  select.value=String(selected);
  const hint=document.getElementById("maxDayTasksHint");
  if(hint)hint.textContent=twoColumns
    ?"В двух колонках доступны 4–12 дел. Высота записи зависит от выбранной плотности; воскресенье подстраивается автоматически."
    :"В одной колонке доступны 4, 6 или 12 дел. Воскресенье показывает столько записей, сколько помещается.";
}
document.getElementById("taskViewSelect").onchange=e=>{
  appData.settings.taskView=e.target.value==="weekColumns"?"weekColumns":"cards";
  syncTaskCapacityOptions();applySettings();saveStorage();renderWeek();
};
const maxDayTasksSelect=document.getElementById("maxDayTasksSelect");
if(maxDayTasksSelect) maxDayTasksSelect.onchange=e=>{
  const twoColumns=appData.settings.taskView==="weekColumns";
  appData.settings[twoColumns?"maxDayTasksTwoColumns":"maxDayTasksOneColumn"]=Number(e.target.value);
  applySettings();saveStorage();renderWeek();
};
const listTextColorSelect=document.getElementById("listTextColorSelect");
if(listTextColorSelect) listTextColorSelect.onchange=e=>{appData.settings.listTextColor=e.target.value;applySettings();saveStorage()};

// Оформление: ручные параметры применяются сразу и сохраняются локально.
const appearanceModal=document.getElementById("appearanceModal");
const appearanceDefaults={bg:"#eef3fb",weekday:"#dce7fa",weekend:"#f5dce9",card:"#ffffff",text:"#26364d",sidebar:"#e0e8f2",font:15,opacity:100,radius:14,weekdaySize:20,dateSize:20,monthSize:14,dateColor:"#26364d",systemText:"system",weekTextColor:"#26364d",timeMode:"auto",timeColor:"#26364d"};
function getAppearance(){return {...appearanceDefaults,...(appData.settings.appearance||{})};}
function updateAppearancePreview(){
  const a=getAppearance();
  const glassOn=appData.settings?.theme==="glass";
  document.getElementById("appearanceModal").dataset.activeTheme=appData.settings?.theme||"standard";
  const swatches=document.querySelector(".appearance-swatches");
  if(swatches) swatches.hidden=glassOn;
  const themeSelect=document.getElementById("themeSelect");
  if(themeSelect && appData.settings?.theme) themeSelect.value=appData.settings.theme;
  const matte=Math.max(0,Math.min(100,Number(appData.settings?.glassMatte ?? 65)));
  const blur=Math.max(0,Math.min(32,Number(appData.settings?.dayCardBlur ?? 16)));
  const alpha=0.12+(matte/100)*0.68;
  document.documentElement.style.setProperty("--glass-matte-alpha", alpha.toFixed(3));
  document.documentElement.style.setProperty("--day-card-blur", blur+"px");
  const preview=document.getElementById("appearancePreview");
  if(!preview)return;
  const landscape=`url("month-backgrounds/month-${String((currentDate||new Date()).getMonth()+1).padStart(2,"0")}.jpg")`;
  preview.style.backgroundImage=`linear-gradient(rgba(238,244,252,.08),rgba(238,244,252,.08)), ${landscape}`;
  preview.style.backgroundSize="cover";
  preview.style.backgroundPosition="center";
  preview.style.color=a.text;
  preview.style.borderRadius=a.radius+"px";
  preview.style.setProperty("--glass-matte-alpha", alpha.toFixed(3));
  preview.style.setProperty("--day-card-blur", blur+"px");
  const day=preview.querySelector(".appearance-preview-day");
  const isGlass=appData.settings?.theme==="glass";
  preview.style.setProperty("--custom-header-color",a.headerColor||"rgba(255,255,255,.48)");
  preview.style.setProperty("--custom-calendar-font",(a.calendarSize||16)+"px");
  const customTheme=appData.settings?.theme==="custom";
  const weekdayColor=customTheme?a.weekday:(getComputedStyle(document.body).getPropertyValue("--weekday").trim()||a.weekday);
  const weekendColor=customTheme?a.weekend:(getComputedStyle(document.body).getPropertyValue("--weekend").trim()||a.weekend);
  const cardColor=customTheme?a.card:(getComputedStyle(document.body).getPropertyValue("--custom-card").trim()||a.card);
  if(day){
    day.style.background=customTheme?(a.headerColor||weekdayColor):(isGlass?`rgba(238,244,252,${alpha.toFixed(3)})`:weekdayColor);
    day.style.backgroundImage="none";
    day.style.backdropFilter=isGlass?`blur(${blur}px) saturate(118%)`:`none`;
    day.style.webkitBackdropFilter=isGlass?`blur(${blur}px) saturate(118%)`:`none`;
    day.style.border=customTheme?`1px solid ${weekdayColor}`:"1px solid rgba(255,255,255,.72)";
    day.style.boxShadow="inset 0 1px 0 rgba(255,255,255,.5)";
    day.style.borderRadius=Math.max(8,a.radius)+"px";
  }
  const date=preview.querySelector(".appearance-preview-date");
  if(date){date.style.color=a.dateColor||a.text;date.style.background=customTheme?weekendColor:(isGlass?`rgba(245,248,252,${Math.max(.2,alpha*.55).toFixed(3)})`:weekendColor);}
  const previewWeekday=preview.querySelector(".appearance-preview-date b");
  const previewNumber=preview.querySelector(".appearance-preview-date strong");
  const previewMonth=preview.querySelector(".appearance-preview-date small");
  if(previewWeekday)previewWeekday.style.fontSize=(a.weekdaySize||20)+"px";
  if(previewNumber)previewNumber.style.fontSize=(a.dateSize||30)+"px";
  if(previewMonth)previewMonth.style.fontSize=(a.monthSize||14)+"px";
  const tasks=preview.querySelectorAll(".appearance-preview-tasks > div");
  tasks.forEach((el,i)=>{el.style.background=customTheme?cardColor:(isGlass?`rgba(255,255,255,${alpha.toFixed(3)})`:cardColor);el.style.color=a.text;el.style.opacity=String(Number(a.opacity)/100);el.style.borderRadius=a.radius+"px";el.style.fontSize=a.font+"px";});
}

function openAppearance(){
  updateAppearancePreview();
  const a=getAppearance();
  for(const key of ["bg","weekday","weekend","card","text","sidebar"])document.getElementById("appearance"+key[0].toUpperCase()+key.slice(1)).value=a[key];
  document.getElementById("appearanceFont").value=a.font;document.getElementById("appearanceOpacity").value=a.opacity;document.getElementById("appearanceRadius").value=a.radius;
  document.getElementById("appearanceDayBlur").value=Number(appData.settings.dayCardBlur ?? 16);document.getElementById("appearanceDayBlurValue").textContent=Number(appData.settings.dayCardBlur ?? 16)+" px";
  document.getElementById("appearanceMatte").value=Number(appData.settings.glassMatte ?? 65);document.getElementById("appearanceMatteValue").textContent=Number(appData.settings.glassMatte ?? 65)+"%";
  document.getElementById("appearanceWeekdaySize").value=a.weekdaySize;document.getElementById("appearanceMonthSize").value=a.monthSize;document.getElementById("appearanceDateColor").value=a.dateColor||a.text;
  document.getElementById("appearanceHeaderColor").value=a.headerColor||"#dce7fa";document.getElementById("appearanceCalendarSize").value=a.calendarSize||16;document.getElementById("appearanceCalendarSizeValue").textContent=(a.calendarSize||16)+" px";
  document.getElementById("appearanceSystemText").value=a.systemText;document.getElementById("appearanceWeekTextColor").value=a.weekTextColor;
  document.getElementById("appearanceTimeMode").value=a.timeMode;document.getElementById("appearanceTimeColor").value=a.timeColor;
  document.getElementById("appearanceWeekTextColorRow").style.display=a.systemText==="custom"?"flex":"none";
  document.getElementById("appearanceTimeColorRow").style.display=a.timeMode==="custom"?"flex":"none";
  document.getElementById("appearanceFontValue").textContent=a.font+" px";document.getElementById("appearanceOpacityValue").textContent=a.opacity+"%";document.getElementById("appearanceRadiusValue").textContent=a.radius+" px";
  document.getElementById("appearanceWeekdaySizeValue").textContent=a.weekdaySize+" px";document.getElementById("appearanceMonthSizeValue").textContent=a.monthSize+" px";document.getElementById("appearanceCalendarSizeValue").textContent=(a.calendarSize||16)+" px";
  document.getElementById("themeSelect").value=appData.settings.theme||"standard";
  updateAppearancePreview();appearanceModal.classList.remove("hidden");
}

const dayBlurInput=document.getElementById("appearanceDayBlur");
const dayBlurValue=document.getElementById("appearanceDayBlurValue");
if(dayBlurInput){dayBlurInput.addEventListener("input",e=>{const v=Math.max(0,Math.min(32,Number(e.target.value)||0));appData.settings.dayCardBlur=v;if(dayBlurValue)dayBlurValue.textContent=v+" px";applySettings();saveStorage();updateAppearancePreview();});}
const matteInput=document.getElementById("appearanceMatte");
if(matteInput){matteInput.addEventListener("input",e=>{const v=Math.max(0,Math.min(100,Number(e.target.value)||0));appData.settings.glassMatte=v;const label=document.getElementById("appearanceMatteValue");if(label)label.textContent=v+"%";applySettings();saveStorage();updateAppearancePreview();});}
document.getElementById("appearanceBtn").onclick=openAppearance;
document.getElementById("appearanceClose").onclick=()=>appearanceModal.classList.add("hidden");
document.getElementById("appearanceDone").onclick=()=>appearanceModal.classList.add("hidden");
function changeAppearance(){
  const a={bg:document.getElementById("appearanceBg").value,weekday:document.getElementById("appearanceWeekday").value,weekend:document.getElementById("appearanceWeekend").value,card:document.getElementById("appearanceCard").value,text:document.getElementById("appearanceText").value,sidebar:document.getElementById("appearanceSidebar").value,font:Number(document.getElementById("appearanceFont").value),opacity:Number(document.getElementById("appearanceOpacity").value),radius:Number(document.getElementById("appearanceRadius").value),
    weekdaySize:Number(document.getElementById("appearanceWeekdaySize").value),dateSize:Number(document.getElementById("appearanceWeekdaySize").value),monthSize:Number(document.getElementById("appearanceMonthSize").value),dateColor:document.getElementById("appearanceDateColor").value,headerColor:document.getElementById("appearanceHeaderColor").value,calendarSize:Number(document.getElementById("appearanceCalendarSize").value),
    systemText:document.getElementById("appearanceSystemText").value,weekTextColor:document.getElementById("appearanceWeekTextColor").value,
    timeMode:document.getElementById("appearanceTimeMode").value,timeColor:document.getElementById("appearanceTimeColor").value};
  appData.settings.appearance={...(appData.settings.appearance||{}), ...a};
  document.getElementById("appearanceFontValue").textContent=a.font+" px";document.getElementById("appearanceOpacityValue").textContent=a.opacity+"%";document.getElementById("appearanceRadiusValue").textContent=a.radius+" px";
  document.getElementById("appearanceWeekdaySizeValue").textContent=a.weekdaySize+" px";document.getElementById("appearanceMonthSizeValue").textContent=a.monthSize+" px";document.getElementById("appearanceCalendarSizeValue").textContent=(a.calendarSize||16)+" px";
  applySettings();saveStorage();updateAppearancePreview();
}
["appearanceBg","appearanceWeekday","appearanceWeekend","appearanceCard","appearanceText","appearanceSidebar","appearanceFont","appearanceOpacity","appearanceRadius","appearanceWeekdaySize","appearanceMonthSize","appearanceDateColor","appearanceWeekTextColor","appearanceTimeColor","appearanceHeaderColor","appearanceCalendarSize"].forEach(id=>document.getElementById(id).addEventListener("input",changeAppearance));
document.querySelectorAll(".appearance-swatch").forEach(btn=>btn.addEventListener("click",()=>{appData.settings.theme=btn.dataset.preset;appData.settings.scenicGlass=false;document.getElementById("themeSelect").value=btn.dataset.preset;applySettings();saveStorage();openAppearance();}));
document.getElementById("appearanceReset").onclick=()=>{appData.settings.scenicGlass=true;appData.settings.appearance={...appearanceDefaults};appData.settings.theme="standard";document.getElementById("themeSelect").value="standard";applySettings();saveStorage();openAppearance();};

// Обновление PWA по кнопке. Старый кэш не очищаем, пока новая версия не установлена.
(function setupAppUpdate(){
  const button=document.getElementById("appUpdateBtn");
  const status=document.getElementById("appUpdateStatus");
  const version=document.getElementById("appVersion");
  if(version) version.textContent="9.18.0";
  if(!button||!status) return;
  let busy=false;
  const workerUrl=new URL("sw.js",document.baseURI);
  function waitForState(worker,states,timeout=30000){
    return new Promise((resolve,reject)=>{
      if(states.includes(worker.state)){resolve(worker.state);return;}
      const timer=setTimeout(()=>finish(new Error("Время ожидания обновления истекло.")),timeout);
      function finish(err){clearTimeout(timer);worker.removeEventListener("statechange",check);err?reject(err):resolve(worker.state)}
      function check(){if(states.includes(worker.state))finish();else if(worker.state==="redundant")finish(new Error("Новая версия не установилась."))}
      worker.addEventListener("statechange",check);
    });
  }
  button.addEventListener("click",async()=>{
    if(busy)return;
    if(!navigator.onLine){status.textContent="Нет интернета. Продолжаем работать на сохранённой офлайн-версии.";return;}
    if(!("serviceWorker" in navigator)||!window.isSecureContext){status.textContent="Обновление доступно только при открытии приложения через HTTPS (например, GitHub Pages).";return;}
    busy=true;button.disabled=true;status.textContent="Проверяем наличие новой версии…";
    try{
      const registration=await navigator.serviceWorker.register(workerUrl.href,{scope:"./",updateViaCache:"none"});
      await registration.update();
      let worker=registration.installing;
      if(worker) await waitForState(worker,["installed","activated"]);
      worker=registration.waiting;
      if(worker){
        status.textContent="Новая версия загружена. Применяем обновление…";
        const activated=new Promise((resolve,reject)=>{
          const timer=setTimeout(()=>reject(new Error("Не удалось активировать новую версию.")),30000);
          navigator.serviceWorker.addEventListener("controllerchange",()=>{clearTimeout(timer);resolve();},{once:true});
        });
        worker.postMessage({type:"MADENFLOW_SKIP_WAITING"});
        await activated;
        status.textContent="Обновлено! Перезапускаем MaDenFlow…";
        window.location.reload();
        return;
      }
      status.textContent="У вас уже последняя версия MaDenFlow.";
    }catch(err){
      console.warn("MaDenFlow update failed:",err);
      status.textContent=navigator.onLine?"Не удалось обновиться. Текущая версия сохранена; попробуйте ещё раз при стабильном интернете.":"Нет интернета. Текущая офлайн-версия сохранена.";
    }finally{busy=false;button.disabled=false;}
  });
})();

document.getElementById("notificationsToggle").onchange=async e=>{
  if(!e.target.checked){appData.settings.notifications=false;saveStorage();updateNotificationStatus();return}
  if(!("Notification" in window)){e.target.checked=false;alert("Этот браузер не поддерживает уведомления.");return}
  const permission=Notification.permission==="granted"?"granted":await Notification.requestPermission();
  if(permission!=="granted"){e.target.checked=false;appData.settings.notifications=false;saveStorage();updateNotificationStatus();return}
  appData.settings.notifications=true;saveStorage();updateNotificationStatus();checkTaskNotifications(true);
};
document.getElementById("saveEmailBtn").onclick=()=>{const email=document.getElementById("accountEmail").value.trim();if(email&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){alert("Введите корректный email");return}appData.settings.email=email;saveStorage();document.getElementById("accountStatus").textContent=email?`Email сохранён: ${email}`:"Email не подключён"};
document.getElementById("exportDataBtn").onclick=()=>{const blob=new Blob([JSON.stringify(appData,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`MaDenFlow_backup_${localKey(new Date())}.json`;a.click();URL.revokeObjectURL(a.href)};
document.getElementById("importDataBtn").onclick=()=>document.getElementById("importDataFile").click();
document.getElementById("importDataFile").onchange=e=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(reader.result);if(!data||typeof data!=="object"||!data.tasks||!data.service)throw new Error();localStorage.setItem("MaDenFlow_data",JSON.stringify(data));location.reload()}catch(err){alert("Не удалось восстановить резервную копию.")}};reader.readAsText(file)};

// Уведомления задач
const notifiedTaskKeys=new Set();
function checkTaskNotifications(force=false){
  if(!appData.settings.notifications||!("Notification" in window)||Notification.permission!=="granted")return;
  const now=new Date();
  const today=localKey(now);
  const hhmm=String(now.getHours()).padStart(2,"0")+":"+String(now.getMinutes()).padStart(2,"0");
  const list=getTasks(today)||[];
  list.forEach((task,index)=>{
    if(!task.time||task.done)return;
    const key=today+"|"+index+"|"+task.time+"|"+task.text;
    if(task.time===hhmm&&!notifiedTaskKeys.has(key)){
      notifiedTaskKeys.add(key);
      new Notification("MaDenFlow",{body:`${task.time} — ${task.text}`,icon:"icons/icon-192.png",tag:key});
    }
  });
}
setInterval(()=>checkTaskNotifications(),20000);

// старт
applySettings();document.body.classList.add("app-enter");setTimeout(()=>document.body.classList.add("app-ready"),650);renderWeek();checkTaskNotifications(true);
window.renderWeek=renderWeek;window.updateDayStatus=updateDayStatus;window.changeWeek=changeWeek;



// =====================================
// MaDenFlow 5.2 — боковая навигация, месяц и пароль раз в 30 дней
// =====================================

const sidePanel = document.getElementById("sidePanel");
const sideToggle = document.getElementById("sideToggle");
const monthScreen = document.getElementById("monthScreen");
const monthScreenGrid = document.getElementById("monthScreenGrid");
const monthScreenTitle = document.getElementById("monthScreenTitle");
let monthScreenCursor = new Date();
let monthSelectedDate = new Date(currentDate);

function openSidePanel(){
  sidePanel.classList.add("open");
  sideToggle.classList.add("panel-open");
  sidePanel.setAttribute("aria-hidden","false");
  sideToggle.textContent="‹";
  sideToggle.setAttribute("aria-label","Закрыть навигацию");
}
function closeSidePanel(){
  sidePanel.classList.remove("open");
  sideToggle.classList.remove("panel-open");
  sidePanel.setAttribute("aria-hidden","true");
  sideToggle.textContent="›";
  sideToggle.setAttribute("aria-label","Открыть навигацию");
}

// Закрываем боковую панель перед любым действием из неё.
// Это предотвращает ситуацию, когда панель остаётся поверх нового окна.
function closeNavigationBeforeAction(){
  closeSidePanel();
  // На случай анимации/перехода сразу убираем фокус с кнопки панели.
  if (document.activeElement && document.activeElement.classList.contains("side-nav-btn")) {
    document.activeElement.blur();
  }
}
sideToggle.addEventListener("click",()=>sidePanel.classList.contains("open")?closeSidePanel():openSidePanel());

function openMonthScreen(){
  closeSidePanel();
  if(!monthSelectedDate) monthSelectedDate=new Date(currentDate);
  renderMonthScreen();
  planner.classList.add("month-covered");
  monthScreen.classList.remove("hidden");
}
function closeMonthScreen(){
  monthScreen.classList.add("hidden");
  planner.classList.remove("month-covered");
}

function renderMonthScreen(){
  const y=monthScreenCursor.getFullYear(), m=monthScreenCursor.getMonth();
  const monthName=new Date(y,m,1).toLocaleDateString("ru-RU",{month:"long"});
  const season=SEASONAL_MONTHS[m];
  monthScreenTitle.textContent=monthName.charAt(0).toLocaleUpperCase("ru-RU")+monthName.slice(1)+" "+y;
  monthScreenTitle.style.color=season.base;
  monthScreenTitle.style.background=season.tint;
  monthScreenTitle.style.borderRadius="16px";
  monthScreenTitle.style.padding="8px 14px";
  monthScreenTitle.style.display="inline-block";
  const grid=monthScreenGrid;
  monthScreen.style.setProperty("--month-landscape", `url("month-backgrounds/month-${String(m+1).padStart(2,"0")}.jpg")`);
  grid.style.setProperty("--season-color",season.base);
  grid.style.setProperty("--season-tint",season.tint);
  grid.innerHTML=weekDays.map(d=>`<div class="month-weekday">${d}</div>`).join("");
  const first=(new Date(y,m,1).getDay()||7)-1;
  const days=new Date(y,m+1,0).getDate();
  for(let i=0;i<first;i++) grid.insertAdjacentHTML("beforeend",`<div class="month-empty"></div>`);
  for(let day=1;day<=days;day++){
    const d=new Date(y,m,day),btn=document.createElement("button");
    btn.className="month-day";
    btn.style.setProperty("--season-color",season.base);btn.style.setProperty("--season-tint",season.tint);
    if(d.toDateString()===new Date().toDateString()) btn.classList.add("today");
    if(d.toDateString()===monthSelectedDate.toDateString()) btn.classList.add("selected");
    const key=localKey(d), dayTasks=getTasks(key)||[];
    if(dayTasks.length) btn.classList.add("has-tasks");
    btn.innerHTML=`<span class="month-day-number">${day}</span>`;
    const priorities=[...new Set(dayTasks.map(t=>t.priority||"normal"))];
    if(priorities.length){const dots=document.createElement("span");dots.className="month-priority-dots";priorities.slice(0,3).forEach(p=>{const dot=document.createElement("i");dot.className="priority-dot "+p;dots.appendChild(dot)});btn.appendChild(dots)}
    btn.onclick=()=>{monthSelectedDate=new Date(d);renderMonthScreen();};
    grid.appendChild(btn);
  }
  const selectedKey=localKey(monthSelectedDate);
  const selectedTitle=document.getElementById("monthSelectedTitle");
  const selectedList=document.getElementById("monthSelectedTasks");
  if(selectedTitle&&selectedList){
    const weekdayLabel=monthSelectedDate.toLocaleDateString("ru-RU",{weekday:"long"});
    const dateLabel=monthSelectedDate.toLocaleDateString("ru-RU",{day:"numeric",month:"long"});
    selectedTitle.textContent=weekdayLabel.charAt(0).toLocaleUpperCase("ru-RU")+weekdayLabel.slice(1)+", "+dateLabel;
    const list=getTasks(selectedKey)||[];
    selectedList.innerHTML=list.length?list.map(t=>`<div class="month-task-row ${escapeHtml(t.priority||"normal")}"><span class="priority-dot ${escapeHtml(t.priority||"normal")}"></span>${t.time?`<time>${escapeHtml(t.time)}</time>`:""}<span>${escapeHtml(t.text||"")}</span></div>`).join(""):'<div class="month-tasks-empty">На этот день задач нет</div>';
  }
}
document.getElementById("openSelectedWeek").onclick=()=>{currentDate=new Date(monthSelectedDate);closeMonthScreen();renderWeek();};
document.getElementById("monthPrev").onclick=()=>{monthScreenCursor.setMonth(monthScreenCursor.getMonth()-1);renderMonthScreen()};
document.getElementById("monthNext").onclick=()=>{monthScreenCursor.setMonth(monthScreenCursor.getMonth()+1);renderMonthScreen()};
document.getElementById("monthToday").onclick=()=>{monthScreenCursor=new Date();renderMonthScreen()};

// Внутри боковой панели
document.getElementById("todayBtn").onclick=()=>{
  closeNavigationBeforeAction();
  currentDate=new Date();
  closeMonthScreen();
  renderWeek();
};

document.getElementById("calendarBtn").onclick=()=>{
  closeNavigationBeforeAction();
  openMonthScreen();
};



// day-card-tap-handler
// Тап по карточке дня открывает список дел. Кнопки/сами задачи остаются интерактивными.
const dayTasksModal=document.getElementById("dayTasksModal");
const dayTasksList=document.getElementById("dayTasksList");
const dayTasksTitle=document.getElementById("dayTasksTitle");
const dayTasksAdd=document.getElementById("dayTasksAdd");
const dayTasksClose=document.getElementById("dayTasksClose");
let selectedDayForModal=null;

function closeDayTasksModal(){
  if(!dayTasksModal) return;
  dayTasksModal.classList.add("hidden");
  dayTasksModal.setAttribute("aria-hidden","true");
  selectedDayForModal=null;
}

function openDayTasksModal(date){
  if(!dayTasksModal) return;
  selectedDayForModal=new Date(date);
  const key=localKey(selectedDayForModal);
  const tasks=getTasks(key)||[];
  dayTasksTitle.textContent=selectedDayForModal.toLocaleDateString("ru-RU",{
    weekday:"long",day:"numeric",month:"long"
  });
  dayTasksList.innerHTML="";
  if(!tasks.length){
    dayTasksList.innerHTML='<div class="day-empty">На этот день дел пока нет.</div>';
  }else{
    tasks.forEach((task,index)=>{
      const row=document.createElement("div");
      row.className="day-modal-task";
      row.innerHTML=`
        <span class="day-modal-check">${task.done?"✓":"○"}</span>
        <span class="day-modal-task-main">
          <span class="day-modal-task-text"></span>
          ${task.time?`<span class="day-modal-task-time"></span>`:""}
        </span>
        <button class="day-modal-edit" type="button">Изменить</button>`;
      row.querySelector(".day-modal-task-text").textContent=task.text||task.title||"Задача";
      if(task.time) row.querySelector(".day-modal-task-time").textContent=task.time;
      row.querySelector(".day-modal-edit").onclick=(e)=>{
        e.stopPropagation();
        // Используем существующий редактор задачи проекта, если он доступен.
        if(typeof window.editTask==="function") window.editTask(key,index);
        else if(typeof editTask==="function") editTask(key,index);
        else alert("Редактор этой задачи уже доступен через обычное окно задач.");
      };
      dayTasksList.appendChild(row);
    });
  }
  dayTasksModal.classList.remove("hidden");
  dayTasksModal.setAttribute("aria-hidden","false");
}

if(dayTasksModal){
  if(dayTasksAdd) dayTasksAdd.onclick=()=>{
    if(!selectedDayForModal) return;
    const key=localKey(selectedDayForModal);
    if(typeof window.addTask==="function") window.addTask(key);
    else if(typeof addTask==="function") addTask(key);
  };
  if(dayTasksClose) dayTasksClose.onclick=closeDayTasksModal;

  dayTasksModal.addEventListener("click",(e)=>{
    if(e.target===dayTasksModal) closeDayTasksModal();
  });
}

document.addEventListener("keydown",(e)=>{
  if(e.key==="Escape") closeDayTasksModal();
});

// Тап по карточке дня. Ищем ближайший элемент с датой из существующего рендера.
if(dayTasksModal){
  planner.addEventListener("click",(e)=>{
    if(e.target.closest("button,input,textarea,select,a,.task,.task-text,.task-menu")) return;
    const card=e.target.closest(".day");
    if(!card) return;
    const dateAttr=card.dataset.date||card.getAttribute("data-day");
    if(!dateAttr) return;
    const d=new Date(dateAttr);
    if(!Number.isNaN(d.getTime())) openDayTasksModal(d);
  });
}

// Универсально: любое нажатие по пункту боковой навигации закрывает её.
sidePanel.addEventListener("click", (e)=>{
  if(e.target.closest(".side-nav-btn")) closeNavigationBeforeAction();
});


// Если пользователь нажал по рабочей области или другому элементу вне панели,
// панель автоматически закрывается.
document.addEventListener("pointerdown",(e)=>{
  if(!sidePanel.classList.contains("open")) return;
  if(e.target.closest("#sidePanel") || e.target.closest("#sideToggle")) return;
  closeNavigationBeforeAction();
},{capture:true});

// Свайп по неделе остаётся основным переходом между неделями.
let touchStartX=0,touchStartY=0;
planner.addEventListener("touchstart",e=>{
  touchStartX=e.changedTouches[0].screenX;
  touchStartY=e.changedTouches[0].screenY;
},{passive:true});
planner.addEventListener("touchend",e=>{
  const dx=e.changedTouches[0].screenX-touchStartX;
  const dy=e.changedTouches[0].screenY-touchStartY;
  if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.2) changeWeek(dx<0?1:-1);
},{passive:true});

// Экран входа удалён: приложение запускается без пароля.
applySettings();
document.body.classList.add("app-ready");
renderWeek();
checkTaskNotifications(true);
window.renderWeek=renderWeek;
window.updateDayStatus=updateDayStatus;
window.changeWeek=changeWeek;
openMonthScreen();

// Закрытие любого обычного модального окна тапом по свободному месту вокруг окна.
document.querySelectorAll('.modal').forEach(modal=>{
  modal.addEventListener('click',e=>{
    if(e.target!==modal) return;
    modal.classList.add('hidden');
    const active=document.activeElement;
    if(active && typeof active.blur==='function') active.blur();
  });
});

["appearanceSystemText","appearanceTimeMode"].forEach(id=>document.getElementById(id).addEventListener("change",()=>{
  const a=getAppearance();
  a.systemText=document.getElementById("appearanceSystemText").value;
  a.timeMode=document.getElementById("appearanceTimeMode").value;
  appData.settings.appearance={...(appData.settings.appearance||{}), ...a};
  document.getElementById("appearanceWeekTextColorRow").style.display=a.systemText==="custom"?"flex":"none";
  document.getElementById("appearanceTimeColorRow").style.display=a.timeMode==="custom"?"flex":"none";
  applySettings();saveStorage();updateAppearancePreview();
}));
