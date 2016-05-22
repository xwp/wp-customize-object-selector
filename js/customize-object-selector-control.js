/* global wp */
/* eslint consistent-this: [ "error", "control" ] */

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
			var control = this, args, params;

			args = options || {};

			args.params = _.extend(
				{
					select2_options: {},
					post_query_args: null,
					user_query_args: null,
					term_query_args: null
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

			// @todo Add support for settings that are not array values but scalar (non-multiple).
			// @todo Add support for settingSubproperty (e.g. so we can map a post_parent property of a post setting).
			api.Control.prototype.initialize.call( control, id, args );
		},

		/**
		 * Query posts.
		 *
		 * @param {object} queryVars
		 * @returns {jQuery.promise}
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

			control.select2 = control.container.find( '.object-selector:first' ).select2( _.extend(
				{
					ajax: {
						transport: function ( params, success, failure ) {
							var request = control.queryPosts({
								s: params.data.term,
								paged: params.data.page || 1
							});
							request.done( success );
							request.fail( failure );
						}
					}
				},
				control.params.select2_options
			) );

			control.populateSelectOptions();

			// Sync the select2 values with the setting values.
			control.select2.on( 'change', function() {
				control.setting.set( _.map(
					control.select2.val() || [],
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

			api.Control.prototype.ready.call( control );
		},

		/**
		 * Setup sortable.
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
					control.setting.set( selectedValues );
				}
			});
		},

		/**
		 * Re-populate the select options based on the current setting value.
		 */
		populateSelectOptions: function() {
			var control = this, request, settingValues, selectValues;

			settingValues = control.setting.get();
			if ( _.isNumber( settingValues ) ) {
				settingValues = [ settingValues ];
			} else if ( ! _.isArray( settingValues ) ) {
				settingValues = [];
			}
			selectValues = _.map(
				control.select2.val() || [],
				function( value ) {
					return parseInt( value, 10 );
				}
			);

			if ( _.isEqual( selectValues, settingValues ) ) {
				return;
			}

			if ( 0 === settingValues.length ) {
				control.select2.empty();
				control.select2.trigger( 'change' );
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
						var option = new Option( item.text, item.id, true, true );
						control.select2.append( option );
					} );
					control.select2.trigger( 'change' );
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
				} );
			}
		},

		/**
		 * Embed the control in the document.
		 *
		 * Override the embed() method to do nothing,
		 * so that the control isn't embedded on load,
		 * unless the containing section is already expanded.
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
		 * @param args
		 */
		focus: function( args ) {
			var control = this;
			control.actuallyEmbed();
			api.Control.prototype.focus.call( control, args );
		}
	});

	api.controlConstructor['object_selector'] = api.ObjectSelectorControl;

})( wp.customize, jQuery );
