var LocationManager = (function () {

    function LocationManager() {
        this.currentNPC = null;
        this.in_location = false;

        this.location_uid = null;
        this.trader_uid = null;

        this.armorer = new ArmorerManager();
        this.trader = new TraderManager();
        this.nucoil = new NucoilManager();
        this.hangar = new HangarManager();
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
        clientManager.sendCreatePrivateChat($(event.target).data('visitor'))
    };

    LocationVisitorsManager.prototype.add_visitor_record = function (visitor) {
        var visitorDiv = $('<div id="visitorRecord_' + visitor + '" class="VMG-message-message sublayers-clickable visitorRecord">' + visitor + '</div>');
        visitorDiv.data('visitor', visitor);
        visitorDiv.click(this.visitor_record_click);
        $('#visitorList').append(visitorDiv);
    };

    LocationVisitorsManager.prototype.add_visitor = function (visitor) {
        //console.log('LocationVisitorsManager.prototype.add_visitor');
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
    }

    ArmorerManager.prototype._addEmptyInventorySlot = function(position) {
        var itemWrapDiv = $('<div class="npcInventory-itemWrap armorer-itemWrap-' + position +
                            '" data-pos="' + position + '"></div>');
        itemWrapDiv.droppable({
            greedy: true,
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
        //console.log(this.armorer_slots_flags);
    };

    ArmorerManager.prototype.exportSlotState1 = function() {
        var result = [];
        for (var slot_name in this.items)
            if (this.items.hasOwnProperty(slot_name) && (slot_name.toString().indexOf('slot') >= 0))
                result.push(this.items[slot_name]);
        return result;
    };

    ArmorerManager.prototype.exportSlotState = function() {
        var result = {};
        for (var slot_name in this.items)
            if (this.items.hasOwnProperty(slot_name) && (slot_name.toString().indexOf('slot') >= 0))
                result[slot_name] = this.items[slot_name];
        return result;
    };

    ArmorerManager.prototype.update = function(armorer_slots, armorer_slots_flags) {
        //console.log('ArmorerManager.prototype.update');
        this.clear();

        if (armorer_slots) this.armorer_slots = armorer_slots;
        if (armorer_slots_flags) this._update_armorer_slots_flags(armorer_slots_flags);

        var self = this;
        var item;

        // Проверить если город
        this.inv_show_div = $('#activeTownDiv').find('.armorer-footer').find('.npcInventory-inventory').first();
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
        resizeArmorerInventory();

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
            if (item.example) {
                var itemImgTop = item.example['armorer_top_' + item.direction];
                var itemImgSide = item.example['armorer_side_' + item.direction];


                var itemDivTop = $('<div class="armorer-car-slot-picture"><img src="' + itemImgTop + '" class="' + 'armorer_top_'  + item.direction + '"></div>');
                var itemDivSide = $('<div class="armorer-car-slot-picture"><img src="' + itemImgSide+ '" class="' + 'armorer_side_'  + item.direction + '"></div>');

                itemDivTop.data('pos', position);
                itemDivSide.data('pos', position);

                itemDivTop.draggable({
                    helper: 'clone',
                    opacity: 0.8,
                    revert: true,
                    revertDuration: 0,
                    zIndex: 1,
                    appendTo: '#activeTownDiv'
                });
                itemDivSide.draggable({
                    helper: 'clone',
                    opacity: 0.8,
                    revert: true,
                    revertDuration: 0,
                    zIndex: 1,
                    appendTo: '#activeTownDiv'
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
                    helper: 'clone',
                    cursorAt: {
                        left: 60,
                        top: 42
                    },
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
                console.warn('Данный предмет не покупается этим торговцем:', item)
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


var locationManager = new LocationManager();