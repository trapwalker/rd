var constConsoleUserPrintSpeed = 5;        // Время на печать одного символа сообщения пользователя (мс)
var constConsoleSystemPrintSpeed = 5;      // Время на печать одного символа сообщения системы (мс)
var constConsoleDelayIndicator = 300;       // Частота моргания каретки (мс)

var constConsolePrintSpeed = 10;        // Время на печать одного символа (мс)
var constConsoleDelayBlock = 10;        // Задержка после печати строки (блока) (мс)

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


var TextConsoleEffect = (function(){
    function TextConsoleEffect() {
        this.target_div = null;         // див в который осуществлять печать
        this.console_text = [];         // массив строк которые печатать (строка как функциональный блок)
        this.page_id = 'all';           // id страницы сайта к которому привязана данная консоль. Ключ 'all' привязывает ко всем

        this._text = '';
        this._final_indicator_state = false;
        this._block_timeout = null;
        this._print_interval = null;
        this._current_str = 0;
        this._current_symbol = 0;
    }

    TextConsoleEffect.prototype.init = function() {
        textConsoleManager.add(this);
        this._count_lines = this.console_text.length;
    };

    TextConsoleEffect.prototype._block_delay = function(self) {
        self._current_str++;
        self._current_symbol = 0;
        if (self._current_str < self._count_lines) {
            clearInterval(self._print_interval);
            self._print_interval = setInterval(self._print_text, constConsolePrintSpeed, self);
        }
    };

    TextConsoleEffect.prototype._print_final_indicator = function(self) {
        // Мигание каретки
        if (self._final_indicator_state)
            self.target_div.text(self._text + '_');
        else
            self.target_div.text(self._text + ' ');
        self._final_indicator_state = !self._final_indicator_state;
    };

    TextConsoleEffect.prototype._print_text = function(self) {
        if (self._current_symbol < self.console_text[self._current_str].length) {
            self._text += self.console_text[self._current_str][self._current_symbol];
            self.target_div.text(self._text + '_');
            self._current_symbol++;
            var elem = document.getElementById('data');
            self.target_div.scrollTop(self.target_div.get(0).scrollHeight);
        }
        else {
            self._text += '\n';
            self.target_div.text(self._text);
            clearInterval(self._print_interval);
            self._print_interval = setInterval(self._print_final_indicator, constConsoleDelayIndicator, self);
            self._block_timeout = setTimeout(self._block_delay, constConsoleDelayBlock, self);
            self.target_div.scrollTop(self.target_div.get(0).scrollHeight);
        }
    };

    TextConsoleEffect.prototype.start = function() {
        if (!this.target_div) {
            console.warn('Не задан контейнер консоли!');
            return;
        }
        this.stop();

        if (this._current_str < this.console_text.length)
            this._print_interval = setInterval(this._print_text, constConsolePrintSpeed, this);
        else
            this._print_interval = setInterval(this._print_final_indicator, constConsoleDelayIndicator, this);
    };

    TextConsoleEffect.prototype.stop = function() {
        if (this._print_interval) {
            clearTimeout(this._block_timeout);
            clearInterval(this._print_interval);
            this._block_timeout = null;
            this._print_interval = null;
            this._text = '';

            if (this.target_div) this.target_div.empty();
            else console.warn('Не задан контейнер консоли!', this);

            this._current_str = 0;
            this._current_symbol = 0;
        }
    };

    TextConsoleEffect.prototype.finish = function() {
        if (!this.target_div) {
            console.warn('Не задан контейнер консоли!');
            return;
        }
        this.stop();

        var result_text = '';
        for (var i = 0; i < this.console_text.length; i++)
            result_text += this.console_text[i] + ' /n';
        this.target_div.text(result_text);
        this.target_div.scrollTop(this.target_div.get(0).scrollHeight);
    };

    return TextConsoleEffect;
})();


