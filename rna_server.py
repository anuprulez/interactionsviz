import socket
import sys
import re
import math
import json


class RNAInteraction:
    """ A structure to load rna interactions data. """

    @classmethod
    def __init__( self ):
        """ Init method. """
        self.record_list = []

    @classmethod
    def read_from_file(self, file_path):
        with open(file_path) as file:
            data_list = list()
            record_id = 0
            data_attributes = list()
            for record in file:
                if record_id == 10000:
                    break
                record = record.split("\n")
                if record_id == 0:
                    data_attributes = record[0].split("\t")
                else:
                    attr = dict()
                    data_record = record[0].split("\t")
                    for index, item in enumerate(data_attributes):
                        attr[ item ] = data_record[ index ]
                    self.record_list.append(attr)
                record_id += 1
            return self.record_list


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python rna_server.py <file> <port>")
        exit(1)
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
        request = client.recv(8192).decode("utf8")
        print("the request is " + request)
        content_type = "text/plain"
        content = ""
        match_searchpage = re.match("^GET / HTTP/1.1", request)
        match = re.match("^GET /(.*) HTTP/1.1", request)
        if match_searchpage:
            home_page = "index.html"
            with open(home_page) as file:
                content = file.read()
                content_type = "text/html"
        elif match:
            query = match.group(1)
            if("?" in query):
                file_name = sys.argv[1]
                data = RNAInteraction()
                results = data.read_from_file(file_name)
                content = ""
                for item in results:
                    content += json.dumps(item) + '\n'
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
        if len(content) > 0:
            content_length = len(content)
            answer = "HTTP/1.1 200 OK\r\n" \
                 "Content-Length: %d\r\n" \
                 "Content-Type: %s  \r\n" \
                 "\r\n %s" % (content_length, content_type, content)
        else:
            content = "404 Resource not found"
            answer = "HTTP/1.1 404 Resource not found" \
                " Content-Length: %d\r\n" \
                "Content-Type: %s  \r\n" \
                "\r\n %s" % (len(content), "text/plain", content)
        client.send(answer.encode("utf8"))
        client.close()
