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
            cbFunc: 'receiveMessage',
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

    ClientManager.prototype._getHPState = function (data) {
        if (data)
            return new HPState(
                data.t0,
                data.max_hp,
                data.hp0,
                data.dps
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

    ClientManager.prototype._getSectors = function (data) {
        var sectors = [];
        data.forEach(function (sector, index) {
            this.sectors.push({
                fi: sector.fi,
                radius: sector.radius,
                side: sector.side,
                width: sector.width,
                is_auto: sector.weapons[0].cls == "WeaponAuto"
            });
        }, {sectors: sectors});
        return sectors;
    };

    ClientManager.prototype._setClientState = function (state) {
        if (state === 'death_car') {
            // Перевести клиент в состояние, пока машинка мертва
            //cookieStorage.optionsDraggingMap = true; // значит радиальное меню не будет отображаться!
            //map.dragging.enable(); // разрешить тягать карту
            modalWindow.modalDeathShow();
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

    ClientManager.prototype.receiveMessage = function (params) {
        //console.log('ClientManager.prototype.receiveMessage', params);

        if (params.message_type == "push") {
            if(params.events){
                var e = params.events[0];
                if (typeof(this[e.cls]) === 'function')
                    this[e.cls](e);
                else
                    console.error('Error: неизвестная API-команда для клиента: ', e.cls);
            }

            /*
            var self=this;
            params.events.forEach(function (event) {
                if (typeof(self[event.cls]) === 'function')
                        self[event.cls](event);
                else
                    console.error('Error: неизвестная API-команда для клиента: ', event.cls);
            });
            */

        }
        else if (params.message_type == "answer")
            if (!params.error)
                rpcCallList.execute(params.rpc_call_id);
            else {
                console.error('Ошибка запроса: ', params.error);
                // Todo: обработка ошибки
            }
        return true;

    };


    // Входящие сообщения

    // Входящий от сервера Init для машинки
    ClientManager.prototype.Init = function (event) {
        //console.log('ClientManager.prototype.Init');
        var servtime = event.time;
        var max_speed = event.cars[0].max_velocity;
        var radius_visible = event.cars[0].r;
        var uid = event.cars[0].uid;
        var role = event.cars[0].role;
        var state = this._getState(event.cars[0].state);
        var hp_state = this._getHPState(event.cars[0].hp_state);
        var fireSectors = this._getSectors(event.cars[0].fire_sectors);

        clock.setDt((new Date().getTime() - servtime) / 1000.);

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
                max_speed, //Максималка
                state,
                hp_state
            );

            user.userCar = mcar;

            // Присвоение роли
            user.role = role;

            // Виджеты:
            new WCarMarker(mcar);    // виджет маркера
            new WMapPosition(mcar);  // виджет позиционирования карты
            new WSpeedSlider(mcar);  // виджет круиз контроля
            new WHPSlider(mcar);     // виджет HP
            // todo: сделать также зависимось от бортов
            new WFireSectors(mcar, fireSectors);  // виджет секторов
            mapManager.widget_target_point = new WTargetPointMarker(mcar); // виджет пункта назначения
            new WFlashlightController(mcar); // виджет-контроллер вспышек
            new WRumble(mcar); // виджет-тряски




            // Инициализация радиального меню - установка правильных id секторов
            //radialMenu.setIDSectorsWithAngle(user.userCar.fireSectors);

        }


        // Установка текста в верху страницы - вывод своего ника и своей пати
        setTitleOnPage();

        // Установка своих линий
        //user.userCar.debugLines = [];
    };

    ClientManager.prototype.Update = function (event) {
        //console.log('ClientManager.prototype.Update');
        var motion_state = this._getState(event.object.state);
        var hp_state = this._getHPState(event.object.hp_state);

        var uid = event.object.uid;
        var car = visualManager.getModelObject(uid);

        if (!car) {
            console.error('Update Error: Машины с данным id не существует на клиенте. Ошибка! uid=', uid);
            return;
        }

        // обновить машинку и, возможно, что-то ещё (смерть или нет и тд)

        car.setState(motion_state);
        car.setHPState(hp_state);

        // если своя машинка, то считать таргет поинт и активировать виджет таргет_поинта
        if (car == user.userCar){
            var tp = event.object.target_point;
            if(tp != undefined && tp != null)
                mapManager.widget_target_point.activate(tp);
            else
                mapManager.widget_target_point.deactivate();

        }
        // Визуализация Update. При каждом сообщение Contact или See будет создан маркер с соответствующим попапом

        if (cookieStorage.enableMarkerUpdate()) {
            debugMapList.push(
                L.circleMarker(myMap.unproject([event.object.state.p0.x, event.object.state.p0.y], myMap.getMaxZoom()), {color: '#FF0000'})
                    .setRadius(3)
                    .bindPopup(
                        'Тип сообщения: ' + event.cls + '</br>' +
                        'uid объекта: ' + event.object.uid + '</br>' +
                        'comment: ' + event.comment + '</br>'
                )
                    .addTo(myMap)
            );
            /*
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
             */
        }

    };

    ClientManager.prototype.Contact = function (event) {
        //console.log('ClientManager.prototype.Contact');
        if (event.is_first) { // Только если первый раз добавляется машинка
            var state = this._getState(event.object.state);
            var hp_state = this._getHPState(event.object.hp_state);
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

            car = new MapCar(uid, state, hp_state);

            car.role = event.object.role;
            car.cls = event.object.cls;

            // todo: обсудить работу с овнерами
            if (aOwner)
                aOwner.bindCar(car);

            // создание виджетов новой машинки
            new WCarMarker(car);    // виджет маркера
            new WFlashlightController(car); // виджет-контроллер вспышек


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
        //console.log('ClientManager.prototype.See');
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
            if (car.owner)
                car.owner.unbindCar(car);

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

    ClientManager.prototype.Die = function (event) {
        console.log('ClientManager.prototype.Die');
        this._setClientState('death_car');
    };

    ClientManager.prototype.Chat = function (event){
        console.log('ClientManager.prototype.Chat');
        //chat.addMessage(-1, '', getOwner(event.author), event.text);
    };


    // todo: эффекты вынести потом в отдельный модуль
    ClientManager.prototype.Bang = function (event){
        console.log('ClientManager.prototype.Bang ');
        //chat.addMessage(-1, '', getOwner(event.author), event.text);
        new Bang(new Point(event.position.x, event.position.y), event.bang_power, event.duration, event.end_duration)
            .start();
        // todo разобраться, почему оно не всегда отрисовывается
    };

    ClientManager.prototype.FireDischarge = function (event) {
        console.log('ClientManager.prototype.FireDischarge ');
        var dir_side = null;
        switch (event.side) {
            case 'front':
                dir_side = 0;
                break;
            case 'left':
                dir_side = Math.PI / 2.;
                break;
            case 'right':
                dir_side = -Math.PI / 2.;
                break;
            case 'back':
                dir_side = Math.PI;
                break;
            default:
                console.error('Невозможно отрисовать эффект. Неизвестный борт!', event.side);
                return;
        }
        if (dir_side != null)
            new EDischargeFire(user.userCar.getCurrentCoord(clock.getCurrentTime()),
                    user.userCar.getCurrentDirection(clock.getCurrentTime()) + dir_side).start();
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

    ClientManager.prototype.sendGoto = function (target) {
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

    ClientManager.prototype.sendFireDischarge = function (side) {
        //console.log('ClientManager.prototype.sendFireDischarge');
        var mes = {
            call: "fire_discharge",
            rpc_call_id: rpcCallList.getID(),
            params: {
                side: side
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendFireAutoEnable = function (side, enable) {
        //console.log('ClientManager.prototype.sendFireDischarge');
        var mes = {
            call: "fire_auto_enable",
            rpc_call_id: rpcCallList.getID(),
            params: {
                side: side,
                enable: enable
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