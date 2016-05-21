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
			var control = this, args;

			args = options || {};
			// See https://select2.github.io/examples.html#programmatic-control
			args.params = _.extend(
				{
					placeholder: '',
					multiple: false,
					maximumSelectionLength: 1
				},
				args.params || {}
			);
			if ( ! args.params.type ) {
				args.params.type = 'object_selector';
			}
			if ( ! args.params.content ) {
				args.params.content = $( '<li></li>' );
				args.params.content.attr( 'id', 'customize-control-' + id.replace( /]/g, '' ).replace( /\[/g, '-' ) );
				args.params.content.attr( 'class', 'customize-control customize-control-' + args.params.type );
			}

			api.Control.prototype.initialize.call( control, id, args );
		},

		/**
		 * @inheritdoc
		 */
		ready: function() {
			var control = this, el = control.container.find( 'select:first' );

			el.select2( {
				cache: false,
				tags: true,
				width: '100%',
				ajax: {
					url: wp.ajax.settings.url,
					type: 'POST',
					results: function ( response ) {
						return response;
					},
					data: function ( search ) {
						var ajaxParams = {
							post_type: '',
							s: search,
							action: el.data( 'cas-action' ),
							_wpnonce: el.data( 'cas-nonce' ),
							doing_object_selector: true,
							wp_customize: 'on'
						};
						return ajaxParams;
					}
				},
				initSelection: function ( element, callback ) {
					var el = $( element );
					if ( el.data( 'cas-initial-values' ) ) {
						callback( el.data( 'cas-initial-values' ) );
					}
				}
			} );
			el.select2( 'container' ).find( 'ul.select2-choices' ).sortable( {
				containment: 'parent',
				start: function () {
					el.select2( 'onSortStart' );
				},
				update: function () {
					el.select2( 'onSortEnd' );
				}
			} );

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
