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

        // close button
        $this.append('<a href="#' + id + '" class="close"></a>');

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