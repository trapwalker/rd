var ConstMaxLengthToMoveMarker = 2;
var ConstMaxAngleToMoveMarker = Math.PI / 90.;


var WCanvasCarMarker = (function (_super) {
    __extends(WCanvasCarMarker, _super);

    function WCanvasCarMarker(car) {
        _super.call(this, [car]);
        this.car = car;

        this.icon_obj = null;
        this.icon_arrow_obj = null;

        this.updateIcon();

        mapCanvasManager.add_vobj(this, 11);

        var time = clock.getCurrentTime();
        this.last_position = this.car.getCurrentCoord(time);  // experimental
        this.last_direction = this.car.getCurrentDirection(time) + Math.PI / 2.;  // experimental
        this.last_direction_arrow = this.last_direction;

        this._last_car_ctx_pos = new Point(-100, -100); // нужно для кеширования при расчёте теста мышки

        this.audio_object = null;
        if (car == user.userCar)
            this.audio_object = audioManager.play(car.engine_audio.name, 0.0, 1.0, null, true, 0.0, null,
                                                  car.getAudioEngineRate(clock.getCurrentTime()));
    }

    WCanvasCarMarker.prototype.mouse_test = function(time) {
        //console.log('WCanvasCarMarker.prototype.mouse_test');
        var distance = distancePoints2(this._last_car_ctx_pos, mapCanvasManager._mouse_client);
        var icon_size = this.icon_obj.iconSize[1] >> 2;
        icon_size *= icon_size;
        if (distance < icon_size)
            return true;
    };

    WCanvasCarMarker.prototype.click_handler = function(event) {
        //console.log('WCanvasCarMarker.prototype.click_handler', event);
        //console.log('Произведён клик на машинку ', this.car);
        var owner = this.car.owner ? this.car.owner : user;

        var print_login = owner.quick ? getQuickUserLogin(owner.login) : owner.login;

        windowTemplateManager.openUniqueWindow(
            'person_info_' + print_login,
            '/person_info',
            {person: owner.login, mode: 'map'},
            function(jq_window) {
                jq_window.find('.person-window-btn').click(function(){
                    if (user.party)
                        clientManager.sendInvitePartyFromTemplate($(this).data('name'));
                    else {
                        modalWindow.modalDialogInfoShow({
                            caption: 'Error Message',
                            header: 'Вы не в пати',
                            body_text: 'Для приглашения других игроков создайте пати'
                        });
                    }
                });
            }
        );
    };

    WCanvasCarMarker.prototype.redraw = function(ctx, time){
        //console.log('WCanvasCarMarker.prototype.redraw');
        var focused = mapCanvasManager._mouse_focus_widget == this;

        ctx.save();
        if (this.car == user.userCar) {
            ctx.translate(mapCanvasManager.cur_ctx_car_pos.x, mapCanvasManager.cur_ctx_car_pos.y);
            this._last_car_ctx_pos = mapCanvasManager.cur_ctx_car_pos;
            if (this.audio_object)
                this.audio_object.source_node.playbackRate.value = this.car.getAudioEngineRate(time);
        }
        else {
            var car_pos_real = this.car.getCurrentCoord(time);
            var car_pos;

            var diff_vec = subVector(car_pos_real, this.last_position);
            var diff_vec_abs = diff_vec.abs();

            // Если больше заданного максимального расстояния, то подвинуть по направлению на максимальное расстояние
            // Но если сильно отстаёт или не отстаёт, то сдвинуть сразу
            if (diff_vec_abs > ConstMaxLengthToMoveMarker && diff_vec_abs < 3 * ConstMaxLengthToMoveMarker)
                car_pos = summVector(this.last_position, mulScalVector(diff_vec, ConstMaxLengthToMoveMarker / diff_vec_abs));
            else
                car_pos = car_pos_real;

            this.last_position = car_pos;
            var ctx_car_pos = mulScalVector(subVector(car_pos, mapCanvasManager.map_tl), 1.0 / mapCanvasManager.zoom_koeff);
            ctx.translate(ctx_car_pos.x, ctx_car_pos.y);
            this._last_car_ctx_pos = ctx_car_pos;
        }

        var car_direction_real = this.car.getCurrentDirection(time) + Math.PI / 2.;
        var car_direction;
        var diff_angle_direction = car_direction_real - this.last_direction;
        if (Math.abs(diff_angle_direction) > ConstMaxAngleToMoveMarker && Math.abs(diff_angle_direction_arrow) < Math.PI / 2.) {
            //car_direction = this.last_direction + ConstMaxAngleToMoveMarker * (diff_angle_direction > 0 ? 1 : -1);
            car_direction = this.last_direction + ConstMaxAngleToMoveMarker * (diff_angle_direction / 3.);
        }
        else {
            car_direction = car_direction_real;
        }
        this.last_direction = car_direction;

        ctx.save(); // для возврата от поворота
        //ctx.rotate(car_direction);
        //ctx.scale(1. / mapCanvasManager.zoom_koeff, 1. / mapCanvasManager.zoom_koeff);
        ctx.drawImage(this.icon_obj.img, -this.icon_obj.iconSize[0] >> 1, -this.icon_obj.iconSize[1] >> 1);
        ctx.restore(); // Возврат после поворота

        // Отображение стрелки иконки
        if (this.icon_arrow_obj) {
            ctx.save(); // для возврата от поворота
            var speed_angle = this.car.getCurrentSpeed(time) >= 0 ? 0 : Math.PI;
            var car_direction_arrow_real = this.car.getCurrentDirection(time + 0.5) + Math.PI / 2. + speed_angle;
            var car_direction_arrow;
            var diff_angle_direction_arrow = car_direction_arrow_real - this.last_direction_arrow;
            if (Math.abs(diff_angle_direction_arrow) > ConstMaxAngleToMoveMarker && Math.abs(diff_angle_direction_arrow) < Math.PI / 2.) {
                //car_direction_arrow = this.last_direction_arrow + ConstMaxAngleToMoveMarker * (diff_angle_direction_arrow > 0 ? 1 : -1);
                car_direction_arrow = this.last_direction_arrow + diff_angle_direction_arrow / 3.;
            }
            else {
                car_direction_arrow = car_direction_arrow_real;
            }
            this.last_direction_arrow = car_direction_arrow;

            ctx.rotate(car_direction_arrow);
            ctx.drawImage(this.icon_arrow_obj.img, -this.icon_arrow_obj.iconSize[0] >> 1, -this.icon_arrow_obj.iconSize[1] >> 1);
            ctx.restore(); // Возврат после поворота
        }

        // Вывод лейбла
        if (this.car.owner || this.car == user.userCar) {
            var owner = this.car.owner || user;
            var label_str = '';
            if (owner.quick)
                label_str = getQuickUserLogin(owner.login);
            else {
                var party_str = "";
                if (owner.party != null) party_str = '[' + owner.party.name + ']';
                label_str = owner.login + party_str;
            }

            ctx.textAlign = "center";
            ctx.textBaseline = "center";
            ctx.font = "8pt MICRADI";
            ctx.fillStyle = 'rgba(42, 253, 10, 0.6)';
            //ctx.fillText(label_str, 0, this.old_ctx_car_pos.y - ((this.old_ctx_car_pos.y >> 1) << 1) - 15.0);
            ctx.fillText(label_str, 0, -15);
        }

        //if (focused) {
        //    ctx.fillStyle = "red";
        //    ctx.fillRect(-10, -10, 20, 20);
        //}

        ctx.restore();  // Возврат транслейта
    };

    WCanvasCarMarker.prototype.delFromVisualManager = function () {
        //console.log('WCanvasCarMarker.prototype.delFromVisualManager');
        if (this.audio_object)
            audioManager.stop(this.car.engine_audio.name, 0.0, this.audio_object);
        this.car = null;
        mapCanvasManager.del_vobj(this);
        _super.prototype.delFromVisualManager.call(this);
    };

    WCanvasCarMarker.prototype.updateIcon = function() {
        var car = this.car;
        var icon_type = 'neutral';
        var icon_name = 'car';

        if (car.owner)
            if (user.party && car.owner.party)
                if (car.owner.party.name == user.party.name)
                    icon_type = 'party';
        // Если своя машинка, но при этом ты в пати
        if (car == user.userCar && user.party) {
            icon_type = 'party';
        }

        switch (car.sub_class_car) {
            case 'artillery':
                icon_name = 'art';
                break;
            case 'armored':
                icon_name = 'bm';
                break;
            case 'btrs':
                icon_name = 'btr';
                break;
            case 'buggies':
                icon_name = 'buggy';
                break;
            case 'buses':
                icon_name = 'bus';
                break;
            case 'cars':
                icon_name = 'car';
                break;
            case 'trucks':
                icon_name = 'cargo';
                break;
            case 'motorcycles':
                icon_name = 'moto';
                break;
            case 'quadbikes':
                icon_name = 'quadro';
                break;
            case 'sports':
                icon_name = 'sport';
                break;
            case 'offroad':
                icon_name = 'suv';
                break;
            case 'tanks':
                icon_name = 'tank';
                break;
            case 'tractors':
                icon_name = 'truck';
                break;
            case 'vans':
                icon_name = 'van';
                break;
            default:
                console.log('Не найдена иконка. Установлена стандартная. ', car);
                icon_name = 'car';
        }

        this.icon_obj = iconsLeaflet.getIcon('icon_' + icon_type + '_' + icon_name, 'canvas_icon');
        this.icon_arrow_obj = iconsLeaflet.getIcon('icon_' + icon_type + '_arrow', 'canvas_icon');
    };

    return WCanvasCarMarker;
})(VisualObject);


