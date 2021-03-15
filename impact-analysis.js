$(function () {

    const AGENCY = "wy"
    const REST_SVC_BASE_URL = "http://localhost:9090/care-rest";

    var impactAnalysisRequest = {
        dataSourceName: null,
        filter1Name: "",
        filter2Name: "",
        variableName: "",
        suppressNulls: true,
        noZeros: true
    };

    var impactAnalysisData = [];
    var impactAnalysisChartData = [];

    // datasources lookup
    var dataSourcesDS = new DevExpress.data.CustomStore({
        key: "value",
        loadMode: "raw",
        cacheRawData: true,
        load: function () {
            return $.getJSON(REST_SVC_BASE_URL + '/api/v1/' + AGENCY + '/datasources');
        }
    });

    // filters lookup
    var filtersDS = new DevExpress.data.CustomStore({
        key: "value",
        loadMode: "raw",
        cacheRawData: true,
        byKey: function (key) {
            var d = new $.Deferred();
            $.get(REST_SVC_BASE_URL + '/api/v1/' + AGENCY + '/filters?datasource=' + key)
                .done(function (dataItem) {
                    d.resolve(dataItem);
                });
            return d.promise();
        }
    });

    // variables lookup
    var variablesDS = new DevExpress.data.CustomStore({
        key: "value",
        loadMode: "raw",
        cacheRawData: true,
        byKey: function (key) {
            var d = new $.Deferred();
            $.get(REST_SVC_BASE_URL + '/api/v1/' + AGENCY + '/variables?datasource=' + key)
                .done(function (dataItem) {
                    d.resolve(dataItem);
                });
            return d.promise();
        }
    });

    function getImpactAnalysisData() {

        $.ajax({
            url: REST_SVC_BASE_URL + '/api/v1/' + AGENCY + '/impact-analysis',
            type: "POST",
            data: JSON.stringify(impactAnalysisRequest),
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function (data) {
                console.log(JSON.stringify(data));
                impactAnalysisData = data;
                $("#impact-grid-container").dxDataGrid("instance").option("dataSource", data);
                $("#impact-grid-container").dxDataGrid("instance").refresh();
            }
        });
    }

    function getImpactAnalysisChartData() {

        $.ajax({
            url: REST_SVC_BASE_URL + '/api/v1/' + AGENCY + '/impact-analysis-chart',
            type: "POST",
            data: JSON.stringify(impactAnalysisRequest),
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function (data) {
                console.log(JSON.stringify(data));
                impactAnalysisChartData = data;
                $("#impact-chart").dxChart("instance").option("dataSource", data);
                $("#impact-chart").dxChart("instance").refresh();
            }
        });
    }

    function refreshForm(datasourceSelected) {

        const filter1Editor = $("#impact-form-container").dxForm("instance").getEditor("filter1");
        const filter2Editor = $("#impact-form-container").dxForm("instance").getEditor("filter2");

        filtersDS.byKey(datasourceSelected).done(function (values) {
            var filters = [];
            values.forEach((element) => {
                filters.push({ value: element.value });
            });
            filter1Editor.option("dataSource", filters);
            filter2Editor.option("dataSource", filters);
        });

        var firstVariableEditor = $("#impact-form-container").dxForm("instance").getEditor("variable1");

        variablesDS.byKey(datasourceSelected).done(function (values) {
            var variables = [];
            values.forEach((element) => {
                variables.push({ value: element.value });
            });
            firstVariableEditor.option("dataSource", variables);
        });
        $("#impact-grid-container").dxDataGrid("instance").refresh();
    }

    var form = $("#impact-form-container").dxForm({
        formData: {
            datasource: null,
            filter1: "",
            filter2: "",
            variable1: "",
            noNulls: false
        },
        colCount: 5,
        labelLocation: "top",
        items: [{
            dataField: "datasource",
            editorType: "dxSelectBox",
            editorOptions: {
                dataSource: dataSourcesDS,
                valueExpr: "value",
                displayExpr: "value",
                searchEnabled: false,
                value: "",
                onValueChanged: function (data) {
                    impactAnalysisRequest.dataSourceName = data.value;
                    refreshForm(data.value);
                }
            },
            validationRules: [{
                type: "required",
                message: "Datasource  is required"
            }]
        }, {
            dataField: "filter1",
            label: {
                text: "Filter"
            },
            editorType: "dxSelectBox",
            colSpan: 2,
            editorOptions: {
                searchEnabled: true,
                displayExpr: "value",
                valueExpr: "value",
                onValueChanged: function (data) {
                    impactAnalysisRequest.filter1Name = data.value;
                    getImpactAnalysisData();
                    getImpactAnalysisChartData();
                }
            },
            validationRules: [{
                type: "required",
                message: "Filter is required"
            }]
        },
        {
            dataField: "variable1",
            label: {
                text: "Variable"
            },
            editorType: "dxSelectBox",
            editorOptions: {
                searchEnabled: true,
                displayExpr: "value",
                valueExpr: "value",
                label: {
                    text: "Variable"
                },
                onValueChanged: function (data) {
                    $("#impact-grid-container").dxDataGrid("instance").columnOption("variableCodes", "caption", data.value.split(':')[1]);
                    impactAnalysisRequest.variableName = data.value;
                    getImpactAnalysisData();
                    getImpactAnalysisChartData();
                }
            }
        },
        {
            dataField: "filter2",
            label: {
                text: "Other Filter"
            },
            editorType: "dxSelectBox",
            editorOptions: {
                searchEnabled: true,
                displayExpr: "value",
                valueExpr: "value",
                onValueChanged: function (data) {
                    impactAnalysisRequest.filter2Name = data.value;
                    getImpactAnalysisData();
                    getImpactAnalysisChartData();
                }
            }
        },
        {
            dataField: "noNulls",
            label: {
                location: "left",
                alignment: "right",
                text: "Hide Nulls"
            },
            editorOptions: {
                onValueChanged: function (data) {
                    impactAnalysisRequest.suppressNulls = data.value;
                    getImpactAnalysisData();
                }
            }
        }
        ]
    });

    var dataGrid = $("#impact-grid-container").dxDataGrid({
        dataSource: initData,
        export: {
            enabled: true
        },
        onExporting: function (e) {
            var workbook = new ExcelJS.Workbook();
            var worksheet = workbook.addWorksheet('Impact Analysis');
            DevExpress.excelExporter.exportDataGrid({
                worksheet: worksheet,
                component: e.component,
                customizeCell: function (options) {
                    var excelCell = options;
                    excelCell.font = { name: 'Arial', size: 12 };
                    excelCell.alignment = { horizontal: 'left' };
                }
            }).then(function () {
                workbook.xlsx.writeBuffer().then(function (buffer) {
                    saveAs(new Blob([buffer], { type: 'application/octet-stream' }), 'impact-analysis.xlsx');
                });
            });
            e.cancel = true;
        },
        keyExpr: "id",
        showBorders: true,
        columns: [{ dataField: "variableCodes", caption: impactAnalysisRequest.variableName },
        { dataField: "frequency1", caption: "Subset Freq." },
        {
            dataField: "percent1", caption: "Subset Pct.", format: "fixedPoint",
            precision: 2, dataType: "number",
            customizeText: function (cellInfo) {
                return cellInfo.valueText + " %";
            }
        },
        { dataField: "frequency2", caption: "Other Freq." },
        {
            dataField: "percent2", caption: "Other Pct.", format: "fixedPoint",
            precision: 2, dataType: "number",
            customizeText: function (cellInfo) {
                return cellInfo.valueText + " %";
            }
        },
        { dataField: "overRepresented", caption: "Over Represent" },
        { dataField: "maxGain", caption: "Max Gain" }
        ],
        summary: {
            totalItems: [{
                column: "cumulativePercent1",
                summaryType: "count"
            }]
        }
    });
    
    var chart = $("#impact-chart").dxChart({
        palette: "bright",
        dataSource: impactAnalysisChartData,
        commonSeriesSettings: {
            argumentField: "dataLabel",
            valueField: "dataValue",
            type: "bar"
        },
        seriesTemplate: {
            nameField: "dataName"
        },
        title: {
            text: "",
            subtitle: {
                text: "Impact Analysis"
            }
        },
        tooltip: {
            enabled: true,
            shared: true,
            argumentFormat: "shortDateShortTime",
            contentTemplate: function (pointInfo, element) {
                var print = function (label, value) {
                    var span = $("<span>", {
                        "class": "tooltip-label",
                        text: label
                    });
                    element.append($("<div>", {
                        text: value
                    }).prepend(span));
                };
                print("",  pointInfo.argument + ': ' + pointInfo.value);
            }
        },
        crosshair: {
            enabled: true,
            horizontalLine: { visible: false }
        },
        "export": {
            enabled: true
        },
        legend: {
            verticalAlignment: "bottom",
            horizontalAlignment: "center"
        }
    });
})