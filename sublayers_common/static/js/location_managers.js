var LocationManager = (function () {

    function LocationManager() {
        this.currentNPC = null;
        this.in_location = false;

        this.location_uid = null;
        this.trader_uid = null;

        this.example_car_node = null;

        this.armorer = new ArmorerManager();
        this.trader = new TraderManager();
        this.nucoil = new NucoilManager();
        this.hangar = new HangarManager();
        this.parking = new ParkingManager();
        this.mechanic = new MechanicManager();
        this.tuner = new TunerManager();
        this.trainer = new TrainerManager();
        this.visitorsManager = new LocationVisitorsManager();
    }

    return LocationManager;
})();


var LocationVisitorsManager = (function () {

    function LocationVisitorsManager() {
        this.visitors = [];
    }

    LocationVisitorsManager.prototype.visitor_record_click = function (event) {
        //console.log('LocationVisitorsManager.prototype.visitor_record_click');
        clientManager.sendCreatePrivateChat($(event.target).parent().data('visitor'))
    };

    LocationVisitorsManager.prototype.visitor_record_info_click = function (event) {
        //console.log('LocationVisitorsManager.prototype.visitor_record_info_click');
        var person = $(event.target).parent().data('visitor');

        var textAreaDiv = $('#textAreaGlobal');
        var personInfo = $('#VGM-PlayerInfoDivInCity');
        if (! personInfo.length) {
            textAreaDiv.append('<div id="VGM-PlayerInfoDivInCity"></div>');
            personInfo = $('#VGM-PlayerInfoDivInCity');
        }
        else {
            personInfo.empty();
        }

        // Делаем Ajax запрос на информацию по пользователю
        $.ajax({
            url: "http://" + location.host + '/api/person_info',
            data: {person: person},
            success: function(data) {
                //console.log(data);
                personInfo.append(data);
            }
        });

        personInfo.css('display', 'block');
    };

    LocationVisitorsManager.prototype.add_visitor_record = function (visitor) {
        //var visitorDiv = $('<div id="visitorRecord_' + visitor + '" class="VMG-message-message sublayers-clickable visitorRecord">' + visitor + '</div>');
        //var visitorDiv = $('<div class="VMG-message-message sublayers-clickable visitorRecord">' + visitor +
        //'<div>_info_</div>'+
        //'</div>');

        var visitorDiv = $('<div id="visitorRecord_' + visitor + '" class="VMG-message-message visitor-record sublayers-clickable">'+
        '<div class="visitorRecord visitorRecordName">' + visitor + '</div>'+
        '<div class="visitorRecord visitorRecordInfo">_info_</div>'+
        '</div>');

        visitorDiv.data('visitor', visitor);

        visitorDiv.find('.visitorRecordName').first().click(this.visitor_record_click);
        visitorDiv.find('.visitorRecordInfo').first().click(this.visitor_record_info_click);

        $('#visitorList').append(visitorDiv);
    };

    LocationVisitorsManager.prototype.add_visitor = function (visitor) {
        //console.log('LocationVisitorsManager.prototype.add_visitor', visitor);
        if (this.visitors.indexOf(visitor) < 0) {
            this.visitors.push(visitor);
            this.add_visitor_record(visitor);
        }
    };

    LocationVisitorsManager.prototype.del_visitor_record = function (visitor) {
        $('#visitorRecord_' + visitor).remove();
    };

    LocationVisitorsManager.prototype.del_visitor = function (visitor) {
        //console.log('LocationVisitorsManager.prototype.del_visitor');
        var visitorIndex = this.visitors.indexOf(visitor);
        if (visitorIndex >= 0) {
            this.visitors.splice(visitorIndex, 1);
            this.del_visitor_record(visitor);
        }
    };

    LocationVisitorsManager.prototype.clear_visitors = function() {
        for (var i = 0; i < this.visitors.length; i++)
            this.del_visitor_record(this.visitors[i]);
        this.visitors = [];
    };

    LocationVisitorsManager.prototype.update_visitors = function() {
        for (var i = 0; i < this.visitors.length; i++) {
            this.del_visitor_record(this.visitors[i]);
            this.add_visitor_record(this.visitors[i]);
        }
    };

    return LocationVisitorsManager;
})();


var NucoilManager = (function () {

    function NucoilManager() {
        this.tank_list = [];
        this.tank_summ = 0;
    }

    NucoilManager.prototype.update = function() {
        this.clear();
        var self = this;

        // Запросить инвентаря своего агента
        var item;
        var inventory = inventoryList.getInventory(user.ID);
        if (! inventory) {
            console.warn('Ивентарь агента (' + user.ID + ') не найден');
            return
        }

        var items = inventory.getItemsByTags(['empty_fuel_tank']);
        var inv_show_div = $('#activeTownDiv').find('.mainMenuNucoilWindow-body-fuel-right').first();
        for (var i = 0; i < items.length; i++) {
            item = items[i];

            var itemDiv = $('<div class="mainMenuNucoilWindow-body-fuel-right-item"></div>');
            var itemDivName = $('<div class="mainMenuNucoilWindow-body-fuel-right-item-name-empty">[ ] ' +
                item.example.value_fuel + ' л.</div>');
            var itemDivPictWrap = $('<div class="mainMenuNucoilWindow-body-fuel-right-item-picture-empty-wrap"></div>');
            var itemDivPict = $('<div class="mainMenuNucoilWindow-body-fuel-right-item-picture-empty"></div>');

            $(inv_show_div).append(itemDiv);
            itemDiv.append(itemDivName);
            itemDiv.append(itemDivPictWrap);
            itemDivPictWrap.append(itemDivPict);
            itemDivPict.css('background', 'transparent url(' + item.example.inv_icon_small + ') no-repeat 100% 100%');

            itemDiv.data('checked', false);
            itemDiv.data('position', item.position);
            itemDiv.data('value_fuel', item.example.value_fuel);

            itemDiv.on('click', function (event) {
                var target = $(event.target);
                var ch = ! target.data('checked');
                var pos = target.data('position');
                target.data('checked', ch);
                if (ch) {
                    // включить галочку
                    target.find('.mainMenuNucoilWindow-body-fuel-right-item-name-empty')
                        .text('[x] ' + target.data('value_fuel') + ' л.');
                    self.tank_summ += target.data('value_fuel');
                    self.tank_list.push(pos);
                }
                else {
                    // выключить галочку
                    target.find('.mainMenuNucoilWindow-body-fuel-right-item-name-empty')
                        .text('[ ] ' + target.data('value_fuel') + ' л.');
                    self.tank_summ -= target.data('value_fuel');
                    self.tank_list.splice(self.tank_list.indexOf(pos), 1);
                }

                setupFuelTotal();
                setupTankFuelValue();
            });
            itemDiv.on('mouseenter', function(event) {
                var target = $(event.target);
                var pos = target.data('position');
                var data_item = inventory.getItem(pos);

                // настраиваем информационное окно
                var inv_parent =  $(inv_show_div).parent();
                inv_parent.find(".mainMenuNucoilWindow-body-fuel-left-picture-picture").css('background',
                        'transparent url(' + data_item.example.inv_icon_mid + ') no-repeat 100% 100%');
                inv_parent.find(".mainMenuNucoilWindow-body-fuel-left-name").text(data_item.example.title);
                inv_parent.find(".mainMenuNucoilWindow-body-fuel-left-description").text(data_item.example.description);
            });
            itemDiv.on('mouseleave', function() {
                // сбрасываем информационное окно
                var inv_parent =  $(inv_show_div).parent();
                inv_parent.find(".mainMenuNucoilWindow-body-fuel-left-picture-picture").css('background', '');
                inv_parent.find(".mainMenuNucoilWindow-body-fuel-left-name").text('');
                inv_parent.find(".mainMenuNucoilWindow-body-fuel-left-description").text('');
            });
        }
    };

    NucoilManager.prototype.clear = function() {
        //console.log('NucoilManager.prototype.clear');
        this.tank_summ = 0;
        this.tank_list = [];
        var jq_town_div = $('#activeTownDiv');
        jq_town_div.find('.mainMenuNucoilWindow-body-fuel-right-item').off('click');
        jq_town_div.find('.mainMenuNucoilWindow-body-fuel-right-item').off('mouseenter');
        jq_town_div.find('.mainMenuNucoilWindow-body-fuel-right-item').off('mouseleave');
        jq_town_div.find('.mainMenuNucoilWindow-body-fuel-right').empty();
    };

    NucoilManager.prototype.apply = function() {
        //console.log('NucoilManager.prototype.apply');
    };

    NucoilManager.prototype.cancel = function() {
        //console.log('NucoilManager.prototype.cancel');
    };

    return NucoilManager;
})();


