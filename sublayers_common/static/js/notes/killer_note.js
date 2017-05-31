var QuestNoteNPCBtnKiller = (function (_super) {
    __extends(QuestNoteNPCBtnKiller, _super);

    function QuestNoteNPCBtnKiller(options) {
        _super.call(this, options);
        this.availability_test = false;
    }

    // функция перерисовки текущей ноты - просто перерисовка внутренностей в здании
    QuestNoteNPCBtnKiller.prototype.redraw = function() {
        this.clear();
        if (! this.jq_main_div || ! this.jq_menu_div || ! this.build) return;
        if (this.quest_uid == null) return;
        var quest = journalManager.quests.getQuest(this.quest_uid);
        if (! quest) {
            console.warn('quest not found:', this.quest_uid);
            return;
        }
        var jq_up_path = $('<div class="notes-npc-killer-up">*** WANTED ***</div>');
        this.jq_main_div.append(jq_up_path);
        this.jq_main_div.append('<div class="notes-npc-killer-inventory-label">Список целей</div>');
        var jq_down_path = $('<div class="notes-npc-killer-inventory-wrap"></div>');
        var jq_inv_list = $('<div class="notes-npc-killer-inventory"></div>');
        jq_down_path.append(jq_inv_list);
        this.jq_main_div.append(jq_down_path);

        // пройти по списку доставки, посчитать сколько таких предметов есть в инвентарях (+ квестовый) и вывести
        var victims_count = quest.victims.length;
        this.availability_test = victims_count >= quest.count_to_kill;
        for (var i = 0; i < quest.count_to_kill; i++) {
            var vict_name = victims_count > i ?  quest.victims[i].login : "";
            var photo =  victims_count > i ? location.origin + "/" + quest.victims[i].photo : ""; // todo: повесить фото-заглушку
            var jq_item = $(
                '<div class="building-npc-list-item">' +
                    '<img class="building-npc-photo" ' +
                    'style="background: transparent url(' + photo + ') no-repeat 100% 100%; width: 100%; height: 100%;">' +
                    '<div class="building-npc-name-block"><span class="building-npc-name">' + vict_name + '</span></div>' +
                '</div>'
            );
            jq_inv_list.append(jq_item);
        }

        // вызвать пересчёт размера внутреннего дива
        this.build.resizeInventory(jq_inv_list);
    };

    QuestNoteNPCBtnKiller.prototype.set_buttons = function(){
        locationManager.setBtnState(1, this.btn1_caption, this.availability_test);
        locationManager.setBtnState(2, '', false);
    };

    QuestNoteNPCBtnKiller.prototype.clickBtn = function (btnIndex) {
        console.log('Click for note: ' + this.uid + '    =>>> ' + btnIndex);
        clientManager.SendQuestNoteAction(this.uid, true);
    };

    return QuestNoteNPCBtnKiller;
})(QuestNoteNPCBtn);
