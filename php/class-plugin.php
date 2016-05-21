<?php
/**
 * Customize Object Selector Class
 *
 * @package CustomizeObjectSelector
 */

namespace CustomizeObjectSelector;

/**
 * Class Plugin
 */
class Plugin {

	/**
	 * Plugin version.
	 *
	 * @var string
	 */
	public $version;

	/**
	 * Plugin constructor.
	 *
	 * @access public
	 */
	public function __construct() {

		// Parse plugin version.
		if ( preg_match( '/Version:\s*(\S+)/', file_get_contents( dirname( __FILE__ ) . '/../customize-object-selector.php' ), $matches ) ) {
			$this->version = $matches[1];
		}
	}

	/**
	 * Initialize.
	 */
	function init() {

		add_action( 'wp_default_scripts', array( $this, 'register_scripts' ), 100 );
		add_action( 'wp_default_styles', array( $this, 'register_styles' ), 100 );

		add_action( 'customize_register', array( $this, 'customize_register' ) );

		add_action( 'customize_controls_enqueue_scripts', array( $this, 'customize_controls_enqueue_scripts' ) );
		add_action( 'wp_ajax_customize_object_selector', array( $this, 'handle_ajax_object_selector' ) );
	}

	/**
	 * Load theme and plugin compatibility classes.
	 *
	 * @param \WP_Customize_Manager $wp_customize Manager.
	 */
	function customize_register( \WP_Customize_Manager $wp_customize ) {
		require_once __DIR__ . '/class-control.php';
		$wp_customize->register_control_type( __NAMESPACE__ . '\\Control' );
	}

	/**
	 * Register scripts.
	 *
	 * @param \WP_Scripts $wp_scripts Scripts.
	 */
	public function register_scripts( \WP_Scripts $wp_scripts ) {
		$suffix = ( SCRIPT_DEBUG ? '' : '.min' ) . '.js';

		$handle = 'select2';
		if ( ! $wp_scripts->query( $handle, 'registered' ) ) {
			$src = plugins_url( 'bower_components/select2/dist/js/select2.full' . $suffix, dirname( __FILE__ ) );
			$deps = array();
			$in_footer = 1;
			$wp_scripts->add( $handle, $src, $deps, $this->version, $in_footer );
		}

	}

	/**
	 * Register styles.
	 *
	 * @param \WP_Styles $wp_styles Styles.
	 */
	public function register_styles( \WP_Styles $wp_styles ) {
		$suffix = ( SCRIPT_DEBUG ? '' : '.min' ) . '.css';

		$handle = 'select2';
		if ( ! $wp_styles->query( $handle, 'registered' ) ) {
			$src = plugins_url( 'bower_components/select2/dist/css/select2' . $suffix, dirname( __FILE__ ) );
			$deps = array();
			$wp_styles->add( $handle, $src, $deps, $this->version );
		}
	}

	/**
	 * Enqueue controls scripts.
	 */
	public function customize_controls_enqueue_scripts() {
		wp_enqueue_script( 'select2' );
		wp_enqueue_style( 'select2' );
	}

	/**
	 * Handle ajax request.
	 */
	public function handle_ajax_object_selector() {
		wp_send_json_error( 'not implemented' );
	}
}
