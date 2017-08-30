import socket
import os.path
import sys
import re
import json
import urlparse
import sqlite3
import pandas as pd
import numpy as np


class RNAInteraction:
    """ A structure to load RNA interactions data. """

    @classmethod
    def __init__( self ):
        """ Init method. """
        self.default_order_by = 'score'
        self.searchable_fields = [ 'geneid1', 'geneid2' ]
        self.total_records = 10000

    @classmethod
    def convert_to_hdf5( self, file_path ):
        file_name = "interactions.hdf"
        # create hdf5 file from sqlite if it does not exist
        if not os.path.isfile( file_name ):
            connection = sqlite3.connect( file_path )
            interactions_dataframe = pd.read_sql_query( "SELECT * FROM interactions;", connection )
            connection.close()
            interactions_dataframe.to_hdf( file_name, 'interactions', mode="w", complib='blosc' )

        hdfdata = pd.read_hdf( file_name, 'interactions' )
        return hdfdata.sort_values( by='score', ascending=False )

    @classmethod
    def read_from_file( self, file_path, how_many=1000 ):
        """ Select data for the first load """
        return self.convert_to_hdf5( file_path )[ :how_many ]
        
    @classmethod
    def search_data( self, file_path, search_query, how_many=1000 ):
        """ Select data based on a search query """
        all_data = self.convert_to_hdf5( file_path )
        filtered_data = all_data[ all_data[ self.searchable_fields[ 0 ] ].str.contains( search_query ) | all_data[ self.searchable_fields[ 1 ] ].str.contains( search_query ) ]
        return filtered_data[ :how_many ]

    @classmethod
    def make_summary( self, file_path, summary_record_ids ):
        """ Select data for making summary plots """
	ids_pattern = '|'.join( summary_record_ids.split( ',' ) )
        all_data = self.convert_to_hdf5( file_path )
        return all_data[ all_data[ 'chimeraid' ].str.contains( ids_pattern ) ]

    @classmethod
    def filter_data( self, file_path, params, how_many=1000 ):
        """ Filter data based on the filter, equality or inequality operator and filter's value """
        filter_type = params[ "filter_type" ][ 0 ]
        filter_operator = params[ "filter_op" ][ 0 ]
        filter_value = params[ "filter_value" ][ 0 ]

        all_data = self.convert_to_hdf5( file_path )
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
           if filter_operator == 'notequalto':
               all_data = all_data[ ~all_data[ 'type1' ].str.contains( filter_value ) & ~all_data[ 'type2' ].str.contains( filter_value ) ]
           else:
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
            if( "summary_ids" in query ):
                summary_ids = params[ 'summary_ids' ][ 0 ]
                summary = data.make_summary( file_name, summary_ids )
                for index, row in summary.iterrows():
                    content += row.to_json( orient='records' ) + '\n'
            elif( "filter" in query ):
                filtered_data = data.filter_data( file_name, params )
                if not filtered_data.empty:
                    for index, row in filtered_data.iterrows():
                        content += row.to_json( orient='records' ) + '\n'
                else:
                    content = ""
            elif( "?" in query ):
                search_by = ""
                if 'search' in params:
                    search_by = params[ 'search' ][ 0 ]
                    results = data.search_data( file_name, search_by )
                else:
                    results = data.read_from_file( file_name )
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
