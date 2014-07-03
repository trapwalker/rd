var IDNum = 0;

function addDivToDiv(parentDivID, divID, astr, toTop) {  // Если такой див есть, то текст меняется в нём, иначе
    if ($("#" + divID).length) {
        $("#" + divID).text(astr);
        //document.getElementById(divID).textContent = astr;
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

function newIDFromP() {
    IDNum++;
    return "d" + IDNum;
}

function newIDFromChatMessage() {
    IDNum++;
    return "chatMes" + IDNum;
}

function newIDForTestCar() {
    IDNum++;
    return IDNum;
}
