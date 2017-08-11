var RNAInteractions = {

    transcription_records: [],
    min_query_length: 3,
    host: window.location.hostname,
    port: window.location.port,
    

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
            template = template + '<div class="rna-pair" id="'+ record[ 'chimeraid' ] +'">' + record[ 'txid1' ] + '-' + record[ 'txid2' ]  + '</div>';
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

    // Search for geneid/symbols
    search_gene: function( query ) {
        var self = this,
            $el_transcriptions_ids = $( '.transcriptions-ids' ),
            template = "",
            searchable_fields = [ 'symbol1', 'symbol2', 'geneid1', 'geneid2' ],
            found_records = [];
        _.each( self.transcription_records, function( record ) {
            if( record[ searchable_fields[ 0 ] ].indexOf( query ) > -1 ||
                record[ searchable_fields[ 1 ] ].indexOf( query ) > -1 ||
                record[ searchable_fields[ 2 ] ].indexOf( query ) > -1 ||
                record[ searchable_fields[ 3 ] ].indexOf( query ) > -1 ) {
                found_records.push( record );
            }
        });
        if ( found_records.length === 0 ) {
            $el_transcriptions_ids.empty().html( "<div> No results found for the query: "+ query +"</div>" );
            return;
        }
        self.build_left_panel( found_records );
    },

    register_events: function() {
        var self = this,
            $el_rna_pair = $( '.rna-pair' ),
            $el_search_gene = $( '.search-gene' ),
            $el_sort = $( '.rna-sort' ),
            $el_filter = $( '.rna-filter' );

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
            e.preventDefault();
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
                self.build_left_panel( self.transcription_records );
            }

            if( query.length < self.min_query_length ) {
                return false;
            }
            else {
                self.search_gene( query );
            }
        });

        $el_sort.on( 'change', function( e ) {
            self.show_data( $( this )[ 0 ].value );
        });
    },

    show_data: function( sortby ) {
        var self = this,
            url = "http://" + self.host + ":" + self.port + "/?q=" + sortby,
            $el_loading = $( ".loading" ),
            $el_transcriptions_ids = $( '.transcriptions-ids' );

        // show loading while data loads asynchronously
        $el_loading.show();
        $el_transcriptions_ids.hide();
        // pull all the data
	$.get( url, function( result ) {
            var records = result.split( "\n" ),
                rna_records = [];
            // create template for all pairs
            _.each(records, function( record ){
                record = JSON.parse( record );
                rna_records.push( record );
            });
            self.transcription_records = rna_records;
            self.build_left_panel( rna_records );
            $el_loading.hide();
	});
    }
};


$(document).ready(function() {
    // load the pairs of interaction ids
    RNAInteractions.show_data( 'score' );
});









