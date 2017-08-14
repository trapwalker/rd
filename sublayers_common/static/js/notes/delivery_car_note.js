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

        this.availability_test = quest.car_uid && (quest.car_uid == user.example_car.uid);
        if (this.availability_test) {
            //var jq_up_path = $('<div class="notes-npc-delivery-up"></div>');
            //this.jq_main_div.append(jq_up_path);
            //jq_up_path.empty();
            //jq_up_path.append(user.templates.html_car_img);
        }
    };

    return QuestNoteNPCBtnDeliveryCar;
})(QuestNoteNPCBtnDelivery);
