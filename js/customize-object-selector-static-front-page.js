/* eslint complexity: ["error", 4] */

(function( api ) {
	'use strict';

	api( 'page_for_posts', 'page_on_front', function() {
		api.control( 'page_for_posts', 'page_on_front', function( pageForPostsControl, pageOnFrontControl ) {
			var onChangePageForPosts, onChangePageOnFront;

			if ( ! api.ObjectSelectorControl ) {
				return;
			}
			if ( ! ( pageForPostsControl.extended( api.ObjectSelectorControl ) || pageOnFrontControl.extended( api.ObjectSelectorControl ) ) ) {
				return;
			}

			// Prevent page for posts from selecting the same page as page on front.
			onChangePageOnFront = function( pageOnFront ) {
				if ( pageOnFront ) {
					pageForPostsControl.params.post_query_vars.post__not_in = [ pageOnFront ];
					pageForPostsControl.params.post_query_vars.dropdown_args.exclude = [ pageOnFront ];
				} else {
					delete pageForPostsControl.params.post_query_vars.post__not_in;
					delete pageForPostsControl.params.post_query_vars.dropdown_args.exclude;
				}
			};
			pageOnFrontControl.setting.bind( onChangePageOnFront );
			onChangePageOnFront( pageOnFrontControl.setting.get() );

			// Prevent page on front from selecting the same page as page for posts.
			onChangePageForPosts = function( pageForPosts ) {
				if ( pageForPosts ) {
					pageOnFrontControl.params.post_query_vars.post__not_in = [ pageForPosts ];
					pageOnFrontControl.params.post_query_vars.dropdown_args.exclude = [ pageForPosts ];
				} else {
					delete pageOnFrontControl.params.post_query_vars.post__not_in;
					delete pageOnFrontControl.params.post_query_vars.dropdown_args.exclude;
				}
			};
			pageForPostsControl.setting.bind( onChangePageForPosts );
			onChangePageForPosts( pageForPostsControl.setting.get() );
		} );
	} );

})( wp.customize );
