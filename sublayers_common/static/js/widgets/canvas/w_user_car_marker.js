var ConstMaxLengthToMoveMarker = 2;
var ConstMaxAngleToMoveMarker = Math.PI / 90.;


var WCanvasMarker = (function (_super) {
    __extends(WCanvasMarker, _super);

    function WCanvasMarker(mobj) {
        _super.call(this, [mobj]);
        this.mobj = mobj;

        this.duration = 0;
        this.frame_count = 0;
        this.time_of_frame = 0;
        this.frame_width = 0; // размер одного кадра
        this.frame_height = 0; // размер одного кадра
        this.start_time = clock.getClientTime();
        this.offset_x = 0; // Множитель сдвига кадра по оси Х (размер кадра умножается на это число)
        this.offset_y = 0; // Множитель сдвига кадра по оси Y (размер кадра умножается на это число)
        this.scale_icon_x = 1.0;
        this.scale_icon_y = 1.0;
        this.cm_z_index = 1;

        this.icon_obj = null;
        this.icon_size_min_div_2 = 0;

        this.updateIcon();
        mapCanvasManager.add_vobj(this, this.cm_z_index);


        // Кешируемые значение
        this._last_mobj_position =  new Point(0, 0);
        this._last_mobj_ctx_pos = new Point(0, 0);
        this._last_mobj_direction = 0;
        this._last_visible_state = 0;
    }

    WCanvasMarker.prototype.getVisibleState = function (time) {
        return 1.0;
    };

    WCanvasMarker.prototype.delFromVisualManager = function () {
        //console.log('WCanvasUserCarMarker.prototype.delFromVisualManager');
        this.mobj = null;
        mapCanvasManager.del_vobj(this);
        _super.prototype.delFromVisualManager.call(this);
    };

    WCanvasMarker.prototype.updateIcon = function() {
        //console.log('WCanvasMarker.prototype.updateIcon');
        var mobj = this.mobj;
        var icon_name = '';
        switch (mobj.cls) {
            case 'Turret':
                icon_name = 'turret_001';
                break;
            case "SlowMine":
            case "BangMine":
                icon_name = "mine_001";
                break;
            default:
                console.warn('Не найдена иконка для', mobj);
                return;
        }

        this.icon_obj = iconsLeaflet.getIcon(icon_name);
        if (! this.icon_obj) return;
        this.duration = 1000;
        this.frame_count = this.icon_obj.frames;
        this.time_of_frame = this.duration / this.icon_obj.frames;
        this.frame_width = this.icon_obj.size[0]; // размер одного кадра
        this.frame_height = this.icon_obj.size[1]; // размер одного кадра
        this.offset_x = -0.5; // Множитель сдвига кадра по оси Х (размер кадра умножается на это число)
        this.offset_y = -0.5; // Множитель сдвига кадра по оси Y (размер кадра умножается на это число)

        this.icon_size_min_div_2 = Math.min(this.frame_width, this.frame_height) >> 1;
    };

    WCanvasMarker.prototype.mouse_test = function(time) {
        //console.log('WCanvasMarker.prototype.mouse_test');
        var distance = distancePoints2(this._last_mobj_ctx_pos, mapCanvasManager._mouse_client);
        var icon_size = this.icon_size_min_div_2;  // Math.min(this.icon_obj.iconSize[1], this.icon_obj.iconSize[0]) >> 2;
        icon_size *= icon_size;
        return distance < icon_size;
    };

    WCanvasMarker.prototype.click_handler = function(event) {
        console.log('WCanvasMarker.prototype.click_handler', event);
    };

    WCanvasMarker.prototype._get_frame_num = function (time, client_time) {
        if (this.frame_count == 1) return 0;
        var time_off = client_time - this.start_time; // время, прошедшее сначала анимации
        time_off = time_off < 0 ? 0 : time_off;
        return Math.floor(time_off / this.time_of_frame) % this.frame_count;
    };

    WCanvasMarker.prototype._get_rotate_angle = function (time) {
        return this.mobj.getCurrentDirection(time);
    };

    WCanvasMarker.prototype._get_scale_koeff = function (time) {
        return 1.0; // 1. / mapCanvasManager.zoom_koeff;
    };

    WCanvasMarker.prototype.redraw = function(ctx, time, client_time){
        //console.log('WCanvasMarker.prototype.redraw');
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
        ctx.rotate(this._get_rotate_angle(time));
        var scale = this._get_scale_koeff(time);
        ctx.scale(scale, scale);

        var frame = this._get_frame_num(time, client_time);  // передаём именно client_time для правильной анимации на клиенте
        ctx.drawImage(img_obj.img, frame * this.frame_width, 0, this.frame_width, this.frame_height,
            this.offset_x * img_obj.size[0] * this.scale_icon_x, this.offset_y * img_obj.size[1] * this.scale_icon_y,
            this.frame_width * this.scale_icon_x, this.frame_height * this.scale_icon_y);

        ctx.restore();  // Возврат транслейта

        // Сохранение кешируемых значений
        this._last_mobj_direction = this.mobj.getCurrentDirection(time);
        this._last_mobj_position = pos;
        this._last_mobj_ctx_pos = ctx_pos;
        this._last_visible_state = visible_state;

        this.post_redraw(ctx, time, client_time);
    };

    WCanvasMarker.prototype.post_redraw = function (ctx, time, client_time) {};

    return WCanvasMarker;
})(VisualObject);