var WCanvasStaticObjectMarker = (function (_super) {
    __extends(WCanvasStaticObjectMarker, _super);

    function WCanvasStaticObjectMarker(mobj) {
        _super.call(this, [mobj]);
        this.mobj = mobj;

        this.icon_obj = null;
        this.icon_arrow_obj = null;
        this.icon_offset = {x: 0, y: 0};

        this.updateIcon();

        mapCanvasManager.add_vobj(this, 11);  // todo: Выбрать правильный приоритет

        var time = clock.getCurrentTime();

    }

    WCanvasStaticObjectMarker.prototype.getVisibleState = function () {
        var zoom = 15. - mapCanvasManager.real_zoom;
        if (zoom <= 0) return 0;
        if (zoom > 1.) return 1.;
        return zoom;
    };

    WCanvasStaticObjectMarker.prototype.redraw = function(ctx, time){
        //console.log('WCanvasCarMarker.prototype.redraw');
        var visible_state = this.getVisibleState();
        if (visible_state == 0) return;
        ctx.save();
        if (visible_state != 1.) {
            ctx.globalAlpha = visible_state;
        }
        var car_pos = this.mobj.getCurrentCoord(time);
        var ctx_car_pos = mulScalVector(subVector(car_pos, mapCanvasManager.map_tl), 1.0 / mapCanvasManager.zoom_koeff);
        ctx.translate(ctx_car_pos.x, ctx_car_pos.y);

        var car_direction = this.mobj.direction;
        ctx.rotate(car_direction);
        //ctx.scale(1. / mapCanvasManager.zoom_koeff, 1. / mapCanvasManager.zoom_koeff);
        ctx.drawImage(this.icon_obj.img, this.icon_offset.x, this.icon_offset.y);

        // Вывод лейбла
        //var title = this.mobj.hasOwnProperty('title') ? this.mobj.title : ('-=' + this.mobj.cls + '=-');
        //ctx.textAlign = "center";
        //ctx.textBaseline = "center";
        //ctx.font = "8pt MICRADI";
        //ctx.fillStyle = 'rgba(42, 253, 10, 0.6)';
        //ctx.fillText(title, 0, -25);

        ctx.restore();  // Возврат транслейта
    };

    WCanvasStaticObjectMarker.prototype.delFromVisualManager = function () {
        //console.log('WCanvasUserCarMarker.prototype.delFromVisualManager');
        this.mobj = null;
        mapCanvasManager.del_vobj(this);
        _super.prototype.delFromVisualManager.call(this);
    };

    WCanvasStaticObjectMarker.prototype.updateIcon = function() {
        //console.log('WCanvasStaticObjectMarker.prototype.updateIcon');
        var mobj = this.mobj;
        var icon_name = 'car';
        switch (mobj.cls) {
            case 'Town':
                switch (mobj.example.node_hash) {
                    case 'reg:///registry/poi/locations/towns/prior':
                        icon_name = 'city_prior';
                        break;
                    case 'reg:///registry/poi/locations/towns/whitehill':
                        icon_name = 'city_whitehill';
                        break;
                    default:
                        icon_name = 'city';
                }
                break;
            case 'GasStation':
                icon_name = 'station';
                break;
            default:
                console.log('Не найдена иконка. Установлена стандартная. ', mobj);
                icon_name = 'city';
        }

        this.icon_obj = iconsLeaflet.getIcon('icon_' + icon_name, 'canvas_icon');
        if (mobj.cls == 'Town' || mobj.cls == 'GasStation') {
            this.icon_offset = {x: -this.icon_obj.iconSize[0] >> 1, y: -this.icon_obj.iconSize[0] + 10}
        }
        else {
            this.icon_offset = {x: -this.icon_obj.iconSize[0] >> 1, y: -this.icon_obj.iconSize[1] >> 1}
        }
    };


    return WCanvasStaticObjectMarker;
})(VisualObject);


