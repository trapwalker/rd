// Список Иконок для всех видов маркеров леафлета
var LeafletIconManager = (function(){
    function LeafletIconManager(){
        this.icons = {};
        this.max_id = 1;
        this.count_loading_img = 0;
        this.max_loading = 3;
        resourceLoadManager.add(this);
        this.tasks = [];

        // Создание иконки города
        this.load_new_icon('icon_city', '/static/img/map_icons/map_ico_city.png', [26, 29]);

        this.load_new_icon('icon_city_paloma_full', '/static/content/locations/map_locations/paloma/map_icons/full.png', [125, 114]);
        this.load_new_icon('icon_city_paloma_circle', '/static/content/locations/map_locations/paloma/map_icons/circle.png', [125, 114]);

        this.load_new_icon('icon_city_whitehill_full', '/static/content/locations/map_locations/whitehill/map_icons/full.png', [125, 114]);
        this.load_new_icon('icon_city_whitehill_circle', '/static/content/locations/map_locations/whitehill/map_icons/circle.png', [125, 114]);

        this.load_new_icon('icon_city_prior_full', '/static/content/locations/map_locations/prior/map_icons/full.png', [125, 114]);
        this.load_new_icon('icon_city_prior_circle', '/static/content/locations/map_locations/prior/map_icons/circle.png', [125, 114]);

        this.load_new_icon('icon_city_bonita_vista_full', '/static/content/locations/map_locations/bonita_vista/map_icons/full.png', [125, 114]);
        this.load_new_icon('icon_city_bonita_vista_circle', '/static/content/locations/map_locations/bonita_vista/map_icons/circle.png', [125, 114]);

        this.load_new_icon('icon_city_painted_rock_full', '/static/content/locations/map_locations/painted_rock/map_icons/full.png', [125, 114]);
        this.load_new_icon('icon_city_painted_rock_circle', '/static/content/locations/map_locations/painted_rock/map_icons/circle.png', [125, 114]);

        // Иконки заправочной станции
        this.load_new_icon('icon_gas_station_full', '/static/content/locations/map_locations/gas_station/map_icons/full.png', [80, 66]);
        this.load_new_icon('icon_gas_station_circle', '/static/content/locations/map_locations/gas_station/map_icons/circle.png', [80, 66]);
        // Иконки шахты
        this.load_new_icon('icon_mine_whitehill_full', '/static/content/locations/map_locations/mine_whitehill/map_icons/full.png', [80, 66]);
        this.load_new_icon('icon_mine_whitehill_circle', '/static/content/locations/map_locations/mine_whitehill/map_icons/circle.png', [80, 66]);
        // Иконки базы злых мобов
        this.load_new_icon('icon_los_jetas_full', '/static/content/locations/map_locations/los_jetas/map_icons/full.png', [80, 66]);
        this.load_new_icon('icon_los_jetas_circle', '/static/content/locations/map_locations/los_jetas/map_icons/circle.png', [80, 66]);

        this.load_new_icon('icon_tartron_full', '/static/content/locations/map_locations/tartron_parts/map_icons/full.png', [80, 73]);
        this.load_new_icon('icon_tartron_circle', '/static/content/locations/map_locations/tartron_parts/map_icons/circle.png', [80, 73]);

        this.load_new_icon('icon_adriano_full', '/static/content/locations/map_locations/adriano_custom/map_icons/full.png', [80, 73]);
        this.load_new_icon('icon_adriano_circle', '/static/content/locations/map_locations/adriano_custom/map_icons/circle.png', [80, 73]);

        this.load_new_icon('icon_luke_war_full', '/static/content/locations/map_locations/luke_war_house/map_icons/full.png', [128, 73]);
        this.load_new_icon('icon_luke_war_circle', '/static/content/locations/map_locations/luke_war_house/map_icons/circle.png', [128, 73]);

        this.load_new_icon('icon_trevors_full', '/static/content/locations/map_locations/trevors_armor/map_icons/full.png', [80, 73]);
        this.load_new_icon('icon_trevors_circle', '/static/content/locations/map_locations/trevors_armor/map_icons/circle.png', [80, 73]);

        this.load_new_icon('icon_walker_full', '/static/content/locations/map_locations/walker_parts/map_icons/full.png', [80, 73]);
        this.load_new_icon('icon_walker_circle', '/static/content/locations/map_locations/walker_parts/map_icons/circle.png', [80, 73]);

        // Создание иконки движущейся машинки V 1
        this.load_new_icon('icon_moving_V1', '/static/img/map_icons/map_icon_player_v1_moving.png', [51, 28]);

        // Создание иконки стоящей машинки V 1
        this.load_new_icon('icon_stopped_V1', '/static/img/map_icons/map_icon_player_v1_stopped.png', [51, 28]);

        // Создание иконки убитой машинки V 1
        this.load_new_icon('icon_killed_V1', '/static/img/map_icons/map_icon_player_v1_killed.png', [51, 28]);

        // Создание иконки движущейся машинки V 2
        this.load_new_icon('icon_moving_V2', '/static/img/map_icons/map_icon_player_v2_moving_slow.png', [51, 28]);

        // Создание иконки БЫСТРО движущейся машинки V 2
        this.load_new_icon('icon_moving_fast_V2', '/static/img/map_icons/map_icon_player_v2_moving_fast.png', [51, 28]);

        // Создание иконки для машинки в стратегическом режиме
        this.load_new_icon('icon_strategy_mode_car', '/static/img/map_icons/tact_pers.png', [24, 24]);

        // Лут
        this.load_new_icon('icon_loot', '/static/img/map_icons/loot.png', [24, 17]);
        this.load_new_icon('icon_loot_backlight', '/static/img/map_icons/loot_backlight.png', [39, 39]);
        this.load_new_icon('icon_corpse_backlight', '/static/img/char_icons/dead/corpse_backlight.png', [53, 53]);

        // Новые иконки машин
        this.load_new_icon('icon_party_arrow', '/static/img/char_icons/party/arrow.png', [53, 53]);
        this.load_new_icon('icon_party_car', '/static/img/char_icons/party/car.png', [53, 53]);
        this.load_new_icon('icon_party_art', '/static/img/char_icons/party/art.png', [53, 53]);
        this.load_new_icon('icon_party_bm', '/static/img/char_icons/party/bm.png', [53, 53]);
        this.load_new_icon('icon_party_btr', '/static/img/char_icons/party/btr.png', [53, 53]);
        this.load_new_icon('icon_party_buggy', '/static/img/char_icons/party/buggy.png', [53, 53]);
        this.load_new_icon('icon_party_bus', '/static/img/char_icons/party/bus.png', [53, 53]);
        this.load_new_icon('icon_party_cargo', '/static/img/char_icons/party/cargo.png', [53, 53]);
        this.load_new_icon('icon_party_moto', '/static/img/char_icons/party/moto.png', [53, 53]);
        this.load_new_icon('icon_party_quadro', '/static/img/char_icons/party/quadro.png', [53, 53]);
        this.load_new_icon('icon_party_sport', '/static/img/char_icons/party/sport.png', [53, 53]);
        this.load_new_icon('icon_party_suv', '/static/img/char_icons/party/suv.png', [53, 53]);
        this.load_new_icon('icon_party_tank', '/static/img/char_icons/party/tank.png', [53, 53]);
        this.load_new_icon('icon_party_truck', '/static/img/char_icons/party/truck.png', [53, 53]);
        this.load_new_icon('icon_party_van', '/static/img/char_icons/party/van.png', [53, 53]);

        this.load_new_icon('icon_neutral_arrow', '/static/img/char_icons/neutral/arrow.png', [53, 53]);
        this.load_new_icon('icon_neutral_car', '/static/img/char_icons/neutral/car.png', [53, 53]);
        this.load_new_icon('icon_neutral_art', '/static/img/char_icons/neutral/art.png', [53, 53]);
        this.load_new_icon('icon_neutral_bm', '/static/img/char_icons/neutral/bm.png', [53, 53]);
        this.load_new_icon('icon_neutral_btr', '/static/img/char_icons/neutral/btr.png', [53, 53]);
        this.load_new_icon('icon_neutral_buggy', '/static/img/char_icons/neutral/buggy.png', [53, 53]);
        this.load_new_icon('icon_neutral_bus', '/static/img/char_icons/neutral/bus.png', [53, 53]);
        this.load_new_icon('icon_neutral_cargo', '/static/img/char_icons/neutral/cargo.png', [53, 53]);
        this.load_new_icon('icon_neutral_moto', '/static/img/char_icons/neutral/moto.png', [53, 53]);
        this.load_new_icon('icon_neutral_quadro', '/static/img/char_icons/neutral/quadro.png', [53, 53]);
        this.load_new_icon('icon_neutral_sport', '/static/img/char_icons/neutral/sport.png', [53, 53]);
        this.load_new_icon('icon_neutral_suv', '/static/img/char_icons/neutral/suv.png', [53, 53]);
        this.load_new_icon('icon_neutral_tank', '/static/img/char_icons/neutral/tank.png', [53, 53]);
        this.load_new_icon('icon_neutral_truck', '/static/img/char_icons/neutral/truck.png', [53, 53]);
        this.load_new_icon('icon_neutral_van', '/static/img/char_icons/neutral/van.png', [53, 53]);

        this.load_new_icon('icon_dead_car', '/static/img/char_icons/dead/car.png', [53, 53]);
        this.load_new_icon('icon_dead_art', '/static/img/char_icons/dead/art.png', [53, 53]);
        this.load_new_icon('icon_dead_bm', '/static/img/char_icons/dead/bm.png', [53, 53]);
        this.load_new_icon('icon_dead_btr', '/static/img/char_icons/dead/btr.png', [53, 53]);
        this.load_new_icon('icon_dead_buggy', '/static/img/char_icons/dead/buggy.png', [53, 53]);
        this.load_new_icon('icon_dead_bus', '/static/img/char_icons/dead/bus.png', [53, 53]);
        this.load_new_icon('icon_dead_cargo', '/static/img/char_icons/dead/cargo.png', [53, 53]);
        this.load_new_icon('icon_dead_moto', '/static/img/char_icons/dead/moto.png', [53, 53]);
        this.load_new_icon('icon_dead_quadro', '/static/img/char_icons/dead/quadro.png', [53, 53]);
        this.load_new_icon('icon_dead_sport', '/static/img/char_icons/dead/sport.png', [53, 53]);
        this.load_new_icon('icon_dead_suv', '/static/img/char_icons/dead/suv.png', [53, 53]);
        this.load_new_icon('icon_dead_tank', '/static/img/char_icons/dead/tank.png', [53, 53]);
        this.load_new_icon('icon_dead_truck', '/static/img/char_icons/dead/truck.png', [53, 53]);
        this.load_new_icon('icon_dead_van', '/static/img/char_icons/dead/van.png', [53, 53]);

        this.load_new_icon('icon_car_focused', '/static/img/char_icons/focused.png', [53, 53]);
        this.load_new_icon('icon_car_info', '/static/img/char_icons/info.png', [18, 18]);
        this.load_new_icon('icon_car_info_corpse', '/static/img/char_icons/info_corpse.png', [18, 18]);

        // Ракета
        this.load_new_icon('icon-rocket-small', '/static/img/map_icons/transport/rocket.png', [26, 26], 5);
        this.load_new_icon('icon-rocket', '/static/img/map_icons/transport/rocket_2.png', [26, 26], 5);

        this.load_new_icon('icon_map_target_point', '/static/img/cursors/target.png', [24, 25]);

        this.load_new_icon('mine_001', '/static/img/map_icons/mine.png', [24, 17]);
        this.load_new_icon('turret_001', '/static/img/map_icons/turret.png', [15, 15]);
        this.load_new_icon('radar_001', '/static/img/map_icons/radar_001.png', [15, 15]);
        // Animated Power Up
        this.load_new_icon('icon-power-up-build-set', '/static/img/map_icons/power_up/power_up_stay.png', [54, 54], 17);
        this.load_new_icon('icon-power-up-fuel', '/static/img/map_icons/power_up/power_up_oil_stay.png', [54, 54], 17);
        this.load_new_icon('icon-power-up-shield', '/static/img/map_icons/power_up/power_up_shield.png', [54, 54], 17);
        this.load_new_icon('icon-power-up-obs', '/static/img/map_icons/power_up/power_up_vision_stay.png', [54, 54], 17);
        this.load_new_icon('icon-power-up-vis', '/static/img/map_icons/power_up/power_up_stels_stay.png', [54, 54], 17);
        this.load_new_icon('icon-power-up-ammo', '/static/img/map_icons/power_up/power_up_add_ammo.png', [54, 54], 17);
        this.load_new_icon('icon-power-up-random', '/static/img/map_icons/power_up/power_up_random.png', [54, 54], 17);

        // Animated Effects
        this.load_new_icon('icon-car-effect-shield', '/static/img/map_icons/effects/shield_12_frames.png', [60, 60], 12);

        // Хвост за машинкой
        this.load_new_icon('icon-rocket-tail-03', '/static/img/particles/rocket_tail_03.png', [39, 39], 1);
        this.load_new_icon('icon-car-tail-06l-25', '/static/img/particles/car_tail_06l_25.png', [39, 39], 1);
        this.load_new_icon('icon-car-tail-06l-35', '/static/img/particles/car_tail_06l_35.png', [39, 39], 1);
        this.load_new_icon('icon-car-tail-06l-45', '/static/img/particles/car_tail_06l_45.png', [39, 39], 1);
        this.load_new_icon('icon-car-tail-06r-25', '/static/img/particles/car_tail_06r_25.png', [39, 39], 1);
        this.load_new_icon('icon-car-tail-06r-35', '/static/img/particles/car_tail_06r_35.png', [39, 39], 1);
        this.load_new_icon('icon-car-tail-06r-45', '/static/img/particles/car_tail_06r_45.png', [39, 39], 1);

    }

    LeafletIconManager.prototype.getIcon = function(icon_name){
        if (!this.icons.hasOwnProperty(icon_name)) return null;
        return this.icons[icon_name];
    };

    LeafletIconManager.prototype.getIconByID = function(ID) {
        var tid = ID % this.max_id;
        for(var key in this.icons)
            if (this.icons[key].icon_id == tid)
                return this.icons[key];
        return this.icons['icon_city'];
    };

    LeafletIconManager.prototype.load_complete = function () {
        //console.log("load_complete", this.count_loading_img);
        if (this.count_loading_img == 0 || this.tasks.length == 0) {
            resourceLoadManager.del(this);
        }
        else {
            var t = this.tasks.shift();
            this.load_new_icon(t.icon_name, t.icon_url, t.icon_size, t.frames);
        }
    };

    LeafletIconManager.prototype.load_new_icon = function(icon_name, icon_url, icon_size, frames){
        if (this.count_loading_img < this.max_loading) {
            frames = frames || 1;
            var img = new Image();
            this.count_loading_img++;
            var icon_id = this.max_id++;
            img.onload = function () {
                iconsLeaflet.icons[icon_name] = {
                    img: img,
                    iconSize: [this.width, this.height],
                    size: icon_size,
                    frames: frames,
                    icon_id: icon_id
                };
                iconsLeaflet.count_loading_img--;
                iconsLeaflet.load_complete();
            };
            img.onerror = function () {
                console.warn('LeafletIconManager: Content dont load: ', icon_url);
                iconsLeaflet.count_loading_img--;
                iconsLeaflet.load_complete();
            };
            img.src = icon_url;
        }
        else {
            this.tasks.push({icon_name: icon_name, icon_url: icon_url, icon_size: icon_size, frames: frames});
        }
    };

    return LeafletIconManager;
})();


// Массив иконок
var iconsLeaflet = new LeafletIconManager();