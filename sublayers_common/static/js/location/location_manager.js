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
        console.log('LocationManager.prototype.openBuilding', buildingName);
        if (!this.buildings.hasOwnProperty(buildingName)) return;

        var building = this.buildings[buildingName];
        console.log(building);
        this.screens.location_screen = building;

        // Перейти в новое здание если мы сейчас на экране локации
        if (this.active_screen_name == 'location_screen')
            building.activate();


        //function openBuilding(building_name) {
    //    $('.townPageWrap').css('display', 'none');
    //
    //    $('#img_grid').css('opacity', '0.5');
    //    $('#building_' + building_name).css('display', 'block');
    //    for (var i = 6; i < 10; i ++)
    //        setBtnDisplay(i, "none");
    //    $("#btn_5_select").mouseup(function(event) { openTown(); });
    //}
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
            console.log(building_rec);
            this.buildings[building_rec.key] = new LocationPlace(building_rec, this.jq_town_div);
        }
        this.active_screen_name = 'location_screen';

        this.setBtnState(3, '</br>Назад', true);
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
        //console.log('LocationManager.prototype.onExit');
        $('#btn_' + btnIndex + '_text').html(btnText);
        if (active) {
            $('#btn_' + btnIndex + '_noactive').css('display', 'none');
            $('#btn_' + btnIndex + '_active').css('display', 'block');
        } else {
            $('#btn_' + btnIndex + '_noactive').css('display', 'block');
            $('#btn_' + btnIndex + '_active').css('display', 'none');
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
    function LocationPlace(building_rec, jq_main_div) {
        this.building_rec = building_rec;
        this.jq_main_div = jq_main_div.find('#building_' + this.building_rec.key);
    }

    LocationPlace.prototype.activate = function () {
        //console.log('LocationPlace.prototype.activate');

        $('#layer2').css('display', 'none');
        $('#landscape').css('display', 'none');
        $('.building-back').css('display', 'none');
        $('#' + this.building_rec.key + '-back').css('display', 'block');

        // todo: выключить все места, здания и специалистов
        this.jq_main_div.css('display', 'block');
        locationManager.screens[locationManager.active_screen_name] = this;
    };

    LocationPlace.prototype.clear = function () {
        //console.log('LocationPlace.prototype.clear');
        if (this.jq_main_div)
            this.jq_main_div.empty();
        this.jq_main_div = null;
    };

    return LocationPlace;
})();


var locationManager;



