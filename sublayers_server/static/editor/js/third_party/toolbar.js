L.Control.Toolbar = L.Control.extend({

    options: {
        closeButton: true,
        position: 'topleft',
        autoPan: true
    },

    initialize: function (options) {
        // контрол элемент с позицией
        L.Util.setOptions(this, options);

        // Создание тулбар контейнера
        var container = this._container =
            L.DomUtil.create('div', 'leaflet-bar leaflet-control');

        // Create close button and attach it if configured
        if (this.options.closeButton) {
            var close = this._closeButton =
                L.DomUtil.create('a', 'close', container);
            close.innerHTML = '&times;';
            var leaftArr = this._closeButton =
                L.DomUtil.create('a', 'close', container);
            leaftArr.innerHTML = '&larr;';
            var rightArr = this._closeButton =
                L.DomUtil.create('a', 'close', container);
            rightArr.innerHTML = '&rarr;';
        }
    },

    addTo: function (map) {
        var container = this._container;
        //var content = this._contentContainer;

        // Вешаем ивенты на кнопки
        if (this.options.closeButton) {
            var close = this._closeButton;
          //  L.DomEvent.on(close, 'click', this.hide, this);
        }

        var corner = map._controlCorners[this.options.position];

        corner.appendChild(container);


        // Make sure we don't drag the map when we interact with the content
        var stop = L.DomEvent.stopPropagation;
      //  L.DomEvent
      //      .on(content, 'click', stop)
      //      .on(content, 'mousedown', stop)
      //      .on(content, 'touchstart', stop)
      //      .on(content, 'dblclick', stop)
      //      .on(content, 'mousewheel', stop)
      //      .on(content, 'MozMousePixelScroll', stop);

        return this;
    },

    removeFrom: function (map) {
        //if the control is visible, hide it before removing it.
        this.hide();

        var content = this._contentContainer;

        // Remove sidebar container from controls container
        var controlContainer = map._controlContainer;
        controlContainer.removeChild(this._container);

        //disassociate the map object
        this._map = null;

        // Unregister events to prevent memory leak
        var stop = L.DomEvent.stopPropagation;
        L.DomEvent
            .off(content, 'click', stop)
            .off(content, 'mousedown', stop)
            .off(content, 'touchstart', stop)
            .off(content, 'dblclick', stop)
            .off(content, 'mousewheel', stop)
            .off(content, 'MozMousePixelScroll', stop);

        L.DomEvent
            .off(container, 'transitionend',
            this._handleTransitionEvent, this)
            .off(container, 'webkitTransitionEnd',
            this._handleTransitionEvent, this);

        if (this._closeButton && this._close) {
            var close = this._closeButton;

            L.DomEvent.off(close, 'click', this.hide, this);
        }

        return this;
    },


    setContent: function (content) {
        this.getContainer().innerHTML = content;
        return this;
    }

});

L.control.toolbar = function (options) {
    return new L.Control.Toolbar(options);
};
