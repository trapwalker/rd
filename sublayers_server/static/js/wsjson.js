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
            var jSelector = $('#buttonConnectServerStatus');
            jSelector.removeClass('buttonConnectServerStatusOn');
            jSelector.addClass('buttonConnectServerStatusOff');
        };

    };

    WSJSON.prototype.sendMess = function(aMess){
        if(user.userCar.hp > 0)
            this.socket.send(JSON.stringify(aMess));
        else
            alert('Вы не можете этого сделать, так как Ваша машина сломана.');
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
    //wsjson.socket.send(JSON.stringify(mes));
    wsjson.sendMess(mes);
    chat.addMessageToLog(JSON.stringify(mes, null, 4), 'rpc');

}

// stop
function sendStopCar() {
    var mes = {
        call: "stop",
        rpc_call_id: rpcCallList.getID(),
        params: { }
    };
    rpcCallList.add(mes);
    //wsjson.socket.send(JSON.stringify(mes));
    wsjson.sendMess(mes);
    chat.addMessageToLog(JSON.stringify(mes, null, 4), 'rpc');
}

// fire
function sendFire(aUid) {
    var mes = {
        call: "fire",
        rpc_call_id: rpcCallList.getID(),
        params: {
            weapon_num: aUid, // uid сектора, который совершил выстрел
            enemy_list: carMarkerList.getListIDsForShoot(aUid)
        }
    };
    rpcCallList.add(mes);
    //wsjson.socket.send(JSON.stringify(mes));
    wsjson.sendMess(mes);
    chat.addMessageToLog(JSON.stringify(mes, null, 4), 'rpc');
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
    //wsjson.socket.send(JSON.stringify(mes));
    wsjson.sendMess(mes);
    chat.addMessageToLog(JSON.stringify(mes, null, 4), 'rpc');
}

// send chat_message - отправляется, даже когда машинка мертва
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
    chat.addMessageToLog(JSON.stringify(mes, null, 4), 'rpc');
}

// Консоль  для сервера, срабатывает при отправке сообщений из активных debug-чатов
function sendServConsole(atext){
    var mes = {
        call: "console_cmd",
        rpc_call_id: rpcCallList.getID(),
        params: {
            cmd: atext
        }
    };
    rpcCallList.add(mes);
    // Консоль отправляется на сервер всегда, вне зависимости от запретов клиента
    wsjson.socket.send(JSON.stringify(mes));
    chat.addMessageToLog(JSON.stringify(mes, null, 4), 'rpc');
}

