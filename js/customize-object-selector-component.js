/* global JSON */
/* eslint consistent-this: [ "error", "component" ] */
/* eslint no-magic-numbers: ["error", { "ignore": [0,1] }] */
/* eslint complexity: ["error", 10] */

wp.customize.ObjectSelectorComponent = (function( api, $ ) {
	'use strict';

	return api.Class.extend({

		/**
		 * Initialize.
		 *
		 * @param {object} args Args
		 * @param {wp.customize.Value} args.model - Value instance to sync with the select2 options.
		 * @param {wp.customize.Control|wp.customize.Section|wp.customize.Panel} args.containing_construct - The control, section, or panel that this is associated with.
		 * @param {function} args.control_template - Underscore template for component.
		 * @param {function} args.select2_result_template - Underscore template for a item result.
		 * @param {function} args.select2_selection_template - Underscore template for a selected result.
		 * @param {object}   args.select2_options - See available options at https://select2.github.io/examples.html#programmatic-control
		 * @param {boolean}  args.select2_options.multiple - Whether multiple can be selected.
		 * @param {string}   args.select_id - ID to be used for the underlying select element
		 * @param {object}   args.post_query_vars - WP_Query vars to use in the query, opon which 's' and 'paged' will be merged.
		 * @returns {void}
		 */
		initialize: function initialize( args ) {
			var component = this;

			if ( ! args.model || 'function' !== typeof args.model.get ) {
				throw new Error( 'Missing valid model arg.' );
			}
			component.model = args.model;
			component.containing_construct = args.containing_construct || null;
			component.select2_options = {
				cache: false,
				width: '100%',
				multiple: false
			};
			if ( args.select2_options ) {
				_.extend( component.select2_options, args.select2_options );
			}
			component.container = args.container;
			component.post_query_vars = null;
			component.select_id = args.select_id || '';
			component.control_template = args.control_template || wp.template( 'customize-object-selector-component' );
			component.select2_result_template = args.select2_result_template || wp.template( 'customize-object-selector-item' );
			component.select2_selection_template = args.select2_selection_template || wp.template( 'customize-object-selector-item' );

			if ( args.post_query_vars ) {
				component.post_query_vars = {};
				_.extend( component.post_query_vars, args.post_query_vars );
			}
		},

		/**
		 * Embed.
		 *
		 * @param {jQuery} container Container for component UI.
		 * @returns {void}
		 */
		embed: function embed( container ) {
			var component = this, templateData;

			component.container = container;

			templateData = {
				multiple: component.multiple,
				select_id: component.select_id,
				addable_post_types: component.getAddableQueriedPostTypes()
			};

			component.container.empty().append( component.control_template( templateData ) );

			component.select = component.container.find( 'select:first' );
			component.select2 = component.select.select2( _.extend(
				{
					ajax: {
						transport: function( params, success, failure ) {
							var request = component.queryPosts({
								s: params.data.term,
								paged: params.data.page || 1
							});
							request.done( success );
							request.fail( failure );
						}
					},
					templateResult: function( data ) {
						return $.trim( component.select2_result_template( data ) );
					},
					templateSelection: function( data ) {
						return $.trim( component.select2_selection_template( data ) );
					},
					escapeMarkup: function( m ) {

						// Do not escape HTML in the select options text.
						return m;
					}
				},
				component.select2_options,
				{
					disabled: true // Enabled once populated.
				}
			) );

			component.populateSelectOptions().done( function() {
				component.select2.prop( 'disabled', false );
			} );

			// Sync the select2 values with the setting values.
			component.select2.on( 'change', function() {
				component.setSettingValues( _.map(
					component.getSelectedValues(),
					function( value ) {
						return parseInt( value, 10 );
					}
				) );
			} );

			// Sync the setting values with the select2 values.
			component.model.bind( function() {
				component.populateSelectOptions();
			} );

			component.setupSortable();

			component.setupAddNewButtons();

			component.repopulateSelectOptionsForSettingChange = _.bind( component.repopulateSelectOptionsForSettingChange, component );
			api.bind( 'change', component.repopulateSelectOptionsForSettingChange );
		},

		/**
		 * Repopulate select2 options for relevant setting change.
		 *
		 * @param {wp.customize.Setting} changedSetting Setting.
		 * @returns {void}
		 */
		repopulateSelectOptionsForSettingChange: function repopulateSelectOptionsForSettingChange( changedSetting ) {
			var component = this, postId, value = component.getSettingValues(), matches;
			matches = changedSetting.id.match( /^post\[[^\]]+]\[(\d+)]/ );
			if ( matches ) {
				postId = parseInt( matches[1], 10 );
				if ( _.isArray( value ) ? $.inArray( postId, value ) : postId === value ) {
					component.populateSelectOptions( true );
				}
			}
		},

		/**
		 * Get post types from the defined post query vars.
		 *
		 * @returns {Array} Params for post types.
		 */
		getQueryPostTypes: function getQueryPostTypes() {
			var component = this, postTypes;

			if ( ! api.Posts || ! api.Posts.data.postTypes ) {
				return [];
			}

			if ( ! component.post_query_vars || ! component.post_query_vars.post_type ) {
				postTypes = [ 'post' ];
			} else if ( _.isArray( component.post_query_vars.post_type ) ) {
				postTypes = component.post_query_vars.post_type;
			} else {
				postTypes = component.post_query_vars.post_type.split( /,/ );
			}

			return postTypes;
		},

		/**
		 * Get the params for the queried post types which can be added in the customizer.
		 *
		 * @returns {Array} Addable post type params.
		 */
		getAddableQueriedPostTypes: function getAddableQueriedPostTypes() {
			var component = this, postTypes, postTypeParams;
			postTypes = component.getQueryPostTypes();

			postTypes = _.filter( postTypes, function( postType ) {
				var postTypeObj = api.Posts.data.postTypes[ postType ];
				if ( _.isUndefined( postTypeObj ) ) {
					return false;
				}
				return postTypeObj.show_in_customizer && postTypeObj.current_user_can.create_posts;
			} );

			postTypeParams = [];

			_.each( postTypes, function eachPostType( postType ) {
				var label, postTypeObj = api.Posts.data.postTypes[ postType ];
				if ( postTypes.length > 1 ) {
					label = postTypeObj.labels.add_new_item || postTypeObj.labels.add_new;
				} else {
					label = postTypeObj.labels.add_new || postTypeObj.labels.add_new_item;
				}
				postTypeParams.push( _.extend(
					{
						post_type: postType,
						add_button_label: label
					},
					postTypeObj
				) );
			} );

			return postTypeParams;
		},

		/**
		 * Query posts.
		 *
		 * @param {object} [extraQueryVars] Extra query vars.
		 * @returns {jQuery.promise} Promise.
		 */
		queryPosts: function queryPosts( extraQueryVars ) {
			var component = this, action, data, postQueryArgs = {};
			action = 'customize_object_selector_query';
			data = api.previewer.query();
			data.customize_object_selector_query_nonce = api.settings.nonce[ action ];
			_.extend(
				postQueryArgs,
				component.post_query_vars || {},
				extraQueryVars || {}
			);
			data.post_query_args = JSON.stringify( postQueryArgs );
			return wp.ajax.post( action, data );
		},

		/**
		 * Get the selected values.
		 *
		 * @returns {Number[]} Selected IDs.
		 */
		getSelectedValues: function() {
			var component = this, selectValues;
			selectValues = component.select2.val();
			if ( _.isEmpty( selectValues ) ) {
				selectValues = [];
			} else if ( ! _.isArray( selectValues ) ) {
				selectValues = [ selectValues ];
			}
			return _.map(
				selectValues,
				function( value ) {
					return parseInt( value, 10 );
				}
			);
		},

		/**
		 * Get the setting values.
		 *
		 * @returns {Number[]} IDs.
		 */
		getSettingValues: function() {
			var component = this, settingValues, value;
			settingValues = component.model.get();
			if ( ! _.isArray( settingValues ) ) {
				value = parseInt( settingValues, 10 );
				if ( isNaN( value ) || value <= 0 ) {
					settingValues = [];
				} else {
					settingValues = [ value ];
				}
			}
			return settingValues;
		},

		/**
		 * Update the setting according to whether it is an array or scalar.
		 *
		 * If multiple, an array will be saved to the setting; if not multiple
		 * then the first value will be set, or 0 if empty.
		 *
		 * @param {Number[]} values IDs.
		 * @returns {void}
		 */
		setSettingValues: function( values ) {
			var component = this;
			if ( component.select2_options.multiple ) {
				component.model.set( values );
			} else {
				component.model.set( values[0] || 0 );
			}
		},

		/**
		 * Setup sortable.
		 *
		 * @returns {void}
		 */
		setupSortable: function() {
			var component = this, ul;
			if ( ! component.select2_options.multiple ) {
				return;
			}

			ul = component.select2.next( '.select2-container' ).first( 'ul.select2-selection__rendered' );
			ul.sortable({
				placeholder: 'ui-state-highlight',
				forcePlaceholderSize: true,
				items: 'li:not(.select2-search__field)',
				tolerance: 'pointer',
				stop: function() {
					var selectedValues = [];
					ul.find( '.select2-selection__choice' ).each( function() {
						var id, option;
						id = parseInt( $( this ).data( 'data' ).id, 10 );
						selectedValues.push( id );
						option = component.select2.find( 'option[value="' + id + '"]' );
						component.select2.append( option );
					});
					component.setSettingValues( selectedValues );
				}
			});
		},

		/**
		 * Setup buttons for adding new posts.
		 *
		 * @returns {void}
		 */
		setupAddNewButtons: function setupAddNewButtons() {
			var component = this;

			// Set up the add new post buttons
			component.container.on( 'click', '.add-new-post-button', function() {
				var promise, button;
				button = $( this );
				button.prop( 'disabled', true );
				promise = api.Posts.insertAutoDraftPost( $( this ).data( 'postType' ) );

				promise.done( function( data ) {
					var returnPromise;
					data.section.focus();

					if ( ! component.containing_construct ) {
						return;
					}
					returnPromise = component.focusConstructWithBreadcrumb( data.section, component.containing_construct );
					returnPromise.done( function() {
						var values;
						if ( 'publish' === data.setting.get().post_status ) {
							values = component.getSettingValues().slice( 0 );
							if ( ! component.select2_options.multiple ) {
								values = [ data.postId ];
							} else {

								// @todo Really the add new buttons should be disabled when the limit is reached.
								if ( component.select2_options.multiple && component.select2_options.limit >= values.length ) {
									values.length = component.select2_options.limit - 1;
								}
								values.unshift( data.postId );
							}
							component.setSettingValues( values );
						}
						button.focus(); // @todo Focus on the select2?
					} );
				} );

				promise.always( function() {
					button.prop( 'disabled', false );
				} );
			} );
		},

		/**
		 * Focus (expand) one construct and then focus on another construct after the first is collapsed.
		 *
		 * This overrides the back button to serve the purpose of breadcrumb navigation.
		 * This is modified from WP Core.
		 *
		 * @link https://github.com/xwp/wordpress-develop/blob/e7bbb482d6069d9c2d0e33789c7d290ac231f056/src/wp-admin/js/customize-widgets.js#L2143-L2193
		 * @param {wp.customize.Section|wp.customize.Panel|wp.customize.Control} focusConstruct - The object to initially focus.
		 * @param {wp.customize.Section|wp.customize.Panel|wp.customize.Control} returnConstruct - The object to return focus.
		 * @returns {void}
		 */
		focusConstructWithBreadcrumb: function focusConstructWithBreadcrumb( focusConstruct, returnConstruct ) {
			var deferred = $.Deferred(), onceCollapsed;
			focusConstruct.focus();
			onceCollapsed = function( isExpanded ) {
				if ( ! isExpanded ) {
					focusConstruct.expanded.unbind( onceCollapsed );
					returnConstruct.focus( {
						completeCallback: function() {
							deferred.resolve();
						}
					} );
				}
			};
			focusConstruct.expanded.bind( onceCollapsed );
			return deferred;
		},

		/**
		 * Re-populate the select options based on the current setting value.
		 *
		 * @param {boolean} refresh Whether to force the refreshing of the options.
		 * @returns {jQuery.promise} Resolves when complete. Rejected when failed.
		 */
		populateSelectOptions: function( refresh ) {
			var component = this, request, settingValues, selectedValues, deferred = jQuery.Deferred();

			settingValues = component.getSettingValues();
			selectedValues = component.getSelectedValues();
			if ( ! refresh && _.isEqual( selectedValues, settingValues ) ) {
				deferred.resolve();
			} else if ( 0 === settingValues.length ) {
				component.select2.empty();
				component.select2.trigger( 'change' );
				deferred.resolve();
			} else {
				request = component.queryPosts({
					post__in: settingValues,
					orderby: 'post__in'
				});
				request.done( function( data ) {
					if ( component.notifications ) {
						component.notifications.remove( 'select2_init_failure' );
					}
					component.select2.empty();
					_.each( data.results, function( item ) {
						var option = new Option( component.select2_result_template( item ), item.id, true, true );
						option.title = item.title;
						component.select2.append( option );
					} );
					component.select2.trigger( 'change' );
					deferred.resolve();
				} );
				request.fail( function() {
					var notification;
					if ( api.Notification && component.notifications ) {

						// @todo Allow clicking on this notification to re-call populateSelectOptions()
						notification = new api.Notification( 'select2_init_failure', {
							type: 'error',
							message: 'Failed to fetch selections.' // @todo l10n
						} );
						component.notifications.add( notification.code, notification );
					}
					deferred.reject();
				} );
			}
			return deferred.promise();
		},

		/**
		 * Destroy and cleanup the component.
		 *
		 * @returns {void}
		 */
		destroy: function() {
			var component = this;

			api.unbind( 'change', component.repopulateSelectOptionsForSettingChange );
			if ( component.container ) {
				component.container.empty();
			}
		}
	});

})( wp.customize, jQuery );
