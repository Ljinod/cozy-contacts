module.exports = class Contact extends Backbone.Model

    idAttribute: '_id'

    urlRoot: 'contacts'

    defaults:
        n:          ';;;;'
        datapoints: []


    parse: (attrs) ->
        delete attrs[key] for key, value of attrs when value is ''

        if (url = attrs.url)
            delete attrs.url
            attrs.datapoints.unshift
                name:  'url'
                type:  'main'
                value: url

        datapoints = new Backbone.Collection()
        datapoints.comparator = 'name'
        datapoints.add attrs.datapoints if attrs.datapoints
        attrs.datapoints = datapoints

        attrs.tags = _.invoke attrs.tags, 'toLowerCase'

        return attrs


    sync: (method, model, options) ->

        if model.has 'avatar'
            avatar = model.get 'avatar'
            model.unset 'avatar'

            success = options.success
            # Call savePicture after sync.
            options.success = (data, textStatus, jqXHR) =>
                @savePicture avatar, data,
                    success: =>
                        success.apply @, arguments
                        # SavePicture (neither sync) doesn't update model,
                        # we have to fetch it to get the accurate picture infos
                        @fetch()

                    error: options.error

        # Handle specific attributes.
        options.attrs = model.toJSON()

        datapoints = model.attributes.datapoints.toJSON()
        mainUrl = _.findWhere datapoints, {name: 'url'}

        if mainUrl
            options.attrs.datapoints = _.without datapoints, mainUrl
            options.attrs.url = mainUrl.value

        super


    toString: (opts = {}) ->
        parts = @attributes.n.split ';'
        # wrap given name (at index 0) in pre/post tags if provided
        parts[0] = _.compact([opts.pre, parts[0], opts.post]).join ''
        _.compact(parts).join ' '


    match: (pattern, opts = {}) ->
        format = if opts.format
            pre: '»'
            post: '«'
        else undefined

        search = fuzzy.match pattern, @toString(format), opts

        if search and format
            search.rendered = search.rendered
                .replace '»', opts.format.pre
                .replace '«', opts.format.post

        return search


    toJSON: ->
        _.extend {}, super, datapoints: @attributes.datapoints.toJSON()


    savePicture: (dataURL, attrs, options) ->
        unless attrs.id
            return options.error new Error 'Model should have been saved once.'

        #transform into a blob
        binary = atob dataURL.split(',')[1]
        array = []
        for i in [0..binary.length]
            array.push binary.charCodeAt i

        blob = new Blob [new Uint8Array(array)], type: 'image/jpeg'

        data = new FormData()
        data.append 'picture', blob
        data.append 'contact', attrs

        $.ajax
            type: 'PUT'
            url: "contacts/#{attrs.id}/picture"
            data: data
            contentType: false
            processData: false
            success: options.success
            error: options.error