var ArmorerManager = (function () {

    function ArmorerManager() {
        this.items = {};
        this.inv_show_div = null;
        this.armorer_slots = [];
        this.armorer_slots_flags = {};
        this.activeSlot = null;
        this.image_scale = null;
    }

    ArmorerManager.prototype._addEmptyInventorySlot = function(position) {
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
                locationManager.armorer.changeItem(dragPos, dropPos);
            }
        });
        this.inv_show_div.append(itemWrapDiv);
    };

    ArmorerManager.prototype._update_armorer_slots_flags = function(armorer_slots_flags) {
        this.armorer_slots_flags = {};
        for (var i = 0; i < armorer_slots_flags.length; i++) {
            var sl_flag = armorer_slots_flags[i];
            this.armorer_slots_flags[sl_flag.name.slice(0, -2)] = sl_flag.value;
        }
    };

    ArmorerManager.prototype.exportSlotState = function() {
        var result = {};
        for (var slot_name in this.items)
            if (this.items.hasOwnProperty(slot_name) && (slot_name.toString().indexOf('slot') >= 0))
                result[slot_name] = this.items[slot_name];
        return result;
    };

    ArmorerManager.prototype.update = function(armorer_slots, armorer_slots_flags, image_scale) {
        //console.log('ArmorerManager.prototype.update');
        this.clear();

        if (image_scale) this.image_scale = image_scale;

        if (armorer_slots) this.armorer_slots = armorer_slots;
        if (armorer_slots_flags) this._update_armorer_slots_flags(armorer_slots_flags);

        var self = this;
        var item;

        // Проверить если город
        this.inv_show_div = $('#activeTownDiv').find('.armorerWindow-main').find('.npcInventory-inventory').first();
        if (this.inv_show_div.length == 0) {
            console.warn('Вёрстка города не найдена');
            return
        }

        // Добавить итемы инвентаря своего агента
        var inventory = inventoryList.getInventory(user.ID);
        if (! inventory) {
            console.warn('Ивентарь агента (' + user.ID + ') не найден');
            return
        }
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
        resizeInventory(this.inv_show_div);

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
        $('.armorer-slot').droppable({
            greedy: true,
            drop: function(event, ui) {
                var dragPos = ui.draggable.data('pos');
                var dropPos = $(event.target).data('pos');
                locationManager.armorer.changeItem(dragPos, dropPos);
            }
        });

        // Отрисовать верстку
        for (var key in this.items)
            if (this.items.hasOwnProperty(key))
                this.reDrawItem(key);
    };

    ArmorerManager.prototype.clear = function() {
        //console.log('ArmorerManager.prototype.clear');
        // todo: написать тут чтото
        this.setActiveSlot(null);
        this.items = {};

        if (this.inv_show_div)
            this.inv_show_div.empty();
    };

    ArmorerManager.prototype.apply = function() {
        //console.log('ArmorerManager.prototype.apply');
        clientManager.sendArmorerApply();
    };

    ArmorerManager.prototype.cancel = function() {
        //console.log('ArmorerManager.prototype.cancel');
        clientManager.sendArmorerCancel();
    };

    ArmorerManager.prototype.reDrawItem = function(position) {
        //console.log('ArmorerManager.prototype.reDrawItem');
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

                var itemDivTop = $('<div class="armorer-car-slot-picture"><img id="armorer' + position + 'ImgTop" src="' + itemImgTop + '" class="' + 'armorer_top_'  + item.direction + '"></div>');
                var itemDivSide = $('<div class="armorer-car-slot-picture"><img id="armorer' + position + 'ImgSide" src="' + itemImgSide+ '" class="' + 'armorer_side_'  + item.direction + '"></div>');

                itemDivTop.data('pos', position);
                itemDivSide.data('pos', position);

                itemDivTop.draggable({
                    helper: function() { return $('<img src="' + item.example.inv_icon_small + '">') },
                    cursorAt: { left: 31, top: 16 },
                    opacity: 0.8,
                    revert: true,
                    revertDuration: 0,
                    zIndex: 1,
                    appendTo: '#activeTownDiv',
                    start: function(event, ui) {
                        $('#armorer' + $(this).data('pos') + 'ImgTop').css('display', 'none');
                        $('#armorer' + $(this).data('pos') + 'ImgSide').css('display', 'none');
                    },
                    stop: function(event, ui) {
                        $('#armorer' + $(this).data('pos') + 'ImgTop').css('display', 'block');
                        $('#armorer' + $(this).data('pos') + 'ImgSide').css('display', 'block');
                    }
                });
                itemDivSide.draggable({
                    helper: function() { return $('<img src="' + item.example.inv_icon_small + '">') },
                    cursorAt: { left: 31, top: 16 },
                    opacity: 0.8,
                    revert: true,
                    revertDuration: 0,
                    zIndex: 1,
                    appendTo: '#activeTownDiv',
                    start: function(event, ui) {
                        $('#armorer' + $(this).data('pos') + 'ImgTop').css('display', 'none');
                        $('#armorer' + $(this).data('pos') + 'ImgSide').css('display', 'none');
                    },
                    stop: function(event, ui) {
                        $('#armorer' + $(this).data('pos') + 'ImgTop').css('display', 'block');
                        $('#armorer' + $(this).data('pos') + 'ImgSide').css('display', 'block');
                    }
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
                    appendTo: '#activeTownDiv'
                });
            }
            itemWrapDiv.append(itemDiv);
        }
    };

    ArmorerManager.prototype.changeItem = function(src, dest) {
        //console.log('ArmorerManager.prototype.changeItem', src, dest);
        if (src == dest) return;

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
            this.setActiveSlot(dest);
        else
            this.setActiveSlot(null);
    };

    ArmorerManager.prototype.setActiveSlot = function(slotName) {
        //console.log('ArmorerManager.prototype.setActiveSlot');
        if (! window.hasOwnProperty('dropSectorActive') || ! window.hasOwnProperty('dropSlotActive')) return;

        // Гасим все лепестки виджета и все слоты
        dropSectorActive();
        dropSlotActive();

        // Устанавливаем новый активный слот и пытаемся получить соостветствующий итем
        if (this.activeSlot == slotName) this.activeSlot = null;
        else this.activeSlot = slotName;
        this.setEnableSector();
        if (! this.items.hasOwnProperty(this.activeSlot)) return;
        var item_rec = this.items[this.activeSlot];

        // Подсвечиваем слот и если есть экземпляр то устанавливаем текущее направление
        setSlotActive(this.activeSlot);
        if (item_rec.example)
            setSectorActive(item_rec.direction);
    };

    ArmorerManager.prototype.setEnableSector = function() {
        //console.log('ArmorerManager.prototype.setEnableSector');
        addClassSVG($("#sector_F"), 'car_sector_disable');
        addClassSVG($("#sector_B"), 'car_sector_disable');
        addClassSVG($("#sector_L"), 'car_sector_disable');
        addClassSVG($("#sector_R"), 'car_sector_disable');
        if (this.activeSlot)
            for(var i = 0; i < this.armorer_slots_flags[this.activeSlot].length; i++){
                var ch = this.armorer_slots_flags[this.activeSlot][i];
                removeClassSVG($("#sector_" + ch), 'car_sector_disable');
            }
    };

    ArmorerManager.prototype.setActiveSector = function(sectorName) {
        //console.log('ArmorerManager.prototype.setActiveSector');

        // Получаем активный слот и соостветствующий итем
        if (! this.items.hasOwnProperty(this.activeSlot)) return;
        var item_rec = this.items[this.activeSlot];

        // Устанавливаем новое направление
        item_rec.direction = sectorName;
        this.items[this.activeSlot] = item_rec;

        // Гасим все лепестки виджета и если есть экземпляр то устанавливаем текущее направление
        dropSectorActive();
        if (item_rec.example) {
            setSectorActive(item_rec.direction);
            this.reDrawItem(this.activeSlot);
        }
    };

    return ArmorerManager;
})();


