/* global wp, jQuery, console */
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
			var control = this, args;

			args = options || {};

			args.params = _.extend(
				{
					select2_options: {},
					post_query_vars: null,
					setting_property: null // To sync with the property of a given setting (e.g. value.post_parent)
				},
				args.params || {}
			);
			if ( args.params.post_query_args && ! args.params.post_query_vars ) {
				if ( 'undefined' !== typeof console ) {
					console.warn( '[customize-object-selector-control] The post_query_args arg is deprecated in favor of post_query_vars.' );
				}
				args.params.post_query_vars = args.params.post_query_args;
			}

			if ( true === args.params.select2_options.multiple ) {
				args.params.select2_options.width = '100%';
			}
			args.params.select2_options = _.extend(
				{
					multiple: false,
					cache: false,
					width: '72%'
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
			args.params.select_id = id + String( Math.random() );

			api.Control.prototype.initialize.call( control, id, args );

			_.bind( control.handleRemoval, control );
			api.control.bind( 'remove', control.handleRemoval );
		},

		/**
		 * Create synced property value.
		 *
		 * Given that the current setting contains an object value, create a new
		 * model (Value) to represent the value of one of its properties, and
		 * sync the value between the root object and the property value when
		 * either are changed. The returned Value can be used to sync with an
		 * Element.
		 *
		 * @param {wp.customize.Value} root Root value instance.
		 * @param {string} property Property name.
		 * @returns {wp.customize.Value} Property value instance.
		 */
		createSyncedPropertyValue: function createSyncedPropertyValue( root, property ) {
			var propertyValue = new api.Value( root.get()[ property ] );

			// Sync changes to the property back to the root value.
			propertyValue.bind( function updatePropertyValue( newPropertyValue ) {
				var rootValue = _.clone( root.get() );
				rootValue[ property ] = newPropertyValue;
				root.set( rootValue );
			} );

			// Sync changes in the root value to the model.
			root.bind( function updateRootValue( newRootValue, oldRootValue ) {
				if ( ! _.isEqual( newRootValue[ property ], oldRootValue[ property ] ) ) {
					propertyValue.set( newRootValue[ property ] );
				}
			} );

			return propertyValue;
		},

		/**
		 * Handle control removal.
		 *
		 * @todo We may not want to remove and destroy here, as in the case of a control removed temporarily to be re-added later?
		 *
		 * @param {wp.customize.Control} removedControl Removed control.
		 * @returns {void}
		 */
		handleRemoval: function handleRemoval( removedControl ) {
			var control = this;
			if ( removedControl === control ) {
				control.objectSelector.destroy();
				api.control.unbind( 'remove', control.handleRemoval );
				control.container.remove();

				if ( control.section() && api.section( control.section() ) ) {
					api.section( control.section() ).expanded.unbind( control.closeDropdownUponSectionClose );
				}
			}
		},

		/**
		 * @inheritdoc
		 */
		ready: function() {
			var control = this, itemTemplate, model, selectorContainer;

			// Set up the Value that the selector will sync with.
			if ( control.params.setting_property ) {
				model = control.createSyncedPropertyValue( control.setting, control.params.setting_property );
			} else {
				model = control.setting;
			}

			itemTemplate = wp.template( 'customize-object-selector-item' );
			control.objectSelector = new api.ObjectSelectorComponent({
				model: model,
				containing_construct: control,
				post_query_vars: control.params.post_query_vars,
				show_add_buttons: control.params.show_add_buttons,
				select_id: control.params.select_id,
				select2_options: control.params.select2_options,
				select2_result_template: itemTemplate,
				select2_selection_template: itemTemplate
			});

			selectorContainer = control.container.find( '.customize-object-selector-container' );
			control.objectSelector.embed( selectorContainer );

			/*
			 * Prevent escape key from causing the current section to collapse.
			 * Stopping propagation prevents the body keydown handler from being reached:
			 * https://github.com/xwp/wordpress-develop/blob/4.6.0/src/wp-admin/js/customize-controls.js#L3971-L4007
			 */
			control.objectSelector.select.data( 'select2' ).on( 'keypress', function stopEscKeypressPropagation( event ) {
				var escapeKey = 27;
				if ( escapeKey === event.which ) {
					event.stopPropagation();
				}
			} );

			// @todo For some reason tab focus is not working as expected with non-multiple select2s. The following is a workaround.
			if ( ! control.params.select2_options.multiple ) {
				control.objectSelector.select.on( 'select2:close', function() {
					control.objectSelector.select.focus();
				} );
			}

			control.closeDropdownUponSectionClose = _.bind( control.closeDropdownUponSectionClose, control );
			if ( control.section() ) {
				api.section( control.section(), function( section ) {
					section.expanded.bind( control.closeDropdownUponSectionClose );
				} );
			}

			api.Control.prototype.ready.call( control );

			api.control.bind( 'remove', function( removedControl ) {
				if ( removedControl.id === control.id ) {
					control.objectSelector.destroy();
				}
			} );
		},

		/**
		 * Close a select2 when its section is closed.
		 *
		 * @param {bool} sectionExpanded Expanded.
		 * @returns {void}
		 */
		closeDropdownUponSectionClose: function( sectionExpanded ) {
			var control = this,
				select = control.objectSelector ? control.objectSelector.select : false;
			if ( ! sectionExpanded && select && select.data( 'select2' ) ) {
				select.select2( 'close' );
			}
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

	api.controlConstructor.object_selector = api.ObjectSelectorControl;

})( wp.customize, jQuery );
