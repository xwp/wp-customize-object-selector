(function(wp, $){

	if ( ! wp || ! wp.customize ) {
		return;
	}

	var setupSelect2 = function( el ) {
		el.select2({
			cache: false,
			tags: true,
			width: '100%',
			ajax: {
				url: ajaxurl,
				results: function( response ) {
					return response;
				},
				data: function (search) {
					var ajaxParams = {
						s: search,
						action: el.data('cas-action'),
						_wpnonce: el.data('cas-nonce'),
						doing_customizer_ajax_select: true,
					}
					return ajaxParams;
				}
			},
			initSelection: function( element, callback ) {
				var el = $(element);
				if ( el.data('cas-initial-values') ) {
					callback( el.data('cas-initial-values') );
				}
			},
		});
		el.select2('container').find('ul.select2-choices').sortable({
			containment: 'parent',
			start: function() { el.select2( 'onSortStart' ); },
			update: function() { el.select2( 'onSortEnd' ); }
		});
	};

	wp.customize.bind( 'ready', function() {
		$('#customize-theme-controls .customizer-ajax-select').each(function(){
			setupSelect2( $(this) );
		});
	});

}(window.wp, jQuery));
