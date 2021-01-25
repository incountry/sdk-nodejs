import { Stream } from 'stream';
import { escapeRegExp } from 'lodash';

function readStream(stream: Stream) {
  return new Promise((resolve, reject) => {
    const data: any[] = [];
    stream.on('data', (chunk) => data.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(data)));
    stream.on('error', (error) => reject(error));
  });
}

const errorMessageRegExp = (...parts: string[]) => new RegExp(`^${parts.map(escapeRegExp).join('.*')}$`);

export {
  readStream,
  errorMessageRegExp,
};
