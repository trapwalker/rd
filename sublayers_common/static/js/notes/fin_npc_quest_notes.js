var QuestNoteNPCBtnRadiation = (function (_super) {
    __extends(QuestNoteNPCBtnRadiation, _super);

    function QuestNoteNPCBtnRadiation(options) {
        _super.call(this, options);
    }

    QuestNoteNPCBtnRadiation.prototype.redraw = function() {
        this.clear();
        if (! this.jq_main_div || ! this.jq_menu_div) return;
        this.jq_main_div.css('background', 'url("static/img/quests/notes/radiation_note.png") no-repeat center');
    };

    return QuestNoteNPCBtnRadiation;
})(QuestNoteNPCBtn);


var MapActivationRadarsNoteFinish = (function (_super) {
    __extends(MapActivationRadarsNoteFinish, _super);

    function MapActivationRadarsNoteFinish(options) {
        _super.call(this, options);
    }

    MapActivationRadarsNoteFinish.prototype.redraw = function() {
        this.clear();
        if (! this.jq_main_div || ! this.jq_menu_div) return;
        this.jq_main_div.css('background', 'url("static/img/quests/notes/activate_radars_note.png") no-repeat center');
    };

    return MapActivationRadarsNoteFinish;
})(QuestNoteNPCBtn);
