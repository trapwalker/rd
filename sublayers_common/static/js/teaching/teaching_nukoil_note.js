/*
* Нота, суть которой привести игрока на заправку и заправить машину.
*/

var NukoilTeachingNote = (function (_super) {
    __extends(NukoilTeachingNote, _super);

    function NukoilTeachingNote(options) {
        _super.call(this, options);

        this.needed_building = locationManager.buildings.nukeoil;
        this.needed_npc = locationManager.npc['reg--registry-institutions-gas_station'];

        this.build_coord = new Point(1253, 708);
        this.npc_coord = new Point(772, 695);

        this.gas_coord = new Point(992, 424);
        this.buy_btn = new Point(402, 633);

        chat.addMessageToLog(_("teach_town_nukeoil_note_log"), true);
    }

    NukoilTeachingNote.prototype.on_enter_location = function() {
        _super.prototype.on_enter_location.call(this);
        this.needed_building = locationManager.buildings.nukeoil;
        this.needed_npc = locationManager.npc['reg--registry-institutions-gas_station'];
    };

    NukoilTeachingNote.prototype.redraw = function() {
        if (!locationManager.in_location_flag) return;
        var active_place = locationManager.get_current_active_place();

        if(!this.needed_building) this.needed_building = locationManager.buildings.nukeoil;
        if(!this.needed_npc) this.needed_npc = locationManager.npc['reg--registry-institutions-gas_station'];

        if ((this.needed_screen_name != locationManager.active_screen_name) ||
            ((active_place != this.needed_building) &&
             (active_place != this.needed_npc) &&
             (active_place != null))) {
            teachingManager.jq_panel_left_content.text(_("teach_town_nukeoil_note_1"));
            teachingManager.jq_panel_right_content.text(_("teach_town_nukeoil_note_2"));
            _super.prototype.redraw.call(this);
            return;
        }

        if (active_place === null) {
            // Указать на здание в радуге
            teachingManager.jq_panel_left_content.text(_("teach_town_nukeoil_note_1"));
            teachingManager.jq_panel_right_content.text(_("teach_town_nukeoil_note_2"));
            this.draw_line(this.start_point, this.build_coord);
        }

        if (active_place === this.needed_building) {
            // Указать на нпц в здании
            teachingManager.jq_panel_left_content.text(_("teach_town_nukeoil_note_3"));
            teachingManager.jq_panel_right_content.text(_("teach_town_nukeoil_note_4"));
            this.draw_line(this.start_point, this.npc_coord);
        }

        if (active_place === this.needed_npc) {
            teachingManager.jq_panel_left_content.text(_("teach_town_nukeoil_note_5"));
            teachingManager.jq_panel_right_content.text(_("teach_town_nukeoil_note_6"));

            if (user.example_car)
                if (Math.round(user.example_car.fuel) != this.needed_npc._get_gas_by_prc(this.needed_npc.current_prc_gas))
                    this.draw_line(this.start_point, this.buy_btn);
                else
                    this.draw_line(this.start_point, this.gas_coord);
        }
    };


    NukoilTeachingNote.prototype.delete = function() {
        // Google Analytics
        analytics.teach_city_nukeoil();

        _super.prototype.delete.call(this);
    };

    return NukoilTeachingNote;
})(NavigateTeachingNote);