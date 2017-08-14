var RNAInteractions = {

    transcription_records: [],
    min_query_length: 3,
    host: window.location.hostname,
    port: window.location.port,
    sort_field: 'score',
    search_text: "",
    
    build_fancy_scroll: function() {
        // add fancy scroll bar
        $( '.transcriptions-ids' ).mCustomScrollbar({
            theme:"minimal"
        });
        $( '.transcriptions-ids .mCSB_dragger_bar' ).css( 'background-color', 'black' );
    },

    // Build the transactions left panel
    build_left_panel: function( records ) {
        var template = "",
            self = this,
            $el_transcriptions_ids = $( '.transcriptions-ids' );
        _.each( records, function( record ) {
            template = template + '<div class="rna-pair"><input type="checkbox" id="'+ record[ 'chimeraid' ] +'" value="" />' +
                       '<span>' + record[ 'txid1' ] + '-' + record[ 'txid2' ]  + '</span></div>';
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

    plot_summary_charts: function( dict, container, name ) {
        var layout = {
            height:250,
            width: 400
        },
        labels = [],
        values = [];

        for( var item in  dict ) {
            labels.push( item );
            values.push( dict[ item ] ); 
        }

        var data = [{f
            values: values,
            labels: labels,
            type: 'pie',
            showlegend: false,
            title: name
        }];
        Plotly.newPlot( container, data, layout );
    },

    register_events: function() {
        var self = this,
            $el_rna_pair = $( '.rna-pair' ),
            $el_search_gene = $( '.search-gene' ),
            $el_sort = $( '.rna-sort' ),
            $el_filter = $( '.rna-filter' ),
            $el_summary = $( '.rna-summary' );

        // highlight the transaction pair
        $el_rna_pair.on( 'mouseenter', function() {
            $( this ).addClass( 'pair-mouseenter' );
        });

        // remove the highlighted background on focus remove
        $el_rna_pair.on( 'mouseleave', function() {
            $( this ).removeClass( 'pair-mouseenter' );
        });
       
        // add information to the right boxes for the selected pair
        $el_rna_pair.on( 'click', function( e ) {
            //e.preventDefault();
            var rec_id = $( this )[ 0 ].id,
                $el_first_block = $( '.first-gene' ),
                $el_second_block = $( '.second-gene' );

            _.each( self.transcription_records, function( record ) {
                if ( rec_id === record.chimeraid ) {
                    $el_first_block.html( '<div>' + record.txid1 + '</div>' );
                    $el_second_block.html( '<div>' + record.txid2 + '</div>' );
                }
            });
        });

        $el_search_gene.on( 'keyup', function( e ) {
            e.preventDefault();
            var query = $( this )[ 0 ].value;
            // For no query, just build left panel with complete data
            if ( !query ) {
                self.show_data( 'score', "" );
            }

            if( query.length < self.min_query_length ) {
                return false;
            }
            else {
                if( e.which === 13 ) { // search on enter click
                    self.search_text = query;
                    self.show_data( self.sort_field, query );
                }
            }
        });

        $el_sort.on( 'change', function( e ) {
            e.preventDefault();
            self.sort_field = $( this )[ 0 ].value;
            self.show_data( $( this )[ 0 ].value, self.search_text );
        });

        $el_summary.on( 'click', function( e ) {
            e.preventDefault();
            var checked_ids = [],
                checkboxes = $( '.rna-pair' ).find( 'input[type="checkbox"]' ),
                url = "";
            _.each( checkboxes, function( item ) {
                if( item.checked ) {
                    checked_ids.push( item.id );
                }
            });
            url = "http://" + self.host + ":" + self.port + "/?summary_ids=" + checked_ids
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

                // summary fields - geneid, type
                for ( var i = 0; i < summary.length; i++ ) {
                    summary_result_geneid1[ summary[ i ].geneid1 ] = ( summary_result_geneid1[ summary[ i ].geneid1 ] || 0 ) + 1;
                    summary_result_type1[ summary[ i ].type1 ] = ( summary_result_type1[ summary[ i ].type1 ] || 0 ) + 1;
                    summary_result_geneid2[ summary[ i ].geneid2 ] = ( summary_result_geneid2[ summary[ i ].geneid2 ] || 0 ) + 1;
                    summary_result_type2[ summary[ i ].type2 ] = ( summary_result_type2[ summary[ i ].type2 ] || 0 ) + 1;
                }

                self.plot_summary_charts( summary_result_geneid1, "rna-gene1", 'RNA 1 distribution' );
                self.plot_summary_charts( summary_result_geneid2, "rna-gene2", 'RNA 2 distribution' );
                self.plot_summary_charts( summary_result_type1, "rna-type1", 'RNA family 1 distribution' );
                self.plot_summary_charts( summary_result_type2, "rna-type2", 'RNA family 2 distribution' );                
            });
        });
    },

    show_data: function( sort_by, search_by ) {
        var self = this,
            url = "http://" + self.host + ":" + self.port + "/?sort=" + sort_by + "&search=" + search_by,
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
    RNAInteractions.show_data( RNAInteractions.sort_field, "" );
});









