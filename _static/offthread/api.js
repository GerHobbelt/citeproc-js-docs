workaholic = new function () {
    this.initProcessor = initProcessor;
    this.registerCitation = registerCitation;

    var worker = new Worker('_static/offthread/worker.js');
    
    function initProcessor(styleName, localeName) {
        // Instantiates the processor
        var bib = document.getElementById('bibliography');
        bib.hidden = true;
        worker.postMessage({
            command: 'initProcessor',
            styleName: styleName,
            localeName: localeName
        });
    }

    function registerCitation(citation, preCitations, postCitations) {
        // Use return from getCitationID and data fetched from
        // selections in the UI to submit an edit request
        if (!config.processorReady) return;
        worker.postMessage({
            command: 'registerCitation',
            citation: citation,
            preCitations: preCitations,
            postCitations: postCitations
        });
    }

    function doCallback(d, callback) {
        if (d.result === 'OK') {
            callback(d);
        } else {
            alert('ERROR: '+d.msg);
        }
    }

    worker.onmessage = function(e) {
        var d = e.data;
        switch(d.command) {
        case 'initProcessor':
            doCallback(d, function(d) {
                config.processorReady = true;
                var menu = document.getElementById('cite-menu');
                if (menu) {
                    menu.parentNode.removeChild(menu);
                }
            });
            break;
        case 'registerCitation':
            doCallback(d, function(d) {
                config.citationByIndex = d.citationByIndex;
                localStorage.setItem('citationByIndex', JSON.stringify(d.citationByIndex));
                setCitations(d.citations);
                setBibliography(d.bibliography);
                var menu = document.getElementById('cite-menu');
                if (menu) {
                    menu.parentNode.removeChild(menu);
                }
            });
            break;
        }
    }
}