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
                tileprovider: function (x, y, z) {
                    return "http://185.58.205.29/map/" + z + "/" + x + "/" + y +".jpg";
                },
                zMin: 0,
                zMax: 18,
                cacheValues: true,
                preloadMargin: 0
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
                tileprovider: options.tileprovider,
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
                    lastRenderTime: 0,
                    tiles: [],
                    tilecount: 0,
                    tilesize: 256,
                    refreshCounter: 0,
                    refreshLastStart: 0,
                    refreshLastFinish: 0,
                    refreshTimeout: 0,
                    refreshFPS: 50,
                    loadingCue : 0,
                    drawImage : function (image, fallbackColor, sx, sy, sw, sh, dx, dy, dw, dh) {
                        try {
                            //map.renderer.context.drawImage(
                            //    image,
                            //    sx,
                            //    sy,
                            //    sw,
                            //    sh,
                            //    dx,
                            //    dy,
                            //    dw,
                            //    dh
                            //);

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
                    loadImage : function (id, x, y, z, t, tileprovider) {
                        if (typeof map.renderer.tiles[t] === 'undefined')
                            map.renderer.tiles[t] = [];
                        if (map.renderer.loadingCue > map.maxImageLoadingCount && z !== map.position.z) //skipping
                            return;
                        map.renderer.loadingCue = map.renderer.loadingCue + 1;
                        map.renderer.tiles[t][id] = new $.Image();
                        map.renderer.tiles[t][id].lastDrawnId = 0;
                        map.renderer.tilecount = map.renderer.tilecount + 1;
                        map.renderer.tiles[t][id].src = tileprovider(x, y, z, id);
                        map.renderer.tiles[t][id].onload = function () {
	                        map.renderer.loadingCue = map.renderer.loadingCue - 1;
                        };
                        map.renderer.tiles[t][id].onerror = function () {
	                        map.renderer.loadingCue = map.renderer.loadingCue - 1;
                            this.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
                            this.onload = function () {};
                        };
                    },
                    layers: [
                        { /* repaint canvas, load missing images */
                            id: 'tiles',
                            callback: function (id, viewport) {
                                var tileprovider, tileLayers, maxTileNumber, tileDone, preload,
                                    t, x, y, xoff, yoff, tileKey,
                                    tileAboveX, tileAboveY, tileAboveZ, tileKeyAbove,
                                    encodeIndex,
                                    tileLoadingCue = [],
                                    tileLoading, tileLoadingKey;
                                encodeIndex = function (x, y, z) {
                                    return x + "-" + y + "-" + z;
                                };
                                maxTileNumber = map.pow(2, viewport.zi) - 1;
                                preload = map.preloadMargin;
                                if (typeof map.tileprovider === 'function') {
                                    tileLayers = {
                                        base: {
                                            url: map.tileprovider
                                        }
                                    };
                                } else {
                                    tileLayers = map.tileprovider;
                                }
                                for (t in tileLayers) {
                                    if (tileLayers.hasOwnProperty(t)) {
                                        tileprovider = tileLayers[t].url;
                                        map.renderer.tiles[t] = map.renderer.tiles[t] || {};
                                        var current_tiles = map.renderer.tiles[t];
                                        tileDone = [];
                                        var condi_x = $.Math.ceil(viewport.xMax / viewport.sz) + preload;
                                        for (x = $.Math.floor(viewport.xMin / viewport.sz) - preload; x < condi_x ; x++) {
                                            tileDone[x] = [];
                                            xoff = (((x * viewport.sz - viewport.xMin) / viewport.zp)) - viewport.offsetX;
                                            //xoff = Math.floor(xoff);
                                            var condi_y = $.Math.ceil(viewport.yMax / viewport.sz) + preload;
                                            for (y = $.Math.floor(viewport.yMin / viewport.sz) - preload; y < condi_y; y = y + 1) {
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
                                                                "#dddddd",
                                                                0,
                                                                0,
                                                                map.renderer.tilesize,
                                                                map.renderer.tilesize,
                                                                xoff,
                                                                yoff,
                                                                viewport.tilesize,
                                                                viewport.tilesize
                                                            )) {
                                                            current_tiles[tileKey].lastDrawnId = id;
                                                        }
                                                        tileDone[tileKey] = true;
                                                    } else {
                                                        if (typeof current_tiles[tileKey] === 'undefined' &&
                                                                typeof tileLoadingCue[tileKey] === 'undefined') {
                                                            tileLoadingCue[tileKey] = {id: tileKey, x: x, y: y, z: viewport.zi};
                                                        }
                                                    }
                                                }
                                            }
                                        }

                                        // Загрузка тайлов зума + 1
                                        //for (tileLoadingKey in tileLoadingCue) {
                                        //    if (tileLoadingCue.hasOwnProperty(tileLoadingKey)) {
                                        //        tileLoading = tileLoadingCue[tileLoadingKey];
                                        //        // get tile above
                                        //        tileAboveX = $.Math.floor(tileLoading.x / 2);
                                        //        tileAboveY = $.Math.floor(tileLoading.y / 2);
                                        //        tileAboveZ = tileLoading.z - 1;
                                        //        tileKeyAbove = encodeIndex(tileAboveX, tileAboveY, tileAboveZ);
                                        //        if (typeof current_tiles[tileKeyAbove] === 'undefined' &&
                                        //                typeof tileLoadingCue[tileKeyAbove] === 'undefined') {
                                        //            tileLoadingCue[tileKeyAbove] = {id: tileKeyAbove, x: tileAboveX, y: tileAboveY, z: tileAboveZ};
                                        //        }
                                        //    }
                                        //}
                                        //tileLoadingCue = map.renderer.sortObject(tileLoadingCue);
                                        for (tileLoadingKey in tileLoadingCue) {
                                            if (tileLoadingCue.hasOwnProperty(tileLoadingKey)) {
                                                tileLoading = tileLoadingCue[tileLoadingKey];
                                                if (!map.renderer.tiles[t][tileLoading.id]) {
                                                    // request tile and dispatch refresh
                                                    map.renderer.loadImage(
                                                        tileLoading.id,
                                                        tileLoading.x,
                                                        tileLoading.y,
                                                        tileLoading.z,
                                                        t,
                                                        tileprovider
                                                    );
                                                }
                                            }
                                        }

                                    }
                                }
                            }
                        },
                        { /* repaint canvas - grid */
                            id: 'grid',
                            callback: function (id, viewport) {
                                var preload, t, x, y, xoff, yoff;

                                preload = map.preloadMargin;
                                var view_width = viewport.w;
                                var view_height = viewport.h;


                                var ctx = map.renderer.context;
                                ctx.save();

                                ctx.strokeStyle = "#0e4b00";


                                map.renderer.tiles[t] = map.renderer.tiles[t] || {};
                                var current_tiles = map.renderer.tiles[t];
                                var condi_x = $.Math.ceil(viewport.xMax / viewport.sz) + preload;
                                for (x = $.Math.floor(viewport.xMin / viewport.sz) - preload; x < condi_x; x++) {
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

                                var condi_y = $.Math.ceil(viewport.yMax / viewport.sz) + preload;
                                for (y = $.Math.floor(viewport.yMin / viewport.sz) - preload; y < condi_y; y = y + 1) {
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
                        //console.log("map renderer refresh");

                        map.renderer.refreshLastStart = (new $.Date()).getTime();
                        var viewport = map.viewport();
                        var ctx = map.renderer.context;
                        ctx.save();
                        ctx.clearRect(0, 0, viewport.w, viewport.h);
                        ctx.scale(viewport.zf, viewport.zf);
                        map.renderer.layers[0].callback(map.renderer.refreshCounter, viewport);
                        map.renderer.layers[1].callback(map.renderer.refreshCounter, viewport);
                        map.renderer.refreshLastFinish = (new $.Date()).getTime();
                        map.renderer.refreshCounter = map.renderer.refreshCounter + 1;

                        ctx.restore();

                        //ctx.textAlign = "center";
                        //ctx.textBaseline = "center";
                        //ctx.font = "22pt MICRADI";
                        //ctx.fillStyle = 'rgba(42, 253, 10, 0.6)';
                        //ctx.fillText(viewport.zoom.toFixed(2) + " / " + viewport.zf.toFixed(2), 100, 100);

                        map.renderer.garbage();
                    },
                    /* garbage collector, purges tiles if more than 500 are loaded and tile is more than 100 refresh cycles old */
                    garbage: function () {
                        var remove, key, i;
                        if (map.renderer.tilecount > 5000) {
                            if (map.renderer.tiles) {
                                remove = [];
                                for (key in map.renderer.tiles) {
                                    if (map.renderer.tiles.hasOwnProperty(key) && map.renderer.tiles[key] && map.renderer.tiles[key].complete && map.renderer.tiles[key].lastDrawnId < (map.renderer.refreshCounter - 100)) {
                                        remove.push(key);
                                    }
                                }
                                for (i = 0; i < remove.length; i = i + 1) {
                                    delete map.renderer.tiles[remove[i]];
                                }
                                map.renderer.tilecount = map.renderer.tilecount - i;
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
                    var viewport = {};

                    viewport.x = map.position.x;
                    viewport.y = map.position.y;
                    viewport.width =  map.renderer.canvas.width;
                    viewport.height =  map.renderer.canvas.height;
                    viewport.zoom = map.position.z;

                    var canvas_w = map.renderer.canvas.width - map.renderer.canvas.width % 2;
                    var canvas_h = map.renderer.canvas.height - map.renderer.canvas.height % 2;


                    viewport.zi = Math.ceil(map.position.z);  // Целое число зума. Без округлений
                    viewport.zf = 1. / (1 + viewport.zi - map.position.z);  // коэффициент зума от целого зума + 1: 17.5 => 1.5
                    viewport.zp = map.pow(2, map.zMax - viewport.zi);  // Коэффициент зумирования для целого зума
                    viewport.w = canvas_w * viewport.zp / viewport.zf;  // Размер полотна в пикселях максимального зума
                    viewport.h = canvas_h * viewport.zp / viewport.zf;  // Размер полотна в пикселях максимального зума
                    viewport.sz = map.renderer.tilesize * viewport.zp; // Размер тайла текущего округлённого зума в пикселях максимального зума
                    viewport.tilesize = map.renderer.tilesize;  // Размер тайла текущего зума в пикселях максимального зума
                    viewport.xMin = (map.position.x - viewport.w / 2); // Прямоугольник отображения в пикселах на максимальном зуме
                    viewport.yMin = (map.position.y - viewport.h / 2); // Прямоугольник отображения в пикселах на максимальном зуме
                    viewport.xMax = (map.position.x + viewport.w / 2); // Прямоугольник отображения в пикселах на максимальном зуме
                    viewport.yMax = (map.position.y + viewport.h / 2); // Прямоугольник отображения в пикселах на максимальном зуме
                    viewport.offsetX = 0; //(canvas_w / 2) * ((1 - viewport.zf) ); // Сдвиг начала канваса, чтобы центр остался в центре!
                    viewport.offsetY = 0; //(canvas_h / 2) * ((1 - viewport.zf) );


                    map.cache.viewport = viewport;
                    return map.cache.viewport;
                },

                /* positioning, conversion between pixel + lon/lat */
                position: {
                    setX: function (x) {
                        map.position.x = Math.round(x);
                        //map.position.x = x;
                    },
                    setY: function (y) {
                        map.position.y = Math.round(y);
                        //map.position.y = y;
                    },
                    setZ: function (z) {
                        map.position.z = z;
                        return map.position.z;
                    },
                    center: function (coords) {
                        if (typeof coords === 'undefined') {
                            return {
                                x: map.position.x,
                                y: map.position.y,
                                z: map.position.z
                            };
                        }
                        map.position.setX(coords.x);
                        map.position.setY(coords.y);
                        map.position.setZ(coords.z);
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
                    for (e in slippymap.extension) {
                        if (slippymap.extension.hasOwnProperty(e)) {
                            if (typeof slippymap.extension[e] === 'function') {
                                this[e] = slippymap.extension[e](map);
                                if (typeof this[e].init === 'function') {
                                    this[e].init();
                                }
                            } else {
                                this[e] = {};
                                for (sub in slippymap.extension[e]) {
                                    if (slippymap.extension[e].hasOwnProperty(sub)) {
                                        this[e][sub] = slippymap.extension[e][sub](map);
                                        if (typeof this[e][sub].init === 'function') {
                                            this[e][sub].init();
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if (typeof config === 'function') {
                        config(this);
                    }
                    coords = {
                        z: (map.position && map.position.z) || options.zoom,
                        x: (map.position && map.position.x) || map.position.lon2posX(options.lon),
                        y: (map.position && map.position.y) || map.position.lat2posY(options.lat)
                    };
                    map.position.center(coords);

                    return this;
                },
                center: function (coords, options) {
                    //console.log("map center");
                    if (typeof coords !== 'object') {
                        return {
                            x: map.position.x,
                            y: map.position.y,
                            z: map.position.z
                        };
                    }
                    map.position.center(coords, options);
                    return this;
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
                tileProvider: function (provider) {
                    if (typeof provider !== 'function') {
                        return map.tileprovider;
                    }
                    map.tileprovider = provider;
                    delete map.renderer.tiles;
                    map.renderer.tiles = [];
                    map.renderer.update();
                    return this;
                },
                renderer: map.renderer,
                map: map,
            };
        };
        slippymap.debug = function (params) {
            if (typeof window.console !== "undefined") {
                window.console.log(params);
            }
        };
        slippymap.extension = {};
        window.slippymap = slippymap;
    }
}(window));