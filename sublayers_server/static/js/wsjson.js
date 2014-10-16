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
                //alert('Обрыв соединения. Переподключитесь к серверу.'); // например, "убит" процесс сервера
                //window.location.reload();
                modalWindow.modalRestartShow();
            }
            //alert('Код: ' + event.code + ' причина: ' + event.reason);
        };

    };

    WSJSON.prototype.sendMess = function(aMess){
        if(user.userCar.hp > 0)
            this.socket.send(JSON.stringify(aMess));
        //else
            //alert('Вы не можете этого сделать, так как Ваша машина сломана.');
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
    wsjson.sendMess(mes);
    if (cookieStorage.enableLogRPCMessage())
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
    wsjson.sendMess(mes);
    if (cookieStorage.enableLogRPCMessage())
        chat.addMessageToLog(JSON.stringify(mes, null, 4), 'rpc');
}

// fire
function sendFire(aUid) {
    var mes = {
        call: "fire",
        rpc_call_id: rpcCallList.getID(),
        params: {
            weapon_num: aUid, // uid сектора, который совершил выстрел
            hit_list: (cookieStorage.optionsFriendlyFireEnabled ? carMarkerList.getListIDsForShootAll(aUid) : carMarkerList.getListIDsForShoot(aUid))
        }
    };
    rpcCallList.add(mes);
    wsjson.sendMess(mes);
    if (cookieStorage.enableLogRPCMessage())
        chat.addMessageToLog(JSON.stringify(mes, null, 4), 'rpc');
}

// fire Crazy
function sendFireCrazy(aUid, listForShoot) {
    if(listForShoot.length > 0) {
        var mes = {
            call: "fire",
            rpc_call_id: rpcCallList.getID(),
            params: {
                weapon_num: aUid, // uid сектора, который совершил выстрел
                hit_list: listForShoot
            }
        };
        rpcCallList.add(mes);
        wsjson.sendMess(mes);
        if (cookieStorage.enableLogRPCMessage())
            chat.addMessageToLog(JSON.stringify(mes, null, 4), 'rpc');
    }
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
    wsjson.sendMess(mes);
    if (cookieStorage.enableLogRPCMessage())
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
    if (cookieStorage.enableLogRPCMessage())
        chat.addMessageToLog(JSON.stringify(mes, null, 4), 'rpc');
}

// Консоль  для сервера, срабатывает при отправке сообщений из активных debug-чатов
function sendServConsole(atext) {
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
    if (cookieStorage.enableLogRPCMessage())
        chat.addMessageToLog(JSON.stringify(mes, null, 4), 'rpc');

    if(atext.split('(')[0] === 'crazy')// Если отправили команду crazy на сервер, то пусть и сам стреляет
        crazyShooting();
}

