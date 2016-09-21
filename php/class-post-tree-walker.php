<?php
/**
 * Post_Tree_Walker Class
 *
 * @package CustomizeObjectSelector
 */

namespace CustomizeObjectSelector;

/**
 * Class Post_Tree_Walker
 */
class Post_Tree_Walker extends \Walker_PageDropdown {

	/**
	 * Walked items in list.
	 *
	 * @var array
	 */
	public $items = array();

	/**
	 * Start the element output.
	 *
	 * @param string $output            Passed by reference. Used to append additional content.
	 * @param object $post              The data object.
	 * @param int    $depth             Depth of the item.
	 * @param array  $args              An array of additional arguments.
	 * @param int    $current_object_id ID of the current item.
	 */
	public function start_el( &$output, $post, $depth = 0, $args = array(), $current_object_id = 0 ) {
		unset( $args, $current_object_id );
		$this->items[] = array(
			'post' => $post,
			'depth' => $depth,
		);
		$output .= '';
	}
}
