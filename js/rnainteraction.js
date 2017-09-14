
const multisamplesStore = {
  state: {
    samples: [],
    checkedSamples: [],
    showLoading: false
  },
  getters: {
    getSamples: state => {
        return state.samples
    },
    getCheckedSamples: state => {
        return state.checkedSamples
    },
    getLoader: state => {
        return state.showLoading
    }
  },
  mutations: {
    updateSamples (state, samples) {
        state.samples = samples
    },
    addSample (state, sampleId) {
        state.checkedSamples.push( sampleId )
    },
    setLoader (state, status) {
        console.log(status)
        state.showLoading = status
    }
  },
  actions: {
    fetchSamples ( store ) {
        let url = "http://" + window.location.hostname + ":" + window.location.port + "/?multisamples=true";
        $.ajax( url ).then(function( samples ) {
            samples = samples.split( "\n" )
            store.commit('updateSamples', samples)
        })
    },
    fetchCommonInteractions ( store, samples ) {
        let url = "http://" + window.location.hostname + ":" + window.location.port + "/?sample_ids=" + samples,
            ids = samples.split( "," )
        $.ajax( url ).then(function( samples ) {
            samples = samples.split( "\n" ).map( Number );
            let matrix = []
            for( let ctr = 0; ctr < samples.length; ctr = ctr + ids.length ) {
                let samples_row = samples.slice( ctr, ctr + ids.length );
                matrix.push( samples_row );
            }
	    let data = [
	      {
	        z: matrix,
	        x: ids,
	        y: ids,
	        type: 'heatmap'   
	      }
	    ]
	    let layout = {
	      height: 500,
	      width: 700,
	      title: 'Samples match matrix'
	    }
	    Plotly.newPlot( 'samples-plot', data, layout )
            store.commit("setLoader", false)
        })
    }
  }
};

const store = new Vuex.Store({
  modules: {
    multisamplesStore: multisamplesStore
  }
});

new Vue({
  el: '#multisamples',
  computed: {
    fetchAllSamples () {
      store.dispatch('fetchSamples')
    },
    allSamples () {
      this.fetchAllSamples
      return store.getters.getSamples
    },
    samplesChecked () {
        return store.getters.getCheckedSamples
    },
    showOverlayLoader () {
        return store.getters.getLoader
    }
  },
  methods: {
    checkSample ( sampleId ) {
        store.commit('addSample', sampleId)
    },
    makeSampleSummary () {
        let allCheckedSamples = this.samplesChecked
        if ( allCheckedSamples.length > 0 ) {
          samplesString = allCheckedSamples.join( "," )
          store.commit("setLoader", true)
          store.dispatch('fetchCommonInteractions', samplesString)
        }
    },
    openAllInteractions ( sample ) {
   
    }
 
}
});

