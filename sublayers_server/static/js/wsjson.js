
// функции формирования исходящих сообщений

// goto
function sendNewPoint(aPoint) {
    //alert('sendNewPoint');
    var mes = {
        call: "goto",
        rpc_call_id: rpcCallList.getID(),
        params: {
            x: aPoint.x,
            y: aPoint.y
        }
    };
   // rpcCallList.add(mes);
   // clientManager._sendMessage(mes);
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
    //wsjson.sendMess(mes);
    clientManager._sendMessage(mes);
   // if (cookieStorage.enableLogRPCMessage())
       // chat.addMessageToLog(JSON.stringify(mes, null, 4), 'rpc');
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
        //wsjson.sendMess(mes);
        clientManager._sendMessage(mes);
        //if (cookieStorage.enableLogRPCMessage())
           // chat.addMessageToLog(JSON.stringify(mes, null, 4), 'rpc');
    }
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
    //wsjson.socket.send(JSON.stringify(mes));
    clientManager._sendMessage(mes);
    //if (cookieStorage.enableLogRPCMessage())
       // chat.addMessageToLog(JSON.stringify(mes, null, 4), 'rpc');
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
    //wsjson.socket.send(JSON.stringify(mes));
    clientManager._sendMessage(mes);
    //if (cookieStorage.enableLogRPCMessage())
    //    chat.addMessageToLog(JSON.stringify(mes, null, 4), 'rpc');

    if(atext.split('(')[0] === 'crazy')// Если отправили команду crazy на сервер, то пусть и сам стреляет
        crazyShooting();
}

// Приём сообщения от сервера. Разбор принятого объекта
function receiveMesFromServ(mes){
    // если message_type = push
    if (mes.message_type == "push") {
        var aTrack, aType, aHP= 0, owner;
        //if (cookieStorage.enableLogPushMessage())
            //if (mes.events[0].cls !== "Update")
            //    chat.addMessageToLog(data, 'push');
        // проходим по списку евентов
        mes.events.forEach(function (event, index) {
            // Установка времени
            var servtime = event.time;
            if (event.cls === "See" || event.cls === "Contact") {
                // see || contact
                if(event.is_first) { // Только если первый раз добавляется машинка
                    aTrack = getTrack(event.object);
                    if (event.object.hp) aHP = event.object.hp;
                    setCurrentCar(event.object.uid, aType, aHP, aTrack, getOwner(event.object.owner), event.object.role);
                }
                // Визуализация контакта. При каждом сообщение Contact или See будет создан маркер с соответствующим попапом
                if (cookieStorage.enableMarkerContact())
                    debugMapList.push(
                        L.circleMarker(myMap.unproject([aTrack.coord.x, aTrack.coord.y], myMap.getMaxZoom()), {color: '#FFBA12'})
                            .setRadius(8)
                            .bindPopup(
                                'Тип сообщения: ' + event.cls + '</br>' +
                                'Server-Time: ' + servtime / 1000. + '</br>' +
                                'uid объекта: ' + event.object.uid + '</br>' +
                                'subject_id: ' + event.subject_id + '</br>'
                        )
                            .addTo(myMap)
                    );

                // отрисовка линии от объекта к субъекту
                // TODO: сделано специально, иначе нужно пересматривать ВСЮ архитектуру клиента
                setTimeout(function () {
                    carMarkerList.addContactLine(event.subject_id, event.object.uid);
                }, 500);

            }
            if (event.cls === "Update") {
                // Update


            }
            if (event.cls === "InitMessage" || event.cls === "Init") {
                alert('Init');
                }
            if (event.cls === "Out") {
                // TODO: не удалять машинку сразу, так как её может видеть участник пати
                if(event.is_last) { // Только если машинку нужно совсем убирать
                    // стирание линий
                    carMarkerList.delContactLine(event.subject_id, event.object_id);
                    // удаление машинки
                    carMarkerList.del(event.object_id);
                }
            }
            if (event.cls === "ChatMessage" || event.cls === "Chat") {
                // chat_message
                chat.addMessage(-1, '', getOwner(event.author), event.text);
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
            listMapObject.setState(uid, aTrack);
        }
        // После добавления машинки или её апдейта, проверяем сколько у неё хп
        if(listMapObject.objects[uid].hp == 0){
            listMapObject.objects[uid].marker.setIcon(iconsLeaflet.icon_killed_V2);
        }
    }

}


function initUserCar(uid, aType, aHP, aMaxHP, aTrack, amax_speed, aWeapons, radius_visible, role) {
    console.log('initUserCar');
    var fireSectors;
    var speed_to_set = (amax_speed*0.75).toFixed(0); // Сразу будет выставлена такая скорость, чтобы оно норамльно игралось
    if(! user.userCar) {

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

    // Установка своих линий
    user.userCar.debugLines = [];
}



var fuelMaxProbka = 500;
var fuelDecrProbka = 1;
