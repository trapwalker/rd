

// Список Иконок для всех видов маркеров леафлета

var LeafletIconManager = (function(){
    function LeafletIconManager(){
        var icons = {};
        this.icons = icons;
        this.max_id = 0;

        // Создание иконки города
        icons['icon_city'] = {
            icon: new L.icon({
                iconUrl: 'img/map_icons/map_ico_city.png',
                iconSize: [26, 29]
            }),
            id: this.max_id
        };

        // Создание иконки заправочной станции
        icons['icon_station'] = {
            icon: new L.icon({
                iconUrl: 'img/map_icons/map_ico_fuelstation.png',
                iconSize: [26, 29]
            }),
            id: this.max_id++
        };


        // Создание иконки движущейся машинки V 1
        icons['icon_moving_V1'] = {
            icon: new L.icon({
                iconUrl: 'img/map_icons/map_icon_player_v1_moving.png',
                iconSize: [51, 28]
            }),
            id: this.max_id++
        };

        // Создание иконки стоящей машинки V 1
        icons['icon_stopped_V1'] = {
            icon: new L.icon({
                iconUrl: 'img/map_icons/map_icon_player_v1_stopped.png',
                iconSize: [51, 28]
            }),
            id: this.max_id++
        };

        // Создание иконки убитой машинки V 1
        icons['icon_killed_V1'] = {
            icon: new L.icon({
                iconUrl: 'img/map_icons/map_icon_player_v1_killed.png',
                iconSize: [51, 28]
            }),
            id: this.max_id++
        };

        // Создание иконки движущейся машинки V 2
        icons['icon_moving_V2'] = {
            icon: new L.icon({
                iconUrl: 'img/map_icons/map_icon_player_v2_moving_slow.png',
                iconSize: [51, 28]
            }),
            id: this.max_id++
        };

        // Создание иконки БЫСТРО движущейся машинки V 2
        icons['icon_moving_fast_V2'] = {
            icon: new L.icon({
                iconUrl: 'img/map_icons/map_icon_player_v2_moving_fast.png',
                iconSize: [51, 28]
            }),
            id: this.max_id++
        };

        // Создание иконки стоящей машинки V 2
        icons['icon_stopped_V2'] = {
            icon: new L.icon({
                iconUrl: 'img/map_icons/map_icon_player_v2_stopped.png',
                iconSize: [51, 28]
            }),
            id: this.max_id++
        };

        // Создание иконки убитой машинки V 2
        icons['icon_killed_V2'] = {
            icon: new L.icon({
                iconUrl: 'img/map_icons/map_icon_player_v2_killed.png',
                iconSize: [51, 28]
            }),
            id: this.max_id++
        };


        // Создание иконки движущейся машинки V 3
        icons['icon_moving_V3'] = {
            icon: new L.icon({
                iconUrl: 'img/map_icons/map_icon_player_v3_moving.png',
                iconSize: [51, 28]
            }),
            id: this.max_id++
        };

        // Создание иконки стоящей машинки V 3
        icons['icon_stopped_V3'] = {
            icon: new L.icon({
                iconUrl: 'img/map_icons/map_icon_player_v3_stopped.png',
                iconSize: [51, 28]
            }),
            id: this.max_id++
        };

        // Создание иконки ракеты
        icons['icon_rocket_V1'] = {
            icon: new L.icon({
                iconUrl: 'img/map_icons/map_icon_rocket.png',
                iconSize: [40, 18]
            }),
            id: this.max_id++
        };


        // новые транспортные иконки
        icons['big_truck_001'] = {
            icon: new L.icon({
                iconUrl: 'img/map_icons/transport/big_truck_001.png',
                iconSize: [31, 11]
            }),
            id: this.max_id++
        };
        icons['big_truck_002'] = {
            icon: new L.icon({
                iconUrl: 'img/map_icons/transport/big_truck_002.png',
                iconSize: [31, 11]
            }),
            id: this.max_id++
        };
        icons['coupe_001'] = {
            icon: new L.icon({
                iconUrl: 'img/map_icons/transport/coupe_001.png',
                iconSize: [19, 9]
            }),
            id: this.max_id++
        };
        icons['coupe_002'] = {
            icon: new L.icon({
                iconUrl: 'img/map_icons/transport/coupe_002.png',
                iconSize: [19, 9]
            }),
            id: this.max_id++
        };
        icons['jeep_001'] = {
            icon: new L.icon({
                iconUrl: 'img/map_icons/transport/jeep_001.png',
                iconSize: [21, 10]
            }),
            id: this.max_id++
        };
        icons['jeep_002'] = {
            icon: new L.icon({
                iconUrl: 'img/map_icons/transport/jeep_002.png',
                iconSize: [21, 10]
            }),
            id: this.max_id++
        };
        icons['motorcycle_001'] = {
            icon: new L.icon({
                iconUrl: 'img/map_icons/transport/motorcycle_001.png',
                iconSize: [14, 7]
            }),
            id: this.max_id++
        };
        icons['motorcycle_002'] = {
            icon: new L.icon({
                iconUrl: 'img/map_icons/transport/motorcycle_002.png',
                iconSize: [14, 7]
            }),
            id: this.max_id++
        };
        icons['pickup_001'] = {
            icon: new L.icon({
                iconUrl: 'img/map_icons/transport/pickup_001.png',
                iconSize: [20, 9]
            }),
            id: this.max_id++
        };
        icons['pickup_002'] = {
            icon: new L.icon({
                iconUrl: 'img/map_icons/transport/pickup_002.png',
                iconSize: [20, 9]
            }),
            id: this.max_id++
        };
        icons['quadrocycle_001'] = {
            icon: new L.icon({
                iconUrl: 'img/map_icons/transport/quadrocycle_001.png',
                iconSize: [13, 8]
            }),
            id: this.max_id++
        };
        icons['quadrocycle_002'] = {
            icon: new L.icon({
                iconUrl: 'img/map_icons/transport/quadrocycle_002.png',
                iconSize: [13, 8]
            }),
            id: this.max_id++
        };
        icons['seedan_001'] = {
            icon: new L.icon({
                iconUrl: 'img/map_icons/transport/seedan_001.png',
                iconSize: [19, 9]
            }),
            id: this.max_id++
        };
        icons['seedan_002'] = {
            icon: new L.icon({
                iconUrl: 'img/map_icons/transport/seedan_002.png',
                iconSize: [19, 9]
            }),
            id: this.max_id++
        };
        icons['seedan2_001'] = {
            icon: new L.icon({
                iconUrl: 'img/map_icons/transport/seedan2_001.png',
                iconSize: [21, 8]
            }),
            id: this.max_id++
        };
        icons['seedan2_002'] = {
            icon: new L.icon({
                iconUrl: 'img/map_icons/transport/seedan2_002.png',
                iconSize: [21, 8]
            }),
            id: this.max_id++
        };
        icons['truck_001'] = {
            icon: new L.icon({
                iconUrl: 'img/map_icons/transport/truck_001.png',
                iconSize: [19, 12]
            }),
            id: this.max_id++
        };
        icons['truck_002'] = {
            icon: new L.icon({
                iconUrl: 'img/map_icons/transport/truck_002.png',
                iconSize: [19, 12]
            }),
            id: this.max_id++
        };
        icons['truck2_001'] = {
            icon: new L.icon({
                iconUrl: 'img/map_icons/transport/truck2_001.png',
                iconSize: [23, 10]
            }),
            id: this.max_id++
        };
        icons['truck2_002'] = {
            icon: new L.icon({
                iconUrl: 'img/map_icons/transport/truck2_002.png',
                iconSize: [23, 10]
            }),
            id: this.max_id++
        };

    }


    LeafletIconManager.prototype.getIcon = function(icon_name){
        return this.icons[icon_name].icon;
    };


    LeafletIconManager.prototype.getIconByID = function(ID) {
        var tid = ID % this.max_id;
        for(var key in this.icons)
            if (this.icons[key].id == tid)
                return this.icons[key].icon;
        return this.icons['icon_city'].icon;
    };

    return LeafletIconManager;
})();


// Массив иконок
var iconsLeaflet = new LeafletIconManager();