// MaDenFlow Storage 5.4
const STORAGE_KEY="MaDenFlow_data";
const defaultData={tasks:{},service:{},recurrences:[],settings:{darkMode:false,email:"",fontSize:"medium",plannerFontSize:"medium",taskFontSize:"medium",theme:"standard",gradientDays:false,notifications:false,taskView:"cards"},visits:[]};
let appData=loadStorage();
window.tasks=appData.tasks; window.service=appData.service;
function loadStorage(){try{const raw=localStorage.getItem(STORAGE_KEY);const data=raw?JSON.parse(raw):structuredClone(defaultData);return {...structuredClone(defaultData),...data,tasks:data.tasks||{},service:data.service||{},recurrences:data.recurrences||[],visits:data.visits||[],settings:{...defaultData.settings,...(data.settings||{})}}}catch(e){return structuredClone(defaultData)}}
function saveStorage(){localStorage.setItem(STORAGE_KEY,JSON.stringify(appData));if(typeof cloudSave==='function')cloudSave();if(typeof window.renderSideMiniCalendar==='function')window.renderSideMiniCalendar()}
function saveTasks(){saveStorage()}
function getTasks(date){if(!tasks[date])tasks[date]=[];return sortTasks(tasks[date])}
function sortTasks(list){list.sort((a,b)=>{const ta=a.time||"99:99",tb=b.time||"99:99";return ta.localeCompare(tb)||((a.created||0)-(b.created||0))});return list}
function addTask(date,text,options={}){const item={text,done:false,priority:options.priority||"normal",time:options.time||"",created:Date.now(),recurrenceId:options.recurrenceId||null,listColor:options.listColor||"green",cardColor:["soft-blue","soft-green","soft-orange","soft-pink","soft-purple","soft-teal"].includes(options.cardColor)?options.cardColor:"soft-blue"};getTasks(date).push(item);sortTasks(getTasks(date));saveStorage();return item}
function addRecurringTask(startDate,text,type,until,time="",weekdays=[]){const id="r_"+Date.now()+"_"+Math.random().toString(36).slice(2,7);const start=new Date(startDate+"T12:00:00");const end=new Date((until||new Date(start.getFullYear()+1,start.getMonth(),start.getDate()).toISOString().slice(0,10))+"T12:00:00");let d=new Date(start);let guard=0;while(d<=end&&guard<800){const date=localDateKey(d);const jsDay=d.getDay(),monFirst=(jsDay+6)%7;if(type!=="customDays"||weekdays.includes(monFirst))addTask(date,text,{recurrenceId:id,time});if(type==="daily"||type==="weekdays"||type==="customDays")d.setDate(d.getDate()+1);else if(type==="weekly")d.setDate(d.getDate()+7);else if(type==="monthly")d.setMonth(d.getMonth()+1);else break; if(type==="weekdays"&&(d.getDay()===0||d.getDay()===6)){while(d<=end&&(d.getDay()===0||d.getDay()===6))d.setDate(d.getDate()+1)}guard++}appData.recurrences.push({id,startDate,text,type,weekdays,until:end.toISOString().slice(0,10),time});saveStorage();return id}
function getRecurrence(id){return (appData.recurrences||[]).find(r=>r.id===id)||null}

