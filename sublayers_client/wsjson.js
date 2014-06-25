var WSJSON = {
    socket: null,

    Init: function() {
        var url = "ws://" + location.host + "/sublayers";
        WSJSON.socket = new WebSocket(url);
        WSJSON.socket.onmessage = function(event) {
            WSJSON.getMessage(JSON.parse(event.data));
        }
    },


    getMessage: function(message) {
        // разбор мессаджа
        var existing = $("#m" + message.id);
        if (existing.length > 0) return;
        var node = $(message.html);
        node.hide();
        $("#inbox").append(node);
        node.slideDown();
    }

};




var WSJSON = new WSJSONInit();

function sendPoint(aPoint) {
    receiveTrack(aPoint);
}

function receiveTrack(aPoint) {
    var tempPoint = user.userCar.getCurrentCoord(clock.getCurrentTime());
    var tempSpeed = mulScalVector(normVector(subVector(aPoint, tempPoint)), user.userCar.track.speedV.abs());
    user.userCar.track = new MoveLine(clock.getCurrentTime(),   //Время начала движения
                                      100,                      //Запас топлива
                                      1,                        //Расход топлива
                                      tempPoint,                //Начальная точка
                                      tempSpeed,                //Скорость
                                      new Point(0, 0));         //Ускорение
}