// Приём сообщения от сервера. Разбор принятого объекта
function receiveMesFromServ(data){

    var mes = JSON.parse(data, function(key, value){
        if((key === 'time') || (key === 'start_time')) return new Date(value * 1000).getTime();
        return value;
    });
    // если message_type = push
    if (mes.message_type == "push") {
        chat.addMessageToLog(data, 'push');
        // проходим по списку евентов
        mes.events.forEach(function (event, index) {
            // Установка времени
            var servtime = event.time;
            //chat.addMessageToSystem('start_time3',"servTime = " + servtime/1000.);
            // Разобратся с часами - Сейчас сервер присылает очень странное время, когда есть две машинки
           // clock.setDt(servtime/1000.);
            if (event.cls === "See" || event.cls === "Contact") {
                // see || contact
                var aTrack, aType, aHP=0;
                aTrack = getTrack(event.object);
                if (event.object.hp) aHP = event.object.hp;
                setCurrentCar(event.object.uid, aType, aHP, aTrack, getOwner(event.object.owner));

                // Визуализация контакта. При каждом сообщение Contact или See будет создан маркер с соответствующим попапом
                if (flagDebug)
                    debugMapList.push(
                        L.circleMarker(myMap.unproject([aTrack.coord.x, aTrack.coord.y], myMap.getMaxZoom()), {color: '#FFBA12'})
                            .setRadius(8)
                            .bindPopup(
                                'Тип сообщения: ' + event.cls + '</br>' +
                                'Server-Time: ' + servtime / 1000. + '</br>' +
                                'uid объекта: ' + event.object.uid + '</br>'
                        )
                            .addTo(myMap)
                    );
            }
            if (event.cls === "Update") {
                // Update
                var aTrack, aType, aHP= 0, owner;
                // Пока что установка времени будет осуществляться здесь! Т.к. При контакте она лагает.
                clock.setDt(servtime / 1000.);
                if (event.object.hp)aHP = event.object.hp;
                aTrack = getTrack(event.object);
                owner = getOwner(event.object);
                updateCurrentCar(event.object.uid, aType, aHP, aTrack, owner);

                // Визуализация Update. При каждом сообщение Contact или See будет создан маркер с соответствующим попапом
                if (flagDebug)
                    debugMapList.push(
                        L.circleMarker(myMap.unproject([event.object.position.x, event.object.position.y], myMap.getMaxZoom()), {color: '#FF0000'})
                            .setRadius(3)
                            .bindPopup(
                                'Тип сообщения: ' + event.cls + '</br>' +
                                'Server-Time: ' + servtime / 1000. + '</br>' +
                                'uid объекта: ' + event.object.uid + '</br>' +
                                'comment: ' + event.comment + '</br>'
                        )
                            .addTo(myMap)
                    );

            }
            if (event.cls === "InitMessage") {
                // InitMessage
                var aTrack = getTrack(event.cars[0]);
                var max_speed;
                var aHp = 0, aMaxHP = 30;
                // Инициализация userCar
                if (event.cars[0].hp) aHP = event.cars[0].hp;
                if (event.cars[0].max_hp) aMaxHP = event.cars[0].max_hp;
                if (event.cars[0].max_velocity) max_speed = event.cars[0].max_velocity;
                initUserCar(event.cars[0].uid, 0, aHP, aMaxHP, aTrack, max_speed, event.cars[0].weapons);

                // Инициализация Юзера
                if(event.agent.cls == "User"){
                    user.login = event.agent.login;
                    user.ID = event.agent.uid;
                }
            }
            if (event.cls === "Out") {
                // out
                carMarkerList.del(event.object_id);
            }
            if (event.cls === "ChatMessage") {
                // chat_message
                chat.addMessage(0, event.id, new Date(servtime), getOwner(event.author), event.text);
            }
        });
    }

    // если message_type = answer
    if (mes.message_type == "answer") {
        chat.addMessageToLog(data, 'answer');
        if (! mes.error) {
            rpcCallList.execute(mes.rpc_call_id);
            if (mes.result)
                if (mes.result.path) {
                    // Очистка текущей траектории движения
                    userCarMarker.trackView.empty();
                    // Для каждого отрезка
                    mes.result.path.forEach(function (segment, index) {
                        // Если линейное движение
                        if (segment.cls === 'Linear') {
                            userCarMarker.trackView.addLinear({
                                a: segment.a,
                                b: segment.b
                            });
                        }
                    });

                }
        }
    }
}