var TextConsole = (function(){
    function TextConsole() {
        this.target_div = null;         // див в который осуществлять печать
        this.page_id = 'all';           // id страницы сайта к которому привязана данная консоль. Ключ 'all' привязывает ко всем

        this._is_started = false;
        this._text = '';
        this._console_blocks = [];         // массив строк которые печатать (строка как функциональный блок)

        this._current_str = '';
        this._current_str_len = 0;
        this._current_symbol = 0;

        this._final_indicator_state = false;
        this._final_indicator_placeholder = '';

        this._interval = null;
    }

    TextConsole.prototype.init = function() {
        textConsoleManager.add(this);
    };

    TextConsole.prototype.add_message = function(sender, message) {
        this._console_blocks.push({
            sender: sender,
            message: message
        });
    };

    TextConsole.prototype._system_placeholder = function() {
        return '';
    };

    TextConsole.prototype._user_placeholder = function() {
        return '';
    };

    TextConsole.prototype._state_print_text = function(self) {
        if (self._current_symbol < self._current_str_len) {
            self._text += self._current_str[self._current_symbol];
            self.target_div.text(self._text + '_');
            self._current_symbol++;
            self.target_div.scrollTop(self.target_div.get(0).scrollHeight);
        }
        else {
            self._text += '\n';
            self.target_div.text(self._text + ' ');
            self.target_div.scrollTop(self.target_div.get(0).scrollHeight);
            clearInterval(self._interval);
            self._state_selector(self);
        }
    };

    TextConsole.prototype._state_print_final_indicator = function(self) {
        // Мигание каретки
        if (self._final_indicator_state)
            self.target_div.text(self._text + self._final_indicator_placeholder + '_');
        else
            self.target_div.text(self._text + self._final_indicator_placeholder + ' ');
        self._final_indicator_state = !self._final_indicator_state;

        // проверка на возможность пролдолжения печати
        if (self._console_blocks.length > 0) {
            clearInterval(self._interval);
            self._state_selector(self);
        }
    };

    TextConsole.prototype._state_selector = function(self) {
        // Если есть строки, то выбрать следующую, определить ее тип, подставить placeholder и начать печать
        while (self._console_blocks.length > 0) {
            var console_block = self._console_blocks.shift();
            if (!console_block.hasOwnProperty('sender') || !console_block.hasOwnProperty('message')) {
                console.warn('Неверный формат сообщения консоли.');
                continue;
            }
            if (console_block.sender == 'user') {
                self._current_str = self._user_placeholder() + console_block.message;
                self._current_str_len = self._current_str.length;
                self._current_symbol = 0;
                self._interval = setInterval(self._state_print_text, constConsoleUserPrintSpeed, self);
                return;
            }
            if (console_block.sender == 'system') {
                self._current_str = self._system_placeholder() + console_block.message;
                self._current_str_len = self._current_str.length;
                self._current_symbol = 0;
                self._interval = setInterval(self._state_print_text, constConsoleSystemPrintSpeed, self);
                return;
            }
            console.warn('Неверный тип отправителя сообщения консоли.');
        }

        // Если строк нет, то печатать мигающий финальный символ
        self.target_div.text(self._text + ' ');
        self.target_div.scrollTop(self.target_div.get(0).scrollHeight);
        self._interval = setInterval(self._state_print_final_indicator, constConsoleDelayIndicator, self);
    };

    TextConsole.prototype.start = function() {
        if (!this.target_div) {
            console.warn('Не задан контейнер консоли!');
            return;
        }

        var dom_console = this.target_div.get(0);
        this.target_div.css('right', dom_console.clientWidth - dom_console.offsetWidth);

        if (!this._is_started) {
            this._is_started = true;
            this._state_selector(this);
        }
    };

    TextConsole.prototype.stop = function() {
        // Метод оставлен для совместимости с менеджером консолей
    };

    TextConsole.prototype.clear = function() {
        this._text = '';
    };

    return TextConsole;
})();


