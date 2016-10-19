var QuestNoteNPCCar = (function (_super) {
    __extends(QuestNoteNPCCar, _super);

    function QuestNoteNPCCar(options) {
        _super.call(this, options);
    }

    QuestNoteNPCCar.prototype.redraw = function() {
        _super.prototype.redraw.call(this);
        var jq_up_path = this.jq_main_div.find('.notes-npc-delivery-up').first();
        jq_up_path.empty();
        jq_up_path.append(user.templates.html_car_img);
    };

    QuestNoteNPCCar.prototype.set_buttons = function(){
        locationManager.setBtnState(1, '</br> Сдать', this.availability_test);
        locationManager.setBtnState(2, '', false);
    };

    return QuestNoteNPCCar;
})(QuestNoteNPCBtnDelivery);
