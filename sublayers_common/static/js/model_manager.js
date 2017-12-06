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
            if (data.cls === "User" || data.cls === "QuickUser" || data.cls === "AIQuickAgent" || data.cls === "TeachingUser" || data.cls === "AIAgent") {
                var party = null;
                if (data.party)
                    party = new OwnerParty(data.party.id, data.party.name);
                var owner = new Owner(data.uid, data.login, party, (data.cls === "QuickUser") || (data.cls === "TeachingUser"));
                owner.cls = data.cls;
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
        //console.log('ClientManager.prototype._contactBot', event.object.cls);
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
            if (user.userCar && car == user.userCar) {
                console.error('Contact Error: Своя машинка не должна получать Contact !!!!', event);
                return;
            }

            if (event.object.cls == "POICorpse")
                hp_state = new HPState(0, 0, 0, 0, 0);

            // Создание новой машинки
            car = new MapCar(uid, state, hp_state, fuel_state, v_forward, p_observing_range, aObsRangeRateMin, aObsRangeRateMax);
            car.role = event.object.role;
            car.cls = event.object.cls;
            car.sub_class_car = event.object.sub_class_car;
            car.main_agent_login = main_agent_login;

            if (aOwner)
                aOwner.bindCar(car);

            // Создание/инициализация виджетов
            if (car.cls == "Bot") {
                var t = new WCanvasCarMarker(car);
                new WCanvasHPCarMarker(car, t);

                // Отрисовка щита, если нужно
                if (event.object.active_shield_effect) {
                    new WCanvasAnimateMarkerShieldEffect(car);
                }
            }

            if (car.cls == "SlowMine" || car.cls == "BangMine") {
                new WCanvasMarker(car);
            }

            if ((car.cls == "Turret") || (car.cls == 'MaskingQuestTurret')) {
                var t = new WCanvasMarker(car);
                new WCanvasHPCarMarker(car, t);
            }
            if (car.cls == 'Radar') var t = new WCanvasMarker(car);

            if (car.cls == "Rocket") {
                car._icon_name = event.object.icon_name;
                new WCanvasRocketMarkerEffect(car);
            }

            if (car.cls == "POICorpse") {
                car.direction = event.object.car_direction + Math.PI / 2.;
                car._agent_login = event.object.agent_login
                new WCanvasLootMarker(car);
            }

            if (wFireController) wFireController.addModelObject(car); // добавить себя в радар
            if (contextPanel) contextPanel.addModelObject(car); // добавить себя в контекстную панель
        }
    };

    ClientManager.prototype._contactStaticObject = function (event) {
        //console.log('ClientManager.prototype._contactStaticObject', event);
        if (event.is_first) {
            var uid = event.object.uid;
            var obj_marker;

            // Проверка: нет ли уже такого объекта.
            var obj = this._getMObj(uid);
            if (obj) {
                // todo: оптимизировать это: либо удалять объекты при раздеплое машинки, либо вынести этот if вниз
                if (contextPanel) contextPanel.addModelObject(obj); // добавить себя в контекстную панель
                return;
            }

            // Создание и настройка маркера
            obj = new StaticObject(uid, new Point(event.object.position.x, event.object.position.y), 0);
            obj.cls = event.object.cls;
            obj.example = event.object.example;
            obj.p_observing_range = event.object.p_observing_range;

            if (event.object.hasOwnProperty('sub_class_car')) {
                obj.sub_class_car = event.object.sub_class_car;
            }

            switch (obj.cls) {
                case 'GasStation':
                case 'Town':
                    obj.title = event.object.example.title || 'GasStation';
                    obj.direction = - 2 * Math.PI;
                    obj_marker = new WCanvasStaticTownMarker(obj); // виджет маркера
                    obj.p_enter_range = event.object.example.p_enter_range;
                    break;
                case 'QuickGamePowerUpFullHeal':
                case 'QuickGamePowerUpFullFuel':
                case 'QuickGamePowerUpEffect':
                case 'QuickGamePowerUpShield':
                case 'QuickGamePowerUpAddItems':
                    obj.direction = 0;
                    obj._icon_name = event.object.icon_name || "icon-power-up-random";
                    new WCanvasAnimateMarkerPowerUp(obj);
                    break;
                case 'RadioPoint':
                    obj.direction = 0.5 * Math.PI;
                    break;
                //case 'POICorpse':
                //    obj.direction = event.object.car_direction + Math.PI / 2.;
                //    console.warn(1111, obj);
                //    break;
                case 'POILoot':
                case 'QuestPrivatePOILoot':
                    new WCanvasLootMarker(obj);
                    break;
                default:
                    console.warn(obj);
            }

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

    ClientManager.prototype._createNote = function (note) {
        //console.log('ClientManager.prototype._createNote', note);
        switch (note.cls) {
            case 'FirstOutNote':
                new QuestNoteFirstOut(note);
                break;
            case 'VisitTrainerNote':
                new QuestNoteVisitTrainer(note);
                break;
            case 'SelectTeacherNote':
                new QuestNoteSelectTeacher(note);
                break;
            case 'NPCDeliveryCarNote':
                new QuestNoteNPCBtnDeliveryCar(note);
                break;
            case 'NPCDeliveryNote':
                new QuestNoteNPCBtnDelivery(note);
                break;
            case 'NPCDeliveryNotePackage':
                new QuestNoteNPCBtnDeliveryPackage(note);
                break;
            case 'NPCDeliveryNoteCourier':
                new QuestNoteNPCBtnDeliveryCourier(note);
                break;
            case 'QuestNoteNPCCar':
                break;
            case 'NPCWantedNote':
                new QuestNoteNPCBtnKiller(note);
                break;
            case 'NPCWantedBossNote':
                new QuestNoteNPCBtnBossKiller(note);
                break;
            case 'NPCRewardItemsNote':
                new QuestNoteNPCRewardItems(note);
                break;
            case 'HangarTeachingNote':
                teachingManager.update(new HangarTeachingNote(note));
                break;
            case 'NukoilTeachingNote':
                teachingManager.update(new NukoilTeachingNote(note));
                break;
            case 'TraderTeachingNote':
                teachingManager.update(new TraderTeachingNote(note));
                break;
            case 'ArmorerTeachingNote':
                teachingManager.update(new ArmorerTeachingNote(note));
                break;
            case 'GetQuestTeachingNote':
                teachingManager.update(new GetQuestTeachingNote(note));
                break;
            case 'JournalTeachingNote':
                teachingManager.update(new JournalTeachingNote(note));
                break;
            case 'FinishQuestTeachingNote':
                teachingManager.update(new FinishQuestTeachingNote(note));
                break;
            case 'TrainerTeachingNote':
                teachingManager.update(new TrainerTeachingNote(note));
                break;
            case 'ExitBtnTeachingNote':
                teachingManager.update(new ExitBtnTeachingNote(note));
                break;
            case 'CruiseSpeedTeachingMapNote':
                teachingMapManager.update(new CruiseSpeedTeachingMapNote(note));
                break;
            case 'CruiseZoneTeachingMapNote':
                teachingMapManager.update(new CruiseZoneTeachingMapNote(note));
                break;
            case 'CruiseSpeedControlTeachingMapNote':
                teachingMapManager.update(new CruiseSpeedControlTeachingMapNote(note));
                break;
            case 'CruiseSpeedBtnTeachingMapNote':
                teachingMapManager.update(new CruiseSpeedBtnTeachingMapNote(note));
                break;
            case 'DrivingControlTeachingMapNote':
                teachingMapManager.update(new DrivingControlTeachingMapNote(note));
                break;
            case 'CruiseRadialTeachingMapNote':
                teachingMapManager.update(new CruiseRadialTeachingMapNote(note));
                break;
            case 'ZoomSliderTeachingMapNote':
                teachingMapManager.update(new ZoomSliderTeachingMapNote(note));
                break;
            case 'DischargeShootingTeachingMapNote':
                teachingMapManager.update(new DischargeShootingTeachingMapNote(note));
                break;
            case 'AutoShootingTeachingMapNote':
                teachingMapManager.update(new AutoShootingTeachingMapNote(note));
                break;
            case 'TryKillTeachingMapNote':
                teachingMapManager.update(new TryKillTeachingMapNote(note));
                break;
            case 'TryGameTeachingMapNote':
                teachingMapManager.update(new TryGameTeachingMapNote(note));
                break;
            case 'MapMarkerNote':
                //console.log('MapMarkerNote', note);
                var quest = journalManager.quests.getQuest(note.quest_uid);
                var rad_note = new QuestMapMarkerNote({
                    quest_uid: note.quest_uid,
                    uid: note.uid,
                    position: note.position,
                    radius: note.radius,
                    icon_full: quest && quest.map_icon_full,
                    icon_circle: quest && quest.map_icon_circle,
                    focus_caption: quest && quest.caption
                });
                rad_note.is_active = quest && quest.active_notes_view;
                break;
            case 'MaskingMapMarkerNote':
                // console.log('MaskingMapMarkerNote', note.position);
                var quest = journalManager.quests.getQuest(note.quest_uid);
                var rad_note = new QuestMCMapMarkerNote({
                    quest_uid: note.quest_uid,
                    uid: note.uid,
                    position: note.position,
                    radius: note.radius,
                    icon_full: quest && quest.map_icon_full,
                    icon_circle: quest && quest.map_icon_circle,
                    focus_caption: ''
                });
                rad_note.is_active = quest && quest.active_notes_view;
                break;
            case 'MaskingTurretMapMarkerNote':
                // console.log('MaskingTurretMapMarkerNote', note.position);
                var quest = journalManager.quests.getQuest(note.quest_uid);
                var rad_note = new QuestMTMapMarkerNote({
                    quest_uid: note.quest_uid,
                    uid: note.uid,
                    position: note.position,
                    radius: note.radius,
                    icon_full: quest && quest.map_icon_full,
                    icon_circle: quest && quest.map_icon_circle,
                    focus_caption: ''
                });
                rad_note.is_active = quest && quest.active_notes_view;
                break;
            case 'QuestRadiationNPCFinish':
                new QuestNoteNPCBtnRadiation(note);
                break;
            case 'MapActivationNoteFinish':
                new QuestNoteNPCBtn(note); // todo: заменить на правильную ноту, когда появится
                break;
            case 'MapActivationRadarsNoteFinish':
                new MapActivationRadarsNoteFinish(note);
                break;
            case 'GetClassCarQuestNote':
                new QuestNoteNPCBtnClassCar(note);
                break;
            case 'GetMaxCarLvlQuestNote':
                new QuestNoteNPCBtnCarMaxLevel(note);
                break;
            case 'AccumulateNucoinsQuestNote':
                new AccumulateNucoinsQuestNote(note);
                break;
            case 'KillsClassQuestNote':
                new KillsClassQuestNote(note);
                break;
            case 'GetPartyExpQuestNote':
                new GetPartyExpQuestNote(note);
                break;
            case 'SetMechanicItemsQuestNote':
                new SetMechanicItemsQuestNote(note);
                break;
            case 'InvisibleAttackQuestNote':
                new InvisibleAttackQuestNote(note);
                break;
            case 'VisitTownsQuestNote':
                new VisitTownsQuestNote(note);
                break;
            case 'MaskingNPCQuestNote':
                new QuestNoteMaskingNPC(note);
                break;
            case 'ShadowingQuestNote':
                new ShadowingQuestNote(note);
                break;
            case 'BarterSuccessQuestNote':
                new BarterSuccessQuestNote(note);
                break;
            case 'DamageMapWeaponQuestNote':
                new DamageMapWeaponQuestNote(note);
                break;
            case 'PartyMembersQuestNote':
                new PartyMembersQuestNote(note);
                break;
            case 'SetMapWeaponQuestNote':
                new SetMapWeaponQuestNote(note);
                break;
            case 'NPCsTasksCompleteQuestNote':
                new NPCsTasksCompleteQuestNote(note);
                break;
            case 'KarmaLimitQuestNote':
                new KarmaLimitQuestNote(note);
                break;
            case 'NPCPageNote':
                new QuestNoteNPCBtn(note);
                break;
            default:
                console.warn('Неопределён тип ноты:', note.cls)
        }
    };

    // Входящие сообщения

    ClientManager.prototype.RefreshMessage = function (event) {
        console.log('ClientManager.prototype.RefreshMessage: ', event.comment);
        setTimeout(function(){window.location.reload()}, 2000) ;
    };

    ClientManager.prototype.InitAgent = function(event){
        //console.log('ClientManager.prototype.InitAgent', event);
        // Инициализация Юзера
        if (event.agent.cls == "User" || event.agent.cls == "QuickUser" || event.agent.cls == "TeachingUser") {
            user.login = event.agent.login;
            user.ID = event.agent.uid;
            user.balance = event.agent.balance;
            user.quick = (event.agent.cls == "QuickUser") || (event.agent.cls == "TeachingUser");

            if (event.agent.party) {
                user.party = new OwnerParty(event.agent.party.id, event.agent.party.name);
                this.sendGetPartyInfo(event.agent.party.name);
            }
            timeManager.timerStart(settingsManager.options["fps_rate"].value);
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

        textConsoleManager.async_stop();

        if (!user.userCar) {
            // Очистить эффекты стрельбы из прошлой жизни
            if (fireEffectManager) fireEffectManager.clear();

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
            mcar.cls = event.car.cls;
            mapCanvasManager.on_new_map_size();

            // Установка звука движка
            if (event.car.audio_engine)
                mcar.engine_audio = event.car.audio_engine;

            // Виджеты:
            //new WCarMarker(mcar);    // виджет маркера
            //new WCanvasCarMarker(mcar);
            var t = new WCanvasCarMarker(mcar);
            new WCanvasHPCarMarker(mcar, t);

            // Виджет позиционирования карты
            if (!wMapPosition) wMapPosition = new WMapPosition();
            wMapPosition.addModelObject(mcar);

            // Отирсовка щита, если нужно
            if (event.car.active_shield_effect) {
                new WCanvasAnimateMarkerShieldEffect(mcar);
            }

            // Круиз
            wCruiseControl = new WCruiseControl(mcar, 'cruiseControlGlassDiv');
            wAltmetrControl = new WAltmetrRadial(mcar, 'divForAltmetrRadial');
            wHPControl = new WHPRadial(mcar, 'divForHpAndFuelRadials');
            wFuelControl = new WFuelRadial(mcar, 'divForHpAndFuelRadials');
            wRadiationControl = new WRadiationRadial(mcar, 'divForRadAndWindRadials');
            wWindControl = new WWindRadial(mcar, 'divForRadAndWindRadials');

            // todo: сделать также зависимось от бортов
            wFireController = new WFireController(mcar);  // виджет радар и контроллер стрельбы
            wFireController.updateQuickConsumerPanel(event.car.quick_consumer_panel);
            wFireController.updateStateAutoShooting(event.auto_shooting_state);

            wRumble = new WRumble(mcar); // виджет-тряски

            if (mapManager.current_route) mapManager.current_route.delFromVisualManager();
            mapManager.current_route = null;

            if (mcar.fireSidesMng.getSectors(null, true, true).length > 0) {
                mapManager.widget_fire_sectors = new WCanvasFireSectorsScaled(mcar);
                mapManager.widget_fire_radial_grid = new WFCanvasireRadialGrid(mcar);

                mapManager.setZoom(mapManager.getZoom(), true);
            }

            // Инициализация виджетов работы с канвасом
            if (!wObservingRange) wObservingRange = new WObservingRange();
            wObservingRange.addModelObject(mcar);

            //if (!wRadiationEffect) wRadiationEffect = new WRadiationEffect();
            if (!wRadiationNoise) wRadiationNoise = new WRadiationNoise();

            // Инициализация контекстной панели
            contextPanel = new ContextPanel();

            // Инициализация мап-зума
            var curr_cord = mcar.getCurrentCoord(clock.getCurrentTime());
            mapManager.set_coord({x: curr_cord.x, y: curr_cord.y});

            returnFocusToMap();
        }

        // Если авто-воскрешение включено, то включить автострельбу
        if (settingsManager.options["auto_resurrection"].value) {
            setTimeout(function () {
                // Включить авто-стрельбу
                controlManager.actions.toggle_auto_fire.up();
            }, 3000);
        }

        // Google Analytics
        analytics.main_init_car();
        analytics.sit_town_duration('off');
        analytics.sit_map_duration('on');
        analytics.drive_only_mouse(false);
    };

    ClientManager.prototype.Update = function (event) {
        //console.log('ClientManager.prototype.Update', event);
        var motion_state = this._getState(event.object.state);
        var hp_state = this._getHPState(event.object.hp_state);
        var fuel_state = this._getFuelState(event.object.fuel_state);

        var uid = event.object.uid;
        var car = visualManager.getModelObject(uid);

        if (!car) {
            //console.error('Update Error: Машины с данным id не существует на клиенте. Ошибка! uid=', uid, event);
            return;
        }

        // Обновить машинку и, возможно, что-то ещё (смерть или нет и тд)
        if (motion_state) car.setState(motion_state);
        if (hp_state) car.setHPState(hp_state);

        // Если своя машинка
        if (user.userCar && car == user.userCar) {
            car.setFuelState(fuel_state);
            // Считать таргет поинт и включить/выключить виджет таргет_поинта
            var tp = event.object.target_point;
            if (mapManager.current_route) {
                //console.log("ClientManager.prototype.Update", tp);
                if (tp != undefined && tp != null)
                    mapManager.current_route.activate(tp);
                else
                    mapManager.current_route.deactivate();
            }

            // При попадании залповым орудием включить эффект тряски
            if (hp_state.dhp && (hp_state.dhp > 0)) {
                wRumble.startDischargeRumble();
                wMapPosition.random_shift();
                setTimeout(function () { wMapPosition.random_shift();}, 150);
            }

            // Установка cc для круизконтроля
            if (event.object.params) wCruiseControl.setSpeedRange(event.object.params.p_cc);
        }

        // Если появился или исчез щит
        var vo = visualManager.getVobjByType(car, WCanvasAnimateMarkerShieldEffect);
        if (event.object.active_shield_effect && !vo) new WCanvasAnimateMarkerShieldEffect(car);
        if (!event.object.active_shield_effect && vo) vo.delFromVisualManager();
    };

    ClientManager.prototype.See = function (event) {
        //console.log('ClientManager.prototype.See', event);
        if (user.userCar == null && event.object.cls != "POICorpse") {
            //console.warn('Контакт ивент до инициализации своей машинки!');
            return;
        }

        switch (event.object.cls) {
            case 'Bot':
            case 'Rocket':
            case 'ScoutDroid':
            case 'Turret':
            case 'MaskingQuestTurret':
            case 'Radar':
            case 'SlowMine':
            case 'BangMine':
            case 'POICorpse':
            case 'Mobile':
                this._contactBot(event);
                break;
            case 'RadioPoint':  // todo: раскоментировать, когда радиоточки будут установлены или сделать через куки-настройки
                //console.log('Radio Towers are hidden');
                break;
            case 'StationaryQuickRadiation': break;
            case 'StationaryRadiation': break;
            case 'Town':
            case 'POILoot':
            case 'QuestPrivatePOILoot':
            case 'POIContainer':
            case 'GasStation':
                this._contactStaticObject(event);
                break;
            case 'QuickGamePowerUpFullHeal':
            case 'QuickGamePowerUpFullFuel':
            case 'QuickGamePowerUpEffect':
            case 'QuickGamePowerUpShield':
            case 'QuickGamePowerUpAddItems':
                this._contactStaticObject(event);
                break;
            default:
            console.warn('Контакт с неизвестным объектом ', event.object);
        }
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
        //console.log('ClientManager.prototype.Die', event);
        modalWindow.closeAllWindows();
        windowTemplateManager.closeAllWindows();
        
        // Google Analytics
        analytics.death();

        if (event.insurance.node_hash == 'reg:///registry/items/quest_item/insurance/premium')
            textConsoleManager.start('die_premium', 3000, event);
        else if (event.insurance.node_hash == 'reg:///registry/items/quest_item/insurance/shareholder')
            textConsoleManager.start('die_shareholder', 3000, event);
        else if (event.insurance.node_hash == 'reg:///registry/items/quest_item/insurance/base')
            textConsoleManager.start('die_base', 3000, event);
        else {
            alert('Bad Insurance: ' + event.insurance);
            location.reload();
        }

    };

    ClientManager.prototype.QuickGameDie = function (event) {
        //console.log('ClientManager.prototype.QuickGameDie', event);
        modalWindow.closeAllWindows();
        windowTemplateManager.closeAllWindows();
        setTimeout(function () {
            modalWindow.modalQuickGamePointsPageShow({
                quick_users: event.quick_users,
                points: event.points,
                login: event.login,
                record_index: event.record_index,
                current_car_index: event.current_car_index,
                callback_ok: function () {
                    clientManager.sendQuickPlayAgain();
                    modalWindow.modalQuickGamePointsPageHide();
                },
                callback_cancel: function () {
                    window.location = '/#start';
                }
            });
        }, 200);

        new WTextArcade(_("ta_death")).start();

        // Запуск авто-воскрешения
        if (settingsManager.options["auto_resurrection"].value) {
            setTimeout(function() {
                if (!user.userCar) {
                    clientManager.sendQuickPlayAgain();
                    modalWindow.modalQuickGamePointsPageHide();                    
                }
            }, 5000);
        }
    };

    ClientManager.prototype.SetMapCenterMessage = function (event) {
        //console.log('ClientManager.prototype.SetMapCenterMessage', event);
        setTimeout(function () {
            if (! user.userCar)
                mapManager.set_coord({x: event.center.x, y: event.center.y});
        }, 500);
    };

    ClientManager.prototype.DieVisualisationMessage  = function (event) {
        //console.log('ClientManager.prototype.DieVisualisationMessage', event);
        var uid = event.object_id;
        var obj = visualManager.getModelObject(uid);
        if (!obj) return;
        var position = obj.getCurrentCoord(clock.getCurrentTime());
        var dir = obj.getCurrentDirection(clock.getCurrentTime());   
        if (event.direction == null) {
            // Если взрыв не направленный
            new ECanvasDieVisualisation(position).start();
            // Вызвать звук смерти от автоматической стрельбы
            var distance = 1;
            if (user.userCar && user.userCar.ID != uid) // Если умерла своя машинка
                distance = distancePoints(user.userCar.getCurrentCoord(clock.getCurrentTime()), position);
            if (distance <= 2000) {
                // 0.3/0.8 - минимальная/максимальная громкость звука
                var gain = 0.3 + (0.9 - 0.3) * (1 - distance / 2000);
                // 0.2/0.4 - границы рандома рэйта
                var rate = 0.2 + (0.4 - 0.2) * Math.random();

                audioManager.play({name: "shot_03", gain: gain * audioManager._settings_bang_gain, playbackRate: rate, priority: 0.8});
            }
        }
        else {
            // Если взрыв направленный
            new ECanvasDieVisualisationOriented(position, event.direction + Math.PI / 2.).start()
        }
    };

    ClientManager.prototype.StartQuickGame = function(event) {
        console.log('ClientManager.prototype.StartQuickGame', event);
        modalWindow.modalQuickGameMapTeachingPageShow({
            callback_ok: function () {
                clientManager.sendQuickTeachingAnswer(true);
            },
            callback_cancel: function() {
                clientManager.sendQuickTeachingAnswer(false);
            }
        });
    };

    ClientManager.prototype.QuickGameChangePoints = function(event) {
        //console.log('ClientManager.prototype.QuickGameChangePoints', event);
        // Так делать нельзя! Нехорошо так записывать в объект разную инфу!
        if (this._quick_game_points_info && this._quick_game_points_info.quick_game_bonus_points != event.quick_game_bonus_points) {
            // Если был начислен бонус, то вывести текст об этом
            var points = event.quick_game_bonus_points - this._quick_game_points_info.quick_game_bonus_points;
            if (points > 0)
                new WTextArcade("+" + points + " " + _("ta_points")).start();
        }

        this._quick_game_points_info = event;
        if (!this._quick_game_points_info_interval) {
            this._quick_game_points_info_last = 0;
            this._quick_game_points_info_interval = setInterval(function () {
                var self = clientManager._quick_game_points_info;
                var res = (clock.getCurrentTime() - self.time_quick_game_start) * self.quick_game_koeff_time +
                    self.quick_game_kills * self.quick_game_koeff_kills +
                    self.quick_game_bot_kills * self.quick_game_koeff_bot_kills +
                    self.quick_game_bonus_points;
                res = res.toFixed(0);
                if (res != clientManager._quick_game_points_info_last && user.userCar) {
                    $("#QGPointsSpan").text(res);
                    $("#QGKillsSpan").text((self.quick_game_kills + self.quick_game_bot_kills).toFixed(0));
                    clientManager._quick_game_points_info_last = res;
                }
            }, 500);
        }
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
        //console.log('ClientManager.prototype.AgentConsoleEchoMessage :', event.comment);
        chat.addMessageToSys(event.comment);
    };

    ClientManager.prototype.QuickGameArcadeTextMessage = function (event){
        //console.log('ClientManager.prototype.QuickGameArcadeTextMessage :', event.comment);
        new WTextArcade(event.text).start();
    };

    // todo: эффекты вынести потом в отдельный модуль
    ClientManager.prototype.Bang = function (event){
        //console.log('ClientManager.prototype.Bang', event);
        var bang_position = new Point(event.position.x, event.position.y);
        new ECanvasHeavyBangPNG_3(bang_position).start();

        // Звук
        var distance = user.userCar ? distancePoints(user.userCar.getCurrentCoord(clock.getCurrentTime()), bang_position) : 2000;
        if (distance <= 2000) {
            // 0.2/1.0 - минимальная/максимальная громкость звука
            var gain = 0.2 + (1.0 - 0.2) * (1. - distance/2000.);
            // 0.35/0.6 - границы рэйта
            var rate = 0.6 - (0.6 - 0.35) * (1. - distance/2000.);
            audioManager.play({name: "shot_03", gain: gain * audioManager._settings_bang_gain, playbackRate: rate, priority: 0.7});

        }
    };

    ClientManager.prototype.TownAttackMessage = function (event){
        //console.log('ClientManager.prototype.TownAttackMessage', event);
        new ETownRocket(event.town_pos, event.target_pos, event.target_id, event.duration,
            function(bang_position){new ECanvasHeavyBangPNG_1(bang_position).start();}
        ).start();

    };

    ClientManager.prototype.ChangeAltitude = function(event){
        // console.log('ClientManager.prototype.ChangeAltitude ', event);
        if (event.obj_id == user.userCar.ID){
            user.userCar.altitude = event.altitude;
        }
        else
            console.warn('Error! Пришла высота на неизветную машинку!')
    };

    ClientManager.prototype.ChangeStealthIndicator = function(event){
        // console.log('ClientManager.prototype.ChangeStealthIndicator ', event.stealth);
        if (user.userCar) {
            user.userCar.stealth_indicator = event.stealth;
            user.userCar.change();
        }
    };

    ClientManager.prototype.ChangeRadiation = function(event){
         //console.log('ClientManager.prototype.ChangeRadiation ', event);
        if (user.userCar && event.obj_id == user.userCar.ID){
            user.userCar.radiation_dps += event.radiation_dps;
            if (user.userCar.radiation_dps != 0.0 && !basic_server_mode)
                setTimeout(function() { // Из-за особенностей быстрой игры
                    if (user.userCar && user.userCar.radiation_dps != 0.0)
                        new WTextArcade(_("ta_out_battle")).start();
                }, 500);

        }
        else
            console.warn('Warning! Пришла радиация на неизветную машинку!')
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
            console.warn('Серверное время больше клиентского при выстреле.');
            //console.error('server event time = ', etime);
            //console.error('client pure  time = ', clock.getClientTime() / 1000.);
            //console.error('clnt with dt time = ', clock.getCurrentTime());
        }
        // todo: отфильтровать, так как могло прийти не для своей машинки
        user.userCar.setShootTime(event.side, etime, event.t_rch);
    };

    ClientManager.prototype.FireAutoEffect = function (event) {
        //console.log('ClientManager.prototype.FireAutoEffect', event.action, event);
        if (event.action)
            fireEffectManager.addController({
                subj: event.subj,
                obj: event.obj,
                side: event.side,
                weapon_animation: event.weapon_animation,
                animation_tracer_rate: event.animation_tracer_rate,
                weapon_id: event.weapon_id,
                weapon_audio: event.weapon_audio,
            });
        else
            fireEffectManager.delController({
                subj: event.subj,
                obj: event.obj,
                side: event.side,
                weapon_animation: event.weapon_animation,
                animation_tracer_rate: event.animation_tracer_rate,
                weapon_id: event.weapon_id,
                weapon_audio: event.weapon_audio,
            });
    };

    ClientManager.prototype.FireDischargeEffect = function (event) {
        //console.log('ClientManager.prototype.FireDischargeEffect', event);
        fireEffectManager.fireDischargeEffect({
            pos_subj: new Point(event.pos_subj.x, event.pos_subj.y),
            targets: event.targets,
            fake_position: event.fake_position,
            weapon_animation: event.weapon_animation,
            self_shot: event.self_shot,
            weapon_audio: event.weapon_audio
        });
    };

    ClientManager.prototype.ZoneMessage = function (event) {
        // console.log('ClientManager.prototype.ZoneMessage', event);
        wCruiseControl.setZoneState(event.in_zone, event.is_start);

        // Google Analytics
        if (event.in_zone == 'road')
            if (event.is_start)
                analytics.drive_on_road('on');
            else
                analytics.drive_on_road('off');
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
        // console.log('ClientManager.prototype.AgentPartyChangeMessage', event);
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

        chat.party_info_message(event);
        partyManager.include_to_party(event.party);

        // Google Analytics
        analytics.party_enter();
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

    ClientManager.prototype.PreEnterToLocation = function (event) {
        //console.log('ClientManager.prototype.PreEnterToLocation', event);
        locationManager.load_city_image = false;

        function complete(load) {
            locationManager.load_city_image = true;
            if (locationManager.in_location_flag)
                textConsoleManager.async_stop();
        }

        if (event.static_image_list.length == 0)
            complete(true);
        else {
            preloaderImage.add_list(event.static_image_list, complete, 10000);
            textConsoleManager.start('enter_location', 3000);
        }
    };

    ClientManager.prototype.EnterToLocation = function (event) {
        // console.log('ClientManager.prototype.EnterToLocation', event);
        locationManager.onEnter(event);
        mapCanvasManager.is_canvas_render = false;

        // Google Analytics
        analytics.enter_to_location(event.location.uid);
        analytics.sit_town_duration('on');
        analytics.sit_map_duration('off');
        analytics.drive_on_road('off');
    };

    ClientManager.prototype.ChangeAgentKarma = function (event) {
        console.log('ClientManager.prototype.ChangeAgentKarma', event);
        if (locationManager.in_location_flag)
            locationManager.npc_relations = event.relations;
        user.example_agent.rpg_info.karma = event.karma;
        characterManager.redraw();
    };

    ClientManager.prototype.ExitFromLocation = function () {
        //console.log('ClientManager.prototype.ExitFromTown', event);
        textConsoleManager.start('enter_map', 2000);
        // todo: fix this
        setTimeout(function () {
            locationManager.onExit();
            mapCanvasManager.is_canvas_render = true;
        }, 10);
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
        if (locationManager.in_location_flag &&
            ((inventory.owner_id == user.ID) || (inventory.owner_id == locationManager.uid)))
            locationManager.update();
    };

    ClientManager.prototype.InventoryHideMessage = function (event) {
        //console.log('ClientManager.prototype.InventoryHideMessage', event);
        inventoryList.delInventory(event.inventory_owner_id);
        if (event.inventory_owner_id == user.ID && locationManager.in_location_flag) {
            //console.log('Очистить инвентарь агента у торговца');
            var npc_list = locationManager.get_npc_by_type(LocationTraderNPC);
            for (var i = 0; i < npc_list.length; i++)
                npc_list[i].clear_agent_assortment();
        }
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

        if (locationManager.in_location_flag && event.owner_id == user.ID) locationManager.update();
    };

    ClientManager.prototype.InventoryAddItemMessage = function (event) {
        //console.log('ClientManager.prototype.InventoryAddItemMessage', event);
        var inventory = inventoryList.getInventory(event.owner_id);
        if (inventory)
            inventory.addItem(this._getItem(event));
        else
            console.warn('Неизвестный инвентарь (ownerID =', event.owner_id, ')');

        if (locationManager.in_location_flag && event.owner_id == user.ID) locationManager.update();
    };

    ClientManager.prototype.InventoryDelItemMessage = function (event) {
        //console.log('ClientManager.prototype.InventoryDelItemMessage', event);
        var inventory = inventoryList.getInventory(event.owner_id);
        if (inventory)
            inventory.delItem(event.position);
        else
            console.warn('Неизвестный инвентарь (ownerID =', event.owner_id, ')');

        if (locationManager.in_location_flag && event.owner_id == user.ID) locationManager.update();
    };

    ClientManager.prototype.GasStationUpdate = function (event) {
        //console.log('ClientManager.prototype.GasStationUpdate', event);
        initGasStation(event.balance, event.fuel);
    };

    ClientManager.prototype.NPCReplicaMessage = function (event) {
        //console.log('ClientManager.prototype.NPCReplicaMessage', event);
        if (! locationManager.in_location_flag) {
            console.warning('Replica outside location: ', event);
            return;
        }
        var curr_place = locationManager.get_current_active_place();
        var npc = event.npc_node_hash == null ? null : locationManager.get_npc_by_node_hash(event.npc_node_hash);
        if (! curr_place) {
            console.warning('Replica outside building or npc: ', event);
            return;
        }

        if ((npc == null) || (curr_place == npc) || (curr_place instanceof LocationPlaceBuilding &&
            curr_place.building_rec.head.node_hash == npc.npc_rec.node_hash)) {
            curr_place.set_header_text($('<div>' + event.replica + '</div>'));

            if (event.replica_type == 'Error') {
                audioManager.play({name: "npc_transaction_fail", gain: 1.0 * audioManager._settings_interface_gain, priority: 1.0});
            }
        }

    };

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
        new WTextArcadeStatBarterSucces().start();
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
        if (wFireController) wFireController.updateQuickConsumerPanel(event.quick_panel);
    };

    ClientManager.prototype.NPCTransactionMessage = function (event) {
        //console.log('ClientManager.prototype.NPCTransactionMessage', event);
        if (locationManager.npc.hasOwnProperty(event.npc_html_hash)) {
            locationManager.npc[event.npc_html_hash].add_transaction(event.info_string);
            // Звук успешного завершения транзакции
            audioManager.play({name: "npc_transaction_finish", gain: 1.0 * audioManager._settings_interface_gain, priority: 1.0});
            
            // Google Analytics
            var npc = locationManager.npc[event.npc_html_hash];
            if (npc instanceof LocationHangarNPC)
                analytics.transaction_hangar();
            else if (npc instanceof LocationTraderNPC)
                analytics.transaction_trader();
            else if (npc instanceof LocationTrainerNPC)
                analytics.transaction_library();
            else if (npc instanceof LocationArmorerNPC)
                analytics.transaction_armorer();
            else 
                analytics.transaction_npc();
        }
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
        if (event.rpg_car_info)
            user.example_car.car_rpg_info = event.rpg_car_info;
        setOptions(event.example_agent, user.example_agent);
        user.avatar_link = event.avatar_link;
        if (event.example_car && event.templates) {
            user.templates.html_car_img = event.templates.html_car_img;
            user.templates.html_car_table = event.templates.html_car_table;
        }
        user.car_npc_info = event.hasOwnProperty('car_npc_info') ? event.car_npc_info : null;

        this.UserExampleSelfRPGMessage(event);
    };

    ClientManager.prototype.UserExampleSelfRPGMessage = function(event) {
        //console.log('ClientManager.prototype.UserExampleSelfShortMessage', event);
        setOptions(event.rpg_info, user.example_agent.rpg_info);
        characterManager.redraw();
        locationManager.update();
    };

    ClientManager.prototype.UserChangeEXP = function(event) {
        //console.log('ClientManager.prototype.UserChangeEXP', event);
        setOptions(event.data, user.example_agent.rpg_info);
        characterManager.redraw();
        locationManager.update();
        new WTextArcadeStatReceiveExp().start();
    };

    ClientManager.prototype.UserChangePerkSkill = function(event) {
        //console.log('ClientManager.prototype.UserChangePerkSkill', event);
        setOptions(event.rpg_info, user.example_agent.rpg_info);
        characterManager.redraw();
        locationManager.update();
    };

    ClientManager.prototype.UserGetAboutSelf = function(event) {
        //console.log('ClientManager.prototype.UserGetAboutSelf', event);
        user.example_agent.about_self = event.about_self;
        characterManager.redraw();
        locationManager.update();
    };

    ClientManager.prototype.UserExampleChangeInsurance = function(event) {
        //console.log('ClientManager.prototype.UserExampleChangeInsurance', event);
        user.example_agent.insurance = event.insurance;
        //characterManager.redraw();
        locationManager.update();
    };

    ClientManager.prototype.UserChangeQuestInventory = function(event) {
        //console.log('ClientManager.prototype.UserChangeQuestInventory', event);
        setOptions(event.data, user.example_agent.rpg_info);
        characterManager.redraw();
        locationManager.update();
    };

    ClientManager.prototype.UserExampleCarInfo = function(event) {
        // console.log('ClientManager.prototype.UserExampleCarInfo', event);
        user.example_car = event.example_car;
        if (event.rpg_car_info)
            user.example_car.car_rpg_info = event.rpg_car_info;
        locationManager.update();
    };

    ClientManager.prototype.CarRPGInfo = function(event) {
        // console.log('ClientManager.prototype.CarRPGInfo', event);
        if (user.example_car && user.example_car.car_rpg_info && user.example_car.uid == event.uid) {
            user.example_car.car_rpg_info["lvl"] = event.lvl;
            user.example_car.car_rpg_info["way"] = event.way;
        }
        else
            console.warning("Miss Message:", event);

        if (locationManager.in_location_flag)locationManager.update();
    };

    ClientManager.prototype.UserExampleCarView = function(event) {
        //console.log('ClientManager.prototype.UserExampleCarView', event);
        setOptions(event.templates, user.templates);
        locationManager.update();
    };

    ClientManager.prototype.UserExampleCarSlots = function(event) {
        //console.log('ClientManager.prototype.UserExampleCarSlots', event);
        user.car_npc_info = event.hasOwnProperty('car_npc_info') ? event.car_npc_info : null;
        locationManager.update();
    };

    ClientManager.prototype.UserExampleCarNPCTemplates = function(event) {
        //console.log('ClientManager.prototype.UserExampleCarNPCTemplates', event);
        setOptions(event.templates, user.templates);
        locationManager.update();
    };

    ClientManager.prototype.UserActualTradingMessage = function (event) {
        //console.log('ClientManager.prototype.UserActualTradingMessage', event);
        user.actual_trading = event.trading;
    };

    ClientManager.prototype.HangarInfoMessage = function (event) {
        //console.log('ClientManager.prototype.HangarInfoMessage', event);
        if (locationManager.npc.hasOwnProperty(event.npc_html_hash)) {
            locationManager.npc[event.npc_html_hash].update(event);
        }
    };

    ClientManager.prototype.HangarAddLotMessage = function (event) {
        //console.log('ClientManager.prototype.HangarAddLotMessage', event);
        if (locationManager.npc.hasOwnProperty(event.npc_html_hash)) {
            locationManager.npc[event.npc_html_hash].add_lot(event);
        }
    };

    ClientManager.prototype.HangarDelLotMessage = function (event) {
        //console.log('ClientManager.prototype.HangarAddLotMessage', event);
        if (locationManager.npc.hasOwnProperty(event.npc_html_hash)) {
            locationManager.npc[event.npc_html_hash].del_lot(event);
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
        var curr_place = locationManager.get_current_active_place();
        var npc = locationManager.get_npc_by_node_hash(event.npc_node_hash);
        if (curr_place && npc && npc == curr_place && curr_place.bag_place) {
            npc.bag_place.activate();
            npc.bag_place.update(event);
        }
    };

    ClientManager.prototype.TraderInfoMessage = function (event) {
        //console.log('ClientManager.prototype.TraderInfoMessage', event);
        var trader = locationManager.npc[event.npc_html_hash];
        user.example_agent.balance = event.agent_balance;
        if (trader) trader.updatePrice(event)
    };

    ClientManager.prototype.TraderAgentAssortmentMessage = function (event) {
        //console.log('ClientManager.prototype.TraderAgentAssortmentMessage', event);
        var trader = locationManager.npc[event.npc_html_hash];
        if (trader) trader.updatePrice(event)
    };

    ClientManager.prototype.TraderClearMessage = function (event) {
        //console.log('ClientManager.prototype.TraderClearMessage', event);
        var trader = locationManager.npc[event.npc_html_hash];
        if (trader) trader.clear_assortment();
    };

    ClientManager.prototype.TrainerInfoMessage = function (event) {
        //console.log('ClientManager.prototype.TrainerInfoMessage', event);
        if (locationManager.npc.hasOwnProperty(event.npc_html_hash))
            locationManager.npc[event.npc_html_hash].setDropPrice(event.drop_price);
    };

    ClientManager.prototype.GirlInfoMessage = function (event) {
        //console.log('ClientManager.prototype.GirlInfoMessage', event);
        if (locationManager.npc.hasOwnProperty(event.npc_html_hash))
            locationManager.npc[event.npc_html_hash].setDropBonus(event.items);
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
    ClientManager.prototype.QuestsInitMessage = function (event) {
        //console.log('ClientManager.prototype.QuestInitMessage', event);
        var i;
        for (i = 0; i < event.quests.length; i++)
            journalManager.quests.addQuest(event.quests[i]);
        for (i = 0; i < event.notes.length; i++)
            this._createNote(event.notes[i]);
    };

    ClientManager.prototype.QuestsChangeMessage = function (event) {
        //console.log('ClientManager.prototype.QuestsChangeMessage', event);
        journalManager.quests.update(event.quest);
    };

    ClientManager.prototype.QuestAddMessage = function (event) {
        //console.log('ClientManager.prototype.QuestAddMessage', event);
        journalManager.quests.addQuest(event.quest);
    };

    ClientManager.prototype.QuestDelMessage = function (event) {
        //console.log('ClientManager.prototype.QuestDelMessage', event);
        journalManager.quests.delQuest(event.quest_uid);
    };

    ClientManager.prototype.QuestUpdateMessage = function (event) {
        //console.log('ClientManager.prototype.QuestUpdateMessage', event);
        journalManager.quests.update(event.quest);
    };

    // Нотесы
    ClientManager.prototype.AddNoteMessage = function(event) {
        //console.log('ClientManager.prototype.AddNoteMessage', event);
        this._createNote(event.note);
    };

    ClientManager.prototype.DelNoteMessage = function(event) {
        //console.log('ClientManager.prototype.DelNoteMessage', event);
        var note = notesManager.get_note(event.note_uid);
        if (note)
            note.delete();
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

    // PingInfoMessage
    ClientManager.prototype.PingInfoMessage = function (event) {
        //console.log('ClientManager.prototype.PingInfoMessage', event);
        $('#PingSpan').text(event.ping);
    };

    // Power Up
    ClientManager.prototype.PowerUpAnimateHide = function (event) {
        //console.log('ClientManager.prototype.PowerUpAnimateHide', event);
        //new ECanvasPowerUpHide(new Point(event.position.x, event.position.y)).start();
        var power_up = visualManager.getModelObject(event.subject_id);
        if (!power_up) return;
        var vo = visualManager.getVobjByType(power_up, WCanvasAnimateMarkerPowerUp);
        if (!vo) return;
        vo._power_up_overdown = power_up._icon_name.replace("icon-power-up-", "effect-power-up-off-");
        audioManager.play({name: "powerup_001", gain: 1.0 * audioManager._settings_interface_gain, priority: 1.0});
};

    // Активация итема

    ClientManager.prototype.StartActivateItem = function (event) {
        //console.log('ClientManager.prototype.StartActivateItem', event);
        if (event.activate_time > 0)
            modalWindow.modalItemActivationShow({activate_time: event.activate_time, item: event.item});
    };

    ClientManager.prototype.StopActivateItem = function (event) {
        //console.log('ClientManager.prototype.StopActivateItem', event);
        modalWindow.modalItemActivationHide({});
    };

    ClientManager.prototype.SuccessActivateItem = function (event) {
        //console.log("ClientManager.prototype.SuccessActivateItem", event);
        // Воспроизвести звук активации итема
        if (event.item.activate_success_audio) {
            audioManager.play({name: event.item.activate_success_audio, gain: 1.0 * audioManager._settings_interface_gain});
        }
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
        this.sendMotion(null, newSpeed, null);

        // Google Analytics
        analytics.drive_only_mouse(false);
    };

    ClientManager.prototype.sendStopCar = function () {
        //console.log('ClientManager.prototype.sendStopCar');
        if (!user.userCar) return;
        this.sendMotion(null, 0.0, null);

        if (mapManager.current_route) mapManager.current_route.clear_points();
    };

    ClientManager.prototype.sendTurn = function (turn) {
        //console.log('ClientManager.prototype.sendTurn');
        if (!user.userCar) return;
        this.sendMotion(null, null, turn);

        if (mapManager.current_route) mapManager.current_route.clear_points();
        
        // Google Analytics
        analytics.drive_only_mouse(false);
    };

    ClientManager.prototype.sendGoto = function (target) {
        //console.log('ClientManager.prototype.sendGoto', target);
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
        var side_obj = user.userCar.fireSidesMng.sides[side];
        if (!side_obj || !side_obj.isDischarge) return;
        if (side_obj.last_shoot + side_obj.sideRecharge > clock.getCurrentTime()) return;
        var mes = {
            call: "fire_discharge",
            rpc_call_id: rpcCallList.getID(),
            params: {
                side: side
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);

        // Google Analytics
        analytics.teach_map_fire();
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

        // Google Analytics
        analytics.teach_map_fire();
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
                name: name && name.toString()
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
                name: name && name.toString()
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendCreatePartyFromTemplate = function (name, description, exp_share_type) {
        var mes = {
            call: "send_create_party_from_template",
            rpc_call_id: rpcCallList.getID(),
            params: {
                name: name,
                description: description,
                exp_share_type: exp_share_type == 1
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
                name: name && name.toString()
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendInvitePartyFromTemplate = function (name) {
        //console.log('ClientManager.prototype.sendInvitePartyFromTemplate');
        modalWindow.modalDialogInfoShow({
            caption: 'Invite',
            header: _("window_inv_to_party"),
            body_text: _("window_inv_to_party_q1") + ' - ' + name + '.',
            callback_ok: function () {}
        });
        var mes = {
            call: "send_invite",
            rpc_call_id: rpcCallList.getID(),
            params: {
                username: name && name.toString()
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
                username: name && name.toString()
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
            params: { username: name && name.toString() }
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

    ClientManager.prototype.sendPartyShareOptions = function (share_exp) {
        var mes = {
            call: "change_party_share_option",
            rpc_call_id: rpcCallList.getID(),
            params: {
                share_exp: share_exp
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

    ClientManager.prototype.sendTakeAllInventory = function (owner_id) {
        //console.log('ClientManager.prototype.sendTakeAllInventory', owner_id);
        var mes = {
            call: "take_all_inventory",
            rpc_call_id: rpcCallList.getID(),
            params: {
                owner_id: owner_id
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendMassiveLootAround = function () {
        //console.log('ClientManager.prototype.sendMassiveLootAround');
        var mes = {
            call: "massive_loot_around",
            rpc_call_id: rpcCallList.getID(),
            params: {}
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendTakeItemInventory = function (owner_id, position, other_id) {
        //console.log('ClientManager.prototype.sendTakeItemInventory', owner_id, position, other_id);
        var mes = {
            call: "take_item_inventory",
            rpc_call_id: rpcCallList.getID(),
            params: {
                owner_id: owner_id,
                position: position,
                other_id: other_id,
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

        // Google Analytics
        analytics.activate_inventory_item();
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

    ClientManager.prototype.sendCancelActivationItem = function() {
        //console.log("ClientManager.prototype.sendCancelActivationItem");
        var mes = {
            call: "cancel_activation_item",
            rpc_call_id: rpcCallList.getID(),
            params: {}
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendGoToRespawn = function (town_node_hash) {
        //console.log('ClientManager.prototype.sendQuickPlayAgain');
        var mes = {
            call: "go_to_respawn",
            rpc_call_id: rpcCallList.getID(),
            params: {
                town_node_hash: town_node_hash
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    // Сообщения локаций

    ClientManager.prototype.sendEnterToNPC = function (npc) {
        //console.log('ClientManager.prototype.sendEnterToNPC', npc_type);
        var mes = {
            call: "enter_to_npc",
            rpc_call_id: rpcCallList.getID(),
            params: {
                npc_node_hash: npc.npc_rec.node_hash
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendEnterToBuilding = function (build) {
        //console.log('ClientManager.prototype.sendEnterToNPC', npc_type);
        var mes = {
            call: "enter_to_building",
            rpc_call_id: rpcCallList.getID(),
            params: {
                head_node_hash: build.building_rec.head.node_hash,
                build_name: build.building_rec.name
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendExitFromNPC = function (npc) {
        //console.log('ClientManager.prototype.sendEnterToNPC', npc_type);
        var mes = {
            call: "exit_from_npc",
            rpc_call_id: rpcCallList.getID(),
            params: {
                npc_node_hash: npc.npc_rec.node_hash
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendExitFromBuilding = function (build) {
        //console.log('ClientManager.prototype.sendEnterToNPC', npc_type);
        var mes = {
            call: "exit_from_building",
            rpc_call_id: rpcCallList.getID(),
            params: {
                head_node_hash: build.building_rec.head.node_hash,
                build_name: build.building_rec.name
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    // Nukeoil

    ClientManager.prototype.sendInsuranceBuy = function (insurance_node_hash) {
        //console.log('ClientManager.prototype.sendFuelStationActive');
        var mes = {
            call: "insurance_buy",
            rpc_call_id: rpcCallList.getID(),
            params: { insurance_node_hash: insurance_node_hash }
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

    // Проститутка

    ClientManager.prototype.sendGirlApply = function (param) {
        //console.log('ClientManager.prototype.sendGirlApply');
        var mes = {
            call: "girl_apply",
            rpc_call_id: rpcCallList.getID(),
            params: param
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
        //console.log('ClientManager.prototype.sendHangarCarChoice', npc);
        var mes = {
            call: "buy_car_in_hangar",
            rpc_call_id: rpcCallList.getID(),
            params: {
                npc_node_hash: npc.npc_rec.node_hash,
                car_uid: npc.cars_list[npc.current_car].car.uid
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

    ClientManager.prototype.sendSetNameCar = function (str) {
        console.log('ClientManager.prototype.sendSetNameCar', str);
        if (!str) return;
        var mes = {
            call: "set_name_car",
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
            params: { x: x, y: y , tile_name: settingsManager.options.map_tile_draw_back.currentValue}
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

        // Google Analytics
        analytics.set_quick_item();
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

        // Google Analytics
        analytics.set_quick_item();
    };

    ClientManager.prototype.sendActivateQuickItem = function(index, target_id) {
        // console.log('ClientManager.prototype.sendActivateQuickItem', index, target_id);
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

        // Google Analytics
        analytics.activate_quick_item();
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
        // console.log('ClientManager.prototype.sendTeleportCoord', x, y);
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

    // Квесты
    ClientManager.prototype.sendActivateQuest = function (quest_id) {
        //console.log('ClientManager.prototype.sendActivateQuest', quest_id);
        var mes = {
            call: "quest_activate",
            rpc_call_id: rpcCallList.getID(),
            params: {quest_uid: quest_id}
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendCancelQuest = function (quest_id) {
        //console.log('ClientManager.prototype.sendCancelQuest', quest_id);
        var mes = {
            call: "quest_cancel",
            rpc_call_id: rpcCallList.getID(),
            params: {quest_uid: quest_id}
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.SendQuestNoteAction = function (note_uid, note_result, options) {
        //console.log('ClientManager.prototype.QuestUpdateMessage', note_uid, note_result);
        var note_params = { uid: note_uid, result: note_result };
        if (options) setOptions(options, note_params);
        var mes = {
            call: "quest_note_action",
            rpc_call_id: rpcCallList.getID(),
            params: note_params,
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.sendQuestActiveNotesView = function (quest_id, active) {
        //console.log('ClientManager.prototype.sendQuestActiveNotesView', quest_id, active);
        var mes = {
            call: "quest_active_notes_view",
            rpc_call_id: rpcCallList.getID(),
            params: {quest_uid: quest_id, active: active}
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    // Быстрая игра (играть еще раз)
    ClientManager.prototype.sendQuickPlayAgain = function () {
        //console.log('ClientManager.prototype.sendQuickPlayAgain');
        var mes = {
            call: "quick_play_again",
            rpc_call_id: rpcCallList.getID(),
            params: {
                car_index: modalWindow._modalQuickGamePoints_current_car_index || 0
            }
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    // Быстрая игра: пройти обучение
    ClientManager.prototype.sendQuickTeachingAnswer = function (result) {
        //console.log('ClientManager.prototype.sendQuickTeachingAnswer');
        var mes = {
            call: "quick_teaching_answer",
            rpc_call_id: rpcCallList.getID(),
            params: {teaching: result}
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    // Запросить с сервера текущий пинг и отправить серверу FPS
    ClientManager.prototype.get_ping_set_fps = function () {
        //console.log('ClientManager.prototype.sendQuickTeachingAnswer');
        var mes = {
            call: "get_ping_set_fps",
            rpc_call_id: rpcCallList.getID(),
            params: {fps: timeManager.FPS}
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    // Залогировать в лог агента какую-либо информацию
    ClientManager.prototype.sendAgentLog = function (message) {
        //console.log('ClientManager.prototype.sendAgentLog');
        var mes = {
            call: "agent_log",
            rpc_call_id: rpcCallList.getID(),
            params: {message: message}
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };


    // Сообщить на сервер о разрешении клиента
    ClientManager.prototype.sendResolutionScale = function (scale) {
        //console.log('ClientManager.prototype.sendAgentLog');
        var mes = {
            call: "set_resolution_scale",
            rpc_call_id: rpcCallList.getID(),
            params: {resolution_scale: scale}
        };
        rpcCallList.add(mes);
        this._sendMessage(mes);
    };

    ClientManager.prototype.ArcadeTextMessage = function (event) {
        // console.log('ClientManager.prototype.ArcadeTextMessage', event);
        switch(event.arcade_message_type) {
            case 'quest_item':
                new WTextArcadeStatQuestItem().start();
                break;
            case 'skill_point':
                new WTextArcadeStatSkillPoint().start();
                break;
            case 'new_lwl':
                new WTextArcadeStatNewLVL().start();
                break;
            case 'attack_warning':
                new WTextArcadeStatAttackWarning().start();
                break;
            case 'turret_warning':
                new WTextArcadeStatTurretWarning().start();
                break;
            case 'critical_condition':
                new WTextArcadeStatCriticalCondition().start();
                break;
            case 'ammo_finish':
                new WTextArcadeStatAmmoFinish().start();
                break;
            case 'barter_succes':
                new new WTextArcadeStatBarterSucces().start();
                break;
            default:
                console.warn('Неизвестный тип текста: event.message_type')
        }
    };

    return ClientManager;
})();


var last_send_time = 0;