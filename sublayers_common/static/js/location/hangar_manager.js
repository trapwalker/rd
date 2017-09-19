var LocationHangarNPC = (function (_super) {
    __extends(LocationHangarNPC, _super);

    function LocationHangarNPC(npc_rec, jq_town_div, building_name) {
        //console.log('LocationPlaceNPC', npc_rec);
        _super.call(this, npc_rec, jq_town_div, building_name);
        this.cars_list = [];
        this.current_car = null;
        this.skill_effect = 1;
        this.npc_margin = 0;
    }

    LocationHangarNPC.prototype.get_self_info = function () {
        //console.log('LocationPlaceBuilding.prototype.get_self_info');
        clientManager.sendGetHangarInfo(this);
    };

    LocationHangarNPC.prototype.update = function (data) {
        //console.log('LocationHangarNPC.prototype.update', data);
        if (data && data.hasOwnProperty('cars')) {
            this.cars_list = data.cars;
            var jq_car_list = this.jq_main_div.find('.hangar-center').first();
            var jq_car_list_inventory = this.jq_main_div.find('.hangar-car-list-list').first();
            jq_car_list.empty();
            jq_car_list_inventory.empty();

            if (data.hasOwnProperty('npc_trading') && data.hasOwnProperty('npc_margin')) {
                this.npc_margin = data.npc_margin;
                this.skill_effect = 1 - (user.actual_trading - data.npc_trading + 100) / 200;
                for (var i = 0; i < this.cars_list.length; i++)
                    this.cars_list[i].car.price = this.get_trading_effect_price_sale(this.cars_list[i].car.price);
            }

            for (var i = 0; i < this.cars_list.length; i++) {
                var car_rec = this.cars_list[i];
                var jq_car = $('<div id="hangar-center-info-car-' + i + '" class="hangar-center-info-car-wrap"></div>');
                var jq_car_content = $(
                    '<div class="car-info-block-main">' +
                        '<div class="car-info-block-picture-hangar town-interlacing">' + car_rec.html_car_img + '</div>' +
                        '<div class="car-info-block-car-name-hangar">' + _(car_rec.car.title) + '</div>' +
                        '<div class="car-info-block-info-hangar">' +
                            '<div class="town-back-interlacing"></div>' +
                            car_rec.html_car_table +
                        '</div>' +
                    '</div>');
                jq_car.append(jq_car_content);
                jq_car_list.append(jq_car);

                var jq_inv_car = $(
                    '<div class="npcInventory-itemWrap" data-car_number="' + i + '">' +
                        '<div class="npcInventory-item">' +
                            '<div class="npcInventory-pictureWrap town-interlacing" ' + 'style="background: url(' + car_rec.car.inv_icon_mid + ') no-repeat center"></div>' +
                            '<div class="npcInventory-name">' + _(car_rec.car.title) + '</div>' +
                        '</div>' +
                    '</div>'
                );
                jq_car_list_inventory.append(jq_inv_car);
            }
            this.resizeInventory(jq_car_list_inventory);

            // Вешаем клики на машинки в инвентаре
            var self = this;
            this.jq_main_div.find('.npcInventory-itemWrap').click(function () {
                // Сбросить предыдущее выделение и выджелить выбранный итем
                self.jq_main_div.find('.npcInventory-itemWrap').removeClass('active');
                $(this).addClass('active');

                // Скрыть информационные окна всех машинок, показать выбранную
                self.jq_main_div.find('.hangar-center-info-car-wrap').css('display', 'none');
                self.jq_main_div.find('#hangar-center-info-car-' + $(this).data('car_number')).css('display', 'block');

                // Установить выбранную машинку в менеджер
                self.current_car = $(this).data('car_number');
                self.set_panels();
                self.set_header_text();

                // Обновление менеджера обучения
                teachingManager.redraw();
            });
            this.jq_main_div.find('.npcInventory-itemWrap').first().click();
        }
        _super.prototype.update.call(this, data);
    };

    LocationHangarNPC.prototype.activate = function () {
        //console.log('LocationHangarNPC.prototype.activate');
        _super.prototype.activate.call(this);
    };

    LocationHangarNPC.prototype.set_buttons = function () {
        if (!locationManager.isActivePlace(this)) return;
        if (user.example_car) {
            locationManager.setBtnState(1, '</br>' + _("loc_leaf_hangar_swap"), true);
            locationManager.setBtnState(2, '</br>' + _("loc_leaf_hangar_sell"), true);
        }
        else {
            locationManager.setBtnState(1, '</br>' + _("loc_leaf_hangar_buy"), true);
            locationManager.setBtnState(2, '</br>' + _("loc_leaf_hangar_sell"), false);
        }
        locationManager.setBtnState(3, '</br>' + _("loc_leaf_back"), true);
        locationManager.setBtnState(4, '</br>' + _("loc_leaf_exit"), true);
    };

    LocationHangarNPC.prototype.set_panels = function() {
        if (!locationManager.isActivePlace(this)) return;
        locationManager.panel_right.show({}, 'self_car_info');
        locationManager.panel_left.show({price: 0, transactions: this.transactions}, 'npc_transaction_info');
    };

    LocationHangarNPC.prototype.set_header_text = function(html_text) {
        if (!locationManager.isActivePlace(this)) return;
        if (!html_text) {
            var cur_car = this.cars_list[this.current_car].car;
            var jq_text_div = $('<div></div>');
            if (user.example_car) {
                var u_title = _(user.example_car.title);
                var user_car_price = this.get_trading_effect_price_buy(user.example_car.price);
                if (user_car_price > cur_car.price)
                    jq_text_div.append('<div>' + _("loc_hang_sht_swap") + ' ' + u_title + _("loc_hang_sht_to") + _(cur_car.title) + _("loc_hang_sht_npc_summ") + (user_car_price - cur_car.price) + 'NC</div>');
                else
                    jq_text_div.append('<div>' + _("loc_hang_sht_swap") + ' ' + u_title + _("loc_hang_sht_to") + _(cur_car.title) + _("loc_hang_sht_player_summ") + (cur_car.price - user_car_price) + 'NC</div>');

                jq_text_div.append('<div>' + _("loc_hang_sht_sell") + ' ' + u_title + ': ' + user_car_price + 'NC</div>');
            }
            else
                jq_text_div.append('<div>' + _("loc_hang_sht_buy") + ' ' + _(cur_car.title) + ': ' + cur_car.price + 'NC</div>');
            html_text = jq_text_div;
        }
        _super.prototype.set_header_text.call(this, html_text);
    };

    LocationHangarNPC.prototype.clickBtn = function (btnIndex) {
        //console.log('LocationHangarNPC.prototype.clickBtn', btnIndex);
        switch (btnIndex) {
            case '1':
                clientManager.sendHangarBuy(this);
                break;
            case '2':
                if (user.example_car)
                    clientManager.sendHangarSell(this);
                break;
            default:
                _super.prototype.clickBtn.call(this, btnIndex);
        }
    };

    LocationHangarNPC.prototype.get_trading_effect_price_buy = function (price) {
        return Math.floor(price * (1 - this.npc_margin * this.skill_effect));
    };

    LocationHangarNPC.prototype.get_trading_effect_price_sale = function (price) {
        return Math.floor(price * (1 + this.npc_margin * this.skill_effect));
    };

    LocationHangarNPC.prototype.get_min_price = function() {
        var p = this.cars_list && this.cars_list[0].car.price || 0;
        for (var i = 1; i < this.cars_list.length; i++)
            p = Math.min(p, this.cars_list[i].car.price);
        return p;
    };


    return LocationHangarNPC;
})(LocationPlaceNPC);


