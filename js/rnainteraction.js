var RNAInteractions = {

    transcription_records: [],
    min_query_length: 3,
    host: window.location.hostname,
    port: window.location.port,
    search_text: "",
    
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
            template = template + '<div class="rna-pair"><input type="checkbox" id="'+ record[ 0 ] +'" value="" />' +
                       '<span>' + record[ 2 ] + '-' + record[ 3 ]  + '</span></div>';
        });
        if( $( '.mCustomScrollbar' ).length ) {
            $( '.transcriptions-ids .mCSB_container' ).empty().html( template );
        }
        else {
            $el_transcriptions_ids.html( template );
            self.build_fancy_scroll();
        }
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

    /** Register client-side events */
    register_events: function() {
        var self = this,
            $el_rna_pair = $( '.rna-pair' ),
            $el_search_gene = $( '.search-gene' ),
            $el_sort = $( '.rna-sort' ),
            $el_filter = $( '.rna-filter' ),
            $el_summary = $( '.rna-summary' ),
            $el_filter_operator = $( '.filter-operator' ),
            $el_filter_val = $( '.filter-value' );

        // highlight the transaction pair
        $el_rna_pair.on( 'mouseenter', function() {
            $( this ).addClass( 'pair-mouseenter' );
        });

        // remove the highlighted background on focus remove
        $el_rna_pair.on( 'mouseleave', function() {
            $( this ).removeClass( 'pair-mouseenter' );
        });

        // search query event
        $el_search_gene.on( 'keyup', function( e ) {
            e.preventDefault();
            var query = $( this )[ 0 ].value;
            // For no query, just build left panel with complete data
            if ( !query ) {
                self.show_data( "" );
            }

            if( query.length < self.min_query_length ) {
                return false;
            }
            else {
                if( e.which === 13 ) { // search on enter click
                    self.search_text = query;
                    self.show_data( query );
                }
            }
        });

        // onchange for sort
        $el_sort.on( 'change', function( e ) {
            e.preventDefault();
            self.sort_field = $( this )[ 0 ].value;
            self.show_data( "" );
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
                if ( filter_type === "-1" || filter_operator === "-1" || query === "" ) {
                    return;
                }
                var url = "http://" + self.host + ":" + self.port + "/?filter_type=" + filter_type + "&filter_op=" + filter_operator + "&filter_value=" + query;
                self.show_data( "", url );
            }
        });

        // click for checkboxes
        $el_summary.on( 'click', function( e ) {
            e.preventDefault();
            var checked_ids = "",
                checkboxes = $( '.rna-pair' ).find( 'input[type="checkbox"]' ),
                url = "";
            _.each( checkboxes, function( item ) {
                if( item.checked ) {
                    checked_ids = ( checked_ids === "" ) ? item.id : checked_ids + ',' + item.id;
                }
            });
            if( checked_ids !== "" ) {
                url = "http://" + self.host + ":" + self.port + "/?summary_ids=" + checked_ids;
                // fetch data for summary interactions
                $.get( url, function( result ) {
                    var summary = [],
                       summary_records = result.split( "\n" ),
                       summary_result_geneid1 = {},
                       summary_result_geneid2 = {},
                       summary_result_type1 = {},
                       summary_result_type2 = {};

                    _.each(summary_records, function( record ) {
                        record = JSON.parse( record );
                        summary.push( record );
                    });
                    // summary fields - geneid (1 and 2) and type (1 and 2)
                    for ( var i = 0; i < summary.length; i++ ) {
                        summary_result_geneid1[ summary[ i ][ 4 ] ] = ( summary_result_geneid1[ summary[ i ][ 4 ] ] || 0 ) + 1;
                        summary_result_type1[ summary[ i ][ 8 ] ] = ( summary_result_type1[ summary[ i ][ 8 ] ] || 0 ) + 1;
                        summary_result_geneid2[ summary[ i ][ 5 ] ] = ( summary_result_geneid2[ summary[ i ][ 5 ] ] || 0 ) + 1;
                        summary_result_type2[ summary[ i ][ 9 ] ] = ( summary_result_type2[ summary[ i ][ 9 ] ] || 0 ) + 1;
                    }

                    // plot the summary as pie charts
                    self.plot_summary_charts( summary_result_geneid1, "rna-gene1", 'RNA gene 1 distribution' );
                    self.plot_summary_charts( summary_result_geneid2, "rna-gene2", 'RNA gene 2 distribution' );
                    self.plot_summary_charts( summary_result_type1, "rna-type1", 'RNA gene 1 family distribution' );
                    self.plot_summary_charts( summary_result_type2, "rna-type2", 'RNA gene 2 family distribution' );                
                });
            }
        });
    },

    /** Show data in the left panel */
    show_data: function( search_by, url_text ) {
        var self = this,
            url = url_text ? url_text : "http://" + self.host + ":" + self.port + "/?search=" + search_by,
            $el_loading = $( ".loading" ),
            $el_transcriptions_ids = $( '.transcriptions-ids' );
        // show loading while data loads asynchronously
        $( '.mCSB_container' ).empty();
        $el_loading.show();
        // pull all the data
	$.get( url, function( result ) {
            if( result.length === 0 ) {
                $el_transcriptions_ids.html( "<div> No results found. </div>" );
                $el_transcriptions_ids.show();
            }
            else {
                var records = result.split( "\n" ),
                    rna_records = [];
                // create template for all pairs
                _.each(records, function( record ) {
                    record = JSON.parse( record );
                    rna_records.push( record );
                });
                self.transcription_records = rna_records;
                self.build_left_panel( rna_records );
            }
            $el_loading.hide();
	});
    }
};


$(document).ready(function() {
    // load the pairs of interaction ids
    RNAInteractions.show_data( "" );
});