var MechanicManager = (function () {

    function MechanicManager() {
        this.items = {};
        this.mechanic_slots = [];
        this.inv_show_div = null;
        this.inventory_tag = null;
    }

    MechanicManager.prototype._addEmptyInventorySlot = function(position) {
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
                locationManager.mechanic.changeItem(dragPos, dropPos);
            }
        });
        this.inv_show_div.append(itemWrapDiv);
    };

    MechanicManager.prototype.showItemInfo = function(position) {
        //console.log('MechanicManager.prototype.showItemInfo', position);
        $('#mechanic-info-block-title').text('');
        $('#mechanic-info-block-description').text('');
        $('#mechanic-info-block-img').css('background', 'transparent url() no-repeat 100% 100%');
        if (this.items.hasOwnProperty(position)) {
            var item = this.items[position];
            if (item.example) {
                $('#mechanic-info-block-title').text(item.example.title);
                $('#mechanic-info-block-description').text(item.example.description);
                $('#mechanic-info-block-img').css('background',
                    'transparent url(' + item.example.inv_icon_mid + ') no-repeat 100% 100%');
            }
        }
    };

    MechanicManager.prototype._inventoryFilter = function() {
        var self = this;
        $(this.inv_show_div).find('.npcInventory-itemWrap').each(function (index, element) {
            var item = self.items[$(element).data('pos')];
            $(element).css('display', 'block');
            if ((item.example) && (item.example.tags.indexOf(self.inventory_tag) < 0))
                $(element).css('display', 'none');
        });
        resizeInventory(this.inv_show_div);
    };

    MechanicManager.prototype.setInventoryTag = function(tag) {
        this.inventory_tag = tag;
        this._inventoryFilter();
    };

    MechanicManager.prototype.exportSlotState = function() {
        var result = {};
        for (var slot_name in this.items)
            if (this.items.hasOwnProperty(slot_name) && (slot_name.toString().indexOf('slot') >= 0))
                result[slot_name] = this.items[slot_name];
        return result;
    };

    MechanicManager.prototype.update = function(mechanic_slots) {
        //console.log('MechanicManager.prototype.update', mechanic_slots);
        this.clear();

        if (mechanic_slots) this.mechanic_slots = mechanic_slots;

        var item;

        // Проверить если город
        this.inv_show_div = $('#activeTownDiv').find('.mechanicWindow-main').find('.npcInventory-inventory').first();
        if (this.inv_show_div.length == 0) {
            console.warn('Вёрстка города не найдена');
            return
        }

        // Добавить итемы инвентаря своего агента
        var inventory = inventoryList.getInventory(user.ID);
        if (! inventory) {
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

        // Повесить дропабле на все слоты
        $('.mechanic-slot').droppable({
            greedy: true,
            drop: function(event, ui) {
                var dragPos = ui.draggable.data('pos');
                var dropPos = $(event.target).data('pos');
                locationManager.mechanic.changeItem(dragPos, dropPos);
            }
        });

        $('.mechanic-slot').mouseenter(function(event) {
            locationManager.mechanic.showItemInfo($(this).data('pos'));
        });

        $('.mechanic-slot').mouseleave(function(event) {
            locationManager.mechanic.showItemInfo(null);
        });

        this.inv_show_div.find('.npcInventory-itemWrap').mouseenter(function(event) {
            locationManager.mechanic.showItemInfo($(this).data('pos'));
        });

        this.inv_show_div.find('.npcInventory-itemWrap').mouseleave(function(event) {
            locationManager.mechanic.showItemInfo(null);
        });

        // Отрисовать верстку
        for (var key in this.items)
            if (this.items.hasOwnProperty(key))
                this.reDrawItem(key);
    };

    MechanicManager.prototype.clear = function() {
        //console.log('MechanicManager.prototype.clear');
        // todo: написать тут чтото
        this.items = {};
        if (this.inv_show_div)
            this.inv_show_div.empty();
    };

    MechanicManager.prototype.reDrawItem = function(position) {
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
                    helper: 'clone',
                    opacity: 0.8,
                    revert: true,
                    revertDuration: 0,
                    zIndex: 1,
                    appendTo: '#activeTownDiv'
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
                    helper: 'clone',
                    cursorAt: { left: 31, top: 16 },
                    opacity: 0.8,
                    revert: true,
                    revertDuration: 0,
                    zIndex: 1,
                    appendTo: '#activeTownDiv'
                });
            }
            itemWrapDiv.append(itemDiv);
        }
    };

    MechanicManager.prototype._compare_tags = function(item, slot) {
        // итем должен обладать всеми тегами слота, чтобы быть туда установленным
        for (var i = 0; i < slot.tags.length; i++)
            if (item.example.tags.indexOf(slot.tags[i]) < 0)
                return false;
        return true;

    };

    MechanicManager.prototype.changeItem = function(src, dest) {
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

    MechanicManager.prototype.apply = function() {
        //console.log('MechanicManager.prototype.apply');
        clientManager.sendMechanicApply();
    };

    MechanicManager.prototype.cancel = function() {
        //console.log('MechanicManager.prototype.cancel');
        clientManager.sendMechanicCancel();
    };

    return MechanicManager;
})();


