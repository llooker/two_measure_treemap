const onlyUnique = (value, index, self) => {
    return self.indexOf(value) === index;
}

const looker_data_to_gchart_data = (data, fields) => {
    const dataTable = [];
    const globalParent = 'All';
    const dimKeys = fields.dimensions.map(e => e.name)
    const measureKeys = fields.measures.map(e => e.name)
    
    // Create headers row
    const headers = []

    if(dimKeys.length >0){ headers.push(fields.dimensions[0].label) }   // Only support up to 2 dims
    headers.push('Parent')
    for(let i = 0; i<measureKeys.length; i++){
        headers.push(fields.measures[i].label)
    }
    dataTable.push(headers)

    // Create first parent row
    const parent_row_1 = [];
    if(dimKeys.length>0){ parent_row_1.push(globalParent)}
    parent_row_1.push(null)
    parent_row_1.push(...new Array(measureKeys.length).fill(0))
    dataTable.push(parent_row_1)

    // Create the second parent rows
    if(dimKeys.length >1){ 
        const parents =  data.map(e => e[dimKeys[1]].value).filter(onlyUnique)
        parents.forEach(e => {
            dataTable.push([e, globalParent, ...new Array(measureKeys.length).fill(0)])
        })
    }

    // Add child rows
    data.forEach(dataRow => {
        const newRow = [];
        if(dimKeys.length <= 0){ newRow.push(null) } 
        if(dimKeys.length == 1){ 
            newRow.push(dataRow[dimKeys[0]].value)
            newRow.push(globalParent)
        }
        else {
            newRow.push(dataRow[dimKeys[0]].value)
            newRow.push(dataRow[dimKeys[1]].value)
        }
        measureKeys.forEach(measureKey => {
            newRow.push(dataRow[measureKey].value)
        })
        dataTable.push(newRow)
    })

    return dataTable;
}

looker.plugins.visualizations.add({
    options: {
        min_color: {
            section: "Style",
            default: "#009688",
            type: "string",
            label: "Min Color",
            display: "color",
        },
        max_color: {
            section: "Style",
            default: "#EE8100",
            type: "string",
            label: "Max Color",
            display: "color",
        }
    },

    create: function(element, config) {},

    updateAsync: function(data, element, config, queryResponse, details, doneRendering) {
        this.clearErrors();

        const firstRow = data[0];
        const qFields = queryResponse.fields;

        if (qFields.dimension_like.length === 0 &&
            qFields.measure_like.length === 0) {
            this.addError({
                title: `No visible fields`,
                message: `At least one dimension, measure or table calculation needs to be visible.`
            })
        }

        const html = `<div id="graph"></div>`

        element.innerHTML = html;

        const formattedData = looker_data_to_gchart_data(data,queryResponse.fields)

        google.charts.load('current', {'packages':['treemap']});
        google.charts.setOnLoadCallback(drawChart);
        function drawChart() {
          var data = google.visualization.arrayToDataTable(formattedData);

          tree = new google.visualization.TreeMap(document.getElementById('graph'));

          var optionsV50 = { // For v50+
            enableHighlight: true,
            maxDepth: 1,
            maxPostDepth: 2,
            minColor: config.min_color,
            midColor: '#f7f7f7',
            maxColor: config.max_color,
            headerHeight: 15,
            showScale: true,
            height: 500,
            useWeightedAverageForAggregation: true,
            // Use click to highlight and double-click to drill down.
            eventsConfig: {
              highlight: ['click'],
              unhighlight: ['mouseout'],
              rollup: ['contextmenu'],
              drilldown: ['dblclick'],
            }
          };

          tree.draw(data, optionsV50);

        }        

        doneRendering();
    }
});