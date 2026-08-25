// MaDenFlow 5.0 — основной движок
console.log("MaDenFlow 5.0 запущен 🚀");
const planner=document.getElementById("planner"),weekTitle=document.getElementById("weekTitle");
const weekDays=["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
let currentDate=new Date(),selectedDate=null,calendarCursor=new Date();
function getMonday(date){const d=new Date(date);let day=d.getDay()||7;d.setDate(d.getDate()-day+1);return d}
function localKey(d){return localDateKey(d)}
function renderWeek(){planner.innerHTML="";const monday=getMonday(currentDate),sunday=new Date(monday);sunday.setDate(monday.getDate()+6);weekTitle.textContent=`${monday.toLocaleDateString("ru-RU")} — ${sunday.toLocaleDateString("ru-RU")}`;let maxTasks=0;const listMode=(appData.settings||{}).taskView==="list";const sections=[];for(let i=0;i<7;i++){const date=new Date(monday);date.setDate(monday.getDate()+i);const key=localKey(date);const count=getTasks(key).length;maxTasks=Math.max(maxTasks,count);const section=document.createElement("section");section.className="day"+(date.getDay()===0||date.getDay()===6?" weekend":"");if(date.toDateString()===new Date().toDateString())section.classList.add("today");section.dataset.date=key;section.dataset.taskCount=count;section.innerHTML=`<div class="day-title"><div class="day-name"><span class="day-weekday">${weekDays[i]}</span> ${date.getDate()} <span class="day-month">${date.toLocaleDateString("ru-RU",{month:"short"}).replace(".","")}</span> <span class="day-status" data-date="${key}">⚪</span>${date.toDateString()===new Date().toDateString()?" ⭐":""}</div><button class="add-task-day" data-date="${key}">＋</button></div><div class="day-content"><div class="tasks"></div></div>`;planner.appendChild(section);loadTasks(key,section.querySelector(".tasks"));sections.push({section,count})}planner.classList.remove("week-normal","week-compact","week-ultra");planner.classList.add(maxTasks>=7?"week-ultra":maxTasks>=4?"week-compact":"week-normal");if(listMode){
sections.forEach(({section,count})=>{
  section.classList.add("list-day");
  section.style.flex="1 1 0";
  section.style.setProperty("--list-count",count);
  section.classList.toggle("list-two-columns",count>=3 && count<=4);
  section.classList.toggle("list-three-columns",count>=5);
  section.classList.toggle("list-dense",count>=6);
  section.classList.toggle("list-ultra",count>=9);
})
}else{
sections.forEach(({section})=>{
  section.classList.remove("list-day","list-two-columns","list-dense","list-ultra");
  section.style.flex="";
  section.style.removeProperty("--list-count");
})
}updateDayStatus();activateDays();activateAddButtons()}
function activateDays(){
  document.querySelectorAll(".day").forEach(day=>{
    day.onclick=e=>{
      if(e.target.closest(".add-task-day") || e.target.closest(".task")) return;
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
  const rows=list.map(t=>{
    const priority=t.priority||"normal";
    const done=t.done?" done":"";
    const time=t.time?`<span class="day-popup-time">${escapeHtml(t.time)}</span>`:"";
    return `<div class="day-popup-task ${priority}${done}">${time}<div class="day-popup-text">${escapeHtml(t.text||"")}</div></div>`;
  }).join("");
  overlay.innerHTML=`<div class="day-popup" role="dialog" aria-modal="true"><div class="day-popup-head"><div><div class="day-popup-title">${title}</div><div class="day-popup-subtitle">${list.length?list.length+" дел на этот день":"На этот день дел нет"}</div></div><button class="day-popup-close" type="button" aria-label="Закрыть">×</button></div><div class="day-popup-list">${rows||'<div class="day-popup-empty">День свободен ✨</div>'}</div></div>`;
  document.body.appendChild(overlay);
  overlay.querySelector(".day-popup-close").onclick=closeDayPopup;
  overlay.addEventListener("click",e=>{if(e.target===overlay)closeDayPopup()});
}
function closeDayPopup(){const p=document.querySelector(".day-popup-overlay");if(p)p.remove()}
function activateAddButtons(){document.querySelectorAll(".add-task-day").forEach(btn=>btn.onclick=e=>{e.stopPropagation();selectedDate=btn.dataset.date;openTaskModal()})}
function openTaskModal(){const modal=document.getElementById("taskModal");modal.dataset.editDate="";modal.dataset.editIndex="";document.getElementById("taskModalTitle").textContent="Новая задача";document.getElementById("newTaskInput").value="";document.getElementById("newTaskTime").value="";document.getElementById("repeatTask").checked=false;document.getElementById("repeatOptions").classList.add("hidden");document.getElementById("recurrenceBox").classList.remove("hidden");const d=new Date(selectedDate+"T12:00:00");const until=new Date(d);until.setFullYear(until.getFullYear()+1);document.getElementById("repeatUntil").value=localKey(until);modal.classList.remove("hidden");document.getElementById("newTaskInput").focus()}
document.getElementById("repeatTask").onchange=e=>document.getElementById("repeatOptions").classList.toggle("hidden",!e.target.checked);
document.getElementById("saveTaskBtn").onclick=()=>{if(!selectedDate)return;const modal=document.getElementById("taskModal"),input=document.getElementById("newTaskInput"),time=document.getElementById("newTaskTime"),text=input.value.trim();if(!text)return;const editDate=modal.dataset.editDate,editIndex=modal.dataset.editIndex,editChain=modal.dataset.editChain==="1";if(editDate!==""&&editIndex!==""){const task=getTasks(editDate)[Number(editIndex)];if(editChain&&task&&task.recurrenceId)editRecurringChain(task.recurrenceId,text,time.value);else editTask(editDate,Number(editIndex),text,time.value);modal.classList.add("hidden");modal.dataset.editDate="";modal.dataset.editIndex="";modal.dataset.editChain="0";renderWeek();return}if(document.getElementById("repeatTask").checked)addRecurringTask(selectedDate,text,document.getElementById("repeatType").value,document.getElementById("repeatUntil").value,time.value);else addTask(selectedDate,text,{time:time.value});modal.classList.add("hidden");renderWeek()};
document.getElementById("cancelTaskBtn").onclick=()=>{const m=document.getElementById("taskModal");m.classList.add("hidden");m.dataset.editDate="";m.dataset.editIndex="";m.dataset.editChain="0"};
document.getElementById("prevWeek").onclick=()=>changeWeek(-1);document.getElementById("nextWeek").onclick=()=>changeWeek(1);document.getElementById("todayBtn").onclick=()=>{currentDate=new Date();renderWeek()};
function changeWeek(n){currentDate.setDate(currentDate.getDate()+n*7);renderWeek()}
let touchStartX=0,touchStartY=0;planner.addEventListener("touchstart",e=>{touchStartX=e.changedTouches[0].screenX;touchStartY=e.changedTouches[0].screenY},{passive:true});planner.addEventListener("touchend",e=>{const dx=e.changedTouches[0].screenX-touchStartX,dy=e.changedTouches[0].screenY-touchStartY;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.2)changeWeek(dx<0?1:-1);resetUITimer()},{passive:true});
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
  document.getElementById("gradientDaysToggle").checked=!!appData.settings.gradientDays;
  document.getElementById("taskViewSelect").value=appData.settings.taskView||"cards";
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
document.getElementById("taskViewSelect").onchange=e=>{appData.settings.taskView=e.target.value;applySettings();saveStorage();renderWeek()};
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

// Автоскрытие: тач/скролл не раскрывают шапку. Ручка снизу раскрывает.
let uiTimer;const body=document.body,topHandle=document.getElementById("topHandle");function hideUI(){body.classList.add("ui-hidden")}function resetUITimer(){clearTimeout(uiTimer);uiTimer=setTimeout(hideUI,5000)}function showUI(){body.classList.remove("ui-hidden");clearTimeout(uiTimer);uiTimer=setTimeout(hideUI,5000)}topHandle.onclick=showUI;document.addEventListener("pointerdown",e=>{if(e.target.closest("button,input,.modal,.task-menu"))return;resetUITimer()},{passive:true});
// старт
applySettings();document.body.classList.add("app-enter");setTimeout(()=>document.body.classList.add("app-ready"),650);renderWeek();resetUITimer();checkTaskNotifications(true);
window.renderWeek=renderWeek;window.updateDayStatus=updateDayStatus;window.changeWeek=changeWeek;


// =====================================
// 🔐 MaDenFlow — пароль при каждом запуске
// =====================================

const MADENFLOW_PASSWORD = "Maden2026";

const loginScreen = document.getElementById("loginScreen");
const loginPassword = document.getElementById("loginPassword");
const loginBtn = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");

let madenflowUnlocked = false;

function showLoginScreen(){
    madenflowUnlocked = false;
    document.documentElement.classList.add("madenflow-locked");
    document.body.classList.add("madenflow-locked");
    loginScreen.classList.remove("hidden");
    loginPassword.value = "";
    loginError.classList.remove("show");
    setTimeout(()=>loginPassword.focus(),100);
}

function unlockMaDenFlow(){
    if(loginPassword.value === MADENFLOW_PASSWORD){
        madenflowUnlocked = true;
        document.documentElement.classList.remove("madenflow-locked");
        document.body.classList.remove("madenflow-locked");
        loginError.classList.remove("show");
        loginScreen.classList.add("hidden");
        loginPassword.value = "";
    }else{
        loginError.classList.add("show");
        loginPassword.value = "";
        loginPassword.focus();
    }
}

loginBtn.addEventListener("click",unlockMaDenFlow);
loginPassword.addEventListener("keydown",e=>{
    if(e.key==="Enter") unlockMaDenFlow();
});

showLoginScreen();