var TunerManager = (function () {

    function TunerManager() {
        this.items = {};
        this.inv_show_div = null;
        this.tuner_slots = [];
        this.activeSlot = null;
    }

    TunerManager.prototype._addEmptyInventorySlot = function(position) {
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
                locationManager.tuner.changeItem(dragPos, dropPos);
            }
        });

        itemWrapDiv.mouseenter(function(){
            var item = locationManager.tuner.items[$(this).data('pos')];
            if (!item.example) return;
            for (var i = 0; i < locationManager.tuner.tuner_slots.length; i++) {
                var slot = locationManager.tuner.tuner_slots[i];
                if (locationManager.tuner._compare_tags(item, slot))
                    locationManager.tuner.hoverSlot(slot.name, true);
            }
        });
        itemWrapDiv.mouseleave(function(){
            var item = locationManager.tuner.items[$(this).data('pos')];
            if (!item.example) return;
            for (var i = 0; i < locationManager.tuner.tuner_slots.length; i++) {
                var slot = locationManager.tuner.tuner_slots[i];
                if (locationManager.tuner._compare_tags(item, slot))
                    locationManager.tuner.hoverSlot(slot.name, false);
            }
        });
        this.inv_show_div.append(itemWrapDiv);
    };

    TunerManager.prototype.exportSlotState = function() {
        var result = {};
        for (var slot_name in this.items)
            if (this.items.hasOwnProperty(slot_name) && (slot_name.toString().indexOf('slot') >= 0))
                result[slot_name] = this.items[slot_name];
        return result;
    };

    TunerManager.prototype.testItemForCar = function(item) {
        //console.log('TunerManager.prototype.testItemForCar', item);
        if (! item.hasTag('tuner')) return false;
        if (item.example.hasOwnProperty('images'))
            if (item.example.images.hasOwnProperty(locationManager.example_car_node))
                return true;
        return false
    };

    TunerManager.prototype.update = function(tuner_slots) {
        //console.log('TunerManager.prototype.update', tuner_slots);
        this.clear();

        if (tuner_slots) this.tuner_slots = tuner_slots;

        var item;

        // Проверить если город
        this.inv_show_div = $('#activeTownDiv').find('.tunerWindow-main').find('.npcInventory-inventory').first();
        if (this.inv_show_div.length == 0) {
            console.warn('Вёрстка города не найдена');
            return
        }

        // Добавить итемы инвентаря своего агента
        var inventory = inventoryList.getInventory(user.ID);
        if (! inventory) {
            console.warn('Ивентарь агента (' + user.ID + ') не найден');
            return
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
        resizeInventory(this.inv_show_div);

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
        $('.tuner-slot').droppable({
            greedy: true,
            drop: function(event, ui) {
                var dragPos = ui.draggable.data('pos');
                var dropPos = $(event.target).data('pos');
                locationManager.tuner.changeItem(dragPos, dropPos);
            }
        });

        // Отрисовать верстку
        for (var key in this.items)
            if (this.items.hasOwnProperty(key))
                this.reDrawItem(key);

        // Отрисовать значение Очков Крутости
        this._pont_points_refresh();
    };

    TunerManager.prototype.clear = function() {
        //console.log('TunerManager.prototype.clear');
        // todo: написать тут чтото
        this.items = {};

        if (this.inv_show_div)
            this.inv_show_div.empty();
    };

    TunerManager.prototype.apply = function() {
        //console.log('ArmorerManager.prototype.apply');
        clientManager.sendTunerApply();
    };

    TunerManager.prototype.cancel = function() {
        //console.log('TunerManager.prototype.cancel');
        clientManager.sendTunerCancel();
    };

    TunerManager.prototype.reDrawItem = function(position) {
        //console.log('TunerManager.prototype.reDrawItem');

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
                var ex_car_images = item.example.images[locationManager.example_car_node];
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
                    appendTo: '#activeTownDiv',
                    start: function(event, ui) {
                        ui.helper.children().css('display', 'block');
                        $('#' + $(this).data('pos') + 'ImgTop').css('display', 'none');
                        $('#' + $(this).data('pos') + 'ImgSide').css('display', 'none');
                    },
                    stop: function(event, ui) {
                        $('#' + $(this).data('pos') + 'ImgTop').css('display', 'block');
                        $('#' + $(this).data('pos') + 'ImgSide').css('display', 'block');
                    }
                });
                itemDivSide.draggable({
                    helper: 'clone',
                    opacity: 0.8,
                    revert: true,
                    revertDuration: 0,
                    zIndex: 1,
                    appendTo: '#activeTownDiv',
                    start: function(event, ui) {
                        ui.helper.children().css('display', 'block');
                        $('#' + $(this).data('pos') + 'ImgTop').css('display', 'none');
                        $('#' + $(this).data('pos') + 'ImgSide').css('display', 'none');
                    },
                    stop: function(event, ui) {
                        $('#' + $(this).data('pos') + 'ImgTop').css('display', 'block');
                        $('#' + $(this).data('pos') + 'ImgSide').css('display', 'block');
                    }
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
                    helper: function() { return $('<img src="' + item.example.inv_icon_small + '">') },
                    cursorAt: { left: 31, top: 16 },
                    opacity: 0.8,
                    revert: true,
                    revertDuration: 0,
                    zIndex: 1,
                    appendTo: '#activeTownDiv'
                });
            }
            itemWrapDiv.append(itemDiv);
        }
    };

    TunerManager.prototype._compare_tags = function(item, slot) {
        // итем должен обладать всеми тегами слота, чтобы быть туда установленным
        for (var i = 0; i < slot.tags.length; i++)
            if (item.example.tags.indexOf(slot.tags[i]) < 0)
                return false;
        return true;
    };

    TunerManager.prototype.changeItem = function(src, dest) {
        //console.log('TunerManager.prototype.changeItem', src, dest);
        if (src == dest) return;

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
    };

    TunerManager.prototype._pont_points_refresh = function(){
        var pp = 0;
        for (var key in this.items)
            if (this.items.hasOwnProperty(key))
                if (key.toString().indexOf('slot') >= 0)
                    if (this.items[key].example)
                        pp += this.items[key].example.pont_points;
        $('#tunerPontPointsValue').text(pp);
    };

    TunerManager.prototype.hoverSlot = function(slot_name, hover) {
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

    return TunerManager;
})();


