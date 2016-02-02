var JournalManager = (function () {

    function JournalManager() {
        this.in_location = false;

        this.parking = new ParkingJournalManager();
        this.quest = new QuestJournalManager();
    }

    return JournalManager;
})();


var ParkingJournalManager = (function () {

    function ParkingJournalManager() {
        this.town_cars = {};
    }

    ParkingJournalManager.prototype.update = function(car_list) {
        //console.log('ParkingJournalManager.prototype.update', car_list);

        // Очищаем верстку в журнале
        var jq_parking_main = $('#journal_page_parking');
        var jq_town_list = jq_parking_main.find('.journal-page-left').first();
        var jq_page_right = jq_parking_main.find('.journal-page-right').first();

        jq_town_list.empty();

        jq_page_right.empty();

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

        for (var key in this.town_cars)
            if (this.town_cars.hasOwnProperty(key)) {
                var town = this.town_cars[key];

                var jq_town_block = $('<div class="journal-parking-menu-city-block"></div>');
                jq_town_block.append(
                    '<div class="journal-parking-menu-city-name-block">' +
                        '<div class="journal-parking-menu-city-arrow"></div>' +
                        '<div class="journal-parking-menu-city-name">' + town.location_name +'</div>' +
                    '</div>'
                );

                var jq_town_car_list = $('<div class="journal-parking-menu-city-car-list"></div>');

                for (var k = 0; k < town.car_list.length; k++) {
                    var car_info = town.car_list[k];
                    jq_town_car_list.append('<div class="journal-parking-menu-city-car"' +
                    ' data-car_id="' + car_info.car.id + '">' + car_info.car.title + '</div>');

                    var jq_car_info_block = $('<div class="journal-page-parking-car-info-block" data-car_id="' + car_info.car.id + '"></div>');

                    jq_car_info_block.append(car_info.armorer_css);

                    var jq_car_img_block = $('<div class="journal-page-parking-picture">' + car_info.html_car_img +'</div>');
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
            console.log(car_id);
            var jq_parking_main = $('#journal_page_parking');

            jq_parking_main.find('.journal-parking-menu-city-car').removeClass('active');
            $(this).addClass('active');

            var jq_page_right = jq_parking_main.find('.journal-page-right').first();

            jq_page_right.find('.journal-page-parking-car-info-block').each(function (index, element) {
                var jq_elem = $(element);
                var elem_car_id = jq_elem.data('car_id');
                if (car_id == elem_car_id)
                    jq_elem.css('display', 'block');
                else
                    jq_elem.css('display', 'none');
            });
        });

        // Вешаем клики на названия городов
        jq_town_list.find('.journal-parking-menu-city-name-block').click(function () {
            var j_self = $(this);
            var j_list = j_self.parent().find('.journal-parking-menu-city-car-list').first();
            var j_arrow = j_self.find('.journal-parking-menu-city-arrow').first();
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
        //console.log('NucoilManager.prototype.clear');
    };

    return ParkingJournalManager;
})();


var QuestJournalManager = (function () {

    function QuestJournalManager() {
        this.quests = {};
    }

    QuestJournalManager.prototype.updateQuest = function(quest) {
        console.log('ParkingJournalManager.prototype.updateQuest', quest);
        if (this.quests.hasOwnProperty(quest.id))

        // Сортируем машинки по городам
        for (var i = 0; i < car_list.length; i++)
            if (this.town_cars.hasOwnProperty(car_list[i].location_name))
                this.town_cars[car_list[i].location_name].car_list.push(car_list[i].car_info);
            else
                this.town_cars[car_list[i].location_name] = {
                    location_name: car_list[i].location_name,
                    location_node: car_list[i].location,
                    car_list: [car_list[i].car_info]
                };

        this.redraw();
    };

    QuestJournalManager.prototype.redraw = function() {
        console.log('ParkingJournalManager.prototype.redraw');

        // Очищаем верстку в журнале
        var jq_quest_main = $('#journal_page_task');
        var jq_town_list = jq_quest_main.find('.journal-page-left').first();
        var jq_page_right = jq_quest_main.find('.journal-page-right').first();
        jq_town_list.empty();
        jq_page_right.empty();







        for (var key in this.town_cars)
            if (this.town_cars.hasOwnProperty(key)) {
                var town = this.town_cars[key];

                var jq_town_block = $('<div class="journal-parking-menu-city-block"></div>');
                jq_town_block.append(
                    '<div class="journal-parking-menu-city-name-block">' +
                        '<div class="journal-parking-menu-city-arrow"></div>' +
                        '<div class="journal-parking-menu-city-name">' + town.location_name +'</div>' +
                    '</div>'
                );

                var jq_town_car_list = $('<div class="journal-parking-menu-city-car-list"></div>');

                for (var k = 0; k < town.car_list.length; k++) {
                    var car_info = town.car_list[k];
                    jq_town_car_list.append('<div class="journal-parking-menu-city-car"' +
                    ' data-car_id="' + car_info.car.id + '">' + car_info.car.title + '</div>');

                    var jq_car_info_block = $('<div class="journal-page-parking-car-info-block" data-car_id="' + car_info.car.id + '"></div>');

                    jq_car_info_block.append(car_info.armorer_css);

                    var jq_car_img_block = $('<div class="journal-page-parking-picture">' + car_info.html_car_img +'</div>');
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
            console.log(car_id);
            var jq_parking_main = $('#journal_page_parking');

            jq_parking_main.find('.journal-parking-menu-city-car').removeClass('active');
            $(this).addClass('active');

            var jq_page_right = jq_parking_main.find('.journal-page-right').first();

            jq_page_right.find('.journal-page-parking-car-info-block').each(function (index, element) {
                var jq_elem = $(element);
                var elem_car_id = jq_elem.data('car_id');
                if (car_id == elem_car_id)
                    jq_elem.css('display', 'block');
                else
                    jq_elem.css('display', 'none');
            });
        });

        // Вешаем клики на названия городов
        jq_town_list.find('.journal-parking-menu-city-name-block').click(function () {
            var j_self = $(this);
            var j_list = j_self.parent().find('.journal-parking-menu-city-car-list').first();
            var j_arrow = j_self.find('.journal-parking-menu-city-arrow').first();
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

    QuestJournalManager.prototype.clear = function() {
        //console.log('QuestJournalManager.prototype.clear');
    };

    return QuestJournalManager;
})();


var journalManager = new JournalManager();

