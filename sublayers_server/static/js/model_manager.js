/*
 * Класс для управления моделью.
 * Подписывается на события входящих сообщений от вебсокета
 * Отсылает исходящие сообщения в поток сообщений
 * */

var ClientManager = (function () {
    function ClientManager() {
        // подписаться на входящие сообщения типа ws_message
        message_stream.addInEvent({
            key: 'ws_message',
            cbFunc: this.receiveMessage,
            subject: this
        });
    }

    // вспомогательные методы для парсинга
    // Считывает параметры для создания состояние и возвращает его.
    ClientManager.prototype._getState = function (data) {
        if (data)
            return new State(
                data.t0,                                 // Время
                new Point(data.p0.x, data.p0.y),          // Позиция
                data.fi0,                                // Направление
                data.v0,                                 // Скорость - число
                data.a,                                 // Ускорение - число
                data.c ? (new Point(data.c.x, data.c.y)) : null,     // Центр поворота, которого может не быть
                data.turn,
                data.ac_max,
                data.r_min,
                data._sp_m,
                data._sp_fi0,
                data._rv_fi
            );
        return null;
    };

    ClientManager.prototype._getOwner = function (data) {
        if(data)
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
                    if (owner.party.id !== party.id) owner.party = party;
                    //
                    return owner;
                }
            }
        return null;
    };

    ClientManager.prototype._getWeapons = function (data) {
        var sectors = [];
        data.forEach(function (weapon, index) {
            // TODO: ввести позже речардж сектора, когда будет присылаться
            var sector = new FireSector(weapon.direction, gradToRad(weapon.sector_width), weapon.r, index, 2000);
            sector.damage = weapon.damage;
            this.sectors.push(sector);
        }, {sectors: sectors});
        return sectors;
    };

    ClientManager.prototype._setClientState = function (state) {
        if (state === 'death_car') {
            // Перевести клиент в состояние, пока машинка мертва
            cookieStorage.optionsDraggingMap = true; // значит радиальное меню не будет отображаться!
            myMap.dragging.enable(); // разрешить тягать карту
            return true;
        }
        // Если ни одно из состояний не выбрано, то перевести в нормальное состояние
        cookieStorage.optionsDraggingMap = false; // значит радиальное меню снова будет отображаться и карта будет двигаться за машинкой!
        myMap.dragging.disable(); // запретить двигать карту
    };


    ClientManager.prototype._sendMessage = function (msg) {
        //console.log('ClientManager.prototype._sendMessage');
        message_stream.sendMessage({
            type: 'ws_message_send',
            body: msg
        });
    };

    ClientManager.prototype.receiveMessage = function (self, params) {
        //console.log('ClientManager.prototype.receiveMessage');
        // TODO: написать правильный обработчик здесь. А пока так
        if (params.message_type == "push") {
            params.events.forEach(function (event) {
                if (typeof(self[event.cls]) === 'function')
                    self[event.cls](event);
                else {
                    console.log('Error: неизвестная API-команда для клиента: ', params.cls);
                    //receiveMesFromServ(params);
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
    ClientManager.prototype.Init = function (event) {
        console.log('ClientManager.prototype.Init');
        var servtime = event.time;
        var max_speed = event.cars[0].max_velocity;
        var aMaxHP = event.cars[0].max_hp;
        var radius_visible = event.cars[0].r;
        var aHP = event.cars[0].hp;
        var uid = event.cars[0].uid;
        var role = event.cars[0].role;
        var state = this._getState(event.cars[0].state);
        var fireSectors = this._getWeapons(event.cars[0].weapons);

        // Инициализация Юзера
        if (event.agent.cls == "User") {
            user.login = event.agent.login;
            user.ID = event.agent.uid;
            if (event.agent.party)
                user.party = new OwnerParty(event.agent.party.id, event.agent.party.name);
        }

        if (!user.userCar) {
            // создать машинку
            var mcar = new UserCar(
                uid,       //ID машинки
                aHP,       //HP машинки
                max_speed, //Максималка
                state
            );

            // Виджеты:
            new WCarMarker(mcar);    // виджет маркера
            new WMapPosition(mcar);  // виджет позиционирования карты
            new WSpeedSlider(mcar);  // виджет круиз контроля

            user.userCar = mcar;

            // Добавить сектора в userCar
            user.userCar.AddFireSectors(fireSectors);

            // Инициализация маркера машинки
            /*
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
            //radialMenu.setIDSectorsWithAngle(user.userCar.fireSectors);
             */
        }

        // Присвоение роли
        user.role = role;

        // Установка текста в верху страницы - вывод своего ника и своей пати
        setTitleOnPage();

        // Установка своих линий
        //user.userCar.debugLines = [];
    };

    ClientManager.prototype.Update = function (event) {
        //console.log('ClientManager.prototype.Update');
        var servtime = event.time;
        // Пока что установка времени будет осуществляться здесь! Т.к. При контакте она лагает.
        clock.setDt(servtime / 1000.);
        var aHP = event.object.hp;
        var aState = this._getState(event.object.state);
        var owner = this._getOwner(event.object);

        var uid = event.object.uid;
        var car = visualManager.getModelObject(uid);

        if (! car) {
            console.error('Update Error: Машины с данным id не существует на клиенте. Ошибка!');
            return;
        }

        // обновить машинку и, возможно, что-то ещё (смерть или нет и тд)
        car.setState(aState);


        /*
        if (event.object.uid == user.userCar.ID) { // если машинка своя
            // Установить новую траекторию
            // Сохранить старое хп и установить нвоое
            var oldHP = user.userCar.hp;
            user.userCar.hp = aHP;
            if (oldHP > 0) // Устанавливается траектория, только если машинка жива
                //user.userCar.state = aState;
                user.userCar.setState(aState);
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
        */

        // Визуализация Update. При каждом сообщение Contact или See будет создан маркер с соответствующим попапом
        if (cookieStorage.enableMarkerUpdate()) {
            debugMapList.push(
                L.circleMarker(myMap.unproject([event.object.state.p0.x, event.object.state.p0.y], myMap.getMaxZoom()), {color: '#FF0000'})
                    .setRadius(3)
                    .bindPopup(
                        'Тип сообщения: ' + event.cls + '</br>' +
                        'Server-Time: ' + servtime / 1000. + '</br>' +
                        'uid объекта: ' + event.object.uid + '</br>' +
                        'comment: ' + event.comment + '</br>'
                )
                    .addTo(myMap)
            );

            if (event.object.state.c)
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

    };

    ClientManager.prototype.Contact = function (event) {
        console.log('ClientManager.prototype.Contact');
        var servtime = event.time;


        if (event.is_first) { // Только если первый раз добавляется машинка
            var aState = this._getState(event.object.state);
            var aHP = event.object.hp;
            var uid = event.object.uid;
            var aOwner = this._getOwner(event.object.owner);

            var car = visualManager.getModelObject(uid);

            if (car) {
                console.error('Contact Error: Такая машинка уже есть на клиенте! Ошибка!');
                return;
            }


            if (car == user.userCar) {
                console.error('Contact Error: Своя машинка не должна получать Contact !!!!');
                return;
            }

            // создание новой машинки

            car = new MapCar(uid, aHP, aState);

            car.role = event.object.role;
            car.cls = event.object.cls;

            // создание виджетов новой машинки
            new WCarMarker(car);    // виджет маркера


            /*
            else { // если не своя, то проверить есть ли такая в модели
                if (!listMapObject.exist(uid)) {  // добавить машинку, если её нет
                    var car = new MapCar(uid, aHP, aState);
                    // установить роль
                    car.role = event.object.role;
                    car.cls = event.object.cls;
                    carMarkerList.add(car, aOwner);
                    //if(aHP == 0)// поставить стоп-трек
                    //    car.track.speedV = new Point(0, 0);

                } else { // Если такая машинка уже есть, то установить все переменные
                    //listMapObject.setCarHP(uid, aHP);
                    //listMapObject.setState(uid, aState);
                }
                // После добавления машинки или её апдейта, проверяем сколько у неё хп
                if (listMapObject.objects[uid].hp == 0) {
                    listMapObject.objects[uid].marker.setIcon(iconsLeaflet.icon_killed_V2);
                }
            }

            */
        }



        // Визуализация контакта. При каждом сообщение Contact или See будет создан маркер с соответствующим попапом
        if (cookieStorage.enableMarkerContact())
            debugMapList.push(
                L.circleMarker(myMap.unproject([event.object.state.p0.x, event.object.state.p0.y], myMap.getMaxZoom()), {color: '#FFBA12'})
                    .setRadius(8)
                    .bindPopup(
                        'Тип сообщения: ' + event.cls + '</br>' +
                        'Server-Time: ' + servtime / 1000. + '</br>' +
                        'uid объекта: ' + event.object.uid + '</br>' +
                        'subject_id: ' + event.subject_id + '</br>'
                )
                    .addTo(myMap)
            );

        // отрисовка линии от объекта к субъекту event.subject_id, event.object.uid

        if(cookieStorage.enableShowDebugLine()) {
            var scar = visualManager.getModelObject(event.subject_id);
            var ocar = visualManager.getModelObject(event.object.uid);
            if (!scar || !ocar) {
                console.error('Contact Error: невозможно отобразить Contact-Line, так как на клиенте отсутствует одна из машин: ', scar, ocar);
                return;
            }
            new WRedContactLine(scar, ocar);
        }
        
    };

    ClientManager.prototype.See = function (event) {
        console.log('ClientManager.prototype.See', event);
        this.Contact(event);
    };

    ClientManager.prototype.Out = function (event) {
        console.log('ClientManager.prototype.Out');
        if(event.is_last) { // Только если машинку нужно совсем убирать
            // очистить все виджеты машинки
            var uid = event.object_id;
            var car = visualManager.getModelObject(uid);
            if (! car) {
                console.error('Out Error: Машины с данным id не существует на клиенте. Ошибка!');
                return;
            }
            var list_vo = visualManager.getVobjsByMobj(car);
            for(var i = 0; i< list_vo.length; i++)
                list_vo[i].delFromVisualManager();

            // убрать саму машинку из визуалменеджера
            visualManager.delModelObject(car);




            // стирание линий
            //carMarkerList.delContactLine(event.subject_id, event.object_id);
            // удаление машинки
            //carMarkerList.del(event.object_id);
        }
    };

    ClientManager.prototype.Chat = function (event){
        console.log('ClientManager.prototype.Chat');
        //chat.addMessage(-1, '', getOwner(event.author), event.text);
    };

    ClientManager.prototype.Bang = function (event){
        console.log('ClientManager.prototype.Bang ');
        //chat.addMessage(-1, '', getOwner(event.author), event.text);
        new Bang(new Point(event.position.x, event.position.y), event.bang_power, event.duration, event.end_duration)
            .start();
        // todo разобраться, почему оно не всегда отрисовывается
    };


    // Исходящие сообщения

    ClientManager.prototype.sendSetSpeed = function (newSpeed) {
        //console.log('sendSetSpeed', newSpeed, user.userCar.maxSpeed);
        user.userCar.setLastSpeed(newSpeed);
        this.sendMotion(null, newSpeed, null)
    };

    ClientManager.prototype.sendStopCar = function () {
        //console.log('sendStopCar');
        this.sendMotion(null, 0.0, null)
    };

    ClientManager.prototype.sendTurn = function (turn) {
        //console.log('sendTurn', turn);
        this.sendMotion(null, null, turn)
    };

    ClientManager.prototype.sendGoto = function (target, newSpeed) {
        //console.log('sendGoto', user.userCar.getLastSpeed());
        this.sendMotion(target, user.userCar.getLastSpeed(), null);
    };

    ClientManager.prototype.sendMotion = function (target, newSpeed, turn) {
        //console.log('ClientManager.prototype.sendMotion', target, newSpeed, turn);
        new_speed = newSpeed;
        if (new_speed) {
            new_speed = new_speed / user.userCar.maxSpeed;
            new_speed = new_speed >= 0 ? new_speed : 0;
            new_speed = new_speed <= 1 ? new_speed : 1;
        }
        new_turn = turn;
        if (new_turn) {
            new_turn = new_turn > 1 ? 1 : new_turn;
            new_turn = new_turn < -1 ? -1 : new_turn;
            new_turn = Math.abs(new_turn) < 1 ? 0: new_turn;
        }
        new_x = target ? target.x : null;
        new_y = target ? target.y : null;
        var mes = {
            call: "set_motion",
            rpc_call_id: rpcCallList.getID(),
            params: {
                x: new_x,
                y: new_y,
                cc: new_speed,
                turn: new_turn
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };





    ClientManager.prototype.sendRocket = function () {
        var mes = {
            call: "send_rocket",
            rpc_call_id: rpcCallList.getID(),
            params: { }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };


    return ClientManager;
})();