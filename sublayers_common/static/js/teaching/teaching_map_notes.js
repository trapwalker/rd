var NoActionTeachingMapNote = (function (_super) {
    __extends(NoActionTeachingMapNote, _super);

    function NoActionTeachingMapNote(options) {
        _super.call(this, options);
    }

    NoActionTeachingMapNote.prototype.active = function() {
        _super.prototype.active.call(this);
        var note = this;
        windowTemplateManager.openUniqueWindow(this.window_name, this.window_uri, {window_name: this.window_name},
            function(jq_window) {
                var window = windowTemplateManager.unique[note.window_name];
                if (window)
                    window.setupCloseElement(jq_window.find('.btn-next'));
            },
            function() {
                clientManager.SendQuestNoteAction(note.uid, true);
            },
            true);
    };

    return NoActionTeachingMapNote;
})(TeachingMapNote);


var CruiseSpeedTeachingMapNote = (function (_super) {
    __extends(CruiseSpeedTeachingMapNote, _super);

    function CruiseSpeedTeachingMapNote(options) {
        _super.call(this, options);
        this.window_name = 'cruise_speed';
        this.window_uri = '/map_teaching';
    }

    CruiseSpeedTeachingMapNote.prototype.redraw = function() {
        this.draw_arrow(teachingMapManager.context, new Point(-100, -420), 0);
    };

    return CruiseSpeedTeachingMapNote;
})(NoActionTeachingMapNote);


var CruiseZoneTeachingMapNote = (function (_super) {
    __extends(CruiseZoneTeachingMapNote, _super);

    function CruiseZoneTeachingMapNote(options) {
        _super.call(this, options);
        this.window_name = 'cruise_zone';
        this.window_uri = '/map_teaching';
    }

    CruiseZoneTeachingMapNote.prototype.redraw = function() {
        this.draw_arrow(teachingMapManager.context, new Point(-65, -150), 0);
    };

    return CruiseZoneTeachingMapNote;
})(NoActionTeachingMapNote);


var CruiseSpeedControlTeachingMapNote = (function (_super) {
    __extends(CruiseSpeedControlTeachingMapNote, _super);

    function CruiseSpeedControlTeachingMapNote(options) {
        _super.call(this, options);
        this.window_name = 'cruise_speed_control';
        this.window_uri = '/map_teaching';
    }

    CruiseSpeedControlTeachingMapNote.prototype.redraw = function() {
        this.draw_arrow(teachingMapManager.context, new Point(-155, -85), 0);
    };

    return CruiseSpeedControlTeachingMapNote;
})(NoActionTeachingMapNote);


var CruiseSpeedBtnTeachingMapNote = (function (_super) {
    __extends(CruiseSpeedBtnTeachingMapNote, _super);

    function CruiseSpeedBtnTeachingMapNote(options) {
        _super.call(this, options);
        this.window_name = 'cruise_speed_btn';
        this.window_uri = '/map_teaching';
    }

    CruiseSpeedBtnTeachingMapNote.prototype.redraw = function() {
        this.draw_arrow(teachingMapManager.context, new Point(-85, -65), 90);
    };

    return CruiseSpeedBtnTeachingMapNote;
})(NoActionTeachingMapNote);


var DrivingControlTeachingMapNote = (function (_super) {
    __extends(DrivingControlTeachingMapNote, _super);

    function DrivingControlTeachingMapNote(options) {
        _super.call(this, options);
        this.window_name = 'driving_control';
        this.window_uri = '/map_teaching';
    }

    DrivingControlTeachingMapNote.prototype.active = function() {
        _super.prototype.active.call(this);
        var note = this;
        windowTemplateManager.openUniqueWindow(this.window_name, this.window_uri, {window_name: this.window_name},
            function(jq_window) {
                var window = windowTemplateManager.unique[note.window_name];
                if (window)
                    window.setupCloseElement(jq_window.find('.btn-next'));
            },
            null, true);
    };

    return DrivingControlTeachingMapNote;
})(TeachingMapNote);


var CruiseRadialTeachingMapNote = (function (_super) {
    __extends(CruiseRadialTeachingMapNote, _super);

    function CruiseRadialTeachingMapNote(options) {
        _super.call(this, options);
        this.window_name = 'cruise_radial';
        this.window_uri = '/map_teaching';
    }

    CruiseRadialTeachingMapNote.prototype.redraw = function() {
        this.draw_arrow(teachingMapManager.context, new Point(-260, -130), 45);
        this.draw_arrow(teachingMapManager.context, new Point(-390, -130), 45);
        this.draw_arrow(teachingMapManager.context, new Point(-490, -95), 45);
    };

    return CruiseRadialTeachingMapNote;
})(NoActionTeachingMapNote);


var ZoomSliderTeachingMapNote = (function (_super) {
    __extends(ZoomSliderTeachingMapNote, _super);

    function ZoomSliderTeachingMapNote(options) {
        _super.call(this, options);
        this.window_name = 'zoom_slider';
        this.window_uri = '/map_teaching';
    }

    ZoomSliderTeachingMapNote.prototype.redraw = function() {
        this.draw_arrow(teachingMapManager.context, new Point(75, 120), 180);
        this.draw_arrow(teachingMapManager.context, new Point(75, 320), 180);
    };

    return ZoomSliderTeachingMapNote;
})(NoActionTeachingMapNote);


var DischargeShootingTeachingMapNote = (function (_super) {
    __extends(DischargeShootingTeachingMapNote, _super);

    function DischargeShootingTeachingMapNote(options) {
        _super.call(this, options);
        this.window_name = 'discharge_shooting';
        this.window_uri = '/map_teaching';
    }

    DischargeShootingTeachingMapNote.prototype.redraw = function() {
        var x = Math.round($('#bodydiv').width() / 2.0) - 100;
        this.draw_arrow(teachingMapManager.context, new Point(x, -180), 45);
    };

    return DischargeShootingTeachingMapNote;
})(NoActionTeachingMapNote);


var AutoShootingTeachingMapNote = (function (_super) {
    __extends(AutoShootingTeachingMapNote, _super);

    function AutoShootingTeachingMapNote(options) {
        _super.call(this, options);
        this.window_name = 'auto_shooting';
        this.window_uri = '/map_teaching';
    }

    AutoShootingTeachingMapNote.prototype.redraw = function() {
        var x = Math.round($('#bodydiv').width() / 2.0) - 100;
        this.draw_arrow(teachingMapManager.context, new Point(x, -180), 45);
    };

    return AutoShootingTeachingMapNote;
})(NoActionTeachingMapNote);


var TryKillTeachingMapNote = (function (_super) {
    __extends(TryKillTeachingMapNote, _super);

    function TryKillTeachingMapNote(options) {
        _super.call(this, options);
        this.window_name = 'try_kill';
        this.window_uri = '/map_teaching';
    }

    TryKillTeachingMapNote.prototype.active = function() {
        _super.prototype.active.call(this);
        var note = this;
        windowTemplateManager.openUniqueWindow(this.window_name, this.window_uri, {window_name: this.window_name},
            function(jq_window) {
                var window = windowTemplateManager.unique[note.window_name];
                if (window)
                    window.setupCloseElement(jq_window.find('.btn-next'));
            },
            null, true);
    };

    return TryKillTeachingMapNote;
})(TeachingMapNote);