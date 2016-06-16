var JournalManager = (function () {

    function JournalManager() {
        this.in_location = false;

        this.parking = new ParkingJournalManager();
        this.quest = new QuestJournalManager();
    }

    JournalManager.prototype.redraw = function() {
        this.parking.redraw();
        this.quest.redraw();
    };

    return JournalManager;
})();


var ParkingJournalManager = (function () {

    function ParkingJournalManager() {
        this.town_cars = {};
    }

    ParkingJournalManager.prototype.update = function(car_list) {
        //console.log('ParkingJournalManager.prototype.update', car_list);

        // Сортируем машинки по городам
        if (car_list) {
            this.town_cars = {};
            for (var i = 0; i < car_list.length; i++)
                if (this.town_cars.hasOwnProperty(car_list[i].location_name))
                    this.town_cars[car_list[i].location_name].car_list.push(car_list[i].car_info);
                else
                    this.town_cars[car_list[i].location_name] = {
                        location_name: car_list[i].location_name,
                        location_node: car_list[i].location,
                        car_list: [car_list[i].car_info]
                    };
        }

        this.redraw();
    };

    ParkingJournalManager.prototype.redraw = function() {
        //console.log('ParkingJournalManager.prototype.redraw');

        this.clear();

        var jq_parking_main = $('#journal_page_parking');
        var jq_town_list = jq_parking_main.find('.journal-page-left').first();
        var jq_page_right = jq_parking_main.find('.journal-page-right').first();

        // Перерисовываем все что касается стоянки
        for (var key in this.town_cars)
            if (this.town_cars.hasOwnProperty(key)) {
                var town = this.town_cars[key];

                var jq_town_block = $(
                    '<div class="journal-menu-block">' +
                        '<div class="journal-menu-name-block">' +
                            '<div class="journal-menu-arrow"></div>' +
                            '<div class="journal-menu-name">' + town.location_name +'</div>' +
                        '</div>' +
                    '</div>');

                var jq_town_car_list = $('<div class="journal-menu-list"></div>');
                for (var k = 0; k < town.car_list.length; k++) {
                    var car_info = town.car_list[k];
                    jq_town_car_list.append(
                        '<div class="journal-parking-menu-city-car" data-car_id="' + car_info.car.id + '">' +
                            car_info.car.title +
                        '</div>');
                    var jq_car_info_block = $('<div class="journal-page-parking-car-info-block" data-car_id="' + car_info.car.id + '"></div>');
                    jq_car_info_block.append(car_info.armorer_css);
                    var jq_car_img_block = $('<div class="journal-page-parking-picture">' + car_info.html_car_img +'</div>' +
                        '<div class="journal-page-car-name">' + car_info.car.title + '</div>');
                    var jq_car_table_block = $('<div class="journal-page-parking-info">' + car_info.html_car_table +'</div>');
                    jq_car_info_block.append(jq_car_img_block);
                    jq_car_info_block.append(jq_car_table_block);
                    jq_page_right.append(jq_car_info_block);
                }
                jq_town_block.append(jq_town_car_list);
                jq_town_list.append(jq_town_block);
            }

        // Вешаем клики на названия машинок в городах
        jq_town_list.find('.journal-parking-menu-city-car').click(function () {
            var car_id = $(this).data('car_id');
            var jq_parking_main = $('#journal_page_parking');

            jq_parking_main.find('.journal-parking-menu-city-car').removeClass('active');
            $(this).addClass('active');

            var jq_page_right = jq_parking_main.find('.journal-page-right').first();
            jq_page_right.find('.journal-page-parking-car-info-block').each(function (index, element) {
                var jq_elem = $(element);
                if (car_id == jq_elem.data('car_id'))
                    jq_elem.css('display', 'block');
                else
                    jq_elem.css('display', 'none');
            });
        });

        // Вешаем клики на названия городов
        jq_town_list.find('.journal-menu-name-block').click(function () {
            var j_self = $(this);
            var j_list = j_self.parent().find('.journal-menu-list').first();
            var j_arrow = j_self.find('.journal-menu-arrow').first();
            if (j_self.hasClass('active')) {
                j_self.removeClass('active');
                j_list.removeClass('active');
                j_arrow.removeClass('active');
            } else {
                j_self.addClass('active');
                j_list.addClass('active');
                j_arrow.addClass('active');
            }
        });

        // Открываем первый город и первую машинку
        jq_town_list.find('.journal-parking-menu-city-name-block').first().click();
        jq_town_list.find('.journal-parking-menu-city-car').first().click();
    };

    ParkingJournalManager.prototype.clear = function() {
        //console.log('ParkingJournalManager.prototype.clear');
        var jq_parking_main = $('#journal_page_parking');
        var jq_town_list = jq_parking_main.find('.journal-page-left').first();
        var jq_page_right = jq_parking_main.find('.journal-page-right').first();
        jq_town_list.empty();
        jq_page_right.empty();
    };

    return ParkingJournalManager;
})();


