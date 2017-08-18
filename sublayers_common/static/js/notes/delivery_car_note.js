var QuestNoteNPCBtnDeliveryCar = (function (_super) {
    __extends(QuestNoteNPCBtnDeliveryCar, _super);

    function QuestNoteNPCBtnDeliveryCar(options) {
        _super.call(this, options);
    }

    QuestNoteNPCBtnDeliveryCar.prototype.redraw = function() {
        this.clear();
        if (!this.jq_main_div || !this.jq_menu_div || !this.build) return;
        if (this.quest_uid == null) return;
        var quest = journalManager.quests.getQuest(this.quest_uid);
        if (! quest) {
            console.warn('quest not found:', this.quest_uid);
            return;
        }

        this.jq_main_div.append('<div class="notes-npc-delivery-car-up"></div>');
        this.jq_main_div.append('<div class="notes-npc-delivery-inventory-label">Автомобиль</div>');
        var jq_down_path = $('<div class="notes-npc-delivery-inventory-wrap no-scroll"></div>');
        var jq_inv_list = $('<div class="notes-npc-delivery-inventory"></div>');
        jq_down_path.append(jq_inv_list);
        this.jq_main_div.append(jq_down_path);

        this.availability_test = quest.car_uid && (quest.car_uid == user.example_car.uid);
        if (this.availability_test) {
            var jq_item = $(
                '<div class="npcInventory-itemWrap">' +
                    '<div class="npcInventory-item">' +
                        '<div class="npcInventory-pictureWrap">' +
                            '<div class="npcInventory-picture town-interlacing" ' +
                                'style="background: transparent url(' + user.example_car.inv_icon_mid + ') no-repeat 100% 100%;"></div>' +
                        '</div>' +
                        '<div class="npcInventory-name">' + user.example_car.title + '</div>' +
                    '</div>' +
                '</div>'
            );
            jq_inv_list.append(jq_item);

            //// повесить события мышки на итемы, чтобы выводить информацию на внеэкранки
            //jq_item.mouseenter({item_example: item}, function(event) {
            //    locationManager.panel_right.show({text: event.data.item_example.description,
            //                                      title: event.data.item_example.title}, 'description');
            //});
            //jq_item.mouseleave(function () {locationManager.panel_right.show({text: '', title: ''}, 'description');});
        }
    };

    return QuestNoteNPCBtnDeliveryCar;
})(QuestNoteNPCBtnDelivery);
