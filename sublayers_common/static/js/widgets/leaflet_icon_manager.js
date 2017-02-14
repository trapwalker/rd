

// Список Иконок для всех видов маркеров леафлета

var LeafletIconManager = (function(){
    function LeafletIconManager(){
        var icons = {};
        this.icons = icons;
        this.max_id = -1;
        this.count_loading_img = 0;
        resourceLoadManager.add(this);
        var self = this;
        var img;

        function load_img_complete() {
            self.count_loading_img--;
            if (self.count_loading_img == 0) {
                self.load_complete();
            }
        }

        // Создание иконки города
        this.load_new_icon('icon_city', '/static/img/map_icons/map_ico_city.png', [26, 29], this.max_id++);
        this.load_new_icon('icon_city_whitehill', '/static/img/map_icons/wh_marker.png', [111, 114], this.max_id++, [56, 104]);
        this.load_new_icon('icon_city_prior', '/static/img/map_icons/prior_marker.png', [111, 114], this.max_id++, [56, 104]);

        // Создание иконки заправочной станции
        this.load_new_icon('icon_station', '/static/img/map_icons/gs_marker.png', [91, 94], this.max_id++, [46, 85]);

        // Создание иконки движущейся машинки V 1
        this.load_new_icon('icon_moving_V1', '/static/img/map_icons/map_icon_player_v1_moving.png', [51, 28], this.max_id++);

        // Создание иконки стоящей машинки V 1
        this.load_new_icon('icon_stopped_V1', '/static/img/map_icons/map_icon_player_v1_stopped.png', [51, 28], this.max_id++);

        // Создание иконки убитой машинки V 1
        this.load_new_icon('icon_killed_V1', '/static/img/map_icons/map_icon_player_v1_killed.png', [51, 28], this.max_id++);

        // Создание иконки движущейся машинки V 2
        this.load_new_icon('icon_moving_V2', '/static/img/map_icons/map_icon_player_v2_moving_slow.png', [51, 28], this.max_id++);

        // Создание иконки БЫСТРО движущейся машинки V 2
        this.load_new_icon('icon_moving_fast_V2', '/static/img/map_icons/map_icon_player_v2_moving_fast.png', [51, 28], this.max_id++);

        // Создание иконки для машинки в стратегическом режиме
        this.load_new_icon('icon_strategy_mode_car', '/static/img/map_icons/tact_pers.png', [24, 24], this.max_id++);

        // Новые иконки машин
        this.load_new_icon('icon_party_arrow', '/static/img/char_icons/party/arrow.png', [53, 53], this.max_id++);
        this.load_new_icon('icon_party_car', '/static/img/char_icons/party/car.png', [53, 53], this.max_id++);
        this.load_new_icon('icon_party_art', '/static/img/char_icons/party/art.png', [53, 53], this.max_id++);
        this.load_new_icon('icon_party_bm', '/static/img/char_icons/party/bm.png', [53, 53], this.max_id++);
        this.load_new_icon('icon_party_btr', '/static/img/char_icons/party/btr.png', [53, 53], this.max_id++);
        this.load_new_icon('icon_party_buggy', '/static/img/char_icons/party/buggy.png', [53, 53], this.max_id++);
        this.load_new_icon('icon_party_bus', '/static/img/char_icons/party/bus.png', [53, 53], this.max_id++);
        this.load_new_icon('icon_party_cargo', '/static/img/char_icons/party/cargo.png', [53, 53], this.max_id++);
        this.load_new_icon('icon_party_moto', '/static/img/char_icons/party/moto.png', [53, 53], this.max_id++);
        this.load_new_icon('icon_party_quadro', '/static/img/char_icons/party/quadro.png', [53, 53], this.max_id++);
        this.load_new_icon('icon_party_sport', '/static/img/char_icons/party/sport.png', [53, 53], this.max_id++);
        this.load_new_icon('icon_party_suv', '/static/img/char_icons/party/suv.png', [53, 53], this.max_id++);
        this.load_new_icon('icon_party_tank', '/static/img/char_icons/party/tank.png', [53, 53], this.max_id++);
        this.load_new_icon('icon_party_truck', '/static/img/char_icons/party/truck.png', [53, 53], this.max_id++);
        this.load_new_icon('icon_party_van', '/static/img/char_icons/party/van.png', [53, 53], this.max_id++);

        this.load_new_icon('icon_neutral_arrow', '/static/img/char_icons/neutral/arrow.png', [53, 53], this.max_id++);
        this.load_new_icon('icon_neutral_car', '/static/img/char_icons/neutral/car.png', [53, 53], this.max_id++);
        this.load_new_icon('icon_neutral_art', '/static/img/char_icons/neutral/art.png', [53, 53], this.max_id++);
        this.load_new_icon('icon_neutral_bm', '/static/img/char_icons/neutral/bm.png', [53, 53], this.max_id++);
        this.load_new_icon('icon_neutral_btr', '/static/img/char_icons/neutral/btr.png', [53, 53], this.max_id++);
        this.load_new_icon('icon_neutral_buggy', '/static/img/char_icons/neutral/buggy.png', [53, 53], this.max_id++);
        this.load_new_icon('icon_neutral_bus', '/static/img/char_icons/neutral/bus.png', [53, 53], this.max_id++);
        this.load_new_icon('icon_neutral_cargo', '/static/img/char_icons/neutral/cargo.png', [53, 53], this.max_id++);
        this.load_new_icon('icon_neutral_moto', '/static/img/char_icons/neutral/moto.png', [53, 53], this.max_id++);
        this.load_new_icon('icon_neutral_quadro', '/static/img/char_icons/neutral/quadro.png', [53, 53], this.max_id++);
        this.load_new_icon('icon_neutral_sport', '/static/img/char_icons/neutral/sport.png', [53, 53], this.max_id++);
        this.load_new_icon('icon_neutral_suv', '/static/img/char_icons/neutral/suv.png', [53, 53], this.max_id++);
        this.load_new_icon('icon_neutral_tank', '/static/img/char_icons/neutral/tank.png', [53, 53], this.max_id++);
        this.load_new_icon('icon_neutral_truck', '/static/img/char_icons/neutral/truck.png', [53, 53], this.max_id++);
        this.load_new_icon('icon_neutral_van', '/static/img/char_icons/neutral/van.png', [53, 53], this.max_id++);

        this.load_new_icon('icon_dead_car', '/static/img/char_icons/dead/car.png', [53, 53], this.max_id++);
        this.load_new_icon('icon_dead_art', '/static/img/char_icons/dead/art.png', [53, 53], this.max_id++);
        this.load_new_icon('icon_dead_bm', '/static/img/char_icons/dead/bm.png', [53, 53], this.max_id++);
        this.load_new_icon('icon_dead_btr', '/static/img/char_icons/dead/btr.png', [53, 53], this.max_id++);
        this.load_new_icon('icon_dead_buggy', '/static/img/char_icons/dead/buggy.png', [53, 53], this.max_id++);
        this.load_new_icon('icon_dead_bus', '/static/img/char_icons/dead/bus.png', [53, 53], this.max_id++);
        this.load_new_icon('icon_dead_cargo', '/static/img/char_icons/dead/cargo.png', [53, 53], this.max_id++);
        this.load_new_icon('icon_dead_moto', '/static/img/char_icons/dead/moto.png', [53, 53], this.max_id++);
        this.load_new_icon('icon_dead_quadro', '/static/img/char_icons/dead/quadro.png', [53, 53], this.max_id++);
        this.load_new_icon('icon_dead_sport', '/static/img/char_icons/dead/sport.png', [53, 53], this.max_id++);
        this.load_new_icon('icon_dead_suv', '/static/img/char_icons/dead/suv.png', [53, 53], this.max_id++);
        this.load_new_icon('icon_dead_tank', '/static/img/char_icons/dead/tank.png', [53, 53], this.max_id++);
        this.load_new_icon('icon_dead_truck', '/static/img/char_icons/dead/truck.png', [53, 53], this.max_id++);
        this.load_new_icon('icon_dead_van', '/static/img/char_icons/dead/van.png', [53, 53], this.max_id++);


        this.load_new_icon('icon_map_target_point', '/static/img/cursors/target.png', [24, 25], this.max_id++);

        this.load_new_icon('mine_001', '/static/img/map_icons/mine.png', [24, 17], this.max_id++);

        this.load_new_icon('icon-power-up-build-set', '/static/img/map_icons/power_up/power_up_stay.png', [54, 54], this.max_id++, null, 17);
        this.load_new_icon('icon-power-up-fuel', '/static/img/map_icons/power_up/power_up_oil_stay.png', [54, 54], this.max_id++, null, 17);
        this.load_new_icon('icon-power-up-shield', '/static/img/map_icons/power_up/power_up_shield.png', [54, 54], this.max_id++, null, 17);
        this.load_new_icon('icon-power-up-obs', '/static/img/map_icons/power_up/power_up_vision_stay.png', [54, 54], this.max_id++, null, 17);
        this.load_new_icon('icon-power-up-vis', '/static/img/map_icons/power_up/power_up_stels_stay.png', [54, 54], this.max_id++, null, 17);
        this.load_new_icon('icon-power-add-ammo', '/static/img/map_icons/power_up/power_up_add_ammo.png', [54, 54], this.max_id++, null, 17);
        this.load_new_icon('icon-power-up-random', '/static/img/map_icons/power_up/power_up_random.png', [54, 54], this.max_id++, null, 17);

        // Создание иконки стоящей машинки V 2
        icons['icon_stopped_V2'] = {
            icon: new L.icon({
                iconUrl: '/static/img/map_icons/map_icon_player_v2_stopped.png',
                iconSize: [51, 28]
            }),
            id: this.max_id++
        };

        // Создание иконки убитой машинки V 2
        //icons['icon_killed_V2'] = {
        //    icon: new L.icon({
        //        iconUrl: '/static/img/map_icons/map_icon_player_v2_killed.png',
        //        iconSize: [51, 28]
        //    }),
        //    canvas_icon: {
        //        img: new Image('/static/img/map_icons/map_icon_player_v2_killed.png'),
        //        iconSize: [51, 28]
        //    },
        //    id: this.max_id++
        //};

        // Создание иконки движущейся машинки V 3
        icons['icon_moving_V3'] = {
            icon: new L.icon({
                iconUrl: '/static/img/map_icons/map_icon_player_v3_moving.png',
                iconSize: [51, 28]
            }),
            id: this.max_id++
        };

        // Создание иконки стоящей машинки V 3
        icons['icon_stopped_V3'] = {
            icon: new L.icon({
                iconUrl: '/static/img/map_icons/map_icon_player_v3_stopped.png',
                iconSize: [51, 28]
            }),
            //canvas_icon: {
            //    img: new Image('/static/img/map_icons/map_icon_player_v3_stopped.png'),
            //    iconSize: [51, 28]
            //},
            id: this.max_id++
        };

        // Создание иконки ракеты
        icons['icon_rocket_V1'] = {
            icon: new L.icon({
                iconUrl: '/static/img/map_icons/map_icon_rocket.png',
                iconSize: [40, 18]
            }),
            //canvas_icon: {
            //    img: new Image('/static/img/map_icons/map_icon_rocket.png'),
            //    iconSize: [51, 28]
            //},
            id: this.max_id++
        };

        // новые транспортные иконки
        icons['big_truck_001'] = {
            icon: new L.icon({
                iconUrl: '/static/img/map_icons/transport/big_truck_001.png',
                iconSize: [31, 11]
            }),
            id: this.max_id++
        };
        icons['big_truck_002'] = {
            icon: new L.icon({
                iconUrl: '/static/img/map_icons/transport/big_truck_002.png',
                iconSize: [31, 11]
            }),
            id: this.max_id++
        };
        icons['coupe_001'] = {
            icon: new L.icon({
                iconUrl: '/static/img/map_icons/transport/coupe_001.png',
                iconSize: [19, 9]
            }),
            id: this.max_id++
        };
        icons['coupe_002'] = {
            icon: new L.icon({
                iconUrl: '/static/img/map_icons/transport/coupe_002.png',
                iconSize: [19, 9]
            }),
            id: this.max_id++
        };
        icons['jeep_001'] = {
            icon: new L.icon({
                iconUrl: '/static/img/map_icons/transport/jeep_001.png',
                iconSize: [21, 10]
            }),
            id: this.max_id++
        };
        icons['jeep_002'] = {
            icon: new L.icon({
                iconUrl: '/static/img/map_icons/transport/jeep_002.png',
                iconSize: [21, 10]
            }),
            id: this.max_id++
        };
        icons['motorcycle_001'] = {
            icon: new L.icon({
                iconUrl: '/static/img/map_icons/transport/motorcycle_001.png',
                iconSize: [14, 7]
            }),
            id: this.max_id++
        };
        icons['motorcycle_002'] = {
            icon: new L.icon({
                iconUrl: '/static/img/map_icons/transport/motorcycle_002.png',
                iconSize: [14, 7]
            }),
            id: this.max_id++
        };
        icons['pickup_001'] = {
            icon: new L.icon({
                iconUrl: '/static/img/map_icons/transport/pickup_001.png',
                iconSize: [20, 9]
            }),
            id: this.max_id++
        };
        icons['pickup_002'] = {
            icon: new L.icon({
                iconUrl: '/static/img/map_icons/transport/pickup_002.png',
                iconSize: [20, 9]
            }),
            id: this.max_id++
        };
        icons['quadrocycle_001'] = {
            icon: new L.icon({
                iconUrl: '/static/img/map_icons/transport/quadrocycle_001.png',
                iconSize: [13, 8]
            }),
            id: this.max_id++
        };
        icons['quadrocycle_002'] = {
            icon: new L.icon({
                iconUrl: '/static/img/map_icons/transport/quadrocycle_002.png',
                iconSize: [13, 8]
            }),
            id: this.max_id++
        };
        icons['seedan_001'] = {
            icon: new L.icon({
                iconUrl: '/static/img/map_icons/transport/seedan_001.png',
                iconSize: [19, 9]
            }),
            id: this.max_id++
        };
        icons['seedan_002'] = {
            icon: new L.icon({
                iconUrl: '/static/img/map_icons/transport/seedan_002.png',
                iconSize: [19, 9]
            }),
            id: this.max_id++
        };
        icons['seedan2_001'] = {
            icon: new L.icon({
                iconUrl: '/static/img/map_icons/transport/seedan2_001.png',
                iconSize: [21, 8]
            }),
            id: this.max_id++
        };
        icons['seedan2_002'] = {
            icon: new L.icon({
                iconUrl: '/static/img/map_icons/transport/seedan2_002.png',
                iconSize: [21, 8]
            }),
            id: this.max_id++
        };
        icons['truck_001'] = {
            icon: new L.icon({
                iconUrl: '/static/img/map_icons/transport/truck_001.png',
                iconSize: [19, 12]
            }),
            id: this.max_id++
        };
        icons['truck_002'] = {
            icon: new L.icon({
                iconUrl: '/static/img/map_icons/transport/truck_002.png',
                iconSize: [19, 12]
            }),
            id: this.max_id++
        };
        icons['truck2_001'] = {
            icon: new L.icon({
                iconUrl: '/static/img/map_icons/transport/truck2_001.png',
                iconSize: [23, 10]
            }),
            id: this.max_id++
        };
        icons['truck2_002'] = {
            icon: new L.icon({
                iconUrl: '/static/img/map_icons/transport/truck2_002.png',
                iconSize: [23, 10]
            }),
            id: this.max_id++
        };

        icons['mine_002'] = {
            icon: new L.icon({
                iconUrl: '/static/img/map_icons/mine_5.png',
                iconSize: [24, 17]
            }),
            id: this.max_id++
        };
    }

    LeafletIconManager.prototype.getIcon = function(icon_name, type){
        type = type ? type : 'icon';
        return this.icons[icon_name][type];
    };

    LeafletIconManager.prototype.getIconByID = function(ID, type) {
        type = type ? type : 'icon';
        var tid = ID % this.max_id;
        for(var key in this.icons)
            if (this.icons[key].id == tid)
                return this.icons[key][type];
        return this.icons['icon_city'][type];
    };

    LeafletIconManager.prototype.load_complete = function () {
        if (this.count_loading_img == 0) {
            resourceLoadManager.del(this);
        }
    };

    LeafletIconManager.prototype.load_new_icon = function(icon_name, icon_url, icon_size, icon_id, iconAnchor, frames){
        frames = frames || 1;
        var img = new Image();
        this.count_loading_img++;
        img.onload = function() {
            iconsLeaflet.icons[icon_name] = {
                icon: new L.icon({
                    iconUrl: icon_url,
                    iconSize: icon_size,
                    iconAnchor: iconAnchor
                }),
                canvas_icon: {
                    img: img,
                    iconSize: [this.width, this.height],
                    size: icon_size,
                    frames: frames
                },
                id: icon_id
            };
            iconsLeaflet.count_loading_img--;
            iconsLeaflet.load_complete();
        };
        img.onerror = function() {
            console.warn('LeafletIconManager: Content dont load: ', icon_url);
            iconsLeaflet.count_loading_img--;
            iconsLeaflet.load_complete();
        };
        img.src = icon_url;
    };



    return LeafletIconManager;
})();






// Массив иконок
var iconsLeaflet = new LeafletIconManager();