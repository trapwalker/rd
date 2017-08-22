var QuestNoteSelectTeacher = (function (_super) {
    __extends(QuestNoteSelectTeacher, _super);

    function QuestNoteSelectTeacher(options) {
        if (user.example_agent.role_class == "Избранный") options.npc_type = 'mayor';
        else if (user.example_agent.role_class == "Альфа-волк") options.npc_type = 'mayor';
        else if (user.example_agent.role_class == "Ночной ездок") options.npc_type = 'barman';
        else if (user.example_agent.role_class == "Нефтяной магнат") options.npc_type = 'trader';
        else if (user.example_agent.role_class == "Воин дорог") options.npc_type = 'hangar';
        else if (user.example_agent.role_class == "Технокинетик") options.npc_type = 'mechanic';
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
            if (relation < 0.5)
                result = $(
                        '<div>Мы недостаточно хорошо знакомы. Пока уровень отношений не будет на отметке как ' +
                        'минимум в 75, дальнейшего разговора не будет.</br> Отношение можно повысить ' +
                        'близостью в карме и выполнением моих заданий.</div>'
                );
            else
                result = $('<div>Хорошо, вот мои требования к ученикам:</br>- Взнос 3000 NC.</br>- Уровень не менее 4.</div>');
        }
        return result;
    };

    return QuestNoteSelectTeacher;
})(QuestNoteNPCTypeBtn);
