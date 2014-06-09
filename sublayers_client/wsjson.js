


var WSJSON = {
    socket: null,

    Init: function() {
        var url = "ws://" + location.host + "/sublayers";
        WSJSON.socket = new WebSocket(url);
        WSJSON.socket.onmessage = function(event) {
            WSJSON.getMessage(JSON.parse(event.data));
        }
    },


    getMessage: function(message) {
        // разбор мессаджа
        var existing = $("#m" + message.id);
        if (existing.length > 0) return;
        var node = $(message.html);
        node.hide();
        $("#inbox").append(node);
        node.slideDown();
    }

};