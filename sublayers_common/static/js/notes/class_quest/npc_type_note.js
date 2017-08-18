var QuestNoteNPCTypeBtn = (function (_super) {
    __extends(QuestNoteNPCTypeBtn, _super);

    function QuestNoteNPCTypeBtn(options) {
        _super.call(this, options);

        this.npc_type = options.npc_type;
        this.page_caption = options.page_caption;
        this.btn1_caption = options.btn1_caption;

        this.jq_main_div_list = [];  // Вёрстка в здании
        this.jq_menu_div_list = [];  // Вёрстка в меню (по сути кнопка-плашка)
        this.build_list = [];

        // Попытка автоматически сбиндить ноту со зданиями
        if (locationManager.in_location_flag) {
            var build = locationManager.get_building_by_field('type', this.npc_type);
            if (build)
                this.bind_with_build(build);
        }
    }

    QuestNoteNPCTypeBtn.prototype.is_target_build = function(build) {
        return this.npc_type == build.building_rec.head.type;
    };

    // вызываются тольо когда нота пришла когда клиент уже был в городе
    QuestNoteNPCTypeBtn.prototype.bind_with_build = function (build) {
        this.set_div(
            build,
            build.jq_main_div.find('.building-center-menu-block-wrap').first(),
            build.jq_main_div.find('.building-center-pages-block').first()
        );
        this.jq_menu_div_list[this.jq_menu_div_list.length - 1].click({build: build}, build.centralMenuBindReaction_handler);
        build.centralMenuScrollSet();
    };

    // автоматически вызывается
    QuestNoteNPCTypeBtn.prototype.set_div = function(build, jq_build_menu, jq_build_center) {
        this.build_list.push(build);

        // Добавление плашки в здание
        var page_id = 'building_note_' + this.uid + '_' + build.building_rec.name;
        var jq_menu_div = $(
            '<div class="building-center-menu-item" data-page_id="' + page_id + '" data-note_uid="' + this.uid + '">' + this.page_caption + '</div>'
        );
        jq_build_menu.append(jq_menu_div);
        var jq_main_div = $(
            '<div id="' + page_id + '" class="building-center-page" data-note_uid="' + this.uid + '">'
        );
        jq_build_center.append(jq_main_div);

        this.jq_main_div_list.push(jq_main_div);
        this.jq_menu_div_list.push(jq_menu_div);

        this.redraw(true);
    };

    // функция перерисовки текущей ноты - просто перерисовка внутренностей в здании
    QuestNoteNPCTypeBtn.prototype.redraw_by_index = function(index) {
    };

    QuestNoteNPCTypeBtn.prototype.redraw = function(only_last) {
        if (only_last)
            if (this.jq_main_div_list)
                this.redraw_by_index(this.jq_main_div_list.length - 1);
        else
            for (var i = 0; i < this.jq_main_div_list.length; i++)
                this.redraw_by_index(i);
    };

    QuestNoteNPCTypeBtn.prototype.activate = function() {
        this.redraw();
    };

    QuestNoteNPCTypeBtn.prototype.set_buttons = function(){
        locationManager.setBtnState(1, this.btn1_caption, true);
        locationManager.setBtnState(2, "", false);
    };

    QuestNoteNPCTypeBtn.prototype.clickBtn = function (btnIndex) {
        //console.log('Click for note: ' + this.uid + '    =>>> ' + btnIndex);
        clientManager.SendQuestNoteAction(this.uid, true);
    };

    QuestNoteNPCTypeBtn.prototype.clear_by_index = function(index) {
        this.jq_main_div_list[index].empty();
    };

    QuestNoteNPCTypeBtn.prototype.clear = function(only_last) {
        if (only_last)
            if (this.jq_main_div_list)
                this.clear_by_index(this.jq_main_div_list.length - 1);
        else
            for (var i = 0; i < this.jq_main_div_list.length; i++)
                this.clear_by_index(i);
    };

    QuestNoteNPCTypeBtn.prototype.delete = function() {
        // console.log('QuestNoteNPCTypeBtn.prototype.delete');
        function is_actual_build(build) {
            for (var key in locationManager.buildings)
                if (locationManager.buildings[key] == build)
                    return true;
            return false;
        }

        if (locationManager.in_location_flag)
            for (var i = 0; i < this.build_list.length; i++) {
                var build = this.build_list[i];
                if (build && is_actual_build(build)) {
                    var page_id = 'building_note_' + this.uid + '_' + build.building_rec.name;
                    if (build.active_central_page == this.jq_menu_div_list[i].data('page_id')) {
                        build.jq_main_div.find('.building-center-menu-item').first().click();
                        build.centralMenuScrollToTop();
                        build.set_buttons();
                        build.set_header_text();
                    }
                    this.jq_main_div_list[i].remove();
                    this.jq_menu_div_list[i].remove();
                    build.centralMenuScrollSet();
                }
            }
        this.build_list = [];
        _super.prototype.delete.call(this);
    };

    return QuestNoteNPCTypeBtn;
})(SimpleNote);