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

        // для работы с канистрами
        this.jq_empty_tank_text = null;
        this.jq_empty_tank_inventory = null;
        this.jq_full_tank_inventory = null;
        this.selected_items = {};
        this.volume_all_empty_tanks = 0;
        this.empty_tanks_list = []; // Список пустых канистр
    }

    LocationGasStationNPC.prototype.activate = function () {
        //console.log('LocationHangarNPC.prototype.activate');
        _super.prototype.activate.call(this);
        this.update();
    };

    LocationGasStationNPC.prototype.add_top_path = function (jq_repair_page) {
        //console.log('LocationGasStationNPC.prototype.add_top_path');
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
    };

    LocationGasStationNPC.prototype._addToFullInventory = function (item) {
        if (! item.hasOwnProperty('example')) return;

        var itemWrapDiv = $('<div class="npcInventory-itemWrap"></div>');
        var itemDiv = $('<div class="npcInventory-item"></div>');
        var emptyItemDiv = $(
            '<div class="npcInventory-pictureWrap">' +
                '<div class="npcInventory-picture town-interlacing"></div>' +
            '</div>' +
            '<div class="npcInventory-name">' + item.example.value_fuel + ' л</div>');
        itemDiv.append(emptyItemDiv);

        itemDiv.find('.npcInventory-picture')
            .css('background', 'transparent url(' + item.example.inv_icon_mid + ') no-repeat 100% 100%');

        itemWrapDiv.append(itemDiv);

        itemWrapDiv.mouseenter({item: item, npc: this}, LocationGasStationNPC.inventory_slot_event_mouseenter);
        itemWrapDiv.mouseleave({npc: this}, LocationGasStationNPC.inventory_slot_event_mouseleave);

        this.jq_full_tank_inventory.append(itemWrapDiv);
    };

    LocationGasStationNPC.prototype._addToEmptyInventory = function (item) {
        if (! item.hasOwnProperty('example')) return;

        var itemWrapDiv = $('<div class="npcInventory-itemWrap"></div>');
        var itemDiv = $('<div class="npcInventory-item"></div>');
        var emptyItemDiv = $(
            '<div class="npcInventory-pictureWrap">' +
                '<div class="npcInventory-picture town-interlacing"></div>' +
            '</div>' +
            '<div class="npcInventory-name">' + item.example.value_fuel + ' л</div>' +
            '<div class="gs-checkbox">[ ]</div>');
        itemDiv.append(emptyItemDiv);

        itemDiv.find('.npcInventory-picture')
            .css('background', 'transparent url(' + item.example.inv_icon_mid + ') no-repeat 100% 100%');

        itemWrapDiv.append(itemDiv);

        itemWrapDiv.mouseenter({item: item, npc: this}, LocationGasStationNPC.inventory_slot_event_mouseenter);
        itemWrapDiv.mouseleave({npc: this}, LocationGasStationNPC.inventory_slot_event_mouseleave);
        itemWrapDiv.click({item: item, npc: this}, LocationGasStationNPC.inventory_empty_click);

        this.jq_empty_tank_inventory.append(itemWrapDiv);
    };

    LocationGasStationNPC.prototype.update = function (data) {
        //console.log('LocationGasStationNPC.prototype.update');
        this.jq_repair_page = this.jq_main_div.find('.npc-gas-station-scale-block-main');
        this.jq_repair_page.empty();

        this.jq_empty_tank_text = this.jq_main_div.find('.npc-gas-station-empty-tanks-text').first();
        this.jq_empty_tank_inventory = this.jq_main_div.find('.npc-gas-station-empty-tanks-inventory').first();
        this.jq_full_tank_inventory = this.jq_main_div.find('.npcInventory-inventory').first();
        this.jq_empty_tank_text.empty();
        this.jq_empty_tank_inventory.empty();
        this.jq_full_tank_inventory.empty();

        if (user.example_car) {
            // Добавление верхней части, там где драгабл
            this.add_top_path(this.jq_repair_page);

            // Добавить итемы инвентаря своего агента
            var inventory = inventoryList.getInventory(user.ID);
            if (!inventory) {
                //console.warn('Ивентарь агента (' + user.ID + ') не найден');
                return;
            }

            var item;
            var empty_tanks = [];
            var full_tanks = [];
            for (var i = 0; i < inventory.max_size; i++) {
                item = inventory.getItem(i);
                if (item) {
                    if (item.hasTag('full_fuel_tank')) {  // фильтрация итема
                        this._addToFullInventory(item);
                        full_tanks.push(item);
                    }
                    if (item.hasTag('empty_fuel_tank')) {  // фильтрация итема
                        this._addToEmptyInventory(item);
                        empty_tanks.push(item);
                    }
                }
            }
            this.resizeInventory(this.jq_full_tank_inventory);

            // Сортировка, подготовка для вывода информационных строк
            var info_empty_tanks = this._get_tanks_str(empty_tanks);
            var info_full_tanks = this._get_tanks_str(full_tanks);
            this.empty_tanks_list = empty_tanks;

            this.volume_all_empty_tanks = info_empty_tanks.summ_volume;

            this.jq_empty_tank_text.text(info_empty_tanks.str);

            this.jq_main_div.find('.npcInventory-label').first()
                .text('Полные канистры: ' + info_full_tanks.str);
        }
        else {
            this.jq_repair_page.text('Отсутствует машинка');
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

    LocationGasStationNPC.prototype._get_selected_volume = function() {
        var res = 0;
        for (var key in this.selected_items)
            if (this.selected_items.hasOwnProperty(key))
                res += this.selected_items[key].example.value_fuel;
        return res;
    };

    LocationGasStationNPC.prototype._get_tanks_info = function (tanks) {
        var summ_volume = 0;
        var dict = {};
        var volumes = [];
        for (var i = 0; i < tanks.length; i++) {
            var item = tanks[i];
            var value_fuel = item.example.value_fuel;
            summ_volume += value_fuel;
            if (dict.hasOwnProperty(value_fuel)) {
                dict[value_fuel] = dict[value_fuel] + 1;
            }
            else {
                dict[value_fuel] = 1;
                volumes.push(value_fuel);
            }
        }
        volumes.sort(function(a, b) {return b - a});
        return {summ_volume: summ_volume, dict: dict, volumes: volumes};
    };

    LocationGasStationNPC.prototype._get_tanks_str = function (tanks) {
        var res = '';
        var info = this._get_tanks_info(tanks);
        for (var i = 0; i < info.volumes.length; i++) {
            var volume = info.volumes[i];
            var count = info.dict[volume];
            res = res + volume + 'л × ' + count + '; '
        }
        return {str: res, summ_volume: info.summ_volume};
    };

    LocationGasStationNPC.prototype._get_tank_list = function (need_all) {
        var ids_position = []; // Позиции в инвентаре - для работы транзакции
        if (need_all) { // Взять все канистры
            for (var i = 0; i < this.empty_tanks_list.length; i++)
                ids_position.push(this.empty_tanks_list[i].position)
        }
        else {
            for (var id in this.selected_items)
                if (this.selected_items.hasOwnProperty(id))
                    ids_position.push(this.selected_items[id].position)
        }
        return ids_position;
    };

    LocationGasStationNPC.prototype._show_text_gas = function () {
        //console.log('LocationGasStationNPC.prototype._show_text_gas');
        //var gas = this._get_gas_by_prc(this.current_prc_gas);
        this.jq_gas_value.text(this._get_gas_by_prc(this.current_prc_gas));
        this.set_header_text();
    };

    LocationGasStationNPC.prototype.set_header_text = function (html_text) {
        if (!locationManager.isActivePlace(this)) return;
        // заполнить в шапку стоимость ремонта.
        if (! html_text && user.example_car) {
            var current_gas = this._get_gas_by_prc(this.current_prc_gas) - user.example_car.fuel;
            if (current_gas < 0) current_gas = 0;
            current_gas += this._get_selected_volume();
            html_text =
                'Заправить: ' + Math.ceil(current_gas) + ' NC</br>' +
                'Заправить всё: ' + Math.ceil(user.example_car.max_fuel - user.example_car.fuel + this.volume_all_empty_tanks) + 'NC';
        }
        _super.prototype.set_header_text.call(this, html_text);
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

        // Обновление менеджера обучения
        teachingManager.redraw();
    };

    LocationGasStationNPC.prototype.set_buttons = function () {
        //console.log("LocationGasStationNPC.prototype.set_buttons");
        if (!locationManager.isActivePlace(this)) return;
        if (user.example_car) {
            locationManager.setBtnState(1, '</br>Заправить', true);
            locationManager.setBtnState(2, 'Заправить</br>всё', true);
        }
        else {
            locationManager.setBtnState(1, '', false);
            locationManager.setBtnState(2, '', false);
        }
        locationManager.setBtnState(3, '</br>Назад', true);
        locationManager.setBtnState(4, '</br>Выход', true);
    };

    LocationGasStationNPC.prototype.clickBtn = function (btnIndex) {
        //console.log('LocationHangarNPC.prototype.clickBtn', btnIndex);
        var tank_list;
        var fuel;
        switch (btnIndex) {
            case '1':
                if (user.example_car){
                    tank_list = this._get_tank_list(false);
                    fuel = this._get_gas_by_prc(this.current_prc_gas) - user.example_car.fuel;
                    clientManager.sendFuelStationActive(fuel, tank_list, this);
                }
                break;
            case '2':
                if (user.example_car){
                    tank_list = this._get_tank_list(true);
                    fuel = user.example_car.max_fuel - user.example_car.fuel;
                    clientManager.sendFuelStationActive(fuel, tank_list, this);
                }
                break;
            default:
                _super.prototype.clickBtn.call(this, btnIndex);
        }
    };

    LocationGasStationNPC.prototype.click_empty_inv_reaction = function (jq_item_wrap, item) {
        //console.log('LocationGasStationNPC.prototype.click_empty_inv_reaction', item);
        if (!item) return;
        if (this.selected_items.hasOwnProperty(item.ID)) {
            // Если есть итем, то удалить и убрать подсветку
            delete this.selected_items[item.ID];
            jq_item_wrap.find('.gs-checkbox').first().text('[ ]');
        }
        else {
            // Добавить новый итем и включить подсветку
            this.selected_items[item.ID] = item;
            jq_item_wrap.find('.gs-checkbox').first().text('[●]');
        }

        this._show_text_gas();
    };

    LocationGasStationNPC.prototype.set_panels = function () {
        if (!locationManager.isActivePlace(this)) return;
        _super.prototype.set_panels.call(this);
        this.clearRightPanel();
        locationManager.panel_left.show({transactions: this.transactions}, 'npc_transaction_info');
    };

    LocationGasStationNPC.prototype.viewRightPanel = function(item) {
        //console.log('LocationArmorerNPC.prototype.viewRightPanel', slot_name);
        locationManager.panel_right.show({text: item.example.description,
                                          title: item.example.title}, 'description');
    };

    LocationGasStationNPC.prototype.clearRightPanel = function() {
        //console.log('LocationArmorerNPC.prototype.clearRightPanel');
        locationManager.panel_right.show({text: '', title: ''}, 'description');
    };

    /*  */

    LocationGasStationNPC.inventory_slot_event_mouseenter = function (event) {
        //console.log('LocationGasStationNPC.inventory_slot_event_mouseenter', event.data.item);
        event.data.npc.viewRightPanel(event.data.item);
    };

    LocationGasStationNPC.inventory_slot_event_mouseleave = function (event) {
        //console.log('LocationGasStationNPC.inventory_slot_event_mouseleave');
        event.data.npc.clearRightPanel(event.data.item);
    };

    LocationGasStationNPC.inventory_empty_click = function (event) {
        //console.log('LocationGasStationNPC.inventory_empty_click', event);
        event.data.npc.click_empty_inv_reaction($(event.currentTarget), event.data.item);
    };

    return LocationGasStationNPC;
})(LocationPlaceNPC);

