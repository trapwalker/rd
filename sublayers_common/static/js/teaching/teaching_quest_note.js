/*
* Нота, суть которой привести игрока к Мэру и взять первый квест.
*/
var GetQuestTeachingNote = (function (_super) {
    __extends(GetQuestTeachingNote, _super);

    function GetQuestTeachingNote(options) {
        _super.call(this, options);
        this.needed_building = locationManager.buildings.mayor;
        this.quest_uid = options.target_quest_uid;

        this.build_coord = new Point(650, 516);
        this.active_quests_page = new Point(708, 363);
        this.first_quest = new Point(831, 524);
        this.buy_btn = new Point(402, 633);

        chat.addMessageToLog('Теперь Вы готовы к выполнению первой работы. Посмотреть предлагаемые задания можно в любом здании. Например у мэра.', true);
    }

    GetQuestTeachingNote.prototype.on_enter_location = function() {
        _super.prototype.on_enter_location.call(this);
        this.needed_building = locationManager.buildings.mayor;
    };

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
        if (!locationManager.in_location_flag) return;
        var active_place = locationManager.get_current_active_place();
        if ((this.needed_screen_name != locationManager.active_screen_name) ||
            ((active_place != this.needed_building) &&
             (active_place != null))) {
            _super.prototype.redraw.call(this);
            teachingManager.jq_panel_left_content.text('Теперь Вы готовы к выполнению первой работы. Поискать предлагаемые задания можно в любом здании. Например в Мэрии.');
            teachingManager.jq_panel_right_content.text('Зайти к Мэру.');
            return;
        }

        if (active_place === null) {
            // Указать на здание в радуге
            this.draw_line(this.start_point, this.build_coord);
            teachingManager.jq_panel_left_content.text('Теперь Вы готовы к выполнению первой работы. Поискать предлагаемые задания можно в любом здании. Например в Мэрии.');
            teachingManager.jq_panel_right_content.text('Зайти к Мэру');
        }

        if (active_place === this.needed_building) {
            teachingManager.jq_panel_left_content.text('Вы находитесь в здании Мэра. Тут можно просмотреть доступные задания и выбрать подходящее для выполнения.');
            if (active_place.active_central_page.split('_')[0] == 'buildingPageAvailableTasks') {
                // Если мы в доступных квестах и выбран нужный квест
                this.move_quest_to_start();
                if (active_place.selected_quest && active_place.selected_quest.uid == this.quest_uid) {
                    // указать на кнопку "Принять"
                    this.draw_line(this.start_point, this.buy_btn);
                    teachingManager.jq_panel_right_content.text('Нажать кнопку <Принять>.');
                }
                else {
                    // то указать на нужный квест  (или временно скрыть все остальные квесты)
                    this.draw_line(this.start_point, this.first_quest);
                    teachingManager.jq_panel_right_content.text('Выбрать задание “Учебная доставка”.');
                }
            }
            else {
                // Иначе указать на плашку "доступные квесты"
                this.draw_line(this.start_point, this.active_quests_page);
                teachingManager.jq_panel_right_content.text('Выбрать задание “Учебная доставка”.');
            }
        }
    };

    GetQuestTeachingNote.prototype.delete = function() {
        // Google Analytics
        analytics.teach_city_get_q();

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
        this.target_build_name = options.target_build_name;
        var cords_list = options.target_build_coord.split(',');
        this.build_coord = new Point(parseInt(cords_list[0]), parseInt(cords_list[1]));
        this.needed_building = locationManager.buildings[this.target_build_name];

        this.note_uid = options.target_note_uid;
        this.buy_btn = new Point(402, 633);
        this.third_note_btn =  new Point(708, 450);

        this.text_for_right_navigate = '';
        this.text_for_left_navigate = '';
        this.text_for_left_info = '';
        switch (this.target_build_name){
            case 'bar':
                this.text_for_right_navigate = 'Зайти в Бар.';
                this.text_for_left_navigate = 'По заданию вам необходимо передать бармену кое-что.';
                this.text_for_left_info = 'Вы находитесь в Баре. Тут можно найти бармена и компаньонок. Бармен может предложить интересные задания, а компаньонка поможет хорошо провести свободное время.';
                break;
            case 'market':
                this.text_for_right_navigate = 'Зайти к Торговцу.';
                this.text_for_left_navigate = 'По заданию вам необходимо отдать торговцу кое-что.';
                this.text_for_left_info = 'Вы находитесь у торговца.';
                break;
            case 'library':
                this.text_for_right_navigate = 'Зайти к Тренеру.';
                this.text_for_left_navigate = 'По заданию вам необходимо передать кое-что тренеру.';
                this.text_for_left_info = 'Вы находитесь у тренера.';
                break;
        }
    }

    FinishQuestTeachingNote.prototype.on_enter_location = function() {
        _super.prototype.on_enter_location.call(this);
        this.needed_building = locationManager.buildings[this.target_build_name];
    };

    FinishQuestTeachingNote.prototype.move_note_to_third = function () {
        var self = this;
        var jq_menu_notes_wrap = this.needed_building.jq_main_div.find('.building-center-menu-block-wrap').first();

        // Если нота итак находится после второго элемента, то не двишать ничего
        if($(jq_menu_notes_wrap.find('.building-center-menu-item')[2]).data('page_id').indexOf('building_note_' + self.note_uid) >= 0)
            return;
        // Иначе передвинуть ноту на третье место в менюшке
        if (jq_menu_notes_wrap)
            jq_menu_notes_wrap.find('.building-center-menu-item').each(function () {
                var element = $(this);
                if (element.data('page_id').indexOf('building_note_' + self.note_uid) >= 0)
                    $(element.parent().find('.building-center-menu-item')[1]).after(this);
            });
    };

    FinishQuestTeachingNote.prototype.redraw = function() {
        if (!locationManager.in_location_flag) return;
        var active_place = locationManager.get_current_active_place();
        if ((this.needed_screen_name != locationManager.active_screen_name) ||
            ((active_place != this.needed_building) &&
             (active_place != null))) {
            teachingManager.jq_panel_left_content.text(this.text_for_left_navigate);
            teachingManager.jq_panel_right_content.text(this.text_for_right_navigate);
            _super.prototype.redraw.call(this);
            return;
        }

        if (active_place === null) {
            // Указать на здание в радуге
            teachingManager.jq_panel_left_content.text(this.text_for_left_navigate);
            teachingManager.jq_panel_right_content.text(this.text_for_right_navigate);
            this.draw_line(this.start_point, this.build_coord);
        }

        if (active_place === this.needed_building) {
            teachingManager.jq_panel_left_content.text(this.text_for_left_info);
            var note = active_place.get_active_note();
            this.move_note_to_third();
            if (note && note.uid == this.note_uid) {
                // Если мы активировали правильную ноту
                teachingManager.jq_panel_right_content.text('Нажать кнопку <Сдать>.');
                this.draw_line(this.start_point, this.buy_btn);
            }
            else {
                // Иначе указать на третью плашку
                teachingManager.jq_panel_right_content.text('Нажать кнопку <Учебная доставка>.');
                this.draw_line(this.start_point, this.third_note_btn);
            }
        }
    };

    FinishQuestTeachingNote.prototype.delete = function() {
        // Google Analytics
        analytics.teach_city_fin_q();

        _super.prototype.delete.call(this);
    };

    return FinishQuestTeachingNote;
})(NavigateTeachingNote);