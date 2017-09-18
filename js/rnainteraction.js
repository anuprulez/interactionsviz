// For all samples. Load the intial view
var MultiSamples = {

    host: window.location.hostname,
    port: window.location.port,

    // make list of all samples
    build_samples_list: function( samples ) {
        var template = "",
            self = this,
            $el_samples = $( '.sample-ids' );
        _.each( samples, function( sample ) {
            sample = sample.trim();
            template = template + '<div class="sample"><input class="file-sample-checkbox" type="checkbox" id="'+ sample + '"' +
                       'value="" title="Check one or more and click on summary." />' + '<label class="file-sample" id="'+ sample + '"' +
                       'for="'+ sample +'" title="Click to see all interactions for this sample">' + sample + '</label></div>';
        });
        $el_samples.html( template );
        $( '.multi-samples' ).show();
        $( '.one-sample' ).hide();
    },

    // pull all the samples
    get_samples: function() {
        var self = this,
            url = "http://" + self.host + ":" + self.port + "/?multisamples=true";
        $( '.loading-samples' ).show();
        $.get( url, function( samples ) {
            samples = samples.split( "\n" );
            self.build_samples_list( samples );
            self.register_events();
            $( '.loading-samples' ).hide();
            $( '.sample-ids' ).show();
        });
    },

    // show summary for selected samples
    // and plot a heatmap
    make_samples_summary: function( checked_ids ) {
        var self = this;
        if( checked_ids && checked_ids.length > 0 ) {
            var ids = checked_ids.split( "," );
            if ( ids.length > 0) {
                $( '#samples-plot' ).hide();
                $( '.matrix-loading' ).show();
                $( '.samples-overlay' ).show();
                var url = "http://" + self.host + ":" + self.port + "/?sample_ids=" + checked_ids;
                $.get( url, function( samples ) {
                    samples = samples.split( "\n" ).map( Number );
                    var matrix = [],
                        samples_length = samples.length,
                        ids_length = ids.length,
                        plot_title = "Common interactions among samples";
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
                    $( '#samples-plot' ).show();
                    $( '.samples-overlay' ).hide();
                    $( '.matrix-loading' ).hide();
                });
            }
        }
    },

    // register events for summary and samples
    register_events: function() {
        var self = this, 
            $el_summary = $( '.sample-summary' ),
            $el_sample = $( '.file-sample' ),
            $el_check_all = $( '.check-all-samples' );

        // make summary for selected samples
        $el_summary.on( 'click', function( e ) {
            e.preventDefault();
            e.stopPropagation();
            var checked_ids = "",
                checkboxes = $( '.file-sample-checkbox' ),
                url = "";
            _.each( checkboxes, function( item ) {
                if( item.checked ) {
                    checked_ids = ( checked_ids === "" ) ? item.id : checked_ids + ',' + item.id;
                }
            });
            self.make_samples_summary( checked_ids.trim() );
        });

        // event for showing interactions for the selected sample
        $el_sample.on( 'click', function( e ) {
            e.preventDefault();
            e.stopPropagation();
            $( '.multi-samples' ).hide();
            $( '.one-sample' ).show();
            SampleInteractions.register_page_events();
            SampleInteractions.sample_name = $( this )[ 0 ].id;
            SampleInteractions.show_data( "" );
            SampleInteractions.set_defaults();
            $( '.sample-name' ).text( $( this )[ 0 ].id );
        });

        // event for checking/ unchecking all samples
        $el_check_all.on( 'click', function( e ) {
            var checkall_status = $( this )[ 0 ].checked,
                all_samples_checkboxes = $( '.file-sample-checkbox' );
            _.each( all_samples_checkboxes, function( item ) {
                item.checked = checkall_status ? true : false;
            });
        });
    }
};

