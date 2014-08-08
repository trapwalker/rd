var getIndexedDBStorage = function (callback) {
    var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;

    var IndexedDBImpl = function () {
        var self = this;
        var db = null;
        var request = indexedDB.open('TileStorage2');

        request.onsuccess = function() {
            db = this.result;
            callback(self);
        };

        request.onerror = function (error) {
            console.log(error);
        };

        request.onupgradeneeded = function () {
            var store = this.result.createObjectStore('tile', { keyPath: 'key'});
            store.createIndex('key', 'key', { unique: true });
        };

        this.add = function (key, value) {
            var transaction = db.transaction(['tile'], 'readwrite');
            var objectStore = transaction.objectStore('tile');
            objectStore.put({key: key, value: value});
        };

        this.delete = function (key) {
            var transaction = db.transaction(['tile'], 'readwrite');
            var objectStore = transaction.objectStore('tile');
            objectStore.delete(key);
        };

        this.get = function (key, successCallback, errorCallback) {
            var transaction = db.transaction(['tile'], 'readonly');
            var objectStore = transaction.objectStore('tile');
            var result = objectStore.get(key);
            result.onsuccess = function () {
                successCallback(this.result ? this.result.value : undefined);
            };
            result.onerror = errorCallback;
        };
    };

    return indexedDB ? new IndexedDBImpl() : null;
};

var getWebSqlStorage = function (callback) {
    var openDatabase = window.openDatabase;

    var WebSqlImpl = function () {
        var self = this;
        var db = openDatabase('TileStorage', '1.0', 'Tile Storage', 5 * 1024 * 1024);
        db.transaction(function (tx) {
            tx.executeSql('CREATE TABLE IF NOT EXISTS tile (key TEXT PRIMARY KEY, value TEXT)', [], function () {
                callback(self);
            });
        });

        this.add = function (key, value) {
            db.transaction(function (tx) {
                tx.executeSql('INSERT INTO tile (key, value) VALUES (?, ?)', [key, value]);
            });
        };

        this.delete = function (key) {
            db.transaction(function (tx) {
                tx.executeSql('DELETE FROM tile WHERE key = ?', [key]);
            });
        };

        this.get = function (key, successCallback, errorCallback) {
            db.transaction(function (tx) {
                tx.executeSql('SELECT value FROM tile WHERE key = ?', [key], function (tx, result) {
                    successCallback(result.rows.length ? result.rows.item(0).value : undefined);
                }, errorCallback);
            });
        };
    };

    return openDatabase ? new WebSqlImpl() : null;
};


var StorageTileLayer = L.TileLayer.extend({
    _imageToDataUri: function (image) {
        var canvas = window.document.createElement('canvas');
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;

        var context = canvas.getContext('2d');
        context.drawImage(image, 0, 0);

        return canvas.toDataURL('image/jpg');
    },

    _tileOnLoadWithCache: function () {
        var storage = this._layer.options.storage;
        if (storage) {
            storage.add(this._storageKey, this._layer._imageToDataUri(this));
        }
        L.TileLayer.prototype._tileOnLoad.apply(this, arguments);
    },

    _setUpTile: function (tile, key, value, cache) {
        tile._layer = this;
        if (cache) {
            tile._storageKey = key;
            tile.onload = this._tileOnLoadWithCache;
            tile.crossOrigin = 'Anonymous';
        } else {
            tile.onload = this._tileOnLoad;
        }
        tile.onerror = this._tileOnError;
        tile.src = value;
    },

    _loadTile: function (tile, tilePoint) {
        this._adjustTilePoint(tilePoint);
        var key = tilePoint.z + ',' + tilePoint.y + ',' + tilePoint.x;

        var self = this;
        if (this.options.storage) {
            this.options.storage.get(key, function (value) {
                if (value) {
                    self._setUpTile(tile, key, value, false);
                } else {
                    self._setUpTile(tile, key, self.getTileUrl(tilePoint), true);
                }
            }, function () {
                self._setUpTile(tile, key, self.getTileUrl(tilePoint), true);
            });
        } else {
            self._setUpTile(tile, key, self.getTileUrl(tilePoint), false);
        }
    }
});