# RNA Interaction Visualizer

This helps visualizing the gene pair interactions

How to use:

1. Clone the link: https://github.com/anuprulez/interactionsviz

2. Move to $ cd interactionsviz

3. Run python server: $ python rna_server.py data_file_name port_number
   example: $ python rna_server.py interactions.tsv 8001

4. Open browser and browse to: http://<<your domain name:port>>/index.html
   
   example: My system's root is: anupkumar@anupkumar-pc
   So the url for me is: http://anupkumar-pc:8001/index.html

5. The left section loads the pair of transaction ids. On selecting a pair, the respective ids are printed the in right sections.
