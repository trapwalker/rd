var PartyManager = (function () {

    function PartyManager() {
        this.invites = [];
        this.jq_main_div = $();
        this.party = {
            id: -1,
            name: '',
            members: []
        };

        this.field_name_list = ['lvl', 'role_class', 'karma', 'driving', 'shooting', 'masking', 'leading', 'trading', 'engineering'];
        this.selected_party_name = '';
        this.invite_user_name = '';
        this.party_user_name = '';

        this.share_exp_type_list = ['Каждому своё', 'Поровну'];
        this.cur_share_exp_type = 0;
        this.jq_cur_share_exp_type = $();
    }

    PartyManager.prototype.user_in_party = function (user_name) {
        //console.log("PartyManager.prototype.user_in_party", user_name);
        if (this.party.id < 0) return false;
        for (var i = 0; i < this.party.members.length; i++)
            if (this.party.members[i].agent_name == user_name)
                return true;
        return false;
    };

    PartyManager.prototype.include_to_party = function (party) {
        //console.log("PartyManager.prototype.include_to_party", party);
        this.party = party;
        $(this.jq_main_div.find('.party-window-menu-item')[1]).removeClass('unactive');
        $(this.jq_main_div.find('.party-window-menu-item')[0]).addClass('unactive');
        $(this.jq_main_div.find('.party-window-menu-item')[1]).click();
        this._redraw_party();
    };

    PartyManager.prototype.exclude_from_party = function () {
        //console.log("PartyManager.prototype.exclude_from_party");
        this.party = {
            id: -1,
            name: '',
            members: []
        };
        $(this.jq_main_div.find('.party-window-menu-item')[0]).removeClass('unactive');
        $(this.jq_main_div.find('.party-window-menu-item')[1]).addClass('unactive');
        $(this.jq_main_div.find('.party-window-menu-item')[0]).click();
        this._redraw_party();
    };

    PartyManager.prototype.search_invite = function (invite_id) {
        for (var i = 0; i < this.invites.length; i++)
            if (this.invites[i].invite_id == invite_id)
                return i;
        return -1;
    };

    PartyManager.prototype.add_invite = function (invite_id, party, sender, recipient) {
        //console.log('PartyManager.prototype.add_invite ');
        if (user.ID != recipient.uid) return;
        var invite = { invite_id: invite_id, party: party, sender: sender, recipient: recipient };
        if (this.search_invite(invite.invite_id) < 0) {
            this.invites.push(invite);
            this._redraw_invites();
        }
    };

    PartyManager.prototype.del_invite = function (invite_id) {
        var index = this.search_invite(invite_id);
        if (index >= 0) {
            this.invites.splice(index, 1);
            this._redraw_invites();
        }
    };

    PartyManager.prototype.set_party_info = function (party) {
        if (this.selected_party_name != party.name) return;

        var i;
        var jq_member_block = this.jq_main_div.find('.party-page-invite-members-block');
        var back_class = 'party-page-line-light';
        jq_member_block.empty();

        for (i = 0; i < party.members.length; i++) {
            var member = party.members[i];
            back_class = (back_class == 'party-page-line-light') ? 'party-page-line-dark' : 'party-page-line-light';
            var jq_member = $(
                '<div class="party-page-invite-members-line party-page-line ' + back_class + '" data-agent_name="' + member.agent_name + '">' + member.agent_name + '</div>'
            );
            jq_member_block.append(jq_member);
        }

        jq_member_block.find('.party-page-invite-members-line').click(function() {
            var agent_name = $(this).data('agent_name');
            partyManager.jq_main_div.find('.party-page-invite-members-line').removeClass('active');
            $(this).addClass('active');
            partyManager.invite_user_name = agent_name;
            clientManager.sendGetPartyUserInfo(agent_name);
        });

        // Выделить того игрока что был выделен если он остался
        for (i = 0; i < party.members.length; i++)
            if (party.members[i].agent_name == this.invite_user_name) {
                jq_member_block.find('.party-page-invite-members-line').removeClass('active');
                $(jq_member_block.find('.party-page-invite-members-line')[i]).addClass('active');
                break;
            }
        if (i >= party.members.length) this._clear_invite_user();
    };

    PartyManager.prototype._set_user_info = function (user_info, jq_target_div) {
        this._clear_user_info(jq_target_div);
        jq_target_div.find('.party-window-person-photo-wrap').css('display', 'block');
        jq_target_div.find('.party-window-pers-info').css('display', 'block');
        jq_target_div.find('.party-window-person-photo').css("background-image", 'url("' + user_info.avatar + '"');
        jq_target_div.find('.party-page-car-block').append(user_info.html_car_img);
        //this.jq_main_div.find('.chat-interaction-car-photo-name').text(user_data.car_name);
        for (var i = 0; i < this.field_name_list.length; i++) {
            var field_name = this.field_name_list[i];
            if (user_info.hasOwnProperty(field_name))
                jq_target_div.find('.party-window-' + field_name).text(user_info[field_name]);
        }
    };

    PartyManager.prototype.set_user_info = function (user_info) {
        if (this.invite_user_name == user_info.name)
            this._set_user_info(user_info, this.jq_main_div.find('.party_page_invite'));
        if (this.party_user_name == user_info.name)
            this._set_user_info(user_info, this.jq_main_div.find('.party_page_management'));
    };

    PartyManager.prototype.set_share_exp_type = function (d_value) {
        if (d_value) this.cur_share_exp_type += d_value;
        var len_type_list = this.share_exp_type_list.length;
        while (this.cur_share_exp_type < 0) this.cur_share_exp_type += len_type_list;
        while (this.cur_share_exp_type >= len_type_list) this.cur_share_exp_type -= len_type_list;
        this.jq_cur_share_exp_type.text(this.share_exp_type_list[this.cur_share_exp_type]);
    };

    PartyManager.prototype.redraw = function (jq_main_div) {
        //console.log('PartyManager.prototype.redraw', $(jq_main_div));
        var self = partyManager;
        self.jq_main_div = $(jq_main_div).first();
        if (self.jq_main_div.find('.party-window-menu-item').length == 0) return;

        // Вешаем клики на кнопки верхнего меню
        self.jq_main_div.find('.party-window-menu-item').click(function() {
            var data = $(this).data('page_class');
            if ((data == 'party_page_create') && (partyManager.party.id != -1)) return;
            if ((data == 'party_page_management') && (partyManager.party.id == -1)) return;
            partyManager.jq_main_div.find('.party-window-menu-item').removeClass('active');
            $(this).addClass('active');
            partyManager.jq_main_div.find('.party-window-page').css('display', 'none');
            $('.' + data).css('display', 'block');
        });
        if (self.party.id > 0) {
            self.jq_main_div.find('.party-window-menu-item')[1].click();
            $(self.jq_main_div.find('.party-window-menu-item')[0]).addClass('unactive');
        }
        else {
            self.jq_main_div.find('.party-window-menu-item')[0].click();
            $(self.jq_main_div.find('.party-window-menu-item')[1]).addClass('unactive');
        }

        // Вешаем клики на настройку деления опыта
        self.jq_cur_share_exp_type = self.jq_main_div.find('#partyShareExpType');
        self.set_share_exp_type();

        // Вешаем клик на кнопку создать
        self.jq_main_div.find('.party-page-create-btn').click(function() {
            var name = partyManager.jq_main_div.find('.party-page-create-name-input').first().val();
            var description = partyManager.jq_main_div.find('.party-page-create-target-textarea').first().val();
            if (name && (name != ''))
                clientManager.sendCreatePartyFromTemplate(name, description, self.cur_share_exp_type);
            partyManager.jq_main_div.find('.party-page-create-name-input').first().val('');
            partyManager.jq_main_div.find('.party-page-create-target-textarea').first().val('');
        });
        self.jq_main_div.find('.party-page-create-name-input').on('keydown', function (event) {
            if (event.keyCode != 13) return;
            partyManager.jq_main_div.find('.party-page-create-btn').click();
        });

        //  Вешаем клик на отправку инвайта
        self.jq_main_div.find('.party-page-management-invite-btn').click(function() {
            var name = partyManager.jq_main_div.find('.party-page-management-invite-input').first().val();
            if (name && (name != ''))
                clientManager.sendInvitePartyFromTemplate(name);
            partyManager.jq_main_div.find('.party-page-management-invite-input').first().val('');
        });
        self.jq_main_div.find('.party-page-management-invite-input').on('keydown', function (event) {
            if (event.keyCode != 13) return;
            partyManager.jq_main_div.find('.party-page-management-invite-btn').click();
        });

        self._redraw_invites();
        self._redraw_party();
    };

    PartyManager.prototype._redraw_invites = function () {
        //console.log('PartyManager.prototype._redraw_invites');
        var jq_invite_block = this.jq_main_div.find('.party-page-invite-invites-block');
        var back_class = 'party-page-line-light';
        jq_invite_block.empty();
        var i;
        for (i = 0; i < this.invites.length; i++) {
            var invite = this.invites[i];
            var share_exp_str = invite.party.share_exp ? 'Поровну' : 'Каждому своё';
            back_class = (back_class == 'party-page-line-light') ? 'party-page-line-dark' : 'party-page-line-light';
            var jq_invite = $(
                '<div class="party-page-invite-invites-line party-page-line ' + back_class + '" data-party_name="' + invite.party.name + '">' + invite.party.name + ' [Опыт: '+ share_exp_str + '; Пригласил: ' + invite.sender.login + ']' +
                    '<div class="party-page-invite-invites-accept-btn" data-party_name="' + invite.party.name + '">+</div>' +
                    '<div class="party-page-invite-invites-del-btn" data-invite_id="' + invite.invite_id + '">&ndash;</div>' +
                '</div>'
            );
            jq_invite_block.append(jq_invite);
        }

        // Клики на принять/отклонить и на сам инвайт
        jq_invite_block.find('.party-page-invite-invites-line').click(function() {
            var party_name = $(this).data('party_name');
            partyManager.jq_main_div.find('.party-page-invite-invites-line').removeClass('active');
            $(this).addClass('active');
            partyManager.selected_party_name = party_name;
            clientManager.sendGetPartyInfo(party_name);
        });
        jq_invite_block.find('.party-page-invite-invites-accept-btn').click(function(event) {
            var party_name = $(this).data('party_name');
            //clientManager.sendJoinPartyFromTemplate(party_name);
            stopEvent(event);

            modalWindow.modalDialogAnswerShow({
                caption: 'Party Operations',
                header: 'Присоединиться?',
                body_text: 'Вы уверены, что хотите присоединиться к ' + party_name + '?',
                callback_ok: function () {
                   clientManager.sendJoinPartyFromTemplate(party_name);
                }
            });
        });
        jq_invite_block.find('.party-page-invite-invites-del-btn').click(function(event) {
            var invite_id = $(this).data('invite_id');
            //clientManager.sendPartyDeleteInvite(invite_id);
            stopEvent(event);
            modalWindow.modalDialogAnswerShow({
                caption: 'Party Operations',
                header: 'Отменить?',
                body_text: 'Вы уверены, что хотите отменить приглашение?',
                callback_ok: function () {
                   clientManager.sendPartyDeleteInvite(invite_id);
                }
            });
        });

        // Выделить тот инвайт что был выделен если он остался
        for (i = 0; i < this.invites.length; i++)
            if (this.invites[i].party.name == this.selected_party_name) {
                jq_invite_block.find('.party-page-invite-invites-line').removeClass('active');
                $(jq_invite_block.find('.party-page-invite-invites-line')[i]).addClass('active');
                break;
            }
        if (i >= this.invites.length) this._clear_invite_party();
    };

    PartyManager.prototype._redraw_party = function () {
        //console.log('PartyManager.prototype._redraw_party');
        var i;
        var jq_member_block = this.jq_main_div.find('.party-page-management-members-block');
        var back_class = 'party-page-line-light';
        jq_member_block.empty();

        if (this.party.id >= 0) {
            for (i = 0; i < this.party.members.length; i++) {
                var member = this.party.members[i];
                back_class = (back_class == 'party-page-line-light') ? 'party-page-line-dark' : 'party-page-line-light';
                var member_class = '';
                switch (member.category) {
                    case 0:
                        member_class = 'leader';
                        break;
                    case 1:
                        member_class = 'officer';
                        break;
                    case 2:
                        member_class = 'soldier';
                }
                var jq_member = $(
                    '<div class="party-page-management-members-line party-page-line ' + back_class + '" data-agent_name="' + member.agent_name + '">' + member.agent_name +
                        '<div class="party-page-management-members-category-btn ' + member_class + '"></div>' +
                        '<div class="party-page-management-members-kick-btn">&times;</div>' +
                    '</div>'
                );
                jq_member_block.append(jq_member);
            }

            // Выделить того игрока что был выделен если он остался
            for (i = 0; i < this.party.members.length; i++)
                if (this.party.members[i].agent_name == this.party_user_name) {
                    jq_member_block.find('.party-page-management-members-line').removeClass('active');
                    $(jq_member_block.find('.party-page-management-members-line')[i]).addClass('active');
                    break;
                }
            if (i >= this.party.members.length) this._clear_party_user();
        }

        jq_member_block.find('.party-page-management-members-line').click(function() {
            var agent_name = $(this).data('agent_name');
            partyManager.jq_main_div.find('.party-page-management-members-line').removeClass('active');
            $(this).addClass('active');
            partyManager.party_user_name = agent_name;
            clientManager.sendGetPartyUserInfo(agent_name);
        });
        jq_member_block.find('.party-page-management-members-kick-btn').click(function(event) {
            var agent_name = $(this).parent().data('agent_name');
            //clientManager.sendKickPartyFromTemplate(agent_name);

            modalWindow.modalDialogAnswerShow({
                caption: 'Party Operations',
                header: agent_name == user.login ? 'Покинуть?' : 'Кикнуть?',
                body_text: agent_name == user.login ? 'Вы уверены, что хотите покинуть пати?' : 'Вы уверены, что хотите кикнуть ' + agent_name + '?',
                callback_ok: function () {
                   clientManager.sendKickPartyFromTemplate(agent_name);
                }
            });

            stopEvent(event);
        });
        jq_member_block.find('.party-page-management-members-category-btn').click(function(event) {
            var agent_name = $(this).parent().data('agent_name');
            clientManager.sendChangePartyCategory(agent_name);
            stopEvent(event);
        });
    };

    PartyManager.prototype._clear_invite_party = function () {
        //console.log('PartyManager.prototype._clear_invite_party');
        this.jq_main_div.find('.party-page-invite-members-block').empty();
        this.selected_party_name = '';
        this._clear_invite_user();
    };

    PartyManager.prototype._clear_user_info = function (jq_target_div) {
        //console.log('PartyManager.prototype._clear_user_info');
        jq_target_div.find('.party-window-person-photo').attr('src', '');
        jq_target_div.find('.party-window-pers-info-value').text('');
        jq_target_div.find('.party-page-car-block').empty();
        jq_target_div.find('.party-window-person-photo-wrap').css('display', 'none');
        jq_target_div.find('.party-window-pers-info').css('display', 'none');
    };

    PartyManager.prototype._clear_invite_user = function () {
        //console.log('PartyManager.prototype._clear_invite_user');
        this._clear_user_info(this.jq_main_div.find('.party_page_invite'));
        this.invite_user_name = '';
    };

    PartyManager.prototype._clear_party_user = function () {
        //console.log('PartyManager.prototype._clear_invite_user');
        this._clear_user_info(this.jq_main_div.find('.party_page_management'));
        this.party_user_name = '';
    };

    return PartyManager;
})();

var partyManager = new PartyManager();
