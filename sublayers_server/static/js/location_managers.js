var LocationManager = (function () {

    function LocationManager() {
        this.in_location = false;

        this.location_uid = null;
        this.trader_uid = null;

        this.armorer = new ArmorerManager();
        this.trader = new TraderManager();
        this.nucoil = new NucoilManager();
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

    return NucoilManager;
})();


var ArmorerManager = (function () {

    function ArmorerManager() {
        this.items = {};
        this.inv_show_div = null;
        this.armorer_slots = [];
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

    ArmorerManager.prototype.update = function(armorer_slots) {
        //console.log('ArmorerManager.prototype.update');
        if (armorer_slots) this.armorer_slots = armorer_slots;

        this.clear();
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
                direction: 'front'
            };
            item = inventory.getItem(i);
            item_rec.position = i;
            if (item) {
                // todo: сделать фильтрацию итемов
                this._addEmptyInventorySlot(i);
                item_rec.example = item.example;
                this.items[i] = item_rec;
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
            var item_rec = {
                example: this.armorer_slots[i].value,
                position: this.armorer_slots[i].name,
                direction: 'front'
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
        this.activeSlot = null;
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
                var itemDivTop = $('<div class="armorer-car-slot-picture"></div>');
                var itemDivSide = $('<div class="armorer-car-slot-picture"></div>');

                itemDivTop.css('background', 'transparent url(' + item.example.inv_icon_small + ') no-repeat 100% 100%');
                itemDivSide.css('background', 'transparent url(' + item.example.inv_icon_small + ') no-repeat 100% 100%');

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
            //itemWrapDiv.find('.npcInventory-item').draggable("destroy");
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
        console.log('ArmorerManager.prototype.changeItem', src, dest);
        var item = this.items[src];
        this.items[src] = this.items[dest];
        this.items[dest] = item;
        this.reDrawItem(src);
        this.reDrawItem(dest);
        if (dest.toString().indexOf('slot') >= 0)
            this.setActiveSlot(dest);
        else
            this.setActiveSlot(null);
    };

    ArmorerManager.prototype.setActiveSlot = function(slotName) {
        //console.log('ArmorerManager.prototype.setActiveSlot');

        // Гасим все лепестки виджета и все слоты
        dropSectorActive();
        dropSlotActive();

        // Устанавливаем новый активный слот и пытаемся получить соостветствующий итем
        if (this.activeSlot == slotName) this.activeSlot = null;
        else this.activeSlot = slotName;
        if (! this.items.hasOwnProperty(this.activeSlot)) return;
        var item_rec = this.items[this.activeSlot];

        // Подсвечиваем слот и если есть экземпляр то устанавливаем текущее направление
        setSlotActive(this.activeSlot);
        if (item_rec.example)
            setSectorActive(item_rec.direction);
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
        if (item_rec.example)
            setSectorActive(item_rec.direction);
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
    }

    TraderManager.prototype.changeItem = function(pos, srcList, destList, srcDiv, destDiv, srcCls, destCls) {
        destDiv.empty();
        srcDiv.empty();

        destList.push(srcList[pos]);
        srcList.splice(pos, 1);

        this._reDrawItemList(destDiv, destList, destCls);
        this._reDrawItemList(srcDiv, srcList, srcCls);

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

        // Добавить итемы инвентаря своего агента
        var inventory = inventoryList.getInventory(user.ID);
        if (! inventory) {
            console.warn('Ивентарь агента (' + user.ID + ') не найден');
            return
        }
        for (var i = 0; i < inventory.max_size; i++) {
            item = inventory.getItem(i);
            if (item)
                this.playerInv.push(item.example);
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
                self.changeItem(item_pos, self.playerTable, self.playerInv, self.playerTableDiv,
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
                self.changeItem(item_pos, self.playerInv, self.playerTable, self.playerInvDiv,
                                self.playerTableDiv, self.playerInvCls, self.playerTableCls);
            }
        });

        // Отрисовать верстку
        this._reDrawItemList(this.playerInvDiv, this.playerInv, this.playerInvCls);
    };

    TraderManager.prototype.updateTraderInv = function() {
        //console.log('TraderManager.prototype.updatePlayerInv');
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
            if (item)
                this.traderInv.push(item.example);
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
                self.changeItem(item_pos, self.traderTable, self.traderInv, self.traderTableDiv,
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
                self.changeItem(item_pos, self.traderInv, self.traderTable, self.traderInvDiv,
                    self.traderTableDiv, self.traderInvCls, self.traderTableCls);
            }
        });

        // Отрисовать верстку
        this._reDrawItemList(this.traderInvDiv, this.traderInv, this.traderInvCls);
    };

    TraderManager.prototype._reDrawItemList = function(parentDiv, itemList, dropCls) {
        for(var i = 0; i < itemList.length; i++) {
            var example = itemList[i];
            var itemDiv = $('<div class="mainTraderWindow-down-player-body-item ' + dropCls  + '" data-pos="' + i + '"></div>');
            var emptyItemDiv =
                    '<div class="mainTraderWindow-down-player-body-item-name">' + example.title + '</div>' +
                    '<div class="mainTraderWindow-down-player-body-item-picture-wrap">' +
                        '<div class="mainTraderWindow-down-player-body-item-picture"></div>' +
                    '</div>';

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
        this.playerInvDiv = null;
        this.playerTableDiv = null;
    };

    TraderManager.prototype._clearTraderInv = function() {
        this.traderInv = [];
        this.traderTable = [];
        this.traderInvDiv = null;
        this.traderTableDiv = null;
    };

    TraderManager.prototype.clear = function() {
        this._clearPlayerInv();
        this._clearTraderInv();
    };

    return TraderManager;
})();


var locationManager = new LocationManager();