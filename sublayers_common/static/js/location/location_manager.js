var LocationManager = (function () {
    function LocationManager() {
        this.example = null;

        this.active_screen_name = null;
        this.screens = {
            location_screen: null,
            chat_screen: null,
            menu_screen: null
        };

        this.uid = null;
        this.location_cls = '';
        this.in_location_flag = false;

        this.load_city_image = false; // показывает, загружены ли изображения города

        // Менеджер посетителей города
        this.visitor_manager = new LocationVisitorsManager();

        // todo: добавить дивы панелей
        this.panel_left = new LocationPanelInfo(null);
        this.panel_right = new LocationPanelInfo(null);

        this.jq_town_div = $('#activeTownDiv');

        // Все что выкинется из инвентаря в городе упадет сюда
        this.jq_droppable_div = $('#activeTownDivBack');
        this.jq_droppable_div.droppable({
            greedy: true,
            drop: function(event, ui) {
                if (!ui.draggable.hasClass('mainCarInfoWindow-body-trunk-body-right-item')) return;
                var owner_id = ui.draggable.data('owner_id');
                var pos = ui.draggable.data('pos');
                if (!owner_id || (!pos && (pos != 0))) return;

                // Если это итем из мусорки то ниче не делать
                if (owner_id == locationManager.uid) return;

                // Эта проверка нужна так как таскание окон также порождает событие дропа
                var item = null;
                try {
                    item = inventoryList.getInventory(owner_id).getItem(pos);
                }
                catch (e) {
                    console.warn('Не найден инвентерь или итем в инвентаре:', ui.draggable);
                    item = null;
                }

                modalWindow.modalDialogAnswerShow({
                    caption: 'Inventory Operation',
                    header: 'Выбросить?',
                    body_text: 'Вы уверены, что хотите выбросить ' + item.example.title + ' на свалку?',
                    callback_ok: function() {
                        clientManager.sendItemActionInventory(owner_id, pos, locationManager.uid, null);
                    }
                });

                stopEvent(event);
            }
        });

        // Дикт всех зданий
        this.buildings = {};

        // Дикт всех специалистов
        this.npc = {};
        this.npc_relations = [];

        // Дикт для всех локаций меню
        this.location_menu = null;

        // Локация чат
        this.location_chat = null;

        // Свалка
        this.dump = null;

        // Для различных эффектов в городе
        this.location_canvas_manager = new LocationCanvasManager();

        // todo: Придумать куда это перенести!
        this.locations_canvas_effects = {};
        var lasers_img = new Image();
        lasers_img.src = '/static/content/locations/map_locations/all_frames.png';

        setTimeout(function(){
            SetImageOnLoad(lasers_img, function (img) {
                locationManager.locations_canvas_effects['laser'] = new ECanvasLocationLaserAnimation(img);
                locationManager.locations_canvas_effects['laser'].start();
            }
        );
        }, 50);

        this._clicks_btn = {1: {t: 0, delay: 3000}, 2: {t: 0, delay: 3000}, 3: {t: 0, delay: 0}, 4: {t: 0, delay: 0}};
    };

    // Активация отдельныхъ веток города (Чат, Локация, Журнал)
    LocationManager.prototype.activateScreen = function (screenName, btn_id) {
        //console.log('LocationManager.prototype.activateScreen', screenName, btn_id);
        if (this.screens.hasOwnProperty(screenName)) {
            // Вставка для проброса эвента деактивации при смене локации (здание, нпц, меню и тд)
            if (this.active_screen_name != screenName && locationManager.screens[locationManager.active_screen_name])
                locationManager.screens[locationManager.active_screen_name].on_deactivate();

            this.active_screen_name = screenName;
            var location = locationManager.screens[screenName];
            $('#btn_screen_location_pressed').css('display', 'none');
            $('#btn_screen_chat_pressed').css('display', 'none');
            $('#btn_screen_menu_pressed').css('display', 'none');

            if (screenName == 'chat_screen')
                $('#btn_screen_chat_hover').attr('class', '');

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

                // Показать кнопку Свалка
                $('#townDumpTempButton').css('display', 'block');

                locationManager.setBtnState(1, '', false);
                locationManager.setBtnState(2, '', false);
                locationManager.setBtnState(3, '</br>Назад', false);
                locationManager.setBtnState(4, '</br>Выход', true);

                locationManager.set_panels_location_screen();

                // при попадании на ландшафт города нужно вызвать обновление teachingManager
                teachingManager.redraw();
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
        if (npc.npc_rec.type == "mayor") return;
        npc.activate();
    };

    LocationManager.prototype.onEnter = function (data) {
        //console.log('LocationManager.prototype.onEnter', data);

        this.onExit();
        this.uid = data.location.uid;
        this.example = data.location.example;

        this.location_cls = data.location.cls;

        // Закрыть все окна
        windowTemplateManager.closeAllWindows();

        // Вставляем верстку города
        this.jq_town_div.append(data.location_html);
        this.jq_droppable_div.css('display', 'block');
        this.jq_droppable_div.droppable('enable');

        // Свалка
        this.dump = new LocationDump(this.jq_town_div);
        this.jq_town_div.find('#townDumpTempButton').click(function() {
            if (locationManager.dump) locationManager.dump.activate();
        });

        // Установить дивы панелей
        this.panel_left.init(this.jq_town_div.find('#townLeftPanel'));
        this.panel_right.init(this.jq_town_div.find('#townRightPanel'));

        // Создаем окна зданий
        this.screens.location_screen = null;
        for (var i = 0; i < data.location.example.buildings.length; i++) {
            var building_rec = data.location.example.buildings[i];
            this.buildings[building_rec.name] = this._getBuildingByType(building_rec, this.jq_town_div);
        }
        if (this.location_cls == 'GasStation')
            this.screens.location_screen = this.buildings['nukeoil'];
        this.active_screen_name = 'location_screen';

        // Установка отношений для всех нпс в городе
        this.npc_relations = data.relations;

        this.setBtnState(1, '', false);
        this.setBtnState(2, '', false);
        this.setBtnState(3, '</br>Назад', false);
        this.setBtnState(4, '</br>Выход', true);

        this.panel_left.show({respect: Math.random() * 100}, 'building_quest');
        this.panel_right.show({}, 'location');

        // Локации меню
        this.location_menu = new LocationPlaceMenu(this.jq_town_div);

        // Локация чата
        this.location_chat = new LocationPlaceChat(this.jq_town_div);

        // Обновить список посетителей города
        this.visitor_manager.add_visitor(user.login);
        this.visitor_manager.update_visitors();

        // Разрешаем отрисовку эффектов на канвас
        this.location_canvas_manager.init_canvas();
        this.location_canvas_manager.is_canvas_render = true;

        this.activateScreen('location_screen', 'btn_screen_location_pressed');

        this.in_location_flag = true;

        // Принудительно перерисовать все квесты
        journalManager.quests.redraw();

        if (this.load_city_image)
            textConsoleManager.async_stop();

        radioPlayer.update();

        mapManager.onEnterLocation();

        // Сообщить менеджеру обучения, что произведён вход в город
        teachingManager.on_enter_location();
    };

    LocationManager.prototype.onExit = function () {
        //console.log('LocationManager.prototype.onExit');

         // Вызов OnExit для локаций, неписей и тд... Делается ДО удаления вёрстки
        if (this.location_menu) this.location_menu.on_exit();

        this.uid = null;

        this.dump = null;

        chat.showChatInMap();

        // Сброс панелей
        this.panel_left.clear();
        this.panel_right.clear();

        this.jq_town_div.empty();
        this.jq_droppable_div.droppable('disable');
        this.jq_droppable_div.css('display', 'none');

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

        this.in_location_flag = false;

        mapManager.onExitLocation();
    };

    LocationManager.prototype.setBtnState = function (btnIndex, btnText, active) {
        //console.log('LocationManager.prototype.setBtnState', btnIndex, btnText, active);
        $('#btn_' + btnIndex + '_text').html(btnText);

        // Проверка по времени
        if (active && this._clicks_btn[btnIndex].t > clock.getClientTime()) active=false;

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
        if($('#btn_' + btnIndex + '_noactive').css('display') == 'block') {
            return;
        }

        if (this._clicks_btn.hasOwnProperty(btnIndex)) {
            var t = clock.getClientTime();
            if (t < this._clicks_btn[btnIndex].t) return;
            if (btnIndex == 1 || btnIndex == 2) {  // Блокировка работает только на кнопки 1 и 2
                this._clicks_btn[1].t = t + this._clicks_btn[btnIndex].delay;
                this._clicks_btn[2].t = t + this._clicks_btn[btnIndex].delay;

                if (this.screens[this.active_screen_name])
                    this.screens[this.active_screen_name].set_buttons();
                setTimeout(function () {
                    if (locationManager.screens[locationManager.active_screen_name])
                        locationManager.screens[locationManager.active_screen_name].set_buttons();
                }, this._clicks_btn[btnIndex].delay);
            }
        } else
            return;

        if (btnIndex == 4) { // Попытка выйти из города
            //console.log('Попытка выйти из города');
            // Google Analytics
            google_analytics_methods.try_exit_from_location();

            if (user.example_car)
                clientManager.sendExitFromLocation();
            else {
                modalWindow.modalDialogInfoShow({
                    caption: 'Error Message',
                    header: 'Внимание! Ошибка!',
                    body_text: 'Невозможно покинуть город без транспортного средства. Купите новый автомобиль или заберите со стоянки ранее оставленный.'
                });
            }
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
        if (this.dump) this.dump.update();
    };

    LocationManager.prototype.isActivePlace = function (location_place) {
        //console.log('LocationManager.prototype.isActivePlace');
        return this.screens[this.active_screen_name] == location_place;
    };

    LocationManager.prototype._getBuildingByType = function (building_rec, jq_town_div) {
        //console.log('LocationManager.prototype._getBuildingByType', building_rec);
        switch (building_rec.name) {
            case 'service':
                return (new LocationServiceBuilding(building_rec, jq_town_div));
            case 'nukeoil':
                return (new LocationNucoilBuilding(building_rec, jq_town_div));
            default:
                return (new LocationPlaceBuilding(building_rec, jq_town_div));
        }
    };

    LocationManager.prototype.get_current_active_place = function() {
        return this.screens[this.active_screen_name];
    };

    LocationManager.prototype.get_npc_by_node_hash = function(npc_node_hash){
        for(var key in this.npc)
            if (this.npc.hasOwnProperty(key) && this.npc[key].npc_rec.node_hash == npc_node_hash)
                return this.npc[key];
        return null;
    };

    LocationManager.prototype.get_building_by_node_hash = function(npc_node_hash){
        for(var key in this.buildings)
            if (this.buildings.hasOwnProperty(key) && this.buildings[key].building_rec.head.node_hash == npc_node_hash)
                return this.buildings[key];
        return null;
    };

    LocationManager.prototype.get_building_by_field = function(field, value){
        for(var key in this.buildings)
            if (this.buildings.hasOwnProperty(key) && this.buildings[key].building_rec.head[field] == value)
                return this.buildings[key];
        return null;
    };

    LocationManager.prototype.get_npc_by_type = function(npc_type){
        var res = [];
        for(var key in this.npc)
            if (this.npc.hasOwnProperty(key) && this.npc[key] instanceof npc_type)
                res.push(this.npc[key]);
        return res;
    };

    LocationManager.prototype.get_relation = function(npc_node_hash){
        for (var i = 0; i < this.npc_relations.length; i++)
            if (this.npc_relations[i].npc_node_hash == npc_node_hash)
                return this.npc_relations[i].relation;
        console.warn('Relation for npc not found: ', npc_node_hash, this.npc_relations);
        return null;
    };

    // Обработчик событий мышки в зданиях, при наведении на НПЦ
    LocationManager.prototype.handler_npc_mouseover = function(npc_node_hash, build_type) {
        //console.log('LocationManager.prototype.handler_npc_mouseover', npc_node_hash, build_type);
        var npc = this.get_npc_by_node_hash(npc_node_hash);
        var build = this.buildings[build_type];
        if (!build || !npc){
            console.log(npc_node_hash, build_type, npc, build);
            return;
        }
        locationManager.panel_right.show({npc_example: npc.npc_rec, build_example: build.building_rec}, 'npc_inside_building');
        locationManager.panel_left.show({respect: (1 + locationManager.get_relation(npc_node_hash)) * 50} , 'building_quest');
    };

    LocationManager.prototype.handler_mouseleave = function() {
        this.screens[this.active_screen_name].set_panels();
    };

    LocationManager.prototype.set_panels_location_screen = function() {
        //console.log('LocationManager.prototype.handler_mouseleave');
        if (this.active_screen_name = "location_screen") {
            locationManager.panel_left.show({respect: Math.random() * 100}, 'building_quest');
            locationManager.panel_right.show({}, 'location');
        }
    };


    return LocationManager;
})();


var LocationPanelInfo = (function () {
    function LocationPanelInfo() {
        this.jq_main_div = null;

        //this._cur_opacity = 0.0;
        //this.anim_interval = null;
    }

    LocationPanelInfo.prototype._anim_show = function (jq_panel) {
        //clearInterval(this.anim_interval);
        if (this.jq_main_div)
            this.jq_main_div.find('.panel-info-item').css('display', 'none');

        //var self = this;
        //this._cur_opacity = 0.0;
        //jq_panel.css('opacity', this._cur_opacity);
        jq_panel.css('display', 'block');
        //this.anim_interval = setInterval(function() {
        //    if (self._cur_opacity <= 1) self._cur_opacity += 0.1;
        //    else clearInterval(self.anim_interval);
        //    jq_panel.css('opacity', self._cur_opacity);
        //}, 20);
    };

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

        // Если обучение активно, то включить панели обучения
        if (teachingManager.is_active()) return;

        // Переключить панель
        var window_method = 'show_' + window_name;
        if (this[window_method]) this[window_method](options);
    };

    LocationPanelInfo.prototype.show_self_car_info = function (options) {
        //console.log('LocationPanelInfo.prototype.show_self_car_info');
        var jq_panel = this.jq_main_div.find('.panel-info-car-info').first();
        jq_panel.find('.panel-info-car-info-car').empty();
        jq_panel.find('.panel-info-car-info-car-name').text('');
        if (user.example_car) {
            jq_panel.find('.panel-info-car-info-car-name').text(user.example_car.name_car);
            jq_panel.find('.panel-info-car-info-car').append(user.templates.html_car_img);
        }
        this._anim_show(jq_panel);
    };

    LocationPanelInfo.prototype.show_npc_transaction_info = function (options) {
        //console.log('LocationPanelInfo.prototype.show_npc_transaction_info', options);
        var jq_panel = this.jq_main_div.find('.panel-info-npc-transaction-info').first();
        clientManager._viewAgentBalance(jq_panel);
        var jq_transaction_list = jq_panel.find('.npc-transaction-info-transaction-list');
        jq_transaction_list.empty();
        if (options.hasOwnProperty('transactions'))
            for (var i = 0; i < options.transactions.length; i++)
                jq_transaction_list.append('<div class="npc-transaction-info-text-shadow"> - ' + options.transactions[i] + '</div>');
        var height = jq_transaction_list[0].scrollHeight;
        jq_transaction_list.scrollTop(height);
        this._anim_show(jq_panel);
    };

    LocationPanelInfo.prototype.show_description = function (options) {
        //console.log('LocationPanelInfo.prototype.show_description', options);
        var jq_panel = this.jq_main_div.find('.panel-info-description').first();
        this.jq_last_panel = jq_panel;
        jq_panel.find('.panel-info-content').first().html(options.text);
        if (!options.title) options.title = '';
        jq_panel.find('.panel-info-item-title').first().html(options.title.replace("<br>", " ").toUpperCase());
        this._anim_show(jq_panel);
    };

    LocationPanelInfo.prototype.show_location = function (options) {
        //console.log('LocationPanelInfo.prototype.show_location');
        var jq_panel = this.jq_main_div.find('.pi-location').first();
        jq_panel.find('.location').text(locationManager.example.title);
        jq_panel.find('.head').text('Нет');
        for (var key in locationManager.npc)
            if (locationManager.npc.hasOwnProperty(key) && (locationManager.npc[key].npc_rec.type == 'mayor')) {
                jq_panel.find('.head').text(locationManager.npc[key].npc_rec.title);
                break;
            }
        this._anim_show(jq_panel);
    };

    LocationPanelInfo.prototype.show_building = function (options) {
        //console.log('LocationPanelInfo.prototype.show_building', options);
        var jq_panel = this.jq_main_div.find('.pi-building').first();
        jq_panel.find('.location').text(options.build.title);
        jq_panel.find('.head').text(options.build.head.title);
        jq_panel.find('.karma').text(getKarmaName(options.build.head.karma));
        jq_panel.find('.skill').text(options.build.head.trading);
        this._anim_show(jq_panel);
    };

    LocationPanelInfo.prototype.show_npc_inside_building = function (options) {
        //console.log('LocationPanelInfo.prototype.show_npc_inside_building', options);
        var jq_panel = this.jq_main_div.find('.pi-npc-building').first();
        var npc_example = options.npc_example;
        var build_example = options.build_example;
        jq_panel.find('.location').text(build_example.title);
        jq_panel.find('.name').text(npc_example.title);
        jq_panel.find('.karma').text(getKarmaName(npc_example.karma));
        this._anim_show(jq_panel);
    };

    LocationPanelInfo.prototype.show_nukeoil = function (options) {
        //console.log('LocationPanelInfo.prototype.show_nukeoil', options);
        var jq_panel = this.jq_main_div.find('.pi-nukeoil').first();
        if (user.example_agent && user.example_agent.insurance) {
            var ins = user.example_agent.insurance;
            jq_panel.find('.pi-nukeoil-insurance-block').first()
                .css('background', 'transparent url(/' + ins.icon_right_panel + ') 100% 100% no-repeat');
            jq_panel.find('.panel-info-line.insurance-name').first().text(ins.title);
            if (ins.starttime && ins.deadline) {
                jq_panel.find('.panel-info-line.insurance-deadline').css('display', 'block');
                
                var start_quest_date = new Date((ins.starttime + ins.deadline) * 1000);
                start_quest_date.setFullYear(start_quest_date.getFullYear() + 100);
                var start_quest_date_s = start_quest_date.toLocaleString('ru');
                jq_panel.find('.panel-info-line.insurance-deadline.time').first().text(start_quest_date_s);
            }
            else
                jq_panel.find('.panel-info-line.insurance-deadline').css('display', 'none');
        }
        this._anim_show(jq_panel);
    };

    LocationPanelInfo.prototype.show_building_quest = function (options) {
        //console.log('LocationPanelInfo.prototype.show_building_quest', options);
        var jq_panel = this.jq_main_div.find('.pi-building-quest').first();
        var width = Math.floor(316 * (options.respect / 100));
        jq_panel.find('.respect').first().width(width);
        jq_panel.find('.pi-building-quest-scale-carriage').first().css({left: (width - 1)});
        jq_panel.find('.pi-building-quest-scale-label').first().css({left: (width - 20)});
        jq_panel.find('.pi-building-quest-scale-label').first().text(Math.floor(options.respect));
        this._anim_show(jq_panel);
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

        // Вызвать метод деактивации локации
        if (locationManager.screens[locationManager.active_screen_name] && locationManager.screens[locationManager.active_screen_name] != this)
            locationManager.screens[locationManager.active_screen_name].on_deactivate();

        // Выключить ландшафт здания и специалистов
        $('#layer2').css('display', 'none');
        $('#landscape').css('display', 'none');
        $('.building-back').css('display', 'none');
        $('.townPageWrap').css('display', 'none');

        // Спрятать кнопку Свалка
        $('#townDumpTempButton').css('display', 'none');

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


        // обновление менеджера обучения
        teachingManager.redraw();
    };

    LocationPlace.prototype.on_deactivate = function () {
        // Срабатывает при переключениями между экранами, локациями и тд. Можно на него завязать отправку сообщений на сервер
        //console.log('LocationPlace.prototype.on_deactivate', this);
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
        //console.log('LocationPlace.prototype.set_header_text', this, html_text);
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
        ui.position = {
            left: (event.clientX - location_draggable_click.x + original.left) / window_scaled_prc - location_draggable_click.half_helper_width,
            top: (event.clientY - location_draggable_click.y + original.top) / window_scaled_prc - location_draggable_click.half_helper_height
        };
    };

    LocationPlace.start_drag_handler = function (event, ui) {
        var pos = event.target.getBoundingClientRect();
        location_draggable_click.x = pos.left; // + pos.width / 4.;
        location_draggable_click.y = pos.top; // + pos.height / 4.;

        var size_helper = ui.helper[0].getBoundingClientRect();
        location_draggable_click.half_helper_width = size_helper.width / 2.;
        location_draggable_click.half_helper_height = size_helper.height / 2.;
    };

    return LocationPlace;
})();


var LocationPlaceBuilding = (function (_super) {
    __extends(LocationPlaceBuilding, _super);

    function LocationPlaceBuilding(building_rec, jq_town_div) {
        //console.log('LocationPlaceBuilding', building_rec);
        this.building_rec = building_rec;
        _super.call(this, jq_town_div.find('#building_' + building_rec.name), 'location_screen');

        this.active_central_page = null;

        // Создаем специалистов этого здания
        for (var i = 0; i < this.building_rec.instances.length; i++) {
            var npc_rec = this.building_rec.instances[i];
            if (!locationManager.npc.hasOwnProperty(npc_rec.html_hash))
                locationManager.npc[npc_rec.html_hash] = this._getNPCByType(npc_rec.type, npc_rec, jq_town_div, this.building_rec.name);
            else
                console.warn('Специалист ' + npc_rec.title + ' находится в нескольких зданиях одновременно');
        }

        this.resizeInventory(this.jq_main_div.find('.building-npc-list'));

        this.active_screen_name = 'location_screen';

        this.addExtraPages(
            this.jq_main_div.find('.building-center-menu-block-wrap').first(),
            this.jq_main_div.find('.building-center-pages-block').first()
        );
        this.centralMenuBindReaction();

        this.selected_quest = null;
    }

    LocationPlaceBuilding.prototype.activate = function () {
        //console.log('LocationPlaceBuilding.prototype.activate');
        _super.prototype.activate.call(this);
        $('#' + this.building_rec.name + '-back').css('display', 'block');
        var note = this.get_active_note();
        if (note) {
            note.activate();
            this.set_buttons();
            this.set_panels();
            this.set_header_text();
        }

        clientManager.sendEnterToBuilding(this);
    };

    LocationPlaceBuilding.prototype.on_deactivate = function () {
        _super.prototype.on_deactivate.call(this);
        clientManager.sendExitFromBuilding(this);
    };

    LocationPlaceBuilding.prototype.clickBtn = function (btnIndex) {
        //console.log('LocationPlaceBuilding.prototype.clickBtn', btnIndex);
        if (btnIndex == '3') {

            // Вызвать метод деактивации здания
            this.on_deactivate();

            $('#layer2').css('display', 'block');
            $('#landscape').css('display', 'block');
            $('.building-back').css('display', 'none');
            this.jq_main_div.css('display', 'none');
            if (this.screen_name) // если для локации указан конкретный скрин, то записаться в него
                locationManager.screens[this.screen_name] = null;
            else // если нет, то записаться в последний активный
                locationManager.screens[locationManager.active_screen_name] = null;

            // Показать кнопку Свалка
            $('#townDumpTempButton').css('display', 'block');

            locationManager.setBtnState(1, '', false);
            locationManager.setBtnState(2, '', false);
            locationManager.setBtnState(3, '</br>Назад', false);
            locationManager.setBtnState(4, '</br>Выход', true);

            locationManager.panel_left.show({respect: Math.random() * 100}, 'building_quest');
            locationManager.panel_right.show({}, 'location');

            // Выход на старт какого-то из скринов: нужно обновить teachingManager
            teachingManager.redraw();
        }
        else {
            var note = this.get_active_note();
            if (note) {
                note.clickBtn(btnIndex);
            }
            else {
                if ((btnIndex == '1') && (this.selected_quest)) {
                    if (this.selected_quest.status == null)
                        clientManager.sendActivateQuest(this.selected_quest.uid);
                    if (this.selected_quest.status == 'active')
                        clientManager.sendCancelQuest(this.selected_quest.uid);
                    this.set_selected_quest(null);
                }
            }
        }
    };

    LocationPlaceBuilding.prototype.set_header_text = function (html_text) {
        if (!locationManager.isActivePlace(this)) return;

        //if (!html_text)
        //    if (this.selected_quest)
        //        html_text = $('<div>Цена отмены квеста</div>');

        _super.prototype.set_header_text.call(this, html_text);
    };

    LocationPlaceBuilding.prototype.set_buttons = function () {
        if (!locationManager.isActivePlace(this)) return;

        // Если выбрана какая-то нота, то отдать управление ей, иначе по стандартному пути
        var note = this.get_active_note();
        if (note) {
            note.set_buttons();
        } else {
            if (!this.selected_quest)
                locationManager.setBtnState(1, '', false);
            else {
                if (this.selected_quest.status == null)
                    locationManager.setBtnState(1, '</br>Принять', true);
                if (this.selected_quest.status == 'active')
                    locationManager.setBtnState(1, '</br>Отказаться', true);
            }
            locationManager.setBtnState(2, '', false);
        }
        locationManager.setBtnState(3, '</br>Назад', true);
        locationManager.setBtnState(4, '</br>Выход', true);
    };

    LocationPlaceBuilding.prototype.addExtraPages = function (jq_center_menu, jq_center_pages) {
        // взять все ноты для данного нпц и вывести их сюда
        var notes = notesManager.get_notes_by_type(QuestNoteNPCBtn);
        for (var i = 0; i < notes.length; i++) {
            if (notes[i].npc_html_hash == this.building_rec.head.html_hash)
                notes[i].set_div(this, jq_center_menu, jq_center_pages);
        }
    };

    // Это обработчик клика! здесь this - это не здание
    LocationPlaceBuilding.prototype.centralMenuBindReaction_handler = function(event) {
        var self = event.data.build;
        var page_id = $(this).data('page_id');
        if (! page_id) return;
        self.jq_main_div.find('.building-center-menu-item').removeClass('active');
        $(this).addClass('active');
        self.jq_main_div.find('.building-center-page').css('display', 'none');
        self.jq_main_div.find('#' + page_id).css('display', 'block');
        self.centralMenuReaction(page_id);

        // Вызвать обновление teachingManager
        teachingManager.redraw();
    };

    LocationPlaceBuilding.prototype.centralMenuBindReaction = function () {
        var self = this;
        var jq_menu_item_list = this.jq_main_div.find('.building-center-menu-item');
        jq_menu_item_list.click({build: this}, this.centralMenuBindReaction_handler);
        jq_menu_item_list.first().click();

        // Биндим скроллы
        //this.jq_main_div.find('.building-center-menu-block-scroll-btn').click(function() {
        //    var scroll_block = $(this).parent().parent().find('.building-center-menu-block-wrap').first();
        //    var scroll_pos = scroll_block.scrollTop();
        //    var mul = $(this).hasClass('up') ? -1 : 1;
        //    scroll_block.scrollTop(scroll_pos + mul * 20);
        //});

        this.centralMenuScrollSet();
    };

    LocationPlaceBuilding.prototype.centralMenuScrollSet = function () {
        var jq_menu_item_list = this.jq_main_div.find('.building-center-menu-item');
        if (jq_menu_item_list.length <= 6) // Магия вёрстки!!!
            this.jq_main_div.find('.building-center-menu-block-scroll-wrap').css('display', 'none');
        else
            this.jq_main_div.find('.building-center-menu-block-scroll-wrap').css('display', 'block');
    };

    // Используется, когда удаляется активная нота, и автоматически переключается на первую ноту!
    LocationPlaceBuilding.prototype.centralMenuScrollToTop = function () {
        this.jq_main_div.find('.building-center-menu-block-wrap').first().scrollTop(-9999);
    };

    LocationPlaceBuilding.prototype.centralMenuReaction = function (page_id) {
        //console.log('LocationPlaceBuilding.prototype.centralMenuReaction', page_id);
        this.active_central_page = page_id;

        // Обязательно сбросить текущий квест (возможно выбрать первый квест)
        //var page_type = page_id.split('_')[0];
        //if (page_type == 'buildingPageAvailableTasks' || page_type == 'buildingPageActiveTasks')
        //    $('#' + page_id).find('.building-quest-list-item').first().click();
        //else


        // Если эта страница-нота
        var note = this.get_active_note();
        if (note) {
            note.activate();
        }else {
           if (this.selected_quest)
            this.set_selected_quest(null);
        }

        // сделать обязательно, так как мы  перешли в новое состояние
        this.set_buttons();
        this.set_header_text();
    };

    LocationPlaceBuilding.prototype.get_active_note = function () {
        if (this.active_central_page.indexOf('building_note_') == 0) {
            var note_uid = $('#' + this.active_central_page).data('note_uid');
            if (note_uid) {
                var note = notesManager.notes[note_uid];
                if (note) return note;
            } else {
                console.warn('note_uid not found in data for ', page_id);
            }
        }
        return null;
    };

    LocationPlaceBuilding.prototype.set_panels = function (make) {
        //console.log('LocationPlaceBuilding.prototype.set_panels', !make, !locationManager.isActivePlace(this));
        if (!make && !locationManager.isActivePlace(this)) return;
        var head_example = this.building_rec.head;
        locationManager.panel_left.show({respect: (1 + locationManager.get_relation(head_example.node_hash)) * 50} , 'building_quest');
        locationManager.panel_right.show({build: this.building_rec}, 'building');
    };

    LocationPlaceBuilding.prototype.set_selected_quest = function (quest_id) {
        var click_quest = null;
        if (quest_id && journalManager.quests.quests.hasOwnProperty(quest_id))
            click_quest = journalManager.quests.quests[quest_id];

        // Отключить подсветку старого квеста
        if (this.selected_quest) {
            this.selected_quest.jq_npc_block.removeClass('selected');
            if (this.selected_quest == click_quest) // Если квест тот же, что и был, то уже не включим подсветку
                click_quest = null;
            this.selected_quest = null;
        }

        if (click_quest) {
            click_quest.jq_npc_block.addClass('selected');
            this.selected_quest = click_quest;
        }

        this.set_buttons();
        this.set_header_text(this.selected_quest ? this.selected_quest.text : null);

        // Вызвать обновление teachingManager
        teachingManager.redraw();
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

        clientManager.sendEnterToNPC(this);
    };

    LocationPlaceNPC.prototype.on_deactivate = function () {
        _super.prototype.on_deactivate.call(this);
        clientManager.sendExitFromNPC(this);
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


// info функция нужна чтобы меньше использовать jquery эвенты! Можно воспользоваться кодом в методе
// LocationPlaceBuilding.centralMenuBindReaction
function clickBuildingScrollBtn(target) {
    var scroll_block = $(target).parent().parent().find('.building-center-menu-block-wrap').first();
    var scroll_pos = scroll_block.scrollTop();
    var mul = $(target).hasClass('up') ? -1 : 1;
    scroll_block.scrollTop(scroll_pos + mul * 20);
}


var locationManager;
var location_draggable_click = {x:0, y:0};



