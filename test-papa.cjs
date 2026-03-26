const Papa = require('papaparse');
const result = Papa.parse('A;B;C\n1;;"0"\n2;;""', {header:false, delimiter: ';'});
console.log(result.data);