var TraderManager = (function () {

    function TraderManager() {
        this.playerInvCls = "player-inventory-droppable-item";
        this.playerTableCls = "player-table-droppable-item";
        this.traderInvCls = "trader-inventory-droppable-item";
        this.traderTableCls = "trader-table-droppable-item";

        this.playerInv = [];
        this.playerTable = [];
        this.playerInvDiv = null;
        this.playerTableDiv = null;

        this.traderInv = [];
        this.traderTable = [];
        this.traderInvDiv = null;
        this.traderTableDiv = null;

        this.price_list = {};
    }

    TraderManager.prototype.calcPriceTables = function() {
        var i;
        var price_player = 0;
        var price_trader = 0;
        for (i = 0; i < this.playerTable.length; i++)
            price_player += Math.round((this.playerTable[i].count / this.playerTable[i].max_count) * this._getPrice(this.playerTable[i], 0));
        for (i = 0; i < this.traderTable.length; i++)
            price_trader += Math.round((this.traderTable[i].count / this.traderTable[i].max_count) * this._getPrice(this.traderTable[i], 1));

        if (price_player > price_trader) {
            price_trader = (price_player - price_trader).toFixed(0);
            price_player = 0;
        }
        else {
            price_player = (price_trader - price_player).toFixed(0);
            price_trader = 0;
        }
        $('#mainTraderWindow-down-exchange-lefttotal-span').text(price_player);
        $('#mainTraderWindow-down-exchange-righttotal-span').text(price_trader);
    };

    TraderManager.prototype.changeItemPlayer = function(pos, srcList, destList, srcDiv, destDiv, srcCls, destCls) {
        destDiv.empty();
        srcDiv.empty();

        destList.push(srcList[pos]);
        srcList.splice(pos, 1);

        this._reDrawItemList(destDiv, destList, destCls);
        this._reDrawItemList(srcDiv, srcList, srcCls);

        this.calcPriceTables();
    };

    TraderManager.prototype.changeItemTrader = function(pos, srcList, destList, srcDiv, destDiv, srcCls, destCls) {
        if (destDiv != srcDiv) this.traderTableDiv.empty();

        if (destDiv == this.traderTableDiv) destList.push(srcList[pos]);
        if (srcDiv == this.traderTableDiv) srcList.splice(pos, 1);

        this._reDrawItemList(this.traderTableDiv, this.traderTable, this.traderTableCls);

        this.calcPriceTables();
    };

    TraderManager.prototype.updatePlayerInv = function() {
        //console.log('TraderManager.prototype.updatePlayerInv');
        this._clearPlayerInv();
        var self = this;
        var item;

        // Проверить если город
        if (!locationManager.in_location) {
            console.warn('Вёрстка города не найдена');
            return
        }

        // Отрисовать собственный счет
        $('#mainTraderWindow-down-player-score-span').text(user.balance);

        // Добавить итемы инвентаря своего агента
        var inventory = inventoryList.getInventory(user.ID);
        if (! inventory) {
            console.warn('Ивентарь агента (' + user.ID + ') не найден');
            return
        }
        for (var i = 0; i < inventory.max_size; i++) {
            item = inventory.getItem(i);
            if (item) {
                item.example.count = item.getCurrentVal(clock.getCurrentTime());
                item.example.max_count = item.getMaxVal();
                this.playerInv.push(item.example);
            }
        }

        // Установить дивы инвентарей
        this.playerInvDiv = $('#activeTownDiv').find('.mainTraderWindow-down-player-body').first();
        this.playerTableDiv = $('#activeTownDiv').find('.mainTraderWindow-down-exchange-leftbody').first();

        // Повесить дропаблы
        this.playerInvDiv.droppable({
            greedy: true,
            accept: function(target) {
                return target.hasClass(self.playerTableCls) ;
            },
            drop: function(event, ui) {
                var item_pos = ui.draggable.data('pos');
                self.changeItemPlayer(item_pos, self.playerTable, self.playerInv, self.playerTableDiv,
                                self.playerInvDiv , self.playerTableCls, self.playerInvCls);//
            }
        });

        this.playerTableDiv.droppable({
            greedy: true,
            accept: function(target) {
                return target.hasClass(self.playerInvCls);
            },
            drop: function(event, ui) {
                var item_pos = ui.draggable.data('pos');
                self.changeItemPlayer(item_pos, self.playerInv, self.playerTable, self.playerInvDiv,
                                self.playerTableDiv, self.playerInvCls, self.playerTableCls);
            }
        });

        // Отрисовать верстку
        this._reDrawItemList(this.playerInvDiv, this.playerInv, this.playerInvCls);
    };

    TraderManager.prototype.updateTraderInv = function() {
        //console.log('TraderManager.prototype.updateTraderInv');
        this._clearTraderInv();
        var self = this;
        var item;

        // Проверить если город
        if (!locationManager.in_location) {
            console.warn('Вёрстка города не найдена');
            return
        }

        // Добавить итемы инвентаря своего агента
        var inventory = inventoryList.getInventory(locationManager.trader_uid);
        if (! inventory) {
            console.warn('Ивентарь торговца не найден');
            return
        }
        for (var i = 0; i < inventory.max_size; i++) {
            item = inventory.getItem(i);
            if (item) {
                item.example.count = item.getCurrentVal(clock.getCurrentTime());
                item.example.max_count = item.getMaxVal();
                this.traderInv.push(item.example);
            }
        }

        // Установить дивы инвентарей
        this.traderInvDiv = $('#activeTownDiv').find('.mainTraderWindow-down-trader-body').first();
        this.traderTableDiv = $('#activeTownDiv').find('.mainTraderWindow-down-exchange-rightbody').first();

        // Повесить дропаблы
        this.traderInvDiv.droppable({
            greedy: true,
            accept: function(target) {
                return target.hasClass(self.traderTableCls) ;
            },
            drop: function(event, ui) {
                var item_pos = ui.draggable.data('pos');
                self.changeItemTrader(item_pos, self.traderTable, self.traderInv, self.traderTableDiv,
                    self.traderInvDiv , self.traderTableCls, self.traderInvCls);//
            }
        });

        this.traderTableDiv.droppable({
            greedy: true,
            accept: function(target) {
                return target.hasClass(self.traderInvCls);
            },
            drop: function(event, ui) {
                var item_pos = ui.draggable.data('pos');
                self.changeItemTrader(item_pos, self.traderInv, self.traderTable, self.traderInvDiv,
                    self.traderTableDiv, self.traderInvCls, self.traderTableCls);
            }
        });

        // Отрисовать верстку
        this._reDrawItemList(this.traderInvDiv, this.traderInv, this.traderInvCls);
    };

    // state: 0 - продажа торговцу, 1 - покупка у торговца
    TraderManager.prototype._getPrice = function (item, state) {
        var price_modify = this.price_list.hasOwnProperty(item.id) ? this.price_list[item.id][state] : 100;
        return Math.round(item.base_price * price_modify / 100.0);
    };

    TraderManager.prototype.updatePrice = function(price_list) {
        //console.log('TraderManager.prototype.updatePrice', price_list);
        if (price_list)
            this.price_list = price_list;
        else
            price_list = this.price_list;

        if (! price_list) { console.warn('Отсутствует список цен торговца.'); return }
        // Проверить если город
        if (!locationManager.in_location) {console.warn('Вёрстка города не найдена'); return }

        // Данный метод просто добавит в текущие списки итемов правильные цены этого торговца.
        var new_inventory = [];
        // проходим по списку итемов пользователя и ставим правильные цены продажи
        for (var i = 0 ; i < this.playerInv.length; i++) {
            var item = this.playerInv[i];
            if (price_list.hasOwnProperty(item.id)) {  // если данный предмет покупается торговцем
                new_inventory.push(item);
            } else {  // если предмета нет в этом списке, значит торговец его не покупает
                //console.warn('Данный предмет не покупается этим торговцем:', item)
            }
        }
        this.playerInv = new_inventory;

        new_inventory = [];
        // проходим по списку итемов торговца и ставим правильные цены продажи
        for (var i = 0 ; i < this.traderInv.length; i++) {
            var item = this.traderInv[i];
            if (price_list.hasOwnProperty(item.id)) {  // если данный предмет продаётся торговцем
                new_inventory.push(item);
            } else {  // если предмета нет в этом списке, значит торговец его не продаёт
                console.warn('Данный предмет не продаётмя этим торговцем:', item)
            }
        }
        this.traderInv = new_inventory;

        // todo: так сделано в changeItem методах. Возможно стоит внести в _reDrawItemList
        if (this.traderInvDiv) this.traderInvDiv.empty();
        if (this.playerInvDiv) this.playerInvDiv.empty();
        this._reDrawItemList(this.traderInvDiv, this.traderInv, this.traderInvCls);
        this._reDrawItemList(this.playerInvDiv, this.playerInv, this.playerInvCls);
    };

    TraderManager.prototype._reDrawItemList = function(parentDiv, itemList, dropCls) {
        // todo: по идее, перед перерисовкой итемов, нужно проверить чтобы parentDiv != null и очистить его .empty()
        for(var i = 0; i < itemList.length; i++) {
            var example = itemList[i];
            var itemDiv = $('<div class="mainTraderWindow-down-player-body-item ' + dropCls  + '" data-pos="' + i + '"></div>');
            var emptyItemDiv =
                    '<div class="mainTraderWindow-down-player-body-item-name">' + example.title + '</div>' +
                    '<div class="mainTraderWindow-down-player-body-item-picture-wrap">' +
                        '<div class="mainTraderWindow-down-player-body-item-picture"></div>' +
                    '</div>' +
                    '<div class="mainTraderWindow-down-player-body-item-count">' + example.count.toFixed(1) + '</div>';


            itemDiv.append(emptyItemDiv);

            itemDiv.find('.mainTraderWindow-down-player-body-item-picture')
                .css('background', 'transparent url(' + example.inv_icon_small + ') no-repeat 100% 100%');

            itemDiv.draggable({
                helper: 'clone',
                opacity: 0.8,
                revert: true,
                revertDuration: 0,
                zIndex: 1,
                appendTo: '#activeTownDiv'
            });

            parentDiv.append(itemDiv);
        }
    };

    TraderManager.prototype._clearPlayerInv = function() {
        this.playerInv = [];
        this.playerTable = [];
        if (this.playerInvDiv) {
            //this.playerInvDiv.droppable("destroy");
            //this.playerInvDiv.find('.mainTraderWindow-down-player-body-item').draggable("destroy");
            this.playerInvDiv.empty();
            this.playerInvDiv = null;
        }
        if (this.playerTableDiv) {
            //this.playerTableDiv.droppable("destroy");
            //this.playerTableDiv.find('.mainTraderWindow-down-player-body-item').draggable("destroy");
            this.playerTableDiv.empty();
            this.playerTableDiv = null;
        }
        this.calcPriceTables();
    };

    TraderManager.prototype._clearTraderInv = function() {
        this.traderInv = [];
        this.traderTable = [];
        if (this.traderInvDiv) {
            //this.traderInvDiv.droppable("destroy");
            //this.traderInvDiv.find('.mainTraderWindow-down-player-body-item').draggable("destroy");
            this.traderInvDiv.empty();
            this.traderInvDiv = null;
        }
        if (this.traderTableDiv) {
            //this.traderTableDiv.droppable("destroy");
            //this.traderTableDiv.find('.mainTraderWindow-down-player-body-item').draggable("destroy");
            this.traderTableDiv.empty();
            this.traderTableDiv = null;
        }
        this.calcPriceTables();
    };

    TraderManager.prototype.clear = function() {
        this._clearPlayerInv();
        this._clearTraderInv();
    };

    TraderManager.prototype.apply = function() {
        //console.log('TraderManager.prototype.apply');
        clientManager.sendTraderApply();
    };

    TraderManager.prototype.cancel = function() {
        //console.log('TraderManager.prototype.cancel');
        clientManager.sendTraderCancel();
    };

    TraderManager.prototype.getPlayerTable = function() {
//        console.log('TraderManager.prototype.getPlayerTable');
        var res = [];
        for (var i = 0; i < this.playerTable.length; i++)
            res.push(this.playerTable[i].id);
        return res;
    };

    TraderManager.prototype.getTraderTable = function() {
//        console.log('TraderManager.prototype.getTraderTable');
        var res = [];
        for (var i = 0; i < this.traderTable.length; i++)
            res.push(this.traderTable[i].id);
        return res;
    };

    TraderManager.prototype.setupTraderReplica = function(replica) {
//        console.log('TraderManager.prototype.setupTraderReplica');
        $('.mainTraderWindow-up-text').text(replica);
    };

    return TraderManager;
})();


