var NoActionTeachingMapNote = (function (_super) {
    __extends(NoActionTeachingMapNote, _super);

    function NoActionTeachingMapNote(options) {
        _super.call(this, options);
        this.elem_id_str = '';
        this.old_z_index = null;
    }

    NoActionTeachingMapNote.prototype.active = function() {
        _super.prototype.active.call(this);
        var note = this;
        windowTemplateManager.openUniqueWindow(this.window_name, this.window_uri, {window_name: this.window_name},
            function(jq_window) {
                var window = windowTemplateManager.unique[note.window_name];
                if (window) {
                    window.setupCloseElement(jq_window.find('.btn-next'));
                    window.setupCloseElement(jq_window.find('.btn-back'));
                    jq_window.find('.btn-next').click(function() {
                        note.send_activate_note(true);
                    });
                    jq_window.find('.btn-back').click(function() {
                        note.send_activate_note(false);
                    });
                    jq_window.find('.windowDragCloseHeader-close').click(function() {
                        note.send_activate_note(true);
                    });
                }
                note.on_open_note_window(window);
            },
            function() { note.on_close_note_window(); },
            true);
    };

    NoActionTeachingMapNote.prototype.on_open_note_window = function(window) {
        $('.modalDivWindow').first().css('background-color', 'rgba(0,0,0,0)');
        $('#mapTeachingCanvasBackDiv').css('display', 'block');
        teachingMapManager.jq_canvas.css('pointer-events', 'auto');
        if (this.elem_id_str) {
            this.old_z_index = $('#' + this.elem_id_str).css('z-index');
            $('#' + this.elem_id_str).css('z-index', '2000');
        }
    };

    NoActionTeachingMapNote.prototype.on_close_note_window = function() {
        teachingMapManager.jq_canvas.css('pointer-events', 'none');
        $('#mapTeachingCanvasBackDiv').css('display', 'none');
        if (this.elem_id_str && this.old_z_index != null) {
            $('#' + this.elem_id_str).css('z-index', this.old_z_index);
            this.old_z_index = null;
        }
    };

    NoActionTeachingMapNote.prototype.send_activate_note = function (result) {
        var note = this;
        setTimeout(function () { clientManager.SendQuestNoteAction(note.uid, result); }, 1500);
    };

    return NoActionTeachingMapNote;
})(TeachingMapNote);


var CruiseSpeedTeachingMapNote = (function (_super) {
    __extends(CruiseSpeedTeachingMapNote, _super);

    function CruiseSpeedTeachingMapNote(options) {
        _super.call(this, options);
        this.window_name = 'cruise_speed';
        this.window_uri = '/map_teaching';
        this.elem_id_str = 'cruiseControlMainDiv';
    }

    CruiseSpeedTeachingMapNote.prototype.redraw = function() {
        if (interface_scale_big)
            this.draw_arrow(teachingMapManager.context, new Point(-100, -420), 0);
        else
            this.draw_arrow(teachingMapManager.context, new Point(-75, -317), 0);
    };

    return CruiseSpeedTeachingMapNote;
})(NoActionTeachingMapNote);


var CruiseZoneTeachingMapNote = (function (_super) {
    __extends(CruiseZoneTeachingMapNote, _super);

    function CruiseZoneTeachingMapNote(options) {
        _super.call(this, options);
        this.window_name = 'cruise_zone';
        this.window_uri = '/map_teaching';
        this.elem_id_str = 'cruiseControlMainDiv';
    }

    CruiseZoneTeachingMapNote.prototype.redraw = function() {
        if (interface_scale_big)
            this.draw_arrow(teachingMapManager.context, new Point(-65, -150), 0);
        else
            this.draw_arrow(teachingMapManager.context, new Point(-50, -115), 0);
    };

    return CruiseZoneTeachingMapNote;
})(NoActionTeachingMapNote);


var CruiseSpeedControlTeachingMapNote = (function (_super) {
    __extends(CruiseSpeedControlTeachingMapNote, _super);

    function CruiseSpeedControlTeachingMapNote(options) {
        _super.call(this, options);
        this.window_name = 'cruise_speed_control';
        this.window_uri = '/map_teaching';
        this.elem_id_str = 'cruiseControlMainDiv';
    }

    CruiseSpeedControlTeachingMapNote.prototype.redraw = function() {
        if (interface_scale_big)
            this.draw_arrow(teachingMapManager.context, new Point(-155, -85), 0);
        else
            this.draw_arrow(teachingMapManager.context, new Point(-120, -63), 0);
    };

    return CruiseSpeedControlTeachingMapNote;
})(NoActionTeachingMapNote);


