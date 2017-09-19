var TextConsoleManager = (function(){
    function TextConsoleManager() {
        this.jq_main_div_wrap = $('#textConsoleDivWrap');
        this.jq_main_div = $('#textConsoleDiv');
        this.active_console = null;
        this.consoles = {};
        this.app_version = $('#settings_app_version').text();
        this.user_name = $('#settings_user_name').text();
        this.user_balance = $('#settings_user_balance').text();
        this.user_position = $('#settings_user_position').text();

        this.first_start_time = null;  // время начала показывания консоли. Если даже стартанули другие консоли, не закрывая предыдущую.
        this.min_view_time = 0;

        // todo: передалать этот костыль !
        this.jq_main_div_wrap.click(function(){$('#textConsoleDiv').focus();})

    }

    TextConsoleManager.prototype.add = function(con, name) {
        if (this.consoles.hasOwnProperty(name) && this.consoles[name])
            console.warn('Попытка переопределения консоли - ' + name + '.');
        this.consoles[name] = con;
    };

    TextConsoleManager.prototype.del = function(name) {
        if (this.consoles.hasOwnProperty(name)) {
            if (this.active_console == this.consoles[name]) {
                this.active_console.stop();
                this.active_console = null;
            }
            this.consoles[name] = null;
        }
        else
            console.warn('Попытка удаления отсутствующей консоли - ' + name + '.');
    };

    TextConsoleManager.prototype.start = function(name, min_view_time, options) {
        // Останавливаем все консоли
        for (var key in this.consoles)
            if (this.consoles.hasOwnProperty(key) && this.consoles[key])
                this.consoles[key].stop();
        this.active_console = null;

        if (this.consoles.hasOwnProperty(name) && this.consoles[name]) {
            this.jq_main_div_wrap.addClass('show');
            this.active_console = this.consoles[name];
            this.active_console.start(options);

            if (min_view_time != undefined && min_view_time > 0) {
                this.min_view_time = min_view_time;
                if (! this.first_start_time)
                    this.first_start_time = clock.getClientTime();
            }

        }
    };

    TextConsoleManager.prototype._stop = function() {
        for (var i = 0; i < this.consoles.length; i++)
            this.consoles[i].stop();
        this.active_console = null;
        this.jq_main_div_wrap.removeClass('show');

        this.first_start_time = null;
        this.min_view_time = 0;
    };

    TextConsoleManager.prototype.stop = function() {
        var self = this;
        var curr_time = clock.getClientTime();
        if (this.first_start_time && curr_time - this.first_start_time < this.min_view_time) {
            setTimeout(self._stop.bind(self), this.min_view_time - (curr_time - this.first_start_time));
        }
        else
            self._stop();
    };

    TextConsoleManager.prototype.async_stop = function() {
        var self = this;
        setTimeout(function(){self.stop();}, 10);
    };

    TextConsoleManager.prototype.add_log_message = function(message) {
        try {message = message.replace(/<br>/g, " "); }catch (e) {return};
        var jq_old_text = this.jq_main_div.find('.console-old-text');
        var old_text = jq_old_text.text();
        old_text = old_text.substr(old_text.length - 2000, 2000); // хранить последение 2000 символов
        old_text = old_text + '\n> ' + message;
        jq_old_text.text(old_text);
    };

    return TextConsoleManager;
})();


