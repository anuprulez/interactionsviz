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
        self.searchable_fields = [ 'txid1', 'txid2', 'geneid1', 'geneid2', 'symbol1', 'symbol2', 'type1', 'type2' ]
        self.hdf_file_ext = '.hdf'
        self.tsv_file_ext = '.tsv'
        self.dir_path = './data/'
        self.max_file_name_len = 30

    @classmethod
    def remove_hdf_files( self ):
        old_hdf_files = os.listdir( self.dir_path )
        for item in old_hdf_files:
            if item.endswith( self.hdf_file_ext ):
                os.remove( self.dir_path + item )

    @classmethod
    def get_sample_names( self ):
        """ Get all the file names of the samples """
        if os.path.exists( self.dir_path ):
            self.remove_hdf_files()
            files = [ file.split( '.' )[ 0 ] for file in os.listdir( self.dir_path ) if file.endswith( self.tsv_file_ext ) ]
            hdf_files = self.make_samples( files )
            return sorted( hdf_files, key = str.lower )

    @classmethod
    def make_samples( self, files ):
        """ Take out records for multiple samples """
        for item in files:
            table_file_path = self.dir_path + item + self.tsv_file_ext
            item = item[ 0:self.max_file_name_len ]
            hdf_file_name = item + self.hdf_file_ext
            interactions_dataframe = pd.read_table( table_file_path, sep='\t', index_col=False )
            interactions_dataframe.to_hdf( self.dir_path + hdf_file_name, item, mode="w", complib='blosc', index=None )    
            # add unique id to each interaction
            interactions_dataframe[ "chimeraid" ] = interactions_dataframe[ "chimeraid" ].apply( lambda x: str( uuid.uuid4() ) )
        return [ file.split( '.' )[ 0 ] for file in os.listdir( self.dir_path ) if file.endswith( self.hdf_file_ext ) ]
 
    @classmethod
    def read_samples( self, sample_ids ):
        """ Read the selected HDF samples """
        sample_ids = sample_ids.split( ',' )
        samples = dict()
        for item in sample_ids:
            samples[ item ] = list()
            sample_data = pd.read_hdf( self.dir_path + item + self.hdf_file_ext, item, index=None )
            samples[ item ] = sample_data
        return samples

    @classmethod
    def get_search_filter_data( self, params ):
        """ Get searched or fileted or original data based on querystring """
        sample_name = params[ 'sample_name' ][ 0 ]
        search_by = None
        filter_type = None
        if 'search_by' in params:
            sample_data = self.search_data( sample_name, params[ 'search_by' ][ 0 ] )
        elif 'filter_type' in params:
           sample_data = self.filter_data( sample_name, params )
        else:
           sample_data = pd.read_hdf( self.dir_path + sample_name + self.hdf_file_ext, sample_name, index=None )
        return sample_data

    @classmethod
    def get_plotting_data( self, params ):
        """ Generate data for plotting """
        sample_data = self.get_search_filter_data( params )
        family_names_count = dict()
        score = list()
        score1 = list()
        score2 = list()
        energy = list()
        rnaexpr1 = list()
        rnaexpr2 = list()
        start1 = list()
        end1 = list()
        length1 = list()
        start2 = list()
        end2 = list()
        length2 = list()
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
            rnaexpr1.append( row_x[ 'tpm1' ].values[ 0 ] )
            rnaexpr2.append( row_x[ 'tpm2' ].values[ 0 ] )

            start1.append( row_x[ 'start1' ].values[ 0 ] )
            end1.append( row_x[ 'end1' ].values[ 0 ] )
            length1.append( row_x[ 'length1' ].values[ 0 ] )

            start2.append( row_x[ 'start2' ].values[ 0 ] )
            end2.append( row_x[ 'end2' ].values[ 0 ] )
            length2.append( row_x[ 'length2' ].values[ 0 ] )

        return {
            'family_names_count': family_names_count,
            'score': score,
            'score1': score1,
            'score2': score2,
            'energy': energy,
            'rnaexpr1': rnaexpr1,
            'rnaexpr2': rnaexpr2,
            'start1': start1,
            'start2': start2,
            'end1': end1,
            'end2': end2,
            'length1': length1,
            'length2': length2
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
    def read_hdf_sample( self, file_name, sort_by="score", ascending=False ):
        hdfdata = pd.read_hdf( self.dir_path + file_name + self.hdf_file_ext, file_name )
        return hdfdata.sort_values( by=sort_by, ascending=ascending )

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
    if len(sys.argv) != 2:
        print( "Usage: python rna_server.py <port>" )
        exit( 1 )
    port = int( sys.argv[ 1 ] )
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

            elif( "summary_plot" in query ): 
                data = RNAInteraction.get_plotting_data( params )
                content = json.dumps( data[ 'family_names_count' ] ) + '\n'
                content += json.dumps( data[ "score" ] ) + '\n'
                content += json.dumps( data[ "score1" ] ) + '\n'
                content += json.dumps( data[ "score2" ] ) + '\n'
                content += json.dumps( data[ "energy" ] ) + '\n'
                content += json.dumps( data[ "rnaexpr1" ] ) + '\n'
                content += json.dumps( data[ "rnaexpr2" ] ) + '\n'
                content += json.dumps( data[ "start1" ] ) + '\n'
                content += json.dumps( data[ "start2" ] ) + '\n'
                content += json.dumps( data[ "end1" ] ) + '\n'
                content += json.dumps( data[ "end2" ] ) + '\n'
                content += json.dumps( data[ "length1" ] ) + '\n'
                content += json.dumps( data[ "length2" ] ) + '\n'

            elif( "multisamples" in query ):
                file_names = RNAInteraction.get_sample_names()
                for name in file_names:
                    content += name + '\n'

            elif( "export" in query ):
                export_data = data.get_search_filter_data( params )
                if not export_data.empty:
                    for index, row in export_data.iterrows():
                        content += row.to_json( orient='records' ) + '\n'

            elif( "sort" in query ):
                sample_name = params[ 'sample_name' ][ 0 ]
                sort_by = params[ 'sort_by' ][ 0 ]
                ascending = False
                if sort_by == 'energy':
                    ascending = True
                sorted_data = data.read_hdf_sample( sample_name, sort_by, ascending )
                total_results = len( sorted_data )
                if not sorted_data.empty:
                    content = str( total_results ) + '\n'
                    content += json.dumps( list( sorted_data.columns ) ) + '\n'
                    sorted_data = sorted_data[ 1:1001 ] if len( sorted_data ) > 1000 else sorted_data
                    for index, row in sorted_data.iterrows():
                        content += row.to_json( orient='records' ) + '\n'

            elif( "filter" in query ):
                sample_name = params[ 'sample_name' ][ 0 ]
                filtered_data = data.filter_data( sample_name, params )
                total_results = len( filtered_data )
                if not filtered_data.empty:
                    content = str( total_results ) + '\n'
                    content += json.dumps( list(filtered_data.columns) ) + '\n'
                    filtered_data = filtered_data[ 1:1001 ] if len( filtered_data ) > 1000 else filtered_data
                    for index, row in filtered_data.iterrows():
                        content += row.to_json( orient='records' ) + '\n'  

            elif( "?" in query ):
                search_by = ""
                sample_name = params[ 'sample_name' ][ 0 ]
                if 'search' in params:
                    search_by = params[ 'search' ][ 0 ]
                    results = data.search_data( sample_name, search_by )
                else:
                    results = data.read_from_file( sample_name )
                if not results.empty:
                    total_results = len( results )
                    results = results[ 1:1001 ] if len( results ) > 1000 else results
                    content = str( total_results ) + '\n'
                    content += json.dumps( list(results.columns) ) + '\n'
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
