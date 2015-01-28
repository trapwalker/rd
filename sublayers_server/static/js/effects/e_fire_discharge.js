

var EDischargeFire = (function(){
    function EDischargeFire(position, direction){
        // todo: сделать зависимость радиуса взрыва от текущего зума. а если радиус меньше 5, то совсем не показывать его
        var degrees = radToGrad(direction + Math.PI / 2.).toFixed(0);
        if (position) {
            this.myIcon = L.divIcon({
                className: 'my-bang-icon',
                iconSize: [50, 50],
                iconAnchor: [49, 49],
                html: '<svg height="100px" width="100px"'+
                    'xmlns="http://www.w3.org/2000/svg" version="1.1"'+
                    'xmlns:xlink="http://www.w3.org/1999/xlink">' +
                    '<path d="M25 30 Q 50 10 75 30" stroke="white" stroke-width="1" fill="transparent"' +
                    'transform="rotate(' + degrees + ' 50 50)">' +
                    '<animate attributeType="CSS" attributeName="opacity"'+
                    'from="1" to="0" dur="3s" begin="0s" repeatCount="1" fill="freeze"/>'+
                    '<animate attributeName="stroke-width" from="1" to="15" dur="3s" repeatCount="1" begin="0s"' +
                    'fill="freeze"/>'+
                    //'<animateTransform attributeType="xml" attributeName="transform" type="scale"'+
                    //'from="1" to="3" dur="3s" fill="freeze" />'+
                    '/path>'+
                    '</svg>'
            });
            this.marker = L.marker(myMap.unproject([position.x, position.y], map.getMaxZoom()), {icon: this.myIcon, zIndexOffset: 10});
            this.duration = 3000;
        }
    }

    EDischargeFire.prototype.start = function(){
        if(this.marker) {
            this.marker.addTo(map);
            timeManager.addTimeoutEvent(this, 'finish', this.duration);
        }
    };

    EDischargeFire.prototype.finish = function(){
        map.removeLayer(this.marker)
    };

    return EDischargeFire
})();
