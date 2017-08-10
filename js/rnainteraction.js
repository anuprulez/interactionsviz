$(document).ready(function() {
    
    var transcription_records = [];
    var min_query_length = 3;

    var build_fancy_scroll = function() {
        // add fancy scroll bar
        $( '.transcriptions-ids' ).mCustomScrollbar({
            theme:"minimal"
        });
        $( '.transcriptions-ids .mCSB_dragger_bar' ).css( 'background-color', 'black' );
    };

    // Build the transactions left panel
    var build_left_panel = function( records ) {
        var template = "";
        _.each( records, function( record ) {
            template = template + '<div class="rna-pair" id="'+ record[ 'chimeraid' ] +'">' + record[ 'txid1' ] + '-' + record[ 'txid2' ]  + '</div>';
        });
        if( $('.mCustomScrollbar').length ) {
            $( '.transcriptions-ids .mCSB_container' ).empty().html( template );
        }
        else {
            $( '.transcriptions-ids' ).html( template );
            build_fancy_scroll();
        }
        
        register_events();
    };

    // Search for geneid/symbols
    var search_gene = function( query ) {
        var $el_transcriptions_ids = $( '.transcriptions-ids' );
        var $el_loading = $( '.loading' );
        var template = "";
        var searchable_fields = ['symbol1', 'symbol2', 'geneid1', 'geneid2'];
        var found_records = []
        _.each( transcription_records, function( record ) {
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
        build_left_panel( found_records );
    };

    var register_events = function() {
        var $el_rna_pair = $( '.rna-pair' ),
            $el_search_gene = $( '.search-gene' );

        // highlight the transaction pair
        $el_rna_pair.on( 'mouseenter', function(){
            $( this ).css('background-color', '#dfe3ee');
            $( this ).css('cursor', 'pointer');
        });

        // remove the highlighted background on focus remove
        $el_rna_pair.on( 'mouseleave', function(){
            $( this ).css('background-color', '');
            $( this ).css('cursor', 'default');
        });
       
        // add information to the right boxes for the selected pair
        $el_rna_pair.on( 'click', function( e ) {
            e.preventDefault();
            var rec_id = $( this )[ 0 ].id;
            _.each( transcription_records, function( record ) {
                if ( rec_id === record.chimeraid ){
                    $( '.first-gene' ).html( '<div>' + record.txid1 + '</div>' );
                    $( '.second-gene' ).html( '<div>' + record.txid2 + '</div>' );
                }
            });
        });

        $el_search_gene.on( 'keyup', function( e ) {
            e.preventDefault();
            var query = $( this)[ 0 ].value;
            // For no query, just build left panel with complete data
            if ( !query ) {
                build_left_panel( transcription_records );
            }

            if( query.length < min_query_length ) {
                return false;
            }
            else {
                search_gene( query );
            }
        });
    };

    var show_data = function() {
        var host = window.location.hostname,
            port = window.location.port,
            url = "http://" + host + ":" + port + "/?q=showdata";
        // show loading while data is being pulled asynchronously
        $(".loading").css("display", "block");
        // pull all the data
	$.get( url, function( result ) {
            var records = result.split("\n");
            // create template for all pairs
            _.each(records, function( record ){
                record = JSON.parse( record );
                transcription_records.push( record );
            });
            build_left_panel( transcription_records );
            $(".loading").css("display", "none");
	});
    };

    // load the pairs of interaction ids
    show_data();
});








