function ModelInit() {
    clock = new Clock();
    clock.setDt(new Date().getTime() / 1000.);
    user = new User(1,      //ID пользователя
        1000);  //Количество кредитов

    listMapObject = new ListMapObject();
    ownerList = new OwnerList();
    iconLeafletInit();
}

