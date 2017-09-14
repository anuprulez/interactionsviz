
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
    addRemoveSample (state, sampleInfo) {
        if (sampleInfo.status) {
            state.checkedSamples.push(sampleInfo.sample)
        }
        else {
            let samples = state.checkedSamples
            samples.splice(samples.indexOf(sampleInfo.sample), 1);
        }
    },
    setLoader (state, status) {
        state.showLoading = status
    }
  },
  actions: {
    fetchSamples (store) {
        let query = '/?multisamples=true',
            url = window.location.protocol + "//" + window.location.hostname + ":" + window.location.port + query;
        $.ajax( url ).then((samples) => { // fetch all samples
            samples = samples.split( "\n" )
            samples = samples.map(sample => sample.trim()) 
            store.commit('updateSamples', samples)
        })
    },
    fetchCommonInteractions (store, samples) {
        let query = '/?sample_ids=' + samples,
            url = window.location.protocol + "//" + window.location.hostname + ":" + window.location.port + query,
            ids = samples.split(','),
            matrix = []
        $.ajax(url).then((samples) => { // compute common interactions among selected samples
            samples = samples.split( '\n' ).map( Number );
            for(let ctr = 0; ctr < samples.length; ctr = ctr + ids.length) {
                matrix.push(samples.slice(ctr, ctr + ids.length));
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
	      title: 'Common interactions among selected samples'
	    }
	    Plotly.newPlot('samples-plot', data, layout )
            store.commit('setLoader', false)
        })
    }
  }
};

// State management
const store = new Vuex.Store({
  modules: {
    multisamplesStore: multisamplesStore
  }
});

// View
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
  methods: { // events
    checkSample (sampleId, status) {
        store.commit('addRemoveSample', {'sample': sampleId, 'status': status})
    },
    makeSampleSummary () {
        let allCheckedSamples = this.samplesChecked
        if ( allCheckedSamples.length > 0 ) {
          samplesString = allCheckedSamples.join(',')
          store.commit('setLoader', true)
          store.dispatch('fetchCommonInteractions', samplesString)
        }
    }
}
});

