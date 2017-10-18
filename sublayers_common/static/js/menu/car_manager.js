var CarManager = (function () {

    function CarManager() {
        this.is_active = false;
        this.jq_main_div = $();
        this.timer_auto_save_car_name = null;
    }

    CarManager.prototype.get_info = function () {
        this.is_active = true;
        clientManager.sendGetAboutSelf();
    };

    CarManager.prototype.open_window = function () {
        this.is_active = false;
        windowTemplateManager.openUniqueWindow('car_info', '/menu_car', null, this.redraw,
            function () {carManager.update_car_name();});
    };

    CarManager.prototype.update_car_name = function () {
        var new_text = this.jq_main_div.find('.car-window-name input').first().val();
        if (user.example_car.name_car != new_text)
            clientManager.sendSetNameCar(new_text);
    };

    CarManager.prototype.redraw = function (jq_main_div) {
        //console.log('SelfInfoManager.prototype.redraw', $(jq_main_div));
        var self = carManager;
        if (jq_main_div)
            self.jq_main_div = $(jq_main_div).first();
        var jq_car_block_pic = self.jq_main_div.find('.car-window-picture').first();
        var jq_car_block_table = self.jq_main_div.find('.car-window-table').first();
        jq_car_block_pic.empty();
        jq_car_block_table.empty();
        if (user.example_car && user.templates.hasOwnProperty('html_car_img') && user.templates.hasOwnProperty('html_car_table')){
            jq_car_block_pic.append(user.templates['html_car_img']);
            jq_car_block_pic.append('<div class="car-window-name"><input class="party-page-create-name-input" ' +
                'type="text" maxlength="25" style="text-align: center; border: 0;" value="' + user.example_car.name_car + '"></div>');
            jq_car_block_table.append(user.templates['html_car_table']);

            carManager.timer_auto_save_car_name = null;
            carManager.jq_main_div.find('.car-window-name input').first().on('change keyup paste', function (event) {
                // Поставить таймер на 3 секунды, если он сработает, то сохранить значение
                if (carManager.timer_auto_save_car_name) {
                    clearTimeout(carManager.timer_auto_save_car_name);
                    carManager.timer_auto_save_car_name = null;
                }

                carManager.timer_auto_save_car_name = setTimeout(function () {
                    carManager.timer_auto_save_car_name = null;
                    carManager.update_car_name();
                }, 3000);
            });
        }

        var jq_dynamic_value = jq_main_div.find('.car_dynamic_value');
        if (jq_dynamic_value.length !== 0) {
            jq_dynamic_value = jq_dynamic_value.first();
            var car_way = jq_dynamic_value.find('.car_way').first().text();
            var car_frag = jq_dynamic_value.find('.car_frag').first().text();
            var car_lvl = jq_dynamic_value.find('.car_lvl').first().text();

            jq_main_div.find('.dynamic_car_way').html(car_way);
            jq_main_div.find('.dynamic_car_frag').html(car_frag);
            var jq_start_list = jq_main_div.find('.car-info-block-body-right-exp-icon');
            jq_start_list.removeClass('active');
            for (var i = 0; i < car_lvl; i++)
                $(jq_start_list[i]).addClass('active');
        }
    };

    return CarManager;
})();


function CarTableInfoMenuClick(target) {
    var jq_target = $(target);
    var jq_parent = jq_target.parent();
    var jq_grand_parent = jq_target.parent().parent();
    jq_parent.children().removeClass('active');
    jq_target.addClass('active');
    var page = jq_target.data('page');

    var bodys = jq_grand_parent.find('.car-info-block-body-right-list');
    bodys.removeClass('active');
    for (var  i = 0; i < bodys.length; i++){
        var jq_elem = $(bodys[i]);
        if (jq_elem.hasClass(page)){
            jq_elem.addClass('active');
        }
    }
}

function CarInfoBlockAmmoInfoView(description, title) {
    if (locationManager && locationManager.in_location_flag) {
        locationManager.panel_right.show({text: description, title: title}, 'description');
    }
}

function CarInfoBlockAmmoInfoHide(descripion) {
    if (locationManager && locationManager.in_location_flag) {
        locationManager.panel_right.show({text: '', title: ''}, 'description');
    }
}

var carManager = new CarManager();
