import { ValidationError } from '../../../src/errors';
import { parseKBConfig } from '../../../src/kb/config';
import { expectError } from '../../helpers/kb';

describe('parseKBConfig', () => {
  it('T70: mặc định mock + http://localhost:4000; KB_CLIENT phân biệt hoa thường; KB_API_URL phải là http(s) và bỏ / cuối', async () => {
    expect(parseKBConfig({})).toEqual({ client: 'mock', apiUrl: 'http://localhost:4000' });
    expect(parseKBConfig({ KB_CLIENT: 'http', KB_API_URL: 'http://kb.test/' })).toEqual({
      client: 'http',
      apiUrl: 'http://kb.test',
    });
    expect(parseKBConfig({ KB_CLIENT: 'http', KB_API_URL: 'https://kb.test/api' }).apiUrl).toBe('https://kb.test/api');

    await expectError(
      () => parseKBConfig({ KB_CLIENT: 'HTTP' }),
      ValidationError,
      'invalid KB_CLIENT "HTTP". Allowed: mock, http',
    );
    await expectError(() => parseKBConfig({ KB_API_URL: 'abc' }), ValidationError, 'invalid KB_API_URL "abc"');
    await expectError(() => parseKBConfig({ KB_API_URL: 'ftp://x' }), ValidationError, 'invalid KB_API_URL "ftp://x"');
  });
});
