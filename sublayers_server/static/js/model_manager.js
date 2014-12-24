/*
* Класс для управления моделью.
* Подписывается на события входящих сообщений от вебсокета
* Отсылает исходящие сообщения в поток сообщений
*
* */



var ModelManager = ( function(){
    function ModelManager(){
        // подписаться на входящие сообщения типа ws_message
        message_stream.addInEvent({
            key: 'ws_message',
            cbFunc: this.receiveMessage,
            subject: this
        });
    }

    ModelManager.prototype.sendMessage = function(msg){
        //alert('ModelManager  sendMessage');
        // TODO: сейчас данная функция вызывается из функций wsjson.js, позже переделать!

        // формирование и отправка мессаджа
        message_stream.sendMessage({
            type: 'ws_message_send',
            body: msg
        });
    };



    ModelManager.prototype.receiveMessage = function (self, params) {
        console.log('ModelManager.prototype.receiveMessage');
        // TODO: написать правильный обработчик здесь. А пока так

/*
        params.events.forEach(function (event, index) {
            if (typeof(self[event.cls]) === 'function')
                self[event.cls](event);
            else
                console.log('Error: неизвестная апи-команда для клиента: ', params.cls);
                receiveMesFromServ(params);
        });
*/


            if (typeof(self[params.events[0].cls]) === 'function')
                self[params.events[0].cls](params.events[0]);
            else {
                console.log('Error: неизвестная апи-команда для клиента: ', params.events[0]);
                receiveMesFromServ(params);
            }



        return true;

    };


    // Входящие сообщения

    // Входящий от сервера Init для машинки
    ModelManager.prototype.Init = function(event){

        console.log('ModelManager.prototype.Init');
        var servtime = event.time;
        //aTrack = getTrack(event.cars[0]);
        var max_speed;
        var aMaxHP;
        var radius_visible = event.cars[0].r;
        var aHP;

        if (event.cars[0].hp) aHP = event.cars[0].hp;
        if (event.cars[0].max_hp) aMaxHP = event.cars[0].max_hp;
        if (event.cars[0].max_velocity) max_speed = event.cars[0].max_velocity;

        // Запустить отчёт времени до рестарта сервера
        //showTimeToResetServer(servtime);

        // Инициализация Юзера
        if(event.agent.cls == "User"){
            user.login = event.agent.login;
            user.ID = event.agent.uid;
            if (event.agent.party)
                user.party = new OwnerParty(event.agent.party.id, event.agent.party.name);
        }

        var uid = event.cars[0].uid;
        var aType = 0;
        var aWeapons = event.cars[0].weapons;
        var role = event.cars[0].role;
        var state = getState(event.cars[0].state);


        var fireSectors;
        var speed_to_set = (max_speed * 0.75).toFixed(0); // Сразу будет выставлена такая скорость, чтобы оно норамльно игралось
        if (!user.userCar) {
            user.userCar = new UserCar(uid,       //ID машинки
                aType,       //Тип машинки
                aHP,      //HP машинки
                max_speed,      //Максималка
                state
            );   //Текущая траектория


            fireSectors = getWeapons(aWeapons);

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
            // controllers
            controllers = new Controllers({
                fuelMax: fuelMaxProbka,
                hpMax: aMaxHP,
                fireSectors: user.userCar.fireSectors,
                max_velocity: max_speed,
                set_velocity: speed_to_set
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


    }

    ModelManager.prototype.Update = function(event){
        console.log('ModelManager.prototype.Update');
        var servtime = event.time;
        // Update
        // Пока что установка времени будет осуществляться здесь! Т.к. При контакте она лагает.
        clock.setDt(servtime / 1000.);
        if (event.object.hp) aHP = event.object.hp;
        aTrack = getState(event.object.state);
        owner = getOwner(event.object);
        updateCurrentCar(event.object.uid, 0, aHP, aTrack, owner);

        // Визуализация Update. При каждом сообщение Contact или See будет создан маркер с соответствующим попапом
        if (cookieStorage.enableMarkerUpdate())
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


    }






    return ModelManager;
})();