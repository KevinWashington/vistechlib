let _ = require("underscore");
let d3 = require("d3");
let moment = require('moment');

class Visualization {
    /**
     * @class
     * @description Abstract visualization class which extends all available visualizations in lib
     * @constructor
     * @param {string} parentElement - Parent element where view will be added
     * @param {object} settings - basic configuration parameters in the view such as margins, opacity, color
     * @returns  {object} included object or svg chart and settings
     */

    constructor(parentElement, settings){
        //default configuration
        let vis = this;
        this.parentElement = parentElement;
        this.settings = {
            color: "#069",//"grey",//"#069",
            highlightColor: "#FF1122",//"#08E700",
            opacity: 1,
            notSelectedOpacity: 0.15,
            size_type: "fit",//"absolute"
            width: 700,
            height: 300,
            paddingTop: 25,
            paddingLeft: 50,
            paddingRight: 50,
            paddingBottom: 30,
            autoresize: true
        };
        this._putDefaultSettings();
        //sobreescreve as configurações padrão pelas configurações dadas por parâmetro.
        if(typeof settings === "object"){
            for(let p in this.settings){
                if(this.settings.hasOwnProperty(p) && settings.hasOwnProperty(p))
                    this.settings[p] = settings[p];
            }
        }

        this.autoresize = this.settings.autoresize;

        /**
         * >@description dispatch event available for visualization elements, where it will be active when using outside the library **this.event()**
         *
         *  brush
         * * draw
         * * highlightstart
         * * highlightend
         * * datamouseover
         * * datamouseout
         * * dataclick
         * * datadblclick
         * * ancestormouseover
         * * ancestormouseout
         * * ancestorclick
         * * ancestordblclick
         * * dimensiontitleclick
         * * datacanvasmouseup
         * * datacanvasmousemove
         * * datacanvasmousedown
         */

        this.event = d3.dispatch("brush", "draw",
            "highlightstart", "highlightend",
            "datamouseover","datamouseout", "dataclick", "datadblclick",
            "ancestormouseover", "ancestormouseout",
            "ancestorclick", "ancestordblclick", "dimensiontitleclick",
            "datacanvasmouseup","datacanvasmousemove","datacanvasmousedown");

        let fit = this.settings.size_type === "fit";

        /**
         *@description main svg element for use
         */

        this.svg = d3.select(parentElement).style("overflow", "hidden")
            .append("svg")
            .attr("width", fit ? "100%" : this.settings.width)
            .attr("height", fit ? "100%" : this.settings.height);
        if(fit){
            let bb = this.svg.node().getBoundingClientRect();
            this.settings.width = bb.width;
            this.settings.height = bb.height;
        }

        /**
         * @description visContentWidth contains the width  svg element with margin and pagging subtractions
         */
        this.visContentWidth = this.settings.width
            - this.settings.paddingLeft
            - this.settings.paddingRight;

        /**
         *@description visContentHeight contains the height svg element with margin and pagging subtractions
         */
        this.visContentHeight = this.settings.height
            - this.settings.paddingTop
            - this.settings.paddingBottom;

        let translatestr = "translate("+this.settings.paddingLeft+","+this.settings.paddingTop+")";

        this.canvas = this.svg.append("g");
        /**
         * @description Selectable view background layer with d3
         */
        this.background = this.canvas.append("g")
            .attr("class", "background")
            .attr("transform", translatestr);
        this.background.append("rect")
            .attr("class", "vis_background")
            .attr("x",0).attr("y",0)
            .attr("width",this.visContentWidth)
            .attr("height",this.visContentHeight)
            .style("fill","#FFFFFF");

         /**
         * @description selectable layer foreground with d3
         */
        this.foreground = this.canvas.append("g")
            .attr("class", "foreground")
            .attr("transform", translatestr);


         /**
         * @description highlight layer Layer of view selectable with d3
         */
        this.highlightLayer = this.canvas.append("g")
            .attr("class", "highlightLayer")
            .attr("transform", translatestr);

         /**
         * @description selection layer Selectable visualization layer with d3
         */
        this.selectionLayer = this.canvas.append("g")
            .attr("class", "selectionLayer")
            .attr("transform", translatestr);


        /**
         * @description selectable view overlay layer with d3
         */
        this.overlay = this.canvas.append("g")
            .attr("class", "overlay")
            .attr("transform", translatestr);
        /**
         * @description selectable view interactionLayer layer with d3
         */
        this.interactionLayer = this.canvas.append("g")
            .attr("class", "interactionLayer")
            .attr("transform", translatestr);

        this.interactionLayer.append("rect")
            .attr("class", "vis_background")
            .attr("x",0).attr("y",0)
            .attr("width",this.visContentWidth)
            .attr("height",this.visContentHeight)
            .style("fill","none")
            .style("opacity", 0)
            .on("mousedown", interactionEvents("datacanvasmousedown"))
            .on("mouseover", interactionEvents("datacanvasmousemove"))
            .on("mouseup", interactionEvents("datacanvasmouseup"));

        function interactionEvents(eventStr){
            return function () {
                vis.event.call(eventStr, this, {
                    innerX: d3.event.layerX-vis.settings.paddingLeft,
                    innerY: d3.event.layerY-vis.settings.paddingTop,
                    d3Event: d3.event
                });
            }
        }

        /**
         * @description view annotations layer selectable with d3
         */
        this.annotations = this.canvas.append("g")
            .attr("class", "annotations")
            .attr("transform", translatestr);

        this.parentElement.__vis__ = this;

        this.isHighlighting = false;

        this.setInteractionMode(true);

    }

