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

        var starsCount = (user.example_car.car_rpg_info.lvl < 6) ? (1 + user.example_car.car_rpg_info.lvl*30) : 151;
        var jq_up_path = $(
            '<div class="note-class-img car-max-lvl-note"><div class="set-car-max-lvl-stars" style="width: ' + starsCount + 'px"></div></div>' +
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
            '<div class="note-class-text accum-nucoins">' +
                user.login + ',' +
                _("q_cq_journal_text") +
                _("q_cq_acc_summ_task_text") +
            '</div>'
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
            '<div class="note-class-text killer-class-quest">' +
                user.login + ',' +
                _("q_cq_journal_text") +
                _("q_cq_kills_task_text") +
            '</div>'
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
            '<div class="note-class-text get-party-exp">' +
                user.login + ',' +
                _("q_cq_journal_text") +
                _("q_cq_party_exp_task_text") +
            '</div>'
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
            '<div class="note-class-text set-mechanic-items">' +
                user.login + ',' +
                _("q_cq_journal_text") +
                _("q_cq_mech_items_task_text")+
            '</div>'
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
            '<div class="note-class-text invisible-attack">'+_("q_cq_inv_attack_task_text")+'</div>'
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
            '<div class="note-class-text visit-towns-class-quest">' +
                user.login + ',' +
                _("q_cq_journal_text") +
                _("q_cq_visit_towns_task_text") +
            '</div>'
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


var ShadowingQuestNote = (function (_super) {
    __extends(ShadowingQuestNote, _super);

    function ShadowingQuestNote(options) {
        _super.call(this, options);
    }

    // функция перерисовки текущей ноты - просто перерисовка внутренностей в здании
    ShadowingQuestNote.prototype.redraw = function() {
        this.clear();
        if (!this.jq_main_div || !this.jq_menu_div || !this.build) return;
        if (this.quest_uid == null) return;
        var quest = journalManager.quests.getQuest(this.quest_uid);
        if (! quest) {
            console.warn('quest not found:', this.quest_uid);
            return;
        }

        var jq_up_path = $(
            '<div class="note-class-img shadowing-class-quest"></div>' +
            '<div class="note-class-text shadowing-class-quest">' +
                user.login + ',' +
                _("q_cq_journal_text") +
                _("q_cq_shadowing_task_text") +
            '</div>'
        );
        this.jq_main_div.append(jq_up_path);
    };

    return ShadowingQuestNote;
})(QuestNoteNPCBtn);


var BarterSuccessQuestNote = (function (_super) {
    __extends(BarterSuccessQuestNote, _super);

    function BarterSuccessQuestNote(options) {
        _super.call(this, options);
    }

    // функция перерисовки текущей ноты - просто перерисовка внутренностей в здании
    BarterSuccessQuestNote.prototype.redraw = function() {
        this.clear();
        if (!this.jq_main_div || !this.jq_menu_div || !this.build) return;
        if (this.quest_uid == null) return;
        var quest = journalManager.quests.getQuest(this.quest_uid);
        if (! quest) {
            console.warn('quest not found:', this.quest_uid);
            return;
        }

        var jq_up_path = $(
            '<div class="note-class-img barter-success-class-quest"></div>' +
            '<div class="note-class-text barter-success-class-quest">'+_("q_cq_barters_task_text")+'</div>'
        );
        this.jq_main_div.append(jq_up_path);
    };

    return BarterSuccessQuestNote;
})(QuestNoteNPCBtn);


var DamageMapWeaponQuestNote = (function (_super) {
    __extends(DamageMapWeaponQuestNote, _super);

    function DamageMapWeaponQuestNote(options) {
        _super.call(this, options);
    }

    // функция перерисовки текущей ноты - просто перерисовка внутренностей в здании
    DamageMapWeaponQuestNote.prototype.redraw = function() {
        this.clear();
        if (!this.jq_main_div || !this.jq_menu_div || !this.build) return;
        if (this.quest_uid == null) return;
        var quest = journalManager.quests.getQuest(this.quest_uid);
        if (! quest) {
            console.warn('quest not found:', this.quest_uid);
            return;
        }
        var text = _("q_cq_dmg_map_weapon_task_text").replace(/{{role_class_name}}/g, _(user.example_agent.role_class));
        var jq_up_path = $(
            '<div class="note-class-img damage-map-weapon-class-quest"></div>' +
            '<div class="note-class-text damage-map-weapon-class-quest">' + text + '</div>'
        );
        this.jq_main_div.append(jq_up_path);
    };

    return DamageMapWeaponQuestNote;
})(QuestNoteNPCBtn);


var PartyMembersQuestNote = (function (_super) {
    __extends(PartyMembersQuestNote, _super);

    function PartyMembersQuestNote(options) {
        _super.call(this, options);
    }

    // функция перерисовки текущей ноты - просто перерисовка внутренностей в здании
    PartyMembersQuestNote.prototype.redraw = function() {
        this.clear();
        if (!this.jq_main_div || !this.jq_menu_div || !this.build) return;
        if (this.quest_uid == null) return;
        var quest = journalManager.quests.getQuest(this.quest_uid);
        if (! quest) {
            console.warn('quest not found:', this.quest_uid);
            return;
        }

        var jq_up_path = $(
            '<div class="note-class-img party-members-class-quest"></div>' +
            '<div class="note-class-text party-members-class-quest">'+_("q_cq_party_members_task_text")+'</div>'
        );
        this.jq_main_div.append(jq_up_path);
    };

    return PartyMembersQuestNote;
})(QuestNoteNPCBtn);


var SetMapWeaponQuestNote = (function (_super) {
    __extends(SetMapWeaponQuestNote, _super);

    function SetMapWeaponQuestNote(options) {
        _super.call(this, options);
    }

    // функция перерисовки текущей ноты - просто перерисовка внутренностей в здании
    SetMapWeaponQuestNote.prototype.redraw = function() {
        this.clear();
        if (!this.jq_main_div || !this.jq_menu_div || !this.build) return;
        if (this.quest_uid == null) return;
        var quest = journalManager.quests.getQuest(this.quest_uid);
        if (! quest) {
            console.warn('quest not found:', this.quest_uid);
            return;
        }

        var jq_up_path = $(
            '<div class="note-class-img set-map-weapon-class-quest"></div>' +
            '<div class="note-class-text set-map-weapon-class-quest">'+_("q_cq_set_map_weapon_task_text")+'</div>'
        );
        this.jq_main_div.append(jq_up_path);
    };

    return SetMapWeaponQuestNote;
})(QuestNoteNPCBtn);


var NPCsTasksCompleteQuestNote = (function (_super) {
    __extends(NPCsTasksCompleteQuestNote, _super);

    function NPCsTasksCompleteQuestNote(options) {
        _super.call(this, options);
    }

    // функция перерисовки текущей ноты - просто перерисовка внутренностей в здании
    NPCsTasksCompleteQuestNote.prototype.redraw = function() {
        this.clear();
        if (!this.jq_main_div || !this.jq_menu_div || !this.build) return;
        if (this.quest_uid == null) return;
        var quest = journalManager.quests.getQuest(this.quest_uid);
        if (! quest) {
            console.warn('quest not found:', this.quest_uid);
            return;
        }

        var jq_up_path = $(
            '<div class="note-class-img npcs-tasks-complete-class-quest"></div>' +
            '<div class="note-class-text npcs-tasks-complete-class-quest">'+_("q_cq_npc_tasks_task_text")+'</div>'
        );
        this.jq_main_div.append(jq_up_path);
    };

    return NPCsTasksCompleteQuestNote;
})(QuestNoteNPCBtn);


var KarmaLimitQuestNote = (function (_super) {
    __extends(KarmaLimitQuestNote, _super);

    function KarmaLimitQuestNote(options) {
        _super.call(this, options);
    }

    // функция перерисовки текущей ноты - просто перерисовка внутренностей в здании
    KarmaLimitQuestNote.prototype.redraw = function() {
        this.clear();
        if (!this.jq_main_div || !this.jq_menu_div || !this.build) return;
        if (this.quest_uid == null) return;
        var quest = journalManager.quests.getQuest(this.quest_uid);
        if (! quest) {
            console.warn('quest not found:', this.quest_uid);
            return;
        }

        var jq_up_path = $(
            '<div class="note-class-img karma-limit-class-quest"></div>' +
            '<div class="note-class-text karma-limit-class-quest">'+
            _("q_cq_karmic_task_text")+ ' '+
            getKarmaName(quest.needed_karma)+
            '.'+
            '</div>'
        );
        this.jq_main_div.append(jq_up_path);
    };

    return KarmaLimitQuestNote;
})(QuestNoteNPCBtn);


var ClassQuestDummyNote = (function (_super) {
    __extends(ClassQuestDummyNote, _super);

    function ClassQuestDummyNote(options) {
        _super.call(this, options);
    }

    // функция перерисовки текущей ноты - просто перерисовка внутренностей в здании
    ClassQuestDummyNote.prototype.redraw = function() {
        this.clear();
        if (!this.jq_main_div || !this.jq_menu_div || !this.build) return;
        if (this.quest_uid == null) return;
        var quest = journalManager.quests.getQuest(this.quest_uid);
        if (! quest) {
            console.warn('quest not found:', this.quest_uid);
            return;
        }

        var class_name = '';
        if (user.example_agent.role_class['ru'] == "Избранный") class_name = 'co';
        else if (user.example_agent.role_class['ru'] == "Альфа-волк") class_name = 'aw';
        else if (user.example_agent.role_class['ru'] == "Ночной ездок") class_name = 'nr';
        else if (user.example_agent.role_class['ru'] == "Нефтяной магнат") class_name = 'om';
        else if (user.example_agent.role_class['ru'] == "Воин дорог") class_name = 'rw';
        else if (user.example_agent.role_class['ru'] == "Технокинетик") class_name = 'tk';

        var jq_up_path = $(
            '<div class="note-class-img class-quest-dummy-note ' + class_name + '"></div>'
        );
        this.jq_main_div.append(jq_up_path);
    };

    return ClassQuestDummyNote;
})(QuestNoteNPCBtn);