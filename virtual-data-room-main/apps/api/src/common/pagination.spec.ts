import {
  ContentsCursor,
  DataRoomsCursor,
  decodeContentsCursor,
  decodeDataRoomsCursor,
  encodeCursor,
} from '@/common/pagination';

function encodeRaw(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

describe('encodeCursor / decodeContentsCursor', () => {
  it('round-trips a folder cursor', () => {
    const cursor: ContentsCursor = { t: 'folder', n: 'reports', i: 'folder-1' };
    expect(decodeContentsCursor(encodeCursor(cursor))).toEqual(cursor);
  });

  it('round-trips a file cursor', () => {
    const cursor: ContentsCursor = { t: 'file', n: 'invoice.pdf', i: 'file-1' };
    expect(decodeContentsCursor(encodeCursor(cursor))).toEqual(cursor);
  });

  it('throws on garbage input that is not valid base64url JSON', () => {
    expect(() => decodeContentsCursor('!!!not-a-cursor???')).toThrow(
      'Malformed cursor',
    );
  });

  it('throws on valid base64 that decodes to non-JSON text', () => {
    const raw = Buffer.from('not-json{{{', 'utf8').toString('base64url');
    expect(() => decodeContentsCursor(raw)).toThrow('Malformed cursor');
  });

  it('throws on valid JSON missing required fields', () => {
    expect(() =>
      decodeContentsCursor(encodeRaw({ t: 'folder', n: 'x' })),
    ).toThrow('Malformed cursor');
    expect(() => decodeContentsCursor(encodeRaw({ foo: 'bar' }))).toThrow(
      'Malformed cursor',
    );
  });

  it('throws on an unrecognized tag', () => {
    expect(() =>
      decodeContentsCursor(encodeRaw({ t: 'dataRoom', n: 'x', i: 'y' })),
    ).toThrow('Malformed cursor');
  });
});

describe('encodeCursor / decodeDataRoomsCursor', () => {
  it('round-trips a data room cursor', () => {
    const cursor: DataRoomsCursor = {
      t: 'dataRoom',
      c: '2024-01-01T00:00:00.000Z',
      i: 'room-1',
    };
    expect(decodeDataRoomsCursor(encodeCursor(cursor))).toEqual(cursor);
  });

  it('throws on garbage input', () => {
    expect(() => decodeDataRoomsCursor('%%%garbage%%%')).toThrow(
      'Malformed cursor',
    );
  });

  it('throws on valid JSON missing required fields', () => {
    expect(() =>
      decodeDataRoomsCursor(encodeRaw({ t: 'dataRoom', i: 'room-1' })),
    ).toThrow('Malformed cursor');
  });

  it('throws when the date field is not a parseable date', () => {
    expect(() =>
      decodeDataRoomsCursor(
        encodeRaw({ t: 'dataRoom', c: 'not-a-date', i: 'room-1' }),
      ),
    ).toThrow('Malformed cursor');
  });
});
