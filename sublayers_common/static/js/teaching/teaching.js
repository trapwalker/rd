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
        if(this.jq_panel_left) this.jq_panel_left.css('display', 'none');
        if(this.jq_panel_right) this.jq_panel_right.css('display', 'none');

        // Нота должна удалиться
        if (this.active_note) {
            this.active_note.delete();
            this.active_note = null;
        }
    };

    TeachingManager.prototype.update = function(note) {
        //console.log('TeachingManager.prototype.update', note);
        if (!this.is_active()) this.activate();
        this.active_note = note;
        this.redraw();
    };

    TeachingManager.prototype.redraw = function() {
        if (!this.is_active() || !this.active_note) return;
        this.context.clearRect(0, 0, 1920, 1080);

        this.active_note.first_call_draw_line_on_redraw = true;  // Чтобы нота подчёркивала внеэкранку только 1 раз
        this.active_note.redraw();
    };

    TeachingManager.prototype.on_enter_location = function() {
        if (this.active_note) {
            this.activate();
            this.active_note.on_enter_location();
        }
        else
            this.deactivate();
    };

    return TeachingManager;
})();

// todo: объеденить два менеджера в одну иерархию наследования
var TeachingMapManager = (function(){
    function TeachingMapManager(){
        this.active = false;
        this.jq_canvas = $('#mapTeachingCanvas');
        var canvas = document.getElementById('mapTeachingCanvas');
        this.context = canvas.getContext("2d");
        canvas.width = 1920;
        canvas.height = 1080;
        this.active_note = null;
        this.timer_blink = null;
        this.currentOpacity = 1.0;
        this.currentOpacityDiffDefault = -0.05;
        this.currentOpacityDiff = this.currentOpacityDiffDefault;
    }

    TeachingMapManager.prototype.is_active = function() {
        return this.active;
    };

    TeachingMapManager.prototype.activate = function() {
        this.jq_canvas.css('display', 'block');
        this.active = true;

        this.timer_blink = setInterval(function() {
            teachingMapManager.currentOpacity += teachingMapManager.currentOpacityDiff;
            if(teachingMapManager.currentOpacity > 1.01 || teachingMapManager.currentOpacity < 0.5) {
                teachingMapManager.currentOpacityDiff = -teachingMapManager.currentOpacityDiff;
            }
            teachingMapManager.jq_canvas.css('opacity', teachingMapManager.currentOpacity);
        }, 80);
    };

    TeachingMapManager.prototype.deactivate = function() {
        this.jq_canvas.css('display', 'none');
        this.active = false;

        this.jq_canvas.css('opacity', 1.0);
        if (this.timer_blink) {
            clearInterval(this.timer_blink);
            this.timer_blink = null;
            this.currentOpacity = 1.0;
            this.currentOpacityDiff = this.currentOpacityDiffDefault;
        }

        // Нота должна удалиться
        if (this.active_note) {
            this.active_note.delete();
            this.active_note = null;
        }
    };

    TeachingMapManager.prototype.update = function(note) {
        //console.log('TeachingManager.prototype.update', note);
        if (!this.is_active()) this.activate();
        this.active_note = note;
        this.active_note.active();
        this.redraw();
    };

    TeachingMapManager.prototype.redraw = function() {
        if (!this.is_active() || !this.active_note) return;
        this.context.clearRect(0, 0, 1920, 1080);

        this.active_note.redraw();
    };

    return TeachingMapManager;
})();


function teachTest() {
    teachingManager.activate();
    var note = new FinishQuestTeachingNote({uid: 5555});
    teachingManager.update(note);
}

var teachingManager;
var teachingMapManager;