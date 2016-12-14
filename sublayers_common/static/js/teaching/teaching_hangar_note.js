/*
* Нота, суть которой привести игрока к нпц по продаже машин и купить машину.
*/

var HangarTeachingNote = (function (_super) {
    __extends(HangarTeachingNote, _super);

    function HangarTeachingNote(options) {
        _super.call(this, options);

        this.npc_node_hash = 'reg:///registry/institutions/hangar/jounior_clarx';  // Должено быть входным параметром

        this.needed_building = locationManager.get_building_by_node_hash(this.npc_node_hash);
        this.needed_npc = locationManager.get_npc_by_node_hash(this.npc_node_hash);

        this.build_coord = new Point(958, 287);
        this.npc_coord = new Point(848, 658);

        this.inventory_coord = new Point(734, 701);
        this.buy_btn = new Point(325, 608);

        chat.addMessageToLog('Вы находитесь в интерфейсе города. Покидание города без оборудованного транспорта обречет вас на смерть от холода и отравления. Купите свой первый транспорт.');
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
            teachingManager.jq_panel_left_content.text('Вы находитесь в интерфейсе города. Покидание города без оборудованного транспорта обречет вас на смерть от холода и отравления. Купите свой первый транспорт.');
            teachingManager.jq_panel_right_content.text('Зайти к автодилеру чтобы купить ТС.');
            _super.prototype.redraw.call(this);
            return;
        }

        if (active_place === null) {
            // Указать на здание в радуге
            teachingManager.jq_panel_left_content.text('Вы находитесь в интерфейсе города. Покидание города без оборудованного транспорта обречет вас на смерть от холода и отравления. Купите свой первый транспорт.');
            teachingManager.jq_panel_right_content.text('Зайти к автодилеру чтобы купить ТС.');
            this.draw_line(this.start_point, this.build_coord);
        }
        
        if (active_place === this.needed_building) {
            // Указать на нпц в здании
            teachingManager.jq_panel_left_content.text('Вы в меню автодилера. Свяжитесь со специалистом, отвечающим за продажу, чтобы купить транспорт.');
            teachingManager.jq_panel_right_content.text('Зайдите к продавцу машин.');
            this.draw_line(this.start_point, this.npc_coord);
        }

        if (active_place === this.needed_npc) {
            // рисовать указатель на список машинок
            teachingManager.jq_panel_left_content.text('Нужно выбрать транспорт, цену за который сможет покрыть автокредит Нукойл.');
            teachingManager.jq_panel_right_content.text('Выберите подходящий транспорт.');
            this.draw_line(this.start_point, this.inventory_coord);
            // рисовать указатель на покупку только тогда, когда есть на эту машинки деньги
            if (this.needed_npc.cars_list[this.needed_npc.current_car].car.price <= user.balance)
                this.draw_line(this.start_point, this.buy_btn);
        }
    };

    return HangarTeachingNote;
})(NavigateTeachingNote);