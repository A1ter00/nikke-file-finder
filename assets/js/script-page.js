(function($) {
    var $window = $(window),
        $body = $('body');

    // Play initial animations on page load.
    $window.on('load', function() {
        window.setTimeout(function() {
            $body.removeClass('is-preload');
        }, 100);
    });

    $.fn.panel = function(userConfig) {
        var $this = $(this),
            id = $this.attr('id'),
            config = $.extend({
                target: $body,
                visibleClass: 'visible',
            }, userConfig);

        $this.prepend('<a href="#' + id + '" class="close"></a>');

        (function() {
            var $close = $this.find('.close').first();
            var $h = $this.find('h4').first();

            // Build wrapper and header row
            var $headerBlock = $this.find('.menu2-header-block').first();
            if (!$headerBlock.length) {
                $headerBlock = $('<div class="menu2-header-block"></div>');
                var $headerRow = $('<div class="menu2-header-row"></div>');
                if ($h.length) $headerRow.append($h);
                if ($close.length) $headerRow.append($close);
                $headerBlock.append($headerRow);
                $this.prepend($headerBlock);
            } else {
                var $headerRow = $headerBlock.find('.menu2-header-row').first();
                if (!$headerRow.length) {
                    $headerRow = $('<div class="menu2-header-row"></div>');
                    $headerBlock.prepend($headerRow);
                }
                if ($h.length && $headerRow.find('h4').length === 0) $headerRow.append($h);
                if ($close.length && $headerRow.find('.close').length === 0) $headerRow.append($close);
            }

            var $search = $this.find('#nikkeSearchInput');
            if ($search.length) {
                $headerBlock.append($search);
            } else {
                var observer = new MutationObserver(function(mutations) {
                    mutations.forEach(function(m) {
                        m.addedNodes.forEach(function(node) {
                            try {
                                if (node && node.id === 'nikkeSearchInput') {
                                    $headerBlock.append($(node));
                                    observer.disconnect();
                                }
                            } catch (e) {}
                        });
                    });
                });
                observer.observe($this[0], { childList: true, subtree: true });
            }
        })();

        // Event: Toggle.
        $body.on('click', 'a[href="#' + id + '"]', function(event) {
            event.preventDefault();
            event.stopPropagation();
            config.target.toggleClass(config.visibleClass);
        });

        return $this;
    };

    // menus
    $('#menu')
        .appendTo($body)
        .panel({
            visibleClass: 'is-menu-visible'
        });

    $('#menu2')
        .appendTo($body)
        .panel({
            visibleClass: 'is-menu2-visible'
        });

})(jQuery);

