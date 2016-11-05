var LocationTrainerNPC = (function (_super) {
    __extends(LocationTrainerNPC, _super);

    function LocationTrainerNPC(npc_rec, jq_town_div, building_name) {
        _super.call(this, npc_rec, jq_town_div, building_name);
        var self = this;

        this.all_skill_points = 0;  // без учета купленных
        this.all_perks_points = 0;
        this.cur_level = 0;
        this.drop_price = 0;
        this.skills = {
            driving: {},
            engineering: {},
            leading: {},
            masking: {},
            shooting: {},
            trading: {}
        };
        this.buy_skills = {
            buy_driving: {},
            buy_engineering: {},
            buy_leading: {},
            buy_masking: {},
            buy_shooting: {},
            buy_trading: {}
        };
        this.perks = {};
        this.perk_state = {
            default: {class: 'default', text: ' ● '},
            active: {class: 'active', text: '[●]'},
            unactive: {class: 'unactive', text: '[  ]'},
            disable: {class: 'disable', text: '   '}
        };
        this.str_for_remove_cls = 'default active unactive disable';

        this._perk_line_back = true;
        // Навыки
        this.jq_main_div.find('.trainer-skill-item-change-arrow').click(function () {
            var jq_this = $(this);
            self.setSkill(jq_this.data('skill_name'), jq_this.data('d_val'));
        });
        this.jq_main_div.find('.trainer-skill-item-main').mouseenter(function() {
            var skill_name = $(this).data('skill_name');
            if (self.skills.hasOwnProperty(skill_name))
                locationManager.panel_right.show({text: self.skills[skill_name].description }, 'description');
        });
        this.jq_main_div.find('.trainer-skill-item-main').mouseleave(function() {
            locationManager.panel_right.show({text: '' }, 'description');
        });

        // Кнопка сброса
        this.jq_main_div.find('.trainer-reset-all').click(function () { self.reset(); });

        // Кнопка покупки апдейтов
        this.jq_main_div.find('.trainer-buy-updates').click(function () {
            for (var buy_skill_name in self.buy_skills)
                if (self.buy_skills.hasOwnProperty(buy_skill_name)) {
                    var buy_skill = self.buy_skills[buy_skill_name];
                    if (!buy_skill.select) continue;
                    buy_skill.select = false;
                    var jq_buy_skill = self.jq_main_div.find('.trainer-' + buy_skill_name);
                    jq_buy_skill.removeClass('active');

                    var skill_name = buy_skill_name.split('_')[1];
                    var skill = self.skills[skill_name];
                    if ((buy_skill.value >= buy_skill.limit) ||
                        (skill.value >= skill.limit)) continue;
                    buy_skill.value += 1;
                    skill.value += 1;


                    if (buy_skill.value < buy_skill.limit) {
                        jq_buy_skill.css('display', 'block');
                        jq_buy_skill.find('.trainer-center-updates-label').text('v.' + (buy_skill.value + 1));
                    }
                    else
                        jq_buy_skill.css('display', 'none');

                    self.jq_main_div.find('.trainer-skill-' + skill_name).text(self._getSkillValue(skill_name));
                }

            self.refreshUpdatePrice();
            self.refreshPerkState();
        });
        this.jq_main_div.find('.trainer-center-updates-block').click(function () {
            var jq_this =  $(this);
            var data_skill_name = jq_this.data('update_name');
            if (self.buy_skills.hasOwnProperty(data_skill_name)) {
                self.buy_skills[data_skill_name].select = !self.buy_skills[data_skill_name].select;
                if (self.buy_skills[data_skill_name].select)
                    jq_this.addClass('active');
                else
                    jq_this.removeClass('active');
                self.refreshUpdatePrice();
            }
        });
        this.jq_main_div.find('.trainer-center-updates-block').mouseenter(function() {
            var skill_name = $(this).data('update_name');
            if (self.buy_skills.hasOwnProperty(skill_name))
                locationManager.panel_right.show({text: self.buy_skills[skill_name].description }, 'description');
        });
        this.jq_main_div.find('.trainer-center-updates-block').mouseleave(function() { locationManager.panel_right.show({text: '' }, 'description'); });

        this.update();
    }

    LocationTrainerNPC.prototype.get_self_info = function () {
        clientManager.sendGetTrainerInfo(this);
    };

    LocationTrainerNPC.prototype._getPrice = function() {
        var price = 0;

        // Проверка факта сброса скилов
        for (var skill_name in this.skills)
            if (this.skills.hasOwnProperty(skill_name)) {
                var need_price = user.example_agent.rpg_info[skill_name].value + this.buy_skills['buy_' + skill_name].value;
                if (this.skills[skill_name].value < need_price) {
                    price += this.drop_price;
                    break;
                }
            }

        // Проверка факта сброса перков
        if (price == 0)
            for (var perk_name in this.perks)
                if (this.perks.hasOwnProperty(perk_name)) {
                    var perk = this.perks[perk_name];
                    if ((perk.start_state == 'default') && ((perk.state == 'unactive') || (perk.state == 'disable'))) {
                        price += this.drop_price;
                        break;
                    }
                }

        // Проверка факта покупки очков навыков
        for (var buy_skill_name in this.buy_skills)
            if (this.buy_skills.hasOwnProperty(buy_skill_name)) {
                var buy_skill = this.buy_skills[buy_skill_name];
                for (var val = buy_skill.value; val > buy_skill.start_value; val--)
                    price += buy_skill.price[val];
            }

        return price;
    };

    LocationTrainerNPC.prototype._getSkillValue = function(skill_name) {
        if (this.skills.hasOwnProperty(skill_name)) {
            var skill = this.skills[skill_name];
            if (skill.mod.bonus_step > 0)
                return skill.value + Math.floor(skill.value / skill.mod.bonus_step);
            else
                return skill.value
        }
        return 0;
    };

    LocationTrainerNPC.prototype._getSkillLimit = function(skill_name) {
        if (this.skills.hasOwnProperty(skill_name)) {
            var skill = this.skills[skill_name];
            return skill.mod.limit > 0 ? skill.mod.limit : skill.limit
        }
        return 0;
    };

    LocationTrainerNPC.prototype._getFreeSkillPoints = function() {
        var skill_point = 0;
        for (var skill_name in this.skills)
            if (this.skills.hasOwnProperty(skill_name))
                skill_point += this.skills[skill_name].value;

        var buy_skill_point = 0;
        for (var buy_skill_name in this.buy_skills)
            if (this.buy_skills.hasOwnProperty(buy_skill_name))
                buy_skill_point += this.buy_skills[buy_skill_name].value;

        return this.all_skill_points - skill_point + buy_skill_point;
    };

    LocationTrainerNPC.prototype._getFreePerkPoints = function() {
        var res = 0;
        for (var key in this.perks)
            if (this.perks.hasOwnProperty(key))
                if ((this.perks[key].state == 'default') || (this.perks[key].state == 'active')) res++;
        return this.all_perks_points - res;
    };

    LocationTrainerNPC.prototype._getActivePerks = function() {
        var res = [];
        for (var perk_name in this.perks)
            if (this.perks.hasOwnProperty(perk_name))
                if ((this.perks[perk_name].state == 'active') ||
                    (this.perks[perk_name].state == 'default')) res.push(this.perks[perk_name]);
        return res;
    };

    LocationTrainerNPC.prototype.update = function() {
        //console.log('LocationTrainerNPC.prototype.update');
        this.clear();
        this.cur_level = user.example_agent.rpg_info.cur_lvl;
        var self = this;

        // Навыки
        this.all_skill_points = user.example_agent.rpg_info.all_skill_points;
        for (var skill_name in this.skills)
            if (this.skills.hasOwnProperty(skill_name) && user.example_agent.rpg_info.hasOwnProperty(skill_name)) {
                var skill = this.skills[skill_name];
                var ex_skill = user.example_agent.rpg_info[skill_name];
                skill.start_value = ex_skill.value;
                skill.value = ex_skill.value;
                skill.limit = ex_skill.limit;
                skill.mod.bonus_step = ex_skill.mod.bonus_step;
                skill.mod.limit = ex_skill.mod.limit;
                skill.description = ex_skill.description;
                this.jq_main_div.find('.trainer-skill-' + skill_name).text(this._getSkillValue(skill_name));
            }

        // Апдейты
        this.jq_main_div.find('.trainer-center-updates-block').css('display', 'none');
        for (var buy_skill_name in this.buy_skills)
            if (this.buy_skills.hasOwnProperty(buy_skill_name)) {
                var buy_skill = this.buy_skills[buy_skill_name];
                buy_skill.value = user.example_agent.rpg_info[buy_skill_name].value;
                buy_skill.start_value = buy_skill.value;
                buy_skill.limit = user.example_agent.rpg_info[buy_skill_name].limit;
                buy_skill.price = user.example_agent.rpg_info[buy_skill_name].price;
                buy_skill.description = user.example_agent.rpg_info[buy_skill_name].description;
                if (buy_skill.value < buy_skill.limit) {
                    var jq_buy_skill = this.jq_main_div.find('.trainer-' + buy_skill_name);
                    jq_buy_skill.css('display', 'block');
                    jq_buy_skill.find('.trainer-center-updates-label').text('v.' + (buy_skill.value + 1));
                }
            }
        this.jq_main_div.find('.trainer-update-price').text(0);
        this.jq_main_div.find('.trainer-skill-free-points').text(this._getFreeSkillPoints());

        // Перки
        this.all_perks_points = user.example_agent.rpg_info.all_perks_points;
        for (var i = 0; i < user.example_agent.rpg_info.perks.length; i++) {
            var ex_perk = user.example_agent.rpg_info.perks[i];
            var perk = {
                title: ex_perk.perk.title,
                description: ex_perk.perk.description,
                id: ex_perk.perk.id,
                node_hash: ex_perk.perk.node_hash,
                req_level: ex_perk.perk.level_req,
                req_driving: ex_perk.perk.driving_req,
                req_engineering: ex_perk.perk.engineering_req,
                req_leading: ex_perk.perk.leading_req,
                req_masking: ex_perk.perk.masking_req,
                req_shooting: ex_perk.perk.shooting_req,
                req_trading: ex_perk.perk.trading_req,
                perk_req: ex_perk.perk_req
            };
            if (ex_perk.active)
                perk.state = 'default';
            else
                perk.state = 'unactive';
            perk.start_state = perk.state;
            this.perks[perk.node_hash] = perk;
        }
        this.append_div_perk('default');
        this.append_div_perk('unactive');
        this.refreshPerkState();

        // После отрисовки повесить клики
        this.jq_main_div.find('.trainer-perk-item-checkbox').click(function () {
            self.setPerk($(this).data('node_hash'));
        });
        this.jq_main_div.find('.trainer-perk-item').mouseenter(function() {
            locationManager.panel_right.show({text: self.perks[$(this).data('node_hash')].description }, 'description');
        });
        this.jq_main_div.find('.trainer-perk-item').mouseleave(function() { locationManager.panel_right.show({text: '' }, 'description'); });
    };

    LocationTrainerNPC.prototype.append_div_perk = function (state) {
        //console.log('LocationTrainerNPC.prototype.append_div_perk', state);
        var jq_perk_list = this.jq_main_div.find('.trainer-perks-list');
        var back_class = '';
        for (var key in this.perks)
            if (this.perks.hasOwnProperty(key)) {
                var perk = this.perks[key];
                if (perk.state == state) {
                    var back_class = this._perk_line_back ? 'trainer-light-back' : 'trainer-dark-back';
                    this._perk_line_back = !this._perk_line_back;
                    jq_perk_list.append(
                        '<div class="trainer-perk-item" data-node_hash="' + perk.node_hash + '">' +
                            '<div class="trainer-perk-item-caption ' + state + ' ' + back_class + '">' + perk.title + '</div>' +
                            '<div class="trainer-perk-item-checkbox ' + state + ' ' + back_class + '" data-node_hash="' + perk.node_hash + '">' + this.perk_state[state].text + '</div>' +
                        '</div>');
                }
            }
    };

    LocationTrainerNPC.prototype.clear = function() {
        //console.log('LocationTrainerNPC.prototype.clear');
        this.all_skill_points = 0;
        for (var skill_name in this.skills)
            if (this.skills.hasOwnProperty(skill_name))
                this.skills[skill_name] = {
                    start_value: 0,
                    value: 0,
                    limit: 0,
                    description: '',
                    mod: {
                        bonus_step: 0,
                        limit: 0
                    }
                };

        for (var buy_skill_name in this.buy_skills)
            if (this.buy_skills.hasOwnProperty(buy_skill_name))
                this.buy_skills[buy_skill_name] = {
                    start_value: 0,
                    value: 0,
                    limit: 0,
                    price: {},
                    description: '',
                    select: false
                };
        this.jq_main_div.find('.trainer-center-updates-block').removeClass('active');

        this.perks = {};
        this._perk_line_back = true;
        this.jq_main_div.find('.trainer-perks-list').empty();
    };

    LocationTrainerNPC.prototype.refreshPerkState = function() {
        for (var perk_name in this.perks)
            if (this.perks.hasOwnProperty(perk_name)) {
                var perk = this.perks[perk_name];
                if (perk.state == 'default') continue;
                var enable = perk.req_level <= this.cur_level;
                if (enable)
                    for (var skill_name in this.skills)
                        if (this.skills.hasOwnProperty(skill_name)) {
                            enable = enable && (perk['req_' + skill_name] <= this._getSkillValue(skill_name))
                            if (!enable) break;
                        }
                for (var j = 0; enable && (j < perk.perk_req.length); j++)
                    enable = ((this.perks[perk.perk_req[j]].state == 'active') ||
                              (this.perks[perk.perk_req[j]].state == 'default'))
                if (enable) {
                    if (perk.state == 'disable') perk.state = 'unactive';
                }
                else
                    perk.state = 'disable';
            }
        $('.trainer-perk-free-points').text(this._getFreePerkPoints());

        var self = this;
        var jq_perk_list = this.jq_main_div.find('.trainer-perks-list');
        jq_perk_list.children().each(function() {
            var node_hash = $(this).data('node_hash');
            if (node_hash) {
                var perk = self.perks[node_hash];
                var jq_caption = $(this).find('.trainer-perk-item-caption');
                var jq_checkbox = $(this).find('.trainer-perk-item-checkbox');
                jq_caption.removeClass(self.str_for_remove_cls);
                jq_caption.addClass(self.perk_state[perk.state].class);
                jq_checkbox.removeClass(self.str_for_remove_cls);
                jq_checkbox.addClass(self.perk_state[perk.state].class);
                jq_checkbox.text(self.perk_state[perk.state].text);
            }
        });
        this.set_header_text();
    };

    LocationTrainerNPC.prototype.refreshUpdatePrice = function() {
        var update_price = 0;
        for (var buy_skill_name in this.buy_skills)
            if (this.buy_skills.hasOwnProperty(buy_skill_name)) {
                var buy_skill = this.buy_skills[buy_skill_name];
                if (!buy_skill.select) continue;
                if (buy_skill.price.hasOwnProperty(buy_skill.value + 1))
                    update_price += buy_skill.price[(buy_skill.value + 1)];
                else
                    console.warn('Ошибка вычисления цены апдейта');
            }
        this.jq_main_div.find('.trainer-update-price').text(update_price);
    };

    LocationTrainerNPC.prototype.setSkill = function(skill_name, d_val) {
        //console.log('LocationTrainerNPC.prototype.setSkill', skill_name, d_val);
        if (this.skills.hasOwnProperty(skill_name)) {
            var skill = this.skills[skill_name];
            skill.value += d_val;
            if ((skill.value >= skill.start_value) &&
                (skill.value <= this._getSkillLimit(skill_name)) &&
                (this._getFreeSkillPoints() >= 0)) {
                this.jq_main_div.find('.trainer-skill-' + skill_name).text(this._getSkillValue(skill_name));
                this.jq_main_div.find('.trainer-skill-free-points').text(this._getFreeSkillPoints());
                this.refreshPerkState();
            }
            else
                skill.value -= d_val;
        }

        // Обновление менеджера обучения
        teachingManager.redraw();
    };

    LocationTrainerNPC.prototype.setPerk = function(perk_node_hash) {
        //console.log('LocationTrainerNPC.prototype.setPerk', perk_node_hash);
        if (this.perks.hasOwnProperty(perk_node_hash)) {
            var state = this.perks[perk_node_hash].state;
            if (state != 'active' && state != 'unactive') return;
            state = state == 'active' ? 'unactive' : 'active';
            if ((state == 'active') && (this._getFreePerkPoints() <= 0))  return;
            this.perks[perk_node_hash].state = state;
            this.refreshPerkState();
        }
    };

    LocationTrainerNPC.prototype.setDropPrice = function(drop_price) {
        //console.log('LocationTrainerNPC.prototype.setSkill', drop_price);
        this.drop_price = drop_price;
        this.jq_main_div.find('.trainer-drop-price').text(drop_price);
    };

    LocationTrainerNPC.prototype.apply = function() {
        //console.log('LocationTrainerNPC.prototype.apply');
        clientManager.sendSetRPGState(this);
    };

    LocationTrainerNPC.prototype.cancel = function() {
        //console.log('LocationTrainerNPC.prototype.cancel');
        this.update();
    };

    LocationTrainerNPC.prototype.reset = function() {
        //console.log('LocationTrainerNPC.prototype.reset');
        for (var skill_name in this.skills)
            if (this.skills.hasOwnProperty(skill_name)) {
                this.skills[skill_name].start_value = 0;
                this.skills[skill_name].value = 0;
                this.jq_main_div.find('.trainer-skill-' + skill_name).text(0);
            }
        this.jq_main_div.find('.trainer-skill-free-points').text(this._getFreeSkillPoints());

        for (var perk_name in this.perks)
            if (this.perks.hasOwnProperty(perk_name))
                this.perks[perk_name].state = 'unactive';

        this.refreshPerkState();
    };

    LocationTrainerNPC.prototype.set_buttons = function () {
        //console.log('LocationTrainerNPC.prototype.set_buttons');
        if (!locationManager.isActivePlace(this)) return;
        locationManager.setBtnState(1, '</br>Применить', true);
        locationManager.setBtnState(2, '</br>Отмена', true);
        locationManager.setBtnState(3, '</br>Назад', true);
        locationManager.setBtnState(4, '</br>Выход', true);
    };

    LocationTrainerNPC.prototype.set_panels = function () {
        if (!locationManager.isActivePlace(this)) return;
        _super.prototype.set_panels.call(this);
        locationManager.panel_left.show({transactions: this.transactions}, 'npc_transaction_info');
        locationManager.panel_right.show({text: '' }, 'description');
    };

    LocationTrainerNPC.prototype.set_header_text = function(html_text) {
        if (!locationManager.isActivePlace(this)) return;
        if (! html_text) {
            var jq_text_div = $('<div></div>');
            jq_text_div.append('<div>Применить: ' + this._getPrice() + 'NC</div>');
            jq_text_div.append('<div>Отмена: 0NC</div>');
            html_text = jq_text_div
        }
        _super.prototype.set_header_text.call(this, html_text);
    };

    LocationTrainerNPC.prototype.clickBtn = function (btnIndex) {
        //console.log('LocationTrainerNPC.prototype.clickBtn', btnIndex);
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

    LocationTrainerNPC.prototype.get_rpg_data = function() {
        var res = {
            skills: {},
            buy_skills: {},
            perks: {}
        };

        for (var skill_name in this.skills)
            if (this.skills.hasOwnProperty(skill_name))
                res.skills[skill_name] = this.skills[skill_name].value;

        for (var buy_skill_name in this.buy_skills)
            if (this.buy_skills.hasOwnProperty(buy_skill_name))
                res.buy_skills[buy_skill_name] = this.buy_skills[buy_skill_name].value;

        for (var perk_name in this.perks)
            if (this.perks.hasOwnProperty(perk_name))
                res.perks[perk_name] = {state: (this.perks[perk_name].state == 'active') || (this.perks[perk_name].state == 'default')}

        return res;
    };

    LocationTrainerNPC._getSkillValueReal = function (skill_name) {
        var skill = user.example_agent.rpg_info[skill_name];
        if (skill.mod.bonus_step > 0)
            return skill.value + Math.floor(skill.value / skill.mod.bonus_step);
        else
            return skill.value;
    };

    LocationTrainerNPC._getFreeSkillPointsReal = function() {
        var skill_point = 0;
        var buy_skill_point = 0;
        var rpg_info = user.example_agent.rpg_info;
        var skill_names = ['driving', 'engineering', 'leading', 'masking', 'shooting', 'trading'];

        for (var  i = 0; i < skill_names.length; i++) {
            skill_point += rpg_info[skill_names[i]].value;
            buy_skill_point += rpg_info['buy_' + skill_names[i]].value;
        }

        return rpg_info.all_skill_points - skill_point + buy_skill_point;
    };

    LocationTrainerNPC._getFreePerkPointsReal = function() {
        var res = 0;
        var perks = user.example_agent.rpg_info.perks;
        for(var key in perks)
            if (perks.hasOwnProperty(key))
                if (perks[key].active) res++;
        return user.example_agent.rpg_info.all_perks_points - res;
    };

    return LocationTrainerNPC;
})(LocationPlaceNPC);
