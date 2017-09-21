function createFancyScroll( class_name ) {
    $( '.' + class_name ).mCustomScrollbar({
            theme:"minimal"
        });
    $( '.' + class_name + ' .mCSB_dragger_bar' ).css( 'background-color', 'black' );
}

var HeaderView = Backbone.View.extend ({
    el: ".main-container",

    initialize: function() {
       this.headerText = "RNA-RNA Interactions";
       this.render();
    },

    events: {
        'click .rna-header': 'headerClick'
    },

    headerClick: function( e ) {
        e.preventDefault();
        window.location.reload();
    },
    
    render: function() {
       var self = this;
       self.$el.append( self._templateHeader() );
    },

    _templateHeader: function() {
        return '<div class="container">' +
                   '<div class="row rna-header-row">' +
                       '<div class="col-sm-12 rna-header">' +
                           '<h3>'+ this.headerText +'</h3>' +
                       '</div>' +
                    '</div>' +
                '</div>';
    }
});

var AllSamplesView = Backbone.View.extend ({
    el: ".main-container",

    initialize: function() {
       this.host = window.location.hostname;
       this.port = window.location.port;
       this.overlay = this.$( '.loader' );
       this.render();
    },

    events: {
        'click .sample-summary': 'makeSummary',
        'click .file-sample': 'getSampleInteractions',
        'click .check-all-samples': 'selectAllSamples'
    },

    selectAllSamples: function( e ) {
        var self = this,
            $el_sample_checkboxes = self.$( '.file-sample-checkbox' ),
            checked_status = e.target.checked;
        _.each( $el_sample_checkboxes, function( item ) {
            item.checked = checked_status ? true : false;
        });
    },

    setToDefaults: function() {
        var self = this,
            $el_sample_cheboxes = self.$( '.file-sample-checkbox' );
        self.$( '.check-all-samples' )[ 0 ].checked = false;
        self.$( '#samples-plot' ).empty();
        _.each( $el_sample_cheboxes, function( item ) {
            item.checked = false;
        });
    },

    /** Fetch all the samples */
    getSamples: function() {
        var self = this,
            url = "http://" + self.host + ":" + self.port + "/?multisamples=true",
            $el_samples_loader = self.$( '.samples-loader' );
        self.overlay.show();
        $el_samples_loader.show();
        $.get( url, function( samples ) {
            samples = samples.split( "\n" );
            self.createSamplesList( samples );
            self.overlay.hide();
            $el_samples_loader.hide();
            self.$( '.sample-ids' ).show();
        });
    },

    /** Make list of all samples */
    createSamplesList: function( samples ) {
        var template = "",
            self = this,
            $el_samples = self.$( '.sample-ids' );
        _.each( samples, function( sample ) {
            template = template + self._templateSample( sample.trim() );
        });
        $el_samples.html( template );
        // add fancy scroll bar
        createFancyScroll( 'sample-ids' );
        self.$( '.multi-samples' ).show();
        self.$( '.one-sample' ).hide();
    },

    /** Show summary for selected samples and plot a heatmap */
    makeSummary: function() {
        var self = this,
            checked_ids = "",
            checkboxes = self.$( '.file-sample-checkbox' ),
            url = "",
            plot_title = "Common interactions among samples";
        _.each( checkboxes, function( item ) {
            if( item.checked ) {
                checked_ids = ( checked_ids === "" ) ? item.id : checked_ids + ',' + item.id;
            }
        });
        if( checked_ids && checked_ids.length > 0 ) {
            var ids = checked_ids.split( "," ),
                ids_length = ids.length,
                $el_matrix_loader = self.$( '.matrix-loader' );
            if ( ids.length > 0) {
                self.$( '#samples-plot' ).hide();
                self.overlay.show();
                $el_matrix_loader.show();
                var url = "http://" + self.host + ":" + self.port + "/?sample_ids=" + checked_ids;
                $.get( url, function( samples ) {
                    samples = samples.split( "\n" ).map( Number );
                    var matrix = [],
                        samples_length = samples.length;
                    for( var ctr = 0; ctr < samples_length; ctr = ctr + ids_length ) {
                        matrix.push( samples.slice( ctr, ctr + ids_length ) );
                    }
                    var data = [
                      {
                        z: matrix,
                        x: ids,
                        y: ids,
                        type: 'heatmap'   
                      }
                    ];
                    var layout = {
                      height: 500,
                      width: 700,
                      title: plot_title
                    };
                    Plotly.newPlot( 'samples-plot', data, layout );
                    self.overlay.hide();
                    $el_matrix_loader.hide();
                    self.$( '#samples-plot' ).show();
                });
            }
        }
    },
 
    getSampleInteractions: function( e ) {
        var self = this,
            options = { 'sampleName': e.target.id },
            interactionsView = null;
        self.$( '.multi-samples' ).hide();
        interactionsView = new InteractionsView( options );
    },
    
    render: function() {
       this.$el.append( this._templateAllSamples() );
       this.getSamples();
    },

    _templateAllSamples: function() {
        return '<div class="container multi-samples">' +
                   '<div class="row samples">' +
                       '<div class="col-sm-2 samples-container">' +
                           '<div class="samples-loader"> loading samples... </div>' +
                           '<div class="sample-ids">' +
                           '</div>' +
                        '</div>' +
                        '<div class="col-sm-10">' +
                            '<div class="matrix-loader">' +
                                '<div> Loading results. Please wait. It might take a few minutes... </div>' +
                            '</div>' +
                            '<div id="samples-plot"></div>' +
                        '</div>' +
                   '</div>' +
                   '<div class="row">' +
                       '<div class="col-sm-5">' +
                           '<input id="check_all" type="checkbox" class="check-all-samples" value="false" title="Check all" />' +
                           '<span>Check all</span>' +
                           '<button type="button" class="sample-summary btn btn-primary btn-rna" title="Summary"> Summary </button>' +
                       '</div>' +
                       '<div class="col-sm-7"></div>' +
                   '</div>' +
               '</div>';
    },
 
    /**Make template for the list of samples */
    _templateSample: function( sample ) {
        return '<div class="sample">' +
                   '<input class="file-sample-checkbox" type="checkbox" id="'+ sample + '"' +
                       'value="" title="Check one or more and click on summary." />' +
                    '<span id="'+ sample + '" class="file-sample"' +
                       'title="Click to see all interactions for this sample">' + sample + '</span></div>';
    }
});

