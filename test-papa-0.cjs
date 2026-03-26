const fs = require('fs');
const Papa = require('papaparse');
const csvText = fs.readFileSync('public/Inventaire saint antoine.csv', 'utf8');
Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    delimiter: ';',
    complete: (results) => {
        const items = results.data;
        const zeroStock = items.filter(i => {
            const ex = parseFloat((i['Existance'] || '').replace(',', '.'));
            return isNaN(ex) || ex <= 0;
        });
        console.log(`Total items: ${items.length}`);
        console.log(`Items with <= 0 stock: ${zeroStock.length}`);
        if (zeroStock.length > 0) {
            console.log("Example 0-stock item:", zeroStock[0]);
        }
    }
});
