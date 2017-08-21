var LocationPlaceChat = (function (_super) {
    __extends(LocationPlaceChat, _super);

    function LocationPlaceChat(jq_town_div) {
        //console.log('LocationPlaceChat', jq_town_div);
        _super.call(this, jq_town_div.find('#townChatLocation'), 'chat_screen');
        locationManager.screens['chat_screen'] = this;
        this.interaction_manager = new InteractionManager(jq_town_div);
        chat.showChatInTown(this.jq_main_div.find('.chat-wrap').first());
    }

    LocationPlaceChat.prototype.activate = function () {
        //console.log('LocationPlaceChat.prototype.activate', this.jq_main_div);
        _super.prototype.activate.call(this);
        $('#landscape').css('display', 'block');

        // Вот такая вот хуйня малята
        chat._resizePageControl(chat.page_global.pageControl);
        chat._resizePageControl(chat.page_global.pageControl);
    };

    LocationPlaceChat.prototype.set_buttons = function () {
        if (!locationManager.isActivePlace(this)) return;
        locationManager.setBtnState(1, '', false);
        locationManager.setBtnState(2, '', false);
        locationManager.setBtnState(3, '</br>Назад', false);
        locationManager.setBtnState(4, '</br>Выход', true);
    };

    LocationPlaceChat.prototype.get_important_msg = function () {
        if ($('#btn_screen_chat_pressed').css('display') == 'none') {
            var jq_btn = $('#btn_screen_chat_hover');
            jq_btn.css('display', 'block');
            jq_btn.attr('class', 'wait');
        }
    };

    return LocationPlaceChat;
})(LocationPlace);