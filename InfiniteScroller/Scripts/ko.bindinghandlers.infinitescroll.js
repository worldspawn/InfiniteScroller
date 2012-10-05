(function () {
    var sortDirections = ['ascending', 'descending'];
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
        Column: function (label, sortable, sortkey, currentsort, options) {
            this.label = label;
            this.sortable = sortable;
            this.sortkey = sortkey;
            this.currentsort = ko.observable(currentsort == true);
            this.options = options;

            this.click = $.proxy(function () {
                if (!this.sortable || !this.options)
                    return;
                var filter = this.options.filter;
                filter.skip = 0;

                if (filter.sortby() === this.sortkey) {
                    if (filter.sortdirection() === sortDirections[0])
                        filter.sortdirection(sortDirections[1]);
                    else
                        filter.sortdirection(sortDirections[0]);
                } else {
                    filter.sortby(this.sortkey);
                    filter.sortdirection('ascending');
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

                return ((elemBottom >= docViewTop) && (elemTop <= docViewBottom));
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

                xhr.done(function (data) {
                    var dataset = data.payload;

                    for (var i = 0; i < dataset.length; i++)
                        this.options.data.push(dataset[i]);

                    this.options.filter.skip += dataset.length;
                });
            };
        },
        defaultOptions: {
            throttle: 500,
            thresholdindex: 15,
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