var WCanvasHPCarMarker = (function (_super) {
    __extends(WCanvasHPCarMarker, _super);

    function WCanvasHPCarMarker(car, w_car_marker) {
        _super.call(this, [car]);
        this.car = car;

        this.w_car_marker = w_car_marker;

        mapCanvasManager.add_vobj(this, 11);

        //var time = clock.getCurrentTime();
        this._last_time_change_hp = 0;
        this._last_hp = 0;

        this._radius_big = 39;
        this._radius_sml = 33;
        var pi4 = Math.PI / 4.;
        this._p11 = polarPoint(this._radius_big, -pi4);
        this._p22 = polarPoint(this._radius_sml, -3 * pi4);
    }


    WCanvasHPCarMarker.prototype.redraw = function(ctx, time){
        //console.log('WCanvasHPCarMarker.prototype.redraw', time);

        var hp = this.car.getCurrentHP(time);

        if (hp != this._last_hp) {
            this._last_time_change_hp = time;
            this._last_hp = hp;
        }
        else {
            if (time - this._last_time_change_hp > 5.0)
                return;
        }

        ctx.save();
        if (this.car == user.userCar) {
            ctx.translate(mapCanvasManager.cur_ctx_car_pos.x, mapCanvasManager.cur_ctx_car_pos.y);
            this._last_car_ctx_pos = mapCanvasManager.cur_ctx_car_pos
        }
        else {
            var ctx_car_pos = this.w_car_marker._last_car_ctx_pos;
            ctx.translate(ctx_car_pos.x, ctx_car_pos.y - 3);
        }

        ctx.save(); // для возврата от рисования хп
        // Рисование каркаса
        var pi4 = Math.PI / 4.;
        ctx.strokeStyle = 'rgba(85, 255, 85, 0.4)';
        ctx.beginPath();
        ctx.arc(0, 0, this._radius_big, -pi4, -3 * pi4, true);
        ctx.lineTo(this._p22.x, this._p22.y);
        ctx.arc(0, 0, this._radius_sml, - 3 * pi4,  -pi4, false);
        ctx.lineTo(this._p11.x, this._p11.y);
        ctx.stroke();

        // Рисование заливки
        hp = Math.min(Math.max(hp / this.car._hp_state.max_hp, 0.0), 1.0);
        var pp_angle =-3* pi4 + (-pi4 - (-3* pi4)) * (hp);
        var pp1 = polarPoint(this._radius_big, pp_angle);
        ctx.fillStyle = 'rgba(85, 255, 85, 0.2)';
        ctx.beginPath();
        ctx.arc(0, 0, this._radius_big, pp_angle, -3 * pi4, true);
        ctx.lineTo(this._p22.x, this._p22.y);
        ctx.arc(0, 0, this._radius_sml, - 3 * pi4,  pp_angle, false);
        ctx.lineTo(pp1.x, pp1.y);
        ctx.fill();

        ctx.restore(); // Возврат после рисования хп
        ctx.restore();  // Возврат транслейта
    };

    WCanvasHPCarMarker.prototype.delFromVisualManager = function () {
        //console.log('WCanvasHPCarMarker.prototype.delFromVisualManager');
        this.car = null;
        mapCanvasManager.del_vobj(this);
        _super.prototype.delFromVisualManager.call(this);
    };

    return WCanvasHPCarMarker;
})(VisualObject);


