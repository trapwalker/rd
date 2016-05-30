var LocationTunerNPC = (function (_super) {
    __extends(LocationTunerNPC, _super);

    function LocationTunerNPC(npc_rec, jq_town_div, building_name) {
        //console.log('LocationPlaceNPC', npc_rec);
        _super.call(this, npc_rec, jq_town_div, building_name);


        this.items = {};
        this.inv_show_div = null;
        this.tuner_slots = [];
        this.active_slot = null;


        this.jq_car_view = this.jq_main_div.find('.armorer-car').first(); // в шаблоне почему-то этот же класс
        this.jq_ppv = this.jq_main_div.find('#tunerPontPointsValue').first();  // Pont Points Value

        this.update();
    }

    LocationTunerNPC.prototype.set_buttons = function () {
        if (!locationManager.isActivePlace(this)) return;
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

    LocationTunerNPC.prototype._addEmptyInventorySlot = function(position) {
        var self = this;
        var itemWrapDiv = $('<div class="npcInventory-itemWrap tuner-itemWrap-' + position +
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

        itemWrapDiv.mouseenter({slot_name: position, tuner: this}, LocationTunerNPC.inventory_slot_event_mouseenter);
        itemWrapDiv.mouseleave({slot_name: position, tuner: this}, LocationTunerNPC.inventory_slot_event_mouseleave);

        this.inv_show_div.append(itemWrapDiv);
    };

    LocationTunerNPC.prototype.exportSlotState = function() {
        var result = {};
        for (var slot_name in this.items)
            if (this.items.hasOwnProperty(slot_name) && (slot_name.toString().indexOf('slot') >= 0))
                result[slot_name] = this.items[slot_name];
        return result;
    };

    LocationTunerNPC.prototype.testItemForCar = function(item) {
        //console.log('TunerManager.prototype.testItemForCar', item);
        if (! item.hasTag('tuner')) return false;
        if (item.example.hasOwnProperty('images'))
            if (item.example.images.hasOwnProperty(locationManager.example_car_node))
                return true;
        return false
    };

    LocationTunerNPC.prototype.clear_user_info = function() {
        //console.log('LocationTunerNPC.prototype.clear_user_info');
        // todo: написать тут чтото
        this.items = {};

        if (this.inv_show_div)
            this.inv_show_div.empty();

        this.jq_car_view.empty();
    };

    LocationTunerNPC.prototype.update = function(data) {
        //console.log('LocationTunerNPC.prototype.update', data);
        this.clear_user_info();
        if (user.example_car && user.car_npc_info) {
            var self = this;
            this.tuner_slots = user.car_npc_info.tuner_slots;

            this.jq_car_view.append(user.templates.html_tuner_car);


            // Вешаем события на слоты (проход по именам слотов)
            for (var slot_index = 0; slot_index < this.tuner_slots.length; slot_index++) {
                var slot_name = this.tuner_slots[slot_index].name;

                var jq_slot_top = $("#tuner_top_" + slot_name);
                var jq_slot_side = $("#tuner_side_" + slot_name);

                // События
                jq_slot_top.mouseenter({slot_name: slot_name, tuner: this}, LocationTunerNPC.slot_event_mouseenter);
                jq_slot_side.mouseenter({
                    slot_name: slot_name,
                    tuner: this
                }, LocationTunerNPC.slot_event_mouseenter);

                jq_slot_top.mouseleave({slot_name: slot_name, tuner: this}, LocationTunerNPC.slot_event_mouseleave);
                jq_slot_side.mouseleave({
                    slot_name: slot_name,
                    tuner: this
                }, LocationTunerNPC.slot_event_mouseleave);

            }

            // Старый апдейт

            var item;
            // Проверить если город
            this.inv_show_div = this.jq_main_div.find('.npcInventory-inventory').first();
            if (this.inv_show_div.length == 0) {
                console.warn('Div инвентаря не найден');
                return;
            }

            // Добавить итемы инвентаря своего агента
            var inventory = inventoryList.getInventory(user.ID);
            if (!inventory) {
                console.warn('Ивентарь агента (' + user.ID + ') не найден');
                return;
            }

            for (var i = 0; i < inventory.max_size; i++) {
            var item_rec = {
                example: null,
                position: null
            };
            item = inventory.getItem(i);
            item_rec.position = i;
            if (item) {
                if (this.testItemForCar(item)) {  // фильтрация итема
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
            for (var i = 0; i < this.tuner_slots.length; i++) {
                var item_rec = {
                    example: this.tuner_slots[i].value,
                    position: this.tuner_slots[i].name
                };
                this.items[item_rec.position] = item_rec;
                $('#tuner_top_' + item_rec.position).data('pos', item_rec.position);
                $('#tuner_side_' + item_rec.position).data('pos', item_rec.position);
            }

            // Повесить дропабле на все слоты
            this.jq_main_div.find('.tuner-slot').droppable({
                greedy: true,
                drop: function (event, ui) {
                    var dragPos = ui.draggable.data('pos');
                    var dropPos = $(event.target).data('pos');
                    self.changeItem(dragPos, dropPos);
                }
            });

            // Отрисовать верстку
            for (var key in this.items)
                if (this.items.hasOwnProperty(key))
                    this.reDrawItem(key);

            // Отрисовать значение Очков Крутости
            this._pont_points_refresh();
        }
        _super.prototype.update.call(this, data); // Обновятся кнопки и панели
    };

    LocationTunerNPC.prototype.clickBtn = function (btnIndex) {
        //console.log('LocationHangarNPC.prototype.clickBtn', btnIndex);
        switch (btnIndex) {
            case '1':
                if (user.example_car)
                    clientManager.sendTunerApply(this);
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

    LocationTunerNPC.prototype.reDrawItem = function(position) {
        //console.log('LocationTunerNPC.prototype.reDrawItem');
        var top_before = $('#tunerCarTopBefore');
        var top_after = $('#tunerCarTopAfter');
        var side_before = $('#tunerCarSideBefore');
        var side_after = $('#tunerCarSideAfter');

        if (position.toString().indexOf('slot') >= 0) {
            // Позиция в слотах
            var top_slot = $('#tuner_top_' + position);
            var side_slot = $('#tuner_side_' + position);

            // Очистить слоты
            top_slot.empty();
            side_slot.empty();

            top_before.find('#' + position + 'ImgTop').remove();
            top_after.find('#' + position + 'ImgTop').remove();
            side_before.find('#' + position + 'ImgSide').remove();
            side_after.find('#' + position + 'ImgSide').remove();

            // создать вёрстку для отрисовки
            var item = this.items[position];

            if (item.example) {
                //var itemImgTop = item.example['tuner_top'];
                //var itemImgSide = item.example['tuner_side'];
                var ex_car_images = item.example.images[user.example_car.node_hash];
                var itemImgTop = ex_car_images.top.link;
                var itemImgSide = ex_car_images.side.link;
                var itemImgIcon = item.example['inv_icon_small'];

                var itemDivTop = $('<div class="tuner-car-slot-picture"><img src="' + itemImgIcon + '" style="display: none"></div>');
                var itemDivSide = $('<div class="tuner-car-slot-picture"><img src="' + itemImgIcon + '" style="display: none"></div>');

                if (itemImgTop) {
                    var itemViewImgTop = $('<img id="' + position + 'ImgTop" src="' + itemImgTop + '" class="tuner-car-main-container tuner-car-item-img">');
                    //if (item.example['tuner_top_pos'] > 0)
                    if (ex_car_images.top.z_index > 0)
                        top_after.append(itemViewImgTop);
                    else
                        top_before.append(itemViewImgTop);
                }
                if (itemImgSide) {
                    var itemViewImgSide = $('<img id="' + position + 'ImgSide"  src="' + itemImgSide + '" class="tuner-car-main-container tuner-car-item-img">');
                    //if (item.example['tuner_side_pos'] > 0)
                    if (ex_car_images.side.z_index > 0)
                        side_after.append(itemViewImgSide);
                    else
                        side_before.append(itemViewImgSide);
                }

                itemDivTop.data('pos', position);
                itemDivSide.data('pos', position);

                itemDivTop.draggable({
                    helper: 'clone',
                    opacity: 0.8,
                    revert: true,
                    revertDuration: 0,
                    zIndex: 1,
                    appendTo: '#location-content',
                    start: function (event, ui) {
                        ui.helper.children().css('display', 'block');
                        $('#' + $(this).data('pos') + 'ImgTop').css('display', 'none');
                        $('#' + $(this).data('pos') + 'ImgSide').css('display', 'none');

                        LocationPlace.start_drag_handler(event, ui);
                    },
                    stop: function (event, ui) {
                        $('#' + $(this).data('pos') + 'ImgTop').css('display', 'block');
                        $('#' + $(this).data('pos') + 'ImgSide').css('display', 'block');
                    },
                    drag: LocationPlace.drag_handler
                });
                itemDivSide.draggable({
                    helper: 'clone',
                    opacity: 0.8,
                    revert: true,
                    revertDuration: 0,
                    zIndex: 1,
                    appendTo: '#location-content',
                    start: function (event, ui) {
                        ui.helper.children().css('display', 'block');
                        $('#' + $(this).data('pos') + 'ImgTop').css('display', 'none');
                        $('#' + $(this).data('pos') + 'ImgSide').css('display', 'none');

                        LocationPlace.start_drag_handler(event, ui);
                    },
                    stop: function (event, ui) {
                        $('#' + $(this).data('pos') + 'ImgTop').css('display', 'block');
                        $('#' + $(this).data('pos') + 'ImgSide').css('display', 'block');
                    },
                    drag: LocationPlace.drag_handler
                });
                top_slot.append(itemDivTop);
                side_slot.append(itemDivSide);
            }
        }
        else {
            // Позиция в инвентаре
            var itemWrapDiv = this.inv_show_div.find('.tuner-itemWrap-' + position).first();
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
                    helper: function () { return $('<img src="' + item.example.inv_icon_small + '">') },
                    cursorAt: {left: 31, top: 16},
                    opacity: 0.8,
                    revert: true,
                    revertDuration: 0,
                    zIndex: 1,
                    appendTo: '#location-content',
                    start: LocationPlace.start_drag_handler,
                    drag: LocationPlace.drag_handler
                });
            }
            itemWrapDiv.append(itemDiv);
        }



        //if (position.toString().indexOf('slot') >= 0) {
        //    // Позиция в слотах
        //    var top_slot = $('#top_' + position);
        //    var side_slot = $('#side_' + position);
        //
        //    // Очистить слоты
        //    top_slot.empty();
        //    side_slot.empty();
        //
        //    // создать вёрстку для отрисовки
        //    var item = this.items[position];
        //    if (item.example && this.image_scale) {
        //        var item_image_scale = item.example.armorer_images[this.image_scale];
        //
        //        var itemImgTop = item_image_scale['armorer_top_' + item.direction];
        //        var itemImgSide = item_image_scale['armorer_side_' + item.direction];
        //
        //        var itemDivTop = $('<div class="armorer-car-slot-picture" data-pos="' + position +'">' +
        //                '<img id="armorer' + position + 'ImgTop" src="' + itemImgTop + '" class="' + 'armorer_top_'  + item.direction + '">' +
        //            '</div>');
        //        var itemDivSide = $('<div class="armorer-car-slot-picture" data-pos="' + position +'">' +
        //                '<img id="armorer' + position + 'ImgSide" src="' + itemImgSide+ '" class="' + 'armorer_side_'  + item.direction + '">' +
        //            '</div>');
        //
        //
        //        itemDivTop.draggable({
        //            helper: function() { return $('<img src="' + item.example.inv_icon_small + '">') },
        //            cursorAt: { left: 31, top: 16 },
        //            opacity: 0.8,
        //            revert: true,
        //            revertDuration: 0,
        //            zIndex: 1,
        //            appendTo: '#location-content',
        //            start: function(event, ui) {
        //                $('#armorer' + $(this).data('pos') + 'ImgTop').css('display', 'none');
        //                $('#armorer' + $(this).data('pos') + 'ImgSide').css('display', 'none');
        //
        //                LocationPlace.start_drag_handler(event, ui);
        //            },
        //            stop: function(event, ui) {
        //                $('#armorer' + $(this).data('pos') + 'ImgTop').css('display', 'block');
        //                $('#armorer' + $(this).data('pos') + 'ImgSide').css('display', 'block');
        //            },
        //            drag: LocationPlace.drag_handler
        //        });
        //        itemDivSide.draggable({
        //            helper: function() { return $('<img src="' + item.example.inv_icon_small + '">') },
        //            cursorAt: { left: 31, top: 16 },
        //            opacity: 0.8,
        //            revert: true,
        //            revertDuration: 0,
        //            zIndex: 1,
        //            appendTo: '#location-content',
        //            start: function(event, ui) {
        //                $('#armorer' + $(this).data('pos') + 'ImgTop').css('display', 'none');
        //                $('#armorer' + $(this).data('pos') + 'ImgSide').css('display', 'none');
        //
        //                LocationPlace.start_drag_handler(event, ui);
        //            },
        //            stop: function(event, ui) {
        //                $('#armorer' + $(this).data('pos') + 'ImgTop').css('display', 'block');
        //                $('#armorer' + $(this).data('pos') + 'ImgSide').css('display', 'block');
        //            },
        //            drag: LocationPlace.drag_handler
        //        });
        //
        //        top_slot.append(itemDivTop);
        //        side_slot.append(itemDivSide);
        //    }
        //}
        //else {
        //    // Позиция в инвентаре
        //    var itemWrapDiv = this.inv_show_div.find('.armorer-itemWrap-' + position).first();
        //    itemWrapDiv.empty();
        //
        //    var itemDiv = $('<div class="npcInventory-item" data-pos="' + position + '"></div>');
        //    var emptyItemDiv = '<div class="npcInventory-pictureWrap"><div class="npcInventory-picture"></div></div>' +
        //        '<div class="npcInventory-name">Пусто</div>';
        //    itemDiv.append(emptyItemDiv);
        //    var item = this.items[position];
        //    if (item.example) {
        //        itemDiv.find('.npcInventory-name').text(item.example.title);
        //        itemDiv.find('.npcInventory-picture')
        //            .css('background', 'transparent url(' + item.example.inv_icon_small + ') no-repeat 100% 100%');
        //        itemDiv.draggable({
        //            helper: function() { return $('<img src="' + item.example.inv_icon_small + '">') },
        //            cursorAt: { left: 31, top: 16 },
        //            opacity: 0.8,
        //            revert: true,
        //            revertDuration: 0,
        //            zIndex: 1,
        //            appendTo: '#location-content',
        //            start: LocationPlace.start_drag_handler,
        //            drag: LocationPlace.drag_handler
        //        });
        //    }
        //    itemWrapDiv.append(itemDiv);
        //}
    };

    LocationTunerNPC.prototype._compare_tags = function(item, slot) {
        // итем должен обладать всеми тегами слота, чтобы быть туда установленным
        for (var i = 0; i < slot.tags.length; i++)
            if (item.example.tags.indexOf(slot.tags[i]) < 0)
                return false;
        return true;
    };

    LocationTunerNPC.prototype.changeItem = function(src, dest) {
        if (src == dest) return;
        //console.log('LocationTunerNPC.prototype.changeItem', src, dest);

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

    LocationTunerNPC.prototype.set_panels = function () {
        if (!locationManager.isActivePlace(this)) return;
        _super.prototype.set_panels.call(this);
        this.clearRightPanel();
        locationManager.panel_left.show({transactions: this.transactions}, 'npc_transaction_info');
    };

    LocationTunerNPC.prototype._pont_points_refresh = function(){
        var pp = 0;
        for (var key in this.items)
            if (this.items.hasOwnProperty(key))
                if (key.toString().indexOf('slot') >= 0)
                    if (this.items[key].example)
                        pp += this.items[key].example.pont_points;
        $('#tunerPontPointsValue').text(pp);
    };

    //LocationTunerNPC.prototype.activeSlot = function(slot_name) {
    //    //console.log('LocationTunerNPC.prototype.setActiveSlot');
    //    //if (!window.hasOwnProperty('dropSectorActive') || !window.hasOwnProperty('dropSlotActive')) return;
    //
    //    // Гасим все лепестки виджета и все слоты
    //    LocationTunerNPC.dropSectorActive();
    //    LocationTunerNPC.dropSlotActive(this);
    //
    //    // Устанавливаем новый активный слот и пытаемся получить соостветствующий итем
    //    if (this.active_slot == slot_name) this.active_slot = null;
    //    else this.active_slot = slot_name;
    //    this.setEnableSector();
    //    if (!this.items.hasOwnProperty(this.active_slot)) return;
    //    var item_rec = this.items[this.active_slot];
    //
    //    // Подсвечиваем слот и если есть экземпляр то устанавливаем текущее направление
    //    LocationTunerNPC.setSlotActive(this.active_slot);
    //    if (item_rec.example)
    //        LocationTunerNPC.setSectorActive(item_rec.direction);
    //};
    //
    //LocationTunerNPC.prototype.setEnableSector = function() {
    //    //console.log('LocationTunerNPC.prototype.setEnableSector');
    //    LocationTunerNPC.addClassSVG($("#sector_F"), 'car_sector_disable');
    //    LocationTunerNPC.addClassSVG($("#sector_B"), 'car_sector_disable');
    //    LocationTunerNPC.addClassSVG($("#sector_L"), 'car_sector_disable');
    //    LocationTunerNPC.addClassSVG($("#sector_R"), 'car_sector_disable');
    //    if (this.active_slot && this.armorer_slots_flags)
    //        for(var i = 0; i < this.armorer_slots_flags[this.active_slot].length; i++){
    //            var ch = this.armorer_slots_flags[this.active_slot][i];
    //            LocationTunerNPC.removeClassSVG($("#sector_" + ch), 'car_sector_disable');
    //        }
    //};

    //LocationTunerNPC.prototype.setActiveSector = function(sectorName) {
    //    //console.log('LocationTunerNPC.prototype.setActiveSector');
    //    // Получаем активный слот и соостветствующий итем
    //    if (! this.items.hasOwnProperty(this.active_slot)) return;
    //    var item_rec = this.items[this.active_slot];
    //    // Устанавливаем новое направление
    //    item_rec.direction = sectorName;
    //    this.items[this.active_slot] = item_rec;
    //
    //    // Гасим все лепестки виджета и если есть экземпляр то устанавливаем текущее направление
    //    LocationTunerNPC.dropSectorActive();
    //    if (item_rec.example) {
    //        LocationTunerNPC.setSectorActive(item_rec.direction);
    //        this.reDrawItem(this.active_slot);
    //    }
    //};

    LocationTunerNPC.prototype.getSlotTextInfo = function(slot_name) {
        return slot_name;
    };

    LocationTunerNPC.prototype.viewRightPanel = function(slot_name) {
        //console.log('LocationTunerNPC.prototype.viewRightPanel', slot_name);
        // Получаем слот и соостветствующий итем
        var item_rec = this.items[slot_name];
        if (item_rec.example) {
            // Вывод информации об итеме
            locationManager.panel_right.show({text: item_rec.example.description }, 'description');
        }
        else {
            if (slot_name.toString().indexOf('slot') >= 0) {
                // Вывод информации о слоте
                locationManager.panel_right.show({text: this.getSlotTextInfo(slot_name)}, 'description');
            }
        }
    };

    LocationTunerNPC.prototype.clearRightPanel = function() {
        //console.log('LocationTunerNPC.prototype.clearRightPanel');
        locationManager.panel_right.show({text: ''}, 'description');
    };

    LocationTunerNPC.prototype.set_header_text = function() {
        if (!locationManager.isActivePlace(this)) return;
        // todo: Знаю, что нет прямой речи. Но без цены тут нечего выводить!
        var jq_text_div = $('<div></div>');
        if (user.example_car) {
            jq_text_div.append('<div>Антикрыло хошь?</div>');
        }
        else
            jq_text_div.append('<div>Неее, без машины я ничего не буду делать!</div>');
        _super.prototype.set_header_text.call(this, jq_text_div);
    };

    // Классовые методы !!!! Без прототипов, чтобы было удобнее вызывать!

    // Подсветка слотов при наведении указателя мыши
    //LocationTunerNPC.setSlotOpacity = function(slot_name, hover) {
    //    if (hover) {
    //        $("#top_" + slot_name).addClass("armorer-slot-hover");
    //        $("#side_" + slot_name).addClass("armorer-slot-hover");
    //    }
    //    else {
    //        $("#top_" + slot_name).removeClass("armorer-slot-hover");
    //        $("#side_" + slot_name).removeClass("armorer-slot-hover");
    //    }
    //};
    //
    //LocationTunerNPC.dropSlotActive = function(armorer) {
    //    if (armorer && armorer.hasOwnProperty('jq_main_div')) {
    //        armorer.jq_main_div.find('.armorer-slot').removeClass("armorer-slot-active");
    //    }
    //    else {
    //        $('.armorer-slot').removeClass("armorer-slot-active");
    //    }
    //};

    //LocationTunerNPC.setSlotActive = function(slot_name) {
    //    $("#top_" + slot_name).addClass("armorer-slot-active");
    //    $("#side_" + slot_name).addClass("armorer-slot-active");
    //};
    //
    //LocationTunerNPC.addClassSVG = function (obj, cls) {
    //    var oldClass = obj.attr('class');
    //    if (!oldClass) oldClass = cls;
    //    oldClass= oldClass.toString();
    //    if (oldClass.indexOf(cls) == -1) oldClass += ' ' + cls;
    //    obj.attr('class', oldClass);
    //};
    //
    //LocationTunerNPC.removeClassSVG = function (obj, cls) {
    //    var oldClass = obj.attr('class');
    //    if (!oldClass) return;
    //    oldClass = oldClass.toString();
    //    oldClass = oldClass.replace(cls, '');
    //    obj.attr('class', oldClass);
    //};

    //LocationTunerNPC.dropSectorActive = function () {
    //    LocationTunerNPC.removeClassSVG($("#sector_F"), 'car_sector_active');
    //    LocationTunerNPC.removeClassSVG($("#sector_B"), 'car_sector_active');
    //    LocationTunerNPC.removeClassSVG($("#sector_L"), 'car_sector_active');
    //    LocationTunerNPC.removeClassSVG($("#sector_R"), 'car_sector_active');
    //};

    //LocationTunerNPC.setSectorActive = function (sectorName) {
    //    LocationTunerNPC.addClassSVG($("#sector_" + sectorName), 'car_sector_active');
    //};

    // Обработка слотовых событий

    LocationTunerNPC.hoverSlot = function(slot_name, hover) {
        //console.log('TunerManager.prototype.hoverSlot', slot_name, hover);
        if (hover) {
            $('#' + slot_name + 'ImgTop').addClass('active');
            $('#' + slot_name + 'ImgSide').addClass('active');
            $("#tuner_top_" + slot_name).addClass("tuner-slot-hover");
            $("#tuner_side_" + slot_name).addClass("tuner-slot-hover");
        }
        else {
            $('#' + slot_name + 'ImgTop').removeClass('active');
            $('#' + slot_name + 'ImgSide').removeClass('active');
            $("#tuner_top_" + slot_name).removeClass("tuner-slot-hover");
            $("#tuner_side_" + slot_name).removeClass("tuner-slot-hover");
        }
    };

    LocationTunerNPC.slot_event_mouseenter = function (event) {
        LocationTunerNPC.hoverSlot(event.data.slot_name, true);
        //event.data.armorer.viewRightPanel(event.data.slot_name);
    };

    LocationTunerNPC.slot_event_mouseleave = function (event) {
        LocationTunerNPC.hoverSlot(event.data.slot_name, false);
        //event.data.armorer.clearRightPanel();
    };

    LocationTunerNPC.inventory_slot_event_mouseenter = function (event) {
        //event.data.armorer.viewRightPanel(event.data.slot_name);
    };

    LocationTunerNPC.inventory_slot_event_mouseleave = function (event) {
        //event.data.armorer.clearRightPanel();
    };

    return LocationTunerNPC;
})(LocationPlaceNPC);