var QuestJournalManager = (function () {

    function QuestJournalManager() {
        this.quests = {};
    }

    QuestJournalManager.prototype.update = function(quest) {
        //console.log('QuestJournalManager.prototype.update', quests);
        /*
        quest.status
            null - не взят и находится у NPC
            'active' - в процесе выполнения
            'end' - квест завершен

        quest.result
            null - не окончен
            'win' - выполнен успешно
            'failed' - провален
        */

        quest.status = 'active';
        this.id_counter++;
        quest.town_id = 1111;
        quest.town = 'Белгород';

        this.quests[quest.id] = quest;
        this.redraw();
    };

    QuestJournalManager.prototype._create_status_group = function(status_name) {
        return $(
            '<div class="journal-menu-block">' +
                '<div class="journal-menu-name-block">' +
                    '<div class="journal-menu-arrow"></div>' +
                    '<div class="journal-menu-name">' + status_name + '</div>' +
                    '<div class="journal-menu-counter">0</div>' +
                '</div>' +
                '<div class="journal-menu-list"></div>' +
            '</div>');
    };

    QuestJournalManager.prototype._create_town_group = function(town_name, town_id) {
        return $(
            '<div class="journal-quest-menu-town-' + town_id + ' journal-menu-block">' +
                '<div class="journal-menu-name-block">' +
                    '<div class="journal-menu-arrow"></div>' +
                    '<div class="journal-menu-name">' + town_name + '</div>' +
                '</div>' +
                '<div class="journal-menu-list"></div>' +
            '</div>');
    };

    QuestJournalManager.prototype._create_menu_quest = function(quest_name, quest_id) {
        return $('<div class="journal-quest-menu-quest"' + ' data-quest_id="' + quest_id + '">' + quest_name + '</div>');
    };

    QuestJournalManager.prototype._create_quest_info_block = function(quest) {
        var jq_quest_info_block = $(
            '<div class="journal-quest-info-block" data-quest_id="' + quest.id + '">' +
                '<div class="journal-quest-info-block-main-block">' +
                    '<div class="journal-quest-info-block-main-npc-photo"></div>' +
                    '<div class="journal-quest-info-block-main-description-block">' +
                        '<div class="journal-quest-info-block-main-description-start-date">00.00.0000; 00:00:00</div>' +
                        '<div class="journal-quest-info-block-main-description">Описание:<br>' + quest.text + '</div>' +
                        '<div class="journal-quest-info-block-main-description-end-date">Осталось времени: 00:00:00</div>' +
                    '</div>' +
                '</div>' +
                '<div class="journal-quest-info-block-log-block">События:</div>' +
            '</div>');
        return jq_quest_info_block;
    };

    QuestJournalManager.prototype.redraw = function() {
        //console.log('QuestJournalManager.prototype.redraw', this.quests);
        this.clear();

        var jq_quest_main = $('#journal_page_task');
        var jq_quest_list = jq_quest_main.find('.journal-page-left').first();
        var jq_quest_info_list = jq_quest_main.find('.journal-page-right').first();

        // Добавляем "Активные" "Выполненные" "Проваленные"
        var active_group_count = 0;
        var completed_group_count = 0;
        var failed_group_count = 0;
        var jq_active_group = this._create_status_group('Активные');
        var jq_completed_group = this._create_status_group('Выполненные');
        var jq_failed_group= this._create_status_group('Проваленные');
        jq_quest_list.append(jq_active_group);
        jq_quest_list.append(jq_completed_group);
        jq_quest_list.append(jq_failed_group);
        // Добавление квестов
        for (var key in this.quests)
            if (this.quests.hasOwnProperty(key)) {
                var quest = this.quests[key];

                // Квесты NPC в журнал не выводяться
                if (!quest.status) continue;

                // Определяем статус квеста
                var jq_current_group = null;
                switch (quest.status) {
                    case 'active':
                        jq_current_group = jq_active_group;
                        active_group_count++;
                        break;
                    case 'end':
                        switch (quest.result) {
                            case 'win':
                                jq_current_group = jq_completed_group;
                                completed_group_count++;
                                break;
                            case 'failed':
                                jq_current_group = jq_failed_group;
                                failed_group_count++;
                                break;
                            default:
                                console.warn('Неизвестный результат выполнения квеста!');
                                continue;
                        }
                        break;
                    default:
                        console.warn('Неизвестный статус квеста!');
                        continue;
                }

                // Проверяем, есть ли такой город и если нет, то добавляем его
                var jq_town_group = jq_current_group.find('.journal-quest-menu-town-' + quest.town_id);
                if (jq_town_group.length == 0) {
                    jq_town_group = this._create_town_group(quest.town, quest.town_id);
                    jq_current_group.find('.journal-menu-list').first().append(jq_town_group);
                }
                else jq_town_group = jq_town_group.first();

                // Добавляем квест в меню
                jq_town_group.find('.journal-menu-list').first().append(this._create_menu_quest(quest.caption, key));

                // Добавляем инфоблок квеста
                jq_quest_info_list.append(this._create_quest_info_block(quest));
            }

        // Установить счетчики
        jq_active_group.find('.journal-menu-counter').first().text(active_group_count);
        jq_completed_group.find('.journal-menu-counter').first().text(completed_group_count);
        jq_failed_group.find('.journal-menu-counter').first().text(failed_group_count);

        // Вешаем клики на отдельные квесты
        jq_quest_list.find('.journal-quest-menu-quest').click(function () {
            var quest_id = $(this).data('quest_id');
            var jq_quest_page = $('#journal_page_task');
            jq_quest_page.find('.journal-quest-menu-quest').removeClass('active');
            $(this).addClass('active');
            jq_quest_page.find('.journal-quest-info-block').removeClass('active');
            jq_quest_page.find('.journal-quest-info-block').each(function (index, element) {
                var jq_elem = $(element);
                if (quest_id == jq_elem.data('quest_id'))
                    jq_elem.addClass('active');
            });
        });

        // Вешаем клики на все группы (статусы и города)
        jq_quest_list.find('.journal-menu-name-block').click(function () {
            var j_self = $(this);
            var j_list = j_self.parent().find('.journal-menu-list').first();
            var j_arrow = j_self.find('.journal-menu-arrow').first();
            if (j_self.hasClass('active')) {
                j_self.removeClass('active');
                j_list.removeClass('active');
                j_arrow.removeClass('active');
            } else {
                j_self.addClass('active');
                j_list.addClass('active');
                j_arrow.addClass('active');
            }
        });
    };

    QuestJournalManager.prototype.clear = function() {
        //console.log('QuestJournalManager.prototype.clear');
        var jq_quest_main = $('#journal_page_task');
        var jq_quest_list = jq_quest_main.find('.journal-page-left').first();
        var jq_quest_info_list = jq_quest_main.find('.journal-page-right').first();
        jq_quest_list.empty();
        jq_quest_info_list.empty();
    };

    return QuestJournalManager;
})();


var journalManager = new JournalManager();

