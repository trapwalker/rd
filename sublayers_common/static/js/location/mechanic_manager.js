var LocationMechanicNPC = (function (_super) {
    __extends(LocationMechanicNPC, _super);

    function LocationMechanicNPC(npc_rec, jq_town_div, building_name) {
        //console.log('LocationPlaceNPC', npc_rec);
        _super.call(this, npc_rec, jq_town_div, building_name);

        this.items = {};
        this.mechanic_slots = [];
        this.inv_show_div = null;
        this.inventory_tag = null;
        this._some_in_draggable = null; // Имя слота, который сейчас таскается (slot_m12 или 0...N от размера инвентаря)

         this.setup_cost = 0;
         this.clear_cost = 0;

        this.mechanic_systems_names = ["engine", "transmission", "suspension", "brakes", "cooling"];
        this.mechanic_systems_names_rus = ["Двигатель", "Трансмиссия", "Подвеска", "Тормоза", "Охлаждение"];

        this.jq_center_main_block = this.jq_main_div.find('.mechanic-center-main-block').first();

        this.start_slot_state = null;

        this.update();
    }

    LocationMechanicNPC.prototype.set_buttons = function () {
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

    LocationMechanicNPC.prototype._addEmptyInventorySlot = function(position) {
        var self = this;
        var itemWrapDiv = $('<div class="npcInventory-itemWrap mechanic-itemWrap-' + position +
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

        itemWrapDiv.mouseenter({slot_name: position, mechanic: this}, LocationMechanicNPC.inventory_slot_event_mouseenter);
        itemWrapDiv.mouseleave({slot_name: position, mechanic: this}, LocationMechanicNPC.inventory_slot_event_mouseleave);

        this.inv_show_div.append(itemWrapDiv);
    };

    LocationMechanicNPC.prototype.getSlotTextInfo = function(position) {
        //console.log('LocationMechanicNPC.prototype.getSlotTextInfo', position);
        return LocationMechanicNPC.slots_info.hasOwnProperty(position) && LocationMechanicNPC.slots_info[position] || "";
    };

    LocationMechanicNPC.prototype._inventoryFilter = function() {
        var self = this;
        $(this.inv_show_div).find('.npcInventory-itemWrap').each(function (index, element) {
            var item = self.items[$(element).data('pos')];
            $(element).css('display', 'block');
            if ((item.example) && (item.example.tags.indexOf(self.inventory_tag) < 0))
                $(element).css('display', 'none');
        });
        this.resizeInventory(this.inv_show_div);
    };

    LocationMechanicNPC.prototype.setInventoryTag = function(tag) {
        this.inventory_tag = tag;
        this._inventoryFilter();
    };

    LocationMechanicNPC.prototype.exportSlotState = function() {
        var result = {};
        for (var slot_name in this.items)
            if (this.items.hasOwnProperty(slot_name) && (slot_name.toString().indexOf('slot') >= 0))
                result[slot_name] = this.items[slot_name];
        return result;
    };

    LocationMechanicNPC.prototype.clear_user_info = function() {
        //console.log('LocationMechanicNPC.prototype.clear_user_info');
        // todo: написать тут чтото
        this.items = {};

        if (this.inv_show_div)
            this.inv_show_div.empty();

        this.jq_center_main_block.empty();
    };

    LocationMechanicNPC.prototype.update = function(data) {
        //console.log('LocationMechanicNPC.prototype.update', data);
        this.clear_user_info();
        if (user.example_car && user.car_npc_info) {
            var self = this;
            var npc = this.npc_rec;
            var skill_effect = 1 - (user.actual_trading - npc.trading + 100) / 200;
            this.setup_cost = user.example_car.price * npc.setup_cost * (1 + npc.margin_slot * skill_effect);
            this.clear_cost = user.example_car.price * npc.clear_cost * (1 + npc.margin_slot * skill_effect);

            this.mechanic_slots = user.car_npc_info.mechanic_slots;

            var jq_buttons_list = $('<div class="mechanic-center-page-control"></div>');
            this.jq_center_main_block.append(jq_buttons_list);

            // Подготовка вёрстки - проходим по системам и добавляем их
            for(var i = 0; i < this.mechanic_systems_names.length; i++) {
                var system_name = this.mechanic_systems_names[i];
                if (user.templates.hasOwnProperty('mechanic_' + system_name)) {
                    // Добавляем вёрстку кнопки и вёрстку самой системы
                    jq_buttons_list.append('' +
                        '<div class="mechanic-center-page-control-page-button" ' +
                        'data-page="' + system_name + '" data-tag="'+ system_name +
                        '">' + this.mechanic_systems_names_rus[i] + '</div>');
                    this.jq_center_main_block.append(
                        '<div class="mechanic-center-main-block-page page-mechanic-system-' + system_name + '" data-page="' + system_name + '">' +
                            '<div class="town-back-interlacing"></div>' +
                            user.templates['mechanic_' + system_name] +
                        '</div>'
                    );
                }
            }

            this.jq_main_div.find('.mechanic-center-page-control-page-button').click({mechanic: this}, LocationMechanicNPC.system_event_click);

            // todo: Переделать все системы на классы, убрав ID-шники
            var jq_slots = this.jq_main_div.find('.mechanic-slot');
            jq_slots.mouseenter({mechanic: self}, LocationMechanicNPC.slot_event_mouseenter);
            jq_slots.mouseleave({mechanic: self}, LocationMechanicNPC.slot_event_mouseleave);

             // Повесить дропабле на все слоты
            jq_slots.droppable({
                greedy: true,
                drop: function (event, ui) {
                    var dragPos = ui.draggable.data('pos');
                    var dropPos = $(event.target).data('pos');
                    self.changeItem(dragPos, dropPos);
                }
            });

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
                //console.warn('Ивентарь агента (' + user.ID + ') не найден');
                return
            }
            for (var i = 0; i < inventory.max_size; i++) {
                var item_rec = {
                    example: null,
                    position: i
                };
                item = inventory.getItem(i);
                if (item) {
                    if (item.hasTag('mechanic')) {  // фильтрация итема
                        this._addEmptyInventorySlot(i);
                        item_rec.example = item.example;
                        this.items[i] = item_rec;
                    }
                }
                else {
                    this._addEmptyInventorySlot(i);
                    this.items[i] = item_rec;
                }
            }
            this._inventoryFilter();

            // Добавить итемы слотов
            for (var i = 0; i < this.mechanic_slots.length; i++) {
                var item_rec = {
                    example: this.mechanic_slots[i].value,
                    position: this.mechanic_slots[i].name
                };
                this.items[item_rec.position] = item_rec;
                $('#mechanic_' + item_rec.position).data('pos', item_rec.position);
            }

            // Отрисовать верстку
            for (var key in this.items)
                if (this.items.hasOwnProperty(key))
                    this.reDrawItem(key);

            // Выбрать первую систему
            this.jq_main_div.find('.mechanic-center-page-control-page-button').first().click();
        }

        this.start_slot_state = this.exportSlotState();
        _super.prototype.update.call(this, data); // Обновятся кнопки и панели
    };

    LocationMechanicNPC.prototype.activateSystem = function(event) {
        //console.log('LocationMechanicNPC.prototype.activateSystem', event);
        var system_name = $(event.target).data('page');
        var system_tag = $(event.target).data('tag');
        // Включить систему
        this.jq_center_main_block.find('.mechanic-center-main-block-page').css('display', 'none');
        $('.page-mechanic-system-' + system_name).first().css('display', 'block');
        // Выключить подсветку кнопок и включить только нажатой
        this.jq_center_main_block.find('.mechanic-center-page-control-page-button')
            .removeClass('mechanic-center-page-control-page-button-active');
        $(event.target).addClass('mechanic-center-page-control-page-button-active');
        // Установить инвентарный тэг - чтобы спрятались итемы инвентаря, не подходящие для данной системы
        this.setInventoryTag(system_tag);
    };

    LocationMechanicNPC.prototype.clickBtn = function (btnIndex) {
        //console.log('LocationHangarNPC.prototype.clickBtn', btnIndex);
        switch (btnIndex) {
            case '1':
                if (user.example_car)
                    clientManager.sendMechanicApply(this);
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

    LocationMechanicNPC.prototype.reDrawItem = function(position) {
        //console.log('MechanicManager.prototype.reDrawItem', position);
        var item = this.items[position];
        if (position.toString().indexOf('slot') >= 0) {
            // Позиция в слотах
            var slot = $('#mechanic_' + position);
            // Очистить див под картинку
            var img_div = slot.find('.mechanic-slot-img').first();
            img_div.empty();
            var is_supersmall = img_div.hasClass('mechanic-small-slot-img-item');
            //создать вёрстку для отрисовки
            if (item.example) {
                var itemImg = is_supersmall ? item.example['inv_icon_supersmall'] : item.example['inv_icon_small'];
                var itemDiv = $('<div class="mechanic-car-slot-picture"><img src="' + itemImg + '"></div>');
                itemDiv.data('pos', position);
                itemDiv.draggable({
                    //helper: function() { return $('<img width="62" height="33" src="' + item.example.inv_icon_small + '">') },
                    //cursorAt: { left: 31, top: 16 },
                    helper: function() { return $('<img width="130" height="70" src="' + item.example.inv_icon_mid + '">') },
                    cursorAt: { left: 65, top: 35 },
                    revert: true,
                    revertDuration: 0,
                    zIndex: 1,
                    appendTo: '#location-content',
                    start: this.start_drag_handler.bind(this),
                    drag: LocationPlace.drag_handler,
                    stop: this.stop_drag_handler.bind(this)
                });
                img_div.append(itemDiv);
            }
        }
        else {
            // Позиция в инвентаре
            var itemWrapDiv = this.inv_show_div.find('.mechanic-itemWrap-' + position).first();
            itemWrapDiv.empty();

            var itemDiv = $('<div class="npcInventory-item" data-pos="' + position + '"></div>');
            var emptyItemDiv = '<div class="npcInventory-pictureWrap"><div class="npcInventory-picture town-interlacing"></div></div>' +
                '<div class="npcInventory-name">Пусто</div>';
            itemDiv.append(emptyItemDiv);
            if (item && item.example) {
                itemDiv.find('.npcInventory-name').html(item.example.title);
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

    LocationMechanicNPC.prototype._compare_tags = function(item, slot) {
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

    LocationMechanicNPC.prototype.changeItem = function(src, dest) {
        //console.log('MechanicManager.prototype.changeItem', src, dest);
        if (src == dest) return;

        var item1 = this.items[src];
        if (! item1) return;
        var slot1 = null;
        for (var i = 0; i < this.mechanic_slots.length; i++)
            if (this.mechanic_slots[i].name == dest)
                slot1 = this.mechanic_slots[i];

        var item2 = this.items[dest];
        var slot2 = null;
        for (var i = 0; i < this.mechanic_slots.length; i++)
            if (this.mechanic_slots[i].name == src)
                slot2 = this.mechanic_slots[i];

        if ((slot1) && (!this._compare_tags(item1, slot1))) return;
        if ((slot2) && (item2.example) && (!this._compare_tags(item2, slot2))) return;

        this.items[src] = this.items[dest];
        this.items[dest] = item1;

        this.reDrawItem(src);
        this.reDrawItem(dest);

        this.set_header_text();
    };

    LocationMechanicNPC.prototype.set_panels = function () {
        if (!locationManager.isActivePlace(this)) return;
        _super.prototype.set_panels.call(this);
        this.clearRightPanel();
        locationManager.panel_left.show({transactions: this.transactions}, 'npc_transaction_info');
    };

    LocationMechanicNPC.prototype.viewRightPanel = function(slot_name) {
        //console.log('LocationMechanicNPC.prototype.viewRightPanel', slot_name);
        // Получаем слот и соостветствующий итем
        var item_rec = this.items[slot_name];
        if (item_rec && item_rec.example) {
            // Вывод информации об итеме
            locationManager.panel_right.show({text: item_rec.example.description,
                                              title: item_rec.example.title}, 'description');
        }
        else {
            if (slot_name.toString().indexOf('slot') >= 0) {
                // Вывод информации о слоте
                locationManager.panel_right.show({text: this.getSlotTextInfo(slot_name)}, 'description');
            }
        }
    };

    LocationMechanicNPC.prototype.clearRightPanel = function() {
        //console.log('LocationMechanicNPC.prototype.clearRightPanel');
        locationManager.panel_right.show({text: '', title: ''}, 'description');
    };

    LocationMechanicNPC.prototype.viewSubsystem = function (subsystem, flag) {
        if (flag) {
            $('#mechanic-img-' + subsystem).removeClass('mechanic-img-subsystem');
        } else {
            $('#mechanic-img-' + subsystem).addClass('mechanic-img-subsystem');
        }
    };

    LocationMechanicNPC.prototype.viewSubsystemByItem = function (slot_name, flag) {
        if (! this.items.hasOwnProperty(slot_name)) return;
        var item_rec = this.items[slot_name];
        if (! item_rec || !item_rec.example) return;
        var slots_for_light = [];
        for (var i = 0; i < this.mechanic_slots.length; i++) {
            var slot = this.mechanic_slots[i];
            if (this._compare_tags(item_rec, slot)){
                slots_for_light.push(slot);
            }
        }
        // Имитируем эвенты для слотов
        var hover_class_action = flag ? 'addClass' : 'removeClass';

        for (var i = 0; i < slots_for_light.length; i++) {
            var jq_slot = $('#mechanic_' + slots_for_light[i].name);
            this.viewSubsystem(jq_slot.data('subsystem'), flag);
            jq_slot[hover_class_action]('hover');
        }
    };

    LocationMechanicNPC.prototype.set_header_text = function(html_text) {
        if (!locationManager.isActivePlace(this)) return;
        // todo: Знаю, что нет прямой речи. Но без цены тут нечего выводить!
        if (!html_text) {
            var jq_text_div = $('<div></div>');
            if (user.example_car) {
                var cti = this.current_transaction_info();
                if (cti.on == 0 && cti.off == 0)
                    jq_text_div.append('<div>Установить деталь: ' + Math.ceil(this.setup_cost) + ' NC. <br>Снять деталь: ' + Math.ceil(this.clear_cost) +' NC. </div>');
                else {
                    var price = Math.ceil(cti.on * this.setup_cost + cti.off * this.clear_cost);
                    jq_text_div.append('Установлено: ' + cti.on + ' деталей.<br>Снято: ' + cti.off + ' деталей.<br>Цена: ' + price + ' NC<br>Установить?');
                }
            }
            else
                jq_text_div.append('<div>Услуги предоставляются только владельцам собственного транспорта.</div>');
            html_text = jq_text_div;
        }
        _super.prototype.set_header_text.call(this, html_text);
    };

    LocationMechanicNPC.prototype.start_drag_handler = function (event, ui) {
        LocationPlace.start_drag_handler(event, ui);
        this._some_in_draggable = $(event.target).data('pos');
        if (this._some_in_draggable.toString().indexOf('slot') < 0) {
            this.jq_main_div.find('.mechanic-itemWrap-' + this._some_in_draggable).children().first().css('display', 'none');
        }
        else {
            // скрыть то, что в реальном слоте
            this.jq_main_div.find('#mechanic_' + this._some_in_draggable).find('img').css('display', 'none');
        }
    };

    LocationMechanicNPC.prototype.stop_drag_handler = function (event, ui) {
        this.viewSubsystemByItem(this._some_in_draggable, false);
        if (this._some_in_draggable.toString().indexOf('slot') < 0) {
            this.jq_main_div.find('.mechanic-itemWrap-' + this._some_in_draggable).children().first().css('display', 'block');
        }
        else {
            this.jq_main_div.find('#mechanic_' + this._some_in_draggable).find('img').css('display', 'block');
        }
        this._some_in_draggable = null;
    };

    LocationMechanicNPC.prototype.current_transaction_info = function() {
        var cur_slots = this.exportSlotState();
        var start_slots = this.start_slot_state;
        var off_item = 0;
        var on_item = 0;
        for (var key in cur_slots)
            if (cur_slots.hasOwnProperty(key) && start_slots.hasOwnProperty(key)) {
                if(start_slots[key].example == null && cur_slots[key].example != null)
                    on_item++;
                if(start_slots[key].example != null && cur_slots[key].example == null)
                    off_item++;
                if (start_slots[key].example && cur_slots[key].example && cur_slots[key].example.uid != start_slots[key].example.uid) {
                    on_item++;
                    off_item++;
                }
            }
        return {on: on_item, off: off_item};
    };

    // Классовые методы !!!! Без прототипов, чтобы было удобнее вызывать!

    // Обработка слотовых событий
    LocationMechanicNPC.slot_event_mouseenter = function (event) {
        if (event.data.mechanic._some_in_draggable != null) return;
        //event.data.mechanic.viewSubsystem($(this).data('subsystem'), true);
        event.data.mechanic.viewSubsystemByItem($(this).data('pos'), true);
        event.data.mechanic.viewRightPanel($(this).data('pos'));
    };

    LocationMechanicNPC.slot_event_mouseleave = function (event) {
        if (event.data.mechanic._some_in_draggable != null) return;
        //event.data.mechanic.viewSubsystem($(this).data('subsystem'), false);
        event.data.mechanic.viewSubsystemByItem($(this).data('pos'), false);
        event.data.mechanic.clearRightPanel();
    };

    LocationMechanicNPC.inventory_slot_event_mouseenter = function (event) {
        //console.log('LocationMechanicNPC.inventory_slot_event_mouseenter', $(this).data('pos'));
        if (event.data.mechanic._some_in_draggable != null) return;
        event.data.mechanic.viewRightPanel($(this).data('pos'));
        event.data.mechanic.viewSubsystemByItem($(this).data('pos'), true);
    };

    LocationMechanicNPC.inventory_slot_event_mouseleave = function (event) {
        if (event.data.mechanic._some_in_draggable != null) return;
        event.data.mechanic.clearRightPanel();
        event.data.mechanic.viewSubsystemByItem($(this).data('pos'), false);

    };

    LocationMechanicNPC.system_event_click = function (event) {
        //console.log('LocationMechanicNPC.system_event_click', event);
        event.data.mechanic.activateSystem(event);
    };

    LocationMechanicNPC.slots_info = {
        "slot_m1" : 'Двигатель: впуск',
        "slot_m2" : 'Двигатель: компрессор',
        "slot_m3" : 'Двигатель: воздушный фильтр',
        "slot_m4" : 'Двигатель: распредвал',
        "slot_m5" : 'Двигатель: зажигание',
        "slot_m6" : 'Двигатель: ГБЦ',
        "slot_m7" : 'Двигатель: ЦПГ',
        "slot_m8" : 'Двигатель: маховик',
        "slot_m9" : 'Двигатель: масло',
        "slot_m10" : 'Двигатель: выпуск',
        "slot_m11" : 'Двигатель: свеча зажигания',
        "slot_m12" : 'Двигатель: свеча зажигания',
        "slot_m13" : 'Двигатель: свеча зажигания',
        "slot_m14" : 'Двигатель: свеча зажигания',
        "slot_m15" : 'Двигатель: свеча зажигания',
        "slot_m16" : 'Двигатель: свеча зажигания',
        "slot_m17" : 'Двигатель: свеча зажигания',
        "slot_m18" : 'Двигатель: свеча зажигания',
        "slot_m19" : 'Двигатель: свеча зажигания',
        "slot_m20" : 'Двигатель: свеча зажигания',
        "slot_m21" : 'Двигатель: свеча зажигания',
        "slot_m22" : 'Двигатель: свеча зажигания',
        "slot_m23" : 'Трансмиссия: сцепление',
        "slot_m24" : 'Трансмиссия: коробка передач',
        "slot_m25" : 'Трансмиссия: полуоси перед',
        "slot_m26" : 'Трансмиссия: полуоси зад',
        "slot_m27" : 'Трансмиссия: дифференциал перед',
        "slot_m28" : 'Трансмиссия: дифференциал зад',
        "slot_m29" : 'Трансмиссия: трансмиссионное масло',
        "slot_m30" : 'Трансмиссия: первичный вал',
        "slot_m31" : 'Трансмиссия: вторичный вал',
        "slot_m32" : 'Трансмиссия: гидротрансформатор',
        "slot_m33" : 'Трансмиссия: раздатка',
        "slot_m34" : 'Подвеска: передние амортизаторы',
        "slot_m35" : 'Подвеска: передние амортизаторы',
        "slot_m36" : 'Подвеска: задние амортизаторы',
        "slot_m37" : 'Подвеска: задние амортизаторы',
        "slot_m38" : 'Подвеска: передние пружины',
        "slot_m39" : 'Подвеска: передние пружины',
        "slot_m40" : 'Подвеска: задние пружины',
        "slot_m41" : 'Подвеска: задние пружины',
        "slot_m42" : 'Подвеска: передние рычаги',
        "slot_m43" : 'Подвеска: передние рычаги',
        "slot_m44" : 'Подвеска: задние рычаги',
        "slot_m45" : 'Подвеска: задние рычаги',
        "slot_m46" : 'Подвеска: ступица',
        "slot_m47" : 'Подвеска: ступица',
        "slot_m48" : 'Подвеска: ступица',
        "slot_m49" : 'Подвеска: ступица',
        "slot_m50" : 'Подвеска: ступица',
        "slot_m51" : 'Подвеска: ступица',
        "slot_m52" : 'Подвеска: ступица',
        "slot_m53" : 'Подвеска: ступица',
        "slot_m89" : 'Подвеска: колесо',
        "slot_m90" : 'Подвеска: колесо',
        "slot_m91" : 'Подвеска: колесо',
        "slot_m92" : 'Подвеска: колесо',
        "slot_m93" : 'Подвеска: колесо',
        "slot_m94" : 'Подвеска: колесо',
        "slot_m95" : 'Подвеска: колесо',
        "slot_m96" : 'Подвеска: колесо',
        "slot_m54" : 'Тормоза: передние тормозные механизмы',
        "slot_m55" : 'Тормоза: передние тормозные механизмы',
        "slot_m56" : 'Тормоза: задние тормозные механизмы',
        "slot_m57" : 'Тормоза: задние тормозные механизмы',
        "slot_m58" : 'Тормоза: задние тормозные механизмы',
        "slot_m59" : 'Тормоза: задние тормозные механизмы',
        "slot_m60" : 'Тормоза: задние тормозные механизмы',
        "slot_m61" : 'Тормоза: задние тормозные механизмы',
        "slot_m62" : 'Тормоза: передние колодки',
        "slot_m63" : 'Тормоза: передние колодки',
        "slot_m64" : 'Тормоза: задние колодки',
        "slot_m65" : 'Тормоза: задние колодки',
        "slot_m66" : 'Тормоза: задние колодки',
        "slot_m67" : 'Тормоза: задние колодки',
        "slot_m68" : 'Тормоза: задние колодки',
        "slot_m69" : 'Тормоза: задние колодки',
        "slot_m70" : 'Тормоза: усилитель тормозов',
        "slot_m71" : 'Тормоза: АБС',
        "slot_m72" : 'Тормоза: шланги перед',
        "slot_m73" : 'Тормоза: шланги перед',
        "slot_m74" : 'Тормоза: шланги зад',
        "slot_m75" : 'Тормоза: шланги зад',
        "slot_m76" : 'Тормоза: шланги зад',
        "slot_m77" : 'Тормоза: шланги зад',
        "slot_m78" : 'Тормоза: шланги зад',
        "slot_m79" : 'Тормоза: шланги зад',
        "slot_m80" : 'Тормоза: тормозная жидкость',
        "slot_m81" : 'Охлаждение: радиатор',
        "slot_m82" : 'Охлаждение: помпа',
        "slot_m83" : 'Охлаждение: охлаждающая жидкость',
        "slot_m84" : 'Охлаждение: дополнительный радиатор',
        "slot_m85" : 'Охлаждение: термостат',
        "slot_m86" : 'Охлаждение: вентилятор',
        "slot_m87" : 'Охлаждение: вентилятор',
        "slot_m88" : 'Охлаждение: вентилятор',
    };

    return LocationMechanicNPC;
})(LocationPlaceNPC);