    _putDefaultSettings(){}


    /**
     * @description data processing function, creation of visualization data domains as categorical, continuous and temporal
     * @param d - dataset in json format
     */
    data(d){
        this.d = d;
        this.keys = [];
        this.domain = {};
        this.domainType = {};
        for(let k in this.d[0]){
            if(this.d[0].hasOwnProperty(k)){
                this.keys.push(k);
                if(isNaN(+this.d[0][k])) {
                    if(moment(this.d[0][k]).isValid()){
                        for(let i=0;i<this.d.length;i++) {
                            this.d[i][k] = moment(this.d[i][k]).toDate();
                        }
                        this.domainType[k] = "Time";
                        this.domain[k] = d3.extent(this.d, (obj) => {return obj[k];});
                    }else{
                        this.domain[k] = _.uniq(_.pluck(this.d, k));
                        this.domainType[k] = "Categorical";
                    }
                } else {
                    this.domain[k] =  d3.extent(this.d, (obj) => {return obj[k]});
                    this.domainType[k] = "Numeric";
                }
            }
        }
        this.hasData = true;
        return this;
    }


    /**
     * @description function of calculating visualization space size
     */
    resize(){
        let bb = this.svg.node().getBoundingClientRect();
        this.settings.width = bb.width;
        this.settings.height = bb.height;
        this.visContentWidth = this.settings.width
            - this.settings.paddingLeft
            - this.settings.paddingRight;
        this.visContentHeight = this.settings.height
            - this.settings.paddingTop
            - this.settings.paddingBottom;

        this.svg.selectAll(".vis_background")
            .attr("width",this.visContentWidth)
            .attr("height",this.visContentHeight);
        return this;
    }

    /**
     * @description function with all visualization drawing logic
     */
    redraw(){
        this.event.apply("draw");
        return this;
    }

     /**
     * @description get color function of the visualization can be used  Callback  **getcolor(function(d    ,i  ){    })**
     */
    getColor(){
        let color = this.settings.color;
        return color;
    }

     /**
     * @description get color function of the visualization can be used  Callback  **setColor(function( d,  i){    })**
     * @param {string} color - cor em hexadecimal, rbg , ou string
     */
    setColor(color){
        if(arguments.length === 0)
            return this.settings.color;
        this.settings.color = color;
        return this;
    }

    /**
     * @description listen event in items of visualization
     * @param {string} e - event selected  exemple: dataclick
     * @param {string} fun - callback function with desired behavior
     */
    on(e, func) {
        this.event.on(e, func);
        return this;
    };


