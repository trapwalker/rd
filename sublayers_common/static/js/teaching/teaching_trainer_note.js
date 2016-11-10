/*
* Нота, суть которой привести игрока к тренеру и обучить распределению очков навыков.
*/

var TrainerTeachingNote = (function (_super) {
    __extends(TrainerTeachingNote, _super);

    function TrainerTeachingNote(options) {
        _super.call(this, options);

        this.needed_building = locationManager.buildings.library;
        this.needed_npc = locationManager.npc['reg--registry-institutions-trainer-blackhawk_2094'];

        this.build_coord = new Point(958, 414);
        this.npc_coord = new Point(953, 658);

        this.skill_coord = new Point(1113, 350);
        this.buy_btn = new Point(325, 608);
    }

    TrainerTeachingNote.prototype.on_enter_location = function() {
        _super.prototype.on_enter_location.call(this);
        this.needed_building = locationManager.buildings.library;
        this.needed_npc = locationManager.npc['reg--registry-institutions-trainer-blackhawk_2094'];
    };

    TrainerTeachingNote.prototype.redraw = function() {
        if (!locationManager.in_location_flag) return;
        var active_place = locationManager.get_current_active_place();
        if ((this.needed_screen_name != locationManager.active_screen_name) ||
            ((active_place != this.needed_building) &&
             (active_place != this.needed_npc) &&
             (active_place != null))) {
            _super.prototype.redraw.call(this);
            teachingManager.jq_panel_left_content.text('Выполнив свое первое задание вы получили немного опыта. Его необходимо потратить на получение  перков и улучшение навыков. Для этого нужен тренер. Он находится в здании “Библиотека”.');
            teachingManager.jq_panel_right_content.text('Зайдите в здание “Библиотека”.');
            return;
        }

        if (active_place === null) {
            // Указать на здание в радуге
            this.draw_line(this.start_point, this.build_coord);
            teachingManager.jq_panel_left_content.text('Выполнив свое первое задание вы получили немного опыта. Его необходимо потратить на получение  перков и улучшение навыков. Для этого нужен тренер. Он находится в здании “Библиотека”.');
            teachingManager.jq_panel_right_content.text('Зайдите в здание “Библиотека”.');
        }

        if (active_place === this.needed_building) {
            // Указать на нпц в здании
            this.draw_line(this.start_point, this.npc_coord);
            teachingManager.jq_panel_left_content.text('Вы находитесь в здании “Библиотека”. Тут находится тренер.');
            teachingManager.jq_panel_right_content.text('Зайдите к тренеру.');
        }

        if (active_place === this.needed_npc) {
            if (this.needed_npc._getFreeSkillPoints() == 0)
                this.draw_line(this.start_point, this.buy_btn);
            else
                this.draw_line(this.start_point, this.skill_coord);

            teachingManager.jq_panel_left_content.text('Вы находитесь в интерфейсе тренера. Тут можно распределить свободные очки по необходимым перкам и навыкам.');
            teachingManager.jq_panel_right_content.text('Распределите свободные очки по навыкам. Нажмите кнопку Применить.');
        }
    };

    return TrainerTeachingNote;
})(NavigateTeachingNote);