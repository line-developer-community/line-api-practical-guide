'use strict';

const jsonData = require('../data.json');

module.exports = ( req, res ) => {
  let planId = req.query.id;
  let plan = jsonData.chapel.filter(p => p.id == planId)[0];
  if (!plan) {
    plan = jsonData.jinja.filter(p => p.id == planId)[0];
  }
  res.json({plan});
};
