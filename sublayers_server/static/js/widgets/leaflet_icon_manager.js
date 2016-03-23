

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

        // Создание иконки заправочной станции
        this.load_new_icon('icon_station', '/static/img/map_icons/map_ico_fuelstation.png', [26, 29], this.max_id++);

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

        // Создание иконки стоящей машинки V 2
        icons['icon_stopped_V2'] = {
            icon: new L.icon({
                iconUrl: '/static/img/map_icons/map_icon_player_v2_stopped.png',
                iconSize: [51, 28]
            }),
            id: this.max_id++
        };

        // Создание иконки убитой машинки V 2
        icons['icon_killed_V2'] = {
            icon: new L.icon({
                iconUrl: '/static/img/map_icons/map_icon_player_v2_killed.png',
                iconSize: [51, 28]
            }),
            canvas_icon: {
                img: new Image('/static/img/map_icons/map_icon_player_v2_killed.png'),
                iconSize: [51, 28]
            },
            id: this.max_id++
        };

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
            canvas_icon: {
                img: new Image('/static/img/map_icons/map_icon_player_v3_stopped.png'),
                iconSize: [51, 28]
            },
            id: this.max_id++
        };

        // Создание иконки ракеты
        icons['icon_rocket_V1'] = {
            icon: new L.icon({
                iconUrl: '/static/img/map_icons/map_icon_rocket.png',
                iconSize: [40, 18]
            }),
            canvas_icon: {
                img: new Image('/static/img/map_icons/map_icon_rocket.png'),
                iconSize: [51, 28]
            },
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

        icons['mine_001'] = {
            icon: new L.icon({
                iconUrl: '/static/img/map_icons/mine_5.png',
                iconSize: [24, 17]
            }),
            id: this.max_id++
        };
    }

    LeafletIconManager.prototype.getIcon = function(icon_name){
        return this.icons[icon_name].icon;
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

    LeafletIconManager.prototype.load_new_icon = function(icon_name, icon_url, icon_size, icon_id){
        var img = new Image();
        this.count_loading_img++;
        img.onload = function() {
            iconsLeaflet.icons[icon_name] = {
                icon: new L.icon({
                    iconUrl: icon_url,
                    iconSize: icon_size
                }),
                canvas_icon: {
                    img: img,
                    iconSize: [this.width, this.height]
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