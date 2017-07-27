var ArmorerTeachingNote = (function (_super) {
    __extends(ArmorerTeachingNote, _super);

    function ArmorerTeachingNote(options) {
        _super.call(this, options);

        this.needed_building = locationManager.get_building_by_node_hash('reg:///registry/institutions/mechanic/whitehill_raul_alon');
        this.needed_npc = locationManager.get_npc_by_node_hash('reg:///registry/institutions/armorer/whitehill_martin_arioso');

        this.build_coord = new Point(958, 330);
        this.npc_coord = new Point(1000, 660);

        this.inventory_coord = new Point(734, 701);
        this.buy_btn = new Point(325, 608);
        this.car_coord = new Point(1055, 320); // Ссылка на слоты оружейника
        this.rose_of_wind_coord = new Point(1270, 405); // Роза ветров у оружейника

        this.need_weapon_drag = true;  // Установили ли мы уже пулемёт
        this.need_rose_activate = true;  // Повернули ли мы хоть какой-то пулемёт

        this.last_item_direction = null;

        chat.addMessageToLog('Все специалисты по модификации ТС находятся в здании “Автосервис”.', true);
    }

    ArmorerTeachingNote.prototype.on_enter_location = function() {
        _super.prototype.on_enter_location.call(this);
        this.needed_building = locationManager.get_building_by_node_hash('reg:///registry/institutions/mechanic/whitehill_raul_alone');
        this.needed_npc = locationManager.get_npc_by_node_hash('reg:///registry/institutions/armorer/whitehill_martin_arioso');
    };

    ArmorerTeachingNote.prototype.redraw = function() {
        if (!locationManager.in_location_flag) return;
        var active_place = locationManager.get_current_active_place();

        if (!this.needed_building)
            this.needed_building = locationManager.get_building_by_node_hash('reg:///registry/institutions/mechanic/whitehill_raul_alon');
        if (!this.needed_npc)
            this.needed_npc = locationManager.get_npc_by_node_hash('reg:///registry/institutions/armorer/whitehill_martin_arioso');

        if (this.needed_screen_name != locationManager.active_screen_name || (active_place != this.needed_building && active_place != this.needed_npc && active_place != null)) {
            teachingManager.jq_panel_left_content.text('Все специалисты по модификации ТС находятся в здании “Автосервис”.');
            teachingManager.jq_panel_right_content.text('Зайдите в здание “Автосервис”.');
            _super.prototype.redraw.call(this);
            return;
        }

        if (active_place === null) {
            // Указать на здание в радуге
            teachingManager.jq_panel_left_content.text('Все специалисты по модификации ТС находятся в здании “Автосервис”.');
            teachingManager.jq_panel_right_content.text('Зайдите в здание “Автосервис”.');
            this.draw_line(this.start_point, this.build_coord);
            return;
        }
        
        if (active_place === this.needed_building) {
            // Указать на нпц в здании
            teachingManager.jq_panel_left_content.text('Вы находитесь в здании “Автосервис”. Тут могут находиться механик, оружейник и стилист. Каждый специалист в своей области.');
            teachingManager.jq_panel_right_content.text('Зайдите к оружейнику.');
            this.draw_line(this.start_point, this.npc_coord);
        }

        if (active_place === this.needed_npc) {
            if (!user.example_car) {console.warn('Зашли без машинки. нафиг надо тут быть'); return;}
            var npc = this.needed_npc;

            if (! this.need_rose_activate) { // Значит уже вертели какой-то пулёмет, можно подтверждать
                teachingManager.jq_panel_left_content.text('Вы находитесь в интерфейсе оружейника. Тут можно установить, снять или направить в нужную сторону вооружение.');
                teachingManager.jq_panel_right_content.text('Нажмите кнопку <Установить>.');
                this.draw_line(this.start_point, this.buy_btn);
                return;
            }

            var deffered_call = false;
            // Если есть активный слот, нужно вертеть
            if (npc.active_slot && npc.items[npc.active_slot].example) {
                teachingManager.jq_panel_left_content.text('Вы находитесь в интерфейсе оружейника. Тут можно установить, снять или направить в нужную сторону вооружение.');
                teachingManager.jq_panel_right_content.text('Выберите необходимое направление на виджете справа.');
                this.draw_line(this.start_point, this.rose_of_wind_coord);
                // Запоминаем направление выбранного итема
                var new_item_direction = npc.items[npc.active_slot].direction;
                if (this.last_item_direction == null) this.last_item_direction = new_item_direction;
                if (this.last_item_direction != null && new_item_direction != null && new_item_direction != this.last_item_direction) {
                    this.need_rose_activate = false;
                    deffered_call = true;
                }
                this.last_item_direction = new_item_direction;
                this.need_weapon_drag = false; // Если в выбранном слоте было оружие, значит мы его поставили!
                deffered_call = true;
            }
            else {
                // Сбрасываем направление выбранного итема
                this.last_item_direction = null;
                // Если не выбран слот, значит нужно либо установить оружие, либо выбрать слот
                if (this.need_weapon_drag) {
                    // рисовать указатели на инвентарь и на машинку
                    teachingManager.jq_panel_left_content.text('Вы находитесь в интерфейсе оружейника. Тут можно установить, снять или направить в нужную сторону вооружение.');
                    teachingManager.jq_panel_right_content.text('Выберите пулемет в инвентаре и перетащите его в слот автомобиля.');
                    this.draw_line(this.start_point, this.inventory_coord);
                    this.draw_line(this.start_point, this.car_coord);
                }
                else {
                    // рисовать указатель на выбор слота (на машинку)
                    teachingManager.jq_panel_left_content.text('Вы находитесь в интерфейсе оружейника. Тут можно установить, снять или направить в нужную сторону вооружение.');
                    teachingManager.jq_panel_right_content.text('Выберите оружие для изменения направления.');
                    this.draw_line(this.start_point, this.car_coord);
                }
            }
            if (deffered_call) setTimeout(function(){teachingManager.redraw();}, 10);
        }
    };
    
    ArmorerTeachingNote.prototype.delete = function() {
        // Google Analytics
        google_analytics_methods.teach_city_armorer();
        
        _super.prototype.delete.call(this);
    };

    return ArmorerTeachingNote;
})(NavigateTeachingNote);