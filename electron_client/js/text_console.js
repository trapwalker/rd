var TextConsole = (function(){
    function TextConsole() {
        this._message_info = {
            user: {
                print_speed_ms: 2.5,
                after_print_delay: 0,
                before_print_delay: 0,
                placeholder: function() { return ''; }
            },
            interrupt: {
                print_speed_ms: 0,
                after_print_delay: 0,
                before_print_delay: 0,
                placeholder: function() { return ''; }
            },
            system: {
                print_speed_ms: 1,
                after_print_delay: 0,
                before_print_delay: 0,
                placeholder: function() { return ''; }
            }
        };

        this.pages = [];                // список id страниц на активацию которых вызовется start консоли (если список пустой то start на любую страницу)

        this.target_div = null;         // див в который осуществлять печать

        this._is_started = false;       // признак того что консоль запущена
        this._is_first = true;

        this._messages = [];            // список сообщений ожидающих вывод
        this._text = '';                // весь текст выведенный в консоль
        this._cur_message = null;       // сообщение обрабатываемое в данный момент
        this._cur_message_len = 0;      // длина текущего сообщения

        this._cur_symbol = 0;           // текущий символ
        this._cur_delay = 0;            // текущее состояние задержки

        this.final_indicator_frequency = 300;       // частота мигания финального индикатора (мс)
        this._final_indicator_state = false;        // состояние финального индикатора (' ' или '█')

        this._timeout = null;
        this._interval = null;
    }

    TextConsole.prototype._replaceAt=function(str, index, character) {
        return str.substr(0, index) + character + str.substr(index + character.length);
    };

    TextConsole.prototype.add_message = function(sender, message, interrupt) {
        if (interrupt) this.interrupt();
        if (this._message_info.hasOwnProperty(sender))
            this._messages.push({ sender: sender, message: message});
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
            this._messages.push({ sender: 'system', message: _('con_int')});
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
        // Если есть строки, то выбрать следующую
        if (self._messages.length > 0) {
            self._cur_message = self._messages.shift();

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

    TextConsole.prototype.init = function() {
        this.target_div.each(function(index, element) {
            $(element).append('<span class="console-old-text"></span>');
            $(element).append('<span class="console-new-text"></span>')
        })
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
        // Метод оставлен для совместимости с менеджером консолей
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
            this._messages.push({sender: 'interrupt', message: _('con_int')});
        }
    };

    TextConsoleAudio.prototype._state_print_text = function(self) {
        if (! this.start_audio) {
            this.start_audio = true;
            //audioKeyboard.play();
        }
        _super.prototype._state_print_text.call(this, self);
    };

    TextConsoleAudio.prototype._state_after_print_delay = function(self) {
        this.start_audio = false;
        //audioKeyboard.stop();
        _super.prototype._state_after_print_delay.call(this, self);
    };

    return TextConsoleAudio;
})(TextConsole);

var ConsolePreloader = (function (_super) {
    __extends(ConsolePreloader, _super);

    function ConsolePreloader() {
        _super.call(this);
        this.target_div = $('#consolePreloader');
        this.init();
        this._message_info.system.placeholder = function() { return '> '  };
        this._message_info.system.after_print_delay = 1.5;
        this._message_info.system.before_print_delay = 1.5;
        this._message_info.user.placeholder = function() {
            var data = new Date();
            var hh_str = data.getHours().toString();
            var mm_str = data.getMinutes().toString();
            hh_str = hh_str.length == 2 ? hh_str : '0' + hh_str;
            mm_str = mm_str.length == 2 ? mm_str : '0' + mm_str;
            return '[' + hh_str + ':' + mm_str + ']: ';
        };
        this.jq_load_status = null;
        this.max_load_data_number = 0;

        this.add_message('user', _('con_pre_1'));
        this.add_message('system', _('con_pre_2'));
        this.add_message('user', _('con_pre_3'));
        this.add_message('system', _('con_pre_4'));
        this.add_message('user', _('con_pre_5'));
        this.add_message('system', _('con_pre_6'));
        this.add_message('user', _('con_pre_7'));
        this.add_message('system', _('con_pre_8'));
        var version = require('electron').remote.app.getVersion();

        this.add_message(
            'system',
            '\n       ================================================\n' +
            '       >                                              <\n' +
            '       >           ' + _('con_pre_9') + version + '           <\n' +
            '       >                                              <\n' +
            '       >         ' + _('con_pre_10') + '        <\n' +
            '       >                                              <\n' +
            '       ================================================\n'
        );
        this.start();
    }

    return ConsolePreloader;
})(TextConsoleAudio);

var consolePreloader;