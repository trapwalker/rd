/*
* Нота, суть которой привести игрока в журнал и обучить работе с ним
*/

var JournalTeachingNote = (function (_super) {
    __extends(JournalTeachingNote, _super);

    function JournalTeachingNote(options) {
        _super.call(this, options);
        this.needed_screen_name = 'menu_screen';
        this.journal_btn = new Point(1006, 282);
        this.quest_page_btn = new Point(647, 319);
        this.active_groupe_btn = new Point(700, 362);
        this.quest_btn = new Point(646, 379);

        chat.addMessageToLog(_("teach_town_journal_log"), true);
    }

    JournalTeachingNote.prototype.redraw = function() {
        if (!locationManager.in_location_flag) return;
        var active_place = locationManager.get_current_active_place();
        if (this.needed_screen_name != locationManager.active_screen_name) {
            teachingManager.jq_panel_left_content.text(_("teach_town_journal_note_1"));
            teachingManager.jq_panel_right_content.text(_("teach_town_journal_note_2"));
            _super.prototype.redraw.call(this);
            return;
        }

        if (locationManager.location_menu.selected_page_name != 'Journal') {
            teachingManager.jq_panel_left_content.text(_("teach_town_journal_note_1"));
            teachingManager.jq_panel_right_content.text(_("teach_town_journal_note_3"));
            this.draw_line(this.start_point, this.journal_btn);
            return;
        }

        if (!journalManager.jq_main_div.find('.journal-page-button-block').first().hasClass('active')) {
            teachingManager.jq_panel_left_content.text(_("teach_town_journal_note_1"));
            teachingManager.jq_panel_right_content.text(_("teach_town_journal_note_4"));
            this.draw_line(this.start_point, this.quest_page_btn);
            return;
        }

        if (!journalManager.quests.jq_active_group.find('.journal-menu-name-block').first().hasClass('active')) {
            teachingManager.jq_panel_left_content.text(_("teach_town_journal_note_1"));
            teachingManager.jq_panel_right_content.text(_("teach_town_journal_note_5"));
            this.draw_line(this.start_point, this.active_groupe_btn);
            return;
        }

        var jq_journal_page_task = journalManager.jq_main_div.find('.journal_page_task');
        if (
            jq_journal_page_task.find('.journal-quest-menu-quest').first().hasClass('active') ||
            jq_journal_page_task.find('.journal-quest-info-block').first().hasClass('active')
        ) {
            clientManager.SendQuestNoteAction(this.uid, true); // тут сразу же завершить ноту т.к. больше делать нечего
        }
        else {
            teachingManager.jq_panel_left_content.text(_("teach_town_journal_note_6"));
            teachingManager.jq_panel_right_content.text(_("teach_town_journal_note_7"));
            this.draw_line(this.start_point, this.quest_btn);
        }

    };

    JournalTeachingNote.prototype.delete = function() {
        // Google Analytics
        analytics.teach_city_journal();

        _super.prototype.delete.call(this);
    };
    
    return JournalTeachingNote;
})(NavigateTeachingNote);