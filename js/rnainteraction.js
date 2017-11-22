function createFancyScroll( class_name ) {
    $( '.' + class_name ).mCustomScrollbar({
            theme:"minimal",
            scrollInertia: 1,
            mouseWheel: { enable: false }
        });
    $( '.' + class_name + ' .mCSB_dragger_bar' ).css( 'background-color', 'black' );
}

function roundPrecision( number, precision ) {
    var factor = Math.pow( 10, precision ),
        numberFac = number * factor,
        roundedNum = Math.round( numberFac );
    return roundedNum / factor;
};

var HeaderView = Backbone.View.extend({
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

    /** Set all the elements to their default values */
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
            if ( ids.length > 0 ) {
                self.$( '#samples-plot' ).hide();
                self.overlay.show();
                $el_matrix_loader.show();
                var url = "http://" + self.host + ":" + self.port + "/?sample_ids=" + checked_ids;
                $.get( url, function( samples ) {
                    samples = samples.split( "\n" ).map( Number );
                    var matrix = [];
                    for( var ctr = 0, samples_length = samples.length; ctr < samples_length; ctr = ctr + ids_length ) {
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
                      width: 850,
                      xaxis: {
                          tickfont: {
                              size: 9
                          },
                      },
                      yaxis: {
                          tickangle: 45,
                          tickfont: {
                              size: 9
                          },
                      },
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
 
    /** Open the interactions view of the selected sample */
    getSampleInteractions: function( e ) {
        var self = this,
            options = { 'sampleName': e.target.id },
            interactionsView = null;
        self.$( '.multi-samples' ).hide();
        interactionsView = new InteractionsView( options );
    },
    
    /** Show all the samples */
    render: function() {
       this.$el.append( this._templateAllSamples() );
       this.getSamples();
    },

    /** Template for all samples view */
    _templateAllSamples: function() {
        return '<div class="container multi-samples">' +
                   '<div class="row samples">' +
                       '<div class="col-sm-2 samples-container">' +
                           '<div class="samples-loader"> Loading samples... </div>' +
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
       this.totalInteractions = 0;
       this.toShow = 1000;
       this.overlay = this.$( '.loader' );
       this.render( options );
    },

    events: {
        'click .back-samples': 'backToAllSamples',
        'click .check-all-interactions': 'checkAllInteractions'
    },
    
    render: function( options ) {
       var self = this;
       self.$( '.one-sample' ).remove();
       self.$el.append( self._templateInteractions( options ) );
       self.$( '.one-sample' ).show();
       self.registerPageEvents();
       self.setToDefaults();
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
            $el_reset_filters = self.$( '.reset-filters' ),
            $el_summary = self.$( '.rna-summary' );

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

        // reset the filters
        $el_reset_filters.off( 'click' ).on( 'click', function( e ) {
            self.resetFilters( e );
        });

        $el_summary.off( 'click' ).on( 'click', function( e ) {
            self.getInteractionsSummary( e );
        });
    },

    /** Callback for searching interactions */ 
    searchGene: function( e ) {
        e.preventDefault();
        var query = e.target.value,
            self = this;
        if( query.length >= self.minQueryLength ) {
            if( e.which === 13 || e.keyCode == 13 ) {
                self.showInteractions( query );
                self.setDefaultFilters();
            }
        }
        else {
            return false;
        }
    },

    /** Sort the interactions default by score in descending order */
    sortInteractions: function( e ) {
        var self = this,
            value = e.target.value,
            url = "";
        e.preventDefault();
        url = "http://" + self.host + ":" + self.port + "/?sort=true&sample_name="+ self.sampleName + "&sort_by=" + value  
        self.showInteractions( "", url );
    },

    /** Filter the interactions using filter types */
    filterInteractions: function( e ) {
        e.preventDefault();
        var self = this,
            value = e.target.value,
            $el_filter_operator = self.$( '.filter-operator' );
        // if the selected filter is 'score', show the selectbox for operators
        value === "score" ? $el_filter_operator.show() : $el_filter_operator.hide();
    },

    /** Fetch interactions using the filters */
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
            if ( filterType === "-1" || query === "" ) return;
            if ( filterType === "score" && isNaN( query ) ) return;

            var url = "http://" + self.host + ":" + self.port + "/?sample_name="+ self.sampleName +
                "&filter_type=" + filterType + "&filter_op=" + filterOperator + "&filter_value=" + query;
            self.showInteractions( "", url );
            self.$( '.search-gene' )[ 0 ].value = "";
        }
    },

    /** Plot pie chart for interactions chosen for summary */
    plotPieChart: function( dict, container, name, pieHeight ) {
        var layout = {
            height: 450,
            title: name
        },
        labels = [],
        values = [];

        _.mapObject( dict, function( value, key ) {
            labels.push( key );
            values.push( value ); 
        });

        var data = [{
            values: values,
            labels: labels,
            type: 'pie'
        }];
        Plotly.newPlot( container, data, layout );
    },

    /** Plot histogram for interactions chosen for summary */
    plotHistogram: function( data, container, name, xTitle, yTitle ) {
	var trace = {
	    x: data,
	    type: 'histogram',
        }, 
        layout = {
            height:400,
            width: 500,
            title: name,
            xaxis: {
                title: xTitle
            },
            yaxis: {
                title: yTitle
            },
        }; 
        var plot_data = [ trace ];
	Plotly.newPlot( container, plot_data, layout );
    },

    /** Plot bar for interactions chosen for summary */
    plotBar: function( data, container, name, xTitle, yTitle ) {

	var trace = [
            {
                x: data,
	        type: 'bar'
            }
        ], 
        layout = {
            height:400,
            width: 500,
            title: name,
            xaxis: {
                title: xTitle
            },
            yaxis: {
                title: yTitle
            },
        }; 
	Plotly.newPlot( container, trace, layout );
    },

    /** Switch between two sections and one section */
    showHideGeneSections: function( show ) {
        var self = this;
        if ( show ) {
            self.$( ".first-gene" ).show();
            self.$( ".second-gene" ).show();
            self.$( ".both-genes" ).hide();
        }
        else {
            self.$( ".first-gene" ).hide();
            self.$( ".second-gene" ).hide();
            self.$( ".both-genes" ).show();
        }
    },

    /** Fetch the summary data for the selected interactions */
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
            summary_result_score2 = [],
            summary_result_energy = [],
            summary_result_alignment1 = [],
            summary_result_alignment2 = [],
            summary_result_gene_expr1 = [],
            summary_result_gene_expr2 = [],
            summary_result_symbol1 = [];

        self.showHideGeneSections( true );
        _.each( checkboxes, function( item ) {
            if( item.checked ) {
                checked_ids = ( checked_ids === "" ) ? item.id : checked_ids + ',' + item.id;
            }
        });
        checked_ids = checked_ids.split( "," );
        // if there are no checked interactions, then summary is computed over
        // server for all the interactions for that sample (or filtered interactions)
        self.$( '.rna-pair' ).removeClass( 'selected-item' );
        if( checked_ids && checked_ids[ 0 ] === "" ) {
            self.fetchSummaryAllInteractions();
        }
        else {
            _.each( checked_ids, function( id ) {
                for( var ctr = 0; ctr < model_length; ctr++ ) {
                    var item = self.model[ ctr ];
                    if ( id.toString() === item[ 0 ].toString() ) {
                        summary_items.push( item );
                        break;
                    }
                }
            });

            // summary fields - geneid (1 and 2) and type (1 and 2)
            _.each( summary_items, function( item ) {

                summary_result_type2[ item[ 9 ] ] = ( summary_result_type2[ item[ 9 ] ] || 0 ) + 1;
                summary_result_score1.push( item[ 26 ] );
                summary_result_score2.push( item[ 27 ] );
                summary_result_score.push( item[ 28 ] );
                summary_result_energy.push( item[ 32 ] );
                summary_result_gene_expr1.push( item[ 24 ] );
                summary_result_gene_expr2.push( item[ 25 ] );
                summary_result_symbol1[ item[ 6 ] ] = ( summary_result_symbol1[ item[ 6 ] ] || 0 ) + 1;

                // select only unique gene ids
                var presentGene1 = _.findWhere( summary_result_alignment1, { geneid: item[ 4 ] } );
                if( !presentGene1 ) {
                    summary_result_alignment1.push({
                        startPos: item[ 10 ],
                        endPos: item[ 11 ],
                        seqLength: item[ 12 ],
                        geneid: item[ 4 ],
                        symbol: item[ 6 ]
                    });
                }
 
                var presentGene2 = _.findWhere( summary_result_alignment2, { geneid: item[ 5 ] } );
                if( !presentGene2 ) {
                    summary_result_alignment2.push({
                        startPos: item[ 13 ],
                        endPos: item[ 14 ],
                        seqLength: item[ 15 ],
                        geneid: item[ 5 ],
                        symbol: item[ 7 ]
                    });
                }
            });

            // sort the lists by symbol names
            summary_result_alignment1 = _.sortBy( summary_result_alignment1, 'symbol' );
            summary_result_alignment2 = _.sortBy( summary_result_alignment2, 'symbol' );
            
            var plottingData = {
                'family_names_count': summary_result_type2,
                'score': summary_result_score,
                'score1': summary_result_score1,
                'score2': summary_result_score2,
                'energy': summary_result_energy,
                'rnaexpr1': summary_result_gene_expr1,
                'rnaexpr2': summary_result_gene_expr2,
                'symbol1': summary_result_symbol1
            };

            plottingData.symbol1 = self.mergeFamiliesToOthers( plottingData.symbol1, summary_result_score1.length );
            plottingData.family_names_count = self.mergeFamiliesToOthers( plottingData.family_names_count, summary_result_score1.length );

            self.cleanSummary();
            var plotPromise = new Promise( function( resolve, reject ) {
                resolve( self.plotInteractions( plottingData ) );
                resolve( self.makeAlignmentSummary( summary_result_alignment1, summary_result_alignment2 ) );
            });
        }
    },

    /** Send data for summary plotting */
    plotInteractions: function( data ) {
        var self = this;
        // build scrolls
        createFancyScroll( "first-gene" );
        createFancyScroll( "second-gene" );
        // plot the summary as pie charts and histograms
        self.plotPieChart( data.symbol1, "rna-symbol1", 'Gene1 RNA family distribution for ' + self.sampleName, "800" );
        self.plotHistogram( data.score, "rna-score", 'Score distribution for ' + self.sampleName, "Score", "# Interactions" );
        self.plotPieChart( data.family_names_count, "rna-type2", 'Gene2 RNA family distribution for ' + self.sampleName );
        self.plotHistogram( data.score1, "rna-score1", 'Score1 distribution for ' + self.sampleName, "Score1", "# Interactions" );
        self.plotHistogram( data.score2, "rna-score2", 'Score2 distribution for ' + self.sampleName, "Score2", "# Interactions" );
        self.plotBar( data.energy, "rna-energy", 'Energy distribution for ' + self.sampleName, 'Energy (kcal/mol)', "# Interactions" );
        self.plotHistogram( data.rnaexpr1, "rna-expr1", 'Gene1 expression distribution for ' + self.sampleName, 'Gene1 Expression', "# Interactions" );
        self.plotHistogram( data.rnaexpr2, "rna-expr2", 'Gene2 expression distribution for ' + self.sampleName, 'Gene2 Expression', "# Interactions" );
    },

    /** Build SVG graphics  */
    buildSVGgraphics: function( alignmentCollection, geneType ) {
        var tableTemplate = "",
            scale = 100,
            heightDiff = 10,
            alignmentHeight = 30,
            svgHeight = alignmentCollection.length * alignmentHeight,
            xOffset = 10,
            yOffset = 2,
            seqLengthXPos = 200,
            symbolXPos = 300,
            symbolSearchUrl = "";

        tableTemplate = '<div><svg height="'+ svgHeight +'" width="500">';
        _.each( alignmentCollection, function( item, index ) {
            seq1Scale = item.seqLength < scale ? item.seqLength : scale;
            ratio = scale / item.seqLength,
            scaledBegin = parseInt( ratio * item.startPos ) + xOffset,
	    scaledEnd = parseInt( ratio * item.endPos ) + xOffset,
            barLength = ( item.endPos - item.startPos ),
            seqEndPos = scaledBegin + barLength + ratio * ( item.seqLength - item.endPos );
            symbolSearchUrl = 'https://www.google.com/search?q=' + ( geneType === 'gene1' ? item.symbol : item.geneid );

            tableTemplate += '<line x1="'+ xOffset +'" y1="'+ heightDiff +'" x2="'+ scaledBegin +'" y2="'+ heightDiff +'" style="stroke:black;stroke-width:2" />' +
                '<rect x="'+ scaledBegin +'" y="'+ (heightDiff - 5) +'" width="'+ barLength +'" height="10" style="fill:green" />' +
                '<line x1="'+ (scaledBegin + barLength) +'" y1="'+ heightDiff +'" x2="'+ seqEndPos +'" y2="'+ heightDiff +'" style="stroke:black;stroke-width:2" />' +
                '<text x="'+ seqLengthXPos +'" y="'+ (heightDiff + yOffset) +'" fill="black">'+ item.seqLength +'</text>' +
                '<a xlink:href="'+ symbolSearchUrl +'" target="_blank">' +
                    '<text x="'+ symbolXPos +'" y="'+ (heightDiff + yOffset) +'" fill="black">'+ item.symbol +'</text>' +
                '</a>';

             heightDiff += alignmentHeight;
        });
        tableTemplate += '</svg></div>';
        return tableTemplate;
    },

    /** Make alignment graphics summary for all checked items*/
    makeAlignmentSummary: function( alignment1, alignment2 ) {
        var self = this,
            scale = 100,
            ratio = 0,
            scaledBegin = 0,
            scaledEnd = 0,
            barLength = 0;

        self.$( '#rna-alignment-graphics1' ).empty();
        self.$( '#rna-alignment-graphics2' ).empty();
        self.$( '#rna-alignment-graphics1' ).append( "<p>Alignment positions for " + alignment1.length + " interactions on gene1<p>" );
        self.$( '#rna-alignment-graphics2' ).append( "<p>Alignment positions for " + alignment2.length + " interactions on gene2<p>" );

        var template1 = self.buildSVGgraphics( alignment1, 'gene1' )
        self.$( '#rna-alignment-graphics1' ).append( template1 );

        var template2 = self.buildSVGgraphics( alignment2, 'gene2' )
        self.$( '#rna-alignment-graphics2' ).append( template2 );
    },

    /** Fetch summary data from server */
    fetchSummaryAllInteractions: function() {
        var self = this,
            url = "",
            queryString = "",
            $el_search_gene = self.$( '.search-gene' ),
            $el_filter_type = self.$( '.rna-filter' ),
            $el_filter_operator = self.$( '.filter-operator' ),
            $el_filter_value = self.$( '.filter-value' ),
            filterType = $el_filter_type.find( ":selected" ).val();

        // take into account if the filters are active while fetching 
        // summary data and build url accordingly
        if ( $el_search_gene.val() !== "" ) {
            queryString = "&search_by=" + $el_search_gene.val();
        }
        else {
            if ( filterType !== "-1" ) {
                var filterOperator = $el_filter_operator.find( ":selected" ).val();
                var filterValue = self.$( '.filter-value' ).val();
                queryString = "&filter_type=" + filterType + "&filter_op=" + filterOperator + "&filter_value=" + filterValue;
            }
        }
        url = "http://" + self.host + ":" + self.port + "/?summary_plot=true&sample_name=" + self.sampleName + queryString;
        self.cleanSummary();
        self.showHideGeneSections( true );
        self.$( '#rna-score' ).append( "<p class='plot-loader'>Loading plots. Please wait...</p>" );
        self.$( '#rna-type2' ).append( "<p class='plot-loader'>Loading plots. Please wait...</p>" );
        self.overlay.show();
        $.get( url, function( data ) {
            data = data.split( "\n" );
            var plotData = {
                family_names_count: JSON.parse( data[ 0 ] ),
                score: JSON.parse( data[ 1 ] ),
                score1: JSON.parse( data[ 2 ] ),
                score2: JSON.parse( data[ 3 ] ),
                energy: JSON.parse( data[ 4 ] ),
                rnaexpr1: JSON.parse( data[ 5 ] ),
                rnaexpr2: JSON.parse( data[ 6 ] ),
                start1: JSON.parse( data[ 7 ] ),
                start2: JSON.parse( data[ 8 ] ),
                end1: JSON.parse( data[ 9 ] ),
                end2: JSON.parse( data[ 10 ] ),
                length1: JSON.parse( data[ 11 ] ),
                length2: JSON.parse( data[ 12 ] ),
                symbol1: JSON.parse( data[ 13 ] ),
                geneid1: JSON.parse( data[ 14 ] ),
                geneid2: JSON.parse( data[ 15 ] ),
                symbol_name1: JSON.parse( data[ 16 ] ),
                symbol_name2: JSON.parse( data[ 17 ] )
            },
                summary_result_alignment1 = [],
                summary_result_alignment2 = [],
                howMany = plotData.start1.length,
                counter = 0;

            // select only unique gene ids
            while( counter < howMany ) {
                var presentGene1 = _.findWhere( summary_result_alignment1, { geneid: plotData.geneid1[ counter ] } );
                if( !presentGene1 ) {
                    summary_result_alignment1.push({
                        startPos: plotData.start1[ counter ],
                        endPos: plotData.end1[ counter ],
                        seqLength: plotData.length1[ counter ],
                        geneid: plotData.geneid1[ counter ],
                        symbol: plotData.symbol_name1[ counter ]
                    });
                }
 
                var presentGene2 = _.findWhere( summary_result_alignment2, { geneid: plotData.geneid2[ counter ] } );
                if( !presentGene2 ) {
                    summary_result_alignment2.push({
                        startPos: plotData.start2[ counter ],
                        endPos: plotData.end2[ counter ],
                        seqLength: plotData.length2[ counter ],
                        geneid: plotData.geneid2[ counter ],
                        symbol: plotData.symbol_name2[ counter ]
                    });
                }
                counter++; 
            }

            // sort the lists by symbols names
            summary_result_alignment1 = _.sortBy( summary_result_alignment1, 'symbol' );
            summary_result_alignment2 = _.sortBy( summary_result_alignment2, 'symbol' );

            plotData.symbol1 = self.mergeFamiliesToOthers( plotData.symbol1, howMany );
            plotData.family_names_count = self.mergeFamiliesToOthers( plotData.family_names_count, howMany );

            // create a promise to bind the data to html
            var plotsPromise = new Promise( function( resolve, reject ) {
                resolve( self.plotInteractions( plotData ) );
                resolve( self.makeAlignmentSummary( summary_result_alignment1, summary_result_alignment2 ) );
            });

            // remove the loader once the data is loaded and bound
            plotsPromise.then( function() {
                self.overlay.hide();
                self.$( '.plot-loader' ).remove();
            });
        });
    },

    /**Merge the families whose counts are very small to none category */
    mergeFamiliesToOthers: function( symbolsCount, interactionsCount ) {
        var otherCategoryCount = 0,
            familiesCount = {};
        for( var item in symbolsCount ) {
            var count = symbolsCount[ item ],
                share = count / interactionsCount;
            // if the overall share of any family is less than 1%, then merge all these families to "none" category
            if( share < 0.01 ) {
                otherCategoryCount += count;
            }
            else {
                familiesCount[ item ] = count;
            }
        }
        if ( otherCategoryCount > 0 ) {
            familiesCount[ "none" ] = otherCategoryCount;
        }
        return familiesCount;
    },

    /** Back to all samples view */
    backToAllSamples: function( e ) {
        e.preventDefault();
        this.$( '.one-sample' ).hide();
        this.$( '.multi-samples' ).show();
        this.setToDefaults();
        allSamplesView.setToDefaults();
    },

    /** Select all the interactions in the left panel */
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
            self = this,
            url = "",
            queryString = "",
            $el_search_gene = self.$( '.search-gene' ),
            $el_filter_type = self.$( '.rna-filter' ),
            $el_filter_operator = self.$( '.filter-operator' ),
            $el_filter_value = self.$( '.filter-value' ),
            filterType = $el_filter_type.find( ":selected" ).val();

        self.overlay.show();
        // take into account if the filters are active while fetching 
        // summary data and build url accordingly
        if ( $el_search_gene.val() !== "" ) {
            queryString = "&search_by=" + $el_search_gene.val();
        }
        else {
            if ( filterType !== "-1" ) {
                var filterOperator = $el_filter_operator.find( ":selected" ).val();
                var filterValue = self.$( '.filter-value' ).val();
                queryString = "&filter_type=" + filterType + "&filter_op=" + filterOperator + "&filter_value=" + filterValue;
            }
        }
        url = "http://" + self.host + ":" + self.port + "/?export=true&sample_name=" + self.sampleName + queryString;
        $.get( url, function( data ) {
            var inte_records = [];
            data = data.split( "\n" );                   
            // create template for all pairs
            _.each(data, function( record ) {
                inte_records.push( JSON.parse( record ) );
            });
            // add headers to the tsv file
            tsv_data = self.modelHeaders.join( "\t" ) + "\n";
            _.each( inte_records, function( item ) {
                tsv_data = tsv_data + item.join( "\t" ) + "\n";
            });
          
            tsv_data = window.encodeURIComponent( tsv_data );
            link.setAttribute( 'href', 'data:application/octet-stream,' + tsv_data );
            link.setAttribute( 'download', file_name );
            document.body.appendChild( link );
            link_click = link.click();
            self.overlay.hide();
        });
    },

    /** Callback for the reset filter button */
    resetFilters: function( e ) {
        e.preventDefault();
        this.setToDefaults();
        this.showInteractions( "" );
    },

    /** Fetch all the interactions for the selected sample */
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
        self.model = [];
        $el_loading.show();
        self.overlay.show();
        // pull all the data
	$.get( url, function( result ) {
            $el_transcriptions_ids_parent.append( '<div class="transcriptions-ids"></div>' );
            if( result.length > 0 ) {
                var records = result.split( "\n" ),
                    rna_records = [];
                // set total interactions
                self.totalInteractions = parseInt( records[ 0 ] );
                // remove the total records item
                records = records.slice( 1, 10000000 );
                // create template for all pairs
                _.each(records, function( record ) {
                    rna_records.push( JSON.parse( record ) );
                });
                // extract headers or column names
                self.modelHeaders = rna_records[ 0 ];
                // save only the data records
                self.model = rna_records.slice( 1, 10000000 );
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

    /** Build the left panel containing interactions */ 
    buildLeftPanel: function( records ) {
        var template = "",
            self = this,
            $el_transcriptions_ids = self.$( '.transcriptions-ids' ),
            records_size_text = "";
 
        // show how many records being shown
        if( records.length >= self.toShow ) {
            records_size_text = "Showing <b>" + self.toShow + "</b> interactions of <b>" + self.totalInteractions + "</b>";
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

    /** Register events */
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
        $el_rna_pair.off( 'click' ).on( 'click', function( e ) {
            var interaction_id = "",
                records = self.model;
            if ( e.target.tagName !== "INPUT" ) {
                if( e.target.childElementCount > 0 ) {
                    interaction_id = e.target.children[ 0 ].id;
                }
                else {
                    interaction_id = e.target.parentElement.children[ 0 ].id;
                }
                $el_rna_pair.removeClass( 'selected-item' );
                for( var ctr = 0, len = records.length; ctr < len; ctr++ ) {
                    var item = records[ ctr ];
                    if( item[ 0 ].toString() === interaction_id.toString() ) {
                        self.$( this ).addClass( ' selected-item' );
                        self.buildInformation( item );
                        self.fetchGraphInformation( item );
                        break;
                    }
                }
            }
        });
    },

    /** Make information list of the selected interaction */
    buildInformation: function( item ) {
        var self = this,
            $el_both_genes = self.$( ".both-genes" ),
            energyClass = parseFloat( item[ 32 ] ) <= 0 ? "energy-negative" : "energy-positive",
            energyExpr = window.decodeURI("\u0394") + "G" + " = " + "<span class=" + energyClass + ">" + item[ 32 ] + "</span> kcal/mol",
            alignment = "",
            sequenceInfo = {},
            noAlignmentTemplate = "<span class='no-alignment'>No alignment available</span>";

        self.cleanSummary();
        $el_both_genes.empty();
        self.showHideGeneSections( false );

        sequenceInfo = {
            sequences: item[ 29 ],
            dotbrackets: item[ 30 ],
            startindices: "1&1" // sequences in the file are already carved-out
        };

        alignment = ( sequenceInfo.dotbrackets.indexOf( ")" ) === -1 ) ? noAlignmentTemplate : self.fetchAlignment( sequenceInfo );
        $el_both_genes.append( self._templateAlignment( alignment, energyExpr ) );

        $el_both_genes.append( "<div class='interaction-header'>Genes Information </div>" );
        $el_both_genes.append( self._templateInformation( item, "info-gene1", 0 ) );
        $el_both_genes.append( self._templateInformation( item, "info-gene2", 1 ) );

        createFancyScroll( "single-interactions-info" );
        self.buildAligmentGraphics( item );

        // event for downloading alignment as text file
        self.$( '.download-alignment' ).off( 'click' ).on( 'click', function( e ) {
             e.preventDefault();
             e.stopPropagation();
             self.exportAlignment();
        });
    },

    /** Fetch information about a gene's all interactions  */
    fetchGraphInformation: function( item ) {
        var self = this,
            url = "http://" + self.host + ":" + self.port + "/?graphinfo=true&geneid1=" + item[ 4 ] +
                  "&geneid2=" + item[ 5 ] + "&filename=" + self.sampleName,
            graphLoadingText = "<p class='load-graph'>loading interactions graph...</p>";
        self.$( "#interaction-graph-1" ).html( graphLoadingText );
        self.$( "#interaction-graph-2" ).html( graphLoadingText );
        $.get( url, function( data ) {
            data = data.split( '\n\n' );
            gene1Interactions = data[ 0 ].split( '\n' );
            gene2Interactions = data[ 1 ].split( '\n' );
            var gene1InteractionsUnpacked = [];
            var gene2InteractionsUnpacked = [];
            _.each( gene1Interactions, function( item ) {
                if( item !== "" ) {
                    gene1InteractionsUnpacked.push( JSON.parse( item ) );
                }
            });
            _.each( gene2Interactions, function( item ) {
                if( item !== "" ) {
                    gene2InteractionsUnpacked.push( JSON.parse( item ) );
                }
            });
            self.$( "#interaction-graph-1" ).empty();
            self.$( "#interaction-graph-2" ).empty();
            self.buildCytoscapeGraphData( gene1InteractionsUnpacked, gene2InteractionsUnpacked );
        });
    },

    /** Build data for generating cytoscape graphs */
    buildCytoscapeGraphData: function( interactions1, interactions2 ) {
        var $el_gene1 = document.getElementById( 'interaction-graph-1' ),
            $el_gene2 = document.getElementById( 'interaction-graph-2' ),
            self = this,
            gene1Nodes = [],
            gene1Edges = [],
            gene2Nodes = [],
            gene2Edges = [];

        $el_gene1.style.width = "90%";
        $el_gene1.style.height = "90%";
        $el_gene1.style.position = "relative";
        $el_gene2.style.width = "90%";
        $el_gene2.style.height = "90%";
        $el_gene2.style.position = "relative";

        var source1 = interactions1[ 0 ][ 4 ];
        gene1Nodes.push( {
            data: { id: source1 }
        });

        // alignment scores
        var scores1 = interactions1.map(function( row ) { 
                          return row[ 28 ];
                      });
        var maxScore1 = scores1.reduce(function(a, b) {
                            return Math.max(a, b);
                        });

        var scores2 = interactions2.map(function( row ) { 
                          return row[ 28 ];
                      });

        var maxScore2 = scores2.reduce(function(a, b) {
                            return Math.max(a, b);
                        });

        // gene expression
        var expression1 = interactions1.map(function( row ) { 
                          return row[ 25 ];
                      });
        var maxExpr1 = expression1.reduce(function(a, b) {
                            return Math.max(a, b);
                        });

        var expression2 = interactions2.map(function( row ) { 
                          return row[ 24 ];
                      });

        var maxExpr2 = expression2.reduce(function(a, b) {
                          return Math.max(a, b);
                      });

        _.each( interactions1, function( item ) {
            var targetGeneId = item[ 5 ];
            gene1Nodes.push( {
                data: { id: targetGeneId, weight: ( item[ 25 ] / maxExpr1 ) }
            });
            gene1Edges.push( {
                data: { source: source1, target: targetGeneId, weight: ( item[ 28 ] / maxScore1 ) }
            });
        });

        var source2 = interactions2[ 0 ][ 5 ];
        gene2Nodes.push( {
            data: { id: source2 }
        });

        _.each( interactions2, function( item ) {
            var targetGeneId = item[ 4 ];
            gene2Nodes.push( {
                data: { id: targetGeneId, weight: ( item[ 24 ] / maxExpr2 ) }
            });
            gene2Edges.push( {
                data: { source: source2, target: targetGeneId, weight: ( item[ 28 ] / maxScore2 ) }
            });
        });

        // make call to cytoscape to generate graphs
        var graphGene1 = self.makeCytoGraph( { elem: $el_gene1, nodes: gene1Nodes, edges: gene1Edges } );
        var graphGene2 = self.makeCytoGraph( { elem: $el_gene2, nodes: gene2Nodes, edges: gene2Edges } );

        // resize the graphs when window is resized
        $( window ).resize(function( e ) {
            graphGene1.resize();
            graphGene2.resize();
        });
    },

    /** Create cytoscape graph */
    makeCytoGraph: function( data ) {
        var self = this, graph = null;
        graph = cytoscape({
            container: data.elem,
            elements: {
                nodes: data.nodes,
                edges: data.edges
            },
            layout: {
                name: 'concentric'
            },
            style: [
                {
                    selector: 'node',
                    style: {
                        'content': 'data(id)',
                        'width': 'mapData(weight, 0, 1, 20, 60)',
                        'height': 'mapData(weight, 0, 1, 20, 60)',
                        'text-opacity': 1,
                        'text-valign': 'center',
                        'text-halign': 'right',
                        'background-color': '#337ab7',
                        'font-size': '9pt',
                        'font-family': '"Lucida Grande", verdana, arial, helvetica, sans-serif'
                    }
                },

                {
                    selector: 'edge',
                    style: {
                        "width": "mapData(weight, 0, 1, 1, 8)",
                        'line-color': '#9dbaea',
                        'curve-style': 'haystack',
                        'target-arrow-shape': 'triangle',
                        'font-size': '9pt',
                        'font-family': '"Lucida Grande", verdana, arial, helvetica, sans-serif'
                    }
                }
            ]
        });

        // when a node is tapped, make a search with the node's text
        graph.on( 'tap', 'node', function( ev ) {
            var query = this.id();
            self.showInteractions( query );
            self.$( ".search-gene" ).val( query );
            self.setDefaultFilters();
        });

        return graph;
    },

    /** Draw alignment using SVG */
    drawSingleSvg: function( data ) {
        var scale = data.seqLength < data.scale ? data.seqLength : data.scale,
            ratio = scale / data.seqLength,
            xOffset = 10,
            scaledBegin = parseInt( ratio * data.startPos ) + xOffset,
	    scaledEnd = parseInt( ratio * data.endPos ) + xOffset,
            heightDiff = 30,
            textYDiff = 5,
            barLength = ( data.endPos - data.startPos ),
            seqEndPos = scaledBegin + barLength + ratio * ( data.seqLength - data.endPos ),
            seqLengthTextXPos = xOffset + seqEndPos,
            template = "";
	template = '<line x1="'+ xOffset +'" y1="'+ heightDiff +'" x2="'+ scaledBegin +'" y2="'+ heightDiff +'" style="stroke:black;stroke-width:2" />' +
                '<rect x="'+ scaledBegin +'" y="'+ (heightDiff - 5) +'" width="'+ barLength +'" height="10" style="fill:green" />' +
                '<line x1="'+ (scaledBegin + barLength) +'" y1="'+ heightDiff +'" x2="'+ seqEndPos +'" y2="'+ heightDiff +'" style="stroke:black;stroke-width:2" />' +
                '<text x="'+ seqLengthTextXPos +'" y="'+ (heightDiff + textYDiff) +'" fill="black">'+ data.seqLength +'</text>';
        return template;
    },

    /** Build alignment graphics */
    buildAligmentGraphics: function( item ) {
        var self = this,
            dataGene = {};

        // first gene
        dataGene = {
            startPos: item[ 10 ],
            endPos: item[ 11 ],
            seqLength: item[ 12 ],
            scale: 100
        }
        $( "#align-pos-1" ).html( self.drawSingleSvg( dataGene ) );

        // second gene
        dataGene = {
            startPos: item[ 13 ],
            endPos: item[ 14 ],
            seqLength: item[ 15 ],
            scale: 100
        }
        $( "#align-pos-2" ).html( self.drawSingleSvg( dataGene ) );
    },

    /** Fetch alignment between two sequences */
    fetchAlignment: function( sequenceInfo ) {
        var sequences = sequenceInfo.sequences;
            dot_brackets = sequenceInfo.dotbrackets,
            start_indices = sequenceInfo.startindices,
            dotbracket1 = [],
            docbracket2 = [],
            alignment_positions = [],
            dotbracket1_length = 0,
            dotbracket2_length = 0,
            startindex1 = 0,
            startindex2 = 0,
            viz4d = null,
            alignment = null;

        sequences = sequences.split( "&" );
        dot_brackets = dot_brackets.split( "&" );
        start_indices = start_indices.split( "&" );
        dotbracket1 = dot_brackets[ 0 ].split( "" );
        dotbracket2 = dot_brackets[ 1 ].split( "" );
        dotbracket1_length = dotbracket1.length;
        dotbracket2_length = dotbracket2.length;

        // find corresponding alignment positions using dotbracket notations
        // look for corresponding opening and closing brackets in both sequences
        // having second sequence in the reverse order
        for( var dotbrac1_ctr = 0; dotbrac1_ctr < dotbracket1_length; dotbrac1_ctr++ ) {
            if ( dotbracket1[ dotbrac1_ctr ] === '(' ) {
                var align_pos = [];
                align_pos.push( dotbrac1_ctr + 1 );
                dotbracket1[ dotbrac1_ctr ] = ".";
                for( var dotbrac2_ctr = dotbracket2_length - 1; dotbrac2_ctr >= 0; dotbrac2_ctr-- ) {
                    if( dotbracket2[ dotbrac2_ctr ] === ')' ) {
                        align_pos.push( dotbrac2_ctr + 1 );
                        alignment_positions.push( align_pos );
                        dotbracket2[ dotbrac2_ctr ] = '.';
                        break;
                    }
                }
            }
        }

        // get the alignment
        viz4d = VisualizeAlignment.visualize4d( sequences[ 0 ], sequences[ 1 ], alignment_positions );
        alignment = VisualizeAlignment.repres( viz4d );
        return alignment;
    },
     
    /** Export the alignment as text file */
    exportAlignment: function() {
        var self = this,
            data = "",
            link = document.createElement( 'a' );
        data = self.$( '.pre-align' ).text();
        data = window.encodeURIComponent( data );
        link.setAttribute( 'href', 'data:application/octet-stream,' + data );
        link.setAttribute( 'download', Date.now().toString( 16 ) + '_seq_alignment.txt' );
        document.body.appendChild( link );
        link_click = link.click();
    },

    /** Set to default values */
    setToDefaults: function() {
        var self = this;
        self.$( '.search-gene' )[ 0 ].value = "";
        self.$( '.rna-sort' ).val( "score" );
        self.$( '.check-all-interactions' )[ 0 ].checked = false;
        self.setDefaultFilters();
        self.cleanSummary();
    },

    /** Set the filters to their default values */
    setDefaultFilters: function() {
        var self = this;
        self.$( '.rna-filter' ).val( "-1" );
        self.$( '.filter-operator' ).hide();
        self.$( '.filter-operator' ).val( "-1" );
        self.$( '.filter-value' )[ 0 ].value = "";
    },

    /** Clear all the plotting regions */
    cleanSummary: function() {
        var self = this;
        self.$( "#rna-score" ).empty();
        self.$( "#rna-type2" ).empty();
        self.$( "#rna-score1" ).empty();
        self.$( "#rna-score2" ).empty();
        self.$( "#rna-energy" ).empty();
        self.$( ".both-genes" ).empty();
        self.$( "#rna-alignment-graphics1" ).empty();
        self.$( "#rna-alignment-graphics2" ).empty();
        self.$( "#rna-expr1" ).empty();
        self.$( "#rna-expr2" ).empty();
        self.$( "#rna-symbol1" ).empty();
        self.$( "#interaction-graph-1" ).empty();
        self.$( "#interaction-graph-2" ).empty();
    },

    _templateInteractions: function( options ) {
        return '<div class="container one-sample">' +
                   '<div class="row">' +
                       '<div class="col-sm-2 elem-rna">' +
                           '<div class="sample-name">' + options.sampleName +'</div>' +
                           '<div class="sample-current-size"></div>' +
                       '</div>' +
                       '<div class="col-sm-2 elem-rna">' +
                           '<input type="text" class="search-gene form-control elem-rna" value="" placeholder="Search..." title="Search">' +
                       '</div>' +
                       '<div class="col-sm-2 elem-rna">' +
                           '<select name="sort" class="rna-sort elem-rna form-control elem-rna" title="Sort">' +
	                       '<option value="score">Score</option>' +
                               '<option value="energy">Energy</option>' +
                           '</select>' +
                       '</div>' +
                       '<div class="col-sm-6 elem-rna">' +
	                   '<select name="filter" class="rna-filter form-control elem-rna" title="Filter">' +
		               '<option value="-1">Filter by...</option>' +
		               '<option value="score">Score</option>' +
		               '<option value="family">RNA Family</option>' +
	                   '</select>' +
                           '<select name="filter-operator" class="filter-operator form-control elem-rna" title="Filter operator">' +
        	               '<option value="-1">Choose operator...</option>' +
	                       '<option value="equal">=</option>' +
	                       '<option value="greaterthan">></option>' +
                               '<option value="lessthan"><</option>' +
                               '<option value="lessthanequal"><=</option>' +
                               '<option value="greaterthanequal">>=</option>' +
                               '<option value="notequalto"><></option>' +
                           '</select>' +
                         '<input type="text" class="filter-value form-control elem-rna" title="Enter the selected filter value"' +
                             'value="" placeholder="Enter the selected filters value..." />' +
                       '</div>' +
                   '</div>' +
                   '<div class="row rna-results">' +
                       '<div class="col-sm-2 rna-transcriptions-container">' +
                           '<div class="interactions-loader"> Loading interactions... </div>' +
                           '<div class="transcriptions-ids"></div>' +
                       '</div>' +
                       '<div class="col-sm-10 both-genes"></div>' +
                       '<div class="col-sm-5 first-gene">' +
                           '<div id="rna-symbol1"></div>' +
                           '<div id="rna-score"></div>' +
                           '<div id="rna-score1"></div>' +
                           '<div id="rna-energy"></div>' +
                           '<div id="rna-expr1"></div>' +
                           '<div id="rna-alignment-graphics1"></div>' +
                       '</div>' +
                       '<div class="col-sm-5 second-gene">' +
                           '<div id="rna-type2"></div>' +
                           '<div id="rna-score2"></div>' +
                           '<div id="rna-expr2"></div>' +
                           '<div id="rna-alignment-graphics2"></div>' +
                       '</div>' +
                   '</div>' +
                   '<div class="row">' +
                       '<div class="col-sm-10">' +
                           '<input id="check_all_interactions" type="checkbox" class="check-all-interactions"' +
                               'value="false" title="Check 1000 interactions" />' +
                           '<span>Check all above</span>' +
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
        var svgTitle = file_pos == 1 ? "Gene aligning positions. The sequence as well as alignment length is scaled to 100 pixels" : "Gene aligning positions";
        return '<span id="'+ id +'" class="single-interactions-info">' +
	               '<p><b>Geneid</b>: ' + item[ 4 + file_pos ] + '</p>' +
	               '<p><b>Symbol</b>: ' + item[ 6 + file_pos ] + '</p>' +
	               '<p><b>Type</b>: ' + item[ 8 + file_pos ] + '</p>' +
                       '<p><b>Gene Expression </b>: ' + roundPrecision( parseFloat( item[ 24 + file_pos ] ), 1 ) + '</p>' +
	               '<p><b>Score'+ (file_pos + 1) + '</b>: ' + roundPrecision( parseFloat( item[ 26 + file_pos ] ), 1 ) + '</p>' +
                       '<p><b>Gene Aligning Positions:</b></p><svg height="50" width="300" id="align-pos-'+ (file_pos + 1) +'" title="'+ svgTitle +'"></svg>' +
                       '<p><b>Gene interactions graph:</b></p><div id=interaction-graph-'+ (file_pos + 1) +'></div>' +
	        '</span>';
    },

    /** Template for showing alignment */
    _templateAlignment: function( alignment, energyExpr ) {
        return "<div class='interaction-header'>Alignment Information <a href='#' class='download-alignment'" +
                   "title='Download the alignment as text file'>Download Alignment</a></div>" +
                        "<span class='alignment-energy' title='Gibbs free energy'>" + energyExpr + "</span>" +
                        "<div class='seq-alignment' title='Sequence alignment'><pre class='pre-align'>" + alignment + "</pre></div>";
    }
});

var headerView = new HeaderView();
var allSamplesView = new AllSamplesView();

