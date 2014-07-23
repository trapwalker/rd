var IDNum = 0;

function newIDFromP() {
    IDNum++;
    return "p" + IDNum;
}

/*
function addDivToDiv(parentDivID, divID, astr, toTop) {  // Если такой див есть, то текст меняется в нём, иначе
    if ($("#" + divID).length) {
        $("#" + divID).text(astr);
        return;
    }
    // создать див с именем divID
    var str = "<div id=\"" + divID + "\" class=\"message\">" + astr + "</div>";
    var node = $(str);
    node.hide();

    if (toTop) {
        $("#" + parentDivID).append(node)
    }
    else {
        $("#" + parentDivID).prepend(node);
    }
    node.slideDown('fast',function() {$('#'+parentDivID).scrollTop($('#'+parentDivID).scrollTop()+50);});
}

/*
function addStatusServer(key, value) {  // Постоянно обновляет сообщения от сервера
    var astr = key + ': ' + value;
    if ($("#" + key+'_stServ').length) {
        $("#" + key+'_stServ').text(astr);
        return;
    }
    var str = '<div id="' + key +'_stServ' + '" class="message">' + astr + '</div>';
    $("#serverStatus").append($(str));
}
*/

