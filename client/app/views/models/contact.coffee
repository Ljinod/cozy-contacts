Filtered = BackboneProjections.Filtered

CONFIG = require('config').contact


module.exports = class ContactViewModel extends Backbone.ViewModel

    defaults:
        new:  false
        edit: false

    map:
        avatar: '_attachments'
        name:   'n'


    events:
        'before:save': 'syncDatapoints'
        save:          'onSave'
        reset:         'onReset'

    viewEvents:
        'edit:cancel':    'reset'
        'tags:update':    'updateTags'
        'tags:add':       'addNewTag'
        'form:field:add': 'onAddField'
        'form:submit':    -> @save()
        'export':         'downloadAsVCF'
        'delete':         -> @destroy()


    proxy: ['toString', 'toHighlightedString', 'match']


    initialize: ->
        @_setRef()

        @getDatapoints = _.memoize @getDatapoints, (key) ->
            if @attributes.edit then "edit-#{key}" else key

        @listenTo @, 'change:edit', (contactViewModel, edit) ->
            return unless edit
            cache = @getDatapoints.cache
            delete cache[key] for key of cache when /^edit/.test key


    toJSON: ->
        data = super
        delete data.datapoints
        data.xtras = @getDatapoints('xtras').toJSON()
        _.reduce CONFIG.datapoints.main, (memo, attr) =>
            memo[attr] = @getDatapoints(attr).toJSON()
            return memo
        , data


    getMappedAvatar: (attachments) ->
        if attachments?.picture
            return "contacts/#{@model.id}/picture.png" +
                # Force refresh on change picture with dummy parameter.
                "?revpos=#{attachments.picture.revpos}"
        else
            null


    saveMappedAvatar: ->
        attrs = {}
        avatar = @get 'avatar'
        if avatar? and not avatar.match(/contacts\/.+\/picture.png/)?
            attrs.avatar = avatar.split(',')[1]
        return attrs


    getMappedName: (n) ->
        [gn, fn, mn, pf, sf] = n.split ';'
        name =
            first: fn
            given: gn
        name.middle = mn if mn
        name.prefix = pf if pf
        name.suffix = sf if sf
        return name


    saveMappedName: ->
        name = _.clone(@get 'name')
        (attrs = {})['n'] = [
            name.given
            name.first
            name.middle
            name.prefix
            name.suffix
        ].join ';'
        return attrs


    _setRef: ->
        @set 'ref', @model.cid


    onAddField: (type) ->
        @set type, '' if type in CONFIG.xtras


    getDatapoints: (name) ->
        filter = (datapoint) ->
            if name in CONFIG.datapoints.main
                datapoint.get('name') is name
            else
                datapoint.get('name') not in CONFIG.datapoints.main

        if @attributes.edit
            models = @model.get 'datapoints'
            .filter filter
            .map (model) -> model.clone()
            new Backbone.Collection models
        else
            new Filtered @model.get('datapoints'), filter: filter


    syncDatapoints: ->
        cache      = @getDatapoints.cache
        datapoints = @model.get 'datapoints'

        models = _.reduce cache, (memo, collection, key) ->
            return memo unless /^edit/.test key
            memo.concat collection.filter (model) ->
                not _.isEmpty model.get 'value'
        , []
        datapoints.reset models


    updateTags: (tags) ->
        @model.save tags: tags


    addNewTag: (tag) ->
        app = require 'application'

        app.tags.create
            name: tag
        ,
            wait: true
            success: =>
                tags = @model.get('tags').concat tag
                @model.save tags: tags


    onSave: ->
        require('application').contacts.add @model if @get 'new'


    onReset: -> @_setRef()


    downloadAsVCF: ->
        @model.toVCF (card) =>
            blob = new Blob [card], type: "text/plain;charset=utf-8"
            saveAs blob, "#{@model.get 'fn'}.vcf"