var WCanvasCarMarker = (function (_super) {
    __extends(WCanvasCarMarker, _super);

    function WCanvasCarMarker(mobj) {
        this.icon_arrow_obj = null;
        this.icon_obj_focused = null;
        _super.call(this, mobj);
        var car = mobj;
        var time = clock.getCurrentTime();
        // Псевдо координаты, нужны для доезжания
        this._ps_last_position = car.getCurrentCoord(time);  // experimental
        this._ps_last_direction = car.getCurrentDirection(time) + Math.PI / 2.;  // experimental
        this._ps_last_direction_arrow = this._ps_last_direction;

        this.audio_object = null;
        this.audio_object_reverse_gear = null;
        if (car == user.userCar && car.engine_audio) {
            this.audio_object = audioManager.play({
                name: car.engine_audio.audio_name,
                gain: 1.0 * audioManager._settings_engine_gain,
                loop: true,
                playbackRate: car.getAudioEngineRate(clock.getCurrentTime()),
                priority: 0.1
            });

            this.audio_object_reverse_gear = audioManager.play({
                name: "reverse_gear",
                gain: 0.0,
                loop: true,
                playbackRate: 1.0,
                priority: 0.1
            });
        }

        this.tail_particles_interval_stay = 5000;  // Время между генерациями при скорости = 0
        this.tail_particles_last_born_time = 0;
        this.tail_particles_icon_left_name = "icon-car-tail-06l-35";
        this.tail_particles_icon_right_name = "icon-car-tail-06r-35";
        this.tail_particles_size_start = 0.45;
        this.tail_particles_size_end = 0.8;

        this._set_car_tail();
    }

    WCanvasCarMarker.prototype._set_car_tail = function() {
        var car = this.mobj;
        switch (car.sub_class_car) {
            case 'motorcycles':
            case 'quadbikes':
            case 'buggies':
                // Лёгкие
                this.tail_particles_interval_stay = 6000;
                this.tail_particles_size_start = 0.25;
                this.tail_particles_size_end = 0.6;
                this.tail_particles_icon_left_name = "icon-car-tail-06l-25";
                this.tail_particles_icon_right_name = "icon-car-tail-06r-25";
                break;
            case 'sports':
            case 'cars':
            case 'offroad':
            case 'vans':
                // Средние
                this.tail_particles_interval_stay = 5000;
                this.tail_particles_size_start = 0.45;
                this.tail_particles_size_end = 0.8;
                this.tail_particles_icon_left_name = "icon-car-tail-06l-35";
                this.tail_particles_icon_right_name = "icon-car-tail-06r-35";
                break;
            case 'armored':
            case 'btrs':
            case 'artillery':
            case 'tanks':
            case 'buses':
            case 'trucks':
            case 'tractors':
                // Тяжёлые
                this.tail_particles_interval_stay = 4000;
                this.tail_particles_size_start = 0.65;
                this.tail_particles_size_end = 1.0;
                this.tail_particles_icon_left_name = "icon-car-tail-06l-45";
                this.tail_particles_icon_right_name = "icon-car-tail-06r-45";
                break;
            default:
                console.log('Не найдена иконка. Установлена стандартная. ', car.sub_class_car);
        }
    };

    WCanvasCarMarker.prototype.click_handler = function(event) {
        //console.log('WCanvasCarMarker.prototype.click_handler', event);
        var owner = this.mobj.owner ? this.mobj.owner : user;

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

    WCanvasCarMarker.prototype.redraw = function(ctx, time, client_time){
        //console.log('WCanvasCarMarker.prototype.redraw');
        var focused = mapCanvasManager._mouse_focus_widget == this;
        var mobj = this.mobj;
        ctx.save();
        var car_pos_real = mobj.getCurrentCoord(time);

        if (mobj == user.userCar) {
            ctx.translate(mapCanvasManager.cur_ctx_car_pos.x, mapCanvasManager.cur_ctx_car_pos.y);
            this._last_mobj_ctx_pos = mapCanvasManager.cur_ctx_car_pos;
            this._ps_last_position = car_pos_real;

            // Звук двигателя
            if (this.audio_object) {
                this.audio_object.source_node.playbackRate.value = mobj.getAudioEngineRate(time);
                if (this.audio_object.get_gain() != audioManager._settings_engine_gain)
                    this.audio_object.gain(audioManager._settings_engine_gain);
            }

            // Звук движения назад
            if (this.audio_object_reverse_gear) {
                if (mobj.getCurrentSpeed(time) < 0)
                    this.audio_object_reverse_gear.gain(audioManager._settings_engine_gain * 0.3);
                else
                    this.audio_object_reverse_gear.gain(0.0);
            }
        }
        else {
            var car_pos;
            var diff_vec = subVector(car_pos_real, this._last_mobj_position);
            var diff_vec_abs = diff_vec.abs();

            // Если больше заданного максимального расстояния, то подвинуть по направлению на максимальное расстояние
            // Но если сильно отстаёт или не отстаёт, то сдвинуть сразу
            if (diff_vec_abs > ConstMaxLengthToMoveMarker && diff_vec_abs < 3 * ConstMaxLengthToMoveMarker)
                car_pos = summVector(this._ps_last_position, mulScalVector(diff_vec, ConstMaxLengthToMoveMarker / diff_vec_abs));
            else
                car_pos = car_pos_real;

            this._ps_last_position = car_pos;
            var ctx_car_pos = mulScalVector(subVector(car_pos, mapCanvasManager.map_tl), 1.0 / mapCanvasManager.zoom_koeff);
            ctx.translate(ctx_car_pos.x, ctx_car_pos.y);
            this._last_mobj_ctx_pos = ctx_car_pos;
        }

        this._last_mobj_position = car_pos_real;

        var car_direction_real = mobj.getCurrentDirection(time) + Math.PI / 2.;
        this._last_mobj_direction = car_direction_real;
        var car_direction;
        var diff_angle_direction = car_direction_real - this._ps_last_direction;
        if (Math.abs(diff_angle_direction) > ConstMaxAngleToMoveMarker && Math.abs(diff_angle_direction) < Math.PI / 2.) {
            car_direction = this._ps_last_direction + ConstMaxAngleToMoveMarker * (diff_angle_direction / 3.);
        }
        else {
            car_direction = car_direction_real;
        }
        this._ps_last_direction = car_direction;

        ctx.save(); // для возврата от поворота
        //ctx.rotate(car_direction);
        //ctx.scale(1. / mapCanvasManager.zoom_koeff, 1. / mapCanvasManager.zoom_koeff);
        ctx.drawImage(this.icon_obj.img, -this.icon_obj.iconSize[0] >> 1, -this.icon_obj.iconSize[1] >> 1);
        ctx.restore(); // Возврат после поворота

        // Отображение стрелки иконки
        if (this.icon_arrow_obj) {
            ctx.save(); // для возврата от поворота
            var speed_angle = mobj.getCurrentSpeed(time) >= 0 ? 0 : Math.PI;
            var car_direction_arrow_real = mobj.getCurrentDirection(time + 0.5) + Math.PI / 2. + speed_angle;
            var car_direction_arrow;
            var diff_angle_direction_arrow = car_direction_arrow_real - this._ps_last_direction_arrow;
            if (Math.abs(diff_angle_direction_arrow) > ConstMaxAngleToMoveMarker && Math.abs(diff_angle_direction_arrow) < Math.PI / 2.) {
                //car_direction_arrow = this.last_direction_arrow + ConstMaxAngleToMoveMarker * (diff_angle_direction_arrow > 0 ? 1 : -1);
                car_direction_arrow = this._ps_last_direction_arrow + diff_angle_direction_arrow / 3.;
            }
            else {
                car_direction_arrow = car_direction_arrow_real;
            }
            this._ps_last_direction_arrow = car_direction_arrow;

            ctx.rotate(car_direction_arrow);
            ctx.drawImage(this.icon_arrow_obj.img, -this.icon_arrow_obj.iconSize[0] >> 1, -this.icon_arrow_obj.iconSize[1] >> 1);
            ctx.restore(); // Возврат после поворота
        }

        // Вывод лейбла
        if (mobj.owner || mobj == user.userCar) {
            var owner = mobj.owner || user;
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

        if (focused && this.icon_obj_focused) {
            ctx.drawImage(this.icon_obj_focused.img, -this.icon_obj_focused.iconSize[0] >> 1, -this.icon_obj_focused.iconSize[1] >> 1);
        }

        ctx.restore();  // Возврат транслейта

        this.post_redraw(ctx, time, client_time);
    };

    WCanvasCarMarker.prototype.post_redraw = function(ctx, time, client_time) {
        if (mapCanvasManager._settings_particles_tail == 0) return;
        var speed = this.mobj.getCurrentSpeed(time);
        var speed_abs = Math.abs(speed);
        var pos_real = this._last_mobj_position;
        var direction_real = this._last_mobj_direction;
        if (speed_abs > 1.0 && this.tail_particles_interval_stay && this.tail_particles_last_born_time + this.tail_particles_interval_stay / speed_abs < time * 1000) {
            this.tail_particles_last_born_time = time * 1000;
            var angle_of_tail = normalizeAngleRad2(Math.PI / 2. + direction_real);
            //new ECanvasCarTail(getRadialRandomPointWithAngle(pos_real, 10, angle_of_tail, 0.5), direction_real, 2000, 2.5).start();
            //new ECanvasCarTail(summVector(pos_real, polarPoint(8 + 4 * Math.random(), normalizeAngleRad2(angle_of_tail + 0.2))), direction_real + Math.PI / 2., 2000, this.tail_particles_icon_name, 1, 0.45).start();
            //new ECanvasCarTail(summVector(pos_real, polarPoint(8 + 4 * Math.random(), normalizeAngleRad2(angle_of_tail - 0.2))), direction_real + Math.PI / 2., 2000, this.tail_particles_icon_name, 1, 0.45).start();

            new ECanvasCarTail(summVector(pos_real, polarPoint(7 + 5 * Math.random(), normalizeAngleRad2(angle_of_tail))), direction_real, 2000 * mapCanvasManager._settings_particles_tail, this.tail_particles_icon_left_name, this.tail_particles_size_end, this.tail_particles_size_start).start();
            new ECanvasCarTail(summVector(pos_real, polarPoint(7 + 5 * Math.random(), normalizeAngleRad2(angle_of_tail))), direction_real, 2000 * mapCanvasManager._settings_particles_tail, this.tail_particles_icon_right_name, this.tail_particles_size_end, this.tail_particles_size_start).start();
        }
    };

    WCanvasCarMarker.prototype.delFromVisualManager = function () {
        //console.log('WCanvasCarMarker.prototype.delFromVisualManager');
        if (this.audio_object)
            audioManager.stop(0.0, this.audio_object);
        if (this.audio_object_reverse_gear)
            audioManager.stop(0.0, this.audio_object_reverse_gear);
        _super.prototype.delFromVisualManager.call(this);
    };

    WCanvasCarMarker._get_icon_by_sub_class = function(sub_class) {
        var icon_name = null;
        switch (sub_class) {
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
                console.log('Не найдена иконка. Установлена стандартная. ', sub_class);
                icon_name = 'car';
        }
        return icon_name;
    };

    WCanvasCarMarker.prototype.updateIcon = function() {
        this.cm_z_index = 11;
        var car = this.mobj;
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

        icon_name = WCanvasCarMarker._get_icon_by_sub_class(car.sub_class_car);

        this.icon_obj = iconsLeaflet.getIcon('icon_' + icon_type + '_' + icon_name);
        this.icon_arrow_obj = iconsLeaflet.getIcon('icon_' + icon_type + '_arrow');

        this.icon_obj_focused = iconsLeaflet.getIcon("icon_car_focused");

        this.icon_size_min_div_2 = Math.min(this.icon_obj.iconSize[0], this.icon_obj.iconSize[1]) >> 1;
    };

    return WCanvasCarMarker;
})(WCanvasMarker);


var WCanvasStaticTownMarker = (function (_super) {
    __extends(WCanvasStaticTownMarker, _super);

    function WCanvasStaticTownMarker(mobj) {
        _super.call(this, mobj);
    }

    WCanvasStaticTownMarker.prototype.getVisibleState = function () {
        var zoom = 15. - mapCanvasManager.real_zoom;
        if (zoom <= 0) return 0;
        if (zoom > 1.) return 1.;
        return zoom;
    };

    WCanvasStaticTownMarker.prototype.updateIcon = function() {
        //console.log('WCanvasStaticTownMarker.prototype.updateIcon');
        var mobj = this.mobj;
        var icon_name = '';
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
        this.cm_z_index = 75;
        this.icon_obj = iconsLeaflet.getIcon('icon_' + icon_name);
        if (!this.icon_obj) return;
        this.frame_count = this.icon_obj.frames;
        this.time_of_frame = this.duration / this.icon_obj.frames;
        this.frame_width = this.icon_obj.size[0]; // размер одного кадра
        this.frame_height = this.icon_obj.size[1]; // размер одного кадра
        this.offset_x = -0.5;  // Множитель сдвига кадра по оси Х (размер кадра умножается на это число)
        this.offset_y = -0.5; // Множитель сдвига кадра по оси Y (размер кадра умножается на это число)
        if (mobj.cls == 'Town' || mobj.cls == 'GasStation') {
            //this.icon_offset = {x: -this.icon_obj.iconSize[0] >> 1, y: -this.icon_obj.iconSize[0] + 10} // Старый сдвиг
            this.offset_y = -1.0; // Множитель сдвига кадра по оси Y (размер кадра умножается на это число)
        }
    };

    return WCanvasStaticTownMarker;
})(WCanvasMarker);


var WCanvasLootMarker = (function (_super) {
    __extends(WCanvasLootMarker, _super);

    function WCanvasLootMarker(mobj) {
        this.icon_backlight = null;
        this.is_backlight = false;

        _super.call(this, mobj);
        this.obj_id = mobj.ID;

        if (mobj.cls == "POICorpse")
            new WCanvasNicknameMarker(mobj, this);
    }

    WCanvasLootMarker.prototype.updateIcon = function() {
        //console.log('WCanvasStaticTownMarker.prototype.updateIcon');
        // this.cm_z_index = 15; // info выглядит лучше, но кликать менее удобно - потестить и подумать ещё
        this.cm_z_index = 10;
        if (this.mobj.cls == "POICorpse") {
            var icon_name = WCanvasCarMarker._get_icon_by_sub_class(this.mobj.sub_class_car);
            this.icon_obj = iconsLeaflet.getIcon("icon_dead_" + icon_name);
        }
        else
            this.icon_obj = iconsLeaflet.getIcon("icon_loot");
        if (! this.icon_obj) return;
        this.duration = 1000;
        this.frame_count = this.icon_obj.frames;
        this.time_of_frame = this.duration / this.icon_obj.frames;
        this.frame_width = this.icon_obj.size[0]; // размер одного кадра
        this.frame_height = this.icon_obj.size[1]; // размер одного кадра
        this.offset_x = -0.5; // Множитель сдвига кадра по оси Х (размер кадра умножается на это число)
        this.offset_y = -0.5; // Множитель сдвига кадра по оси Y (размер кадра умножается на это число)

        this.icon_size_min_div_2 = Math.min(this.frame_width, this.frame_height) >> 1;

        this.icon_backlight = iconsLeaflet.getIcon("icon_car_focused");
    };

    WCanvasLootMarker.prototype.click_handler = function(event) {
        //console.log('WCanvasPOILootMarker.prototype.click_handler', event);
        returnFocusToMap();
        if (! user.userCar) return;
        if (this.is_backlight) // Если мы в радиусе доступа, то открыть окно
            windowTemplateManager.openUniqueWindow('container' + this.obj_id, '/container', {container_id: this.obj_id});
        else { // Попробовать подъехать к цели
            var p = subVector(user.userCar.getCurrentCoord(clock.getCurrentTime()), this._last_mobj_position);
            var r = this.mobj.hasOwnProperty('p_observing_range') ? this.mobj.p_observing_range / 2. : 15;
            p = normVector(p, r);
            clientManager.sendGoto(summVector(p, this._last_mobj_position));
        }
    };

    WCanvasLootMarker.prototype._get_rotate_angle = function (time) {
        return 0;
    };

    WCanvasLootMarker.prototype.post_redraw = function(ctx, time, client_time) {
        if (! this.is_backlight || ! this.icon_backlight) return;
        var ctx_car_pos = this._last_car_ctx_pos || this._last_mobj_ctx_pos;
        ctx.save();
        ctx.translate(ctx_car_pos.x, ctx_car_pos.y);
        ctx.drawImage(this.icon_backlight.img, -this.icon_backlight.iconSize[0] >> 1, -this.icon_backlight.iconSize[1] >> 1);
        ctx.restore();
    };

    return WCanvasLootMarker;
})(WCanvasMarker);


var WCanvasNicknameMarker = (function (_super) {
    __extends(WCanvasNicknameMarker, _super);

    function WCanvasNicknameMarker(mobj, w_car_marker) {
        _super.call(this, mobj, w_car_marker);
        this.obj_id = mobj.ID;
        this._nickname = mobj._agent_login;
        this.w_car_marker = w_car_marker;
        this._offset = new Point(0, -15);
        this._font = "8pt MICRADI";
        this._text_height = 8; // Высота зависит от размера шрифта
        this._text_width = 8 * this._nickname.length; // Ширина также зависит от размера шрифта
    }

    WCanvasNicknameMarker.prototype.redraw = function(ctx, time){
        //console.log('WCanvasNicknameMarker.prototype.redraw', time);
        if (!this._nickname) return;
        var focused = mapCanvasManager._mouse_focus_widget == this;
        ctx.save();
        var ctx_car_pos = summVector(this.w_car_marker._last_car_ctx_pos || this.w_car_marker._last_mobj_ctx_pos, this._offset);
        ctx.translate(ctx_car_pos.x, ctx_car_pos.y - 3);
        this._last_mobj_ctx_pos = ctx_car_pos;
        this._last_mobj_position = this.w_car_marker._last_mobj_position;
        // Вывод лейбла
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = this._font;
        ctx.fillStyle = focused ? 'rgba(42, 253, 10, 0.9)' : 'rgba(42, 253, 10, 0.6)';
        ctx.fillText(this._nickname, 0, 0);
        ctx.restore();
    };

    WCanvasNicknameMarker.prototype.mouse_test = function(time) {
        //console.log('WCanvasMarker.prototype.mouse_test');
        var distance = subVector(this._last_mobj_ctx_pos, mapCanvasManager._mouse_client);
        return Math.abs(distance.x) < this._text_width && Math.abs(distance.y) < this._text_height;
    };

    WCanvasNicknameMarker.prototype.updateIcon = function () {
        //console.log('WCanvasNicknameMarker.prototype.updateIcon');
        // this.cm_z_index = 15; // info выглядит лучше, но кликать менее удобно - потестить и подумать ещё
        this.cm_z_index = 9;
    };

    WCanvasNicknameMarker.prototype.click_handler = function(event) {
        //console.log('WCanvasNicknameMarker.prototype.click_handler');
        if (!this._nickname) return;

        windowTemplateManager.openUniqueWindow(
            'corpse_info_' + this._nickname,
            '/corpse_info',
            {container_id: this.obj_id},
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

    return WCanvasNicknameMarker;
})(WCanvasMarker);


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
            var ctx_car_pos = this.w_car_marker._last_car_ctx_pos || this.w_car_marker._last_mobj_ctx_pos;
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


var WCanvasAnimateMarkerPowerUp = (function (_super) {
    __extends(WCanvasAnimateMarkerPowerUp, _super);

    function WCanvasAnimateMarkerPowerUp(mobj) {
        _super.call(this, mobj);
        this.position = mobj.getCurrentCoord(clock.getCurrentTime());
        this._power_up_overdown = null;
    }

    WCanvasAnimateMarkerPowerUp.prototype.delFromVisualManager = function () {
        //console.log('WCanvasUserCarMarker.prototype.delFromVisualManager');
        if(this._power_up_overdown)
            new ECanvasPowerUpOverDown(this.position, this._power_up_overdown).start();
        else
            new ECanvasPowerUpHide(this.position).start();
        _super.prototype.delFromVisualManager.call(this);
    };

    WCanvasAnimateMarkerPowerUp.prototype.getVisibleState = function (time) {
        if (user.userCar && user.userCar.getObservingRange(time) <= distancePoints(this.position, user.userCar.getCurrentCoord(time)))
            return 0.2;
        else
            return 1.0;
    };

    WCanvasAnimateMarkerPowerUp.prototype._get_frame_num = function (time, client_time) {
        if (user.userCar && user.userCar.getObservingRange(time) <= distancePoints(this.position, user.userCar.getCurrentCoord(time)))
            return 0;
        else
            return _super.prototype._get_frame_num.call(this, time, client_time);
    };

    WCanvasAnimateMarkerPowerUp.prototype.updateIcon = function() {
        //console.log('WCanvasAnimateMarker.prototype.updateIcon');
        // Здесь нужно заполнить все эти параметры
        this.cm_z_index = 10;
        this.icon_obj = iconsLeaflet.getIcon(this.mobj._icon_name);
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
})(WCanvasMarker);


var WCanvasAnimateMarkerShieldEffect = (function (_super) {
    __extends(WCanvasAnimateMarkerShieldEffect, _super);

    function WCanvasAnimateMarkerShieldEffect(mobj) {
        _super.call(this, mobj);
    }

    WCanvasAnimateMarkerShieldEffect.prototype.updateIcon = function() {
        //console.log('WCanvasAnimateMarker.prototype.updateIcon');
        // Здесь нужно заполнить все эти параметры
        this.cm_z_index = 8; // todo: Выбрать правильный приоритет
        this.icon_obj = iconsLeaflet.getIcon("icon-car-effect-shield");
        this.duration = 1500;
        this.frame_count = this.icon_obj.frames;
        this.time_of_frame = this.duration / this.icon_obj.frames;
        this.frame_width = this.icon_obj.size[0]; // размер одного кадра
        this.frame_height = this.icon_obj.size[1]; // размер одного кадра
        this.offset_x = -0.5; // Множитель сдвига кадра по оси Х (размер кадра умножается на это число)
        this.offset_y = -0.5; // Множитель сдвига кадра по оси Y (размер кадра умножается на это число)
        this.scale_icon_x = 1.0;
        this.scale_icon_y = 1.0;
    };

    return WCanvasAnimateMarkerShieldEffect;
})(WCanvasMarker);


var WCanvasRocketMarkerEffect = (function (_super) {
    __extends(WCanvasRocketMarkerEffect, _super);

    function WCanvasRocketMarkerEffect(mobj) {
        _super.call(this, mobj);

        this.tail_particles_last_born_time = 0;
        this.tail_particles_interval_stay = 4000;
    }

    WCanvasRocketMarkerEffect.prototype.updateIcon = function() {
        //console.log('WCanvasAnimateMarker.prototype.updateIcon');
        // Здесь нужно заполнить все эти параметры
        this.cm_z_index = 8; // todo: Выбрать правильный приоритет
        this.icon_obj = iconsLeaflet.getIcon(this.mobj._icon_name);
        if (! this.icon_obj) return;
        this.duration = 1000;
        this.frame_count = this.icon_obj.frames;
        this.time_of_frame = this.duration / this.icon_obj.frames;
        this.frame_width = this.icon_obj.size[0]; // размер одного кадра
        this.frame_height = this.icon_obj.size[1]; // размер одного кадра
        this.offset_x = -0.5; // Множитель сдвига кадра по оси Х (размер кадра умножается на это число)
        this.offset_y = -0.5; // Множитель сдвига кадра по оси Y (размер кадра умножается на это число)
        this.scale_icon_x = 1.0;
        this.scale_icon_y = 1.0;
    };

    WCanvasRocketMarkerEffect.prototype.post_redraw = function(ctx, time, client_time) {
        if (mapCanvasManager._settings_particles_tail == 0) return;
        var speed = this.mobj.getCurrentSpeed(time);
        var speed_abs = Math.abs(speed);
        var pos_real = this._last_mobj_position;
        var direction_real = this._last_mobj_direction;
        this.tail_particles_interval_stay = 3000;
        if (speed_abs > 1.0 && this.tail_particles_interval_stay && this.tail_particles_last_born_time + this.tail_particles_interval_stay / speed_abs < time * 1000) {
            this.tail_particles_last_born_time = time * 1000;
            //new ECanvasCarTail(getRadialRandomPointWithAngle(pos_real, -8, direction_real, 0.5), direction_real, 3000, "icon-car-tail-1", 2.).start();

            new ECanvasCarTail(getRadialRandomPointWithAngle(pos_real, -5, direction_real, 0.5), Math.PI / 2. + direction_real, 2500 * mapCanvasManager._settings_particles_tail, "icon-rocket-tail-03", 0.5, 0.25).start();
        }
    };

    return WCanvasRocketMarkerEffect;
})(WCanvasMarker);