    /**@description  criar highlight em um item da visaulização
     * @param {object} element - data element with itens
     * @param {array} args - variable that can be used for other attributes like data = d, index = i, color etc ..
     */
    highlight(element, ...args){
        if(!this.isHighlighting){
            this.isHighlighting = true;
            this.event.apply("highlightstart", element, args);
        }
    }

    /** @description highlight removal on a preview item
     * @param {object} element - data element in visualization
     * @param {array} args - variable that can be used for other attributes like data = d, index = i, color etc ..
     */
    removeHighlight(element, ...args){
        if(this.isHighlighting){
            this.isHighlighting = false;
            this.event.apply("highlightend", element, args);
        }
    }

    /**
     * @description get element is with Highlight
     * @param {number} i - view element index
     */
    getHighlightElement(i){ }


    /**
     * @description add anotation in element
     * @param {object} svgElement - svg element where annotation can be added
     */
    annotate(svgElement){
        this.annotations.node().appendChild(svgElement);
    }

    /**
     * @description clears added notes
     */
    clearAnnotations(){
        this.annotations.selectAll("*").remove();
    }

    /**
     * @description  visualization element selection function
     * @param {array<object>} elems - elements which should be selected in the visualization
     */
    select(elems){
        for(let elem of elems){
            this.selectionLayer.node().appendChild(elem);
        }
        this.foreground.selectAll(".data")
            .style("opacity", this.settings.notSelectedOpacity);
    }

     /**
     * @description remove created selection
     */
    removeSelect(){
        let elems = this.selectionLayer.selectAll(".data").nodes();
        for(let elem of elems){
            this.foreground.node().appendChild(elem);
        }
        this.foreground.selectAll(".data").style("opacity", "1");
    }

    /**
     * @description get items selected in visualization
     */
    getSelected(){
        return this.selectionLayer.selectAll("*").nodes();
    }

    /**
     * @description comment creation function
     * @param {array<string>}  args - array with text values
     */
    comments(...args) {
        this.svg.append("foreignObject")
            .attr('class','boxComment')
            .attr("width", 130)
            .attr("height", 100)
            .attr('x',args[0])
            .attr('y',args[1])
            .append("xhtml:div")
            .attr('class','box')
            .html("<textarea class='comment' placeholder='enter your comment'></textarea>")

    }

     /**
     * @description function to remove comments
     */
    removeComments() {
        this.svg.selectAll('.boxComment').remove();

    }

    /**
     * @description abstract function for hierarchy creation
     */
    hierarchy(){}

    /**
     * @description abstract function for dimension filter
     */

    filterByDimension(){
        this.filteredDimensions = [];

    }

    /**
     * @description abstract function for dimensioning
     */
    orderByDimension(){
        this.orderedDimensions = [];
    }

    /**
    * @description invisible layer to enable and disable view interactions
    * @param {boolean} flag - flag to enable and disable invisible layer
    */
    setInteractionMode(flag){
        if(flag){
            this.interactionLayer.select(".vis_background")
                .style("fill","#FFFFFF");
        }else{
            this.interactionLayer.select(".vis_background")
                .style("fill","none");
        }
    }

    set autoresize(isAutoResize){
        this.settings.autoresize = isAutoResize;
        window.onresize = isAutoResize ? () => {
            this.resize();
        } : undefined;
    }

    get autoresize(){
        return this.settings.autoresize;
    }

    /**
     *@description bind events available to items
     * @param {string} selection - bind interaction that will be available
     * @param {object} prefix - selected element date and index
     */
    _bindDataMouseEvents(selection, prefix){
        let vis = this;
        let _prefix = prefix || "data";
        selection
            .on("mouseover", function(d,i){ vis.event.call(_prefix+"mouseover", this, d, i); })
            .on("mouseout", function(d,i){ vis.event.call(_prefix+"mouseout", this, d, i); })
            .on("click", function(d,i){ vis.event.call(_prefix+"click", this, d, i); })
            .on("dblclick", function(d,i){ vis.event.call(_prefix+"dblclick", this, d, i); });
    }

}

module.exports = Visualization;