var HangarManager = (function () {

    function HangarManager() {
        this.current_car = null;
    }

    HangarManager.prototype.update = function() {
        //console.log('HangarManager.prototype.update');
        this.clear();

        // Проверить если город
        if (!locationManager.in_location) {
            console.warn('Вёрстка города не найдена');
            return
        }

        // Отрисовать собственный счет
        $('#hangar-footer-balance').text(user.balance);
    };

    HangarManager.prototype.clear = function() {
        //console.log('HangarManager.prototype.clear');
    };

    HangarManager.prototype.apply = function() {
        //console.log('HangarManager.prototype.apply');
        if (this.current_car != null)
            clientManager.sendHangarCarChoice();
    };

    HangarManager.prototype.cancel = function() {
        //console.log('HangarManager.prototype.cancel');
    };

    return HangarManager;
})();


var ParkingManager = (function () {

    function ParkingManager() {
        this.current_car = null;
    }

    ParkingManager.prototype.update = function() {
        //console.log('ParkingManager.prototype.update');
        this.clear();

        // Проверить если город
        if (!locationManager.in_location) {
            console.warn('Вёрстка города не найдена');
            return
        }
    };

    ParkingManager.prototype.clear = function() {
        //console.log('ParkingManager.prototype.clear');
    };

    ParkingManager.prototype.apply = function() {
        //console.log('ParkingManager.prototype.apply');
        if (this.current_car != null)
            clientManager.sendParkingSelectCar();
    };

    ParkingManager.prototype.cancel = function() {
        //console.log('ParkingManager.prototype.cancel');
        clientManager.sendParkingLeaveCar();
    };

    return ParkingManager;
})();


