/* eslint-disable consistent-return */
/* eslint-disable no-param-reassign */
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const csv = require('csv-parser');
const fs = require('fs');
const _ = require('lodash');

const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

const { log } = console;

let results = [];

let moduleHeader = [];

// Define upload options.
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 },
  safeFileNames: true,
}));


function titleCase(str) {
  const splitStr = str.toLowerCase().split(' ');
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < splitStr.length; i++) {
    splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);
  }
  return splitStr.join(' ');
}

// Appends the row with module name Columns.
function createModuleHeader(moduleName) {
  moduleHeader.push({ id: `${moduleName}Validated`, title: `${moduleName}Validated` });
  moduleHeader.push({ id: `${moduleName}ValidatedDate`, title: `${moduleName}ValidatedDate` });
  moduleHeader.push({ id: `${moduleName}ValidatedBy`, title: `${moduleName}ValidatedBy` });
}

async function doConvert(res) {
  await fs.createReadStream(`${__dirname}/import.csv`)
    .pipe(csv({ separator: ',', skipLines: 3 }))
    .on('data', (data) => {
      const id = data.contact_number1;

      let tempRoles = new Set();

      if ((results.filter((member) => member.contact_number1 === id).length) === 0) {
        // New Member
        tempRoles.add(data.MRole1);
        data.roles = data.MRole1;
        data.rolesStatus = data.RoleStatus1;
        data.rolesStartDate = data.Role_Start_Date1;
        data.rolesReviewDate = data.review_date1;
        data.tempRoles = tempRoles;
        results.push(data);
      } else {
        // Get the current record to be updated.
        const temp = results.filter((member) => member.contact_number1 === id);

        // Remove it from the results array.
        results = _.remove(results, (n) => n !== temp[0]);

        // Hack: Push role to set
        tempRoles = new Set(temp[0].tempRoles);

        if (!tempRoles.has(data.MRole1)) {
          temp[0].roles = temp[0].roles.concat(',', data.MRole1);
          temp[0].rolesStatus = temp[0].rolesStatus.concat(',', data.RoleStatus1);
          temp[0].rolesStartDate = temp[0].rolesStartDate.concat(',', data.Role_Start_Date1);
          temp[0].rolesReviewDate = temp[0].rolesReviewDate.concat(',', data.review_date1);
          tempRoles.add(data.MRole1);
        }

        temp[0].tempRoles = new Set(tempRoles);

        // Hack: Woodbadge
        if (temp[0].wood_received1 === '') {
          temp[0].wood_received1 = data.wood_received1;
        }

        // Hack: Force a Email.
        if (temp[0].Email1 === '') {
          temp[0].Email1 = data.Email1;
        }

        // Hack: Force a District.
        if (temp[0].District1 === '') {
          temp[0].District1 = data.District1;
        }

        // Hack: Force a Group Name.
        if (temp[0].Scout_Group1 === '') {
          temp[0].Scout_Group1 = data.Scout_Group1;
        }

        // Get the Module Name
        const moduleName = String(titleCase(data.module_name1)).replace(/\s/g, '');

        // Hack: If validated, set to 1 (true)
        if (data.module_validated_date1) {
          temp[0][`${moduleName}Validated`] = '1';
        }

        // Push the updated record to results.
        temp[0][`${moduleName}ValidatedDate`] = data.module_validated_date1;
        temp[0][`${moduleName}ValidatedBy`] = data.Validatedbyname;

        results.push(temp[0]);

        // Add Module Name to the moduleHeaders
        createModuleHeader(moduleName);
      }
    })
    .on('end', () => {
      let memberHeader = [
        { id: 'contact_number1', title: 'ID' },
        { id: 'forenames1', title: 'Name' },
        { id: 'surname1', title: 'Surname' },
        { id: 'Email1', title: 'Email' },
        { id: 'roles', title: 'Roles' },
        { id: 'rolesStatus', title: 'RolesStatus' },
        { id: 'rolesStartDate', title: 'RolesStartDate' },
        { id: 'rolesReviewDate', title: 'RolesReviewDate' },
        { id: 'wood_received1', title: 'WoodbadgeDate' },
        { id: 'County1', title: 'County' },
        { id: 'County_Section1', title: 'CountySection' },
        { id: 'District1', title: 'District' },
        { id: 'Scout_Group1', title: 'Group' },
        { id: 'Scout_Group_Section1', title: 'GroupSection' },
      ];

      moduleHeader = _.uniqBy(moduleHeader, 'id');

      memberHeader = memberHeader.concat(moduleHeader);

      const csvWriter = createCsvWriter({
        path: `${__dirname}/export.csv`,
        header: memberHeader,
      });

      csvWriter.writeRecords(results).then(() => res.sendFile(path.join(`${__dirname}/export.csv`)));
    });
}

app.post('/upload', (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }

  // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
  const { sampleFile } = req.files;

  // Use the mv() method to place the file somewhere on your server
  sampleFile.mv(`${__dirname}/import.csv`, async (err) => {
    if (err) { return res.status(500).send(err); }
    await doConvert(res);
  });
});

app.get('/', (req, res) => {
  try {
    fs.unlinkSync(`${__dirname}/export.csv`);
  } catch (error) {
    // Do nothing
  }
  try {
    fs.unlinkSync(`${__dirname}/import.csv`);
  } catch (error) {
    // Do nothing
  }
  res.sendFile(path.join(`${__dirname}/public/index.html`));
});

app.listen(port, () => log(`Listening on port ${port}!`));
