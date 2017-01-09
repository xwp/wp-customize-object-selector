<?php
/**
 * Plugin Name: Customize Object Selector
 * Version: 0.4.0
 * Description: Adds a Customizer control to select posts (and eventually terms and users). Forked from Daniel Bachhuber's <a href="https://github.com/danielbachhuber/customizer-ajax-select">Customizer Ajax Select</a>.
 * Author: XWP
 * Plugin URI: https://github.com/xwp/wp-customize-object-selector
 * Text Domain: customize-object-selector
 * Domain Path: /languages
 *
 * Copyright 2016 (c) XWP (https://make.xwp.co)
 * Copyright 2015 (c) Hand Built (https://handbuilt.co)
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License, version 2 or, at
 * your discretion, any later version, as published by the Free
 * Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA
 *
 * @package CustomizeObjectSelector
 */

global $customize_object_selector_plugin;

if ( version_compare( phpversion(), '5.3', '>=' ) ) {
	require_once __DIR__ . '/php/class-plugin.php';
	$class = 'CustomizeObjectSelector\\Plugin';
	$customize_object_selector_plugin = new $class();
	add_action( 'plugins_loaded', array( $customize_object_selector_plugin, 'init' ) );
} else {
	if ( defined( 'WP_CLI' ) ) {
		WP_CLI::warning( _customize_object_selector_php_version_text() );
	} else {
		add_action( 'admin_notices', '_customize_object_selector_php_version_error' );
	}
}

/**
 * Admin notice for incompatible versions of PHP.
 */
function _customize_object_selector_php_version_error() {
	printf( '<div class="error"><p>%s</p></div>', esc_html( _customize_object_selector_php_version_text() ) );
}

/**
 * String describing the minimum PHP version.
 *
 * @return string
 */
function _customize_object_selector_php_version_text() {
	return __( 'Customize Object Selector plugin error: Your version of PHP is too old to run this plugin. You must be running PHP 5.3 or higher.', 'customize-object-selector' );
}
