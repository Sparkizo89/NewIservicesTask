const fs = require('fs');
const Papa = require('papaparse');
const csvText = fs.readFileSync('public/Inventaire saint antoine.csv', 'utf8');
Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    delimiter: ';',
    complete: (results) => {
        const items = results.data;
        const blankStock = items.filter(i => {
            const ex = i['Existance'];
            return ex === undefined || ex === null || ex === '' || ex.trim() === '';
        });
        console.log(`Total items: ${items.length}`);
        console.log(`Items with blank stock (""): ${blankStock.length}`);
        if (blankStock.length > 0) {
            console.log("Example blank-stock item:", blankStock[0]);
        }
    }
});
