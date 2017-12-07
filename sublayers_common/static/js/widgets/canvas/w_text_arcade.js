var WTextArcade = (function () {
    WTextArcade.prototype.queue = [];

    WTextArcade.prototype.settings = {
        priority: 0,
        single_long: true,
        phases_duration_preset : {
            fast: {
                start: 400,
                freeze: 100,
                finish: 400
            },
            slow: {
                start: 1700,
                freeze: 200,
                finish: 600
            }
        },
        text_color: '#00ffa1',
        shadow_color: '#00cc81',
        audio: null
    };

    WTextArcade.prototype.position_functions = {
        easeOutElastic: function(x, t, b, c, d) {
            // x: percent of animate, t: current time, b: begInnIng value, c: change In value, d: duration
            if (x > 0.68) return 0;
            var s = 1.70158;
            var p = 0;
            var a = c;
            if (t == 0) return b;
            if ((t /= d) == 1) return b + c;
            if (!p) p = d * .3;
            if (a < Math.abs(c)) {
                a = c;
                var s = p / 4;
            }
            else var s = p / (2 * Math.PI) * Math.asin(c / a);
            return a * Math.pow(2, -10 * t) * Math.sin((t * d - s) * (2 * Math.PI) / p) + c + b;
        },
        easeInBack: function(x, t, b, c, d, s) {
            if (s == undefined) s = 1.70158;
            return c * (t /= d) * t * ((s + 1) * t - s) + b;
        },
        easeInCirc: function (x, t, b, c, d) {
            return -c * (Math.sqrt(1 - (t /= d) * t) - 1) + b;
        },
        easeOutCirc: function (x, t, b, c, d) {
            return c * Math.sqrt(1 - (t = t / d - 1) * t) + b;
        },
    };

    function WTextArcade(text){
        this.start_time = 0; // start current phase
        this.text = text || "";
        this.position = 500;

        this.center = new Point(mapCanvasManager.canvas.width / 2.0, 150);

        this.phases_dur = this.settings.phases_duration_preset.slow;

        this.phases_func = {
            start: this.position_functions['easeOutElastic'],
            finish: this.position_functions['easeInBack']
        };

        this.phase = null;
        var font_size = mapCanvasManager.canvas.width > 1366 ? 42 : 28;
        this._font = "italic " + font_size.toString() + "px DS-Crystal";
        this.play_object = null;
    }

    WTextArcade.prototype.start = function() {
        if (basic_server_mode) return;
        this.queue.push(this);
        this.queue.sort(function(a, b) {return a.settings.priority < b.settings.priority});
        if (this.queue.length == 1) setTimeout(this._start.bind(this), 10);
        return this;
    };

    WTextArcade.prototype._start = function () {
        if (this.queue.length > 1) {
            // Изменить отображение на быстрый вариант
            this.phases_func = {
                start: this.position_functions['easeOutCirc'],
                finish: this.position_functions['easeInCirc']
            };
            this.phases_dur = this.settings.phases_duration_preset.fast;
        }

        this.start_time = clock.getClientTime();
        mapCanvasManager.add_vobj(this, 0.5);
        this.phase = "start";

        if (this.settings.audio)
            this.play_object = audioManager.play({
                name: this.settings.audio,
                gain: 1.0 * audioManager._settings_interface_gain,
                priority: 1.0,
                loop: true
            });
    };

    WTextArcade.prototype._phase_progress = function (phase_dur, time) {
        return (time - this.start_time) / phase_dur;
    };

    WTextArcade.prototype._test_phase = function(time) {
        var prc = 0;
        if (this.phase == "start") {
            prc = this._phase_progress(this.phases_dur.start, time);
            if (prc < 0 || prc >= 1.0) { // Смена фазы
                this.phase = "freeze";
                this.start_time += this.phases_dur.start;
            }
        }

        if (this.phase == "freeze") {
            if (this.phases_dur.freeze >= 0) {
                // если нет других сообщений, то увеличить длину этой фазы
                var phaze_dur = this.settings.single_long && this.queue.length == 1 ? 3 * this.phases_dur.freeze :
                                                                                      this.phases_dur.freeze;
                prc = this._phase_progress(phaze_dur, time);
                if (prc < 0 || prc >= 1.0) { // Смена фазы
                    this.phase = "finish";
                    this.start_time = time;
                }
            }
        }

        if (this.phase == "force_finish") {
            this.phase = "finish";
            this.start_time = time;
        }

        if (this.phase == "finish") {
            prc = this._phase_progress(this.phases_dur.finish, time);
            if (prc < 0 || prc >= 1.0) { // Завершение
                this.phase = null;
                this.start_time = null;
                this.finish();
            }
        }

        return Math.max(Math.min(prc, 1.0), 0.0);
    };

    WTextArcade.prototype._get_alpha = function (prc, time, pos) {
        var center_x = this.center.x;
        var path_of_visibility = center_x * 0.2;
        if (this.phase == "start") {
            if (pos > -path_of_visibility) return 1.0;
            pos = pos - (-path_of_visibility);
            return 1.0 - (-pos / (center_x - path_of_visibility));
        }
        if (this.phase == "finish") {
            if (pos < path_of_visibility) return 1.0;
            pos = pos - path_of_visibility;
            return 1.0 - pos / (center_x - path_of_visibility);
        }
        return 1.0;
    };

    WTextArcade.prototype._get_position = function (prc, time) {
        if (this.phase == "start") {
            return this.phases_func.start(prc, time - this.start_time, -this.center.x, this.center.x, this.phases_dur.start);
        }
        if (this.phase == "finish") {
            return this.phases_func.finish(prc, time - this.start_time, 0, this.center.x, this.phases_dur.finish)
        }
        return 0;
    };

    WTextArcade.prototype.finish = function () {
        // console.log("WTextArcade.prototype.finish", this.phase);

        // Это надо для "бесконечных" эффектов, чтобы они корректно завершались
        if (this.phase) { this.phase = "force_finish"; return; }

        mapCanvasManager.del_vobj(this);
        var index = this.queue.indexOf(this);
        if (index >=0) this.queue.splice(index, 1);
        if (this.queue.length > 0) this.queue[0]._start();

        if (this.play_object)
            audioManager.stop(null, this.play_object);
    };

    WTextArcade.prototype.redraw = function (ctx, time) {
        time = clock.getClientTime(); // Здесь нужно именно клиентское время для плавности
        var prc = this._test_phase(time);
        //console.log(prc, this.start_time);
        if (!this.start_time) return;
        ctx.save();
        var pos = this._get_position(prc, time);
        ctx.globalAlpha = this._get_alpha(prc, time, pos);
        ctx.translate(this.center.x + pos, this.center.y);
        ctx.textAlign = "center";
        ctx.textBaseline = "center";
        ctx.font = this._font;
        ctx.fillStyle = this.settings.text_color;
        ctx.shadowColor = this.settings.shadow_color;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowBlur = 10;
        ctx.fillText(this.text, 0, 0);
        ctx.restore();
    };

    return WTextArcade
})();

