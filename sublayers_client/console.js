//Работа с логом
var IDNum = 0;

function addDivToDiv(parentDivID, divID, astr){  // Если такой див есть, то текст меняется в нём, иначе
    if($("#"+divID).length) {
        $("#"+divID).text(astr);
        //document.getElementById(divID).textContent = astr;
        return;
    }
    // создать див с именем divID
    var str = "<div id=\"" + divID + "\" class=\"message\">" + astr + "</div>";
    var node = $(str);
    node.hide();
    $("#"+parentDivID).append(node);
    node.slideDown();
}

function newIDFromP(){
    IDNum++;
    return "d"+IDNum;
}

function newIDFromChatMessage(){
    IDNum++;
    return "chatMes"+IDNum;
}
//Работа с логом (конец)