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

// функции формирования исходящих сообщений

// goto
function sendNewPoint(aPoint, auid) {
    var mes= {
        call: "goto",
        uid: auid,
        params: {
            position: {
                x: aPoint.x,
                y: aPoint.y
            }
        }
    }
    //alert(JSON.stringify(mes));
}

// fire
function sendFire(aPoint, auid) {
    var mes= {
        call: "fire",
        uid: auid,
        params: {}
        }
    //alert(JSON.stringify(mes));
}

// setSpeed
function sendSetSpeed(newSpeed, auid) {
    var mes= {
        call: "setspeed",
        uid: auid,
        params: {
            newspeed: newSpeed
        }
    }
    //alert(JSON.stringify(mes));
}




var WSJSON = new WSJSON.Init();

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



