<?php
/**
 * Plugin Name: Customizer Ajax Select
 * Version: 0.1-alpha
 * Description: Select posts, terms, or users via AJAX in the Customizer.
 * Author: Daniel Bachhuber
 * Author URI: https://handbuilt.co
 * Plugin URI: https://handbuilt.co
 * Text Domain: customizer-ajax-select
 * Domain Path: /languages
 */

spl_autoload_register( function( $class ) {
		$class = ltrim( $class, '\\' );
		if ( 0 !== stripos( $class, 'Customizer_Ajax_Select\\' ) ) {
			return;
		}

		$parts = explode( '\\', $class );
		array_shift( $parts ); // Don't need "Customizer_Ajax_Select\"
		$last = array_pop( $parts ); // File should be 'class-[...].php'
		$last = 'class-' . $last . '.php';
		$parts[] = $last;
		$file = dirname( __FILE__ ) . '/inc/' . str_replace( '_', '-', strtolower( implode( $parts, '/' ) ) );
		if ( file_exists( $file ) ) {
			require $file;
			return;
		}
});
