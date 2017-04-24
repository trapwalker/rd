var PreloaderImage = (function(){
    function PreloaderImage() {
        this.count_loading = 0;  // Счётчик сколько грузится  (в идеале должен быть  = 0)
        this.count_image = 0;   // Счётчик изображений всего
        this.count_all = 0; // Сколько изображений пытаются загрузиться
        this.task_id = 0; //  Счётчик для формирования id тасков
        this.images = {}; // Список всех предзагруженных изображений

        this.tasks = []; // Список объектов вида: {id, img_url, callback, maxdelay_timer}
        this.callbacks = []; // Список коллбеков

        this.max_loading_count = 5;  // Максимальное количество одновременно загружаемых объектов
    }

    PreloaderImage.prototype.get_tasks_by_url = function(img_url) {
        var res = [];
        for (var i = 0; i < this.tasks.length; i++)
            if (this.tasks[i].img_url == img_url)
                res.push(this.tasks[i]);
        return res;
    };

    PreloaderImage.prototype.get_task_by_id = function(task_id) {
        for (var i = 0; i < this.tasks.length; i++)
            if (this.tasks[i].id == task_id)
                return this.tasks[i];
        return null;
    };

    PreloaderImage.prototype.can_call_callback = function(callback) {
        for (var i = 0; i < this.tasks.length; i++)
            if (this.tasks[i].callback === callback)
                return false;
        return true;
    };

    PreloaderImage.prototype.del_task = function(task_id) {
        var index = -1;
        for (var i = 0; i < this.tasks.length && index < 0; i++)
            if (this.tasks[i].id == task_id)
                index = i;
        if (index >= 0)
            return this.tasks.splice(index, 1)[0];
        else
            return null;
    };

    PreloaderImage.prototype.add = function(img_url, callback, maxdelay) {
        var img = new Image();
        img.src = img_url;

        this.task_id++;
        var task = {
            id: this.task_id,
            img_url: img_url,
            callback: callback,
            maxdelay_timer: null,
            img: img
        };

        if (maxdelay && maxdelay >= 0) task.maxdelay_timer = setTimeout(this.task_delay_timer.bind(this, this.task_id), maxdelay);

        this.tasks.push(task);

        if (this.count_loading < this.max_loading_count)
            this.set_image_on_load(img, this.load_complete.bind(this, img_url));

    };

    PreloaderImage.prototype.load_complete = function(img_url, img) {
        //console.log('load_complete', this.count_loading, img_url);
        this.images[this.count_image] = img;
        this.count_image++;
        this.count_loading--;

        // Получить все таски по данной ссылке
        var tasks = this.get_tasks_by_url(img_url);
        //console.log('tasks = ', tasks);
        for (var i = 0; i < tasks.length; i++) {
            var task = this.del_task(tasks[i].id); // удаляем таск
            if (task) {
                //console.log('task = ', task);
                if (task.maxdelay_timer) clearTimeout(task.maxdelay_timer); // очищаем таймер, если он ещё не вызывался
                if (this.can_call_callback(task.callback)) task.callback(true); // вызываем конкретный коллбек, если больше нет картинок на этот коллбек
            }
        }

        // Взять следующий таск и попробовать загрузить:
        if(this.tasks.length) {
            var t = this.tasks[0];
            this.set_image_on_load(t.img, this.load_complete.bind(this, t.img_url));
        }
    };

    PreloaderImage.prototype.set_image_on_load = function (img, call_back) {
        //console.log("set_image_on_load", this.count_loading);
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

    PreloaderImage.prototype.task_delay_timer = function(task_id) {
        //console.log('PreloaderImage.prototype.task_delay_timer', task_id);
        var task = this.del_task(task_id);
        if (! task) return;
        task.maxdelay_timer = null;
        task.callback(false);
    };

    PreloaderImage.prototype.add_list = function(img_url_list, callback, maxdelay) {
        var called_callback = false;
        var timeout = null;

        function delay_timeout() {
            if (! called_callback) {
                called_callback = true;
                timeout = null;
                callback(true);
            }
        }

        function load_callback() {
            if (timeout) clearTimeout(timeout);
            if (! called_callback) {
                called_callback = true;
                callback(true);
            }
        }

        if (maxdelay && maxdelay >= 0) timeout = setTimeout(delay_timeout, maxdelay);

        for (var i = 0; i < img_url_list.length; i++)
            this.add(img_url_list[i], load_callback);
    };

    return PreloaderImage;
})();

var preloaderImage = new PreloaderImage();