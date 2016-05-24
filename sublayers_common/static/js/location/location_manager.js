var LocationManager = (function () {
    function LocationManager() {
        this.active_screen_name = null;
        this.screens = {
            location_screen: null,
            chat_screen: null,
            menu_screen: null
        };

        // todo: добавить дивы панелей
        this.panel_left = new LocationPanelInfo(null);
        this.panel_right = new LocationPanelInfo(null);

        this.jq_town_div = $('#activeTownDiv');

        // Дикт всех зданий
        this.buildings = {};

        // Дикт всех специалистов
        this.npc = {};
    }

    // Активация отдельныхъ веток города (Чат, Локация, Журнал)
    LocationManager.prototype.activateScreen = function (screenName) {
        //console.log('LocationManager.prototype.activateScreen');
        if (this.screens.hasOwnProperty(screenName)) {
            this.active_screen_name = screenName;
            locationManager.screens[screenName].activate();
        }
    };

    LocationManager.prototype.openBuilding = function (buildingName) {
        //console.log('LocationManager.prototype.openBuilding', buildingName);
        if (!this.buildings.hasOwnProperty(buildingName)) return;
        var building = this.buildings[buildingName];
        building.activate();
    };

    LocationManager.prototype.openNPC = function (npcHTMLHash) {
        console.log('LocationManager.prototype.openNPC', npcHTMLHash);
        if (!this.npc.hasOwnProperty(npcHTMLHash)) return;
        var npc = this.npc[npcHTMLHash];
        npc.activate();
    };

    LocationManager.prototype.onEnter = function (data) {
        console.log('LocationManager.prototype.onEnter', data);
        this.onExit();

        // Закрыть все окна
        windowTemplateManager.closeAllWindows();

        // Вставляем верстку города
        this.jq_town_div.append(data.location_html);
        $('#activeTownDivBack').css('display', 'block');

        // Установить дивы панелей
        this.panel_left.init(this.jq_town_div.find('#townLeftPanel'));
        this.panel_right.init(this.jq_town_div.find('#townRightPanel'));

        // Создаем окна зданий
        for (var i = 0; i < data.location.example_town.buildings.length; i++) {
            var building_rec = data.location.example_town.buildings[i];
            this.buildings[building_rec.key] = new LocationPlaceBuilding(building_rec, this.jq_town_div);
        }
        this.active_screen_name = 'location_screen';

        this.setBtnState(1, '', false);
        this.setBtnState(2, '', false);
        this.setBtnState(3, '</br>Назад', false);
        this.setBtnState(4, '</br>Выход', true);

        //locationManager.location_uid = event.location.uid;
        //chat.showChatInTown();
        //locationManager.visitorsManager.update_visitors();
        //locationManager.nucoil.update();
        //locationManager.armorer.update();
        //locationManager.mechanic.update();
        //locationManager.tuner.update();
        //locationManager.trader.updatePlayerInv();
        //locationManager.trader.updateTraderInv();
        //locationManager.trader.updatePrice();
        //locationManager.hangar.update();
        //locationManager.parking.update();
        // Запрос RGP информации для тренера
        //clientManager.sendGetRPGInfo();
        // Принудительно перерисовать все квесты
        //journalManager.quest.redraw();
    };

    LocationManager.prototype.onExit = function () {
        //console.log('LocationManager.prototype.onExit');

        // Сброс панелей
        this.panel_left.clear();
        this.panel_right.clear();

        this.jq_town_div.empty();
        $('#activeTownDivBack').css('display', 'none');

        // Сбрасываем все здания
        for (var key in this.buildings)
            if (this.buildings.hasOwnProperty(key))
                this.buildings[key].clear();
        this.buildings = {};

        // Сбрасываем всех специалистов
        for (var key in this.npc)
            if (this.npc.hasOwnProperty(key))
                this.npc[key].clear();
        this.npc = {};

        //chat.showChatInMap();
        //locationManager.location_uid = null;
        //locationManager.visitorsManager.clear_visitors();
        //locationManager.nucoil.clear();
        //locationManager.armorer.clear();
        //locationManager.mechanic.clear();
        //locationManager.tuner.clear();
        //locationManager.trader.clear();
        //locationManager.trainer.clear();
    };

    LocationManager.prototype.setBtnState = function (btnIndex, btnText, active) {
        //console.log('LocationManager.prototype.setBtnState', btnIndex, btnText, active);
        $('#btn_' + btnIndex + '_text').html(btnText);
        if (active) {
            $('#btn_' + btnIndex + '_noactive').css('display', 'none');
            $('#btn_' + btnIndex + '_active').css('display', 'block');
        } else {
            $('#btn_' + btnIndex + '_noactive').css('display', 'block');
            $('#btn_' + btnIndex + '_active').css('display', 'none');

            $('#btn_' + btnIndex + '_hover').css('display', 'none');
            $('#btn_' + btnIndex + '_pressed').css('display', 'none');
            $('#btn_' + btnIndex + '_text').removeClass('hover');
            $('#btn_' + btnIndex + '_text').removeClass('pressed');
        }
    };

    LocationManager.prototype.clickBtn = function (btnIndex) {
        //console.log('LocationManager.prototype.clickBtn', btnIndex);
        if (btnIndex == 4) { // Попытка выйти из города
            console.log('Попытка выйти из города');
            if (user.example_car)
                clientManager.sendExitFromLocation();
            else
                alert('Попытка выйти из города без машинки !');
        }
        else {
            if (this.screens[this.active_screen_name])
                this.screens[this.active_screen_name].clickBtn(btnIndex);
        }
    };

    return LocationManager;
})();