var LocationParkingNPC = (function (_super) {
    __extends(LocationParkingNPC, _super);

    function LocationParkingNPC(npc_rec, jq_town_div, building_name) {
        //console.log('LocationPlaceNPC', npc_rec);
        _super.call(this, npc_rec, jq_town_div, building_name);

        // Создать паркинг-bag
        this.bag_place = new LocationParkingBag(jq_town_div, this);
    }

    LocationParkingNPC.prototype.update = function (data) {
        _super.prototype.update.call(this, data);
        var self = this;
        for (var i = 0; i < this.cars_list.length; i++) {
            var car_rec = this.cars_list[i];
            var jq_car = this.jq_main_div.find('#hangar-center-info-car-' + i);
            jq_car.append('<div class="hangar-center-info-car-bag" data-uid="' + car_rec.car.uid +
                '">' + _("loc_park_enter_bag") + ': ' + car_rec.car_parking_price + 'NC</div>');
        }

        this.jq_main_div.find('.hangar-center-info-car-bag').click(function (event) {
            var car_uid = $(this).data('uid');
            clientManager.sendParkingBagExchange(car_uid, self.npc_rec.node_hash);
        });

    };

    LocationParkingNPC.prototype.get_self_info = function () {
        clientManager.sendGetParkingInfo(this);
    };

    LocationParkingNPC.prototype.set_buttons = function () {
        //console.log('LocationParkingNPC.prototype.set_buttons', this.cars_list.length);
        if (!locationManager.isActivePlace(this)) return;
        if (user.example_car) {
            if (this.cars_list.length) {
                locationManager.setBtnState(1, '</br>' + _("loc_leaf_park_swap"), true);
            } else {
                locationManager.setBtnState(1, '', false);
            }
            locationManager.setBtnState(2, _("loc_leaf_park_give"), true);
        }
        else {
            if (this.cars_list.length) {
                locationManager.setBtnState(1, '</br>' + _("loc_leaf_park_take"), true);
            }
            else {
                locationManager.setBtnState(1, '', false);
            }
            locationManager.setBtnState(2, '', false);
        }
        locationManager.setBtnState(3, '</br>' + _("loc_leaf_back"), true);
        locationManager.setBtnState(4, '</br>' + _("loc_leaf_exit"), true);
    };

    LocationParkingNPC.prototype.clickBtn = function (btnIndex) {
        //console.log('LocationHangarNPC.prototype.clickBtn', btnIndex);
        switch (btnIndex) {
            case '1':
                clientManager.sendParkingSelect(this);
                break;
            case '2':
                if (user.example_car)
                    clientManager.sendParkingLeave(this);
                break;
            default:
                _super.prototype.clickBtn.call(this, btnIndex);
        }
    };

    LocationParkingNPC.prototype.set_header_text = function(html_text) {
        if (!locationManager.isActivePlace(this)) return;
        if (!html_text) {
            var jq_text_div = $('<div></div>');
            if (this.cars_list.length) {
                var cur_car = this.cars_list[this.current_car];
                if (user.example_car)
                    jq_text_div.append('<div>' + _("loc_park_sht_swap") + ' ' + _(user.example_car.title) + _("loc_hang_sht_to") + _(cur_car.car.title) + ': ' + cur_car.car_parking_price + 'NC</div>');
                else
                    jq_text_div.append('<div>' + _("loc_park_sht_take") + ' ' + _(cur_car.car.title) + ': ' + cur_car.car_parking_price + 'NC</div>');
            }
            if (user.example_car)
                jq_text_div.append('<div>' + _("loc_park_sht_give") + ' ' + _(user.example_car.title) + ': 0NC</div>');
            html_text = jq_text_div;
        }
        _super.prototype.set_header_text.call(this, html_text);
    };

    LocationParkingNPC.prototype.select_car_by_number = function(number) {
        //console.log('LocationParkingNPC.prototype.select_car_by_number', number);
        number = (number == null) || (number === undefined) ? 0 : number;
        var car_list = this.jq_main_div.find('.npcInventory-itemWrap');
        if (car_list.length > number) {
            car_list[number].click();
        }
    };

    return LocationParkingNPC;
})(LocationHangarNPC);


