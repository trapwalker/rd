var CarManager = (function () {

    function CarManager() {
        this.jq_main_div = $();
    }

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
    };

    return CarManager;
})();

var carManager = new CarManager();
