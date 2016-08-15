var InteractionManager = (function (_super) {
    __extends(InteractionManager, _super);

    function InteractionManager(jq_town_div) {
        _super.call(this, jq_town_div.find('#townChatInteraction'), 'chat_screen');

        this.room_jid = '';
        this.player_nick = '';
        this.field_name_list = ['lvl', 'role_class', 'karma', 'driving', 'shooting', 'masking', 'leading', 'trading', 'engineering'];

        // Клики на пункты меню
        var self = this;
        this.jq_main_div.find('.chat-interaction-center-menu-item').click(function() {
            var page_id = $(this).data('page_id');
            self.jq_main_div.find('.chat-interaction-center-menu-item').removeClass('active');
            $(this).addClass('active');
            self.jq_main_div.find('.chat-interaction-center-page').css('display', 'none');
            self.jq_main_div.find('#' + page_id).css('display', 'block');
        });
        this.jq_main_div.find('.chat-interaction-center-menu-item').first().click();

        // События на кнопку отправить и Enter в поле ввода
        this.jq_main_div.find('.chat-interaction-private-chat-input-button').click(function() { self._send_message(); });
        this.jq_main_div.find('.chat-interaction-private-chat-input').first().on('keydown', function (event) {
            if (event.keyCode == 13)
                self._send_message();
        });
    }

    InteractionManager.prototype._send_message = function () {
        var jq_input = this.jq_main_div.find('.chat-interaction-private-chat-input').first();
        var msg = jq_input.val();
        if (this.room_jid != '')
            clientManager.sendChatMessage(this.room_jid, msg);
        else
            clientManager.sendCreatePrivateChat(this.player_nick, msg);
        jq_input.val('');
        jq_input.focus();
    };

    InteractionManager.prototype.set_buttons = function () {
        //console.log('InteractionManager.prototype.set_buttons');
        if (!locationManager.isActivePlace(this)) return;
        if (user.party)
            locationManager.setBtnState(1, 'Пригласить</br>в пати', true);
        else
            locationManager.setBtnState(1, 'Пригласить</br>в пати', false);
        locationManager.setBtnState(2, '', false);
        locationManager.setBtnState(3, '</br>Назад', true);
        locationManager.setBtnState(4, '</br>Выход', true);
    };

    InteractionManager.prototype.clickBtn = function (btnIndex) {
        //console.log('LocationTrainerNPC.prototype.clickBtn', btnIndex);
        switch (btnIndex) {
            case '1':
                clientManager.sendInvitePartyFromTemplate(this.player_nick);
                break;
            case '3':
                this.clear();
                locationManager.location_chat.activate();
                break;
            default:
                _super.prototype.clickBtn.call(this, btnIndex);
        }
    };

    InteractionManager.prototype.get_self_info = function () {
        clientManager.sendGetInteractionInfo();
    };

    InteractionManager.prototype.activate = function (person) {
        if (person) {
            this.player_nick = person;
            this.get_self_info();
        }
        _super.prototype.activate.call(this);
        $('#landscape').css('display', 'block');
    };

    InteractionManager.prototype.update = function(user_data) {
        //console.log('InteractionManager.prototype.update', user_data);
        this.clear();

        // Заполнение npc заголовка
        this.jq_main_div.find('.npc-name').text(this.player_nick);
        this.jq_main_div.find('.npc-text').text(user_data.about_self);
        this.jq_main_div.find('.npc-photo').attr("src", user_data.avatar);

        // Вставляем верстку автомобиля
        this.jq_main_div.find('.chat-interaction-car-photo-block').append(user_data.html_car_img);
        this.jq_main_div.find('.chat-interaction-car-photo-name').text(user_data.car_name);
        this.jq_main_div.find('.chat-interaction-car-info').append(user_data.html_car_table);

        for (var i = 0; i < this.field_name_list.length; i++) {
            var field_name = this.field_name_list[i];
            if (user_data.hasOwnProperty(field_name))
                this.jq_main_div.find('.chat-interaction-' + field_name).text(user_data[field_name]);
        }

        chat.searchChatInteraction(this.player_nick);
    };

    InteractionManager.prototype.clear = function() {
        //console.log('InteractionManager.prototype.clear');
        this.room_jid = '';
        this.jq_main_div.find('.chat-interaction-private-chat').empty();

        this.jq_main_div.find('.npc-name').text('');
        this.jq_main_div.find('.npc-text').text('');
        this.jq_main_div.find('.npc-photo').attr("src", '');

        this.jq_main_div.find('.chat-interaction-car-photo-block').empty();
        this.jq_main_div.find('.chat-interaction-car-photo-name').text('');
        this.jq_main_div.find('.chat-interaction-car-info').empty();

        for (var i = 0; i < this.field_name_list.length; i++) {
            var field_name = this.field_name_list[i];
            this.jq_main_div.find('.chat-interaction-' + field_name).text('');
        }
    };

    return InteractionManager;
})(LocationPlace);
