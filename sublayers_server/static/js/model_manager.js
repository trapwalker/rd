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
        }
    };

    ClientManager.prototype._contactStaticObject = function (event) {
        //console.log('ClientManager.prototype._contactRadioPoint', event);
        if (event.is_first) { // только если первый раз добавляется машинка
            var uid = event.object.uid;
            var radius_visible = event.object.r;
            var obj_marker;

            // Проверка: нет ли уже такого объекта.
            var obj = this._getMObj(uid);
            if (obj) return;

            // Создание объекта
            obj = new StaticObject(uid, new Point(event.object.position.x, event.object.position.y));
            obj.cls = event.object.cls;

            // Создание/инициализация виджетов
            obj_marker = new WCarMarker(obj); // виджет маркера
            if (wFireController) wFireController.addModelObject(obj); // добавить себя в радар

            // Установка надписи над статическим объектом. чтобы не плодить функции будем обходится IF'ами
            if (obj.cls == 'Town')
                obj_marker.updateLabel(event.object.town_name);
            if (obj.cls == 'RadioPoint')
                obj_marker.updateLabel('Radio Point');

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
            data.item.balance_cls
        )
    };

    ClientManager.prototype._getInventory = function (data) {
        var inv =  new Inventory(
            data.owner_id,
            data.max_size
        );
        for (var i=0; i < data.items.length; i++)
            inv.addItem(this._getItem(data.items[i]));
        return inv;
    };

    // Входящие сообщения

    ClientManager.prototype.Init = function (event) {
        //console.log('ClientManager.prototype.Init', event);
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
                chat.page_party.buttons.create.text('Отряд');
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
            case 'Town':
            case 'RadioPoint':
                this._contactStaticObject(event);
                break;
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

    ClientManager.prototype.ZoneMessage = function (event) {
        //console.log('ClientManager.prototype.ZoneMessage', event);
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

    ClientManager.prototype.EnterToTown = function (event) {
        //console.log('ClientManager.prototype.EnterToTown', event);
        var town_uid = event.town.uid;
        // POST запрос на получение города и вывод его на экран.
        // К этому моменту машинка уже удаляется или вот-вот удалится
        $.ajax({
            url: "http://" + location.host + '/api/town',
            data:  { town_id: event.town.uid },
            success: function(data){
                $('#activeTownDiv').append(data);
                $('#activeTownDiv').css('display', 'block');
                chat.showChatInTown();
                townVisitorsManager.update_visitors();
            }
        });
    };

    ClientManager.prototype.ExitFromTown = function (event) {
        //console.log('ClientManager.prototype.ExitFromTown', event);
        chat.showChatInMap();
        $('#activeTownDiv').empty();
        $('#activeTownDiv').css('display', 'none');
        townVisitorsManager.clear_visitors();

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

    ClientManager.prototype.ChangeTownVisitorsMessage = function(event){
        //console.log('ClientManager.prototype.TownChangeVisitor', event);
        if (event.action)
            townVisitorsManager.add_visitor(event.visitor);
        else
            townVisitorsManager.del_visitor(event.visitor);
    };

    ClientManager.prototype.InventoryShowMessage = function (event) {
        console.log('ClientManager.prototype.InventoryShowMessage', event);
        inventoryList.addInventory(this._getInventory(event.inventory));
    };

    ClientManager.prototype.InventoryHideMessage = function (event) {
        console.log('ClientManager.prototype.InventoryHideMessage', event);
        inventoryList.delInventory(event.inventory_owner_id);
    };

    ClientManager.prototype.InventoryItemMessage = function (event) {
        console.log('ClientManager.prototype.InventoryItemMessage', event);
        inventoryList.getInventory(event.owner_id).getItem(event.position).setState(this._getItemState(event.item));
    };

    ClientManager.prototype.InventoryAddItemMessage = function (event) {
        //console.log('ClientManager.prototype.InventoryAddItemMessage', event);
        inventoryList.getInventory(event.owner_id).addItem(this._getItem(event));
    };

    ClientManager.prototype.InventoryDelItemMessage = function (event) {
        //console.log('ClientManager.prototype.InventoryDelItemMessage', event);
        inventoryList.getInventory(event.owner_id).delItem(event.position);
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

    ClientManager.prototype.sendEnterToTown = function (town_id) {
        //console.log('ClientManager.prototype.sendEnterToTown');
        var mes = {
            call: "enter_to_town",
            rpc_call_id: rpcCallList.getID(),
            params: {
                town_id: town_id
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendExitFromTown = function (town_id) {
        var mes = {
            call: "exit_from_town",
            rpc_call_id: rpcCallList.getID(),
            params: {
                town_id: town_id
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendCreatePrivateChat = function(recipient) {
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

    ClientManager.prototype.sendClosePrivateChat = function(chat_name) {
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

    ClientManager.prototype.sendShowInventory = function(owner_id) {
        console.log('ClientManager.prototype.sendShowInventory');
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

    ClientManager.prototype.sendHideInventory = function(owner_id) {
        console.log('ClientManager.prototype.sendHideInventory');
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

    return ClientManager;
})();

var last_send_time = 0;