// Общий класс для не выезжающих сообщений
var WTextArcadeStat = (function (_super) {
    __extends(WTextArcadeStat, _super);

    WTextArcadeStat.prototype.settings = {
        priority: 0,
        single_long: false,
        phases_duration_preset : {
            fast: {
                start: 400,
                freeze: 200,
                finish: 400
                },
            slow: {
                start: 400,
                freeze: 500,
                finish: 400
            }
        },
        text_color: '#00ffa1',
        shadow_color: '#00cc81',
        audio: null
    };

    function WTextArcadeStat(text){
        _super.call(this, text);
    }

    WTextArcadeStat.prototype.start = function() {
        if (locationManager.in_location_flag) return;
        this.queue.push(this);
        this.queue.sort(function(a, b) {return a.settings.priority < b.settings.priority});
        if (this.queue.length == 1) setTimeout(this._start.bind(this), 10);
        return this;
    };

    WTextArcadeStat.prototype._get_alpha = function (prc, time, pos) {
        if (this.phase == "start") return prc;
        if (this.phase == "finish") return 1.0 - prc;
        return 0.5 + Math.random() * 0.5;
    };

    WTextArcadeStat.prototype._get_position = function (prc, time) { return 0; };

    return WTextArcadeStat
})(WTextArcade);

