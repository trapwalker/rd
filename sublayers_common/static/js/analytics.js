
// console.log(arguments.callee.name);   Имя вызванного метода

var Analytics = (function () {

    function Analytics() {
        // Каждая метрика будет здесь хранить что ей хочется
        this.data = {};
    }

    Analytics.prototype.send = function(category, action, label) {
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
    
    Analytics.prototype.client_main_ws_connect = function() {
        if (!basic_server_mode) return;
        this.send('connect', 'connect', 'main');
    };
    Analytics.prototype.client_quick_ws_connect = function() {
        if (basic_server_mode) return;
        this.send('connect', 'connect', 'quick');
    };

    Analytics.prototype.main_init_car = function () {
        if (!basic_server_mode) return;
        this.send('init_car', 'view');
    };
    Analytics.prototype.try_exit_from_location = function () {
        this.send('location', 'view', 'exit');
    };
    Analytics.prototype.activate_quick_item = function () {
        this.send('quick_panel', 'activate');
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
        console.log(arguments.callee.name);
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
