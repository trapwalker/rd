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

    PartyManager.prototype.add_invite = function (invite_id, party, sender, recipient) {
        if (user.ID != recipient.uid) return;
        var invite = {
            invite_id: invite_id, party: party, sender: sender, recipient: recipient
        };
        this.invites.push(invite);
        this._redraw_invites();
    };

    PartyManager.prototype.del_invite = function (invite_id) {
        var index = -1;
        for (var i = 0; i < this.invites.length; i++)
            if (this.invites[i].invite_id == invite_id) {
                index = i;
                break;
            }
        if (index >= 0) {
            this.invites.splice(index, 1);
            this._redraw_invites();
        }
    };

    PartyManager.prototype.set_party_info = function (party) {
        if (this.selected_party_name != party.name) return;

        var i;
        var jq_member_block = this.jq_main_div.find('.party-page-invite-members-block');
        var back_class = 'party-window-light-back';
        jq_member_block.empty();

        for (i = 0; i < party.members.length; i++) {
            var member = party.members[i];
            back_class = (back_class == 'party-window-light-back') ? 'party-window-dark-back' : 'party-window-light-back';
            var jq_member = $(
                '<div class="party-page-invite-members-line ' + back_class + '" data-agent_name="' + member.agent_name + '">' + member.agent_name + '</div>'
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
        jq_target_div.find('.party-window-person-photo').attr("src", user_info.avatar);
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

    PartyManager.prototype.redraw = function (jq_main_div) {
        //console.log('PartyManager.prototype.redraw', $(jq_main_div));
        var self = partyManager;
        self.jq_main_div = $(jq_main_div).first();

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

        // Вешаем клик на кнопку создать
        self.jq_main_div.find('.party-page-create-btn').click(function() {
            var name = partyManager.jq_main_div.find('.party-page-create-name-input').first().val();
            var description = partyManager.jq_main_div.find('.party-page-create-target-textarea').first().val();
            if (name && (name != ''))
                clientManager.sendCreatePartyFromTemplate(name, description);
            partyManager.jq_main_div.find('.party-page-create-name-input').first().val('');
            partyManager.jq_main_div.find('.party-page-create-target-textarea').first().val('');
        });

        //  Вешаем клик на отправку инвайта
        self.jq_main_div.find('.party-page-management-invite-btn').click(function() {
            var name = partyManager.jq_main_div.find('.party-page-management-invite-input').first().val();
            if (name && (name != ''))
                clientManager.sendInvitePartyFromTemplate(name);
            partyManager.jq_main_div.find('.party-page-management-invite-input').first().val('');
        });

        self._redraw_invites();
        self._redraw_party();
    };

    PartyManager.prototype._redraw_invites = function () {
        //console.log('PartyManager.prototype._redraw_invites');
        var jq_invite_block = this.jq_main_div.find('.party-page-invite-invites-block');
        var back_class = 'party-window-light-back';
        jq_invite_block.empty();
        var i;
        for (i = 0; i < this.invites.length; i++) {
            var invite = this.invites[i];
            back_class = (back_class == 'party-window-light-back') ? 'party-window-dark-back' : 'party-window-light-back';
            var jq_invite = $(
                '<div class="party-page-invite-invites-line ' + back_class + '" data-party_name="' + invite.party.name + '">' + invite.party.name + ' [' + invite.sender.login + ']' +
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
            clientManager.sendJoinPartyFromTemplate(party_name);
            stopEvent(event);
        });
        jq_invite_block.find('.party-page-invite-invites-del-btn').click(function(event) {
            var invite_id = $(this).data('invite_id');
            clientManager.sendPartyDeleteInvite(invite_id);
            stopEvent(event);
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
        var back_class = 'party-window-light-back';
        jq_member_block.empty();

        if (this.party.id >= 0) {
            for (i = 0; i < this.party.members.length; i++) {
                var member = this.party.members[i];
                back_class = (back_class == 'party-window-light-back') ? 'party-window-dark-back' : 'party-window-light-back';
                var jq_member = $(
                    '<div class="party-page-management-members-line ' + back_class + '" data-agent_name="' + member.agent_name + '">' + member.agent_name +
                        '<div class="party-page-management-members-kick-btn" data-agent_name="' + member.agent_name + '">&times;</div>' +
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
            var agent_name = $(this).data('agent_name');
            clientManager.sendKickPartyFromTemplate(agent_name);
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
