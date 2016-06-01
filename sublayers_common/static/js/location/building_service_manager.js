var LocationServiceBuilding = (function (_super) {
    __extends(LocationServiceBuilding, _super);

    function LocationServiceBuilding(building_rec, jq_town_div) {
        //console.log('LocationServiceBuilding', building_rec);
        _super.call(this, building_rec, jq_town_div);
    }

    LocationServiceBuilding.prototype.addExtraPages = function (jq_center_menu, jq_center_pages) {
        _super.prototype.addExtraPages.call(this, jq_center_menu, jq_center_pages);
        // Добавление дополнительных функций в здание
        var page_id = 'buildingPageRepair_' + this.building_rec.key;
        jq_center_menu.append('<div class="building-center-menu-item" data-page_id="' + page_id + '">Ремонт</div>');

        var jq_repair_page = $('<div id="' + page_id + '" class="building-center-page">');
        jq_repair_page.append('Отремонтировать ?!');
        jq_center_pages.append(jq_repair_page);
    };

    LocationServiceBuilding.prototype.centralMenuReaction = function (page_id) {
        _super.prototype.centralMenuReaction.call(this, page_id);
        this.set_buttons();
    };

    LocationServiceBuilding.prototype.set_buttons = function () {
        if (!locationManager.isActivePlace(this)) return;
        if (this.active_central_page == 'buildingPageRepair_autoservice') {
            locationManager.setBtnState(1, '</br>Ремонт', true);
            locationManager.setBtnState(2, 'Ремонт</br>всего', true);
        }
        else {
            locationManager.setBtnState(1, '', false);
            locationManager.setBtnState(2, '', false);
        }

        locationManager.setBtnState(3, '</br>Назад', true);
        locationManager.setBtnState(4, '</br>Выход', true);
    };

    LocationServiceBuilding.prototype.clickBtn = function (btnIndex) {
        //console.log('LocationServiceBuilding.prototype.clickBtn', btnIndex);
        if (this.active_central_page == 'buildingPageRepair_autoservice') {
            if (btnIndex == '1') {
                console.log('Попытка отремонтировать машину');
                return;
            }
            if (btnIndex == '2') {
                console.log('Попытка отремонтировать машину на 100%');
                clientManager.sendMechanicRepairApply(this.building_rec.build.head.node_hash,
                    user.example_car.max_hp - user.example_car.hp);
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

        _super.prototype.clickBtn.call(this, btnIndex);
    };

    return LocationServiceBuilding;
})(LocationPlaceBuilding);
