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

			// @todo Add support for settingSubproperty.
			api.Control.prototype.initialize.call( control, id, args );
		},

		/**
		 * @inheritdoc
		 */
		ready: function() {
			var control = this, select;

			select = control.container.find( '.object-selector:first' );

			select.select2( _.extend(
				{
					ajax: {
						transport: function ( params, success, failure ) {
							var request, action, data, postQueryArgs = null, userQueryArgs = null, termQueryArgs = null;
							action = 'customize_object_selector_query';
							data = api.previewer.query();
							data.customize_object_selector_query_nonce = api.settings.nonce[ action ];
							if ( null !== control.params.post_query_args ) {
								postQueryArgs = _.extend( {}, control.params.post_query_args );
							}
							// @todo Implement user and term queries.
							// @todo userQueryArgs.search = params.term;
							// if ( null !== control.params.term_query_args ) {
							// 	userQueryArgs = _.extend( {}, control.params.term_query_args );
							// }
							// @todo termQueryArgs.name__like = '%' + params.term + '%';
							// if ( null !== control.params.user_query_args ) {
							// 	termQueryArgs = _.extend( {}, control.params.user_query_args );
							// }
							if ( ! postQueryArgs ) {
								postQueryArgs = {};
							}
							if ( postQueryArgs ) {
								postQueryArgs.s = params.data.term;
								postQueryArgs.paged = params.data.page || 1;
								data.post_query_args = JSON.stringify( postQueryArgs );
							}

							request = wp.ajax.post( action, data );
							request.done( success );
							request.fail( failure );
						}
					},
					// initSelection: function ( element, callback ) {
					// 	var objectIds, selectedValues;
					//
					// 	objectIds = control.setting.get();
					// 	if ( ! _.isArray( objectIds ) ) {
					// 		objectIds = [ objectIds ];
					// 	}
					//
					// 	// @todo Obtain the posts data for objectIds
					// 	selectedValues = _.map(  function() {}, objectIds );
					// 	selectedValues = [];
					//
					// 	callback( selectedValues );
					// }
				},
				control.params.select2_options
			) );
			// select.select2( 'container' ).find( 'ul.select2-choices' ).sortable( {
			// 	containment: 'parent',
			// 	start: function () {
			// 		select.select2( 'onSortStart' );
			// 	},
			// 	update: function () {
			// 		select.select2( 'onSortEnd' );
			// 	}
			// } );

			api.Control.prototype.ready.call( control );
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
