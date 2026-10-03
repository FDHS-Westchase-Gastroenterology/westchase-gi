import { crc32 } from "node:zlib";

/* A zip archive that stores its files as they are (method 0, no
   compression), for the Review flyers' "All three, as one .zip" (issue
   #357). The flyers are already compressed formats or small vectors, so
   storing them costs little and needs no dependency: the format is a local
   header and the bytes per file, then a central directory and its end
   record (PKWARE APPNOTE 4.3). Names are ASCII, and every size stays far
   under the 4 GiB a plain (non-Zip64) archive allows. */

export interface StoredFile {
  readonly name: string;
  readonly bytes: Uint8Array;
}

const LOCAL_HEADER = 0x04_03_4b_50;
const CENTRAL_HEADER = 0x02_01_4b_50;
const END_OF_DIRECTORY = 0x06_05_4b_50;
const VERSION = 20;
const MAX_STORED = 0xff_ff_ff_ff;

/** MS-DOS time and date, the zip format's own clock, from a UTC instant. */
function dosStamp(at: Date) {
  const year = Math.max(1980, at.getUTCFullYear());
  return {
    time: (at.getUTCHours() << 11) | (at.getUTCMinutes() << 5) | Math.floor(at.getUTCSeconds() / 2),
    date: ((year - 1980) << 9) | ((at.getUTCMonth() + 1) << 5) | at.getUTCDate(),
  };
}

/** One archive holding `files` in order, each stored without compression. */
export function storeZip(
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- a file's bytes are a Uint8Array, whose type cannot be made readonly
  files: readonly StoredFile[],
  at: Date = new Date(),
): Uint8Array<ArrayBuffer> {
  const { time, date } = dosStamp(at);
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file.name, "ascii");
    const size = file.bytes.byteLength;
    if (size > MAX_STORED) throw new Error("A stored file is too large for a plain zip");
    const crc = crc32(file.bytes);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(LOCAL_HEADER, 0);
    local.writeUInt16LE(VERSION, 4);
    local.writeUInt16LE(0, 6); // Flags
    local.writeUInt16LE(0, 8); // Method: stored
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(size, 18);
    local.writeUInt32LE(size, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28); // Extra field length
    locals.push(local, name, Buffer.from(file.bytes));

    const central = Buffer.alloc(46);
    central.writeUInt32LE(CENTRAL_HEADER, 0);
    central.writeUInt16LE(VERSION, 4); // Made by
    central.writeUInt16LE(VERSION, 6); // Needed to extract
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(size, 20);
    central.writeUInt32LE(size, 24);
    central.writeUInt16LE(name.length, 28);
    // Extra, comment, disk, internal and external attributes stay zero.
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);

    offset += local.length + name.length + size;
  }

  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(END_OF_DIRECTORY, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);

  return new Uint8Array(Buffer.concat([...locals, directory, end]));
}
