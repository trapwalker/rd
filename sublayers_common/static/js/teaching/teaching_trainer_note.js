/*
* Нота, суть которой привести игрока к тренеру и обучить распределению очков навыков.
*/

var TrainerTeachingNote = (function (_super) {
    __extends(TrainerTeachingNote, _super);

    function TrainerTeachingNote(options) {
        _super.call(this, options);

        this.needed_building = locationManager.buildings.library;
        this.needed_npc = locationManager.npc['reg--registry-institutions-trainer-whitehill_blackhawk_2094'];

        this.build_coord = new Point(918, 633);
        this.npc_coord = new Point(872, 695);

        this.skill_coord = new Point(1240, 530);
        this.buy_btn = new Point(402, 633);

        chat.addMessageToLog(_("teach_town_trainer_log"), true);
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
            teachingManager.jq_panel_left_content.text(_('teach_town_trainer_note_1'));
            teachingManager.jq_panel_right_content.text(_('teach_town_trainer_note_2'));
            _super.prototype.redraw.call(this);
            return;
        }

        if (active_place === null) {
            // Указать на здание в радуге
            teachingManager.jq_panel_left_content.text(_('teach_town_trainer_note_1'));
            teachingManager.jq_panel_right_content.text(_('teach_town_trainer_note_2'));
            this.draw_line(this.start_point, this.build_coord);
            return;
        }

        if (active_place === this.needed_building) {
            // Указать на нпц в здании
            teachingManager.jq_panel_left_content.text(_("teach_town_trainer_note_3"));
            teachingManager.jq_panel_right_content.text(_("teach_town_trainer_note_4"));
            this.draw_line(this.start_point, this.npc_coord);
        }

        if (active_place === this.needed_npc) {
            teachingManager.jq_panel_left_content.text(_("teach_town_trainer_note_5"));
            teachingManager.jq_panel_right_content.text(_("teach_town_trainer_note_6"));
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
        chat.addMessageToLog(_("teach_town_finish_log"), true);
        this._sended_note = false;
    }

    ExitBtnTeachingNote.prototype.redraw = function() {
        if (!locationManager.in_location_flag) return;
        var active_place = locationManager.get_current_active_place();
        teachingManager.jq_panel_left_content.text(_("teach_town_finish_note_1"));
        if (active_place) {
            teachingManager.jq_panel_right_content.text(_("teach_town_finish_note_2"));
            _super.prototype.redraw.call(this);
            return;
        }
        if (!this._sended_note) {
            clientManager.SendQuestNoteAction(this.uid, false);
            this._sended_note = true;
        }
        teachingManager.jq_panel_right_content.text(_("teach_town_finish_note_3"));
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