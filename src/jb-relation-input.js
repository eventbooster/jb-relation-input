/**
* Input (typeahead) for getting entities from the server. Made for the Distributed framework.
*/
( function() {

	'use strict';

	angular
	.module( 'jb.relationInput', [ 'eb.apiWrapper' ] )
	.directive( 'relationInput', [ function() {

		return {
			require				: [ 'relationInput', 'ngModel' ]
			, replace			: true
			, controller		: 'RelationInputController'
			, bindToController	: true
			, controllerAs		: 'relationInput'
			, link				: function( scope, element, attrs, ctrl ) {
				ctrl[ 0 ].init( element, ctrl[ 1 ] );
			}
			, scope				: {}
			, templateUrl		: 'relationInputTemplate.html'
		};

	} ] )

	.controller( 'RelationInputController', [ '$scope', '$attrs', '$q', '$rootScope', 'APIWrapperService', function( $scope, $attrs, $q, $rootScope, APIWrapperService ) {

		var self		= this
			, element
			, modelCtrl
			, open		= false;

		// Namespace for clickhandlers (outside of input to inactivate it); needed to remove them after
		// input is not active any more.
		var eventNamespace = ( Math.random() + '' ).replace( '.', '' ).substring( 1, 15 );

		// URL to get suggestions from
		self.entityUrl				= $attrs.relationEntityEndpoint;

		// Variables for suggestion: 
		// - what fields do we search?
		self.searchField			= $attrs.relationEntitySearchField;

		// Template for search results
		self.searchResultTemplate	= $attrs.relationSuggestionTemplate;

		self.isMultiSelect			= $attrs.multiSelect === 'true' ? true : false;



		// May the relations be deleted?
		$scope.deletable			= $scope.$parent.$eval( $attrs.deletable );
		$scope.isInteractive		= $attrs.relationInteractive === 'true' ? true : false;



		// Check if all fields are provided
		var requiredFields = [ 'entityUrl', 'searchResultTemplate', 'searchField' ];
		requiredFields.forEach( function( requiredField ) {
			if( !self[ requiredField ] ) {
				console.error( 'RealtinInput: Missing %s, is mandatory', requiredField );
			}
		} );


		// Make URLs public for «edit» and «new» buttons
		$scope.newEntityUrl		= self.entityUrl;



		// Make ngModel available to templates
		// -> one way binding
		$scope.entities		= undefined;

		$scope.$watch( function() {
			return modelCtrl.$modelValue;
		}, function( newValue ) {
			if( !angular.isArray( newValue ) ) {
				newValue = [ newValue ];
			}
			console.log( 'RelationInput: caught modelCtrl modelValue change; is now %o', newValue );
			$scope.entities			= newValue;
		} );






		//
		// Init
		//

		self.init = function( el, model ) {
			element		= el;
			modelCtrl	= model;
			self.setupEventListeners();
			console.log( 'RelationInput: model is %o on init', model );
		};








		//
		// Change of entities (entities were added or removed)
		// -> Update model
		//

		// Make modelValue available to UI so that 
		// selected-entities can display the selected entities
		// But keep in self so that child directives may access it
		//self.entities = $scope.entities = [];


		self.addRelation = function( entity ) {

			// Update entities (will be displayed in selected-entities)

			// Update model
			if( !self.isMultiSelect ) {
				modelCtrl.$setViewValue( [ entity ] );
			}
			else {
				var currentData = ( modelCtrl.$modelValue && angular.isArray( modelCtrl.$modelValue ) ) ? modelCtrl.$modelValue.slice() : [];
				currentData.push( entity );
				modelCtrl.$setViewValue( currentData );
			}

			$scope.$broadcast( 'entitiesUpdated', $scope.entities );

		};


		self.removeRelation = function( entity ) {

			if( self.isMultiSelect ) {
				var originalData = modelCtrl.$modelValue;
				originalData.splice( originalData.indexOf( entity ), 1 );
				modelCtrl.$setViewValue( originalData );
			}
			else {
				modelCtrl.$setViewValue( [] );
			}

			$scope.$broadcast( 'entitiesUpdated', $scope.entities );

		};











		//
		// Select fields
		//





		//
		// Open?
		//
		self.isOpen = function() {
			// If we're open, remove the input field that catches the focus or the
			// user may not go one input field back (shift-tab)
			var focusInput = element.find( '.selected-entities input' );
			if( open ) {
				focusInput.hide();
				setupDocumentClickHandler();
			}
			else {
				focusInput.show();
				removeDocumentClickHandler();
			}
			return open;
		};






		// 
		// Event Listeners
		//

		// Watch for events, called from within init
		self.setupEventListeners = function() {
			// Open & close: 
			// Watch for events here (instead of suggestion), as most events happen
			// on this directive's element (and not the one of suggestion)

			$scope.$on( 'relationInputFieldFocus', function() {
				$scope.$apply( function() {
					open = true;
				} );
			} );

			$scope.$on( 'relationInputSelectedEntitiesClick', function() {
				$scope.$apply( function() {
					open = !open;
				} );
			} );

			$scope.$on( '$destroy', function() {
				// Remove all listeners
			} );

			setupInputBlurHandler();

		};





		/**
		* Blur on the input: Hide after some ms (that are needed for a click handler to fire first)
		*/
		function setupInputBlurHandler() {
		/*	console.error( element );
			element.find( '.entity-suggestions input' ).blur( function( ev ) {
				setTimeout( function() {
					$scope.$apply( function() {
						open = false;
					} );
				}, 100 );
			} );*/
		}

		/**
		* Click on document: Is element.entity-suggestions above the element that was clicked?
		* If not, close
		*/
		function setupDocumentClickHandler() {
			$( document ).on( 'click.' + eventNamespace, function( ev ) {

				// Clicked selectedEntities: Is handled in setupSelectedClickHandler
				if( $( ev.target ).closest( element.find( '.selected-entities' ) ).length > 0 ) {
					return;
				}

				if( $( ev.target ).closest( element.find( '.entity-suggestions') ).length === 0 ) {
					$scope.$apply( function() {
						open = false;
					} );
				}
			} );
		}

		/**
		* Remove document.click handler
		*/
		function removeDocumentClickHandler() {
			$( document ).off( 'click.' + eventNamespace );
		}

	} ] )



	.run( ['$templateCache', function( $templateCache ) {

		$templateCache.put( 'relationInputTemplate.html',
			'<div>' +
				'<div data-relation-input-selected-entities></div>' +
				'<div data-relation-input-suggestions></div>' +
				'<div clearfix data-ng-if=\'isInteractive\'>' +
					'<a data-ng-attr-href=\'/#{{ newEntityUrl }}/new\'=\'#\'><span class=\'fa fa-plus\'></span> New</a>' +
				'</div>' +
			'</div>'
		);

	} ] )






	.directive( 'relationInputSuggestions', [ function() {

		return {
			require			: [ 'relationInputSuggestions', '^relationInput' ]
			, link			: function( scope, element, attrs, ctrl ) {
				ctrl[ 0 ].init( element, ctrl[ 1 ] );
			}
			, controller	: 'RelationInputSuggestionsController'
			, replace		: true
		};

	} ] )

	.controller( 'RelationInputSuggestionsController', [ '$scope', '$rootScope', '$compile', '$templateCache', 'APIWrapperService', 'RelationInputService', function( $scope, $rootScope, $compile, $templateCache, APIWrapperService, RelationInputService ) {

		var self = this
			, element
			, relationInputController;


		// List of results gotten for searchQuery
		$scope.results		= [];

		// Result selected by cursors (but not yet added)
		$scope.selected		= undefined;

		// Are we requesting data from the server currently?
		// (If yes, display loading indicator)
		$scope.loading		= false;



		//
		// Seach query
		//

		$scope.searchQuery	= undefined;

		$scope.$watch( 'searchQuery', function( newValue ) {
			console.log( $scope.searchQuery );
			self.getData( newValue );
		} );



		//
		// Click on result or enter
		//

		$scope.selectResult = function( result ) {

			// Propagate to relationInputController that updates the model
			relationInputController.addRelation( result );

			$scope.results			= [];
			$scope.searchQuery		= '';

		};






		//
		// Model changed
		//

		// Entites updated (propagated from relationInput)
		// Update results displayed (remove added result from suggestions)
		$scope.$on( 'entitiesUpdated', function() {
			self.filterResults();
		} );






		//
		// Init
		//

		self.init = function( el, relInputCtrl ) {
			element = el;
			relationInputController = relInputCtrl;
			self.renderTemplate();
			self.setupEventListeners();
		};





		//
		// Open?
		//

		/**
		* Returns true if suggestions should be displayed; sets focus on input
		*/
		$scope.isOpen = function() {
			var open = relationInputController.isOpen();
			if( open ) {
				setTimeout( function() {
					element.find( 'input' ).focus();
				}, 100 );
			}
			return open;
		};







		//
		// Render Template
		// (don't use templateUrl as we need to insert searchResultTemplate)
		//

		self.renderTemplate = function() {

			// resultTemplate: replace [ name ] with {{ result.name }}
			// We can't use {{}} when template is passed, as it will be rendered and {{}} will be removed
			// if we have to $compile the code first (see autoRelationInputDirecitve)
			var resultTpl = relationInputController.searchResultTemplate;
			resultTpl = resultTpl.replace( /\[\[(\s*)(((?!\]\]).)*)\]\]/gi, function( res, space, name ) {
				return '{{ result.' + name + ' }}';
			} );

			console.log( 'RelationInputController: Render template %o', resultTpl );

			var tpl = $( $templateCache.get( 'relationInputSuggestionsTemplate.html' ) );
			tpl.find( 'li' ).append( resultTpl );
			element.replaceWith( tpl );
			$compile( tpl )( $scope );
			element = tpl;

		};





		//
		// Event Handlers
		//

		self.setupEventListeners = function() {

			// If we use keyup, enter will only fire once (wtf?)

			element.find( 'input' ).keydown( function( ev ) {

				if( [ 40, 38, 13 ].indexOf( ev.which ) === -1 ) {
					return;
				}

				$scope.$apply( function() {

					switch( ev.which ) {
						// Down
						case 40:
							self.updateSelected( ev, 1 );
							break;
						// Up
						case 38:
							self.updateSelected( ev, -1 );
							break;
						// Enter
						case 13:
							self.addSelected( ev );
							break;
					}

				} );

			} );

		};


		// Up or down arrow
		self.updateSelected = function( ev, direction ) {

			ev.preventDefault();

			var currentIndex;
			for( var i = 0; i < $scope.results.length; i++ ) {
				if( $scope.results[ i ] === $scope.selected ) {
					currentIndex = i;
				}
			}

			if( currentIndex === undefined || ( direction === -1 && currentIndex === 0 ) || ( direction === 1 && currentIndex === $scope.results.length - 1 ) ) {
				return;
			}

			$scope.selected = $scope.results[ currentIndex + direction ];

		};

		// User presses enter
		self.addSelected = function( ev ) {
			
			ev.preventDefault();
			if( !$scope.selected ) {
				return;
			}
			$scope.selectResult( $scope.selected );

		};









		//
		// Get Data
		//

		self.getData = function( query ) {

			$scope.results = [];

			if( !query ) {
				return;
			}

			$scope.loading = true;

			var filterField			= relationInputController.searchField
				, filter			= filterField + '=like(\'%' + query + '%\')'
				, selectFields		= self.getSelectFields();

			console.log( 'RelationInput: request %s, filter %o, select %o', relationInputController.entityUrl, filter, selectFields.join( ',' ) );

			APIWrapperService.request( {
				url				: relationInputController.entityUrl
				, method		: 'GET'
				, headers		: {
					filter		: filter
					, select	: selectFields.join( ',' )
					, range		: '0-10'
				}
			} )
			.then( function( data ) {
				$scope.loading	= false;
				$scope.results = data;
				self.filterResults();
				/*if( $scope.results.length > 0 ) {
					$scope.selected = $scope.results[ 0 ];
				}*/
			}, function( err ) {
				$scope.loading	= false;
				$rootScope.$broadcast( 'notification', { type: 'error', message: 'web.backoffice.detail.loadingError', variables: { errorMessage: err } } );
			} );

		};



		/**
		* Get select fields from <li>'s content
		*/
		self.getSelectFields = function() {

			var tpl = relationInputController.searchResultTemplate;

			if( !tpl ) {
				console.error( 'RelationInput: Missing searchResultTemplate in %o', self );
			}

			// Use service for template parsing (functionality is shared with selected entities controller)
			return RelationInputService.extractSelectFields( tpl );

		};









		/**
		* Updates $scope.results: Removes all entities that are already selected
		* Then updates selected (as it may have been removed)
		*/
		self.filterResults = function() {

			var selected = relationInputController.entities;

			if( relationInputController.isMultiRelation ) {
				for( var i = 0; i < selected.length; i++ ) {
					for( var j = $scope.results.length - 1; j >= 0; j-- ) {

						// id missing
						if( !$scope.results[ j ].id || !selected[ i ].id ) {
							continue;
						}

						if( $scope.results[ j ].id === selected[ i ].id ) {
							$scope.results.splice( j, 1 );
						}
					}
				}
			}
			else {
				// Nothing to do; no elements need to be removed as noone can be selected
			}

			if( $scope.results.length > 0 ) {
				$scope.selected = $scope.results[ 0 ];
			}

			console.log( 'RelationInput: filterResults; results is %o, selected %o', $scope.results, $scope.selected );

		};

	} ] )


	.run( [ '$templateCache', function( $templateCache ) {

		$templateCache.put( 'relationInputSuggestionsTemplate.html',
			'<div class=\'entity-suggestions\' data-ng-show=\'isOpen()\'>' + 
				'<input type=\'text\' class=\'form-control\' data-ng-model=\'searchQuery\' data-ng-model-options=\'{"debounce":{"default":200}}\' />' +
				'<div class=\'progress progress-striped active\' data-ng-if=\'loading\'>' +
					'<div class=\'progress-bar\' role=\'progressbar\' style=\'width:100%\'></div>' +
				'</div>' +
				'<div class=\'results-list\'>' +
					'<ul data-ng-if=\'results.length > 0\'>' +
						'<li data-ng-repeat=\'result in results\' data-ng-class=\'{selected:selected===result}\' data-ng-click=\'selectResult(result)\'><!-- see renderTemplate --></li>' +
					'</ul>' +
				'</div>' +
			'</div>'
		);

	} ] )







	.directive( 'relationInputSelectedEntities', [ function() {
		return {
			link			: function( scope, element, attrs, ctrl ) {
				ctrl[ 0 ].init( element, ctrl[ 1 ] );
			}
			, controller	: 'RelationInputSelectedEntitiesController'
			, require		: [ 'relationInputSelectedEntities', '^relationInput' ]
			, templateUrl	: 'relationInputSelectedEntitiesTemplate.html'
			, replace		: true
		};
	} ] )


	.controller( 'RelationInputSelectedEntitiesController', [ '$scope', '$location', '$templateCache', '$compile', function( $scope, $location, $templateCache, $compile ) {

		var self = this
			, element
			, relationInputController;


		$scope.visitEntity = function( ev, entity ) {
			ev.preventDefault();
			$location.path( $scope.newEntityUrl + '/' + entity.id );
		};


		$scope.removeEntity = function( ev, entity ) {
			ev.preventDefault();
			relationInputController.removeRelation( entity );
		};

		self.init = function( el, relInputCtrl ) {

			element						= el;
			relationInputController		= relInputCtrl;

			// eventListener of relationInput looks for events happening in this directive
			// therefore wait with setting them up until this directive is ready and it's template
			// is rendered
			//relationInputController.setupEventListeners();
			$scope.isMultiSelect = relationInputController.isMultiSelect;

			self.renderTemplate();
			self.setupEventListeners();

		};

		self.renderTemplate = function() {

			// See renderTemplate in relationInputSuggestionsController
			var resultTpl = relationInputController.searchResultTemplate;
			resultTpl = resultTpl.replace( /\[\[(\s*)(((?!\]\]).)*)\]\]/gi, function( res, space, name ) {
				return '{{ result.' + name + ' }}';
			} );

			var tpl = $( $templateCache.get( 'relationInputSelectedEntitiesTemplate.html' ) );
			tpl.find( 'li > span' ).append( resultTpl );
			element.replaceWith( tpl );
			$compile( tpl )( $scope );
			element = tpl;

		};


		/**
		* Listens to focus, blur and click events, propagates them (to RelationInputController). 
		* They can't be listened to directly in the RelationInputController, as renderTemplate() is called
		* _after_ the eventListener setup function of RelationInputController
		*/
		self.setupEventListeners = function() {

			// Focus on (hidden) input: Show suggestions
			element.find( 'input' ).focus( function() {
					$scope.$emit( 'relationInputFieldFocus' );
				} );

			// Click on element
			element.click( function() {
				$scope.$emit( 'relationInputSelectedEntitiesClick' );
			} );

		};



	} ] )



	/**
	* Small services that need to be accessible from all directives/controllers
	*/
	.factory( 'RelationInputService', [ function() {

		return {

			/**
			* Extracts select header fields from a template that is used for
			* - the suggestions
			* - the selected entities
			* Template uses syntax like [[ select[0].subselect | filter ]] (basically replaces
			* the angular {{ brackets with [[ )
			*
			* @return <Array>		Array of fields to be selected on GET call (as string)
			*/
			extractSelectFields: function( template ) {
			
				console.log( 'RelationInputService: Get fields from %o', template );

				// Split at [ 
				var tplSplit		= template.split( '[[' ).slice( 1 )
				// Fields to select (e.g. 'eventData.name')
					, selectFields	= [];

				tplSplit.forEach( function( tplPart ) {

					// Watch for closing ]]
					var field = tplPart.substring( 0, tplPart.indexOf( ']]' ) );

					// Remove part behind | (used for angular filters, e.g. with a date: «|date:'dd.mm.yy'»
					if( field.indexOf( '|' ) > -1 ) {
						field = field.substring( 0, field.indexOf( '|' ) );
					}

					// Remove white spaces
					field = field.replace( /^\s*|\s*$/gi, '' );

					// Remove [0] notation (used to output first element in array)
					field = field.replace( /\[\d+\]/g, '' );

					selectFields.push( field );

				} );

				return selectFields;

			}


		};


	} ] )


	.run( [ '$templateCache', function( $templateCache ) {

		$templateCache.put( 'relationInputSelectedEntitiesTemplate.html',
			'<div class=\'selected-entities\' data-ng-class=\'{ "single-select": !isMultiSelect }\'>' +
				'<input type=\'text\' />' + // catch [tab]
				'<ul>' +
					// use result for the loop as in the suggestion directive so that we may use the same template
					'<li data-ng-repeat=\'result in entities\' data-ng-class=\'{empty: !result.name}\'>' +
					'<span><!-- see renderTemplate() --></span>' +
					'<button data-ng-if=\'isInteractive\' data-ng-click=\'visitEntity($event, result)\'><span class=\'fa fa-pencil\'></span></button>' +
					'<button data-ng-if=\'deletable\' data-ng-click=\'removeEntity($event,result)\'>&times;</button>' +
					'</li>' +
				'</ul>' +
			'</div>'
		);

	} ] );

}() );