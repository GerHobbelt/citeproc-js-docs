"use strict";

// Okay, so we've done the first pass over this.
// The essential ops:

// (1) Open a menu at current document position.
// (2) Insert, edit, or remove citation node.

// Unpacking that, it looks like this:

// (1) Open a menu at current document position.
//   (a) Set a class:citation span placeholder if necessary.
//   (b) Hang menu off of class:citation span.
// (2) Perform click-handler from menu, which:
//   * If no citationID on class:citation span ...
//      ... and empty menu: just deletes the node.
//      ... and menu content: file request w/empty citationID
//   * If has citationID on class:citation span ...
//      ... and empty menu, then ...
//           ... if now no citations, file init request.
//           ... if still citations, refile 1st citation.
//      ... and menu content: file request w/citationID


class CiteSupportBase {

    constructor() {
        this.config = {
            debug: true,
            mode: 'note',
            defaultLocale: 'en-US',
            defaultStyle: 'jm-indigobook-law-review',
            citationIDs: {},
            citationByIndex: [],
            processorReady: false
        };
        const me = this;
        const worker = new Worker('_static/js/citeworker.js');
        worker.onmessage = function(e) {
            switch(e.data.command) {
            /**
             * In response to `callInitProcessor` request, refresh
             *   `config.mode`, and document citations (if any)
             *   and document bibliography (if any).
             *
             * @param {string} xclass Either `note` or `in-text` as a string
             * @param {Object[]} rebuildData Array of elements with the form `[citationID, noteNumber, citeString]`
             * @param {Object[]} bibliographyData Array of serialized xHTML bibliography entries
             */
            case 'initProcessor':
                me.debug('initProcessor()');
                me.config.mode = e.data.xclass;
                const citationData = me.convertRebuildDataToCitationData(e.data.rebuildData);
                me.setCitations(me.config.mode, citationData);
                me.setBibliography(e.data.bibliographyData);
                me.config.processorReady = true;
                break;
             /**
              * In response to `callRegisterCitation`, refresh `config.citationsByIndex`,
              *   set citations that require update in the document, replace
              *   the bibliography in the document, and save the `citationByIndex` array
              *   and the `citationIDs` object for persistence.
              *
              * @param {Object[]} citationByIndex Array of registered citation objects
              * @param {Object[]} citationData Array of elements with the form `[noteNumber, citeString]`
              * @param {Object[]} bibliographyData Array of serialized xHTML bibliography entries
              */
            case 'registerCitation':
                me.debug('registerCitation()');
                me.config.citationByIndex = e.data.citationByIndex;
                // setCitations() implicitly updates this.config.citationIDs
                me.setCitations(me.config.mode, e.data.citationData, true);
                me.setBibliography(e.data.bibliographyData);
                me.saveData(me.config.citationByIndex, me.config.citationIDs);
                me.config.processorReady = true;
                break;
            }
        }
    }

    /**
     * Logs messages to the console if `config.debug` is true
     * @param  {string} txt The message to log
     * @return {void}
     */
    debug(txt) {
        if (this.config.debug) {
            console.log(`*** ${txt}`);
        }
    }

    /**
     * Initializes the processor, optionally populating it with a
     *   preexisting list of citations.
     *
     * @param {string} styleName The ID of a style
     * @param {string} localeName The ID of a locale
     * @param {Object[]} citationByIndex An array of citation objects with citationIDs
     * @return {void}
     */
    callInitProcessor(styleName, localeName, citationByIndex) {
        this.debug('callInitProcessor()');
        this.config.processorReady = false;
        if (!citationByIndex) {
            citationByIndex = [];
        }
        domClearDocument();
        this.worker.postMessage({
            command: 'initProcessor',
            styleName: styleName,
            localeName: localeName,
            citationByIndex: citationByIndex
        });
    }

    /**
     * Registers a single citation in the processor to follow
     *   citations described by `preCitations` and precede those
     *   described in `postCitations`.
     *
     * @param {Object{}} citation A citation object
     * @param {Object[]} preCitations An array of `[citationID, noteNumber]` pairs in document order
     * @param {Object[]} postCitations An array of `[citationID, noteNumber]` pairs in document order
     * @return {void}
     */
    callRegisterCitation(citation, preCitations, postCitations) {
        if (!config.processorReady) return;
        this.debug('callRegisterCitation()');
        this.config.processorReady = false;
        worker.postMessage({
            command: 'registerCitation',
            citation: citation,
            preCitations: preCitations,
            postCitations: postCitations
        });
    }

