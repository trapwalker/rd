var LocationTraderNPC = (function (_super) {
    __extends(LocationTraderNPC, _super);

    function LocationTraderNPC(npc_rec, jq_town_div, building_name) {
        _super.call(this, npc_rec, jq_town_div, building_name);

        this.playerInvCls = "player-inventory-droppable-item";
        this.playerTableCls = "player-table-droppable-item";
        this.traderInvCls = "trader-inventory-droppable-item";
        this.traderTableCls = "trader-table-droppable-item";

        this.trader_assortment = [];
        this.agent_assortment = [];

        this.playerInv = [];
        this.playerTable = [];
        this.playerInvDiv = null;
        this.playerTableDiv = null;

        this.traderInv = [];
        this.traderTable = [];
        this.traderInvDiv = null;
        this.traderTableDiv = null;

        this.price_list = {};

        this.filters = this.create_filters();

        this.current_trader_filter_index = 0;
        this.jq_trader_filter = this.jq_main_div.find('.trader-filter-label').first();
        this.current_player_filter_index = 0;
        this.jq_player_filter = this.jq_main_div.find('.player-filter-label').first();

        this.update();
    }

    LocationTraderNPC.prototype._clearPlayerInv = function() {
        //console.log('LocationTraderNPC.prototype._clearPlayerInv');
        if (this.playerInvDiv) {
            this.playerInvDiv.find('.npcInventory-itemWrap').remove();
            this.playerInvDiv = null;
        }
        if (this.playerTableDiv) {
            this.playerTableDiv.find('.npcInventory-itemWrap').remove();
            this.playerTableDiv = null;
        }
        this.calcPriceTables();
    };

    LocationTraderNPC.prototype._clearTraderInv = function() {
        if (this.traderInvDiv) {
            this.traderInvDiv.find('.npcInventory-itemWrap').remove();
            this.traderInvDiv = null;
        }
        if (this.traderTableDiv) {
            this.traderTableDiv.find('.npcInventory-itemWrap').remove();
            this.traderTableDiv = null;
        }
        this.calcPriceTables();
    };

    LocationTraderNPC.prototype._search_in_assertment = function(assertment, item) {
        for (var i = 0; i < assertment.length; i++)
            if (item.uid == assertment[i].item.uid)
                return i;
        return -1;
    };

    LocationTraderNPC.prototype.updatePlayerInv = function() {
        //console.assert(false, 'LocationTraderNPC.prototype.updatePlayerInv', this.agent_assortment);
        this._clearPlayerInv();
        var self = this;
        var item;

        // Отрисовать собственный счет
        clientManager._viewAgentBalance(this.jq_main_div);

        // Обновить столик игрока
        var temp_player_table = [];
        for (var i = 0; i < this.playerTable.length; i++) {
            item = this.playerTable[i];
            var assertment_index = this._search_in_assertment(this.agent_assortment, item);
            if ((assertment_index != -1) && (item.count <= this.agent_assortment[assertment_index].count)) {
                temp_player_table.push(item);
                item.price = this.agent_assortment[assertment_index].price;
                this.agent_assortment[assertment_index].__start_table_count = item.count;
            }
        }
        this.playerTable = temp_player_table;

        // Формирование инвентаря игрока
        this.playerInv = [];
        for (var i = 0; i < this.agent_assortment.length; i++) {
            item = this.agent_assortment[i].item;
            item.count = this.agent_assortment[i].count -
                (this.agent_assortment[i].__start_table_count ? this.agent_assortment[i].__start_table_count : 0);
            if (item.count > 0) {
                this.playerInv.push(item);
                item.price = this.agent_assortment[i].price;
            }
        }

        // Установить дивы инвентарей
        this.playerInvDiv = this.jq_main_div.find('.trader-center-area-player-body').first();
        this.playerTableDiv = this.jq_main_div.find('.trader-center-area-player-exchange-body').first();

        // Повесить дропаблы
        this.playerInvDiv.droppable({
            greedy: true,
            accept: function(target) { return target.hasClass(self.playerTableCls); },
            drop: function(event, ui) {
                var item_pos = ui.draggable.data('pos');
                var item = self.playerTable[item_pos];
                if (!item) return;
                if (event.shiftKey)
                    modalWindow.modalItemDivisionShow({
                        item: item,
                        max_count: item.count,
                        callback_ok:
                            function(count) {
                                self.changeItemDropable(item_pos, count, self.playerTable, self.playerInv, self.playerTableDiv,
                                                        self.playerInvDiv , self.playerTableCls, self.playerInvCls);
                            }
                    });
                else
                    self.changeItemDropable(item_pos, item.count, self.playerTable, self.playerInv, self.playerTableDiv,
                                            self.playerInvDiv , self.playerTableCls, self.playerInvCls);
            }
        });

        this.playerTableDiv.droppable({
            greedy: true,
            accept: function(target) { return target.hasClass(self.playerInvCls); },
            drop: function(event, ui) {
                var item_pos = ui.draggable.data('pos');
                var item = self.playerInv[item_pos];
                if (!item) return;
                if (event.shiftKey)
                    modalWindow.modalItemDivisionShow({
                        item: item,
                        max_count: item.count,
                        callback_ok:
                            function(count) {
                                self.changeItemDropable(item_pos, count, self.playerInv, self.playerTable, self.playerInvDiv,
                                                        self.playerTableDiv, self.playerInvCls, self.playerTableCls);
                            }
                    });
                else
                    self.changeItemDropable(item_pos, item.count, self.playerInv, self.playerTable, self.playerInvDiv,
                                        self.playerTableDiv, self.playerInvCls, self.playerTableCls);
            }
        });

        // Отрисовать верстку
        this._reDrawItemList(this.playerInvDiv, this.playerInv, this.playerInvCls);
        this._reDrawItemList(this.playerTableDiv, this.playerTable, this.playerTableCls);

        // Установка фильтров
        if (this.filters) {
            this.jq_player_filter.text(this.filters[this.current_player_filter_index].name);
        }
    };

    LocationTraderNPC.prototype.updateTraderInv = function() {
        //console.log('LocationTraderNPC.prototype.updateTraderInv');
        this._clearTraderInv();
        var self = this;
        var item;

        // Обновить столик торговца
        var temp_trader_table = [];
        for (var i = 0; i < this.traderTable.length; i++) {
            item = this.traderTable[i];
            var assertment_index = this._search_in_assertment(this.trader_assortment, item);
            if ((assertment_index != -1) && ((item.count <= this.trader_assortment[assertment_index].count) ||
                this.trader_assortment[assertment_index].infinity)) {
                temp_trader_table.push(item);
                item.price = this.trader_assortment[assertment_index].price;
                this.trader_assortment[assertment_index].__start_table_count = item.count;
            }
        }
        this.traderTable = temp_trader_table;

        // Формирование инвентаря торговца
        this.traderInv = [];
        for (var i = 0; i < this.trader_assortment.length; i++) {
            //this.trader_assortment[i].count;
            item = this.trader_assortment[i].item;
            item.count = this.trader_assortment[i].count -
                (this.trader_assortment[i].__start_table_count ? this.trader_assortment[i].__start_table_count : 0);
            if ((item.count > 0) || this.trader_assortment[i].infinity) {
                item._trader_infinity = this.trader_assortment[i].infinity;
                item.price = this.trader_assortment[i].price;
                this.traderInv.push(item);
            }
        }

        // Установить дивы инвентарей
        this.traderInvDiv = this.jq_main_div.find('.trader-center-area-trader-body').first();
        this.traderTableDiv = this.jq_main_div.find('.trader-center-area-trader-exchange-body').first();

        // Повесить дропаблы
        this.traderInvDiv.droppable({
            greedy: true,
            accept: function(target) { return target.hasClass(self.traderTableCls); },
            drop: function(event, ui) {
                var item_pos = ui.draggable.data('pos');
                var item = self.traderTable[item_pos];
                if (!item) return;

                modalWindow.modalItemDivisionShow({
                    item: item,
                    max_count: item.count,
                    callback_ok:
                        function(count) {
                            self.changeItemDropable(item_pos, count, self.traderTable, self.traderInv, self.traderTableDiv,
                                                    self.traderInvDiv , self.traderTableCls, self.traderInvCls);
                        }
                });
            }
        });

        this.traderTableDiv.droppable({
            greedy: true,
            accept: function(target) { return target.hasClass(self.traderInvCls); },
            drop: function(event, ui) {
                var item_pos = ui.draggable.data('pos');
                var item = self.traderInv[item_pos];
                if (!item) return;

                // Выбираем минимум между "на сколько хватит денег" и "количеством товара у торговца"
                var max_count = Math.floor(user.balance / (item.price.sale / item.stack_size));
                if (! item._trader_infinity) {
                    max_count = Math.min(max_count, item.count)
                }

                modalWindow.modalItemDivisionShow({
                    item: item,
                    max_count: max_count,
                    callback_ok:
                        function(count) {
                            self.changeItemDropable(item_pos, count, self.traderInv, self.traderTable, self.traderInvDiv,
                                                    self.traderTableDiv, self.traderInvCls, self.traderTableCls);
                        }
                });
            }
        });

        // Отрисовать верстку
        this._reDrawItemList(this.traderInvDiv, this.traderInv, this.traderInvCls);
        this._reDrawItemList(this.traderTableDiv, this.traderTable, this.traderTableCls);

        // Установка фильтров
        if (this.filters) {
            this.jq_trader_filter.text(this.filters[this.current_trader_filter_index].name);
        }
    };

    LocationTraderNPC.prototype._reDrawItemList = function(parentDiv, itemList, dropCls) {
        var self = this;
        var filter = null;
        if (this.filters) {
            if (parentDiv == this.traderInvDiv) filter = this.filters[this.current_trader_filter_index];
            if (parentDiv == this.playerInvDiv) filter = this.filters[this.current_player_filter_index];
        }

        for(var i = 0; i < itemList.length; i++) {
            var example = itemList[i];
            if (filter && !filter.filter(example)) continue;  // фильтрация!
            var count_str = example._trader_infinity ? '---' : example.count.toFixed(0);  // '&infin;'
            var itemDiv = $(
                '<div class="npcInventory-itemWrap ' + dropCls + '" data-pos="' + i + '">' +
                    '<div class="npcInventory-item" data-img_link="' + example.inv_icon_mid + '">' +
                        '<div class="npcInventory-pictureWrap town-interlacing" ' + 'style="background: url(' + example.inv_icon_mid + ') no-repeat center"></div>' +
                        '<div class="npcInventory-text name">' + example.title + '</div>' +
                        '<div class="npcInventory-text count">' + count_str + '</div>' +
                        '<div class="npcInventory-text price">' + example.price.base + ' Nc</div>' +
                    '</div>' +
                '</div>'
            );

            itemDiv.draggable({
                helper: function(event) {
                    var img_link = $(event.target).parent().data('img_link');
                    return $('<img width="130" height="70" src="' + img_link + '">')
                },
                opacity: 0.8,
                revert: true,
                revertDuration: 0,
                zIndex: 1,
                appendTo: '#location-content',
                start: LocationPlace.start_drag_handler,
                drag: LocationPlace.drag_handler
            });

            itemDiv.mouseenter({example: itemList[i]}, function(event) {
                locationManager.panel_right.show({text: event.data.example.description,
                                                  title: event.data.example.title}, 'description');
            });
            itemDiv.mouseleave({}, function(event) { locationManager.panel_right.show({text: '', title: ''}, 'description'); });

            itemDiv.click({}, function(event) {
                var src_list;
                if (dropCls == self.playerInvCls) src_list = self.playerInv;
                if (dropCls == self.playerTableCls) src_list = self.playerTable;
                if (dropCls == self.traderInvCls) src_list = self.traderInv;
                if (dropCls == self.traderTableCls) src_list = self.traderTable;

                var item_pos = $(this).data('pos');
                var item = src_list[item_pos];
                var count = (item.count > 0) ? count = Math.min(item.count, item.stack_size) : count = item.stack_size;

                if (dropCls == self.playerInvCls)
                    self.changeItemDropable(item_pos, count, self.playerInv, self.playerTable, self.playerInvDiv,
                        self.playerTableDiv, self.playerInvCls, self.playerTableCls);
                if (dropCls == self.playerTableCls)
                    self.changeItemDropable(item_pos, count, self.playerTable, self.playerInv, self.playerTableDiv,
                        self.playerInvDiv, self.playerTableCls, self.playerInvCls);
                if (dropCls == self.traderInvCls)
                    self.changeItemDropable(item_pos, count, self.traderInv, self.traderTable, self.traderInvDiv,
                        self.traderTableDiv, self.traderInvCls, self.traderTableCls);
                if (dropCls == self.traderTableCls)
                    self.changeItemDropable(item_pos, count, self.traderTable, self.traderInv, self.traderTableDiv,
                        self.traderInvDiv, self.traderTableCls, self.traderInvCls);
            });
            
            parentDiv.append(itemDiv);
        }
    };

    LocationTraderNPC.prototype.calcPriceTables = function() {
        var i;
        var price_player = 0;
        var price_trader = 0;
        for (i = 0; i < this.playerTable.length; i++)
            price_player += this.playerTable[i].count * this.playerTable[i].price.buy / this.playerTable[i].stack_size;

        for (i = 0; i < this.traderTable.length; i++)
            price_trader += this.traderTable[i].count * this.traderTable[i].price.sale / this.traderTable[i].stack_size;

        price_player = Math.floor(price_player);
        price_trader = Math.ceil(price_trader);

        this.jq_main_div.find('.trader-player-exchange-total').text(price_trader + 'NC');
        this.jq_main_div.find('.trader-trader-exchange-total').text(price_player + 'NC');

        // Вызвать обновление teachingManager
        teachingManager.redraw();
    };

    LocationTraderNPC.prototype.changeItemDropable = function(pos, count, srcList, destList, srcDiv, destDiv, srcCls, destCls) {
        var item = srcList[pos];
        if (!item || ((item.count < count) && !item._trader_infinity)) return;

        destDiv.find('.npcInventory-itemWrap').remove();
        srcDiv.find('.npcInventory-itemWrap').remove();

        item.count -= count;
        if (item.count == 0)
            srcList.splice(pos, 1);

        var item_index = -1;
        for (var i = 0; i < destList.length && item_index == -1; i++)
            if (item.uid == destList[i].uid)
                item_index = i;

        if (item_index == -1) {
            item = cloneObject(item);
            item.count = count;
            item._trader_infinity = false;
            destList.push(item);
        }
        else
            destList[item_index].count += count;

        this._reDrawItemList(destDiv, destList, destCls);
        this._reDrawItemList(srcDiv, srcList, srcCls);

        this.calcPriceTables();
    };

    LocationTraderNPC.prototype.updatePrice = function(event) {
        //console.log('TraderManager.prototype.updatePrice', event.trader_assortment);
        if (event.trader_assortment) this.trader_assortment = event.trader_assortment;
        if (event.agent_assortment) this.agent_assortment = event.agent_assortment;
        this.updateTraderInv();
        this.updatePlayerInv();
        this.calcPriceTables();
    };

    LocationTraderNPC.prototype.clear_agent_assortment = function() {
        this.agent_assortment = [];
        this.update();
    };

    LocationTraderNPC.prototype.clear_assortment = function() {
        var i;
        this.playerTable = [];
        this.traderTable = [];
        for (i = 0; i < this.agent_assortment.length; i++)
            this.agent_assortment[i].__start_table_count = 0;
        for (i = 0; i < this.trader_assortment.length; i++)
            this.trader_assortment[i].__start_table_count = 0;
        this.update();
    };

    LocationTraderNPC.prototype.apply = function() {
        //console.log('TraderManager.prototype.apply');
        var res = {
            npc_node_hash: this.npc_rec.node_hash
        };
        if (this.traderTable.length == 0 && this.playerTable.length == 0)
            return;
        res.player_table = [];
        for (var i = 0; i < this.playerTable.length; i++)
            res.player_table.push({
                uid: this.playerTable[i].uid,
                count: this.playerTable[i].count
            });
        res.trader_table = [];
        for (var i = 0; i < this.traderTable.length; i++)
            res.trader_table.push({
                uid: this.traderTable[i].uid,
                count: this.traderTable[i].count
            });
        clientManager.sendTraderApply(res);
    };

    LocationTraderNPC.prototype.cancel = function() {
        //console.log('TraderManager.prototype.cancel');
        this.clear_assortment();
    };

    LocationTraderNPC.prototype.update = function(data) {
        //console.log('LocationTraderNPC.prototype.update');
        this.updatePlayerInv();
        this.updateTraderInv();
        _super.prototype.update.call(this, data);
    };

    LocationTraderNPC.prototype.get_self_info = function () {
        clientManager.sendGetTraderInfo(this);
    };

    LocationTraderNPC.prototype.set_buttons = function () {
        //console.log('LocationParkingNPC.prototype.set_buttons', this.cars_list.length);
        if (!locationManager.isActivePlace(this)) return;
        locationManager.setBtnState(1, 'Подтвердить</br>сделку', true);
        locationManager.setBtnState(2, '</br>Отмена', true);
        locationManager.setBtnState(3, '</br>Назад', true);
        locationManager.setBtnState(4, '</br>Выход', true);
    };

    LocationTraderNPC.prototype.set_panels = function () {
        if (!locationManager.isActivePlace(this)) return;
        _super.prototype.set_panels.call(this);
        locationManager.panel_left.show({transactions: this.transactions}, 'npc_transaction_info');
        locationManager.panel_right.show({text: '', title: ''}, 'description');
    };

    LocationTraderNPC.prototype.clickBtn = function (btnIndex) {
        //console.log('LocationHangarNPC.prototype.clickBtn', btnIndex);
        switch (btnIndex) {
            case '1':
                this.apply();
                break;
            case '2':
                this.cancel();
                break;
            default:
                _super.prototype.clickBtn.call(this, btnIndex);
        }
    };

    LocationTraderNPC.prototype.filter_apply = function (type, filter) {
        //console.log('LocationTraderNPC.prototype.filter_apply', filter);
        this[type+ 'InvDiv'].find('.npcInventory-itemWrap').remove();
        this._reDrawItemList(this[type+ 'InvDiv'], this[type+ 'Inv'], this[type+ 'InvCls']);
        this['jq_' + type + '_filter'].text(filter.name);

    };

    LocationTraderNPC.prototype.create_filters = function () {
        //console.log('LocationTraderNPC.prototype.create_filters');
        // Вешаем эвенты на стрелочки
        this.jq_main_div.find('.trader-filter-change-arrow').click(this.filter_click_arrow.bind(this));
        return [
            new TraderAssortmentFilter('Все'),
            new TraderAssortmentFilterTags('Боеприпасы', ['ammo']),
            new TraderAssortmentFilterTags('Оружие', ['armorer']),
            new TraderAssortmentFilterTags('Тюнер', ['tuner']),
            new TraderAssortmentFilterTags('Механик', ['mechanic'])
        ];
    };

    LocationTraderNPC.prototype.filter_click_arrow = function (event) {
        //console.log('LocationTraderNPC.prototype.filter_click_arrow', event);
        if (this.filters) {
            var target_inv = $(event.currentTarget).data('target_inv');
            var d_value = $(event.currentTarget).data('d_val');
            var str_name_of_index = 'current_' + target_inv + '_filter_index';
            var new_filter_value = this[str_name_of_index] + d_value;
            new_filter_value = new_filter_value < 0 ? this.filters.length + new_filter_value : new_filter_value;
            this[str_name_of_index] = (new_filter_value) % this.filters.length;
            var new_filter = this.filters[this[str_name_of_index]];
            this.filter_apply(target_inv, new_filter);
        }
    };

    return LocationTraderNPC;
})(LocationPlaceNPC);


