var SimpleNote = (function () {
    function SimpleNote(options) {
        this.is_active = false;
        this.uid = options.uid;
        this.quest_uid = options.quest_uid;

        notesManager.add(this);
    }

    SimpleNote.prototype.active = function() {
        this.is_active = true;
    };

    SimpleNote.prototype.unactive = function() {
        this.is_active = false;
    };

    SimpleNote.prototype.action = function(res) {
        if (res == undefined) res = 0;
        clientManager.SendQuestNoteAction(this.id, res);
    };

    SimpleNote.prototype.delete = function(res) {
        notesManager.del(this);
    };

    return SimpleNote;
})();


var QuestNoteNPCBtn = (function (_super) {
    __extends(QuestNoteNPCBtn, _super);

    function QuestNoteNPCBtn(options) {
        _super.call(this, options);
        this.npc_html_hash = options.npc.html_hash;
        this.page_caption = options.page_caption;

        this.btn1_caption = options.btn1_caption;
        //this.btn2_caption = options.btn2_caption;

        this.jq_main_div = null;  // Вёрстка в здании
        this.jq_menu_div = null;  // Вёрстка в меню (по сути кнопка-плашка)\
        this.build = null;

        // Попытка автоматически сбиндить ноту со зданием
        if (locationManager.in_location_flag){
            var build = locationManager.get_building_by_field('html_hash', this.npc_html_hash);
            if (build)
                this.bind_with_build(build);
        }
    }

    // вызываются тольо когда нота пришла когда клиент уже был в городе
    QuestNoteNPCBtn.prototype.bind_with_build = function (build) {
        this.set_div(
            build,
            build.jq_main_div.find('.building-center-menu-block-wrap').first(),
            build.jq_main_div.find('.building-center-pages-block').first()
        );
        this.jq_menu_div.click({build: build}, build.centralMenuBindReaction_handler);
        build.centralMenuScrollSet();
    };

    // автоматически вызывается
    QuestNoteNPCBtn.prototype.set_div = function(build, jq_build_menu, jq_build_center) {
        if (this.jq_main_div) this.jq_main_div.remove();
        if (this.jq_menu_div) this.jq_menu_div.remove();
        this.build = build;
        // Добавление плашки в здание
        var page_id = 'building_note_' + this.uid + '_' + build.building_rec.name;
        this.jq_menu_div = $('<div class="building-center-menu-item" data-page_id="' + page_id + '" data-note_uid="' +
            this.uid + '">' + this.page_caption + '</div>');
        jq_build_menu.append(this.jq_menu_div);
        this.jq_main_div = $('<div id="' + page_id + '" class="building-center-page" data-note_uid="' + this.uid + '">');
        jq_build_center.append(this.jq_main_div);

        this.redraw();
    };

    // функция перерисовки текущей ноты - просто перерисовка внутренностей в здании
    QuestNoteNPCBtn.prototype.redraw = function() {
        this.clear();
        if (! this.jq_main_div || ! this.jq_menu_div) return;
        this.jq_main_div.text('Notes for Build !!! gooooood text! go go go ! ole ole ole ! ' + clock.getClientTime());
    };

    QuestNoteNPCBtn.prototype.activate = function() {
        this.redraw();
    };

    QuestNoteNPCBtn.prototype.set_buttons = function(){
        locationManager.setBtnState(1, this.btn1_caption, true);
        locationManager.setBtnState(2, "", false);
    };

    QuestNoteNPCBtn.prototype.clickBtn = function (btnIndex) {
        //console.log('Click for note: ' + this.uid + '    =>>> ' + btnIndex);
        clientManager.SendQuestNoteAction(this.uid, true);
    };

    QuestNoteNPCBtn.prototype.clear = function() {
        if (this.jq_main_div)
            this.jq_main_div.empty();
    };

    QuestNoteNPCBtn.prototype.delete = function() {
        if (this.build && this.build.active_central_page == this.jq_menu_div.data('page_id')){
            this.build.jq_main_div.find('.building-center-menu-item').first().click();
            this.build.centralMenuScrollToTop();
            this.build.set_buttons();
            this.build.set_header_text();
        }
        if (this.jq_main_div) {this.jq_main_div.remove(); this.jq_main_div = null;}
        if (this.jq_menu_div) {this.jq_menu_div.remove(); this.jq_menu_div = null;}
        this.build.centralMenuScrollSet();  // Спрятать скролл, если вдруг он больше не нужен

        this.build = null;
        _super.prototype.delete.call(this);
    };

    return QuestNoteNPCBtn;
})(SimpleNote);


var NotesManager = (function () {
    function NotesManager(options) {
        this.notes = {};
    }

    NotesManager.prototype.get_note = function(note_uid) {
        if (this.notes.hasOwnProperty(note_uid))
            return this.notes[note_uid];
        return null;
    };

    NotesManager.prototype.add = function(note) {
        if (! this.notes.hasOwnProperty(note.uid))
            this.notes[note.uid] = note;
        else
            throw 'нота с таким uid уже существует ' + note.uid;
    };

    NotesManager.prototype.del = function(note) {
         if (this.notes.hasOwnProperty(note.uid))
             delete this.notes[note.uid];
    };

    NotesManager.prototype.get_notes_by_type = function(type) {
        var res = [];
        for(var key in this.notes)
            if (this.notes.hasOwnProperty(key) && this.notes[key] instanceof type)
                res.push(this.notes[key]);
        return res;
    };

    return NotesManager;
})();


var notesManager = new NotesManager();
