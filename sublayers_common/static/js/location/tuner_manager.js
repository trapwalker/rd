var LocationTunerNPC = (function (_super) {
    __extends(LocationTunerNPC, _super);

    function LocationTunerNPC(npc_rec, jq_town_div, building_name) {
        //console.log('LocationPlaceNPC', npc_rec);
        _super.call(this, npc_rec, jq_town_div, building_name);

        this.items = {};
        this.inv_show_div = null;
        this.tuner_slots = [];
        this.active_slot = null;
        this._some_in_draggable = null; // Имя слота, который сейчас таскается (slot_t12 или 0...N от размера инвентаря)

        this.jq_car_view = this.jq_main_div.find('.armorer-car').first(); // в шаблоне почему-то этот же класс
        this.jq_ppv = this.jq_main_div.find('#tunerPontPointsValue');  // Pont Points Value

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
        if (!item.hasTag('tuner')) return false;
        if (item.example.hasOwnProperty('images'))
            for (var i = 0; i < item.example.images.length; i++) {
                var elem = item.example.images[i];
                if (elem.car.indexOf(user.example_car.node_hash) >= 0)
                    return true;
            }
        return false;
    };

    LocationTunerNPC.prototype.clear_user_info = function() {
        //console.log('LocationTunerNPC.prototype.clear_user_info');
        // todo: написать тут чтото
        this.items = {};

        if (this.inv_show_div)
            this.inv_show_div.empty();

        this.jq_car_view.empty();
        this.jq_ppv.text(0);
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
        var jq_top_before = this.jq_main_div.find('#tunerCarTopBefore');
        var jq_top_after = this.jq_main_div.find('#tunerCarTopAfter');
        var jq_side_before = this.jq_main_div.find('#tunerCarSideBefore');
        var jq_side_after = this.jq_main_div.find('#tunerCarSideAfter');
        var self = this;

        function get_ex_car_images(images, car_node_hash){
            for (var i = 0; i < images.length; i++)
                if (images[i].car == car_node_hash)
                    return images[i];
            return null;
        }

        if (position.toString().indexOf('slot') >= 0) {
            // Позиция в слотах
            var top_slot = $('#tuner_top_' + position);
            var side_slot = $('#tuner_side_' + position);

            // Очистить слоты
            top_slot.empty();
            side_slot.empty();

            jq_top_before.find('#' + position + 'ImgTop').remove();
            jq_top_after.find('#' + position + 'ImgTop').remove();
            jq_side_before.find('#' + position + 'ImgSide').remove();
            jq_side_after.find('#' + position + 'ImgSide').remove();

            // создать вёрстку для отрисовки
            var item = this.items[position];

            if (item.example) {
                //var itemImgTop = item.example['tuner_top'];
                //var itemImgSide = item.example['tuner_side'];
                var ex_car_images = get_ex_car_images(item.example.images, user.example_car.node_hash);
                if (! ex_car_images) {
                    console.warn('Images for car not found:', user.example_car.node_hash, item.example.images);
                    return;
                }
                var itemImgTop = ex_car_images.top.link;
                var itemImgSide = ex_car_images.side.link;
                var itemImgIcon = item.example['inv_icon_small'];

                var itemDivTop = $('<div class="tuner-car-slot-picture"><img src="' + itemImgIcon + '" style="display: none"></div>');
                var itemDivSide = $('<div class="tuner-car-slot-picture"><img src="' + itemImgIcon + '" style="display: none"></div>');

                if (itemImgTop) {
                    var itemViewImgTop = $('<img id="' + position + 'ImgTop" src="' + itemImgTop + '" class="tuner-car-main-container tuner-car-item-img">');
                    //if (item.example['tuner_top_pos'] > 0)
                    if (ex_car_images.top.z_index > 0)
                        jq_top_after.append(itemViewImgTop);
                    else
                        jq_top_before.append(itemViewImgTop);
                }
                if (itemImgSide) {
                    var itemViewImgSide = $('<img id="' + position + 'ImgSide"  src="' + itemImgSide + '" class="tuner-car-main-container tuner-car-item-img">');
                    //if (item.example['tuner_side_pos'] > 0)
                    if (ex_car_images.side.z_index > 0)
                        jq_side_after.append(itemViewImgSide);
                    else
                        jq_side_before.append(itemViewImgSide);
                }

                itemDivTop.data('pos', position);
                itemDivSide.data('pos', position);

                itemDivTop.draggable({
                    //helper: 'clone',
                    helper: function() { return $('<img width="130" height="70" src="' + item.example.inv_icon_mid + '">') },
                    cursorAt: { left: 65, top: 35 },
                    opacity: 0.8,
                    revert: true,
                    revertDuration: 0,
                    zIndex: 1,
                    appendTo: '#location-content',
                    start: function (event, ui) {
                        ui.helper.children().css('display', 'block');
                        $('#' + $(this).data('pos') + 'ImgTop').css('display', 'none');
                        $('#' + $(this).data('pos') + 'ImgSide').css('display', 'none');
                        self.start_drag_handler(event, ui);
                    },
                    stop: function (event, ui) {
                        $('#' + $(this).data('pos') + 'ImgTop').css('display', 'block');
                        $('#' + $(this).data('pos') + 'ImgSide').css('display', 'block');
                        self.stop_drag_handler(event, ui);
                    },
                    drag: LocationPlace.drag_handler
                });
                itemDivSide.draggable({
                    //helper: 'clone',
                    helper: function() { return $('<img width="130" height="70" src="' + item.example.inv_icon_mid + '">') },
                    cursorAt: { left: 65, top: 35 },
                    opacity: 0.8,
                    revert: true,
                    revertDuration: 0,
                    zIndex: 1,
                    appendTo: '#location-content',
                    start: function (event, ui) {
                        ui.helper.children().css('display', 'block');
                        $('#' + $(this).data('pos') + 'ImgTop').css('display', 'none');
                        $('#' + $(this).data('pos') + 'ImgSide').css('display', 'none');
                        self.start_drag_handler(event, ui);
                    },
                    stop: function (event, ui) {
                        $('#' + $(this).data('pos') + 'ImgTop').css('display', 'block');
                        $('#' + $(this).data('pos') + 'ImgSide').css('display', 'block');
                        self.stop_drag_handler(event, ui);
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
                    .css('background', 'transparent url(' + item.example.inv_icon_mid + ') no-repeat 100% 100%');
                itemDiv.draggable({
                    //helper: function() { return $('<img width="62" height="33" src="' + item.example.inv_icon_small + '">') },
                    //cursorAt: { left: 31, top: 16 },
                    helper: function() { return $('<img width="130" height="70" src="' + item.example.inv_icon_mid + '">') },
                    cursorAt: { left: 65, top: 35 },
                    opacity: 0.8,
                    revert: true,
                    revertDuration: 0,
                    zIndex: 1,
                    appendTo: '#location-content',
                    start: this.start_drag_handler.bind(this),
                    drag: LocationPlace.drag_handler,
                    stop: this.stop_drag_handler.bind(this)
                });
            }
            itemWrapDiv.append(itemDiv);
        }
    };

    //LocationTunerNPC.prototype._compare_tags = function(item, slot) {
    //    // итем должен обладать всеми тегами слота, чтобы быть туда установленным
    //    for (var i = 0; i < slot.tags.length; i++)
    //        if (item.example.tags.indexOf(slot.tags[i]) < 0)
    //            return false;
    //    return true;
    //};

    LocationTunerNPC.prototype._compare_tags = function(item, slot) {
        //console.log('LocationMechanicNPC.prototype._compare_tags', item, slot);
        // итем должен обладать всеми тегами слота, чтобы быть туда установленным
        if (!item || !slot) return false;
        if (!item.hasOwnProperty('example') || !item.example) return false;  // Оказывается, example может быть null;
        if (!item.example.hasOwnProperty('tags')) return false;
        if (!slot.hasOwnProperty('tags')) return false;

        try {
            for (var i = 0; i < slot.tags.length; i++)
                if (item.example.tags.indexOf(slot.tags[i]) < 0)
                    return false;
            return true;
        }
        catch (e) {
            console.warn('LocationMechanicNPC.prototype._compare_tags', e, item, slot);
            return false;
        }
    };

    LocationTunerNPC.prototype.changeItem = function(src, dest) {
        if (src == dest) return;
        //console.log('LocationTunerNPC.prototype.changeItem', src, dest);

        var item1 = this.items[src];
        if (! item1) return;
        var slot1 = null;
        for (var i = 0; i < this.tuner_slots.length; i++)
            if (this.tuner_slots[i].name == dest)
                slot1 = this.tuner_slots[i];

        var item2 = this.items[dest];
        var slot2 = null;
        for (var i = 0; i < this.tuner_slots.length; i++)
            if (this.tuner_slots[i].name == src)
                slot2 = this.tuner_slots[i];

        if ((slot1) && (!this._compare_tags(item1, slot1))) return;
        if ((slot2) && (item2.example) && (!this._compare_tags(item2, slot2))) return;

        this.items[src] = this.items[dest];
        this.items[dest] = item1;

        this.reDrawItem(src);
        this.reDrawItem(dest);

        // Отрисовать значение Очков Крутости
        this._pont_points_refresh();

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
        this.jq_ppv.text(pp);
    };

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

    LocationTunerNPC.prototype.set_header_text = function(html_text) {
        if (!locationManager.isActivePlace(this)) return;
        // todo: Знаю, что нет прямой речи. Но без цены тут нечего выводить!
        if (! html_text) {
            var jq_text_div = $('<div></div>');
            if (user.example_car) {
                jq_text_div.append('<div>Антикрыло хошь?</div>');
            }
            else
                jq_text_div.append('<div>Неее, без машины я ничего не буду делать!</div>');
            html_text = jq_text_div;
        }
        _super.prototype.set_header_text.call(this, html_text);
    };

    LocationTunerNPC.prototype._get_slots_by_item = function (item_rec) {
        var res = [];
        for (var slot_index = 0; slot_index < this.tuner_slots.length; slot_index++) {
            if (this._compare_tags(item_rec, this.tuner_slots[slot_index]))
                res.push(this.tuner_slots[slot_index]);
        }
        return res;
    };

    LocationTunerNPC.prototype.hover_slots_by_item = function (slot_name, hover) {
        if (!locationManager.isActivePlace(this)) return;
        var item_rec = this.items[slot_name];
        var slots = this._get_slots_by_item(item_rec);
        for (var i = 0; i < slots.length; i++) {
            LocationTunerNPC.hoverSlot(slots[i].name, hover);
        }
    };

    LocationTunerNPC.prototype.start_drag_handler = function (event, ui) {
        LocationPlace.start_drag_handler(event, ui);
        this._some_in_draggable = $(event.target).data('pos');
        if (this._some_in_draggable.toString().indexOf('slot') < 0) {
            this.jq_main_div.find('.tuner-itemWrap-' + this._some_in_draggable).children().first().css('display', 'none');
        }
    };

    LocationTunerNPC.prototype.stop_drag_handler = function (event, ui) {
        LocationTunerNPC.hoverSlot(this._some_in_draggable, false);
        if (this._some_in_draggable.toString().indexOf('slot') < 0) {
            this.jq_main_div.find('.tuner-itemWrap-' + this._some_in_draggable).children().first().css('display', 'block');
        }
        this._some_in_draggable = null;
    };

    // Классовые методы !!!! Без прототипов, чтобы было удобнее вызывать!

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
        if (event.data.tuner._some_in_draggable != null) return;
        LocationTunerNPC.hoverSlot(event.data.slot_name, true);
        event.data.tuner.viewRightPanel(event.data.slot_name);
    };

    LocationTunerNPC.slot_event_mouseleave = function (event) {
        if (event.data.tuner._some_in_draggable != null) return;
        LocationTunerNPC.hoverSlot(event.data.slot_name, false);
        event.data.tuner.clearRightPanel();
    };

    LocationTunerNPC.inventory_slot_event_mouseenter = function (event) {
        if (event.data.tuner._some_in_draggable != null) return;
        event.data.tuner.viewRightPanel(event.data.slot_name);
        event.data.tuner.hover_slots_by_item(event.data.slot_name, true);
    };

    LocationTunerNPC.inventory_slot_event_mouseleave = function (event) {
        if (event.data.tuner._some_in_draggable != null) return;
        event.data.tuner.clearRightPanel();
        event.data.tuner.hover_slots_by_item(event.data.slot_name, false);
    };

    return LocationTunerNPC;
})(LocationPlaceNPC);
