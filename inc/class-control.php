<?php

namespace CustomizeObjectSelectorControl;

class Control extends \WP_Customize_Control {

	/**
	 * Any extra query arguments to be supplied to search callback.
	 *
	 * @access public
	 * @var array
	 */
	public $query_args = array();

	/**
	 * Type of data to be queried (post, user, term)
	 *
	 * @access public
	 * @var string
	 */
	public $type = 'post';

	public function __construct( $manager, $id, $args = array() ) {
		parent::__construct( $manager, $id, $args );
		add_action( 'customize_controls_enqueue_scripts', array( $this, 'action_customize_controls_enqueue_scripts' ) );
		add_action( 'wp_ajax_object_selector_' . md5( $this->id ), array( $this, 'handle_ajax_object_selector' ) );
	}

	public function action_customize_controls_enqueue_scripts() {
		wp_enqueue_style( 'select2', plugins_url( '/assets/lib/select2/select2.css', dirname( __FILE__ ) ), false, '3.5.4' );
		wp_enqueue_script( 'select2', plugins_url( '/assets/lib/select2/select2.js', dirname( __FILE__ ) ), array( 'jquery', 'jquery-ui-sortable' ), '3.5.4' );
		wp_enqueue_script( 'customizer-ajax-select', plugins_url( '/assets/js/customizer-ajax-select.js', dirname( __FILE__ ) ), array( 'jquery', 'select2', 'customize-controls' ) );
	}

	protected function render_content() {
		$this->input_attrs['class'] = isset( $this->input_attrs['class'] ) ? $this->input_attrs['class'] . ' customizer-ajax-select' : 'customizer-ajax-select';
		$this->input_attrs['data-cas-nonce'] = wp_create_nonce( 'cas-' . $this->id );
		$this->input_attrs['data-cas-action'] = 'object_selector_' . md5( $this->id );
		switch ( $this->type ) {
			case 'post':
				$initial_values = $this->get_posts_for_select2( array( 'post__in' => explode( ',', $this->value() ), 'orderby' => 'post__in' ) );
				break;
			default:
				$initial_values = array();
				break;
		}
		$this->input_attrs['data-cas-initial-values'] = json_encode( $initial_values );
		?>
		<label>
			<?php if ( ! empty( $this->label ) ) : ?>
				<span class="customize-control-title"><?php echo esc_html( $this->label ); ?></span>
			<?php endif;
			if ( ! empty( $this->description ) ) : ?>
				<span class="description customize-control-description"><?php echo $this->description; ?></span>
			<?php endif; ?>
			<input type="hidden" <?php $this->input_attrs(); ?> value="<?php echo esc_attr( $this->value() ); ?>" <?php $this->link(); ?> />
		</label>
		<?php
	}

	public function handle_ajax_object_selector() {
		check_ajax_referer( 'cas-' . $this->id );

		$search = sanitize_text_field( $_GET['s'] );
		switch ( $this->type ) {
			case 'post':
				$results = $this->get_posts_for_select2( array( 's' => $search ) );
				break;
		}
		header('Content-Type: application/json');
		echo json_encode( array( 'results' => $results ) );
		exit;
	}

	/**
	 * Get posts formatted as Select2 expects them
	 */
	private function get_posts_for_select2( $args = array() ) {
		$defaults = array(
			'post_status' => 'publish',
			'post_type' => array( 'post' ),
			'update_post_meta_cache' => false,
			'update_post_term_cache' => false,
			'no_found_rows' => true
		);
		$args = array_merge( $defaults, $this->query_args, $args );
		$query = new \WP_Query( $args );
		return array_map( function( $post ) {
			return array(
				'id'        => $post->ID,
				'text'      => htmlspecialchars_decode( html_entity_decode( $post->post_title ), ENT_QUOTES ),
				);
		}, $query->posts );
	}

}
