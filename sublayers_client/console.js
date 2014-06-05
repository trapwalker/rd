// Выводит сообщение в инбокс - тестовая функция.
function addTextToInbox(astr){
    var str = "<div class=\"message\" >" + astr + " </div>";
    var node = $(str);
    node.hide();
    $("#inbox").append(node);
    node.slideDown();
};

function addDivToInbox(divID, astr){  // Если такой див есть, то текст меняется в нём, иначе
    if($("#"+divID).length) { // Если существует, то поменять в нём текст параграфа
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

function newIDFromP(){
    IDNum++;
    return "d"+IDNum;
}

// Функция для отображения графики по таймауту, в нашем случае пока она только пересчитывает координаты и выводжит куда-то
function timer(){
    var p = user.userCar.getCurrentCoord(clock1.getCurrentTime());
    var f = user.userCar.getCurrentFuel(clock1.getCurrentTime());
    var a = user.userCar.getCurrentDirection(clock1.getCurrentTime());

    var p2 = car2.getCurrentCoord(clock1.getCurrentTime());
    var f2 = car2.getCurrentFuel(clock1.getCurrentTime());
    var a2 = car2.getCurrentDirection(clock1.getCurrentTime());

    //addTextToInbox( "P = {"+ p.x + "; "+ p.y+"};       Fuel =" + f + "    Angle ="+a);

    addDivToInbox(user.userCar.ID, "P = {"+ p.x + "; "+ p.y+"};       Fuel =" + f + "    Angle ="+a, "#p1");
    addDivToInbox(car2.ID, "P = {"+ p2.x + "; "+ p2.y+"};       Fuel =" + f2 + "    Angle ="+a2, "#p1");
};

$(document).ready(function() {
    //addTextToInbox("Готовимся инициализировать");
    addDivToInbox(newIDFromP(),"Готовимся инициализировать");
    user = new User(15, 22);
    clock1 = new Clock();
    var mt = new MoveLine(new Date().getTime()/1000. , 500, 0.25, 3, new Point(2, 2), new Point(10, 0), new Point(-1, 0));

    var mt2 = new MoveLine(new Date().getTime()/1000. , 300, 0.25, 3, new Point(2, 2), new Point(3, 0), new Point(0, 0));
    car2 = new MapCar(38,mt2,2,200);

    user.userCar = new UserCar(152, mt, 2, 150, 100, 50);
    clock1.setDt(new Date().getTime()/1000.);

    //addTextToInbox("Инициализация завершена. Запускаем таймер:");
    addDivToInbox(newIDFromP(),"Инициализация завершена. Запускаем таймер:");
    var myTimer = setInterval(timer, 500);

});

var user;
var clock1;
var car2;
var IDNum = 0;
