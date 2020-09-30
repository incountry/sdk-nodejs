import { Stream } from 'stream';

function readStream(stream: Stream) {
  return new Promise((resolve, reject) => {
    const data: any[] = [];
    stream.on('data', (chunk) => data.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(data)));
    stream.on('error', (error) => reject(error));
  });
}

export {
  readStream,
};