var LocationPanelInfo = (function () {
    function LocationPanelInfo() {
        this.jq_main_div = null;
    }

    LocationPanelInfo.prototype.init = function (jq_main_div) {
        //console.log('LocationPanelInfo.prototype.init');
        this.jq_main_div = jq_main_div;
    };

    LocationPanelInfo.prototype.clear = function () {
        //console.log('LocationPanelInfo.prototype.init');
        if (this.jq_main_div)
            this.jq_main_div.empty();
        this.jq_main_div = null;
    };

    return LocationPanelInfo;
})();


var LocationPlace = (function () {
    function LocationPlace(jq_main_div, screen_name) {
        this.jq_main_div = jq_main_div;
        this.screen_name = screen_name;
    }

    LocationPlace.prototype.activate = function () {
        //console.log('LocationPlace.prototype.activate');

        // Выключить ландшафт здания и специалистов
        $('#layer2').css('display', 'none');
        $('#landscape').css('display', 'none');
        $('.building-back').css('display', 'none');
        $('.townPageWrap').css('display', 'none');

        // Включить своё окно
        this.jq_main_div.css('display', 'block');
        if (this.screen_name) // если для локации указан конкретный скрин, то записаться в него
            locationManager.screens[this.screen_name] = this;
        else // если нет, то записаться в последний активный
            locationManager.screens[locationManager.active_screen_name] = this;

        // Настроить кнопки
        this.set_buttons();
    };

    LocationPlace.prototype.set_buttons = function () {
        locationManager.setBtnState(1, '', false);
        locationManager.setBtnState(2, '', false);
        locationManager.setBtnState(3, '', false);
        locationManager.setBtnState(4, '', false);
    };

    LocationPlace.prototype.clear = function () {
        //console.log('LocationPlace.prototype.clear');
        if (this.jq_main_div)
            this.jq_main_div.empty();
        this.jq_main_div = null;
    };

    LocationPlace.prototype.clickBtn = function (btnIndex) {};

    LocationPlace.prototype.update = function (data) {};

    LocationPlace.prototype._getNPCByType = function (type, npc_rec, jq_town_div, key) {
        //console.log('LocationPlace.prototype._getNPCClass', type);
        switch (type) {
            case 'hangar':
                return (new LocationHangarNPC(npc_rec, jq_town_div, key));
            case 'parking':
                return (new LocationParkingNPC(npc_rec, jq_town_div, key));
            default:
                return (new LocationPlaceNPC(npc_rec, jq_town_div, key));
        }
        console.log('Мы тут не должны быть!!!');
    };

    return LocationPlace;
})();


