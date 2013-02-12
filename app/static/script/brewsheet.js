var ol = {};
(function(ns) {

    //Thinseth equation, Palmer "How to brew" p 58
    var calculateUtilization = function(G, T) {

        var fG = function(g) {
            return 1.65 * Math.pow(0.000125, (g-1));
        };

        var fT = function(t) {
            return (1 - Math.pow(Math.E, (-0.04 * t)))/ 4.15;
        };

        return fG(G) * fT(T);
    };

    var apiSearch = function(query, callback, model) {
        var params = {"filters": [{"name": "name", "op": "like", "val": "%" + query + "%"}]};
        $.get("/api/" + model + "?q=" + JSON.stringify(params), function(res) {

            if(res.objects){
                callback(res.objects);
            } else {
                callback([]);
            }
        });
    };

    var ToggleView = Backbone.View.extend({

        initialize: function() {
            _.bindAll(this, "toggle");
        },

        render: function() {
            this.$el.find(".toggle").on("click", this.toggle);
        },

        toggle: function() {
            this.$el.find(".content").toggle();
            this.$el.find(".toggle").toggleClass("icon-plus").toggleClass("icon-minus");
        }
    });

    var DynamicTableView = ToggleView.extend({

        listenOn: [],

        events: {
            "click .icon-remove-circle": "remove"
        },

        initialize: function() {
            ToggleView.prototype.initialize.apply(this, arguments);
            _.bindAll(this, "remove", "change");
        },

        render: function() {
            ToggleView.prototype.render.apply(this, arguments);
            _.each(this.listenOn, function(name) {
                this.$el.find("#" + name).on("change", this.change);
            }, this);
            return this;
        },

        change: function(e){
            var target = $(e.currentTarget);
            this.model.set(target.attr("id"), target.val());
        },

        remove: function() {
            this.model.destroy();
        }

    });

    var BaseSectionView = ToggleView.extend({

        initialize: function() {
            ToggleView.prototype.initialize.apply(this, arguments);
            this.collection.on("add", this.render, this);
            this.collection.on("destroy", this.render, this);
        },

        render: function() {
            ToggleView.prototype.render.apply(this, arguments);
            return this;
        },

        add: function(){
            this.collection.add(new this.collection.model());
        }
    });

    var toLbs = function(grams) {
        return grams * 0.002205;
    };

    var toGallons = function(liter) {
        return liter * 0.264172051242;
    };
/*
    var GeneralInformation = Backbone.Model.extend({
        "defaults": {
            "beer_name": "",
            "brewer": "",
            "beer_style": "",
            "wort_size": "",
            "batch_size": "",
            "computed_color": "",
            "computed_ibu": "",
            "actual_og": "",
            "fg": ""
        }
    });

    ns.GeneralInformationView = DynamicTableView.extend({

        listenOn: ["beer_name", "brewer", "beer_style", "wort_size", "batch_size", "computed_color", "computed_ibu", "actual_og", "fg"],

        initialize: function() {
            DynamicTableView.prototype.initialize.apply(this, arguments);

            this.model.on("change:actual_og", this.toggleABV, this);
            this.model.on("change:fg", this.toggleABV, this);

            this.model.on("change:actual_og", this.toggleIBU, this);
            this.model.on("change:wort_size", this.toggleIBU, this);
            this.options.brew.hops.on("add", this.toggleIBU, this);
            this.options.brew.hops.on("remove", this.toggleIBU, this);
            this.options.brew.hops.on("change", this.toggleIBU, this);

            this.model.on("change:wort_size", this.toggleColor, this);
            this.options.brew.malts.on("add", this.toggleColor, this);
            this.options.brew.malts.on("remove", this.toggleColor, this);
            this.options.brew.malts.on("change", this.toggleColor, this);

        },

        render: function() {
            this.$el.find("#desc").html(_.template($("#general_information_template").html(), this.model.toJSON()));
            DynamicTableView.prototype.render.apply(this, arguments);
            this.toggleABV();
            return this;
        },

        toggleABV: function() {
            var og = this.model.get("actual_og");
            var fg = this.model.get("fg");

            if(!isNaN(og) && og !== "" && !isNaN(fg) && fg !== "" ) {
                this.calculate_abv();
            } else {
                this.$el.find("#abv").val("");
            }
        },

        calculate_abv: function() {
            var og = this.model.get("actual_og");
            var fg = this.model.get("fg");
            var abv =(76.08 * (og - fg) / (1.775 - og)) * (fg / 0.794); //taken from http://www.brewersfriend.com/2011/06/16/alcohol-by-volume-calculator-updated/
            abv = Math.round( abv * 10 ) / 10;
            this.$el.find("#abv").val(abv);
        },

        toggleIBU: function() {
            var og = this.model.get("actual_og");
            var wort_size = this.model.get("wort_size");
            var hops = this.options.brew.hops;
            if(!isNaN(og) && og !== "" && !isNaN(wort_size) && wort_size !== "" && hops.length > 0 ) {
                 if(hops.reduce(function(state, hop) { return hop.validate(); }, true)) {
                     this.calculate_ibu();
                 } else {
                     this.$el.find("#computed_ibu").val("");
                     this.model.set("computed_ibu", "");
                 }
            }
        },

        calculate_ibu: function() {
            var brew = this.options.brew;
            var og = brew.generalInformation.get("actual_og");
            var volume = brew.generalInformation.get("wort_size");
            var ibu = brew.hops.reduce(function(total_ibu, hop) {
                var quantity = hop.get("quantity");
                var alpha_acid = hop.get("alpha_acid");
                var boil_time = hop.get("boil_time");
                var aau = parseFloat(quantity) * parseFloat(alpha_acid);
                var utilization = calculateUtilization(og, parseFloat(boil_time));
                var ibu = aau * utilization * (10 / volume );
                return total_ibu + ibu;
            }, 0);
            this.$el.find("#computed_ibu").val(Math.round(ibu));
            this.model.set("computed_ibu", Math.round(ibu));
        },

        toggleColor: function() {
            var malts = this.options.brew.malts;
            var volume =  this.options.brew.generalInformation.get("wort_size");
            if(volume !== "" && !isNaN(volume) && malts.length > 0) {
                if(malts.reduce(function(state, malt) { return malt.validate(["quantity", "color"]); }, true)) {
                    this.calculate_color();
                } else {
                    this.model.set("computed_color", "");
                    this.$el.find("#computed_color").val("");
                }
                if(malts.reduce(function(state, malt) { return malt.validate(["quantity", "ppg"]); }, true)) {
                    this.calculateOG();
                } else {
                    this.$el.find("#actual_og").val("");
                    this.model.set("actual_og", "");
                }
            }
        },

        calculateOG: function(){
            var malts = this.options.brew.malts;
            var volume =  this.options.brew.generalInformation.get("wort_size");
            var efficiency = 75;

            var og = malts.reduce(function(sum, malt) {
                var amount = malt.get("quantity");
                var ppg = malt.get("ppg");

                return sum + ((efficiency/100) * ppg) * (toLbs(amount) / toGallons(volume));
            }, 0);

            //round and get from nn to 1.0nn
            og = Math.round((1 + (og/1000)) * 1000) / 1000;
            this.$el.find("#actual_og").val(og);
            this.model.set("actual_og", og);

        },

        //based on Palmer, "how to brew" p. 271, and
        //http://en.wikipedia.org/wiki/Standard_Reference_Method
        //Moreys method used
        calculate_color: function() {
            var malts = this.options.brew.malts;
            var volume =  this.options.brew.generalInformation.get("wort_size");

            var total_mcu = malts.reduce(function(sum, malt) {
                var amount = malt.get("quantity");
                var ebc = malt.get("color");
                var mcu = (amount * 0.0022) * (ebc * 0.508);
                return sum + mcu;
            }, 0) / (volume * 0.2642);

            //Moreys Formula
            var srm = 1.49 * Math.pow(total_mcu, 0.69);
            var ebc = srm * 1.97;
            this.$el.find("#computed_color").val(Math.round(ebc));
            this.model.set("computed_color", Math.round(ebc));
        }

    });

*/
    var MashTime = Backbone.Model.extend({
        "defaults": {
            "mash_time": "",
            "mash_temperature": ""
        }
    });

    var MashSchedule = Backbone.Collection.extend({
        model: MashTime
    });

    var MashTimeView = ns.MashTimeView = BaseSectionView.extend({

        events: {
            "click #add_mash_time": "add"
        },

        initialize: function() {
            console.log("init", this.$el);
            _.bindAll(this, "add");
            BaseSectionView.prototype.initialize.apply(this, arguments);
            this.collection.on("destroy", this.render, this);
            this.collection.on("add", this.render, this);
        },

        render: function() {
            BaseSectionView.prototype.render.apply(this, arguments);
            var table = this.$el.find("#mash_schedule_table").find("tbody");
            table.html("");
            this.collection.each(function(mashTime) {
                table.append(new MashScheduleRowView({model: mashTime}).render().$el);
            });

            this.mashGraph = new MashGraph({collection: this.collection, el: this.$el.find("#mash_graph")}).render();
        }
    });

    var MashGraph = Backbone.View.extend({

        initialize: function () {
            this.collection.on("change", this.render, this);
        },

        render: function() {

            var data = this.collection.reduce(function(res, time) {
                if(!isNaN(parseFloat(time.get("mash_time"))) && !isNaN(parseFloat(time.get("mash_temperature")))) {
                    var start = res.prev;
                    var stop = start + parseFloat(time.get("mash_time"));
                    res.prev = stop;
                    res.arr.push([start, parseFloat(time.get("mash_temperature"))]);
                    res.arr.push([stop, parseFloat(time.get("mash_temperature"))]);
                }
                return res;
            }, {arr: [], "prev": 0}).arr;

            if(data.length > 0) {
                this.$el.show();
                $.plot(
                    this.$el,
                    [{data: data}],
                    {
                        xaxis: {min: 0, axisLabel: 'Minutes'},
                        yaxis: {min: 0, max: 100, axisLabel: '&deg;C'}
                    }
                );
                return this;
            } else {
                this.$el.hide();
            }
        }

    });

    var MashScheduleRowView = DynamicTableView.extend({

        tagName: "tr",

        listenOn: ["mash_time", "mash_temperature"],

        initialize: function() {
            DynamicTableView.prototype.initialize.apply(this, arguments);
        },

        render: function() {
            this.$el.html(_.template($("#mash_time_row_template").html(), this.model.toJSON()));
            DynamicTableView.prototype.render.apply(this, arguments);
            return this;
        }
    });

    var Water = Backbone.Model.extend({
        "defaults": {
            "mashing_water": "",
            "sparging_water": ""
        }
    });

    /*
    ns.WaterView = DynamicTableView.extend({

        listenOn: ["mashing_water", "sparging_water"],

        render: function() {
            this.$el.find("#water").html(_.template($("#water_form_template").html(), this.model.toJSON()));
            DynamicTableView.prototype.render.apply(this, arguments);
            return this;
        }
    });

    var Boil = Backbone.Model.extend({
        "defaults": {
            "boil_time": ""
        }
    });

    ns.BoiltimeView = DynamicTableView.extend({

        listenOn: ["boil_time"],

        render: function() {
            this.$el.find("#boiling").html(_.template($("#boil_time_form_template").html(), this.model.toJSON()));
            DynamicTableView.prototype.render.apply(this, arguments);
            return this;
        }
    });
*/


    var Fermentation  = Backbone.Model.extend({
        "defaults": {
            "type": "",
            "days": "",
            "temperature": ""
        }
    });

    var Fermentations = Backbone.Collection.extend({
        model: Fermentation
    });

    /*
    var FermentationOld  = Backbone.Model.extend({
        "defaults": {
            "name": "",
            "yeast_type": "none",
            "attenuation": "",
            "primary_fermentation_days": "",
            "primary_fermentation_temp": "",
            "secondary_fermentation_days": "",
            "secondary_fermentation_temp": "",
            "storage_days": "",
            "storage_temp": ""
        }
    });

    ns.FermentationView = DynamicTableView.extend({

        listenOn: ["name", "attenuation", "primary_fermentation_days", "primary_fermentation_temp", "secondary_fermentation_days", "secondary_fermentation_temp", "storage_days", "storage_temp"],

        events: {
            "change #yeast_type": "changeYeastType"
        },

        initialize: function() {
            DynamicTableView.prototype.initialize.apply(this, arguments);
            _.bindAll(this, "setYeast");
        },

        render: function() {
            this.$el.find("#fermentation").html(_.template($("#fermentation_form_template").html(), this.model.toJSON()));

            this.$el.find("#name").typeahead({source: apiSearch, selectCallback: this.setYeast, model: "yeast"});

            DynamicTableView.prototype.render.apply(this, arguments);
            return this;
        },

        changeYeastType: function() {
           var yeast_type = this.$el.find("#yeast_type").val();
           this.model.set({"yeast_type": yeast_type});
        },

        setYeast: function(data) {
            _.each(_.omit(data, "id"), function(value, key) {
                this.$el.find("#" + key).val(value).change();
            }, this);
        }
    });

    var AdditionalInformation = Backbone.Model.extend({
        "defaults": {
            "brew_date": "",
            "bottle_date": "",
            "filtered": false,
            "co2": "none",
            "comment": ""
        }
    });

    ns.AdditionalInformationView = DynamicTableView.extend({

        listenOn: ["brew_date", "bottle_date", "comment"],

        events:  {
            "change #filtered": "changeFiltered",
            "change #co2": "changeCo2"
        },

        initialize: function() {
            DynamicTableView.prototype.initialize.apply(this, arguments);
            _.bindAll(this, "changeFiltered", "changeCo2", "brewDateChanged", "bottleDateChanged");
        },

        render: function() {
            this.$el.find("#additional_desc").html(_.template($("#additional_information_template").html(), this.model.toJSON()));
            DynamicTableView.prototype.render.apply(this, arguments);

            this.$el.find("#brew_date").parent().datepicker().on('changeDate', this.brewDateChanged);
            this.$el.find("#bottle_date").parent().datepicker().on('changeDate', this.bottleDateChanged);

            return this;
        },

        brewDateChanged: function(e) {
            this.model.set({"brew_date": this.$el.find("#brew_date").val()});
        },

        bottleDateChanged: function(e) {
            this.model.set({"bottle_date": this.$el.find("#bottle_date").val()});
        },

        changeFiltered: function(){
            var filtered = this.$el.find("#filtered").is(":checked");
            this.model.set({"filtered": filtered});
        },

        changeCo2: function() {
            var co2 = this.$el.find("#co2").val();
            this.model.set({"co2": co2});
        }
    });

    var AsciiView = Backbone.View.extend({

        tagName: "pre",

        render: function() {
            this.$el.html(_.template($("#ascii_template").html(), this.options.data.serialize()));
            return this;
        }
    });

    var JsonView = Backbone.View.extend({

        tagName: "pre",

        render: function() {
            this.$el.html(JSON.stringify(this.options.data.serialize(), undefined, 4));
            return this;
        }
    });

    ns.RecepieView = Backbone.View.extend({

        events: {
            "click #show_recipe": "show_recipe",
            "click #show_json": "show_json",
            "click #save": "save"
        },

        initialize: function() {
            _.bindAll(this, "show_recipe", "show_json", "saved");
        },

        show_recipe: function() {
            var modal = $('#modal');
            modal.find(".modal-body").html(new AsciiView({data: this.options.data}).render().$el);
            modal.modal('show');
        },

        show_json: function() {
            var modal = $('#modal');
            modal.find(".modal-body").html(new JsonView({data: this.options.data}).render().$el);
            modal.modal('show');
        },

        save: function() {
            var data = JSON.stringify(this.options.data.serialize());

            //TODO proper url structure!!
            //or use backbone!
            var method = "POST";
            if(this.options.data.generalInformation.has("id")) {
                method = "PUT";
            }

            $.ajax({
                type: method,
                url: "/brews/add/",
                data: {data: data},
                success: this.saved,
                error: function(e){
                    alert("error..")
                }
            });
        },

        saved: function(e) {
            var res = JSON.parse(e);
            if(!this.options.data.generalInformation.has("id")) {
                this.options.data.generalInformation.set({"id": res.id});
            }
        }

    });

    ns.createBrew = function(initial) {

        var data = {};
        data.generalInformation = new GeneralInformation(initial.generalInformation);
        data.malts = new Malts(initial.malts);
        data.mashSchedule = new MashSchedule(initial.mashSchedule);
        data.hops = new Hops(initial.hops);
        data.additives = new Additives(initial.additives);
        data.water = new Water(initial.water);
        data.boil = new Boil(initial.boil);
        data.fermentation = new Fermentation(initial.fermentation);
        data.additionalInformation = new AdditionalInformation(initial.additionalInformation);


        var serialize = function() {
            return _.reduce(data, function(res, d, key) {
                res[key] = d.toJSON();
                return res;
            }, {});
        };

        return {
            malts: data.malts,
            hops: data.hops,
            generalInformation: data.generalInformation,
            additives: data.additives,
            water: data.water,
            boil: data.boil,
            mashSchedule: data.mashSchedule,
            fermentation: data.fermentation,
            additionalInformation: data.additionalInformation,
            serialize: serialize
        };
    };


*/





    var Malt = Backbone.Model.extend({
        "defaults": {
            "quantity": "",
            "percentage": "",
            "name": "",
            "ppg": "",
            "color": ""
        },

        validate: function(attrs) {
            return _.reduce(attrs, function(ok, attr) {
                return (this.get(attr) !== "" && !isNaN(this.get(attr)));
            }, true, this);
        }
    });

    var Malts = Backbone.Collection.extend({

        model: Malt,

        comparator: function(malt) {
            return -parseInt(malt.get("quantity"), 10);
        }
    });

    var  MaltSectionView = ns.MaltSectionView = BaseSectionView.extend({

        events: {
            "click #add_malt": "add"
        },

        initialize: function() {
            _.bindAll(this, "add");
            BaseSectionView.prototype.initialize.apply(this, arguments);
            this.collection.on("change:quantity", this.render, this);
        },

        render: function() {
            BaseSectionView.prototype.render.apply(this, arguments);
            this.adjustPercentages();
            var table = this.$el.find("#malts_table").find("tbody");
            table.html("");
            this.collection.each(function(malt) {
                table.append(new MaltTableRowView({model: malt}).render().$el);
            });
        },

        adjustPercentages: function() {
            var total = this.collection.reduce(function(total, malt) {return total += parseFloat(malt.get("quantity"));}, 0);
            this.collection.each(function(malt) {
                var percentage = (malt.get("quantity")/total) * 100;
                var pow = Math.pow(10, 1);
                percentage = Math.round(percentage * pow) / pow;
                if(!(isNaN(percentage))) {
                    malt.set({"percentage": percentage});
                }
            });
            this.collection.sort();
        }
    });

    var MaltTableRowView = DynamicTableView.extend({

        tagName: "tr",

        listenOn: ["quantity", "name", "ppg", "color"],

        initialize: function() {
            DynamicTableView.prototype.initialize.apply(this, arguments);
            _.bindAll(this,  "setMalt");
            this.model.on("change:percentage", this.percentageChange, this);
        },

        render: function() {
            this.$el.html(_.template($("#malt_table_row_template").html(), this.model.toJSON()));
            this.$el.find("#name").typeahead({source: apiSearch, selectCallback: this.setMalt, model: "malt"});
            DynamicTableView.prototype.render.apply(this, arguments);
            return this;
        },

        setMalt: function(malt) {
            _.each(_.omit(malt, "id"), function(value, key) {
                this.$el.find("#" + key).val(value).change();
            }, this);
        },

        percentageChange: function() {
            this.$el.find("#percentage").val(this.model.get("percentage"));
        }
    });

    var Hop = Backbone.Model.extend({
        "defaults": {
            "quantity": "",
            "name": "",
            "form": "cones",
            "alpha_acid": "",
            "boil_time": ""
        },

        validate: function() {
            return _.reduce(["quantity", "alpha_acid", "boil_time"], function(ok, attr) {
                return (this.get(attr) !== "" && !isNaN(this.get(attr)));
            }, true, this);

        }
    });

    var Hops = Backbone.Collection.extend({

        model: Hop,

        comparator: function(hop) {
            return -parseInt(hop.get("boil_time"), 10);
        }
    });

    var HopSectionView = ns.HopSectionView = BaseSectionView.extend({

        events: {
            "click #add_hop": "add"
        },

        initialize: function() {
            _.bindAll(this, "add");
            BaseSectionView.prototype.initialize.apply(this, arguments);
            this.collection.on("change:boil_time", this.changeBoilTime, this);
        },

        render: function() {
            BaseSectionView.prototype.render.apply(this, arguments);
            var table = this.$el.find("#hops_table").find("tbody");
            table.html("");
            this.collection.each(function(hop) {
                var view = new HopTableRowView({model: hop}).render();
                table.append(view.$el);
            });
        },

        changeBoilTime: function() {
            this.collection.sort();
            this.render();
        }
    });

    var HopTableRowView = DynamicTableView.extend({

        tagName: "tr",

        listenOn: ["quantity", "name", "form", "alpha_acid", "boil_time"],

        initialize: function() {
            _.bindAll(this, "setHop");
            DynamicTableView.prototype.initialize.apply(this, arguments);
        },

        render: function() {
            this.$el.html(_.template($("#hop_table_row_template").html(), this.model.toJSON()));

            this.$el.find("#name").typeahead({source: apiSearch, selectCallback: this.setHop, model : "hop"});

            DynamicTableView.prototype.render.apply(this, arguments);
            return this;
        },

        setHop: function(hop) {
            _.each(_.omit(hop, "id"), function(value, key) {
                this.$el.find("#" + key).val(value).change();
            }, this);
        }
    });

    var Yeast = Backbone.Model.extend({
        "defaults": {
            "name": "",
            "type": "none",
            "attenuation": ""
        }
    });

    var Yeasts = Backbone.Collection.extend({
        model: Yeast
    });

    var YeastSectionView = ns.YeastSectionView = BaseSectionView.extend({

        events: {
            "click #add_yeast": "add"
        },

        initialize: function() {
            _.bindAll(this, "add");
            BaseSectionView.prototype.initialize.apply(this, arguments);
        },

        render: function() {
            BaseSectionView.prototype.render.apply(this, arguments);
            var table = this.$el.find("#yeasts_table").find("tbody");
            table.html("");
            this.collection.each(function(additive) {
                table.append(new YeastTableRowView({model: additive}).render().$el);
            });

            return this;
        }
    });

    var YeastTableRowView = DynamicTableView.extend({

        tagName: "tr",

        listenOn: ["name", "attenuation", "yeast_type"],

        initialize: function() {
            _.bindAll(this, "setYeast");
            DynamicTableView.prototype.initialize.apply(this, arguments);
        },

        render: function() {
            this.$el.html(_.template($("#yeast_table_row_template").html(), this.model.toJSON()));
            DynamicTableView.prototype.render.apply(this, arguments);
            this.$el.find("#name").typeahead({source: apiSearch, selectCallback: this.setYeast, model : "yeast"});
            return this;
        },

        setYeast: function(yeast) {
            _.each(_.omit(yeast, "id"), function(value, key) {
                this.$el.find("#" + key).val(value).change();
            }, this);
        }
    });

    var Additive = Backbone.Model.extend({
        "defaults": {
            "quantity": "",
            "name": "",
            "added_when": "",
            "boil_time": ""
        }
    });

    var Additives = Backbone.Collection.extend({

        model: Additive,

        comparator: function(additive) {
            return -parseInt(additive.get("boil_time"), 10);
        }
    });

    var AdditiveSectionView = ns.AdditiveSectionView = BaseSectionView.extend({

        events: {
            "click #add_additive": "add"
        },

        initialize: function() {
            _.bindAll(this, "add");
            BaseSectionView.prototype.initialize.apply(this, arguments);
            this.collection.on("change:boil_time", this.changeBoilTime, this);
        },

        render: function() {
            BaseSectionView.prototype.render.apply(this, arguments);
            var table = this.$el.find("#additives_table").find("tbody");
            table.html("");
            this.collection.each(function(additive) {
                table.append(new AdditiveTableRowView({model: additive}).render().$el);
            });
            return this;
        },

        changeBoilTime: function() {
            this.collection.sort();
            this.render();
        }
    });


    var AdditiveTableRowView = DynamicTableView.extend({

        tagName: "tr",

        listenOn: ["quantity", "name", "boil_time", "added_when"],

        initialize: function() {
            DynamicTableView.prototype.initialize.apply(this, arguments);
        },

        render: function() {
            this.$el.html(_.template($("#additive_table_row_template").html(), this.model.toJSON()));
            DynamicTableView.prototype.render.apply(this, arguments);
            return this;
        }
    });

    var Brew = Backbone.Model.extend({
        "defaults": {
            "beer_name": "",
            "brewer": "",
            "beer_style": "",
            "wort_size": "",
            "batch_size": "",
            "boil_time": "",
            "brewhouse_efficiency": "75",

            "computed_color": "-",
            "computed_ibu": "-",
            "computed_og": "-",
            "actual_og": "",
            "computed_fg": "-",
            "actual_fg": "",
            "brew_date": "",
            "bottle_date": "",
            "filtered": false,
            "co2": "none",
            "comment": "",
            "mashing_water": "",
            "sparging_water": "",
            "mash_schedule": new MashSchedule(),
            "malts": new Malts(),
            "hops": new Hops(),
            "additives": new Additives(),
            "yeasts": new Yeasts()//,
            //"fermentations": new Fermentations()
        }
    });

    var isNumber = function(val){
        if(val === "") {
            return false;
        }
        return !isNaN(val);
    };

    ns.BrewSheet = Backbone.View.extend({

        initialize: function() {
            if(!this.brew) {
                this.brew = new Brew();
            }
            _.bindAll(this, "change");

            this.brew.on("change", function(brew) {console.log(brew);}, this);

            this.brew.get("malts").on("change", this.maltChange, this);
            this.brew.get("hops").on("change", this.hopChange, this);
            this.brew.on("change:batch_size", this.batchSizeChanged, this);
            this.brew.on("change:brewhouse_efficiency", this.efficiencyChanged, this);
            this.brew.on("change:computed_og", this.gravityChanged, this)
        },

        subviews: {
            "malts": MaltSectionView,
            "hops": HopSectionView,
            "additives": AdditiveSectionView,
            "yeasts": YeastSectionView,
            "mash_schedule": MashTimeView
        },

        render: function() {
            this.$el.append(_.template($("#brewsheet_template").html(),this.brew.toJSON()));

            _.each(this.brew.defaults, function(value, key) {

                if(this.brew.get(key) instanceof Backbone.Collection) {
                    if(this.subviews[key]) {
                        new this.subviews[key]({"el": this.$el.find("#" + key), "collection": this.brew.get(key)}).render();
                    }
                }
                if(this.brew.get(key) instanceof Backbone.Model) {
                    if(this.subviews[key]) {
                        new this.subviews[key]({"el": this.$el.find("#" + key), "model": this.brew.get(key)}).render();
                    }
                } else {
                    var el = this.$el.find("#" + key);
                    if(el.length > 0) {
                        this.$el.find("#" + key).on("change", this.change);
                    }
                }
            }, this);
            return this;
        },

        change: function(e) {
            var target = $(e.currentTarget);
            var key = target.attr("id");
            if(!(this.brew.get(key) instanceof Backbone.Collection) && !(this.brew.get(key) instanceof Backbone.Model)) {
                this.brew.set(target.attr("id"), target.val());
            }
        },

        batchSizeChanged: function(){
            if(isNumber(this.brew.get("batch_size"))){
                this.computeGravity();
                this.computeColor();
                this.computeBitterness();
            }
        },

        efficiencyChanged: function(){
            if(isNumber(this.brew.get("brewhouse_efficiency"))){
                this.computeGravity();
            }
        },

        gravityChanged: function() {
            if(isNumber(this.brew.get("computed_og"))){
                this.computeBitterness();
            }
        },

        maltChange: function() {
            if(this.brew.get("malts").length > 0) {
                this.computeGravity();
                this.computeColor();
            }
        },

        hopChange: function() {
            if(this.brew.get("hops").length > 0) {
                this.computeBitterness();
            }
        },

        computeGravity: function() {
            var malts = this.brew.get("malts");
            var volume =  this.brew.get("batch_size");
            var efficiency = this.brew.get("brewhouse_efficiency");
            var og = "-";
            if(isNumber(volume)  && isNumber(efficiency) && malts.length > 0) {
                var computed = malts.reduce(function(sum, malt) {
                    var amount = malt.get("quantity");
                    var ppg = malt.get("ppg");
                    if(isNumber(amount) && isNumber(ppg)) {
                        return sum + ((efficiency / 100) * ppg) * (toLbs(amount) / toGallons(volume));
                    }
                    return sum;
                }, 0);

                if(computed !== 0){
                    //round and get from nn to 1.0nn
                    og = Math.round((1 + (computed / 1000)) * 1000) / 1000;
                }
            }
            this.brew.set({"computed_og": og});
            this.$el.find("#computed_og").text(og);
        },

        computeColor: function() {
            var malts = this.brew.get("malts");
            var volume =  this.brew.get("batch_size");
            var ebc = "-";
            if(isNumber(volume)  && malts.length > 0) {
                var sum = malts.reduce(function(sum, malt) {
                    var amount = malt.get("quantity");
                    var ebc = malt.get("color");
                    if(isNumber(amount) && isNumber(ebc)) {
                        return sum + (amount * 0.0022) * (ebc * 0.508);
                    }
                    return sum;
                }, 0);
                if (sum > 0 ) {
                    var total_mcu = sum / (volume * 0.2642);
                    //Moreys Formula
                    var srm = 1.49 * Math.pow(total_mcu, 0.69);
                    ebc = Math.round(srm * 1.97);
                }
            }
            this.brew.set({"computed_color": ebc});
            this.$el.find("#computed_color").text(ebc);
        },

        //TODO: take form into consideration (reduce with 25% for pellets [check radical brewing])
        computeBitterness: function() {
            var og = this.brew.get("computed_og");
            var volume =  this.brew.get("batch_size");
            var hops = this.brew.get("hops");

            var bitterness = "-";
            if(isNumber(og) && isNumber(volume) && hops.length > 0) {

                var ibu = hops.reduce(function(total_ibu, hop) {
                    var quantity = hop.get("quantity");
                    var alpha_acid = hop.get("alpha_acid");
                    var boil_time = hop.get("boil_time");
                    if(isNumber(quantity) && isNumber(alpha_acid) && isNumber(boil_time)) {
                        var aau = parseFloat(quantity) * parseFloat(alpha_acid);
                        var utilization = calculateUtilization(og, parseFloat(boil_time));
                        var ibu = aau * utilization * (10 / volume );
                        return total_ibu + ibu;
                    }
                    return total_ibu;
                }, 0);

                if(ibu > 0) {
                    bitterness = Math.round(ibu);
                }
            }
            this.brew.set({"computed_ibu": bitterness});
            this.$el.find("#computed_ibu").text(bitterness);
        }
    });


    /*
    ns.BrewSheet = Backbone.View.extend({

        initialize: function() {

        },

        render: function() {

            var initial = {};
            if(this.options.brew) {
                initial = this.options.brew;
            }

            var brew = ns.createBrew(initial);

            console.log(brew);

            var general = new ns.GeneralInformationView({el: $("#general_section"), model: brew.generalInformation, brew: brew}).render();

            var maltView = new ns.MaltSectionView({el: $("#malt_section"), collection: brew.malts}).render();
            var hopView = new ns.HopSectionView({el: $("#hops_section"), collection: brew.hops}).render();
            var additivesView = new ns.AdditiveSectionView({el: $("#additives_section"), collection: brew.additives}).render();
            var waterView = new ns.WaterView({el: $("#water_section"), model: brew.water}).render();
            var boiltimeView = new ns.BoiltimeView({el: $("#boiling_section"), model: brew.boil}).render();
            var mashTimeView = new ns.MashTimeView({el: $("#mashing_section"), collection: brew.mashSchedule}).render();
            var fermentationView = new ns.FermentationView({el: $("#fermentation_section"), model: brew.fermentation}).render();
            var additionalInformationView = new ns.AdditionalInformationView({el: $("#other_section"), model: brew.additionalInformation}).render();
            var recepieView = new ns.RecepieView({el: $("#controls"), data: brew});

            return this;
        }

    });
*/
}(ol));

