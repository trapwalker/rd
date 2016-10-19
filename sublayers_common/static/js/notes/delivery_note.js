var QuestNoteNPCBtnDelivery = (function (_super) {
    __extends(QuestNoteNPCBtnDelivery, _super);

    function QuestNoteNPCBtnDelivery(options) {
        _super.call(this, options);

        this.availability_test = false;
        this.delivery_stuff = options.delivery_stuff;
    }

    // функция перерисовки текущей ноты - просто перерисовка внутренностей в здании
    QuestNoteNPCBtnDelivery.prototype.redraw = function() {
        this.clear();
        if (! this.jq_main_div || ! this.jq_menu_div || ! this.build) return;
        //this.jq_main_div.text('QuestNoteNPCBtnDelivery ' + clock.getClientTime());

        var jq_up_path = $('<div class="notes-npc-delivery-up">QuestNoteNPCBtnDelivery</div>');
        this.jq_main_div.append(jq_up_path);
        this.jq_main_div.append('<div class="notes-npc-delivery-inventory-label">Список необходимых предметов</div>');
        var jq_down_path = $('<div class="notes-npc-delivery-inventory-wrap"></div>');
        var jq_inv_list = $('<div class="notes-npc-delivery-inventory"></div>');
        jq_down_path.append(jq_inv_list);
        this.jq_main_div.append(jq_down_path);

        // пройти по списку доставки, посчитать сколько таких предметов есть в инвентарях (+ квестовый) и вывести
        var inventory = inventoryList.getInventory(user.ID);
        this.availability_test = false;
        var t = clock.getCurrentTime();
        if (inventory) {
            this.availability_test = true;
            for (var i = 0; i < this.delivery_stuff.length; i++) {
                var count_need = this.delivery_stuff[i].count;
                var item = this.delivery_stuff[i].item;
                var count = inventory.calcCountByNodeHash(item.node_hash, t);
                this.availability_test = this.availability_test && count_need <= count;
                //console.log(item.node_hash, count, count_need);
                // todo: добавить вёртску
                var jq_item = $(
                    '<div class="npcInventory-itemWrap">' +
                        '<div class="npcInventory-item">' +
                            '<div class="npcInventory-pictureWrap">' +
                                '<div class="npcInventory-picture town-interlacing" ' +
                                    'style="background: transparent url(' + item.inv_icon_mid + ') no-repeat 100% 100%;"></div>' +
                            '</div>' +
                            '<div class="npcInventory-name">' + item.title + '</div>' +
                            '<div class="npcInventory-notes-delivery-count">' + count + '/' + count_need + '</div>' +
                        '</div>' +
                    '</div>'
                );

                jq_inv_list.append(jq_item);

                // todo: повесить события мышки на итемы, чтобы выводить информацию на внеэкранки
                //jq_item.mouseenter({slot_name: position, armorer: this}, LocationArmorerNPC.inventory_slot_event_mouseenter);
                //jq_item.mouseleave({slot_name: position, armorer: this}, LocationArmorerNPC.inventory_slot_event_mouseleave);
            }
        }

        // вызвать пересчёт размера внутреннего дива
        this.build.resizeInventory(jq_inv_list);
    };

    QuestNoteNPCBtnDelivery.prototype.calc_count_for_item = function(item_node_hash) {
        // todo: реализовать проверку достаточности итемов
        return false;
    };

    QuestNoteNPCBtnDelivery.prototype.set_buttons = function(){
        locationManager.setBtnState(1, '</br> Сдать', this.availability_test);
        locationManager.setBtnState(2, '', false);
    };

    QuestNoteNPCBtnDelivery.prototype.clickBtn = function (btnIndex) {
        console.log('Click for note: ' + this.uid + '    =>>> ' + btnIndex);
    };

    return QuestNoteNPCBtnDelivery;
})(QuestNoteNPCBtn);