var LocationPlaceBuilding = (function (_super) {
    __extends(LocationPlaceBuilding, _super);

    function LocationPlaceBuilding(building_rec, jq_town_div) {
        //console.log('LocationPlaceBuilding', building_rec);
        this.building_rec = building_rec;
        _super.call(this, jq_town_div.find('#building_' + this.building_rec.key), 'location_screen');

        // Если в здании есть глава то отрисовать его
        //if (building_rec.build.head) {
        //    var jq_header = this.jq_main_div.find('.npc-header');
        //    jq_header.find('.npc-photo').attr('src', building_rec.build.head.photo);
        //    jq_header.find('.npc-name').text(building_rec.build.head.title + ':');
        //    if (building_rec.build.head.text)
        //        jq_header.find('.npc-text').text('- ' + building_rec.build.head.text);
        //}

        // Создаем специалистов этого здания
        for (var i = 0; i < this.building_rec.build.instances.length; i++) {
            var npc_rec = this.building_rec.build.instances[i];
            if (!locationManager.npc.hasOwnProperty(npc_rec.html_hash))
                locationManager.npc[npc_rec.html_hash] = this._getNPCByType(npc_rec.type, npc_rec, jq_town_div, this.building_rec.key);
            else
                console.warn('Специалист ' + npc_rec.title + ' находится в нескольких зданиях одновременно');
        }

        this.resizeNPCList(this.jq_main_div.find('.building-npc-list'));

        this.active_screen_name = 'location_screen';

        // todo: заполнить квесты
    }

    LocationPlaceBuilding.prototype.resizeNPCList = function (jq_list) {
        var width = 0;
        if (jq_list) {
            jq_list.children().each(function (index, element) {
                if ($(element).css('display') == 'block')
                    width += $(element).outerWidth() + parseInt($(element).css('margin-right'));
            });
            jq_list.width(width);
        }
    };

    LocationPlaceBuilding.prototype.activate = function () {
        //console.log('LocationPlaceBuilding.prototype.activate');
        _super.prototype.activate.call(this);
        $('#' + this.building_rec.key + '-back').css('display', 'block');
    };

    LocationPlaceBuilding.prototype.clickBtn = function (btnIndex) {
        //console.log('LocationPlaceBuilding.prototype.clickBtn', btnIndex);
        switch (btnIndex) {
            case '3':
                $('#layer2').css('display', 'block');
                $('#landscape').css('display', 'block');
                $('.building-back').css('display', 'none');
                this.jq_main_div.css('display', 'none');
                if (this.screen_name) // если для локации указан конкретный скрин, то записаться в него
                    locationManager.screens[this.screen_name] = null;
                else // если нет, то записаться в последний активный
                    locationManager.screens[locationManager.active_screen_name] = null;

                locationManager.setBtnState(1, '', false);
                locationManager.setBtnState(2, '', false);
                locationManager.setBtnState(3, '</br>Назад', false);
                locationManager.setBtnState(4, '</br>Выход', true);

                break;
            case '4':
                console.log('выход из города');
                break;
        }
    };

    LocationPlaceBuilding.prototype.set_buttons = function () {
        locationManager.setBtnState(3, '</br>Назад', true);
        locationManager.setBtnState(4, '</br>Выход', true);
    };

    return LocationPlaceBuilding;
})(LocationPlace);


var LocationPlaceNPC = (function (_super) {
    __extends(LocationPlaceNPC, _super);

    function LocationPlaceNPC(npc_rec, jq_town_div, building_name) {
        //console.log('LocationPlaceNPC', npc_rec);
        this.npc_rec = npc_rec;
        this.owner_name = building_name;

        _super.call(this, $('#npc_' + npc_rec.html_hash), 'location_screen');

        console.log(this);
        this.get_self_info();
    }

    LocationPlaceNPC.prototype.activate = function () {
        //console.log('LocationPlaceBuilding.prototype.activate');
        _super.prototype.activate.call(this);
        if (this.owner_name)
            $('#' + this.owner_name + '-back').css('display', 'block');
    };

    LocationPlaceNPC.prototype.clickBtn = function (btnIndex) {
        console.log('LocationPlaceBuilding.prototype.clickBtn', btnIndex);
        switch (btnIndex) {
            case '3':
                if (this.owner_name)
                    locationManager.openBuilding(this.owner_name);
                else {

                    $('#layer2').css('display', 'block');
                    $('#landscape').css('display', 'block');

                    this.jq_main_div.css('display', 'none');

                    if (this.screen_name) // если для локации указан конкретный скрин, то записаться в него
                        locationManager.screens[this.screen_name] = null;
                    else // если нет, то записаться в последний активный
                        locationManager.screens[locationManager.active_screen_name] = null;

                    locationManager.setBtnState(1, '', false);
                    locationManager.setBtnState(2, '', false);
                    locationManager.setBtnState(3, '</br>Назад', false);
                    locationManager.setBtnState(4, '</br>Выход', true);
                }
                break;
            case '4':
                //console.log('выход из города');
                break;
        }
    };

    LocationPlaceNPC.prototype.set_buttons = function () {
        locationManager.setBtnState(3, '</br>Назад', true);
        locationManager.setBtnState(4, '</br>Выход', true);
    };

    LocationPlaceNPC.prototype.get_self_info = function () { return false; };

    return LocationPlaceNPC;
})(LocationPlace);


