function ModelInit() {
    clock = new Clock();
    clock.setDt(new Date().getTime() / 1000.);
    user = new User(1,      //ID пользователя
        1000);  //Количество кредитов

    listMapObject = new ListMapObject();
}


var timerDelay = 20; //константа задающая временной интервал таймера (юзать по всему проекту только это)
var user;
var clock;
var timer;
var listMapObject;