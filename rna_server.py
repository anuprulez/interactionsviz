import socket
import sys
import re
import json
import math
from operator import itemgetter
import urlparse


class RNAInteraction:
    """ A structure to load rna interactions data. """

    @classmethod
    def __init__( self ):
        """ Init method. """
        self.float_fields = [ 'score', 'score1', 'score2' ]
        self.searchable_fields = [ 'symbol1', 'symbol2', 'geneid1', 'geneid2' ]
        self.id_field = 'chimeraid'
        self.total_records = 10000
        self.field_names = []

    @classmethod
    def read_from_file( self, file_path ):
        with open( file_path ) as file:
            record_id = 0
            records = list()
            for record in file:
                if record_id > self.total_records:
                    break
                record = record.split( "\n" )
                if record_id == 0:
                    self.field_names = record[ 0 ].split( "\t" )
                else:
                    attr = dict()
                    data_record = record[ 0 ].split( "\t" )
                    for index, item in enumerate( self.field_names  ):
                        if item in self.float_fields:
                            attr[ item ] = float( data_record[ index ] )
                        else:
                            attr[ item ] = data_record[ index ]
                    records.append( attr )
                record_id = record_id + 1
        return self.field_names, records

    @classmethod
    def extract_results( self, file_path, search_by, sort_by='score', how_many=1000, sort_direction='desc' ):
        record_attributes, record_list = self.read_from_file( file_path )
        return self.top_results( record_attributes, record_list, search_by, sort_by, how_many, sort_direction )

    @classmethod
    def top_results( self, record_attributes, record_list, search_by, sort_by, how_many, sort_direction  ):
        if not sort_by:
            return record_list[ :how_many ]
        sort_field_pos = record_attributes.index( sort_by )
        sorted_results = sorted( record_list, key=itemgetter( sort_by ), reverse=( sort_direction == 'desc' ) )
        matches = []
        if search_by:
            for index, record in enumerate( sorted_results ):
                if search_by in record[ self.searchable_fields[ 0 ] ] or search_by in record[ self.searchable_fields[ 1 ] ] or search_by in record[ self.searchable_fields[ 2 ] ] or search_by in record[ self.searchable_fields[ 3 ] ]:
                    matches.append( record )
            match_length = len( matches )
            if match_length > 0:
                if match_length > how_many:
                    return matches[ :how_many ]
                else:
                    return matches
            else:
                return False
        else:
            return sorted_results[ :how_many ]

    @classmethod
    def make_summary( self, file_path, summary_ids ):
        record_attributes, record_list = self.read_from_file( file_path )
        ids = summary_ids.split( ',' )
        summary = [ record for record in record_list if record[ self.id_field ] in ids ]
        return summary


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
                summary = data.make_summary(file_name, summary_ids)
                for item in summary:
                    content += json.dumps( item ) + '\n'
            elif( "?" in query ):
                sort_by = ""
                search_by = ""
                if 'sort' in params:
                    sort_by = params[ 'sort' ][ 0 ]
                if 'search' in params:
                    search_by = params[ 'search' ][ 0 ]
                results = data.extract_results( file_name, search_by, sort_by )
                if( results ):
                    for item in results:
                        content += json.dumps( item ) + '\n'
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