    /**
     * Done to here
     */

    citationAddOrEditHandler(e) {
        this.debug('citationAddOrEditHandler()');

        const menu = document.getElementById('cite-menu');
        const citationItems = this.getCitationIdsFrom(menu);
        const hasCitation = this.menuHasCitation(menu);

        if (citationItems.length === 0) {
            if (hasCitation) {

            }
        }

    }


    /**
     * Receives an HTML element as input. An HTML Collection is extracted from
     *   the input element containing all child input[type="checkbox"] elements. The
     *   HTML Collection is then iterated and the values of the checked boxes are
     *   pushed to `citationItems` in the form of { id: `value`}. The "value" of
     *   the checkbox element in this case is the citation ID.
     *
     * NOTE: This is a helper method used for this example and is NOT REQUIRED.
     *
     * @param  {HTMLElement} element An HTML element containing HTML input elements as children.
     * @return {Object[]}      An array of objects containing citation IDs.
     */
    getCitationIdsFrom(element) {
        this.debug('getCitationItemIdsFrom()');
        const citationItems = [];
        const checkboxes = element.getElementsByTagName('input');

        for (let checkbox of checkboxes) {
            if (checkbox.checked) {
                citationItems.push({
                    id: checkbox.value,
                });
            }
        }

        return citationItems;
    }

    /**
     * Helper function used for getting information on the currently selected citation
     *   menu object.
     *
     * NOTE: This is a helper method used for this example and is NOT REQUIRED.
     *
     * @return {Object} `info` object (defined below).
     */
    getCurrentCitationInfo() {
        this.debug('getCurrentCitationInfo()');

        /**
         * Citation info object
         * @type {Object}
         * @prop {number} pos  - The position of the currently selected citation menu.
         * @prop {string} citationID  - The `id` of the span element which holds the
         *   inline citations.
         * @prop {number} citationIndex  - I have no idea what this is for. FIXME
         */
        const info = {
            pos: 0,
            citationID: null,
            citationIndex: -1,
        };
        const citemeElements = document.getElementsByClassName('citeme');

        for (let i = 0; i < citemeElements.length; i++) {
            /** @type {HTMLSpanElement} The button icon to trigger the citation menu */
            const citemeElement = citemeElements[i];

            /** @type {HTMLSpanElement} The inline citation element */
            const sib = citemeElements.item(i).nextElementSibling;

            if (sib.classList.contains('citation')) {
                info.citationIndex++;
            }

            // If the current element has its citation menu open (ie. its first-child)
            // then we've found what we're looking for. Return info after setting
            // the last couple properties.
            if (citemeElement.firstChild) {
                info.pos = i;
                if (sib.classList.contains('citation')) {
                    info.citationID = sib.id;
                }
                return info;
            }
        }
        return null;
    }

    /**
     * Takes an HTML element as input and returns a boolean depending on whether
     *   or not the element's next sibling has the class `citation`. If `false` is
     *   returned, then that means a span citation container element does not exist
     *   for the current line.
     *
     * NOTE: This is a helper method used for this example and is NOT REQUIRED.
     *
     * @param  {HTMLElement} menuElement HTMLElement (in this case, the citation menu)
     * @return {boolean}
     */
    menuHasCitation(menuElement) {
        this.debug('menuHasCitation()');
        const sib = menuElement.parentElement.nextElementSibling;

        if (sib && sib.classList.contains('citation')) {
            return true;
        }
        return false;
    }
    
}


const CiteSupport = CiteSupportBase => class extends CiteSupportBase {

    /**
     * Function to be run immediately after document has been loaded, and
     *   before any editing operations.
     *
     * @return {void}
     */
    initDocument() {
        this.debug('initDocument()');
        
    }

    showMenu() {
        this.debug('showMenu()');
        
    }
    
    handleMenuSelect() {
        this.debug('handleMenuSelect()');
    }
    
}


