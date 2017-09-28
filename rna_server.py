import socket
import os.path
import sys
import re
import json
import urlparse
import pandas as pd
import numpy as np
import uuid


class RNAInteraction:
    """ A structure to load RNA interactions data. """

    @classmethod
    def __init__( self ):
        """ Init method. """
        self.default_order_by = 'score'
        self.default_ascending = False
        self.searchable_fields = [ 'txid1', 'txid2', 'geneid1', 'geneid2', 'symbol1', 'symbol2', 'type1', 'type2' ]
        self.number_samples = 5
        self.sample_prefix = 'sample'
        self.sqlite_table_name = 'interactions'
        self.hdf_file_ext = '.hdf'

    @classmethod
    def get_sample_names( self, file_name ):
        """ Get all the file names of the samples """
        self.make_samples( file_name )
        file_names = [ file.split( '.' )[ 0 ] for file in os.listdir( '.' ) if file.startswith( self.sample_prefix ) ]
        return sorted( file_names, key=str.lower )

    @classmethod
    def make_samples( self, file_path ):
        """ Take out records for multiple samples """
        interactions_dataframe = pd.read_table( file_path, sep='\t', index_col=False )
        # inflate the interactions
        frames = []
        for x in range(0, 21):
            frames.append( interactions_dataframe )
        interactions_dataframe = pd.concat( frames )

        # randomly sample the interactions
        interactions_dataframe = interactions_dataframe.sample( frac=1 ).reset_index( drop=True )

        # add unique id to each interaction
        interactions_dataframe[ "chimeraid" ] = interactions_dataframe[ "chimeraid" ].apply( lambda x: str( uuid.uuid4() ) )

        size_each_file = len(interactions_dataframe) / self.number_samples
        for sample_number in xrange( 0, self.number_samples ):
            fraction_data = interactions_dataframe[ size_each_file * sample_number: size_each_file + sample_number * size_each_file ]
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
    def get_plotting_data( self, params ):
        """ Generate data for plotting """

        sample_name = params[ 'plot_sample_name' ][ 0 ]
        search_by = None
        filter_type = None
        if 'search_by' in params:
            sample_data = self.search_data( sample_name, params[ 'search_by' ][ 0 ] )
        elif 'filter_type' in params:
           sample_data = self.filter_data( sample_name, params )
        else:
           sample_data = pd.read_hdf( sample_name + self.hdf_file_ext, sample_name, index=None )
        
        family_names_count = dict()
        score = list()
        score1 = list()
        score2 = list()
        energy = list()
        for item_x in xrange( 0, len( sample_data ) ):
            row_x = sample_data[ item_x: item_x + 1 ] 
            family_name = row_x[ 'type2' ].values[ 0 ]
            if family_name in family_names_count:
                family_names_count[ family_name ] += 1
            else:
               family_names_count[ family_name ] = 1
            score.append( row_x[ 'score' ].values[ 0 ] )
            score1.append( row_x[ 'score1' ].values[ 0 ] )
            score2.append( row_x[ 'score2' ].values[ 0 ] )
            energy.append( row_x[ 'energy' ].values[ 0 ] )

        return {
            'family_names_count': family_names_count,
            'score': score,
            'score1': score1,
            'score2': score2,
            'energy': energy
        }

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
                        sample_a_field_dict = dict()
                        for item_x in xrange( 0, len( sample_a ) ):
                            row_x = sample_a[ item_x: item_x + 1 ] 
                            sample_a_field_dict[ (row_x[ 'txid1' ].values[ 0 ], row_x[ 'txid2' ].values[ 0 ]) ] = \
                                ( row_x[ 'txid1' ].values[ 0 ], row_x[ 'txid2' ].values[ 0 ] )
                        for item_y in xrange( 0, len( sample_b ) ):
                            row_y = sample_b[ item_y: item_y + 1 ]
                            # common interactions are checked using the 'txid1' and 'txid2' fields
                            if ( row_y[ 'txid1' ].values[ 0 ], row_y[ 'txid2' ].values[ 0 ] ) in sample_a_field_dict:
                                interactions_ctr = interactions_ctr + 1
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
    def read_from_file( self, file_path ):
        """ Select data for the first load """
        return self.read_hdf_sample( file_path )
        
    @classmethod
    def search_data( self, file_path, search_query ):
        """ Select data based on a search query """
        all_data = self.read_hdf_sample( file_path )
        filtered_data = all_data[ all_data[ self.searchable_fields[ 0 ] ].str.lower().str.contains( search_query.lower() ) | \
                                  all_data[ self.searchable_fields[ 1 ] ].str.lower().str.contains( search_query.lower() ) | \
                                  all_data[ self.searchable_fields[ 2 ] ].str.lower().str.contains( search_query.lower() ) | \
                                  all_data[ self.searchable_fields[ 3 ] ].str.lower().str.contains( search_query.lower() ) | \
                                  all_data[ self.searchable_fields[ 4 ] ].str.lower().str.contains( search_query.lower() ) | \
                                  all_data[ self.searchable_fields[ 5 ] ].str.lower().str.contains( search_query.lower() ) | \
                                  all_data[ self.searchable_fields[ 6 ] ].str.lower().str.contains( search_query.lower() ) | \
                                  all_data[ self.searchable_fields[ 7 ] ].str.lower().str.contains( search_query.lower() ) ]
        return filtered_data

    @classmethod
    def filter_data( self, file_path, params ):
        """ Filter data based on the filter, equality or inequality operator and filter's value """
        filter_type = None
        filter_operator = None
        filter_value = None
        if "filter_type" in params:
            filter_type = params[ "filter_type" ][ 0 ]
        if "filter_op" in params:
            filter_operator = params[ "filter_op" ][ 0 ]
        if "filter_value" in params:
            filter_value = params[ "filter_value" ][ 0 ]

        all_data = self.read_hdf_sample( file_path )
        if filter_type == 'score':
            # if filter operator for score is not set
            if filter_operator is None or filter_value is None:
                return []
            # convert the filter value to float for comparison
            try:
                filter_value = float( filter_value )
            except:
                return []
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
            if filter_value is None:
                return []
            all_data = all_data[ all_data[ 'type1' ].str.lower().str.contains( filter_value.lower() ) | \
                                 all_data[ 'type2' ].str.lower().str.contains( filter_value.lower() ) ]

        return all_data


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
            elif( "plot_sample_name" in query ): 
                data = RNAInteraction.get_plotting_data( params )
                content = json.dumps( data[ 'family_names_count' ] ) + '\n'
                content = content + json.dumps( data[ "score" ] ) + '\n'
                content = content + json.dumps( data[ "score1" ] ) + '\n'
                content = content + json.dumps( data[ "score2" ] ) + '\n'
                content = content + json.dumps( data[ "energy" ] ) + '\n'
            elif( "multisamples" in query ):
                file_names = RNAInteraction.get_sample_names( file_name )
                for name in file_names:
                    content += name + '\n'
            elif( "filter" in query ):
                sample_name = params[ 'sample_name' ][ 0 ]
                filtered_data = data.filter_data( sample_name, params )
                if not filtered_data.empty:
                    content = json.dumps( list(filtered_data.columns) ) + '\n'
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
                    content = json.dumps( list(results.columns) ) + '\n'
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
