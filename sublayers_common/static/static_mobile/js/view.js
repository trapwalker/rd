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
        mapManager.setZoom(mapManager.getZoom() + $(this).data('zoom'))
    });

    $('#carInfoBtn').click(function(event) {
        carManager.get_info();
    });

    $('#inventoryInfoBtn').click(function(event) {
        windowTemplateManager.openUniqueWindow('inventory_info', '/inventory', null, null, null);
    });

    $('#AutoFireBtn').click(function(event) {
        clientManager.sendFireAutoEnable(!$(this).hasClass('active'));
        $(this).toggleClass('active');
    });

    $('#DischargeFireBtn').click(function(event){
        clientManager.sendFireDischarge('front');
        clientManager.sendFireDischarge('right');
        clientManager.sendFireDischarge('back');
        clientManager.sendFireDischarge('left');
    });

     $('#RocketFireBtn').click(function(event){
         clientManager.sendRocket();
    });

    $('#consoleBtn').click(function(){
        $('#consoleWrap').css('display', 'block');
    });
    $('#consoleClose').click(function(){
        $('#consoleWrap').css('display', 'none');
    });

    $('#sendPosition').click(function(){
        if (geoLocationManager._last_position) {
            var pos = mapManager.project([geoLocationManager._last_position.coords.latitude, geoLocationManager._last_position.coords.longitude], 18);
            clientManager.sendGeoCoord(geoLocationManager.geo_position_to_dict(geoLocationManager._last_position), pos);
        }
        else {
            alert('Нет данных о последней позиции.');
        }
    });

    $('#menuBtn').click(function () {
        $('#menuWrap').css('display', 'block');
    });
    $('#menuClose').click(function(){
        $('#menuWrap').css('display', 'none');
    });



    $('#KalmanSet').click(function (event) {
        geoLocationManager.kalman_set = !$(this).hasClass('active');
        $(this).toggleClass('active');
    });

    $('#CameraPositionAnimation').click(function (event) {
        if (!user.userCar) return;
        var w = visualManager.getVobjByType(user.userCar, WMapPosition);
        if (!w) {console.log('Error! WMapPosition widget not found.')}
        w._camera_position_animation = !$(this).hasClass('active');
        $(this).toggleClass('active');
    });

    $('#CameraRotateAnimation').click(function (event) {
        if (!user.userCar) return;
        var w = visualManager.getVobjByType(user.userCar, WMapPosition);
        if (!w) {console.log('Error! WMapPosition widget not found.')}
        w._camera_rotate_animation = !$(this).hasClass('active');
        $(this).toggleClass('active');
    });

    $('#BotsPositionAnimation').click(function (event) {
        var ws = visualManager.getAllVobjsByType(WMapPosition);
        var state = !$(this).hasClass('active');
        for (var i = 0; i < ws.length; i++)
            ws[i]._bots_position_animation = state;
        $(this).toggleClass('active');
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
var locationManager = null;