var LocationBarmanNPC = (function (_super) {
    __extends(LocationBarmanNPC, _super);

    function LocationBarmanNPC(npc_rec, jq_town_div, building_name) {
        _super.call(this, npc_rec, jq_town_div, building_name);
        this.jq_main_div.find('.trader-center-player-table-label').text('Ваши квесты:');
        this.jq_main_div.find('.trader-center-trader-table-label').text('Квесты на продажу:');
    }

    LocationBarmanNPC.prototype.get_self_info = function () {
        //console.log('LocationBarmanNPC.prototype.get_self_info');
    };

    LocationBarmanNPC.prototype.apply = function() {
        //console.log('LocationBarmanNPC.prototype.apply');
    };

    LocationBarmanNPC.prototype.create_filters = function () {};

    return LocationBarmanNPC;
})(LocationTraderNPC);


var TraderAssortmentFilter = (function () {
    function TraderAssortmentFilter(name) {
        this.name = name;
    }
    TraderAssortmentFilter.prototype.filter = function (example) {
        return true;
    };

    return TraderAssortmentFilter;
})();


var TraderAssortmentFilterTags = (function (_super) {
    __extends(TraderAssortmentFilterTags, _super);

    function TraderAssortmentFilterTags(name, tags) {
        _super.call(this, name);
        this.tags = tags || [];
    }
    TraderAssortmentFilterTags.prototype.filter = function (example) {
        for (var i = 0; i < this.tags.length; i++)
            if (example.tags.indexOf(this.tags[i]) < 0)
                return false;
        return true;
    };

    return TraderAssortmentFilterTags;
})(TraderAssortmentFilter);
