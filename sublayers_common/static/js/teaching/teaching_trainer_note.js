/*
* Нота, суть которой привести игрока к тренеру и обучить распределению очков навыков.
*/

var TrainerTeachingNote = (function (_super) {
    __extends(TrainerTeachingNote, _super);

    function TrainerTeachingNote(options) {
        _super.call(this, options);

        this.needed_building = locationManager.buildings.library;
        this.needed_npc = locationManager.npc['reg--registry-institutions-trainer-whitehill_blackhawk_2094'];

        this.build_coord = new Point(958, 414);
        this.npc_coord = new Point(953, 658);

        this.skill_coord = new Point(1113, 350);
        this.buy_btn = new Point(325, 608);

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
            teachingManager.jq_panel_left_content.text('Выполнив свое первое задание, вы получили немного опыта. Его необходимо потратить на получение  перков и улучшение навыков. Для этого нужен тренер. Он находится в здании “Библиотека”.');
            teachingManager.jq_panel_right_content.text('Зайдите в здание “Библиотека”.');
            _super.prototype.redraw.call(this);
            return;
        }

        if (active_place === null) {
            // Указать на здание в радуге
            teachingManager.jq_panel_left_content.text('Выполнив свое первое задание, вы получили немного опыта. Его необходимо потратить на получение  перков и улучшение навыков. Для этого нужен тренер. Он находится в здании “Библиотека”.');
            teachingManager.jq_panel_right_content.text('Зайдите в здание “Библиотека”.');
            this.draw_line(this.start_point, this.build_coord);
            return;
        }

        if (active_place === this.needed_building) {
            // Указать на нпц в здании
            teachingManager.jq_panel_left_content.text('Вы находитесь в здании “Библиотека”. Тут находится тренер.');
            teachingManager.jq_panel_right_content.text('Зайдите к тренеру.');
            this.draw_line(this.start_point, this.npc_coord);
        }

        if (active_place === this.needed_npc) {
            teachingManager.jq_panel_left_content.text('Вы находитесь в интерфейсе тренера. Тут можно распределить свободные очки по необходимым перкам и навыкам.');
            teachingManager.jq_panel_right_content.text('Распределите свободные очки по навыкам. Нажмите кнопку Применить.');
            if (this.needed_npc._getFreeSkillPoints() == 0)
                this.draw_line(this.start_point, this.buy_btn);
            else
                this.draw_line(this.start_point, this.skill_coord);
        }
    };

    return TrainerTeachingNote;
})(NavigateTeachingNote);



var ExitBtnTeachingNote = (function (_super) {
    __extends(ExitBtnTeachingNote, _super);

    function ExitBtnTeachingNote(options) {
        _super.call(this, options);
        this.exit_btn_coord = new Point(1600, 800);
        this.needed_screen_name = 'location_screen';
        chat.addMessageToLog('Поздравляем, вы прошли обучение!', true);
        this._sended_note = false;
    }

    ExitBtnTeachingNote.prototype.redraw = function() {
        if (!locationManager.in_location_flag) return;
        var active_place = locationManager.get_current_active_place();
        teachingManager.jq_panel_left_content.text('Поздравляем, вы прошли обучение! Ваша следующая задача - оплатить автокредит Нукойл. Для этого нужно заработать денег, выполняя задания. Перед выходом на глобальную карту получите их  у городских жителей и убедитесь, что у вас хватает топлива для долгой поездки.');
        if (active_place) {
            teachingManager.jq_panel_right_content.text('Вернитесь в меню города.');
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