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
        this.count_loading = 0;  // ������� ������� ��������  (� ������ ������ ����  = 0)
        this.count_image = 0;   // ������� ����������� �����
        this.count_all = 0; // ������� ����������� �������� �����������
        this.images = {}; // ������ ���� ��������������� �����������
        this.ready_images = false;

        this.jq_preloader = null;

        this.time_out_min = null;
        this.time_out_max = null;
        this.min_delay = 800;
        this.max_delay = 60000;
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
        this.images[this.count_image] = img;
        this.count_image++;
        this.count_loading--;

        if (this.count_loading == 0 && this.time_out_max) {
            if (this.time_out_max) clearTimeout(this.time_out_max);
            this.all_image_loaded();
        }
        if (consolePreloader)
            consolePreloader.update_load_data_status();
    };

    PreloaderImage.prototype.set_image_on_load = function (img, call_back) {
        this.count_loading++;
        this.count_all++;
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
        //console.log('PreloaderImage.prototype.all_image_loaded: ', this.count_image);
        this.ready_images = true;
        after_preload_load_images();
    };



    return PreloaderImage;
})();

var preloaderImage = new PreloaderImage();