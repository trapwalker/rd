(function (window) {
    "use strict";
    if (typeof window.slippymap === 'undefined') {
        var slippymap = function (options) {
            var $, map, defaults, property;
            $ = window;
            defaults = {
                div: "map",
                fullscreen : true,
                zoom: 1,
                lon: 0,
                lat: 0,
                tileproviders: [
                    // Слои карты. Отрисовка начинается с нулевого слоя. Здесь очень важен порядок!
                    {
                        name: "base",
                        url: function (x, y, z) {
                            return "http://185.58.205.29/map/" + z + "/" + x + "/" + y + ".jpg";
                        },
                        alpha: 1.0,
                    },
                    // Другие слои карты.
                    //{
                    //    name: "osm",
                    //    url: function (x, y, z) {
                    //        var rand, sub, url;
                    //        rand = function (n) {
                    //            return $.Math.floor($.Math.random() * n);
                    //        };
                    //        sub = ["a", "b", "c"];
                    //        url = "http://" + sub[rand(3)] + ".tile.openstreetmap.org/" + z + "/" + x + "/" + y + ".png";
                    //        return url;
                    //    },
                    //    alpha: 0.5,
                    //}
                ],
                zMin: 0,
                zMax: 18,
                cacheValues: true,
                preloadMargin: 0,
                loadCompleteCB: null
            };
            /* merge defaults and options */
            if (typeof options === "object") {
                for (property in defaults) {
                    if (defaults.hasOwnProperty(property)) {
                        if (typeof options[property] !== "undefined") {
                            defaults[property] = options[property];
                        }
                    }
                }
            }
            options = defaults;
            map = {
                tileproviders: options.tileproviders,
                cache: {},
                cacheValues: options.cacheValues,
                preloadMargin: options.preloadMargin,
                zMin : options.zMin,
                zMax : options.zMax,
                maxImageLoadingCount : 30,
                init: function () {
                    var coords;
                    if ($.document.getElementById(options.div)) {
                        map.renderer.canvas = $.document.getElementById(options.div);
                        if (options.fullscreen === true) {
                            map.renderer.canvas.width = $.innerWidth;
                            map.renderer.canvas.height = $.innerHeight;
                        }
                        map.renderer.context = map.renderer.canvas.getContext("2d");

                        map.renderer.context_size.canvas_w = map.renderer.canvas.width - map.renderer.canvas.width % 2;
                        map.renderer.context_size.canvas_h = map.renderer.canvas.height - map.renderer.canvas.height % 2;

                        map.events.init();
                    } else {
                        $.slippymap.debug("canvas not found");
                    }
                },
                /* events */
                events: {
                    init: function () {}
                },
                /* renderer */
                renderer: {
                    canvas: {},
                    context: {},
                    context_size: {
                        canvas_w: 0,
                        canvas_h: 0
                    },
                    viewports: {}, // key = zoom, value = viewport
                    load_queue: [],
                    tiles: [],
                    tilesize: 256,
                    refresh_load_called: false,
                    load_tiles_complete: false,
                    loadingCue : 0,
                    drawImage : function (image, dx, dy) {
                        try {
                            map.renderer.context.drawImage(
                                image,
                                dx,
                                dy
                            );

                            return true;
                        } catch (e) {
                            return false;
                        }
                    },
                    loadImage : function (id, x, y, z, tileprovider) {
                        var pr_name = tileprovider.name;
                        if (typeof map.renderer.tiles[pr_name] === 'undefined')
                            map.renderer.tiles[pr_name] = [];
                        if (map.renderer.tiles[pr_name][id] && map.renderer.tiles[pr_name][id].complete) {
                            map.renderer.next_load_tile();
                            return;
                        }
                        map.renderer.loadingCue = map.renderer.loadingCue + 1;
                        map.renderer.tiles[pr_name][id] = new $.Image();
                        map.renderer.tiles[pr_name][id].src = tileprovider.url(x, y, z, id);
                        map.renderer.tiles[pr_name][id].onload = function () {
	                        map.renderer.loadingCue = map.renderer.loadingCue - 1;
                            map.renderer.next_load_tile();
                        };
                        map.renderer.tiles[pr_name][id].onerror = function () {
	                        map.renderer.loadingCue = map.renderer.loadingCue - 1;
                            this.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
                            this.onload = function () {};
                            map.renderer.next_load_tile();
                        };

                        map.renderer.tiles[pr_name][id].slippy_coord = {x: x, y: y, z: z};  // Для правильной работы чистильщика старых тайлов по viewport
                    },
                    refresh_load_async: function () {
                        if (map.renderer.refresh_load_called) return;
                        map.renderer.refresh_load_called = true;
                        setTimeout(function () {
                            map.renderer.refresh_load();
                            map.renderer.refresh_load_called = false;
                        }, 0);
                    },
                    refresh_load : function() {
                        var current_x = map.position.x;
                        var current_y = map.position.y;
                        var viewports = map.renderer.viewports;
                        for (var i = map.zMin; i <= map.zMax; i++) // Если неободимо создать новый вьювпорт для загрузки тайлов
                            if (!viewports.hasOwnProperty(i) || Math.abs(viewports[i].x - current_x) > viewports[i].sz || Math.abs(viewports[i].y - current_y) > viewports[i].sz)
                                viewports[i] = map.viewport_by_zoom(i, true);

                        // формирование очереди загрузки тайлов
                        map.renderer.load_queue = [];
                        var zi = $.Math.ceil(map.position.z);
                        map.renderer.add_zoom_to_queue(zi);
                        for (var i = 1; i <= map.zMax - map.zMin; i++) {
                            if (zi + i <= map.zMax) map.renderer.add_zoom_to_queue(zi + i);
                            if (zi - i >= map.zMin) map.renderer.add_zoom_to_queue(zi - i);
                        }

                        // начать грузить тайлы
                        for (var i = 0; i < map.maxImageLoadingCount; i++)
                            map.renderer.next_load_tile();

                        // почистить старые тайлы
                        map.renderer.garbage();
                    },
                    add_zoom_to_queue: function (zoom) {
                        var viewport = map.renderer.viewports[zoom];
                        var encodeIndex = map.renderer.encodeIndex;
                        var tileproviders = map.tileproviders;
                        for (var x = viewport.x_tile_min; x <= viewport.x_tile_max; x++)
                            for (var y = viewport.y_tile_min; y <= viewport.y_tile_max; y++)
                                for (var prov_index = 0; prov_index < tileproviders.length; prov_index++)
                                    map.renderer.load_queue.push({
                                        x: x,
                                        y: y,
                                        z: zoom,
                                        id: encodeIndex(x, y, zoom),
                                        tileprovider: tileproviders[prov_index]
                                    });
                    },
                    next_load_tile: function () {
                        var tileLoading = map.renderer.load_queue.shift();
                        if (tileLoading)
                            map.renderer.loadImage(
                                tileLoading.id,
                                tileLoading.x,
                                tileLoading.y,
                                tileLoading.z,
                                tileLoading.tileprovider
                            );
                        else
                            if (!map.renderer.load_tiles_complete) {
                                map.renderer.load_tiles_complete = true;
                                if (typeof options.loadCompleteCB === "function")
                                    options.loadCompleteCB();
                            }
                    },
                    encodeIndex: function (x, y, z) {
                        return x + "-" + y + "-" + z;
                    },
                    dencodeIndex: function (index) {
                        var ll = index.split("-");
                        return {x: ll[0], y: ll[1], z: ll[2]};
                    },
                    layers: [
                        { /* repaint canvas */
                            id: 'tiles',
                            callback: function (viewport) {
                                var maxTileNumber, tileDone, x, y, xoff, yoff, tileKey, encodeIndex;
                                encodeIndex = map.renderer.encodeIndex;
                                maxTileNumber = map.pow(2, viewport.zi) - 1;
                                var old_global_alpha = map.renderer.context.globalAlpha;
                                for (var prov_index = 0; prov_index < map.tileproviders.length; prov_index++) {
                                    map.renderer.context.globalAlpha = map.tileproviders[prov_index].alpha;
                                    var pr_name = map.tileproviders[prov_index].name;
                                    var current_tiles = map.renderer.tiles[pr_name] || {};
                                    tileDone = []; // todo: возможно убрать данный массив. Но если мы хотим рисовать правильно заглушки, то нельзя убирать.
                                    for (x = viewport.x_tile_min; x < viewport.x_tile_max; x++) {
                                        tileDone[x] = [];
                                        xoff = (((x * viewport.sz - viewport.xMin) / viewport.zp)) - viewport.offsetX;
                                        //xoff = Math.floor(xoff);
                                        for (y = viewport.y_tile_min; y < viewport.y_tile_max; y = y + 1) {
                                            yoff = (((y * viewport.sz - viewport.yMin) / viewport.zp)) - viewport.offsetY;
                                            //yoff = Math.floor(yoff);
                                            tileKey = encodeIndex(x, y, viewport.zi);
                                            tileDone[tileKey] = false;
                                            if (x > maxTileNumber || y > maxTileNumber || x < 0 || y < 0) {
                                                tileDone[tileKey] = true;
                                            } else {
                                                if (current_tiles[tileKey] && current_tiles[tileKey].complete) {
                                                    // draw tile
                                                    if (map.renderer.drawImage(
                                                            current_tiles[tileKey],
                                                            xoff,
                                                            yoff
                                                        )) {
                                                    }
                                                    tileDone[tileKey] = true;
                                                }
                                                else {
                                                    // Тайла нет. Отрисовать заглушку или ничего
                                                }
                                            }
                                        }
                                    }
                                }
                                map.renderer.context.globalAlpha = old_global_alpha;
                            }
                        },
                        { /* repaint canvas - grid */
                            id: 'grid',
                            callback: function (viewport) {
                                var t, x, y, xoff, yoff;
                                var view_width = viewport.w;
                                var view_height = viewport.h;
                                var ctx = map.renderer.context;
                                ctx.save();
                                ctx.strokeStyle = "#0e4b00";

                                for (x = viewport.x_tile_min; x < viewport.x_tile_max; x++) {
                                    xoff = (((x * viewport.sz - viewport.xMin) / viewport.zp)) - viewport.offsetX;
                                    //xoff = Math.floor(xoff);
                                    ctx.lineWidth = 2;
                                    ctx.beginPath();
                                    ctx.moveTo(xoff, 0);
                                    ctx.lineTo(xoff, view_height);
                                    ctx.stroke();
                                    if (viewport.zf > 0.6 && viewport.zf <= 1.0) {
                                        ctx.save();
                                        ctx.globalAlpha = 1 - (1 - viewport.zf) / 0.4;
                                        xoff += viewport.sz / (2 * viewport.zp);
                                        ctx.lineWidth = 1;
                                        ctx.beginPath();
                                        ctx.moveTo(xoff, 0);
                                        ctx.lineTo(xoff, view_height);
                                        ctx.stroke();
                                        ctx.restore();
                                    }
                                }

                                for (y = viewport.y_tile_min; y < viewport.y_tile_max; y++) {
                                    yoff = (((y * viewport.sz - viewport.yMin) / viewport.zp)) - viewport.offsetY;
                                    //yoff = Math.floor(yoff);
                                    ctx.lineWidth = 2;
                                    ctx.beginPath();
                                    ctx.moveTo(0, yoff);
                                    ctx.lineTo(view_width, yoff);
                                    ctx.stroke();
                                    if (viewport.zf > 0.6 && viewport.zf <= 1.0) {
                                        ctx.save();
                                        ctx.globalAlpha = 1 - (1 - viewport.zf) / 0.4;
                                        yoff += viewport.sz / (2 * viewport.zp);
                                        ctx.lineWidth = 1;
                                        ctx.beginPath();
                                        ctx.moveTo(0, yoff);
                                        ctx.lineTo(view_width, yoff);
                                        ctx.stroke();
                                        ctx.restore();
                                    }
                                }

                                ctx.restore();
                            }
                        }
                    ],
                    refresh: function () {
                        var viewport = map.viewport();
                        var ctx = map.renderer.context;
                        ctx.save();
                        ctx.clearRect(0, 0, viewport.w, viewport.h);
                        ctx.scale(viewport.zf, viewport.zf);
                        map.renderer.layers[0].callback(viewport);
                        map.renderer.layers[1].callback(viewport);

                        ctx.restore();

                        ctx.textAlign = "left";
                        ctx.textBaseline = "center";
                        ctx.font = "22pt MICRADI";
                        ctx.fillStyle = 'rgba(42, 253, 10, 0.6)';
                        ctx.fillText(viewport.zoom.toFixed(2) + " / " + viewport.zf.toFixed(2), 100, 100);
                        ctx.fillText("Load Queue : " + map.renderer.load_queue.length, 100, 130);
                    },
                    garbage: function () {
                        var viewports = map.renderer.viewports;
                        for (var key_base in map.renderer.tiles)
                            if (map.renderer.tiles.hasOwnProperty(key_base))
                                for (var key in map.renderer.tiles[key_base])
                                    if (map.renderer.tiles[key_base].hasOwnProperty(key)) {
                                        var img_coord = map.renderer.tiles[key_base][key].slippy_coord;
                                        if (img_coord.x < viewports[img_coord.z].x_tile_min || img_coord.x > viewports[img_coord.z].x_tile_max ||
                                            img_coord.y < viewports[img_coord.z].y_tile_min || img_coord.y > viewports[img_coord.z].y_tile_max) {
                                            delete map.renderer.tiles[key_base][key];
                                            //console.log(key + " deleted");
                                        }
                                    }
                    }
                },
                viewport: function () {
                    if (map.cacheValues && map.cache.viewport &&
                            map.cache.viewport.x === map.position.x  &&
                            map.cache.viewport.y === map.position.y  &&
                            map.cache.viewport.zoom === map.position.z  &&
                            map.cache.viewport.width === map.renderer.canvas.width &&
                            map.cache.viewport.height === map.renderer.canvas.height) {
                        return map.cache.viewport;
                    }
                    map.cache.viewport = map.viewport_by_zoom(map.position.z);
                    return map.cache.viewport;
                },
                viewport_by_zoom: function (zoom, preload_type) {
                    var viewport = {};

                    viewport.x = map.position.x;
                    viewport.y = map.position.y;
                    viewport.width =  map.renderer.canvas.width;
                    viewport.height =  map.renderer.canvas.height;
                    viewport.zoom = zoom;

                    viewport.zi = Math.ceil(zoom);  // Целое число зума. Без округлений
                    if (preload_type)
                        viewport.zf = 0.5; // Худший случай для предзагрузки максимально количества тайлов
                    else
                        viewport.zf = 1. / (1 + viewport.zi - map.position.z);  // коэффициент зума от целого зума + 1: 17.5 => 1.5
                    viewport.zp = map.pow(2, map.zMax - viewport.zi);  // Коэффициент зумирования для целого зума
                    viewport.w = map.renderer.context_size.canvas_w * viewport.zp / viewport.zf;  // Размер полотна в пикселях максимального зума
                    viewport.h = map.renderer.context_size.canvas_h * viewport.zp / viewport.zf;  // Размер полотна в пикселях максимального зума
                    viewport.sz = map.renderer.tilesize * viewport.zp; // Размер тайла текущего округлённого зума в пикселях максимального зума
                    viewport.tilesize = map.renderer.tilesize;  // Размер тайла текущего зума в пикселях максимального зума
                    viewport.xMin = (map.position.x - viewport.w / 2); // Прямоугольник отображения в пикселах на максимальном зуме
                    viewport.yMin = (map.position.y - viewport.h / 2); // Прямоугольник отображения в пикселах на максимальном зуме
                    viewport.xMax = (map.position.x + viewport.w / 2); // Прямоугольник отображения в пикселах на максимальном зуме
                    viewport.yMax = (map.position.y + viewport.h / 2); // Прямоугольник отображения в пикселах на максимальном зуме
                    viewport.offsetX = 0; //(canvas_w / 2) * ((1 - viewport.zf) ); // Сдвиг начала канваса, чтобы центр остался в центре!
                    viewport.offsetY = 0; //(canvas_h / 2) * ((1 - viewport.zf) );

                    viewport.x_tile_min = $.Math.floor(viewport.xMin / viewport.sz) - map.preloadMargin; // Прямоугольник номеров тайлов для текущего viewport
                    viewport.x_tile_max = $.Math.ceil(viewport.xMax / viewport.sz) + map.preloadMargin;
                    viewport.y_tile_min = $.Math.floor(viewport.yMin / viewport.sz) - map.preloadMargin;
                    viewport.y_tile_max = $.Math.ceil(viewport.yMax / viewport.sz) + map.preloadMargin;

                    return viewport;
                },
                /* positioning, conversion between pixel + lon/lat */
                position: {
                    is_init: false,
                    setX: function (x) {
                        map.position.x = x;
                        if (map.position.is_init) map.renderer.refresh_load_async();
                        return map.position.x;
                    },
                    setY: function (y) {
                        map.position.y = y;
                        if (map.position.is_init) map.renderer.refresh_load_async();
                        return map.position.y;
                    },
                    setZ: function (z) {
                        var old_zi = $.Math.ceil(map.position.z);
                        var new_zi = $.Math.ceil(z);
                        map.position.z = z;
                        if (map.position.is_init && old_zi != new_zi) map.renderer.refresh_load_async();
                        return map.position.z;
                    },
                    center: function (coords, need_load) {
                        if (typeof coords === 'undefined') {
                            return {
                                x: map.position.x,
                                y: map.position.y,
                                z: map.position.z
                            };
                        }
                        map.position.setZ(coords.z);
                        map.position.setX(coords.x);
                        map.position.setY(coords.y);

                    },
                    lat2posY: function (lat) {
                        return map.pow(2, map.zMax) * map.renderer.tilesize * (1 - $.Math.log($.Math.tan(lat * $.Math.PI / 180) + 1 / $.Math.cos(lat * $.Math.PI / 180)) / $.Math.PI) / 2;
                    },
                    lon2posX: function (lon) {
                        return map.pow(2, map.zMax) * map.renderer.tilesize * (lon + 180) / 360;
                    },
                    tile2lon: function (x, z) {
                        if (typeof z === 'undefined') {
                            z = map.position.z;
                        }
                        return (x / map.pow(2, z) * 360 - 180);
                    },
                    tile2lat: function (y, z) {
                        var n;
                        if (typeof z === 'undefined') {
                            z = map.position.z;
                        }
                        n = $.Math.PI - 2 * $.Math.PI * y / map.pow(2, z);
                        return (180 / $.Math.PI * $.Math.atan(0.5 * ($.Math.exp(n) - $.Math.exp(-n))));
                    }
                },
                pow: function (base, exp) {
                    if (map.cacheValues) {
                        if (map.cache && map.cache.pow) {
                            if (map.cache.pow[base] && map.cache.pow[base][exp]) {
                                return map.cache.pow[base][exp];
                            }
                            if (!map.cache.pow) {
                                map.cache.pow = [];
                            }
                            if (!map.cache.pow[base]) {
                                map.cache.pow[base] = [];
                            }
                            map.cache.pow[base][exp] = $.Math.pow(base, exp);
                            return map.cache.pow[base][exp];
                        }
                    }
                    return $.Math.pow(base, exp);
                }
            };
            return { /* public functions */
                init: function (config) { /* init extensions first */
                    var e, sub, coords;
                    map.init();

                    if (typeof config === 'function') {
                        config(this);
                    }
                    coords = {
                        z: (map.position && map.position.z) || options.zoom,
                        x: (map.position && map.position.x) || map.position.lon2posX(options.lon),
                        y: (map.position && map.position.y) || map.position.lat2posY(options.lat)
                    };
                    map.position.center(coords);
                    map.position.is_init = true;
                    map.renderer.refresh_load();

                    return this;
                },
                center: function (coords, options) {
                    //console.log("map center");
                    return {
                        x: map.position.x,
                        y: map.position.y,
                        z: map.position.z
                    };

                },
                width: function (width) {
                    if (typeof width !== 'number') {
                        return map.renderer.canvas.width;
                    }
                    map.renderer.canvas.width = width;
                    return this;
                },
                height: function (height) {
                    if (typeof height !== 'number') {
                        return map.renderer.canvas.height;
                    }
                    map.renderer.canvas.height = height;
                    return this;
                },
                tileCache: function (tiles) {
                    if (typeof tiles !== 'undefined') {
                        map.renderer.tiles = tiles;
                    } else {
                        if (map.renderer.tiles.length === 1) {
                            return map.renderer.tiles[0];
                        }
                        return map.renderer.tiles;
                    }
                    return this;
                },
                new_map_size: function (width, height) {
                    this.width(width);
                    this.height(height);
                    map.renderer.context_size.canvas_w = map.renderer.canvas.width - map.renderer.canvas.width % 2;
                    map.renderer.context_size.canvas_h = map.renderer.canvas.height - map.renderer.canvas.height % 2;
                },
                renderer: map.renderer,
                map: map,
            };
        };
        window.slippymap = slippymap;
    }
}(window));