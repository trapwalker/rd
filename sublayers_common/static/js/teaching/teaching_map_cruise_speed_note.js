var CruiseSpeedTeachingMapNote = (function (_super) {
    __extends(CruiseSpeedTeachingMapNote, _super);

    function CruiseSpeedTeachingMapNote(options) {
        _super.call(this, options);
    }

    CruiseSpeedTeachingMapNote.prototype.active = function() {
        _super.prototype.active.call(this);
        windowTemplateManager.openUniqueWindow('cruise_speed', '/map_teaching', {window_name: 'cruise_speed'},
                                               null, null, true);
    };

    CruiseSpeedTeachingMapNote.prototype.redraw = function() {
        this.draw_arrow(teachingMapManager.context, new Point(-100, -420), 0);
    };

    return CruiseSpeedTeachingMapNote;
})(TeachingMapNote);