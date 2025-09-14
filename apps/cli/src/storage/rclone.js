import * as path from 'path';
import crypto from 'node:crypto';

const textTypes = ['txt', 'csv', 'json', 'xml', 'html', 'md', 'log'];

const list = async (
  dir,
  fileTypes,
  { logger, remote, url, username, password },
) => {
  let results = [];
  try {
    const reqPayload = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:
          'Basic ' + Buffer.from(`${username}:${password}`).toString('base64'),
      },
      body: JSON.stringify({
        ...(remote ? { fs: `${remote}:` } : {}),
        remote: dir,
        opt: {
          recurse: true,
        },
      }),
    };
    if (logger) logger.debug(JSON.stringify(reqPayload));
    const response = await fetch(`${url}/operations/list`, reqPayload);
    if (!response.ok) {
      if (logger) logger.debug(JSON.stringify(response));
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    results = data.list
      .filter((item) => !item.IsDir)
      .map((item) => item.Path)
      .filter((file) => fileTypes.includes(path.extname(file).slice(1)));
  } catch (error) {
    if (logger) logger.warn(`Error reading directory ${dir}: ${error.message}`);
  }
  return results;
};

const hash = async (files, { logger, remote, url, username, password }) => {
  return Promise.all(
    files.map(async (file) => {
      try {
        const response = await fetch(`${url}/operations/hashsum`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization:
              'Basic ' +
              Buffer.from(`${username}:${password}`).toString('base64'),
          },
          body: JSON.stringify({
            ...(remote ? { fs: `${remote}:${file}` } : { fs: `${file}` }),
            hashType: 'MD5',
            download: true,
          }),
        });

        if (!response.ok) {
          if (logger) logger.debug(JSON.stringify(response));
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return { file, hash: data.hashsum[0].split('  ')[0] };
      } catch (error) {
        if (logger) logger.warn(`Error hashing file ${file}: ${error.message}`);
        return { file, hash: null, error: error.message };
      }
    }),
  );
};

const open = async (
  file,
  hash,
  { logger, remote, url, username, password },
) => {
  try {
    const response = await fetch(`${url}/[${remote}:]/${file}`, {
      method: 'GET',
      headers: {
        Authorization:
          'Basic ' + Buffer.from(`${username}:${password}`).toString('base64'),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.arrayBuffer();
    const fileHash = crypto
      .createHash('md5')
      .update(Buffer.from(data))
      .digest('hex');

    if (fileHash !== hash) {
      throw new Error('File hash does not match expected hash. Skipping.');
    }

    const ext = path.extname(file).slice(1).toLowerCase();
    return textTypes.includes(ext)
      ? Buffer.from(data).toString('utf8')
      : Buffer.from(data);
  } catch (error) {
    if (logger) logger.warn(`Error reading file ${file}: ${error.message}`);
    return null;
  }
};

const exists = async (file, { logger, remote, url, username, password }) => {
  const response = await fetch(`${url}/operations/list`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:
        'Basic ' + Buffer.from(`${username}:${password}`).toString('base64'),
    },
    body: JSON.stringify({
      ...(remote ? { fs: `${remote}:` } : {}),
      remote: path.dirname(file),
    }),
  });
  if (!response.ok) {
    if (logger) logger.debug(JSON.stringify(response));
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  return data.list.some((item) => item.Path === file);
};

export { list, hash, open, exists };
