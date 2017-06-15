var LocationGirlNPC = (function (_super) {
    __extends(LocationGirlNPC, _super);

    function LocationGirlNPC(npc_rec, jq_town_div, building_name) {
        _super.call(this, npc_rec, jq_town_div, building_name);
        this.update();
        this.cur_service_index = 0;
    }

    LocationGirlNPC.prototype.get_self_info = function () {
        //console.log('LocationGirlNPC.prototype.get_self_info');
    };

    LocationGirlNPC.prototype.update = function () {
        //console.log('LocationGirlNPC.prototype.update');
        var jq_service_menu = this.jq_main_div.find('.girl-center-menu-block');
        var jq_service_images = this.jq_main_div.find('.building-center-pages-block');
        jq_service_menu.empty();
        jq_service_images.empty();
        for (var i = 0; i < this.npc_rec.service_list.length; i++) {
            var service_rec = this.npc_rec.service_list[i];
            jq_service_menu.append('<div class="girl-center-menu-item" data-page_cls="' + i + '">' + service_rec.title + '</div>');
            jq_service_images.append(
                '<div class="girl-center-page ' + i + '">' +
                    '<div class="girl-center-page-img" style="background: url(' + service_rec.image + '); "></div>' +
                '</div>'
            );
        }

        var self = this;
        jq_service_menu.find('.girl-center-menu-item').click(function () {
            self.cur_service_index = $(this).data('page_cls');
            self.jq_main_div.find('.girl-center-menu-item').removeClass('active');
            $(this).addClass('active');
            jq_service_images.find('.girl-center-page').css('display', 'none');
            jq_service_images.find('.' + self.cur_service_index).css('display', 'block');
            self.set_header_text();
        });
        jq_service_menu.find('.girl-center-menu-item').first().click();
    };

    LocationGirlNPC.prototype.set_header_text = function(html_text) {
        if (!locationManager.isActivePlace(this)) return;
        if (!html_text) {
            var html_text = $('<div></div>');
            html_text.append('<div>Приобрести услугу: -' + this.npc_rec.service_list[this.cur_service_index].price + 'NC</div>');
        }
        _super.prototype.set_header_text.call(this, html_text);
    };

    LocationGirlNPC.prototype.apply = function () {
        var param = {
            npc_node_hash: this.npc_rec.node_hash,
            service_index: this.cur_service_index
        };
        clientManager.sendGirlApply(param);
    };

    LocationGirlNPC.prototype.cancel = function () {
    };

    LocationGirlNPC.prototype.set_buttons = function () {
        if (!locationManager.isActivePlace(this)) return;
        locationManager.setBtnState(1, 'Приобрести</br>услугу', true);
        locationManager.setBtnState(2, '</br>Отмена', false);
        locationManager.setBtnState(3, '</br>Назад', true);
        locationManager.setBtnState(4, '</br>Выход', true);
    };

    LocationGirlNPC.prototype.set_panels = function() {
        if (!locationManager.isActivePlace(this)) return;
        _super.prototype.set_panels.call(this);
        locationManager.panel_left.show({transactions: this.transactions}, 'npc_transaction_info');
        locationManager.panel_right.show({text: '' }, 'description');
    };

    LocationGirlNPC.prototype.clickBtn = function (btnIndex) {
        switch (btnIndex) {
            case '1':
                this.apply();
                break;
            case '2':
                this.cancel();
                break;
            default:
                _super.prototype.clickBtn.call(this, btnIndex);
        }
    };

    LocationGirlNPC.prototype.setDropBonus = function (items) {
        var jq_items_list = this.jq_main_div.find('.girl-bottom-block').first();
        jq_items_list.empty();
        var calc_width = 0;
        for (var i = 0; i < items.length; i++) {
            calc_width += 180;
            var jq_item_div = $(
                '<div class="girl-drop-item-image-wrap">' +
                    '<div class="girl-drop-item-image town-interlacing" style="background: url(' + items[i].inv_icon_big + ') center center no-repeat;"></div>' +
                '</div>'
            );
            jq_item_div.mouseenter({example: items[i]}, function(event) {
                locationManager.panel_right.show({text: event.data.example.description }, 'description');
            });
            jq_item_div.mouseleave({}, function(event) { locationManager.panel_right.show({text: '' }, 'description'); });
            jq_items_list.append(jq_item_div);
        }
        calc_width += items.length * 30;
        jq_items_list.css('width', calc_width + 'px');
    };

    return LocationGirlNPC;
})(LocationPlaceNPC);