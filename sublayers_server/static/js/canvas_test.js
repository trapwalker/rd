

function CanvasTestStart() {
    console.log('CanvasTestStart');
    var b_canvas = document.getElementById("ctest_1");
    var b_context = b_canvas.getContext("2d");

    var grd = b_context.createRadialGradient(960, 540, 200, 960, 540, 800);

    grd.addColorStop(0,"transparent");
    grd.addColorStop(1,"rgba(100, 0, 0, 0.7)");

    b_context.fillStyle = grd;
    b_context.fillRect(0, 0, 1920, 1080);

};