// For the selected sample. Show all interactions
// for the selected one with search, sort and filtering features
var SampleInteractions = {

    min_query_length: 3,
    host: window.location.hostname,
    port: window.location.port,
    sample_name: "",
    current_results: [],

    /** Set UI elements to default values */
    set_defaults: function() {
        $( '.search-gene' )[ 0 ].value = "";
        $( '.rna-sort' ).val( "score" );
        $( '.rna-filter' ).val( "-1" );
        $( '.filter-operator' ).hide();
        $( '.filter-operator' ).val( "-1" );
        $( '.filter-value' )[ 0 ].value = "";
        $( '.check-all-interactions' )[ 0 ].checked = false;
    },
    
    /** Build fancy scroll for the interactions */
    build_fancy_scroll: function() {
        // add fancy scroll bar
        $( '.transcriptions-ids' ).mCustomScrollbar({
            theme:"minimal"
        });
        $( '.transcriptions-ids .mCSB_dragger_bar' ).css( 'background-color', 'black' );
    },

    /** Build the left panel */ 
    build_left_panel: function( records ) {
        var template = "",
            self = this,
            $el_transcriptions_ids = $( '.transcriptions-ids' );
        _.each( records, function( record ) {
            template = template + '<div class="rna-pair"><input type="checkbox" id="'+ record[ 0 ] +'" value="" class="rna-interaction" />' +
                       '<span>' + record[ 2 ] + '-' + record[ 3 ]  + '</span></div>';
        });
        $el_transcriptions_ids.html( template );
        self.build_fancy_scroll();
        $el_transcriptions_ids.show();
        self.register_events();
    },

    /** Plot pie charts for interactions chosen for summary */
    plot_summary_charts: function( dict, container, name ) {
        var layout = {
            height:350,
            width: 550,
            title: name
        },
        labels = [],
        values = [];

        for( var item in  dict ) {
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

    /** Register events for the page elements */
    register_page_events: function() {
        var self = this,
            $el_search_gene = $( '.search-gene' ),
            $el_sort = $( '.rna-sort' ),
            $el_filter = $( '.rna-filter' ),
            $el_filter_operator = $( '.filter-operator' ),
            $el_filter_val = $( '.filter-value' ),
            $el_summary = $( '.rna-summary' ),
            $el_back = $( '.back-samples' ),
            $el_check_all = $( '.check-all-interactions' ),
            $el_export = $( '.export-results' ),
            $el_all_interactions = $( '.check-all-interactions' ),
            $el_reset = $( '.reset-filters' );

        // search query event
        $el_search_gene.on( 'keyup', function( e ) {
            e.preventDefault();
            var query = $( this )[ 0 ].value;
            if( query.length >= self.min_query_length ) {
                if( e.which === 13 ) {
                    self.show_data( query );
                }
            }
            else if ( query.length === 0 ) {
                self.show_data( "" );
            }
            else {
                return false;
            }
        });

        // onchange for sort
        $el_sort.on( 'change', function( e ) {
            e.preventDefault();
            self.sort_field = $( this )[ 0 ].value;
            self.show_data( "" );
        });

        // onchange for filter
        $el_filter.on( 'change', function( e ) {
            e.preventDefault();
            var value = $( this )[ 0 ].value;
            // if the selected filter is 'score', show the selectbox for operators
            value === "score" ? $el_filter_operator.show() : $el_filter_operator.hide();
        });

        // fetch records using filter's value
        $el_filter_val.on( 'keyup', function( e ) {
            e.preventDefault();
            var query = $( this )[ 0 ].value,
                filter_type = "",
                filter_operator = "";
            // For no query, just build left panel with complete data
            if ( !query ) {
                self.show_data( "" );
            }
            if( e.which === 13 ) { // search on enter click
                filter_type = $el_filter.find( ":selected" ).val();
                filter_operator = $el_filter_operator.find( ":selected" ).val();
                if ( filter_type === "-1" || query === "" ) {
                    return;
                }
                var url = "http://" + self.host + ":" + self.port + "/?sample_name="+ SampleInteractions.sample_name +
                          "&filter_type=" + filter_type + "&filter_op=" + filter_operator + "&filter_value=" + query;
                self.show_data( "", url );
            }
        });

        // click for checkboxes
        $el_summary.on( 'click', function( e ) {
            e.preventDefault();
            var checked_ids = "",
                checkboxes = $( '.rna-interaction' ),
                url = "",
                summary_items = [],
                current_results_length = self.current_results.length,
                summary_result_type1 = {},
                summary_result_type2 = {};
            _.each( checkboxes, function( item ) {
                if( item.checked ) {
                    checked_ids = ( checked_ids === "" ) ? item.id : checked_ids + ',' + item.id;
                }
            });
            checked_ids = checked_ids.split( "," );
            for(var ctr_ids = 0; ctr_ids < checked_ids.length; ctr_ids++) {
                for(var ctr = 0; ctr < current_results_length; ctr++) {
                    var item = self.current_results[ ctr ];
                    if ( checked_ids[ ctr_ids ] === item[ 0 ] ) {
                        summary_items.push( item );
                        break;
                    }
                }
            }
            // summary fields - geneid (1 and 2) and type (1 and 2)
            for ( var i = 0; i < summary_items.length; i++ ) {
                summary_result_type1[ summary_items[ i ][ 8 ] ] = ( summary_result_type1[ summary_items[ i ][ 8 ] ] || 0 ) + 1;
                summary_result_type2[ summary_items[ i ][ 9 ] ] = ( summary_result_type2[ summary_items[ i ][ 9 ] ] || 0 ) + 1;
            }
            // plot the summary as pie charts
            self.plot_summary_charts( summary_result_type1, "rna-type1", 'Gene 1 family distribution' );
            self.plot_summary_charts( summary_result_type2, "rna-type2", 'Gene 2 family distribution' );
        });

        // back to all samples view
        $el_back.on( 'click', function( e ) {
            e.preventDefault();
            $( '.multi-samples' ).show();
            $( '.one-sample' ).hide();
            //window.location.reload();
        });

        $el_export.on( 'click', function( e ) {
            e.preventDefault();
            self.export_results();
        });

        $el_all_interactions.on( 'click', function( e ) {
            var $el_interactions_checked = $( '.rna-interaction' ),
                checkall_status = $( this )[ 0 ].checked;
            _.each( $el_interactions_checked, function( item ) {
                item.checked = checkall_status ? true : false;
            });
        });
        
        $el_reset.on( 'click', function( e ) {
            e.preventDefault();
            self.set_defaults();
        });
        
    },

    /** Export as tab separated file */
    export_results: function() {
        var tsv_data = "",
            link = document.createElement('a')
        _.each( this.current_results, function( item ) {
            tsv_data = tsv_data + item.join("\t") + "\n";
        });
        tsv_data = window.encodeURIComponent(tsv_data);
        link.setAttribute('href', 'data:application/octet-stream,' + tsv_data);
        link.setAttribute('download', Date.now().toString(16) + '_results.tsv');
        document.body.appendChild(link);
        link.click();
    },

    /** Register client-side events */
    register_events: function() {
        var self = this,
            $el_rna_pair = $( '.rna-pair' );
        // highlight the transaction pair
        $el_rna_pair.on( 'mouseenter', function() {
            $( this ).addClass( 'pair-mouseenter' );
        });

        // remove the highlighted background on focus remove
        $el_rna_pair.on( 'mouseleave', function() {
            $( this ).removeClass( 'pair-mouseenter' );
        });
    },

    /** Show data in the left panel */
    show_data: function( search_by, url_text ) {
        var self = this,
            url = url_text ? url_text : "http://" + self.host + ":" + self.port +
                "/?sample_name="+ SampleInteractions.sample_name +"&search=" + search_by,
            $el_loading = $( ".loading" ),
            $el_transcriptions_ids_parent = $( '.rna-transcriptions-container' );
        
        $( '.transcriptions-ids' ).remove();
        // clear old charts
        $( '#rna-type1' ).empty();
        $( '#rna-type2' ).empty();
        $el_loading.show();
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
                self.current_results = rna_records;
                self.build_left_panel( rna_records );
            }
            else {
                $( '.transcriptions-ids' ).html( "<div> No results found. </div>" );
                $( '.transcriptions-ids' ).show();
            }
            $el_loading.hide();
	});
    }
};

$(document).ready(function() {
    // reset the select all checkbox
    $( '.check-all-samples' )[ 0 ].checked = false;

    // Fetch all samples
    MultiSamples.get_samples();

    // reload the app on header click
    $( '.rna-header' ).on('click', function( e ) {
        e.preventDefault();
        window.location.reload();
    });
});