// Приём сообщения от сервера. Разбор принятого объекта
function receiveMesFromServ(data){
    var mes = JSON.parse(data, function(key, value){
        if((key === 'time') || (key === 'start_time')) return new Date(value * 1000).getTime();
        return value;
    });
    // если message_type = push
    if (mes.message_type == "push") {
        var aTrack, aType, aHP= 0, owner;
        if (cookieStorage.enableLogPushMessage())
            chat.addMessageToLog(data, 'push');
        // проходим по списку евентов
        mes.events.forEach(function (event, index) {
            // Установка времени
            var servtime = event.time;
            if (event.cls === "See" || event.cls === "Contact") {
                // see || contact
                aTrack = getTrack(event.object);
                if (event.object.hp) aHP = event.object.hp;
                setCurrentCar(event.object.uid, aType, aHP, aTrack, getOwner(event.object.owner), event.object.role);

                // Визуализация контакта. При каждом сообщение Contact или See будет создан маркер с соответствующим попапом
                if (cookieStorage.enableMarkerContact())
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
                // Пока что установка времени будет осуществляться здесь! Т.к. При контакте она лагает.
                clock.setDt(servtime / 1000.);
                if (event.object.hp)aHP = event.object.hp;
                aTrack = getTrack(event.object);
                owner = getOwner(event.object);
                updateCurrentCar(event.object.uid, aType, aHP, aTrack, owner);

                // Визуализация Update. При каждом сообщение Contact или See будет создан маркер с соответствующим попапом
                if (cookieStorage.enableMarkerUpdate())
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
                aTrack = getTrack(event.cars[0]);
                var max_speed;
                var aMaxHP = 30;
                var radius_visible = event.cars[0].r;

                // Запустить отчёт времени до рестарта сервера
                showTimeToResetServer(servtime);

                // Инициализация Юзера
                if(event.agent.cls == "User"){
                    user.login = event.agent.login;
                    user.ID = event.agent.uid;
                    if (event.agent.party)
                        user.party = new OwnerParty(event.agent.party.id, event.agent.party.name);
                }

                // Инициализация userCar
                if (event.cars[0].hp) aHP = event.cars[0].hp;
                if (event.cars[0].max_hp) aMaxHP = event.cars[0].max_hp;
                if (event.cars[0].max_velocity) max_speed = event.cars[0].max_velocity;
                initUserCar(event.cars[0].uid, 0, aHP, aMaxHP, aTrack, max_speed, event.cars[0].weapons, radius_visible, event.cars[0].role);
            }
            if (event.cls === "Out") {
                // out
                carMarkerList.del(event.object_id);
            }
            if (event.cls === "ChatMessage") {
                // chat_message
                chat.addMessage(0, event.id, new Date(servtime), getOwner(event.author), event.text);
            }
            if (event.cls === "WinMessage") {
                if(event.winner){
                    if(event.winner.role === "Cargo"){
                        showWinLoseMessage('Corp');
                    }else{
                        showWinLoseMessage('Band');
                    }
                }else{
                    showWinLoseMessage('Band');
                }
            }
        });
    }

    // если message_type = answer
    if (mes.message_type == "answer") {
        if (cookieStorage.enableLogAnswerMessage())
            chat.addMessageToLog(data, 'answer');
        if (! mes.error) {
            rpcCallList.execute(mes.rpc_call_id);
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

        // Если в motion есть path, то задать траекторию движения (но только для своей машинки)
        if (data.motion.path && user.userCar.ID == data.uid) {
            if (data.motion.path[0]) {
                // Очистка текущей траектории движения
                userCarMarker.trackView.empty();
                // создать искуственно первый сегмент от текущей позиции до первой точки А
                if (data.motion.path[0].cls === 'Linear')
                    userCarMarker.trackView.addLinear({
                        a: position,
                        b: data.motion.path[0].a
                    });
                // Для каждого отрезка
                data.motion.path.forEach(function (segment, index) {
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


        direction = data.motion.direction ? data.motion.direction : 0;

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

    if (data.position)
        position = new Point(data.position.x, data.position.y);
    else
        position = new Point(0, 0);

    direction = data.direction ? data.direction : 0;

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

// Считывает параметры для создания состояние и возвращает его.
function getState(data) {
    return new State(
        data.t,                                 // Время
        new Point(data.p.x, data.p.y),          // Позиция
        data.fi,                                // Направление
        data,v,                                 // Скорость - число
        data.a,                                 // Ускорение - число
        data.c ? (new Point(data.c.x, data.c.y)) : null     // Центр поворота, которого может не быть
    );
}

function getOwner(data) {
    if (data.cls === "User") {
        var party;
        if (data.party)
            party = new OwnerParty(data.party.id, data.party.name);
        else
            party = new OwnerParty(0, "");
        var owner = new Owner(data.uid, data.login, party);
        if (owner) {
            owner = ownerList.add(owner);
            // Если даже мы его не добавили, то обновить owner'у его пати
            if(owner.party.id !== party.id) owner.party = party;
            //
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
        ccw,                // По часовой стрелке или против неё
        vLinear.abs()       // Линейная скорость, для отображения в спидометре
    );

}
// Сделано состояние клиента "убит", значит машинка юзера убита.
// Возможно сделать метод для машинки, который будет вызываться и переводить её в это состояние,
// т.е. менять там иконку и возможно другие параметры.
function setCurrentCar(uid, aType, aHP, aTrack, aOwner, role) {
    if (uid == user.userCar.ID) { // если машинка своя
        user.userCar.track = aTrack;
        user.userCar.hp = aHP;
    }
    else { // если не своя, то проверить есть ли такая в модели
        if (!listMapObject.exist(uid)) {  // добавить машинку, если её нет
            var car = new MapCar(uid, aType, aHP, aTrack);
            // установить роль
            car.role = role;

            carMarkerList.add(car, aOwner);

            if(aHP == 0)// поставить стоп-трек
                car.track.speedV = new Point(0, 0);

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
    var oldHP;
    if (uid == user.userCar.ID) { // если машинка своя
        // Установить новую траекторию
        // Сохранить старое хп и установить нвоое
        oldHP = user.userCar.hp;
        user.userCar.hp = aHP;
        if(oldHP > 0) // Устанавливается траектория, только если машинка жива
            user.userCar.track = aTrack;
        if(user.userCar.hp <= 0){
            userCarMarker.marker.setIcon(iconsLeaflet.icon_killed_V1);
            setClientState('death_car');
            modalWindow.modalDeathShow();
        }else{
            if(oldHP != aHP) // Если хп изменилось, то мигнуть маркером
                flashMarker(userCarMarker.marker);
        }

    }
    else { // если не своя, то проверить есть ли такая в модели
        // Сохранить старое хп и установить нвоое
        oldHP = listMapObject.objects[uid].hp;
        listMapObject.setCarHP(uid, aHP);
        // Установить новую траекторию
        if(oldHP > 0) // Устанавливается траектория, только если машинка жива
        listMapObject.setTrack(uid, aTrack);
        // После добавления машинки или её апдейта, проверяем сколько у неё хп
        if(listMapObject.objects[uid].hp <= 0){
            listMapObject.objects[uid].marker.setIcon(iconsLeaflet.icon_killed_V2);
        }else{
            if(oldHP != aHP) // Если хп изменилось, то мигнуть маркером
                flashMarker(listMapObject.objects[uid].marker);
        }
    }

}

function getWeapons(data) {
    var sectors = [];
    data.forEach(function (weapon, index) {
            // TODO: ввести позже речардж сектора, когда будет присылаться
            var sector = new FireSector(weapon.direction, gradToRad(weapon.sector_width), weapon.r, index, 2000);
            sector.damage = weapon.damage;
            this.sectors.push(sector);
        }, {sectors: sectors} );
    return sectors;
}

function initUserCar(uid, aType, aHP, aMaxHP, aTrack, amax_speed, aWeapons, radius_visible, role) {
    var fireSectors;
    var speed_to_set = (amax_speed*0.75).toFixed(0); // Сразу будет выставлена такая скорость, чтобы оно норамльно игралось
    if(! user.userCar) {
        user.userCar = new UserCar(uid,       //ID машинки
            aType,       //Тип машинки
            aHP,      //HP машинки
            amax_speed,      //Максималка
            aTrack);   //Текущая траектория


        fireSectors = getWeapons(aWeapons);

        // Добавить сектора в userCar
        user.userCar.AddFireSectors(fireSectors);

        // Инициализация маркера машинки
        userCarMarker = new UserCarMarker({
            position: myMap.unproject([aTrack.coord.x, aTrack.coord.y], myMap.getMaxZoom()),
            tailEnable: false,
            _map: myMap,
            radiusView: radius_visible,
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
            max_velocity: amax_speed,
            set_velocity: speed_to_set
        });

        // Инициализация радиального меню - установка правильных id секторов
        radialMenu.setIDSectorsWithAngle(user.userCar.fireSectors);


        // Добавление городов
        getTownMarker(new MapTown(1, new Point(4835, 23804), 'Город #1', 20), myMap);
        var town2 = getTownMarker(new MapTown(2, new Point(29527, 14612), 'Город #2', 20), myMap);

        if (user.party.name === 'Corp')
            town2.bindPopup('Ваша задача доставить груз к этому городу.');
        else
            town2.bindPopup('Ваша задача не допустить доставку груза к этому городу.');


        // Выставление скорости на сервере
        changeSpeedOnSlider();
    }
    else {
        // значит пришёл второй initMessage, значит нужно переопределить все параметры
        // Переопределение параметров клиента
        setClientState();
        // очистить все-все списки, которые хранятся на клиенте
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
        fireSectors = getWeapons(aWeapons);
        user.userCar.AddFireSectors(fireSectors);

        // Переинициализация маркера машинки
        userCarMarker.setNewParams({
            position: myMap.unproject([aTrack.coord.x, aTrack.coord.y], myMap.getMaxZoom()),
            tailEnable: (cookieStorage.visibleLabel()),
            _map: myMap,
            radiusView: radius_visible,
            carID: user.userCar.ID,
            sectors: user.userCar.fireSectors,
            countSectorPoints: 20
        });

        // установка новых параметров контроллеров
        controllers.setNewParams({
            fuelMax: fuelMaxProbka,
            hpMax: aMaxHP,
            sectors: user.userCar.fireSectors,
            max_velocity: amax_speed,
            set_velocity: speed_to_set
        });

        // Обновление скорости
        changeSpeedOnSlider();

        // Инициализация радиального меню - установка правильных id секторов
        radialMenu.setIDSectorsWithAngle(user.userCar.fireSectors);
    }

    // Присвоение роли
    user.role = role;

    // Установка текста в верху страницы - вывод своего ника и своей пати
    setTitleOnPage();
}



var fuelMaxProbka = 500;
var fuelDecrProbka = 1;
