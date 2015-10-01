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
        if (obj)
            console.warn('Contact: Такой объект уже есть на клиенте!');
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

    ClientManager.prototype._contactBot = function (event) {
        //console.log('ClientManager.prototype._contactBot');
        if (event.is_first) { // только если первый раз добавляется машинка
            var state = this._getState(event.object.state);
            var hp_state = this._getHPState(event.object.hp_state);
            var fuel_state = null; //this._getFuelState(event.object.fuel_state);
            var uid = event.object.uid;
            var aOwner = this._getOwner(event.object.owner);
            var radius_visible = event.object.r;
            var main_agent_login = event.object.main_agent_login;

            // Проверка: нет ли уже такой машинки.
            var car = this._getMObj(uid);
            if (car) return;
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
            if (contextPanel) contextPanel.addModelObject(car); // добавить себя в контекстную панель
        }
    };

    ClientManager.prototype._contactStaticObject = function (event) {
        //console.log('ClientManager.prototype._contactStaticObject', event);
        if (event.is_first) {
            var uid = event.object.uid;
            var radius_visible = event.object.r;
            var obj_marker;

            // Проверка: нет ли уже такого объекта.
            var obj = this._getMObj(uid);
            if (obj) {
                // todo: оптимизировать это: либо удалять объекты при раздеплое машинки, либо вынести этот if вниз
                if (contextPanel) contextPanel.addModelObject(obj); // добавить себя в контекстную панель
                return;
            };

            // Создание объекта
            var direction = null;
            switch (event.object.cls) {
                case 'GasStation':
                case 'Town':
                    direction = - 2 * Math.PI;
                    break;
                case 'RadioPoint':
                    direction = 0.5 * Math.PI;
                    break;
            }
            obj = new StaticObject(uid, new Point(event.object.position.x, event.object.position.y), direction);
            obj.cls = event.object.cls;

            // Создание/инициализация виджетов
            obj_marker = new WCarMarker(obj); // виджет маркера
            if (wFireController) wFireController.addModelObject(obj); // добавить себя в радар
            if (contextPanel) contextPanel.addModelObject(obj); // добавить себя в контекстную панель

            // Установка надписи над статическим объектом. чтобы не плодить функции будем обходится IF'ами
            if (obj.cls == 'Town') {
                obj_marker.updateLabel(event.object.town_name);
                obj.town_name = event.object.town_name;
            }
            if (obj.cls == 'RadioPoint')
                obj_marker.updateLabel('Radio Point');
            if (obj.cls == 'POIStash')
                obj_marker.updateLabel('loot');

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

    // Входящие сообщения

    ClientManager.prototype.InitAgent = function(event){
        //console.log('ClientManager.prototype.InitAgent', event);
        // Инициализация Юзера
        if (event.agent.cls == "User") {
            user.login = event.agent.login;
            user.ID = event.agent.uid;
            user.balance = event.agent.balance;
            if (event.agent.party) {
                user.party = new OwnerParty(event.agent.party.id, event.agent.party.name);
                chat.page_party.buttons.create.text('Отряд');
            }
        }
    };

    ClientManager.prototype.InitCar = function (event) {
        //console.log('ClientManager.prototype.InitCar', event);
        var servtime = event.time;
        var v_forward = event.car.v_forward;
        var v_backward = event.car.v_backward;
        var radius_visible = event.car.r;
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
                radius_visible
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
            new WViewRadius(mcar); // виджет радиуса видимости
            mapManager.widget_target_point = new WTargetPointMarker(mcar); // виджет пункта назначения
            //mapManager.widget_rumble = new WRumble(mcar); // виджет-тряски

            if (mcar.fireSidesMng.getSectors(null, true, true).length > 0) {  // если есть хоть один сектор
                //mapManager.widget_fire_radial_grid = new WRadialGridScaled(mcar); // масштабирующаяся сетка
                mapManager.widget_fire_radial_grid = new WFireRadialGrid(mcar); // не масштабирующаяся сетка
                mapManager.widget_fire_sectors = new WFireSectorsScaled(mcar); // масштабирующиеся сектора
                //mapManager.widget_fire_sectors = new WFireSectors(mcar); // не масштабирующиеся сектора
            }


            // Инициализация контекстной панели
            contextPanel = new ContextPanel();
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

            // Установка cc для круизконтроля
            wCruiseControl.setSpeedRange(event.object.params.p_cc);
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

    ClientManager.prototype.See = function (event) {
        //console.log('ClientManager.prototype.See', event);
        if (user.userCar == null) {
            console.warn('Контакт ивент до инициализации своей машинки!');
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
            case 'GasStation':
                this._contactStaticObject(event);
                break;
            default:
            console.warn('Контакт с неизвестным объектом ', event.object);
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
    };

    ClientManager.prototype.Out = function (event) {
        //console.log('ClientManager.prototype.Out');
        if(event.is_last) { // только если машинку нужно совсем убирать
            var uid = event.object_id;
            var car = visualManager.getModelObject(uid);
            if (! car) {
                console.error('Out Error: Машины с данным id не существует на клиенте. Ошибка!');
                return;
            }

            // Города и заправки нельзя перестать видеть
            if ((car.cls == 'Town') || (car.cls == 'GasStation')) return;

            // Удалить привязку к владельцу
            if (car.owner) car.owner.unbindCar(car);

            // Удаление машинки (убрать саму машинку из визуалменеджера)
            car.delFromVisualManager();

            if (car == user.userCar) user.userCar = null;
        }
    };

    ClientManager.prototype.Die = function (event) {
        // console.log('ClientManager.prototype.Die');
        modalWindow.modalDeathShow();
    };

    ClientManager.prototype.Chat = function (event){
        //console.log('ClientManager.prototype.Chat', event);
        //chat.addMessageByID(-1, getOwner(event.author), event.text);
        //chat.addMessageByID(-1, event.author, event.text);
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
        if (event.obj_id == user.userCar.ID){
            user.userCar.altitude = event.altitude;
        }
        else
            console.error('Error! Пришла высота на неизветную машинку!')
    };

    ClientManager.prototype.UpdateObservingRange = function(event){
//         console.log('ClientManager.prototype.UpdateObservingRange ', event);
        if (event.obj_id == user.userCar.ID){
            user.userCar.radius_visible = event.p_observing_range;
        }
        else
            console.error('Error! Пришло изменение радиуса обзора на неизветную машинку!')
    };

    ClientManager.prototype.FireDischarge = function (event) {
        //console.log('ClientManager.prototype.FireDischarge ', event);

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
            pos_obj: new Point(event.pos_obj.x, event.pos_obj.y),
            is_fake: event.is_fake
        });
    };

    ClientManager.prototype.ZoneMessage = function (event) {
//        console.log('ClientManager.prototype.ZoneMessage', event);
        wCruiseControl.setZoneState(event.in_zone, event.is_start);
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
        chat.party_info_message(event);
    };

    ClientManager.prototype.PartyIncludeMessageForIncluded = function (event) {
        //console.log('ClientManager.prototype.PartyIncludeMessageForIncluded', event);
        // изменить настройки своей пати для своего клиента
        if (! event.party) {console.error('Невозможно считать Party. Ошибка.'); return;}
        user.party = new OwnerParty(event.party.id, event.party.name);
        var widget_marker = visualManager.getVobjByType(user.userCar, WCarMarker);
        widget_marker.updateLabel();
        chat.page_party.buttons.create.text('Отряд');
        chat.party_info_message(event);
        // изменить иконки машинок для всех мемберов пати (в евенте для этого есть список мемберов)

        if (windowTemplateManager.isOpen('create_party'))
            windowTemplateManager.closeUniqueWindow('create_party');
        if (windowTemplateManager.isOpen('my_invites'))
            windowTemplateManager.closeUniqueWindow('my_invites');
        if (windowTemplateManager.isOpen('party_info'))
            windowTemplateManager.closeUniqueWindow('party_info');

        windowTemplateManager.openUniqueWindow('party', '/party', {page_type: 'party'});
        setTitleOnPage(); // обновить заголовок окна
    };

    ClientManager.prototype.PartyExcludeMessageForExcluded = function (event) {
        //console.log('ClientManager.prototype.PartyExcludeMessageForExcluded', event);
        user.party = null;
        var widget_marker = visualManager.getVobjByType(user.userCar, WCarMarker);
        widget_marker.updateLabel();
        chat.page_party.buttons.create.text('Создать');
        chat.party_info_message(event);
        // изменить иконки машинок для всех бывших мемберов пати
        if (windowTemplateManager.isOpen('party'))
            windowTemplateManager.closeUniqueWindow('party');
        if (windowTemplateManager.isOpen('my_invites'))
            windowTemplateManager.openUniqueWindow('my_invites', '/party', {page_type: 'my_invites'});

        setTitleOnPage(); // обновить заголовок окна
    };

    ClientManager.prototype.PartyKickMessageForKicked = function (event) {
        //console.log('ClientManager.prototype.PartyKickMessageForKicked', event);
        user.party = null;
        var widget_marker = visualManager.getVobjByType(user.userCar, WCarMarker);
        widget_marker.updateLabel();
        chat.page_party.buttons.create.text('Создать');
        chat.party_info_message(event);
        // изменить иконки машинок для всех бывших мемберов пати
        if (windowTemplateManager.isOpen('party'))
            windowTemplateManager.closeUniqueWindow('party');
        if (windowTemplateManager.isOpen('my_invites'))
            windowTemplateManager.openUniqueWindow('my_invites', '/party', {page_type: 'my_invites'});
    };

    ClientManager.prototype.PartyInviteMessage = function (event) {
        //console.log('ClientManager.prototype.PartyInviteMessage', event);
        chat.party_info_message(event);
        if (windowTemplateManager.isOpen('my_invites'))
            windowTemplateManager.openUniqueWindow('my_invites', '/party', {page_type: 'my_invites'});
    };

    ClientManager.prototype.PartyInviteDeleteMessage = function (event) {
        //console.log('ClientManager.prototype.PartyInviteDeleteMessage', event);
        chat.party_info_message(event);
        if (windowTemplateManager.isOpen('my_invites'))
            windowTemplateManager.openUniqueWindow('my_invites', '/party', {page_type: 'my_invites'});
    };

    ClientManager.prototype.PartyErrorMessage = function (event) {
        console.log('ClientManager.prototype.PartyErrorMessage', event);
        chat.party_info_message(event);
    };

    ClientManager.prototype.EnterToLocation = function (event) {
        //console.log('ClientManager.prototype.EnterToLocation', event);
        // POST запрос на получение города и вывод его на экран.
        // К этому моменту машинка уже удаляется или вот-вот удалится
        $.ajax({
            url: "http://" + location.host + '/api/location',
            data:  { location_id: event.location.uid },
            success: function(data) {
                //console.log('ClientManager.prototype.EnterToLocation Answer');

                if (locationManager.in_location)
                    clientManager.ExitFromLocation();

                $('#activeTownDiv').append(data);
                $('#activeTownDiv').css('display', 'block');
                locationManager.location_uid = event.location.uid;
                windowTemplateManager.closeAllWindows();
                locationManager.in_location = true;
                chat.showChatInTown();
                locationManager.visitorsManager.update_visitors();
                locationManager.nucoil.update();
                locationManager.armorer.update();
                locationManager.mechanic.update();
                locationManager.tuner.update();
                locationManager.trader.updatePlayerInv();
                locationManager.trader.updateTraderInv();
                locationManager.trader.updatePrice();
                locationManager.hangar.update();
            }
        });
    };

    ClientManager.prototype.ExitFromLocation = function () {
        //console.log('ClientManager.prototype.ExitFromTown', event);
        locationManager.in_location = false;
        locationManager.currentNpc = null;
        chat.showChatInMap();
        $('#activeTownDiv').empty();
        $('#activeTownDiv').css('display', 'none');
        locationManager.location_uid = null;
        locationManager.visitorsManager.clear_visitors();
        locationManager.nucoil.clear();
        locationManager.armorer.clear();
        locationManager.mechanic.clear();
        locationManager.tuner.clear();
        locationManager.trader.clear();
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

    ClientManager.prototype.ChangeLocationVisitorsMessage = function(event){
        //console.log('ClientManager.prototype.ChangeLocationVisitorsMessage', event);
        if (event.action)
            locationManager.visitorsManager.add_visitor(event.visitor);
        else
            locationManager.visitorsManager.del_visitor(event.visitor);
    };

    ClientManager.prototype.InventoryShowMessage = function (event) {
        //console.log('ClientManager.prototype.InventoryShowMessage', event);
        inventoryList.addInventory(this._getInventory(event.inventory));
    };

    ClientManager.prototype.InventoryHideMessage = function (event) {
        //console.log('ClientManager.prototype.InventoryHideMessage', event);
        inventoryList.delInventory(event.inventory_owner_id);
    };

    ClientManager.prototype.ExamplesShowMessage = function (event) {
        //console.log('ClientManager.prototype.ExamplesShowMessage', event);
        // Обновление баланса пользователя
        user.balance = event.agent_balance;
        if (event.inventory) {  // инвентарь может оказаться пустым, так как нет машинки
            var inv = this._getInventory(event.inventory);
            if (inventoryList.getInventory(inv.owner_id))
                inventoryList.delInventory(inv.owner_id);
            inventoryList.addInventory(inv);
            locationManager.nucoil.update();
            locationManager.armorer.update(event.armorer_slots, event.armorer_slots_flags);
            locationManager.mechanic.update(event.mechanic_slots);
            locationManager.tuner.update(event.tuner_slots);
            locationManager.trader.updatePlayerInv();
            locationManager.trader.updateTraderInv();
            locationManager.hangar.update();
        }
    };

    ClientManager.prototype.TraderInventoryShowMessage = function (event) {
        //console.log('ClientManager.prototype.TraderInventoryShowMessage', event);
        var inv = this._getInventory(event.inventory);
        locationManager.trader_uid = inv.owner_id;
        if (inventoryList.getInventory(inv.owner_id))
            inventoryList.delInventory(inv.owner_id);
        inventoryList.addInventory(inv);
        locationManager.trader.updateTraderInv();
        locationManager.trader.updatePrice(event.price.price)
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

    ClientManager.prototype.SetupTraderReplica = function (event) {
        //console.log('ClientManager.prototype.sendTraderCancel');
        locationManager.trader.setupTraderReplica(event.replica)
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

    ClientManager.prototype.InviteBarterMessage = function (event) {
        //console.log('ClientManager.prototype.InviteBarterMessage', event);
        if (contextPanel) {
            contextPanel.activate_barter_manager.add_barter(event.barter_id);
        }
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

    ClientManager.prototype.sendEnterToLocation = function (location_id) {
        //console.log('ClientManager.prototype.sendEnterToLocation');
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

    ClientManager.prototype.sendCreatePrivateChat = function (recipient) {
        var mes = {
            call: "create_private_chat",
            rpc_call_id: rpcCallList.getID(),
            params: {
                recipient: recipient
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

    ClientManager.prototype.sendShowInventory = function (owner_id) {
        //console.log('ClientManager.prototype.sendShowInventory');
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

    ClientManager.prototype.sendItemActionInventory = function(start_owner_id, start_pos, end_owner_id, end_pos) {
        //console.log('ClientManager.prototype.sendItemActionInventory');
        var mes = {
            call: "item_action_inventory",
            rpc_call_id: rpcCallList.getID(),
            params: {
                start_owner_id: start_owner_id,
                start_pos: start_pos,
                end_owner_id: end_owner_id,
                end_pos: end_pos
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

    ClientManager.prototype.sendFuelStationActive = function (fuel) {
        //console.log('ClientManager.prototype.sendFuelStationActive');
        var mes = {
            call: "fuel_station_active",
            rpc_call_id: rpcCallList.getID(),
            params: {
                tank_list: locationManager.nucoil.tank_list,
                fuel: fuel
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

    // Оружейник

    ClientManager.prototype.sendArmorerApply = function () {
        //console.log('ClientManager.prototype.sendArmorerApply');
        // todo: оптимизировать отправку
        var mes = {
            call: "armorer_apply",
            rpc_call_id: rpcCallList.getID(),
            params: {
                armorer_slots: locationManager.armorer.exportSlotState()
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendArmorerCancel = function () {
        //console.log('ClientManager.prototype.sendArmorerCancel');
        var mes = {
            call: "armorer_cancel",
            rpc_call_id: rpcCallList.getID()
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    // Механик

    ClientManager.prototype.sendMechanicApply = function () {
        //console.log('ClientManager.prototype.sendMechanicApply');
        // todo: оптимизировать отправку
        var mes = {
            call: "mechanic_apply",
            rpc_call_id: rpcCallList.getID(),
            params: {
                mechanic_slots: locationManager.mechanic.exportSlotState()
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendMechanicCancel = function () {
        //console.log('ClientManager.prototype.sendMechanicCancel');
        var mes = {
            call: "mechanic_cancel",
            rpc_call_id: rpcCallList.getID()
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };


    // Тюнер

    ClientManager.prototype.sendTunerApply = function () {
        //console.log('ClientManager.prototype.sendTunerApply');
        // todo: оптимизировать отправку
        var mes = {
            call: "tuner_apply",
            rpc_call_id: rpcCallList.getID(),
            params: {
                tuner_slots: locationManager.tuner.exportSlotState()
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendTunerCancel = function () {
        //console.log('ClientManager.prototype.sendTunerCancel');
        var mes = {
            call: "tuner_cancel",
            rpc_call_id: rpcCallList.getID()
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    // Торговец

    ClientManager.prototype.sendTraderApply = function () {
        //console.log('ClientManager.prototype.sendTraderApply');
        var mes = {
            call: "trader_apply",
            rpc_call_id: rpcCallList.getID(),
            params: {
                player_table: locationManager.trader.getPlayerTable(),
                trader_table: locationManager.trader.getTraderTable()
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendTraderCancel = function () {
        //console.log('ClientManager.prototype.sendTraderCancel');
        var mes = {
            call: "trader_cancel",
            rpc_call_id: rpcCallList.getID()
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    // Ангар

    ClientManager.prototype.sendHangarCarChoice = function () {
        //console.log('ClientManager.prototype.sendHangarCarChoice', car_number);
        var mes = {
            call: "choice_car_in_hangar",
            rpc_call_id: rpcCallList.getID(),
            params: {
                car_number: locationManager.hangar.current_car
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

    ClientManager.prototype.sendCancelBarter = function (barter_id) {
        //console.log('ClientManager.prototype.sendCancelBarter', barter_id);
        var mes = {
            call: "cancel_barter",
            rpc_call_id: rpcCallList.getID(),
            params: {
                barter_id: barter_id
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

    return ClientManager;
})();

var last_send_time = 0;