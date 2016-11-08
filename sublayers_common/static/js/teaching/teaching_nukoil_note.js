/*
* Нота, суть которой привести игрока на заправку и заправить машину.
*/

var NukoilTeachingNote = (function (_super) {
    __extends(NukoilTeachingNote, _super);

    function NukoilTeachingNote(options) {
        _super.call(this, options);

        this.needed_building = locationManager.buildings.nucoil;
        this.needed_npc = locationManager.npc['reg--registry-institutions-gas_station'];

        this.build_coord = new Point(958, 154);
        this.npc_coord = new Point(848, 658);

        this.gas_coord = new Point(943, 318);
        this.buy_btn = new Point(325, 608);
    }

    NukoilTeachingNote.prototype.redraw = function() {
        var active_place = locationManager.get_current_active_place();
        if ((this.needed_screen_name != locationManager.active_screen_name) ||
            ((active_place != this.needed_building) &&
             (active_place != this.needed_npc) &&
             (active_place != null))) {
            _super.prototype.redraw.call(this);
            teachingManager.jq_panel_left_content.text('Транспорт без топлива бесполезен. Нукойны - электронная валюта Корпорации Нукойл. За 1 нукойн можно купить 1 литр топлива.');
            teachingManager.jq_panel_right_content.text('Зайдите в Нукойл для заправки транспорта.');
            return;
        }

        if (active_place === null) {
            // Указать на здание в радуге
            this.draw_line(this.start_point, this.build_coord);
            teachingManager.jq_panel_left_content.text('Транспорт без топлива бесполезен. Нукойны - электронная валюта Корпорации Нукойл. За 1 нукойн можно купить 1 литр топлива.');
            teachingManager.jq_panel_right_content.text('Зайдите в Нукойл для заправки транспорта.');
        }

        if (active_place === this.needed_building) {
            // Указать на нпц в здании
            this.draw_line(this.start_point, this.npc_coord);
            teachingManager.jq_panel_left_content.text('Вы находитесь в приемной Нукойл. Для информации о страховках - кликните по ним. В любом отделении Нукойл вы можете получить услуги заправки и службы помощи клиентам.');
            teachingManager.jq_panel_right_content.text('Зайдите в меню заправки.');
        }

        if (active_place === this.needed_npc) {
            if (user.example_car)
                if (user.example_car.fuel != this.needed_npc._get_gas_by_prc(this.needed_npc.current_prc_gas))
                    this.draw_line(this.start_point, this.buy_btn);
                else
                    this.draw_line(this.start_point, this.gas_coord);

            teachingManager.jq_panel_left_content.text('В меню заправки можно заполнить топливный бак и пустые канистры.');
            teachingManager.jq_panel_right_content.text('Укажите количество литров ползунком или курсором и нажмите кнопку Заправить.');
        }
    };

    return NukoilTeachingNote;
})(NavigateTeachingNote);