/*
* Нота, суть которой привести игрока в журнал и обучить работе с ним
*/

var JournalTeachingNote = (function (_super) {
    __extends(JournalTeachingNote, _super);

    function JournalTeachingNote(options) {
        _super.call(this, options);
        this.needed_screen_name = 'menu_screen';
        this.journal_btn = new Point(1069, 250);
        this.quest_page_btn = new Point(650, 293);
        this.active_groupe_btn = new Point(700, 330);
        this.quest_btn = new Point(695, 343);
    }

    JournalTeachingNote.prototype.redraw = function() {
        var active_place = locationManager.get_current_active_place();
        if (this.needed_screen_name != locationManager.active_screen_name) {
            _super.prototype.redraw.call(this);
            teachingManager.jq_panel_left_content.text('Зайдите в журнал.');
            teachingManager.jq_panel_right_content.text('Перейдите на экран Меню.');
            return;
        }

        if (locationManager.location_menu.selected_page_name != 'Journal') {
            teachingManager.jq_panel_left_content.text('Зайдите в журнал.');
            teachingManager.jq_panel_right_content.text('Перейдите на вкладку Журнал.');
            this.draw_line(this.start_point, this.journal_btn);
            return;
        }

        if (!journalManager.jq_main_div.find('.journal-page-button-block').first().hasClass('active')) {
            teachingManager.jq_panel_left_content.text('Перейдите в раздел Квесты.');
            teachingManager.jq_panel_right_content.text('Перейдите в раздел Квесты.');
            this.draw_line(this.start_point, this.quest_page_btn);
            return;
        }

        if (!journalManager.quests.jq_active_group.hasClass('active')) {
            teachingManager.jq_panel_left_content.text('Выберите активные квесты.');
            teachingManager.jq_panel_right_content.text('Выберите активные квесты.');
            this.draw_line(this.start_point, this.active_groupe_btn);
            return;
        }

        return;
        // todo: получить с сервера quest_id
        var quest_id = 0;
        var is_activate_quest = false;
        journalManager.jq_main_div.find('.journal_page_task').find('.journal-quest-info-block').each(function (index, element) {
            var jq_elem = $(element);
            is_activate_quest = is_activate_quest || ((quest_id == jq_elem.data('quest_id')) && jq_elem.hasClass('active'));
        });
        if (!is_activate_quest) {
            teachingManager.jq_panel_left_content.text('Выберите квест.');
            teachingManager.jq_panel_right_content.text('Выберите квест.');
            this.draw_line(this.start_point, this.active_groupe_btn);
            return;
        }
        // todo: тут сразу же завершить ноту т.к. больше делать нечего
    };

    return JournalTeachingNote;
})(NavigateTeachingNote);