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

	const OBJECT_SELECTOR_QUERY_AJAX_ACTION = 'customize_object_selector_query';

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
		add_action( 'wp_ajax_' . static::OBJECT_SELECTOR_QUERY_AJAX_ACTION, array( $this, 'handle_ajax_object_selector_query' ) );
		add_filter( 'customize_refresh_nonces', array( $this, 'add_customize_object_selector_nonce' ) );
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
		$suffix = ( SCRIPT_DEBUG || ! file_exists( __DIR__ . '/../js/customize-object-selector-control.min.js' ) ? '' : '.min' ) . '.js';

		$handle = 'select2';
		if ( ! $wp_scripts->query( $handle, 'registered' ) ) {
			$src = plugins_url( 'bower_components/select2/dist/js/select2.full' . $suffix, dirname( __FILE__ ) );
			$deps = array();
			$in_footer = 1;
			$wp_scripts->add( $handle, $src, $deps, $this->version, $in_footer );
		}

		$handle = 'customize-object-selector-control';
		$src = plugins_url( 'js/customize-object-selector-control' . $suffix, dirname( __FILE__ ) );
		$deps = array( 'jquery', 'select2', 'customize-controls' );
		$in_footer = 1;
		$wp_scripts->add( $handle, $src, $deps, $this->version, $in_footer );
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
	 * Handle ajax request for objects.
	 */
	public function handle_ajax_object_selector_query() {
		check_ajax_referer( 'cas-' . $this->id );

		if ( ! isset( $_POST['post_type'] ) ) {
			wp_send_json_error( 'missing_post_type' );
		}
		$post_type = wp_unslash( $_POST['post_type'] );
		if ( is_string( $post_type ) ) {
			$post_type = explode( ',', $post_type );
		}
		foreach ( $post_type as $cpt ) {
			if ( ! post_type_exists( $cpt ) ) {
				wp_send_json_error( 'unknown_post_type' );
			}
		}
		$query_vars = array(
			'post_type' => $post_type,
		);
		if ( ! empty( $_POST['s'] ) ) {
			$query_vars['s'] = sanitize_text_field( wp_unslash( $_POST['s'] ) );
		}

		$results = $this->get_posts_for_select2( $query_vars );
		wp_send_json_success( $results );
	}

	/**
	 * Get posts formatted as Select2 expects them.
	 *
	 * @param array $args Args.
	 * @return array Posts
	 */
	public function get_posts_for_select2( $args = array() ) {
		$defaults = array(
			'post_status' => 'publish',
			'post_type' => array( 'post' ),
			'update_post_meta_cache' => false,
			'update_post_term_cache' => false,
			'no_found_rows' => true,
		);
		$args = array_merge( $defaults, $args );
		$query = new \WP_Query( $args );
		return array_map(
			function( $post ) {
				return array(
					'id' => $post->ID,
					'text' => htmlspecialchars_decode( html_entity_decode( $post->post_title ), ENT_QUOTES ),
				);
			},
			$query->posts
		);
	}

	/**
	 * Add nonce for doing object selector query.
	 *
	 * @param array $nonces Nonces.
	 * @return array Amended nonces.
	 */
	public function add_customize_object_selector_nonce( $nonces ) {
		$nonces[ static::OBJECT_SELECTOR_QUERY_AJAX_ACTION ] = wp_create_nonce( static::OBJECT_SELECTOR_QUERY_AJAX_ACTION );
		return $nonces;
	}
}
