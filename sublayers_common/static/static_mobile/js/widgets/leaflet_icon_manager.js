

// Список Иконок для всех видов маркеров леафлета

var LeafletIconManager = (function(){
    function LeafletIconManager() {
        this.icons = {};
        this.max_id = -1;
        this.count_loading_img = 0;
        resourceLoadManager.add(this);

        var host_name = 'http://' + $('#settings_host_name').text();

        this.load_new_icon('icon_party_car', host_name + '/static/img/char_icons/party/car.png', [53, 53], this.max_id++);
        this.load_new_icon('icon_neutral_car', host_name + '/static/img/char_icons/neutral/car.png', [53, 53], this.max_id++);
        this.load_new_icon('icon_dead_car', host_name + '/static/img/char_icons/dead/car.png', [53, 53], this.max_id++);
    }
    // icon_name - имя иконки, type - canvas_icon | icon (для леафлета)
    LeafletIconManager.prototype.getIcon = function(icon_name, type){
        type = type ? type : 'icon';
        return this.icons[icon_name][type];
    };

    LeafletIconManager.prototype.load_complete = function () {
        console.log('LeafletIconManager.prototype.load_complete');
        if (this.count_loading_img == 0) {
            resourceLoadManager.del(this);
        }
    };

    LeafletIconManager.prototype.load_new_icon = function(icon_name, icon_url, icon_size, icon_id, iconAnchor){
        var img = new Image();
        this.count_loading_img++;
        img.onload = function() {
            iconsLeaflet.icons[icon_name] = {
                icon: new L.icon({
                    iconUrl: icon_url,
                    iconSize: icon_size,
                    iconAnchor: iconAnchor
                }),
                canvas_icon: {
                    img: img,
                    iconSize: [this.width, this.height]
                },
                id: icon_id
            };
            iconsLeaflet.count_loading_img--;
            iconsLeaflet.load_complete();
        };
        img.onerror = function() {
            console.warn('LeafletIconManager: Content dont load: ', icon_url);
            iconsLeaflet.count_loading_img--;
            iconsLeaflet.load_complete();
        };
        img.src = icon_url;
    };



    return LeafletIconManager;
})();


// Массив иконок
var iconsLeaflet = new LeafletIconManager();