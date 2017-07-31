/*
* Нота, суть которой привести игрока к тренеру и обучить распределению очков навыков.
*/

var TrainerTeachingNote = (function (_super) {
    __extends(TrainerTeachingNote, _super);

    function TrainerTeachingNote(options) {
        _super.call(this, options);

        this.needed_building = locationManager.buildings.library;
        this.needed_npc = locationManager.npc['reg--registry-institutions-trainer-whitehill_blackhawk_2094'];

        this.build_coord = new Point(924, 459);
        this.npc_coord = new Point(872, 695);

        this.skill_coord = new Point(1240, 530);
        this.buy_btn = new Point(402, 633);

        chat.addMessageToLog('Выполнив свое первое задание, вы получили немного опыта. Его необходимо потратить на получение  перков и улучшение навыков. Для этого нужен тренер. Он находится в здании “Библиотека”.', true);
    }

    TrainerTeachingNote.prototype.on_enter_location = function() {
        _super.prototype.on_enter_location.call(this);
        this.needed_building = locationManager.buildings.library;
        this.needed_npc = locationManager.npc['reg--registry-institutions-trainer-whitehill_blackhawk_2094'];
    };

    TrainerTeachingNote.prototype.redraw = function() {
        if (!locationManager.in_location_flag) return;
        var active_place = locationManager.get_current_active_place();
        if ((this.needed_screen_name != locationManager.active_screen_name) ||
            ((active_place != this.needed_building) &&
             (active_place != this.needed_npc) &&
             (active_place != null))) {
            teachingManager.jq_panel_left_content.text('Выполнив свое первое задание, вы заработали немного опыта. Его можно потратить на получение  перков и улучшение навыков. Для этого необходим тренер.');
            teachingManager.jq_panel_right_content.text('Зайти к Тренеру.');
            _super.prototype.redraw.call(this);
            return;
        }

        if (active_place === null) {
            // Указать на здание в радуге
            teachingManager.jq_panel_left_content.text('Выполнив свое первое задание, вы заработали немного опыта. Его можно потратить на получение  перков и улучшение навыков. Для этого необходим тренер.');
            teachingManager.jq_panel_right_content.text('Зайти к Тренеру.');
            this.draw_line(this.start_point, this.build_coord);
            return;
        }

        if (active_place === this.needed_building) {
            // Указать на нпц в здании
            teachingManager.jq_panel_left_content.text('Вы находитесь у тренера. Чтобы открыть интерфейс прокачки персонажа, нажмите на изображение тренера.');
            teachingManager.jq_panel_right_content.text('Нажать на изображение тренера.');
            this.draw_line(this.start_point, this.npc_coord);
        }

        if (active_place === this.needed_npc) {
            teachingManager.jq_panel_left_content.text('Вы находитесь в интерфейсе прокачки персонажа. Тут можно распределить свободные очки по необходимым перкам и навыкам.');
            teachingManager.jq_panel_right_content.text('Распределить свободные очки по навыкам и нажать кнопку <Применить>.');
            if (this.needed_npc._getFreeSkillPoints() == 0)
                this.draw_line(this.start_point, this.buy_btn);
            else
                this.draw_line(this.start_point, this.skill_coord);
        }
    };

    TrainerTeachingNote.prototype.delete = function() {
        // Google Analytics
        analytics.teach_city_finish();

        _super.prototype.delete.call(this);
    };
    
    return TrainerTeachingNote;
})(NavigateTeachingNote);


var ExitBtnTeachingNote = (function (_super) {
    __extends(ExitBtnTeachingNote, _super);

    function ExitBtnTeachingNote(options) {
        _super.call(this, options);
        this.exit_btn_coord = new Point(1485, 765);
        this.needed_screen_name = 'location_screen';
        chat.addMessageToLog('Поздравляем, вы прошли обучение!', true);
        this._sended_note = false;
    }

    ExitBtnTeachingNote.prototype.redraw = function() {
        if (!locationManager.in_location_flag) return;
        var active_place = locationManager.get_current_active_place();
        teachingManager.jq_panel_left_content.text('Поздравляем, вы прошли обучение! Ваша следующая задача - оплатить автокредит Нукойл. Для этого нужно заработать денег, выполняя задания. Перед выходом на глобальную карту получите их у городских жителей и убедитесь, что у вас хватает топлива для долгой поездки.');
        if (active_place) {
            teachingManager.jq_panel_right_content.text('Вернуться в меню города.');
            _super.prototype.redraw.call(this);
            return;
        }
        if (!this._sended_note) {
            clientManager.SendQuestNoteAction(this.uid, false);
            this._sended_note = true;
        }
        teachingManager.jq_panel_right_content.text('Выход на глобальную карту.');
        this.draw_line(this.start_point, this.exit_btn_coord);
    };

    ExitBtnTeachingNote.prototype.delete = function() {
        _super.prototype.delete.call(this);
        if (! locationManager.in_location_flag) return;
        var place = locationManager.get_current_active_place();
        if (locationManager.active_screen_name == 'location_screen' && !place)
            locationManager.set_panels_location_screen();
        if (place && place.set_panels)
            place.set_panels();
    };

    return ExitBtnTeachingNote;
})(NavigateTeachingNote);