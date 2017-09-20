var CharacterManager = (function () {

    function CharacterManager() {
        this.jq_main_div = $();
    }

    CharacterManager.prototype.redraw = function (jq_main_div) {
        //console.log('SelfInfoManager.prototype.redraw', $(jq_main_div));
        var self = characterManager;
        if (jq_main_div)
            self.jq_main_div = $(jq_main_div).first();
        var quick_mode = !basic_server_mode;
        // Заполняем верхнюю часть окна
        self.jq_main_div.find('.character-window-avatar').first()
            .css('background', 'transparent url(' + user.avatar_link + ') 100% 100% no-repeat');
        if (user.quick)
            self.jq_main_div.find('.character-window-name').first().text(getQuickUserLogin(user.login));
        else
            self.jq_main_div.find('.character-window-name').first().text(user.login);
        self.jq_main_div.find('.character-window-about-line.lvl span').text(user.example_agent.rpg_info.cur_lvl);
        self.jq_main_div.find('.character-window-about-line.role-class span').last().text(_(user.example_agent.role_class));
        self.jq_main_div.find('.character-window-about-line.karma span').text(getKarmaNameWithoutNorm(user.example_agent.rpg_info.karma));
        self.jq_main_div.find('.character-window-about-line.balance span').text(user.balance.toFixed(0) + " Nc");
        self.jq_main_div.find('.character-window-about-area').first().find('textarea').first().text(user.example_agent.about_self);

        // Шкала опыта
        self.jq_main_div.find('.cur-exp').first().text(Math.floor(user.example_agent.rpg_info.cur_exp));
        self.jq_main_div.find('.total-exp').first().text(Math.floor(user.example_agent.rpg_info.next_lvl_exp));
        var progress = (user.example_agent.rpg_info.cur_exp - user.example_agent.rpg_info.cur_lvl_exp) /
                       (user.example_agent.rpg_info.next_lvl_exp - user.example_agent.rpg_info.cur_lvl_exp);
        progress = progress < 0 ? 0 : progress;
        progress = progress > 1 ? 1 : progress;
        self.jq_main_div.find('.character-window-exp').first().css('width', Math.round(100 * progress) + '%');

        // Свободные очки
        if (quick_mode) {
            self.jq_main_div.find('.free-perks').first().text(0);
            self.jq_main_div.find('.free-skills').first().text(0);
        }
        else {
            self.jq_main_div.find('.free-perks').first().text(Math.max(0, LocationTrainerNPC._getFreePerkPointsReal()));
            self.jq_main_div.find('.free-skills').first().text(Math.max(0, LocationTrainerNPC._getFreeSkillPointsReal()));
        }

        // Добавление перков
        var jq_perks = self.jq_main_div.find('.character-window-ttx-center.perks').first();
        jq_perks.empty();
        var class_light = 'trainer-dark-back';
        var perk_list = user.example_agent.rpg_info.perks;

        if (!perk_list) return;

        if (quick_mode) {
            var no_active_perks = true;
            var perks = user.example_agent.rpg_info.perks;
            for (var i=0; i < perks.length && no_active_perks; i++)
                if (perks[i].active) no_active_perks = false;
            if (no_active_perks) {
                var p = {
                    active: true,
                    perk: {
                        title: _('mchw_perks_title'),
                        description: _('mchw_perks_description')
                    },
                    perk_req: []
                };
                user.example_agent.rpg_info.perks = [p];
            }
        }

        for (var i = 0; i < perk_list.length; i++) {
            var perk_rec = perk_list[i];
            if (perk_rec.active) {
                class_light = (class_light == 'trainer-dark-back') ? 'trainer-light-back' : 'trainer-dark-back';
                jq_perks.append('<div class="character-window-ttx-item ' + class_light + '" data-index="' + i + '">' + _(perk_rec.perk.title) +'</div>');
            }
        }

        // Добавление скилов
        var skill_names = ['driving', 'engineering', 'leading', 'masking', 'shooting', 'trading'];
        for (var  i = 0; i < skill_names.length; i++) {
            var skill_name = skill_names[i];
            self.jq_main_div.find('.character-window-ttx-value.' + skill_name).first().text(LocationTrainerNPC._getSkillValueReal(skill_name));
        }

        // Вешаем клики на нижнее меню
        self.jq_main_div.find('.character-window-bottom-menu-item').click(function() {
            var data = $(this).data('page');
            characterManager.jq_main_div.find('.character-window-bottom-menu-item').removeClass('active');
            $(this).addClass('active');
            characterManager.jq_main_div.find('.character-window-page').css('display', 'none');
            $('.' + data).css('display', 'block');
        });
        self.jq_main_div.find('.character-window-bottom-menu-item').first().click();

        // Вывод подсказок
        self.jq_main_div.find('.character-window-ttx-center.perks').find('.character-window-ttx-item')
            .mouseenter({mng: self}, CharacterManager.perks_event_mouseenter)
            .mouseleave({mng: self}, CharacterManager.event_mouseleave);
        self.jq_main_div.find('.character-window-ttx-center.skills').find('.character-window-ttx-item')
            .mouseenter({mng: self}, CharacterManager.skills_event_mouseenter)
            .mouseleave({mng: self}, CharacterManager.event_mouseleave);


        // Работа с квестовым инвентарём
        var inventory_list = user.example_agent.rpg_info.quest_inventory || [];
        var jq_pers_inventory = self.jq_main_div.find('.character-window-page.pers_inventory');
        jq_pers_inventory.empty();
        for (var i = 0; i < inventory_list.length; i++) {
            var item = inventory_list[i];
            jq_pers_inventory.append(
                '<div class="mainCarInfoWindow-body-trunk-body-right-item-wrap town-interlacing" data-index="' + i + '">' +
                    '<div class="mainCarInfoWindow-body-trunk-body-right-item">' +
                        '<div class="mainCarInfoWindow-body-trunk-body-right-item-name-empty">' + item.title + '</div>' +
                        '<div class="mainCarInfoWindow-body-trunk-body-right-item-picture-empty" style="background: transparent url(/' + item.inv_icon_mid + ') no-repeat 100% 100%; "></div>' +
                    '</div>' +
                '</div>'

            );
        }

        jq_pers_inventory.find(".mainCarInfoWindow-body-trunk-body-right-item-wrap")
            .mouseenter({mng: self}, CharacterManager.quest_item_event_mouseenter)
            .mouseleave({mng: self}, CharacterManager.event_mouseleave);


        // Работа эффектами агента
        var pers_effects = user.example_agent.rpg_info.agent_effects || []; // поля: source, title, description, deadline
        var jq_pers_effects = self.jq_main_div.find('.character-window-page.pers_effects');
        jq_pers_effects.empty();
        for (var i = 0; i < pers_effects.length; i++) {
            var item = pers_effects[i];

            var time_str = "";
            if (item.deadline == 0)
                time_str = "-:-";  // Бесконечность
            else {
                var t = new Date(item.deadline * 1000);  // Дата окончания эффекта
                var n = new Date();
                var time_str = toHH(Math.max(t - n, 0));
                //time_str = t < new Date() ? "" : t.toLocaleTimeString('ru');
            }

            var backlight = i % 2 ? "trainer-light-back" : "trainer-dark-back";
            jq_pers_effects.append(
                '<div class="character-effect-block" data-index="' + i + '">' +
                    '<div class="character-effect-title ' + backlight + '">' + _(item.title) + '</div>' +
                    '<div class="character-effect-deadline ' + backlight + '">' + time_str + '</div>' +
                '</div>'
            );
        }

        jq_pers_effects.find(".character-effect-block")
            .mouseenter(CharacterManager.agent_effect_event_mouseenter)
            .mouseleave({mng: self}, CharacterManager.event_mouseleave);
    };

    CharacterManager.perks_event_mouseenter = function (event) {
        //console.log('CharacterManager.perks_event_mouseenter');
        var perc_rec = user.example_agent.rpg_info.perks[$(event.currentTarget).data('index')];
        if(! perc_rec) return;
        event.data.mng.jq_main_div.find('.character-window-hint-text').html(_(perc_rec.perk.description));
    };

    CharacterManager.skills_event_mouseenter = function (event) {
        //console.log('CharacterManager.skills_event_mouseenter');
        var skill_name = $(event.currentTarget).data('skill');
        if(! skill_name) return;
        event.data.mng.jq_main_div.find('.character-window-hint-text').text(_(user.example_agent.rpg_info[skill_name].description));
    };

    CharacterManager.quest_item_event_mouseenter = function (event) {
        //console.log('CharacterManager.quest_item_event_mouseenter');
        var index = $(event.currentTarget).data('index');
        if (user.example_agent.rpg_info.quest_inventory.length > index)
            event.data.mng.jq_main_div.find('.character-window-hint-text').text(_(user.example_agent.rpg_info.quest_inventory[index].description));
    };

    CharacterManager.agent_effect_event_mouseenter = function (event) {
        //console.log('CharacterManager.skills_event_mouseenter');
        var index = $(event.currentTarget).data('index');
        if (user.example_agent.rpg_info.agent_effects.length > index)
            characterManager.jq_main_div.find('.character-window-hint-text').text(_(user.example_agent.rpg_info.agent_effects[index].description));
    };

    CharacterManager.event_mouseleave = function (event) {
        //console.log('CharacterManager.event_mouseleave');
        var mng = event && event.data && event.data.mng || characterManager;
        if(locationManager && locationManager.in_location_flag)
            locationManager.location_menu.viewRightPanel("");
        else
            mng.jq_main_div.find('.character-window-hint-text').text('');
    };


    CharacterManager.event_mouseover_level = function (event) {
        //console.log('CharacterManager.event_mouseover_level');
        var mng = event && event.data && event.data.mng || characterManager;
        var tt = _("mchw_lvl_info");
        if(locationManager && locationManager.in_location_flag)
            locationManager.location_menu.viewRightPanel(tt);
        else
            mng.jq_main_div.find('.character-window-hint-text').text(tt);
    };

    CharacterManager.event_mouseover_roleclass = function (event) {
        //console.log('CharacterManager.event_mouseover_roleclass');
        var mng = event && event.data && event.data.mng || characterManager;
        var tt = _("mchw_class_info");
        if(locationManager && locationManager.in_location_flag)
            locationManager.location_menu.viewRightPanel(tt);
        else
            mng.jq_main_div.find('.character-window-hint-text').text(tt);
    };

    CharacterManager.event_mouseover_roleclass_cur = function (event) {
        //console.log('CharacterManager.event_mouseover_roleclass_cur');
        var mng = event && event.data && event.data.mng || characterManager;
        var tt = user.example_agent.role_class_description_char_window || user.example_agent.role_class;
        //tt = tt.replace("\\", '').split('n').join('<br>');  // info: сработает только для русского языка
        if(locationManager && locationManager.in_location_flag)
            locationManager.location_menu.viewRightPanel(tt);
        else
            mng.jq_main_div.find('.character-window-hint-text').html(tt);
    };

    CharacterManager.event_mouseover_karma = function (event) {
        //console.log('CharacterManager.event_mouseover_karma');
        var mng = event && event.data && event.data.mng || characterManager;
        var tt = _("mchw_karma_info");
        if(locationManager && locationManager.in_location_flag)
            locationManager.location_menu.viewRightPanel(tt);
        else
            mng.jq_main_div.find('.character-window-hint-text').text(tt);
    };

    CharacterManager.event_mouseover_about_self = function (event) {
        //console.log('CharacterManager.event_mouseover_about_self');
        var mng = event && event.data && event.data.mng || characterManager;
        var tt = _("mchw_about_self_info");
        if(locationManager && locationManager.in_location_flag)
            locationManager.location_menu.viewRightPanel(tt);
        else
            mng.jq_main_div.find('.character-window-hint-text').text(tt);
    };

    CharacterManager.event_mouseover_stats_btn = function (event) {
        //console.log('CharacterManager.event_mouseover_stats_btn');
        var mng = event && event.data && event.data.mng || characterManager;
        var tt = _("mchw_list_perks_skill_info");
        if(locationManager && locationManager.in_location_flag)
            locationManager.location_menu.viewRightPanel(tt);
        else
            mng.jq_main_div.find('.character-window-hint-text').text(tt);
    };

    CharacterManager.event_mouseover_exp = function (event) {
        //console.log('CharacterManager.event_mouseover_exp');
        var mng = event && event.data && event.data.mng || characterManager;
        var tt = _("mchw_exp_info");
        if(locationManager && locationManager.in_location_flag)
            locationManager.location_menu.viewRightPanel(tt);
        else
            mng.jq_main_div.find('.character-window-hint-text').text(tt);
    };

    CharacterManager.event_mouseover_all_perks = function (event) {
        //console.log('CharacterManager.event_mouseover_all_perks');
        var mng = event && event.data && event.data.mng || characterManager;
        var tt = _("mchw_list_perks_info");
        if(locationManager && locationManager.in_location_flag)
            locationManager.location_menu.viewRightPanel(tt);
        else
            mng.jq_main_div.find('.character-window-hint-text').text(tt);
    };

    CharacterManager.event_mouseover_free_perks = function (event) {
        //console.log('CharacterManager.event_mouseover_free_perks');
        var mng = event && event.data && event.data.mng || characterManager;
        var tt = _("mchw_free_perks_info");
        if(locationManager && locationManager.in_location_flag)
            locationManager.location_menu.viewRightPanel(tt);
        else
            mng.jq_main_div.find('.character-window-hint-text').text(tt);
    };

    CharacterManager.event_mouseover_all_skills = function (event) {
        //console.log('CharacterManager.event_mouseover_all_skills');
        var mng = event && event.data && event.data.mng || characterManager;
        var tt = _("mchw_list_skills_info");
        if(locationManager && locationManager.in_location_flag)
            locationManager.location_menu.viewRightPanel(tt);
        else
            mng.jq_main_div.find('.character-window-hint-text').text(tt);
    };

    CharacterManager.event_mouseover_free_skills = function (event) {
        //console.log('CharacterManager.event_mouseover_free_skills');
        var mng = event && event.data && event.data.mng || characterManager;
        var tt = _("mchw_free_skills_info");
        if(locationManager && locationManager.in_location_flag)
            locationManager.location_menu.viewRightPanel(tt);
        else
            mng.jq_main_div.find('.character-window-hint-text').text(tt);
    };


    CharacterManager.event_mouseover_inventory_btn = function (event) {
        //console.log('CharacterManager.event_mouseover_inventory_btn');
        var mng = event && event.data && event.data.mng || characterManager;
        var tt = _("mchw_pers_inv_info");
        if(locationManager && locationManager.in_location_flag)
            locationManager.location_menu.viewRightPanel(tt);
        else
            mng.jq_main_div.find('.character-window-hint-text').text(tt);
    };


    CharacterManager.event_mouseover_effects_btn = function (event) {
        //console.log('CharacterManager.event_mouseover_effects_btn');
        var mng = event && event.data && event.data.mng || characterManager;
        var tt = _("mchw_pers_effect_info");
        if(locationManager && locationManager.in_location_flag)
            locationManager.location_menu.viewRightPanel(tt);
        else
            mng.jq_main_div.find('.character-window-hint-text').text(tt);
    };

    CharacterManager.event_mouseover_balance = function (event) {
        //console.log('CharacterManager.event_mouseover_balance');
        var mng = event && event.data && event.data.mng || characterManager;
        var tt = _("mchw_balance_info");
        if(locationManager && locationManager.in_location_flag)
            locationManager.location_menu.viewRightPanel(tt);
        else
            mng.jq_main_div.find('.character-window-hint-text').text(tt);
    };

    return CharacterManager;
})();

var characterManager = new CharacterManager();
