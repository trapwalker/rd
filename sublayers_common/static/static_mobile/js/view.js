function client_ready() {
    rpcCallList = new RPCCallList();
    mapManager.init();
    iconsLeaflet = new LeafletIconManager();
    timeManager.timerStart();
    $(window).resize(function() { mapManager.resize_window(); });
    mapCanvasManager = new MapCanvasManager();
    mapCanvasManager.init_canvas();
    geoLocationManager = new GeoLocationManager();
    geoLocationManager.start_watch();
    wStrategyModeManager = new WStrategyModeManager();

    effectPNGLoader = new EffectPNGLoader();
    fireEffectManager = new FireEffectManager();


    // todo: считать URL с сервера или откуда нужно!

    ws_connector = new WSConnector({url: 'ws://'+ $('#settings_host_name').text() + ':'+ $('#settings_ws_port').text() + '/ws'});

    clientManager = new ClientManager();

    // Тестовая хрень - удалить потом
    $('.zoomator').click(function(){
        mapManager.setZoom($(this).data('zoom'))
    });

    $('.fire-btn').click(function(event){
        if ($(this).hasClass('active')) {
            clientManager.sendFireAutoEnable(false);
        }
        else {
            clientManager.sendFireAutoEnable(true);
        }
        $(this).toggleClass('active');
    });

    $('#consoleBtn').click(function(){
        $('#consoleWrap').css('display', 'block');
    });
    $('#consoleClose').click(function(){
        $('#consoleWrap').css('display', 'none');
    });

    $('#sendPosition').click(function(){
        if (geoLocationManager._last_position) {
            var pos = map.project([geoLocationManager._last_position.coords.latitude, geoLocationManager._last_position.coords.longitude], 18);
            clientManager.sendGeoCoord(geoLocationManager.geo_position_to_dict(position), pos);
        }
        else {
            alert('Нет данных о последней позиции.');
        }
    });

    // Инициализация.
    ownerList = new OwnerList();

}

function returnFocusToMap() {
    document.getElementById('map').focus();
}

var user;
var clientManager;
var ownerList;
var rpcCallList;
