/*
* Нота, суть которой привести игрока к Мэру и взять первый квест.
*/

var GetQuestTeachingNote = (function (_super) {
    __extends(GetQuestTeachingNote, _super);

    function GetQuestTeachingNote(options) {
        _super.call(this, options);
        this.needed_building = locationManager.buildings.market; // todo: mayor
        this.build_coord = new Point(958, 196);
        this.quest_uid = '1ad83e9e-a4c9-11e6-922b-bc5ff4c88261'; // todo: options.quest_uid
        this.buy_btn = new Point(325, 608);
        this.jq_page_available_quests = null;
    }

    GetQuestTeachingNote.prototype.get_build_quest_div = function () {
        var active_page = $('#' + this.needed_building.active_central_page);
        if (active_page){
            var ll = active_page.find('.building-quest-list-item');
            for (var i = 0; i < ll.length; i++) {
                var elem = $(ll[i]);
                if (elem.data('quest_uid') == this.quest_uid)
                    return elem;
            }
        }
        return null;
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
                if (active_place.selected_quest && active_place.selected_quest.uid == this.quest_uid) { // todo: selected_quest.uid == this.quest_uid
                    // указать на кнопку "Принять"
                    this.draw_line(this.start_point, this.buy_btn);
                    teachingManager.jq_panel_right_content.text('Нажмите на кнопку <Взять>.');
                }
                else {
                    // то указать на нужный квест  (или временно скрыть все остальные квесты)
                    var quest_elem = this.get_build_quest_div();
                    this.draw_line(this.start_point, new Point(850, 370));
                    teachingManager.jq_panel_right_content.text('Выберите задание в списке доступных.');
                }

                // info: можно запомнить линк на страницу с квестами и временно скрыть все остальные квесты (Если это урать, то просто будет указатель на первый квест)
                if (!this.jq_page_available_quests)
                    this.jq_page_available_quests = $('#' + active_place.active_central_page);
                if (this.jq_page_available_quests) {
                    var self = this;
                    this.jq_page_available_quests.find('.building-quest-list-item').each(
                        function (index, element) {
                            var el = $(element);
                            if (el.data('quest_uid') != self.quest_uid)
                                el.css('display', 'none');
                        }
                    )
                }
            }
            else {
                // Иначе указать на плашку "доступные квесты"
                this.draw_line(this.start_point, new Point(735, 320));
                teachingManager.jq_panel_right_content.text('Выберите задание в списке доступных.');
            }
        }
    };

    GetQuestTeachingNote.prototype.delete = function() {
        // Вернуть все квесты
        if (this.jq_page_available_quests)
            this.jq_page_available_quests.find('.building-quest-list-item').each(
                function (index, element) {
                    $(element).css('display', 'block');
                }
            );
        _super.prototype.delete.call(this);
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
        this.note_uid = '63b3274f-a4da-11e6-8339-bc5ff4c88261'; // todo: options.quest_uid
        this.buy_btn = new Point(325, 608);
        this.jq_menu_notes_wrap = null;
    }

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
            if (note && note.uid == this.note_uid) {
                // Если мы активировали правильную ноту
                this.draw_line(this.start_point, this.buy_btn);
                teachingManager.jq_panel_right_content.text('Нажмите на кнопку <Сдать>.');
            }
            else {
                // Иначе указать на третью плашку
                this.draw_line(this.start_point, new Point(735, 420));
                teachingManager.jq_panel_right_content.text('Нажмите на кнопку <Первый квест>.');
            }

            // info: можно запомнить линк на меню с нотами и временно скрыть все остальные ноты
            this.jq_menu_notes_wrap = active_place.jq_main_div.find('.building-center-menu-block-wrap').first();
            if (this.jq_menu_notes_wrap) {
                var self = this;
                this.jq_menu_notes_wrap.find('.building-center-menu-item').each(
                    function (index, element) {
                        var el = $(element);
                        var page_id = el.data('page_id');
                        if (page_id.indexOf('buildingPage') < 0 && page_id.indexOf('building_note_' + self.note_uid) < 0)
                            el.css('display', 'none');
                    }
                )
            }
        }
    };

    FinishQuestTeachingNote.prototype.delete = function() {
        // Вернуть все ноты
        if (this.jq_menu_notes_wrap)
            this.jq_menu_notes_wrap.find('.building-center-menu-item').each(
                function (index, element) {
                    $(element).css('display', 'block');
                }
            );
        _super.prototype.delete.call(this);
    };

    return FinishQuestTeachingNote;
})(NavigateTeachingNote);