var TrainerManager = (function () {

    function TrainerManager() {
        this.cur_level = 0;
        this.def_driving = 0;
        this.def_engineering = 0;
        this.def_leading = 0;
        this.def_masking = 0;
        this.def_shooting = 0;
        this.def_trading = 0;
        this.cur_driving = 0;
        this.cur_engineering = 0;
        this.cur_leading = 0;
        this.cur_masking = 0;
        this.cur_shooting = 0;
        this.cur_trading = 0;
        this.perks = {};

        this.perk_state_class_btn = {
            default: 'default',
            active: 'active',
            unactive: 'unactive',
            disable: 'disable'
        };
        this.str_for_remove_cls = 'default active unactive disable';

        this.perk_list_div = null;
    }

    TrainerManager.prototype._getFreeSkillPoints = function() {
        return this.cur_level - this.cur_driving - this.cur_engineering - this.cur_leading  -
               this.cur_masking - this.cur_shooting - this.cur_trading;
    };

    TrainerManager.prototype._getFreePerkPoints = function() {
        var res = 0;
        for (var key in this.perks)
            if (this.perks.hasOwnProperty(key))
                if ((this.perks[key].state == 'default') || (this.perks[key].state == 'active')) res++;
        return this.cur_level - res;
    };

    TrainerManager.prototype._getActivePerks = function() {
        var res = [];
        for (var key in this.perks)
            if (this.perks.hasOwnProperty(key))
                if (this.perks[key].state == 'active') res.push(this.perks[key]);
        return res;
    };

    TrainerManager.prototype.update = function(event) {
        //console.log('TrainerManager.prototype.update');
        this.clear();

        // Проверить если город
        if (!locationManager.in_location) {
            console.warn('Вёрстка города не найдена');
            return;
        }

        // Проверить, если ли тренер в вёрстке города
        this.perk_list_div = $('#townTrainerPerkList');
        if (! this.perk_list_div.length) {
            console.warn('Вёрстка тренера в городе не найдена');
            return;
        }

        this.cur_level = event.current_level;
        this.cur_driving = this.def_driving = event.driving;
        this.cur_engineering = this.def_engineering = event.engineering;
        this.cur_leading = this.def_leading = event.leading;
        this.cur_masking = this.def_masking = event.masking;
        this.cur_shooting = this.def_shooting = event.shooting;
        this.cur_trading = this.def_trading = event.trading;
        $('#trainer-skill-driving').text(this.cur_driving);
        $('#trainer-skill-engineering').text(this.cur_engineering);
        $('#trainer-skill-masking').text(this.cur_masking);
        $('#trainer-skill-leading').text(this.cur_leading);
        $('#trainer-skill-shooting').text(this.cur_shooting);
        $('#trainer-skill-trading').text(this.cur_trading);
        $('#trainer-skill-free').text(this._getFreeSkillPoints());

        var perk = {};
        for (var i = 0; i < event.perks.length; i++) {
            perk = {
                title: event.perks[i].perk.title,
                description: event.perks[i].perk.description,
                id: event.perks[i].perk.id,
                node_hash: event.perks[i].perk.node_hash,
                req_level: event.perks[i].perk.level_req,
                req_driving: event.perks[i].perk.driving_req,
                req_engineering: event.perks[i].perk.engineering_req,
                req_leading: event.perks[i].perk.leading_req,
                req_masking: event.perks[i].perk.masking_req,
                req_shooting: event.perks[i].perk.shooting_req,
                req_trading: event.perks[i].perk.trading_req,
                perk_req: event.perks[i].perk_req
            };
            if (event.perks[i].active) perk.state = 'default';
            else perk.state = 'unactive';
            this.perks[perk.node_hash] = perk;
        }

        // Вёрстка перков, без вёрстки статусов
        // упорядочить (сначала default, затем unactive и в конце disabled - написать одим метод)

        this.refreshPerkState(true);

        var index_of_backlight = 0; // todo: учитывать его при добавлении подсветки дива с названием
        index_of_backlight = this.append_div_perk('default', index_of_backlight);
        index_of_backlight = this.append_div_perk('unactive', index_of_backlight);
        index_of_backlight = this.append_div_perk('disable', index_of_backlight);

        // после отрисовки повесить клики
        this.perk_list_div.find('.trainer-perk-item-checkbox').click(function (event) {
            var jq_this = $(this).parent();
            locationManager.trainer.setPerk(jq_this.data('node_hash'));
        });

        this.refreshPerkState();
    };

    TrainerManager.prototype.append_div_perk = function (state, index_of_backlight) {
        //console.log('TrainerManager.prototype.append_div_perk', state);
        for (var key in this.perks)
            if (this.perks.hasOwnProperty(key)) {
                var p = this.perks[key];
                if (p.state == state) {
                    var main_perk_div = $('<div class="trainer-perk-item-main" ' +
                    'data-node_hash="' +
                    p.node_hash +
                    '"><div class="trainer-perk-item-caption ' +
                        (index_of_backlight % 2 ? 'trainer-dark-back' : 'trainer-light-back')
                        +'">' +
                    p.title +
                    '</div><div class="trainer-perk-item-checkbox"></div></div>');
                    this.perk_list_div.append(main_perk_div);
                    index_of_backlight++;
                }
            }
        return index_of_backlight;
    };

    TrainerManager.prototype.clear = function() {
        //console.log('TrainerManager.prototype.clear');
        this.cur_level = 0;
        this.def_driving = 0;
        this.def_engineering = 0;
        this.def_leading = 0;
        this.def_masking = 0;
        this.def_shooting = 0;
        this.def_trading = 0;
        this.cur_driving = 0;
        this.cur_engineering = 0;
        this.cur_leading = 0;
        this.cur_masking = 0;
        this.cur_shooting = 0;
        this.cur_trading = 0;
        this.perks = {};

        // Очитска вёрстки
        if (this.perk_list_div && this.perk_list_div.length)
            this.perk_list_div.empty();
    };

    TrainerManager.prototype.refreshPerkState = function(without_html) {
        var enable;
        for (var key in this.perks)
            if (this.perks.hasOwnProperty(key)) {
                var perk = this.perks[key];
                if (perk.state == 'default') continue;

                enable = (perk.req_level <= this.cur_level) &&
                         (perk.req_driving <= this.cur_driving) &&
                         (perk.req_engineering <= this.cur_engineering) &&
                         (perk.req_leading <= this.cur_leading) &&
                         (perk.req_masking <= this.cur_masking) &&
                         (perk.req_shooting <= this.cur_shooting) &&
                         (perk.req_trading <= this.cur_trading);

                for (var j = 0; enable && (j < perk.perk_req.length); j++)
                    if ((this.perks[perk.perk_req[j]].state == 'unactive') ||
                        (this.perks[perk.perk_req[j]].state == 'disable')) enable = false;

                if (enable) {
                    if (perk.state == 'disable') perk.state = 'unactive';
                }
                else
                    perk.state = 'disable';
            }

        if (without_html) return;

        $('#trainer-perk-free').text(this._getFreePerkPoints());
        // обновить статусы всех перков
        // проходим по всем потомкам this.perk_list_div, в дате зашит node_hash перка, обновляем
        this.perk_list_div.children().each(function() {
            var node_hash = $(this).data('node_hash');
            if (node_hash) {
                var p_check = $(this).find('.trainer-perk-item-checkbox').first();
                var state = locationManager.trainer.perk_state_class_btn[locationManager.trainer.perks[node_hash].state];
                p_check.removeClass(locationManager.trainer.str_for_remove_cls);
                p_check.addClass(state);
                $(this).removeClass(locationManager.trainer.str_for_remove_cls);
                $(this).addClass(state);

            }
        });
    };

    TrainerManager.prototype.setSkill = function(skill_name, d_val) {
        var attr_name = 'cur_' + skill_name;
        var def_attr_name = 'def_' + skill_name;
        if (this.hasOwnProperty(attr_name)) {
            if ((d_val > this._getFreeSkillPoints()) || ((this[attr_name] + d_val) < this[def_attr_name])) return;
            this[attr_name] += d_val;
            $('#trainer-skill-' + skill_name).text(this[attr_name]);
            $('#trainer-skill-free').text(this._getFreeSkillPoints());
            this.refreshPerkState();
        }
    };

    TrainerManager.prototype.setPerk = function(perk_node_hash) {
        //console.log('TrainerManager.prototype.setPerk', perk_node_hash);
        if (this.perks.hasOwnProperty(perk_node_hash)) {
            var state = this.perks[perk_node_hash].state;
            if (state != 'active' && state != 'unactive') return;
            state = state == 'active' ? 'unactive' : 'active';
            if ((state == 'active') && (this._getFreePerkPoints() <= 0))  return;
            this.perks[perk_node_hash].state = state;
            this.refreshPerkState();
        }
    };

    TrainerManager.prototype.apply = function() {
        //console.log('TrainerManager.prototype.apply');
        // Установить все навыки
        clientManager.sendSetSkillState(this.cur_driving, this.cur_shooting, this.cur_masking, this.cur_leading,
            this.cur_trading, this.cur_engineering);

        // Установить перки в правильном порядке
        var set_perks = this._getActivePerks();
        var sort_perks = [];
        while (set_perks.length > 0) {
            var i;
            var can_add = false;
            for (i = 0; !can_add && (i < set_perks.length); i++) {
                can_add = true;
                for (var j = 0; can_add && (j < set_perks[i].perk_req.length); j++)
                    can_add = sort_perks.indexOf(set_perks[i].perk_req[j]) >= 0;
            }
            if (i != 0) {
                sort_perks.push(set_perks[i-1].node_hash);
                set_perks.splice(i-1, 1);
            } else console.error('Алгоритм выбора перков в правильном порядке имеет ошибку. Проверить!')
        }

        for (var j = 0; j < sort_perks.length; j++)
            clientManager.sendActivatePerk(sort_perks[j]);
    };

    TrainerManager.prototype.cancel = function() {
        //console.log('TrainerManager.prototype.cancel');
        clientManager.sendGetRPGInfo();
    };

    TrainerManager.prototype.resetSkills = function() {
        //console.log('TrainerManager.prototype.resetSkills');
        clientManager.sendResetSkills();
    };

    TrainerManager.prototype.resetPerks = function() {
        //console.log('TrainerManager.prototype.resetPerks');
        clientManager.sendResetPerks();
    };

    return TrainerManager;
})();


var locationManager = new LocationManager();