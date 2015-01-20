

// Список Иконок для всех видов маркеров леафлета

var LeafletIconManager = (function(){
    function LeafletIconManager(){
        var icons = {};
        this.icons = icons;

        // Создание иконки города
        icons['icon_city'] = new L.icon({
            iconUrl: 'img/map_icons/map_ico_city.png',
            iconSize: [26, 29]
        });

        // Создание иконки заправочной станции
        icons['icon_station'] = new L.icon({
            iconUrl: 'img/map_icons/map_ico_fuelstation.png',
            iconSize: [26, 29]
        });


        // Создание иконки движущейся машинки V 1
        icons['icon_moving_V1'] = new L.icon({
            iconUrl: 'img/map_icons/map_icon_player_v1_moving.png',
            iconSize: [51, 28]
        });

        // Создание иконки стоящей машинки V 1
        icons['icon_stopped_V1'] = new L.icon({
            iconUrl: 'img/map_icons/map_icon_player_v1_stopped.png',
            iconSize: [51, 28]
        });

        // Создание иконки убитой машинки V 1
        icons['icon_killed_V1'] = new L.icon({
            iconUrl: 'img/map_icons/map_icon_player_v1_killed.png',
            iconSize: [51, 28]
        });

        // Создание иконки движущейся машинки V 2
        icons['icon_moving_V2'] = new L.icon({
            iconUrl: 'img/map_icons/map_icon_player_v2_moving_slow.png',
            iconSize: [51, 28]
        });

        // Создание иконки БЫСТРО движущейся машинки V 2
        icons['icon_moving_fast_V2'] = new L.icon({
            iconUrl: 'img/map_icons/map_icon_player_v2_moving_fast.png',
            iconSize: [51, 28]
        });

        // Создание иконки стоящей машинки V 2
        icons['icon_stopped_V2'] = new L.icon({
            iconUrl: 'img/map_icons/map_icon_player_v2_stopped.png',
            iconSize: [51, 28]
        });

        // Создание иконки убитой машинки V 2
        icons['icon_killed_V2'] = new L.icon({
            iconUrl: 'img/map_icons/map_icon_player_v2_killed.png',
            iconSize: [51, 28]
        });


        // Создание иконки движущейся машинки V 3
        icons['icon_moving_V3'] = new L.icon({
            iconUrl: 'img/map_icons/map_icon_player_v3_moving.png',
            iconSize: [51, 28]
        });

        // Создание иконки стоящей машинки V 3
        icons['icon_stopped_V3'] = new L.icon({
            iconUrl: 'img/map_icons/map_icon_player_v3_stopped.png',
            iconSize: [51, 28]
        });

        // Создание иконки ракеты
        icons['icon_rocket_V1'] = new L.icon({
            iconUrl: 'img/map_icons/map_icon_rocket.png',
            iconSize: [40, 18]
        });

    }


    LeafletIconManager.prototype.getIcon = function(icon_name){
        return this.icons[icon_name];
    };


    return LeafletIconManager;
})();


// Массив иконок
var iconsLeaflet = new LeafletIconManager();