// Класс для выезжающих сообщений в рамке (абстрактный)
var WTextArcadeStatRect = (function (_super) {
    __extends(WTextArcadeStatRect, _super);

    function WTextArcadeStatRect() {
        _super.call(this, '');

        // var font_size = mapCanvasManager.canvas.width > 1366 ? 42 : 28;
        var font_size = 42;
        this._font1 = font_size.toString() + "px Nouveau_IBM";
        this._font2 = (font_size - 6).toString() + "px Nouveau_IBM";

        this.first_line = '';
        this.second_line = '';
        this.rect_param = { x: -230, y: -100, w: 460, h: 130 }
    }

    WTextArcadeStatRect.prototype.redraw = function (ctx, time) {
        time = clock.getClientTime(); // Здесь нужно именно клиентское время для плавности
        var prc = this._test_phase(time);
        //console.log(prc, this.start_time);
        if (!this.start_time) return;
        ctx.save();
        var pos = this._get_position(prc, time);
        ctx.globalAlpha = this._get_alpha(prc, time, pos);
        ctx.translate(this.center.x + pos, this.center.y);
        ctx.textAlign = "center";
        ctx.textBaseline = "center";
        ctx.font = this._font1;
        ctx.fillStyle = this.settings.text_color;
        ctx.shadowColor = this.settings.shadow_color;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowBlur = 10;
        ctx.fillText(this.first_line, 0, 0);
        ctx.translate(0, 50);
        ctx.font = this._font2;
        ctx.fillText(this.second_line, 0, 0);

        ctx.lineWidth = 2;
        ctx.strokeStyle = this.settings.text_color;
        ctx.rect(this.rect_param.x, this.rect_param.y, this.rect_param.w, this.rect_param.h);
        ctx.stroke();

        ctx.restore();
    };

    return WTextArcadeStatRect
})(WTextArcadeStat);

// ========================= Красная группа не выезжающих
var WTextArcadeStatAttackWarning = (function (_super) {
    __extends(WTextArcadeStatAttackWarning, _super);

    WTextArcadeStatAttackWarning.prototype.settings = {
        priority: 1,
        single_long: false,
        phases_duration_preset : {
            fast: {
                start: 350,
                freeze: 2100,
                finish: 350
                },
            slow: {
                start: 350,
                freeze: 2100,
                finish: 350
            }
        },
        text_color: '#ff0000',
        shadow_color: '#ff0000',
        audio: 'red_alert'
    };

    function WTextArcadeStatAttackWarning(){
        _super.call(this, '');

        this.first_line = _('msg_attack_warning_1');
        this.second_line = _('msg_attack_warning_2');
        this.rect_param = { x: -230, y: -100, w: 460, h: 130 }
    }

    WTextArcadeStatAttackWarning.prototype._get_alpha = function (prc, time, pos) {
        if (this.phase == "start") return prc;
        if (this.phase == "finish") return 1.0 - prc;
        var blinc_prc = (prc % 0.25) / 0.25;
        if (blinc_prc <= 0.5) return 1.0;
        else return 0.5;
    };

    return WTextArcadeStatAttackWarning
})(WTextArcadeStatRect);


var WTextArcadeStatTurretWarning = (function (_super) {
    __extends(WTextArcadeStatTurretWarning, _super);

    function WTextArcadeStatTurretWarning(){
        _super.call(this, '');

        this.first_line = _('msg_turret_warning_1');
        this.second_line = _('msg_turret_warning_2');

        this.rect_param = { x: -380, y: -100, w: 760, h: 130 }
    }

    return WTextArcadeStatTurretWarning
})(WTextArcadeStatAttackWarning);


