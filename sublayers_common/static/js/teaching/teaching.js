

var TeachingManager = (function(){
    function TeachingManager(){
        this.active = true;

        this.jq_canvas = $('#townTeachingCanvas');

        var canvas = document.getElementById('townTeachingCanvas');
        this.context = canvas.getContext("2d");
        canvas.width = 1920;
        canvas.height = 1080;

        this.active_note = null;
    }


    TeachingManager.prototype.is_active = function() {
        return this.active;
    };

    TeachingManager.prototype.activate = function() {
        this.jq_canvas.css('display', 'block');
        this.active = true;
    };

    TeachingManager.prototype.deactivate = function() {
        this.jq_canvas.css('display', 'none');
        this.active = false;
    };

    TeachingManager.prototype.update = function(note) {
        console.log('TeachingManager.prototype.update', note);
        this.active_note = note;
        this.redraw();
    };

    TeachingManager.prototype.redraw = function() {
        if (!this.is_active() || !this.active_note) return;

        console.log('TeachingManager.prototype.redraw');
        this.context.clearRect(0, 0, 1920, 1080);
        this.active_note.redraw();
    };


    return TeachingManager;
})();


function teachTest(aaa) {
    if (!aaa) {
        var note = new HangarTeachingNote({uid: 5555});
        teachingManager.update(note);
    }
    else {
        var note = new HangarTeachingNote({uid: 6666});
        teachingManager.update(note);
    }
}


var teachingManager;