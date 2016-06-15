var LocationGirlNPC = (function (_super) {
    __extends(LocationGirlNPC, _super);

    function LocationGirlNPC(npc_rec, jq_town_div, building_name) {
        _super.call(this, npc_rec, jq_town_div, building_name);
        this.update();
    }

    LocationGirlNPC.prototype.get_self_info = function () {
        //console.log('LocationGirlNPC.prototype.get_self_info');
    };

    LocationGirlNPC.prototype.update = function () {
        var self = this;
        this.jq_main_div.find('.girl-center-menu-item').click(function () {
            var page_cls = $(this).data('page_cls');
            self.jq_main_div.find('.girl-center-menu-item').removeClass('active');
            $(this).addClass('active');
            self.jq_main_div.find('.girl-center-page').css('display', 'none');
            self.jq_main_div.find('.' + page_cls).css('display', 'block');
        });
        this.jq_main_div.find('.girl-center-menu-item').first().click();
    };

    LocationGirlNPC.prototype.set_buttons = function () {
        if (!locationManager.isActivePlace(this)) return;
        locationManager.setBtnState(1, 'Подтвердить</br>сделку', true);
        locationManager.setBtnState(2, '</br>Отмена', true);
        locationManager.setBtnState(3, '</br>Назад', true);
        locationManager.setBtnState(4, '</br>Выход', true);
    };

    LocationGirlNPC.prototype.set_panels = function() {
        if (!locationManager.isActivePlace(this)) return;
        _super.prototype.set_panels.call(this);
        locationManager.panel_left.show({transactions: this.transactions}, 'npc_transaction_info');
        locationManager.panel_right.show({text: '' }, 'description');
    };

    LocationGirlNPC.prototype.clickBtn = function (btnIndex) {
        switch (btnIndex) {
            case '1':
                this.apply();
                break;
            case '2':
                this.cancel();
                break;
            default:
                _super.prototype.clickBtn.call(this, btnIndex);
        }
    };

    return LocationGirlNPC;
})(LocationPlaceNPC);