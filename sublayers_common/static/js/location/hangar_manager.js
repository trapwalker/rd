var LocationHangarNPC = (function (_super) {
    __extends(LocationHangarNPC, _super);

    function LocationHangarNPC(npc_rec, jq_town_div, building_name) {
        //console.log('LocationPlaceNPC', npc_rec);
        _super.call(this, npc_rec, jq_town_div, building_name);
        this.cars_list = [];
        this.current_car = null;
    }

    LocationHangarNPC.prototype.get_self_info = function () {
        //console.log('LocationPlaceBuilding.prototype.get_self_info');
        clientManager.sendGetHangarInfo(this);
    };

    LocationHangarNPC.prototype.update = function (data) {
        //console.log('LocationHangarNPC.prototype.update', data);
        _super.prototype.update.call(this, data);

        if (data && data.hasOwnProperty('cars')) {
            this.cars_list = data.cars;

            var jq_car_list = this.jq_main_div.find('.hangar-center').first();
            var jq_car_list_inventory = this.jq_main_div.find('.hangar-car-list-list').first();

            jq_car_list.empty();
            jq_car_list_inventory.empty();

            for (var i = 0; i < this.cars_list.length; i++) {
                var car_rec = this.cars_list[i];
                var jq_car = $('<div id="hangar-center-info-car-' + i + '" class="hangar-center-info-car-wrap"></div>');
                var jq_car_content = $(
                    '<div class="car-info-block-main">' +
                        '<div class="car-info-block-picture-hangar">' + car_rec.html_car_img + '</div>' +
                        '<div class="car-info-block-info-hangar">' + car_rec.html_car_table + '</div>' +
                    '</div>');
                jq_car.append(jq_car_content);
                jq_car_list.append(jq_car);

                var jq_inv_car = $(
                    '<div class="hangar-car-list-itemWrap" data-car_number="' + i + '" ' + 'data-car_price="' + car_rec.car.price + '">' +
                        '<div class="hangar-car-list-item">' +
                            '<div class="hangar-car-list-pictureWrap" ' + 'style="background: url(' + car_rec.car.inv_icon_mid + ') no-repeat center"></div>' +
                            '<div class="hangar-car-list-name">' + car_rec.car.title + '</div>' +
                        '</div>' +
                    '</div>'
                );
                jq_car_list_inventory.append(jq_inv_car);
            }
            this.resizeNPCList(jq_car_list_inventory);

            // Вешаем клики на машинки в инвентаре
            var self = this;
            this.jq_main_div.find('.hangar-car-list-itemWrap').click(function () {
                // Сбросить предыдущее выделение и выджелить выбранный итем
                self.jq_main_div.find('.hangar-car-list-itemWrap').removeClass('hangar-car-list-itemWrap-active');
                $(this).addClass('hangar-car-list-itemWrap-active');

                // todo: Установить цену
                //$('#hangar-footer-price').text($(this).data('car_price'));

                // Скрыть информационные окна всех машинок, показать выбранную
                self.jq_main_div.find('.hangar-center-info-car-wrap').css('display', 'none');
                self.jq_main_div.find('#hangar-center-info-car-' + $(this).data('car_number')).css('display', 'block');

                // Установить выбранную машинку в менеджер
                self.current_car = $(this).data('car_number');
                self.set_panels();
            });
            this.jq_main_div.find('.hangar-car-list-itemWrap').first().click();
        }
    };

    LocationHangarNPC.prototype.activate = function () {
        console.log('LocationHangarNPC.prototype.activate');
        _super.prototype.activate.call(this);
    };

    LocationHangarNPC.prototype.set_buttons = function () {
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

    LocationHangarNPC.prototype.set_panels = function() {
        if (locationManager.screens[locationManager.active_screen_name] != this) return;

        locationManager.panel_right.show({}, 'self_car_info');

        locationManager.panel_left.show({price: 0, transactions: this.transactions}, 'npc_transaction_info');
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

    return LocationHangarNPC;
})(LocationPlaceNPC);


var LocationParkingNPC = (function (_super) {
    __extends(LocationParkingNPC, _super);

    function LocationParkingNPC(npc_rec, jq_town_div, building_name) {
        //console.log('LocationPlaceNPC', npc_rec);
        _super.call(this, npc_rec, jq_town_div, building_name);
    }

    LocationParkingNPC.prototype.get_self_info = function () {
        clientManager.sendGetParkingInfo(this);
    };

    LocationParkingNPC.prototype.set_buttons = function () {
        if (user.example_car) {
            locationManager.setBtnState(1, '</br>Сменить ТС', true);
            locationManager.setBtnState(2, 'Поставить</br>ТС', true);
        }
        else {
            locationManager.setBtnState(1, '</br>Взять ТС', true);
            locationManager.setBtnState(2, '', false);
        }
        locationManager.setBtnState(3, '</br>Назад', true);
        locationManager.setBtnState(4, '</br>Выход', true);
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

    LocationParkingNPC.prototype.set_panels = function() {
        if (locationManager.screens[locationManager.active_screen_name] != this) return;

        locationManager.panel_right.show({}, 'self_car_info');
        var temp_price = 0;
        locationManager.panel_left.show({price: temp_price, transactions: []}, 'npc_transaction_info');
    };

    return LocationParkingNPC;
})(LocationHangarNPC);