ol.templateFunc = {};

(function(ns){

    ns.rpad = function(val, space) {
        var str = String(val);
        var add = space-str.length;
        if(add > 0){
            var pad = "";
            for(var i = 0; i<add; i++){
                pad += " ";
            }
            str = pad + str;
        }
        return str;
    };

    ns.lpad = function(val, space) {
        var str = String(val);
        var add = space-str.length;
        if(add > 0){
            var pad = "";
            for(var i = 0; i<add; i++){
                pad += " ";
            }
            str = str + pad;
        }
        return str;
    };

    ns.orNa = function(val){
        if(val === ""){
            return "-";
        }
        return val;
    };

    ns.yesNo = function(val){
        if(val) {
            return "ja";
        }
        return "nei";
    };

    ns.mapCo2 = function(val) {
        if(val === "natural") {
            return "naturlig";
        } else if(val === "added") {
            return "tilsatt";
        }
        return "-";
    };

    ns.mapHopForm = function(val) {
        if(val === "pellets") {
            return "pellets";
        } else if(val === "cones") {
            return "hel";
        }
        return "-";
    };

    ns.mapYeast = function(val) {
        if(val === "liquid") {
            return "flytende gjær";
        } else if(val === "dry") {
            return "tørrgjær";
        } else if(val === "homgegrown") {
            return "selvdyrket gjær";
        }
        return "-";
    }

}(ol.templateFunc));