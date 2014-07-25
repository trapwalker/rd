// класс WSJSON - необходим для отправки и приёма сообщений от сервера
WSJSON = (function () {
    function WSJSON() {
        var url = "ws://" + location.host + "/ws";
        this.socket = new WebSocket(url);
        this.isConnected = false;
        this.timeDelay = 5000; // 5 ескунд

        this.onopen = function() {
            this.isConnected = true;
        };

        this.socket.onmessage = function (event) {
            receiveMesFromServ(event.data);
        };

        this.socket.onerror = function (error) {
            this.isConnected = false;
            //alert("Ошибка соединения...Попытка переподключения пока отсутствует. Приносим свои извинения.");
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
                //alert('Обрыв соединения'); // например, "убит" процесс сервера
            }
            //alert('Код: ' + event.code + ' причина: ' + event.reason);
            iconConnectServer.src = "img/disconnect.png";
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
function sendStopCar() {
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
function receiveMesFromServ(data){

    var mes = JSON.parse(data, function(key, value){
        if((key === 'time') || (key === 'start_time')) return new Date(value * 1000).getTime();
        return value;
    });
    // если message_type = push
    if (mes.message_type == "push") {
        addMessageToLog(data);
        // проходим по списку евентов
        mes.events.forEach(function (event, index) {
            // Установка времени
            var servtime = event.time;
            addMessageToSystem('start_time3',"servTime = " + servtime/1000.);
            // Разобратся с часами - Сейчас сервер присылает очень странное время, когда есть две машинки
           // clock.setDt(servtime/1000.);
            if (event.cls === "See" || event.cls === "Contact") {
                // see || contact
                var aTrack, aType, aHP;
                aTrack = getTrack(event.object);
                setCurrentCar(event.object.uid, aType, aHP, aTrack);

                // Визуализация контакта. При каждом сообщение Contact или See будет создан маркер с соответствующим попапом
                if (flagDebug)
                    L.circleMarker(myMap.unproject([aTrack.coord.x, aTrack.coord.y], 16), {color: '#FFBA12'})
                        .setRadius(10)
                        .bindPopup(
                            'Тип сообщения: ' + event.cls + '</br>' +
                            'Server-Time: ' + servtime + '</br>' +
                            'uid объекта: ' + event.object.uid + '</br>'
                    )
                        .addTo(myMap);
            }
            if (event.cls === "Update") {
                // Update
                var aTrack, aType, aHP;
                // Пока что установка времени будет осуществляться здесь! Т.к. При контакте она лагает.
                clock.setDt(servtime/1000.);
                aTrack = getTrack(event.object);
                updateCurrentCar(event.object.uid, aType, Math.random() * hpMaxProbka, aTrack);
            }
            if (event.cls === "InitMessage") {
                // InitMessage
                var aTrack = getTrack(event.cars[0]);
                var max_speed;
                // Инициализация userCar
                if(event.cars[0].max_velocity) max_speed = event.cars[0].max_velocity;
                initUserCar(event.cars[0].uid, 0, Math.random() * hpMaxProbka, aTrack, max_speed);

                // Инициализация Юзера
                if(event.agent.cls == "User"){
                    user.login = event.agent.login;
                    user.ID = event.agent.uid;
                }
            }
            if (event.cls === "Out") {
                // out
                var uid = event.object_id;
                if (listMapObject.exist(uid)) {
                    myMap.removeLayer(listMapObject.objects[uid].marker);
                    delete listMapObject.objects[uid].marker;
                    listMapObject.del(uid);
                }
            }
            if (event.cls === "ChatMessage") {
                // chat_message
                chat.addMessage(0, event.id, new Date(servtime), event.author, event.text);
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
    var direction;

    if (data.position)
        position = new Point(data.position.x, data.position.y);
    else
        position = new Point(0, 0);

    direction = data.direction ? (data.direction + Math.PI/2.) : 0; // так как у сервера 0 в другую сторону




    if(data.motion) {
        // motions
        if (data.motion.cls == "Goto") {
            // запустить функцию установки линейного движения
            var velocity = new Point(data.motion.velocity.x,
                data.motion.velocity.y);
            var start_time = data.motion.start_time;
            addMessageToSystem('start_time1', "lastTTrack  = " + data.motion.start_time/1000.);
            addMessageToSystem('start_time2', "my_time     = " + clock.getCurrentTime());

            aTrack = new MoveLine(
                start_time/1000.,             //Время начала движения
                fuelMaxProbka,                      //Запас топлива
                fuelDecrProbka,                      //Расход топлива
                direction,              //Направление
                position,               //Начальная точка
                velocity,               //Скорость
                new Point(0, 0)         //Ускорение
            );

            return aTrack;
        }
    }

    if(aTrack == null) {
        aTrack = new MoveLine(
            clock.getCurrentTime(),     //Время начала движения
            fuelMaxProbka,                          //Запас топлива
            fuelDecrProbka,                          //Расход топлива
            direction,                  //Направление
            position,                   //Начальная точка
            new Point(0, 0),            //Скорость
            new Point(0, 0)             //Ускорение
        );
    }
    return aTrack;
}

function setCurrentCar(uid, aType, aHP, aTrack) {
    if (uid == user.userCar.ID) { // если машинка своя
        user.userCar.track = aTrack;
        user.userCar.hp = aHP;
    }
    else { // если не своя, то проверить есть ли такая в модели
        if (!listMapObject.exist(uid)) {  // добавить машинку, если её нет
            var car = new MapCar(uid, aType, aHP, aTrack);
            listMapObject.add(car);
            // и сразу же добавить маркер
            listMapObject.objects[uid].marker = getCarMarker(uid, myMap);
        } else { // Если такая машинка уже есть, то
            // установить все переменные
            listMapObject.setCarHP(uid, aHP);
            listMapObject.setTrack(uid, aTrack);
        }
    }

}


function updateCurrentCar(uid, aType, aHP, aTrack) {
    if (uid == user.userCar.ID) { // если машинка своя
        user.userCar.track = aTrack;
        user.userCar.hp = aHP;
    }
    else { // если не своя, то проверить есть ли такая в модели
        listMapObject.setCarHP(uid, aHP);
        listMapObject.setTrack(uid, aTrack);
    }

}

function initUserCar(uid, aType, aHP, aTrack, amax_speed) {
    user.userCar = new UserCar(uid,       //ID машинки
        aType,       //Тип машинки
        aHP,      //HP машинки
        amax_speed,      //Максималка
        aTrack);   //Текущая траектория

    var fireSectorsProbka = [
        new FireSector(gradToRad(0), gradToRad(30), 400, 1, 6 * 1000),
        new FireSector(gradToRad(180), gradToRad(50), 350, 2, 4 * 1000),
        new FireSector(gradToRad(90), gradToRad(70), 300, 3, 2 * 1000),
        new FireSector(gradToRad(-90), gradToRad(70), 300, 3, 2 * 1000)
    ];

    // Инициализация маркера машинки
    userCarMarker = new UserCarMarker({
        position: myMap.unproject([aTrack.coord.x, aTrack.coord.y],16),
        tailEnable: false,
        _map: myMap,
        radiusView: 1000,
        carID: uid,
        sectors: fireSectorsProbka,
        countSectorPoints: 20
    });

    // Инициализация контроллеров
    // controllers
    controllers = new Controllers({
        fuelMax: fuelMaxProbka,
        hpMax: hpMaxProbka,
        fireSectors: fireSectorsProbka
    });

}



var fuelMaxProbka = 500;
var fuelDecrProbka = 1;
var hpMaxProbka = 100;