var CruiseSpeedBtnTeachingMapNote = (function (_super) {
    __extends(CruiseSpeedBtnTeachingMapNote, _super);

    function CruiseSpeedBtnTeachingMapNote(options) {
        _super.call(this, options);
        this.window_name = 'cruise_speed_btn';
        this.window_uri = '/map_teaching';
        this.elem_id_str = 'cruiseControlMainDiv';
    }

    CruiseSpeedBtnTeachingMapNote.prototype.redraw = function() {
        if (interface_scale_big)
            this.draw_arrow(teachingMapManager.context, new Point(-85, -65), 90);
        else
            this.draw_arrow(teachingMapManager.context, new Point(-65, -52), 90);
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

    DrivingControlTeachingMapNote.prototype.send_activate_note = function(result) {
        if (!result)
            _super.prototype.send_activate_note.call(this, result);
    };

    return DrivingControlTeachingMapNote;
})(NoActionTeachingMapNote);


var CruiseRadialTeachingMapNote = (function (_super) {
    __extends(CruiseRadialTeachingMapNote, _super);

    function CruiseRadialTeachingMapNote(options) {
        _super.call(this, options);
        this.window_name = 'cruise_radial';
        this.window_uri = '/map_teaching';
        this.elem_id_str = 'cruiseControlMainDiv';
    }

    CruiseRadialTeachingMapNote.prototype.redraw = function() {
        if (interface_scale_big) {
            this.draw_arrow(teachingMapManager.context, new Point(-260, -130), 45);
            this.draw_arrow(teachingMapManager.context, new Point(-390, -130), 45);
            this.draw_arrow(teachingMapManager.context, new Point(-490, -95), 45);
        }
        else {
            this.draw_arrow(teachingMapManager.context, new Point(-200, -95), 45);
            this.draw_arrow(teachingMapManager.context, new Point(-295, -95), 45);
            this.draw_arrow(teachingMapManager.context, new Point(-370, -72), 45);
        }
    };

    return CruiseRadialTeachingMapNote;
})(NoActionTeachingMapNote);


var ZoomSliderTeachingMapNote = (function (_super) {
    __extends(ZoomSliderTeachingMapNote, _super);

    function ZoomSliderTeachingMapNote(options) {
        _super.call(this, options);
        this.window_name = 'zoom_slider';
        this.window_uri = '/map_teaching';
        this.elem_id_str = 'zoomSetDivForZoomSlider';

        visualManager.addVisualObject(this, []);
        visualManager.bindMobjToVobj(this, mapManager);
        this.change_count = 0;

        var self = this;
        this._end_note_timer = null;
    }

    ZoomSliderTeachingMapNote.prototype.redraw = function() {
        if (interface_scale_big) {
            this.draw_arrow(teachingMapManager.context, new Point(75, 120), 180);
            this.draw_arrow(teachingMapManager.context, new Point(75, 320), 180);
        }
        else {
            this.draw_arrow(teachingMapManager.context, new Point(55, 91), 180);
            this.draw_arrow(teachingMapManager.context, new Point(55, 241), 180);
        }
    };

    ZoomSliderTeachingMapNote.prototype.send_activate_note = function(result) {
        if (!result)
            _super.prototype.send_activate_note.call(this, result);
        else {
            var self = this;
            this._end_note_timer = setTimeout(function () {
                self._end_note_timer = null;
                self.change_count = 2;
                self.change();
            }, 15000);
        }
    };

    ZoomSliderTeachingMapNote.prototype.change = function () {
        //console.log('ZoomSliderTeachingMapNote.prototype.change');
        this.change_count++;
        if (this.change_count >= 2) {
            _super.prototype.send_activate_note.call(this, true);
            if (this._end_note_timer) {
                clearTimeout(this._end_note_timer);
                this._end_note_timer = null;
            }
        }
    };

    ZoomSliderTeachingMapNote.prototype.delete = function() {
        visualManager.unbindMobjToVobj(this, mapManager);
        visualManager.delVisualObject(this, []);
        if (this._end_note_timer) {
            clearTimeout(this._end_note_timer);
            this._end_note_timer = null;
        }
        _super.prototype.delete.call(this);
    };

    return ZoomSliderTeachingMapNote;
})(NoActionTeachingMapNote);


var DischargeShootingTeachingMapNote = (function (_super) {
    __extends(DischargeShootingTeachingMapNote, _super);

    function DischargeShootingTeachingMapNote(options) {
        _super.call(this, options);
        this.window_name = 'discharge_shooting';
        this.window_uri = '/map_teaching';
        this.elem_id_str = 'fireControlArea';
    }

    DischargeShootingTeachingMapNote.prototype.redraw = function() {
        if (interface_scale_big) {
            var x = Math.round($('#bodydiv').width() / 2.0) - 100;
            this.draw_arrow(teachingMapManager.context, new Point(x, -180), 45);
        }
        else {
            var x = Math.round($('#bodydiv').width() / 2.0) - 70;
            this.draw_arrow(teachingMapManager.context, new Point(x, -150), 45);
        }
    };

    return DischargeShootingTeachingMapNote;
})(NoActionTeachingMapNote);


var AutoShootingTeachingMapNote = (function (_super) {
    __extends(AutoShootingTeachingMapNote, _super);

    function AutoShootingTeachingMapNote(options) {
        _super.call(this, options);
        this.window_name = 'auto_shooting';
        this.window_uri = '/map_teaching';
        this.elem_id_str = 'fireControlArea';
    }

    AutoShootingTeachingMapNote.prototype.redraw = function() {
        if (interface_scale_big) {
            var x = Math.round($('#bodydiv').width() / 2.0) - 100;
            this.draw_arrow(teachingMapManager.context, new Point(x, -180), 45);
        }
        else {
            var x = Math.round($('#bodydiv').width() / 2.0) - 70;
            this.draw_arrow(teachingMapManager.context, new Point(x, -150), 45);
        }
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

    return TryKillTeachingMapNote;
})(NoActionTeachingMapNote);


var TryGameTeachingMapNote = (function (_super) {
    __extends(TryGameTeachingMapNote, _super);

    function TryGameTeachingMapNote(options) {
        _super.call(this, options);
        this.window_name = 'try_game';
        this.window_uri = '/map_teaching';
    }

    TryGameTeachingMapNote.prototype.send_activate_note = function (result) {
        _super.prototype.send_activate_note.call(this, result);
        if (result) {
            setTimeout(function(){window.location = '/play'}, 2000);
        }
    };

    return TryGameTeachingMapNote;
})(NoActionTeachingMapNote);