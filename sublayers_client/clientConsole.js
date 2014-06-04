// Функция инициализации объектов, пока сделаем только объект User
function initialize(user, clock){
    var mt = new MoveLine(new Date().getTime(),50,2,3,new Point(2,2),new Point(1,1),new Point (0,0))
    user.userCar = new UserCar(152,mt,2,150,100,50)

    clock1.setDt(new Date().getTime())
}

// Выводит сообщение в инбокс - тестовая функция
function addTextToInbox(str){
    var str = "<div class=\"message\" >" + str + " </div>";
    var node = $(str);
    node.hide();
    $("#inbox").append(node);
    node.slideDown();
}

// Функция для отображения графики по таймауту, в нашем случае пока она только пересчитывает координаты и выводжит куда-то
function timer(){
    var p = user.userCar.getCurrentCoord(clock1.getCurrentTime());
    addTextToInbox( p.x + " - "+ p.y);
}

addTextToInbox("Готовимся инициализировать");
var user = new User(15, 22);
var clock1 = new Clock(10);
var mt = new MoveLine(new Date().getTime(),50,2,3,new Point(2,2),new Point(1,1),new Point (0,0))
user.userCar = new UserCar(152,mt,2,150,100,50)
clock1.setDt(new Date().getTime())
//initialize(user, clock)

addTextToInbox("Инициализация завершена. Запускаем таймер:");
var myTimer = setInterval(timer, 500)