var LocationArmorerNPC = (function (_super) {
    __extends(LocationArmorerNPC, _super);

    function LocationArmorerNPC(npc_rec, jq_town_div, building_name) {
        //console.log('LocationPlaceNPC', npc_rec);
        _super.call(this, npc_rec, jq_town_div, building_name);


        this.items = {};
        this.inv_show_div = null;
        this.armorer_slots = [];
        this.armorer_slots_flags = {};
        this.active_slot = null;
        this.image_scale = null;


        this.jq_car_view = this.jq_main_div.find('.armorer-car').first();
        this.jq_sectors_sclot_name = this.jq_main_div.find('.armorerSectors-slotName').first();
        this.jq_sectors_view = this.jq_main_div.find('.armorerSectors-svg').first();

        this.update();
    }

    LocationArmorerNPC.prototype.get_self_info = function () {
        //console.log('LocationArmorerNPC.prototype.get_self_info')
    };

    LocationArmorerNPC.prototype.set_buttons = function () {
        //if (user.example_car) {
        //    locationManager.setBtnState(1, '</br>Сменить ТС', true);
        //    locationManager.setBtnState(2, 'Поставить</br>ТС', true);
        //}
        //else {
        //    locationManager.setBtnState(1, '</br>Взять ТС', true);
        //    locationManager.setBtnState(2, '', false);
        //}
        locationManager.setBtnState(3, '</br>Назад', true);
        locationManager.setBtnState(4, '</br>Выход', true);
    };

    LocationArmorerNPC.prototype.update = function(data) {
        console.log('LocationArmorerNPC.prototype.update', data);
        _super.prototype.update.call(this, data); // Обновятся кнопки и панели

        if (! user.example_car) return;

        this.jq_car_view.empty();
        this.jq_sectors_sclot_name.empty();
        this.jq_sectors_view.empty();

        this.jq_car_view.append(user.templates.html_armorer_car);
        this.jq_sectors_view.append(user.templates.armorer_sectors_svg);

        this.armorer_slots = ['slot_BC', 'slot_CC', 'slot_FC'];
        // Вешаем события на слоты (проход по именам слотов)
        for (var slot_index = 0; slot_index < this.armorer_slots.length; slot_index++) {
            var slot_name = this.armorer_slots[slot_index];

            //slot_name = 'slot_BC';

            var jq_slot_top = $("#top_" + slot_name);
            var jq_slot_side = $("#side_" + slot_name);

            // События
            jq_slot_top.mouseenter({slot_name: slot_name}, LocationArmorerNPC.slot_event_mouseenter);
            jq_slot_side.mouseenter({slot_name: slot_name}, LocationArmorerNPC.slot_event_mouseenter);

            jq_slot_top.mouseleave({slot_name: slot_name}, LocationArmorerNPC.slot_event_mouseleave);
            jq_slot_side.mouseleave({slot_name: slot_name}, LocationArmorerNPC.slot_event_mouseleave);

            jq_slot_top.click({slot_name: slot_name, armorer: this}, LocationArmorerNPC.slot_event_click);
            jq_slot_side.click({slot_name: slot_name, armorer: this}, LocationArmorerNPC.slot_event_click);
        }

        // Вешаем события на сектора
        var sectos_named = ['F', 'B', 'L', 'R'];
        for (var sector_name_index = 0; sector_name_index < sectos_named.length; sector_name_index ++) {
            var sector_name = 'sector_' + sectos_named[sector_name_index];
            var jq_sector = $('#' + sector_name);
            jq_sector.mouseenter({sector_name: sector_name}, LocationArmorerNPC.sector_event_mouseenter);
            jq_sector.mouseleave({sector_name: sector_name}, LocationArmorerNPC.sector_event_mouseleave);
            jq_sector.click({sector_name: sector_name, armorer: this}, LocationArmorerNPC.sector_event_click);
        }

    };

    LocationArmorerNPC.prototype.clickBtn = function (btnIndex) {
        //console.log('LocationHangarNPC.prototype.clickBtn', btnIndex);
        switch (btnIndex) {
            case '1':
                //clientManager.sendParkingSelect(this);
                break;
            case '2':
                //if (user.example_car)
                //    clientManager.sendParkingLeave(this);
                break;
            default:
                _super.prototype.clickBtn.call(this, btnIndex);
        }
    };


    LocationArmorerNPC.prototype.activeSlot = function(slot_name) {
        //console.log('ArmorerManager.prototype.setActiveSlot');
        //if (!window.hasOwnProperty('dropSectorActive') || !window.hasOwnProperty('dropSlotActive')) return;

        // Гасим все лепестки виджета и все слоты
        LocationArmorerNPC.dropSectorActive();
        LocationArmorerNPC.dropSlotActive(this);

        // Устанавливаем новый активный слот и пытаемся получить соостветствующий итем
        if (this.active_slot == slot_name) this.active_slot = null;
        else this.active_slot = slot_name;
        //this.setEnableSector();
        if (!this.items.hasOwnProperty(this.active_slot)) return;
        var item_rec = this.items[this.active_slot];

        // Подсвечиваем слот и если есть экземпляр то устанавливаем текущее направление
        LocationArmorerNPC.setSlotActive(this.active_slot);
        if (item_rec.example)
            LocationArmorerNPC.setSectorActive(item_rec.direction);
    };

    LocationArmorerNPC.prototype.setEnableSector = function() {
        //console.log('ArmorerManager.prototype.setEnableSector');
        LocationArmorerNPC.addClassSVG($("#sector_F"), 'car_sector_disable');
        LocationArmorerNPC.addClassSVG($("#sector_B"), 'car_sector_disable');
        LocationArmorerNPC.addClassSVG($("#sector_L"), 'car_sector_disable');
        LocationArmorerNPC.addClassSVG($("#sector_R"), 'car_sector_disable');
        if (this.active_slot && this.armorer_slots_flags)
            for(var i = 0; i < this.armorer_slots_flags[this.active_slot].length; i++){
                var ch = this.armorer_slots_flags[this.active_slot][i];
                LocationArmorerNPC.removeClassSVG($("#sector_" + ch), 'car_sector_disable');
            }
    };

    LocationArmorerNPC.prototype.setActiveSector = function(sectorName) {
        //console.log('ArmorerManager.prototype.setActiveSector');
        // Получаем активный слот и соостветствующий итем
        if (! this.items.hasOwnProperty(this.active_slot)) return;
        var item_rec = this.items[this.active_slot];
        // Устанавливаем новое направление
        item_rec.direction = sectorName;
        this.items[this.active_slot] = item_rec;

        // Гасим все лепестки виджета и если есть экземпляр то устанавливаем текущее направление
        LocationArmorerNPC.dropSectorActive();
        if (item_rec.example) {
            LocationArmorerNPC.setSectorActive(item_rec.direction);
            //this.reDrawItem(this.active_slot);
        }
    };

    // Классовые методы !!!! Без прототипов, чтобы было удобнее вызывать!

    // Подсветка слотов при наведении указателя мыши
    LocationArmorerNPC.setSlotOpacity = function(slot_name, hover) {
        if (hover) {
            $("#top_" + slot_name).addClass("armorer-slot-hover");
            $("#side_" + slot_name).addClass("armorer-slot-hover");
        }
        else {
            $("#top_" + slot_name).removeClass("armorer-slot-hover");
            $("#side_" + slot_name).removeClass("armorer-slot-hover");
        }
    };

    LocationArmorerNPC.dropSlotActive = function(armorer) {
        if (armorer && armorer.hasOwnProperty('jq_main_div')) {
            armorer.jq_main_div.find('.armorer-slot').removeClass("armorer-slot-active");
        }
        else {
            $('.armorer-slot').removeClass("armorer-slot-active");
        }
    };

    LocationArmorerNPC.setSlotActive = function(slot_name) {
        $("#top_" + slot_name).addClass("armorer-slot-active");
        $("#side_" + slot_name).addClass("armorer-slot-active");
    };

    LocationArmorerNPC.addClassSVG = function (obj, cls) {
        var oldClass = obj.attr('class');
        if (!oldClass) oldClass = cls;
        oldClass= oldClass.toString();
        if (oldClass.indexOf(cls) == -1) oldClass += ' ' + cls;
        obj.attr('class', oldClass);
    };

    LocationArmorerNPC.removeClassSVG = function (obj, cls) {
        var oldClass = obj.attr('class');
        if (!oldClass) return;
        oldClass = oldClass.toString();
        oldClass = oldClass.replace(cls, '');
        obj.attr('class', oldClass);
    };

    LocationArmorerNPC.dropSectorActive = function () {
        LocationArmorerNPC.removeClassSVG($("#sector_F"), 'car_sector_active');
        LocationArmorerNPC.removeClassSVG($("#sector_B"), 'car_sector_active');
        LocationArmorerNPC.removeClassSVG($("#sector_L"), 'car_sector_active');
        LocationArmorerNPC.removeClassSVG($("#sector_R"), 'car_sector_active');
    };

    LocationArmorerNPC.setSectorActive = function (sectorName) {
        LocationArmorerNPC.addClassSVG($("#sector_" + sectorName), 'car_sector_active');
    };

    // Обработка слотовых событий
    LocationArmorerNPC.slot_event_mouseenter = function (event) {
        LocationArmorerNPC.setSlotOpacity(event.data.slot_name, true);
    };

    LocationArmorerNPC.slot_event_mouseleave = function (event) {
        LocationArmorerNPC.setSlotOpacity(event.data.slot_name, false);
    };

    LocationArmorerNPC.slot_event_click = function (event) {
        event.data.armorer.activeSlot(event.data.slot_name);
    };


    LocationArmorerNPC.sector_event_mouseenter = function (event) {
        LocationArmorerNPC.addClassSVG($("#sector_" + event.data.sector_name), 'car_sector_hover');
    };

    LocationArmorerNPC.sector_event_mouseleave = function (event) {
        LocationArmorerNPC.removeClassSVG($("#sector_" + event.data.sector_name), 'car_sector_hover');
    };

    LocationArmorerNPC.sector_event_click = function (event) {
        console.log('LocationArmorerNPC.sector_event_click');
        event.data.armorer.setActiveSector(event.data.sector_name);
    };

    return LocationArmorerNPC;
})(LocationPlaceNPC);
