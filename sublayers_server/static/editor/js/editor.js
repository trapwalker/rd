
function mapClick(){
    currWorkMode.onClick()
}



$(document).ready(function () {
    // инициализация карты
    myMap = L.map('map', {
        zoomControl: true
    }).setView([50.595, 36.59], 6);
    tileLayerShow = L.tileLayer(mapBasePath).addTo(myMap);
    myMap.on('click', mapClick);



});


function changeWorkMode(mode){
    // Отключить старый режим

    // Веключить новый режим
    mode();
}




function setRoadMode(){

}










var myMap;
var currWorkMode;

//Путь к карте на сервере
var mapBasePath = 'http://{s}.tile.osm.org/{z}/{x}/{y}.png';