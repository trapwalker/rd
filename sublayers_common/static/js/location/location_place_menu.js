var LocationPlaceMenu = (function (_super) {
    __extends(LocationPlaceMenu, _super);

    function LocationPlaceMenu(jq_town_div) {
        //console.log('LocationPlaceMenu', jq_town_div);
        _super.call(this, $('#townMenuLocation'), 'menu_screen');
        locationManager.screens['menu_screen'] = this;

        this.selected_page_name = null;

        this.selected_car_inv_item = null;
        this.jq_car_inventory = this.jq_main_div.find('.location-inventory-block').first();
        this.jq_car_inventory.addClass('inventory-' + user.ID);
        this.car_inventory = null;

        this.timer_auto_save_about_self = null;

        this.init_click();
        this.update();
    }

    LocationPlaceMenu.prototype.activate = function () {
        //console.log('LocationPlaceMenu.prototype.activate', this.jq_main_div);
        _super.prototype.activate.call(this);
        $('#landscape').css('display', 'block');
    };

    LocationPlaceMenu.prototype.init_click = function () {
        //console.log('LocationPlaceMenu.prototype.init_click', this.jq_main_div);
        var self = this;
        this.jq_main_div.find('.menu-header-item').click({location: this}, LocationPlaceMenu.menu_buttons_reaction);
        this.jq_main_div.find('.menu-header-item').first().click();

        // Инициализация кликов на фильтры инвентаря
        this.jq_main_div.find('.location-inventory-filters-item').click({npc: this}, function (event) {
            //console.log('.menu-header-item.click - reaction', $(this).data('page_id'), );
            var jq_filter = $(event.currentTarget);
            event.data.npc.jq_main_div.find('.location-inventory-filters-item').removeClass('active');
            jq_filter.addClass('active');
            if (!event.data.npc.car_inventory) return;
            var filter =jq_filter.data('filter');
            event.data.npc.car_inventory.showInvByFilter(event.data.npc.jq_car_inventory, filter)
        });

        // Инициализация для журнала
        this.jq_main_div.find('.journal-page-button-block').click(function () {
            self.jq_main_div.find('.journal-page-button-block').removeClass('active');
            $(this).addClass('active');
            self.jq_main_div.find('.journal-page-block').css('display', 'none');
            self.jq_main_div.find('#' + $(this).data('page_id')).css('display', 'block');
        });
        this.jq_main_div.find('.journal-page-button-block').first().click();

        location.timer_auto_save_about_self = null;
        this.jq_main_div.find('textarea').first().on('change keyup paste', {location: this}, function(event) {
            // Поставить таймер на 3 секунды, если он сработает, то сохранить значение
            var location = event.data.location;
            if (location.timer_auto_save_about_self) {
                clearTimeout(location.timer_auto_save_about_self);
                location.timer_auto_save_about_self = null;
            }

            location.timer_auto_save_about_self = setTimeout(function() {
                location.timer_auto_save_about_self = null;
                location.save_pers_about_self();
            }, 3000);
        })
    };

    LocationPlaceMenu.prototype.on_exit = function () {
        //console.log('LocationPlaceMenu.prototype.on_exit');
        if (this.timer_auto_save_about_self) {
            clearTimeout(this.timer_auto_save_about_self);
            this.timer_auto_save_about_self = null;
        }
        this.save_pers_about_self();
    };

    LocationPlaceMenu.prototype.save_pers_about_self = function() {
        var new_text = this.jq_main_div.find('textarea').first().val();
        if (user.example_agent.about_self != new_text)
            clientManager.sendSetAboutSelf(new_text);
    };

    LocationPlaceMenu.prototype.select_page = function (page_id) {
        //console.log('LocationPlaceMenu.prototype.init_click', this.jq_main_div);
        this.selected_page_name = page_id;
        this.set_buttons();

        // Обновление менеджера обучения
        teachingManager.redraw();
    };

    LocationPlaceMenu.prototype.set_buttons = function () {
        if (!locationManager.isActivePlace(this)) return;
        var item = this.selected_car_inv_item;

        locationManager.setBtnState(3, '</br>Назад', false);

        locationManager.setBtnState(1, '', false);
        locationManager.setBtnState(2, '', false);
        if (this.selected_page_name == 'Inventory') {
            if (item) {
                if (item.example.activate_type == 'self' && !item.hasTag('ammo')) {
                    locationManager.setBtnState(1, '</br>Активировать', true);
                }
                else {
                    locationManager.setBtnState(1, '</br>Активировать', false);
                }
            } else {
                locationManager.setBtnState(1, '', false);
            }
        }

        if (this.selected_page_name == 'Settings') settingsManager.btn_set_enable_disable();


        locationManager.setBtnState(4, '</br>Выход', true);
    };

    LocationPlaceMenu.prototype.set_panels = function () {
        if (!locationManager.isActivePlace(this)) return;
        _super.prototype.set_panels.call(this);
        this.clearRightPanel();
    };

    LocationPlaceMenu.prototype.clickBtn = function (btnIndex) {
        //console.log('LocationManager.prototype.clickBtn', btnIndex);
        if (this.selected_page_name == "Settings") {
            if (btnIndex == 1) {settingsManager.apply_options(); settingsManager.btn_set_enable_disable();}
            if (btnIndex == 2) {settingsManager.cancel_options(); settingsManager.btn_set_enable_disable();}
            if (btnIndex == 3) {settingsManager.default_options(); settingsManager.btn_set_enable_disable();}
        }

        if (btnIndex == 4)  // Попытка выйти из города
            locationManager.clickBtn(btnIndex);
    };

    LocationPlaceMenu.prototype.updateInventory = function () {
        this.jq_car_inventory.empty();
        this.jq_main_div.find('.location-inventory-filters-item').removeClass('active');
        this.jq_main_div.find('.location-inventory-filters-item').first().addClass('active');

        this.car_inventory = inventoryList.getInventory(user.ID);
        if (!this.car_inventory) return;

        this.car_inventory.showInventory(this.jq_car_inventory);
    };

    LocationPlaceMenu.prototype.update = function (data) {
        //console.log('LocationPlaceMenu.prototype.update', this.jq_main_div);

        // Вкладка Персонаж
        characterManager.redraw(this.jq_main_div);
        characterManager.jq_main_div.find('.character-window-ttx-center.perks').find('.character-window-ttx-item')
            .mouseenter({npc: this}, LocationPlaceMenu.perks_event_mouseenter)
            .mouseleave({npc: this}, LocationPlaceMenu.event_mouseleave);
        characterManager.jq_main_div.find('.character-window-ttx-center.skills').find('.character-window-ttx-item')
            .mouseenter({npc: this}, LocationPlaceMenu.skills_event_mouseenter)
            .mouseleave({npc: this}, LocationPlaceMenu.event_mouseleave);
        characterManager.jq_main_div.find('.character-window-page.pers_inventory').find('.mainCarInfoWindow-body-trunk-body-right-item-wrap')
            .mouseenter({npc: this}, LocationPlaceMenu.quest_item_event_mouseenter)
            .mouseleave({npc: this}, LocationPlaceMenu.event_mouseleave);
        characterManager.jq_main_div.find('.character-window-page.pers_effects').find('.character-effect-block')
            .mouseenter({npc: this}, LocationPlaceMenu.agent_effect_event_mouseenter)
            .mouseleave({npc: this}, LocationPlaceMenu.event_mouseleave);

        // Вкладка Автомобиль
        carManager.redraw(this.jq_main_div);

        // Обновление журнала
        journalManager.redraw(this.jq_main_div);

        // Отображение инвентаря
        this.updateInventory();

        // Вкладка Пати
        partyManager.redraw(this.jq_main_div);

        // Вкладка Настройки
        settingsManager.redraw(this.jq_main_div);

        _super.prototype.update.call(this, data);
    };

    LocationPlaceMenu.prototype.viewRightPanel = function(description) {
        //console.log('LocationArmorerNPC.prototype.viewRightPanel', slot_name);
        locationManager.panel_right.show({text: description }, 'description');
    };

    LocationPlaceMenu.prototype.clearRightPanel = function() {
        //console.log('LocationArmorerNPC.prototype.clearRightPanel');
        locationManager.panel_right.show({text: ''}, 'description');
    };

    LocationPlaceMenu.prototype.select_inv_item = function(item, jq_selected_div) {
        //console.log('LocationPlaceMenu.prototype.select_inv_item', item, jq_selected_div);
        if (this.selected_car_inv_item == item) {
            this.selected_car_inv_item = null;
            jq_selected_div.removeClass('selected');
        }
        else {
            this.jq_car_inventory.find('.npcInventory-itemWrap').removeClass('selected');
            jq_selected_div.addClass('selected');
            this.selected_car_inv_item = item;
        }

        this.set_buttons();
    };

    LocationPlaceMenu.event_mouseleave = function (event) {
        //console.log('LocationPlaceMenu.event_mouseleave');
        event.data.npc.clearRightPanel();
    };

    LocationPlaceMenu.inventory_slot_event_click = function (event) {
        //console.log('LocationPlaceMenu.inventory_slot_event_click', event);
        event.data.npc.select_inv_item(event.data.item, $(event.currentTarget));
    };

    LocationPlaceMenu.perks_event_mouseenter = function (event) {
        //console.log('LocationPlaceMenu.perks_event_mouseenter');
        var perc_rec = user.example_agent.rpg_info.perks[$(event.currentTarget).data('index')];
        if(! perc_rec) return;
        event.data.npc.viewRightPanel(perc_rec.perk.description);
    };

    LocationPlaceMenu.skills_event_mouseenter = function (event) {
        //console.log('LocationPlaceMenu.skills_event_mouseenter');
        var skill_name = $(event.currentTarget).data('skill');
        if(! skill_name) return;
        event.data.npc.viewRightPanel(user.example_agent.rpg_info[skill_name].description);
    };

    LocationPlaceMenu.quest_item_event_mouseenter = function (event) {
        var index = $(event.currentTarget).data('index');
        if (user.example_agent.rpg_info.quest_inventory.length > index)
            event.data.npc.viewRightPanel(user.example_agent.rpg_info.quest_inventory[index].description);
    };

    LocationPlaceMenu.agent_effect_event_mouseenter = function (event) {
        var index = $(event.currentTarget).data('index');
        if (user.example_agent.rpg_info.agent_effects.length > index)
            event.data.npc.viewRightPanel(user.example_agent.rpg_info.agent_effects[index].description);
    };


    LocationPlaceMenu.menu_buttons_reaction = function (event) {
        //console.log('.menu-header-item.click - reaction', $(this).data('page_id'));
        var location = event.data.location;
        var page_id = $(this).data('page_id');
        location.jq_main_div.find('.menu-header-item').removeClass('active');
        location.jq_main_div.find('.menu-item').css('display', 'none');
        $(this).addClass('active');
        location.jq_main_div.find('#locationMenuItem_' + page_id).css('display', 'block');
        location.select_page(page_id);

        if (page_id == "Settings")
            settingsManager.activate_in_city();
        else
            locationManager.panel_right.show({text: ''}, 'description');
    };

    return LocationPlaceMenu;
})(LocationPlace);

