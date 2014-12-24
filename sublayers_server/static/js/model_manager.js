/*
* Класс для управления моделью.
* Подписывается на события входящих сообщений от вебсокета
* Отсылает исходящие сообщения в поток сообщений
*
* */



// TODO: переименовать в клиент манагер

var ClientManager = ( function(){
    function ClientManager(){
        // подписаться на входящие сообщения типа ws_message
        message_stream.addInEvent({
            key: 'ws_message',
            cbFunc: this.receiveMessage,
            subject: this
        });
    }

    // вспомогательные методы для парсинга
    // Считывает параметры для создания состояние и возвращает его.
    ClientManager.prototype._getState = function(data) {
        return new State(
            data.t0,                                 // Время
            new Point(data.p0.x, data.p0.y),          // Позиция
            data.fi0,                                // Направление
            data.v0,                                 // Скорость - число
            data.a,                                 // Ускорение - число
            data.c ? (new Point(data.c.x, data.c.y)) : null,     // Центр поворота, которого может не быть
            data.turn
        );
    };

    ClientManager.prototype._getOwner = function(data) {
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
    };

    ClientManager.prototype._getWeapons = function(data) {
        var sectors = [];
        data.forEach(function (weapon, index) {
            // TODO: ввести позже речардж сектора, когда будет присылаться
            var sector = new FireSector(weapon.direction, gradToRad(weapon.sector_width), weapon.r, index, 2000);
            sector.damage = weapon.damage;
            this.sectors.push(sector);
        }, {sectors: sectors} );
        return sectors;
    };

    ClientManager.prototype._setClientState = function(state){
        if(state === 'death_car'){
            // Перевести клиент в состояние, пока машинка мертва
            cookieStorage.optionsDraggingMap = true; // значит радиальное меню не будет отображаться!
            myMap.dragging.enable(); // разрешить тягать карту
            return true;
        }
        // Если ни одно из состояний не выбрано, то перевести в нормальное состояние
        cookieStorage.optionsDraggingMap = false; // значит радиальное меню снова будет отображаться и карта будет двигаться за машинкой!
        myMap.dragging.disable(); // запретить двигать карту
    };


    ClientManager.prototype._sendMessage = function(msg){
        //alert('ClientManager  sendMessage');
        // TODO: сейчас данная функция вызывается из функций wsjson.js, позже переделать!
        message_stream.sendMessage({
            type: 'ws_message_send',
            body: msg
        });
    };

    ClientManager.prototype.receiveMessage = function (self, params) {
        console.log('ClientManager.prototype.receiveMessage');
        // TODO: написать правильный обработчик здесь. А пока так
        if (params.message_type == "push") {
            params.events.forEach(function (event) {
                if (typeof(self[event.cls]) === 'function')
                    self[event.cls](event);
                else {
                    console.log('Error: неизвестная API-команда для клиента: ', params.cls);
                    receiveMesFromServ(params);
                }
            });
        }
        else if (params.message_type == "answer")
            if (!params.error)
                rpcCallList.execute(params.rpc_call_id);
            else {
                console.log('Ошибка запроса: ', params.error);
                // Todo: обработка ошибки
            }
        return true;

    };


    // Входящие сообщения

    // Входящий от сервера Init для машинки
    ClientManager.prototype.Init = function(event){
        console.log('ClientManager.prototype.Init');
        var servtime = event.time;
        // todo: Переделать на нормальную максимальную скорость!
        //var max_speed = event.cars[0].max_velocity;
        var max_speed = 28;
        var aMaxHP = event.cars[0].max_hp;
        var radius_visible = event.cars[0].r;
        var aHP = event.cars[0].hp;
        var uid = event.cars[0].uid;
        var role = event.cars[0].role;
        var state = this._getState(event.cars[0].state);
        var fireSectors = this._getWeapons(event.cars[0].weapons);

        // Запустить отчёт времени до рестарта сервера
        showTimeToResetServer(servtime);

        // Инициализация Юзера
        if(event.agent.cls == "User"){
            user.login = event.agent.login;
            user.ID = event.agent.uid;
            if (event.agent.party)
                user.party = new OwnerParty(event.agent.party.id, event.agent.party.name);
        }

        if (!user.userCar) {
            user.userCar = new UserCar(uid,       //ID машинки
                aHP,      //HP машинки
                max_speed,      //Максималка
                state
            );   //Текущая траектория

            // Добавить сектора в userCar
            user.userCar.AddFireSectors(fireSectors);



            // Инициализация маркера машинки
            userCarMarker = new UserCarMarker({
                position: myMap.unproject([state.p0.x, state.p0.y], myMap.getMaxZoom()),
                tailEnable: false,
                _map: myMap,
                radiusView: radius_visible,
                carID: uid,
                sectors: user.userCar.fireSectors,
                countSectorPoints: 20
            });

            // Инициализация контроллеров
            controllers = new Controllers({
                fuelMax: fuelMaxProbka,
                hpMax: aMaxHP,
                fireSectors: user.userCar.fireSectors,
                max_velocity: max_speed,
                set_velocity: (max_speed * 0.75).toFixed(0)
            });

            // Инициализация радиального меню - установка правильных id секторов
            radialMenu.setIDSectorsWithAngle(user.userCar.fireSectors);
        }

        // Присвоение роли
        user.role = role;

        // Установка текста в верху страницы - вывод своего ника и своей пати
        setTitleOnPage();

        // Установка своих линий
        user.userCar.debugLines = [];
    };

    ClientManager.prototype.Update = function(event){
        console.log('ClientManager.prototype.Update');
        var servtime = event.time;
        // Пока что установка времени будет осуществляться здесь! Т.к. При контакте она лагает.
        clock.setDt(servtime / 1000.);
        var aHP = event.object.hp;
        var aState = this._getState(event.object.state);
        var owner = this._getOwner(event.object);

        if (event.object.uid == user.userCar.ID) { // если машинка своя
            // Установить новую траекторию
            // Сохранить старое хп и установить нвоое
            var oldHP = user.userCar.hp;
            user.userCar.hp = aHP;
            if (oldHP > 0) // Устанавливается траектория, только если машинка жива
                user.userCar.state = aState;
            if (user.userCar.hp <= 0) {
                userCarMarker.marker.setIcon(iconsLeaflet.icon_killed_V1);
                this._setClientState('death_car');
                modalWindow.modalDeathShow();
            } else {
                if (oldHP != aHP) // Если хп изменилось, то мигнуть маркером
                    flashMarker(userCarMarker.marker);
            }
        }
        else { // если не своя, то проверить есть ли такая в модели
            // Сохранить старое хп и установить нвоое
            var oldHP = listMapObject.objects[event.object.uid].hp;
            listMapObject.setCarHP(event.object.uid, aHP);
            // Установить новую траекторию
            if (oldHP > 0) // Устанавливается траектория, только если машинка жива
                listMapObject.setState(event.object.uid, aState);
            // После добавления машинки или её апдейта, проверяем сколько у неё хп
            if (listMapObject.objects[event.object.uid].hp <= 0) {
                listMapObject.objects[event.object.uid].marker.setIcon(iconsLeaflet.icon_killed_V2);
            } else {
                if (oldHP != aHP) // Если хп изменилось, то мигнуть маркером
                    flashMarker(listMapObject.objects[event.object.uid].marker);
            }
        }


        // Визуализация Update. При каждом сообщение Contact или See будет создан маркер с соответствующим попапом
        if (cookieStorage.enableMarkerUpdate()) {
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

            debugMapList.push(
                L.circleMarker(myMap.unproject([event.object.state.c.x, event.object.state.c.y], myMap.getMaxZoom()), {color: '#FFFF00'})
                    .setRadius(6)
                    .bindPopup(
                        'Тип сообщения: ' + event.cls + '</br>' +
                        'Server-Time: ' + servtime / 1000. + '</br>' +
                        'uid объекта: ' + event.object.uid + '</br>' +
                        'comment: ' + event.comment + '</br>'
                )
                    .addTo(myMap)
            );
        }

    }




    // Исходящие сообщения

    // setSpeed
    ClientManager.prototype.sendSetSpeed = function(newSpeed) {
        var mes = {
            call: "set_speed",
            rpc_call_id: rpcCallList.getID(),
            params: {
                new_speed: newSpeed / user.userCar.maxSpeed
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };


    // stop
    ClientManager.prototype.sendStopCar = function() {
        var mes = {
            call: "stop",
            rpc_call_id: rpcCallList.getID(),
            params: { }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };


    // turn
    ClientManager.prototype.sendTurn = function(turn) {
        var mes = {
            call: "set_turn",
            rpc_call_id: rpcCallList.getID(),
            params: {
                turn: turn
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };


    return ClientManager;
})();