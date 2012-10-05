(function () {
    var sortDirections = ['ascending', 'descending'];
    ko.bindingHandlers.column = {
        init: function (element, valueAccessor) {
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
        Column: function (label, sortable, sortkey, options) {
            this.label = label;

            if (!options)
                return;

            this.options = options;
            this.sortable = sortable;
            this.sortkey = sortkey;
            this.currentsort = ko.observable(this.options.filter.sortby() === sortkey);            
            this.sortdirection = ko.observable(this.currentsort() ? this.options.filter.sortdirection() : sortDirections[0]);
            this.click = null;

            this[sortDirections[0]] = ko.computed($.proxy(function () {
                return this.sortdirection() === sortDirections[0];
            }, this));

            this[sortDirections[1]] = ko.computed($.proxy(function () {
                return this.sortdirection() === sortDirections[1];
            }, this));
            
            var filter = this.options.filter;

            if (this.sortable)
                this.click = $.proxy(function () {
                    if (!this.sortable || !this.options)
                        return;                
                    filter.skip = 0;
                    //this.sortable(false);
                    console.log(filter.sortby(), this.sortkey);
                    if (filter.sortby() === this.sortkey) {
                        console.log(filter.sortdirection());
                        if (filter.sortdirection() === sortDirections[0])
                            filter.sortdirection(sortDirections[1]);
                        else
                            filter.sortdirection(sortDirections[0]);

                        this.sortdirection(filter.sortdirection());                        
                    } else {
                        filter.sortby(this.sortkey);
                        filter.sortdirection(sortDirections[0]);
                        this.sortdirection(filter.sortdirection);
                    }
                }, this);
        },
        ScrollManager: function () {
            this.init = function (options, $element) {
                this.lastSkip = 0;

                var subscriber = ko.computed($.proxy(options.filter.toJSON, options.filter));
                subscriber.extend({ throttle: options.throttle });
                subscriber.subscribe($.proxy(this.loadnext, this));

                $(window).scroll($.proxy(this.onscroll, this));
                $(window).unload($.proxy(function () { //put this here to try and help IE clean up
                    this.options.data.removeAll();
                }, this));

                this.options = options;
                this.$element = $element;
            },
            this.onscroll = function () {
                console.log('scroll');
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
                var $window = $(window);

                var docViewTop = $window.scrollTop();
                var docViewBottom = docViewTop + $window.height();

                var elemTop = $element.offset().top;
                var elemBottom = elemTop + $element.height();

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
                    var dataset = data.payload;

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
            sortby: ko.observable(),
            sortdirection: ko.observable(sortDirections[0]),
            toJSON: function () {
                return { skip: this.skip, take: this.take, sortby: this.sortby(), sortdirection: this.sortdirection() };
            }
        }
    };
})();
