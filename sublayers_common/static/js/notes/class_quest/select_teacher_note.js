var QuestNoteSelectTeacher = (function (_super) {
    __extends(QuestNoteSelectTeacher, _super);

    function QuestNoteSelectTeacher(options) {
        if (user.example_agent.role_class == "Избранный") options.npc_type = 'mayor';
        else if (user.example_agent.role_class == "Альфа-волк") options.npc_type = 'mayor';
        else if (user.example_agent.role_class == "Ночной ездок") options.npc_type = 'barman';
        else if (user.example_agent.role_class == "Нефтяной магнат") options.npc_type = 'trader';
        else if (user.example_agent.role_class == "Воин дорог") options.npc_type = 'dealer';
        else if (user.example_agent.role_class == "Технокинетик") options.npc_type = 'mechanic';
        _super.call(this, options);
    }

    QuestNoteSelectTeacher.prototype.redraw_by_index = function(index) {
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

        jq_main_div.append('<div class="notes-select-teacher-img"></div>');
    };

    QuestNoteSelectTeacher.prototype.clickBtn = function (btnIndex) {
        var options = {};
        if (locationManager.in_location_flag && locationManager.screens[locationManager.active_screen_name].building_rec)
            options = {
                npc_node_hash: locationManager.screens[locationManager.active_screen_name].building_rec.head.node_hash
            };
        clientManager.SendQuestNoteAction(this.uid, true, options);
    };

    return QuestNoteSelectTeacher;
})(QuestNoteNPCTypeBtn);
