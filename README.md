# jb-relation-input

Typeahead component to manage `distributed` relations. It is used to link a root entity to related entities.

Use like:

```html
<div data-relation-input
        
    data-ng-model="movieList.movieFilterList.city"
        
    data-relation-entity-endpoint="city"            
    data-relation-suggestion-template="LI: [[ zip ]] [[ name ]]"
    data-relation-search-field="name"
    
    data-relation-is-deletable="true"
    data-relation-is-creatable="true"
    
    data-relation-result-count="20"
    
    data-relation-is-multi-select="false"
    data-relation-is-interactive="false"
    data-relation-disable-edit-button="false"
    data-relation-disable-new-button="false"
    data-relation-disable-remove-button="false"
    data-relation-is-readonly="false" >
</div>
```

## parameters

### ng-model

Two way binding to a collection of entities which are rendered int to the typeahead.

### relation-entity-endpoint

In `distributed`, the name of an entity per default has its own api endpoint where we will try to load data.

### relation-suggestion-template

A template which will be evaluated by the component to extract the necessary fields of an entity. Basically the template just
allows you to write an angular expression where the view binding/interpolation is specified  as `[[ expression ]]` instead of
`{{}}` to prevent angular from interpreting the string. So a suggestion template specified as `[[ id | asNumber ]] - [[ profile.lastname ]]`
will be rendered to `{{ id | asNumber }}` before compilation and results in a select header `Select: id, profile.lastname`.

### relation-search-field

The search field specifies which filter header the component sends to the api i.e. `relation-search-field="name"` results
in a header `Filter: ;;name=like("searcTerm%")`. We currently only support single fields since `distributed` has not yet
got or combinators to link select fields.

### relation-is-deletable

A boolean which specifies if one should be able to delete entries in the collection (removes button).

### relation-is-creatable

A boolean which specifies if one is able to add new entries (removes full search and select behavior)

### relation-result-count

An integer stating how much results should be loaded in every request.

### relation-is-multi-select

A boolean specifying if the component should behave as a select field or as a tag-cloud.

### relation-is-interactive

This is a legacy parameter. If interactivity is set to false, then the create related entity and modify related entity is
removed from the view (same as disabling the new and edit button).

### relation-disable-edit-button

Disables the button which allows the user to modify the related entity (this is a behavior specific to the backoffice
and should be removed or at least be configurable). This button is only shown if the user has the correct permissions 
to edit an existing entity (as specified by the `OPTIONS` call to the endpoint).

### relation-disable-new-button

Disables the button which allows the user to create a new instance of the related entity. This button is only shown if
the user has the correct permissions to create a new entity (as specified by the `OPTIONS` call to the endpoint).

### relation-disable-remove-button

Disables the button which allows the user to remove an element from the component. Since this depends on the root entity
the current entity is related to, this cannot be resolved from within the component.

### relation-is-readonly

Disables all the interactions of the component and is for presentation mode (or if the current user does not have any rights
to modify the data).


Please have a look at the bindings to see their types and the requirement to set them.
```Javascript
scope				: {
      entities              : '=ngModel'
    , entityUrl             : '@relationEntityEndpoint'
    , searchResultTemplate  : '@relationSuggestionTemplate'
    , searchField           : '@relationSearchField'

    , filters               : '<?relationFilter'
    , deletable             : '<?relationIsDeletable'
    , creatable             : '<?relationIsCreatable'

    , resultCount           : '<?relationResultCount'

    , isMultiSelect         : '<relationIsMultiSelect'
    
    , isInteractive         : '<?relationIsInteractive'
    , disableEdit           : '<?relationDisableEditButton'
    , disableNew            : '<?relationDisableNewButton'
    , disableRemove         : '<?relationDisableRemoveButton'

    , isReadonly            : '<?relationIsReadonly'
}
```

