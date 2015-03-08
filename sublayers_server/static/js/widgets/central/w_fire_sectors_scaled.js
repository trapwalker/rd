/*
 * Виджет для отрисовки центрального виджета стрельбы (сетки )
 * Ссылка на него находится в мап менеджере, так как при зумировании он должен исчезать
 */

var WFireSectorsScaled = (function (_super) {
    __extends(WFireSectorsScaled, _super);

    function WFireSectorsScaled(car) {
        _super.call(this, [car]);
        this.car = car;
        this.marker = null; // это непосредственно маркер, в котором будет свг-иконка
        this.sectors_groups = []; // секторы
        this.stroke_zoom_elements = [];
        this._visible = true;

        this.sectors_is_hide = false;

        this.init_marker();

        this._lastRotateAngle = 0.0;

        this.change(clock.getCurrentTime());
    }

    WFireSectorsScaled.prototype.init_marker = function(t){
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
        var size = max_radius + 75; // радиус квадрата (ДАДА!!!!)
        this.size_of_icon = size;
        this.max_circles = max_circles;
        this.max_radius = max_radius;
        this.zoom = map.getMaxZoom(); // начальный зум, относительно которого и построены все сектора

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
                zIndexOffset: -999,
                clickable: false,
                keyboard: false
            });

        map.addLayer(this.marker);

        // работа с SVG
        var draw = SVG(this.div_id);
        this.draw = draw;

        // группа: для вращения
        this.main_g = draw.group(); // главная группа
        this.rotate_g = this.main_g.group(); // группа для вращения
        this.zoom_g = this.rotate_g.group(); // группа для зумирования
        this.rech_g = this.rotate_g.group(); // группа для области перезарядки
        // после инициализации SVG можно задать все параметры: цвеат, градиенты и тд
        this._init_svg_parametrs();

        // вывод зоны речарджа
        this.rechAreas = {};
        this._drawRechargeArea('front');
        this._drawRechargeArea('back');
        this._drawRechargeArea('left');
        this._drawRechargeArea('right');

        // вывод секторов
        this._drawSectors();

        // todo: ввести флаг на анимацию для этого метода, и здесь передавать "без анимации"
        this.setZoom(map.getZoom());
    };

    WFireSectorsScaled.prototype._init_svg_parametrs = function () {
        var g = this.main_g;
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
                    stop.at({ offset: 0.33, color: self.svg_colors.main, opacity: 0.2});
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
                        family:   'MICRADI',
                        size:     11,
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

    WFireSectorsScaled.prototype._drawSectors = function(){
        // Подготовка для отрисовки секторов и бортов
        var first_radius = this.max_radius / this.max_circles;
        var second_radius = this.max_radius * 2/ this.max_circles;

        // Добавление залповых секторов (только сектора, без привязки к стронам)
        var sectors = this.car.fireSidesMng.getSectors('', true, false);
        for(i=0; i< sectors.length; i++){
            var sector = sectors[i];
            var sect_radius = sector.radius;
            var d_sect = this._drawOneSector(first_radius, sect_radius, sector.width, sector.direction,
                        this.svg_params.disc_sectors.gradient);
            var d_sect_obj = {
                g: d_sect,
                radius: sect_radius,
                visible: true
            };
            this.sectors_groups.push(d_sect_obj);

        }

        // Добавление автоматических секторов (только сектора, без привязки к стронам)
        var auto_sectors = this.car.fireSidesMng.getSectors('', false, true);
        for (i = 0; i < auto_sectors.length; i++) {
            var asector = auto_sectors[i];
            var asect_radius = asector.radius;
            var auto_sector = this._drawOneAutoSector(asect_radius, asector.width, asector.direction);
            var auto_sect_obj = {
                g: auto_sector,
                radius: asect_radius,
                visible: true
            };
            this.sectors_groups.push(auto_sect_obj);
            this.stroke_zoom_elements.push(auto_sector);
        }

        // todo: меньше какого радиуса рисовать или не рисовать эти зацепы.
        // Добавление бортов - просто линии, указывающие направление борта
        var side_elem = null;
        var side_obj = null;
        var sides = this.car.fireSidesMng.sides;
        var max_disch_radius = sides.front.sideDischargeRadius;
        var max_disch_width = sides.front.sideDischargeWidth;
        if (max_disch_radius > second_radius && max_disch_width > 0) {
            side_elem = this._drawOneSide(second_radius, max_disch_radius, max_disch_width, 0.0);
            side_obj = {
                g: side_elem,
                radius: max_disch_radius,
                visible: true
            };
            this.sectors_groups.push(side_obj);
            this.stroke_zoom_elements.push(side_elem);
        }


        max_disch_radius = sides.back.sideDischargeRadius;
        max_disch_width = sides.back.sideDischargeWidth;
        if (max_disch_radius > second_radius && max_disch_width > 0) {
            side_elem = this._drawOneSide(second_radius, max_disch_radius, max_disch_width, -Math.PI);
            side_obj = {
                g: side_elem,
                radius: max_disch_radius,
                visible: true
            };
            this.sectors_groups.push(side_obj);
            this.stroke_zoom_elements.push(side_elem);
        }

        max_disch_radius = sides.left.sideDischargeRadius;
        max_disch_width = sides.left.sideDischargeWidth;
        if (max_disch_radius > second_radius && max_disch_width > 0) {
            side_elem = this._drawOneSide(second_radius, max_disch_radius, max_disch_width, Math.PI / 2.);
            side_obj = {
                g: side_elem,
                radius: max_disch_radius,
                visible: true
            };
            this.sectors_groups.push(side_obj);
            this.stroke_zoom_elements.push(side_elem);
        }

        max_disch_radius = sides.right.sideDischargeRadius;
        max_disch_width = sides.right.sideDischargeWidth;
        if (max_disch_radius > second_radius && max_disch_width > 0) {
            side_elem = this._drawOneSide(second_radius, max_disch_radius, max_disch_width, -Math.PI / 2.);
            side_obj = {
                g: side_elem,
                radius: max_disch_radius,
                visible: true
            };
            this.sectors_groups.push(side_obj);
            this.stroke_zoom_elements.push(side_elem);
        }

    };

    WFireSectorsScaled.prototype._drawOneSector = function(minRadius, maxRadius, width, direction, fillColor){
        // todo: если ширина сектора больше 180, то: http://www.w3.org/TR/SVG/paths.html#PathData
        // Пример с красным кружком

        var size = this.size_of_icon;
        var g = this.zoom_g.group();
        var sp11 = rotateVector(new Point(minRadius, 0), width /2.);
        var sp12 = rotateVector(new Point(minRadius, 0), - width /2.);
        var sp21 = rotateVector(new Point(maxRadius, 0), width /2.);
        var sp22 = rotateVector(new Point(maxRadius, 0), - width /2.);
        var path_str =
            'M ' + sp11.x + ' ' + sp11.y +
            'L ' + sp21.x + ' ' + sp21.y +
            'A ' + maxRadius + ' ' + maxRadius + ' 0 0 0 ' + sp22.x + ' ' + sp22.y +
            'L ' + sp12.x + ' ' + sp12.y +
            'A ' + minRadius + ' ' + minRadius + ' 0 0 1 ' + sp11.x + ' ' + sp11.y +
            'Z';

        g.path(path_str)
            .dmove(size, size)
            .transform({rotation: radToGrad(direction), cx: size, cy: size})
            .stroke(this.svg_params.disc_sectors.stroke)
            .fill(fillColor);
        return g;
    };

    WFireSectorsScaled.prototype._drawOneSide = function(minRadius, maxRadius, width, direction){
        // todo: если ширина сектора больше 180, то: http://www.w3.org/TR/SVG/paths.html#PathData
        // Пример с красным кружком

        var size = this.size_of_icon;
        var g = this.zoom_g.group();

        var p0 = new Point(0, 0);
        var sp11 = rotateVector(new Point(minRadius, 0), width /2.);
        var sp12 = rotateVector(new Point(minRadius, 0), - width /2.);
        var sp21 = rotateVector(new Point(maxRadius, 0), width /2.);
        var sp22 = rotateVector(new Point(maxRadius, 0), - width /2.);

        g.line(p0.x, p0.y, sp11.x, sp11.y)
            .stroke({width: this.svg_params.sides.width, color: this.svg_params.sides.line_gradient});
        g.line(p0.x, p0.y, sp12.x, sp12.y)
            .stroke({width: this.svg_params.sides.width, color: this.svg_params.sides.line_gradient});
        g.line(sp11.x, sp11.y, sp21.x, sp21.y)
            .stroke(this.svg_params.sides.stroke_of_norm_line);
        g.line(sp12.x, sp12.y, sp22.x, sp22.y)
            .stroke(this.svg_params.sides.stroke_of_norm_line);

        // градиентная оконтовка окончания угла
        var path_str =
            'M ' + sp21.x + ' ' + sp21.y +
            'A ' + maxRadius + ' ' + maxRadius + ' 0 0 0 ' + sp22.x + ' ' + sp22.y;

        g.path(path_str)
            .stroke({width: this.svg_params.sides.width, color: this.svg_params.sides.rad_gradient})
            .fill(this.svg_params.sides.radial_fill);

        g.transform({rotation: radToGrad(direction), cx: size, cy: size});
        g.dmove(size, size);
        return g;

    };

    WFireSectorsScaled.prototype._drawOneAutoSector = function(radius, width, direction){
        // todo: если ширина сектора больше 180, то: http://www.w3.org/TR/SVG/paths.html#PathData
        // Пример с красным кружком

        var size = this.size_of_icon;
        var g = this.zoom_g.group();
        var diffrent = 30.0; // todo: сделать зависимость от зума и размера этих зацепов
        var sp11 = rotateVector(new Point(radius - diffrent, 0), width /2.);
        var sp12 = rotateVector(new Point(radius - diffrent, 0), - width /2.);
        var sp21 = rotateVector(new Point(radius, 0), width /2.);
        var sp22 = rotateVector(new Point(radius, 0), - width /2.);

        g.line(sp11.x, sp11.y, sp21.x, sp21.y)
            .stroke({width: this.svg_params.auto_sectors.width_of_line,
                color: this.svg_params.auto_sectors.gradient_for_lines
            });
        //.attr('stroke-dasharray', this.svg_params.auto_sectors.dash_array);;
        g.line(sp12.x, sp12.y, sp22.x, sp22.y)
            .stroke({width: this.svg_params.auto_sectors.width_of_line,
                color: this.svg_params.auto_sectors.gradient_for_lines
            });
        //.attr('stroke-dasharray', this.svg_params.auto_sectors.dash_array);;

        // дуга
        var path_str =
            'M ' + sp21.x + ' ' + sp21.y +
            'A ' + radius + ' ' + radius + ' 0 0 0 ' + sp22.x + ' ' + sp22.y;

        g.path(path_str)
            .stroke(this.svg_params.auto_sectors.radial_stroke)
            .fill(this.svg_params.auto_sectors.radial_fill)
            .attr('stroke-dasharray', this.svg_params.auto_sectors.dash_array);

        g.transform({rotation: radToGrad(direction), cx: size, cy: size});
        g.dmove(size, size);
        return g;
    };

    WFireSectorsScaled.prototype._drawZoomatorsText = function(){
        // текст относится к группе и вертится вместе с ней
        if (this.zoomatorsText.length > 0 ) console.error('не удалён старый текст!!!!');
        var max_circles = this.max_circles;
        var points = this.zoomatorsPoints;
        var angle_of_car = radToGrad(this.car.getCurrentDirection(clock.getCurrentTime()));
        var g = this.g;
        var scale_map = Math.pow(2., map.getMaxZoom() - map.getZoom()); // учёт зуммирования
        for (var i = 0; i < max_circles; i++) {
            var p = points[i];
            var digit_str = (Math.round((i+1) * scale_map)).toString();
            var text = g.text(digit_str)
                .font(this.svg_params.zoomators.text.font)
                .fill(this.svg_params.zoomators.text.fill)
                .dmove(p.x, p.y-25)
                .transform({rotation: -angle_of_car, cx: p.x, cy: p.y});
            this.zoomatorsText.push(text);
        }

    };

    WFireSectorsScaled.prototype._drawZoomatorsText2 = function(){
        // текст относится к draw и НЕ вертится вместе с гуппой, а просто перемещается на нужную точку
        if (this.zoomatorsText.length > 0 ) console.error('не удалён старый текст!!!!');
        var max_circles = this.max_circles;
        var points = this.zoomatorsPoints;
        var angle_of_car = radToGrad(this.car.getCurrentDirection(clock.getCurrentTime()));
        var g = this.draw;
        var scale_map = Math.pow(2., map.getMaxZoom() - map.getZoom()); // учёт зуммирования
        for (var i = 0; i < max_circles; i++) {
            var p = points[i];
            var digit_str = (Math.round((i+1) * scale_map)).toString();
            var text = g.text(digit_str)
                .font(this.svg_params.zoomators.text.font)
                .fill(this.svg_params.zoomators.text.fill)
                .dmove(p.x, p.y-25);
            this.zoomatorsText.push(text);
        }

    };

    WFireSectorsScaled.prototype._drawRechargeArea = function(side_str){
        var side = this.car.fireSidesMng.sides[side_str];
        var width = side.sideDischargeWidth;
        if (width <= 0) return;
        var g = this.rech_g.group();
        var direction = side.direction;
        var size = this.size_of_icon;
        var radius = this.max_radius + this.svg_params.rechArea.d_radius;
        var sp1 = rotateVector(new Point(radius, 0), width /2.);
        var sp2 = rotateVector(new Point(radius, 0), - width /2.);

        // дуга 1, которая без перезарядки
        var path_str =
            'M ' + sp1.x + ' ' + sp1.y +
            'A ' + radius + ' ' + radius + ' 0 0 0 ' + sp2.x + ' ' + sp2.y;

        g.path(path_str)
            .stroke(this.svg_params.rechArea.arc.stroke)
            .fill(this.svg_params.rechArea.arc.fill)
            .transform({rotation: radToGrad(direction), cx: size, cy: size})
            .dmove(size, size);

        // дуга 2, с перезарядкой. Сохранить её в объект
        var rech = g.path(path_str)
            .stroke(this.svg_params.rechArea.rech_arc.stroke)
            .fill(this.svg_params.rechArea.rech_arc.fill)
            .transform({rotation: radToGrad(direction), cx: size, cy: size})
            .dmove(size, size)
            .attr('stroke-linecap', 'round');

        // вывод текста по дуге
        var text = g.text(this.svg_params.rechArea.rech_text.tready);
        text
            .font(this.svg_params.rechArea.rech_text.font)
            .fill(this.svg_params.rechArea.rech_text.fill)
            .transform({rotation: radToGrad(direction), cx: size, cy: size})
            .path(this.svg_params.rechArea.text_path);
        text.textPath.attr('startOffset', 0.5 * (this.svg_params.rechArea.l_text_path - text.length())/ this.svg_params.rechArea.l_text_path);

        this.rechAreas[side_str] = {
            rech_arc: rech,
            g: g,
            width: width,
            rech_text: text,
            rech_flag: false,
            rech_prc: 1,
            visible: true
            // todo: добавить сюда ссылку на текст времени в секундах
        }
    };

    WFireSectorsScaled.prototype._recharging = function(options){
        // todo: считать время как входной параметр (просто считывать из options.time)
        var prc = options.prc;
        var side_str = options.side_str;
        if (! this.rechAreas[side_str]) return; // если такой стороны нет в данном виджете
        var side = this.rechAreas[side_str];
        if (Math.abs(prc - side.rech_prc) < 0.005 && prc < 1.) return; // если не было изменений более чем на пол процента
        side.rech_prc = prc;
        if(prc < 1.) { // если ещё перезарядка
            if(! side.rech_flag){ // если до этого не перезаряжались, то установить текст перезарядки
                this._setRechText(side_str, this.svg_params.rechArea.rech_text.trech);
                side.rech_flag = true;
            }
            // заполнить линию перезарядки, пересчитая path
            var width = side.width;
            var radius = this.max_radius + this.svg_params.rechArea.d_radius;
            var sp1 = rotateVector(new Point(radius, 0), - width /2. + width * prc);
            var sp2 = rotateVector(new Point(radius, 0), - width /2. );

            // дуга перезарядки
            var path_str =
                'M ' + sp1.x + ' ' + sp1.y +
                'A ' + radius + ' ' + radius + ' 0 0 0 ' + sp2.x + ' ' + sp2.y;
            side.rech_arc.plot(path_str).dmove(this.size_of_icon, this.size_of_icon);

        }
        else{ // если мы уже перезаряжены
            if(side.rech_flag){ // если мы были в перезарядке, но перезарядились
                this._setRechText(side_str, this.svg_params.rechArea.rech_text.tready);
                side.rech_flag = false;

                // заполнить линию перезарядки, пересчитая path
                var width = side.width;
                var radius = this.max_radius + this.svg_params.rechArea.d_radius;
                var sp1 = rotateVector(new Point(radius, 0), width /2.);
                var sp2 = rotateVector(new Point(radius, 0), - width /2.);

                // дуга перезарядки
                var path_str =
                    'M ' + sp1.x + ' ' + sp1.y +
                    'A ' + radius + ' ' + radius + ' 0 0 0 ' + sp2.x + ' ' + sp2.y;
                side.rech_arc.plot(path_str).dmove(this.size_of_icon, this.size_of_icon);
            }
        }
    };

    WFireSectorsScaled.prototype._setRechText = function(side_str, rech_text){
        // todo: передать сюда ещё текст времени, чтобы обнулить его (сделать равным  "")
        var text = this.rechAreas[side_str].rech_text;
        text.text(rech_text);
        text.textPath.attr('startOffset', 0.5 * (this.svg_params.rechArea.l_text_path - text.length())/ this.svg_params.rechArea.l_text_path);
    };

    WFireSectorsScaled.prototype.change = function(t){
        //console.log('WFireRadialGrid.prototype.change');


        var time = clock.getCurrentTime();
        var tempPoint = this.car.getCurrentCoord(time);
        var tempLatLng = map.unproject([tempPoint.x, tempPoint.y], map.getMaxZoom());
        // Установка угла для поворота иконки маркера
        var angle = this.car.getCurrentDirection(time);
        // Установка новых координат маркера или просто обновление угла;
        if (!mapManager.inZoomChange)
            this.marker.setLatLng(tempLatLng);
        else
            this.marker.update();

        this.rotate(radToGrad(angle));

        // запрос и установка перезарядки для каждой из сторон
        var options = this.car.fireSidesMng.getRechargeStates(t);
        for(var i = 0; i < options.length; i++)
            this._recharging(options[i]);
    };

    WFireSectorsScaled.prototype.setZoom = function(new_zoom){
        var zoomAnimateTime = ConstDurationAnimation;
        var size = this.size_of_icon;
        //var diff_zoom = new_zoom - last_zoom;
        var diff_zoom = new_zoom - this.zoom;
        var k_radius = Math.pow(2, diff_zoom);
        var g = this.zoom_g;
        var scale_center = size - size * k_radius;

        // анимация изменения размера секторов
        var matrix_str = k_radius + ", 0, 0, " + k_radius + ", "+ (scale_center) + ", "+ (scale_center);
        g.animate(zoomAnimateTime).transform({matrix: matrix_str});

        // анимация изменения толщины линий
        for(var i = 0; i < this.stroke_zoom_elements.length; i++) {
            var elem = this.stroke_zoom_elements[i];
            var elem_childs = elem.children();
            for (var y = 0; y < elem_childs.length; y++){
                var child = elem_childs[y];
                //var str_w = child.attr('stroke-width');
                //console.log(str_w / k_radius);
                //console.log(child.attr('id'));
                // todo: где-то сохранить оригинальное значение stroke (например с помощью child.attr('id')), чтобы здесь с ним работать
                child.animate(zoomAnimateTime).stroke({width:  1.4 / k_radius});
            }

        }


        // анимация скрывания и показывания секторов при маленьком размере их радиуса
        for(var j = 0; j < this.sectors_groups.length; j++){
            var sect_g = this.sectors_groups[j].g;
            var sect_r = this.sectors_groups[j].radius;
            var sect_v = this.sectors_groups[j].visible;
            if (sect_r * k_radius < 30 && sect_v) { // если меньше и видмый, то скрыть
                sect_g.animate(zoomAnimateTime).opacity(0);
                this.sectors_groups[j].visible = false;
            }
            if (sect_r * k_radius > 30 && !sect_v) { // если больше 30 и не видимый, то показать
                sect_g.animate(zoomAnimateTime).opacity(1);
                this.sectors_groups[j].visible = true;
            }
        }

        // скрываем и показываем зоны перезарядки
        var sides = this.car.fireSidesMng.sides;
        //var max_disch_radius = sides.front.sideDischargeRadius;
        for (var key in sides)
            if (sides.hasOwnProperty(key) && this.rechAreas[key]) {
                var side_r = sides[key].sideDischargeRadius;
                var side_v = this.rechAreas[key].visible;
                if (side_r * k_radius < 30 && sect_v) { // если меньше и видмый, то скрыть
                    this.rechAreas[key].g.animate(zoomAnimateTime).opacity(0);
                    this.rechAreas[key].visible = false;
                }
                if (side_r * k_radius > 30 && !sect_v) { // если больше 30 и не видимый, то показать
                    this.rechAreas[key].g.animate(zoomAnimateTime).opacity(1);
                    this.rechAreas[key].visible = true;
                }
            }

    };

    WFireSectorsScaled.prototype.rotate = function(angle_in_degrees){
        if (Math.abs(this._lastRotateAngle - angle_in_degrees) > 0.1) {
            this.rotate_g.transform({rotation: angle_in_degrees, cx: this.size_of_icon, cy: this.size_of_icon});
            //this._rotateZoomatorsText(angle_in_degrees);
            this._lastRotateAngle = angle_in_degrees;
        }
    };

    WFireSectorsScaled.prototype.setVisible = function (visible) {
        if (this._visible != visible){
            this._visible = visible;
            if (visible){
                // показать
                //console.log('показать сектора');
                this.main_g.animate(500).opacity(1);
            }
            else {
                // скрыть
                //console.log('скрыть сектора');
                this.main_g.animate(500).opacity(0);
            }
        }

    };

    WFireSectorsScaled.prototype.delFromVisualManager = function () {
        //console.log('WFireRadialGrid.prototype.delFromVisualManager');
        this.car = null;
        map.removeLayer(this.marker);
        _super.prototype.delFromVisualManager.call(this);
    };

    return WFireSectorsScaled;
})(VisualObject);
