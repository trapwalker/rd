/*
* Нота, суть которой привести игрока к нпц по продаже машин и купить машину.
*/

var HangarTeachingNote = (function (_super) {
    __extends(HangarTeachingNote, _super);

    function HangarTeachingNote(options) {
        _super.call(this, options);

        this.npc_node_hash = 'reg:///registry/institutions/hangar/whitehill_junior_clarks';  // Должено быть входным параметром

        this.needed_building = locationManager.get_building_by_node_hash(this.npc_node_hash);
        this.needed_npc = locationManager.get_npc_by_node_hash(this.npc_node_hash);

        this.build_coord = new Point(803, 674);
        this.npc_coord = new Point(772, 695);

        this.inventory_coord = new Point(791, 742);
        this.buy_btn = new Point(402, 633);

        chat.addMessageToLog(_("teach_town_hangar_note_log"), true);

        // Google Analytics
        analytics.teach_city_start();
    }

    HangarTeachingNote.prototype.on_enter_location = function() {
        _super.prototype.on_enter_location.call(this);
        this.needed_building = locationManager.get_building_by_node_hash(this.npc_node_hash);
        this.needed_npc = locationManager.get_npc_by_node_hash(this.npc_node_hash);
    };

    HangarTeachingNote.prototype.redraw = function() {
        if (!locationManager.in_location_flag) return;
        var active_place = locationManager.get_current_active_place();
        if (this.needed_screen_name != locationManager.active_screen_name || (active_place != this.needed_building && active_place != this.needed_npc && active_place != null)) {
            teachingManager.jq_panel_left_content.text(_("teach_town_hangar_note_1"));
            teachingManager.jq_panel_right_content.text(_("teach_town_hangar_note_2"));
            _super.prototype.redraw.call(this);
            return;
        }

        if (active_place === null) {
            // Указать на здание в радуге
            teachingManager.jq_panel_left_content.text(_("teach_town_hangar_note_1"));
            teachingManager.jq_panel_right_content.text(_("teach_town_hangar_note_2"));
            this.draw_line(this.start_point, this.build_coord);
        }
        
        if (active_place === this.needed_building) {
            // Указать на нпц в здании
            teachingManager.jq_panel_left_content.text(_("teach_town_hangar_note_3"));
            teachingManager.jq_panel_right_content.text(_("teach_town_hangar_note_4"));
            this.draw_line(this.start_point, this.npc_coord);
        }

        if (active_place === this.needed_npc) {
            // рисовать указатель на список машинок
            teachingManager.jq_panel_left_content.text(_("teach_town_hangar_note_5"));
            teachingManager.jq_panel_right_content.text(_("teach_town_hangar_note_6"));
            this.draw_line(this.start_point, this.inventory_coord);
            // рисовать указатель на покупку только тогда, когда есть на эту машинки деньги
            if (this.needed_npc.cars_list[this.needed_npc.current_car].car.price <= user.balance)
                this.draw_line(this.start_point, this.buy_btn);
        }
    };
    
    HangarTeachingNote.prototype.delete = function() {
        // Google Analytics
        analytics.teach_city_car();
        
        _super.prototype.delete.call(this);
    };

    return HangarTeachingNote;
})(NavigateTeachingNote);