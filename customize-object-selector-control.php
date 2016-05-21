<?php
/**
 * Plugin Name: Customize Object Selector Control.
 * Version: 0.1-alpha
 * Description: Select posts, terms, or users in the Customizer.
 * Author: Daniel Bachhuber
 * Author URI: https://handbuilt.co
 * Plugin URI: https://handbuilt.co
 * Text Domain: customize-object-selector-control
 * Domain Path: /languages
 */



spl_autoload_register( function( $class ) {
		$class = ltrim( $class, '\\' );
		if ( 0 !== stripos( $class, 'CustomizeObjectSelectorControl\\' ) ) {
			return;
		}

		$parts = explode( '\\', $class );
		array_shift( $parts ); // Don't need "CustomizeObjectSelectorControl\"
		$last = array_pop( $parts ); // File should be 'class-[...].php'
		$last = 'class-' . $last . '.php';
		$parts[] = $last;
		$file = dirname( __FILE__ ) . '/inc/' . str_replace( '_', '-', strtolower( implode( $parts, '/' ) ) );
		if ( file_exists( $file ) ) {
			require $file;
			return;
		}
});

add_action( 'admin_init', function(){
	global $pagenow;
	if ( 'admin-ajax.php' !== $pagenow || empty( $_GET['doing_object_selector'] ) ) {
		return;
	}
	require_once ABSPATH . WPINC . '/class-wp-customize-manager.php';
	$GLOBALS['wp_customize'] = new WP_Customize_Manager();
	do_action( 'customize_register', $GLOBALS['wp_customize'] );
});
