


var QuestNote = (function () {

    function QuestNote(options) {
        this.is_active = false;
        this.id = options.id;
    }

    QuestNote.prototype.active = function() {
        this.is_active = true;
    };

    QuestNote.prototype.unactive = function() {
        this.is_active = false;
    };

    QuestNote.prototype.action = function(res) {
        if (res == undefined) res = 0;
        clientManager.SendQuestNoteAction(this.id, res);
    };

    return QuestNote;
})();


var QuestNoteNPCBtn = (function (_super) {
    __extends(QuestNoteNPCBtn, _super);

    function QuestNoteNPCBtn(options) {
        _super.call(this, options);
        this.is_active = false;
        this.npc_html_hash = options.npc_html_hash;
        this.btn_caption = options.btn_caption;
    }

    QuestNoteNPCBtn.prototype.active = function() {
        if (!locationManager.in_location_flag || !locationManager.event.npc_html_hash) return;
        this.is_active = true;
    };

    QuestNoteNPCBtn.prototype.unactive = function() {
        this.is_active = false;
    };

    return QuestNoteNPCBtn;
})(QuestNote);

var questNoteList = {
    'npc_btn': QuestNoteNPCBtn
};