var TextConsole = (function(){
    function TextConsole() {
        this._message_info = {
            user: {
                print_speed_ms: 2.5,
                after_print_delay: 0,
                before_print_delay: 0,
                placeholder: function() {
                    var data = new Date();
                    var hh_str = data.getHours().toString();
                    var mm_str = data.getMinutes().toString();
                    hh_str = hh_str.length == 2 ? hh_str : '0' + hh_str;
                    mm_str = mm_str.length == 2 ? mm_str : '0' + mm_str;
                    return '\n[' + hh_str + ':' + mm_str + ']: ';
                }
            },
            interrupt: {
                print_speed_ms: 0,
                after_print_delay: 0,
                before_print_delay: 0,
                placeholder: function() { return ''; }
            },
            user_input: {
                print_speed_ms: 0,
                after_print_delay: 0,
                before_print_delay: 0,
                placeholder: function() { return ''; }
            },
            system: {
                print_speed_ms: 1,
                after_print_delay: 2.5,
                before_print_delay: 2.5,
                placeholder: function() { return '> ' }
            },
            welcome: {
                print_speed_ms: 1,
                after_print_delay: 0,
                before_print_delay: 0,
                placeholder: function() { return ''; }
            }
        };

        this.target_div = null;         // див в который осуществлять печать

        this._is_started = false;       // признак того что консоль запущена
        this._is_first = true;
        this._wait_input = false;       // флаг ожидания ввода символа от пользователя

        this._messages = [];            // список сообщений ожидающих вывод
        this._text = '';                // последний текст выведенный в консоль
        this._cur_message = null;       // сообщение обрабатываемое в данный момент
        this._cur_message_len = 0;      // длина текущего сообщения

        this._cur_symbol = 0;           // текущий символ
        this._cur_delay = 0;            // текущее состояние задержки

        this.final_indicator_frequency = 300;       // частота мигания финального индикатора (мс)
        this._final_indicator_state = false;        // состояние финального индикатора (' ' или '█')

        this._timeout = null;
    }

    TextConsole.prototype._replaceAt=function(str, index, character) {
        return str.substr(0, index) + character + str.substr(index + character.length);
    };

    TextConsole.prototype.add_message = function(sender, message, interrupt) {
        if (interrupt) this.interrupt();
        if (this._message_info.hasOwnProperty(sender))
            this._messages.push({sender: sender, message: message});
        else
            console.warn('Неизвестный тип отправителя sender=', sender);
    };

    TextConsole.prototype.interrupt = function() {
        this._messages = [];

        if (((this._cur_message_len - this._cur_symbol) > 3) && (this._cur_message) && (this._cur_message.message)) {
            this._cur_message_len = this._cur_symbol + 3;
            this._cur_message.message = this._replaceAt(this._cur_message.message, this._cur_symbol + 0, '.');
            this._cur_message.message = this._replaceAt(this._cur_message.message, this._cur_symbol + 1, '.');
            this._cur_message.message = this._replaceAt(this._cur_message.message, this._cur_symbol + 2, '.');
            this._cur_message.message = this._cur_message.message.substr(0, this._cur_message_len);
        }

        if ((this._cur_message) && (this._cur_message.message))
            this._messages.push({sender: 'system', message: _("con_interrupt")});
    };

    TextConsole.prototype._state_wait_user_input = function(self) {
        //console.log('_state_wait_user_input');

        // Мигание каретки
        if (self._final_indicator_state)
            self.target_div.find('.console-new-text').text(self._text + '█');
        else
            self.target_div.find('.console-new-text').text(self._text + ' ');
        self._final_indicator_state = !self._final_indicator_state;

        // Проверка на наличие новых сообщений
        if (!self._wait_input) {
            self._final_indicator_state = false;
            self._state_selector(self);
        }
        else
            self._timeout = setTimeout(self._state_wait_user_input, self.final_indicator_frequency, self);
    };

    TextConsole.prototype._scroll_top = function() {
        this.target_div.each(function(index, element) {
            $(element).scrollTop(element.scrollHeight);
        });
    };

    TextConsole.prototype._state_print_text = function(self) {
        //console.log('TextConsole.prototype._state_print_text');
        // Если печатаем первый символ, то необходимо перейти на новую строку и напечатать placeholder
        if (self._cur_symbol == 0) {
            if (!self._is_first) self._text += '\n';
            self._text += self._cur_message.message_type.placeholder();
            self.target_div.find('.console-new-text').text(self._text + '█');
            self._scroll_top();
        }
        self._is_first = false;

        // Если сообщение мгновенное
        if (self._cur_message.message_type.print_speed_ms == 0) {
            self._text += self._cur_message.message;
            self.target_div.find('.console-new-text').text(self._text + '█');
            self._scroll_top();

            self._cur_symbol = self._cur_message_len;
        }

        // Если сообщение не выведено до конца
        if (self._cur_symbol < self._cur_message_len) {
            self._text += self._cur_message.message[self._cur_symbol];
            self.target_div.find('.console-new-text').text(self._text + '█');
            self._cur_symbol++;
            self._scroll_top();
            self._timeout = setTimeout(self._state_print_text, self._cur_message.message_type.print_speed_ms, self);
            return;
        }

        // Сообщение выведено
        self._cur_delay = 0;
        self._final_indicator_state = false;
        self._cur_message.message = '';
        self._state_after_print_delay(self);
    };

    TextConsole.prototype._state_after_print_delay = function(self) {
        //console.log('TextConsole.prototype._state_after_print_delay');
        // Проверяем завершилась ли задержка после печати
        if (self._cur_delay < self._cur_message.message_type.after_print_delay) {
            if (self._final_indicator_state)
                self.target_div.find('.console-new-text').text(self._text + '█');
            else
                self.target_div.find('.console-new-text').text(self._text + ' ');
            self._final_indicator_state = !self._final_indicator_state;
            self._cur_delay++;
            self._timeout = setTimeout(self._state_after_print_delay, self.final_indicator_frequency, self);
            return;
        }

        // Перейти в состояния выбора нового сообщения
        self._state_selector(self)
    };

    TextConsole.prototype._state_before_print_delay = function(self) {
        //console.log('TextConsole.prototype._state_before_print_delay');
        // Проверяем завершилась ли задержка перед печатью
        if (self._cur_delay < self._cur_message.message_type.before_print_delay) {
            if (self._final_indicator_state)
                self.target_div.find('.console-new-text').text(self._text + '█');
            else
                self.target_div.find('.console-new-text').text(self._text + ' ');
            self._final_indicator_state = !self._final_indicator_state;
            self._cur_delay++;
            self._timeout = setTimeout(self._state_before_print_delay, self.final_indicator_frequency, self);
            return;
        }

        // Перейти в состояния печати сообщения
        self._state_print_text(self)
    };

    TextConsole.prototype._state_print_final_indicator = function(self) {
        //console.log('_state_print_final_indicator');
        // Мигание каретки
        if (self._final_indicator_state)
            self.target_div.find('.console-new-text').text(self._text + '█');
        else
            self.target_div.find('.console-new-text').text(self._text + ' ');
        self._final_indicator_state = !self._final_indicator_state;

        // Проверка на наличие новых сообщений
        if (self._messages.length > 0) {
            self._final_indicator_state = false;
            self._state_selector(self);
        }
        else
            self._timeout = setTimeout(self._state_print_final_indicator, self.final_indicator_frequency, self);
    };

    TextConsole.prototype._state_selector = function(self) {
        //console.log('TextConsole.prototype._state_selector');
        // Если есть сообщение, то выбрать следующее
        if (self._messages.length > 0) {
            self._cur_message = self._messages.shift();

            if (self._cur_message.sender == 'user_input') {
                this._wait_input = true;
                self.target_div.on("keydown", function(event){ self.user_input(event) });
                self.target_div.focus();
                self._state_wait_user_input(self);
                return;
            }

            self.target_div.find('.console-new-text').text(self._text);
            var old_text = self.target_div.find('.console-old-text').first().text();
            var new_text = self.target_div.find('.console-new-text').first().text();

            self.target_div.find('.console-old-text').text(old_text + new_text);
            self.target_div.find('.console-new-text').text('');
            self._text = '';

            self._cur_message.message_type = self._message_info[self._cur_message.sender];
            self._cur_delay = 0;
            self._cur_symbol = 0;
            self._cur_message_len = self._cur_message.message.length;
            self._state_before_print_delay(self);
            return;
        }
        else
            self._cur_message = null;

        // Если строк нет, то печатать мигающий финальный символ
        self._state_print_final_indicator(self);
    };

    TextConsole.prototype.user_input = function(event) {
        //console.log('TextConsole.prototype.user_input', event);
        this.target_div.off("keydown");
        this._cur_message = null;
        this._wait_input = false;
    };

    TextConsole.prototype.start = function() {
        //console.log('TextConsole.prototype.start', this);
        if (!this.target_div) {
            console.warn('Не задан контейнер консоли!');
            return;
        }
        if (!this._is_started) {
            this._is_started = true;
            this._state_selector(this);
        }
    };

    TextConsole.prototype.stop = function() {
        if (this._is_started) {
            clearTimeout(this._timeout);
            this._timeout = null;

            if ((this._messages.length > 0) || this._cur_message)
                this.target_div.find('.console-new-text').text(this._text + _("con_interrupt2"));
            else
                this.target_div.find('.console-new-text').text(this._text);

            var old_text = this.target_div.find('.console-old-text').first().text();
            var new_text = this.target_div.find('.console-new-text').first().text();

            this.target_div.find('.console-old-text').text(old_text + new_text);
            this.target_div.find('.console-new-text').text('');
            this._text = '';

            this._is_started = false;
        }
    };

    TextConsole.prototype.clear = function() {
        if (!this.target_div) {
            console.warn('Не задан контейнер консоли!');
            return;
        }
        this._text = '';
        this._is_first = true;
        this.target_div.find('.console-old-text').text(this._text);
        this.target_div.find('.console-new-text').text(this._text);
        this._scroll_top();
    };

    return TextConsole;
})();


