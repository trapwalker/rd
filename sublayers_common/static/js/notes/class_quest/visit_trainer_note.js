var QuestNoteVisitTrainer = (function (_super) {
    __extends(QuestNoteVisitTrainer, _super);

    function QuestNoteVisitTrainer(options) {
        _super.call(this, options);
    }

    QuestNoteVisitTrainer.prototype.redraw_by_index = function(index) {
        this.clear_by_index(index);

        var jq_main_div = this.jq_main_div_list[index];
        var jq_menu_div = this.jq_menu_div_list[index];
        var build = this.build_list[index];

        if (!jq_main_div || !jq_menu_div || !build || (this.quest_uid == null)) return;


        var quest = journalManager.quests.getQuest(this.quest_uid);
        if (! quest) {
            console.warn('quest not found:', this.quest_uid);
            return;
        }

        var role_skill = '';
        var teacher = '';
        var class_name = user.example_agent.role_class;
        if (user.example_agent.role_class == "Избранный") { role_skill = 'Вождение'; teacher = 'мэра'; }
        else if (user.example_agent.role_class == "Альфа-волк") { role_skill = 'Лидерство'; teacher = 'мэра'; }
        else if (user.example_agent.role_class == "Ночной ездок") { role_skill = 'Скрытность'; teacher = 'бармен'; }
        else if (user.example_agent.role_class == "Нефтяной магнат") { role_skill = 'Торговля'; teacher = 'торговца'; }
        else if (user.example_agent.role_class == "Воин дорог") { role_skill = 'Стрельба'; teacher = 'автодилера'; }
        else if (user.example_agent.role_class == "Технокинетик") { role_skill = 'Механика'; teacher = 'механика'; }

        var text =
            'С давних времен люди научились избирать для себя роль в мире и войне. Роль позволяет получить ' +
            'специализацию. Только сконцентрировавшись на узком направлении можно достичь значимых результатов ' +
            'и высокой цели, какой бы она не была.</br>' +
            'Класс ' + class_name + ' имеет один навык-специализацию: ' + role_skill + '.</br>' +
            'При достижении классовой цели появляется возможность выбрать второй класс и второй навык-специализацию, ' +
            'получив тем самым суперкласс и новую цель. Чтобы освоить тонкости ролевого класса, нужно найти наставника.</br>' +
            'Для класса ' + class_name + ' искать наставника стоит в лице ' + teacher + '.';
        jq_main_div.append(
            '<div class="notes-visit-trainer-img"></div>' +
            '<div class="notes-visit-trainer-text">' + text + '</div>'
        );
    };

    QuestNoteVisitTrainer.prototype.set_buttons = function(){
        locationManager.setBtnState(1, "", false);
        locationManager.setBtnState(2, "", false);
    };

    QuestNoteVisitTrainer.prototype.activate = function() {
        clientManager.SendQuestNoteAction(this.uid, true);
    };

    return QuestNoteVisitTrainer;
})(QuestNoteNPCTypeBtn);
