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

    LocationManager.prototype.onEnter = function (data) {
        //console.log('LocationManager.prototype.onEnter', data);
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

    return LocationPlace;
})();


var LocationPlaceBuilding = (function (_super) {
    __extends(LocationPlaceBuilding, _super);

    function LocationPlaceBuilding(building_rec, jq_town_div) {
        console.log('LocationPlaceBuilding', building_rec);
        this.building_rec = building_rec;
        _super.call(this, jq_town_div.find('#building_' + this.building_rec.key), 'location_screen');

        // Если в здании есть глава то отрисовать его
        if (building_rec.build.head) {
            var jq_header = this.jq_main_div.find('.npc-header');
            jq_header.find('.npc-photo').attr('src', building_rec.build.head.photo);
            jq_header.find('.npc-name').text(building_rec.build.head.title + ':');
            if (building_rec.build.head.text)
                jq_header.find('.npc-text').text('- ' + building_rec.build.head.text);
        }

        // todo: заполнить квесты


    }

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


var locationManager;