var TextConsoleAudio = (function (_super) {
    __extends(TextConsoleAudio, _super);

    function TextConsoleAudio() {
        _super.call(this);
        this.start_audio = false;
    }

    // Вызывать тогда, когда консоль становится невидимой
    TextConsoleAudio.prototype.focus_interrupt = function() {
        //console.log('TextConsoleAudio.prototype.focus_interrupt');
        if (! this._is_started) return;
        this._messages = [];
        if (((this._cur_message_len - this._cur_symbol) > 3) && (this._cur_message) && (this._cur_message.message)) {
            this._cur_message_len = this._cur_symbol;
            this._cur_message.message = this._cur_message.message.substr(0, this._cur_message_len);
        }
        if ((this._cur_message) && (this._cur_message.message)) {
            this._messages.push({sender: 'interrupt', message: _("con_interrupt")});
        }
    };

    TextConsoleAudio.prototype._state_print_text = function(self) {
        if (! this.start_audio) {
            this.start_audio = true;
            audioKeyboard.play();
        }
        _super.prototype._state_print_text.call(this, self);
    };

    TextConsoleAudio.prototype._state_after_print_delay = function(self) {
        this.start_audio = false;
        audioKeyboard.stop();
        _super.prototype._state_after_print_delay.call(this, self);
    };

    return TextConsoleAudio;
})(TextConsole);


