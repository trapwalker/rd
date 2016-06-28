//function SetImageOnLoad(img, onLoadHandler) {
//    if (img.complete) {
//        onLoadHandler(img);
//        return;
//    }
//    img.addEventListener('load', function () {
//        onLoadHandler(img);
//    }, false);
//}



var PreloaderImage = (function(){
    function PreloaderImage() {
        this.count_loading = 0;  // —чЄтчик сколько грузитс€  (в идеале должен быть  = 0)
        this.count_image = 0;   // —чЄтчик изображений всего
        this.images = {}; // —писок всех предзагруженных изображений
        this.ready_images = false;

        this.jq_preloader = null;

        this.time_out_min = null;
        this.time_out_max = null;
        this.min_delay = 5000;
        this.max_delay = 30000;
    }

    PreloaderImage.prototype.add = function(img_url) {
        var img = new Image();
        img.src = img_url;

        if (!this.time_out_min) this.time_out_min = setTimeout(this.all_image_loaded_min.bind(this), this.min_delay);
        if (!this.jq_preloader) this.jq_preloader = $('#preloaderBlock');

        this.set_image_on_load(img, this.load_complete.bind(this));
    };

    PreloaderImage.prototype.add_with_callback = function(img_url, callback) {
        var img = new Image();
        img.src = img_url;
        this.set_image_on_load(img, callback);
    };


    PreloaderImage.prototype.load_complete = function(img) {
        var str = 'image ' + this.count_image +' loaded: ' + img.src;
        //console.log(str);
        this.images[this.count_image] = img;
        this.count_image++;
        this.count_loading--;

        if (this.count_loading == 0 && this.time_out_max) {
            if (this.time_out_max) clearTimeout(this.time_out_max);
            this.all_image_loaded();
        }

        //this.jq_preloader.append('<h5>' + str + '</h5>')
        if (consolePreloader)
            consolePreloader.add_message('system', str, false);
    };

    PreloaderImage.prototype.set_image_on_load = function (img, call_back) {
        this.count_loading++;
        if (img.complete) {
            call_back(img);
            return;
        }

        img.addEventListener('load', function () {
            call_back(img);
        }, false);
    };


    PreloaderImage.prototype.all_image_loaded_min = function() {
        //console.log('PreloaderImage.prototype.all_image_loaded_min');
        if (this.count_loading == 0) {
            this.all_image_loaded();
        }
        else {
            this.time_out_max = setTimeout(this.all_image_loaded.bind(this), this.max_delay);
        }
    };


    PreloaderImage.prototype.all_image_loaded = function() {
        console.log('PreloaderImage.prototype.all_image_loaded: ', this.count_image);
        //$('.site-main-block').css('display', 'block');
        $('#siteBlock').css('display', 'block');
        this.jq_preloader.css('display', 'none');
        this.ready_images = true;

        after_preload_load_images();
    };



    return PreloaderImage;
})();

var preloaderImage = new PreloaderImage();