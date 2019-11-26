const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const csv = require('csv-parser');
const fs = require('fs');
const _ = require('lodash');

const { log } = console;

let results = [];

let moduleHeader = [];

function titleCase(str) {
  const splitStr = str.toLowerCase().split(' ');
  for (let i = 0; i < splitStr.length; i++) {
    splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);
  }
  return splitStr.join(' ');
}

fs.createReadStream('import.csv')
  .pipe(csv({ separator: ',', skipLines: 3 }))
  .on('data', (data) => {
    const id = data.contact_number1;
    if ((results.filter((member) => member.contact_number1 === id).length) === 0) {
      // New Member
      results.push(data);
    } else {
      // New Module
      const temp = results.filter((member) => member.contact_number1 === id);
      results = _.remove(results, (n) => n !== temp[0]);
      const moduleName = String(titleCase(data.module_name1)).replace(/\s/g, '');
      if (data.module_validated_date1) {
        temp[0][`${moduleName}Validated`] = '1';
      }
      temp[0][`${moduleName}ValidatedDate`] = data.module_validated_date1;
      temp[0][`${moduleName}ValidatedBy`] = data.Validatedbyname;
      results.push(temp[0]);
      moduleHeader.push({ id: `${moduleName}Validated`, title: `${moduleName}Validated` });
      moduleHeader.push({ id: `${moduleName}ValidatedDate`, title: `${moduleName}ValidatedDate` });
      moduleHeader.push({ id: `${moduleName}ValidatedBy`, title: `${moduleName}ValidatedBy` });
    }
  })
  .on('end', () => {
    let memberHeader = [
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

    moduleHeader = _.uniqBy(moduleHeader, 'id');

    memberHeader = memberHeader.concat(moduleHeader);

    log(memberHeader);

    const csvWriter = createCsvWriter({
      path: 'export.csv',
      header: memberHeader,
    });

    csvWriter.writeRecords(results).then(() => { log('...Done'); });
  });
