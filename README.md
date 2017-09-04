# RNA Interaction Visualizer

This helps visualizing the gene pair interactions

How to use:

1. Clone the link: https://github.com/anuprulez/interactionsviz

2. Move to $ cd interactionsviz

3. Run python server: $ python rna_server.py data_file_name_or_path port_number
   example: $ python rna_server.py interactions.sqlite 8001

4. Open browser and browse to: http://your_domain_name:port/index.html
   
   example: My system's root is: anupkumar@anupkumar-pc
   So the url for me is: http://anupkumar-pc:8001/index.html

5. The left-side panel lists all the samples (as HDF files) created using the sqlite file.

6. Check one or more samples and click on "summary" (on the bottom left). A heatmap plot is plotted showing all the common interactions among all the selected samples. Plotting of this heatmap takes time depending on the number of samples checked.

7. Click on any sample (on its name) to open a new view showing all the interactions for that sample. Features like search, sort and filtering are present in this view.

8. The left section loads the pairs of transaction ids. On selecting a pair or multiple pairs, a summary of interactions is shown in the form of charts.
