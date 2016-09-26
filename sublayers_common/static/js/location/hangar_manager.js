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
                        '<div class="car-info-block-picture-hangar town-interlacing">' + car_rec.html_car_img + '</div>' +
                        '<div class="car-info-block-car-name-hangar">' + car_rec.car.title + '</div>' +
                        '<div class="car-info-block-info-hangar">' +
                            '<div class="town-back-interlacing"></div>' +
                            car_rec.html_car_table +
                        '</div>' +
                    '</div>');
                jq_car.append(jq_car_content);
                jq_car_list.append(jq_car);

                var jq_inv_car = $(
                    '<div class="npcInventory-itemWrap" data-car_number="' + i + '" ' + 'data-car_price="' + car_rec.car.price + '">' +
                        '<div class="npcInventory-item">' +
                            '<div class="npcInventory-pictureWrap town-interlacing" ' + 'style="background: url(' + car_rec.car.inv_icon_mid + ') no-repeat center"></div>' +
                            '<div class="npcInventory-name">' + car_rec.car.title + '</div>' +
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

                // todo: Установить цену
                //$('#hangar-footer-price').text($(this).data('car_price'));

                // Скрыть информационные окна всех машинок, показать выбранную
                self.jq_main_div.find('.hangar-center-info-car-wrap').css('display', 'none');
                self.jq_main_div.find('#hangar-center-info-car-' + $(this).data('car_number')).css('display', 'block');

                // Установить выбранную машинку в менеджер
                self.current_car = $(this).data('car_number');
                self.set_panels();
                self.set_header_text();
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
        if (!locationManager.isActivePlace(this)) return;
        locationManager.panel_right.show({}, 'self_car_info');
        locationManager.panel_left.show({price: 0, transactions: this.transactions}, 'npc_transaction_info');
    };

    LocationHangarNPC.prototype.set_header_text = function() {
        if (!locationManager.isActivePlace(this)) return;
        var jq_text_div = $('<div></div>');
        if (user.example_car) {
            jq_text_div.append('<div>Обменять ТС: ' + (user.example_car.price - this.cars_list[this.current_car].car.price) + 'NC</div>');
            jq_text_div.append('<div>Продать ТС: ' + user.example_car.price + 'NC</div>');
        }
        else
            jq_text_div.append('<div>Купить ТС: -' + this.cars_list[this.current_car].car.price + 'NC</div>');
        _super.prototype.set_header_text.call(this, jq_text_div);
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
                '">Зайти в багажник: ' + car_rec.car_parking_price + 'NC</div>');
        }

        this.jq_main_div.find('.hangar-center-info-car-bag').click(function (event) {
            var car_uid = $(this).data('uid');
            console.log(car_uid);
            self.bag_place.activate();
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
                locationManager.setBtnState(1, '</br>Сменить ТС', true);
            } else {
                locationManager.setBtnState(1, '', false);
            }
            locationManager.setBtnState(2, 'Поставить</br>ТС', true);
        }
        else {
            if (this.cars_list.length) {
                locationManager.setBtnState(1, '</br>Взять ТС', true);
            }
            else {
                locationManager.setBtnState(1, '', false);
            }
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

    LocationParkingNPC.prototype.set_header_text = function() {
        if (!locationManager.isActivePlace(this)) return;
        var jq_text_div = $('<div></div>');

        if (this.cars_list.length)
            if (user.example_car)
                jq_text_div.append('<div>Обменять ТС: -' + (this.cars_list[this.current_car].car_parking_price) + 'NC</div>');
            else
                jq_text_div.append('<div>Взять ТС: -' + (this.cars_list[this.current_car].car_parking_price) + 'NC</div>');

        if (user.example_car)
            jq_text_div.append('<div>Поставить ТС: 0NC</div>');

        var jq_header_text = this.jq_main_div.find('.npc-text');
        jq_header_text.empty();
        jq_header_text.append(jq_text_div);
    };

    return LocationParkingNPC;
})(LocationHangarNPC);




var LocationParkingBag = (function (_super) {
    __extends(LocationParkingBag, _super);

    function LocationParkingBag(jq_town_div, parking_npc) {
        //console.log('LocationPlaceNPC', npc_rec);
        _super.call(this, jq_town_div.find('#townParkingBagExchange'), 'location_screen');
        this.parking_npc = parking_npc;
        this.current_car_uid = null;
    }

    LocationParkingBag.prototype.update = function (data) {
        console.log('LocationParkingBag.prototype.update', data);
        _super.prototype.update.call(this, data);
    };

    LocationParkingBag.prototype.clickBtn = function (btnIndex) {
        console.log('LocationParkingBag.prototype.clickBtn', btnIndex);
        switch (btnIndex) {
            case '3':
                this.clear();
                this.parking_npc.activate();
                break;
            default:
                _super.prototype.clickBtn.call(this, btnIndex);
        }
    };

    LocationParkingBag.prototype.activate = function (car_uid) {
        console.log('LocationParkingBag.prototype.activate');
        _super.prototype.activate.call(this);
        this.current_car_uid = car_uid;
        model_manager.sendParkingBagExchange(car_uid, this.parking_npc.npc_rec.node_hash);
    };

    //LocationParkingBag.prototype.get_self_info = function () {
    //    clientManager.sendParkingBagExchange();
    //};


    LocationParkingBag.prototype.set_buttons = function () {
        if (!locationManager.isActivePlace(this)) return;
        locationManager.setBtnState(3, '</br>Назад', true);
        locationManager.setBtnState(4, '</br>Выход', true);
    };

    LocationParkingBag.prototype.clear = function () {
        console.log('LocationParkingBag.prototype.clear');
        // Нельзя вызывать супер, так как очистится jq_main_div, а нам этого не нужно сейчас
        this.current_car_uid = null;
    };

    return LocationParkingBag;
})(LocationPlace);