var ConsoleFirstEnter = (function (_super) {
    __extends(ConsoleFirstEnter, _super);

    function ConsoleFirstEnter() {
        _super.call(this);

        this.target_div = textConsoleManager.jq_main_div;
        this.first_input = true;
        this.teaching_answer_value = false;

        this.add_message(
            'welcome',
            '\n       ================================================\n' +
            '       >                                              <\n' +
            _("con_fe_01") + textConsoleManager.app_version + '         <\n' +
            '       >                                              <\n' +
            _("con_fe_02")+ '\n' +
            '       >                                              <\n' +
            '       ================================================'
        );
        this.add_message('user', _("con_fe_03"));
        this.add_message(
            'system',
            $('#settings_user_insurance_name').text() + _("con_fe_04") + textConsoleManager.user_name + '.\n\n' +
            '--------------------------------------------------------------\n' +
            _("con_fe_05") + textConsoleManager.user_name + '! ' + _("con_fe_06") + '\n\n' +
            _("con_fe_07") + '\n\n' +
            'Y - ' + _("con_fe_08") + '\n' +
            'N - ' + _("con_fe_09") + '\n' +
            '--------------------------------------------------------------'
        );
        this.add_message('user_input', ' ');

        textConsoleManager.add(this, 'first_enter');
    }

    ConsoleFirstEnter.prototype.user_input = function(event) {
        if (this.first_input)
            switch (event.keyCode) {
                case 89:
                    this.teaching_answer_value = true;
                    this.add_message('user', _("con_fe_10"));
                    this.add_message(
                        'system',
                        _("con_fe_11") + '\n\n' +
                        '--------------------------------------------------------------\n' +
                        _("con_fe_12") + '\n' +
                        _("con_fe_13") + '\n' +
                        _("con_fe_14") + '\n' +
                        '--------------------------------------------------------------'
                    );
                    this.add_message('user_input', ' ');
                    this.target_div.off("keydown");
                    this._cur_message = null;
                    this.first_input = false;
                    this._wait_input = false;
                    break;
                case 78:
                    this.teaching_answer_value = false;
                    this.add_message('user', _("con_fe_15") + '');
                    this.add_message(
                        'system',
                        _("con_fe_16") + '\n\n' +
                        '--------------------------------------------------------------\n' +
                        _("con_fe_12") + '\n' +
                        _("con_fe_13") + '\n' +
                        _("con_fe_14") + '\n' +
                        '--------------------------------------------------------------'
                    );
                    this.add_message('user_input', ' ');
                    this.target_div.off("keydown");
                    this._cur_message = null;
                    this.first_input = false;
                    this._wait_input = false;
                    break;
            }
        else
            switch (event.keyCode) {
                    case 65:
                        this.add_message('user', _("con_fe_17") + '');
                        this.add_message(
                            'system',
                            _("con_fe_18") + '\n\n' +
                            '--------------------------------------------------------------\n' +
                            _("con_fe_20") + '\n\n' +
                            _("con_fe_12") + '\n' +
                            _("con_fe_13") + '\n' +
                            _("con_fe_14") + '\n' +
                            '--------------------------------------------------------------'
                        );
                        this.add_message('user_input', ' ');
                        this.target_div.off("keydown");
                        this._cur_message = null;
                        this.first_input = false;
                        this._wait_input = false;
                        break;
                    case 67:
                        this.add_message('user', _("con_fe_19") + '');
                        this.add_message(
                            'system',
                            _("con_fe_18") + '\n\n' +
                            '--------------------------------------------------------------\n' +
                            _("con_fe_21") + '\n\n' +
                            _("con_fe_12") + '\n' +
                            _("con_fe_13") + '\n' +
                            _("con_fe_14") + '\n' +
                            '--------------------------------------------------------------'
                        );
                        this.add_message('user_input', ' ');
                        this.target_div.off("keydown");
                        this._cur_message = null;
                        this.first_input = false;
                        this._wait_input = false;
                        break;
                    case 13:
                        this._cur_message = null;
                        this.first_input = false;
                        this._wait_input = false;
                        this.teaching_answer(this.teaching_answer_value);
                        if (! this.teaching_answer_value)
                            resourceLoadManager.del(this);  // Произошёл отказ от обучения, поэтому коннект по ws
                        else
                            console.log('Redirect to teaching map');
                        this.target_div.off("keydown");
                        break;
            }
    };

    ConsoleFirstEnter.prototype.start = function() {
        //console.log('ConsoleFirstEnter.prototype.start', this);
        if (!this._is_started) {
            resourceLoadManager.add(this);  // todo: обсудить
            _super.prototype.start.call(this);
        }
    };

    ConsoleFirstEnter.prototype.teaching_answer = function(teach) {
        $.ajax({
            url: $('#settings_server_mode_link_path').text() + '/api/tca',
            data: {answer: teach},
            success: function(data) {
                if (data && data.length) {
                    console.log(data + ($("#electron_mode").text() ? "?mode=electron" : ""));

                    window.location = data + ($("#electron_mode").text() ? "?mode=electron" : "");
                }
                // Google Analytics
                if (teach)
                    analytics.teaching_answer_yes();
                else
                    analytics.teaching_answer_no();
            }
        });
    };

    return ConsoleFirstEnter;
})(TextConsole);


