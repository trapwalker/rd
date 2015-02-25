/*

 */

var WRadialGridScaled = (function (_super) {
    __extends(WRadialGridScaled, _super);

    function WRadialGridScaled(car) {
        _super.call(this, [car]);
        this.car = car;
        this.marker = null; // это непосредственно маркер, в котором будет свг-иконка
        this.elem_zoom = []; // элементы, зависящие от зума, которые нужно перерисовывать

        this.init_marker();

        this.change(clock.getCurrentTime());
    }

    WRadialGridScaled.prototype.init_marker = function(t){
        var max_circles = 6; // кол-во кругов сетки
        var time = clock.getCurrentTime();
        var i = 0; // для циклов
        var position = this.car.getCurrentCoord(time);
        var sides = this.car.fireSidesMng.sides;
        var max_radius = Math.max(
            sides.front.sideRadius,
            sides.back.sideRadius,
            sides.left.sideRadius,
            sides.right.sideRadius);
        var size = max_radius + 200; // радиус квадрата (ДАДА!!!!)
        this.size_of_icon = size;
        this.max_circles = max_circles;
        this.max_radius = max_radius;

        this.zoom = map.getZoom();

        // создание иконки и маркера
        this.div_id = 'WFireRadialGrid' + (-generator_ID.getID());
        var myIcon = L.divIcon({
            className: 'my-effect-icon',
            iconSize: [2 * size, 2 * size],
            iconAnchor: [size, size],   // todo: возможно здесь от каждой координаты -1, так как начинается иконка с 0
            html: '<div id="' + this.div_id + '" style="width: 100%; height: 100%"></div>'
        });

        this.marker = L.marker(myMap.unproject([position.x, position.y], map.getMaxZoom()),
            {
                icon: myIcon,
                zIndexOffset: 10,
                clickable: false,
                keyboard: false
            });

        map.addLayer(this.marker);

        // работа с SVG
        var draw = SVG(this.div_id);
        this.draw = draw;

        // группа: для вращения
        var g = draw.group();
        this.g = g;
        // после инициализации SVG можно задать все параметры: цвеат, градиенты и тд
        this._init_svg_parametrs();

        this.circles = [];
        this.def_radius = [];
        // Добавление радиальных кружков, уменьшая радиус
        for (i = 1; i <= max_circles; i++) {
            var r = max_radius * i / max_circles;
            this.def_radius.push(r);
            var c = g.circle(0.0).radius(r)
                .center(size, size)
                .fill(this.svg_params.circles.fill)
                .stroke({
                    stroke: this.svg_params.circles.stroke_width,
                    color: this.svg_params.circles.stroke_color,
                    opacity: this.svg_params.circles.stroke_opacity
                });
            this.circles.push({
                    radius: r,
                    circle: c
                }
            );
        }


    };

    WRadialGridScaled.prototype._init_svg_parametrs = function () {
        var g = this.g;
        // основные цвета сетки
        this.svg_colors = {
            main: '#5f5'
        };

        var self = this;

        // необходимо для вывода текста перезарядки вдоль дуги
        var d_rech_darius = 35; // определяет дальность полоски перезарядки
        var d_rech_text_radius = 25; // определяет высоту текста относительно полоски перезарядки
        var radius = this.max_radius + d_rech_darius + d_rech_text_radius;
        var sp1 = summVector(rotateVector(new Point(radius, 0), - Math.PI /4.), new Point(this.size_of_icon, this.size_of_icon));
        var sp2 = summVector(rotateVector(new Point(radius, 0), Math.PI /4.), new Point(this.size_of_icon, this.size_of_icon));
        var text_rech_path = 'M ' + sp1.x + ' ' + sp1.y + 'A ' + radius + ' ' + radius + ' 0 0 1 ' + sp2.x + ' ' + sp2.y;
        // запомнить длину дуги, чтобы можно было центровать текст
        var path = g.path(text_rech_path);
        var lpath = path.length();
        path.remove();

        this.svg_params = {
            // настройка кругов
            circles: {
                // характеристики границ окружностей
                stroke: {width: 1, color: this.svg_colors.main, opacity: 0.4},
                stroke_width: 1,
                stroke_color: this.svg_colors.main,
                stroke_opacity: 0.4,
                // заливка кругов
                fill: 'transparent'
            },
            // настройка 45 градусных линий
            lines_45: {
                stroke: {
                    width: 1.0,
                    color: g.gradient('linear', function(stop) {
                        stop.at({ offset: 0, color: self.svg_colors.main , opacity: 0.0});
                        stop.at({ offset: 1, color: self.svg_colors.main , opacity: 0.65});
                    })
                },
                radial_fill: 'transparent'
            },
            // настройка расходящихся точек
            radial_point: {
                radius: 1.3,
                stroke: {width: 0},
                fill: {color: this.svg_colors.main, opacity: 1.0}
            },
            // настройка залповых секторов
            disc_sectors: {
                gradient: g.gradient('linear', function(stop) {
                    stop.at({ offset: 0, color: self.svg_colors.main, opacity: 0.0});
                    stop.at({ offset: 1, color: self.svg_colors.main, opacity: 0.2});
                }),
                norm_color: {color: this.svg_colors.main, opacity: 0.2},
                stroke: {width: 0}

            },
            // настройка бортов
            sides: {
                line_gradient: g.gradient('linear', function(stop) {
                    stop.at({ offset: 0, color: self.svg_colors.main, opacity: 0.0});
                    stop.at({ offset: 0.25, color: self.svg_colors.main, opacity: 0.0});
                    stop.at({ offset: 0.5, color: self.svg_colors.main, opacity: 0.2});
                    stop.at({ offset: 1, color: self.svg_colors.main, opacity: 0.6});
                }),
                rad_gradient: g.gradient('linear', function(stop) {
                    stop.at({ offset: 0, color: self.svg_colors.main, opacity: 0.6});
                    stop.at({ offset: 0.5, color: self.svg_colors.main, opacity: 0.0});
                }),
                width: 1.4,
                stroke_of_norm_line: {width: 1.4, color: this.svg_colors.main, opacity: 0.6},
                radial_fill: 'transparent'
            },

            // настройка автоматических секторов
            auto_sectors: {
                gradient_for_lines: g.gradient('linear', function(stop) {
                    stop.at({ offset: 0, color: self.svg_colors.main , opacity: 0.0});
                    stop.at({ offset: 1, color: self.svg_colors.main , opacity: 0.9});
                }),
                width_of_line: 1.4,
                radial_stroke: {width: 2, color: self.svg_colors.main},
                radial_fill: 'transparent',
                dash_array: '5, 5'
            },

            // настройка точек-зумматоров и текста к ним
            zoomators: {
                radius: 2,
                stroke: {width: 0},
                fill: {color: this.svg_colors.main, opacity: 1.0},
                text: {
                    font: {
                        family:   'Helvetica',
                        size:     10,
                        anchor:   'middle',
                        leading:  '1.5em'
                    },
                    fill: {color: this.svg_colors.main, opacity: 1}
                }
            },

            rechArea: {
                d_radius: d_rech_darius,
                text_path: text_rech_path,
                l_text_path: lpath,
                arc: {
                    stroke: {width: 1, color: this.svg_colors.main, opacity: 0.6},
                    fill: 'transparent'
                },
                rech_arc: {
                    stroke: {width: 3, color: this.svg_colors.main, opacity: 0.6},
                    fill: 'transparent'
                },
                rech_text: {
                    font: {
                        family:   'Helvetica',
                        size:     13,
                        anchor:   'start',
                        leading:  '1.5em'
                    },
                    fill: {color: this.svg_colors.main, opacity: 1},
                    tready: 'R E A D Y',
                    trech: 'L O A D I N G . . .'
                }
            }


        };

    };



    WRadialGridScaled.prototype.change = function(t){
        //console.log('WFireRadialGrid.prototype.change');
        var time = clock.getCurrentTime();
        var tempPoint = this.car.getCurrentCoord(time);
        var tempLatLng = map.unproject([tempPoint.x, tempPoint.y], map.getMaxZoom());
        // Установка угла для поворота иконки маркера
        var angle = this.car.getCurrentDirection(time);
        // Установка новых координат маркера);
        this.marker.setLatLng(tempLatLng);
        this.rotate(radToGrad(angle));
    };

    WRadialGridScaled.prototype.zoomStart = function(event){
        // todo: не берётся правильно зум! Хотя в евенте правильно выводится, будто евент меняется ПОСЛЕ
       // console.log('WRadialGridScaled.prototype.zoomStart', event);
       // var new_zoom = event.target._zoom;
       // console.log('new_zoom', event.target._zoom, '   ___ animateZoom = ', event.target._animateToZoom);
    };

    WRadialGridScaled.prototype.zoomEnd = function(event){
        //console.log('WRadialGridScaled.prototype.zoomEnd', event);
        this.zoom = map.getZoom();
    };

    WRadialGridScaled.prototype._testRadius = function (r, rlist) {
        var eps = 0.1;
        for (var i = 0; i < rlist.length; i++)
            if (Math.abs(rlist[i] - r) < eps)
                return true;
        return false;
    };


    WRadialGridScaled.prototype.setZoom = function(new_zoom){
        var rs = this.def_radius;
        var new_rs = [];
        var zoomAnimateTime = 300;
        var circles = this.circles;
        var last_zoom = this.zoom;
        var diff_zoom = new_zoom - last_zoom;
        var k_radius = Math.pow(2, diff_zoom);
        var g = this.g;

        this.zoom = new_zoom;

        if (diff_zoom == 0)
            console.error('Вызвано с неизменённым зумом! Ошибка!', new_zoom);

        // обработка старых кругов
        var indexes_remove_circles = [];
        for(var i = 0; i < circles.length; i++){
            var circle = circles[i].circle;
            var radius = circles[i].radius;
            var new_radius = radius * k_radius;
            if (this._testRadius(new_radius, rs)) {
                circle.animate(zoomAnimateTime).radius(new_radius);
                circles[i].radius = new_radius;
                new_rs.push(new_radius);
            }
            else {
                circle.animate(zoomAnimateTime).radius(new_radius).attr({opacity: 0}).after(function () {
                    this.remove();
                });
                indexes_remove_circles.push(i);
            }
        }

        while(indexes_remove_circles.circle)
                circles.splice(indexes_remove_circles.pop(), 1);

        // добавление новых кругов
        for(var i = 0; i < rs.length; i++){
            var rr = rs[i];
            if (! this._testRadius(rr, new_rs)){
                var c = g.circle(0.0).radius(rr / k_radius)
                    .center(this.size_of_icon, this.size_of_icon)
                    .fill(this.svg_params.circles.fill)
                    .stroke({
                        stroke: this.svg_params.circles.stroke_width,
                        color: this.svg_params.circles.stroke_color,
                        opacity: 0.0
                    });
                c.animate(zoomAnimateTime).stroke({opacity: this.svg_params.circles.stroke_opacity}).radius(rr);//.opacity(0.9).radius(rr);
                circles.push({
                    radius: rr,
                    circle: c
                });
            }
        }
    };

    WRadialGridScaled.prototype.rotate = function(angle_in_degrees){
        this.g.transform({rotation: angle_in_degrees, cx: this.size_of_icon, cy: this.size_of_icon});
    };

    WRadialGridScaled.prototype.delFromVisualManager = function () {
        //console.log('WFireRadialGrid.prototype.delFromVisualManager');
        this.car = null;
        map.removeLayer(this.marker);
        _super.prototype.delFromVisualManager.call(this);
    };

    return WRadialGridScaled;
})(VisualObject);

