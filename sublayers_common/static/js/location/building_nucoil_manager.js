var LocationNucoilBuilding = (function (_super) {
    __extends(LocationNucoilBuilding, _super);

    function LocationNucoilBuilding(building_rec, jq_town_div) {
        //console.log('LocationNucoilBuilding', building_rec);
        this.jq_insurance_page = null;
        this.jq_actions_page = null;
        this.jq_spec_offer_page = null;
        _super.call(this, building_rec, jq_town_div);

        this.current_insurance_name = null;
    }

    LocationNucoilBuilding.prototype.addExtraPages = function (jq_center_menu, jq_center_pages) {
        _super.prototype.addExtraPages.call(this, jq_center_menu, jq_center_pages);

        // Интерлэйсинг на автарки NPC
        //$('#building_nucoil').find('')

        // Добавление дополнительных функций в здание
        jq_center_menu.empty();
        jq_center_pages.empty();

        // Страница со страховками
        var page_id = 'buildingPageInsurance_' + this.building_rec.key;
        jq_center_menu.append('<div class="building-center-menu-item one-line" data-page_id="' + page_id + '">Страховка</div>');
        this.jq_insurance_page = $('<div id="' + page_id + '" class="building-center-page">');
        jq_center_pages.append(this.jq_insurance_page);

        var ins_list = ['standart', 'premium', 'vip'];
        for (var i = 0; i < ins_list.length; i++){
            var ins_name = ins_list[i];
            var jq_insurance = $('<div class="insurance-item-block town-interlacing" data-ins_name="' + ins_name + '"></div>');
            jq_insurance.css('background', 'transparent url("/static/content/locations/institutions/nucoil/ins_' + ins_name + '.png") 100% 100% no-repeat');
            jq_insurance.append('<div class="insurance-item-price">15000</div>');
            this.jq_insurance_page.append(jq_insurance);
        }

        // Вешаем клики на страховки
        var jq_ins = this.jq_insurance_page.find('.insurance-item-block');
        jq_ins.click({building: this}, LocationNucoilBuilding.click_insurance);
        jq_ins.first().click();

        // Страница с акциями
        page_id = 'buildingPageActions_' + this.building_rec.key;
        jq_center_menu.append('<div class="building-center-menu-item one-line" data-page_id="' + page_id + '">Акции</div>');
        this.jq_actions_page = $('<div id="' + page_id + '" class="building-center-page">');
        jq_center_pages.append(this.jq_actions_page);

        // Страница со специальными предолжениями
        //page_id = 'buildingPageSpecOffer_' + this.building_rec.key;
        //jq_center_menu.append('<div class="building-center-menu-item" data-page_id="' + page_id + '">Специальные предложения</div>');
        //this.jq_spec_offer_page = $('<div id="' + page_id + '" class="building-center-page">');
        //jq_center_pages.append(this.jq_spec_offer_page);
    };

    LocationNucoilBuilding.prototype.centralMenuReaction = function (page_id) {
        _super.prototype.centralMenuReaction.call(this, page_id);
        this.set_buttons();
    };

    LocationNucoilBuilding.prototype.set_buttons = function () {
        if (!locationManager.isActivePlace(this)) return;
        if (this.active_central_page == 'buildingPageInsurance_nucoil') {
            locationManager.setBtnState(1, '</br>Оформить', true);
            locationManager.setBtnState(2, '</br>Продлить', true);
        }
        else {
            locationManager.setBtnState(1, '', false);
            locationManager.setBtnState(2, '', false);
        }
        locationManager.setBtnState(3, '</br>Назад', true);
        if (locationManager.location_cls == 'GasStation')
            locationManager.setBtnState(3, '</br>Назад', false);
        locationManager.setBtnState(4, '</br>Выход', true);
    };

    LocationNucoilBuilding.prototype.set_panels = function (make) {
        if (!make && !locationManager.isActivePlace(this)) return;
        locationManager.panel_left.show({}, 'nukeoil');
        locationManager.panel_right.show({build: this.building_rec.build}, 'building');
    };

    LocationNucoilBuilding.prototype.clickBtn = function (btnIndex) {
        //console.log('LocationNucoilBuilding.prototype.clickBtn', btnIndex);
        if (this.active_central_page == 'buildingPageRepair_autoservice') {
            if (btnIndex == '1') {
                return;
            }
            if (btnIndex == '2') {
                return;
            }
        } else {
            if (btnIndex == '1') {
                return;
            }
            if (btnIndex == '2') {
                return;
            }
        }

        if ((btnIndex == '3') && (locationManager.location_cls == 'GasStation'))
            return;

        _super.prototype.clickBtn.call(this, btnIndex);
    };

    // Различные эвенты
    LocationNucoilBuilding.click_insurance = function (event) {
        var building = event.data.building;
        building.jq_insurance_page.find('.insurance-item-block').removeClass('selected');
        $(event.currentTarget).addClass('selected');
        building.current_insurance_name = $(event.currentTarget).data('ins_name');
    };

    return LocationNucoilBuilding;
})(LocationPlaceBuilding);
