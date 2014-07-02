function timerRepaint() {
    redrawMap();
}

function ModelInit() {
    clock = new Clock();
    clock.setDt(new Date().getTime() / 1000.);

    user = new User(1,      //ID пользователя
        1000);  //Количество кредитов

    user.userCar = new UserCar(2,       //ID машинки
        0,       //Тип машинки
        100,      //HP машинки
        30,      //Максималка
        null);   //Текущая траектория
    user.userCar.track = new MoveLine(clock.getCurrentTime(),       //Время начала движения
        100,                          //Запас топлива
        1,                            //Расход топлива
        new Point(10093693, 5646447), //Начальная точка
        new Point(15, 0),              //Скорость
        new Point(0, 0));             //Ускорение

    //user.userCar.track.direction = new Point(1,-1);

    listMapObject = new ListMapObject();
}

$(document).ready(function () {
    ModelInit();
    timer = setInterval(timerRepaint, timerDelay);
    var myTestTimer = setInterval(newRandSpeed, 1000); //для рандомного перемещения машинок
});

var timerDelay = 20; //константа задающая временной интервал таймера (юзать по всему проекту только это)
var user;
var clock;
var timer;
var listMapObject;