var WTextArcadeStatCriticalCondition = (function (_super) {
    __extends(WTextArcadeStatCriticalCondition, _super);

    function WTextArcadeStatCriticalCondition(){
        _super.call(this, '');

        this.first_line = _('msg_critical_conditiong_1');
        this.second_line = _('msg_critical_conditiong_2');

        this.rect_param = { x: -380, y: -100, w: 760, h: 130 }
    }

    return WTextArcadeStatCriticalCondition
})(WTextArcadeStatAttackWarning);


var WTextArcadeStatAmmoFinish = (function (_super) {
    __extends(WTextArcadeStatAmmoFinish, _super);

    function WTextArcadeStatAmmoFinish(){
        _super.call(this, '');

        this.first_line = _('msg_ammo_finish_1');
        this.second_line = _('msg_ammo_finish_2');

        this.rect_param = { x: -300, y: -100, w: 600, h: 130 }
    }

    return WTextArcadeStatAmmoFinish
})(WTextArcadeStatAttackWarning);
// ========================= Красная группа не выезжающих (конец)

// ========================= Зеленая группа не выезжающих
var WTextArcadeStatQuestItem = (function (_super) {
    __extends(WTextArcadeStatQuestItem, _super);

    WTextArcadeStatQuestItem.prototype.settings = {
        priority: 0.5,
        single_long: false,
        phases_duration_preset : {
            fast: {
                start: 570,
                freeze: 1140,
                finish: 570
                },
            slow: {
                start: 570,
                freeze: 1140,
                finish: 570
            }
        },
        text_color: '#00ffa1',
        shadow_color: '#00cc81',
        audio: 'green_alert'
    };

    function WTextArcadeStatQuestItem(){
        _super.call(this, '');

        this.first_line = _('msg_quest_item_1');
        this.second_line = _('msg_quest_item_2');
        this.rect_param = { x: -300, y: -100, w: 600, h: 130 }
    }

    WTextArcadeStatQuestItem.prototype._get_alpha = function (prc, time, pos) {
        if (this.phase == "start") return prc;
        if (this.phase == "finish") return 1.0 - prc;
        var blinc_prc = (prc % 0.5) / 0.5;
        if (blinc_prc <= 0.66) return 1.0;
        else return 0.5;
    };

    return WTextArcadeStatQuestItem
})(WTextArcadeStatRect);


var WTextArcadeStatSkillPoint = (function (_super) {
    __extends(WTextArcadeStatSkillPoint, _super);

    function WTextArcadeStatSkillPoint(){
        _super.call(this, '');

        this.first_line = _('msg_skill_point_1');
        this.second_line = _('msg_skill_point_2');
        this.rect_param = { x: -350, y: -100, w: 700, h: 130 }
    }

    return WTextArcadeStatSkillPoint
})(WTextArcadeStatQuestItem);


var WTextArcadeStatNewLVL = (function (_super) {
    __extends(WTextArcadeStatNewLVL, _super);

    function WTextArcadeStatNewLVL(){
        _super.call(this, '');

        this.first_line = _('msg_new_lvl_1');
        this.second_line = _('msg_new_lvl_2');
        this.rect_param = { x: -320, y: -100, w: 640, h: 130 }
    }

    return WTextArcadeStatNewLVL
})(WTextArcadeStatQuestItem);


var WTextArcadeStatBarterSucces = (function (_super) {
    __extends(WTextArcadeStatBarterSucces, _super);

    function WTextArcadeStatBarterSucces(){
        _super.call(this, '');

        this.first_line = _('msg_barter_success_1');
        this.second_line = '';
        this.rect_param = { x: -430, y: -100, w: 860, h: 70 }
    }

    return WTextArcadeStatBarterSucces
})(WTextArcadeStatQuestItem);


