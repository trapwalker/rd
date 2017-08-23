var LocationServiceBuilding = (function (_super) {
    __extends(LocationServiceBuilding, _super);

    function LocationServiceBuilding(building_rec, jq_town_div) {
        //console.log('LocationServiceBuilding', building_rec);
        this.jq_repair_page = null;
        _super.call(this, building_rec, jq_town_div);

        this.filler_div_max_width = 400;
        this.rail_width = 0;
        this.min_carette_x = 0;
        this.current_prc_hp = 0;
        this.jq_repair_fill_gas = null;
        this.jq_repair_fill_need = null;
        this.jq_repair_carette = null;

        this.update();
    }

    LocationServiceBuilding.prototype.addExtraPages = function (jq_center_menu, jq_center_pages) {
        // Добавление дополнительных функций в здание
        var page_id = 'buildingPageRepair_' + this.building_rec.name;
        jq_center_menu.append('<div class="building-center-menu-item" data-page_id="' + page_id + '">Ремонт</br>автомобиля</div>');
        this.jq_repair_page = $('<div id="' + page_id + '" class="building-center-page">');
        jq_center_pages.append(this.jq_repair_page);
        // Вызвать после, чтобы основной функционал здания был сверху
        _super.prototype.addExtraPages.call(this, jq_center_menu, jq_center_pages);
    };

    LocationServiceBuilding.prototype.update = function () {
        //console.log('LocationServiceBuilding.prototype.update');

        var jq_repair_page = this.jq_repair_page;
        this.jq_repair_page.empty();

        if (user.example_car) {
            jq_repair_page.append(
                '<div class="autoservice-repair-block">' +
                    '<div class="autoservice-repair-car">' + user.templates.html_car_img + '</div>' +
                    '<div class="building-gas-repair-scale-block">' +
                        '<div class="building-gas-repair-scale"></div>' +
                        '<div class="building-gas-repair-fill"></div>' +
                        '<div id="autoserviceRepairNeedFeel" class="building-gas-repair-fill need-for-feel"></div>' +
                        '<div id="autoserviceRepairInGasTank" class="building-gas-repair-fill in-gas-tank"></div>' +
                        '<div id="autoserviceRepairRail" class="building-gas-repair-rail">' +
                            '<div id="autoserviceRepairCarrette" class="building-gas-repair-carette"></div>' +
                        '</div>' +
                        '<div id="autoserviceRepairHPValue" class="building-gas-repair-hp-value building-gas-repair-text"></div>' +
                        '<div class="building-gas-repair-hp-text building-gas-repair-text">HP</div>' +
                    '</div>' +
                '</div>');

            this.filler_div_max_width = jq_repair_page.find('.building-gas-repair-fill').first().outerWidth();
            this.jq_repair_fill_gas = jq_repair_page.find('#autoserviceRepairInGasTank');
            this.jq_repair_fill_need = jq_repair_page.find('#autoserviceRepairNeedFeel');
            this.jq_repair_carette = jq_repair_page.find('#autoserviceRepairCarrette');
            this.jq_hp_value = jq_repair_page.find('#autoserviceRepairHPValue');

            // Повесить драгабл на каретку
            var jq_rail = jq_repair_page.find('#autoserviceRepairRail');
            this.rail_width = jq_rail.outerWidth() - this.jq_repair_carette.outerWidth();
            this.jq_repair_carette.draggable({
                containment: jq_rail,
                axis: "x",
                start: LocationPlace.start_drag_handler,
                drag: this.drag_handler.bind(this)
            });

            // Установить начальные значения для филов и карретки
            var prc_hp = user.example_car.hp / user.example_car.max_hp;
            this.min_carette_x = prc_hp * this.rail_width;
            this.current_prc_hp = prc_hp;
            this.set_filler(this.jq_repair_fill_gas, prc_hp);
            this.set_filler(this.jq_repair_fill_need, prc_hp);
            this._set_carette(prc_hp);
            this._show_text_hp();
        }

        _super.prototype.update.call(this);
    };

    LocationServiceBuilding.prototype.set_filler = function (jq_filler, prc) {
        jq_filler.width(prc * this.filler_div_max_width);
    };

    LocationServiceBuilding.prototype._set_carette = function (prc) {
        this.jq_repair_carette.animate({'left': this.rail_width * prc}, 100);
    };

    LocationServiceBuilding.prototype._get_hp_by_prc = function (prc) {
        return Math.round(prc * user.example_car.max_hp);
    };

    LocationServiceBuilding.prototype._show_text_hp = function () {
        var hp = this._get_hp_by_prc(this.current_prc_hp);
        this.jq_hp_value.text(hp);

        // заполнить в шапку стоимость ремонта
        var current_hp = hp - user.example_car.hp;
        if (current_hp < 0) current_hp = 0;
        var max_hp = user.example_car.max_hp - user.example_car.hp;
        if (max_hp < 0) max_hp = 0;

        var npc = this.building_rec.head;
        var hp_price = user.example_car.price * npc.repair_cost / user.example_car.max_hp;
        var skill_effect = 1 - (user.actual_trading - npc.trading + 100) / 200;
        var current_price = (current_hp * hp_price) * (1 + npc.margin_repair * skill_effect);
        var max_price = (max_hp * hp_price) * (1 + npc.margin_repair * skill_effect);

        this.set_header_text(
            'Ремонт: ' + Math.ceil(current_price) + ' NC</br>' +
            'Полный рамонт: ' + Math.ceil(max_price) + 'NC'
        );
    };

    LocationServiceBuilding.prototype.drag_handler = function (event, ui) {
        var original = ui.originalPosition;
        //ui.position = {
        //    left: (event.clientX - location_draggable_click.x + original.left) / window_scaled_prc,
        //    top: original.top / window_scaled_prc
        //};
        if (ui.position.left < this.min_carette_x) ui.position.left = this.min_carette_x;
        if (ui.position.left > this.rail_width) ui.position.left = this.rail_width;

        this.current_prc_hp = ui.position.left / this.rail_width;
        this._show_text_hp();
        this.set_filler(this.jq_repair_fill_need, this.current_prc_hp);
    };

    LocationServiceBuilding.prototype.set_buttons = function () {
        if (!locationManager.isActivePlace(this)) return;
        if (this.active_central_page == 'buildingPageRepair_service') {
            locationManager.setBtnState(1, '</br>Ремонт', user.example_car ? true : false);
            locationManager.setBtnState(2, 'Полный</br>ремонт', user.example_car ? true : false);
            locationManager.setBtnState(3, '</br>Назад', true);
            locationManager.setBtnState(4, '</br>Выход', true);
        }
        else
            _super.prototype.set_buttons.call(this);
    };

    LocationServiceBuilding.prototype.set_header_text = function (html_text) {
        if (!locationManager.isActivePlace(this)) return;
        if (!html_text) {
            var note = this.get_active_note();
            if (note)
                html_text = note.get_head_text();
        }
        if (!html_text) {
            var quest_info = journalManager.quests.getCountQuestsByNPC(this.building_rec.head.node_hash);
            var r = locationManager.get_npc_by_type(LocationArmorerNPC);
            var npc_armorer = r ? r[0] : null;
            r = locationManager.get_npc_by_type(LocationTunerNPC);
            var npc_tuner = r ? r[0] : null;
            r = locationManager.get_npc_by_type(LocationMechanicNPC);
            var npc_mechanic = r ? r[0] : null;
            var armorer_npc_str = "";
            var tuner_npc_str = "";
            var mechanic_npc_str = "";

            if (npc_armorer)
                armorer_npc_str = "<li>" + npc_armorer.npc_rec.title + ": оружейник. Установка орудий и модулей на кузов транспорта.</li>";
            if (npc_tuner)
                tuner_npc_str = "<li>" + npc_tuner.npc_rec.title + ": стилист. Стайлинг транспорта.</li>";
            if (npc_mechanic)
                mechanic_npc_str = "<li>" + npc_mechanic.npc_rec.title + ": механик. Тюнинг внутренних компонентов транспорта.</li>";
            html_text = "Вас приветствует " + this.building_rec.title + "." +
                "<ul>" +
                "<li>Ремонт транспорта.</li>" +
                armorer_npc_str + tuner_npc_str + mechanic_npc_str +
                "<li>Доступные задания: " + quest_info.available_count + "</li>" +
                "<li>Активные задания: " + quest_info.active_count + "</li></ul>";
        }

        _super.prototype.set_header_text.call(this, html_text);
    };

    LocationServiceBuilding.prototype.clickBtn = function (btnIndex) {
        //console.log('LocationServiceBuilding.prototype.clickBtn', btnIndex);
        if (this.active_central_page == 'buildingPageRepair_service') {
            if (btnIndex == '1') {
                //console.log('Попытка отремонтировать машину');
                var hp = this._get_hp_by_prc(this.current_prc_hp);
                if (hp > user.example_car.max_hp) hp = user.example_car.max_hp;
                hp = hp - user.example_car.hp;
                clientManager.sendMechanicRepairApply(this.building_rec.head.node_hash, hp);
                return;
            }
            if (btnIndex == '2') {
                //console.log('Попытка отремонтировать машину на 100%');
                clientManager.sendMechanicRepairApply(this.building_rec.head.node_hash,
                    user.example_car.max_hp - user.example_car.hp);
                return;
            }
        }
        _super.prototype.clickBtn.call(this, btnIndex);
    };

    return LocationServiceBuilding;
})(LocationPlaceBuilding);