var ConsoleEnter = (function (_super) {
    __extends(ConsoleEnter, _super);

    function ConsoleEnter() {
        _super.call(this);

        this.target_div = textConsoleManager.jq_main_div;

        this.add_message(
            'welcome',
            '\n       ================================================\n' +
            '       >                                              <\n' +
            _("con_fe_01") + textConsoleManager.app_version + '         <\n' +
            '       >                                              <\n' +
            _("con_fe_02")+ '\n' +
            '       >                                              <\n' +
            '       ================================================'
        );
        this.add_message('user', _("con_fe_03"));
        this.add_message('system', $('#settings_user_insurance_name').text() + _("con_fe_04") + textConsoleManager.user_name + '.');
        this.add_message('user', _("con_e_01"));
        this.add_message('system', _("con_e_02") + textConsoleManager.user_position + '.');
        this.add_message('user', _("con_e_03"));
        this.add_message('system', _("con_e_04") + textConsoleManager.user_balance + '.');

        textConsoleManager.add(this, 'enter');
    }

    return ConsoleEnter;
})(TextConsole);


var ConsoleEnterToLocation = (function (_super) {
    __extends(ConsoleEnterToLocation, _super);

    function ConsoleEnterToLocation() {
        _super.call(this);
        this.target_div = textConsoleManager.jq_main_div;
        this._init_messages();
        textConsoleManager.add(this, 'enter_location');
    }

    ConsoleEnterToLocation.prototype._init_messages = function() {
        this._messages = [];
        this.add_message('user', _("con_etl_01"));
        this.add_message('system', _("con_etl_02"));
        this.add_message('system', _("con_etl_03"));
        this.add_message('system', _("con_etl_04"));
    };

    ConsoleEnterToLocation.prototype.start = function() {
        this._init_messages();
        _super.prototype.start.call(this);
    };

    return ConsoleEnterToLocation;
})(TextConsole);


