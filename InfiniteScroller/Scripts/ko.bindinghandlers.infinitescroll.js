(function () {
    var sortDirections = ['ascending', 'descending'];
    
    ko.bindingHandlers.fixedtableheader = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var $element = $(element);
            var $maintable = $element.parents('table');
            var $tableclone = $element.parents('table').clone();
            $tableclone.css('width', $maintable.width());
            $tableclone.addClass('detachedheader');
            $tableclone.find(' > :not(thead)').remove();
            $tableclone.removeAttr('data-bind');
            $tableclone.find('thead').removeAttr('data-bind');
            $element.parents('.scrollcontainer').prepend($tableclone);

            ko.applyBindings(viewModel, $tableclone[0]);
        }
    }

    ko.bindingHandlers.column = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var options = valueAccessor();
            
            var $element = $(element);
            var $columncontainer = $('<div/>');
            var $label = $('<span/>').html(options.label);

            $columncontainer.append($label);
            $columncontainer.appendTo($element);

            if (options.sortable) {
                $('<i/>').addClass('icon-chevron-up').appendTo($columncontainer);
                $('<i/>').addClass('icon-chevron-down').appendTo($columncontainer);
            }
        }
    }

    ko.bindingHandlers.infinitescroll = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            var options = valueAccessor();
            var defaultOptions = ko.bindingHandlers.infinitescroll.defaultOptions;
            for (x in defaultOptions)
                if (options[x] === undefined)
                    options[x] = defaultOptions[x];

            //configure data source
            if (!options.data)
                throw 'Data not found - options must provide an observable array member named "data"';

            options.data.extend({ throttle: options.throttle });

            if (options.filter === undefined)
                options.filter = $.extend({}, ko.bindingHandlers.infinitescroll.defaultFilter);
            else {
                var defaultfilter = ko.bindingHandlers.infinitescroll.defaultFilter;
                for (x in defaultfilter)
                    if (options.filter[x] === undefined)
                        options.filter[x] = defaultOptions[x];
            }

            var $element = $(element);
            var manager = new ko.bindingHandlers.infinitescroll.ScrollManager();
            manager.init(options, $element);
        },
        Column: function (options) {
            var self = this;

            self.label = options.label;
            self.sortable = false;
            self.currentsort = ko.observable(null);
            self.cellbindings = options.cellbindings;

            if (!options.sortable || !options.sortkey || !options.filter)
                return;
            
            self.sortable = options.sortable;
            self.sortkey = options.sortkey;
            self.currentsort(options.filter.sortby() === self.sortkey);
            self.sortdirection = ko.observable(self.currentsort() ? options.filter.sortdirection() : sortDirections[0]);
            self.click = null;

            self[sortDirections[0]] = ko.computed(function () {
                return self.sortdirection() === sortDirections[0];
            });

            self[sortDirections[1]] = ko.computed(function () {
                return self.sortdirection() === sortDirections[1];
            });
            
            if (self.sortable)
                self.click = function () {
                    if (!self.sortable)
                        return;                
                    options.filter.setSkip(0);

                    if (self.currentsort()) {
                        if (options.filter.sortdirection() === sortDirections[0])
                            options.filter.sortdirection(sortDirections[1]);
                        else
                            options.filter.sortdirection(sortDirections[0]);

                        self.sortdirection(options.filter.sortdirection());
                    } else {
                        options.filter.sortby(self.sortkey);
                        options.filter.sortdirection(sortDirections[0]);
                        self.sortdirection(sortDirections[0]);
                    }
                };
        },
        ScrollManager: function () {
            this.init = function (options, $element) {
                this.lastSkip = 0;

                var subscriber = ko.computed($.proxy(options.filter.toJSON, options.filter));
                subscriber.extend({ throttle: options.throttle });
                subscriber.subscribe($.proxy(this.loadnext, this));
                this.container = options.container || $(window);

                this.container.scroll($.proxy(this.onscroll, this));
                $(window).unload($.proxy(function () { //put this here to try and help IE clean up
                    this.options.data.removeAll();
                }, this));

                this.options = options;
                this.$element = $element;
            },
            this.onscroll = function () {
                var lastskip = this.lastSkip;
                var loadeditems = this.options.data().length;

                if (loadeditems === 0 || loadeditems === lastskip)
                    return; //if we got to this state there must be no data left to load

                var rows = this.$element.find('tbody tr');
                var thresholdrow = $(rows[rows.length - this.options.thresholdindex]);

                if (this.isinview(thresholdrow)) {
                    this.loadnext();
                }
            };
            this.isinview = function ($element) {
                var $container = this.options.container;
                
                var docViewTop = $container.scrollTop();
                var docViewBottom = docViewTop + $container.height();

                var elemTop = $element.offset().top;
                //var elemBottom = elemTop + $element.height();

                return (elemTop <= docViewBottom);
                //return ((elemBottom >= docViewTop) && (elemTop <= docViewBottom));
            };
            this.loadnext = function () {
                this.lastSkip = this.options.filter.skip;
                if (this.options.filter.skip === 0)
                    this.options.data.removeAll();

                var payload = JSON.stringify(this.options.filter);

                var xhr = $.ajax(this.options.uri, {
                    contentType: 'application/json',
                    data: payload,
                    dataType: 'json',
                    type: 'post'
                });

                xhr.done($.proxy(function (data) {
                    var dataset = data.Data;
                    if (this.options.filter.skip === 0)
                        this.options.filter.total(data.Total);
                    for (var i = 0; i < dataset.length; i++)
                        this.options.data.push(dataset[i]);

                    this.options.filter.skip += dataset.length;
                }, this));
            };
        },
        defaultOptions: {
            throttle: 500,
            thresholdindex: 60,
            uri: undefined
        },
        defaultFilter: {
            take: 0,
            skip: 0,
            total: ko.observable(0),
            sortby: ko.observable(),
            sortdirection: ko.observable(sortDirections[0]),
            setSkip: function (skip) {
                this.skip = skip;
            },
            toJSON: function () {
                return { skip: this.skip, take: this.take, sortby: this.sortby(), sortdirection: this.sortdirection() };
            }
        }
    };
})();
