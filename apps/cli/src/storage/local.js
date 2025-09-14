import * as fs from 'fs';
import * as path from 'path';
import crypto from 'node:crypto';

const textTypes = ['txt', 'csv', 'json', 'xml', 'html', 'md', 'log'];

const list = (dir, fileTypes, { logger }) => {
  let results = [];
  try {
    const fileList = fs.readdirSync(dir);
    fileList.forEach((file) => {
      try {
        file = path.resolve(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
          results = results.concat(list(file, fileTypes, { logger }));
        } else {
          if (fileTypes.includes(path.extname(file).slice(1))) {
            results.push(file);
          }
        }
      } catch (error) {
        if (logger)
          logger.warn(`Error accessing file ${file}: ${error.message}`);
      }
    });
  } catch (error) {
    if (logger) logger.warn(`Error reading directory ${dir}: ${error.message}`);
  }
  return results;
};

const hash = (files, { logger }) => {
  return files.map((file) => {
    try {
      const data = fs.readFileSync(file);
      const hash = crypto.createHash('md5').update(data).digest('hex');
      return { file, hash };
    } catch (error) {
      if (logger) logger.warn(`Error hashing file ${file}: ${error.message}`);
      return { file, hash: null, error: error.message };
    }
  });
};

const open = (file, hash, { logger }) => {
  try {
    const data = fs.readFileSync(file);
    const fileHash = crypto.createHash('md5').update(data).digest('hex');
    if (fileHash !== hash) {
      throw new Error('File hash does not match expected hash. Skipping.');
    }
    const ext = path.extname(file).slice(1).toLowerCase();
    const contents = textTypes.includes(ext)
      ? fs.readFileSync(file, 'utf8')
      : fs.readFileSync(file);
    return contents;
  } catch (error) {
    if (logger) logger.warn(`Error reading file ${file}: ${error.message}`);
    return null;
  }
};

const exists = (file, { logger }) => {
  try {
    return fs.existsSync(file);
  } catch (error) {
    if (logger) logger.warn(`Error reading file ${file}: ${error.message}`);
    return false;
  }
};

export { list, hash, open, exists };
