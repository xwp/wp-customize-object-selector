=== Customize Object Selector ===
Contributors:      xwp, westonruter
Tags:              customizer, customize, select2, posts, pages, dropdown
Requires at least: 4.5.0
Tested up to:      4.7.1
Stable tag:        0.4.0
License:           GPLv2 or later
License URI:       http://www.gnu.org/licenses/gpl-2.0.html

Adds a Customizer control to select one or multiple posts (and eventually terms and users).

== Description ==

This plugin adds a Customizer control to select one or multiple posts (and eventually terms and users).

Core has long had a `dropdown-pages` control type which is used in the static front page section for the “page on front” and “page for posts” controls. There is a problem with this control however: it outputs the entire tree of pages for every registered instance of the control. For sites that have a lot of pages, this can introduce a performance problem to generate this full list, not only once, but twice for the two controls. This plugin upgrades the “page on front” and “page for posts” controls to instead make use of the Customize Object Selector control, not only allowing for the list of pages to be loaded via Ajax on demand but also for the list to be _searched_.

When the [Customize Posts](https://github.com/xwp/wp-customize-posts) plugin is active, buttons will appear after the Select2 control to be able to create new posts to add to the selection. The Customize Object Selector will also power the post parent control. See [wp-customize-posts#233](https://github.com/xwp/wp-customize-posts/pull/233).

This plugin also includes a reusable JavaScript component available at `wp.customize.ObjectSelectorComponent` which can be used in widgets or other locations.

For an example integration with widgets, see the [Post Collection widget](https://github.com/xwp/wp-js-widgets/pull/10).

For an example integration with the Customize Posts plugin, see pending usage as the [Post Parent control](https://github.com/xwp/wp-customize-posts/pull/189#issuecomment-241216247).

**Development of this plugin is done [on GitHub](https://github.com/xwp/wp-customize-object-selector). Pull requests welcome. Please see [issues](https://github.com/xwp/wp-customize-object-selector/issues) reported there before going to the [plugin forum](https://wordpress.org/support/plugin/customize-object-selector).**

== Changelog ==

= 0.4.0 - 2017-01-08 =

* Add an edit shortcut in selected posts to open corresponding post section from Customize Posts; re-use `wp.customize.Posts.startEditPostFlow()`. See [#8](https://github.com/xwp/wp-customize-object-selector/issues/8), PR [#12](https://github.com/xwp/wp-customize-object-selector/issues/12).
* Add ability to whitelist additional query vars via `customize_object_selector_post_query_vars` filter. See PR [#25](https://github.com/xwp/wp-customize-object-selector/pull/25).
* Fix Select2 elements erroneously appearing on top of a section's header. See PR [#26](https://github.com/xwp/wp-customize-object-selector/pull/26).
* Add ability to use Customize Object Selector component outside of the customizer entirely. Immediate use case is for [JS Widgets](https://github.com/xwp/wp-js-widgets) and its [Post Collection](https://github.com/xwp/wp-js-widgets/tree/develop/post-collection-widget) widget. See PR [#27](https://github.com/xwp/wp-customize-object-selector/pull/27).

See <a href="https://github.com/xwp/wp-customize-object-selector/milestone/1?closed=1">issues and PRs in milestone</a> and <a href="https://github.com/xwp/wp-customize-object-selector/compare/0.3.0...0.4.0">full release commit log</a>.

Props Miina Sikk (<a href="https://github.com/miina" class="user-mention">@miina</a>), Weston Ruter (<a href="https://github.com/westonruter" class="user-mention">@westonruter</a>), Derek Herman (<a href="https://github.com/valendesigns" class="user-mention">@valendesigns</a>), Sayed Taqui (<a href="https://github.com/sayedwp" class="user-mention">@sayedwp</a>.

= 0.3.0 - 2016-09-21 =

Added:

* Add support for emulating `wp_dropdown_pages()`. The options for a dropdown are fetched via a call to `get_pages()`, and these dropdown options are displayed when no search is entered and `show_initial_dropdown: true` is passed among the `post_query_vars`. The arguments for `wp_dropdown_pages()` can then be passed via the `dropdown_args` query var.
* Replace `page_on_front` and `page_for_posts` controls with object selector controls emulating `wp_dropdown_pages()`.
* Add a control param for `show_add_buttons` to control whether or not the add buttons are shown (if Customize Posts is active).
* Eliminates code in `setupAddNewButtons` in favor of re-using `startCreatePostFlow` code now in Customize Posts 0.8.0. This sets the initial placeholder title for created posts and navigate to url in preview.
* Show loading indicator while re-population is happening.
* Prevent `page_on_front` and `page_for_posts` from being set the same.
* Ensure strings are translatable.
* Add banner and icon assets.

Fixed:

* Update `post_query_args` to `post_query_vars` in PHP.
* Prevent `post__in` from causing `posts_per_page` to be set too early.
* Skip calling close on select2 if element already gone. Fixes JS error.
* Fix issues related to syncing the setting value to the select2 value.
* Ensure notifications are set on containing construct.
* Fix transport implementation by returning request object.
* Pass params from control to component by reference without cloning so that params can be adjusted on control to affect the component. (Not ideal long term.)

= 0.2.0 =

Initial release of fork from [Customizer Ajax Select](https://github.com/danielbachhuber/customizer-ajax-select).
