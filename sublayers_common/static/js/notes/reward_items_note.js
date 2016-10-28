var QuestNoteNPCRewardItems = (function (_super) {
    __extends(QuestNoteNPCRewardItems, _super);

    function QuestNoteNPCRewardItems(options) {
        _super.call(this, options);
    }

    QuestNoteNPCRewardItems.prototype.redraw = function() {
        this.clear();
        if (! this.jq_main_div || ! this.jq_menu_div || ! this.build) return;
        if (this.quest_uid == null) return;
        var quest = journalManager.quests.getQuest(this.quest_uid);
        if (! quest) {
            console.warn('quest not found:', this.quest_uid);
            return;
        }
        var jq_up_path = $('<div class="notes-npc-delivery-up">QuestNoteNPCBtnDelivery</div>');
        this.jq_main_div.append(jq_up_path);
        this.jq_main_div.append('<div class="notes-npc-delivery-inventory-label">Список предметов</div>');
        var jq_down_path = $('<div class="notes-npc-delivery-inventory-wrap"></div>');
        var jq_inv_list = $('<div class="notes-npc-delivery-inventory"></div>');
        jq_down_path.append(jq_inv_list);
        this.jq_main_div.append(jq_down_path);

        this.availability_test = true;
        for (var i = 0; i < quest.reward_items.length; i++) {
            var item = quest.reward_items[i];
            var jq_item = $(
                '<div class="npcInventory-itemWrap">' +
                    '<div class="npcInventory-item">' +
                        '<div class="npcInventory-pictureWrap">' +
                            '<div class="npcInventory-picture town-interlacing" ' +
                                'style="background: transparent url(' + item.inv_icon_mid + ') no-repeat 100% 100%;"></div>' +
                        '</div>' +
                        '<div class="npcInventory-name">' + item.title + '</div>' +
                        '<div class="npcInventory-notes-delivery-count">' + item.amount + '</div>' +
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

    return QuestNoteNPCRewardItems;
})(QuestNoteNPCBtnDelivery);