function getTrack(data){
    var aTrack;
    var position;
    var direction;

    if (data.motion) { // Если есть хоть какое-то движение
        if (data.motion.position)
            position = new Point(data.motion.position.x, data.motion.position.y);
        else
            position = new Point(0, 0);

        direction = data.motion.direction ? data.motion.direction : 0; // TODO: сделать вылет с ошибкой

        // Если движение по дуге
        if(data.motion.arc) {
            aTrack = getCircleMotion(data.motion);
            return aTrack;
        }

        else
        // motions
        if (data.motion.cls == "Goto") {
            // запустить функцию установки линейного движения
            var velocity;
            if (data.motion.v)
                velocity = new Point(data.motion.v.x, data.motion.v.y);
            else if (data.motion.velocity)
                velocity = new Point(data.motion.velocity.x, data.motion.velocity.y);
            else
                velocity = new Point(0, 0);

            var start_time = data.motion.time ? data.motion.time : (new Date().getTime());
            //chat.addMessageToSystem('start_time1', "lastTTrack  = " + data.motion.time / 1000.);
            //chat.addMessageToSystem('start_time2', "my_time     = " + clock.getCurrentTime());

            aTrack = new MoveLine(
                    start_time / 1000.,    //Время начала движения
                fuelMaxProbka,         //Запас топлива
                fuelDecrProbka,        //Расход топлива
                direction,             //Направление
                position,              //Начальная точка
                velocity,              //Скорость
                new Point(0, 0)        //Ускорение
            );

            return aTrack;
        }
    }


    // TODO: привести всё к общему виду. При STOP должен присылаться STOP

    if (data.position)
        position = new Point(data.position.x, data.position.y);
    else
        position = new Point(0, 0);

    direction = data.direction ? data.direction : 0; // TODO: сделать вылет с ошибкой

    if (aTrack == null) {
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

function getOwner(data) {
    if (data.cls === "User") {
        var owner = new Owner(data.uid, data.login);
        if (owner) {
            owner = ownerList.add(owner);
            return owner;
        }
    }
    return null;
}


// Получение движения по кругу
function getCircleMotion(motion){
    var a = new Point(motion.arc.a.x, motion.arc.a.y);
    var b = new Point(motion.arc.b.x, motion.arc.b.y);
    var c = new Point(motion.arc.c.x, motion.arc.c.y);
    var alpha = motion.arc.alpha;
    var beta = motion.arc.beta;
    var r = motion.arc.r;
    var vLinear = new Point(motion.v.x, motion.v.y);

    // Время, на преодоление прямого участка с текущей линейной скоростью
    var tLinear = distancePoints(a, b) / vLinear.abs();  // секунды
    // Расчёт длины по окружности
    var lArc = beta - alpha;
    // Расчёт радиальной скорости - получаем изменение угла в секунду   = rad/s
    var w = lArc / tLinear;
    // Радиус-вектор, который мы будем поворачивать со скоростью w для вычисления позиции и направления машинки
    var radiusV = subVector(a,c);
    // время начала движения
    var start_time = motion.time ? motion.time : (new Date().getTime());
    // движение по часовой стрелке или против часовой стрелки 1 = по часовой
    var ccw = motion.arc.ccw;

    return new MoveCircle(
        start_time / 1000. , // Время начала движения
        //clock.getCurrentTime(),
        fuelMaxProbka,                          //Запас топлива
        fuelDecrProbka,                          //Расход топлива
        c,                  // центр поворота
        radiusV,            // ралиус-вектор
        alpha,              // начальный угол
        w,                  // угловая скорость
        0,                  // ускорение
        ccw                 // По часовой стрелке или против неё
    );

}
// TODO: продумать состояние машинки "убит".
// Возможно сделать метод для машинки, который будет вызываться и переводить её в это состояние,
// т.е. менять там иконку и возможно другие параметры.
function setCurrentCar(uid, aType, aHP, aTrack, aOwner) {
    if (uid == user.userCar.ID) { // если машинка своя
        user.userCar.track = aTrack;
        user.userCar.hp = aHP;
    }
    else { // если не своя, то проверить есть ли такая в модели
        if (!listMapObject.exist(uid)) {  // добавить машинку, если её нет
            var car = new MapCar(uid, aType, aHP, aTrack);
            carMarkerList.add(car, aOwner);
        } else { // Если такая машинка уже есть, то
            // установить все переменные
            listMapObject.setCarHP(uid, aHP);
            listMapObject.setTrack(uid, aTrack);
        }
        // После добавления машинки или её апдейта, проверяем сколько у неё хп
        if(listMapObject.objects[uid].hp == 0){
            listMapObject.objects[uid].marker.setIcon(iconsLeaflet.icon_killed_V2);
        }
    }

}


function updateCurrentCar(uid, aType, aHP, aTrack, owner) {
    if (uid == user.userCar.ID) { // если машинка своя
        user.userCar.track = aTrack;
        user.userCar.hp = aHP;
        // TODO: Если новое хп своей машинки равно 0, то запретить ездитьи стрелять, а так же поменять иконку
        if(user.userCar.hp == 0){
            userCarMarker.marker.setIcon(iconsLeaflet.icon_killed_V1);
        }
    }
    else { // если не своя, то проверить есть ли такая в модели
        listMapObject.setCarHP(uid, aHP);
        listMapObject.setTrack(uid, aTrack);

        // После добавления машинки или её апдейта, проверяем сколько у неё хп
        if(listMapObject.objects[uid].hp == 0){
            listMapObject.objects[uid].marker.setIcon(iconsLeaflet.icon_killed_V2);
        }
    }

}

function getWeapons(data) {
    var sectors = [];
    data.forEach(function (weapon, index) {
            // FireSector(aDirectionAngle, aWidthAngle, aRadius, aUid, aRecharge)
            // TODO: ввести позже правильный uid сектора и правильный речардж, когда будет присылаться
            var sector = new FireSector(weapon.direction, gradToRad(weapon.sector_width), weapon.r, index, 2000);
            sector.damage = weapon.damage;
            this.sectors.push(sector);
        }, {sectors: sectors} );
    return sectors;
}

function initUserCar(uid, aType, aHP, aMaxHP, aTrack, amax_speed, aWeapons) {
    if(! user.userCar) {
        user.userCar = new UserCar(uid,       //ID машинки
            aType,       //Тип машинки
            aHP,      //HP машинки
            amax_speed,      //Максималка
            aTrack);   //Текущая траектория


        var fireSectors = getWeapons(aWeapons);

        // Добавить сектора в userCar
        user.userCar.AddFireSectors(fireSectors);

        // Инициализация маркера машинки
        userCarMarker = new UserCarMarker({
            position: myMap.unproject([aTrack.coord.x, aTrack.coord.y], myMap.getMaxZoom()),
            tailEnable: false,
            _map: myMap,
            radiusView: 1000,
            carID: uid,
            sectors: user.userCar.fireSectors,
            countSectorPoints: 20
        });

        // Инициализация контроллеров
        // controllers
        controllers = new Controllers({
            fuelMax: fuelMaxProbka,
            hpMax: aMaxHP,
            fireSectors: user.userCar.fireSectors,
            max_velocity: amax_speed
        });
    }
    else {
        // значит пришёл второй initMessage, значит нужно переопределить все параметры

        // TODO очистить все-все списки, которые хранятся на клиенте
        carMarkerList.clearList();
        // Разбиндить все машинки для всех пользователей
        ownerList.clearOwnerList();

        // Переопределение своей машинки
        user.userCar = new UserCar(uid,       //ID машинки
            aType,       //Тип машинки
            aHP,      //HP машинки
            amax_speed,      //Максималка
            aTrack);   //Текущая траектория

        // Добавить сектора в userCar
        var fireSectors = getWeapons(aWeapons);
        user.userCar.AddFireSectors(fireSectors);

        // Переинициализация маркера машинки
        userCarMarker.setNewParams({
            position: myMap.unproject([aTrack.coord.x, aTrack.coord.y], myMap.getMaxZoom()),
            tailEnable: (myMap.getZoom() > levelZoomForVisible),
            _map: myMap,
            radiusView: 1000,
            carID: user.userCar.ID,
            sectors: user.userCar.fireSectors,
            countSectorPoints: 20
        });

        // установка новых параметров контроллеров
        controllers.setNewParams({
            fuelMax: fuelMaxProbka,
            hpMax: aMaxHP,
            sectors: user.userCar.fireSectors,
            max_velocity: amax_speed
        });

    }

}



var fuelMaxProbka = 500;
var fuelDecrProbka = 1;
