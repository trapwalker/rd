var LocationGasStationNPC = (function (_super) {
    __extends(LocationGasStationNPC, _super);

    function LocationGasStationNPC(npc_rec, jq_town_div, building_name) {
        //console.log('LocationPlaceNPC', npc_rec);
        _super.call(this, npc_rec, jq_town_div, building_name);

        this.filler_div_max_width = 400;
        this.rail_width = 0;
        this.min_carette_x = 0;
        this.current_prc_gas = 0;
        this.jq_repair_page = null;
        this.jq_gs_fill_gas = null;
        this.jq_gs_fill_need = null;
        this.jq_gs_carette = null;
    }

    LocationGasStationNPC.prototype.get_self_info = function () {
        //console.log('LocationPlaceBuilding.prototype.get_self_info');
    };

    LocationGasStationNPC.prototype.activate = function () {
        //console.log('LocationHangarNPC.prototype.activate');
        _super.prototype.activate.call(this);
        this.update();
    };

    LocationGasStationNPC.prototype.update = function (data) {
        console.log('LocationGasStationNPC.prototype.activate');
        this.jq_repair_page = this.jq_main_div.find('.npc-gas-station-scale-block-main');
        var jq_repair_page = this.jq_repair_page;
        this.jq_repair_page.empty();

        if (user.example_car) {
            user.example_car.fuel = user.example_car.fuel / 2;
            jq_repair_page.append(
                '<div class="npc-gas-station-fillcar-block">' +
                    '<div class="building-gas-repair-scale-block">' +
                        '<div class="building-gas-repair-scale"></div>' +
                        '<div class="building-gas-repair-fill"></div>' +
                        '<div id="gasStationRepairNeedFeel" class="building-gas-repair-fill need-for-feel"></div>' +
                        '<div id="gasStationRepairInGasTank" class="building-gas-repair-fill in-gas-tank"></div>' +
                        '<div id="gasStationRepairRail" class="building-gas-repair-rail">' +
                            '<div id="gasStationRepairCarrette" class="building-gas-repair-carette"></div>' +
                        '</div>' +
                        '<div id="gasStationRepairGasValue" class="building-gas-repair-hp-value building-gas-repair-text"></div>' +
                        '<div class="building-gas-repair-hp-text building-gas-repair-text">л</div>' +
                    '</div>' +
                '</div>');

            this.filler_div_max_width = jq_repair_page.find('.building-gas-repair-fill').first().outerWidth();
            this.jq_gs_fill_gas = jq_repair_page.find('#gasStationRepairInGasTank');
            this.jq_gs_fill_need = jq_repair_page.find('#gasStationRepairNeedFeel');
            this.jq_gs_carette = jq_repair_page.find('#gasStationRepairCarrette');
            this.jq_gas_value = jq_repair_page.find('#gasStationRepairGasValue');


            // Повесить драгабл на каретку
            var jq_rail = jq_repair_page.find('#gasStationRepairRail');
            this.rail_width = jq_rail.outerWidth() - this.jq_gs_carette.outerWidth();
            this.jq_gs_carette.draggable({
                containment: jq_rail,
                axis: "x",
                start: LocationPlace.start_drag_handler,
                drag: this.drag_handler.bind(this)
            });

            // Установить начальные значения для филов и карретки
            var prc_hp = user.example_car.fuel / user.example_car.max_fuel;
            this.min_carette_x = prc_hp * this.rail_width;
            this.current_prc_gas = prc_hp;
            this.set_filler(this.jq_gs_fill_gas, prc_hp);
            this.set_filler(this.jq_gs_fill_need, prc_hp);
            this._set_carette(prc_hp);
            this._show_text_gas();
        }
        else {
            jq_repair_page.text('Отсутствует машинка');
        }


        _super.prototype.update.call(this, data);
    };

    LocationGasStationNPC.prototype.set_filler = function (jq_filler, prc) {
        jq_filler.width(prc * this.filler_div_max_width);
    };

    LocationGasStationNPC.prototype._set_carette = function (prc) {
        this.jq_gs_carette.animate({'left': this.rail_width * prc}, 100);
    };

    LocationGasStationNPC.prototype._get_gas_by_prc = function (prc) {
        return Math.round(prc * user.example_car.max_fuel);
    };

    LocationGasStationNPC.prototype._show_text_gas = function () {
        var gas = this._get_gas_by_prc(this.current_prc_gas);
        this.jq_gas_value.text(gas);

        // заполнить в шапку стоимость ремонта
        var current_gas = gas - user.example_car.fuel;
        if (current_gas < 0) current_gas = 0;
        this.set_header_text(
            'Заправка: ' + current_gas.toFixed(0) + ' NC</br>' +
            'Заправка всего: ' + (user.example_car.max_fuel - user.example_car.fuel).toFixed(0) + 'NC'
        );
    };

    LocationGasStationNPC.prototype.drag_handler = function (event, ui) {
        var original = ui.originalPosition;
        ui.position = {
            left: (event.clientX - location_draggable_click.x + original.left) / window_scaled_prc,
            top: original.top / window_scaled_prc
        };
        if (ui.position.left < this.min_carette_x) ui.position.left = this.min_carette_x;
        if (ui.position.left > this.rail_width) ui.position.left = this.rail_width;

        this.current_prc_gas = ui.position.left / this.rail_width;
        this._show_text_gas();
        this.set_filler(this.jq_gs_fill_need, this.current_prc_gas);
    };

    LocationGasStationNPC.prototype.set_buttons = function () {
        if (!locationManager.isActivePlace(this)) return;
        if (user.example_car) {
            locationManager.setBtnState(1, '</br>Обменять ТС', true);
            locationManager.setBtnState(2, '</br>Продать ТС', true);
        }
        else {
            locationManager.setBtnState(1, '</br>Купить ТС', true);
            locationManager.setBtnState(2, '</br>Продать ТС', false);
        }
        locationManager.setBtnState(3, '</br>Назад', true);
        locationManager.setBtnState(4, '</br>Выход', true);
    };

    LocationGasStationNPC.prototype.clickBtn = function (btnIndex) {
        //console.log('LocationHangarNPC.prototype.clickBtn', btnIndex);
        switch (btnIndex) {
            case '1':
                break;
            case '2':
                break;
            default:
                _super.prototype.clickBtn.call(this, btnIndex);
        }
    };

    return LocationGasStationNPC;
})(LocationPlaceNPC);

