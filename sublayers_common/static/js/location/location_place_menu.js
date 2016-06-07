var LocationPlaceMenu = (function (_super) {
    __extends(LocationPlaceMenu, _super);

    function LocationPlaceMenu(jq_town_div) {
        //console.log('LocationPlaceMenu', jq_town_div);
        _super.call(this, $('#townMenuLocation'), 'menu_screen');
        locationManager.screens['menu_screen'] = this;
    }

    LocationPlaceMenu.prototype.activate = function () {
        //console.log('LocationPlaceMenu.prototype.activate', this.jq_main_div);
        _super.prototype.activate.call(this);
        $('#landscape').css('display', 'block');
    };

    LocationPlaceMenu.prototype.set_buttons = function () {
        if (!locationManager.isActivePlace(this)) return;
        locationManager.setBtnState(3, '</br>Назад', false);
        locationManager.setBtnState(4, '</br>Выход', true);
    };

    return LocationPlaceMenu;
})(LocationPlace);