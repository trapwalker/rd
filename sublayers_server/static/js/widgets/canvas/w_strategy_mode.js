var WStrategyModeManager = (function () {
    function WStrategyModeManager() {
        mapCanvasManager.add_vobj(this, 80);
        this.targets = [];  // ������ ����� ��� ����������� � �������������� ������

    }

    WStrategyModeManager.prototype.update = function (targets) {
        //console.log('WStrategyModeManager.prototype.update');
        this.targets = targets;
    };


    WStrategyModeManager.prototype.redraw = function(ctx, time){
        //console.log('WStrategyModeManager.prototype.redraw');
        if (mapCanvasManager.real_zoom >= 15) return;
        ctx.save();
        if(mapCanvasManager.real_zoom > 14) {
            ctx.globalAlpha = 15.0 - mapCanvasManager.real_zoom;
        }

        var map_top_left = mapCanvasManager.map_tl;

        ctx.fillStyle = '#FF0000';
        // ��������� �����
        for (var i = 0; i < this.targets; i++){
            var p = subVector(this.targets[i], map_top_left);
            // todo: �� �������� �����, ������� �������� ����� �� ������� �� ������
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 2 * Math.PI, 0, false);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();  // ������� ����������
    };


    return WStrategyModeManager;
})();

var wStrategyModeManager;
