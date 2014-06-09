function addDivToInbox(divID, astr) {  // Если такой див есть, то текст меняется в нём, иначе
    if ($("#"+divID).length) {  // Если существует, то поменять в нём текст параграфа
        $("#"+divID).text(astr)
        return;
    }
    // создать див с именем divID
    var str = "<div id=\"" + divID + "\" class=\"message\">" + astr + "</div>";
    var node = $(str);
    node.hide();
    $("#inbox").append(node);
    node.slideDown();
};

function newIDFromP() {
    IDNum++;
    return "d" + IDNum;
}

// Функция для отображения графики по таймауту, в нашем случае пока она только пересчитывает координаты и выводжит куда-то
function timerRepaint() {
    for (var key in listMapObject.objects){
        var p2 = listMapObject.objects[key].getCurrentCoord(clock.getCurrentTime());
        var f2 = listMapObject.objects[key].getCurrentFuel(clock.getCurrentTime());
        var a2 = listMapObject.objects[key].getCurrentDirection(clock.getCurrentTime());

        addDivToInbox(listMapObject.objects[key].ID, "ID=" + listMapObject.objects[key].ID +"  P = {" + p2.x + "; "+ p2.y + "};       Fuel =" + f2 + "    Angle =" + a2, "#p1");
    }

};

function Init() {
    user = new User(-1, -1);
    clock = new Clock();
    listMapObject = new ListMapObject();
    //WSJSON.Init();
}

$(document).ready(function() {
    Init();

    addDivToInbox(newIDFromP(), "Готовимся инициализировать");

    clock.setDt(new Date().getTime() / 1000.);

    var mt1 = new MoveLine(new Date().getTime() / 1000. , 500, 0.25, new Point(2, 2), new Point(10, 0), new Point(-1, 0));
    var mt2 = new MoveLine(new Date().getTime() / 1000. , 300, 0.25, new Point(2, 2), new Point(3, 2), new Point(0, 0));

    listMapObject.add(new MapCar(0, 2, 200, mt1));
    listMapObject.add(new MapCar(1, 2, 200, mt2));

    addDivToInbox(newIDFromP(), "Инициализация завершена. Запускаем таймер:");
    var myTimer = setInterval(timerRepaint, 50);
});

var IDNum = 0;


//основные переменные
var user;
var clock;
var listMapObject;