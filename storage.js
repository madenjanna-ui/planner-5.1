// MaDenFlow Storage 5.0
const STORAGE_KEY="MaDenFlow_data";
const defaultData={tasks:{},service:{},recurrences:[],settings:{darkMode:false,email:"",fontSize:"medium",theme:"standard",notifications:false}};
let appData=loadStorage();
window.tasks=appData.tasks; window.service=appData.service;
function loadStorage(){try{const raw=localStorage.getItem(STORAGE_KEY);const data=raw?JSON.parse(raw):structuredClone(defaultData);return {...structuredClone(defaultData),...data,tasks:data.tasks||{},service:data.service||{},recurrences:data.recurrences||[],settings:{...defaultData.settings,...(data.settings||{})}}}catch(e){return structuredClone(defaultData)}}
function saveStorage(){localStorage.setItem(STORAGE_KEY,JSON.stringify(appData));if(typeof cloudSave==='function')cloudSave();}
function saveTasks(){saveStorage()}
function getTasks(date){if(!tasks[date])tasks[date]=[];return sortTasks(tasks[date])}
function sortTasks(list){list.sort((a,b)=>{const ta=a.time||"99:99",tb=b.time||"99:99";return ta.localeCompare(tb)||((a.created||0)-(b.created||0))});return list}
function addTask(date,text,options={}){const item={text,done:false,priority:"normal",time:options.time||"",created:Date.now(),recurrenceId:options.recurrenceId||null};getTasks(date).push(item);sortTasks(getTasks(date));saveStorage();return item}
function addRecurringTask(startDate,text,type,until,time=""){const id="r_"+Date.now()+"_"+Math.random().toString(36).slice(2,7);const start=new Date(startDate+"T12:00:00");const end=new Date((until||new Date(start.getFullYear()+1,start.getMonth(),start.getDate()).toISOString().slice(0,10))+"T12:00:00");let d=new Date(start);let guard=0;while(d<=end&&guard<500){const date=localDateKey(d);addTask(date,text,{recurrenceId:id,time});if(type==="daily")d.setDate(d.getDate()+1);else if(type==="weekly")d.setDate(d.getDate()+7);else if(type==="weekdays"){do{d.setDate(d.getDate()+1)}while(d<=end&&(d.getDay()===0||d.getDay()===6))}else if(type==="monthly"){d.setMonth(d.getMonth()+1)}else break;guard++}appData.recurrences.push({id,startDate,text,type,until:end.toISOString().slice(0,10),time});saveStorage()}
function localDateKey(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function deleteTask(date,index){if(!tasks[date])return;tasks[date].splice(index,1);if(!tasks[date].length)delete tasks[date];saveStorage()}
function editTask(date,index,text,time){if(!tasks[date])return;tasks[date][index].text=text;if(time!==undefined)tasks[date][index].time=time||"";sortTasks(tasks[date]);saveStorage()}
function toggleTask(date,index,done){if(!tasks[date])return;tasks[date][index].done=done;saveStorage()}
function changePriority(date,index,priority){if(!tasks[date])return;tasks[date][index].priority=priority;saveStorage()}
function getServiceMonth(month){if(!service[month])service[month]=[];return service[month]}
function addServiceRecord(month,record){getServiceMonth(month).push({date:record.date,hours:Number(record.hours)||0,minutes:Number(record.minutes)||0,created:Date.now()});saveStorage()}
function editServiceRecord(month,index,record){if(!service[month])return;service[month][index]={...service[month][index],date:record.date,hours:Number(record.hours)||0,minutes:Number(record.minutes)||0};saveStorage()}
function deleteServiceRecord(month,index){if(!service[month])return;service[month].splice(index,1);if(!service[month].length)delete service[month];saveStorage()}
function getServiceTotal(month){let total=(service[month]||[]).reduce((s,x)=>s+x.hours*60+x.minutes,0);return{hours:Math.floor(total/60),minutes:total%60}}
function getServiceGrandTotal(){let total=Object.values(service).flat().reduce((s,x)=>s+x.hours*60+x.minutes,0);return{hours:Math.floor(total/60),minutes:total%60}}
window.localDateKey=localDateKey;window.saveStorage=saveStorage;window.addTask=addTask;window.addRecurringTask=addRecurringTask;window.deleteTask=deleteTask;window.editTask=editTask;window.toggleTask=toggleTask;window.changePriority=changePriority;window.getTasks=getTasks;window.addServiceRecord=addServiceRecord;window.editServiceRecord=editServiceRecord;window.deleteServiceRecord=deleteServiceRecord;window.getServiceMonth=getServiceMonth;window.getServiceTotal=getServiceTotal;window.getServiceGrandTotal=getServiceGrandTotal;