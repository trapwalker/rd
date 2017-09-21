var QuestNoteVisitTrainer = (function (_super) {
    __extends(QuestNoteVisitTrainer, _super);

    function QuestNoteVisitTrainer(options) {
        _super.call(this, options);
    }

    QuestNoteVisitTrainer.prototype.redraw_by_index = function(index) {
        this.clear_by_index(index);

        var jq_main_div = this.jq_main_div_list[index];
        var jq_menu_div = this.jq_menu_div_list[index];
        var build = this.build_list[index];

        if (!jq_main_div || !jq_menu_div || !build || (this.quest_uid == null)) return;


        var quest = journalManager.quests.getQuest(this.quest_uid);
        if (! quest) {
            console.warn('quest not found:', this.quest_uid);
            return;
        }

        var role_skill = '';
        var teacher = '';
        var class_name = _(user.example_agent.role_class);
        if (user.example_agent.role_class.ru == "Избранный") { role_skill = _("vtn_skill_1"); teacher = _("vtn_npc_1"); }
        else if (user.example_agent.role_class.ru == "Альфа-волк") { role_skill = _("vtn_skill_2"); teacher = _("vtn_npc_2"); }
        else if (user.example_agent.role_class.ru == "Ночной ездок") { role_skill = _("vtn_skill_3"); teacher = _("vtn_npc_3"); }
        else if (user.example_agent.role_class.ru == "Нефтяной магнат") { role_skill = _("vtn_skill_4"); teacher = _("vtn_npc_4"); }
        else if (user.example_agent.role_class.ru == "Воин дорог") { role_skill = _("vtn_skill_5"); teacher = _("vtn_npc_5"); }
        else if (user.example_agent.role_class.ru == "Технокинетик") { role_skill = _("vtn_skill_6"); teacher = _("vtn_npc_6"); }

        var text = _("vtn_text_1") + class_name + _("vtn_text_2") + role_skill + _("vtn_text_3") + class_name + _("vtn_text_4") + teacher + '.';
        jq_main_div.append(
            '<div class="notes-visit-trainer-img"></div>' +
            '<div class="notes-visit-trainer-text">' + text + '</div>'
        );
    };

    QuestNoteVisitTrainer.prototype.set_buttons = function(){
        locationManager.setBtnState(1, "", false);
        locationManager.setBtnState(2, "", false);
    };

    QuestNoteVisitTrainer.prototype.activate = function() {
        clientManager.SendQuestNoteAction(this.uid, true);
    };

    return QuestNoteVisitTrainer;
})(QuestNoteNPCTypeBtn);
