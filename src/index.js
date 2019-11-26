const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const csv = require('csv-parser');
const fs = require('fs');
const _ = require('lodash');

const { log } = console;

let results = [];
const moduleHeaders = [];
const memberHeaders = [
  { id: 'contact_number1', title: 'ID' },
  { id: 'forenames1', title: 'Name' },
  { id: 'surname1', title: 'Surname' },
  { id: 'Email1', title: 'Email' },
  { id: 'MRole1', title: 'Role' },
  { id: 'RoleStatus1', title: 'RoleStatus' },
  { id: 'Role_Start_Date1', title: 'RoleStartDate' },
  { id: 'review_date1', title: 'RoleReviewDate' },
  { id: 'wood_received1', title: 'WoodbadgeDate' },
  { id: 'County1', title: 'County' },
  { id: 'County_Section1', title: 'CountySection' },
  { id: 'District1', title: 'District' },
  { id: 'Scout_Group1', title: 'Group' },
  { id: 'Scout_Group_Section1', title: 'GroupSection' },
];

/**
 * Converts each word in a String to Uppercase First.
 * @param {*} str result
 */
function titleCase(str) {
  const splitStr = str.toLowerCase().split(' ');
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < splitStr.length; i++) {
    splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);
  }
  return splitStr.join(' ');
}

// Read CVS File.
fs.createReadStream('import.csv')
  .pipe(csv({ separator: ',', skipLines: 3 }))
  .on('data', (data) => {
    // Get the ID (Membership Number).
    const id = data.contact_number1;

    // If the member is not already in the results array.
    if ((results.filter((member) => member.contact_number1 === id).length) === 0) {
      // New Member
      results.push(data);
    } else {
      // New Module

      // Get the current record to be updated.
      const temp = results.filter((member) => member.contact_number1 === id);

      // Remove it from the results array.
      results = _.remove(results, (n) => n !== temp[0]);

      // Get the Module Name
      const moduleName = String(titleCase(data.module_name1)).replace(/\s/g, '');

      // Hack: Force a Group Name.
      if (temp[0].Scout_Group1 === '') {
        temp[0].Scout_Group1 = data.Scout_Group1;
      }

      // Push the updated record to results.
      temp[0][`${moduleName}ValidatedDate`] = data.module_validated_date1;
      temp[0][`${moduleName}ValidatedBy`] = data.Validatedbyname;
      results.push(temp[0]);

      // Add Module Name to the moduleHeaders
      moduleHeaders.push({ id: `${moduleName}ValidatedDate`, title: `${moduleName}ValidatedDate` });
      moduleHeaders.push({ id: `${moduleName}ValidatedBy`, title: `${moduleName}ValidatedBy` });
    }
  })
  .on('end', () => {
    // Write the output to CSV.
    const csvWriter = createCsvWriter({
      path: 'export.csv',
      header: memberHeaders.concat(_.uniqBy(moduleHeaders, 'id')),
    });
    csvWriter.writeRecords(results).then(() => { log('...Done'); });
  });
