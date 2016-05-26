var location_armorer_draggable_click = {
    x: 0,
    y: 0,
    pos_x: 0,
    pos_y: 0
};

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
        this.jq_sectors_slot_name = this.jq_main_div.find('.armorerSectors-slotName').first();
        this.jq_sectors_view = this.jq_main_div.find('.armorerSectors-svg').first();

        this.update();
    }

    LocationArmorerNPC.prototype.get_self_info = function () {
        //console.log('LocationArmorerNPC.prototype.get_self_info')
    };

    LocationArmorerNPC.prototype.set_buttons = function () {
        if (user.example_car) {
            locationManager.setBtnState(1, '</br>Установить', true);
            locationManager.setBtnState(2, '</br>Отмена', true);
        }
        else {
            locationManager.setBtnState(1, '', false);
            locationManager.setBtnState(2, '', false);
        }
        locationManager.setBtnState(3, '</br>Назад', true);
        locationManager.setBtnState(4, '</br>Выход', true);
    };

    LocationArmorerNPC.prototype._addEmptyInventorySlot = function(position) {
        var self = this;
        var itemWrapDiv = $('<div class="npcInventory-itemWrap armorer-itemWrap-' + position +
                            '" data-pos="' + position + '"></div>');

        itemWrapDiv.droppable({
            greedy: true,
            accept: function (target) {
                var pos = $(this).position();
                pos.right = pos.left + $(this).width();
                pos.bottom = pos.top + $(this).height();
                var parent_width = $(this).parent().parent().width();
                var parent_height = $(this).parent().parent().height();
                //console.log(pos, parent_height, parent_width);
                return !((pos.bottom <= 0) || (pos.top >= parent_height) || (pos.left >= parent_width) || (pos.right <= 0))
            },
            drop: function(event, ui) {
                var dragPos = ui.draggable.data('pos');
                var dropPos = $(event.target).data('pos');
                self.changeItem(dragPos, dropPos);
            }
        });
        this.inv_show_div.append(itemWrapDiv);
    };

    LocationArmorerNPC.prototype._update_armorer_slots_flags = function(armorer_slots_flags) {
        this.armorer_slots_flags = {};
        for (var i = 0; i < armorer_slots_flags.length; i++) {
            var sl_flag = armorer_slots_flags[i];
            this.armorer_slots_flags[sl_flag.name.slice(0, -2)] = sl_flag.value;
        }
    };

    LocationArmorerNPC.prototype.exportSlotState = function() {
        var result = {};
        for (var slot_name in this.items)
            if (this.items.hasOwnProperty(slot_name) && (slot_name.toString().indexOf('slot') >= 0))
                result[slot_name] = this.items[slot_name];
        return result;
    };

    LocationArmorerNPC.prototype.clear_user_info = function() {
        //console.log('LocationArmorerNPC.prototype.clear_user_info');
        // todo: написать тут чтото
        this.activeSlot(null);
        this.items = {};

        if (this.inv_show_div)
            this.inv_show_div.empty();
    };

    LocationArmorerNPC.prototype.update = function(data) {
        //console.log('LocationArmorerNPC.prototype.update', data);
        _super.prototype.update.call(this, data); // Обновятся кнопки и панели
        if (! user.example_car || !user.car_npc_info) return;
        var self = this;
        this.clear_user_info();
        this.armorer_slots = user.car_npc_info.armorer_slots;
        if (user.car_npc_info.armorer_slots_flags) this._update_armorer_slots_flags(user.car_npc_info.armorer_slots_flags);
        this.image_scale = user.example_car.image_scale;

        this.jq_car_view.empty();
        this.jq_sectors_slot_name.empty();
        this.jq_sectors_view.empty();

        this.jq_car_view.append(user.templates.html_armorer_car);
        this.jq_sectors_view.append(user.templates.armorer_sectors_svg);


        // Вешаем события на слоты (проход по именам слотов)
        for (var slot_index = 0; slot_index < this.armorer_slots.length; slot_index++) {
            var slot_name = this.armorer_slots[slot_index].name;

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
            jq_sector.mouseenter({sector_name: sectos_named[sector_name_index]}, LocationArmorerNPC.sector_event_mouseenter);
            jq_sector.mouseleave({sector_name: sectos_named[sector_name_index]}, LocationArmorerNPC.sector_event_mouseleave);
            jq_sector.click({sector_name: sectos_named[sector_name_index], armorer: this}, LocationArmorerNPC.sector_event_click);
        }

        // Старый апдейт

        // Проверить если город
        this.inv_show_div = this.jq_main_div.find('.npcInventory-inventory').first();
        if (this.inv_show_div.length == 0) { console.warn('Div инвентаря не найден'); return; }

        // Добавить итемы инвентаря своего агента
        var inventory = inventoryList.getInventory(user.ID);
        if (! inventory) {console.warn('Ивентарь агента (' + user.ID + ') не найден'); return; }

        for (var i = 0; i < inventory.max_size; i++) {
            var item_rec = {
                example: null,
                position: null,
                direction: ''
            };
            item = inventory.getItem(i);
            item_rec.position = i;
            if (item) {
                if (item.hasTag('armorer')) {  // фильтрация итема
                    this._addEmptyInventorySlot(i);
                    item_rec.example = item.example;
                    this.items[i] = item_rec;
                }
            }
            else {
                this._addEmptyInventorySlot(i);
                item_rec.example = null;
                this.items[i] = item_rec;
            }
        }

        this.resizeInventory(this.inv_show_div);

        // Добавить итемы слотов
        for (var i = 0; i < this.armorer_slots.length; i++) {
            var direction = '';
            if (this.armorer_slots[i].value)
                direction = this.armorer_slots[i].value.direction;
            var item_rec = {
                example: this.armorer_slots[i].value,
                position: this.armorer_slots[i].name,
                direction: direction
            };
            this.items[item_rec.position] = item_rec;
            $('#top_' + item_rec.position).data('pos', item_rec.position);
            $('#side_' + item_rec.position).data('pos', item_rec.position);
        }

        // Повесить дропабле на все слоты
        this.jq_main_div.find('.armorer-slot').droppable({
            greedy: true,
            drop: function(event, ui) {
                var dragPos = ui.draggable.data('pos');
                var dropPos = $(event.target).data('pos');
                self.changeItem(dragPos, dropPos);
            }
        });

        // Отрисовать верстку
        for (var key in this.items)
            if (this.items.hasOwnProperty(key))
                this.reDrawItem(key);


    };

    LocationArmorerNPC.prototype.clickBtn = function (btnIndex) {
        //console.log('LocationHangarNPC.prototype.clickBtn', btnIndex);
        switch (btnIndex) {
            case '1':
                if (user.example_car)
                    clientManager.sendArmorerApply(this);
                break;
            case '2':
                if (user.example_car) {
                    this.clear_user_info();
                    this.update();
                }
                break;
            default:
                _super.prototype.clickBtn.call(this, btnIndex);
        }
    };

    LocationArmorerNPC.prototype.reDrawItem = function(position) {
        //console.log('LocationArmorerNPC.prototype.reDrawItem');
        if (position.toString().indexOf('slot') >= 0) {
            // Позиция в слотах
            var top_slot = $('#top_' + position);
            var side_slot = $('#side_' + position);

            // Очистить слоты
            top_slot.empty();
            side_slot.empty();

            // создать вёрстку для отрисовки
            var item = this.items[position];
            if (item.example && this.image_scale) {
                var item_image_scale = item.example.armorer_images[this.image_scale];

                var itemImgTop = item_image_scale['armorer_top_' + item.direction];
                var itemImgSide = item_image_scale['armorer_side_' + item.direction];

                var itemDivTop = $('<div class="armorer-car-slot-picture" data-pos="' + position +'">' +
                        '<img id="armorer' + position + 'ImgTop" src="' + itemImgTop + '" class="' + 'armorer_top_'  + item.direction + '">' +
                    '</div>');
                var itemDivSide = $('<div class="armorer-car-slot-picture" data-pos="' + position +'">' +
                        '<img id="armorer' + position + 'ImgSide" src="' + itemImgSide+ '" class="' + 'armorer_side_'  + item.direction + '">' +
                    '</div>');

                //itemDivTop.data('pos', position);
                //itemDivSide.data('pos', position);

                itemDivTop.draggable({
                    helper: function() { return $('<img src="' + item.example.inv_icon_small + '">') },
                    cursorAt: { left: 31, top: 16 },
                    opacity: 0.8,
                    revert: true,
                    revertDuration: 0,
                    zIndex: 1,
                    appendTo: '#location-content',
                    start: function(event, ui) {
                        $('#armorer' + $(this).data('pos') + 'ImgTop').css('display', 'none');
                        $('#armorer' + $(this).data('pos') + 'ImgSide').css('display', 'none');

                        var pos = event.target.getBoundingClientRect();
                        //location_armorer_draggable_click.x = event.clientX;
                        //location_armorer_draggable_click.y = event.clientY;
                        location_armorer_draggable_click.x = pos.left + pos.width / 4.;
                        location_armorer_draggable_click.y = pos.top + pos.height / 4.;
                    },
                    stop: function(event, ui) {
                        $('#armorer' + $(this).data('pos') + 'ImgTop').css('display', 'block');
                        $('#armorer' + $(this).data('pos') + 'ImgSide').css('display', 'block');
                    },
                    drag: LocationArmorerNPC.drag_handler
                });
                itemDivSide.draggable({
                    helper: function() { return $('<img src="' + item.example.inv_icon_small + '">') },
                    cursorAt: { left: 31, top: 16 },
                    opacity: 0.8,
                    revert: true,
                    revertDuration: 0,
                    zIndex: 1,
                    appendTo: '#location-content',
                    start: function(event, ui) {
                        $('#armorer' + $(this).data('pos') + 'ImgTop').css('display', 'none');
                        $('#armorer' + $(this).data('pos') + 'ImgSide').css('display', 'none');

                        var pos = event.target.getBoundingClientRect();
                        //location_armorer_draggable_click.x = event.clientX;
                        //location_armorer_draggable_click.y = event.clientY;
                        location_armorer_draggable_click.x = pos.left + pos.width / 4.;
                        location_armorer_draggable_click.y = pos.top + pos.height / 4.;
                    },
                    stop: function(event, ui) {
                        $('#armorer' + $(this).data('pos') + 'ImgTop').css('display', 'block');
                        $('#armorer' + $(this).data('pos') + 'ImgSide').css('display', 'block');
                    },
                    drag: LocationArmorerNPC.drag_handler
                });

                top_slot.append(itemDivTop);
                side_slot.append(itemDivSide);
            }
        }
        else {
            // Позиция в инвентаре
            var itemWrapDiv = this.inv_show_div.find('.armorer-itemWrap-' + position).first();
            itemWrapDiv.empty();

            var itemDiv = $('<div class="npcInventory-item" data-pos="' + position + '"></div>');
            var emptyItemDiv = '<div class="npcInventory-pictureWrap"><div class="npcInventory-picture"></div></div>' +
                '<div class="npcInventory-name">Пусто</div>';
            itemDiv.append(emptyItemDiv);
            var item = this.items[position];
            if (item.example) {
                itemDiv.find('.npcInventory-name').text(item.example.title);
                itemDiv.find('.npcInventory-picture')
                    .css('background', 'transparent url(' + item.example.inv_icon_small + ') no-repeat 100% 100%');
                itemDiv.draggable({
                    helper: function() { return $('<img src="' + item.example.inv_icon_small + '">') },
                    cursorAt: { left: 31, top: 16 },
                    opacity: 0.8,
                    revert: true,
                    revertDuration: 0,
                    zIndex: 1,
                    appendTo: '#location-content',
                    start: function(event, ui) {
                        var pos = event.target.getBoundingClientRect();
                        //location_armorer_draggable_click.x = event.clientX;
                        //location_armorer_draggable_click.y = event.clientY;
                        location_armorer_draggable_click.x = pos.left + pos.width / 4.;
                        location_armorer_draggable_click.y = pos.top + pos.height / 4.;
                    },
                    drag: LocationArmorerNPC.drag_handler
                });
            }
            itemWrapDiv.append(itemDiv);
        }
    };

    LocationArmorerNPC.prototype.changeItem = function(src, dest) {
        if (src == dest) return;
        console.log('LocationArmorerNPC.prototype.changeItem', src, dest);

        var item = this.items[src];

        // Проверка класса тяжести
        if (dest.toString().indexOf('slot') >= 0) {
            var split_res = this.armorer_slots_flags[dest].split('_');
            if (split_res.length <= 1) return;
            var slot_weight = split_res[1];
            var item_weight = item.example.weight_class;
            if (parseInt(slot_weight) < parseInt(item_weight)) {
                console.log('Вы не можете поставить данное оружие в данный слот');
                return;
            }
        }

        this.items[src] = this.items[dest];
        this.items[dest] = item;

        // Предусатновка направления итема
        if (dest.toString().indexOf('slot') >= 0)
            this.items[dest].direction = this.armorer_slots_flags[dest][0];
        if (src.toString().indexOf('slot') >= 0)
            this.items[src].direction = this.armorer_slots_flags[src][0];

        this.reDrawItem(src);
        this.reDrawItem(dest);
        if (dest.toString().indexOf('slot') >= 0)
            this.activeSlot(dest);
        else
            this.activeSlot(null);


        // todo: сделать запрос стоимости текущих настроек
    };

    LocationArmorerNPC.prototype.activeSlot = function(slot_name) {
        //console.log('LocationArmorerNPC.prototype.setActiveSlot');
        //if (!window.hasOwnProperty('dropSectorActive') || !window.hasOwnProperty('dropSlotActive')) return;

        // Гасим все лепестки виджета и все слоты
        LocationArmorerNPC.dropSectorActive();
        LocationArmorerNPC.dropSlotActive(this);

        // Устанавливаем новый активный слот и пытаемся получить соостветствующий итем
        if (this.active_slot == slot_name) this.active_slot = null;
        else this.active_slot = slot_name;
        this.setEnableSector();
        if (!this.items.hasOwnProperty(this.active_slot)) return;
        var item_rec = this.items[this.active_slot];

        // Подсвечиваем слот и если есть экземпляр то устанавливаем текущее направление
        LocationArmorerNPC.setSlotActive(this.active_slot);
        if (item_rec.example)
            LocationArmorerNPC.setSectorActive(item_rec.direction);
    };

    LocationArmorerNPC.prototype.setEnableSector = function() {
        //console.log('LocationArmorerNPC.prototype.setEnableSector');
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
        //console.log('LocationArmorerNPC.prototype.setActiveSector');
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
            this.reDrawItem(this.active_slot);
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
        event.data.armorer.setActiveSector(event.data.sector_name);
    };

    LocationArmorerNPC.drag_handler = function (event, ui, inv_offset_x, inv_offset_y) {
        inv_offset_x = inv_offset_x ? inv_offset_x : 0;
        inv_offset_y = inv_offset_y ? inv_offset_y : 0;
        console.log(inv_offset_x, inv_offset_y);
        var original = ui.originalPosition;
        // jQuery will simply use the same object we alter here
        ui.position = {
            left: (event.clientX - location_armorer_draggable_click.x + original.left + inv_offset_x) / window_scaled_prc,
            top: (event.clientY - location_armorer_draggable_click.y + original.top + inv_offset_y) / window_scaled_prc
        };
    };

    return LocationArmorerNPC;
})(LocationPlaceNPC);
