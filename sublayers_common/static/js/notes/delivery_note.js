var QuestNoteNPCBtnDelivery = (function (_super) {
    __extends(QuestNoteNPCBtnDelivery, _super);

    function QuestNoteNPCBtnDelivery(options) {
        _super.call(this, options);
        this.availability_test = false;
    }

    // функция перерисовки текущей ноты - просто перерисовка внутренностей в здании
    QuestNoteNPCBtnDelivery.prototype.redraw = function() {
        this.clear();
        if (! this.jq_main_div || ! this.jq_menu_div || ! this.build) return;
        if (this.quest_uid == null) return;
        var quest = journalManager.quests.getQuest(this.quest_uid);
        if (! quest) {
            console.warn('quest not found:', this.quest_uid);
            return;
        }

        var temp_stuff = quest.delivery_set;
        this.delivery_stuff = {};
        for (var i = 0; i < temp_stuff.length; i++)
            if (!this.delivery_stuff.hasOwnProperty(temp_stuff[i].node_hash))
                this.delivery_stuff[temp_stuff[i].node_hash] = {item: temp_stuff[i], count: temp_stuff[i].amount};
            else
                this.delivery_stuff[temp_stuff[i].node_hash].count += temp_stuff[i].amount;

        var jq_up_path = $('<div class="notes-npc-delivery-up"></div>');
        this.jq_main_div.append(jq_up_path);
        this.jq_main_div.append('<div class="notes-npc-delivery-inventory-label">Список необходимых предметов</div>');
        var jq_down_path = $('<div class="notes-npc-delivery-inventory-wrap"></div>');
        var jq_inv_list = $('<div class="notes-npc-delivery-inventory"></div>');
        jq_down_path.append(jq_inv_list);
        this.jq_main_div.append(jq_down_path);

        // пройти по списку доставки, посчитать сколько таких предметов есть в инвентарях (+ квестовый) и вывести
        var inventory = inventoryList.getInventory(user.ID);
        this.availability_test = inventory ? true : false;

        var t = clock.getCurrentTime();
        for (var key in this.delivery_stuff)
            if (this.delivery_stuff.hasOwnProperty(key)) {

                var count_need = this.delivery_stuff[key].count;
                var item = this.delivery_stuff[key].item;
                var count = 0;
                if (inventory) {
                    count = inventory.calcCountByNodeHash(item.node_hash, t);
                    this.availability_test = this.availability_test && count_need <= count;
                }
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

                // повесить события мышки на итемы, чтобы выводить информацию на внеэкранки
                jq_item.mouseenter({item_example: item}, function(event) {
                    locationManager.panel_right.show({text: event.data.item_example.description}, 'description');
                });
                jq_item.mouseleave(function () {locationManager.panel_right.show({text: ''}, 'description');});
            }


        // вызвать пересчёт размера внутреннего дива
        this.build.resizeInventory(jq_inv_list);
    };

    QuestNoteNPCBtnDelivery.prototype.calc_count_for_item = function(item_node_hash) {
        // todo: реализовать проверку достаточности итемов
        return false;
    };

    QuestNoteNPCBtnDelivery.prototype.set_buttons = function(){
        locationManager.setBtnState(1, this.btn1_caption, this.availability_test);
        locationManager.setBtnState(2, '', false);
    };

    QuestNoteNPCBtnDelivery.prototype.clickBtn = function (btnIndex) {
        console.log('Click for note: ' + this.uid + '    =>>> ' + btnIndex);
        clientManager.SendQuestNoteAction(this.uid, true);
    };

    return QuestNoteNPCBtnDelivery;
})(QuestNoteNPCBtn);
