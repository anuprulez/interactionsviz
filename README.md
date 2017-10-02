# RNA Interaction Visualizer

This helps visualizing the gene pair interactions

How to use:

1. Clone the link: https://github.com/anuprulez/interactionsviz

2. Move to $ cd interactionsviz

3. Create a "data" folder and place .tsv files

4. Run python server: $ python rna_server.py port_number
   example: $ python rna_server.py 8001

5. Open browser and browse to: http://your_domain_name:port/index.html
   
   example: My system's root is: anupkumar@anupkumar-pc
   So the url for me is: http://anupkumar-pc:8001/index.html

6. The left-side panel lists all the .tsv files placed in the "data" folder. All these files are converted into HDF files.

7. Check one or more files and click on "summary" (on the bottom left). A heatmap plot is plotted showing all the common interactions among all the selected files. Plotting of this heatmap takes time depending on the number of samples checked.

8. Click on any file (on its name) to open a new view showing all the interactions that belong to that file. Features like search, sort and filtering are present in this view.

9. The left section loads the pairs of transaction ids. On selecting a pair or multiple pairs, a summary of interactions is shown in the form of charts.
