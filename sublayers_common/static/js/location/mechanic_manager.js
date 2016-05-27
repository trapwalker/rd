var location_mechanic_draggable_click = {
    x: 0,
    y: 0,
    pos_x: 0,
    pos_y: 0
};

var LocationMechanicNPC = (function (_super) {
    __extends(LocationMechanicNPC, _super);

    function LocationMechanicNPC(npc_rec, jq_town_div, building_name) {
        //console.log('LocationPlaceNPC', npc_rec);
        _super.call(this, npc_rec, jq_town_div, building_name);

        this.items = {};
        this.mechanic_slots = [];
        this.inv_show_div = null;
        this.inventory_tag = null;

        this.mechanic_systems_names = ["engine", "transmission", "suspension", "brakes", "cooling"];
        this.mechanic_systems_names_rus = ["Двигатель", "Трансмиссия", "Подвеска", "Тормоза", "Охлаждение"];

        this.jq_center_main_block = this.jq_main_div.find('.mechanic-center-main-block').first();

        this.update();
    }

    LocationMechanicNPC.prototype.set_buttons = function () {
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
        return position;
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
    };

    LocationMechanicNPC.prototype.update = function(data) {
        //console.log('LocationMechanicNPC.prototype.update', data);
        if (user.example_car && user.car_npc_info) {
            var self = this;
            this.clear_user_info();
            this.mechanic_slots = user.car_npc_info.mechanic_slots;

            this.jq_center_main_block.empty();

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
                    this.jq_center_main_block.append('' +
                        '<div class="mechanic-center-main-block-page page-mechanic-system-' + system_name +
                        '" data-page="' + system_name + '">' +
                            user.templates['mechanic_' + system_name] +
                        '</div>');
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
                console.warn('Ивентарь агента (' + user.ID + ') не найден');
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
                    helper: function() { return $('<img src="' + item.example.inv_icon_small + '">') },
                    opacity: 0.8,
                    revert: true,
                    revertDuration: 0,
                    zIndex: 1,
                    appendTo: '#location-content',
                    start: LocationMechanicNPC.start_drag_handler,
                    drag: LocationMechanicNPC.drag_handler
                });
                img_div.append(itemDiv);
            }
        }
        else {
            // Позиция в инвентаре
            var itemWrapDiv = this.inv_show_div.find('.mechanic-itemWrap-' + position).first();
            itemWrapDiv.empty();

            var itemDiv = $('<div class="npcInventory-item" data-pos="' + position + '"></div>');
            var emptyItemDiv = '<div class="npcInventory-pictureWrap"><div class="npcInventory-picture"></div></div>' +
                '<div class="npcInventory-name">Пусто</div>';
            itemDiv.append(emptyItemDiv);
            if (item && item.example) {
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
                    start: LocationMechanicNPC.start_drag_handler,
                    drag: LocationMechanicNPC.drag_handler
                });
            }
            itemWrapDiv.append(itemDiv);
        }
    };

    LocationMechanicNPC.prototype._compare_tags = function(item, slot) {
        // итем должен обладать всеми тегами слота, чтобы быть туда установленным
        for (var i = 0; i < slot.tags.length; i++)
            if (item.example.tags.indexOf(slot.tags[i]) < 0)
                return false;
        return true;
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
    };

    LocationMechanicNPC.prototype.set_panels = function () {
        _super.prototype.set_panels.call(this);
        this.clearRightPanel();
    };

    LocationMechanicNPC.prototype.viewRightPanel = function(slot_name) {
        //console.log('LocationMechanicNPC.prototype.viewRightPanel', slot_name);
        // Получаем слот и соостветствующий итем
        var item_rec = this.items[slot_name];
        if (item_rec && item_rec.example) {
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

    LocationMechanicNPC.prototype.clearRightPanel = function() {
        //console.log('LocationMechanicNPC.prototype.clearRightPanel');
        locationManager.panel_right.show({text: ''}, 'description');
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
        var event_name = flag ? 'mouseenter' : 'mouseleave';
        var hover_class_action = flag ? 'addClass' : 'removeClass';

        for (var i = 0; i < slots_for_light.length; i++) {
            var jq_slot = $('#mechanic_' + slots_for_light[i].name);
            jq_slot[event_name]();
            jq_slot[hover_class_action]('hover');
        }
    };

    // Классовые методы !!!! Без прототипов, чтобы было удобнее вызывать!

    // Обработка слотовых событий
    LocationMechanicNPC.slot_event_mouseenter = function (event) {
        event.data.mechanic.viewSubsystem($(this).data('subsystem'), true);
        event.data.mechanic.viewRightPanel($(this).data('pos'));
    };

    LocationMechanicNPC.slot_event_mouseleave = function (event) {
        event.data.mechanic.viewSubsystem($(this).data('subsystem'), false);
        event.data.mechanic.clearRightPanel();
    };

    LocationMechanicNPC.inventory_slot_event_mouseenter = function (event) {
        //console.log('LocationMechanicNPC.inventory_slot_event_mouseenter', $(this).data('pos'));
        event.data.mechanic.viewRightPanel($(this).data('pos'));
        event.data.mechanic.viewSubsystemByItem($(this).data('pos'), true);
    };

    LocationMechanicNPC.inventory_slot_event_mouseleave = function (event) {
        event.data.mechanic.clearRightPanel();
        event.data.mechanic.viewSubsystemByItem($(this).data('pos'), false);
    };

    LocationMechanicNPC.system_event_click = function (event) {
        //console.log('LocationMechanicNPC.system_event_click', event);
        event.data.mechanic.activateSystem(event);
    };

    LocationMechanicNPC.drag_handler = function (event, ui) {
        var original = ui.originalPosition;
        // jQuery will simply use the same object we alter here
        ui.position = {
            left: (event.clientX - location_mechanic_draggable_click.x + original.left) / window_scaled_prc,
            top: (event.clientY - location_mechanic_draggable_click.y + original.top) / window_scaled_prc
        };
    };

    LocationMechanicNPC.start_drag_handler = function (event, ui) {
        var pos = event.target.getBoundingClientRect();
        location_mechanic_draggable_click.x = pos.left + pos.width / 4.;
        location_mechanic_draggable_click.y = pos.top + pos.height / 4.;
    };

    return LocationMechanicNPC;
})(LocationPlaceNPC);
