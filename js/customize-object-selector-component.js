/* global JSON, console */
/* eslint consistent-this: [ "error", "component" ] */
/* eslint no-magic-numbers: ["error", { "ignore": [-1,0,1] }] */
/* eslint complexity: ["error", 11] */

wp.customize.ObjectSelectorComponent = (function( api, $ ) {
	'use strict';

	return api.Class.extend({

		/**
		 * Initial nonce for requests.
		 *
		 * Note This is is exported from PHP via \CustomizeObjectSelector\Plugin::register_scripts().
		 * This property will be used in lieu of `wp.customize.settings.nonce` being available.
		 *
		 * @var string
		 */
		nonce: '',

		/**
		 * Note the translations are exported from PHP via \CustomizeObjectSelector\Plugin::register_scripts().
		 *
		 * Note This is is exported from PHP via \CustomizeObjectSelector\Plugin::register_scripts().
		 *
		 * @var object
		 */
		l10n: {
			missing_model_arg: '',
			failed_to_fetch_selections: '',
			add_new_buttons_customize_posts_dependency: ''
		},

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
		 * @param {object}   args.post_query_vars - WP_Query vars to use in the query, upon which 's' and 'paged' will be merged.
		 * @param {Boolean}  args.show_add_buttons - Whether add buttons will be shown if available.
		 * @returns {void}
		 */
		initialize: function initialize( args ) {
			var component = this;

			if ( ! args.model || 'function' !== typeof args.model.get ) {
				throw new Error( component.l10n.missing_model_arg );
			}
			component.model = args.model;
			component.containing_construct = args.containing_construct || null;
			component.select2_options = {
				cache: false,
				width: '100%',
				multiple: false
			};
			if ( args.select2_options ) {
				component.select2_options = args.select2_options;
			}
			component.container = args.container;
			component.post_query_vars = null;
			component.show_add_buttons = _.isUndefined( args.show_add_buttons ) ? true : args.show_add_buttons;
			if ( component.show_add_buttons && ( ! api.Posts || ! _.isFunction( api.Posts.startCreatePostFlow ) ) ) {
				if ( 'undefined' !== typeof console && _.isFunction( console.warn ) && api.Section ) {
					console.info( component.l10n.add_new_buttons_customize_posts_dependency );
				}
				component.show_add_buttons = false;
			}
			component.select_id = args.select_id || '';
			component.control_template = args.control_template || wp.template( 'customize-object-selector-component' );
			component.select2_result_template = args.select2_result_template || wp.template( 'customize-object-selector-item' );
			component.select2_selection_template = args.select2_selection_template || wp.template( 'customize-object-selector-item' );

			if ( args.post_query_vars ) {
				component.post_query_vars = args.post_query_vars;
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
				addable_post_types: component.show_add_buttons ? component.getAddableQueriedPostTypes() : []
			};

			component.container.empty().append( component.control_template( templateData ) );

			component.select = component.container.find( 'select:first' );
			component.select.select2( _.extend(
				{
					ajax: {
						transport: function( params, success, failure ) {
							var request = component.queryPosts({
								s: params.data.term,
								paged: params.data.page || 1
							});
							request.done( success );
							request.fail( function( jqXHR, status ) {

								// Inform select2 of aborts. See <https://github.com/select2/select2/blob/062c6c3af5f0f39794c34c0a343a3857e587cc97/src/js/select2/data/ajax.js#L83-L87>.
								if ( 'abort' === status ) {
									request.status = '0';
								}

								failure.apply( request, arguments );
							} );
							return request;
						}
					},
					templateResult: function( data ) {
						return $.trim( component.select2_result_template( data ) );
					},
					templateSelection: function( data ) {
						data.multiple = component.select2_options.multiple;
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
				component.select.prop( 'disabled', false );
			} );

			// Sync the select2 values with the setting values.
			component.select.on( 'change', function() {
				component.setSettingValues( _.map(
					component.getSelectedValues(),
					function( value ) {
						return parseInt( value, 10 );
					}
				) );
			} );

			// Sync the setting values with the select2 values.
			component.model.bind( function() {
				component.populateSelectOptions( false );
			} );

			component.setupSortable();

			if ( api.Posts && _.isFunction( api.Posts.startCreatePostFlow ) ) {
				component.setupAddNewButtons();
				component.setupEditLinks();
			}

			component.repopulateSelectOptionsForSettingChange = _.bind( component.repopulateSelectOptionsForSettingChange, component );
			api.bind( 'change', component.repopulateSelectOptionsForSettingChange );
		},

		/**
		 * Repopulate select2 options for relevant setting change.
		 *
		 * @todo Debounce.
		 *
		 * @param {wp.customize.Setting} changedSetting Setting.
		 * @returns {void}
		 */
		repopulateSelectOptionsForSettingChange: function repopulateSelectOptionsForSettingChange( changedSetting ) {
			var component = this, postId, value = component.getSettingValues(), matches;
			matches = changedSetting.id.match( /^post\[[^\]]+]\[(\d+)]/ );
			if ( matches ) {
				postId = parseInt( matches[1], 10 );
				if ( _.isArray( value ) ? -1 !== $.inArray( postId, value ) : postId === value ) {
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
			data = {
				customize_object_selector_query_nonce: component.nonce
			};

			// Include customized state if in customizer.
			if ( api.previewer && api.previewer.query ) {
				_.extend( data, api.previewer.query() );
			}

			// Use refreshed nonce from in customizer if available.
			if ( api.settings && api.settings.nonce && api.settings.nonce[ action ] ) {
				data.customize_object_selector_query_nonce = api.settings.nonce[ action ];
			}

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
			selectValues = component.select.val();
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
			var component = this, settingValues, parsedIds;
			settingValues = component.model.get();
			if ( ! _.isArray( settingValues ) ) {
				parsedIds = [];
				if ( _.isNumber( settingValues ) ) {
					parsedIds.push( settingValues );
				} else if ( _.isString( settingValues ) ) {
					_.each( settingValues.split( /\s*,\s*/ ), function( value ) {
						var parsedValue = parseInt( value, 10 );
						if ( ! isNaN( parsedValue ) && parsedValue > 0 ) {
							parsedIds.push( parsedValue );
						}
					} );
				}
				settingValues = parsedIds;
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

			ul = component.select.next( '.select2-container' ).first( 'ul.select2-selection__rendered' );
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
						option = component.select.find( 'option[value="' + id + '"]' );
						component.select.append( option );
					});
					component.setSettingValues( selectedValues );
				}
			});
		},

		/**
		 * Setup buttons for adding new posts.
		 *
		 * See wp.customize.Posts.PostsPanel.prototype.onClickAddPostButton
		 *
		 * @returns {void}
		 */
		setupAddNewButtons: function setupAddNewButtons() {
			var component = this;

			// Set up the add new post buttons
			component.container.on( 'click', '.add-new-post-button', function() {
				var button = $( this );

				api.Posts.startCreatePostFlow( {
					postType: $( this ).data( 'postType' ),
					initiatingButton: button,
					originatingConstruct: component.containing_construct,
					restorePreviousUrl: true,
					returnToOriginatingConstruct: true,
					breadcrumbReturnCallback: function( data ) {
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
					}
				} );
			} );
		},

		/**
		 * Setup links for editing objects in select2.
		 *
		 * @returns {void}
		 */
		setupEditLinks: function setupEditLinks() {
			var component = this, editButton, onSelect;

			editButton = component.container.find( '.select2-selection__choice__edit' );
			onSelect = function( pageId ) {
				pageId = parseInt( pageId, 10 );
				editButton.toggle( ! isNaN( pageId ) && 0 !== pageId && ! component.select2_options.multiple );
			};
			onSelect( component.model.get() );
			component.model.bind( onSelect );

			// Set up the add new post buttons
			component.container.on( 'click', '.select2-selection__choice__edit', function( e ) {
				var $elm = $( this ), postId;

				if ( component.select2_options.multiple ) {
					postId = $elm.data( 'postId' );
				} else {
					postId = parseInt( component.model.get(), 10 );
				}

				e.preventDefault();
				component.select.select2( 'close' );
				component.select.prop( 'disabled', true );
				$elm.addClass( 'loading' );

				api.Posts.startEditPostFlow( {
					postId: postId,
					initiatingButton: $elm,
					originatingConstruct: component.containing_construct,
					restorePreviousUrl: true,
					returnToOriginatingConstruct: true,
					breadcrumbReturnCallback: function() {
						component.setSettingValues( component.getSettingValues().slice( 0 ) );
						$elm.removeClass( 'loading' );
						component.select.prop( 'disabled', false );
						component.containing_construct.focus();
					}
				} );
			} );
		},

		/**
		 * Re-populate the select options based on the current setting value.
		 *
		 * @param {boolean} refresh Whether to force the refreshing of the options.
		 * @returns {jQuery.promise} Resolves when complete. Rejected when failed.
		 */
		populateSelectOptions: function( refresh ) {
			var component = this, settingValues, selectedValues, deferred = jQuery.Deferred();

			settingValues = component.getSettingValues();
			selectedValues = component.getSelectedValues();
			if ( ! refresh && _.isEqual( selectedValues, settingValues ) ) {
				deferred.resolve();
			} else if ( 0 === settingValues.length ) {
				component.select.empty();
				component.select.trigger( 'change' );
				deferred.resolve();
			} else {
				component.container.addClass( 'customize-object-selector-populating' );

				if ( component.currentRequest ) {
					component.currentRequest.abort();
				}

				component.currentRequest = component.queryPosts({
					post__in: settingValues,
					orderby: 'post__in'
				});
				component.currentRequest.done( function( data ) {
					if ( component.containing_construct && component.containing_construct.notifications ) {
						component.containing_construct.notifications.remove( 'select2_init_failure' );
					}
					component.select.empty();
					_.each( data.results, function( item ) {
						var selected, option;
						selected = -1 !== $.inArray( item.id, settingValues );
						option = new Option( component.select2_result_template( item ), item.id, selected, selected );
						option.title = item.title;
						component.select.append( option );
					} );
					component.select.trigger( 'change' );
					deferred.resolve();
				} );
				component.currentRequest.fail( function( jqXHR, status, statusText ) {
					var notification;
					if ( 'abort' !== status && api.Notification && component.containing_construct && component.containing_construct.notifications ) {

						// @todo Allow clicking on this notification to re-call populateSelectOptions()
						// @todo The error should be triggered on the component itself so that the control adds it to its notifications. Too much coupling here.
						notification = new api.Notification( 'select2_init_failure', {
							type: 'error',
							message: component.l10n.failed_to_fetch_selections.replace( '%s', statusText )
						} );
						component.containing_construct.notifications.add( notification.code, notification );
					}
					deferred.reject();
				} );
				component.currentRequest.always( function() {
					component.container.removeClass( 'customize-object-selector-populating' );
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
			if ( component.select && component.select.data( 'select2' ) ) {
				component.select.select2( 'close' );
			}
			if ( component.container ) {
				component.container.empty();
			}
		}
	});

})( wp.customize, jQuery );
