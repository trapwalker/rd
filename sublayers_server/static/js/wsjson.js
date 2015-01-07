
// функции формирования исходящих сообщений

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
            }
            if (event.cls === "Update") {
                // Update
            }
            if (event.cls === "InitMessage" || event.cls === "Init") {
                alert('Init');
                }
            if (event.cls === "Out") {


            }
            if (event.cls === "ChatMessage" || event.cls === "Chat") {
                // chat_message
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