var LocationHangarNPC = (function (_super) {
    __extends(LocationHangarNPC, _super);

    function LocationHangarNPC(npc_rec, jq_town_div, building_name) {
        //console.log('LocationPlaceNPC', npc_rec);
        _super.call(this, npc_rec, jq_town_div, building_name);
        this.cars_list = [];
    }

    LocationHangarNPC.prototype.get_self_info = function () {
        //console.log('LocationPlaceBuilding.prototype.get_self_info');
        clientManager.sendGetHangarInfo(this);
    };

    LocationHangarNPC.prototype.update = function (data) {
        console.log('LocationPlaceBuilding.prototype.update', data);
        _super.prototype.update.call(this, data);

        if (data.cls == 'HangarInfoMessage') {
            this.cars_list = data.cars;

            var jq_car_list = this.jq_main_div.find('.hangar-center').first();
            var jq_car_list_inventory = this.jq_main_div.find('.hangar-car-list-list').first();

            jq_car_list.empty();
            jq_car_list_inventory.empty();

            for (var i = 0; i < this.cars_list.length; i++) {
                var car_rec = this.cars_list[i];
                console.log(car_rec);
                var jq_car = $('<div id="hangar-center-info-car-' + i + '" class="hangar-center-info-car-wrap"></div>');
                var jq_car_content = $('<div class="car-info-block-main">' +
                    '<div class="car-info-block-picture-hangar">' + car_rec.html_car_img + '</div>' +
                    '<div class="car-info-block-info-hangar">' + car_rec.html_car_table + '</div></div>');
                jq_car.append(jq_car_content);
                jq_car_list.append(jq_car);

                var jq_inv_car = $(
                    '<div class="hangar-car-list-itemWrap" data-car_number="' + i + '" ' +
                    'data-car_price="' + car_rec.car.price + '">' +
                    '<div class="hangar-car-list-item">' +
                    '<div class="hangar-car-list-pictureWrap" ' +
                    'style="background: url(' + car_rec.car.inv_icon_mid + ') no-repeat center"></div>' +
                    '<div class="hangar-car-list-name">' + car_rec.car.title + '</div></div></div>'
                );
                jq_car_list_inventory.append(jq_inv_car);
            }
        }
    };

    LocationHangarNPC.prototype.set_buttons = function () {
        locationManager.setBtnState(3, '</br>Назад', true);
        locationManager.setBtnState(4, '</br>Выход', true);
    };

    return LocationHangarNPC;
})(LocationPlaceNPC);

var LocationParkingNPC = (function (_super) {
    __extends(LocationParkingNPC, _super);

    function LocationParkingNPC(npc_rec, jq_town_div, building_name) {
        //console.log('LocationPlaceNPC', npc_rec);
        _super.call(this, npc_rec, jq_town_div, building_name);
        this.cars_list = [];
    }

    LocationParkingNPC.prototype.get_self_info = function () {
        clientManager.sendGetParkingInfo(this);
    };

    LocationParkingNPC.prototype.update = function (data) {
        console.log('LocationParkingNPC.prototype.update', data);
        _super.prototype.update.call(this, data);

        if (data.cls == 'ParkingInfoMessage') {
            this.cars_list = data.cars;

            var jq_car_list = this.jq_main_div.find('.hangar-center').first();
            var jq_car_list_inventory = this.jq_main_div.find('.hangar-car-list-list').first();

            jq_car_list.empty();
            jq_car_list_inventory.empty();

            for (var i = 0; i < this.cars_list.length; i++) {
                var car_rec = this.cars_list[i];
                console.log(car_rec);
                var jq_car = $('<div id="hangar-center-info-car-' + i + '" class="hangar-center-info-car-wrap"></div>');
                var jq_car_content = $('<div class="car-info-block-main">' +
                    '<div class="car-info-block-picture-hangar">' + car_rec.html_car_img + '</div>' +
                    '<div class="car-info-block-info-hangar">' + car_rec.html_car_table + '</div></div>');
                jq_car.append(jq_car_content);
                jq_car_list.append(jq_car);

                var jq_inv_car = $(
                    '<div class="hangar-car-list-itemWrap" data-car_number="' + i + '" ' +
                    'data-car_price="' + car_rec.car.price + '">' +
                    '<div class="hangar-car-list-item">' +
                    '<div class="hangar-car-list-pictureWrap" ' +
                    'style="background: url(' + car_rec.car.inv_icon_mid + ') no-repeat center"></div>' +
                    '<div class="hangar-car-list-name">' + car_rec.car.title + '</div></div></div>'
                );
                jq_car_list_inventory.append(jq_inv_car);
            }
        }
    };

    LocationParkingNPC.prototype.set_buttons = function () {
        locationManager.setBtnState(3, '</br>Назад', true);
        locationManager.setBtnState(4, '</br>Выход', true);
    };

    return LocationParkingNPC;
})(LocationPlaceNPC);


var locationManager;



