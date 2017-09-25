var QuestNoteSelectTeacher = (function (_super) {
    __extends(QuestNoteSelectTeacher, _super);

    function QuestNoteSelectTeacher(options) {
        if (user.example_agent.role_class.ru == "Избранный") options.npc_type = 'mayor';
        else if (user.example_agent.role_class.ru == "Альфа-волк") options.npc_type = 'mayor';
        else if (user.example_agent.role_class.ru == "Ночной ездок") options.npc_type = 'barman';
        else if (user.example_agent.role_class.ru == "Нефтяной магнат") options.npc_type = 'trader';
        else if (user.example_agent.role_class.ru == "Воин дорог") options.npc_type = 'hangar';
        else if (user.example_agent.role_class.ru == "Технокинетик") options.npc_type = 'mechanic';
        //console.log(options.npc_type);
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

    QuestNoteSelectTeacher.prototype.get_head_text = function() {
        var result = null;
        var curr_place = locationManager.get_current_active_place();
        if (locationManager.in_location_flag && (curr_place instanceof LocationPlaceBuilding)) {
            var relation = locationManager.get_relation(curr_place.building_rec.head.node_hash);
            if (relation < 0.5) result = $(_("stn_text1"));
            else result = $(_("stn_text2"));
        }
        return result;
    };

    return QuestNoteSelectTeacher;
})(QuestNoteNPCTypeBtn);
