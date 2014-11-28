L.Control.EasyButtons = L.Control.extend({
    options: {
        position: 'topleft',
        title: '',
        intentedIcon: '',
        checked: false,
        enabled: true,
        enabledChecked: false
    },

    onAdd: function () {
        this.div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        this.link = L.DomUtil.create('a', this.options.intentedIcon, this.div);
        this.link.href = '#';

        L.DomEvent.on(this.link, 'click', this._click, this);
        this.link.title = this.options.title;

        return this.div;
    },

    intendedFunction: function () {
        alert('no function selected');
    },

    setChecked: function (ch) {
        if (!this.options.enabledChecked) return;
        this.options.checked = ch;
        if (ch){
            L.DomUtil.removeClass(this.div, 'leaflet-bar');
            L.DomUtil.addClass(this.div, 'leaflet-bar-checked');
        }
        else {
            L.DomUtil.removeClass(this.div, 'leaflet-bar-checked');
            L.DomUtil.addClass(this.div, 'leaflet-bar');
        }
    },

    setEnabled: function (eb) {
    },

    _click: function (e) {
        L.DomEvent.stopPropagation(e);
        L.DomEvent.preventDefault(e);
        this.intendedFunction();
    }
});

L.easyButton = function (options) {
    var newControl = new L.Control.EasyButtons;
    if (options) {
        if (options.btnIcon) newControl.options.intentedIcon = options.btnIcon;
        if (options.btnPos) newControl.options.position = options.btnPos;
        if ((options.btnFunct) && (typeof options.btnFunct === 'function'))
            newControl.intendedFunction = options.btnFunct;
        if (options.btnTitle) newControl.options.title = options.btnTitle;
        if (options.btnEnbChckd) newControl.options.enabledChecked = options.btnEnbChckd;
        if (options.btnMap) newControl.addTo(options.btnMap);
        }
    return newControl;
};