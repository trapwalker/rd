// класс WSJSON - необходим для отправки и приёма сообщений от сервера
WSJSON = (function () {
    function WSJSON() {
        var url = "ws://" + location.host + "/ws";
        this.socket = new WebSocket(url);
        this.socket.onmessage = function (event) {
            receiveMesFromServ(event.data, true); // true - если от сервера, false - если моё тестовое
        }

        this.tasks = new Array(); // Новые задачи
    };

    return WSJSON;
})();


// функции формирования исходящих сообщений

// goto
function sendNewPoint(aPoint, auid) {
    var mes = {
        call: "goto",
        rpc_call_id: rpc_call_list.getID(),
        params: {
                x: aPoint.x,
                y: aPoint.y
        }
    };
    rpc_call_list.add(mes);
    servEmul(JSON.stringify(mes));
    wsjson.socket.send(JSON.stringify(mes));
}

function sendStopCar(auid) {
    var mes = {
        call: "stop",
        rpc_call_id: rpc_call_list.getID(),
        params: { }
    };
    rpc_call_list.add(mes);
    wsjson.socket.send(JSON.stringify(mes));
}

// fire
function sendFire(aPoint, auid) {
    var mes = {
        call: "fire",
        rpc_call_id: rpc_call_list.getID(),
        params: {}
    };
    rpc_call_list.add(mes);
    servEmul(JSON.stringify(mes));
    wsjson.socket.send(JSON.stringify(mes));
}

// setSpeed
function sendSetSpeed(newSpeed, auid) {
    var mes = {
        call: "set_speed",
            rpc_call_id: rpc_call_list.getID(),
        params: {
            new_speed: newSpeed
        }
    };
    rpc_call_list.add(mes);
    servEmul(JSON.stringify(mes));
    wsjson.socket.send(JSON.stringify(mes));
}

// send chat_message
function sendChatMessage(atext, auid) {
    var mes = {
        call: "chat_message",
        rpc_call_id: rpc_call_list.getID(),
        params: {
            text: atext
        }
    };
    rpc_call_list.add(mes);
    wsjson.socket.send(JSON.stringify(mes));
}


