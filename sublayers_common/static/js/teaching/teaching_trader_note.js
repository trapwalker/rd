/*
* Нота, суть которой привести игрока к торговцу и купить пулемёт
*/

var TraderTeachingNote = (function (_super) {
    __extends(TraderTeachingNote, _super);

    function TraderTeachingNote(options) {
        _super.call(this, options);
        this.needed_building = locationManager.get_building_by_node_hash('reg:///registry/institutions/trader/bob_ferolito');
        this.needed_npc = locationManager.get_npc_by_node_hash('reg:///registry/institutions/trader/bob_ferolito');

        this.build_coord = new Point(958, 372);
        this.npc_coord = new Point(953, 658);

        this.buy_area = new Point(1260, 330);
        this.buy_btn = new Point(295, 608);

        this.filter = null;
    }

    TraderTeachingNote.prototype.check_table = function () {
        return this.needed_npc.traderTable.length > 1;
    };

    TraderTeachingNote.prototype.redraw = function() {
        var active_place = locationManager.get_current_active_place();
        if ((this.needed_screen_name != locationManager.active_screen_name) ||
            ((active_place != this.needed_building) &&
             (active_place != this.needed_npc) &&
             (active_place != null))) {
            _super.prototype.redraw.call(this);
            teachingManager.jq_panel_left_content.text('Машина не машина без вооружения. Но сначала его необходимо приобрести у торговца. Торговец находится в здании рынка.');
            teachingManager.jq_panel_right_content.text('Зайдите в рынок.');
            return;
        }

        if (active_place === null) {
            // Указать на здание в радуге
            this.draw_line(this.start_point, this.build_coord);
            teachingManager.jq_panel_left_content.text('Машина не машина без вооружения. Но сначала его необходимо приобрести у торговца. Торговец находится в здании рынка.');
            teachingManager.jq_panel_right_content.text('Зайдите в рынок.');
        }

        if (active_place === this.needed_building) {
            // Указать на нпц в здании
            this.draw_line(this.start_point, this.npc_coord);
            teachingManager.jq_panel_left_content.text('Вы находитесь в здании рынка. Тут находится торговец.');
            teachingManager.jq_panel_right_content.text('Зайдите к торговцу.');
        }

        if (active_place === this.needed_npc) {
            teachingManager.jq_panel_left_content.text('Вы находитесь в интерфейсе торговца. Тут можно приобрести различные полезные вещи и продать ненужные.');

            // Если не было добавлено обучающего списка, то добавить и переключить
            if (! this.filter) {
                this.filter = new TraderAssortmentFilterTags('Обучение', ['teaching']);
                active_place.filters.push(this.filter);
                active_place.current_trader_filter_index = active_place.filters.indexOf(this.filter);
                active_place.filter_apply('trader', this.filter);
            }

            if (this.check_table()) {
                this.draw_line(this.start_point, this.buy_btn);
                teachingManager.jq_panel_right_content.text('Нажмите кнопку <Подтвердить сделку>.');
            }
            else {
                this.draw_line(this.start_point, this.buy_area);
                teachingManager.jq_panel_right_content.text('Найдите пулемет в колонке “Товары на продажу” и перекиньте его на столик обмена.');
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
    };

    return TraderTeachingNote;
})(NavigateTeachingNote);