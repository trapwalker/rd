var LocationTraderNPC = (function (_super) {
    __extends(LocationTraderNPC, _super);

    function LocationTraderNPC(npc_rec, jq_town_div, building_name) {
        _super.call(this, npc_rec, jq_town_div, building_name);

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
        this.update();
    }

    LocationTraderNPC.prototype._clearPlayerInv = function() {
        this.playerInv = [];
        this.playerTable = [];
        if (this.playerInvDiv) {
            this.playerInvDiv.empty();
            this.playerInvDiv = null;
        }
        if (this.playerTableDiv) {
            this.playerTableDiv.empty();
            this.playerTableDiv = null;
        }
        this.calcPriceTables();
    };

    LocationTraderNPC.prototype._clearTraderInv = function() {
        this.traderInv = [];
        this.traderTable = [];
        if (this.traderInvDiv) {
            this.traderInvDiv.empty();
            this.traderInvDiv = null;
        }
        if (this.traderTableDiv) {
            this.traderTableDiv.empty();
            this.traderTableDiv = null;
        }
        this.calcPriceTables();
    };

    LocationTraderNPC.prototype.updatePlayerInv = function() {
        //console.log('LocationTraderNPC.prototype.updatePlayerInv');
        this._clearPlayerInv();
        var self = this;
        var item;

        // Отрисовать собственный счет
        this.jq_main_div.find('.trader-player-total').text(user.example_agent.balance + 'NC');

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
        this.playerInvDiv = this.jq_main_div.find('.trader-center-area-player-body').first();
        this.playerTableDiv = this.jq_main_div.find('.trader-center-area-player-exchange-body').first();

        // Повесить дропаблы
        this.playerInvDiv.droppable({
            greedy: true,
            accept: function(target) { return target.hasClass(self.playerTableCls); },
            drop: function(event, ui) {
                var item_pos = ui.draggable.data('pos');
                self.changeItemPlayer(item_pos, self.playerTable, self.playerInv, self.playerTableDiv,
                                      self.playerInvDiv , self.playerTableCls, self.playerInvCls);
            }
        });

        this.playerTableDiv.droppable({
            greedy: true,
            accept: function(target) { return target.hasClass(self.playerInvCls); },
            drop: function(event, ui) {
                var item_pos = ui.draggable.data('pos');
                self.changeItemPlayer(item_pos, self.playerInv, self.playerTable, self.playerInvDiv,
                                      self.playerTableDiv, self.playerInvCls, self.playerTableCls);
            }
        });

        // Отрисовать верстку
        this._reDrawItemList(this.playerInvDiv, this.playerInv, this.playerInvCls);
    };

    LocationTraderNPC.prototype.updateTraderInv = function() {
        //console.log('LocationTraderNPC.prototype.updateTraderInv');
        this._clearTraderInv();
        var self = this;
        var item;

        // Добавить итемы инвентаря своего агента
        var inventory = inventoryList.getInventory(this.npc_rec.html_hash);
        if (! inventory) {
            //console.warn('Ивентарь торговца не найден');
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
        this.traderInvDiv = this.jq_main_div.find('.trader-center-area-trader-body').first();
        this.traderTableDiv = this.jq_main_div.find('.trader-center-area-trader-exchange-body').first();

        // Повесить дропаблы
        this.traderInvDiv.droppable({
            greedy: true,
            accept: function(target) { return target.hasClass(self.traderTableCls); },
            drop: function(event, ui) {
                var item_pos = ui.draggable.data('pos');
                self.changeItemTrader(item_pos, self.traderTable, self.traderInv, self.traderTableDiv,
                                      self.traderInvDiv , self.traderTableCls, self.traderInvCls);//
            }
        });

        this.traderTableDiv.droppable({
            greedy: true,
            accept: function(target) { return target.hasClass(self.traderInvCls); },
            drop: function(event, ui) {
                var item_pos = ui.draggable.data('pos');
                self.changeItemTrader(item_pos, self.traderInv, self.traderTable, self.traderInvDiv,
                                      self.traderTableDiv, self.traderInvCls, self.traderTableCls);
            }
        });

        // Отрисовать верстку
        this._reDrawItemList(this.traderInvDiv, this.traderInv, this.traderInvCls);
    };

    LocationTraderNPC.prototype._reDrawItemList = function(parentDiv, itemList, dropCls) {
        for(var i = 0; i < itemList.length; i++) {
            var example = itemList[i];

            var itemDiv = $(
                '<div class="npcInventory-itemWrap ' + dropCls + '" data-pos="' + i + '">' +
                    '<div class="npcInventory-item">' +
                        '<div class="npcInventory-pictureWrap" ' + 'style="background: url(' + example.inv_icon_small + ') no-repeat center"></div>' +
                        '<div class="npcInventory-text name">' + example.title + '</div>' +
                        '<div class="npcInventory-text count">' + example.count.toFixed(1) + '</div>' +
                    '</div>' +
                '</div>'
            );

            itemDiv.draggable({
                helper: 'clone',
                opacity: 0.8,
                revert: true,
                revertDuration: 0,
                zIndex: 1,
                appendTo: '#location-content',
                start: LocationPlace.start_drag_handler,
                drag: LocationPlace.drag_handler
            });

            itemDiv.mouseenter({example: itemList[i]}, function(event) {
                locationManager.panel_right.show({text: event.data.example.description }, 'description');
            });
            itemDiv.mouseleave({}, function(event) { locationManager.panel_right.show({text: '' }, 'description'); });

            parentDiv.append(itemDiv);
        }
    };

    LocationTraderNPC.prototype.calcPriceTables = function() {
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
        this.jq_main_div.find('.trader-player-exchange-total').text(price_player + 'NC');
        this.jq_main_div.find('.trader-trader-exchange-total').text(price_trader + 'NC');
    };

    LocationTraderNPC.prototype.changeItemPlayer = function(pos, srcList, destList, srcDiv, destDiv, srcCls, destCls) {
        destDiv.empty();
        srcDiv.empty();

        destList.push(srcList[pos]);
        srcList.splice(pos, 1);

        this._reDrawItemList(destDiv, destList, destCls);
        this._reDrawItemList(srcDiv, srcList, srcCls);

        this.calcPriceTables();
    };

    LocationTraderNPC.prototype.changeItemTrader = function(pos, srcList, destList, srcDiv, destDiv, srcCls, destCls) {
        if (destDiv != srcDiv) this.traderTableDiv.empty();

        if (destDiv == this.traderTableDiv) destList.push(srcList[pos]);
        if (srcDiv == this.traderTableDiv) srcList.splice(pos, 1);

        this._reDrawItemList(this.traderTableDiv, this.traderTable, this.traderTableCls);

        this.calcPriceTables();
    };

    // state: 0 - продажа торговцу, 1 - покупка у торговца
    LocationTraderNPC.prototype._getPrice = function (item, state) {
        var price_modify = this.price_list.hasOwnProperty(item.id) ? this.price_list[item.id][state] : 100;
        return Math.round(item.base_price * price_modify / 100.0);
    };

    LocationTraderNPC.prototype.updatePrice = function(price_list) {
        //console.log('TraderManager.prototype.updatePrice', price_list);
        if (price_list)
            this.price_list = price_list;
        else
            price_list = this.price_list;

        if (! price_list) { console.warn('Отсутствует список цен торговца.'); return }


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

    LocationTraderNPC.prototype.clear = function() {
        this._clearPlayerInv();
        this._clearTraderInv();
    };

    LocationTraderNPC.prototype.apply = function() {
        //console.log('TraderManager.prototype.apply');
        clientManager.sendTraderApply(this);
    };

    LocationTraderNPC.prototype.cancel = function() {
        //console.log('TraderManager.prototype.cancel');
        this.update();
    };

    LocationTraderNPC.prototype.update = function(data) {
        //console.log('LocationTraderNPC.prototype.update');
        this.updatePlayerInv();
        this.updateTraderInv();
        _super.prototype.update.call(this, data);
    };

    LocationTraderNPC.prototype.getPlayerTable = function() {
//        console.log('LocationTraderNPC.prototype.getPlayerTable');
        var res = [];
        for (var i = 0; i < this.playerTable.length; i++)
            res.push(this.playerTable[i].id);
        return res;
    };

    LocationTraderNPC.prototype.getTraderTable = function() {
//        console.log('LocationTraderNPC.prototype.getTraderTable');
        var res = [];
        for (var i = 0; i < this.traderTable.length; i++)
            res.push(this.traderTable[i].id);
        return res;
    };

    LocationTraderNPC.prototype.get_self_info = function () {
        clientManager.sendGetTraderInfo(this);
    };

    LocationTraderNPC.prototype.set_buttons = function () {
        //console.log('LocationParkingNPC.prototype.set_buttons', this.cars_list.length);
        if (!locationManager.isActivePlace(this)) return;
        locationManager.setBtnState(1, 'Подтвердить</br>сделку', true);
        locationManager.setBtnState(2, '</br>Отмена', true);
    };

    LocationTraderNPC.prototype.set_panels = function () {
        if (!locationManager.isActivePlace(this)) return;
        _super.prototype.set_panels.call(this);
        locationManager.panel_left.show({transactions: this.transactions}, 'npc_transaction_info');
        locationManager.panel_right.show({text: '' }, 'description');
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

    return LocationTraderNPC;
})(LocationPlaceNPC);