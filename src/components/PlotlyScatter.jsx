import React from "react";

/* global Plotly:true */
import createPlotlyComponent from "react-plotly.js/factory";
const Plot = createPlotlyComponent(Plotly);

const PlotlyScatter = ({ data, ...props }) => {
  return <Plot data={data} {...props} />;
};

export default PlotlyScatter;