var WCanvasAnimateMarker = (function (_super) {
    __extends(WCanvasAnimateMarker, _super);

    function WCanvasAnimateMarker(mobj) {
        _super.call(this, [mobj]);
        this.mobj = mobj;

        this.duration = 0;
        this.frame_count = 0;
        this.time_of_frame = 0;
        this.frame_width = 0; // размер одного кадра
        this.frame_height = 0; // размер одного кадра
        this.start_time = clock.getCurrentTime();
        this.offset_x = 0; // Множитель сдвига кадра по оси Х (размер кадра умножается на это число)
        this.offset_y = 0; // Множитель сдвига кадра по оси Y (размер кадра умножается на это число)
        this.scale_icon_x = 1.0;
        this.scale_icon_y = 1.0;

        this.icon_obj = null;
        this.cm_z_index = 11; // todo: Выбрать правильный приоритет
        this.updateIcon();
        mapCanvasManager.add_vobj(this, this.cm_z_index);
    }

    WCanvasAnimateMarker.prototype.getVisibleState = function (time) {
        return 1.0;
    };

    WCanvasAnimateMarker.prototype.redraw = function(ctx, time){
        //console.log('WCanvasCarMarker.prototype.redraw');
        var img_obj = this.icon_obj;
        if (!img_obj) return;
        var visible_state = this.getVisibleState(time);
        if (visible_state == 0) return;
        ctx.save();
        if (visible_state != 1.) {
            ctx.globalAlpha = visible_state;
        }
        var pos = this.mobj.getCurrentCoord(time);
        var ctx_pos = mulScalVector(subVector(pos, mapCanvasManager.map_tl), 1.0 / mapCanvasManager.zoom_koeff);
        ctx.translate(ctx_pos.x, ctx_pos.y);

        ctx.rotate(this.mobj.getCurrentDirection(time));
        //ctx.scale(1. / mapCanvasManager.zoom_koeff, 1. / mapCanvasManager.zoom_koeff);

        var frame = this._get_frame_num(time);
        ctx.drawImage(img_obj.img, frame * this.frame_width, 0, this.frame_width, this.frame_height,
            this.offset_x * img_obj.size[0], this.offset_y * img_obj.size[1], this.frame_width * this.scale_icon_x, this.frame_height * this.scale_icon_y);

        ctx.restore();  // Возврат транслейта
    };

    WCanvasAnimateMarker.prototype.delFromVisualManager = function () {
        //console.log('WCanvasUserCarMarker.prototype.delFromVisualManager');
        this.mobj = null;
        mapCanvasManager.del_vobj(this);
        _super.prototype.delFromVisualManager.call(this);
    };

    WCanvasAnimateMarker.prototype.updateIcon = function() {
        //console.log('WCanvasAnimateMarker.prototype.updateIcon');
        // Здесь нужно заполнить все эти параметры
        this.cm_z_index = 11; // todo: Выбрать правильный приоритет
        this.icon_obj = null;
        this.duration = 0;
        this.frame_count = 1;
        this.time_of_frame = 0;
        this.frame_width = 0; // размер одного кадра
        this.frame_height = 0; // размер одного кадра
        this.offset_x = 0; // Множитель сдвига кадра по оси Х (размер кадра умножается на это число)
        this.offset_y = 0; // Множитель сдвига кадра по оси Y (размер кадра умножается на это число)
    };

    WCanvasAnimateMarker.prototype._get_frame_num = function (time) {
        var time_off = time - this.start_time; // время, прошедшее сначала анимации
        time_off = time_off < 0 ? 0 : time_off;
        return Math.floor(time_off * 1000 / this.time_of_frame) % this.frame_count;
    };

    return WCanvasAnimateMarker;
})(VisualObject);


