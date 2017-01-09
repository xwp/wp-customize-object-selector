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
	public $select2_options = array(
		'multiple' => false,
		'cache' => false,
		'width' => '80%',
	);

	/**
	 * Query vars for posts.
	 *
	 * @var array|null
	 */
	public $post_query_vars;

	/**
	 * Whether the add buttons will be shown.
	 *
	 * These buttons will only appear if the Customize Posts plugin is active.
	 *
	 * @var bool
	 */
	public $show_add_buttons = true;

	/**
	 * Setting property.
	 *
	 * If defined, the associated setting is assumed to be an object (e.g. a post)
	 * and this identifies a property of that setting value. When defined, changes
	 * to the selector component will update the defined property of the setting
	 * as opposed to setting the root value of the setting.
	 *
	 * @var string
	 */
	public $setting_property;

	/**
	 * Enqueue control related scripts/styles.
	 */
	public function enqueue() {
		wp_enqueue_script( 'customize-object-selector-control' );
		wp_enqueue_style( 'customize-object-selector-control' );
	}

	/**
	 * An Underscore (JS) template for this control's content (but not its container).
	 *
	 * Class variables for this control class are available in the `data` JS object;
	 * export custom variables by overriding {@see WP_Customize_Control::to_json()}.
	 *
	 * @see WP_Customize_Control::print_template()
	 */
	protected function content_template() {
		?>
		<span class="customize-control-title"><label for="{{ data.select_id }}">{{ data.label }}</label></span>
		<# if ( data.description ) { #>
			<span class="description customize-control-description">{{ data.description }}</span>
		<# } #>
		<div class="customize-object-selector-container"></div>
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
				'post_query_vars',
				'setting_property',
				'show_add_buttons',
			) )
		);
	}
}
