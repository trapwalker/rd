/*  Slippy Map on Canvas - HTML5
 *
 *  Copyright 2010 dFacts Network
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *
 *  TODO:
 */
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
                markers: {},
                tracks: {},
                tileprovider: function (x, y, z) {
                    var rand, sub, url;
                    rand = function (n) {
                        return $.Math.floor($.Math.random() * n);
                    };
                    sub = ["a", "b", "c"];
                    url = "http://" + sub[rand(3)] + ".tile.openstreetmap.org/" + z + "/" + x + "/" + y + ".png";
                    return url;
                },
                useFractionalZoom: true,
                scrollMomentum: true,
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
                markers: options.markers,
                tracks: options.tracks,
                tileprovider: options.tileprovider,
                useFractionalZoom: options.useFractionalZoom,
                scrollMomentum: options.scrollMomentum,
                cache: {},
                cacheValues: options.cacheValues,
                preloadMargin: options.preloadMargin,
                zMin : options.zMin,
                zMax : options.zMax,
                maxImageLoadingCount : 10,
                init: function () {
                    var coords;
                    if ($.document.getElementById(options.div)) {
                        map.renderer.canvas = $.document.getElementById(options.div);
                        if (options.fullscreen === true) {
                            map.renderer.canvas.width = $.innerWidth;
                            map.renderer.canvas.height = $.innerHeight;
                        }
                        map.renderer.context = map.renderer.canvas.getContext("2d");
                        map.renderer.sortLayers();
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
                    roundToPixel : false,
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
                        if (typeof map.renderer.tiles[t] === 'undefined') {
                            map.renderer.tiles[t] = [];
                        }
                        if (map.renderer.loadingCue > map.maxImageLoadingCount && z !== map.position.z) {
                            //skipping
                            return;
                        }
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
                    sortObject: function (o) {
                        var sorted = {},
                            key,
                            a = [];
                        for (key in o) {
                            if (o.hasOwnProperty(key)) {
                                a.push(key);
                            }
                        }
                        a.sort();
                        for (key = 0; key < a.length; key = key + 1) {
                            sorted[a[key]] = o[a[key]];
                        }
                        return sorted;
                    },
                    sortLayers: function () {
                        function sortZIndex(a, b) {
                            var x, y;
                            x = a.zindex;
                            y = b.zindex;
                            return ((x < y) ? -1 : ((x > y) ? 1 : 0));
                        }
                        map.renderer.layers.sort(sortZIndex);
                    },
                    layers: [
                        { /* repaint canvas, load missing images */
                            id: 'tiles',
                            zindex: 1,
                            visible: function () {
                                return true;
                            },
                            alpha: 1,
                            callback: function (id, viewport, alpha) {
                                var tileprovider, tileLayers, maxTileNumber, tileDone, preload,
                                    t, x, y, xoff, yoff, tileKey,
                                    tileAboveX, tileAboveY, tileAboveZ, tileKeyAbove,
                                    tilePartOffsetX, tilePartOffsetY, tilePartSize,
                                    tileZdiff,
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
                                        for (tileLoadingKey in tileLoadingCue) {
                                            if (tileLoadingCue.hasOwnProperty(tileLoadingKey)) {
                                                tileLoading = tileLoadingCue[tileLoadingKey];
                                                // get tile above
                                                tileAboveX = $.Math.floor(tileLoading.x / 2);
                                                tileAboveY = $.Math.floor(tileLoading.y / 2);
                                                tileAboveZ = tileLoading.z - 1;
                                                tileKeyAbove = encodeIndex(tileAboveX, tileAboveY, tileAboveZ);
                                                if (typeof current_tiles[tileKeyAbove] === 'undefined' &&
                                                        typeof tileLoadingCue[tileKeyAbove] === 'undefined') {
                                                    tileLoadingCue[tileKeyAbove] = {id: tileKeyAbove, x: tileAboveX, y: tileAboveY, z: tileAboveZ};
                                                }
                                            }
                                        }
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
                    ],
                    refresh: function () {
                        //console.log("map renderer refresh");

                        map.renderer.refreshLastStart = (new $.Date()).getTime();
                        var viewport = map.viewport();
                        var ctx = map.renderer.context;
                        ctx.save();
                        ctx.clearRect(0, 0, viewport.w, viewport.h);
                        ctx.scale(viewport.zf, viewport.zf);
                        map.renderer.layers[0].callback(map.renderer.refreshCounter, viewport, 1.0);
                        map.renderer.refreshLastFinish = (new $.Date()).getTime();
                        map.renderer.refreshCounter = map.renderer.refreshCounter + 1;

                        ctx.restore();

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
                        var viewport, xMin, xMax;
                        if (map.position.minX && map.position.maxX) {
                            viewport =  map.viewport();
                            xMin = Math.floor(x - viewport.w / 2);
                            xMax = Math.ceil(x + viewport.w / 2);
                            if (xMin < map.position.minX) {
                                x = map.position.minX + viewport.w / 2;
                            } else if (xMax > map.position.maxX) {
                                x = map.position.maxX - viewport.w / 2;
                            }
                        }
                        map.position.x = Math.round(x);
                    },
                    setY: function (y) {
                        var viewport, yMin, yMax;
                        if (map.position.minY && map.position.maxY) {
                            viewport =  map.viewport();
                            yMin = Math.floor(y - viewport.h / 2);
                            yMax = Math.ceil(y + viewport.h / 2);
                            if (yMin < map.position.minY) {
                                y = map.position.minY + viewport.h / 2;
                            } else if (yMax > map.position.maxY) {
                                y = map.position.maxY - viewport.h / 2;
                            }
                        }
                        map.position.y = Math.round(y);
                    },
                    setZ: function (z, options) {
                        map.position.z = z;
                        return map.position.z;
                    },
                    zoomIn: function (options) {
                        var step, round;
                        options = options || {};
                        step = options.step || 1;
                        round = options.round || false;
                        step = step || 1;
                        if (!map.useFractionalZoom) {
                            step = Math.round(step);
                            if (step < 1) {
                                step = 1;
                            }
                        }
                        if (round === false) {
                            map.position.setZ(map.position.z + step, options);
                        } else {
                            map.position.setZ($.Math.round(map.position.z + step), options);
                        }
                    },
                    zoomOut: function (options) {
                        var step, round;
                        options = options || {};
                        step = options.step || 1;
                        round = options.round || false;
                        step = step || 1;
                        if (!map.useFractionalZoom) {
                            step = Math.round(step);
                            if (step < 1) {
                                step = 1;
                            }
                        }
                        if (round === false) {
                            map.position.setZ(map.position.z - step, options);
                        } else {
                            map.position.setZ($.Math.round(map.position.z - step), options);
                        }
                    },
                    coords: function (coords, options) {
                        if (typeof coords !== "object") {
                            return {
                                lon: map.position.tile2lon(map.position.x / map.renderer.tilesize, map.zMax),
                                lat: map.position.tile2lat(map.position.y / map.renderer.tilesize, map.zMax),
                                z: map.position.z
                            };
                        }
                        coords = {
                            x: map.position.lon2posX(coords.lon),
                            y: map.position.lat2posY(coords.lat),
                            z: coords.zoom
                        };
                        map.position.center(coords, options);
                    },
                    center: function (coords, options) {
                        //console.log("map position center", coords, options);
                        var animated, zoomChanged;
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
                    move: function (dx, dy, options) {
                        map.position.center({
                            x: map.position.x + dx,
                            y: map.position.y + dy
                        }, options);
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
                    },
                    zoomed: function (options) {
                        var event = $.document.createEvent('Event');
                        event.initEvent('zoomed', false, false);
                        map.renderer.canvas.dispatchEvent(event);
                    },
                    moved: function (options) {
                        var event = $.document.createEvent('Event');
                        event.initEvent('moved', false, false);
                        map.renderer.canvas.dispatchEvent(event);
                    },
                    moveend: function (options) {
                        var event = $.document.createEvent('Event');
                        event.initEvent('moveend', false, false);
                        map.renderer.canvas.dispatchEvent(event);
                    },
                    animation: {
                        now: function () {
                            return (new Date()).getTime();
                        },
                        timeoutId: 0,
                        interval: 0,
                        duration: 750,
                        descriptor: {},
                        ease: function (func) {
                            // use logic from jquery.easing
                            var t, b = 0, c = 1, d = 1;
                            if (map.position.animation.descriptor) {
                                t = ((map.position.animation.descriptor.end - map.position.animation.now()) / map.position.animation.descriptor.duration);
                                if (t < 0) {
                                    t = 0;
                                }
                                if (t > 1) {
                                    t = 1;
                                }
                                if (typeof func !== "function") {
                                    if (typeof func === "string") {
                                        switch (func) {
                                        case "easeInExpo":
                                            return (t === 0) ? b : c * Math.pow(2, 10 * (t / d - 1)) + b;
                                        case "easeInSine":
                                            return -c * Math.cos(t / d * (Math.PI / 2)) + c + b;
                                        case "easeInCubic":
                                            return c * (t /= d) * t * t + b;
                                        // case "easeInQuad":
                                        default:
                                            return c *  (t /= d) * t + b;
                                        }
                                    }
                                    return c *  (t /= d) * t + b;
                                }
                                return func(t);
                            }
                        },
                        start: function (x, y, z) {
                            map.position.animation.descriptor.duration = map.position.animation.duration;
                            map.position.animation.descriptor.start = map.position.animation.now();
                            map.position.animation.descriptor.end = map.position.animation.descriptor.start + map.position.animation.duration;
                            map.position.animation.descriptor.from = {
                                x: map.position.x,
                                y: map.position.y,
                                z: map.position.z
                            };
                            map.position.animation.descriptor.to = map.position.animation.descriptor.to || {};
                            if (typeof x !== 'undefined' && x !== false) {
                                map.position.animation.descriptor.to.x = x;
                            }
                            if (typeof y !== 'undefined' && y !== false) {
                                map.position.animation.descriptor.to.y = y;
                            }
                            if (typeof z !== 'undefined' && z !== false && z >= map.zMin && z <= map.zMax) {
                                map.position.animation.descriptor.to.z = z;
                            } else {
                                map.position.animation.descriptor.to.z = map.position.z;
                            }
                            map.position.animation.step();
                        },
                        step: function () {
                            var progressXY, progressZ, destX, destY, destZ;
                            if (map.position.animation.descriptor.end < map.position.animation.now()) {
                                map.position.center({
                                    x: map.position.animation.descriptor.to.x || map.position.x,
                                    y: map.position.animation.descriptor.to.y || map.position.y,
                                    z: map.position.animation.descriptor.to.z || map.position.z
                                }, {
                                    animationStep: false
                                });
                                map.position.animation.stop();
                            } else {
                                progressXY = map.position.animation.ease("easeInExpo");
                                progressZ = map.position.animation.ease("easeInCubic");

                                if (typeof map.position.animation.descriptor.to.x !== 'undefined' && map.position.animation.descriptor.to.x !== false) {
                                    destX = map.position.animation.descriptor.from.x * progressXY + map.position.animation.descriptor.to.x * (1 - progressXY);
                                }
                                if (typeof map.position.animation.descriptor.to.y !== 'undefined' && map.position.animation.descriptor.to.y !== false) {
                                    destY = map.position.animation.descriptor.from.y * progressXY + map.position.animation.descriptor.to.y * (1 - progressXY);
                                }
                                if (typeof map.position.animation.descriptor.to.z !== 'undefined' && map.position.animation.descriptor.to.z !== false) {
                                    destZ = map.position.animation.descriptor.from.z * progressZ + map.position.animation.descriptor.to.z * (1 - progressZ);
                                }
                                map.position.center({
                                    x: destX || map.position.x,
                                    y: destY || map.position.y,
                                    z: destZ || map.position.z
                                }, {
                                    animationStep: true
                                });
                                $.clearInterval(map.position.animation.timeoutId);
                                map.position.animation.timeoutId = $.setTimeout(map.position.animation.step, map.position.animation.interval);
                            }
                        },
                        stop: function () {
                            if (map.position.animation.timeoutId) {
                                $.clearTimeout(map.position.animation.timeoutId);
                                map.position.animation.timeoutId = 0;
                                map.position.animation.descriptor = {};
                            }
                        }
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
                        z:  (map.position && map.position.z) || options.zoom,
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
                coords: function (coords, options) {
                    if (typeof coords !== 'object') {
                        return map.position.coords();
                    }
                    map.position.coords(
                        {
                            lon: parseFloat(coords.lon),
                            lat: parseFloat(coords.lat),
                            zoom: parseFloat(coords.zoom)
                        },
                        options
                    );
                    return this;
                },
                zoom: function (z, options) {
                    if (typeof z !== 'number') {
                        return map.position.z;
                    }
                    map.position.setZ(z, options);
                    return this;
                },
                maxZ: function (z) {
                    if (typeof z !== 'number') {
                        return map.zMax;
                    }
                    if (z < map.zMin) {
                        map.zMax = map.zMin;
                    } else {
                        map.zMax = z;
                    }
                    return this;
                },
                minZ: function (z) {
                    if (typeof z !== 'number') {
                        return map.zMin;
                    }
                    if (z < 0) {
                        map.zMin = 0;
                    } else if (z > map.zMax) {
                        map.zMin = map.zMax;
                    } else {
                        map.zMin = z;
                    }
                    return this;
                },
                bounds: function (left, top, right, bottom) {
                    var viewport, bounds;
                    if (typeof left === 'number' && typeof top === 'number' &&
                            typeof right === 'number' && typeof bottom === 'number' &&
                            parseFloat(left) < parseFloat(right) &&
                            parseFloat(bottom) < parseFloat(top)) {
                        map.position.minX = map.position.lon2posX(parseFloat(left));
                        map.position.maxX = map.position.lon2posX(parseFloat(right));
                        map.position.minY = map.position.lat2posY(parseFloat(top));    // NB pixel origin is top left
                        map.position.maxY = map.position.lat2posY(parseFloat(bottom)); // NB pixel origin is top left
                        return this;
                    }
                    viewport =  map.viewport();
                    bounds = {};
                    bounds.left = map.position.tile2lon((map.position.x - viewport.w / 2) / map.renderer.tilesize, map.zMax);
                    bounds.right = map.position.tile2lon((map.position.x + viewport.w / 2) / map.renderer.tilesize, map.zMax);
                    bounds.top = map.position.tile2lat((map.position.y - viewport.h / 2) / map.renderer.tilesize, map.zMax);
                    bounds.bottom = map.position.tile2lat((map.position.y + viewport.h / 2) / map.renderer.tilesize, map.zMax);
                    return bounds;
                },
                refresh: function () {
                    map.renderer.update();
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
                zoomIn: function (event, options) {
                    map.position.zoomIn(options);
                    if (event.preventDefault) {
                        map.events.preventDefault(event);
                    }
                    if (typeof event !== 'undefined') {
                        return this;
                    }
                    return false;
                },
                zoomOut: function (event, options) {
                    map.position.zoomOut(options);
                    if (event.preventDefault) {
                        map.events.preventDefault(event);
                    }
                    if (typeof event !== 'undefined') {
                        return this;
                    }
                    return false;
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
                markers: function (markers) {
                    if (typeof markers !== 'object') {
                        return map.markers;
                    }
                    map.markers = markers;
                    map.renderer.update();
                    return this;
                },
                marker: function (id, marker, isUpdate) {
                    var property;
                    if (id && typeof marker !== 'object') {
                        return map.markers[id];
                    }
                    if (isUpdate === true) {
                        for (property in marker) {
                            if (marker.hasOwnProperty(property)) {
                                map.markers[id][property] = marker[property];
                            }
                        }
                    } else {
                        map.markers[id] = marker;
                    }
                    map.renderer.update();
                    return this;
                },
                tracks: function (tracks) {
                    if (typeof tracks !== 'object') {
                        return map.tracks;
                    }
                    map.tracks = tracks;
                    map.renderer.update();
                    return this;
                },
                tileSize: function (size) {
                    if (typeof size !== 'number') {
                        return map.renderer.tilesize;
                    }
                    map.renderer.tilesize = size;
                    return this;
                },
                fractionalZoom: function (state) {
                    if (state !== true && state !== false) {
                        return map.useFractionalZoom;
                    }
                    map.useFractionalZoom = state;
                    return this;
                },
                scrollMomentum: function (state) {
                    if (state !== true && state !== false) {
                        return map.scrollMomentum;
                    }
                    map.scrollMomentum = state;
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