// эмуляция сервера для тестирования JSON
function servEmul(data) {
    var ans;
    var revent = JSON.parse(data);
    // сначало понять что за задача пришла
    if (revent.call == 'goto') {
        // если goto
        // посчитать текущие коррдинаты
        var tempPoint = user.userCar.getCurrentCoord(clock.getCurrentTime());
        // посчитать новую скорость
        var aPoint = new Point(revent.params.x, revent.params.y);
        var tempSpeed = mulScalVector(normVector(subVector(aPoint, tempPoint)), user.userCar.track.speedV.abs());
        // формирование ответа от сервера
        ans = {
            message_type: "push",
            event: {
                kind: "see",
                object: {
                    uid: revent.uid,
                    class: "usercar",
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
        };
    }

    if (revent.call == 'set_speed') {
        // если setspeed
        // посчитать текущие коррдинаты и координаты немного вперёд, чтобы получить вектор скорости
        var tempPoint1 = user.userCar.getCurrentCoord(clock.getCurrentTime());
        var tempPoint2 = user.userCar.getCurrentCoord(clock.getCurrentTime() + 50);
        var tempSpeed1;
        // если tempPoint1 == tempPoint2, тогда взять direction
        if ((tempPoint1.x == tempPoint2.x) && (tempPoint1.y == tempPoint2.y)) {
            tempSpeed1 = mulScalVector(normVector(user.userCar.track.direction), revent.params.newspeed);
        } else {
            // посчитать новую скорость
            tempSpeed1 = mulScalVector(normVector(subVector(tempPoint2, tempPoint1)), revent.params.newspeed);
        }
        // формирование ответа от сервера
        ans = {
            message_type: "push",
            event: {
                kind: "see",
                object: {
                    uid: revent.uid,
                    class: "usercar",
                    position: {
                        x: tempPoint1.x,
                        y: tempPoint1.y
                    },
                    server_time: clock.getCurrentTime(),
                    liner_motion: {
                        velocity: {
                            x: tempSpeed1.x,
                            y: tempSpeed1.y
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
        };
    }

    if (revent.call == 'chat_message') {
        // если это сообщение чата, то сформировать ответ чата и всем его отправить, даже отправителю!
        ans = {
            message_type: "push",
            event: {
                kind: "chat_message",
                from: revent.from,
                text: revent.text,
                id: newIDFromChatMessage()
            }
        };
    }
    // ans уже сформирован. Теперь его нужно преобр. в строку и отправить в обработчик
    receiveMesFromServ(JSON.stringify(ans), false);
}


// Приём сообщения от сервера. Разбор принятого объекта
function receiveMesFromServ(data, fromServ) {
    var mes = JSON.parse(data);
    // если message_type = push
    if (mes.message_type == "push") {
        // значит тут есть евент, смотреть тип евента
        if (mes.event.kind == "see") {
            // это сообщение для модели
            // считываем uid
            var uid = mes.event.object.uid;
            // считываем позицию
            var position = new Point(mes.event.object.position.x, mes.event.object.position.y);
            // считываем серверное время и корректируем в клоке
            var stime = mes.event.object.server_time;
            clock.setDt(stime);
            // смотрим класс мап-объекта

            if (mes.event.object.class == "usercar") {
                // если usercar
                var aTrack, aHP, aType;


                if (mes.event.object.health != null) {
                    // запустить функцию установки хп
                    aHP = mes.event.object.health;
                } else { // попытаться взять хп из лист мап обжект
                    aHP = user.userCar.hp;
                    if (aHP == null) {
                        aHP = 100;
                    }
                }
                if (mes.event.object.type_car != null) {
                    // запустить функцию установки хп
                    aType = mes.event.object.type_car;
                } else { // попытаться взять хп из лист мап обжект
                    aType = user.userCar.type;
                    if (aType == null) {
                        aType = 1;
                    }
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

                    aTrack = new MoveLine(
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
                    var direction = new Point(mes.event.object.direction.x,
                        mes.event.object.direction.y);
                    aTrack = new MoveLine(
                        clock.getCurrentTime(),  //Время начала движения
                        fuel_start,              //Запас топлива
                        fuel_decrement,          //Расход топлива
                        position,                //Начальная точка
                        new Point(0, 0),          //Скорость
                        new Point(0, 0)           //Ускорение
                    );
                    aTrack.direction = direction;
                }

                if (user.userCar != null) {
                    // установть новые характеристики юзер кар
                    user.userCar.track = aTrack;
                    user.userCar.hp = aHP;
                    user.userCar.type = aType;
                } else { // Если вдруг нет юзер кар
                    user.userCar = new UserCar(uid, aType, aHP, 100, aTrack);
                }
            } // конец обработки usercar

            if (mes.event.object.class == "car") {  // обычная машинка
                // если car
                // 1. подготовить все параметры для машинки
                // 2. создать машинку и добавить её в ListMapObject
                // aID - взяли ранее, aType - пока не используем=1, aHP-если не пришло, то берём прошлое
                // aTrack - траектория для машинки
                var aTrack, aType, aHP;

                if (mes.event.object.health != null) {
                    // запустить функцию установки хп
                    aHP = mes.event.object.health;
                } else { // попытаться взять хп из лист мап обжект
                    if (listMapObject.exist(uid)) {
                        aHP = listMapObject.getCarHP(uid);
                        if (aHP == -1) aHP = 100;
                    }
                }

                if (mes.event.object.type_car != null) {
                    // запустить функцию установки хп
                    aType = mes.event.object.type_car;
                } else { // попытаться взять хп из лист мап обжект
                    if (listMapObject.exist(uid)) {
                        aType = listMapObject.objects[uid].type;
                    } else {
                        aType = 0;
                    }
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

                    aTrack = new MoveLine(
                        clock.getCurrentTime(),  //Время начала движения
                        fuel_start,              //Запас топлива
                        fuel_decrement,          //Расход топлива
                        position,                //Начальная точка
                        velocity,                //Скорость
                        acceleration             //Ускорение
                    );
                }

                //если есть direction, значит машинка стоит на месте
                if (mes.event.object.direction != null) {
                    // запустить функцию установки линейного движения с нулевыми скоростью и ускорением, и углом поворта
                    var direction = new Point(mes.event.object.direction.x,
                        mes.event.object.direction.y);
                    aTrack = new MoveLine(
                        clock.getCurrentTime(),  //Время начала движения
                        fuel_start,              //Запас топлива
                        fuel_decrement,          //Расход топлива
                        position,                //Начальная точка
                        new Point(0, 0),          //Скорость
                        new Point(0, 0)           //Ускорение
                    );
                    aTrack.direction = direction;

                }
                // добавить машинку, если её нет
                if (!listMapObject.exist(uid)) {
                    listMapObject.add(new MapCar(uid, aType, aHP, aTrack));
                    // и сразу же добавить маркер
                    listMapObject.objects[uid].marker = getCarMarker(uid, myMap);
                } else {
                    // установить все переменные
                    listMapObject.setCarHP(uid, aHP);
                    listMapObject.setTrack(uid, aTrack);
                }
            } // конец обработки car

            if (mes.event.object.class == "town") {
                // если town
                // добавить town с координатами position которую считали ранее

            } // конец обработки town
        }
        // если message_type = chat_message // Если пришло сообщение в чат
        if (mes.event.kind == "chat_message") {
            // нарисовать в специальный div, который выделен для чата
            addDivToDiv("chatInput", "chat_text"+mes.event.id, mes.event.author + ": " + mes.event.text, false);
        }
    }

    if (mes.message_type == "answer") {
      //  if (mes.result == "OK") {
            rpc_call_list.execute(mes.rpc_call_id);
      //  }
    }
}


