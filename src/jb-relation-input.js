/**
* Input (typeahead) for getting entities from the server. Made for the Distributed framework.
* ATTENTION: bindToController newly introduced, might cause problems. Needs testing.
 *
*/
( function() {
    'use strict';

    angular
    .module( 'jb.relationInput', [ 'jb.apiWrapper', 'ui.router' ] )
    .directive( 'relationInput', [ function() {

        return {
              controller		: 'RelationInputController'
            , bindToController	: true
            , controllerAs		: 'relationInput'
            , link				: function( scope, element, attrs, ctrl ) {
                // Check if all fields are provided
                var requiredFields = [ 'relationEntityEndpoint', 'relationSuggestionTemplate', 'relationSearchField' ];
                requiredFields.forEach( function( requiredField ) {
                    if( !attrs.hasOwnProperty(requiredField) ) {
                        console.error( 'RelationInput: Missing %s, is mandatory', requiredField );
                    }
                });

                if(!attrs.hasOwnProperty('relationResultCount')){
                    ctrl.resultCount = 20;
                }

                ctrl.init( element, attrs );
            }
            , scope				: {
                  entities		        : '=ngModel'
                , entityUrl		        : '@relationEntityEndpoint'
                , searchResultTemplate  : '@relationSuggestionTemplate'
                , searchField           : '@relationSearchField'

                , filters 		        : '<?relationFilter'
                , deletable             : '<?relationIsDeletable'
                , creatable             : '<?relationIsCreatable'

                , resultCount           : '<?relationResultCount'

                , isMultiSelect         : '<?relationIsMultiSelect'

                , isInteractive         : '<?relationIsInteractive'
                , disableEdit           : '<?relationDisableEditButton'
                , disableNew            : '<?relationDisableNewButton'
                , disableRemove         : '<?relationDisableRemoveButton'

                , isReadonly            : '<?relationIsReadonly'
            }
            , templateUrl		: 'relationInputTemplate.html'
        };

    } ] )

    .controller( 'RelationInputController', [
          '$scope'
        , '$attrs'
        , '$q'
        , '$rootScope'
        , 'APIWrapperService'
        , '$state'
        , function( $scope, $attrs, $q, $rootScope, APIWrapperService, $state ) {

        var   self		= this
            , element
            , open		= false;

        // Namespace for clickhandlers (outside of input to inactivate it); needed to remove them after
        // input is not active any more.
        var eventNamespace = ( Math.random() + '' ).replace( '.', '' ).substring( 1, 15 );

        // URL to get suggestions from
        //self.entityUrl				= $attrs.relationEntityEndpoint;

        // Variables for suggestion:
        // - what fields do we search?
        //self.searchField			= $attrs.relationEntitySearchField;

        // Template for search results
        //self.searchResultTemplate	= $attrs.relationSuggestionTemplate;

        self.optionsData            = null;

        $scope.relatedEntityCanBeCreated	= false;
        $scope.relatedEntityCanBeEdited		= false;

        /**
         * @param ev
         * @param entity
         */
        $scope.visitEntity = function( ev, entity ) {

            var   idKey = self.getIdField()
                , id    = (entity && entity[idKey]) ? entity[idKey] : 'new';

            ev.preventDefault();

            $state.go('app.detail', {
                  entityName    : $scope.newEntityUrl
                , entityId      : id
            });
        };

        self.getIdField = function(){
            // a wild guess
            if(!self.optionsData) return 'id';
            return self.optionsData.primaryKeys[0];
        };

        // Make URLs public for «edit» and «new» buttons
        $scope.newEntityUrl		= self.entityUrl;




        //
        // Init
        //

        self.init = function( el, attrs ) {
            element		= el;
            self.setupDefaultValues();
            self.setupEventListeners();
            self.setRelatedEntityPermissions();
        };

        self.setupDefaultValues = function(){
        };


        // Broadcast entitiesUpdated when entities change (added/removed/initialized)
        $scope.$watch( function() {
            return self.entities;
        }, function() {
            $scope.$broadcast( 'entitiesUpdated', self.entities );
        }, true );




        /**
         * Sets $scope.relatedEntityCanBeCreated and $scoperelatedEntityCanBeEdited
         * by using the permissions (OPTIONS call) and the passed relationInteractive
         * attribute
         *
         * @todo: This is not fully correct, since the relation needs to to be checked with regard to the parent entity
         */
        self.setRelatedEntityPermissions = function() {

            return self.getOptions()
                .then( function( data ) {

                    if( !data.permissions ) {
                        console.warn( 'RelationInputController: permissions property missing in OPTIONS call response', JSON.stringify( permissions ) );
                        return;
                    }

                    if( data.permissions.createOrUpdate === true ) {
                        $scope.relatedEntityCanBeCreated = true;
                        self.canCreateRelatedEntity = true;
                    }

                    if( data.permissions.update === true ) {
                        $scope.relatedEntityCanBeEdited = true;
                        self.canEditRelatedEntity = true;
                    }

                    console.log( 'RelationInputController: Rights for ' + self.entityUrl + ': Create ' + $scope.relatedEntityCanBeCreated + ', edit: ' + $scope.relatedEntityCanBeCreated );
                    self.optionsData = data;

                }, function( err ) {
                    // Nothing to do
                } );

        };

        self.relatedEntityCanBeCreated = function(){
            return self.isInteractive !== false
                    && self.disableNew !== true
                    && self.canCreateRelatedEntity === true;
        };

        self.relatedEntityCanBeEdited = function(){
            return self.isInteractive !== false
                    && self.disableEdit !== true
                    && self.canEditRelatedEntity === true;
        };

        self.relationCanBeRemoved = function(){
            return  self.isReadonly !== true
                    && self.disableRemove !== true
                    && self.deletable === true;
        };

        self.relationCanBeCreated = function(){
            return self.isReadonly !== true
                    && self.creatable === true;
        };


        /**
        * Get OPTIONS for self.entityUrl. Needed to read the write/edit permissions (and to check if
        * edit/create symbols should be displayed).
        */
        self.getOptions = function() {
            if(self.optionsData) return $q.when(self.optionsData);
            return APIWrapperService.getOptions('/' + self.entityUrl)
            .then( function( data ) {
                return data;
            }, function( err ) {
                // Error does not really matter – we just won't display the create/edit tags
                console.error( 'RelationInputController: Could not get permission data: ' + JSON.stringify( err ) );
                return $q.reject( err );
            } );

        };

        //
        // Change of entities (entities were added or removed)
        // -> Update model
        //

        // Make modelValue available to UI so that
        // selected-entities can display the selected entities
        // But keep in self so that child directives may access it

        self.addRelation = function( entity ) {

            console.log( 'RelationInputController: Add relation %o', entity );

            // Update entities (will be displayed in selected-entities)
            // Update model
            if( !self.isMultiSelect ) {
                console.log( 'RelationInputController: Set model to %o', [ entity ] );
                self.entities = [ entity ];
            }
            else {
                // Make sure entities is an array. If not, init it as [].
                self.entities = angular.isArray( self.entities ) ? self.entities : [];
                self.entities.push( entity );
            }
        };


        self.removeRelation = function( entity ) {

            console.log( 'RelationInputController: Remove relation %o', entity );

            if( self.isMultiSelect ) {
                var originalData = self.entities;
                originalData.splice( originalData.indexOf( entity ), 1 );
                self.entities = originalData;
            }
            else {
                self.entities = [];
            }
        };

        //
        // Select fields
        //
        self.setOpen = function( isOpen ) {

            // Set private variable
            open = isOpen;

            // If we're open, remove the input field that catches the focus or the
            // user may not go one input field back (shift-tab)
            var focusInput = element.find( '.selected-entities input' );
            if( isOpen ) {
                focusInput.hide();
                setupDocumentClickHandler();
                setupInputBlurHandler();
            }
            else {
                removeInputBlurHandler();
                focusInput.show();
                removeDocumentClickHandler();
            }

            $scope.$broadcast( 'openChange', open );

        };


        //
        // Open?
        // Is used in RelationInputSuggestionsController to check if suggestions are open.
        //
        self.isOpen = function() {
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
                    self.setOpen( true );
                } );
            } );

            // Click on selected entities: Open/Close input
            $scope.$on( 'relationInputSelectedEntitiesClick', function() {
                $scope.$apply( function() {
                    console.log( 'RelationInputController: Clicked selected entities, set open to %o', true );
                    self.setOpen( true );
                } );
            } );

            $scope.$on( '$destroy', function() {
                // Remove all listeners
            } );

        };






        /**
        * Blur on the input: Hide after some ms (that are needed for a click handler to fire first)
        */
        function setupInputBlurHandler() {

            // As the input[type=text] is added in the current loop, it's not yet available in the dom.
            // Add watcher on the next loop.
            setTimeout( function() {

                // See if tab was pressed. Don't fire on blur, as blur usually (but not always!) fires before the click on a
                // suggestion and adding suggestion by the mouse will therefore not work (the suggestion list is being hidden
                // before it can be clicked)
                element.find( 'input[type=\'text\']:visible' ).on( 'keydown.relationInputBlurWatcher', function( ev ) {

                    if( ev.which !== 9 ) {
                        return true;
                    }

                    // Now, that's complicated and dirty:
                    // - If shiftKey was pressed (focus previous element): Previous input will be the tab-catcher, the
                    //   suggestion list will therefore be displayed again. Use a timeout.
                    // - If shiftKey was _not_ pressed, straightly go to the next element. Using a timeout here messes things
                    //   up, focus gets lost.
                    if( ev.shiftKey ) {
                        setTimeout( function() {
                            $scope.$apply( function() {
                                self.setOpen( false );
                            } );
                        }, 10);
                    }
                    else {
                        $scope.$apply( function() {
                            self.setOpen( false );
                        } );
                    }

                } );

            } );

        }


        /**
        * Remove blur handler
        */
        function removeInputBlurHandler() {
            element.find( 'input[type=\'text\']' ).off( 'keydown.relationInputBlurWatcher' );
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
                        self.setOpen( false );
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

    .controller( 'RelationInputSuggestionsController' , [

          '$scope'
        , '$rootScope'
        , '$compile'
        , '$templateCache'
        , '$timeout'
        , 'APIWrapperService'
        , 'RelationInputService'

        , function( $scope, $rootScope, $compile, $templateCache, $timeout, APIWrapperService, RelationInputService ) {

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



        // Holds the data that is displayed if no query was entered (default values).
        // Data is gotten when relation-input is being initialized.
        $scope.emptyQueryResults = undefined;


        //
        // Seach query
        //

        $scope.searchQuery	= {};

        $scope.$watch( 'searchQuery.value', function( newValue ) {
            var timeout = 1000 + Math.round( Math.random() * 2000 );
            console.log( 'RelationInputSuggestionsController: searchQuery changed to %o', $scope.searchQuery.value );
            // Init: Don't get data instantly as it will slow down the UI; wait for 1–2 secs.
            if( !newValue ) {
                if($scope.emptyQueryResults) {
                    timeout = 0;
                }
                $timeout( function() {
                    return self.getData( newValue );
                }, timeout );
            }

            // Not init: Search instantly.
            else {
                self.getData( newValue );
            }

        } );



        //
        // Click on result OR enter
        //

        $scope.selectResult = function( result, ev ) {

            // event is passed if user clicks (see data-ng-click)
            if( ev ) {
                ev.preventDefault();
            }

            console.log( 'RelationInputSuggestionsController: Clicked %o', result );

            // Propagate to relationInputController that updates the model
            relationInputController.addRelation( result );

            // Display default results (i.e. results for empty search string)
            // If emptyQueryResults is not set, there are no default results.
            if( !$scope.emptyQueryResults ) {
                $scope.results = [];
            }

            // Display all emptyQueryResults, then filter them.
            else {
                $scope.results = $scope.emptyQueryResults.slice( 0 );
                // Make sure there are no duplicates.
                self.filterResults();
            }


            // Reset value of input and searchQuery
            $scope.searchQuery.value		= '';
            element.find( 'input' ).val( '' );

            // If it's a single input, go to the next field.
            if( !relationInputController.isMultiSelect ) {
                relationInputController.setOpen( false );
            }

        };






        //
        // Model changed
        //

        // Entities updated (propagated from relationInput)
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
            //console.log( 'RelationInputSuggestionsController: Open is %o', open );
            return open;

        };


        /**
        * Open is set on relationInput: Take it from there.
        */
        $scope.$on( 'openChange', function() {

            var open = relationInputController.isOpen();
            if( open ) {
                console.log( 'RelationInputSuggestionsController: Is open; focus input.' );
                $timeout( function() {
                    var input = element.find( 'input' );
                    input.focus();
                    console.log( 'RelationInputSuggestionsController: Focussed input %o.', input );
                }, 100);
            }

        } );

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
            tpl.find( 'a' ).append( resultTpl );
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


            // No search query was entered, but emptyQueryResults was set before: No need to make a call,
            // just display the results for empty queries gotten on init.
            if( !query && $scope.emptyQueryResults ) {
                $scope.$apply(function(){
                    // Clone data (we don't want emptyQueryResults to be changed whenever data changes)
                    $scope.results = $scope.emptyQueryResults.slice( 0 );
                    self.filterResults();
                });

                return;

            }



            $scope.loading = true;


            // COMPOSE HEADER FIELDS
            var headers		= {
                range		: '0-' + relationInputController.resultCount
                }
                , filters = relationInputController.filters ? relationInputController.filters.slice(0) : [];

            // Filter header
            if( query ) {

                var   filterField		= relationInputController.searchField
                      // The ';;' prefix is an unicode hack to prevent the server from stripping stuff
                    , baseFilter		= ';;' + filterField + '=like(\'' + encodeURIComponent( query + '%' ) + '\')';

                filters.unshift(baseFilter);
            }

            if(filters.length) headers.filter = filters.join(', ');

            // Select header
            var selectFields			= self.getSelectFields();
            if( selectFields && selectFields.length ) {
                headers.select			=  selectFields.join( ',' );
            }

            console.log( 'RelationInput: query %o, request %s, headers %o', query, relationInputController.entityUrl, headers );



            // MAKE REQUEST
            APIWrapperService.request( {
                url				: '/' + relationInputController.entityUrl
                , method		: 'GET'
                , headers		: headers
            } )
            .then( function( data ) {

                $scope.loading	= false;
                $scope.results = data;
                self.filterResults();

                if( !query ) {
                    $scope.emptyQueryResults = data;
                }

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
        * Then updates selected (i.e. the currently hovered entry – as it may have been removed)
        */
        self.filterResults = function() {

            var selected = relationInputController.entities;

            var removedCount = 0;

            if( relationInputController.isMultiSelect && angular.isArray( selected ) && angular.isArray( $scope.results ) ) {

                for( var i = 0; i < selected.length; i++ ) {
                    for( var j = $scope.results.length - 1; j >= 0; j-- ) {

                        // id missing
                        if( !$scope.results[ j ].id || !selected[ i ].id ) {
                            continue;
                        }

                        if( $scope.results[ j ].id === selected[ i ].id ) {
                            $scope.results.splice( j, 1 );
                            removedCount++;
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

            console.log( 'RelationInput: filterResults; results is %o, selected %o. Removed %o elements from $scope.results (%o entities selected)', $scope.results, $scope.selected, removedCount, ( relationInputController.entities ? relationInputController.entities.length : 'none' ) );

        };





    } ] )

    .directive( 'relationInputSelectedEntities', [ function() {
        return {
            link			: function( scope, element, attrs, ctrl ) {
                ctrl[ 0 ].init( element, ctrl[ 1 ] );
            }
            , controller	: 'RelationInputSelectedEntitiesController'
            , require		: [ 'relationInputSelectedEntities', '^relationInput' ]
            , templateUrl	: 'relationInputSelectedEntitiesTemplate.html'
            , scope         : true
        };
    } ] )


    .controller( 'RelationInputSelectedEntitiesController'
        , [
              '$scope'
            , '$state'
            , '$templateCache'
            , '$compile'
            , function( $scope, $state, $templateCache, $compile ) {

        var self = this
            , element
            , relationInputController;


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

            // replace [[ name ]] with {{ result.name }}
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
         *
         * todo: disable the listeners in the controller if the required permissions are not present
        */
        self.setupEventListeners = function() {
            // Focus on (hidden) input: Show suggestions
            element.find( 'input' ).focus( function() {
                console.log( 'RelationInputSelectedEntitiesController: (Hidden) input focussed.' );
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

                console.log( 'RelationInputService: Get fields from %o, return %o', template, selectFields );

                return selectFields;

            }


        };


    } ] )


    .run( [ '$templateCache', function( $templateCache ) {


        $templateCache.put( 'relationInputTemplate.html',
            '<div>' + // Only content is taken. Do not add any classes or something to this div.
                '<div class=\'dropdown\'>' +
                    '<div data-relation-input-selected-entities></div>' +
                    '<div data-relation-input-suggestions></div>' +
                    // Add new entity
                    '<div clearfix data-ng-if="relationInput.relatedEntityCanBeCreated()">' +
                        '<a tabindex=\'-1\' class=\'add-entity\' ng-href="#" ng-click="visitEntity($event)"><span class=\'fa fa-plus\'></span> New</a>' +
                    '</div>' +
                '</div>' +
            '</div>'
        );

        $templateCache.put( 'relationInputSelectedEntitiesTemplate.html',
            '<div class="selected-entities" data-ng-class=\'{ "single-select": !isMultiSelect, "disabled": !relationInput.relationCanBeCreated() }\'>' +
                '<input type="text"/>' + // catch [tab]
                '<ul>' +
                    // use result for the loop as in the suggestion directive so that we may use the same template
                    '<li data-ng-repeat="result in relationInput.entities">' +
                        '<span><!-- see renderTemplate() --></span>' +
                        // Edit
                        '<button type="button" data-ng-if="relationInput.relatedEntityCanBeEdited()" data-ng-click="visitEntity($event, result)" class="badge"><span class="fa fa-pencil"></span></button>' +
                        // Delete
                        '<button type="button" data-ng-if="relationInput.relationCanBeRemoved()" data-ng-click="removeEntity($event,result)">&times;</button>' +
                    '</li>' +
                '</ul>' +
                '<span class="caret"></span>' +
            '</div>'
        );


        /**
         * todo: make the debounce configurable
         */
        $templateCache.put( 'relationInputSuggestionsTemplate.html',
            // display:inherit: overwrite bootstrap's .dropdown-menu
            '<div class="entity-suggestions dropdown-menu" style="display:inherit;" data-ng-show="isOpen() && relationInput.relationCanBeCreated()"> ' +
                '<input type="text" class="form-control" data-ng-model="searchQuery.value" data-ng-model-options=\'{ "debounce" : 200 }\'/>' +
                '<div class=\'progress progress-striped active\' data-ng-if=\'loading\'>' +
                    '<div class=\'progress-bar\' role=\'progressbar\' style=\'width:100%\'></div>' +
                '</div>' +
                '<div class=\'results-list\'>' +
                    '<ul data-ng-if=\'results.length > 0\'>' +
                        '<li data-ng-repeat=\'result in results\'><a href=\'#\' data-ng-class=\'{selected:selected===result}\' data-ng-click=\'selectResult(result, $event)\'><!-- see renderTemplate --></a></li>' +
                    '</ul>' +
                '</div>' +
            '</div>'
        );

    } ] );

}() );