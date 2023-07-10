const fs = require('fs');
const path = require('path');

const dataFolder = './data';
const outputFilename = 'merged.json';

// Функція для зчитування файлів JSON з папки
function readJsonFiles(folderPath) {
  return new Promise((resolve, reject) => {
    fs.readdir(folderPath, (err, files) => {
      if (err) {
        return reject(err);
      }

      const jsonFiles = files
        .filter(file => path.extname(file) === '.json')
        .map(file => path.join(folderPath, file));

      resolve(jsonFiles);
    });
  });
}

// Функція для об'єднання JSON файлів
async function mergeJsonFiles(files) {
  const mergedData = [];

  for (const file of files) {
    try {
      const fileData = await fs.promises.readFile(file, 'utf-8');
      const jsonData = JSON.parse(fileData);

      if (Array.isArray(jsonData)) {
        mergedData.push(...jsonData);
      } else {
        mergedData.push(jsonData);
      }
    } catch (err) {
      console.error(`Error reading file ${file}:`, err);
    }
  }

  return mergedData;
}

// Головна функція
async function main() {
  try {
    const jsonFiles = await readJsonFiles(dataFolder);
    const mergedData = await mergeJsonFiles(jsonFiles);

    await fs.promises.writeFile(outputFilename, JSON.stringify(mergedData, null, 2));
    console.log(`Merged JSON data has been saved to ${outputFilename}`);
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
