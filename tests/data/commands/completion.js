var util = require('util');

var config = {
  shortDescription: 'Bash completion',
  longDescription: 'Bash completion',
  requiredArguments : [],
  optionalArguments: [],
  options: []
}

function handleCommand(arg, commandParser) {
  return '';
}

exports.config = config;
exports.handleCommand = handleCommand;
