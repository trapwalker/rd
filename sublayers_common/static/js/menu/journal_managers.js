var JournalManager = (function () {

    function JournalManager() {
        this.jq_main_div = $();

        this.parking = new ParkingJournalManager();
        this.quests = new QuestJournalManager();
    }

    JournalManager.prototype.redraw = function(jq_main_div) {
        //console.log("JournalManager.prototype.redraw");
        var self = journalManager;
        if (jq_main_div.find('.journal-page-button-block').length == 0) return;
        if (jq_main_div)
            self.jq_main_div = $(jq_main_div).first();

        self.jq_main_div.find('.journal-page-button-block').click(function() {
            journalManager.jq_main_div.find('.journal-page-button-block').removeClass('active');
            $(this).addClass('active');
            journalManager.jq_main_div.find('.journal-page-block').css('display', 'none');
            journalManager.jq_main_div.find('.' + $(this).data('page_class')).css('display', 'block');

            // Обновление менеджера обучения
            teachingManager.redraw();
        });
        self.jq_main_div.find('.journal-page-button-block')[0].click();

        self.parking.redraw();
        self.quests.redraw();
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

        var jq_parking_main = journalManager.jq_main_div.find('.journal_page_parking');
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
                        '<div class="journal-parking-menu-city-car" data-car_id="' + car_info.car.uid + '">' +
                            car_info.car.title +
                        '</div>');
                    var jq_car_info_block = $('<div class="journal-page-parking-car-info-block" data-car_id="' + car_info.car.uid + '"></div>');
                    jq_car_info_block.append(car_info.armorer_css);
                    var jq_car_img_block = $('<div class="journal-page-parking-picture town-interlacing">' + car_info.html_car_img +'</div>' +
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
            var jq_parking_main = journalManager.jq_main_div.find('.journal_page_parking');

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
            console.log('town');
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
        var jq_parking_main = journalManager.jq_main_div.find('.journal_page_parking');
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

        this.active_count = 0;
        this.completed_count = 0;
        this.failed_count = 0;

        this.jq_quest_info_list = null;
        this.jq_active_group = null;
        this.jq_completed_group = null;
        this.jq_failed_group = null;

        // Выбранный (Выделенный) сейчас квест
        this._selected_quest = null;

        // Таймер отрисовки изменений выбранного квеста (например dead-line и тд)
        this._refresh_timer = null;
    }

    QuestJournalManager.prototype.getCountQuestsByNPC = function(npc_node_hash) {
        var result = { available_count: 0, active_count: 0 };
        for (var key in this.quests)
            if (this.quests.hasOwnProperty(key) && this.quests[key].hirer && (this.quests[key].hirer.node_hash == npc_node_hash)) {
                if (!this.quests[key].status) result.available_count++;
                if (this.quests[key].status == 'active') result.active_count++;
            }
        return result;
    };

    QuestJournalManager.prototype.addQuest = function(quest) {
        //console.log('QuestManager.prototype.addQuest', quest);
        if (!this.quests.hasOwnProperty(quest.uid)) {
            this.quests[quest.uid] = quest;
            this.redraw_quest(quest.uid);
            this.update_view_notes(quest);
        }
        else
            this.update(quest);
    };

    QuestJournalManager.prototype.delQuest = function(quest_id) {
        if (this.quests.hasOwnProperty(quest_id)) {
            var quest = this.quests[quest_id];
            this.clear_quest(quest.uid);
            delete this.quests[quest_id];
        }
        else
            console.error('Попытка удаления отсутствующего квеста.');
    };

    QuestJournalManager.prototype.getQuest = function(quest_uid) {
        //console.log('QuestManager.prototype.getQuest', quest);
        if (quest_uid && this.quests.hasOwnProperty(quest_uid))
            return this.quests[quest_uid];
        console.error('Квест с данным uid не найден:', quest_uid);
        return null;
    };

    QuestJournalManager.prototype.update = function(quest) {
        //console.log('QuestJournalManager.prototype.update', quests);
        if (!this.quests.hasOwnProperty(quest.uid)) {
            console.error('Апдейт несуществущего квеста.');
            return;
        }
        var is_view_quest_in_journal = this.quests[quest.uid].jq_journal_menu && this.quests[quest.uid].jq_journal_menu.hasClass("active");
        this.clear_quest(quest.uid);
        this.quests[quest.uid] = quest;
        this.redraw_quest(quest.uid);

        // включить или отключить ноты, связанные с этим квестом
        this.update_view_notes(quest);

        if (is_view_quest_in_journal)
            quest.jq_journal_menu.click();

        if (locationManager.in_location_flag)
            if (locationManager.screens[locationManager.active_screen_name])
                locationManager.screens[locationManager.active_screen_name].set_panels();
            else
                locationManager.set_panels_location_screen();
    };

    QuestJournalManager.prototype.update_view_notes = function (quest) {
        //console.log("QuestJournalManager.prototype.update_view_notes", quest);
        var active = quest.active_notes_view;
        for (var key in notesManager.notes)
            if (notesManager.notes.hasOwnProperty(key) && notesManager.notes[key].quest_uid == quest.uid)
                if (notesManager.notes[key] instanceof QuestMapMarkerNote)
                    notesManager.notes[key].is_active = active;
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

    QuestJournalManager.prototype._create_menu_quest = function(quest, quest_id) {
        return $('<div class="journal-quest-menu-quest"' + ' data-quest_id="' + quest_id + '">' +
            '<img src="' + quest.list_icon + '" class="journal-quest-menu-quest-img">' + quest.caption + '</div>');
    };

    QuestJournalManager.prototype._create_quest_info_block = function(quest) {
        //console.log('QuestJournalManager.prototype._create_quest_info_block', quest.uid);
        var hirer_photo = quest.hirer ?  quest.hirer.photo : '';
        var hirer_name = quest.hirer ?  quest.hirer.title : '';

        // Время старта квеста, плюс 100 лет
        var start_quest_date = new Date(quest.starttime * 1000);
        start_quest_date.setFullYear(start_quest_date.getFullYear() + 100);
        var start_quest_date_s = start_quest_date.toLocaleString('ru');

        var jq_quest_info_block = $(
            '<div class="journal-quest-info-block" data-quest_id="' + quest.uid + '">' +
                '<div class="journal-quest-info-block-main-block">' +
                    '<div class="journal-quest-info-block-main-npc-photo" style="background-image: url(' + hirer_photo + ')">' +
                        '<div class="npc-name-div"><span class="npc-name">' + hirer_name + '</span></div>' +
                    '</div>' +
                    '<div class="journal-quest-info-block-main-description-block">' +
                        '<div class="journal-quest-info-block-main-description-start-date">' + start_quest_date_s + '</div>' +
                        '<div class="journal-quest-info-block-main-description">Описание:<br>' + quest.text + '</div>' +
                        '<div class="journal-quest-info-block-main-description-end-date">Осталось времени: <span>00:00:00</span></div>' +
                    '</div>' +
                    (quest.status == "active" ?
                        '<div class="journal-quest-info-block-main-active-view-block' + (quest.active_notes_view ? " select" : " unselect") + '" ' +
                            'onclick="journalManager.quests.click_handler_change_active_view(`' + quest.uid + '`)">' +
                            'Отображать маркера' +
                        '</div>'
                    : "" ) +
                '</div>' +
                '<div class="journal-quest-info-block-log-block">' +
                    '<div class="journal-quest-info-block-log-caption">События:</div>' +
                '</div>' +
            '</div>'
        );

        var jq_log_list = jq_quest_info_block.find('.journal-quest-info-block-log-block').first();
        for (var i = 0; i < quest.history.length; i++) {
            var rec = quest.history[i];
            var log_time_str = new Date(rec.time).toLocaleTimeString('ru');
            jq_log_list.append(
                '<div class="journal-quest-info-block-log-list-item">' +
                    '<span class="journal-quest-info-block-log-list-item-span">' + log_time_str + '</span>: ' + rec.text +
                '</div>'
            );
        }

        return jq_quest_info_block;
    };

    QuestJournalManager.prototype.on_refresh_selected = function () {
        if (! this._selected_quest) return;
        if (this._selected_quest.status != "active") return; // Обновляются только активные квесты
        var quest = this._selected_quest;
        var lost_time_str = '';
        if (quest.deadline) {
            var start_time = quest.starttime;
            var finish_time = start_time + quest.deadline;
            var lost_time = finish_time - clock.getCurrentTime();
            if (lost_time < 0) lost_time = 0;
            lost_time_str = toHHMMSS(lost_time * 1000);
        }
        else {
            lost_time_str = '-:-';
        }

        this._selected_quest.jq_journal_info.find(".journal-quest-info-block-main-description-end-date").find('span').text(lost_time_str);
    };

    QuestJournalManager.prototype._create_building_quest_block = function(quest) {
        var deadline_str = toHHMMSS(quest.deadline * 1000);
        if (quest.start_quest_time) {
            // info: возможно будет плохо работать с другими часовыми поясами
            var d = new Date(new Date((quest.start_quest_time + clock.getDt()) * 1000).setSeconds(0, 0));
            deadline_str = 'Отправление: ' + d.toLocaleTimeString();
        }

        var jq_quest_block = $(
            '<div class="building-quest-list-item" data-quest_uid="' + quest.uid + '">' +
                '<div class="building-quest-list-item-caption">' +
                    '<img src="' + quest.list_icon + '" class="building-quest-list-item-img">' + quest.caption + '</br>Уровень: ' + quest.level +
                '</div>' +
                '<div class="building-quest-list-item-description">' + quest.text_short + '</div>' +
                '<div class="building-quest-list-item-time">' + deadline_str + '</div>' +
            '</div>');
        return jq_quest_block;
    };

    QuestJournalManager.prototype.clear_quest  = function(quest_id) {
        var quest = this.quests[quest_id];

        if (quest.node_hash == 'reg:///registry/quests/teaching')
            return;

        if (quest.hasOwnProperty('jq_npc_block'))
            quest.jq_npc_block.remove();
        if (quest.hasOwnProperty('jq_journal_menu'))
            quest.jq_journal_menu.remove();
        if (quest.hasOwnProperty('jq_journal_info'))
            quest.jq_journal_info.remove();

        // Установить счетчики
        if (this.jq_active_group && this.jq_completed_group && this.jq_failed_group) {
            if (quest.status == 'active') this.active_count--;
            if ((quest.status == 'end') && (quest.result == 'win')) this.completed_count--;
            if ((quest.status == 'end') && (quest.result == 'failed')) this.failed_count--;

            this.jq_active_group.find('.journal-menu-counter').first().text(this.active_count);
            this.jq_completed_group.find('.journal-menu-counter').first().text(this.completed_count);
            this.jq_failed_group.find('.journal-menu-counter').first().text(this.failed_count);
        }

        if (this._selected_quest == quest) this._selected_quest = null;

        // Подправить скролл
        var build = locationManager.get_building_by_node_hash(quest.hirer.node_hash);
        if (build) {
            var jq_build_quest_list = null;
            if (quest.status == null)
                jq_build_quest_list = build.jq_main_div.find('#buildingPageAvailableTasks_' + build.building_rec.name).find('.building-quest-list').first();
            if (quest.status == 'active')
                jq_build_quest_list = build.jq_main_div.find('#buildingPageActiveTasks_' + build.building_rec.name).find('.building-quest-list').first();
            if (jq_build_quest_list)
                build.resizeInventory(jq_build_quest_list);
        }

    };

    QuestJournalManager.prototype.redraw_quest = function(quest_id) {
        //console.log('QuestJournalManager.prototype.redraw_quest', quest_id);
        var quest = this.quests[quest_id];

        // Отрисовываем квесты у NPC
        if (locationManager.in_location_flag && quest.hirer) {
            var build = locationManager.get_building_by_node_hash(quest.hirer.node_hash);
            if (build) {
                var jq_build_quest_list = null;
                if (quest.status == null)
                    jq_build_quest_list = build.jq_main_div.find('#buildingPageAvailableTasks_' + build.building_rec.name).find('.building-quest-list').first();
                if (quest.status ==  'active')
                    jq_build_quest_list = build.jq_main_div.find('#buildingPageActiveTasks_' + build.building_rec.name).find('.building-quest-list').first();
                if (jq_build_quest_list) {
                    quest.jq_npc_block = this._create_building_quest_block(quest);
                    jq_build_quest_list.append(quest.jq_npc_block);
                    quest.jq_npc_block.click({quest_id: quest.uid, build: build}, function(event) {
                        event.data.build.set_selected_quest(event.data.quest_id);
                    });

                    build.resizeInventory(jq_build_quest_list);
                }
            }
        }

        if (quest.node_hash == 'reg:///registry/quests/teaching')
            return;

        // Вывод квеста в журнал (квесты NPC в журнал не выводяться)
        if ((['active', 'end'].indexOf(quest.status) >= 0) && (['win', 'fail', null].indexOf(quest.result) >= 0)) {
            // Определяем статус квеста
            var jq_current_group = null;
            switch (quest.status) {
                case 'active':
                    jq_current_group = this.jq_active_group;
                    this.active_count++;
                    break;
                case 'end':
                    switch (quest.result) {
                        case 'win':
                            jq_current_group = this.jq_completed_group;
                            this.completed_count++;
                            break;
                        case 'fail':
                            jq_current_group = this.jq_failed_group;
                            this.failed_count++;
                    }
            }
            if (jq_current_group) {
                // Добавляем квест в меню
                quest.jq_journal_menu = this._create_menu_quest(quest, quest_id);
                jq_current_group.find('.journal-menu-list').first().append(quest.jq_journal_menu);

                // Добавляем инфоблок квеста
                quest.jq_journal_info = this._create_quest_info_block(quest);
                this.jq_quest_info_list.append(quest.jq_journal_info);

                // Вешаем клики на отдельные квесты
                quest.jq_journal_menu.click(function () {
                    var quest_id = $(this).data('quest_id');
                    var jq_quest_page = journalManager.jq_main_div.find('.journal_page_task');
                    jq_quest_page.find('.journal-quest-menu-quest').removeClass('active');
                    $(this).addClass('active');
                    jq_quest_page.find('.journal-quest-info-block').removeClass('active');
                    jq_quest_page.find('.journal-quest-info-block').each(function (index, element) {
                        var jq_elem = $(element);
                        if (quest_id == jq_elem.data('quest_id'))
                            jq_elem.addClass('active');
                    });

                    // Сделать этот квест как выбранный (Selected)
                    journalManager.quests._selected_quest = journalManager.quests.getQuest(quest_id);
                    journalManager.quests.on_refresh_selected();

                    // Вызвать обновление teachingManager
                    teachingManager.redraw();
                });

                // Установить счетчики
                this.jq_active_group.find('.journal-menu-counter').first().text(this.active_count);
                this.jq_completed_group.find('.journal-menu-counter').first().text(this.completed_count);
                this.jq_failed_group.find('.journal-menu-counter').first().text(this.failed_count);
            }
        }
    };

    QuestJournalManager.prototype.redraw = function() {
        //console.log('QuestJournalManager.prototype.redraw');

        // Очищаем журнал квестов
        var jq_quest_main = journalManager.jq_main_div.find('.journal_page_task');
        var jq_quest_list = jq_quest_main.find('.journal-page-left').first();
        this.jq_quest_info_list = jq_quest_main.find('.journal-page-right').first();

        this.jq_quest_info_list.empty();
        jq_quest_list.empty();

        // Удаление квестов
        for (var key in this.quests)
            if (this.quests.hasOwnProperty(key))
                this.clear_quest(key);

        // Выбранный сейчас квест и ссылка на него
        this._selected_quest = null;
        // Запустить таймер, если ещё не запущен
        if (!this._refresh_timer) this._refresh_timer = setInterval(function(){journalManager.quests.on_refresh_selected()}, 1000);


        // Добавляем "Активные" "Выполненные" "Проваленные"
        this.active_count = 0;
        this.completed_count = 0;
        this.failed_count = 0;

        this.jq_active_group = this._create_status_group('Активные');
        this.jq_completed_group = this._create_status_group('Выполненные');
        this.jq_failed_group= this._create_status_group('Проваленные');
        jq_quest_list.append(this.jq_active_group);
        jq_quest_list.append(this.jq_completed_group);
        jq_quest_list.append(this.jq_failed_group);

        // Добавление квестов
        for (var key in this.quests)
            if (this.quests.hasOwnProperty(key))
                this.redraw_quest(key);

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

            // Вызвать обновление teachingManager
            teachingManager.redraw();
        });
    };

    QuestJournalManager.prototype.clear = function() {
        //console.log('QuestJournalManager.prototype.clear');
        this.active_count = 0;
        this.complete_count = 0;
        this.failed_count = 0;

        for (var key in this.quests)
            if (this.quests.hasOwnProperty(key))
                this.delQuest(key);

        if (this._refresh_timer) {
            clearInterval(this._refresh_timer);
            this._refresh_timer = null;
        }
    };

    QuestJournalManager.prototype.click_handler_change_active_view = function(quest_uid) {
        var quest = this.getQuest(quest_uid);
        if (!quest) return;
        clientManager.sendQuestActiveNotesView(quest.uid, !quest.active_notes_view);
        returnFocusToMap();
    };

    return QuestJournalManager;
})();


var journalManager = new JournalManager();