/*
* Нота, суть которой привести игрока к торговцу и купить пулемёт
*/

var TraderTeachingNote = (function (_super) {
    __extends(TraderTeachingNote, _super);

    function TraderTeachingNote(options) {
        _super.call(this, options);
        this.needed_building = locationManager.get_building_by_node_hash('reg:///registry/institutions/trader/whitehill_bob_ferolito');
        this.needed_npc = locationManager.get_npc_by_node_hash('reg:///registry/institutions/trader/whitehill_bob_ferolito');

        this.build_coord = new Point(821, 517);
        this.npc_coord = new Point(872, 695);

        this.buy_area = new Point(1244, 351);
        this.buy_btn = new Point(402, 633);
        this.filter = null;

        chat.addMessageToLog(_("teach_town_trader_note_log"), true);
    }

    TraderTeachingNote.prototype.on_enter_location = function() {
        _super.prototype.on_enter_location.call(this);
        this.needed_building = locationManager.get_building_by_node_hash('reg:///registry/institutions/trader/whitehill_bob_ferolito');
        this.needed_npc = locationManager.get_npc_by_node_hash('reg:///registry/institutions/trader/whitehill_bob_ferolito');
    };

    TraderTeachingNote.prototype.check_table = function () {
        return this.needed_npc.traderTable.length > 1;
    };

    TraderTeachingNote.prototype.redraw = function() {
        if (!locationManager.in_location_flag) return;
        var active_place = locationManager.get_current_active_place();
        if (!this.needed_building)
            this.needed_building = locationManager.get_building_by_node_hash('reg:///registry/institutions/trader/whitehill_bob_ferolito');
        if (!this.needed_npc)
            this.needed_npc = locationManager.get_npc_by_node_hash('reg:///registry/institutions/trader/whitehill_bob_ferolito');

        if ((this.needed_screen_name != locationManager.active_screen_name) ||
            ((active_place != this.needed_building) &&
             (active_place != this.needed_npc) &&
             (active_place != null))) {
            teachingManager.jq_panel_left_content.text(_("teach_town_trader_note_1"));
            teachingManager.jq_panel_right_content.text(_("teach_town_trader_note_2"));
            _super.prototype.redraw.call(this);
            return;
        }

        if (active_place === null) {
            // Указать на здание в радуге
            teachingManager.jq_panel_left_content.text(_("teach_town_trader_note_1"));
            teachingManager.jq_panel_right_content.text(_("teach_town_trader_note_2"));
            this.draw_line(this.start_point, this.build_coord);
            return;
        }

        if (active_place === this.needed_building) {
            // Указать на нпц в здании
            teachingManager.jq_panel_left_content.text(_("teach_town_trader_note_3"));
            teachingManager.jq_panel_right_content.text(_("teach_town_trader_note_4"));
            this.draw_line(this.start_point, this.npc_coord);
        }

        if (active_place === this.needed_npc) {
            teachingManager.jq_panel_left_content.text(_("teach_town_trader_note_5"));

            // Если не было добавлено обучающего списка, то добавить и переключить
            if (! this.filter) {
                this.filter = new TraderAssortmentFilterTags(_("loc_tarder_filter_teach"), ['teaching']);
                active_place.filters.push(this.filter);
                active_place.current_trader_filter_index = active_place.filters.indexOf(this.filter);
                active_place.filter_apply('trader', this.filter);
            }

            if (this.check_table()) {
                teachingManager.jq_panel_right_content.text(_("teach_town_trader_note_6"));
                this.draw_line(this.start_point, this.buy_btn);
            }
            else {
                teachingManager.jq_panel_right_content.text(_("teach_town_trader_note_7"));
                this.draw_line(this.start_point, this.buy_area);
            }
        }
    };

    TraderTeachingNote.prototype.delete = function() {
        // Удалить фильтр
        if (this.filter) {
            var index = this.needed_npc.filters.indexOf(this.filter);
            this.needed_npc.current_trader_filter_index = 0;
            this.needed_npc.filter_apply('trader', this.needed_npc.filters[0]);
            this.needed_npc.filters.splice(index, 1);
        }
        _super.prototype.delete.call(this);
        
        // Google Analytics
        analytics.teach_city_trader();   
    };

    return TraderTeachingNote;
})(NavigateTeachingNote);