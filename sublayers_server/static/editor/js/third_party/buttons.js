
// кнопка
L.Control.EasyButtons = L.Control.extend({
    options: {
        position: 'topleft',
        title: '',
        intentedIcon: '',
        checked: false,
        enabledChecked: false
    },

    onAdd: function () {
        var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');

        this.link = L.DomUtil.create('a', 'leaflet-bar-part ' + this.options.intentedIcon, container); // Сюда вешается правильная картинка!
        this.link.href = '#';

        L.DomEvent.on(this.link, 'click', this._click, this);
        this.link.title = this.options.title;

        return container;
    },

    intendedFunction: function () {
        alert('no function selected');
    },

   /* setChecked: function (ch) {
        this.options.checked = ch;
        if (ch) {
            $(this.link).css('backgroud-color','red');
            alert(this.link)
        }
        else
        {
            $(this.link).css('backgroud-color','blue');
            alert(this.link);
        }
    },
*/
    _click: function (e) {
        L.DomEvent.stopPropagation(e);
        L.DomEvent.preventDefault(e);
        this.intendedFunction();

        // Механизм залипания кнопки после нажатия и отжатия после повторого клика
 //       if(this.options.enabledChecked)
 //           this.setChecked(!this.options.checked);
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
        if (options.btnMap) newControl.addTo(options.btnMap);
        }
    return newControl;
};