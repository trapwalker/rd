// класс WSJSON - необходим для отправки и приёма сообщений от сервера
WSJSON = (function () {
    function WSJSON() {
        var url = "ws://" + location.host + "/ws";
        this.socket = new WebSocket(url);
        this.isConnected = false;
        this.timeDelay = 5000; // 5 ескунд

        this.onopen = function() {
            this.isConnected = true;
        }

        this.socket.onmessage = function (event) {
            receiveMesFromServ(event.data);
        }

        this.socket.onerror = function (error) {
            this.isConnected = false;
            alert("Ошибка " + error.message);
            /*
            setTimeout(function reconnect(){
                alert('in reconnect');
                this.timeDelay *= 2;
                this.socket = new WebSocket(this.url);
            }, this.timeDelay);
            */
        }

        this.socket.onclose = function (event) {
            // websocket is closed.
            this.isConnected = false;
            if (event.wasClean) {
                alert('Соединение закрыто чисто');
            } else {
                alert('Обрыв соединения'); // например, "убит" процесс сервера
            }
            alert('Код: ' + event.code + ' причина: ' + event.reason);
        };

    };

    return WSJSON;
})();


// функции формирования исходящих сообщений

// goto
function sendNewPoint(aPoint, auid) {
    var mes = {
        call: "goto",
        rpc_call_id: rpcCallList.getID(),
        params: {
                x: aPoint.x,
                y: aPoint.y
        }
    };
    rpcCallList.add(mes);
    wsjson.socket.send(JSON.stringify(mes));
}

// stop
function sendStopCar(auid) {
    var mes = {
        call: "stop",
        rpc_call_id: rpcCallList.getID(),
        params: { }
    };
    rpcCallList.add(mes);
    wsjson.socket.send(JSON.stringify(mes));
}

// fire
function sendFire(aPoint, auid) {
    var mes = {
        call: "fire",
        rpc_call_id: rpcCallList.getID(),
        params: {}
    };
    rpcCallList.add(mes);
    wsjson.socket.send(JSON.stringify(mes));
}

// setSpeed
function sendSetSpeed(newSpeed, auid) {
    var mes = {
        call: "set_speed",
        rpc_call_id: rpcCallList.getID(),
        params: {
            new_speed: newSpeed
        }
    };
    rpcCallList.add(mes);
    wsjson.socket.send(JSON.stringify(mes));
}

// send chat_message
function sendChatMessage(atext, auid) {
    var mes = {
        call: "chat_message",
        rpc_call_id: rpcCallList.getID(),
        params: {
            text: atext
        }
    };
    rpcCallList.add(mes);
    wsjson.socket.send(JSON.stringify(mes));
}

// Приём сообщения от сервера. Разбор принятого объекта
function receiveMesFromServ(data) {
    var mes = JSON.parse(data, function(key, value){
        if (key == 'time') return new Date(value*1000);
        if (key == 'start_time') return new Date(value*1000);
        return value;
    });
    // если message_type = push
    if (mes.message_type == "push") {
        addMesToConsole(data);
        // проходим по списку евентов
        mes.events.forEach(function (event, index) {
            // Установка времени
            var servtime = event.time;
            clock.setDt(servtime);
            if (event.cls == "See" || event.cls == "Contact" || event.cls == "Update") {
                // see || contact || Update
                var aTrack, aType, aHP;
                aTrack = getTrack(event.object);
                setCurrentCar(event.object.uid, aType, aHP, aTrack);
            }
            if (event.cls == "InitMessage") {
                // InitMessage
                var aTrack = getTrack(event.cars[0]);
                var max_speed;
                // Инициализация userCar
                if(event.cars[0].max_velocity) max_speed = event.cars[0].max_velocity;
                initUserCar(event.cars[0].uid, 0, 0, aTrack, max_speed);

                // Инициализация Юзера
                if(event.agent.cls == "User"){
                    user.login = event.agent.login;
                    user.ID = event.agent.uid;
                }
            }
            if (event.cls == "Out") {
                // out
                var uid = event.object_id;
                if (listMapObject.exist(uid)) {
                    myMap.removeLayer(listMapObject.objects[uid].marker);
                    delete listMapObject.objects[uid].marker;
                    listMapObject.del(uid);
                }
            }
            if (event.cls == "ChatMessage") {
                // chat_message
                addDivToDiv("viewMessengerList", "chat_text" + event.id + "newChat", servtime + " " +
                    event.author.login + ": " + event.text, true);
            }
        });


    }

    // если message_type = answer
    if (mes.message_type == "answer") {
        if (! mes.error) {
            rpcCallList.execute(mes.rpc_call_id);
        }
    }
}

function getTrack(data){
    var aTrack;
    var position;

    if (data.position)
        position = new Point(data.position.x, data.position.y);
    else
        position = new Point(0, 0);


    if(data.motion) {
        // motions
        if (data.motion.cls == "Goto") {
            // запустить функцию установки линейного движения
            var velocity = new Point(data.motion.velocity.x,
                data.motion.velocity.y);
            var start_time = data.motion.start_time;
            aTrack = new MoveLine(
                start_time,             //Время начала движения
                0,                      //Запас топлива
                0,                      //Расход топлива
                position,               //Начальная точка
                velocity,               //Скорость
                new Point(0, 0)         //Ускорение
            );
            return aTrack;
        }

        //direction
        if (data.direction != null) {
            // запустить функцию установки линейного движения с нулевыми скоростью и ускорением, и углом поворта
            var direction = new Point(data.direction.x,
                data.direction.y);
            aTrack = new MoveLine(
                clock.getCurrentTime(), //Время начала движения
                0,                      //Запас топлива
                0,                      //Расход топлива
                position,               //Начальная точка
                new Point(0, 0),        //Скорость
                new Point(0, 0)         //Ускорение
            );
            aTrack.direction = direction;

        }
    }

    if(aTrack == null) {
        aTrack = new MoveLine(
            clock.getCurrentTime(),     //Время начала движения
            0,                          //Запас топлива
            0,                          //Расход топлива
            position,                   //Начальная точка
            new Point(0, 0),            //Скорость
            new Point(0, 0)             //Ускорение
        );
    }
    return aTrack;
}

function setCurrentCar(uid, aType, aHP, aTrack) {
    if (uid = user.userCar.ID) { // если машинка своя
        user.userCar.track = aTrack;
        user.userCar.hp = aHP;
    }
    else { // если не своя, то проверить есть ли такая в модели
        alert('Мы находимся в алерте! и для НЕ нашей машинки!');
        if (!listMapObject.exist(uid)) {  // добавить машинку, если её нет
            listMapObject.add(new MapCar(uid, aType, aHP, aTrack));
            // и сразу же добавить маркер
            listMapObject.objects[uid].marker = getCarMarker(uid, myMap);
        } else { // Если такая машинка уже есть, то
            // установить все переменные
            listMapObject.setCarHP(uid, aHP);
            listMapObject.setTrack(uid, aTrack);
        }
    }

}

function initUserCar(uid, aType, aHP, aTrack, amax_speed) {
    user.userCar = new UserCar(uid,       //ID машинки
        aType,       //Тип машинки
        aHP,      //HP машинки
        amax_speed,      //Максималка
        aTrack);   //Текущая траектория

    userCarMarker.carID = uid; // возможно сделать инициализацию маркера тут
    // Создание следа за пользовательской машинкой
    userCarTail = new CarTail(aTrack.coord, myMap);
}
