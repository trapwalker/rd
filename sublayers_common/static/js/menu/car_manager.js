var CarManager = (function () {

    function CarManager() {
        this.is_active = false;
        this.jq_main_div = $();
    }

    CarManager.prototype.get_info = function () {
        this.is_active = true;
        clientManager.sendGetAboutSelf();
    };

    CarManager.prototype.open_window = function () {
        this.is_active = false;
        windowTemplateManager.openUniqueWindow('car_info', '/menu_car', null, this.redraw);
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
            jq_car_block_pic.append('<div class="car-window-name">' + user.example_car.title + '</div>');
            jq_car_block_table.append(user.templates['html_car_table']);
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
