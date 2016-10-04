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

    ClientManager.prototype._getMObj = function (uid) {
        //console.log("ClientManager.prototype._getMObj");
        var obj = visualManager.getModelObject(uid);
        //if (obj)
        //    console.warn('Contact: Такой объект уже есть на клиенте!');
        return obj;
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
            if (data.cls === "User" || data.cls === "QuickUser") {
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

    ClientManager.prototype._sendMessage = function (msg) {
        //console.log('ClientManager.prototype._sendMessage', msg);
        // добавление координат центра карты в сообщение
        var center_map_coords;
        center_map_coords = mapManager.project(map.getCenter(), mapManager.getMaxZoom());
        msg.map_coords_center = center_map_coords;
        msg.map_coords_zoom = map.getZoom();

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
                //else
                //    console.warn('Warning: неизвестная API-команда для ClientManager: ', e.cls);
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

    ClientManager.prototype._contactBot = function (event) {
        //console.log('ClientManager.prototype._contactBot');
        if (event.is_first) { // только если первый раз добавляется машинка
            var state = this._getState(event.object.state);
            var hp_state = this._getHPState(event.object.hp_state);
            var fuel_state = null; //this._getFuelState(event.object.fuel_state);
            var uid = event.object.uid;
            var aOwner = this._getOwner(event.object.owner);
            var p_observing_range = event.object.p_observing_range;
            var aObsRangeRateMin = event.object.p_obs_range_rate_min;
            var aObsRangeRateMax = event.object.p_obs_range_rate_max;
            var main_agent_login = event.object.main_agent_login;
            var v_forward = event.object.v_forward;

            // Проверка: нет ли уже такой машинки.
            var car = this._getMObj(uid);
            if (car) return;
            if (car == user.userCar) {
                console.error('Contact Error: Своя машинка не должна получать Contact !!!!');
                return;
            }

            // Создание новой машинки
            car = new MapCar(uid, state, hp_state, fuel_state, v_forward, p_observing_range, aObsRangeRateMin, aObsRangeRateMax);
            car.role = event.object.role;
            car.cls = event.object.cls;
            car.sub_class_car = event.object.sub_class_car;
            car.main_agent_login = main_agent_login;

            if (aOwner)
                aOwner.bindCar(car);

            // Создание/инициализация виджетов
            //new WCarMarker(car);                 // виджет маркера
            new WCanvasCarMarker(car);
            if (wFireController) wFireController.addModelObject(car); // добавить себя в радар
            if (contextPanel) contextPanel.addModelObject(car); // добавить себя в контекстную панель
        }
    };

    ClientManager.prototype._contactStaticObject = function (event) {
        //console.log('ClientManager.prototype._contactStaticObject', event);
        if (event.is_first) {
            var uid = event.object.uid;
            var p_observing_range = event.object.p_observing_range;
            var obj_marker;

            // Проверка: нет ли уже такого объекта.
            var obj = this._getMObj(uid);
            if (obj) {
                // todo: оптимизировать это: либо удалять объекты при раздеплое машинки, либо вынести этот if вниз
                if (contextPanel) contextPanel.addModelObject(obj); // добавить себя в контекстную панель
                return;
            };

            // Установка поворота маркера
            var direction = null;
            switch (event.object.cls) {
                case 'GasStation':
                case 'Town':
                    direction = - 2 * Math.PI;
                    break;
                case 'RadioPoint':
                    direction = 0.5 * Math.PI;
                    break;
                case 'POICorpse':
                    direction = event.object.car_direction + Math.PI / 2.;
                    break;
            }

            obj = new StaticObject(uid, new Point(event.object.position.x, event.object.position.y), direction);
            obj.cls = event.object.cls;
            obj.example = event.object.example;
            obj.p_observing_range = p_observing_range;
            if (event.object.hasOwnProperty('sub_class_car')) {
                obj.sub_class_car = event.object.sub_class_car;
            }

            // Установка надписи над статическим объектом
            if (obj.cls == 'Town') {
                obj.title = event.object.example.title;
            }
            if (obj.cls == 'GasStation') {
                obj.title = 'GasStation';
            }
            if (obj.cls == 'RadioPoint')
                obj_marker.updateLabel('Radio Point');
            if (obj.cls == 'POIStash')
                obj_marker.updateLabel('loot');

            // Создание/инициализация виджетов
            if (obj.cls == 'Town' || obj.cls == 'GasStation') {
                obj_marker = new WCanvasStaticObjectMarker(obj); // виджет маркера
                //obj_marker = new WStaticObjectMarker(obj);
            }
            else
                obj_marker = new WCarMarker(obj); // виджет маркера

            if (wFireController) wFireController.addModelObject(obj); // добавить себя в радар
            if (contextPanel) contextPanel.addModelObject(obj); // добавить себя в контекстную панель
        }
    };

    ClientManager.prototype._getItemState = function (data) {
        return new InventoryItemState(
            data.t0,
            data.max_val,
            data.val0,
            data.dvs
        );
    };

    ClientManager.prototype._getItem = function (data) {
        return new InventoryItem(
            this._getItemState(data.item),
            data.position,
            data.item.balance_cls,
            data.item.example
        )
    };

    ClientManager.prototype._getInventory = function (data) {
        var inv =  new Inventory(
            data.owner_id,
            data.max_size
        );
        for (var i = 0; i < data.items.length; i++)
            inv.addItem(this._getItem(data.items[i]));
        return inv;
    };

    ClientManager.prototype._viewAgentBalance = function (jq_div) {
        // Найти все места отображения баланса и заменить там баланс
        if (jq_div)
            jq_div.find('.self-balance-view').text(user.balance.toFixed(0).toString() + 'NC');
        else
            $('.self-balance-view').text(user.balance.toFixed(0).toString() + 'NC');
    };

    // Входящие сообщения

    ClientManager.prototype.InitAgent = function(event){
        //console.log('ClientManager.prototype.InitAgent', event);
        // Инициализация Юзера
        if (event.agent.cls == "User" || event.agent.cls == "QuickUser") {
            user.login = event.agent.login;
            user.ID = event.agent.uid;
            user.balance = event.agent.balance;
            if (event.agent.party) {
                user.party = new OwnerParty(event.agent.party.id, event.agent.party.name);
                this.sendGetPartyInfo(event.agent.party.name);
            }
            timeManager.timerStart();
        }
    };

    ClientManager.prototype.InitCar = function (event) {
        //console.log('ClientManager.prototype.InitCar', event);
        var servtime = event.time;
        var v_forward = event.car.v_forward;
        var v_backward = event.car.v_backward;
        var p_observing_range = event.car.p_observing_range;
        var aObsRangeRateMin = event.car.p_obs_range_rate_min;
        var aObsRangeRateMax = event.car.p_obs_range_rate_max;
        var uid = event.car.uid;
        var role = event.car.role;
        var state = this._getState(event.car.state);
        var hp_state = this._getHPState(event.car.hp_state);
        var fuel_state = this._getFuelState(event.car.fuel_state);
        var fireSectors = this._getSectors(event.car.fire_sectors);

        clock.setDt((new Date().getTime() - servtime) / 1000.);

        if (!user.userCar) {
            // создать машинку
            var mcar = new UserCar(
                uid,       //ID машинки
                v_forward,
                v_backward,
                state,
                hp_state,
                fuel_state,
                p_observing_range,
                aObsRangeRateMin,
                aObsRangeRateMax
            );
            for (var i = 0; i < fireSectors.length; i++)
                mcar.fireSidesMng.addSector(fireSectors[i].sector, fireSectors[i].side)

            user.userCar = mcar;
            mcar.sub_class_car = event.car.sub_class_car;
            mapCanvasManager.on_new_map_size();

            // Виджеты:
            //new WCarMarker(mcar);    // виджет маркера
            new WCanvasCarMarker(mcar);
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
            wFireController.updateQuickConsumerPanel(event.car.quick_consumer_panel);
            mapManager.widget_target_point = new WCanvasTargetPoint(mcar); // виджет пункта назначения
            //mapManager.widget_rumble = new WRumble(mcar); // виджет-тряски

            if (mcar.fireSidesMng.getSectors(null, true, true).length > 0) {
                mapManager.widget_fire_sectors = new WCanvasFireSectorsScaled(mcar);
                mapManager.widget_fire_radial_grid = new WFCanvasireRadialGrid(mcar);
            }

            // Инициализация виджетов работы с канвасом
            if (!wObservingRange) {
                wObservingRange = new WObservingRange();
                wObservingRange.addModelObject(mcar);
            } else
                wObservingRange.addModelObject(mcar);

            // Инициализация контекстной панели
            contextPanel = new ContextPanel();

            // Инициализация мап-зума
            mapManager.onZoomAnimation({zoom: map.getZoom()});  // todo: сделать правильно
        }
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

        //if (car == user.userCar && hp_state.dps != car._hp_state.dps) {
        //    console.log('Смена DPS: old - ', car._hp_state.dps, '    new - ', hp_state.dps);
        //}

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

            // Установка cc для круизконтроля
            wCruiseControl.setSpeedRange(event.object.params.p_cc);
        }

        // Визуализация Update. При каждом сообщение Contact или See будет создан маркер с соответствующим попапом
        if (cookieStorage.enableMarkerUpdate()) {
            debugMapList.push(
                L.circleMarker(mapManager.unproject([event.object.state.p0.x, event.object.state.p0.y], mapManager.getMaxZoom()), {color: '#FF0000'})
                    .setRadius(3)
                    .bindPopup(
                        'Тип сообщения: ' + event.cls + '</br>' +
                        'uid объекта: ' + event.object.uid + '</br>' +
                        'comment: ' + event.comment + '</br>'
                )
                    .addTo(map)
            );

            if (event.object.state.c)
                debugMapList.push(
                    L.circleMarker(mapManager.unproject([event.object.state.c.x, event.object.state.c.y], mapManager.getMaxZoom()), {color: '#FFFF00'})
                        .setRadius(20)
                        .addTo(map)
                );

        }

    };

    ClientManager.prototype.See = function (event) {
        //console.log('ClientManager.prototype.See', event);
        if (user.userCar == null) {
            //console.warn('Контакт ивент до инициализации своей машинки!');
            return;
        }

        switch (event.object.cls) {
            case 'Bot':
            case 'Rocket':
            case 'ScoutDroid':
            case 'StationaryTurret':
            case 'SlowMine':
            case 'Mobile':
                this._contactBot(event);
                break;
            case 'RadioPoint':  // todo: раскоментировать, когда радиоточки будут установлены или сделать через куки-настройки
                //console.log('Radio Towers are hidden');
                break;
            case 'Town':
            case 'POILoot':
            case 'POIContainer':
            case 'POICorpse':
            case 'GasStation':
                this._contactStaticObject(event);
                break;
            default:
            console.warn('Контакт с неизвестным объектом ', event.object);
        }

        // Визуализация контакта. При каждом сообщение Contact или See будет создан маркер с соответствующим попапом
        if (cookieStorage.enableMarkerContact())
            debugMapList.push(
                L.circleMarker(mapManager.unproject([event.object.state.p0.x, event.object.state.p0.y], mapManager.getMaxZoom()), {color: '#FFBA12'})
                    .setRadius(8)
                    .bindPopup(
                        'Тип сообщения: ' + event.cls + '</br>' +
                        'uid объекта: ' + event.object.uid + '</br>' +
                        'subject_id: ' + event.subject_id + '</br>'
                )
                    .addTo(map)
            );
    };

    ClientManager.prototype.Out = function (event) {
        //console.log('ClientManager.prototype.Out');
        if(event.is_last) { // только если машинку нужно совсем убирать
            var uid = event.object_id;
            var car = visualManager.getModelObject(uid);
            if (! car) {
                //console.error('Out Error: Машины с данным id [' + uid + '] не существует на клиенте. Ошибка!', event);
                return;
            }

            // Города и заправки нельзя перестать видеть
            if ((car.cls == 'Town') || (car.cls == 'GasStation')) return;

            // Удаление машинки (убрать саму машинку из визуалменеджера)
            car.delFromVisualManager();

            // Удалить привязку к владельцу
            if (car.owner) car.owner.unbindCar(car);

            if (car == user.userCar)
                user.userCar = null;
        }
    };

    ClientManager.prototype.Die = function (event) {
        //console.log('ClientManager.prototype.Die');
        modalWindow.modalDialogInfoShow({
            caption: 'Car Crash',
            header: 'Крушение!',
            body_text: 'Ваш автомобиль потерпел крушение. Вы можете взять другой в городе.',
            callback_ok: function () {
                window.location.reload();
            }
        });
    };

    ClientManager.prototype.QuickGameDie = function (event) {
        // console.log('ClientManager.prototype.QuickGameDie');
        //alert('Ваша машинка потерпела крушение. Можете попробовать ещё.');
        modalWindow.modalDialogInfoShow({
            caption: 'Car Crash',
            header: 'Крушение!',
            body_text: 'Ваш автомобиль потерпел крушение. Вы можете зарегистрироваться на сайте и играть полноценно.',
            callback_ok: function () {
                window.location.reload();
            }
        });
        window.location = '/#quick';
    };

    ClientManager.prototype.Chat = function (event){
        //console.log('ClientManager.prototype.Chat', event);
        //chat.addMessageByID(-1, getOwner(event.author), event.text);
        //chat.addMessageByID(-1, event.author, event.text);
    };

    ClientManager.prototype.Message = function (event){
        console.log('ClientManager.prototype.Message :', event.comment);
    };

    ClientManager.prototype.AgentConsoleEchoMessage = function (event){
        console.log('ClientManager.prototype.AgentConsoleEchoMessage :', event.comment);
        chat.addMessageToSys(event.comment);
    };

    // todo: эффекты вынести потом в отдельный модуль
    ClientManager.prototype.Bang = function (event){
        //console.log('ClientManager.prototype.Bang', event);
        new ECanvasHeavyBangPNG_2(new Point(event.position.x, event.position.y)).start();
        //new Bang(new Point(event.position.x, event.position.y),
        //         event.bang_power, event.duration, event.end_duration).start();
    };

    ClientManager.prototype.ChangeAltitude = function(event){
        // console.log('ClientManager.prototype.ChangeAltitude ', event);
        if (event.obj_id == user.userCar.ID){
            user.userCar.altitude = event.altitude;
        }
        else
            console.error('Error! Пришла высота на неизветную машинку!')
    };

    ClientManager.prototype.UpdateObservingRange = function (event) {
        //console.log('ClientManager.prototype.UpdateObservingRange ', event);
        var car = this._getMObj(event.obj_id);
        car.p_observing_range = event.p_observing_range;
    };

    ClientManager.prototype.SetObserverForClient = function(event) {
        //console.log('ClientManager.prototype.SetObserverForClient ', event.enable, event.obj_id, mobj);
        var mobj = this._getMObj(event.obj_id);
        if (! mobj) return;
        if (event.enable)
            wObservingRange.addModelObject(mobj);
        else
            wObservingRange.delModelObject(mobj);
    };

    ClientManager.prototype.FireDischarge = function (event) {
        //console.log('ClientManager.prototype.FireDischarge ', event);
        if (event.car_id != user.userCar.ID) return;
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
        user.userCar.setShootTime(event.side, etime, event.t_rch);

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
            targets: event.targets,
            fake_position: event.fake_position
        });
    };

    ClientManager.prototype.ZoneMessage = function (event) {
//        console.log('ClientManager.prototype.ZoneMessage', event);
        wCruiseControl.setZoneState(event.in_zone, event.is_start);
    };

    ClientManager.prototype.PartyInfoMessage = function (event) {
        //console.log('ClientManager.prototype.PartyInfoMessage', event);
        if (user.party && (user.party.id == event.party.id)) {
            partyManager.include_to_party(event.party);
            return;
        }
        partyManager.set_party_info(event.party);
    };

    ClientManager.prototype.PartyUserInfoMessage = function (event) {
        //console.log('ClientManager.prototype.PartyUserInfoMessage', event);
        partyManager.set_user_info(event);
    };

    ClientManager.prototype.AgentPartyChangeMessage = function (event) {
        //console.log('ClientManager.prototype.AgentPartyChangeMessage', event);
        if(event.subj.uid == user.ID) return;
        var owner = this._getOwner(event.subj);
        for (var i = 0; i < owner.cars.length; i++) {
            var widget_marker = visualManager.getVobjByType(owner.cars[i], WCanvasCarMarker);
            if (widget_marker) widget_marker.updateIcon();
        }

        if ((!event.subj.party && partyManager.user_in_party(event.subj.user_name)) ||
            (event.subj.party && (event.subj.party.id == partyManager.party.id)))
            this.sendGetPartyInfo(partyManager.party.name);

        chat.party_info_message(event);
    };

    ClientManager.prototype.PartyIncludeMessageForIncluded = function (event) {
        //console.log('ClientManager.prototype.PartyIncludeMessageForIncluded', event);

        // изменить настройки своей пати для своего клиента
        if (! event.party) {console.error('Невозможно считать Party. Ошибка.'); return;}
        user.party = new OwnerParty(event.party.id, event.party.name);

        // обновить иконки для всех сопартийцев
        ownerList.update_party_icons(user.party.id);
        var widget_marker = null;
        if (user.userCar)
            widget_marker = visualManager.getVobjByType(user.userCar, WCanvasCarMarker);
        if (widget_marker) widget_marker.updateIcon();

        chat.party_info_message(event.party);
        partyManager.include_to_party(event.party);
    };

    ClientManager.prototype.PartyExcludeMessageForExcluded = function (event) {
        //console.log('ClientManager.prototype.PartyExcludeMessageForExcluded', event, user.party);
        var old_party_id = user.party.id;
        user.party = null;
        // обновить иконки для всех бывших сопартийцев
        ownerList.update_party_icons(old_party_id);
        var widget_marker = null;
        if (user.userCar)
            widget_marker = visualManager.getVobjByType(user.userCar, WCanvasCarMarker);
        if (widget_marker) widget_marker.updateIcon();
        chat.party_info_message(event);
        partyManager.exclude_from_party();
    };

    ClientManager.prototype.PartyKickMessageForKicked = function (event) {
        //console.log('ClientManager.prototype.PartyKickMessageForKicked', event);
        var old_party_id = user.party.id;
        user.party = null;
        // обновить иконки для всех бывших сопартийцев
        ownerList.update_party_icons(old_party_id);
        var widget_marker = null;
        if (user.userCar)
            widget_marker = visualManager.getVobjByType(user.userCar, WCanvasCarMarker);
        if (widget_marker) widget_marker.updateIcon();
        chat.party_info_message(event);
        partyManager.exclude_from_party();

        if (locationManager.in_location_flag && locationManager.location_chat)
            locationManager.location_chat.interaction_manager.set_buttons();
    };

    ClientManager.prototype.PartyInviteMessage = function (event) {
        //console.log('ClientManager.prototype.PartyInviteMessage', event);
        partyManager.add_invite(event.invite_id, event.party, event.sender, event.recipient);
        chat.party_info_message(event);
    };

    ClientManager.prototype.PartyInviteDeleteMessage = function (event) {
        //console.log('ClientManager.prototype.PartyInviteDeleteMessage', event);
        partyManager.del_invite(event.invite_id);
        chat.party_info_message(event);
    };

    ClientManager.prototype.PartyErrorMessage = function (event) {
        //console.log('ClientManager.prototype.PartyErrorMessage', event);
        chat.party_info_message(event);
    };

    ClientManager.prototype.EnterToLocation = function (event) {
        //console.log('ClientManager.prototype.EnterToLocation', event);
        locationManager.onEnter(event);
        mapCanvasManager.is_canvas_render = false;
    };

    ClientManager.prototype.ExitFromLocation = function () {
        //console.log('ClientManager.prototype.ExitFromTown', event);
        locationManager.onExit();
        mapCanvasManager.is_canvas_render = true;
    };

    ClientManager.prototype.ChatRoomIncludeMessage = function(event){
        //console.log('ClientManager.prototype.ChatRoomIncludeMessage', event);
        chat.addChat(event.room_name, event.chat_type);
    };

    ClientManager.prototype.ChatRoomExcludeMessage = function(event){
        //console.log('ClientManager.prototype.ChatRoomExcludeMessage', event);
        chat.removeChat(event.room_name);
    };

    ClientManager.prototype.ChatPartyRoomIncludeMessage = function(event){
        //console.log('ClientManager.prototype.ChatPartyRoomIncludeMessage', event);
        chat.activateParty(event.room_name);
    };

    ClientManager.prototype.ChatPartyRoomExcludeMessage = function(event){
        //console.log('ClientManager.prototype.ChatPartyRoomExcludeMessage', event);
        chat.deactivateParty(event.room_name);
    };

    ClientManager.prototype.GetPrivateChatMembersMessage = function(event){
        //console.log('ClientManager.prototype.GetPrivateChatMembersMessage', event);
        chat.addChatToInteraction(event.room_name, event.members);
    };

    ClientManager.prototype.ChangeLocationVisitorsMessage = function(event){
        //console.log('ClientManger.prototype.ChangeLocationVisitorsMessage', locationManager, event);
        if (event.action)
            locationManager.visitor_manager.add_visitor(event.visitor);
        else
            locationManager.visitor_manager.del_visitor(event.visitor);
    };

    ClientManager.prototype.InventoryShowMessage = function (event) {
        //console.log('ClientManager.prototype.InventoryShowMessage', event);
        var inventory = this._getInventory(event.inventory);
        inventoryList.addInventory(inventory);
        if (inventory.owner_id == user.ID)
            locationManager.update();
    };

    ClientManager.prototype.InventoryHideMessage = function (event) {
        //console.log('ClientManager.prototype.InventoryHideMessage', event);
        inventoryList.delInventory(event.inventory_owner_id);
    };

    ClientManager.prototype.InventoryIncSizeMessage = function (event) {
        //console.log('ClientManager.prototype.InventoryHideMessage', event);
        var inventory = inventoryList.getInventory(event.inventory_owner_id);
        if (inventory)
            inventory.setNewSize(event.size);
        else
            console.warn('InventoryIncSizeMessage:: инвентарь' + event.inventory_owner_id + ' отсутствует на клиенте:');
    };

    ClientManager.prototype.InventoryItemMessage = function (event) {
        //console.log('ClientManager.prototype.InventoryItemMessage', event);
        var inventory = inventoryList.getInventory(event.owner_id);
        if (inventory)
            inventory.getItem(event.position).setState(this._getItemState(event.item));
        else
            console.warn('Неизвестный инвентарь (ownerID =', event.owner_id, ')');
    };

    ClientManager.prototype.InventoryAddItemMessage = function (event) {
        //console.log('ClientManager.prototype.InventoryAddItemMessage', event);
        var inventory = inventoryList.getInventory(event.owner_id);
        if (inventory)
            inventory.addItem(this._getItem(event));
        else
            console.warn('Неизвестный инвентарь (ownerID =', event.owner_id, ')');
    };

    ClientManager.prototype.InventoryDelItemMessage = function (event) {
        //console.log('ClientManager.prototype.InventoryDelItemMessage', event);
        var inventory = inventoryList.getInventory(event.owner_id);
        if (inventory)
            inventory.delItem(event.position);
        else
            console.warn('Неизвестный инвентарь (ownerID =', event.owner_id, ')');
    };

    ClientManager.prototype.GasStationUpdate = function (event) {
        //console.log('ClientManager.prototype.GasStationUpdate', event);
        initGasStation(event.balance, event.fuel);
    };

    //ClientManager.prototype.GetStashWindow = function (event) {
    //    console.log('ClientManager.prototype.GetStashWindow', event);
    //    // POST запрос на получение города и вывод его на экран.
    //    $.ajax({
    //        url: "http://" + location.host + '/api/stash',
    //        data:  { stash_id: event.stash_id },
    //        success: function(data) {
    //            console.log('ClientManager.prototype.GetStashWindow Answer');
    //            //
    //        }
    //    });
    //};

    // Бартер

    ClientManager.prototype.AddInviteBarterMessage = function (event) {
        //console.log('ClientManager.prototype.AddInviteBarterMessage', event);
        if (contextPanel)
            contextPanel.activate_barter_manager.add_barter(event.barter_id, event.initiator);
    };

    ClientManager.prototype.DelInviteBarterMessage = function (event) {
        //console.log('ClientManager.prototype.DelInviteBarterMessage', event);
        if (contextPanel)
            contextPanel.activate_barter_manager.del_barter(event.barter_id);
    };

    ClientManager.prototype.ActivateBarterMessage = function (event) {
        //console.log('ClientManager.prototype.ActivateBarterMessage', event);
        barterManager.ActivateBarter(event.barter_id);
    };

    ClientManager.prototype.CancelBarterMessage = function (event) {
        //console.log('ClientManager.prototype.CancelBarterMessage', event);
        barterManager.CancelBarter(event.barter_id);
    };

    ClientManager.prototype.SuccessBarterMessage = function (event) {
        //console.log('ClientManager.prototype.SuccessBarterMessage', event);
        barterManager.SuccessBarter(event.barter_id);
    };

    ClientManager.prototype.LockBarterMessage = function (event) {
        //console.log('ClientManager.prototype.LockBarterMessage', event);
        barterManager.LockBarter(event.barter_id);
    };

    ClientManager.prototype.UnlockBarterMessage = function (event) {
        //console.log('ClientManager.prototype.UnlockBarterMessage', event);
        barterManager.UnlockBarter(event.barter_id);
    };

    ClientManager.prototype.ChangeMoneyBarterMessage = function (event) {
        //console.log('ClientManager.prototype.ChangeMoneyBarterMessage', event);
        barterManager.ChangeMoneyBarter(event.barter_id, event.my_money, event.other_money);
    };

    ClientManager.prototype.StartBarterTimerMessage = function (event) {
        //console.log('ClientManager.prototype.StartBarterTimerMessage', event);
        barterManager.StartBarterTimer(event.barter_id, event.success_delay);
    };

    ClientManager.prototype.QuickConsumerPanelInfoMessage = function (event) {
        //console.log('ClientManager.prototype.QuickConsumerPanelInfoMessage', event);
        wFireController.updateQuickConsumerPanel(event.quick_panel);
    };

    ClientManager.prototype.NPCTransactionMessage = function (event) {
        //console.log('ClientManager.prototype.NPCTransactionMessage', event);
        if (locationManager.npc.hasOwnProperty(event.npc_html_hash))
            locationManager.npc[event.npc_html_hash].add_transaction(event.info_string);
    };

    // Examples - Различные виды example'ов (для машинки, для агента, для чего-то ещё (возможно)
    ClientManager.prototype.UserExampleSelfMessage = function(event) {
        //console.log('ClientManager.prototype.UserExampleSelfMessage', event);

        // Эта функция заполняет только шаблоны
        user.templates = {};
        if (event.example_car) {
            for (var key in event.templates)
                if (event.templates.hasOwnProperty(key)) {
                    user.templates[key] = event.templates[key];
                }
        }

        this.UserExampleSelfShortMessage(event);
    };

    ClientManager.prototype.UserExampleSelfShortMessage = function(event) {
        //console.log('ClientManager.prototype.UserExampleSelfShortMessage', event);
        user.example_car = event.example_car;
        user.example_agent = event.example_agent;
        user.example_agent.rpg_info = event.rpg_info;
        user.avatar_link = event.avatar_link;
        if (event.example_car && event.templates) {
            user.templates.html_car_img = event.templates.html_car_img;
            user.templates.html_car_table = event.templates.html_car_table;
        }
        user.car_npc_info = event.hasOwnProperty('car_npc_info') ? event.car_npc_info : null;

        // Проверить не надо ли запустить окно информации об автомобиле
        if (carManager.is_active) carManager.open_window();

        this.UserExampleSelfRPGMessage(event);
    };

    ClientManager.prototype.UserExampleSelfRPGMessage = function(event) {
        //console.log('ClientManager.prototype.UserExampleSelfShortMessage', event);
        user.example_agent.rpg_info = event.rpg_info;
        characterManager.redraw();
        locationManager.update();
    };

    ClientManager.prototype.HangarInfoMessage = function (event) {
        //console.log('ClientManager.prototype.HangarInfoMessage', event);
        if (locationManager.npc.hasOwnProperty(event.npc_html_hash)) {
            locationManager.npc[event.npc_html_hash].update(event);
        }
    };

    ClientManager.prototype.ParkingInfoMessage = function (event) {
        //console.log('ClientManager.prototype.ParkingInfoMessage', event);
        if (locationManager.npc.hasOwnProperty(event.npc_html_hash)) {
            locationManager.npc[event.npc_html_hash].update(event);
        }
    };

    ClientManager.prototype.ParkingBagMessage = function (event) {
        //console.log('ClientManager.prototype.ParkingBagMessage', event);
        if (locationManager.npc.hasOwnProperty(event.npc_html_hash) && locationManager.npc[event.npc_html_hash].bag_place) {
            locationManager.npc[event.npc_html_hash].bag_place.update(event);
        }
    };

    ClientManager.prototype.TraderInfoMessage = function (event) {
        //console.log('ClientManager.prototype.TraderInfoMessage', event);
        var trader = locationManager.npc[event.npc_html_hash];
        user.example_agent.balance = event.agent_balance;
        if (trader) trader.updatePrice(event)
    };

    ClientManager.prototype.TraderClearMessage = function (event) {
        //console.log('ClientManager.prototype.TraderClearMessage', event);
        var trader = locationManager.npc[event.npc_html_hash];
        if (trader) trader.clear();
    };

    ClientManager.prototype.TrainerInfoMessage = function (event) {
        //console.log('ClientManager.prototype.TrainerInfoMessage', event);
        if (locationManager.npc.hasOwnProperty(event.npc_html_hash))
            locationManager.npc[event.npc_html_hash].setDropPrice(event.drop_price);
    };

    ClientManager.prototype.InteractionInfoMessage = function (event) {
        //console.log('ClientManager.prototype.InteractionInfoMessage', event);
        locationManager.location_chat.interaction_manager.update(event);
    };

    ClientManager.prototype.ChangeAgentBalance = function (event) {
        //console.log('ClientManager.prototype.ChangeAgentBalance', event);
        if (user.ID == event.uid) {
            user.balance = event.agent_balance;
            if (user.example_agent)
                user.example_agent.balance = event.agent_balance;
            this._viewAgentBalance(null);
        }
    };

    // Журнал (стоянка)
    ClientManager.prototype.JournalParkingInfoMessage = function (event) {
        //console.log('ClientManager.prototype.JournalParkingInfoMessage', event);
        journalManager.parking.update(event.cars);
    };

    // Журнал (квесты)
    ClientManager.prototype.QuestUpdateMessage = function (event) {
        //console.log('ClientManager.prototype.QuestUpdateMessage', event);
        journalManager.quest.update(event.quest);
    };

    // Административные сообщения
    ClientManager.prototype.AdminArchiveCompleteMessage = function (event) {
        console.log('ClientManager.prototype.AdminArchiveCompleteMessage  Start Download temp_archive');
        window.open(window.location.protocol + "//" + location.host + '/static/temp_archive.zip', '_self');
    };

    // Стратегический режим
    ClientManager.prototype.StrategyModeInfoObjectsMessage = function (event) {
        //console.log('ClientManager.prototype.StrategyModeInfoObjectsMessage', event);
        wStrategyModeManager.update(event.objects);
    };

    // Исходящие сообщения

    ClientManager.prototype.sendConsoleCmd = function (atext) {
        //sendServConsole
        var mes = {
            call: "console_cmd",
            rpc_call_id: rpcCallList.getID(),
            params: {
                cmd: atext
            }
        };
        rpcCallList.add(mes);
        clientManager._sendMessage(mes);
    };

    ClientManager.prototype.sendSetSpeed = function (newSpeed) {
        //console.log('ClientManager.prototype.sendSetSpeed');
        if (!user.userCar) return;
        this.sendMotion(null, newSpeed, null)
    };

    ClientManager.prototype.sendStopCar = function () {
        //console.log('ClientManager.prototype.sendStopCar');
        if (!user.userCar) return;
        this.sendMotion(null, 0.0, null)
    };

    ClientManager.prototype.sendTurn = function (turn) {
        //console.log('ClientManager.prototype.sendTurn');
        if (!user.userCar) return;
        this.sendMotion(null, null, turn)
    };

    ClientManager.prototype.sendGoto = function (target) {
        //console.log('ClientManager.prototype.sendGoto');
        if (!user.userCar) return;
        var currentSpeed = wCruiseControl.getSpeedHandleValue();
        if (currentSpeed == 0)
            wCruiseControl.setSpeedHandleValue(0.2);
        currentSpeed = wCruiseControl.getSpeedHandleValue();
        this.sendMotion(target, currentSpeed, null);
    };

    ClientManager.prototype.sendMotion = function (target, newSpeed, turn) {
        //console.log('ClientManager.prototype.sendMotion');
        if (!user.userCar) return;
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
        if (!user.userCar) return;
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

    ClientManager.prototype.sendFireAutoEnable = function (enable) {
        //console.log('ClientManager.prototype.sendFireDischarge');
        if (!user.userCar) return;
        var mes = {
            call: "fire_auto_enable",
            rpc_call_id: rpcCallList.getID(),
            params: {
                enable: enable
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendRocket = function () {
        var time = clock.getCurrentTime();
        if ((time - last_send_time) < 0.333) return;
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
        if ((time - last_send_time) < 0.333) return;
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
        if ((time - last_send_time) < 0.333) return;
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
        if ((time - last_send_time) < 0.333) return;
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

    ClientManager.prototype.sendGetPartyInfo = function (name) {
        var mes = {
            call: "get_party_info",
            rpc_call_id: rpcCallList.getID(),
            params: {
                name: name
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendGetPartyUserInfo = function (name) {
        var mes = {
            call: "get_party_user_info",
            rpc_call_id: rpcCallList.getID(),
            params: {
                name: name
            }
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
        //console.log('ClientManager.prototype.sendInvitePartyFromTemplate');
        modalWindow.modalDialogInfoShow({
            caption: 'Invite',
            header: 'Приглашение отправлено!',
            body_text: 'Вы пригласили в пати игрока с ником - ' + name + '.',
            callback_ok: function () {}
        });
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

    ClientManager.prototype.sendChangePartyCategory = function (name) {
        //console.log('ClientManager.prototype.sendChangePartyCategory', name)
        var mes = {
            call: "send_change_category",
            rpc_call_id: rpcCallList.getID(),
            params: { username: name }
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

    ClientManager.prototype.sendEnterToLocation = function (location_id) {
        //console.log('ClientManager.prototype.sendEnterToLocation', location_id);
        var mes = {
            call: "enter_to_location",
            rpc_call_id: rpcCallList.getID(),
            params: {
                location_id: location_id
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendExitFromLocation = function (location_id) {
        var mes = {
            call: "exit_from_location",
            rpc_call_id: rpcCallList.getID(),
            params: {
                location_id: location_id
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendCreatePrivateChat = function (recipient, msg) {
        if (!msg) msg = '';
        var mes = {
            call: "create_private_chat",
            rpc_call_id: rpcCallList.getID(),
            params: {
                recipient: recipient,
                msg: msg
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendGetPrivateChatMembers = function (room_jid) {
        var mes = {
            call: "get_private_chat_members",
            rpc_call_id: rpcCallList.getID(),
            params: {
                name: room_jid
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendClosePrivateChat = function (chat_name) {
        //console.log('ClientManager.prototype.sendClosePrivateChat', chat_name);
        var mes = {
            call: "close_private_chat",
            rpc_call_id: rpcCallList.getID(),
            params: {
                name: chat_name
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendChatMessage = function (room_jid, msg) {
        //console.log('ClientManager.prototype.sendChatMessage', room_jid, msg);
        var mes = {
            call: "chat_message",
            rpc_call_id: rpcCallList.getID(),
            params: {
                room_name: room_jid,
                msg: msg
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendShowInventory = function (owner_id) {
        //console.log('ClientManager.prototype.sendShowInventory', owner_id);
        var mes = {
            call: "show_inventory",
            rpc_call_id: rpcCallList.getID(),
            params: {
                owner_id: owner_id
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendHideInventory = function (owner_id) {
        //console.log('ClientManager.prototype.sendHideInventory');
        var mes = {
            call: "hide_inventory",
            rpc_call_id: rpcCallList.getID(),
            params: {
                owner_id: owner_id
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendItemActionInventory = function(start_owner_id, start_pos, end_owner_id, end_pos, count) {
        var mes = {
            call: "item_action_inventory",
            rpc_call_id: rpcCallList.getID(),
            params: {
                start_owner_id: start_owner_id,
                start_pos: start_pos,
                end_owner_id: end_owner_id,
                end_pos: end_pos,
                count: count
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendGetBalanceCls = function (balance_cls_name) {
        //console.log('ClientManager.prototype.sendGetBalanceCls', balance_cls_name);
        var mes = {
            call: "get_balance_cls",
            rpc_call_id: rpcCallList.getID(),
            params: {
                balance_cls_name: balance_cls_name
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendActivateItem = function (item) {
        // console.log('ClientManager.prototype.sendActivateItem', item);
        var mes = {
            call: "activate_item",
            rpc_call_id: rpcCallList.getID(),
            params: {
                target_id: item.inventory.owner_id,
                owner_id: item.inventory.owner_id,
                position: item.position
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendFuelStationActive = function (fuel, tank_list, npc) {
        //console.log('ClientManager.prototype.sendFuelStationActive');
        var mes = {
            call: "fuel_station_active",
            rpc_call_id: rpcCallList.getID(),
            params: {
                tank_list: tank_list,
                fuel: fuel,
                npc_node_hash: npc.npc_rec.node_hash
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendGetLoot = function (poi_id) {
        //console.log('ClientManager.prototype.sendLootStash', poi_id);
        var mes = {
            call: "get_loot",
            rpc_call_id: rpcCallList.getID(),
            params: {
                poi_id: poi_id
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    // Сообщения локаций

    ClientManager.prototype.sendEnterToNPC = function (npc_type) {
        //console.log('ClientManager.prototype.sendEnterToNPC', npc_type);
        var mes = {
            call: "enter_to_npc",
            rpc_call_id: rpcCallList.getID(),
            params: {
                npc_type: npc_type
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    // Оружейник

    ClientManager.prototype.sendArmorerApply = function (npc) {
        //console.log('ClientManager.prototype.sendArmorerApply');
        // todo: оптимизировать отправку
        var mes = {
            call: "armorer_apply",
            rpc_call_id: rpcCallList.getID(),
            params: {
                npc_node_hash: npc.npc_rec.node_hash,
                armorer_slots: npc.exportSlotState()
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    // Механик

    ClientManager.prototype.sendMechanicApply = function (npc) {
        //console.log('ClientManager.prototype.sendMechanicApply');
        // todo: оптимизировать отправку
        var mes = {
            call: "mechanic_apply",
            rpc_call_id: rpcCallList.getID(),
            params: {
                npc_node_hash: npc.npc_rec.node_hash,
                mechanic_slots: npc.exportSlotState()
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendMechanicRepairApply = function (npc_head_html_hash, hp) {
        //console.log('ClientManager.prototype.sendMechanicApply');
        // todo: оптимизировать отправку
        var mes = {
            call: "mechanic_repair_apply",
            rpc_call_id: rpcCallList.getID(),
            params: {
                npc_node_hash: npc_head_html_hash,
                hp: hp
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    // Тюнер

    ClientManager.prototype.sendTunerApply = function (npc) {
        //console.log('ClientManager.prototype.sendTunerApply');
        // todo: оптимизировать отправку
        var mes = {
            call: "tuner_apply",
            rpc_call_id: rpcCallList.getID(),
            params: {
                npc_node_hash: npc.npc_rec.node_hash,
                tuner_slots: npc.exportSlotState()
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    // Торговец

    ClientManager.prototype.sendGetTraderInfo = function (npc) {
        //console.log('ClientManager.prototype.sendGetParkingInfo', npc);
        var mes = {
            call: "get_trader_info",
            rpc_call_id: rpcCallList.getID(),
            params: { npc_node_hash: npc.npc_rec.node_hash }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendTraderApply = function (param) {
        //console.log('ClientManager.prototype.sendTraderApply');
        var mes = {
            call: "trader_apply",
            rpc_call_id: rpcCallList.getID(),
            params: param
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    // Ангар

    ClientManager.prototype.sendHangarSell = function (npc) {
        //console.log('ClientManager.prototype.sendHangarCarChoice', car_number);
        var mes = {
            call: "sell_car_in_hangar",
            rpc_call_id: rpcCallList.getID(),
            params: {
                npc_node_hash: npc.npc_rec.node_hash
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendHangarBuy = function (npc) {
        //console.log('ClientManager.prototype.sendHangarCarChoice', car_number);
        var mes = {
            call: "buy_car_in_hangar",
            rpc_call_id: rpcCallList.getID(),
            params: {
                npc_node_hash: npc.npc_rec.node_hash,
                car_number: npc.current_car
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendGetHangarInfo = function (npc) {
        //console.log('ClientManager.prototype.sendHangarCarChoice', car_number);
        var mes = {
            call: "get_hangar_info",
            rpc_call_id: rpcCallList.getID(),
            params: {
                npc_node_hash: npc.npc_rec.node_hash
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    // Стоянка

    ClientManager.prototype.sendParkingLeave = function (npc) {
        //console.log('ClientManager.prototype.sendParkingLeave');
        var mes = {
            call: "parking_leave_car",
            rpc_call_id: rpcCallList.getID(),
            params: {
                npc_node_hash: npc.npc_rec.node_hash
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendParkingSelect = function (npc) {
        //console.log('ClientManager.prototype.sendParkingSelect');
        var mes = {
            call: "parking_select_car",
            rpc_call_id: rpcCallList.getID(),
            params: {
                npc_node_hash: npc.npc_rec.node_hash,
                car_number: npc.current_car
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendGetParkingInfo = function (npc) {
        //console.log('ClientManager.prototype.sendGetParkingInfo', npc);
        var mes = {
            call: "get_parking_info",
            rpc_call_id: rpcCallList.getID(),
            params: {
                npc_node_hash: npc.npc_rec.node_hash
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendParkingBagExchange = function (car_uid, npc_node_hash) {
        //console.log('ClientManager.prototype.sendParkingBagExchange', car_uid, npc_node_hash);
        var mes = {
            call: "get_parking_bag_exchange",
            rpc_call_id: rpcCallList.getID(),
            params: {
                car_uid: car_uid ? car_uid : null,
                npc_node_hash: npc_node_hash
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    // Бартер

    ClientManager.prototype.sendInitBarter = function (recipient_login) {
        //console.log('ClientManager.prototype.sendInitBarter', recipient_login);
        var mes = {
            call: "init_barter",
            rpc_call_id: rpcCallList.getID(),
            params: { recipient_login: recipient_login.toString() }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendOutBarterRange = function (recipient_login) {
        //console.log('ClientManager.prototype.sendInitBarter', recipient_login);
        var mes = {
            call: "out_barter_range",
            rpc_call_id: rpcCallList.getID(),
            params: {
                recipient_login: recipient_login.toString()
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendActivateBarter = function (barter_id) {
        //console.log('ClientManager.prototype.sendActivateBarter', barter_id);
        var mes = {
            call: "activate_barter",
            rpc_call_id: rpcCallList.getID(),
            params: {
                barter_id: parseInt(barter_id)
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendCancelBarter = function (barter_id, recipient_login) {
        //console.log('ClientManager.prototype.sendCancelBarter', barter_id, recipient_login);
        var mes = {
            call: "cancel_barter",
            rpc_call_id: rpcCallList.getID(),
            params: {
                barter_id: barter_id ? barter_id : null,
                recipient_login: recipient_login ? recipient_login : null
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendLockBarter = function (barter_id) {
        //console.log('ClientManager.prototype.sendLockBarter', barter_id);
        var mes = {
            call: "lock_barter",
            rpc_call_id: rpcCallList.getID(),
            params: {
                barter_id: barter_id
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendUnlockBarter = function (barter_id) {
        //console.log('ClientManager.prototype.sendUnlockBarter', barter_id);
        var mes = {
            call: "unlock_barter",
            rpc_call_id: rpcCallList.getID(),
            params: {
                barter_id: barter_id
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendTableMoney = function (barter_id, money) {
        //console.log('ClientManager.prototype.sendTableMoney', barter_id, money);
        var mes = {
            call: "table_money_barter",
            rpc_call_id: rpcCallList.getID(),
            params: {
                barter_id: barter_id,
                money: money
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    // RPG система

    ClientManager.prototype.sendGetTrainerInfo = function (npc) {
        //console.log('ClientManager.prototype.sendGetTrainerInfo', npc);
        var mes = {
            call: "get_trainer_info",
            rpc_call_id: rpcCallList.getID(),
            params: {
                npc_node_hash: npc.npc_rec.node_hash
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendSetRPGState = function (npc) {
        //console.log('ClientManager.prototype.sendSetSkillState');
        var rpg_data = npc.get_rpg_data();
        var mes = {
            call: "set_rpg_state",
            rpc_call_id: rpcCallList.getID(),
            params: {
                npc_node_hash: npc.npc_rec.node_hash,
                skills: rpg_data.skills,
                buy_skills: rpg_data.buy_skills,
                perks: rpg_data.perks
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendSetAboutSelf = function (str) {
        //console.log('ClientManager.prototype.sendSetAboutSelf', str);
        var mes = {
            call: "set_about_self",
            rpc_call_id: rpcCallList.getID(),
            params: {
                text: str
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendGetAboutSelf = function () {
        //console.log('ClientManager.prototype.sendSetAboutSelf', str);
        var mes = {
            call: "get_about_self",
            rpc_call_id: rpcCallList.getID(),
            params: {}
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };


    // Окно взаимодействия с другими игроками (в городе)
    ClientManager.prototype.sendGetInteractionInfo = function () {
        //console.log('ClientManager.prototype.sendGetInteractionInfo');
        var mes = {
            call: "get_interaction_info",
            rpc_call_id: rpcCallList.getID(),
            params: {
                player_nick: locationManager.location_chat.interaction_manager.player_nick
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    // Административные сообщения
    ClientManager.prototype.sendTileCoord = function (x, y) {
        console.log('ClientManager.prototype.sendTileCoord', x, y);
        var mes = {
            call: "get_tiles_admin",
            rpc_call_id: rpcCallList.getID(),
            params: { x: x, y: y }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    //Активация через панель быстрого доступа
    ClientManager.prototype.sendSetQuickItem = function(index, position) {
        //console.log('ClientManager.prototype.sendSetQuickItem');
        var mes = {
            call: "set_quick_item",
            rpc_call_id: rpcCallList.getID(),
            params: {
                index: index,
                position: position
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendSwapQuickItems = function(index1, index2) {
        //console.log('ClientManager.prototype.sendSetQuickItem');
        var mes = {
            call: "swap_quick_items",
            rpc_call_id: rpcCallList.getID(),
            params: {
                index1: index1,
                index2: index2
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendActivateQuickItem = function(index, target_id) {
        //console.log('ClientManager.prototype.sendActivateQuickItem');
        var mes = {
            call: "activate_quick_item",
            rpc_call_id: rpcCallList.getID(),
            params: {
                index: index,
                target_id: target_id
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendGetQuickItemInfo = function() {
        //console.log('ClientManager.prototype.sendActivateQuickItem');
        var mes = {
            call: "get_quick_item_info",
            rpc_call_id: rpcCallList.getID(),
            params: {}
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    // Запросы стратегического режима
    ClientManager.prototype.sendGetStrategyModeObjects = function() {
        //console.log('ClientManager.prototype.sendGetStrategyModeObjects');
        var mes = {
            call: "get_strategy_mode_info_objects",
            rpc_call_id: rpcCallList.getID(),
            params: {}
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    // Teleport
    ClientManager.prototype.sendTeleportCoord = function(x, y) {
        console.log('ClientManager.prototype.sendTeleportCoord');
        var mes = {
            call: "teleport",
            rpc_call_id: rpcCallList.getID(),
            params: {
                x: x,
                y: y
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    return ClientManager;
})();

var last_send_time = 0;