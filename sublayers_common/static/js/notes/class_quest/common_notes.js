var QuestNoteNPCBtnClassCar = (function (_super) {
    __extends(QuestNoteNPCBtnClassCar, _super);

    function QuestNoteNPCBtnClassCar(options) {
        _super.call(this, options);
    }

    // функция перерисовки текущей ноты - просто перерисовка внутренностей в здании
    QuestNoteNPCBtnClassCar.prototype.redraw = function() {
        this.clear();
        if (!this.jq_main_div || !this.jq_menu_div || !this.build) return;
        if (this.quest_uid == null) return;
        var quest = journalManager.quests.getQuest(this.quest_uid);
        if (! quest) {
            console.warn('quest not found:', this.quest_uid);
            return;
        }

        var jq_up_path = $(
            '<div class="note-class-img class-car-note"></div>' +
            '<div class="note-class-text class-car-note">' +
            _("q_cq_get_car_note_1") +
            _(user.example_agent.role_class) +
            _("q_cq_get_car_note_2") +
            '</div>'
        );
        this.jq_main_div.append(jq_up_path);
    };

    return QuestNoteNPCBtnClassCar;
})(QuestNoteNPCBtn);


var QuestNoteNPCBtnCarMaxLevel = (function (_super) {
    __extends(QuestNoteNPCBtnCarMaxLevel, _super);

    function QuestNoteNPCBtnCarMaxLevel(options) {
        _super.call(this, options);
    }

    // функция перерисовки текущей ноты - просто перерисовка внутренностей в здании
    QuestNoteNPCBtnCarMaxLevel.prototype.redraw = function() {
        this.clear();
        if (!this.jq_main_div || !this.jq_menu_div || !this.build) return;
        if (this.quest_uid == null) return;
        var quest = journalManager.quests.getQuest(this.quest_uid);
        if (! quest) {
            console.warn('quest not found:', this.quest_uid);
            return;
        }

        var jq_up_path = $(
            '<div class="note-class-img car-max-lvl-note"></div>' +
            '<div class="note-class-text car-max-lvl-note">' + _("q_cq_get_car_lvl_note") + '</div>'
        );
        this.jq_main_div.append(jq_up_path);
    };

    return QuestNoteNPCBtnCarMaxLevel;
})(QuestNoteNPCBtn);


var AccumulateNucoinsQuestNote = (function (_super) {
    __extends(AccumulateNucoinsQuestNote, _super);

    function AccumulateNucoinsQuestNote(options) {
        _super.call(this, options);
    }

    // функция перерисовки текущей ноты - просто перерисовка внутренностей в здании
    AccumulateNucoinsQuestNote.prototype.redraw = function() {
        this.clear();
        if (!this.jq_main_div || !this.jq_menu_div || !this.build) return;
        if (this.quest_uid == null) return;
        var quest = journalManager.quests.getQuest(this.quest_uid);
        if (! quest) {
            console.warn('quest not found:', this.quest_uid);
            return;
        }

        var jq_up_path = $(
            '<div class="note-class-img accum-nucoins"></div>' +
            '<div class="note-class-text accum-nucoins">AccumulateNucoinsQuestNote</div>'
        );
        this.jq_main_div.append(jq_up_path);
    };

    return AccumulateNucoinsQuestNote;
})(QuestNoteNPCBtn);


var KillsClassQuestNote = (function (_super) {
    __extends(KillsClassQuestNote, _super);

    function KillsClassQuestNote(options) {
        _super.call(this, options);
    }

    // функция перерисовки текущей ноты - просто перерисовка внутренностей в здании
    KillsClassQuestNote.prototype.redraw = function() {
        this.clear();
        if (!this.jq_main_div || !this.jq_menu_div || !this.build) return;
        if (this.quest_uid == null) return;
        var quest = journalManager.quests.getQuest(this.quest_uid);
        if (! quest) {
            console.warn('quest not found:', this.quest_uid);
            return;
        }

        var jq_up_path = $(
            '<div class="note-class-img killer-class-quest"></div>' +
            '<div class="note-class-text killer-class-quest">KillsClassQuestNote</div>'
        );
        this.jq_main_div.append(jq_up_path);
    };

    return KillsClassQuestNote;
})(QuestNoteNPCBtn);


