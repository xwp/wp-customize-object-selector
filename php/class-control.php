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
	 * Control type.
	 *
	 * @access public
	 * @var string
	 */
	public $type = 'object_selector';

	/**
	 * Options to pass to select2.
	 *
	 * @var array
	 */
	public $select2_options;

	/**
	 * Query args for posts.
	 *
	 * @var array|null
	 */
	public $post_query_args;

	/**
	 * An Underscore (JS) template for this control's content (but not its container).
	 *
	 * Class variables for this control class are available in the `data` JS object;
	 * export custom variables by overriding {@see WP_Customize_Control::to_json()}.
	 *
	 * @see WP_Customize_Control::print_template()
	 */
	protected function content_template() {
		$data = $this->json();
		if ( ! isset( $data['input_attrs'] ) ) {
			$data['input_attrs'] = array();
		}
		if ( ! isset( $data['input_attrs']['class'] ) ) {
			$data['input_attrs']['class'] = '';
		}
		?>
		<#
		var postTypes = [];
		_.defaults( data, <?php echo wp_json_encode( $data ) ?> );
		data.input_id = 'input-' + String( Math.random() );
		data.input_attrs['class'] += ' object-selector';
		if ( data.select2_options.multiple ) {
			data.input_attrs['multiple'] = '';
		}
		if ( data.post_query_args.post_type ) {
			postTypes = _.isArray( data.post_query_args.post_type ) ? data.post_query_args.post_type : [ data.post_query_args.post_type ];
		}
		#>
		<span class="customize-control-title"><label for="{{ data.input_id }}">{{ data.label }}</label></span>
		<# if ( data.description ) { #>
			<span class="description customize-control-description">{{ data.description }}</span>
		<# } #>
		<select id="{{ data.input_id }}"
			<# _.each( data.input_attrs, function( value, key ) { #>
				{{{ key }}}="{{ value }}"
			<# } ) #>
			/>
		<# if ( ! _.isEmpty( data.post_addition_buttons ) ) { #>
			<span class="add-new-post">
				<# _.each( data.post_addition_buttons, function( button ) { #>
					<button type="button" class="button secondary-button add-new-post-button" data-post-type="{{ button.post_type }}">{{ button.label }}</button>
				<# } ) #>
			</span>
		<# } #>
		<div class="customize-control-notifications"></div>
		<?php
	}

	/**
	 * No-op since JS template is doing the work.
	 */
	protected function render_content() {}

	/**
	 * Export control params to JS.
	 *
	 * @return array
	 */
	public function json() {
		return array_merge(
			parent::json(),
			wp_array_slice_assoc( get_object_vars( $this ), array(
				'select2_options',
				'post_query_args',
			) )
		);
	}
}