var ConsoleWReg = (function (_super) {
    __extends(ConsoleWReg, _super);

    function ConsoleWReg() {
        _super.call(this);
        this.target_div = $('#RDSiteWRegConsole');
        this.page_id = 'RDSiteWReg';
        this._u_m_counter = 0;
        this._console_blocks = [
            {
                sender:     'system',
                message:    '=== Нюк Коммандер вер. 5.51 ===\n' +
                            'Корпораця Нукойл. 2039\n' +
                            '________________________________________________\n'
            },
            {
                sender:     'user',
                message:    'Загрузка системы навигации.'
            },
            {
                sender:     'system',
                message:    'Ошибка доступа.'
            },
            {
                sender:     'user',
                message:    'Загрузка протокола учета водителей.'
            },
            {
                sender:     'system',
                message:    'Загружено.\n\n' +
                            '================================================\n' +
                            'Для регистрации нового водителя в системе введите свою электронную почту и пароль или подключитесь через одну из внешних сетей.\n' +
                            'Если вы зарегистированный водитель, войдите в систему через меню авторизации или подключитесь через одну из внешних сетей.\n\n' +
                            'Нажмите 1 для vk.com\n' +
                            'Нажмите 2 для facebook.com\n' +
                            'Нажмите 3 для ok.ru\n' +
                            'Нажмите 4 для plus.google.com\n' +
                            '================================================\n'
            }
        ];
        this.init();
    }

    ConsoleWReg.prototype._user_placeholder = function() {
        var data = new Date();
        var hh_str = data.getHours().toString();
        var mm_str = data.getMinutes().toString();
        var u_m_c_str = this._u_m_counter.toString();
        hh_str = hh_str.length == 2 ? hh_str : '0' + hh_str;
        mm_str = mm_str.length == 2 ? mm_str : '0' + mm_str;
        u_m_c_str = u_m_c_str.length == 3 ? u_m_c_str : ( u_m_c_str.length == 2 ? '0' + u_m_c_str : '00' + u_m_c_str);
        this._u_m_counter++;
        return '>0x0' + u_m_c_str + ' (' + hh_str + ':' + mm_str + '): ';
    };

    return ConsoleWReg;
})(TextConsole);

var ConsoleWPI = (function (_super) {
    __extends(ConsoleWPI, _super);

    function ConsoleWPI() {
        _super.call(this);
        this.target_div = $('#RDSitePIConsole');
        this.page_id = 'RDSiteWReg';

        this.init();
    }

    ConsoleWPI.prototype._system_placeholder = function() {
        return '> ';
    };

    return ConsoleWPI;
})(TextConsole);

var ConsoleWStart = (function (_super) {
    __extends(ConsoleWStart, _super);

    function ConsoleWStart() {
        _super.call(this);
        this.target_div = $('#RDSiteStartPageConsole');
        this.page_id = 'RDSiteStartPage';

        this._console_blocks = [
            {
                sender:     'system',
                message:    'Корпораця Нукойл. вер.5.06'
            },
            {
                sender:     'system',
                message:    'Ошибка доступа'
            },
            {
                sender:     'system',
                message:    'Загружено.\n\n' +
                            'Для регистрации нового водителя в системе введите свою электронную почту и пароль или подключитесь через одну из внешних сетей:\n\n' +
                            'Нажмите 1 для vk.com\n' +
                            'Нажмите 2 для facebook.com\n' +
                            'Нажмите 3 для ok.ru\n' +
                            'Нажмите 4 для plus.google.com'
            }
        ];
        this.init();
    }

    ConsoleWStart.prototype._system_placeholder = function() {
        return '> ';
    };

    return ConsoleWStart;
})(TextConsole);

var textConsoleManager;

var consoleWReg;
var consoleWPI;
var consoleWStart;

function initConsoles() {
    textConsoleManager = new TextConsoleEffectManager();
    consoleWReg = new ConsoleWReg();
    consoleWPI = new ConsoleWPI();
    consoleWStart = new ConsoleWStart();
}



