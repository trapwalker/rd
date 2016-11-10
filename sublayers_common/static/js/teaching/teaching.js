var TeachingManager = (function(){
    function TeachingManager(){
        this.active = false;

        this.jq_canvas = $('#townTeachingCanvas');

        var canvas = document.getElementById('townTeachingCanvas');
        this.context = canvas.getContext("2d");
        canvas.width = 1920;
        canvas.height = 1080;

        this.active_note = null;

        this.jq_panel_left = null;
        this.jq_panel_right = null;

        this.jq_panel_left_content = null;
        this.jq_panel_right_content = null;
    }

    TeachingManager.prototype.is_active = function() {
        return this.active;
    };

    TeachingManager.prototype.activate = function() {
        this.jq_canvas.css('display', 'block');
        this.active = true;

        // Выключить все панели в городе
        if (locationManager.panel_left.jq_main_div)
            locationManager.panel_left.jq_main_div.find('.panel-info-item').css('display', 'none');
        if (locationManager.panel_right.jq_main_div)
            locationManager.panel_right.jq_main_div.find('.panel-info-item').css('display', 'none');

        // Включить панели обучения
        this.jq_panel_left = $('.panel-info-teaching-left').first();
        this.jq_panel_right = $('.panel-info-teaching-right').first();
        this.jq_panel_left_content = this.jq_panel_left.find('.panel-info-content');
        this.jq_panel_right_content = this.jq_panel_right.find('.panel-info-content');
        this.jq_panel_left.css('display', 'block');
        this.jq_panel_right.css('display', 'block');
    };

    TeachingManager.prototype.deactivate = function() {
        this.jq_canvas.css('display', 'none');
        this.active = false;
        // Выключить панели обучения
        this.jq_panel_left.css('display', 'none');
        this.jq_panel_right.css('display', 'none');

        // Нота должна удалиться
        if (this.active_note) {
            this.active_note.delete();
            this.active_note = null;
        }
    };

    TeachingManager.prototype.update = function(note) {
        console.log('TeachingManager.prototype.update', note);
        if (!this.is_active()) this.activate();
        this.active_note = note;
        this.redraw();
    };

    TeachingManager.prototype.redraw = function() {
        if (!this.is_active() || !this.active_note) return;
        this.context.clearRect(0, 0, 1920, 1080);
        this.active_note.redraw();
    };

    TeachingManager.prototype.on_enter_location = function() {
        if (this.active_note)
            this.active_note.on_enter_location();
    };

    return TeachingManager;
})();


function teachTest() {
    teachingManager.activate();
    var note = new FinishQuestTeachingNote({uid: 5555});
    teachingManager.update(note);
}

function teachGetQuestTest() {
    teachingManager.activate();
    var note = new GetQuestTeachingNote({uid: 38947568});
    teachingManager.update(note);
}

function teachFinishQuestTest() {
    teachingManager.activate();
    var note = new FinishQuestTeachingNote({uid: 23489577});
    teachingManager.update(note);
}

function teachNukoilTest() {
    teachingManager.activate();
    var note = new NukoilTeachingNote({uid: 19375324});
    teachingManager.update(note);
}

function teachTrainerTest() {
    teachingManager.activate();
    var note = new TrainerTeachingNote({uid: 23453489});
    teachingManager.update(note);
}

function teachJournalTest() {
    teachingManager.activate();
    var note = new JournalTeachingNote({uid: 67309456});
    teachingManager.update(note);
}

var teachingManager;