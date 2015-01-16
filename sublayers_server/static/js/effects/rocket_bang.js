


var Bang = (function(){
    function Bang(position, aPower, aBangDur, aBandEndDur){
        // todo: сделать зависимость радиуса взрыва от текущего зума. а если радиус меньше 5, то совсем не показывать его
        var bang_power = aPower || 50;
        var bang_duration = aBangDur || 1500;
        var bang_end_duration = aBandEndDur ||  1000;
        if (position) {
            this.myIcon = L.divIcon({
                className: 'my-bang-icon',
                iconSize: [bang_power, bang_power],
                iconAnchor: [bang_power-1, bang_power-1],
                html: '<svg height="' + bang_power * 2 + 'px" width="' + bang_power * 2 + 'px">' +
                    '<circle cx="' + bang_power + '" cy="' + bang_power + '" r="2" fill="#FFAF21">' +
                    '<animate attributeName="r" repeatCount="1" fill="freeze"' +
                    'dur="' + bang_duration + 'ms" ' +
                    'from="1" to="' + bang_power + '"' +
                    'values="1; ' + bang_power * 0.5 + '; ' + bang_power * 0.8 + '; ' + bang_power + ';" ' +
                    '/>' +
                    '<animate attributeType="CSS" attributeName="opacity"' +
                    'from="1" to="0" dur="' + bang_end_duration + 'ms" repeatCount="1" fill="freeze"' +
                    'begin="' + bang_duration + 'ms"/>' +
                    '</circle>' +
                    '</svg>'
            });
            this.marker = L.marker(myMap.unproject([position.x, position.y], myMap.getMaxZoom()), {icon: this.myIcon, zIndexOffset: 10});
            this.duration = bang_duration + bang_end_duration;
        }
    }

    Bang.prototype.start = function(){
        //console.log('Bang Started');
        if(this.marker) {
            var self = this;
            this.marker.addTo(map);
            timeManager.addTimeoutEvent(this, 'finish', this.duration);
        }
    };

    Bang.prototype.finish = function(){
        console.log('Bang finish');
        map.removeLayer(this.marker)
    };

    return Bang
})();
