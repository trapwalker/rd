var TextConsoleEffectManager = (function(){
    function TextConsoleEffect() {
        this.all_consoles = {
            all: []
        }
    }

    TextConsoleEffect.prototype.add = function(console) {
        if (!this.all_consoles.hasOwnProperty(console.page_id))
            this.all_consoles[console.page_id] = [];
        if (this.all_consoles[console.page_id].indexOf(console) < 0)
            this.all_consoles[console.page_id].push(console);
    };

    TextConsoleEffect.prototype.del = function(console) {
        if (this.all_consoles.hasOwnProperty(console.page_id)) {
            var index = this.all_consoles[console.page_id].indexOf(console);
            if (index >= 0)
                this.all_consoles[console.page_id].splice(index, 1);
        }
    };

    TextConsoleEffect.prototype.start = function(page_id) {
        //console.log('TextConsoleEffect.prototype.start', page_id);

        // Останавливаем все консоли
        this.stop();

        // Запускаем общие консоли
        for (var i = 0; i < this.all_consoles['all'].length; i++)
            this.all_consoles['all'][i].start();

        // Запускаем консоли страницы
        if (this.all_consoles.hasOwnProperty(page_id))
            for (var i = 0; i < this.all_consoles[page_id].length; i++)
                this.all_consoles[page_id][i].start();
    };

    TextConsoleEffect.prototype.stop = function() {
        for (var key in this.all_consoles)
            if (this.all_consoles.hasOwnProperty(key))
                for (var i = 0; i < this.all_consoles[key].length; i++)
                    this.all_consoles[key][i].stop();
    };

    return TextConsoleEffect;
})();

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
            this._messages.push({ sender: 'system', message: 'Прервано.'});
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
            this._messages.push({sender: 'interrupt', message: 'Прервано.'});
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

var ConsoleWReg = (function (_super) {
    __extends(ConsoleWReg, _super);

    function ConsoleWReg() {
        _super.call(this);

        this.target_div = $('.reg-main-console');
        this.init();

        this.page_id = 'RDSiteWReg';

        this._message_info.user.placeholder = function() {
            var data = new Date();
            var hh_str = data.getHours().toString();
            var mm_str = data.getMinutes().toString();
            hh_str = hh_str.length == 2 ? hh_str : '0' + hh_str;
            mm_str = mm_str.length == 2 ? mm_str : '0' + mm_str;
            return '\n[' + hh_str + ':' + mm_str + ']: ';
        };
        this._message_info.system.placeholder = function() { return '> '  };
        this._message_info.system.after_print_delay = 2.5;
        this._message_info.system.before_print_delay = 2.5;
        this._message_info.welcome = {
            print_speed_ms: 1,
            after_print_delay: 0,
            before_print_delay: 0,
            placeholder: function() { return ''; }
        };


        this.add_message(
            'welcome',
            '\n       ================================================\n' +
            '       >                                              <\n' +
            '       >        Нюк Коммандер вер. ' + version + '         <\n' +
            '       >                                              <\n' +
            '       >         Корпорация (К) Нукойл 2084 г.        <\n' +
            '       >                                              <\n' +
            '       ================================================'
        );
        this.add_message('user', 'Загрузка системы навигации.');
        this.add_message('system', 'Ошибка доступа.');
        this.add_message('user', 'Загрузка протокола учета водителей.');
        this.add_message(
            'system',
            'Загружено.\n\n' +
            '--------------------------------------------------------------\n' +
            'Для регистрации нового водителя в системе введите свою электронную почту и пароль или подключитесь через одну из внешних сетей.\n\n' +
            'Если вы зарегистированный водитель, войдите в систему через меню авторизации или подключитесь через одну из внешних сетей.\n\n' +
            'Нажмите <1> для vk.com\n' +
            'Нажмите <2> для facebook.com\n' +
            'Нажмите <3> для ok.ru\n' +
            'Нажмите <4> для plus.google.com\n' +
            '--------------------------------------------------------------'
        );

        textConsoleManager.add(this);
    }

    ConsoleWReg.prototype.update_visible = function() {

    };

    return ConsoleWReg;
})(TextConsoleAudio);

var ConsoleWPI = (function (_super) {
    __extends(ConsoleWPI, _super);

    function ConsoleWPI() {
        _super.call(this);
        this.target_div = $('#RDSitePIConsole');
        this.init();
        this.page_id = 'RDSitePersonalInfo';
        this._message_info.system.placeholder = function() { return '> '  };
        this._message_info.system.after_print_delay = 2.5;
        this._message_info.system.before_print_delay = 2.5;
        this._message_info.user.placeholder = function() {
            var data = new Date();
            var hh_str = data.getHours().toString();
            var mm_str = data.getMinutes().toString();
            hh_str = hh_str.length == 2 ? hh_str : '0' + hh_str;
            mm_str = mm_str.length == 2 ? mm_str : '0' + mm_str;
            return '[' + hh_str + ':' + mm_str + ']: ';
        };
        textConsoleManager.add(this);
    }

    return ConsoleWPI;
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
        textConsoleManager.add(this);

        this.add_message('user', 'Загрузка системы.');
        this.add_message('system', 'Источник загрузки идентифицирован.');
        this.add_message('user', 'Дешифровка загрузочного сектора.');
        this.add_message('system', 'Успешно.');
        this.add_message('user', 'Локализация сигнала.');
        this.add_message('system', 'Местоположение определено.');
        this.add_message('user', 'Фишинг спутников.');
        this.add_message('system', 'Соединение со спутником установлено.');
        this.add_message(
            'system',
            '\n       ================================================\n' +
            '       >                                              <\n' +
            '       >        Нюк Коммандер вер. ' + version + '         <\n' +
            '       >                                              <\n' +
            '       >         Корпорация (К) Нукойл 2084 г.        <\n' +
            '       >                                              <\n' +
            '       ================================================\n'
        );
        this.add_message('system', 'Статус сервера: \n' +
            'Пользователей обнаружено: ' + all_users_registered);

        this.add_message('system', 'Последняя новость:\n' +
            $('.window-news-news-content-block').children().first().text());

        this.add_message('system', 'Загрузка данных:');
        this.start();

    }

    ConsolePreloader.prototype.update_load_data_status = function() {
        //console.log('ConsolePreloader.prototype.update_load_data_status');
        if (! this.jq_load_status) return;
        var prc = preloaderImage.count_image / preloaderImage.count_all;
        var real_number = Math.floor(this.max_load_data_number * prc);
        this.jq_load_status.text(real_number);
    };

    ConsolePreloader.prototype._state_print_final_indicator = function (self) {
        if (self._messages.length == 0) {
            console.log('Print load Data');
            self.target_div.find('.console-new-text').text(self._text);
            this.max_load_data_number = Math.floor(Math.random() * 2000) + 250;
            self.target_div.append('</br><span id="preloaderLoadDataStatus">0</span> / ' + this.max_load_data_number);
            this.jq_load_status = self.target_div.find('#preloaderLoadDataStatus');
            self.update_load_data_status();
        }
        else {
            _super.prototype._state_print_final_indicator.call(self);
        }
    };

    return ConsolePreloader;
})(TextConsole);

var textConsoleManager;

var consoleWReg;
var consoleWReg1;
var consoleWReg2;
var consoleWPI;
var consolePreloader;

function initConsoles() {
    textConsoleManager = new TextConsoleEffectManager();

    consoleWReg = new ConsoleWReg();
    consoleWReg1 = consoleWReg;
    consoleWReg2 = consoleWReg;

    consoleWPI = new ConsoleWPI();

    consolePreloader = new ConsolePreloader();
}



