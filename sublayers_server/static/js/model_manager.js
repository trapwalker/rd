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

    // Вспомогательные методы для парсинга

    ClientManager.prototype._getState = function (data) {
        if (data)
            return new State(
                data.t0,                                          // Время
                new Point(data.p0.x, data.p0.y),                  // Позиция
                data.fi0,                                         // Направление
                data._fi0,                                        // Направление для расчёта спиралей
                data.v0,                                          // Скорость - число
                data.a,                                           // Ускорение - число
                data.c ? (new Point(data.c.x, data.c.y)) : null,  // Центр поворота, которого может не быть
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
                data.dps,
                data.dhp
            );
        return null;
    };

    ClientManager.prototype._getFuelState = function (data) {
        if (data)
            return new FuelState(
                data.t0,
                data.max_fuel,
                data.fuel0,
                data.dfs
            );
        return null;
    };

    ClientManager.prototype._getOwner = function (data) {
        if(data)
            if (data.cls === "User") {
                var party = null;
                if (data.party)
                    party = new OwnerParty(data.party.id, data.party.name);
                var owner = new Owner(data.uid, data.login, party);
                return ownerList.add(owner);
            }
        return null;
    };

    ClientManager.prototype._getWeapons = function (data) {
        var weapons = [];
        data.forEach(function (weapon, index) {
            this.weapons.push(new Weapon({
                cls: weapon.cls,
                dps: weapon.dps ? weapon.dps : 0,
                dmg: weapon.dmg ? weapon.dmg : 0,
                recharge: weapon.time_recharge ? weapon.time_recharge : 0,
                radius: weapon.radius,
                width: weapon.width
            }));
        }, {weapons: weapons});
        return weapons;
    };

    ClientManager.prototype._getSectors = function (data) {
        var sectors = [];
        var self = this;
        data.forEach(function (sector, index) {
            var weapons = self._getWeapons(sector.weapons);
            var fs = new FireSector({
                width: sector.width,
                radius: sector.radius,
                direction: sector.fi,
                side: sector.side
            });
            for(var i = 0; i < weapons.length; i++)
                fs.addWeapon(weapons[i]);
            this.sectors.push({
                sector: fs,
                side: sector.side
            });
        }, {sectors: sectors, self: self});
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

    ClientManager.prototype.Init = function (event) {
        console.log('ClientManager.prototype.Init', event);
        var servtime = event.time;
        var v_forward = event.cars[0].v_forward;
        var v_backward = event.cars[0].v_backward;
        var radius_visible = event.cars[0].r;
        var uid = event.cars[0].uid;
        var role = event.cars[0].role;
        var state = this._getState(event.cars[0].state);
        var hp_state = this._getHPState(event.cars[0].hp_state);
        var fuel_state = this._getFuelState(event.cars[0].fuel_state);
        var fireSectors = this._getSectors(event.cars[0].fire_sectors);

        clock.setDt((new Date().getTime() - servtime) / 1000.);

        // Инициализация Юзера
        if (event.agent.cls == "User") {
            user.login = event.agent.login;
            user.ID = event.agent.uid;
            if (event.agent.party) {
                user.party = new OwnerParty(event.agent.party.id, event.agent.party.name);
                chat._getChatByName('party').partyButtons.create.text('Отряд');
            }
        }

        if (!user.userCar) {
            // создать машинку
            var mcar = new UserCar(
                uid,       //ID машинки
                v_forward,
                v_backward,
                state,
                hp_state,
                fuel_state
            );
            for (var i = 0; i < fireSectors.length; i++)
                mcar.fireSidesMng.addSector(fireSectors[i].sector, fireSectors[i].side)

            user.userCar = mcar;

            // Виджеты:
            new WCarMarker(mcar);    // виджет маркера
            new WMapPosition(mcar);  // виджет позиционирования карты

            // Круиз
            wCruiseControl = new WCruiseControl(mcar, 'cruiseControlGlassDiv');
            new WAltmetrRadial(mcar, 'divForAltmetrRadial');
            new WHPRadial(mcar, 'divForHpAndFuelRadials');
            new WFuelRadial(mcar, 'divForHpAndFuelRadials');
            new WRadiationRadial(mcar, 'divForRadAndWindRadials');
            new WWindRadial(mcar, 'divForRadAndWindRadials');

            // todo: сделать также зависимось от бортов
            wFireController = new WFireController(mcar);  // виджет радар и контроллер стрельбы
            new WViewRadius(mcar, radius_visible); // виджет радиуса видимости
            mapManager.widget_target_point = new WTargetPointMarker(mcar); // виджет пункта назначения
            //mapManager.widget_rumble = new WRumble(mcar); // виджет-тряски


            //mapManager.widget_fire_radial_grid = new WRadialGridScaled(mcar); // масштабирующаяся сетка
            mapManager.widget_fire_radial_grid = new WFireRadialGrid(mcar); // не масштабирующаяся сетка
            mapManager.widget_fire_sectors = new WFireSectorsScaled(mcar); // масштабирующиеся сектора
            //mapManager.widget_fire_sectors = new WFireSectors(mcar); // не масштабирующиеся сектора
        }

        // Установка текста в верху страницы - вывод своего ника и своей пати
        setTitleOnPage();

        // Установка своих линий
        //user.userCar.debugLines = [];
    };

    ClientManager.prototype.Update = function (event) {
        //console.log('ClientManager.prototype.Update', event);
        var motion_state = this._getState(event.object.state);
        var hp_state = this._getHPState(event.object.hp_state);
        var fuel_state = this._getFuelState(event.object.fuel_state);

        var uid = event.object.uid;
        var car = visualManager.getModelObject(uid);

        if (!car) {
            console.error('Update Error: Машины с данным id не существует на клиенте. Ошибка! uid=', uid);
            return;
        }

        // Обновить машинку и, возможно, что-то ещё (смерть или нет и тд)
        car.setState(motion_state);
        car.setHPState(hp_state);
        if (car == user.userCar) car.setFuelState(fuel_state);

        // Если своя машинка
        if (car == user.userCar) {
            // Считать таргет поинт и включить/выключить виджет таргет_поинта
            var tp = event.object.target_point;
            if (mapManager.widget_target_point) {
                if (tp != undefined && tp != null)
                    mapManager.widget_target_point.activate(tp);
                else
                    mapManager.widget_target_point.deactivate();
            }

            // При попадании залповым орудием включить эффект тряски
            if (hp_state.dhp)
                mapManager.widget_rumble.startDischargeRumble();
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

            if (event.object.state.c)
                debugMapList.push(
                    L.circleMarker(myMap.unproject([event.object.state.c.x, event.object.state.c.y], myMap.getMaxZoom()), {color: '#FFFF00'})
                        .setRadius(20)
                        .addTo(myMap)
                );

        }

    };

    ClientManager.prototype.Contact = function (event) {
        //console.log('ClientManager.prototype.Contact', event);

        if (user.userCar == null) {
            console.warn('Контакт ивент до инициализации своей машинки!');
            return;
        }
        if (event.is_first) { // только если первый раз добавляется машинка
            var state = this._getState(event.object.state);
            var hp_state = this._getHPState(event.object.hp_state);
            var fuel_state = null; //this._getFuelState(event.object.fuel_state);
            var uid = event.object.uid;
            var aOwner = this._getOwner(event.object.owner);
            var radius_visible = event.object.r;
            var main_agent_login = event.object.main_agent_login;

            // Проверка: нет ли уже такой машинки.
            var car = visualManager.getModelObject(uid);
            if (car) {
                console.error('Contact Error: Такая машинка уже есть на клиенте! Ошибка!');
                return;
            }
            if (car == user.userCar) {
                console.error('Contact Error: Своя машинка не должна получать Contact !!!!');
                return;
            }

            // Создание новой машинки
            car = new MapCar(uid, state, hp_state, fuel_state);
            car.role = event.object.role;
            car.cls = event.object.cls;
            car.main_agent_login = main_agent_login;

            if (aOwner)
                aOwner.bindCar(car);

            // Создание/инициализация виджетов
            new WCarMarker(car);                 // виджет маркера
            if (wFireController) wFireController.addModelObject(car); // добавить себя в радар
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
        //console.log('ClientManager.prototype.Out', event.is_last, event.subject_id, event.object_id);
        if(event.is_last) { // только если машинку нужно совсем убирать
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
                list_vo[i].delModelObject(car);

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
        timeManager.timerStop();
    };

    ClientManager.prototype.Chat = function (event){
        //console.log('ClientManager.prototype.Chat', event);
        //chat.addMessage(-1, '', getOwner(event.author), event.text);
        //chat.addMessage(-1, '', event.author, event.text);
    };

    ClientManager.prototype.Message = function (event){
        console.log('ClientManager.prototype.Message :', event.comment);
    };

    // todo: эффекты вынести потом в отдельный модуль
    ClientManager.prototype.Bang = function (event){
        //console.log('ClientManager.prototype.Bang ');
        new Bang(new Point(event.position.x, event.position.y),
                 event.bang_power, event.duration, event.end_duration).start();
    };

    ClientManager.prototype.ChangeAltitude = function(event){
        // console.log('ClientManager.prototype.ChangeAltitude ', event);
        if (event.obj_id == user.userCar.ID)
            user.userCar.altitude = event.altitude;
        else
            console.error('Error! Пришла высота на неизветную машинку!')
    };

    ClientManager.prototype.FireDischarge = function (event) {
        //console.log('ClientManager.prototype.FireDischarge ', event);

        //console.log('etime = ', event.time, '    ctime = ', clock.getClientMS());

        // установка last_shoot
        var etime = event.time / 1000.;
        // если серверное время больше чистого клиентского и больше подправленного клиентского, то ошибка
        if ((event.time > clock.getClientTime()) && (etime > clock.getCurrentTime())) {
            console.error('Серверное время больше клиентского при выстреле.');
            console.error('server event time = ', etime);
            console.error('client pure  time = ', clock.getClientTime() / 1000.);
            console.error('clnt with dt time = ', clock.getCurrentTime());
        }
        // todo: отфильтровать, так как могло прийти не для своей машинки
        user.userCar.setShootTime(event.side, etime);
/*
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
*/
    };

    ClientManager.prototype.FireAutoEffect = function (event) {
        //console.log('ClientManager.prototype.FireAutoEffect', event)
        if (event.action)
            fireEffectManager.addController({
                subj: event.subj,
                obj: event.obj,
                side: event.side
            });
        else
            fireEffectManager.delController({
                subj: event.subj,
                obj: event.obj,
                side: event.side
            });
    };

    ClientManager.prototype.FireDischargeEffect = function (event) {
        //console.log('ClientManager.prototype.FireDischargeEffect', event);
        fireEffectManager.fireDischargeEffect({
            pos_subj: new Point(event.pos_subj.x, event.pos_subj.y),
            pos_obj: new Point(event.pos_obj.x, event.pos_obj.y),
            is_fake: event.is_fake
        });
    };

    ClientManager.prototype.ZoneEffectMessage = function (event) {
        //console.log('ClientManager.prototype.ZoneEffectMessage', event);
        wCruiseControl.setZoneState(event.zone_effect.cls, event.in_zone, event.subj_cc);
    };

    ClientManager.prototype.AgentPartyChangeMessage = function (event) {
        //console.log('ClientManager.prototype.AgentPartyChangeMessage', event);
        if(event.subj.uid == user.ID) return;
        var owner = this._getOwner(event.subj);
        for (var i = 0; i < owner.cars.length; i++) {
            var widget_marker = visualManager.getVobjByType(owner.cars[i], WCarMarker);
            widget_marker.updateLabel();
            widget_marker.updateIcon();
        }
        if (windowTemplateManager.isOpen('party'))
            windowTemplateManager.openUniqueWindow('party', '/party', {page_type: 'party'});
    };

    ClientManager.prototype.PartyIncludeMessageForIncluded = function (event) {
        //console.log('ClientManager.prototype.PartyIncludeMessageForIncluded', event);
        // изменить настройки своей пати для своего клиента
        if (! event.party) {console.error('Невозможно считать Party. Ошибка.'); return;}
        user.party = new OwnerParty(event.party.id, event.party.name);
        var widget_marker = visualManager.getVobjByType(user.userCar, WCarMarker);
        widget_marker.updateLabel();
        chat._getChatByName('party').partyButtons.create.text('Отряд');
        // изменить иконки машинок для всех мемберов пати (в евенте для этого есть список мемберов)

        if (windowTemplateManager.isOpen('create_party'))
            windowTemplateManager.closeUniqueWindow('create_party');
        if (windowTemplateManager.isOpen('my_invites'))
            windowTemplateManager.closeUniqueWindow('my_invites');
        if (windowTemplateManager.isOpen('party_info'))
            windowTemplateManager.closeUniqueWindow('party_info');

        windowTemplateManager.openUniqueWindow('party', '/party', {page_type: 'party'});

    };

    ClientManager.prototype.PartyExcludeMessageForExcluded = function (event) {
        //console.log('ClientManager.prototype.PartyExcludeMessageForExcluded', event);
        user.party = null;
        var widget_marker = visualManager.getVobjByType(user.userCar, WCarMarker);
        widget_marker.updateLabel();
        chat._getChatByName('party').partyButtons.create.text('Создать');
        // изменить иконки машинок для всех бывших мемберов пати
        if (windowTemplateManager.isOpen('party'))
            windowTemplateManager.closeUniqueWindow('party');
        if (windowTemplateManager.isOpen('my_invites'))
            windowTemplateManager.openUniqueWindow('my_invites', '/party', {page_type: 'my_invites'});
    };

    ClientManager.prototype.PartyKickMessageForKicked = function (event) {
        //console.log('ClientManager.prototype.PartyKickMessageForKicked', event);
        user.party = null;
        var widget_marker = visualManager.getVobjByType(user.userCar, WCarMarker);
        widget_marker.updateLabel();
        chat._getChatByName('party').partyButtons.create.text('Создать');
        // изменить иконки машинок для всех бывших мемберов пати
        if (windowTemplateManager.isOpen('party'))
            windowTemplateManager.closeUniqueWindow('party');
        if (windowTemplateManager.isOpen('my_invites'))
            windowTemplateManager.openUniqueWindow('my_invites', '/party', {page_type: 'my_invites'});
    };

    ClientManager.prototype.PartyInviteMessage = function (event) {
        //console.log('ClientManager.prototype.PartyInviteMessage', event);
        if (windowTemplateManager.isOpen('my_invites'))
            windowTemplateManager.openUniqueWindow('my_invites', '/party', {page_type: 'my_invites'});
    };

    ClientManager.prototype.PartyInviteDeleteMessage = function (event) {
        //console.log('ClientManager.prototype.PartyInviteDeleteMessage', event);
        if (windowTemplateManager.isOpen('my_invites'))
            windowTemplateManager.openUniqueWindow('my_invites', '/party', {page_type: 'my_invites'});
    };

    ClientManager.prototype.PartyErrorMessage = function (event) {
        console.log('ClientManager.prototype.PartyErrorMessage', event);
    };

    ClientManager.prototype.OpenTemplateWindowMessage = function (event) {
        console.log('ClientManager.prototype.OpenTemplateWindowMessage', event);
        if (event.unique)
            windowTemplateManager.openUniqueWindow(event.win_name, event.url, {page_type: event.page_type});
        else
            console.log('Попытка открыть не уникальное окно по адресу: ', event.url);
    };

    ClientManager.prototype.CloseTemplateWindowMessage = function (event) {
        console.log('ClientManager.prototype.CloseTemplateWindowMessage', event);
        if (event.unique)
            windowTemplateManager.closeUniqueWindow(event.win_name);
        else
            console.log('Попытка открыть не уникальное');
    };

    // Исходящие сообщения

    ClientManager.prototype.sendSetSpeed = function (newSpeed) {
        //console.log('sendSetSpeed', newSpeed, user.userCar.maxSpeed);
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
        //console.log('ClientManager.prototype.sendGoto');
        //var currentSpeed = wCruiseControl.getSpeedHandleValue();
        var currentSpeed = user.userCar.getCurrentSpeed(clock.getCurrentTime());
        if (currentSpeed == 0) {
            return;
            //currentSpeed = user.userCar.maxSpeed * 0.2;
            //wCruiseControl.setSpeedHandleValue(0.2);
        }
        this.sendMotion(target, currentSpeed, null);
    };

    ClientManager.prototype.sendMotion = function (target, newSpeed, turn) {
        //console.log('ClientManager.prototype.sendMotion', target, newSpeed, turn);
        var new_speed = newSpeed;
        if (new_speed) {
            new_speed = new_speed / ( new_speed >= 0 ? user.userCar.v_forward : -user.userCar.v_backward);
            if (Math.abs(new_speed) > 1.0) new_speed = new_speed / Math.abs(new_speed);
        }

        var new_turn = turn;
        if (new_turn) {
            new_turn = new_turn > 1 ? 1 : new_turn;
            new_turn = new_turn < -1 ? -1 : new_turn;
            new_turn = Math.abs(new_turn) < 1 ? 0: new_turn;
        }
        var new_x = target ? target.x : null;
        var new_y = target ? target.y : null;
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
        if(! wFireController.visible) return;
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
        var time = clock.getCurrentTime();
        if ((time - last_send_time) < 5) return;
        last_send_time = time;
        var mes = {
            call: "send_rocket",
            rpc_call_id: rpcCallList.getID(),
            params: { }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendSlowMine = function () {
        var time = clock.getCurrentTime();
        if ((time - last_send_time) < 5) return;
        last_send_time = time;
        var mes = {
            call: "send_slow_mine",
            rpc_call_id: rpcCallList.getID(),
            params: { }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendStationaryTurret = function () {
        var time = clock.getCurrentTime();
        if ((time - last_send_time) < 5) return;
        last_send_time = time;
        var mes = {
            call: "send_stationary_turret",
            rpc_call_id: rpcCallList.getID(),
            params: { }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendScoutDroid = function (target) {
        var time = clock.getCurrentTime();
        if ((time - last_send_time) < 5) return;
        last_send_time = time;
        var mes = {
            call: "send_scout_droid",
            rpc_call_id: rpcCallList.getID(),
            params: {
                x: target.x,
                y: target.y
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendOpenWindowCreateParty = function () {
        var mes = {
            call: "open_window_create_party",
            rpc_call_id: rpcCallList.getID(),
            params: { }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendCreatePartyFromTemplate = function (name, description) {
        var mes = {
            call: "send_create_party_from_template",
            rpc_call_id: rpcCallList.getID(),
            params: {
                name: name,
                description: description
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendJoinPartyFromTemplate = function (name) {
        var mes = {
            call: "send_join_party_from_template",
            rpc_call_id: rpcCallList.getID(),
            params: {
                name: name
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendInvitePartyFromTemplate = function (name) {
        var mes = {
            call: "send_invite",
            rpc_call_id: rpcCallList.getID(),
            params: {
                username: name
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendKickPartyFromTemplate = function (name) {
        var mes = {
            call: "send_kick",
            rpc_call_id: rpcCallList.getID(),
            params: {
                username: name
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendSetPartyCategory = function (name, category) {
        var mes = {
            call: "send_set_category",
            rpc_call_id: rpcCallList.getID(),
            params: {
                username: name,
                category: category
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendPartyDeleteInvite = function (invite_id) {
        var mes = {
            call: "delete_invite",
            rpc_call_id: rpcCallList.getID(),
            params: {
                invite_id: invite_id
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    return ClientManager;
})();

var last_send_time = 0;