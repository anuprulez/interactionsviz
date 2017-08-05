$(document).ready(function() {
    
    var transcription_records = [];

    var register_events = function() {
        var $el_rna_pair = $( '.rna-pair' );

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
    };

    var show_data = function() {
        var host = window.location.hostname,
            port = window.location.port,
            url = "http://" + host + ":" + port + "/?q=showdata";

        // show loading while data is being pulled asynchronously
        $(".loading").css("display", "block");

        // pull all the data
	$.get(url, function( result ) {
            var records = result.split("\n"),
                $el_transcriptions_ids = $( '.transcriptions-ids' ),
                template = "";

            // create template for all pairs
            _.each(records, function( record ){
                record = JSON.parse( record );
                transcription_records.push( record );
                template = template + '<div class="rna-pair" id="'+ record['chimeraid'] +'">' + record[ 'txid1' ] + '-' + record[ 'txid2' ]  + '</div>';
            });
            $(".loading").css("display", "none");
            $el_transcriptions_ids.html( template );
 
            // register events for transaction pairs
            register_events();

            // add fancy scroll bar
            $el_transcriptions_ids.mCustomScrollbar({
                theme:"minimal"
            });
            $( '.transcriptions-ids .mCSB_dragger_bar' ).css( 'background-color', 'black' );
	});
    };

    // load the pairs of interaction ids
    show_data();
});








