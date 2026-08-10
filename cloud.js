// MaDenFlow Cloud 5.0
console.log("☁️ Cloud module loaded");
let cloudEnabled=false;
function cloudLoad(){if(!cloudEnabled)return;console.log("Загрузка из облака не настроена: требуется backend/provider.")}
function cloudSave(){if(!cloudEnabled)return;console.log("Сохранение в облако не настроено: требуется backend/provider.")}
window.cloudLoad=cloudLoad;window.cloudSave=cloudSave;