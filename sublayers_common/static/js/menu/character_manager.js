var CharacterManager = (function () {

    function CharacterManager() {
        this.jq_main_div = $();
    }

    CharacterManager.prototype.redraw = function (jq_main_div) {
        //console.log('SelfInfoManager.prototype.redraw', $(jq_main_div));
        var self = characterManager;
        if (jq_main_div)
            self.jq_main_div = $(jq_main_div).first();
        var quick_mode = $('#settings_server_mode').text() == 'quick';
        // Заполняем верхнюю часть окна
        self.jq_main_div.find('.character-window-avatar').first()
            .css('background', 'transparent url(' + user.avatar_link + ') 100% 100% no-repeat');
        if (user.quick)
            self.jq_main_div.find('.character-window-name').first().text(getQuickUserLogin(user.login));
        else
            self.jq_main_div.find('.character-window-name').first().text(user.login);
        self.jq_main_div.find('.character-window-about-line.lvl span').text(user.example_agent.rpg_info.cur_lvl);
        self.jq_main_div.find('.character-window-about-line.role-class span').text(user.example_agent.role_class);
        self.jq_main_div.find('.character-window-about-line.karma span').text(getKarmaNameWithoutNorm(user.example_agent.karma));
        self.jq_main_div.find('.character-window-about-area').first().find('textarea').first().text(user.example_agent.about_self);

        // Шкала опыта
        self.jq_main_div.find('.cur-exp').first().text(user.example_agent.rpg_info.cur_exp);
        self.jq_main_div.find('.total-exp').first().text(user.example_agent.rpg_info.next_lvl_exp);
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

        if (quick_mode) {
            var no_active_perks = true;
            var perks = user.example_agent.rpg_info.perks;
            for (var i=0; i < perks.length && no_active_perks; i++)
                if (perks[i].active) no_active_perks = false;
            if (no_active_perks) {
                var p = {
                    active: true,
                    perk: {
                        title: 'Не доступно',
                        description: 'Перки не доступны в данном режме игры.'
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
                jq_perks.append('<div class="character-window-ttx-item ' + class_light + '" data-index="' + i + '">' + perk_rec.perk.title +'</div>');
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
                        '<div class="mainCarInfoWindow-body-trunk-body-right-item-picture-empty" style="background: transparent url(http://' + location.hostname + '/' + item.inv_icon_mid + ') no-repeat 100% 100%; "></div>' +
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
                time_str = "-:-";
            else {
                var t = new Date(item.deadline * 1000);
                time_str = t < new Date() ? "" : t.toLocaleTimeString('ru');
            }

            jq_pers_effects.append(
                '<div class="character-effect-block" data-index="' + i + '">' +
                    '<div class="character-effect-source">' + item.source + '</div>' +
                    '<div class="character-effect-title">' + item.title + '</div>' +
                    '<div class="character-effect-deadline">' + time_str + '</div>' +
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
        event.data.mng.jq_main_div.find('.character-window-hint-text').text(perc_rec.perk.description);
    };

    CharacterManager.skills_event_mouseenter = function (event) {
        //console.log('CharacterManager.skills_event_mouseenter');
        var skill_name = $(event.currentTarget).data('skill');
        if(! skill_name) return;
        event.data.mng.jq_main_div.find('.character-window-hint-text').text(user.example_agent.rpg_info[skill_name].description);
    };

    CharacterManager.quest_item_event_mouseenter = function (event) {
        //console.log('CharacterManager.skills_event_mouseenter');
        var index = $(event.currentTarget).data('index');
        if (user.example_agent.rpg_info.quest_inventory.length > index)
            event.data.mng.jq_main_div.find('.character-window-hint-text').text(user.example_agent.rpg_info.quest_inventory[index].description);
    };

    CharacterManager.agent_effect_event_mouseenter = function (event) {
        //console.log('CharacterManager.skills_event_mouseenter');
        var index = $(event.currentTarget).data('index');
        if (user.example_agent.rpg_info.agent_effects.length > index)
            characterManager.jq_main_div.find('.character-window-hint-text').text(user.example_agent.rpg_info.agent_effects[index].description);
    };

    CharacterManager.event_mouseleave = function (event) {
        //console.log('CharacterManager.event_mouseleave');
        event.data.mng.jq_main_div.find('.character-window-hint-text').text('');
    };

    return CharacterManager;
})();

var characterManager = new CharacterManager();
