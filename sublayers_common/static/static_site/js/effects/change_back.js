var ChangeBackFrameEffect = (function(){
    function ChangeBackFrameEffect() {
        this.last_time = 0;
        this.change_frame_delay = 3000;
        this.animation_duration = 1000;

        timeManager.addTimerEvent(this, 'redraw');
        this.jq_images_list = [];
        this.opacity_list = [];
    }

    ChangeBackFrameEffect.prototype.add_image = function(jq_image, opacity) {
        this.jq_images_list.push(jq_image);
        this.opacity_list.push({opacity: opacity, in_animation: false});
    };

    ChangeBackFrameEffect.prototype._get_free_index = function () {
        var free_index_list = [];
        for (var i = 0; i < this.opacity_list.length; i++) {
            if (!this.opacity_list[i].in_animation && this.opacity_list[i].opacity == 0.0) {
                free_index_list.push(i);
            }
        }
        if (free_index_list.length == 0) return null;
        return free_index_list[Math.floor(Math.random() * free_index_list.length - 0.1)];
    };

    ChangeBackFrameEffect.prototype.redraw = function(time) {
        if (time < this.change_frame_delay + this.last_time) return;
        this.last_time = time;
        //console.log('ChangeBackFrameEffect.prototype.redraw');
        var self = this;

        var index = this._get_free_index();
        if (index == null) return;
        var jq_image = this.jq_images_list[index];

        this.opacity_list[index].opacity = 1.0;
        this.opacity_list[index].in_animation = true;
        //jq_image.animate({opacity: 1.0}, this.change_frame_delay, function () {
        //    if (self.jq_images_list.indexOf(jq_image) != -1)
        //        jq_image.animate({opacity: 0.0}, self.change_frame_delay, function () {
        //            if (self.jq_images_list.indexOf(jq_image) != -1) {
        //                self.opacity_list[index].opacity = 0.0;
        //                self.opacity_list[index].in_animation = false;
        //            }
        //        });
        //});
        var animate_step = 20;
        var iterator = 0;
        var animate_timer = setInterval(function () {
            if (self.jq_images_list.indexOf(jq_image) == -1) {
                clearInterval(animate_timer);
                return;
            }
            iterator++;
            jq_image.css('opacity', iterator / animate_step);
            if (iterator == animate_step) {
                clearInterval(animate_timer);
                animate_timer = setInterval(function () {
                    if (self.jq_images_list.indexOf(jq_image) == -1) {
                        clearInterval(animate_timer);
                        return;
                    }
                    iterator--;
                    jq_image.css('opacity', iterator / animate_step);
                    if (iterator == 0) {
                        clearInterval(animate_timer);
                        self.opacity_list[index].opacity = 0.0;
                        self.opacity_list[index].in_animation = false;
                    }
                }, self.change_frame_delay / animate_step);
            }
        }, this.change_frame_delay / animate_step);

    };


    ChangeBackFrameEffect.prototype.change_site_size = function (old_size, new_size) {
        this.jq_images_list = [];
        this.opacity_list = [];
        this.last_opacity_1_index = null;

        var jq_back = $('.site-main-back').first();
        jq_back.empty();


        function loaded_back_image(img) {
            var jq_back_path = $('<div class="site-main-back-part" style="opacity: 0;"></div>');
            jq_back.append(jq_back_path);
            jq_back_path.css('background', 'transparent url(' + img.src + ') no-repeat center top');
            if (!changeBackFrameEffect) {
                changeBackFrameEffect = new ChangeBackFrameEffect();
            }
            changeBackFrameEffect.add_image(jq_back_path, 0.0);
        }

        if (currentSiteSize == '1080') {
            preloaderImage.add_with_callback('/static/static_site/img/09-06-16/1080_aurora_001.png', loaded_back_image);
            preloaderImage.add_with_callback('/static/static_site/img/09-06-16/1080_aurora_002.png', loaded_back_image);
            preloaderImage.add_with_callback('/static/static_site/img/09-06-16/1080_aurora_003.png', loaded_back_image);
            preloaderImage.add_with_callback('/static/static_site/img/09-06-16/1080_aurora_004.png', loaded_back_image);
            preloaderImage.add_with_callback('/static/static_site/img/09-06-16/1080_aurora_005.png', loaded_back_image);
            preloaderImage.add_with_callback('/static/static_site/img/09-06-16/1080_aurora_006.png', loaded_back_image);
        }

        if (currentSiteSize == '768') {
            preloaderImage.add_with_callback('/static/static_site/img/1366_june/768_aurora_001.png', loaded_back_image);
            preloaderImage.add_with_callback('/static/static_site/img/1366_june/768_aurora_002.png', loaded_back_image);
            preloaderImage.add_with_callback('/static/static_site/img/1366_june/768_aurora_003.png', loaded_back_image);
            preloaderImage.add_with_callback('/static/static_site/img/1366_june/768_aurora_004.png', loaded_back_image);
            preloaderImage.add_with_callback('/static/static_site/img/1366_june/768_aurora_005.png', loaded_back_image);
            preloaderImage.add_with_callback('/static/static_site/img/1366_june/768_aurora_006.png', loaded_back_image);
        }
    }

    ChangeBackFrameEffect.prototype.randInt = function (a, b) {
        return ~~(Math.random() * (b - a) + a);
    };

    return ChangeBackFrameEffect;
})();

var changeBackFrameEffect;