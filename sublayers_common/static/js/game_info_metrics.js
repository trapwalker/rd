
// console.log(arguments.callee.name);   Имя вызванного метода

var Analytics = (function () {

    function Analytics() {
        // Каждая метрика будет здесь хранить что ей хочется
        this.data = {};
    }

    Analytics.prototype.send = function(category, action, label) {
        // console.log(category, action, label);
        if (label) {
            try {
                ga('send', 'event', category, action, label);
            } catch (e) {
                console.warn('GA not defined');
            }
        }
        else {
            try {
                ga('send', 'event', category, action);
            } catch (e) {
                console.warn('GA not defined');
            }
        }
    };

    Analytics.prototype.active_teaching = function () {
        return teachingMapManager.is_active() || teachingManager.is_active();
    };

    // Main Game Session
    Analytics.prototype.client_main_ws_connect = function() {
        if (!basic_server_mode) return;
        this.send('connect', 'connect', 'main');
    };

    Analytics.prototype.enter_to_location = function(town_name) {
        if (!basic_server_mode) return;
        if (! this.data['enter_to_location']) {
            this.data['enter_to_location'] = {};
            this.data['enter_to_location']['first_town'] = town_name;
            this.send('location', 'enter', 'first');
        }
        else {
            if (!this.data['enter_to_location']['second_sended']) {
                this.data['enter_to_location']['second_sended'] = true;
                this.send('location', 'enter', 'second');
            }

            if (!this.data['enter_to_location']['diffrent_sended'] && this.data['enter_to_location']['first_town'] != town_name) {
                this.data['enter_to_location']['diffrent_sended'] = true;
                this.send('location', 'enter', 'diffrent');
            }
        }
    };

    Analytics.prototype.main_init_car = function () {
        if (!basic_server_mode) return;
        this.send('init_car', 'view');
    };

    Analytics.prototype.death = function () {
        if (!basic_server_mode) return;
        this.send('death', 'die');
    };

    Analytics.prototype.get_quest = function () {
        if (this.active_teaching()) return;
        if (!basic_server_mode) return;
        if (! this.data['get_quest']) {
            this.data['get_quest'] = 1;
            this.send('quest', 'get', 'first');
        }
        else {
            this.data['get_quest']++;
            if (this.data['get_quest'] == 2)
                this.send('quest', 'get', 'another');
        }
    };
    
    Analytics.prototype.end_quest = function () {
        if (this.active_teaching()) return;
        if (!basic_server_mode) return;
        if(!this.data['end_quest']) {
            this.data['end_quest'] = true;
            this.send('quest', 'end', 'ok');
        }
    };
    
    Analytics.prototype.fail_quest = function () {
        if (!basic_server_mode) return;
        if(!this.data['end_quest']) {
            this.data['end_quest'] = true;
            this.send('quest', 'end', 'fail');
        }
    };

    Analytics.prototype.get_level = function (level) {
        if (!basic_server_mode) return;
        if(level == 1) this.send('level', 'get', '1');
        if(level == 2) this.send('level', 'get', '2');
        if(level != 1 && level != 2) this.send('level', 'get', 'another');
    };

    Analytics.prototype.transaction_hangar = function () {
        if (!basic_server_mode) return;
        this.send('town_transaction', 'apply', 'hangar');
    };

    Analytics.prototype.transaction_trader = function () {
        if (!basic_server_mode) return;
        this.send('town_transaction', 'apply', 'trader');
    };

    Analytics.prototype.transaction_library = function () {
        if (!basic_server_mode) return;
        this.send('town_transaction', 'apply', 'library');
    };

    Analytics.prototype.transaction_armorer = function () {
        if (!basic_server_mode) return;
        this.send('town_transaction', 'apply', 'armorer');
    };

    Analytics.prototype.transaction_npc = function () {
        if (!basic_server_mode) return;
        this.send('town_transaction', 'apply');
    };

    Analytics.prototype.party_enter = function () {
        if (!basic_server_mode) return;
        this.send('party', 'enter');
    };

    Analytics.prototype.sit_town_duration = function (action) {
        if (!basic_server_mode) return;
        if (action == 'on') { // Произошёл вход в город
            this.data['sit_town_duration'] = clock.getClientTime();  // Запоминаем стартовое время
        }
        if (action == 'off') { // Выход на карту
            if (this.data['sit_town_duration'])
                if (clock.getClientTime() - this.data['sit_town_duration'] > 600000)
                    this.send('duration', 'sit', 'town');
            this.data['sit_town_duration'] = null;
        }
    };

    Analytics.prototype.sit_map_duration = function (action) {
        if (!basic_server_mode) return;
        if (action == 'on') { // Произошёл выход на карту
            this.data['sit_map_duration'] = clock.getClientTime();  // Запоминаем стартовое время
        }
        if (action == 'off') { // Произошёл вход в город
            if (this.data['sit_map_duration'])
                if (clock.getClientTime() - this.data['sit_map_duration'] > 600000)
                    this.send('duration', 'sit', 'map');
            this.data['sit_map_duration'] = null;
        }
    };


    // Main Map Info Session

    Analytics.prototype.use_zoom = function() {
        if (! this.data['use_zoom'])
            this.data['use_zoom'] = 0;
        if (this.data['use_zoom'] == -1) return;
        this.data['use_zoom'] += 1;
        if (this.data['use_zoom'] == 1)
            this.send('zoom', 'use');
        if (this.data['use_zoom'] > 100) {
            this.send('zoom', 'use', 'more_100');
            this.data['use_zoom'] = -1;
        }
    };

    Analytics.prototype.strategy_mode = function (action) {
        if (!basic_server_mode) return;
        if (! this.data['strategy_mode']) this.data['strategy_mode'] = {t: 0, timer: null, last_action: 'off'};

        if (this.data['strategy_mode'].timer) clearTimeout(this.data['strategy_mode'].timer);
        this.data['strategy_mode'].timer = null;

        if (action == 'on' && this.data['strategy_mode'].last_action != 'on') { // Вход в стратегический режим
            this.data['strategy_mode'].last_action = 'on';
            this.data['strategy_mode'].t = clock.getClientTime();  // Запоминаем стартовое время
            this.data['strategy_mode'].timer = setTimeout(function (){analytics.strategy_mode('off')}, 21000)
        }
        if (action == 'off' && this.data['strategy_mode'].last_action != 'off') { // Выход в стратегического режима
            this.data['strategy_mode'].last_action = 'off';
            if (clock.getClientTime() - this.data['strategy_mode'].t > 20000) {
                this.send('strategy_mode', 'view', 'more_20s');
            }
            this.data['strategy_mode'] = null;
        }

    };

    Analytics.prototype.activate_quick_item = function () {
        this.send('quick_panel', 'activate');
    };

    Analytics.prototype.set_quick_item = function () {
        this.send('quick_panel', 'set');
    };

    Analytics.prototype.show_inventory = function () {
        this.send('inventory', 'show');
    };

    Analytics.prototype.activate_inventory_item = function () {
        this.send('inventory', 'activate', 'item');
    };

    Analytics.prototype.self_window_info = function () {
        if (!basic_server_mode) return;
        this.send('window', 'open', 'self_info');
    };
    
    Analytics.prototype.user_window_info = function () {
        if (!basic_server_mode) return;
        this.send('window', 'open', 'user_info');
    };

    Analytics.prototype.self_car_info = function () {
        if (!basic_server_mode) return;
        this.send('window', 'open', 'self_car');
    };

    Analytics.prototype.journal_window = function () {
        if (!basic_server_mode) return;
        this.send('journal', 'view');
    };

    Analytics.prototype.drive_on_road = function (action) {
        if (!basic_server_mode) return;
        if (! this.data['drive_on_road']) this.data['drive_on_road'] = {t: 0, timer: null, last_action: 'off'};
        if (this.data['drive_on_road']['sended']) return;

        if (this.data['drive_on_road'].timer) clearTimeout(this.data['drive_on_road'].timer);
        this.data['drive_on_road'].timer = null;

        if (action == 'on' && this.data['drive_on_road'].last_action != 'on') { // Въезд на дорогу
            this.data['drive_on_road'].last_action = 'on';
            this.data['drive_on_road'].t = clock.getClientTime();  // Запоминаем стартовое время
            this.data['drive_on_road'].timer = setTimeout(function (){analytics.drive_on_road('off')}, 181000);

            this.data['drive_on_road']['user_pos'] =  user.userCar ? user.userCar.getCurrentCoord(clock.getCurrentTime()) : null;
        }
        if (action == 'off' && this.data['drive_on_road'].last_action != 'off') { // Съезд с дороги
            this.data['drive_on_road'].last_action = 'off';
            if (clock.getClientTime() - this.data['drive_on_road'].t > 180000 &&
                this.data['drive_on_road']['user_pos'] && user.userCar &&
                distancePoints( this.data['drive_on_road']['user_pos'], user.userCar.getCurrentCoord(clock.getCurrentTime())) > 1000
            ) {
                this.data['drive_on_road']['sended'] = true;
                this.send('duration', 'drive', 'road');
            }
            this.data['drive_on_road'] = null;
        }
    };

    Analytics.prototype.drive_only_mouse = function (mouse_click) {
        if (mouse_click) {
            if (!this.data['drive_only_mouse'])
                this.data['drive_only_mouse'] = { t: clock.getClientTime(), count: 0};
            this.data['drive_only_mouse'].count += 1;
            if (clock.getClientTime() - this.data['drive_only_mouse'].t > 600000 && this.data['drive_only_mouse'].count > 50) {
                 this.send('duration', 'mouse_control', 'over_10m');
                 this.data['drive_only_mouse'] = null;
            }
        }
        else
            this.data['drive_only_mouse'] = null
    };

    Analytics.prototype.btn_hide_widgets = function () {
        if (this.data['btn_hide_widgets']) return;
        this.data['btn_hide_widgets'] = true;
        this.send('btn_game', 'click', 'hide');
    };

    Analytics.prototype.btn_attack_mode = function () {
        if (this.data['btn_attack_mode']) return;
        this.data['btn_attack_mode'] = true;
        this.send('btn_game', 'click', 'attack_mode');
    };

    Analytics.prototype.btn_full_screen = function () {
        if (this.data['btn_full_screen']) return;
        this.data['btn_full_screen'] = true;
        this.send('btn_game', 'click', 'full_screen');
    };


    
    
    
    Analytics.prototype.client_quick_ws_connect = function() {
        if (basic_server_mode) return;
        this.send('connect', 'connect', 'quick');
    };


    Analytics.prototype.try_exit_from_location = function () {
        this.send('location', 'view', 'exit');
    };

    // Обучение
    Analytics.prototype.teaching_answer_yes = function () {this.send('teach_answer', 'answer', 'yes')};
    Analytics.prototype.teaching_answer_no = function () {this.send('teach_answer', 'answer', 'no')};

    // Обучение карта
    Analytics.prototype.teach_map_start = function () {this.send('teach_map', 'teach_done', 'map_start');};
    Analytics.prototype.teach_map_move = function () {this.send('teach_map', 'teach_done', 'moving');};
    Analytics.prototype.teach_map_zoom = function () {this.send('teach_map', 'teach_done', 'zoom'); };
    Analytics.prototype.teach_map_damage = function () {this.send('teach_map', 'teach_done', 'damage');};
    Analytics.prototype.teach_map_fire = function () {
        if (basic_server_mode || !teachingMapManager.is_active()) return;
        if (this.data['teach_map_fire']) return;
        this.data['teach_map_fire'] = 1;
        this.send('teach_map', 'try_fire');
    };
    Analytics.prototype.teach_map_finish = function () {this.send('teach_map', 'teach_done', 'finish');};
    Analytics.prototype.teach_map_train = function () {this.send('teach_map_train', 'train');};

    // Обучение город
    Analytics.prototype.teach_city_start = function () {this.send('teach_city', 'teach_done', 'city_start')};
    Analytics.prototype.teach_city_car = function () {this.send('teach_city', 'teach_done', 'car')};
    Analytics.prototype.teach_city_nukeoil = function () {this.send('teach_city', 'teach_done', 'nukeoil')};
    Analytics.prototype.teach_city_trader =  function () {this.send('teach_city', 'teach_done', 'trader')};
    Analytics.prototype.teach_city_armorer = function () {this.send('teach_city', 'teach_done', 'armorer')};
    Analytics.prototype.teach_city_get_q = function () {this.send('teach_city', 'teach_done', 'get_quest')};
    Analytics.prototype.teach_city_journal = function () {this.send('teach_city', 'teach_done', 'journal')};
    Analytics.prototype.teach_city_fin_q = function () {this.send('teach_city', 'teach_done', 'finish_quest')};
    Analytics.prototype.teach_city_finish = function () {this.send('teach_city', 'teach_done', 'city_finish')};
    
    
    return Analytics;
})();

var analytics = new Analytics();
