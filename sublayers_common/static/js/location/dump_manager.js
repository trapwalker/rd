var LocationDump = (function (_super) {
    __extends(LocationDump, _super);

    function LocationDump(jq_town_div) {
        //console.log('LocationDump');
        _super.call(this, jq_town_div.find('#townDumpWrap'), 'location_screen');

        this.jq_self_inv = this.jq_main_div.find('#townDumpSelfInventory');
        this.jq_dump_inv = this.jq_main_div.find('#townDumpInventory');
    }

    LocationDump.prototype.update = function () {
        //console.log('LocationDump.prototype.update');
        _super.prototype.update.call(this);

        // Отобразить свой инвентарь
        this.jq_self_inv.empty();
        this.jq_self_inv.append('<div class="town-dump-inventory-block inventory-' + user.ID + '"></div>');
        inventoryList.showInventory(user.ID, this.jq_self_inv.find('.town-dump-inventory-block'), true);

        // Отобразить свалку
        this.jq_dump_inv.empty();
        if (this.jq_dump_inv) {
            this.jq_dump_inv.append('<div class="town-dump-inventory-block inventory-' + locationManager.uid + '"></div>');
            inventoryList.showInventory(locationManager.uid, this.jq_dump_inv.find('.town-dump-inventory-block'), false);
        }
    };

    LocationDump.prototype.clickBtn = function (btnIndex) {
        //console.log('LocationDump.prototype.clickBtn', btnIndex);
        switch (btnIndex) {
            case '3':
                $('#layer2').css('display', 'block');
                $('#landscape').css('display', 'block');
                $('.building-back').css('display', 'none');
                this.jq_main_div.css('display', 'none');
                if (this.screen_name) // если для локации указан конкретный скрин, то записаться в него
                    locationManager.screens[this.screen_name] = null;
                else // если нет, то записаться в последний активный
                    locationManager.screens[locationManager.active_screen_name] = null;

                locationManager.setBtnState(1, '', false);
                locationManager.setBtnState(2, '', false);
                locationManager.setBtnState(3, '</br>Назад', false);
                locationManager.setBtnState(4, '</br>Выход', true);

                locationManager.panel_left.show({respect: Math.random() * 100}, 'building_quest');
                locationManager.panel_right.show({}, 'location');
                break;
            default:
                _super.prototype.clickBtn.call(this, btnIndex);
        }
    };

    LocationDump.prototype.activate = function () {
        //console.log('LocationParkingBag.prototype.activate', car_uid);
        _super.prototype.activate.call(this);
        $('#landscape').css('display', 'block');
    };

    LocationDump.prototype.set_buttons = function () {
        if (!locationManager.isActivePlace(this)) return;
        locationManager.setBtnState(1, '', false);
        locationManager.setBtnState(2, '', false);
        locationManager.setBtnState(3, '</br>Назад', true);
        locationManager.setBtnState(4, '</br>Выход', true);
    };

    LocationDump.prototype.set_panels = function() {
        if (!locationManager.isActivePlace(this)) return;
        _super.prototype.set_panels.call(this);
        locationManager.panel_right.show({text: ''}, 'description');
    };

    return LocationDump;
})(LocationPlace);