var LocationParkingBag = (function (_super) {
    __extends(LocationParkingBag, _super);

    function LocationParkingBag(jq_town_div, parking_npc) {
        //console.log('LocationPlaceNPC', npc_rec);
        _super.call(this, jq_town_div.find('#townParkingBagExchange'), 'location_screen');
        this.parking_npc = parking_npc;
        this.hangar_last_choice_car_number = 0;
        this.owner_name = parking_npc.owner_name;

        this.jq_inv_div = this.jq_main_div.find('#townParkingBagExchangeInventory');
        this.jq_bag_div = this.jq_main_div.find('#townParkingBagExchangeBag');
    }

    LocationParkingBag.prototype.update = function (data) {
        //console.log('LocationParkingBag.prototype.update', data);
        _super.prototype.update.call(this, data);

        // Отобразить свой инвентарь
        this.jq_inv_div.empty();
        var car_inventory = inventoryList.getInventory(user.ID);
        if (car_inventory) {
            this.jq_inv_div.append('<div class="hangar-nag-inventory-block inventory-' + user.ID + '"></div>');
            car_inventory.showInventory(this.jq_inv_div.find('.hangar-nag-inventory-block'));
        }

        // Отобразить инвентарь
        this.jq_bag_div.empty();
        if (data.parking_bag_id) {
            this.jq_bag_div.append('<div class="hangar-nag-inventory-block inventory-' + data.parking_bag_id + '"></div>');
            inventoryList.showInventory(data.parking_bag_id, this.jq_bag_div.find('.hangar-nag-inventory-block'), false);
        }

        // Обновление имени машинки
        this.jq_main_div.find('#townParkingBagExchangeBagText').text(_(data.car_title))
    };

    LocationParkingBag.prototype.clickBtn = function (btnIndex) {
        //console.log('LocationParkingBag.prototype.clickBtn', btnIndex);
        switch (btnIndex) {
            case '3':
                this.clear();
                this.parking_npc.activate();
                this.parking_npc.select_car_by_number(this.hangar_last_choice_car_number);
                clientManager.sendParkingBagExchange(null, this.parking_npc.npc_rec.node_hash);
                break;
            default:
                _super.prototype.clickBtn.call(this, btnIndex);
        }
    };

    LocationParkingBag.prototype.activate = function () {
        //console.log('LocationParkingBag.prototype.activate', car_uid);
        _super.prototype.activate.call(this);
        if (this.owner_name)
            $('#' + this.owner_name + '-back').css('display', 'block');
        this.hangar_last_choice_car_number = this.parking_npc.current_car;
    };

    LocationParkingBag.prototype.set_buttons = function () {
        if (!locationManager.isActivePlace(this)) return;
        locationManager.setBtnState(1, '', false);
        locationManager.setBtnState(2, '', false);
        locationManager.setBtnState(3, '</br>' + _("loc_leaf_back"), true);
        locationManager.setBtnState(4, '</br>' + _("loc_leaf_exit"), true);
    };

    LocationParkingBag.prototype.set_panels = function() {
        if (!locationManager.isActivePlace(this)) return;
        _super.prototype.set_panels.call(this);
        locationManager.panel_right.show({text: '', title:''}, 'description');
    };

    LocationParkingBag.prototype.clear = function () {
        //console.log('LocationParkingBag.prototype.clear');
        // Нельзя вызывать супер, так как очистится jq_main_div, а нам этого не нужно
    };

    return LocationParkingBag;
})(LocationPlace);