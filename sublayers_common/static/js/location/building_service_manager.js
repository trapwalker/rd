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
        else {
            jq_repair_page.text('Отсутствует машинка');
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
        this.set_header_text(
            'Ремонт: ' + Math.ceil(current_hp) + ' NC</br>' +
            'Ремонт всего: ' + Math.ceil(user.example_car.max_hp - user.example_car.hp) + 'NC'
        );
    };

    LocationServiceBuilding.prototype.drag_handler = function (event, ui) {
        var original = ui.originalPosition;
        ui.position = {
            left: (event.clientX - location_draggable_click.x + original.left) / window_scaled_prc,
            top: original.top / window_scaled_prc
        };
        if (ui.position.left < this.min_carette_x) ui.position.left = this.min_carette_x;
        if (ui.position.left > this.rail_width) ui.position.left = this.rail_width;

        this.current_prc_hp = ui.position.left / this.rail_width;
        this._show_text_hp();
        this.set_filler(this.jq_repair_fill_need, this.current_prc_hp);
    };

    //LocationServiceBuilding.prototype.centralMenuReaction = function (page_id) {
    //    _super.prototype.centralMenuReaction.call(this, page_id);
    //    this.set_buttons();
    //};

    LocationServiceBuilding.prototype.set_buttons = function () {
        if (!locationManager.isActivePlace(this)) return;
        if (this.active_central_page == 'buildingPageRepair_autoservice') {
            locationManager.setBtnState(1, '</br>Ремонт', user.example_car ? true : false);
            locationManager.setBtnState(2, 'Ремонт</br>всего', user.example_car ? true : false);
            locationManager.setBtnState(3, '</br>Назад', true);
            locationManager.setBtnState(4, '</br>Выход', true);
        }
        else {
            _super.prototype.set_buttons.call(this);
        }
    };

    LocationServiceBuilding.prototype.clickBtn = function (btnIndex) {
        //console.log('LocationServiceBuilding.prototype.clickBtn', btnIndex);
        if (this.active_central_page == 'buildingPageRepair_autoservice') {
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
