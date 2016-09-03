=== Customize Object Selector ===
Contributors:      xwp, westonruter
Tags:              customizer, customize, select2, posts, pages, dropdown
Requires at least: 4.5
Tested up to:      4.6.1
Stable tag:        0.2.0
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

== Changelog ==

= 0.2.0 =

Initial release of fork from [Customizer Ajax Select](https://github.com/danielbachhuber/customizer-ajax-select).
