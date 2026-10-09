// MaDenFlow 5.0 — основной движок
console.log("MaDenFlow 5.0 запущен 🚀");
const planner=document.getElementById("planner"),weekTitle=document.getElementById("weekTitle");
const weekDays=["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
let currentDate=new Date(),selectedDate=null,calendarCursor=new Date();
function getMonday(date){const d=new Date(date);let day=d.getDay()||7;d.setDate(d.getDate()-day+1);return d}
function localKey(d){return localDateKey(d)}
function renderWeek(){
  planner.innerHTML="";
  const monday=getMonday(currentDate),sunday=new Date(monday);
  sunday.setDate(monday.getDate()+6);
  const fmt=d=>`${d.getDate()}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}`;
  weekTitle.textContent=`${fmt(monday)} – ${fmt(sunday)}`;
  let maxTasks=0;
  const listMode=(appData.settings||{}).taskView==="list";
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
    section.innerHTML=`<div class="day-content"><div class="tasks"></div></div><div class="day-title"><div class="day-date-side"><span class="day-weekday">${weekDays[i]}</span><span class="day-number">${date.getDate()}</span><span class="day-month">${date.toLocaleDateString("ru-RU",{month:"short"}).replace(".","")}</span>${date.toDateString()===new Date().toDateString()?'<span class="day-star">★</span>':''}</div></div>`;
    planner.appendChild(section);
    loadTasks(key,section.querySelector(".tasks"));
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
  updateDayStatus(); activateDays();
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
function openDayPopup(dateKey){
  closeDayPopup();
  const list=getTasks(dateKey)||[];
  const d=new Date(dateKey+"T12:00:00");
  const weekday=d.toLocaleDateString("ru-RU",{weekday:"long"});
  const dateText=d.toLocaleDateString("ru-RU",{day:"numeric",month:"long"});
  const overlay=document.createElement("div");
  overlay.className="day-popup-overlay";
  overlay.dataset.date=dateKey;
  const title=weekday.charAt(0).toUpperCase()+weekday.slice(1)+" · "+dateText;
  const rows=list.map((t,index)=>{
    const priority=t.priority||"normal", done=t.done?" done":"";
    const time=t.time?`<span class="day-popup-time">${escapeHtml(t.time)}</span>`:"";
    return `<div class="day-popup-task-row ${priority}${done}" data-index="${index}">
      <button type="button" class="day-popup-task ${priority}${done}" data-index="${index}" aria-label="Открыть задачу ${escapeHtml(t.text||"")}">
        ${time}<span class="day-popup-text">${escapeHtml(t.text||"")}</span>
      </button>
      <div class="day-popup-actions">
        <button type="button" class="day-popup-action day-popup-edit" data-action="edit" data-index="${index}" aria-label="Редактировать задачу" title="Редактировать">✏️</button>
        <button type="button" class="day-popup-action day-popup-delete" data-action="delete" data-index="${index}" aria-label="Удалить задачу" title="Удалить">❌</button>
      </div>
    </div>`;
  }).join("");
  overlay.innerHTML=`<div class="day-popup" role="dialog" aria-modal="true">
    <div class="day-popup-head"><div><div class="day-popup-title">${title}</div><div class="day-popup-subtitle">${list.length?list.length+" дел на этот день":"День свободен"}</div></div><button class="day-popup-close" type="button" aria-label="Закрыть">×</button></div>
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
    if(button.dataset.action === "delete"){
      const label=task.text ? `«${task.text}»` : "эту задачу";
      if(!confirm(`Удалить ${label}?`)) return;
      try{
        const tasks=getTasks(dateKey);
        if(!Array.isArray(tasks)) throw new Error("Список задач дня недоступен");
        tasks.splice(index,1);
        if(typeof saveStorage === "function") saveStorage();
        if(typeof renderWeek === "function") renderWeek();
        openDayPopup(dateKey);
      }catch(err){
        console.error("MaDenFlow: ошибка удаления задачи",err);
        alert("Не удалось удалить задачу. Попробуйте ещё раз.");
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
  document.getElementById("repeatTask").checked=false;
  document.getElementById("repeatOptions").classList.add("hidden");
  document.getElementById("recurrenceBox").classList.add("hidden");
  modal.classList.remove("hidden");
  setTimeout(()=>document.getElementById("newTaskInput").focus(),50);
}
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
          editRecurringChain(task.recurrenceId,text,time.value);
        }else if(typeof editTask==="function"){
          editTask(editDate,Number(editIndex),text,time.value);
        }else{ alert("Не удалось найти функцию редактирования задачи."); return; }
      }else if(document.getElementById("repeatTask").checked){
        if(typeof addRecurringTask!=="function"){ alert("Функция повторяющихся задач недоступна."); return; }
        addRecurringTask(selectedDate,text,document.getElementById("repeatType").value,document.getElementById("repeatUntil").value,time.value);
      }else{
        if(typeof addTask!=="function"){ alert("Функция сохранения задач недоступна."); return; }
        addTask(selectedDate,text,{time:time.value});
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
  document.body.classList.toggle("dark",!!settings.darkMode);
  document.body.dataset.theme=settings.theme||"standard";
  document.body.dataset.fontSize=settings.fontSize||"medium";
  document.body.dataset.plannerFontSize=settings.plannerFontSize||settings.fontSize||"medium";
  document.body.dataset.taskFontSize=settings.taskFontSize||settings.fontSize||"medium";
  document.body.dataset.gradient=settings.gradientDays?"on":"off";
  document.body.dataset.taskView=settings.taskView||"cards";
  document.body.dataset.listTextColor=settings.listTextColor||"navy";
  document.body.dataset.sidebarColor=settings.sidebarColor||"bluegray";
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
  document.getElementById("plannerFontSizeSelect").value=appData.settings.plannerFontSize||appData.settings.fontSize||"medium";
  document.getElementById("taskFontSizeSelect").value=appData.settings.taskFontSize||appData.settings.fontSize||"medium";
  document.getElementById("themeSelect").value=appData.settings.theme||"standard";
  const sidebarColorSelect=document.getElementById("sidebarColorSelect");
  if(sidebarColorSelect) sidebarColorSelect.value=appData.settings.sidebarColor||"bluegray";
  document.getElementById("gradientDaysToggle").checked=!!appData.settings.gradientDays;
  document.getElementById("taskViewSelect").value=appData.settings.taskView||"cards";
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
document.getElementById("plannerFontSizeSelect").onchange=e=>{appData.settings.plannerFontSize=e.target.value;applySettings();saveStorage()};
document.getElementById("taskFontSizeSelect").onchange=e=>{appData.settings.taskFontSize=e.target.value;appData.settings.fontSize=e.target.value;applySettings();saveStorage();renderWeek()};
document.getElementById("gradientDaysToggle").onchange=e=>{appData.settings.gradientDays=e.target.checked;applySettings();saveStorage()};
document.getElementById("themeSelect").onchange=e=>{appData.settings.theme=e.target.value;applySettings();saveStorage()};
const sidebarColorSelect=document.getElementById("sidebarColorSelect");
if(sidebarColorSelect) sidebarColorSelect.onchange=e=>{appData.settings.sidebarColor=e.target.value;applySettings();saveStorage()};
document.getElementById("taskViewSelect").onchange=e=>{appData.settings.taskView=e.target.value;applySettings();saveStorage();renderWeek()};
const listTextColorSelect=document.getElementById("listTextColorSelect");
if(listTextColorSelect) listTextColorSelect.onchange=e=>{appData.settings.listTextColor=e.target.value;applySettings();saveStorage()};
// Обновление PWA по кнопке. Старый кэш не очищаем, пока новая версия не установлена.
(function setupAppUpdate(){
  const button=document.getElementById("appUpdateBtn");
  const status=document.getElementById("appUpdateStatus");
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
  monthScreenCursor = new Date(currentDate);
  renderMonthScreen();
  monthScreen.classList.remove("hidden");
  planner.classList.add("month-covered");
}
function closeMonthScreen(){
  monthScreen.classList.add("hidden");
  planner.classList.remove("month-covered");
}

function renderMonthScreen(){
  const y=monthScreenCursor.getFullYear(), m=monthScreenCursor.getMonth();
  monthScreenTitle.textContent=new Date(y,m,1).toLocaleDateString("ru-RU",{month:"long",year:"numeric"});
  const grid=monthScreenGrid;
  grid.innerHTML=weekDays.map(d=>`<div class="month-weekday">${d}</div>`).join("");
  const first=(new Date(y,m,1).getDay()||7)-1;
  const days=new Date(y,m+1,0).getDate();
  for(let i=0;i<first;i++) grid.insertAdjacentHTML("beforeend",`<div class="month-empty"></div>`);
  for(let day=1;day<=days;day++){
    const d=new Date(y,m,day),btn=document.createElement("button");
    btn.className="month-day";
    if(d.toDateString()===new Date().toDateString()) btn.classList.add("today");
    if(d.toDateString()===currentDate.toDateString()) btn.classList.add("selected");
    const key=localKey(d);
    if((getTasks(key)||[]).length) btn.classList.add("has-tasks");
    btn.textContent=day;
    btn.onclick=()=>{
      currentDate=d;
      closeMonthScreen();
      renderWeek();
    };
    grid.appendChild(btn);
  }
}
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

// Пароль: первый вход и повторная проверка через 30 дней.
const MADENFLOW_PASSWORD="Maden2026";
const LOGIN_CHECK_KEY="MaDenFlow_password_checked_at";
const LOGIN_PERIOD=30*24*60*60*1000;
const loginScreen=document.getElementById("loginScreen"),loginPassword=document.getElementById("loginPassword"),loginBtn=document.getElementById("loginBtn"),loginError=document.getElementById("loginError");
function getLoginCheckedAt(){
  const fromSettings=Number(appData?.settings?.passwordCheckedAt||0);
  const fromStorage=Number(localStorage.getItem(LOGIN_CHECK_KEY)||0);
  const fromCookie=Number(((document.cookie.match(/(?:^|; )madenflow_password_checked=(\d+)/)||[])[1])||0);
  return Math.max(fromSettings,fromStorage,fromCookie);
}
function passwordRequired(){const last=getLoginCheckedAt();return !last||(Date.now()-last)>=LOGIN_PERIOD}
function showLoginScreen(){
  document.documentElement.classList.add("madenflow-locked"); document.body.classList.add("madenflow-locked");
  loginScreen.classList.remove("hidden"); loginPassword.value=""; loginError.classList.remove("show");
  setTimeout(()=>loginPassword.focus(),100);
}
function unlockMaDenFlow(){
  if(loginPassword.value!==MADENFLOW_PASSWORD){loginError.classList.add("show");loginPassword.value="";loginPassword.focus();return}
  const now=Date.now();
  localStorage.setItem(LOGIN_CHECK_KEY,String(now));
  try{document.cookie=`madenflow_password_checked=${now}; Max-Age=${LOGIN_PERIOD/1000}; Path=/; SameSite=Lax`}catch(e){}
  if(appData.settings){appData.settings.passwordCheckedAt=now; if(typeof saveStorage==="function")saveStorage()}
  document.documentElement.classList.remove("madenflow-locked"); document.body.classList.remove("madenflow-locked");
  loginScreen.classList.add("hidden"); loginPassword.value="";
  if(typeof openMonthScreen==="function")openMonthScreen();
}
if(loginBtn)loginBtn.onclick=unlockMaDenFlow;
if(loginPassword)loginPassword.onkeydown=e=>{if(e.key==="Enter")unlockMaDenFlow()};
// Старт
applySettings();
document.body.classList.add("app-ready");
renderWeek();
checkTaskNotifications(true);
window.renderWeek=renderWeek;
window.updateDayStatus=updateDayStatus;
window.changeWeek=changeWeek;

if(passwordRequired()) showLoginScreen();
else {
  document.documentElement.classList.remove("madenflow-locked");
  document.body.classList.remove("madenflow-locked");
  openMonthScreen();
}

// Закрытие любого обычного модального окна тапом по свободному месту вокруг окна.
document.querySelectorAll('.modal').forEach(modal=>{
  modal.addEventListener('click',e=>{
    if(e.target!==modal) return;
    modal.classList.add('hidden');
    const active=document.activeElement;
    if(active && typeof active.blur==='function') active.blur();
  });
});