var ConsoleEnterToMap = (function (_super) {
    __extends(ConsoleEnterToMap, _super);

    function ConsoleEnterToMap() {
        _super.call(this);
        this.target_div = textConsoleManager.jq_main_div;
        this._init_messages();
        textConsoleManager.add(this, 'enter_map');
    }

    ConsoleEnterToMap.prototype._init_messages = function() {
        this._messages = [];
        this.add_message('user', _("con_etl_05"));
        this.add_message('system', _("con_etl_02"));
        this.add_message('system', _("con_etl_03"));
        this.add_message('system', _("con_etl_04"));
    };

    ConsoleEnterToMap.prototype.start = function() {
        this._init_messages();
        _super.prototype.start.call(this);
    };

    return ConsoleEnterToMap;
})(TextConsole);


var ConsoleDieBase = (function (_super) {
    __extends(ConsoleDieBase, _super);

    function ConsoleDieBase() {
        _super.call(this);
        this.target_div = textConsoleManager.jq_main_div;
        this.add_to_console_manager();
    }

    ConsoleDieBase.prototype.add_to_console_manager = function() {textConsoleManager.add(this, 'die_base');};

    ConsoleDieBase.prototype.get_insurance_deadline_info = function (options) {
        var res = '';
        if (options.insurance.starttime && options.insurance.deadline) {
            var start_quest_date = new Date((options.insurance.starttime + options.insurance.deadline) * 1000);
            start_quest_date.setFullYear(start_quest_date.getFullYear() + 100);
            var start_quest_date_s = start_quest_date.toLocaleString('ru');
            res = res + _("con_die_00") + start_quest_date_s;
        }
        //res = res + '.\n\n';
        return res;
    };

    ConsoleDieBase.prototype.user_input = function(event) {
        //console.log('Нажата кнопка. Пытаемся войти в город');
        clientManager.sendGoToRespawn(null);
        this.target_div.off("keydown");
    };

    ConsoleDieBase.prototype._init_messages = function(options) {
        this._messages = [];
        this.add_message(
            'system',
            '\n' +
            _("con_die_01")
        );
        this.add_message('user', _("con_fe_03"));
        this.add_message(
            'system',
            user.login + ' ' + _("con_dieb_01") +
            this.get_insurance_deadline_info(options) + '.\n\n' +
            '-------------------------------------------\n' +
            _("con_dieb_02") + ', ' +
            _("con_dieb_03") + ' ' +
            (user && user.example_car ? user.example_car.name_car : _("con_die_auto")) +
            _("con_dieb_05") +
            _(options.towns[0].title) + '.\n' +
            _("con_die_02") + ' \n'+
            '-------------------------------------------\n'
        );
        this.add_message('user_input', ' ');
    };

    ConsoleDieBase.prototype.start = function(options) {
        //console.log('ConsoleDieAnyKey.prototype.start', this);
        this._init_messages(options);
        _super.prototype.start.call(this);
    };

    return ConsoleDieBase;
})(TextConsole);


