import socket
import sys
import re
import json
import urlparse
import sqlite3


class RNAInteraction:
    """ A structure to load rna interactions data. """

    @classmethod
    def __init__( self ):
        """ Init method. """
        self.default_order_by = 'score'
        self.searchable_fields = [ 'symbol1', 'symbol2', 'geneid1', 'geneid2' ]
        self.id_field = 'chimeraid'
        self.total_records = 10000
        self.field_names = []

    @classmethod
    def execute_sql_query( self, command, file_path ):
        """ Execute sqlite query and fetch data """
        connection = sqlite3.connect( file_path )
        cursor = connection.cursor()
        cursor.execute( command )
        all_data = cursor.fetchall()
        connection.close()
        return all_data

    @classmethod
    def read_from_file( self, file_path, how_many=1000 ):
        """ Select data for the first load """
        command = 'SELECT * FROM interactions ORDER BY ' + self.default_order_by + ' DESC'
        all_data = self.execute_sql_query( command, file_path )
        return all_data[ :how_many ]
        
    @classmethod
    def search_data( self, file_path, search_query, how_many=1000 ):
        """ Select data based on a search query """
        command = 'SELECT * FROM interactions WHERE '  + self.searchable_fields[ 2 ] +  ' LIKE ' + '"%' + search_query + '%"' + ' ORDER BY ' + self.default_order_by + ' DESC'
        all_data = self.execute_sql_query( command, file_path )
        return all_data[ :how_many ]

    @classmethod
    def make_summary( self, file_path, summary_record_ids ):
        """ Select data for making summary plots """
        summary_record_ids = str( tuple( str( summary_record_ids ).split( ',' ) ) )
        command = "SELECT * FROM interactions WHERE chimeraid IN "  +  summary_record_ids + " ORDER BY " + self.default_order_by + " DESC"
        return self.execute_sql_query( command, file_path )


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
                for item in summary:
                    content += json.dumps( item ) + '\n'
            elif( "?" in query ):
                search_by = ""
                if 'search' in params:
                    search_by = params[ 'search' ][ 0 ]
                    results = data.search_data( file_name, search_by )
                else:
                    results = data.read_from_file( file_name )
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