var InteractionsView = Backbone.View.extend ({
    el: ".main-container",

    initialize: function( options ) {
       this.host = window.location.hostname;
       this.port = window.location.port;
       this.minQueryLength = 3;
       this.modelHeaders = [];
       this.model = [];
       this.sampleName = options.sampleName;
       this.toShow = 1000;
       this.overlay = this.$( '.loader' );
       this.render( options );
    },

    events: {
        'click .rna-summary': 'getInteractionsSummary',
        'click .back-samples': 'backToAllSamples',
        'click .check-all-interactions': 'checkAllInteractions'
    },
    
    render: function( options ) {
       var self = this;
       self.$( '.one-sample' ).remove();
       self.$el.append( self._templateInteractions( options ) );
       self.$( '.one-sample' ).show();
       self.registerPageEvents();
       self.showInteractions( "" );
    },

    /** Register events for the page elements */
    registerPageEvents: function() {
        var self = this,
            $el_search_gene = self.$( '.search-gene' ),
            $el_sort = self.$( '.rna-sort' ),
            $el_filter = self.$( '.rna-filter' ),
            $el_filter_val = self.$( '.filter-value' ),
            $el_export = self.$( '.export-results' ),
            $el_reset_filters = self.$( '.reset-filters' );

        // search query event
        $el_search_gene.off( 'keyup' ).on( 'keyup', function( e ) {
            self.searchGene( e );
        });

        // onchange for sort
        $el_sort.off( 'change' ).on( 'change', function( e ) {
            self.sortInteractions( e );
        });

        // onchange for filter
        $el_filter.off( 'change' ).on( 'change', function( e ) {
            self.filterInteractions( e );
        });

        // fetch records using filter's value
        $el_filter_val.off( 'keyup' ).on( 'keyup', function( e ) {
            self.setFilterValue( e );
        });

        // export samples in the workspace
        $el_export.off( 'click' ).on( 'click', function( e ) {
            self.exportInteractions( e );
        });

        $el_reset_filters.off( 'click' ).on( 'click', function( e ) {
            self.resetFilters( e );
        });
    },

    searchGene: function( e ) {
        e.preventDefault();
        var query = e.target.value,
            self = this;
        if( query.length >= self.minQueryLength ) {
            if( e.which === 13 ) {
                self.showInteractions( query );
            }
        }
        else {
            return false;
        }
    },

    sortInteractions: function( e ) {
        var self = this;
        e.preventDefault();
        self.showInteractions( "" );
    },

    filterInteractions: function( e ) {
        e.preventDefault();
        var self = this,
            value = e.target.value,
            $el_filter_operator = self.$( '.filter-operator' );
        // if the selected filter is 'score', show the selectbox for operators
        value === "score" ? $el_filter_operator.show() : $el_filter_operator.hide();
    },

    setFilterValue: function( e ) {
        e.preventDefault();
        var self = this,
            query = e.target.value,
            filterType = "",
            filterOperator = "",
            $el_filter = self.$( '.rna-filter' ),
            $el_filter_operator = self.$( '.filter-operator' );
        if( e.which === 13 ) { // search on enter click
            filterType = $el_filter.find( ":selected" ).val();
            filterOperator = $el_filter_operator.find( ":selected" ).val();
            if ( filterType === "-1" || query === "" ) {
                return;
            }
            var url = "http://" + self.host + ":" + self.port + "/?sample_name="+ self.sampleName +
                "&filter_type=" + filterType + "&filter_op=" + filterOperator + "&filter_value=" + query;
            self.showInteractions( "", url );
        }
    },

    /** Plot pie charts for interactions chosen for summary */
    plotPieChart: function( dict, container, name ) {
        var layout = {
            height:400,
            width: 500,
            title: name
        },
        labels = [],
        values = [];

        for( var item in dict ) {
            labels.push( item );
            values.push( dict[ item ] ); 
        }

        var data = [{
            values: values,
            labels: labels,
            type: 'pie'
        }];
        Plotly.newPlot( container, data, layout );
    },

    plotHistogram: function( data, container, name ) {
	var trace = {
	    x: data,
	    type: 'histogram',
        }, 
        layout = {
            height:400,
            width: 500,
            title: name
        }; 
        var plot_data = [ trace ];
	Plotly.newPlot( container, plot_data, layout );
    },

    getInteractionsSummary: function( e ) {
        e.preventDefault();
        var self = this,
            checked_ids = "",
            checkboxes = self.$( '.rna-interaction' ),
            summary_items = [],
            model_length = self.model.length,
            summary_result_type2 = {},
            summary_result_score = [],
            summary_result_score1 = [],
            summary_result_score2 = [];
        _.each( checkboxes, function( item ) {
            if( item.checked ) {
                checked_ids = ( checked_ids === "" ) ? item.id : checked_ids + ',' + item.id;
            }
        });
        checked_ids = checked_ids.split( "," );
        if( checked_ids && checked_ids[ 0 ] === "" ) {
            self.fetchSummaryAllInteractions();
        }
        else {
            for( var ctr_ids = 0; ctr_ids < checked_ids.length; ctr_ids++ ) {
                for( var ctr = 0; ctr < model_length; ctr++ ) {
                    var item = self.model[ ctr ];
                    if ( checked_ids[ ctr_ids ] === item[ 0 ] ) {
                        summary_items.push( item );
                        break;
                    }
                }
            }
            // summary fields - geneid (1 and 2) and type (1 and 2)
            for ( var i = 0; i < summary_items.length; i++ ) {
                summary_result_type2[ summary_items[ i ][ 9 ] ] = ( summary_result_type2[ summary_items[ i ][ 9 ] ] || 0 ) + 1;
                summary_result_score1.push( summary_items[ i ][ 16 ] );
                summary_result_score2.push( summary_items[ i ][ 17 ] );
                summary_result_score.push( summary_items[ i ][ 18 ] );
            }
            
            var plottingData = {
                'family_names_count': summary_result_type2,
                'score': summary_result_score,
                'score1': summary_result_score1,
                'score2': summary_result_score2
            };
            self.cleanSummary();
            self.plotInteractions( plottingData );
        }
    },

    plotInteractions: function( data ) {
        var self = this;
        // build scrolls
        createFancyScroll( "first-gene" );
        createFancyScroll( "second-gene" );
        // plot the summary as pie charts and histograms
        self.plotHistogram( data.score, "rna-type1", 'Score distribution for ' + self.sampleName );
        self.plotPieChart( data.family_names_count, "rna-type2", 'Gene2 RNA family distribution for ' + self.sampleName );
        self.plotHistogram( data.score1, "rna-score1", 'Score1 distribution for ' + self.sampleName );
        self.plotHistogram( data.score2, "rna-score2", 'Score2 distribution for ' + self.sampleName );
    },

    fetchSummaryAllInteractions: function() {
        var self = this,
            url = "http://" + self.host + ":" + self.port + "/?plot_sample_name="+ self.sampleName;
        self.cleanSummary();
        self.$( '#rna-type1' ).append( "<p class='plot-loader'>loading plots. Please wait...</p>" );
        self.$( '#rna-type2' ).append( "<p class='plot-loader'>loading plots. Please wait...</p>" );
        self.overlay.show();
        $.get( url, function( data ) {
            data = data.split( "\n" );
            var plotData = {
                family_names_count: JSON.parse( data[ 0 ] ),
                score: JSON.parse( data[ 1 ] ),
                score1: JSON.parse( data[ 2 ] ),
                score2: JSON.parse( data[ 3 ] ),
            };
            self.plotInteractions( plotData );
            self.overlay.hide();
            self.$( '.plot-loader' ).remove();
        });
    },

    backToAllSamples: function( e ) {
        e.preventDefault();
        this.$( '.one-sample' ).hide();
        this.$( '.multi-samples' ).show();
        allSamplesView.setToDefaults();
    },

    checkAllInteractions: function( e ) {
        var $el_interactions_checked = this.$( '.rna-interaction' ),
            checkall_status = e.target.checked;
        _.each( $el_interactions_checked, function( item ) {
            item.checked = checkall_status ? true : false;
        });
    },

    /** Export as tab separated file */
    exportInteractions: function( e ) {
        e.preventDefault();
        var tsv_data = "",
            link = document.createElement( 'a' ),
            file_name = Date.now().toString( 16 ) + '_results.tsv',
            self = this;
        // add headers to the tsv file
        tsv_data = self.modelHeaders.join( "\t" ) + "\n";
        _.each( self.model, function( item ) {
            tsv_data = tsv_data + item.join( "\t" ) + "\n";
        });
        tsv_data = window.encodeURIComponent( tsv_data );
        link.setAttribute( 'href', 'data:application/octet-stream,' + tsv_data );
        link.setAttribute( 'download', file_name );
        document.body.appendChild( link );
        link_click = link.click();
    },

    resetFilters: function( e ) {
        e.preventDefault();
        this.setToDefaults();
        this.showInteractions( "" );
    },

    showInteractions: function( search_by, url_text ) {
        var self = this,
            url = url_text ? url_text : "http://" + self.host + ":" + self.port +
                "/?sample_name="+ self.sampleName +"&search=" + search_by,
            $el_loading = self.$( ".interactions-loader" ),
            $el_transcriptions_ids_parent = self.$( '.rna-transcriptions-container' );
        
        self.$( '.transcriptions-ids' ).remove();
        // reset the elements
        self.cleanSummary();
        self.$( '.check-all-interactions' )[ 0 ].checked = false;
        self.$( ".sample-current-size" ).empty();
        $el_loading.show();
        self.overlay.show();
        // pull all the data
	$.get( url, function( result ) {
            $el_transcriptions_ids_parent.append( '<div class="transcriptions-ids"></div>' );
            if( result.length > 0 ) {
                var records = result.split( "\n" ),
                    rna_records = [];
                // create template for all pairs
                _.each(records, function( record ) {
                    rna_records.push( JSON.parse( record ) );
                });
                // extract headers or column names
                self.modelHeaders = rna_records[ 0 ];
                // save only the data records
                self.model = rna_records.slice( 1, );
                self.buildLeftPanel( self.model );
            }
            else {
                self.$( '.transcriptions-ids' ).html( "<div> No results found. </div>" );
                self.$( '.transcriptions-ids' ).show();
            }
            self.overlay.hide();
            $el_loading.hide();
	});
    },

    /** Build the left panel */ 
    buildLeftPanel: function( records ) {
        var template = "",
            self = this,
            $el_transcriptions_ids = self.$( '.transcriptions-ids' ),
            records_size_text = "";
 
        // show how many records being shown
        if( records.length >= self.toShow ) {
            records_size_text = "Showing <b>" + self.toShow + "</b> interactions of <b>" + records.length + "</b>";
        }
        else {
            records_size_text = "Showing only <b>" + records.length + " </b>interactions";
        }
        self.$( ".sample-current-size" ).empty().html( records_size_text );

        // take only the data records and not headers
        records = records.slice( 0, self.toShow );
        _.each( records, function( record ) {
            template = template + self._templateRNAInteractions( record );
        });
        $el_transcriptions_ids.html( template );
        createFancyScroll( 'transcriptions-ids' );
        $el_transcriptions_ids.show();
        self.registerInteractionsEvents( self );
    },

    registerInteractionsEvents: function( _self ) {
        var self = _self,
            $el_rna_pair = self.$( '.rna-pair' ),
            $el_rna_interaction = self.$( '.rna-pair-interaction' );

        // highlight the transaction pair
        $el_rna_pair.off( 'mouseenter' ).on( 'mouseenter', function() {
            $( this ).addClass( 'pair-mouseenter' );
        });

        // remove the highlighted background on focus remove
        $el_rna_pair.off( 'mouseleave' ).on( 'mouseleave', function() {
            $( this ).removeClass( 'pair-mouseenter' );
        });

        // fire when one interaction is selected
        $el_rna_interaction.off( 'click' ).on( 'click', function( e ) {
            var interaction_id = e.target.parentNode.children[0].id,
                records = self.model;
            for( var ctr = 0, len = records.length; ctr < len; ctr++ ) {
                var item = records[ ctr ];
                if( item[ 0 ] === interaction_id ) {
                    self.buildInformation( item );
                    break;
                }
            }
        });
    },

    /** Make information list of the selected interaction */
    buildInformation: function( item ) {
        var self = this,
            $el_first_gene = self.$( "#rna-type1" ),
            $el_second_gene = self.$( "#rna-type2" ),
            template_gene1 = "",
            template_gene2 = "";
        self.cleanSummary();
        $el_first_gene.append( self._templateInformation( item, "info-gene1", 0 ) );
        $el_second_gene.append( self._templateInformation( item, "info-gene2", 1 ) );
    },

    setToDefaults: function() {
        var self = this;
        self.$( '.search-gene' )[ 0 ].value = "";
        self.$( '.rna-sort' ).val( "score" );
        self.$( '.rna-filter' ).val( "-1" );
        self.$( '.filter-operator' ).hide();
        self.$( '.filter-operator' ).val( "-1" );
        self.$( '.filter-value' )[ 0 ].value = "";
        self.$( '.check-all-interactions' )[ 0 ].checked = false;
        self.cleanSummary();
    },

    cleanSummary: function() {
        var self = this;
        self.$( "#rna-type1" ).empty();
        self.$( "#rna-type2" ).empty();
        self.$( "#rna-score1" ).empty();
        self.$( "#rna-score2" ).empty();
    },

    _templateInteractions: function( options ) {
        return '<div class="container one-sample">' +
                   '<div class="row">' +
                       '<div class="col-sm-2 elem-width">' +
                           '<div class="sample-name">' + options.sampleName +'</div>' +
                           '<div class="sample-current-size"></div>' +
                       '</div>' +
                       '<div class="col-sm-2 elem-width">' +
                           '<input type="text" class="search-gene elem-width form-control" value="" placeholder="Search..." title="Search">' +
                       '</div>' +
                       '<div class="col-sm-2 elem-width">' +
                           '<select name="sort" class="rna-sort elem-width form-control" title="Sort">' +
                               '<option value="">Sort by...</option>' +
	                       '<option value="score" selected>Score</option>' +
                           '</select>' +
                       '</div>' +
                       '<div class="col-sm-6 elem-width">' +
	                   '<select name="filter" class="rna-filter form-control" title="Filter">' +
		               '<option value="-1">Filter by...</option>' +
		               '<option value="score">Score</option>' +
		               '<option value="family">RNA Family</option>' +
	                   '</select>' +
                           '<select name="filter-operator" class="filter-operator form-control" title="Filter operator">' +
        	               '<option value="-1">Choose operator...</option>' +
	                       '<option value="equal">=</option>' +
	                       '<option value="greaterthan">></option>' +
                               '<option value="lessthan"><</option>' +
                               '<option value="lessthanequal"><=</option>' +
                               '<option value="greaterthanequal">>=</option>' +
                               '<option value="notequalto"><></option>' +
                           '</select>' +
                         '<input type="text" class="filter-value form-control" title="Enter the selected filter value"' +
                             'value="" placeholder="Enter the selected filters value..." />' +
                       '</div>' +
                   '</div>' +
                   '<div class="row rna-results">' +
                       '<div class="col-sm-2 rna-transcriptions-container">' +
                           '<div class="interactions-loader"> loading interactions... </div>' +
                           '<div class="transcriptions-ids"></div>' +
                       '</div>' +
                       '<div class="col-sm-5 first-gene">' +
                           '<div id="rna-type1"></div>' +
                           '<div id="rna-score1"></div>' +
                       '</div>' +
                       '<div class="col-sm-5 second-gene">' +
                           '<div id="rna-type2"></div>' +
                           '<div id="rna-score2"></div>' +
                       '</div>' +
                   '</div>' +
                   '<div class="row">' +
                       '<div class="col-sm-10">' +
                           '<input id="check_all_interactions" type="checkbox" class="check-all-interactions"' +
                               'value="false" title="Check all" />' +
                           '<span>Check all</span>' +
		           '<button type="button" class="rna-summary btn btn-primary btn-rna btn-interaction" title="Get summary of RNA-RNA interactions">' +
			       'Summary' +
		           '</button>' +
		           '<button type="button" class="export-results btn btn-primary btn-rna btn-interaction"' +
                               'title="Export results as tab-separated file">' +
			       'Export' +
		           '</button>' +
		           '<button type="button" class="reset-filters btn btn-primary btn-rna btn-interaction"' +
                                  'title="Reset all the filters and reload original interactions">' +
			      'Reset filters' +
		           '</button>' +
		           '<button type="button" class="back-samples btn btn-primary btn-rna btn-interaction" title="Back to all samples">' +
			      'Back' +
		           '</button>' +
                       '</div>' +
                       '<div class="col-sm-2"></div>' +
                   '</div>' +
               '</div>';
    },
    
    /** Make template for interactions for the selected sample */
    _templateRNAInteractions: function( record ) {
        return '<div class="rna-pair"><input type="checkbox" id="'+ record[ 0 ] +'" value="" class="rna-interaction" />' +
               '<span class="rna-pair-interaction">' + record[ 2 ] + '-' + record[ 3 ]  + '</span></div>';
    },

    /** Template for showing information of the selected interaction */
    _templateInformation: function( item, id, file_pos, header_text ) {
        return '<div id="'+ id +'">' +
	           '<ul>' +
	               '<li><p>Geneid: <b>' + item[ 4 + file_pos ] + '</b></p></li>' +
	               '<li><p>Symbol: <b>' + item[ 6 + file_pos ] + '</b></p></li>' +
	               '<li><p>Type: <b>' + item[ 8 + file_pos ] + '</b></p></li>' +
	               '<li><p>Score'+ (file_pos + 1) +': <b>' + item[ 16 + file_pos ] + '</b></p></li>' +
                       '<li><p>Score: <b>' + item[ 18 ] + '</b></p></li>' +
	            '</ul>' +
	        '</div>';
    }
});

var headerView = new HeaderView();
var allSamplesView = new AllSamplesView();

