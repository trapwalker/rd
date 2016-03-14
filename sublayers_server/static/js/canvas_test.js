function CanvasTestStart() {
    //console.log('CanvasTestStart');

    b_context.clearRect(0, 0, 1920, 1080);

    var center_x = 1000;
    var center_y = 500;
    var radius = 200;

    b_context.fillStyle="rgba(0, 0, 0, 0.5)";
    b_context.fillRect(0, 0, 1920, 1080);

    b_context.globalCompositeOperation = "destination-out";

    b_context.fillStyle="rgb(0, 0, 0)";

    b_context.beginPath();
    b_context.arc(center_x, center_y, radius, 0, 2 * Math.PI, false);
    b_context.fill();

    b_context.beginPath();
    b_context.arc(center_x + 10, center_y, radius, 0, 2 * Math.PI, false);
    b_context.fill();

    b_context.globalCompositeOperation = "source-over";
};