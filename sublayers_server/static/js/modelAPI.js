function ModelInit() {
    clock = new Clock();
    clock.setDt(new Date().getTime() / 1000.);
    user = new User(1,      //ID пользователя
        1000);  //Количество кредитов

    listMapObject = new ListMapObject();
    ownerList = new OwnerList();
    iconLeafletInit();


    radialMenu = new RadialMenu({
        radiusOut: 70, // Внешний радиус, по сути означает радиус всего меню
        radiusIn: 30,    // Внутренний радиус
        count: 4,      // кол-во элементов меню
        menuName: 'radialMenuName',
        parentSVG: 'radialMenuSVG',
        parentDiv: 'radialMenuDiv'
    }).hideMenu();


}

