var LocationNucoilBuilding = (function (_super) {
    __extends(LocationNucoilBuilding, _super);

    function LocationNucoilBuilding(building_rec, jq_town_div) {
        //console.log('LocationNucoilBuilding', building_rec);
        this.jq_insurance_page = null;
        this.jq_actions_page = null;
        this.jq_spec_offer_page = null;
        _super.call(this, building_rec, jq_town_div);

        this.current_insurance = null;
    }

    LocationNucoilBuilding.prototype.addExtraPages = function (jq_center_menu, jq_center_pages) {
        _super.prototype.addExtraPages.call(this, jq_center_menu, jq_center_pages);
        //console.log('LocationNucoilBuilding.prototype.addExtraPages', this.building_rec);
        // Интерлэйсинг на автарки NPC
        //$('#building_nucoil').find('')

        // Добавление дополнительных функций в здание
        jq_center_menu.empty();
        jq_center_pages.empty();

        // Страница со страховками
        var page_id = 'buildingPageInsurance_' + this.building_rec.name;
        jq_center_menu.append('<div class="building-center-menu-item one-line" data-page_id="' + page_id + '">Страховка</div>');
        this.jq_insurance_page = $('<div id="' + page_id + '" class="building-center-page">');
        jq_center_pages.append(this.jq_insurance_page);

        var ins_list = this.building_rec.head.insurance_list;
        for (var i = 0; i < ins_list.length; i++) {
            var ins = ins_list[i];
            var jq_insurance = $('<div class="insurance-item-block town-interlacing" data-ins_node_hash="' + ins.node_hash + '"></div>');
            jq_insurance.css('background', 'transparent url("' + ins.icon_nukeoil + '") 100% 100% no-repeat');
            jq_insurance.append('<div class="insurance-item-price">' + ins.base_price + '</div>');
            this.jq_insurance_page.append(jq_insurance);
        }

        // Вешаем клики на страховки
        var jq_ins = this.jq_insurance_page.find('.insurance-item-block');
        jq_ins.click({building: this}, LocationNucoilBuilding.click_insurance);

        // Страница с акциями
        page_id = 'buildingPageActions_' + this.building_rec.name;
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
        if (this.active_central_page == 'buildingPageInsurance_nukeoil' && this.current_insurance) {
            locationManager.setBtnState(2, '', false);
            var enable_btn = this.current_insurance.base_price != 0 && this.current_insurance.base_price < user.example_agent.balance;
            if (user.example_agent.insurance.node_hash == this.current_insurance.node_hash)
                locationManager.setBtnState(1, '</br>Продлить', enable_btn);
            else
                locationManager.setBtnState(1, '</br>Оформить', enable_btn);

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

        if (this.current_insurance) {
            var ins_node_hash = this.current_insurance.node_hash;
            var html_text = "";
            if (ins_node_hash == "reg:///registry/items/quest_item/insurance/base")
                html_text = "Страховка Стандарт.<br>" +
                    "Компенсация при крушении: номинальной стоимости транспорта.<br>" +
                    "Респаун: Случайный город.";
            if (ins_node_hash == "reg:///registry/items/quest_item/insurance/premium")
                html_text = "Страховка Премиум<br>" +
                    "Компенсация при крушении: Восстановление транспорта с потерей всего содержимого багажника и установленного тюнинга.<br>" +
                    "Респаун: Последний посещенный город.";
            if (ins_node_hash == "reg:///registry/items/quest_item/insurance/shareholder")
                html_text = "Страховка VIP<br>" +
                    "Компенсация при крушении: Полное восстановление транспорта с потерей грузовых товаров из багажника.<br>" +
                    "Респаун: Город по выбору.";

            locationManager.panel_right.show({text: html_text}, 'description');
        }
        else
            locationManager.panel_right.show({build: this.building_rec}, 'building');
    };

    LocationNucoilBuilding.prototype.get_days = function(insurance){
        if (insurance.starttime && insurance.deadline) {
                var start_quest_date = new Date((insurance.starttime + insurance.deadline) * 1000);
                start_quest_date.setFullYear(start_quest_date.getFullYear() + 100);
                return "Действие: до " + start_quest_date.toLocaleString('ru');
            }
        else
            return "Действие: Бессрочно.";
    };

    LocationNucoilBuilding.prototype.set_header_text = function (html_text) {
        //console.log('LocationNucoilBuilding.prototype.set_header_text');
        if (!html_text) {
            html_text = "Добро пожаловать, " + user.login + "!<br>Официальная заправка Корпорации Нукойл предоставляет:" +
                "<ul><li>Автострахование: защитите свое имущество от происшествий на дорогах!</li>" +
                "<li>Топливная заправка.</li>" +
                "<li>Служба поддержки.</li></ul>";

            if (this.active_central_page == 'buildingPageInsurance_nukeoil' && this.current_insurance)
                if (this.current_insurance.node_hash == user.example_agent.insurance.node_hash)  // Если такая же страховка активна
                    html_text = "<br>Статус: Активна.<br>" + this.get_days(user.example_agent.insurance);
                else {
                    if (this.current_insurance.node_hash == "reg:///registry/items/quest_item/insurance/base")
                        html_text = "<br>Статус: Невозможно активировать во время действия другой страховки.";
                    if (this.current_insurance.node_hash == "reg:///registry/items/quest_item/insurance/premium")
                        html_text = "<br>Статус: неактивна.<br>Цена за 30 суток: " + this.current_insurance.base_price + " Nc";
                    if (this.current_insurance.node_hash == "reg:///registry/items/quest_item/insurance/shareholder")
                        html_text = "<br>Статус: неактивна.<br>Цена за 30 суток: " + this.current_insurance.base_price + " Nc";
                }
        }
        _super.prototype.set_header_text.call(this, html_text);
    };

    LocationNucoilBuilding.prototype.clickBtn = function (btnIndex) {
        //console.log('LocationNucoilBuilding.prototype.clickBtn', btnIndex);
        if (this.active_central_page == 'buildingPageInsurance_nukeoil') {
            if (btnIndex == '1') {
                // Продлевание или оформление страховки
                clientManager.sendInsuranceBuy(this.current_insurance.node_hash);
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

    LocationNucoilBuilding.prototype._get_insurance_by_node_hash = function(node_hash) {
        var ins_list = this.building_rec.head.insurance_list;
        for (var i = 0; i < ins_list.length; i++)
            if (ins_list[i].node_hash == node_hash)
                return ins_list[i];
        return null;
    };

    // Различные эвенты
    LocationNucoilBuilding.click_insurance = function (event) {
        var building = event.data.building;
        building.jq_insurance_page.find('.insurance-item-block').removeClass('selected');
        var target_ins = building._get_insurance_by_node_hash($(event.currentTarget).data('ins_node_hash'));
        if (target_ins && target_ins != building.current_insurance) {
            building.current_insurance = target_ins;
            $(event.currentTarget).addClass('selected');
        }
        else {
            building.current_insurance = null;
            $(event.currentTarget).removeClass('selected');
        }
        building.set_buttons();
        building.set_header_text();
        building.set_panels();
    };

    return LocationNucoilBuilding;
})(LocationPlaceBuilding);
