var LocationManager = (function () {
    function LocationManager() {
        this.active_screen_name = null;
        this.screens = {
            location_screen: null,
            chat_screen: null,
            menu_screen: null
        };

        // todo: �������� ���� �������
        this.panel_left = new LocationPanelInfo(null);
        this.panel_right = new LocationPanelInfo(null);
    }

    // ��������� ���������� ����� ������ (���, �������, ������)
    LocationManager.prototype.activateScreen = function (screenName) {
        //console.log('LocationManager.prototype.activateScreen');
        if (this.screens.hasOwnProperty(screenName)) {
            this.active_screen_name = screenName;
            locationManager.screens[screenName].activate();
        }
    };

    LocationManager.prototype.onEnter = function (location) {
        //console.log('LocationManager.prototype.onEnter');
    };

    LocationManager.prototype.onExit = function () {
        //console.log('LocationManager.prototype.onExit');
    };

    return LocationManager;
})();


var LocationPanelInfo = (function () {
    function LocationPanelInfo() {
        this.jq_main_div = null;
    }

    LocationPanelInfo.prototype.init = function (jq_main_div) {
        //console.log('LocationPanelInfo.prototype.init');
        this.jq_main_div = jq_main_div;
    };

    return LocationPanelInfo;
})();


var LocationPlace = (function () {
    function LocationPlace() {
        this.jq_main_div = null;
    }

    LocationPlace.prototype.activate = function () {
        //console.log('LocationPlace.prototype.activate');

        // todo: ��������� ��� �����, ������ � ������������

        this.jq_main_div.css('display', 'block');
        locationManager.screens[locationManager.active_screen_name] = this;
    };

    return LocationPlace;
})();


var locationManager = new LocationManager();



