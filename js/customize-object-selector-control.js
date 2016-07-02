/* global wp, JSON */
/* eslint consistent-this: [ "error", "control" ] */
/* eslint no-magic-numbers: ["error", { "ignore": [0,1] }] */
/* eslint complexity: ["error", 8] */

(function( api, $ ) {
	'use strict';

	/**
	 * A object selector control.
	 *
	 * @class
	 * @augments wp.customize.Control
	 * @augments wp.customize.Class
	 */
	api.ObjectSelectorControl = api.Control.extend({

		initialize: function( id, options ) {
			var control = this, args, postTypes = [];

			args = options || {};

			args.params = _.extend(
				{
					select2_options: {},
					post_query_args: null
				},
				args.params || {}
			);

			// See https://select2.github.io/examples.html#programmatic-control
			args.params.select2_options = _.extend(
				{
					cache: false,
					width: '100%'
				},
				args.params.select2_options
			);

			if ( ! args.params.type ) {
				args.params.type = 'object_selector';
			}
			if ( ! args.params.content ) {
				args.params.content = $( '<li></li>' );
				args.params.content.attr( 'id', 'customize-control-' + id.replace( /]/g, '' ).replace( /\[/g, '-' ) );
				args.params.content.attr( 'class', 'customize-control customize-control-' + args.params.type );
			}

			// Set up parameters for post_addition_buttons.
			if ( _.isUndefined( args.params.post_addition_buttons ) && api.Posts && api.Posts.insertAutoDraftPost ) {
				if ( ! args.params.post_query_args.post_type ) {
					postTypes = [ 'post' ];
				} else if ( _.isArray( args.params.post_query_args.post_type ) ) {
					postTypes = args.params.post_query_args.post_type;
				} else {
					postTypes = args.params.post_query_args.post_type.split( /,/ );
				}

				postTypes = _.filter( postTypes, function( postType ) {
					return ! _.isUndefined( api.Posts.data.postTypes[ postType ] ) && api.Posts.data.postTypes[ postType ].show_in_customizer;
				} );

				args.params.post_addition_buttons = [];
				_.each( postTypes, function( postType ) {
					var label;
					if ( postTypes.length > 1 ) {
						label = api.Posts.data.postTypes[ postType ].labels.add_new_item || api.Posts.data.postTypes[ postType ].labels.add_new;
					} else {
						label = api.Posts.data.postTypes[ postType ].labels.add_new || api.Posts.data.postTypes[ postType ].labels.add_new_item;
					}
					args.params.post_addition_buttons.push( {
						post_type: postType,
						label: label
					} );
				} );
			}

			// @todo Add support for settingSubproperty (e.g. so we can map a post_parent property of a post setting).
			api.Control.prototype.initialize.call( control, id, args );
		},

		/**
		 * Query posts.
		 *
		 * @param {object} queryVars Query vars.
		 * @returns {jQuery.promise} Promise.
		 */
		queryPosts: function( queryVars ) {
			var control = this, action, data, postQueryArgs = {};
			action = 'customize_object_selector_query';
			data = api.previewer.query();
			data.customize_object_selector_query_nonce = api.settings.nonce[ action ];
			_.extend(
				postQueryArgs,
				control.params.post_query_args || {},
				queryVars
			);
			data.post_query_args = JSON.stringify( postQueryArgs );
			return wp.ajax.post( action, data );
		},

		/**
		 * @inheritdoc
		 */
		ready: function() {
			var control = this;

			control.select2Template = wp.template( 'customize-object-selector-item' );

			control.select2 = control.container.find( '.object-selector:first' ).select2( _.extend(
				{
					ajax: {
						transport: function( params, success, failure ) {
							var request = control.queryPosts({
								s: params.data.term,
								paged: params.data.page || 1
							});
							request.done( success );
							request.fail( failure );
						}
					},
					templateResult: function( data ) {
						return control.select2Template( data );
					},
					templateSelection: function( data ) {
						return control.select2Template( data );
					},
					escapeMarkup: function( m ) {

						// Do not escape HTML in the select options text.
						return m;
					}
				},
				control.params.select2_options,
				{
					disabled: true // Enabled once populated.
				}
			) );

			control.populateSelectOptions().done( function() {
				control.select2.prop( 'disabled', false );
			} );

			// Sync the select2 values with the setting values.
			control.select2.on( 'change', function() {
				control.setSettingValues( _.map(
					control.getSelectedValues(),
					function( value ) {
						return parseInt( value, 10 );
					}
				) );
			} );

			// Sync the setting values with the select2 values.
			control.setting.bind( function() {
				control.populateSelectOptions();
			} );

			control.setupSortable();

			control.setupAddNewButtons();

			api.Control.prototype.ready.call( control );

			// Add listener for changes to settings that are in this control.
			function watchForChangedSettings( changedSetting ) {
				var ids = control.setting.get();
				var matches = changedSetting.id.match( /^post\[.+]\[(\d+)]/ );
				if ( matches ) {
					if ( ( _.isArray( ids ) && $.inArray( matches[1], ids ) ) || matches[1] === ids ) {
						control.populateSelectOptions( true );
					}
				}
			};
			api.bind( 'change', watchForChangedSettings );

			// Clean up.
			api.control.bind( 'remove', function( removedControl ) {
				if ( removedControl.id === control.id ) {
					wp.customize.unbind( 'change', watchForChangedSettings );
				}
			} );
		},

		/**
		 * Get the selected values.
		 *
		 * @returns {Number[]} Selected IDs.
		 */
		getSelectedValues: function() {
			var control = this, selectValues;
			selectValues = control.select2.val();
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
			var control = this, settingValues, value;
			settingValues = control.setting.get();
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
			var control = this;
			if ( control.params.select2_options.multiple ) {
				control.setting.set( values );
			} else {
				control.setting.set( values[0] || 0 );
			}
		},

		/**
		 * Setup sortable.
		 *
		 * @returns {void}
		 */
		setupSortable: function() {
			var control = this, ul;
			if ( ! control.params.select2_options.multiple ) {
				return;
			}

			ul = control.select2.next( '.select2-container' ).first( 'ul.select2-selection__rendered' );
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
						option = control.select2.find( 'option[value="' + id + '"]' );
						control.select2.append( option );
					});
					control.setSettingValues( selectedValues );
				}
			});
		},

		/**
		 * Setup buttons for adding new posts.
		 *
		 * @returns {void}
		 */
		setupAddNewButtons: function setupAddNewButtons() {
			var control = this;

			// Set up the add new post buttons
			control.container.on( 'click', '.add-new-post-button', function() {
				var promise, button;
				button = $( this );
				button.prop( 'disabled', true );
				promise = api.Posts.insertAutoDraftPost( $( this ).data( 'postType' ) );

				promise.done( function( data ) {
					var returnPromise = focusConstructWithBreadcrumb( data.section, control );
					data.section.focus();
					returnPromise.done( function() {
						var values;
						if ( 'publish' === data.setting.get().post_status ) {
							values = control.getSettingValues().slice( 0 );
							if ( ! control.params.select2_options.multiple ) {
								values = [ data.postId ];
							} else {
								// @todo Really the add new buttons should be disabled when the limit is reached.
								if ( control.params.select2_options.multiple && control.params.select2_options.limit >= values.length ) {
									values.length = control.params.select2_options.limit - 1;
								}
								values.unshift( data.postId )
							}
							control.setSettingValues( values );
						}
						button.focus(); // @todo Focus on the select2?
					} );
				} );

				promise.always( function() {
					button.prop( 'disabled', false );
				} );
			} );

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
			function focusConstructWithBreadcrumb( focusConstruct, returnConstruct ) {
				var deferred = $.Deferred();
				focusConstruct.focus();
				function onceCollapsed( isExpanded ) {
					if ( ! isExpanded ) {
						focusConstruct.expanded.unbind( onceCollapsed );
						returnConstruct.focus( {
							completeCallback: function() {
								deferred.resolve();
							}
						} );
					}
				}
				focusConstruct.expanded.bind( onceCollapsed );
				return deferred;
			}
		},

		/**
		 * Re-populate the select options based on the current setting value.
		 *
		 * @returns {jQuery.promise} Resolves when complete. Rejected when failed.
		 */
		populateSelectOptions: function( refresh ) {
			var control = this, request, settingValues, selectedValues, deferred = jQuery.Deferred();

			settingValues = control.getSettingValues();
			selectedValues = control.getSelectedValues();
			if ( ! refresh && _.isEqual( selectedValues, settingValues ) ) {
				deferred.resolve();
			} else if ( 0 === settingValues.length ) {
				control.select2.empty();
				control.select2.trigger( 'change' );
				deferred.resolve();
			} else {
				request = control.queryPosts({
					post__in: settingValues,
					orderby: 'post__in'
				});
				request.done( function( data ) {
					if ( control.notifications ) {
						control.notifications.remove( 'select2_init_failure' );
					}
					control.select2.empty();
					_.each( data.results, function( item ) {
						var option = new Option( control.select2Template( item ), item.id, true, true );
						control.select2.append( option );
					} );
					control.select2.trigger( 'change' );
					deferred.resolve();
				} );
				request.fail( function() {
					var notification;
					if ( api.Notification && control.notifications ) {
						// @todo Allow clicking on this notification to re-call populateSelectOptions()
						notification = new api.Notification( 'select2_init_failure', {
							type: 'error',
							message: 'Failed to fetch selections.' // @todo l10n
						} );
						control.notifications.add( notification.code, notification );
					}
					deferred.reject();
				} );
			}
			return deferred.promise();
		},

		/**
		 * Embed the control in the document.
		 *
		 * Override the embed() method to do nothing,
		 * so that the control isn't embedded on load,
		 * unless the containing section is already expanded.
		 *
		 * @returns {void}
		 */
		embed: function() {
			var control = this,
				sectionId = control.section();
			if ( ! sectionId ) {
				return;
			}
			api.section( sectionId, function( section ) {
				if ( section.expanded() || api.settings.autofocus.control === control.id ) {
					control.actuallyEmbed();
				} else {
					section.expanded.bind( function( expanded ) {
						if ( expanded ) {
							control.actuallyEmbed();
						}
					} );
				}
			} );
		},

		/**
		 * Deferred embedding of control when actually
		 *
		 * This function is called in Section.onChangeExpanded() so the control
		 * will only get embedded when the Section is first expanded.
		 *
		 * @returns {void}
		 */
		actuallyEmbed: function() {
			var control = this;
			if ( 'resolved' === control.deferred.embedded.state() ) {
				return;
			}
			control.renderContent();
			control.deferred.embedded.resolve(); // This triggers control.ready().
		},

		/**
		 * This is not working with autofocus.
		 *
		 * @param {object} args Args.
		 * @returns {void}
		 */
		focus: function( args ) {
			var control = this;
			control.actuallyEmbed();
			api.Control.prototype.focus.call( control, args );
		}
	});

	api.controlConstructor['object_selector'] = api.ObjectSelectorControl;

})( wp.customize, jQuery );
