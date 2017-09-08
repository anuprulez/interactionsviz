import socket
import os.path
import sys
import re
import json
import urlparse
import pandas as pd
import numpy as np


class RNAInteraction:
    """ A structure to load RNA interactions data. """

    @classmethod
    def __init__( self ):
        """ Init method. """
        self.default_order_by = 'score'
        self.default_ascending = False
        self.searchable_fields = [ 'geneid1', 'geneid2' ]
        self.total_records = 10000
        self.number_samples = 10
        self.sample_prefix = 'sample'
        self.sqlite_table_name = 'interactions'
        self.hdf_file_ext = '.hdf'

    @classmethod
    def get_sample_names( self, file_name ):
        """ Get all the file names of the samples """
        self.make_samples( file_name )
        file_names = [ file.split( '.' )[ 0 ] for file in os.listdir( '.' ) if file.startswith( self.sample_prefix ) ]
        return sorted( file_names, key=str.lower)

    @classmethod
    def make_samples( self, file_path ):
        """ Take out records for multiple samples """
        interactions_dataframe = pd.read_table( file_path, sep='\t', header=0)
        size_each_file = self.total_records / self.number_samples
        for sample_number in xrange( 0, self.number_samples ):
            fraction_data = interactions_dataframe[ size_each_file * sample_number: size_each_file + sample_number * size_each_file - 800 ]
            file_name = self.sample_prefix + str( sample_number + 1 ) + self.hdf_file_ext
            if not os.path.isfile( file_name ):
                fraction_data.to_hdf( file_name, self.sample_prefix + str( sample_number + 1 ), mode="w", complib='blosc', index=None )
 
    @classmethod
    def read_samples( self, sample_ids ):
        """ Read the selected HDF samples """
        sample_ids = sample_ids.split( ',' )
        samples = dict()
        for item in sample_ids:
            samples[ item ] = list()
            sample_data = pd.read_hdf( item + self.hdf_file_ext, item, index=None )
            samples[ item ] = sample_data
        return samples

    @classmethod
    def find_common( self, samples, sample_ids ):
        """ Create a matrix of common interactions across multiple samples """
        # find the smallest sample from all samples        
        sample_names = sample_ids.split( "," )
        size_all_samples = len( sample_names )
        # create n x n matrix with NAN values
        common_interactions = np.empty( ( size_all_samples, size_all_samples ) )
        common_interactions[ : ] = np.NAN
        total_long_iterations = ( size_all_samples * size_all_samples ) - size_all_samples
        counter = 0
        # find the number of common interactions for each pair of selected samples
        for index_x, sample_x in enumerate( samples ):
            for index_y, sample_y in enumerate( samples ):
                if index_x == index_y:
                    # fill the diagonal of the matrix with the size of sample being compared
                    common_interactions[ index_x ][ index_y ] = len( samples[ sample_names[ index_x ] ] )
                else:
                    # fill only one of half of the matrix as the resulting matrix would be symmetric
                    if( np.isnan( common_interactions[ index_x ][ index_y ] ) and np.isnan( common_interactions[ index_y ][ index_x ] ) ):
                        counter += 1
                        interactions_ctr = 0
                        sample_a = samples[ sample_names[ index_x ] ]
                        sample_b = samples[ sample_names[ index_y ] ]
                        for item_x in xrange( 0, len( sample_a ) ):
                            row_x = sample_a[ item_x: item_x + 1 ]
                            for item_y in xrange( 0, len( sample_b ) ):
                                row_y = sample_b[ item_y: item_y + 1 ]
                                # common interactions are checked using the 'txid1' and 'txid2' fields
                                if( str( row_x[ 'txid1' ].values[ 0 ] ) == str( row_y[ 'txid1' ].values[ 0 ] ) \
                                    and str( row_x[ 'txid2' ].values[ 0 ]) == str( row_y[ 'txid2' ].values[ 0 ] ) ):
                                    interactions_ctr = interactions_ctr + 1
                                    break
                        # update the count of common interactions as symmetric values
                        common_interactions[ index_x ][ index_y ] = interactions_ctr
                        common_interactions[ index_y ][ index_x ] = interactions_ctr
                        print '%s percent complete' % str( round( ( ( 2 / float( total_long_iterations ) ) * counter ) * 100 ) )
        # reshape the matrix as an array to be passed as JSON
        common_interactions = np.reshape( common_interactions, ( size_all_samples ** 2, 1) )
        return common_interactions
    
    @classmethod
    def read_hdf_sample( self, file_name ):
        hdfdata = pd.read_hdf( file_name + self.hdf_file_ext, file_name )
        return hdfdata.sort_values( by=self.default_order_by, ascending=self.default_ascending )

    @classmethod
    def read_from_file( self, file_path, how_many=1000 ):
        """ Select data for the first load """
        return self.read_hdf_sample( file_path )[ :how_many ]
        
    @classmethod
    def search_data( self, file_path, search_query, how_many=1000 ):
        """ Select data based on a search query """
        all_data = self.read_hdf_sample( file_path )
        filtered_data = all_data[ all_data[ self.searchable_fields[ 0 ] ].str.contains( search_query ) | all_data[ self.searchable_fields[ 1 ] ].str.contains( search_query ) ]
        return filtered_data[ :how_many ]

    @classmethod
    def make_summary( self, file_path, summary_record_ids ):
        """ Select data for making summary plots """
	ids_pattern = '|'.join( summary_record_ids.split( ',' ) )
        all_data = self.read_hdf_sample( file_path )
        return all_data[ all_data[ 'chimeraid' ].str.contains( ids_pattern ) ]

    @classmethod
    def filter_data( self, file_path, params, how_many=1000 ):
        """ Filter data based on the filter, equality or inequality operator and filter's value """
        filter_type = params[ "filter_type" ][ 0 ]
        filter_operator = params[ "filter_op" ][ 0 ]
        filter_value = params[ "filter_value" ][ 0 ]
        all_data = self.read_hdf_sample( file_path )
        if filter_type == 'score':
            # convert the filter value to float for comparison
            filter_value = float( filter_value )
            if filter_operator == 'equal':
                all_data = all_data[ np.isclose( all_data[ 'score' ], filter_value ) ]
            elif filter_operator == 'greaterthan':
                all_data = all_data[ all_data[ 'score' ] > filter_value ]
            elif filter_operator == 'lessthan':
                all_data = all_data[ all_data[ 'score' ] < filter_value ]
            elif filter_operator == 'lessthanequal':
                all_data = all_data[ all_data[ 'score' ] <= filter_value ]
            elif filter_operator == 'greaterthanequal':
                all_data = all_data[ all_data[ 'score' ] >= filter_value ]
            else:
                all_data = all_data[ all_data[ 'score' ] != filter_value ]
        elif filter_type == 'family':
            all_data = all_data[ all_data[ 'type1' ].str.contains( filter_value ) | all_data[ 'type2' ].str.contains( filter_value ) ]

        return all_data[ :how_many ]


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print( "Usage: python rna_server.py <file> <port>" )
        exit( 1 )
    input_file = sys.argv[ 1 ]
    port = int( sys.argv[ 2 ] )
    # Create communication socket and listen on port 80.
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind((socket.gethostname(), port))
    server.listen( 5 )
    # Server loop.
    while True:
        print("\x1b[1mWaiting for requests on port %d ... \x1b[0m" % port)
        (client, address) = server.accept()
        print(client)
        print(address)
        request = client.recv( 8192 ).decode( "utf8" )
        print( "the request is " + request )
        content_type = "text/plain"
        content = ""
        match_searchpage = re.match( "^GET / HTTP/1.1", request )
        match = re.match( "^GET /(.*) HTTP/1.1", request )
        if match_searchpage:
            home_page = "index.html"
            with open( home_page ) as file:
                content = file.read()
                content_type = "text/html"
        elif match:
            query = match.group( 1 )
            file_name = sys.argv[ 1 ]
            data = RNAInteraction()
            content = ""
            parsed_query = urlparse.urlparse( query )
            params = urlparse.parse_qs( parsed_query.query )
            if( "sample_ids" in query ):
                sample_ids = params[ 'sample_ids' ][ 0 ]
                samples = data.read_samples( sample_ids )
                matrix = data.find_common( samples, sample_ids )
                for item in matrix:
                    content += str( item[ 0 ] ) + '\n'
            elif( "multisamples" in query ):
                file_names = RNAInteraction.get_sample_names( file_name )
                for name in file_names:
                    content += name + '\n'
            elif( "summary_ids" in query ):
                sample_name = params[ 'sample_name' ][ 0 ]
                summary_ids = params[ 'summary_ids' ][ 0 ]
                summary = data.make_summary( sample_name, summary_ids )
                for index, row in summary.iterrows():
                    content += row.to_json( orient='records' ) + '\n'
            elif( "filter" in query ):
                sample_name = params[ 'sample_name' ][ 0 ]
                filtered_data = data.filter_data( sample_name, params )
                if not filtered_data.empty:
                    for index, row in filtered_data.iterrows():
                        content += row.to_json( orient='records' ) + '\n'
                else:
                    content = ""
            elif( "?" in query ):
                search_by = ""
                sample_name = params[ 'sample_name' ][ 0 ]
                if 'search' in params:
                    search_by = params[ 'search' ][ 0 ]
                    results = data.search_data( sample_name, search_by )
                else:
                    results = data.read_from_file( sample_name )
                if not results.empty:
                    for index, row in results.iterrows():
                        content += row.to_json( orient='records' ) + '\n'
                else:
                    content = ""
            else:
                try:
                    # add resource files
                    with open(query) as file:
                        content = file.read()
                        if query.endswith( ".html" ):
                            content_type = "text/html"
                        elif query.endswith( ".js" ):
                           content_type = "application/javascript"
                        elif query.endswith( ".css" ):
                            content_type = "text/css"
                except:
                    content = ""
        content_length = len( content )
        answer = "HTTP/1.1 200 OK\r\n" \
            "Content-Length: %d\r\n" \
            "Content-Type: %s  \r\n" \
            "\r\n %s" % ( content_length, content_type, content )
        client.send( answer.encode( "utf8" ) )
        client.close()
