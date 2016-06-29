var CharacterManager = (function () {

    function CharacterManager() {
        this.jq_main_div = $();
    }

    CharacterManager.prototype.redraw = function (jq_main_div) {
        //console.log('SelfInfoManager.prototype.redraw', $(jq_main_div));
        var self = characterManager;
        if (jq_main_div)
            self.jq_main_div = $(jq_main_div).first();

        // Заполняем верхнюю часть окна
        self.jq_main_div.find('.character-window-avatar').first()
            .css('background', 'transparent url(' + user.avatar_link + ') 100% 100% no-repeat');
        self.jq_main_div.find('.character-window-name').first().text(user.login);

        self.jq_main_div.find('.character-window-about-line.lvl span').text(user.example_agent.rpg_info.current_level);
        self.jq_main_div.find('.character-window-about-line.role-class span').text(user.example_agent.role_class);
        self.jq_main_div.find('.character-window-about-area').first().find('textarea').first().text(user.example_agent.about_self);

        // Свободные очки
        self.jq_main_div.find('.free-perks').first().text(LocationTrainerNPC._getFreePerkPointsReal());
        self.jq_main_div.find('.free-skills').first().text(LocationTrainerNPC._getFreeSkillPointsReal());

        // Добавление перков
        var jq_perks = self.jq_main_div.find('.character-window-ttx-center.perks').first();
        jq_perks.empty();
        var class_light = 'trainer-dark-back';
        var perk_list = user.example_agent.rpg_info.perks;
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

    CharacterManager.event_mouseleave = function (event) {
        //console.log('CharacterManager.event_mouseleave');
        event.data.mng.jq_main_div.find('.character-window-hint-text').text('');
    };

    return CharacterManager;
})();

var characterManager = new CharacterManager();