var WCanvasAnimateMarkerPowerUp = (function (_super) {
    __extends(WCanvasAnimateMarkerPowerUp, _super);

    function WCanvasAnimateMarkerPowerUp(mobj) {
        _super.call(this, mobj);
        this.position = mobj.getCurrentCoord(clock.getCurrentTime());
    }

    WCanvasAnimateMarkerPowerUp.prototype.delFromVisualManager = function () {
        //console.log('WCanvasUserCarMarker.prototype.delFromVisualManager');
        new ECanvasPowerUpHide(this.position).start();
        _super.prototype.delFromVisualManager.call(this);
    };

    WCanvasAnimateMarkerPowerUp.prototype.getVisibleState = function (time) {
        if (user.userCar && user.userCar.getObservingRange(time) <= distancePoints(this.position, user.userCar.getCurrentCoord(time)))
            return 0.2;
        else
            return 1.0;
    };

    WCanvasAnimateMarkerPowerUp.prototype._get_frame_num = function (time) {
        if (user.userCar && user.userCar.getObservingRange(time) <= distancePoints(this.position, user.userCar.getCurrentCoord(time)))
            return 0;
        else
            return _super.prototype._get_frame_num.call(this, time);
    };

    WCanvasAnimateMarkerPowerUp.prototype.updateIcon = function() {
        //console.log('WCanvasAnimateMarker.prototype.updateIcon');
        // Здесь нужно заполнить все эти параметры
        this.cm_z_index = 10; // todo: Выбрать правильный приоритет
        this.icon_obj = iconsLeaflet.getIcon(this.mobj._icon_name, "canvas_icon");
        this.duration = 1500;
        this.frame_count = this.icon_obj.frames;
        this.time_of_frame = this.duration / this.icon_obj.frames;
        this.frame_width = this.icon_obj.size[0]; // размер одного кадра
        this.frame_height = this.icon_obj.size[1]; // размер одного кадра
        this.offset_x = -0.5; // Множитель сдвига кадра по оси Х (размер кадра умножается на это число)
        this.offset_y = -1; // Множитель сдвига кадра по оси Y (размер кадра умножается на это число)
        this.scale_icon_x = 0.8;
        this.scale_icon_y = 0.8;
    };

    return WCanvasAnimateMarkerPowerUp;
})(WCanvasAnimateMarker);