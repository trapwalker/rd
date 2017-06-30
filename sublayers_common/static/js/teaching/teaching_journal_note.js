/*
* Нота, суть которой привести игрока в журнал и обучить работе с ним
*/

var JournalTeachingNote = (function (_super) {
    __extends(JournalTeachingNote, _super);

    function JournalTeachingNote(options) {
        _super.call(this, options);
        this.needed_screen_name = 'menu_screen';
        this.journal_btn = new Point(1020, 250);
        this.quest_page_btn = new Point(650, 293);
        this.active_groupe_btn = new Point(700, 330);
        this.quest_btn = new Point(695, 343);

        chat.addMessageToLog('Зайдите в журнал.', true);
    }

    JournalTeachingNote.prototype.redraw = function() {
        if (!locationManager.in_location_flag) return;
        var active_place = locationManager.get_current_active_place();
        if (this.needed_screen_name != locationManager.active_screen_name) {
            teachingManager.jq_panel_left_content.text('Все полученные задания добавляются в Ваш квестовый журнал. Получать много заданий одновременно выгодней, а для того, что бы не запутаться и выстроить оптимальный маршрут на карте - следите за их статусом.');
            teachingManager.jq_panel_right_content.text('Перейдите на экран Меню.');
            _super.prototype.redraw.call(this);
            return;
        }

        if (locationManager.location_menu.selected_page_name != 'Journal') {
            teachingManager.jq_panel_left_content.text('Все полученные задания добавляются в Ваш квестовый журнал. Получать много заданий одновременно выгодней, а для того, что бы не запутаться и выстроить оптимальный маршрут на карте - следите за их статусом.');
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

        if (!journalManager.quests.jq_active_group.find('.journal-menu-name-block').first().hasClass('active')) {
            teachingManager.jq_panel_left_content.text('Все полученные задания добавляются в Ваш квестовый журнал. Получать много заданий одновременно выгодней, а для того, что бы не запутаться и выстроить оптимальный маршрут на карте - следите за их статусом.');
            teachingManager.jq_panel_right_content.text('Выберите активные квесты.');
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
            teachingManager.jq_panel_left_content.text('Здесь расположен список всех незавершенных заданий. Выбрав квест, можно узнать подробности.');
            teachingManager.jq_panel_right_content.text('Выберите квест.');
            this.draw_line(this.start_point, this.quest_btn);
        }

    };

    return JournalTeachingNote;
})(NavigateTeachingNote);