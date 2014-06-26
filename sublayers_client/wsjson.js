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
    servEmul(JSON.stringify(mes));
}

// fire
function sendFire(aPoint, auid) {
    var mes= {
        call: "fire",
        uid: auid,
        params: {}
        }
    servEmul(JSON.stringify(mes));
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
    servEmul(JSON.stringify(mes));
}



// эмуляция сервера для тестирования JSON
function servEmul(data){
    var ans;
    var revent = JSON.parse(data);
    // сначало понять что за задача пришла
    if(revent.call == 'goto'){
        // если goto
        // посчитать текущие коррдинаты
        var tempPoint = user.userCar.getCurrentCoord(clock.getCurrentTime());
        // посчитать новую скорость
        var aPoint = new Point(revent.params.position.x, revent.params.position.y);
        var tempSpeed = mulScalVector(normVector(subVector(aPoint, tempPoint)), user.userCar.track.speedV.abs());
        // формирование ответа от сервера
        ans = {
            message_type: "push",
            event: {
                kind: "see",
                object: {
                    uid: revent.uid,
                    class: "car",
                    position: {
                        x: tempPoint.x,
                        y: tempPoint.y
                    },
                    server_time: clock.getCurrentTime(),
                    liner_motion: {
                        velocity: {
                            x: tempSpeed.x,
                            y: tempSpeed.y
                        },
                        acceleration: {
                            x: 0,
                            y: 0
                        },
                        fuel_start: 100,
                        fuel_decrement: 1
                    }
                }
            }
        }
    }

    if (revent.call == 'setspeed') {
        // если setspeed
        // посчитать текущие коррдинаты и координаты немного вперёд, чтобы получить вектор скорости
        var tempPoint = user.userCar.getCurrentCoord(clock.getCurrentTime());
        var tempPoint2 = user.userCar.getCurrentCoord(clock.getCurrentTime() + 50);
        // посчитать новую скорость
        var tempSpeed = mulScalVector(normVector(subVector(tempPoint2, tempPoint1)), revent.params.newspeed);

        // формирование ответа от сервера
        ans = {
            message_type: "push",
            event: {
                kind: "see",
                object: {
                    uid: revent.uid,
                    class: "car",
                    position: {
                        x: tempPoint.x,
                        y: tempPoint.y
                    },
                    server_time: clock.getCurrentTime(),
                    liner_motion: {
                        velocity: {
                            x: tempSpeed.x,
                            y: tempSpeed.y
                        },
                        acceleration: {
                            x: 0,
                            y: 0
                        },
                        fuel_start: 100,
                        fuel_decrement: 1
                    }
                }
            }
        }
}

    // ans уже сформирован. Теперь его нужно преобр. в строку и отправить в обработчик

}




// Приём сообщения от сервера. Разбор принятого объекта
function receiveMesFromServ(data) {
    var mes = JSON.parse(data);

    // если message_type = push
    if (mes.message_type = "push") {
        // значит тут есть евент, смотреть тип евента
        if (mes.event.kind = "see") {
            // это сообщение для модели
            // считываем uid
            var uid = mes.event.object.uid;
            // считываем позицию
            var position = new Point(mes.event.object.position.x, mes.event.object.position.y);
            // считываем серверное время и корректируем в клоке
            var stime = mes.event.object.server_time;
            clock.setDt(stime);
            // смотрим класс мап-объекта
            if (mes.event.object.class == "car") {
                // если car
                if (mes.event.object.health != null) {
                    // запустить функцию установки хп
                }
                if (mes.event.object.circular_motion != null) {
                    // запустить функцию установки кругового движения
                }
                if (mes.event.object.liner_motion != null) {
                    // запустить функцию установки линейного движения
                    var velocity = new Point(mes.event.object.liner_motion.velocity.x,
                        mes.event.object.liner_motion.velocity.y);
                    var acceleration = new Point(mes.event.object.liner_motion.acceleration.x,
                        mes.event.object.liner_motion.acceleration.y);
                    var fuel_start = mes.event.object.liner_motion.fuel_start;
                    var fuel_decrement = mes.event.object.liner_motion.fuel_decrement

                    user.userCar.track = new MoveLine(
                        clock.getCurrentTime(),  //Время начала движения
                        fuel_start,              //Запас топлива
                        fuel_decrement,          //Расход топлива
                        position,                //Начальная точка
                        velocity,                //Скорость
                        acceleration             //Ускорение
                    );

                }
                if (mes.event.object.direction != null) {
                    // запустить функцию установки линейного движения с нулевыми скоростью и ускорением, и углом поворта
                }
            } // конец обработки car

            if (mes.event.object.class == "town") {
                // если town
                // добавить town с координатами position которую считали ранее

            } // конец обработки town
        }


    }
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



