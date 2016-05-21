<?php
/**
 * Control.
 *
 * @package CustomizeObjectSelector
 */

namespace CustomizeObjectSelector;

/**
 * Class Control
 *
 * @package CustomizeObjectSelector
 */
class Control extends \WP_Customize_Control {

	/**
	 * Type of data to be queried (post, user, term)
	 *
	 * @access public
	 * @var string
	 */
	public $type = 'object_selector';

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

}