class SafeStorage {
    
    constructor(citesupport) {
        this.citesupport = citesupport;
    }
    
    _safeStorageGet(key, fallback) {
        var ret;
        var val = localStorage.getItem(key);
        if (!val) {
            this.citesupport.debug('No value in storage!');
            ret = fallback;
        } else {
            try {
                ret = JSON.parse(val);
            } catch (e) {
                this.citesupport.debug(`JSON parse error! ${key} ${val}`);
                ret = fallback;
            }
        }
        this.citesupport.config[key] = ret;
        return ret;
    }
    
    set defaultLocale(localeName) {
        this.citesupport.config.defaultLocale = localeName;
        localStorage.setItem('defaultLocale', localeName);
    }
    
    set defaultStyle(styleName) {
        this.citesupport.config.styleName = styleName;
        localStorage.setItem('defaultStyle', styleName);
    }
    
    set citationByIndex(citationByIndex) {
        this.citesupport.config.citationByIndex = citationByIndex;
        localStorage.setItem('citationByIndex', JSON.stringify(citationByIndex));
    }

    get defaultLocale() {
        return this._safeStorageGet('defaultLocale', 'en-US');
    }
    
    get defaultStyle() {
        return this._safeStorageGet('defaultStyle', 'jm-indigobook-law-review');
    }
    
    get citationByIndex() {
        return this._safeStorageGet('citationByIndex', []);
    }

}

class MyCiteSupport extends CiteSupport(CiteSupportBase) {
    
    constructor() {
        super();
        this.posToCitationId = [];
        this.safeStorage = new SafeStorage(this);
    }
    
    /**
     * Replace citation span nodes and get ready to roll. Puts
     *   document into the state it would have been in at first
     *   opening had it been properly saved.
     *
     * @return {void}
     */
    spoofDocument() {
        this.debug('spoofDocument()');

        // Stage 1: Check that all array items have citationID
        const citationByIndex = this.safeStorage.citationByIndex;
        const citationIDs = {};
        for (let i=0, ilen=this.config.citationByIndex.length; i > ilen; i++) {
            let citation = this.config.citationByIndex[i];
            if (!this.config.citationIDs[citation.citationID]) {
                console.log('*** WARNING: encountered a stored citation that was invalid or had no citationID. Removing citations.');
                this.safeStorage.citationByIndex = [];
                this.safeStorage.citationIDs = {};
                break;
            }
            citationIDs[citation.citationID] = true;
        }
        this.config.citationIDs = citationIDs;
            
        // Stage 2: check that all citeme pegs are in posToCitationId with existing citationIDs
        const pegs = document.getElementsByClassName('citeme');
        for (let i=0, ilen=this.config.citationByIndex.length; i < ilen; i++) {
            let citationID = this.config.citationByIndex[i].citationID;
            if ("number" !== typeof this.citationIdToPos[citationID]) {
                console.log('*** WARNING: invalid state data. Removing citations.');
                this.safeStorage.citationByIndex = [];
                this.safeStorage.citationIDs = {};
                break;
            }
        }
        
        // Stage 3: check that number of citation nodes and number of stored citations matches
        const objectLength = citesupport.config.citationByIndex.length;
        const nodeLength = document.getElementsByClassName('citation').length;
        if (objectLength !== nodeLength) {
            console.log('*** WARNING: document citation node and citation object counts do not match. Removing citations.');
            this.safeStorage.citationByIndex = [];
            this.safeStorage.citationIDs = {};
            const citations = document.getElementsByClassName('citation');
            for (let i=0, ilen=citations.length; i < ilen; i++) {
                citations[0].parentNode.removeChild(citations[0]);
            }
        }
        
        // Stage 4: set citation nodes
        for (let i=0, ilen=pegs.length; i < ilen; i++) {
            let peg = pegs[i];
            let citationNode = document.createElement('span');
            citationNode.classList.add('citation');
            peg.parentNode.insertBefore(citationNode, peg.nextSibling);
        }
    }
}


const citesupport = new MyCiteSupport();


window.addEventListener('load', function(e){
    citesupport.spoofDocument();
    citesupport.initDocument();
});
