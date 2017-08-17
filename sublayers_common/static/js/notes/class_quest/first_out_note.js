var QuestNoteFirstOut = (function (_super) {
    __extends(QuestNoteFirstOut, _super);

    function QuestNoteFirstOut(options) {
        _super.call(this, options);
        setTimeout(function() { modalWindow.modalClassQuestFirstOutShow(); }, 5000);
    }

    return QuestNoteFirstOut;
})(SimpleNote);