var ConsoleDiePremium = (function (_super) {
    __extends(ConsoleDiePremium, _super);

    function ConsoleDiePremium() {
        _super.call(this);
        this.target_div = textConsoleManager.jq_main_div;
    }

    ConsoleDiePremium.prototype.add_to_console_manager = function() {textConsoleManager.add(this, 'die_premium');};

    ConsoleDiePremium.prototype._init_messages = function(options) {
        this._messages = [];
        this.add_message(
            'system',
            '\n' +
            _("con_die_01")
        );
        this.add_message('user', _("con_fe_03"));
        this.add_message(
            'system',
            user.login + _("con_diep_01") +
            this.get_insurance_deadline_info(options) + '.\n\n' +
            '-------------------------------------------\n' +
            _("con_diep_02") +
            _("con_diep_03") +
            (user && user.example_car ? user.example_car.name_car : _("con_die_auto")) +
            _("con_diep_05") +
            _(options.towns[0].title) + '.\n' +
            _("con_die_02") + ' \n'+
            '-------------------------------------------\n'
        );
        this.add_message('user_input', ' ');
    };

    return ConsoleDiePremium;
})(ConsoleDieBase);


var ConsoleDieShareholder = (function (_super) {
    __extends(ConsoleDieShareholder, _super);

    function ConsoleDieShareholder() {
        _super.call(this);
        this.target_div = textConsoleManager.jq_main_div;
        this._current_towns = [];
    }

    ConsoleDieShareholder.prototype.add_to_console_manager = function() {textConsoleManager.add(this, 'die_shareholder');};

    ConsoleDieShareholder.prototype.user_input = function(event) {
        //console.log('Нажата кнопка. Пытаемся войти в город');
        var index = null;
        if (event.keyCode >= 49 && event.keyCode < 49 + this._current_towns.length)
            index = event.keyCode - 49;

        if (event.keyCode == 13)
            index = 0;

        if (index != null) {
            clientManager.sendGoToRespawn(this._current_towns[index].node_hash);
            this.target_div.off("keydown");
        }
    };

    ConsoleDieShareholder.prototype._init_messages = function (options) {
        this._messages = [];
        this.add_message(
            'system',
            '\n' +
            _("con_die_01")
        );
        this.add_message('user', _("con_fe_03"));
        var s = '';
        for (var i = 0; i < options.towns.length; i++)
            s = s + (i + 1).toString() + ': ' + _(options.towns[i].title) + '\n';

        this.add_message(
            'system',
            user.login + _("con_dievip_01") +
            this.get_insurance_deadline_info(options) + '.\n\n' +
            '-------------------------------------------\n' +
            _("con_dievip_02") +
            _("con_dievip_03") +
            (user && user.example_car ? user.example_car.name_car : _("con_die_auto")) +
            _("con_dievip_05") +_("con_dievip_06") +
            _(options.towns[0].title) + '.\n' + s +
            '-------------------------------------------\n'
        );

        this.add_message('user_input', ' ');
    };

    ConsoleDieShareholder.prototype.start = function (options) {
        //console.log('ConsoleDieAnyKey.prototype.start', this);
        this._current_towns = options.towns;
        _super.prototype.start.call(this, options);
    };

    return ConsoleDieShareholder;
})(ConsoleDieBase);


