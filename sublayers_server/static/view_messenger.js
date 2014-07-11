function createViewMessenger(parentDivID) {

    function sendMessage() {
        var str = vMI.val();
        if (str.length) {
            sendChatMessage(str);
            vMI.val('').focus();
        } else {
            vMI.focus()
        }
    }

    //добавление основного дива
    var vMA = $("<div id=\"viewMessengerArea\"> </div>");
    $("#" + parentDivID).append(vMA);

    //добавление (верхнего) дива с чатом
    var vMLA = $("<div id=\"viewMessengerListArea\"> </div>");
    vMA.append(vMLA);

    //добавление дива со списком сообщений
    var vML = $("<div id=\"viewMessengerList\"> </div>");
    vMLA.append(vML);

    //добавление дива с элементами ввода сообщений
    var vMLIA = $("<div id=\"viewMessengerListInputArea\"> </div>");
    vMLA.append(vMLIA);

    //добавление дива с Input
    var vMLI = $("<div id=\"viewMessengerListInput\"> </div>");
    vMLIA.append(vMLI);
    var vMI = $("<input id=\"viewMessengerInput\" type=\"text\"/>");
    vMLI.append(vMI);
    vMI.keydown(function (event) {
        if (event.keyCode == 13) {
            sendMessage();
        }
    });

    //добавление дива с кнопкой отправки
    var vMLB = $("<div id=\"viewMessengerListButton\"> </div>");
    vMLIA.append(vMLB);
    var vMB = $("<a id=\"viewMessengerButton\" class=\"button\">Отправить</a>");
    vMLB.append(vMB);
    vMB.click(sendMessage);
    //добавление (нижнего) дива с кнопкой Свернуть/Развернуть
    var vMSBA = $("<div id=\"viewMessengerSlideButtonArea\"> </div>");
    vMA.append(vMSBA);
    var vMSB = $("<a id=\"viewMessengerSlideButton\" class=\"button\">Свернуть чат</a>");
    vMSBA.append(vMSB);
    vMSB.click(function () {
        vMLA.slideToggle("slow", function () {
            if (vMSB.text() == "Свернуть чат") {
                vMSB.text("Развернуть чат")
            }
            else {
                vMSB.text("Свернуть чат")
            }
        });
    });
}
