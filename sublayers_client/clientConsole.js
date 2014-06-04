// Функция инициализации объектов, пока сделаем только объект User
function initialize(user, clock){
    var mt = new MoveLine(new Date().getTime(),50,2,3,new Point(2,2),new Point(1,1),new Point (0,0));
    user.userCar = new UserCar(152,mt,2,150,100,50);

    clock1.setDt(new Date().getTime());
};

// Выводит сообщение в инбокс - тестовая функция
function addTextToInbox(astr){
    var str = "<div class=\"message\" >" + astr + " </div>";
    var node = $(str);
    node.hide();
    $("#inbox").append(node);
    node.slideDown();
};

// Функция для отображения графики по таймауту, в нашем случае пока она только пересчитывает координаты и выводжит куда-то
function timer(){
    var p = user.userCar.getCurrentCoord(clock1.getCurrentTime());
    var f = user.userCar.track.getCurrentFuel(clock1.getCurrentTime());
    addTextToInbox( "P = {"+ p.x + "; "+ p.y+"};       Fuel =" + f);
};

$(document).ready(function() {
    addTextToInbox("Готовимся инициализировать");
    user = new User(15, 22);
    clock1 = new Clock();
    var mt = new MoveLine(new Date().getTime()/1000. , 500, 0.25, 3, new Point(2, 2), new Point(1, 1), new Point(0, 0));
    user.userCar = new UserCar(152, mt, 2, 150, 100, 50);
    clock1.setDt(new Date().getTime()/1000.);
//initialize(user, clock)

    addTextToInbox("Инициализация завершена. Запускаем таймер:");
    var myTimer = setInterval(timer, 500);
});

var user;
var clock1;