//var ConsoleWPI = (function (_super) {
//    __extends(ConsoleWPI, _super);
//
//    function ConsoleWPI() {
//        _super.call(this);
//        this.target_div = $('#RDSitePIConsole');
//        this.init();
//        this.pages = ['RDSitePersonalInfo'];
//        this._message_info.system.placeholder = function() { return '> '  };
//        this._message_info.system.after_print_delay = 2.5;
//        this._message_info.system.before_print_delay = 2.5;
//        this._message_info.user.placeholder = function() {
//            var data = new Date();
//            var hh_str = data.getHours().toString();
//            var mm_str = data.getMinutes().toString();
//            hh_str = hh_str.length == 2 ? hh_str : '0' + hh_str;
//            mm_str = mm_str.length == 2 ? mm_str : '0' + mm_str;
//            return '[' + hh_str + ':' + mm_str + ']: ';
//        };
//        textConsoleManager.add(this);
//    }
//
//    return ConsoleWPI;
//})(TextConsole);
//
//var ConsolePreloader = (function (_super) {
//    __extends(ConsolePreloader, _super);
//
//    function ConsolePreloader() {
//        _super.call(this);
//        this.target_div = $('#consolePreloader');
//        this.init();
//        this._message_info.system.placeholder = function() { return '> '  };
//        this._message_info.system.after_print_delay = 1.5;
//        this._message_info.system.before_print_delay = 1.5;
//        this._message_info.user.placeholder = function() {
//            var data = new Date();
//            var hh_str = data.getHours().toString();
//            var mm_str = data.getMinutes().toString();
//            hh_str = hh_str.length == 2 ? hh_str : '0' + hh_str;
//            mm_str = mm_str.length == 2 ? mm_str : '0' + mm_str;
//            return '[' + hh_str + ':' + mm_str + ']: ';
//        };
//        this.jq_load_status = null;
//        this.max_load_data_number = 0;
//        textConsoleManager.add(this);
//
//        this.add_message('user', 'Загрузка системы.');
//        this.add_message('system', 'Источник загрузки идентифицирован.');
//        this.add_message('user', 'Дешифровка загрузочного сектора.');
//        this.add_message('system', 'Успешно.');
//        this.add_message('user', 'Локализация сигнала.');
//        this.add_message('system', 'Местоположение определено.');
//        this.add_message('user', 'Фишинг спутников.');
//        this.add_message('system', 'Соединение со спутником установлено.');
//        this.add_message(
//            'system',
//            '\n       ================================================\n' +
//            '       >                                              <\n' +
//            '       >        Нюк Коммандер вер. ' + version + '         <\n' +
//            '       >                                              <\n' +
//            '       >         Корпорация (К) Нукойл 2084 г.        <\n' +
//            '       >                                              <\n' +
//            '       ================================================\n'
//        );
//        this.add_message('system', 'Статус сервера: \n' +
//            'Пользователей обнаружено: ' + all_users_registered);
//
//        this.add_message('system', 'Последняя новость:\n' +
//            $('.window-news-news-content-block').children().first().text());
//
//        this.add_message('system', 'Загрузка данных:');
//        this.start();
//
//    }
//
//    ConsolePreloader.prototype.update_load_data_status = function() {
//        //console.log('ConsolePreloader.prototype.update_load_data_status');
//        if (! this.jq_load_status) return;
//        var prc = preloaderImage.count_image / preloaderImage.count_all;
//        var real_number = Math.floor(this.max_load_data_number * prc);
//        this.jq_load_status.text(real_number);
//    };
//
//    ConsolePreloader.prototype._state_print_final_indicator = function (self) {
//        if (self._messages.length == 0) {
//            self.target_div.find('.console-new-text').text(self._text);
//            this.max_load_data_number = Math.floor(Math.random() * 2000) + 250;
//            self.target_div.append('</br><span id="preloaderLoadDataStatus">0</span> / ' + this.max_load_data_number);
//            this.jq_load_status = self.target_div.find('#preloaderLoadDataStatus');
//            self.update_load_data_status();
//        }
//        else {
//            _super.prototype._state_print_final_indicator.call(self);
//        }
//    };
//
//    return ConsolePreloader;
//})(TextConsole);

var textConsoleManager;


function initConsoles() {
    textConsoleManager = new TextConsoleManager();
    new ConsoleFirstEnter();
    new ConsoleEnter();
    new ConsoleEnterToLocation();
    new ConsoleEnterToMap();

    new ConsoleDieBase();
    new ConsoleDiePremium();
    new ConsoleDieShareholder();
}



