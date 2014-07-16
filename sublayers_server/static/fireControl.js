/**
 * Created by Andrey on 16.07.2014.
 */
var FireControl = (function () {
    function FireControl(options) {
        this.options = {
            parentDiv: '',
            diameter: 200,
            rotateAngle: 0
            //onFireAll: ''
        };

        if (options) {
            if (options.parentDiv) this.options.parentDiv = options.parentDiv;
            if (options.diameter) this.options.diameter = options.diameter;
        }

        this.radiusOut = this.options.diameter / 2;
        this.radiusIn = this.options.diameter / 6;

        this.center = {
            x: this.options.diameter / 2,
            y: this.options.diameter / 2
        };

        if (this.options.parentDiv) this.paper = Raphael(this.options.parentDiv, this.options.diameter, this.options.diameter)
        else this.paper = Raphael(0, 0, this.options.diameter, this.options.diameter);

        this.paper.circle(this.center.x, this.center.y, this.radiusOut);
        this.allFire = this.paper.circle(this.center.x, this.center.y, this.radiusIn);

        $(this.allFire.node).attr('class', 'fire-control-all');

        this.allFire.node.onclick = function() {
            alert(22);
        }
    }

    FireControl.prototype.addSector = function(fireSector) {
        var tempWidth = fireSector.widthAngle / 2;
        var vertVOut = new Point(0, -this.radiusOut);
        var vertVIn = new Point(0, -this.radiusIn);

        var l_out = (4 / 3) * Math.tan(0.25 * fireSector.widthAngle) * this.radiusOut;
        var l_in = (4 / 3) * Math.tan(0.25 * fireSector.widthAngle) * this.radiusIn;
        //l = 30;

        var rightVOut = new Point((-vertVOut.y * Math.sin(tempWidth)),
                                 (vertVOut.y * Math.cos(tempWidth)));
        var leftVOut = new Point((vertVOut.y * Math.sin(tempWidth)),
                                 (vertVOut.y * Math.cos(tempWidth)));

        var rightVIn = new Point((-vertVIn.y * Math.sin(tempWidth)),
                                (vertVIn.y * Math.cos(tempWidth)));

        var leftVIn  = new Point((vertVIn.y * Math.sin(tempWidth)),
                                (vertVIn.y * Math.cos(tempWidth)));


        var p1out = mulScalVector(normVector(getPerpendicular(rightVOut)), l_out);
        var p2out = mulScalVector(normVector(getPerpendicular(leftVOut)), -l_out);

        var p1in = mulScalVector(normVector(getPerpendicular(rightVIn)), l_in);
        var p2in = mulScalVector(normVector(getPerpendicular(leftVIn)), -l_in);

        rightVOut = summVector(rightVOut, this.center);
        leftVOut = summVector(leftVOut, this.center);

        rightVIn = summVector(rightVIn, this.center);
        leftVIn = summVector(leftVIn, this.center);

        p1out = summVector(p1out, rightVOut);
        p2out = summVector(p2out, leftVOut);

        p1in = summVector(p1in, rightVIn);
        p2in = summVector(p2in, leftVIn);


        var pathstr = 'M'+ rightVIn.x + ',' + rightVIn.y +
            'L'+ rightVOut.x + ',' + rightVOut.y +
            'C' + p1out.x + ',' + p1out.y + ',' + p2out.x +','+ p2out.y + ','+ leftVOut.x+','+leftVOut.y +
            'L'+ leftVIn.x + ',' + leftVIn.y +
            'C' + p2in.x + ',' + p2in.y + ',' + p1in.x +','+ p1in.y + ','+ rightVIn.x+','+rightVIn.y +
            'Z';

        var sector = this.paper.path(pathstr);

        sector.rotate(radToGrad(fireSector.directionAngle + this.options.rotateAngle), this.center.x, this.center.y);

        $(sector.node).attr('class', 'fire-control-sector');

    }

    FireControl.prototype.setRotate = function(angle) {
        var center = this.center;
        var tempAngle = angle - this.options.rotateAngle;
        this.options.rotateAngle = angle;
        this.paper.forEach(function (el) {
                el.rotate(radToGrad(tempAngle), center.x, center.y);
            });

    }


    return FireControl;
})();

function getPerpendicular(aPoint) {
    return new Point(aPoint.y, -aPoint.x);
}
