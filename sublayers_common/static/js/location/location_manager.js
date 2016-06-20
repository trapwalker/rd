var LocationManager = (function () {
    function LocationManager() {
        this.active_screen_name = null;
        this.screens = {
            location_screen: null,
            chat_screen: null,
            menu_screen: null
        };

        // Менеджер посетителей города
        this.visitor_manager = new LocationVisitorsManager();

        // todo: добавить дивы панелей
        this.panel_left = new LocationPanelInfo(null);
        this.panel_right = new LocationPanelInfo(null);

        this.jq_town_div = $('#activeTownDiv');

        // Дикт всех зданий
        this.buildings = {};

        // Дикт всех специалистов
        this.npc = {};

        // Дикт для всех локаций меню
        this.location_menu = null;

        // Локация чат
        this.location_chat = null;

        // Для различных эффектов в городе
        this.location_canvas_manager = new LocationCanvasManager();

        // todo: Придумать куда это перенести!
        this.locations_canvas_effects = {};
        var lasers_img = new Image();
        lasers_img.src = '/static/content/locations/towns/all_frames.png';
    }

    // Активация отдельныхъ веток города (Чат, Локация, Журнал)
    LocationManager.prototype.activateScreen = function (screenName, btn_id) {
        //console.log('LocationManager.prototype.activateScreen', screenName, btn_id);
        if (this.screens.hasOwnProperty(screenName)) {
            this.active_screen_name = screenName;
            var location = locationManager.screens[screenName];
            $('#btn_screen_location_pressed').css('display', 'none');
            $('#btn_screen_chat_pressed').css('display', 'none');
            $('#btn_screen_menu_pressed').css('display', 'none');
            if (location) {
                if (btn_id)
                    $('#' + btn_id).css('display', 'block');
                locationManager.screens[screenName].activate();
            } else {
                if (btn_id)
                    $('#' + btn_id).css('display', 'block');

                // Если вдруг что-то не так, то вернуть нас на главную страницу города
                $('.building-back').css('display', 'none');
                $('.townPageWrap').css('display', 'none');
                $('#layer2').css('display', 'block');
                $('#landscape').css('display', 'block');

                locationManager.setBtnState(1, '', false);
                locationManager.setBtnState(2, '', false);
                locationManager.setBtnState(3, '</br>Назад', false);
                locationManager.setBtnState(4, '</br>Выход', true);
            }
        }
    };

    LocationManager.prototype.openBuilding = function (buildingName) {
        //console.log('LocationManager.prototype.openBuilding', buildingName);
        if (!this.buildings.hasOwnProperty(buildingName)) return;
        var building = this.buildings[buildingName];
        building.activate();
    };

    LocationManager.prototype.openNPC = function (npcHTMLHash) {
        //console.log('LocationManager.prototype.openNPC', npcHTMLHash);
        if (!this.npc.hasOwnProperty(npcHTMLHash)) return;
        var npc = this.npc[npcHTMLHash];
        npc.activate();
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
            this.buildings[building_rec.key] = this._getBuildingByType(building_rec, this.jq_town_div);
        }
        this.active_screen_name = 'location_screen';

        this.setBtnState(1, '', false);
        this.setBtnState(2, '', false);
        this.setBtnState(3, '</br>Назад', false);
        this.setBtnState(4, '</br>Выход', true);

        // Локации меню
        this.location_menu = new LocationPlaceMenu(this.jq_town_div);

        // Локация чата
        this.location_chat = new LocationPlaceChat(this.jq_town_div);

        // Обновить список посетителей города
        this.visitor_manager.update_visitors();

        // Разрешаем отрисовку эффектов на канвас
        this.location_canvas_manager.init_canvas();
        this.location_canvas_manager.is_canvas_render = true;

        this.activateScreen('location_screen', 'btn_screen_location_pressed');

        // Принудительно перерисовать все квесты
        //journalManager.quest.redraw();
    };

    LocationManager.prototype.onExit = function () {
        //console.log('LocationManager.prototype.onExit');

        chat.showChatInMap();

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

        // Запрещаем отрисовку эффектов на канвас
        this.location_canvas_manager.is_canvas_render = false;

        // Очистка локаций меню
        if (this.location_menu) {
            this.location_menu.clear();
            this.location_menu = null;
        }

        // Очистка локации чата
        if (this.location_chat) {
            this.location_chat.clear();
            this.location_chat = null;
        }

        // Почистить менеджер посетителей города
        this.visitor_manager.clear_visitors();
    };

    LocationManager.prototype.setBtnState = function (btnIndex, btnText, active) {
        //console.log('LocationManager.prototype.setBtnState', btnIndex, btnText, active);
        $('#btn_' + btnIndex + '_text').html(btnText);
        if (active) {
            $('#btn_' + btnIndex + '_noactive').css('display', 'none');
            $('#btn_' + btnIndex + '_active').css('display', 'block');
            $('#btn_' + btnIndex + '_text').removeClass('noactive');
        } else {
            $('#btn_' + btnIndex + '_noactive').css('display', 'block');
            $('#btn_' + btnIndex + '_active').css('display', 'none');

            $('#btn_' + btnIndex + '_hover').css('display', 'none');
            $('#btn_' + btnIndex + '_pressed').css('display', 'none');
            $('#btn_' + btnIndex + '_text').removeClass('hover pressed');
            $('#btn_' + btnIndex + '_text').addClass('noactive');
        }
    };

    LocationManager.prototype.clickBtn = function (btnIndex) {
        //console.log('LocationManager.prototype.clickBtn', btnIndex);
        if (btnIndex == 4) { // Попытка выйти из города
            //console.log('Попытка выйти из города');
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

    LocationManager.prototype.update = function () {
        //console.log('LocationManager.prototype.update');
        for (var key in this.buildings)
            if (this.buildings.hasOwnProperty(key))
                this.buildings[key].update();

        for (var key in this.npc)
            if (this.npc.hasOwnProperty(key))
                this.npc[key].update();

        if (this.location_menu) this.location_menu.update();
    };

    LocationManager.prototype.isActivePlace = function (location_place) {
        //console.log('LocationManager.prototype.isActivePlace');
        return this.screens[this.active_screen_name] == location_place;
    };

    LocationManager.prototype._getBuildingByType = function (building_rec, jq_town_div) {
        //console.log('LocationManager.prototype._getBuildingByType', building_rec);
        switch (building_rec.key) {
            case 'autoservice':
                return (new LocationServiceBuilding(building_rec, jq_town_div));
            case 'nucoil':
                return (new LocationNucoilBuilding(building_rec, jq_town_div));
            default:
                return (new LocationPlaceBuilding(building_rec, jq_town_div));
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

    LocationPanelInfo.prototype.show = function (options, window_name) {
        //console.log('LocationPanelInfo.prototype.show', options, window_name);

        // Выключить все панели в этом блоке
        this.jq_main_div.find('.panel-info-item').css('display', 'none');

        // Попытаться включить нужную
        var window_method = 'show_' + window_name;
        if (this[window_method])
            this[window_method](options);
    };

    LocationPanelInfo.prototype.show_self_car_info = function (options) {
        //console.log('LocationPanelInfo.prototype.show_self_car_info', options);
        var jq_panel = this.jq_main_div.find('.panel-info-car-info').first();
        jq_panel.css('display', 'block');
        jq_panel.find('.panel-info-car-info-car').empty();
        jq_panel.find('.panel-info-car-info-car-name').text('');
        if (user.example_car) {
            jq_panel.find('.panel-info-car-info-car-name').text(user.example_car.name_car);
            jq_panel.find('.panel-info-car-info-car').append(user.templates.html_car_img);
        }
    };

    LocationPanelInfo.prototype.show_npc_transaction_info = function (options) {
        //console.log('LocationPanelInfo.prototype.show_npc_transaction_info', options);
        var jq_panel = this.jq_main_div.find('.panel-info-npc-transaction-info').first();
        jq_panel.css('display', 'block');

        jq_panel.find('.npc-transaction-info-money').text('0 нукойнов');
        if (user.example_agent)
            jq_panel.find('.npc-transaction-info-money').text(user.example_agent.balance + ' нукойнов');

        var jq_transaction_list = jq_panel.find('.npc-transaction-info-transaction-list');
        jq_transaction_list.empty();
        if (options.hasOwnProperty('transactions'))
            for (var i = 0; i < options.transactions.length; i++)
                jq_transaction_list.append('<div class="npc-transaction-info-text-shadow"> - ' + options.transactions[i] + '</div>');
    };

    LocationPanelInfo.prototype.show_description = function (options) {
        //console.log('LocationPanelInfo.prototype.show_description', options);
        var jq_panel = this.jq_main_div.find('.panel-info-description').first();
        jq_panel.css('display', 'block');
        jq_panel.find('.panel-info-content').first().html(options.text);
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
        // Настроить внеэкранные области
        this.set_panels();
        // Настроить речь NPC
        this.set_header_text();
    };

    LocationPlace.prototype.set_buttons = function () {
        if (!locationManager.isActivePlace(this)) return;
        locationManager.setBtnState(1, '', false);
        locationManager.setBtnState(2, '', false);
        locationManager.setBtnState(3, '', false);
        locationManager.setBtnState(4, '', false);
    };

    LocationPlace.prototype.set_panels = function () {
        if (!locationManager.isActivePlace(this)) return;
        // Выключить панели
        locationManager.panel_left.show({}, '');
        locationManager.panel_right.show({}, '');
    };

    LocationPlace.prototype.set_header_text = function (html_text) {
        if (!locationManager.isActivePlace(this)) return;
        var jq_header_text = this.jq_main_div.find('.npc-text');
        jq_header_text.empty();
        jq_header_text.append(html_text);
    };

    LocationPlace.prototype.clear = function () {
        //console.log('LocationPlace.prototype.clear');
        if (this.jq_main_div)
            this.jq_main_div.empty();
        this.jq_main_div = null;
    };

    LocationPlace.prototype.clickBtn = function (btnIndex) {};

    LocationPlace.prototype.update = function () {
        this.set_buttons();
        this.set_panels();
        this.set_header_text();
    };

    /*
     Функция подстраивает ширину инвентаря под его содержимое. Необходимо вызывать
     данную функцию всякий раз когда меняется количество слотов в инвентаре (иначе
     горизонтальный слайдер будер расти вниз)
     */
    LocationPlace.prototype.resizeInventory = function(jq_list) {
        var width = 0;
        if (jq_list) {
            jq_list.children().each(function (index, element) {
                if ($(element).css('display') == 'block')
                    width += $(element).outerWidth() + parseInt($(element).css('margin-right'));
            });
            jq_list.width(width);
        }
    };

    LocationPlace.prototype._getNPCByType = function (type, npc_rec, jq_town_div, key) {
        //console.log('LocationPlace.prototype._getNPCClass', type);
        switch (type) {
            case 'hangar':
                return (new LocationHangarNPC(npc_rec, jq_town_div, key));
            case 'parking':
                return (new LocationParkingNPC(npc_rec, jq_town_div, key));
            case 'armorer':
                return (new LocationArmorerNPC(npc_rec, jq_town_div, key));
            case 'tuner':
                return (new LocationTunerNPC(npc_rec, jq_town_div, key));
            case 'mechanic':
                return (new LocationMechanicNPC(npc_rec, jq_town_div, key));
            case 'trader':
                return (new LocationTraderNPC(npc_rec, jq_town_div, key));
            case 'trainer':
                return (new LocationTrainerNPC(npc_rec, jq_town_div, key));
            case 'barman':
                return (new LocationBarmanNPC(npc_rec, jq_town_div, key));
            case 'girl':
                return (new LocationGirlNPC(npc_rec, jq_town_div, key));
            case 'npc_gas_station':
                return (new LocationGasStationNPC(npc_rec, jq_town_div, key));
            default:
                return (new LocationPlaceNPC(npc_rec, jq_town_div, key));
        }
    };

    // Классовые методы для работы draggable

    LocationPlace.drag_handler = function (event, ui) {
        var original = ui.originalPosition;
        // jQuery will simply use the same object we alter here
        ui.position = {
            left: (event.clientX - location_draggable_click.x + original.left) / window_scaled_prc,
            top: (event.clientY - location_draggable_click.y + original.top) / window_scaled_prc
        };
    };

    LocationPlace.start_drag_handler = function (event, ui) {
        var pos = event.target.getBoundingClientRect();
        location_draggable_click.x = pos.left + pos.width / 4.;
        location_draggable_click.y = pos.top + pos.height / 4.;
    };

    return LocationPlace;
})();


var LocationPlaceBuilding = (function (_super) {
    __extends(LocationPlaceBuilding, _super);

    function LocationPlaceBuilding(building_rec, jq_town_div) {
        //console.log('LocationPlaceBuilding', building_rec);
        this.building_rec = building_rec;
        _super.call(this, jq_town_div.find('#building_' + building_rec.key), 'location_screen');

        this.active_central_page = null;

        // Создаем специалистов этого здания
        for (var i = 0; i < this.building_rec.build.instances.length; i++) {
            var npc_rec = this.building_rec.build.instances[i];
            if (!locationManager.npc.hasOwnProperty(npc_rec.html_hash))
                locationManager.npc[npc_rec.html_hash] = this._getNPCByType(npc_rec.type, npc_rec, jq_town_div, this.building_rec.key);
            else
                console.warn('Специалист ' + npc_rec.title + ' находится в нескольких зданиях одновременно');
        }

        this.resizeInventory(this.jq_main_div.find('.building-npc-list'));

        this.active_screen_name = 'location_screen';

        this.addExtraPages(
            this.jq_main_div.find('.building-center-menu-block').first(),
            this.jq_main_div.find('.building-center-pages-block').first()
        );
        this.centralMenuBindReaction();

        // todo: заполнить квесты
    }

    LocationPlaceBuilding.prototype.activate = function () {
        //console.log('LocationPlaceBuilding.prototype.activate');
        _super.prototype.activate.call(this);
        $('#' + this.building_rec.key + '-back').css('display', 'block');
    };

    LocationPlaceBuilding.prototype.clickBtn = function (btnIndex) {
        //console.log('LocationPlaceBuilding.prototype.clickBtn', btnIndex);
        if (btnIndex == '3') {
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
        }
    };

    LocationPlaceBuilding.prototype.set_buttons = function () {
        if (!locationManager.isActivePlace(this)) return;
        locationManager.setBtnState(1, '', false);
        locationManager.setBtnState(2, '', false);
        locationManager.setBtnState(3, '</br>Назад', true);
        locationManager.setBtnState(4, '</br>Выход', true);
    };

    LocationPlaceBuilding.prototype.addExtraPages = function (jq_center_menu, jq_center_pages) {};

    LocationPlaceBuilding.prototype.centralMenuBindReaction = function () {
        var self = this;
        this.jq_main_div.find('.building-center-menu-item').click(function () {
            var page_id = $(this).data('page_id');
            if (! page_id) return;
            self.jq_main_div.find('.building-center-menu-item').removeClass('active');
            $(this).addClass('active');
            self.jq_main_div.find('.building-center-page').css('display', 'none');
            self.jq_main_div.find('#' + page_id).css('display', 'block');
            self.centralMenuReaction(page_id)
        });
        this.jq_main_div.find('.building-center-menu-item').first().click();
    };

    LocationPlaceBuilding.prototype.centralMenuReaction = function (page_id) {
        //console.log('LocationPlaceBuilding.prototype.centralMenuReaction', page_id);
        this.active_central_page = page_id;
    };

    return LocationPlaceBuilding;
})(LocationPlace);


var LocationPlaceNPC = (function (_super) {
    __extends(LocationPlaceNPC, _super);

    function LocationPlaceNPC(npc_rec, jq_town_div, building_name) {
        //console.log('LocationPlaceNPC', npc_rec);
        this.transactions = [];
        this.npc_rec = npc_rec;
        this.owner_name = building_name;

        _super.call(this, $('#npc_' + npc_rec.html_hash), 'location_screen');

        this.get_self_info();
    }

    LocationPlaceNPC.prototype.add_transaction = function (transaction_msg) {
        //console.log('LocationPlaceNPC.prototype.add_transaction', transaction_msg);
        this.transactions.push(transaction_msg);
        this.set_panels();
    };

    LocationPlaceNPC.prototype.activate = function () {
        //console.log('LocationPlaceBuilding.prototype.activate');
        _super.prototype.activate.call(this);
        if (this.owner_name)
            $('#' + this.owner_name + '-back').css('display', 'block');
    };

    LocationPlaceNPC.prototype.clickBtn = function (btnIndex) {
        //console.log('LocationPlaceBuilding.prototype.clickBtn', btnIndex);
        if (btnIndex == '3')
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
    };

    LocationPlaceNPC.prototype.set_buttons = function () {
        if (!locationManager.isActivePlace(this)) return;
        locationManager.setBtnState(3, '</br>Назад', true);
        locationManager.setBtnState(4, '</br>Выход', true);
    };

    LocationPlaceNPC.prototype.get_self_info = function () { return false; };

    return LocationPlaceNPC;
})(LocationPlace);


var locationManager;
var location_draggable_click = {x:0, y:0};