var WTextArcadeStatReceiveExp = (function (_super) {
    __extends(WTextArcadeStatReceiveExp, _super);

    function WTextArcadeStatReceiveExp(){
        _super.call(this, '');

        this.first_line = _('msg_receive_exp_1');
        this.second_line = '';
        this.rect_param = { x: -400, y: -100, w: 800, h: 70 }
    }

    return WTextArcadeStatReceiveExp
})(WTextArcadeStatQuestItem);


var WTextArcadeStatReceiveKarma = (function (_super) {
    __extends(WTextArcadeStatReceiveKarma, _super);

    function WTextArcadeStatReceiveKarma(){
        _super.call(this, '');

        this.first_line = _('msg_receive_karma_1');
        this.second_line = '';
        this.rect_param = { x: -320, y: -100, w: 640, h: 70 }
    }

    return WTextArcadeStatReceiveKarma
})(WTextArcadeStatQuestItem);


var WTextArcadeStatLostKarma = (function (_super) {
    __extends(WTextArcadeStatLostKarma, _super);

    function WTextArcadeStatLostKarma(){
        _super.call(this, '');

        this.first_line = _('msg_lost_karma_1');
        this.second_line = '';
        this.rect_param = { x: -320, y: -100, w: 640, h: 70 }
    }

    return WTextArcadeStatLostKarma
})(WTextArcadeStatQuestItem);


var WTextArcadeStatSpyStart = (function (_super) {
    __extends(WTextArcadeStatReceiveKarma, _super);

    function WTextArcadeStatReceiveKarma(){
        _super.call(this, '');

        this.first_line = _('msg_spy_start_1');
        this.second_line = '';
        this.rect_param = { x: -320, y: -100, w: 640, h: 70 }
    }

    return WTextArcadeStatReceiveKarma
})(WTextArcadeStatQuestItem);


var WTextArcadeStatSpyFailed = (function (_super) {
    __extends(WTextArcadeStatLostKarma, _super);

    function WTextArcadeStatLostKarma(){
        _super.call(this, '');

        this.first_line = _('msg_spy_failed_1');
        this.second_line = '';
        this.rect_param = { x: -320, y: -100, w: 640, h: 70 }
    }

    return WTextArcadeStatLostKarma
})(WTextArcadeStatQuestItem);


var WTextArcadeStatQuestReward = (function (_super) {
    __extends(WTextArcadeStatQuestReward, _super);

    function WTextArcadeStatQuestReward(){
        _super.call(this, '');

        this.first_line = _('msg_quest_reward_1');
        this.second_line = _('msg_quest_reward_2');
        this.rect_param = { x: -350, y: -100, w: 700, h: 130 }
    }

    return WTextArcadeStatQuestReward
})(WTextArcadeStatQuestItem);


var WTextArcadeStatQuestFailed = (function (_super) {
    __extends(WTextArcadeStatQuestFailed, _super);

    function WTextArcadeStatQuestFailed(){
        _super.call(this, '');

        this.first_line = _('msg_quest_failed_1');
        this.second_line = _('msg_quest_failed_2');
        this.rect_param = { x: -320, y: -100, w: 640, h: 130 }
    }

    return WTextArcadeStatQuestFailed
})(WTextArcadeStatQuestItem);
// ========================= Зеленая группа не выезжающих (конец)

function TextArcadeTest() {
    // new WTextArcadeStatQuestItem().start();
    // new WTextArcadeStatSkillPoint().start();
    // new WTextArcadeStatNewLVL().start();
    // new WTextArcadeStatAttackWarning().start();
    // new WTextArcadeStatTurretWarning().start();
    // new WTextArcadeStatCriticalCondition().start();
    // new WTextArcadeStatAmmoFinish().start();
    // new WTextArcadeStatBarterSucces().start();
    // new WTextArcadeStatReceiveExp().start();
    // new WTextArcadeStatReceiveKarma().start();
    // new WTextArcadeStatLostKarma().start();
    // new WTextArcadeStatSpyStart().start();
    // new WTextArcadeStatSpyFailed().start();
    // new WTextArcadeStatQuestReward().start();
    // new WTextArcadeStatQuestFailed().start();
}