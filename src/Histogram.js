let d3 = require("d3");

let Visualization = require("./Visualization.js");
let utils = require("./Utils.js");


class Histogram extends Visualization{

    constructor(parentElement, settings){
        super(parentElement, settings);
        this.name = "Histogram";
    }

    _putDefaultSettings(){
        // this.settings.innerPadding = 8;
        this.settings.paddingRight = 20;
        this.settings.paddingTop = 25;
        this.settings.paddingBottom = 50;
        this.settings.paddingLeft = 40;
    }

    resize(){
        let margin = ({top: this.settings.paddingTop, right: this.settings.paddingRight, bottom: this.settings.paddingBottom, left: this.settings.paddingLeft});

        let svgBounds = this.svg.node().getBoundingClientRect();
        let value =0, datak = {};

        this.cellHeight = svgBounds.height-margin.bottom;
        this.cellWidth = svgBounds.width- margin.bottom;

        this.x = {},this.y = {},this.bins = {},this.xAxis = {},this.yAxis = {},this.newkey = [];
        datak = {};
        let i = 0;

        for(let k of this.keys){
            if(this.domainType[k] === "Categorical"){
            }else{
                this.newkey.push(k);
            }
        }

        this.cellWidth /= this.newkey.length;


        this.redraw();
        return this;
    }

    data(d){
        super.data(d);
        let margin = ({top: this.settings.paddingTop, right: this.settings.paddingRight, bottom: this.settings.paddingBottom, left: this.settings.paddingLeft});
        let svgBounds = this.svg.node().getBoundingClientRect();


        let value =0;

        this.cellHeight = svgBounds.height-margin.bottom;
        this.cellWidth = svgBounds.width- margin.bottom;

        this.x = {},this.y = {},this.bins = {},this.xAxis = {},this.yAxis = {},this.newkey = [];
        this.datak = {};
        let i = 0;

        for(let k of this.keys){
            if(this.domainType[k] === "Categorical"){
            }else{
                this.newkey.push(k);
            }
        }

        // this.cellHeight /= this.newkey.length;
        this.cellWidth /= this.newkey.length;



        this.redraw();
        return this;
    }


    redraw(){
        let histogram = this;

        this.foreground.selectAll(".textLabel").remove();
        this.foreground.selectAll(".axisY").remove();
        this.foreground.selectAll("rect.data").remove();

        let margin = ({top: this.settings.paddingTop , right: this.settings.paddingRight, bottom: this.settings.paddingBottom, left: this.settings.paddingLeft});

        let keys = this.newkey;

        let i =0;
        for(let k of this.keys){
            if(this.domainType[k] === "Categorical"){

            }else{
                let xvalues = [];
                for (let i = 0; i <this.d.length ; i++){
                    xvalues.push(this.d[i][k]);
                }
                histogram.datak[k] = xvalues;

                histogram.x[k] = d3.scaleLinear()
                    .domain(this.domain[k]).nice()
                    .range([margin.left, this.cellWidth]);

                histogram.bins[k] = d3.histogram()
                    .domain(this.x[k].domain())
                    .thresholds(this.x[k].ticks(20))
                    (this.datak[k]);

                histogram.y[k] =  d3.scaleLinear()
                    .domain([0,d3.max(this.bins[k], d => d.length)]).nice()
                    .range([this.cellHeight, margin.top]);

                histogram.xAxis[k] = g => g
                    .attr("transform", `translate(0,${this.cellHeight})`)
                    .call(d3.axisBottom(this.x[k])
                        .tickSizeOuter(10));

                histogram.yAxis[k] = g => g
                    .attr("transform", `translate(${margin.left},0)`)
                    .call(d3.axisLeft(this.y[k]))
                    .call(g => g.select(".domain").remove())
                    .call(g => g.select(".tick:last-of-type text").clone()
                        .attr("x", 5)
                        .attr("text-anchor", "start")
                        .text("-"+k));

                i++;
            }
        }

        function rPoints(k,j) {

            let chart = histogram.foreground.select(".cellGroup")
                .append("g")
                .attr("class","hChart")
                .attr("id","data_"+j)
                .attr("transform",`translate(${(j* histogram.cellWidth)},0)`);

            let dataEnter = chart.selectAll("rect.data")
                .data(histogram.d)
                .enter().append("rect")
                .attr("data-index", function(d,i){ return i; })
                .attr("class", "data")
                .data(histogram.bins[k])
                .attr("x", d => histogram.x[k](d.x0) + 1)
                .attr("width", d => Math.max(0, histogram.x[k](d.x1) - histogram.x[k](d.x0) - 1))
                .attr("y", d => histogram.y[k](d.length))
                .attr("height", d => histogram.y[k](0) - histogram.y[k](d.length))
                .style("fill", histogram.settings.color)
                .attr("key", k);

            let enterAxisX = chart.append("g")
                .attr("class","textLabel")
                .call(histogram.xAxis[k])
                .selectAll("text")
                .style("text-anchor", "end")
                .attr("dx", "-.8em")
                .attr("dy", "-.55em")
                .attr("transform", "translate(10,15)" );

            let enterAxisY = chart.append("g")
                .attr("class","axisY")
                .call(histogram.yAxis[k]);
        }

        // this.foreground.selectAll("g.cellGroup").remove();
        this.foreground.selectAll("g.cellGroup").remove();

        let updateChart  = this.foreground
            .selectAll(".data")
            .data(this.d);

        let groups = this.foreground
            .append("g")
            .attr("class","cellGroup");


        console.log(keys);
        for (let i = 0; i <keys.length ; i++) {
            rPoints(keys[i],i);
        }


        return this;
    }

    highlight(...args){

    }
    removeHighlight(...args){

    }
    getHighlightElement(i){

    }

    setAxisX(args){
        this.settings.axisX = args;
        console.log(args);
    }

    setAxisY(args){
        this.settings.axisY = args;
        console.log(args);

    }
}

module.exports = Histogram;