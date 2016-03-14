var random_sign = Math.random() * 100 > 50 ? 1 : 0;
//var random_dashed = Math.random() * ;


setInterval(function(){
random_sign = Math.random() * 100 > 50 ? 1 : 0;
}, 70);

function CanvasTestStart() {
    //console.log('CanvasTestStart');
    b_context.clearRect(0, 0, 1920, 1080);

    var center_x = 1000;
    var center_y = 500;

    var center = [{x: 700, y: 400}, {x: 1000, y: 500}];
    var radius = [400, 390, 380, 370, 360];
    //var color = ["rgba(255, 0, 0, 0.8)", "rgba(0, 255, 0, 0.6)", "rgba(0, 0, 255, 0.4)", "rgba(0, 255, 255, 0.2)", "rgba(255, 255, 255, 0)"];
var color = ["rgba(255, 0, 0, 0.8)", "rgba(255, 0, 0, 0.6)", "rgba(255, 0, 0, 0.4)", "rgba(255, 0, 0, 0.2)", "rgba(255, 0, 0, 0)"];


    // шум
    //var index = Math.round(Math.random() * 3);
    //pat = b_context.createPattern(img[index], "repeat");
    //b_context.fillStyle = pat;


    var grad1 = b_context.createRadialGradient(700, 400, 100, 700, 400, 400);
    grad1.addColorStop(0, "rgba(0,0,0,1)");
    grad1.addColorStop(1, "rgba(0,0,0,0)");

    var grad2 = b_context.createRadialGradient(1000, 500, 100, 1000, 500, 400);
    grad2.addColorStop(0, "rgba(0,0,0,1)");
    grad2.addColorStop(1, "rgba(0,0,0,0)");



    b_context.fillStyle=grad1;
    b_context.beginPath();
    b_context.arc(center[0].x, center[0].y, radius[0], 0, 2 * Math.PI, false);
    b_context.closePath();
    b_context.fill();

    b_context.fillStyle=grad2;
    b_context.beginPath();
    b_context.arc(center[1].x, center[1].y, radius[0], 0, 2 * Math.PI, false);
    b_context.closePath();
    b_context.fill();

    b_context.globalCompositeOperation = "xor";
    b_context.fillStyle = "rgba(0,0,0,1)";
    b_context.fillRect(0, 0, 1920, 1080);

    //b_context.globalCompositeOperation = "source-over";
    //var index = Math.round(Math.random() * 3);
    //pat = b_context.createPattern(img[index], "repeat");
    //b_context.fillStyle = pat;

    //// линии
    //b_context.strokeStyle = "rgba(0, 0, 0, 0.8)";
    //b_context.lineWidth = 2;
    //b_context.beginPath();
    //for (var i = 0; i < 250; i++) {
    //    b_context.moveTo(0, i * 4 + random_sign);
    //    b_context.lineTo(1920, i * 4 + random_sign);
    //    //b_context.setLineDash([5, ]);
    //}
    //b_context.closePath();
    //b_context.stroke();


    //b_context.globalCompositeOperation = "hard-light";
    //for (var i = 0; i < radius.length; i++)
    //    for (var j = 0; j < center.length; j++) {
    //        //b_context.globalCompositeOperation = "destination-out";
    //        b_context.beginPath();
    //        b_context.fillStyle=color[i];
    //        b_context.arc(center[j].x, center[j].y, radius[i], 0, 2 * Math.PI, false);
    //        b_context.closePath();
    //        b_context.fill();

            //if (i != 4) {
            //    b_context.globalCompositeOperation = "source-over";
            //    b_context.beginPath();
            //    b_context.fillStyle=color[i];
            //    b_context.arc(center[j].x, center[j].y, radius[i], 0, 2 * Math.PI, false);
            //    b_context.closePath();
            //    b_context.fill();
            //}
        //}
    //for (var j = 0; j < center.length; j++) {
    //    b_context.globalCompositeOperation = "destination-out";
    //    b_context.beginPath();
    //    b_context.fillStyle=color[3];
    //    b_context.arc(center[j].x, center[j].y, radius[4], 0, 2 * Math.PI, false);
    //    b_context.closePath();
    //    b_context.fill();
    //}




    //
    //
    //
    //
    //b_context.beginPath();
    //b_context.arc(center_x, center_y, radius, 0, 2 * Math.PI, false);
    //b_context.fill();
    //
    //b_context.beginPath();
    //b_context.arc(center_x + 100, center_y, radius, 0, 2 * Math.PI, false);
    //b_context.fill();




    b_context.globalCompositeOperation = "source-over";
};