/*
* Нота, суть которой привести игрока к Мэру и взять первый квест.
*/
var GetQuestTeachingNote = (function (_super) {
    __extends(GetQuestTeachingNote, _super);

    function GetQuestTeachingNote(options) {
        _super.call(this, options);
        this.needed_building = locationManager.buildings.market; // todo: mayor
        this.quest_uid = 'f472e85e-a58a-11e6-b515-bc5ff4c881d1'; // todo: options.quest_uid

        this.build_coord = new Point(958, 196);
        this.active_quests_page = new Point(735, 320);
        this.first_quest = new Point(850, 370);
        this.buy_btn = new Point(325, 608);

        this.jq_page_available_quests = null;
    }

    GetQuestTeachingNote.prototype.move_quest_to_start = function () {
        var self = this;
        var active_page = $('#' + this.needed_building.active_central_page);
        if (active_page)
            active_page.find('.building-quest-list-item').each(function(index, element) {
                if (index == 0) return;
                var elem = $(this);
                if (elem.data('quest_uid') == self.quest_uid)
                    elem.parent().prepend(this);
            });
    };

    GetQuestTeachingNote.prototype.redraw = function() {
        var active_place = locationManager.get_current_active_place();
        if ((this.needed_screen_name != locationManager.active_screen_name) ||
            ((active_place != this.needed_building) &&
             (active_place != null))) {
            _super.prototype.redraw.call(this);
            teachingManager.jq_panel_left_content.text('Теперь Вы готовы к выполнению первой работы. Посмотреть предлагаемые задания можно в любом здании. Например у мэра.');
            teachingManager.jq_panel_right_content.text('Зайдите в здание “Мэр”.');
            return;
        }

        if (active_place === null) {
            // Указать на здание в радуге
            this.draw_line(this.start_point, this.build_coord);
            teachingManager.jq_panel_left_content.text('Теперь Вы готовы к выполнению первой работы. Посмотреть предлагаемые задания можно в любом здании. Например у мэра.');
            teachingManager.jq_panel_right_content.text('Зайдите в здание “Мэр”.');
        }

        if (active_place === this.needed_building) {
            teachingManager.jq_panel_left_content.text('Вы находитесь в здании “Мэр”. Тут находятся мэр. Также тут можно просмотреть доступные задания и выбрать подходящее для выполнения.');
            if (active_place.active_central_page.split('_')[0] == 'buildingPageAvailableTasks') {
                // Если мы в доступных квестах и выбран нужный квест
                this.move_quest_to_start();
                if (active_place.selected_quest && active_place.selected_quest.uid == this.quest_uid) {
                    // указать на кнопку "Принять"
                    this.draw_line(this.start_point, this.buy_btn);
                    teachingManager.jq_panel_right_content.text('Нажмите на кнопку <Взять>.');
                }
                else {
                    // то указать на нужный квест  (или временно скрыть все остальные квесты)
                    this.draw_line(this.start_point, this.first_quest);
                    teachingManager.jq_panel_right_content.text('Выберите задание в списке доступных.');
                }
            }
            else {
                // Иначе указать на плашку "доступные квесты"
                this.draw_line(this.start_point, this.active_quests_page);
                teachingManager.jq_panel_right_content.text('Выберите задание в списке доступных.');
            }
        }
    };

    return GetQuestTeachingNote;
})(NavigateTeachingNote);


/*
* Нота, суть которой привести игрока в Бар и сдать первый квест.
*/
var FinishQuestTeachingNote = (function (_super) {
    __extends(FinishQuestTeachingNote, _super);

    function FinishQuestTeachingNote(options) {
        _super.call(this, options);
        this.needed_building = locationManager.buildings.market; //.bar; // todo: должно прийти с сервера и где-то нужно взять координаты
        this.build_coord = new Point(958, 240);
        this.note_uid = 'b95c5370-a593-11e6-b6ec-bc5ff4c881d1'; // todo: options.quest_uid
        this.buy_btn = new Point(325, 608);
        this.third_note_btn =  new Point(735, 420);
    }

    FinishQuestTeachingNote.prototype.move_note_to_third = function () {
        var self = this;
        var jq_menu_notes_wrap = this.needed_building.jq_main_div.find('.building-center-menu-block-wrap').first();
        if (jq_menu_notes_wrap)
            jq_menu_notes_wrap.find('.building-center-menu-item').each(function () {
                var element = $(this);
                if (element.data('page_id').indexOf('building_note_' + self.note_uid) >= 0)
                    $(element.parent().find('.building-center-menu-item')[1]).after(this);
            });
    };

    FinishQuestTeachingNote.prototype.redraw = function() {
        var active_place = locationManager.get_current_active_place();
        if ((this.needed_screen_name != locationManager.active_screen_name) ||
            ((active_place != this.needed_building) &&
             (active_place != null))) {
            _super.prototype.redraw.call(this);
            teachingManager.jq_panel_left_content.text('По заданию вам необходимо передать кое что в бар.');
            teachingManager.jq_panel_right_content.text('Зайдите в здание “Бар”.');
            return;
        }

        if (active_place === null) {
            // Указать на здание в радуге
            this.draw_line(this.start_point, this.build_coord);
            teachingManager.jq_panel_left_content.text('По заданию вам необходимо передать кое что в бар.');
            teachingManager.jq_panel_right_content.text('Зайдите в здание “Бар”.');
        }

        if (active_place === this.needed_building) {
            teachingManager.jq_panel_left_content.text('Вы находитесь в здании “Бар”. Тут находятся бармен и компаньонка. Бармен может предложить интересные задания, а компаньонка поможет хорошо провести свободное время.');
            var note = active_place.get_active_note();
            this.move_note_to_third();
            if (note && note.uid == this.note_uid) {
                // Если мы активировали правильную ноту
                this.draw_line(this.start_point, this.buy_btn);
                teachingManager.jq_panel_right_content.text('Нажмите на кнопку <Сдать>.');
            }
            else {
                // Иначе указать на третью плашку
                this.draw_line(this.start_point, this.third_note_btn);
                teachingManager.jq_panel_right_content.text('Нажмите на кнопку <Первый квест>.');
            }
        }
    };

    return FinishQuestTeachingNote;
})(NavigateTeachingNote);