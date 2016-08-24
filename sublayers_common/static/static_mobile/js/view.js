function client_ready() {
    mapManager.init();
    iconsLeaflet = new LeafletIconManager();
    timeManager.timerStart();
    $(window).resize(function() { mapManager.resize_window(); });
    mapCanvasManager = new MapCanvasManager();
    mapCanvasManager.init_canvas();
    geoLocationManager = new GeoLocationManager();
    geoLocationManager.start_watch();

    effectPNGLoader = new EffectPNGLoader();
    fireEffectManager = new FireEffectManager();


    // todo: считать URL с сервера или откуда нужно!

    ws_connector = new WSConnector({url: 'ws://'+ $('#settings_host_name').text() + ':'+ $('#settings_ws_port').text() + '/ws'});

    clientManager = new ClientManager();

    // Тестовая хрень - удалить потом
    $('.zoomator').click(function(){
        mapManager.setZoom($(this).data('zoom'))
    });

    // Инициализация.
    user = new User(1, 1000);
    ownerList = new OwnerList();
    setTimeout(function() {
        createFakeBot({x: 40371667, y: 22592826}, 0.001, 1.0);
    }, 500);

}

function returnFocusToMap() {
    document.getElementById('map').focus();
}


var user;
var clientManager;
var ownerList;



// удалить потом
function createFakeBots(abots) {
    var bots = abots || [
            {pos: {x: 12524758, y: 27026858}, dir: 3.14, speed: 300},
            {pos: {x: 12524758, y: 27026858}, dir: 0.001, speed: 300},
            {pos: {x: 12524758, y: 27026858}, dir: 1.57, speed: 300},
            {pos: {x: 12524758, y: 27026858}, dir: -1.57, speed: 300},
            {pos: {x: 12524758, y: 27026858}, dir: 3.14, speed: 300}
        ];
    for (var i = 0; i < bots.length; i++) {
        createFakeBot(bots[i].pos, bots[i].dir, bots[i].speed);
    }
}


function createFakeBot(position, direction, speed) {
    function random_direction() { return 2 * Math.PI * Math.random();  }

    function get_random_nickname(iteration) {
        var nickpaths = ["hell", "raizer", "kicker", "blade", "slayer", "night", "terminator", "max", "mad", "86", "83", "2080", "killer", "cyber", "ninja", "midnight", "runner", "sexy", "knight", "wolf", "black"];
        var length_elems = Math.random() > 0.5 ? 2 : 3;
        var name = nickpaths[Math.floor(Math.random() * (nickpaths.length - 1))];
        for (var i = 1; i < length_elems; i++) {
            name = name + '_' + nickpaths[Math.floor(Math.random() * (nickpaths.length - 1))]
        }

        if (iteration > 50)
            name = name + '_' + (Math.random() * 100).toFixed(0);

        if (ownerList.getOwnerByLogin(name))
            return get_random_nickname(iteration + 1);
        return name;
        //return 'rendom_user' + (Math.random() * 1000).toFixed(0);
    }

    function get_random_subclass() {
        var sub_class_array = ["artillery", "armored", "btrs", "buggies", "buses", "cars", "trucks", "motorcycles", "quadbikes", "sports", "offroad", "tanks", "tractors", "vans"];
        return sub_class_array[Math.floor(Math.random() * (sub_class_array.length - 1))]
    }

    var nickname = get_random_nickname(0);
    var dir = direction || random_direction();
    var time = clock.getCurrentTime();
    var pos = position;
    var v0 = speed || 0;

    clientManager.InitCarFake({
        cls: "InitCar",
        comment: null,
        is_first: true,
        car: {
            class_car: "Cредний",
            cls: "Bot",
            direction: dir,
            fire_sectors: [],
            fuel_state: {
                cls: "FuelState",
                dfs: 0,
                fuel0: 65.43290004611016,
                max_fuel: 70,
                t0: time
            },
            hp_state: {
                cls: "HPState",
                dps: 0,
                hp0: 135,
                max_hp: 135,
                t0: time
            },
            owner: {
                avatar_link: "static/content/avatars/default_4.png",
                balance: 19310,
                cls: "User",
                login: user.name,
                party: null,
                uid: user.ID,
                user_name: nickname
            },
            p_cc: 0.7,
            p_obs_range_rate_max: 1,
            p_obs_range_rate_min: 0.5,
            p_observing_range: 1268,
            position: pos,
            quick_consumer_panel: [],
            state: {
                _fi0: dir,
                _rv_fi: 0,
                _sp_fi0: 0,
                _sp_m: 0,
                a: 0,
                ac_max: 9999,
                c: null,
                cls: "MobileState",
                fi0: dir,
                p0: pos,
                r_min: 7,
                t0: time,
                turn: 0,
                v0: v0
            },
            sub_class_car: get_random_subclass(),
            uid: generator_ID.getID(),
            v_backward: -20,
            v_forward: (v0 * 2) || 99
        },
        time: clock.getCurrentTime()
    });
}