var GetPartyExpQuestNote = (function (_super) {
    __extends(GetPartyExpQuestNote, _super);

    function GetPartyExpQuestNote(options) {
        _super.call(this, options);
    }

    // функция перерисовки текущей ноты - просто перерисовка внутренностей в здании
    GetPartyExpQuestNote.prototype.redraw = function() {
        this.clear();
        if (!this.jq_main_div || !this.jq_menu_div || !this.build) return;
        if (this.quest_uid == null) return;
        var quest = journalManager.quests.getQuest(this.quest_uid);
        if (! quest) {
            console.warn('quest not found:', this.quest_uid);
            return;
        }

        var jq_up_path = $(
            '<div class="note-class-img get-party-exp"></div>' +
            '<div class="note-class-text get-party-exp">GetPartyExpQuestNote</div>'
        );
        this.jq_main_div.append(jq_up_path);
    };

    return GetPartyExpQuestNote;
})(QuestNoteNPCBtn);


var SetMechanicItemsQuestNote = (function (_super) {
    __extends(SetMechanicItemsQuestNote, _super);

    function SetMechanicItemsQuestNote(options) {
        _super.call(this, options);
    }

    // функция перерисовки текущей ноты - просто перерисовка внутренностей в здании
    SetMechanicItemsQuestNote.prototype.redraw = function() {
        this.clear();
        if (!this.jq_main_div || !this.jq_menu_div || !this.build) return;
        if (this.quest_uid == null) return;
        var quest = journalManager.quests.getQuest(this.quest_uid);
        if (! quest) {
            console.warn('quest not found:', this.quest_uid);
            return;
        }

        var jq_up_path = $(
            '<div class="note-class-img set-mechanic-items"></div>' +
            '<div class="note-class-text set-mechanic-items">SetMechanicItemsQuestNote</div>'
        );
        this.jq_main_div.append(jq_up_path);
    };

    return SetMechanicItemsQuestNote;
})(QuestNoteNPCBtn);


var InvisibleAttackQuestNote = (function (_super) {
    __extends(InvisibleAttackQuestNote, _super);

    function InvisibleAttackQuestNote(options) {
        _super.call(this, options);
    }

    // функция перерисовки текущей ноты - просто перерисовка внутренностей в здании
    InvisibleAttackQuestNote.prototype.redraw = function() {
        this.clear();
        if (!this.jq_main_div || !this.jq_menu_div || !this.build) return;
        if (this.quest_uid == null) return;
        var quest = journalManager.quests.getQuest(this.quest_uid);
        if (! quest) {
            console.warn('quest not found:', this.quest_uid);
            return;
        }

        var jq_up_path = $(
            '<div class="note-class-img invisible-attack"></div>' +
            '<div class="note-class-text invisible-attack">InvisibleAttackQuestNote</div>'
        );
        this.jq_main_div.append(jq_up_path);
    };

    return InvisibleAttackQuestNote;
})(QuestNoteNPCBtn);


var VisitTownsQuestNote = (function (_super) {
    __extends(VisitTownsQuestNote, _super);

    function VisitTownsQuestNote(options) {
        _super.call(this, options);
    }

    // функция перерисовки текущей ноты - просто перерисовка внутренностей в здании
    VisitTownsQuestNote.prototype.redraw = function() {
        this.clear();
        if (!this.jq_main_div || !this.jq_menu_div || !this.build) return;
        if (this.quest_uid == null) return;
        var quest = journalManager.quests.getQuest(this.quest_uid);
        if (! quest) {
            console.warn('quest not found:', this.quest_uid);
            return;
        }

        var jq_up_path = $(
            '<div class="note-class-img visit-towns-class-quest"></div>' +
            '<div class="note-class-text visit-towns-class-quest">VisitTownsQuestNote</div>'
        );
        this.jq_main_div.append(jq_up_path);
    };

    return VisitTownsQuestNote;
})(QuestNoteNPCBtn);


var QuestNoteMaskingNPC = (function (_super) {
    __extends(QuestNoteMaskingNPC, _super);

    function QuestNoteMaskingNPC(options) {
        _super.call(this, options);
    }

    QuestNoteMaskingNPC.prototype.redraw = function() {
        this.clear();
        if (!this.jq_main_div || !this.jq_menu_div || !this.build) return;
        if (this.quest_uid == null) return;
        var quest = journalManager.quests.getQuest(this.quest_uid);
        if (! quest) {
            console.warn('quest not found:', this.quest_uid);
            return;
        }

        var jq_up_path = $(
            '<div class="note-class-img masking-class-quest"></div>' +
            '<div class="note-class-text masking-class-quest">' + _("q_cq_masking_npc_note_text") + '</div>'
        );
        this.jq_main_div.append(jq_up_path);
    };

    return QuestNoteMaskingNPC;
})(QuestNoteNPCBtn);