function updateRecurringChain(recurrenceId,type,weekdays=[],until=""){
  const r=getRecurrence(recurrenceId);if(!r)return;
  const nextType=type||r.type;
  const nextDays=Array.isArray(weekdays)?weekdays:[];
  const today=localDateKey(new Date());
  const endKey=until||r.until||localDateKey(new Date(new Date().getFullYear()+1,new Date().getMonth(),new Date().getDate()));
  const oldByDate=new Map();
  Object.keys(tasks).forEach(date=>{
    const matching=(tasks[date]||[]).filter(t=>t.recurrenceId===recurrenceId);
    if(matching.length) oldByDate.set(date,matching);
  });
  // История до сегодняшнего дня остаётся нетронутой; будущие даты пересобираются по новому правилу.
  Object.keys(tasks).forEach(date=>{
    if(date<today)return;
    tasks[date]=tasks[date].filter(t=>t.recurrenceId!==recurrenceId);
    if(!tasks[date].length)delete tasks[date];
  });
  const startKey=r.startDate||today;
  const d=new Date(startKey+"T12:00:00"), end=new Date(endKey+"T12:00:00");
  let guard=0;
  while(d<=end&&guard<1100){
    const date=localDateKey(d), jsDay=d.getDay(), monFirst=(jsDay+6)%7;
    let include=false;
    if(nextType==="daily")include=true;
    else if(nextType==="weekly")include=(date===startKey)||((Math.round((d-new Date(startKey+"T12:00:00"))/86400000)%7)===0);
    else if(nextType==="weekdays")include=jsDay!==0&&jsDay!==6;
    else if(nextType==="monthly")include=d.getDate()===new Date(startKey+"T12:00:00").getDate();
    else if(nextType==="customDays")include=nextDays.includes(monFirst);
    if(include&&date>=today){
      const previous=(oldByDate.get(date)||[]).find(t=>t.recurrenceId===recurrenceId);
      const item=previous?{...previous,text:r.text||previous.text,time:r.time||""}:{text:r.text||"",done:false,priority:"normal",time:r.time||"",created:Date.now(),recurrenceId,listColor:"green",cardColor:"soft-blue"};
      item.recurrenceId=recurrenceId;
      if(!tasks[date])tasks[date]=[];
      tasks[date].push(item);sortTasks(tasks[date]);
    }
    if(nextType==="weekly")d.setDate(d.getDate()+7);
    else if(nextType==="monthly")d.setMonth(d.getMonth()+1);
    else d.setDate(d.getDate()+1);
    guard++;
  }
  r.type=nextType;r.weekdays=nextDays;r.until=endKey;r.startDate=r.startDate||today;
  saveStorage();return r;
}
function deleteTask(date,index){if(!tasks[date])return;tasks[date].splice(index,1);if(!tasks[date].length)delete tasks[date];saveStorage()}
function deleteRecurringChain(recurrenceId){if(!recurrenceId){return}Object.keys(tasks).forEach(date=>{tasks[date]=tasks[date].filter(t=>t.recurrenceId!==recurrenceId);if(!tasks[date].length)delete tasks[date]});appData.recurrences=(appData.recurrences||[]).filter(r=>r.id!==recurrenceId);saveStorage()}
function editTask(date,index,text,time){if(!tasks[date]||!tasks[date][index])return;tasks[date][index].text=text;if(time!==undefined)tasks[date][index].time=time||"";sortTasks(tasks[date]);saveStorage()}
function editRecurringChain(recurrenceId,text,time){if(!recurrenceId)return;Object.keys(tasks).forEach(date=>{tasks[date].forEach(t=>{if(t.recurrenceId===recurrenceId){t.text=text;t.time=time||""}});sortTasks(tasks[date])});const r=getRecurrence(recurrenceId);if(r){r.text=text;r.time=time||""}saveStorage()}
function setTaskListColor(date,index,color){if(!tasks[date]||!tasks[date][index])return;tasks[date][index].listColor=["green","red","black"].includes(color)?color:"green";saveStorage()}
function setRecurringChainListColor(recurrenceId,color){if(!recurrenceId)return;Object.keys(tasks).forEach(date=>tasks[date].forEach(t=>{if(t.recurrenceId===recurrenceId)t.listColor=color}));saveStorage()}
function toggleTask(date,index,done){if(!tasks[date])return;tasks[date][index].done=done;saveStorage()}
function changePriority(date,index,priority){if(!tasks[date])return;tasks[date][index].priority=priority;saveStorage()}
function getServiceMonth(month){if(!service[month])service[month]=[];return service[month]}
function addServiceRecord(month,record){getServiceMonth(month).push({date:record.date,hours:Number(record.hours)||0,minutes:Number(record.minutes)||0,created:Date.now()});saveStorage()}
function editServiceRecord(month,index,record){if(!service[month])return;service[month][index]={...service[month][index],date:record.date,hours:Number(record.hours)||0,minutes:Number(record.minutes)||0};saveStorage()}
function deleteServiceRecord(month,index){if(!service[month])return;service[month].splice(index,1);if(!service[month].length)delete service[month];saveStorage()}
function getServiceTotal(month){let total=(service[month]||[]).reduce((s,x)=>s+x.hours*60+x.minutes,0);return{hours:Math.floor(total/60),minutes:total%60}}
function getServiceGrandTotal(){let total=Object.values(service).flat().reduce((s,x)=>s+x.hours*60+x.minutes,0);return{hours:Math.floor(total/60),minutes:total%60}}
function localDateKey(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
window.localDateKey=localDateKey;window.saveStorage=saveStorage;window.addTask=addTask;window.addRecurringTask=addRecurringTask;window.deleteTask=deleteTask;window.deleteRecurringChain=deleteRecurringChain;window.editTask=editTask;window.editRecurringChain=editRecurringChain;window.toggleTask=toggleTask;window.changePriority=changePriority;window.getTasks=getTasks;window.getRecurrence=getRecurrence;window.updateRecurringChain=updateRecurringChain;window.setTaskListColor=setTaskListColor;window.setRecurringChainListColor=setRecurringChainListColor;window.addServiceRecord=addServiceRecord;window.editServiceRecord=editServiceRecord;window.deleteServiceRecord=deleteServiceRecord;window.getServiceMonth=getServiceMonth;window.getServiceTotal=getServiceTotal;window.getServiceGrandTotal=getServiceGrandTotal;
